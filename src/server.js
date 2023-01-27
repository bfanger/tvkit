// #!/usr/bin/env node
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
    selfHandleResponse: true,
    // changeOrigin: true,
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
      if (proxyRes.headers["content-type"]?.startsWith("text/html")) {
        return transformHtml(responseBuffer.toString("utf8"));
      }
      if (
        proxyRes.headers["content-type"]?.startsWith("application/javascript")
      ) {
        return transformJavascript(responseBuffer.toString("utf8"));
      }
      return responseBuffer;
    }),
  });

  const files = new Map();
  files.set(
    "/tvkit-system.js",
    await fs.readFile("node_modules/systemjs/dist/system.js", "utf8")
  );
  await generatePolyfills();
  files.set(
    "/tvkit-polyfills.js",
    await fs.readFile("node_modules/tvkit-polyfills.js", "utf8")
  );
  files.set(
    "/@vite/client",
    await transformJavascript(await fs.readFile("./src/viteClient.js", "utf8"))
  );
  for (const url of files.keys()) {
    app.get(url, (_, res) => {
      res.setHeader("content-type", "application/javascript");
      res.send(files.get(url));
    });
  }
  app.use(proxy);

  app.listen(port, "0.0.0.0", () => {
    console.info(`http://localhost:${port}/`);
  });
}
main();
