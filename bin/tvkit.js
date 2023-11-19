#!/usr/bin/env node
import Yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import serve from "../src/serve.js";
import build from "../src/build.js";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
Yargs(hideBin(process.argv))
  .scriptName("tvkit")
  .command(
    "serve [target]",
    "Start proxy server",
    (yargs) => {
      yargs.positional("target", {
        type: "string",
        default: "http://localhost:5173",
        describe: "Url that needs transpilation",
      });
      yargs.option("port", {
        alias: "p",
        type: "number",
        default: 3000,
        describe: "Port of the proxy server",
      });
      yargs.option("browser", {
        type: "string",
        describe: 'The target platform. Ex: "chrome 60"',
        demandOption: true,
      });
      yargs.option("css", {
        type: "boolean",
        default: true,
        describe: "Use --no-css to skip transpiling css",
      });
      yargs.option("add", {
        type: "string",
        describe: "Override features (adds polyfills)",
      });
      yargs.option("remove", {
        type: "string",
        describe: "Override features (skips polyfills)",
      });
      yargs.option("ssl-cert", {
        type: "string",
        describe: "Path to the ssl certificate for https",
      });
      yargs.option("ssl-key", {
        type: "string",
        describe: "Path to the ssl certificate's private key",
      });
      yargs.option("minify", {
        type: "boolean",
        describe: "Toggle minification for polyfills",
      });
    },
    async (argv) => {
      /** @type {Parameters<typeof serve>[4]} */
      let ssl = false;
      if (typeof argv.sslCert === "string" && typeof argv.sslKey === "string") {
        ssl = {
          cert: argv.sslCert,
          key: argv.sslKey,
        };
      }
      serve(
        // @ts-ignore
        argv.port,
        argv.target,
        argv.browser,
        overrides(argv.add, argv.remove),
        ssl,
        {
          css: argv.css,
          minify: argv.minify,
        },
      );
    },
  )
  .command(
    "build [folder]",
    "Copy and transform files",
    (yargs) => {
      yargs.positional("[folder]", {
        type: "string",
        describe: "Folder to transform",
      });
      yargs.option("out", {
        alias: "o",
        type: "string",
        describe: "The output folder",
        demandOption: true,
      });
      yargs.option("browser", {
        type: "string",
        describe: 'The target platform. Ex: "chrome 60"',
        demandOption: true,
      });
      yargs.option("css", {
        type: "boolean",
        default: true,
        describe: "Use --no-css to skip transpiling css",
      });
      yargs.option("minify", {
        type: "boolean",
        default: true,
        describe: "Use --no-minify to skip minification",
      });
      yargs.option("force", {
        type: "boolean",
        alias: "f",
        default: false,
        describe: "Overwrite output folder if it exists",
      });
      yargs.option("add", {
        type: "string",
        describe: "Override features (adds polyfills)",
      });
      yargs.option("remove", {
        type: "string",
        describe: "Override features (skips polyfills)",
      });
      yargs.option("quiet", {
        type: "boolean",
        default: false,
        describe: "Only show error output",
      });
    },
    (argv) => {
      if (argv.out === "") {
        throw new Error(
          "No output folder specified, check the `--out` is using double dash and followed by a value",
        );
      }
      build(
        // @ts-ignore
        argv.folder,
        argv.out,
        argv.browser,
        overrides(argv.add, argv.remove),
        {
          css: argv.css,
          minify: argv.minify,
          force: argv.force,
          quiet: argv.quiet,
        },
      );
    },
  )

  .demandCommand()
  .help("help", "").argv;

/**
 * @param {unknown} add
 * @param {unknown} remove
 */
function overrides(add, remove) {
  /** @type {Record<string, boolean>} */
  const supports = {};
  if (typeof remove === "string") {
    for (const feature of remove.split(",")) {
      supports[feature] = true;
    }
  }
  if (typeof add === "string") {
    for (const feature of add.split(",")) {
      supports[feature] = false;
    }
  }
  return supports;
}
