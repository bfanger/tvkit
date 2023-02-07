// @ts-check
/* eslint-disable no-template-curly-in-string */
import path from "path";
import { fileURLToPath } from "url";
import { transformAsync } from "@babel/core";
import isSupported from "./isSupported.js";

/**
 * @param {string} source
 * @param {{ browsers: string[] }} options
 * @returns {Promise<string>}
 */
export default async function transformJavascript(source, { browsers }) {
  // Fix "SyntaxError: DOM Exception 12" on very old webkit versions
  // Note: This breaks the animation when the browser doesn't support `@-webkit-keyframes`
  const preprocessed = source.replace(
    ".insertRule(`@keyframes ${name} ${rule}`",
    ".insertRule(`@-webkit-keyframes ${name} ${rule}`"
  );
  const esm = isSupported(
    ["es6-module", "es6-module-dynamic-import"],
    browsers
  );

  const result = await transformAsync(preprocessed, {
    configFile: false,
    compact: false,
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../"),
    presets: [
      [
        "@babel/preset-env",
        {
          modules: esm ? false : "systemjs",
          corejs: { version: 3 },
          useBuiltIns: "entry",
          targets: browsers,
          spec: true,
        },
      ],
    ],
  });
  let code = result?.code ?? "console.error('transformJavascript failed');";
  // Fix competing Symbol polyfills
  code = code.replace(
    'throw new TypeError("@@toPrimitive must return a primitive value.");',
    ';if (typeof res === "object" && res[Symbol.toPrimitive]) { return res[Symbol.toPrimitive].toString() }; throw new TypeError("@@toPrimitive must return a primitive value.");'
  );
  return code;
}
