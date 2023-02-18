# SvelteKit

[SvelteKit](https://kit.svelte.dev/) is a modern framework, but by default doesn't work in old non-esm browsers.
https://github.com/sveltejs/kit/issues/12, https://github.com/sveltejs/kit/pull/6265

This isn't big problem for webdevelopers, as [ES6-modules has excellent browser support](https://caniuse.com/es6-module).

But for SmartTV development thats another story:
A Samsung TV from 2018 (Tizen 4) uses the render engine from Januari 2017 (Chrome 56) and will never update.

## Development

SvelteKit uses the default [Vite](https://vitejs.dev/) port 5173 so `tvkit serve` can run with minimal configuration as shown in the [Readme](../Readme.md)

## Static builds

### Hosted

When using the [static adapter](https://kit.svelte.dev/docs/adapter-static)

Nothing special is needed, just build the project as normal:

```js
// svelte.config.js
import adapter from "@sveltejs/adapter-static";

export default {
  kit: {
    adapter: adapter(),
  },
};
```

and process the output directory with `tvkit build`:

```json
// package.json
"scripts": {
  "build": "vite build && tvkit build ./build --out ./dist --browser \"Tizen 6, WebOS 6\"",
```

and deploy the `dist` folder to the hosting provider.

### Packaged

// TODO: Figure out how links and reloads could work

## Dynamic server

When using the [node adapter](https://kit.svelte.dev/docs/adapter-node)

// TODO: Figure out how to patch the html response, maybe a expose a hook?
// Is running the tvkit proxy in production a viable solution?
