// @ts-check

import path from "path";
import { fileURLToPath } from "url";
import { transformAsync } from "@babel/core";
import { Parser } from "acorn";
import * as walk from "acorn-walk";
import MagicString from "magic-string";
import isSupported from "./isSupported.js";

/**
 * Convert source to a module that is compatible with the given browsers.
 *
 * @param {string} source
 * @param {{browsers: string[], root: string, filename?: string, inline?: boolean}} options
 * @returns {Promise<{code: string, externals: string[]}>}
 */
export default async function transformJavascript(
  source,
  { browsers, root, filename, inline = false },
) {
  const esm = isSupported(
    ["es6-module", "es6-module-dynamic-import"],
    browsers,
  );
  /** @type {string[]} */
  const externals = [];
  let code = source;
  if (code.trim() === "") {
    if (!esm) {
      // SystemJS equivalent of an empty module
      code = `System.register([], function() {
  return { execute: function () {} };
})`;
    }
    return { code, externals };
  }
  if (!isSupported("css-keyframes", browsers)) {
    // Patch Svelte to use -webkit-keyframes
    // Fixes "SyntaxError: DOM Exception 12" on very old webkit versions
    // Note: This breaks the animation when the browser doesn't support `@-webkit-keyframes`
    code = code.replace(
      ".insertRule(`@keyframes ${",
      ".insertRule(`@-webkit-keyframes ${",
    );
  }
  if (!esm) {
    // Patch Svelte5 (Changing the value of an exported value doesn't work in SystemJS)
    // Fixes "TypeError: undefined is not a function" at append
    code = code.replace(
      `var $window;
var $document;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }`,
      `var $window = typeof window === "object" ? window : undefined;
var $document = typeof document === "object" ? document : undefined;
var first_child_getter = function () { return this.firstChild; };
var next_sibling_getter = function () { return this.nextSibling; };
var tvkitWindow
function init_operations() {
  if (tvkitWindow !== void 0) {
    return;
  }
  tvkitWindow = window;`,
    );
    if (!isSupported("dom-append", browsers)) {
      code = code.replace(
        `
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
`,
        ``,
      );
    }
  }
  if (!isSupported("proxy", browsers)) {
    // Patch Svelte5 validate_prop_bindings() function for the src\internal\client\validate.js
    // Fixes `A component is attempting to bind to a non-bindable property` errors
    code = code.replace("if (!bindable.includes(key)) {", "if (false) {");
    // Patch Svelte5 proxy() function for the src\legacy\legacy-client.js
    // Fixes SvelteKit navigation (reacting to root.$set() calls)
    code = code.replace(
      `}
  return value;
}
function unwrap(value, already_unwrapped) {`,
      `}
  if (typeof value === "object" && value != null && value.stores) {
    var tvkitProxy = {}
    var tvkitSignals = {}
    Object.keys(value).forEach(function (prop) {
      tvkitSignals[prop] = source(value[prop]);
      Object.defineProperty(tvkitProxy, prop, {
        get: function () { return get(tvkitSignals[prop]) },
        set: function (val) { set(tvkitSignals[prop], val) },
      });
    })
    return tvkitProxy;
  }
  return value;
}
function unwrap(value, already_unwrapped) {`,
    );
  }
  // Patch Svelte5 init_array_prototype_warnings() to disable detecting these warnings.
  // These Array.prototype modifications conflict with the polyfills and when applied
  // would cause `TypeError: Can't call method on undefined` errors
  code = code.replace(
    `function init_array_prototype_warnings() {`,
    `function init_array_prototype_warnings() {
    Array.__svelte_cleanup = function () {};
    return;`,
  );

  let modules = esm ? false : "systemjs";
  if (inline) {
    modules = false;
  }
  const result = await transformAsync(code, {
    configFile: false,
    babelrc: false,
    compact: false,
    minified: false,
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../"),
    filename,
    presets: [
      [
        "@babel/preset-env",
        {
          modules,
          useBuiltIns: false,
          targets: browsers,
          spec: true,
        },
      ],
    ],
    // No external runtime, as it would make the synchronous execution of the inline script synchronous
    plugins: inline ? [] : ["@babel/plugin-transform-runtime"],
  });
  if (typeof result?.code !== "string") {
    console.warn(
      `babel.transformAsync unsuccessful${
        filename ? ` for ${filename}` : ""
      }, no error, no code`,
    );
    return { code, externals };
  }
  code = result.code;
  if (code.indexOf("@babel/runtime/") !== -1 || inline) {
    /** @type {any} */
    const ast = Parser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
    const ms = new MagicString(code);
    if (!esm) {
      // Replace `import()` with `System.import()`
      walk.simple(ast, {
        ImportExpression(node) {
          ms.overwrite(node.start, node.start + 6, "System.import");
        },
      });
    }
    for (const node of ast.body) {
      // Replace `import "@babel/runtime/..."` with `import "${root}tvkit-babel-runtime/..."`
      if (
        node.type === "ImportDeclaration" &&
        node.source.value.indexOf("@babel/runtime/") !== -1
      ) {
        externals.push(node.source.value);
        ms.overwrite(
          node.source.start + 1,
          node.source.start + 16,
          `${root}tvkit-babel-runtime/`,
        ).appendLeft(node.source.end - 1, ".js");
      } else if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "CallExpression" &&
        node.expression.callee.type === "MemberExpression" &&
        node.expression.callee.object.type === "Identifier" &&
        node.expression.callee.object.name === "System" &&
        node.expression.callee.property.type === "Identifier" &&
        node.expression.callee.property.name === "register"
      ) {
        const files = node.expression.arguments[0];
        if (files.type === "ArrayExpression") {
          for (const file of files.elements) {
            if (
              file.type === "Literal" &&
              file.value.startsWith("@babel/runtime/")
            ) {
              externals.push(file.value);
              ms.overwrite(
                file.start + 1,
                file.start + 16,
                `${root}tvkit-babel-runtime/`,
              ).appendLeft(file.end - 1, ".js");
            }
          }
        }
      }
    }

    code = ms.toString();
  }

  return { code, externals };
}
