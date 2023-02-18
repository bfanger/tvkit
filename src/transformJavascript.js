// @ts-check
/* eslint-disable no-template-curly-in-string */
import path from "path";
import { fileURLToPath } from "url";
import { transformAsync } from "@babel/core";
import { Parser } from "acorn";
import MagicString from "magic-string";
import isSupported from "./isSupported.js";

/**
 * Convert source to a module that is compatible with the given browsers.
 *
 * @param {string} source
 * @param {{browsers: string[], root: string, filename?: string}} options
 * @returns {Promise<{code: string, externals: string[]}>}
 */
export default async function transformJavascript(
  source,
  { browsers, root, filename }
) {
  /** @type {string[]} */
  const externals = [];
  let code = source;
  if (code.trim() === "") {
    return { code, externals };
  }
  if (!isSupported("css-keyframes", browsers)) {
    // Patch Svelte to use -webkit-keyframes
    // Fixes "SyntaxError: DOM Exception 12" on very old webkit versions
    // Note: This breaks the animation when the browser doesn't support `@-webkit-keyframes`
    code = source.replace(
      ".insertRule(`@keyframes ${name} ${rule}`",
      ".insertRule(`@-webkit-keyframes ${name} ${rule}`"
    );
  }
  const result = await transformAsync(code, {
    configFile: false,
    babelrc: false,
    compact: false,
    minified: false,
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../"),
    filename,
    presets: [
      [
        "@babel/preset-env",
        {
          modules: isSupported(
            ["es6-module", "es6-module-dynamic-import"],
            browsers
          )
            ? false
            : "systemjs",
          useBuiltIns: false,
          targets: browsers,
          spec: true,
        },
      ],
    ],
    plugins: ["@babel/plugin-transform-runtime"],
  });
  if (typeof result?.code !== "string") {
    console.warn(
      `babel.transformAsync unsuccessful${
        filename ? ` for ${filename}` : ""
      }, no error, no code`
    );
    return { code, externals };
  }
  code = result?.code;
  if (code.indexOf("@babel/runtime/") !== -1) {
    /** @type {any} */
    const ast = Parser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
    const ms = new MagicString(code);
    for (const node of ast.body) {
      if (
        node.type === "ImportDeclaration" &&
        node.source.value.indexOf("@babel/runtime/") !== -1
      ) {
        externals.push(node.source.value);
        ms.overwrite(
          node.source.start + 1,
          node.source.start + 16,
          `${root}tvkit-babel-runtime/`
        ).appendLeft(node.source.end - 1, ".js");
      } else if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "CallExpression" &&
        node.expression.callee.type === "MemberExpression" &&
        node.expression.callee.object.type === "Identifier" &&
        node.expression.callee.object.name === "System" &&
        node.expression.callee.property.type === "Identifier" &&
        node.expression.callee.property.name === "register"
      ) {
        const files = node.expression.arguments[0];
        if (files.type === "ArrayExpression") {
          for (const file of files.elements) {
            if (
              file.type === "Literal" &&
              file.value.startsWith("@babel/runtime/")
            ) {
              externals.push(file.value);
              ms.overwrite(
                file.start + 1,
                file.start + 16,
                `${root}tvkit-babel-runtime/`
              ).appendLeft(file.end - 1, ".js");
            }
          }
        }
      }
    }
    return { code: ms.toString(), externals };
  }

  return { code, externals };
}
