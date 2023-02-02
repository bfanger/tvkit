import * as esbuild from "esbuild";

/**
 * @param {string} browser
 */
export default async function generatePolyfills(browser) {
  await esbuild.build({
    entryPoints: ["src/polyfills.js"],
    bundle: true,
    minify: true,
    format: "iife",
    target: browser.replace(" ", ""),
    outfile: "node_modules/tvkit-polyfills.js", // generating into the node_modules folder prevents pm2 from restarting.
  });
}
