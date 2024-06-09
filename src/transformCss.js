// @ts-check
import postcss from "postcss";
// @ts-ignore
import presetEnv from "postcss-preset-env";
import isSupported from "./isSupported.js";
import pseudoWhere from "./postcss-pseudo-where/plugin.cjs";

/** @type {Record<string,import('postcss').Processor>} */
const processors = {};

/**
 * @param {string} css
 * @param {{ browsers: string[], filename?: string }} options
 */
export default async function transformCss(css, { browsers, filename }) {
  const key = browsers.join("\n");
  if (!processors[key]) {
    const plugins = [presetEnv({ browsers })];
    if (!isSupported("css-selector-where", browsers)) {
      plugins.push(pseudoWhere());
    }
    processors[key] = postcss(plugins);
  }
  const result = await processors[key].process(css, {
    from: filename,
  });
  return result.css;
}
