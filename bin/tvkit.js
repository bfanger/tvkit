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
        type: "number",
        default: 3000,
        describe: "Port of the proxy server",
      });
      yargs.option("browser", {
        type: "string",
        default: "ie 11",
        describe: "The target platform",
      });
      yargs.option("css", {
        type: "boolean",
        default: true,
        describe: "Use --no-css to skip transpiling CSS",
      });
    },
    (argv) => {
      // @ts-ignore
      serve(argv.port, argv.target, argv.browser, argv.css);
    }
  )
  .command(
    "build [folder]",
    "Copy folder and transform files to targetted browser platform",
    (yargs) => {
      yargs.positional("[folder]", {
        type: "string",
        describe: "Folder to transform",
      });
      yargs.option("out", {
        type: "string",
        describe: "The output folder",
        demandOption: true,
      });
      yargs.option("browser", {
        type: "string",
        default: "ie 11",
        describe: "The target platform",
      });
      yargs.option("css", {
        type: "boolean",
        default: true,
        describe: "Use --no-css to skip transpiling CSS",
      });
      yargs.option("minify", {
        type: "boolean",
        default: false,
        describe: "Use --minify apply minification",
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
