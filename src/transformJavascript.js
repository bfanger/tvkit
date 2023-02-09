// @ts-check
/* eslint-disable no-template-curly-in-string */
import path from "path";
import { fileURLToPath } from "url";
import { transformAsync } from "@babel/core";
import isSupported from "./isSupported.js";

/**
 * @param {string} source
 * @param {{ browsers: string[], inline?: boolean }} options
 * @returns {Promise<string>}
 */
export default async function transformJavascript(
  source,
  { browsers, inline }
) {
  /** @type {"systemjs" | false} */
  let modules = "systemjs";
  let preprocessed = source;
  if (!isSupported("css-keyframes", browsers)) {
    // Patch svelte to use -webkit-keyframes
    // Fixes "SyntaxError: DOM Exception 12" on very old webkit versions
    // Note: This breaks the animation when the browser doesn't support `@-webkit-keyframes`
    preprocessed = source.replace(
      ".insertRule(`@keyframes ${name} ${rule}`",
      ".insertRule(`@-webkit-keyframes ${name} ${rule}`"
    );
  }
  if (isSupported(["es6-module", "es6-module-dynamic-import"], browsers)) {
    modules = false;
  } else if (inline) {
    // System.js has a bug where it doesn't work with relative imports from a script tag
    modules = false;
    preprocessed = await inlineImports(preprocessed);
  }

  const result = await transformAsync(preprocessed, {
    configFile: false,
    compact: false,
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../"),
    presets: [
      [
        "@babel/preset-env",
        {
          modules,
          corejs: { version: 3 },
          useBuiltIns: "entry",
          targets: browsers,
          spec: true,
        },
      ],
    ],
  });
  let code = result?.code ?? "console.error('transformJavascript failed');";
  if (!isSupported("symbol", browsers)) {
    // Fix competing Symbol polyfills
    code = code.replace(
      'throw new TypeError("@@toPrimitive must return a primitive value.");',
      ';if (typeof res === "object" && res[Symbol.toPrimitive]) { return res[Symbol.toPrimitive].toString() }; throw new TypeError("@@toPrimitive must return a primitive value.");'
    );
  }
  return code;
}

/**
 * @param {string} code
 */
async function inlineImports(code) {
  const result = await transformAsync(
    code.replace("import(", "System.import("),
    {
      configFile: false,
      compact: false,
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../"),
      presets: [
        [
          "@babel/preset-env",
          {
            modules: "commonjs",
            corejs: { version: 3 },
            useBuiltIns: "entry",
            targets: "last 1 chrome version",
          },
        ],
      ],
    }
  );
  if (!result?.code) {
    return code;
  }
  return `(async function () {\n${result.code.replace(
    " = require(",
    " = await System.import("
  )}\n})()`;
}
