// @ts-check
import fs from "fs/promises";
import path from "path";
import * as terser from "terser";
import getBrowsers from "./getBrowsers.js";
import generatePolyfills from "./generatePolyfills.js";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";
import babelRuntime from "./babelRuntime.js";

/**
 * Copy files from input to output folder and transform the html, javascript and css files.
 *
 * @param {string} folder The input folder
 * @param {string} out The output folder
 * @param {string} browser browserslist compatible browser
 * @param {{css: boolean, minify:boolean, force:boolean}} flags
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
  const browsers = getBrowsers(browser);
  console.info("[tvkit]", {
    input: path.resolve(folder),
    output: path.resolve(out),
    browsers,
    css,
    minify,
    force,
  });
  const babelRuntimeModules = await processFolder(folder, out, {
    base: path.resolve(folder),
    browsers,
    root: "",
    css,
    minify,
  });
  await generatePolyfills({ browsers, minify }).then(async (code) => {
    await fs.writeFile(path.resolve(out, "tvkit-polyfills.js"), code, "utf-8");
    console.info("✅", "/tvkit-polyfills.js");
  });
  await fs.mkdir(path.resolve(out, "tvkit-babel-runtime/helpers"), {
    recursive: true,
  });
  await Promise.all(
    Array.from(babelRuntimeModules).map(async (module) => {
      const code = await babelRuntime(module.substring(20), {
        browsers,
        minify,
      });
      await fs.writeFile(path.resolve(out, `${module.substring(1)}.js`), code, {
        encoding: "utf-8",
      });
      console.info("✅", `${module}.js`);
    })
  );
}

/**
 * @param {string} folder
 * @param {string} out
 * @param {{base: string, browsers: string[], root: string, css: boolean, minify: boolean}} options
 */
async function processFolder(
  folder,
  out,
  { base, browsers, root, css, minify }
) {
  if ((await fs.stat(out).catch(() => false)) === false) {
    await fs.mkdir(out);
  }
  const babelRuntimeModules = new Set();
  const entries = await fs.readdir(folder);
  /** @type {Array<{path: string, out: string}>}  */
  const subfolders = [];
  await Promise.all(
    entries.map(async (entry) => {
      const filename = path.resolve(folder, entry);
      const outpath = path.resolve(out, entry);
      const info = await fs.stat(filename);
      if (info.isDirectory()) {
        subfolders.push({
          path: filename,
          out: path.resolve(out, entry),
        });
        return;
      }
      if (entry.startsWith(".")) {
        return;
      }
      if (entry.endsWith(".js")) {
        await processFile(base, filename, outpath, async (source) => {
          try {
            let code = await transformJavascript(source, {
              browsers,
              root,
              filename,
            });
            const matches = code.match(/\/tvkit-babel-runtime\/([^'"]+)/g);
            matches?.forEach((module) => {
              babelRuntimeModules.add(module);
              code = code.replace(module, `${module}.js`);
            });
            if (!minify) {
              return code;
            }
            const minified = await terser.minify(code, {
              ecma: 5,
              safari10: true,
            });
            return minified.code ?? code;
          } catch (/** @type {any} */ err) {
            process.stderr.write(
              `❌ ${filename.substring(base.length)}\n\n${err?.message}`
            );
            return process.exit(1);
          }
        });
      } else if (entry.endsWith(".html") || entry.endsWith(".htm")) {
        await processFile(base, filename, outpath, (source) =>
          transformHtml(source, { browsers, root, css })
        );
      } else if (css && entry.endsWith(".css")) {
        await processFile(base, filename, outpath, (source) =>
          transformCss(source, { browsers, filename })
        );
      } else {
        await fs.copyFile(filename, outpath);
        console.info("⏩", filename.substring(base.length));
      }
    })
  );

  const processed = await Promise.all(
    subfolders.map((subfolder) =>
      processFolder(subfolder.path, subfolder.out, {
        base,
        browsers,
        minify,
        root: `${root}../`,
        css,
      })
    )
  );
  for (const additionalModules of processed) {
    additionalModules.forEach((module) => babelRuntimeModules.add(module));
  }
  return babelRuntimeModules;
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
