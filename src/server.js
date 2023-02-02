#!/usr/bin/env node
import fs from "fs/promises";
import crypto from "crypto";
import express from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import generatePolyfills from "./generatePolyfills.js";

const port = process.env.PORT ?? 3000;
const target = process.env.TARGET ?? "http://localhost:5173";
const browser = process.env.BROWSER ?? "ie 11";
const css =
  typeof process.env.CSS !== "undefined" ? bool(process.env.CSS) : true;

console.info("tvkit", { port, target, browser, css });
async function main() {
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
        return cache(content, () => transformHtml(content, { css, browser }));
      }
      if (
        proxyRes.headers["content-type"]?.startsWith("application/javascript")
      ) {
        let code = responseBuffer.toString("utf8");
        return cache(code, () => {
          // @todo Detect browser support for custom elements?
          if (req.url === "/@vite/client") {
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
            if (css) {
              // Add caching?
              code = code.replace(
                "function updateStyle(id, content) {",
                `const updateStyleAsync = {};
  async function updateStyle(id, content) {
    updateStyleSync(id, css); // fast update (without postcss applied)
    const current = {}
    updateStyleAsync[id] = current; 
    const response = await fetch('/tvkit-postcss', {method: 'POST', body: content});
    const css = await response.text();
    if (updateStyleAsync[id] === current) {
      updateStyleSync(id, css);
    }
  }
  function updateStyleSync(id, content) {`
              );
            }
          }
          return transformJavascript(code, { browser });
        });
      }
      return responseBuffer;
    }),
  });

  const files = new Map();
  files.set(
    "/tvkit-system.js",
    await fs.readFile("node_modules/systemjs/dist/s.min.js", "utf8")
  );
  files.set(
    "/s.min.js.map",
    await fs.readFile("node_modules/systemjs/dist/s.min.js.map", "utf8")
  );
  await generatePolyfills(browser);
  files.set(
    "/tvkit-polyfills.js",
    await fs.readFile("node_modules/tvkit-polyfills.js", "utf8")
  );

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
          transformCss(code, { browser, from: "tvkit-postcss.css" })
        );
        res.send(body);
      });
    });
  }
  app.use(proxy);

  app.listen(port, "0.0.0.0", () => {
    console.info(`http://localhost:${port}/`);
  });
}
main();

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

/**
 * @param {string} value
 */
function bool(value) {
  const number = parseInt(value, 10);
  if (number === 0) {
    return false;
  }
  if (number === 1) {
    return true;
  }
  return value.toLowerCase() === "true";
}
