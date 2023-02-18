# TVKit

A proxy server to use a modern dev server in old browsers.
"[Run SvelteKit on a TV](docs/sveltekit.md)"

TVKit intercepts requests to the other webserver and makes them work in old browsers by injecting polyfills and compiles modern javascript and CSS to a code that is compatible with the older browser.

## Usage (dev server)

- Start your vite project as normal
- Run `npx tvkit@latest serve --browser "chrome 50"` in another terminal
- Open http://localhost:3000/ in an old browser to visit your website

## tvkit serve

| Option    | Default value         | Description                                        |
| --------- | --------------------- | -------------------------------------------------- |
| [target]  | http://localhost:5173 | The URL of the website that is too new             |
| --port    | 3000                  | The port the proxy server is going to run on       |
| --browser |                       | The transpilation target (uses browserslist)       |
| --no-css  | false                 | Disable CSS transpilation                          |
| --help    |                       | Show message per command. Ex: `tvkit serve --help` |

tvkit adds browser aliases for SmartTV platforms:
Example `--browser "Tizen 5"` is aliased to `Chrome 63`

### Start tvkit & servers at the same time

Use [concurrently](https://github.com/open-cli-tools/concurrently) to start both servers at the same time:

```json
// package.json
"scripts": {
  "dev": "concurrently --kill-others-on-fail \"npm:dev:*\" --prefix-colors \"#fcc72a\",\"#005fb0\"",
  "dev:vite": "vite dev",
  "dev:tvkit": "tvkit serve --browser \"Tizen 4, WebOS 4\"",
}
```

## Usage (build)

> Experimental feature
> Use alternative [@vitejs/plugin-legacy](https://www.npmjs.com/package/@vitejs/plugin-legacy) if you can.

```sh
npx tvkit@latest build path/to/build --out path/to/output --browser "chrome 50"
```

## Technology

- [SystemJS](https://github.com/systemjs/systemjs) to polyfill ES modules.
- [Babel](https://babel.dev/) to transpile javascript on the fly.
- [core-js](https://github.com/zloirock/core-js), [whatwg-fetch](https://github.com/whatwg/fetch) and others to polyfill missing features.
- [PostCSS](https://postcss.org/) to transpile CSS on the fly using postcss-preset-env.
- And others: [Rollup](https://rollupjs.org/), [Acorn](https://github.com/acornjs/acorn), [Yargs](http://yargs.js.org/)

Consider funding these projects are they do a lot of the heavy lifting.
