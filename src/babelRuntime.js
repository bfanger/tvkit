import { createRequire } from "module";
import commonjs from "@rollup/plugin-commonjs";
import { rollup } from "rollup";
import terser from "@rollup/plugin-terser";
import isSupported from "./isSupported.js";

const require = createRequire(import.meta.url);

/**
 * Generate a @babel/runtime helper as an importable modules.
 *
 * @param {string} module
 * @param {string[]} targets
 */
export default async function babelRuntime(module, targets) {
  const input = require.resolve(`@babel/runtime${module}`);
  const builder = await rollup({
    input,
    plugins: [commonjs(), terser({ ecma: 5, safari10: true })],
    watch: false,
  });
  const result = await builder.generate({
    format: isSupported(["es6-module", "es6-module-dynamic-import"], targets)
      ? "esm"
      : "system",
  });
  if (result.output.length !== 1 && !result.output[0].code) {
    throw new Error("Unexpected output");
  }
  return result.output[0].code;
}
