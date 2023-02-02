import { parse } from "node-html-parser";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import isSupported from "./isSupported.js";

/**
 * @param {string} source
 * @param {{ browser: string, css?: boolean }} options
 */
export default async function transformHtml(source, { browser, css }) {
  const esm = isSupported(["es6-module", "es6-module-dynamic-import"], browser);

  const ast = parse(source);
  if (!esm) {
    await Promise.all(
      ast.querySelectorAll("script").map(async (node) => {
        if (node.getAttribute("type") !== "module") {
          return;
        }
        if (node.hasAttribute("src")) {
          node.setAttribute("type", "systemjs-module");
        } else if (node.textContent.length > 0) {
          node.removeAttribute("type");
          const code = await transformJavascript(node.textContent, {
            browser,
          });
          node.set_content(code);
        }
      })
    );
  }
  const head = ast.querySelector("head");
  if (!esm) {
    head?.insertAdjacentHTML(
      "afterbegin",
      `
    <script src="/tvkit-system.js"></script>`
    );
  }
  head?.insertAdjacentHTML(
    "afterbegin",
    `
    <script src="/tvkit-polyfills.js"></script>`
  );
  if (css) {
    await Promise.all(
      ast.querySelectorAll("style").map(async (node) => {
        if (node.textContent.length > 0) {
          const code = await transformCss(node.textContent, { browser });
          node.set_content(code);
        }
      })
    );
  }
  return ast.toString();
}
