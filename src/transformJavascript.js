/* eslint-disable no-template-curly-in-string */
import { transformAsync } from "@babel/core";
/**
 * @param {string} source
 * @returns {Promise<string>}
 */
export default async function transformJavascript(source) {
  // Fix "SyntaxError: DOM Exception 12" on very old webkit versions
  // Note: This breaks the animation when the browser doesn't support `@-webkit-keyframes`
  const preprocessed = source.replace(
    ".insertRule(`@keyframes ${name} ${rule}`",
    ".insertRule(`@-webkit-keyframes ${name} ${rule}`"
  );
  const result = await transformAsync(preprocessed, {
    configFile: false,
    compact: false,
    presets: [
      [
        "@babel/preset-env",
        {
          modules: "systemjs",
          corejs: { version: 3 },
          useBuiltIns: "entry",
          targets: ["ie 11"],
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
