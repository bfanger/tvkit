import postcssPresetEnv from "postcss-preset-env";
import postcss from "postcss";

/** @type {Record<string,import('postcss').Processor>} */
const processors = {};

/**
 * @param {string} css
 * @param {{ target: string, from?: string }} opts
 */
export default async function transformCss(css, { target, from }) {
  if (!processors[target]) {
    processors[target] = postcss([
      postcssPresetEnv({ browsers: [target], autoprefixer: { grid: true } }),
    ]);
  }
  const result = await processors[target].process(css, {
    from,
  });
  return result.css;
}
