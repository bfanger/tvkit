/* eslint-disable @typescript-eslint/no-misused-promises */
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
import isSupported, { setOverrides } from "./isSupported.js";
import cache from "./cache.js";
import browsersSlug from "./browsersSlug.js";
import pkg from "./pkg.js";

/**
 * Start the proxy server
 *
 * @param {number} port http port for the proxy server
 * @param {string} target url to proxy
 * @param {string} browser browserslist compatible browser
 * @param {Record<string, boolean>} supports Override features
 * @param {{cert: string, key: string} | false} ssl
 * @param {{css: boolean, minify?: boolean}} flags
 */
export default async function serve(
  port,
  target,
  browser,
  supports,
  ssl,
  { css, minify },
) {
  const browsers = getBrowsers(browser);
  setOverrides(supports);

  minify = minify ?? true;

  console.info("[tvkit]", {
    port,
    target,
    browsers,
    supports,
    css,
    minify,
    ssl,
  });

  const modifiedSince = new Map();
  const polyfillsPromise = generatePolyfills({ browsers, supports, minify });
  const slug = browsersSlug(browsers, supports);

  const proxy = createProxyMiddleware({
    target,
    ws: true,
    selfHandleResponse: true,
    // changeOrigin when target is a domain name
    changeOrigin: !new URL(target).hostname.match("^(localhost|[0-9.]+)$"),
    secure: false,
    on: {
      proxyReq(proxyReq, req) {
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
      proxyRes: responseInterceptor(
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
          const contentType = proxyRes.headers["content-type"];
          if (contentType?.startsWith("text/html")) {
            return tryCache(responseBuffer.toString("utf8"), (content) =>
              transformHtml(content, { browsers, root: "/", css }),
            );
          }
          if (css && contentType?.startsWith("text/css")) {
            let code = responseBuffer.toString("utf8");
            return tryCache(code, async () => {
              return transformCss(code, { browsers, filename: req.url });
            });
          }
          if (
            contentType?.startsWith("application/javascript") ||
            contentType?.startsWith("text/javascript")
          ) {
            let code = responseBuffer.toString("utf8");
            return tryCache(code, async () => {
              if (req.url === "/@vite/client") {
                if (
                  isSupported(
                    ["custom-elements", "shadowdom", "css-variables"],
                    browsers,
                  ) === false
                ) {
                  code = code
                    .replace(
                      "class ErrorOverlay extends HTMLElement",
                      "class ErrorOverlay",
                    )
                    .replace("super();", "")
                    .replace(
                      "document.body.appendChild(new ErrorOverlay(err))",
                      "console.error(err.message + '\\n' + err.stack)",
                    );
                }
                if (css) {
                  // Add client side caching?, sessionStorage?
                  code = code.replace(
                    "function updateStyle(id, content) {",
                    `var updateStyleAsync = {};
    function updateStyle(id, content) {
      var current = {};
      updateStyleSync(id, content); // fast update (without postcss applied)
      updateStyleAsync[id] = current;
      return fetch("/tvkit-postcss", {
        method: "POST",
        body: content,
        headers: { "Content-Type": "text/css" },
      }).then(function (response) {
        if (!response.ok) {
          return;
        }
        return response.text().then(function (css) {
          if (updateStyleAsync[id] === current) {
            removeStyle(id);
            updateStyleSync(id, css);
          }
        });
      });
    }

    function updateStyleSync(id, content) {`,
                  );
                }
              }
              const now = Date.now();
              if (code.length > 512 * 1024) {
                process.stdout.write(
                  `${req.url} ${(code.length / 1024).toLocaleString("en", { maximumFractionDigits: 0 })} kB\n`,
                );
              }
              const transformed = await transformJavascript(code, {
                browsers,
                root: "/",
              });
              const elapsed = Date.now() - now;
              if (elapsed > 5000) {
                process.stdout.write(
                  `${req.url} took ${Math.round(elapsed / 1000)}s\n`,
                );
              }
              return transformed.code;
            });
          }
          return responseBuffer;
        },
      ),
    },
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
        transformCss(code, { browsers, filename: "tvkit-postcss.css" }),
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
      babelRuntime(req.url.substring(20, req.url.length - 3), {
        browsers,
        minify,
      }),
    );
    if (code === req.url) {
      res.status(500).end();
      return;
    }
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
      `[tvkit] Running on ${ssl ? "https" : "http"}://localhost:${port}/`,
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
    "base64",
  ).toString("ascii");
}
