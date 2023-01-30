#!/usr/bin/env node
import fs from "fs/promises";
import express from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import generatePolyfills from "./generatePolyfills.js";

const port = 3000;
const origin = "http://localhost:5173";

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
        return transformHtml(responseBuffer.toString("utf8"));
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
        }
        return transformJavascript(code);
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
  app.use(proxy);

  app.listen(port, "0.0.0.0", () => {
    console.info(`http://localhost:${port}/`);
  });
}
main();
