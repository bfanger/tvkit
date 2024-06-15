# Svelte 5

Svelte 5 is using javascript & css patterns that are not easily transpiled into legacy javascript & css code.

I've documented my findings/work-in-progress here:

## CSS caveats

Svelte 5 is using the [:where() selector](https://caniuse.com/mdn-css_selectors_where) for lower specificity which is only supported in modern browsers.

TVKit removes the :where from CSS selector, resulting in css with different specificity.

## $document.title undefined

Using `<svelte:head><title>` is causing errors because in **src/internal/client/dom/operations.js**

```ts
export var $window;
export var $document;
```

is incompatible with SystemJS as the assignment in the init_operations() is ignored.

patch:

```ts
export var $window = typeof window !== "undefined" ? window : undefined;
export var $document = typeof document !== "undefined" ? document : undefined;

let initialized = false;
export function init_operations() {
  if (initialized) {
    return;
  }
```

## TypeError: Cannot redefine property: name

Trying to call Object.defineProperty on native functions throws an exception in older Chrome.

TVKit patches the `Object.defineProperty` function and ignores the error when trying to override the name.
