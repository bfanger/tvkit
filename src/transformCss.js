// @ts-check
import postcssPresetEnv from "postcss-preset-env";
import postcss from "postcss";

/** @type {Record<string,import('postcss').Processor>} */
const processors = {};

/**
 * @param {string} css
 * @param {{  browsers: string[], from?: string }} options
 */
export default async function transformCss(css, { browsers, from }) {
  const key = browsers.join("\n");
  if (!processors[key]) {
    processors[key] = postcss([postcssPresetEnv({ browsers })]);
  }
  const result = await processors[key].process(css, {
    from,
  });
  return result.css;
}
