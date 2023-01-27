// @ts-nocheck
/* eslint-disable prefer-destructuring, no-var, no-extend-native, no-underscore-dangle */
import "core-js/stable";
import "regenerator-runtime";
import "whatwg-fetch";
import "element-remove";
import "intersection-observer";
import "unorm"; // @todo: Use a smaller non-spec-compliant polyfill?

/**
 * SvelteKit specific polyfills
 */
window.__SVELTEKIT_APP_VERSION_POLL_INTERVAL__ =
  window.__SVELTEKIT_APP_VERSION_POLL_INTERVAL__ || 1000;
window.__SVELTEKIT_EMBEDDED__ = window.__SVELTEKIT_EMBEDDED__ || false;

Error.prototype.stack = Error.prototype.stack || ""; // fix`new Error().stack` in fetcher.js

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
