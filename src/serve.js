// @ts-check
import fs from "fs/promises";
import crypto from "crypto";
import { createRequire } from "module";
import express from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";

import browserslist from "browserslist";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import generatePolyfills from "./generatePolyfills.js";
import isSupported from "./isSupported.js";

/**
 * Start the proxy server
 *
 * @param {number} port http port for the proxy server
 * @param {string} target url to proxy
 * @param {string} browser browserslist compatible browser
 * @param {boolean} css Also transform css
 */
export default async function serve(port, target, browser, css) {
  const browsers = browserslist(browser);
  console.info("[tvkit]", {
    port,
    target,
    browsers,
    css,
  });
  const app = express();
  app.disable("x-powered-by");
  const proxy = createProxyMiddleware({
    target,
    ws: true,
    selfHandleResponse: true,
    // changeOrigin: true,
    secure: false,
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req) => {
      if (proxyRes.statusCode !== 200) {
        return responseBuffer;
      }
      if (proxyRes.headers["content-type"]?.startsWith("text/html")) {
        const content = responseBuffer.toString("utf8");
        return cache(content, () =>
          transformHtml(content, { browsers, root: "/", css })
        );
      }
      if (
        proxyRes.headers["content-type"]?.startsWith("application/javascript")
      ) {
        let code = responseBuffer.toString("utf8");
        return cache(code, () => {
          if (req.url === "/@vite/client") {
            if (
              isSupported(
                ["custom-elements", "shadowdom", "css-variables"],
                browsers
              ) === false
            ) {
              code = code
                .replace(
                  "class ErrorOverlay extends HTMLElement",
                  "class ErrorOverlay"
                )
                .replace("super();", "")
                .replace(
                  "document.body.appendChild(new ErrorOverlay(err))",
                  "console.error(err.message + '\\n' + err.stack)"
                );
            }
            if (css) {
              // Add client side  caching?, sessionStorage?
              code = code.replace(
                "function updateStyle(id, content) {",
                `const updateStyleAsync = {};
  async function updateStyle(id, content) {
    updateStyleSync(id, content); // fast update (without postcss applied)
    const current = {}
    updateStyleAsync[id] = current; 
    const response = await fetch('/tvkit-postcss', { method: 'POST', body: content, headers: { 'Content-Type': 'text/css' } });
    if (response.ok) {
      const css = await response.text();
      if (updateStyleAsync[id] === current) {
        updateStyleSync(id, css);
      }
    }
  }
  function updateStyleSync(id, content) {`
              );
            }
          }
          return transformJavascript(code, { browsers });
        });
      }
      return responseBuffer;
    }),
  });

  const files = new Map();
  const require = createRequire(import.meta.url);
  files.set(
    "/tvkit-system.js",
    await fs.readFile(require.resolve("systemjs/dist/s.min.js"), "utf8")
  );
  files.set(
    "/s.min.js.map",
    await fs.readFile(require.resolve("systemjs/dist/s.min.js.map"), "utf8")
  );
  files.set("/tvkit-polyfills.js", await generatePolyfills(browsers));

  for (const url of files.keys()) {
    app.get(url, (_, res) => {
      const mimetype = url.endsWith(".map")
        ? "application/json"
        : "application/javascript";
      res.setHeader("content-type", mimetype);
      res.send(files.get(url));
    });
  }
  if (css) {
    const raw = express.raw({
      inflate: true,
      limit: "50mb",
      type: () => true,
    });
    app.post("/tvkit-postcss", (req, res) => {
      raw(req, res, async () => {
        const code = req.body.toString("utf8");
        const body = await cache(code, () =>
          transformCss(code, { browsers, from: "tvkit-postcss.css" })
        );
        res.send(body);
      });
    });
  }
  app.use(proxy);

  app.listen(port, "0.0.0.0", () => {
    console.info(`[tvkit] Running on http://localhost:${port}/`);
  });
}

/**
 * @type {Record<string, string>}
 */
const inMemoryCache = {};

/**
 * Cache the transformations for 2-5 minutes.
 *
 * @param {string} content
 * @param {() => string|Promise<string>} transformer
 */
async function cache(content, transformer) {
  const key = crypto.createHash("md5").update(content).digest("hex");
  if (!inMemoryCache[key]) {
    inMemoryCache[key] = await transformer();
    setTimeout(() => {
      delete inMemoryCache[key];
    }, 180_000 * Math.random() + 120_000);
  }
  return inMemoryCache[key];
}
