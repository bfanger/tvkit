// @ts-check
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as terser from "terser";
import generatePolyfills from "./generatePolyfills.js";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import isSupported from "./isSupported.js";

/**
 * @param {string} folder The input folder
 * @param {string} out The output folder
 * @param {string} browser browserslist compatible browser
 * @param {{css:boolean, minify:boolean, force:boolean}} flags
 * flags.css: Also transform css
 * flags.minify: Minify output
 * flags.force: Overwrite existing output folder
 */
export default async function build(
  folder,
  out,
  browser,
  { css, minify, force }
) {
  if (!force && (await fs.stat(out).catch(() => false))) {
    process.stderr.write(
      "\noutput folder already exists, use --force to overwrite\n\n"
    );
    process.exit(1);
  }
  await processFolder(folder, out, { base: folder, browser, css, minify });
  await generatePolyfills(browser).then((code) => {
    fs.writeFile(path.resolve(out, "tvkit-polyfills.js"), code, "utf-8");
    console.info("✅", "tvkit-polyfills.js");
  });
  const nodeModules = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../node_modules/"
  );
  const esm = isSupported(["es6-module", "es6-module-dynamic-import"], browser);
  if (!esm) {
    await fs.copyFile(
      path.resolve(nodeModules, "systemjs/dist/s.min.js"),
      path.join(folder, "tvkit-system.js")
    );
    console.info("⏩", "tvkit-system.js");
    await fs.copyFile(
      path.resolve(nodeModules, "systemjs/dist/s.min.js"),
      path.join(folder, "s.min.js.map")
    );
    console.info("⏩", "s.min.js.map");
  }
}

/**
 * @param {string} folder
 * @param {string} out
 * @param {{base: string, browser: string, css: boolean, minify: boolean}} options
 */
async function processFolder(folder, out, { base, browser, css, minify }) {
  if ((await fs.stat(out).catch(() => false)) === false) {
    await fs.mkdir(out);
  }
  const entries = await fs.readdir(folder);
  /** @type {Array<{path: string, out: string}>}  */
  const subfolders = [];
  await Promise.all(
    entries.map(async (entry) => {
      const filepath = path.resolve(folder, entry);
      const outpath = path.resolve(out, entry);
      const info = await fs.stat(filepath);
      if (info.isDirectory()) {
        subfolders.push({
          path: filepath,
          out: path.resolve(out, entry),
        });
        return;
      }
      if (entry.startsWith(".")) {
        return;
      }
      if (entry.endsWith(".js")) {
        processFile(base, filepath, outpath, async (source) => {
          const code = await transformJavascript(source, { browser });
          if (!minify) {
            return code;
          }
          return (
            (
              await terser.minify(code, {
                ecma: 5,
                safari10: true,
                // compress: { dead_code: true, arrows: false },
              })
            ).code ?? code
          );
        });
      } else if (entry.endsWith(".html") || entry.endsWith(".htm")) {
        processFile(base, filepath, outpath, (source) =>
          transformHtml(source, { browser })
        );
      } else if (css && entry.endsWith(".css")) {
        processFile(base, filepath, outpath, (source) =>
          transformCss(source, { browser, from: filepath })
        );
      } else {
        await fs.copyFile(filepath, outpath);
        console.info("⏩", filepath.substring(base.length));
      }
    })
  );
  await Promise.all(
    subfolders.map((subfolder) => {
      return processFolder(subfolder.path, subfolder.out, {
        base,
        browser,
        minify,
        css,
      });
    })
  );
}

/**
 * @param {string} base Base input path
 * @param {string} input Path of the source file
 * @param {string} output Path of the target file
 * @param {(code: string) => Promise<string>} transformer
 */
async function processFile(base, input, output, transformer) {
  const source = await fs.readFile(input, "utf-8");
  const transformed = await transformer(source);
  await fs.writeFile(output, transformed);
  console.info("✅", input.substring(base.length));
}
