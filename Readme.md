# TVKit

A proxy server which allows using modern dev servers in old browsers.
"[Run SvelteKit on a TV](docs/sveltekit.md)"

TVKit intercepts requests to a webserver and converts the responses to make them work in old browsers. This works by injecting polyfills and transpiling the modern JavaScript and CSS to code that's compatible with older browsers.

## Usage (dev server)

- Start your vite project as normal
- Run `npx tvkit@latest serve --browser "chrome 50"` in another terminal
- Open http://localhost:3000/ in an old browser to visit your website

## tvkit serve

| Option         | Default value         | Description                                                                 |
| -------------- | --------------------- | --------------------------------------------------------------------------- |
| [target]       | http://localhost:5173 | The URL of the website that is too new                                      |
| --port         | 3000                  | The port the proxy server is going to run on                                |
| --browser      |                       | The transpilation target (uses browserslist)                                |
| --add          |                       | Override feature. Ex `--add "es6-module"` forces adding systemjs polyfill   |
| --remove       |                       | Override feature: Ex `--remove fetch` forces omitting whatwg-fetch polyfill |
| --no-css       | false                 | Disable CSS transpilation                                                   |
| --ssl-cert     |                       | Path to the SSL certificate for https                                       |
| --ssl-key      |                       | Path to the SSL certificate's private key                                   |
| --no-minify    | false                 | Disable minificaton for the polyfills                                       |
| --terser-config|                       | Path to the JSON terser config file                                         |
| --help         |                       | Show message per command. Ex: `tvkit serve --help`                          |

TVKit adds browser aliases for SmartTV platforms:
Example `--browser "Tizen 5"` is aliased to `Chrome 63`

### Start tvkit & servers at the same time

Use [concurrently](https://github.com/open-cli-tools/concurrently) to start both servers at the same time:

```json5
// package.json
"scripts": {
  "dev": "concurrently --kill-others-on-fail \"npm:dev:*\"",
  "dev:vite": "vite dev",
  "dev:tvkit": "tvkit serve --browser \"Tizen 4, WebOS 4\"",
```

## Usage (build)

Copy folder contents and transform all html, js & css files into new directory.

Build your project for modern browsers (example: vite build) and then use the `tvkit build` to convert the generated folder into something that is compatible for older browsers.

```sh
npx tvkit@latest build path/to/build --out path/to/output --browser "chrome 50"
```

## tvkit build

| Option           | Default value | Description                                                                 |
|------------------| ------------- | --------------------------------------------------------------------------- |
| [folder]         |               | The folder containing modern javascript                                     |
| --out            |               | The output folder                                                           |
| --browser        |               | The transpilation target (uses browserslist)                                |
| --force          | false         | Overwrite files in output folder                                            |
| --add            |               | Override feature. Ex `--add "es6-module"` forces adding systemjs polyfill   |
| --remove         |               | Override feature: Ex `--remove fetch` forces omitting whatwg-fetch polyfill |
| --no-css         | false         | Disable CSS transpilation                                                   |
| --no-minify      | false         | Disable minificaton                                                         |
| --quiet          | false         | Only log errors                                                             |
| --terser-config  |               | Path to the JSON terser config file                                         |
| --help           |               | Show message per command. Ex: `tvkit build --help`                          |

Note: Polyfilling will degrade the performance for platforms that could've run the modern javascript version.
An alternative to `tvkit build` is using [@vitejs/plugin-legacy](https://www.npmjs.com/package/@vitejs/plugin-legacy) which has better performance on modern browsers, but doesn't work for some project setups (like SvelteKit projects).

TVKit supports static builds from any framework and has special support for SvelteKit's node-adapter & vercel-adapter builds.

## Technology

- [SystemJS](https://github.com/systemjs/systemjs) to polyfill ES modules.
- [Babel](https://babel.dev/) to transpile javascript on the fly.
- [core-js](https://github.com/zloirock/core-js), [whatwg-fetch](https://github.com/whatwg/fetch) and others to polyfill missing features.
- [PostCSS](https://postcss.org/) to transpile CSS on the fly using postcss-preset-env.
- And others: [Rollup](https://rollupjs.org/), [Acorn](https://github.com/acornjs/acorn), [Terser](https://terser.org/), [Yargs](http://yargs.js.org/)

Consider funding these projects as they do a lot of the heavy lifting.
