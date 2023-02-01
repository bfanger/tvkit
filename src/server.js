#!/usr/bin/env node
import fs from "fs/promises";
import express from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import generatePolyfills from "./generatePolyfills.js";

const port = 3000;
const origin = "http://localhost:5173";
const target = "ie 11";
const css = true;

async function main() {
  const app = express();
  app.disable("x-powered-by");
  const proxy = createProxyMiddleware({
    target: origin,
    ws: true,
    selfHandleResponse: true,
    // changeOrigin: true,
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req) => {
      if (proxyRes.statusCode !== 200) {
        return responseBuffer;
      }
      if (proxyRes.headers["content-type"]?.startsWith("text/html")) {
        return transformHtml(responseBuffer.toString("utf8"), { css, target });
      }
      if (
        proxyRes.headers["content-type"]?.startsWith("application/javascript")
      ) {
        let code = responseBuffer.toString("utf8");
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
        return transformJavascript(code, { target });
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
  await generatePolyfills();
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
        res.send(
          await transformCss(code, { target, from: "tvkit-postcss.css" })
        );
      });
    });
  }
  app.use(proxy);

  app.listen(port, "0.0.0.0", () => {
    console.info(`http://localhost:${port}/`);
  });
}
main();
