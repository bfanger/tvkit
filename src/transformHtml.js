import { parse } from "node-html-parser";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";

/**
 * @param {string} source
 * @param {{ browser: string, css?: boolean }} opts
 */
export default async function transformHtml(source, { browser, css }) {
  const ast = parse(source);
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
  ast.querySelector("head")?.insertAdjacentHTML(
    "afterbegin",
    `
    <script src="/tvkit-polyfills.js"></script>
    <script src="/tvkit-system.js"></script>
`
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
