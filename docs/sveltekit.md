# SvelteKit

[SvelteKit](https://kit.svelte.dev/) is a modern framework, but by default doesn't work in old non-esm browsers.
https://github.com/sveltejs/kit/issues/12, https://github.com/sveltejs/kit/pull/6265

This isn't big problem for webdevelopers, as [ES6-modules has excellent browser support](https://caniuse.com/es6-module).

But for SmartTV development thats another story:
A Samsung TV from 2018 (Tizen 4) uses the render engine from Januari 2017 (Chrome 56) and will never update.

## Development

SvelteKit uses the default [Vite](https://vitejs.dev/) port 5173 so `tvkit serve` can run with minimal configuration as shown in the [Readme](../Readme.md)

## Static builds - @sveltejs/adapter-static

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

```json5
// package.json
"scripts": {
  "build": "vite build && tvkit build ./build --out ./dist --browser \"Tizen 6, WebOS 6\"",
```

and deploy the `dist` folder to the hosting provider.

### Packaged (file:// urls)

// TODO: Figure out how links and reloads could work

## Dynamic server - @sveltejs/adapter-node

When using the [node adapter](https://kit.svelte.dev/docs/adapter-node)

Similar to the static adapter, but TVKit will detect the build directory is using sveltekit node adapter layout and adapts accordingly.

```json5
// package.json
"scripts": {
  "build": "vite build && tvkit build ./build --out ./dist --browser \"Tizen 6, WebOS 6\"",
```

Deploy the `dist` folder to a node hosting provider.

## Dynamic server - @sveltejs/adapter-vercel

When using the [vercel adapter](https://kit.svelte.dev/docs/adapter-vercel)
In the project settings use de Framework Preset "SvelteKit" and override for the "Build command": change it from `vite build` to `npm run build`

And update the build script to:

```json5
// package.json
"scripts": {
  "build": "vite build && tvkit build --browser \"Tizen 6, WebOS 6\" ./.vercel/output --out ./.vercel/output --force",
```
