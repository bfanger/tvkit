# TVKit

A proxy server to run a modern dev server in old browsers.
"Run SvelteKit on a TV"

## Usage

- Start your vite project
- Make sure it is running on port 5173
- Inside the tvkit dir run `node src/server.js`
- Open http://localhost:3000/ to visit your project in an old non ESM browser

## Technology

- [SystemJS](https://github.com/systemjs/systemjs) to polyfill ES modules.
- [Babel](https://babel.dev/) to transpile javascript on the fly.
- [core-js](https://github.com/zloirock/core-js) and [whatwg-fetch](https://github.com/whatwg/fetch) to polyfill missing features.
- [PostCSS](https://postcss.org/) to transpile CSS on the fly using postcss-preset-env.

# Caveats

HMR is not supported, change `plugins: [ svelte({ hot: false })]` in your `vite.config.js` or for SvelteKit add `vitePlugin: { hot: false }` to your `svelte.config.js`.
