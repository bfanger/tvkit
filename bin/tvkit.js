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
        describe: "Use --no-css to skip transpiling CSS",
      });
      yargs.option("ssl-cert", {
        type: "string",
        describe: "path to SSL certificate for HTTPS",
      });
      yargs.option("ssl-key", {
        type: "string",
        describe: "path to SSL certificate's private key",
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
      // @ts-ignore
      serve(argv.port, argv.target, argv.browser, argv.css, ssl);
    }
  )
  .command(
    "build [folder]",
    "Copy and transform files (experimental)",
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
        describe: "Use --no-css to skip transpiling CSS",
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
    },
    (argv) => {
      // @ts-ignore
      build(argv.folder, argv.out, argv.browser, {
        css: argv.css,
        minify: argv.minify,
        force: argv.force,
      });
    }
  )

  .demandCommand()
  .help("help", "").argv;
