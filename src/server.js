// #!/usr/bin/env node
import fs from "fs/promises";
import express from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";

const port = 3000;
const origin = "http://localhost:5173";

const app = express();
app.disable("x-powered-by");
const proxy = createProxyMiddleware({
  target: origin,
  selfHandleResponse: true,
  // changeOrigin: true,
  onProxyRes: responseInterceptor(
    async (responseBuffer, proxyRes, req, res) => {
      if (req.url === "/tvkit-system.js") {
        res.statusCode = 200; // set different response status code
        responseBuffer.toString("utf8");
        return readSystemJs();
      }
      if (proxyRes.headers["content-type"] === "text/html") {
        return transformHtml(responseBuffer.toString("utf8"));
      }
      if (proxyRes.headers["content-type"] === "application/javascript") {
        return transformJavascript(responseBuffer.toString("utf8"));
      }
      return responseBuffer;
    }
  ),
});

app.use(proxy);

app.listen(port, () => {
  console.info(`http://localhost:${port}/`);
});

async function readSystemJs() {
  if (!readSystemJs.cache) {
    readSystemJs.cache = await fs.readFile(
      "node_modules/systemjs/dist/system.min.js",
      "utf8"
    );
  }
  return readSystemJs.cache;
}
readSystemJs.cache = "";
