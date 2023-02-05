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
        describe: "Use --no-css to disable transpiling CSS",
      });
    },
    (argv) => {
      // @ts-ignore
      serve(argv.port, argv.target, argv.browser, argv.css);
    }
  )
  .command(
    "build [folder]",
    "Transform build output",
    (yargs) => {
      yargs.positional("[folder]", {
        type: "string",
        describe: "Folder to transform",
      });
      yargs.option("browser", {
        type: "string",
        default: "ie 11",
        describe: "The target platform",
      });
      yargs.option("css", {
        type: "boolean",
        default: true,
        describe: "Use --no-css to disable transpiling CSS",
      });
    },
    (argv) => {
      // @ts-ignore
      build(argv.folder, argv.browser, argv.css);
    }
  )

  .demandCommand()
  .help("help", "").argv;
