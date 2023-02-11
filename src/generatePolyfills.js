// @ts-check
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";
import * as esbuild from "esbuild";
import compat from "core-js-compat";
import isSupported from "./isSupported.js";
import tmpFolder from "./tmpFolder.js";

const require = createRequire(import.meta.url);

/**
 * @param {string[]} targets
 * @returns {Promise<string>} javascript code
 */
export default async function generatePolyfills(targets) {
  let code = "";
  const imports = [];
  for (const module of getCoreJSModules(targets)) {
    imports.push(
      `import ${JSON.stringify(require.resolve(`core-js/modules/${module}`))};`
    );
  }
  if (!isSupported("fetch", targets)) {
    imports.push('import "whatwg-fetch";');
  }
  if (!isSupported("intersectionobserver", targets)) {
    imports.push('import "intersection-observer";');
  }
  if (!isSupported("proxy", targets)) {
    imports.push('import "proxy-polyfill/proxy.min.js";');
  }
  if (!isSupported("textencoder", targets)) {
    imports.push('import "fast-text-encoding";');
  }
  if (!isSupported("customevent", targets) || isSupported("ie11", targets)) {
    imports.push('import "custom-event-polyfill";');
  }
  if (!isSupported("childnode-remove", targets)) {
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
  if (!isSupported("normalize", targets)) {
    imports.push('import "unorm";'); // @todo: Use a smaller non-spec-compliant polyfill?
  }

  if (!isSupported("composedPath", targets)) {
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
  if (!isSupported(["es6-module", "es6-module-dynamic-import"], targets)) {
    const systemJs = await fs.readFile(
      require.resolve("systemjs/dist/s.min.js"),
      "utf8"
    );
    code += systemJs.substring(
      systemJs.indexOf("*/") + 2,
      systemJs.indexOf("# sourceMappingURL=")
    );
  }

  // Bundle the polyfills
  const folder = await tmpFolder(targets);
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
    target: targets.map((target) => target.replace(" ", "")),
    outfile: out,
  });
  return fs.readFile(out, "utf8");
}

/**
 * @param {string[]} targets
 */
function getCoreJSModules(targets) {
  const exclude = [
    "es.array.push",
    "es.regexp.flags",
    "web.dom-exception.stack",
    "web.immediate",
  ];
  const compatData = require("core-js-compat/data.json");
  for (const [feature, browsers] of Object.entries(compatData)) {
    if (feature.startsWith("esnext.")) {
      exclude.push(feature); // Exclude unstable javascript features
    } else if (Object.keys(browsers).length === 0) {
      exclude.push(feature); // Exclude features that are not supported by any browser.
    }
  }
  return compat({
    targets,
    exclude,
  }).list;
}
