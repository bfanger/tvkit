import { parse } from "node-html-parser";

/**
 * @param {string} source
 */
export default function transformHtml(source) {
  const ast = parse(source);
  ast.querySelectorAll("script").forEach((node) => {
    node.setAttribute("type", "systemjs-module");
  });
  ast
    .querySelector("head")
    ?.insertAdjacentHTML(
      "afterbegin",
      '<script src="/tvkit-system.js"></script>'
    );
  return ast.toString();
}
