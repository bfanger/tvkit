import postcssPresetEnv from "postcss-preset-env";
import postcss from "postcss";

/** @type {Record<string,import('postcss').Processor>} */
const processors = {};

/**
 * @param {string} css
 * @param {{  browser: string, from?: string }} opts
 */
export default async function transformCss(css, { browser, from }) {
  if (!processors[browser]) {
    processors[browser] = postcss([
      postcssPresetEnv({ browsers: [browser], autoprefixer: { grid: true } }),
    ]);
  }
  const result = await processors[browser].process(css, {
    from,
  });
  return result.css;
}
