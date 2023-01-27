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
  const files = new Map();
  const app = express();
  app.disable("x-powered-by");
  const proxy = createProxyMiddleware({
    target: origin,
    selfHandleResponse: true,
    // changeOrigin: true,
    onProxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, res) => {
        if (files.has(req.url)) {
          res.statusCode = 200;
          responseBuffer.toString("utf8");
          return files.get(req.url);
        }

        if (proxyRes.headers["content-type"]?.startsWith("text/html")) {
          return transformHtml(responseBuffer.toString("utf8"));
        }
        if (
          proxyRes.headers["content-type"]?.startsWith("application/javascript")
        ) {
          const code = await transformJavascript(
            responseBuffer.toString("utf8")
          );
          if (req.url === "/@vite/client") {
            return 'console.error("Vite dev is not supported in TVKit");)';
          }
          return code;
        }
        return responseBuffer;
      }
    ),
  });

  app.use(proxy);

  await generatePolyfills();
  files.set(
    "/tvkit-system.js",
    await fs.readFile("node_modules/systemjs/dist/system.js", "utf8")
  );
  files.set(
    "/tvkit-polyfills.js",
    await fs.readFile("node_modules/tvkit-polyfills.js", "utf8")
  );

  app.listen(port, "0.0.0.0", () => {
    console.info(`http://localhost:${port}/`);
  });
}
main();
