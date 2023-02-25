// @ts-check
import { parse } from "node-html-parser";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import isSupported from "./isSupported.js";

/**
 * @param {string} source
 * @param {{ browsers: string[], root: string, css?: boolean  }} options
 */
export default async function transformHtml(source, { browsers, root, css }) {
  const esm = isSupported(
    ["es6-module", "es6-module-dynamic-import"],
    browsers
  );

  const ast = parse(source);
  if (!esm) {
    ast.querySelectorAll('link[rel="modulepreload"]').forEach((node) => {
      node.remove();
    });
    ast.querySelectorAll("script").forEach((node) => {
      if (node.hasAttribute("src") && node.getAttribute("type") === "module") {
        node.setAttribute("type", "systemjs-module");
      }
    });
  }
  await Promise.all(
    ast.querySelectorAll("script").map(async (node) => {
      if (node.hasAttribute("src") || node.textContent.length === 0) {
        return;
      }
      const type = node.getAttribute("type");
      if (
        typeof type === "undefined" ||
        ["module", "text/javascript", "application/javascript"].includes(type)
      ) {
        const { code } = await transformJavascript(node.textContent, {
          browsers,
          root,
          inline: node.getAttribute("type") !== "module",
        });
        if (!esm && node.getAttribute("type") === "module") {
          node.removeAttribute("type");
        }
        node.set_content(code);
      }
    })
  );

  const script = ast.querySelector("script");
  if (script) {
    script.insertAdjacentHTML(
      "beforebegin",
      `<script src="${root}tvkit-polyfills.js"></script>\n`
    );
  }
  if (css) {
    await Promise.all(
      ast.querySelectorAll("style").map(async (node) => {
        if (node.textContent.length > 0) {
          const code = await transformCss(node.textContent, { browsers });
          node.set_content(code);
        }
      })
    );
  }
  return ast.toString();
}
