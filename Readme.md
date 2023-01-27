# TVKit

A proxy server to run a modern dev server in old browsers.
"Run SvelteKit on a TV"

## Usage

- Start your vite project
- Make sure it is running on port 5173
- Inside the tvkit dir run `node src/server.js`
- Open http://localhost:3000/ to visit your project in an old non ESM browser

## Technology

- Uses [SystemJS](https://github.com/systemjs/systemjs) to to polyfill ES modules.
- Uses [Babel](https://babel.dev/) to transpile the modules on the fly.
- Uses [core-js](https://github.com/zloirock/core-js) and [whatwg-fetch](https://github.com/whatwg/fetch) to polyfill missing features.

# Caveats

HMR is not supported, change `plugins: [ svelte({ hot: false })]` in your `vite.config.js` or for SvelteKit add `vitePlugin: { hot: false }` to your `svelte.config.js`.
