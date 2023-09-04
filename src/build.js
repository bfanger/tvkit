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
import isSupported, { setOverrides } from "./isSupported.js";

/**
 * Copy files from input to output folder and transform the html, javascript and css files.
 *
 * @param {string} folder The input folder
 * @param {string} out The output folder
 * @param {string} browser browserslist compatible browser
 * @param {Record<string, boolean>} supports Override features
 * @param {{css: boolean, minify:boolean, force:boolean}} flags
 * flags.css: Also transform css
 * flags.minify: Minify output
 * flags.force: Overwrite existing output folder
 */
export default async function build(
  folder,
  out,
  browser,
  supports,
  { css, minify, force },
) {
  if (!force && (await fs.stat(out).catch(() => false))) {
    process.stderr.write(
      "\noutput folder already exists, use --force to overwrite\n\n",
    );
    process.exit(1);
  }
  const browsers = getBrowsers(browser);
  setOverrides(supports);
  const input = path.resolve(folder);
  const { publicFolder, justCopy, sveltekit } = await detectPreset(folder);
  console.info("[tvkit]", {
    input,
    output: path.resolve(out),
    sveltekit,
    public: publicFolder,
    browsers,
    supports,
    css,
    minify,
    force,
  });
  const publicPath = path.join(out, publicFolder.substring(1));

  const externals = await processFolder(folder, out, {
    base: path.resolve(folder),
    browsers,
    root: "",
    css,
    minify,
    justCopy,
  });
  await generatePolyfills({ browsers, supports, minify }).then(async (code) => {
    await fs.writeFile(
      path.resolve(publicPath, "tvkit-polyfills.js"),
      code,
      "utf-8",
    );
    console.info("✅", `${publicFolder}tvkit-polyfills.js`);
  });
  await fs.mkdir(path.resolve(publicPath, "tvkit-babel-runtime/helpers"), {
    recursive: true,
  });
  await Promise.all(
    Array.from(new Set(externals)).map(async (module) => {
      const code = await babelRuntime(module.substring(14), {
        browsers,
        minify,
      });
      const outfile = `tvkit-babel-runtime/${module.substring(15)}.js`;
      await fs.writeFile(path.resolve(publicPath, outfile), code, {
        encoding: "utf-8",
      });
      console.info("✅", `${publicFolder}${outfile}`);
    }),
  );
  if (sveltekit) {
    let code = await fs.readFile(
      path.resolve(folder, sveltekit.substring(1)),
      "utf-8",
    );
    code = patchSveltKitServer(code, browsers);
    await fs.writeFile(
      path.resolve(out, sveltekit.substring(1)),
      code,
      "utf-8",
    );
    console.info("🩹", sveltekit);
  }
}

/**
 * @param {string} folder
 * @param {string} out
 * @param {{base: string, browsers: string[], root: string, css: boolean, minify: boolean, justCopy: boolean | string[] }} options
 */
async function processFolder(
  folder,
  out,
  { base, browsers, root, css, minify, justCopy },
) {
  if ((await fs.stat(out).catch(() => false)) === false) {
    await fs.mkdir(out, { recursive: true });
  }
  /** @type {string[]} */
  const externals = [];
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
      const shouldProcess = Array.isArray(justCopy)
        ? justCopy.indexOf(filename) === -1
        : !justCopy;
      if (shouldProcess) {
        if (entry.endsWith(".js")) {
          await processFile(base, filename, outpath, async (source) => {
            try {
              const { code, externals: nested } = await transformJavascript(
                source,
                {
                  browsers,
                  root,
                  filename,
                },
              );
              externals.push(...nested);
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
                `❌ ${filename.substring(base.length)}\n\n${err?.message}`,
              );
              return process.exit(1);
            }
          });
        } else if (entry.endsWith(".html") || entry.endsWith(".htm")) {
          await processFile(base, filename, outpath, (source) =>
            transformHtml(source, { browsers, root, css }),
          );
        } else if (css && entry.endsWith(".css")) {
          await processFile(base, filename, outpath, (source) =>
            transformCss(source, { browsers, filename }),
          );
        } else {
          await fs.copyFile(filename, outpath);
          console.info("⏩", filename.substring(base.length));
        }
      } else {
        await fs.copyFile(filename, outpath);
        console.info("⏩", filename.substring(base.length));
      }
    }),
  );

  const results = await Promise.all(
    subfolders.map((subfolder) =>
      processFolder(subfolder.path, subfolder.out, {
        base,
        browsers,
        minify,
        root: `${root}../`,
        css,
        justCopy: justCopyFolder(subfolder.path, justCopy),
      }),
    ),
  );
  externals.push(...results.flat(1));
  return externals;
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

/** @param {string} folder */
async function detectPreset(folder) {
  if (
    await fs
      .readFile(path.resolve(folder, "server/index.js"))
      .then(
        (content) => content.toString().indexOf("import('@sveltejs/kit") !== -1,
      )
      .catch(() => false)
  ) {
    // SvelteKit (node)
    return {
      publicFolder: "/client/",
      justCopy: [
        path.resolve(folder, "server"),
        path.resolve(folder, "index.js"),
        path.resolve(folder, "env.js"),
        path.resolve(folder, "shims.js"),
        path.resolve(folder, "handler.js"),
      ],
      sveltekit: "/server/index.js",
    };
  }
  if (
    await fs
      .stat(
        path.resolve(
          folder,
          "functions/fn.func/.svelte-kit/output/server/index.js",
        ),
      )
      .catch(() => false)
  ) {
    // SvelteKit (vercel)
    return {
      publicFolder: "/static/",
      justCopy: [path.resolve(folder, "functions")],
      sveltekit: "/functions/fn.func/.svelte-kit/output/server/index.js",
    };
  }
  return {
    publicFolder: "/",
    justCopy: false,
  };
}

/**
 * Check if a subfolder should be copied instead of processed else it returns the original value.
 *
 * @param {string} subfolder
 * @param {string[] | boolean} justCopy
 */
function justCopyFolder(subfolder, justCopy) {
  if (typeof justCopy === "boolean") {
    return justCopy;
  }
  if (justCopy.includes(subfolder)) {
    return true;
  }
  return justCopy;
}

/**
 * Patches private SvelteKit server code.
 * This is fragile and breaks between SvelteKit releases, tvkit only supports one version.
 * To keep using tvkit with an older version of SvelteKit, you must also use an older version of tvkit.
 *
 * @param {string} source
 * @param {string[]} browsers
 * */
function patchSveltKitServer(source, browsers) {
  let code = source;
  // Inject polyfills
  code = replaceOrFail(
    code,
    "const init_app = `",
    "head = '<script src=\"/tvkit-polyfills.js\"></script>\\n' + head;\n\t\tconst init_app = `",
  );
  if (!isSupported("es6-module", browsers)) {
    // Remove modulepreloads
    code = replaceOrFail(
      code,
      "for (const path of included_modulepreloads) {",
      "for (const path of []) {",
    );
    // Use System.import instead of esm
    code = replaceOrFail(code, /\timport\(/gm, "\tSystem.import(");
  }
  return code;
}

/**
 * @param {string} code
 * @param {string | RegExp} search
 * @param {string} replacement
 */
function replaceOrFail(code, search, replacement) {
  const result = code.replace(search, replacement);
  if (result === code) {
    throw new Error(
      `Failed to patch server code, could not find:\n\n${search}\n`,
    );
  }
  return result;
}
