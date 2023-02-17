// @ts-check
import fs from "fs/promises";
import http from "http";
import https from "https";
import express from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import getBrowsers from "./getBrowsers.js";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import generatePolyfills from "./generatePolyfills.js";
import babelRuntime from "./babelRuntime.js";
import isSupported from "./isSupported.js";
import cache from "./cache.js";
import browsersSlug from "./browsersSlug.js";
import pkg from "./pkg.js";

/**
 * Start the proxy server
 *
 * @param {number} port http port for the proxy server
 * @param {string} target url to proxy
 * @param {string} browser browserslist compatible browser
 * @param {boolean} css Also transform css
 * @param {{cert: string, key: string} | false} ssl
 */
export default async function serve(port, target, browser, css, ssl) {
  const browsers = getBrowsers(browser);

  console.info("[tvkit]", {
    port,
    target,
    browsers,
    css,
    ssl,
  });
  const minify = true;
  const modifiedSince = new Map();
  const polyfillsPromise = generatePolyfills({ browsers, minify });
  const slug = browsersSlug(browsers);

  const proxy = createProxyMiddleware({
    target,
    ws: true,
    selfHandleResponse: true,
    // changeOrigin: true,
    secure: false,
    onProxyReq(proxyReq, req) {
      // Strip previously injected headers
      const etag = req.headers["if-none-match"];
      if (etag) {
        const originalEtag = decodeEtag(etag, slug);
        if (originalEtag) {
          proxyReq.setHeader("if-none-match", originalEtag);
        } else {
          proxyReq.removeHeader("if-none-match");
        }
      }
      if (req.headers["if-modified-since"]) {
        const previousDate = modifiedSince.get(req.url);
        if (previousDate !== req.headers["if-modified-since"]) {
          proxyReq.removeHeader("if-modified-since");
        }
      }
    },
    onProxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, res) => {
        // Include transform settings in cache headers
        const etag = res.getHeader("etag");
        if (typeof etag === "string") {
          res.setHeader("etag", encodeEtag(etag, slug));
        }
        if (res.getHeader("last-modified")) {
          modifiedSince.set(req.url, res.getHeader("last-modified"));
        }
        if (proxyRes.statusCode !== 200) {
          return responseBuffer;
        }
        if (proxyRes.headers["content-type"]?.startsWith("text/html")) {
          return tryCache(responseBuffer.toString("utf8"), (content) =>
            transformHtml(content, { browsers, root: "/", css })
          );
        }
        if (
          proxyRes.headers["content-type"]?.startsWith("application/javascript")
        ) {
          let code = responseBuffer.toString("utf8");
          return tryCache(code, () => {
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
            return transformJavascript(code, { browsers, root: "/" });
          });
        }
        return responseBuffer;
      }
    ),
  });

  const app = express();
  app.disable("x-powered-by");
  app.get("/tvkit-polyfills.js", async (req, res) => {
    const etag = encodeEtag("polyfills", slug);
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    const body = await polyfillsPromise;
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("ETag", etag);
    res.send(body);
  });

  const raw = express.raw({
    inflate: true,
    limit: "50mb",
    type: () => true,
  });
  app.post("/tvkit-postcss", (req, res) => {
    raw(req, res, async () => {
      const body = await tryCache(req.body.toString("utf8"), (code) =>
        transformCss(code, { browsers, filename: "tvkit-postcss.css" })
      );
      res.send(body);
    });
  });

  app.get("/tvkit-babel-runtime/*", async (req, res) => {
    const etag = encodeEtag("babel-runtime", slug);
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("ETag", etag);
    const code = await tryCache(req.url, () =>
      babelRuntime(req.url.substring(20), { browsers, minify })
    );
    res.send(code);
  });
  app.use(proxy);

  const serverOptions = ssl
    ? { cert: await fs.readFile(ssl.cert), key: await fs.readFile(ssl.key) }
    : false;
  const server = serverOptions
    ? https.createServer(serverOptions, app)
    : http.createServer(app);
  server.listen(port, "0.0.0.0", () => {
    console.info(
      `[tvkit] Running on ${ssl ? "https" : "http"}://localhost:${port}/`
    );
  });
}

/**
 * Cache transformation for 2-5 minutes or on error return the original content.
 *
 * @param {string} content
 * @param {(content: string) => string|Promise<string>} transformer
 */
async function tryCache(content, transformer) {
  try {
    const ttl = 180 * Math.random() + 120;
    return await cache(content, ttl, transformer);
  } catch (err) {
    console.warn(err);
    return content;
  }
}

const prefix = `W/"${pkg.name}_${pkg.version}_`;
/**
 * @param {string} etag
 * @param {string} hash
 */
function encodeEtag(etag, hash) {
  return `${prefix}${hash}_${Buffer.from(etag, "ascii").toString("base64")}"`;
}

/**
 * @param {string} etag
 * @param {string} hash
 */
function decodeEtag(etag, hash) {
  if (!etag.startsWith(`${prefix}${hash}_`)) {
    return false;
  }
  return Buffer.from(
    etag.substring(hash.length + prefix.length + 1, etag.length - 1),
    "base64"
  ).toString("ascii");
}
