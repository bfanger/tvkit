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
  const code = result?.code ?? "console.error('transformJavascript failed');";
  return code;
}
