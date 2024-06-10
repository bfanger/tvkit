// @ts-check
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";
import compat from "core-js-compat";
import commonjs from "@rollup/plugin-commonjs";
import { rollup } from "rollup";
import terser from "@rollup/plugin-terser";
import tmpFolder from "./tmpFolder.js";
import isSupported from "./isSupported.js";

const require = createRequire(import.meta.url);

/**
 * @param {{browsers: string[], supports: Record<string, boolean>, minify: boolean}} options
 * @returns {Promise<string>} javascript code
 */
export default async function generatePolyfills({
  browsers,
  supports,
  minify,
}) {
  const folder = await tmpFolder(browsers, supports);
  const file = path.join(folder, `polyfills${minify ? ".min" : ""}.js`);
  const fileInfo = await fs.stat(file).catch(() => ({ mtime: 0 }));
  const pkgInfo = await fs.stat(require.resolve("../package.json"));
  const generateInfo = await fs.stat(require.resolve("./generatePolyfills.js"));
  if (
    fileInfo.mtime &&
    pkgInfo.mtime < fileInfo.mtime &&
    generateInfo.mtime < fileInfo.mtime
  ) {
    return fs.readFile(file, "utf8");
  }

  let code = "";
  const imports = [];
  for (const module of getCoreJSModules(browsers, supports)) {
    imports.push(`core-js/modules/${module}`);
  }
  if (!isSupported("fetch", browsers)) {
    imports.push("whatwg-fetch");
  }
  if (!isSupported("intersectionobserver", browsers)) {
    imports.push("intersection-observer");
  }
  if (!isSupported("proxy", browsers)) {
    imports.push("proxy-polyfill/proxy.min.js");
  }
  if (!isSupported("textencoder", browsers)) {
    imports.push("fast-text-encoding");
  }
  if (!isSupported("customevent", browsers) || isSupported("ie11", browsers)) {
    imports.push("custom-event-polyfill");
  }
  if (!isSupported("dom-append", browsers)) {
    imports.push("node-before-polyfill");
    imports.push([
      "appendPolyfill",
      "cross-browser-polyfill/src/polyfills/element-append",
    ]);
    imports.push([
      "removePolyfill",
      "cross-browser-polyfill/src/polyfills/element-remove",
    ]);
    code += `
appendPolyfill();
removePolyfill();
    `;
  }
  if (!isSupported("normalize", browsers)) {
    imports.push("unorm"); // @todo: Use a smaller non-spec-compliant polyfill?
  }

  if (!isSupported("composedPath", browsers)) {
    code += `
if (!Event.prototype.composedPath) {
  Event.prototype.composedPath = function composedPathPolyfill() {
    var target = this.target;
    if (this.path) {
      return Array.prototype.slice.call(this.path);
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
  if (!isSupported("document-currentscript", browsers)) {
    code += `
if (!document.currentScript) {
  Object.defineProperty(document, "currentScript", {
    get: function() {
      return document.scripts[document.scripts.length - 1];
    }
  });
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
  if (!isSupported(["es6-module", "es6-module-dynamic-import"], browsers)) {
    const systemJs = await fs.readFile(
      require.resolve("systemjs/dist/s.min.js"),
      "utf8",
    );
    code += systemJs.substring(
      systemJs.indexOf("*/") + 2,
      systemJs.indexOf("# sourceMappingURL="),
    );
  }
  if (!isSupported("es6-module", browsers)) {
    // Patch Object.defineProperty for Svelte 5 (Object.defineProperty throws on native code functions in older browsers)
    // Fixes "TypeError: Cannot redefine property: name"
    code += `
(function () {
  var define_property = Object.defineProperty;
  Object.defineProperty = function (obj, prop, config) {
    try {
      return define_property(obj, prop, config);
    } catch (err) {
      if (!(prop === "name" && typeof config.value === "string")) {	
        console.warn(err);
      }
      return obj;
    }
  };
}());
`;
    // Svelte 5 $inspect uses unbound call to console.log.
    // Fixes "Uncaught TypeError: Illegal invocation"
    code += `
(function () {
  var log = console.log;
  console.log = log.bind(console); 
}());
`;
  }

  // Bundle the polyfills
  const input = path.join(folder, "entry.js");
  const source = `${imports
    .map((entry) => {
      if (typeof entry === "string") {
        return `import ${JSON.stringify(require.resolve(entry))};`;
      }
      return `import ${entry[0]} from ${JSON.stringify(
        require.resolve(entry[1]),
      )};`;
    })
    .join("\n")}\n${code}`;
  await fs.writeFile(input, source, "utf8");
  const plugins = [commonjs()];
  if (minify) {
    plugins.push(terser({ ecma: 5, safari10: true }));
  }
  const builder = await rollup({ input, plugins, watch: false });
  const result = await builder.write({ format: "iife", file });
  const output = result.output[0].code;
  if (result.output.length !== 1 && !output) {
    throw new Error("Unexpected output");
  }
  return output;
}

/**
 * @param {string[]} targets
 * @param {Record<string, boolean>} supports
 */
function getCoreJSModules(targets, supports) {
  const exclude = [
    "es.array.push",
    "es.regexp.flags",
    "web.dom-exception.stack",
    "web.immediate",
  ];
  const compatData = require("core-js-compat/data.json");
  const forced = [];
  for (const [feature, browsers] of Object.entries(compatData)) {
    if (feature in supports) {
      if (supports[feature]) {
        exclude.push(feature);
      } else {
        forced.push(feature);
      }

      continue;
    }
    if (feature.startsWith("esnext.")) {
      exclude.push(feature); // Exclude unstable javascript features
    } else if (Object.keys(browsers).length === 0) {
      exclude.push(feature); // Exclude features that are not supported by any browser.
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return [
    ...forced,
    ...compat({
      targets,
      exclude,
    }).list,
  ];
}
