import { transformAsync } from "@babel/core";
/**
 * @param {string} source
 * @returns {Promise<string>}
 */
export default async function transformJavascript(source) {
  const result = await transformAsync(source, {
    configFile: false,
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
