// @ts-check
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";
import * as esbuild from "esbuild";
import compat from "core-js-compat";
import isSupported from "./isSupported.js";

const require = createRequire(import.meta.url);

/**
 * @param {string} browser
 * @returns {Promise<string>} javascript code
 */
export default async function generatePolyfills(browser) {
  const features = compat({ targets: browser, exclude: getExcludeList() }).list;

  const imports = [];
  let code = "";
  for (const feature of features) {
    imports.push(
      `import ${JSON.stringify(require.resolve(`core-js/modules/${feature}`))};`
    );
  }
  if (!isSupported(["es6-generators", "async-functions"], browser)) {
    imports.push('import "regenerator-runtime";');
  }
  if (!isSupported("fetch", browser)) {
    imports.push('import "whatwg-fetch";');
  }
  if (!isSupported("intersectionobserver", browser)) {
    imports.push('import "intersection-observer";');
  }
  if (!isSupported("proxy", browser)) {
    imports.push('import "proxy-polyfill/proxy.min.js";');
  }
  if (!isSupported("textencoder", browser)) {
    imports.push('import "fast-text-encoding";');
  }
  if (!isSupported("customevent", browser) || isSupported("ie11", browser)) {
    imports.push('import "custom-event-polyfill";');
  }
  if (!isSupported("childnode-remove", browser)) {
    imports.push(
      'import appendPolyfill from "cross-browser-polyfill/src/polyfills/element-append";'
    );
    imports.push(
      'import removePolyfill from "cross-browser-polyfill/src/polyfills/element-remove";'
    );
    code += `
appendPolyfill();
removePolyfill();
`;
  }
  if (!isSupported("normalize", browser)) {
    imports.push('import "unorm";'); // @todo: Use a smaller non-spec-compliant polyfl)?
  }

  if (!isSupported("composedPath", browser)) {
    code += `
if (!Event.prototype.composedPath) {
  Event.prototype.composedPath = function composedPathPolyfill() {
    var target = this.target;
    if (this.path) {
      return this.path;
    }
    this.path = [];
    while (target.parentNode !== null) {
      this.path.push(target);
      target = target.parentNode;
    }
    this.path.push(document, window);
    return this.path;
  };
}
`;
  }

  // SvelteKit specific polyfills
  code += `
window.__SVELTEKIT_APP_VERSION_POLL_INTERVAL__ =
  window.__SVELTEKIT_APP_VERSION_POLL_INTERVAL__ || 0;
window.__SVELTEKIT_EMBEDDED__ = window.__SVELTEKIT_EMBEDDED__ || false;
`;
  // fix "new Error().stack" in @sveltejs/kit/src/runtime/client/fetcher.js
  code += `
if (typeof new Error().stack !== "string") {
  Error.prototype.stack = Error.prototype.stack || ""; 
}
`;

  // Bundle the polyfills
  const folder = await createFolder(browser);
  const entry = path.join(folder, "entry.js");
  await fs.writeFile(entry, `${imports.join("\n")}\n${code}`);
  const out = path.join(folder, "polyfills.js");
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  await esbuild.build({
    entryPoints: [entry],
    absWorkingDir: path.resolve(dirname, "../"),
    bundle: true,
    minify: true,
    format: "iife",
    target: browser.replace(" ", ""),
    outfile: out,
  });
  return fs.readFile(out, "utf8");
}

/**
 * @param {string} browser
 */
async function createFolder(browser) {
  // generating into the node_modules folder prevents pm2 from restarting.
  const projectFolder = path.dirname(
    path.dirname(fileURLToPath(import.meta.url))
  );
  const tvkitFolder =
    path.basename(path.dirname(projectFolder)) === "node_modules"
      ? path.resolve(projectFolder, "../.tvkit")
      : path.resolve(projectFolder, "node_modules/.tvkit");

  await fs.stat(tvkitFolder).catch(() => fs.mkdir(tvkitFolder));
  const slug = browser.toLowerCase().replace(/[ .\\/]+/gm, "");
  const folder = path.join(tvkitFolder, slug);
  await fs.stat(tvkitFolder).catch(() => fs.mkdir(tvkitFolder));
  await fs.stat(folder).catch(() => fs.mkdir(folder));
  return folder;
}

/**
 * The default list from core-js-compat also contains unstable javascript features.
 * This function filters out all unstable features and features that are not supported by any browser.
 */
function getExcludeList() {
  /**
   * @type {string[]}
   */
  const exclude = [
    "es.array.push",
    "es.regexp.flags",
    "web.dom-exception.stack",
    "web.immediate",
  ];
  const compatData = require("core-js-compat/data.json");

  for (const [feature, browsers] of Object.entries(compatData)) {
    if (feature.startsWith("esnext.")) {
      exclude.push(feature);
    } else if (Object.keys(browsers).length === 0) {
      exclude.push(feature);
    }
  }
  return exclude;
}
