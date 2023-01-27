import * as esbuild from "esbuild";

export default async function generatePolyfills() {
  await esbuild.build({
    entryPoints: ["src/polyfills.js"],
    bundle: true,
    minify: true,
    format: "iife",
    target: "ie11",
    outfile: "node_modules/tvkit-polyfills.js", // generating into the node_modules folder prevents pm2 from restarting.
  });
}
