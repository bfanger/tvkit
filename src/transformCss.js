// @ts-check
import postcss from "postcss";
// @ts-ignore
import postcssPresetEnv from "postcss-preset-env";

/** @type {Record<string,import('postcss').Processor>} */
const processors = {};

/**
 * @param {string} css
 * @param {{ browsers: string[], filename?: string }} options
 */
export default async function transformCss(css, { browsers, filename }) {
  const key = browsers.join("\n");
  if (!processors[key]) {
    processors[key] = postcss([postcssPresetEnv({ browsers })]);
  }
  const result = await processors[key].process(css, {
    from: filename,
  });
  return result.css;
}
