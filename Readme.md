# TVKit

A proxy server to use a modern dev server in old browsers.
"Run SvelteKit on a TV"

TVKit intercepts requests to the other webserver and makes them work in old browsers by injecting polyfills and compiles modern javascript and CSS to a code that is compatible with the older browser.

## Usage

- Start your vite project as normal
- Run `npx tvkit@latest serve` in another terminal
- Open http://localhost:3000/ in an old browser to visit your website

  | Option    | Default value         | Description                                        |
  | --------- | --------------------- | -------------------------------------------------- |
  | [target]  | http://localhost:5173 | The URL of the website that is too new             |
  | --port    | 3000                  | The port the proxy server is going to run on       |
  | --browser | "ie 11"               | The transpilation target (uses browserslist)       |
  | --no-css  | false                 | Disable CSS transpilation                          |
  | --help    |                       | Show message per command. Ex: `tvkit serve --help` |

## Technology

- [SystemJS](https://github.com/systemjs/systemjs) to polyfill ES modules.
- [Babel](https://babel.dev/) to transpile javascript on the fly.
- [core-js](https://github.com/zloirock/core-js), [whatwg-fetch](https://github.com/whatwg/fetch) and others to polyfill missing features.
- [PostCSS](https://postcss.org/) to transpile CSS on the fly using postcss-preset-env.
