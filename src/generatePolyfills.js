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
 * @param {{browsers: string[], minify: boolean}} options
 * @returns {Promise<string>} javascript code
 */
export default async function generatePolyfills({ browsers, minify }) {
  const folder = await tmpFolder(browsers);
  const file = path.join(folder, `polyfills${minify ? ".min" : ""}.js`);
  const fileInfo = await fs.stat(file).catch(() => ({ mtime: 0 }));
  const pkgInfo = await fs.stat(require.resolve("../package.json"));
  if (fileInfo.mtime && pkgInfo.mtime < fileInfo.mtime) {
    return fs.readFile(file, "utf8");
  }

  let code = "";
  const imports = [];
  for (const module of getCoreJSModules(browsers)) {
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
    imports.push("unorm"); // @todo: Use a smaller non-spec-compliant polyll?
  }

  if (!isSupported("composedPath", browsers)) {
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
      "utf8"
    );
    code += systemJs.substring(
      systemJs.indexOf("*/") + 2,
      systemJs.indexOf("# sourceMappingURL=")
    );
  }

  // Bundle the polyfills
  const input = path.join(folder, "entry.js");
  const source = `${imports
    .map((entry) => {
      if (typeof entry === "string") {
        return `import ${JSON.stringify(require.resolve(entry))};`;
      }
      return `import ${entry[0]} from ${JSON.stringify(
        require.resolve(entry[1])
      )};`;
    })
    .join("\n")}\n${code}`;
  await fs.writeFile(input, source, "utf8");
  const plugins = [commonjs()];
  if (minify) {
    plugins.push(terser({ ecma: 5, safari10: true }));
  }
  const builder = await rollup({
    input,
    plugins: [commonjs(), terser({ ecma: 5, safari10: true })],
    watch: false,
  });
  const result = await builder.write({ format: "iife", file });
  const output = result.output[0].code;
  if (result.output.length !== 1 && !output) {
    throw new Error("Unexpected output");
  }
  return output;
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
