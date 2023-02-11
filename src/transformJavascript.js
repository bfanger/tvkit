// @ts-check
/* eslint-disable no-template-curly-in-string */
import path from "path";
import { fileURLToPath } from "url";
import { transformAsync } from "@babel/core";
import isSupported from "./isSupported.js";

/**
 * Convert source to a module that is compatible with the given browsers.
 *
 * @param {string} source
 * @param {{browsers: string[], root: string}} options
 * @returns {Promise<string>}
 */
export default async function transformJavascript(source, { browsers, root }) {
  let code = source;
  if (!isSupported("css-keyframes", browsers)) {
    // Patch svelte to use -webkit-keyframes
    // Fixes "SyntaxError: DOM Exception 12" on very old webkit versions
    // Note: This breaks the animation when the browser doesn't support `@-webkit-keyframes`
    code = source.replace(
      ".insertRule(`@keyframes ${name} ${rule}`",
      ".insertRule(`@-webkit-keyframes ${name} ${rule}`"
    );
  }
  code = await babelTranform(code, {
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

  code = code.replaceAll("@babel/runtime/", `${root}tvkit-babel-runtime/`);
  return code;
}

/**
 * @param {string} source
 * @param {import("@babel/core").TransformOptions} options
 */
async function babelTranform(source, options) {
  const result = await transformAsync(source, {
    configFile: false,
    compact: false,
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../"),
    ...options,
  });
  if (result?.code) {
    return result?.code;
  }
  console.warn("babelTranform failed");
  return `// babelTranform failed\n${source}`;
}
