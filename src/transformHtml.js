import { parse } from "node-html-parser";
import transformJavascript from "./transformJavascript.js";

/**
 * @param {string} source
 */
export default async function transformHtml(source) {
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
        const code = await transformJavascript(node.textContent);
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
  return ast.toString();
}
