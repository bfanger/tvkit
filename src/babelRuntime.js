import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import commonjs from "@rollup/plugin-commonjs";
import { rollup } from "rollup";
import terser from "@rollup/plugin-terser";
import isSupported from "./isSupported.js";

/**
 * Generate a @babel/runtime helper as an importable modules.
 *
 * @param {string} module
 * @param {{browsers: string[], minify?:boolean, terserConfig?: Object}} options
 */
export default async function babelRuntime(
  module,
  { browsers, minify, terserConfig },
) {
  const plugins = [commonjs()];

  if (minify) {
    // Use custom terser config if provided, otherwise use default
    const terserOptions = terserConfig || { ecma: 5, safari10: true };
    // @ts-ignore - we know this is compatible with terser options
    plugins.push(terser(terserOptions));
  }
  const builder = await rollup({
    input: await resolveFilename(module),
    plugins,
    watch: false,
  });
  const result = await builder.generate({
    format: isSupported(["es6-module", "es6-module-dynamic-import"], browsers)
      ? "esm"
      : "system",
  });
  if (result.output.length !== 1 && !result.output[0].code) {
    throw new Error("Unexpected output");
  }
  return result.output[0].code;
}

/**
 * @param {string} module
 */
async function resolveFilename(module) {
  const runtime = await resolveRuntime();
  const modulePath = module.substring(1);
  const exact = path.resolve(runtime, modulePath);
  if (exact.startsWith(runtime) === false) {
    throw new Error(`Blocked request for ${exact}`);
  }
  if (await isFile(exact)) {
    return exact;
  }
  const js = path.resolve(runtime, `${modulePath}.js`);
  if (await isFile(js)) {
    return js;
  }
  const index = path.resolve(runtime, `${modulePath}/index.js`);
  if (await isFile(index)) {
    return index;
  }
  throw new Error(`Unable to resolve @babel/runtime${module}`);
}

async function resolveRuntime() {
  const srcDir = path.dirname(fileURLToPath(import.meta.url));
  const direct = path.resolve(srcDir, "../node_modules/@babel/runtime");
  if (await fs.stat(direct).catch(() => false)) {
    return direct;
  }
  const peer = path.resolve(srcDir, "../../../node_modules/@babel/runtime");
  if (await fs.stat(peer).catch(() => false)) {
    return peer;
  }
  throw new Error("Unable to locate @babel/runtime");
}

/**
 * @param {string} filename
 */
async function isFile(filename) {
  try {
    const info = await fs.stat(filename);
    return info.isFile();
  } catch {
    return false;
  }
}
