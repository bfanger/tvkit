import fs from "node:fs";

/** @type {import('terser').MinifyOptions} */
export const defaultMinifyOptions = {
  ecma: 5,
  safari10: true,
};

/**
 * @param {string} filename
 */
export function loadTerserConfig(filename) {
  try {
    const json = fs.readFileSync(filename, "utf-8");
    /** @type {import('terser').MinifyOptions } */
    const config = JSON.parse(json);
    return config;
  } catch (/** @type {any} */ err) {
    throw new Error(`Failed loading terser config from "${filename}"`, {
      cause: err,
    });
  }
}
