import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import generatePolyfills from "./generatePolyfills.js";
import transformHtml from "./transformHtml.js";
import transformJavascript from "./transformJavascript.js";
import transformCss from "./transformCss.js";

/**
 * @param {string} folder The folder to transform
 * @param {string} browser browserslist compatible browser
 * @param {boolean} css Also transform css
 */
export default async function build(folder, browser, css) {
  const polyfillPath = path.resolve(folder, "tvkit-polyfills.js");
  const exists = await fs.stat(polyfillPath).catch(() => false);
  if (exists) {
    process.stderr.write("\nfolder can only be processed once\n\n");
    process.exit(1);
  }
  await processFolder(folder, { base: folder, browser, css });
  await generatePolyfills(browser).then((code) => {
    fs.writeFile(polyfillPath, code, "utf-8");
  });
  const nodeModules = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../node_modules/"
  );
  await fs.copyFile(
    path.resolve(nodeModules, "systemjs/dist/s.min.js"),
    path.join(folder, "tvkit-system.js")
  );
  await fs.copyFile(
    path.resolve(nodeModules, "systemjs/dist/s.min.js"),
    path.join(folder, "s.min.js.map")
  );
}

/**
 * @param {string} folder
 * @param {{base:string,browser:string, css:boolean}} options
 */
async function processFolder(folder, { base, browser, css }) {
  const entries = await fs.readdir(folder);
  /** @type {string[]}  */
  const folders = [];
  await Promise.all(
    entries.map(async (entry) => {
      const filepath = path.resolve(folder, entry);
      const info = await fs.stat(filepath);
      if (info.isDirectory()) {
        folders.push(filepath);
        return;
      }
      if (entry.startsWith(".")) {
        return;
      }
      if (entry.endsWith(".js")) {
        transform(filepath, (source) =>
          transformJavascript(source, { browser })
        );
      } else if (entry.endsWith(".html") || entry.endsWith(".htm")) {
        transform(filepath, (source) => transformHtml(source, { browser }));
      }
      if (css && entry.endsWith(".css")) {
        transform(filepath, (source) =>
          transformCss(source, { browser, from: filepath })
        );
      }
    })
  );
  await Promise.all(
    folders.map((f) => processFolder(f, { base, browser, css }))
  );
}

/**
 * @param {string} filepath
 * @param {(code:string)=>Promise<string>} transformer
 */
async function transform(filepath, transformer) {
  const source = await fs.readFile(filepath, "utf-8");
  const output = await transformer(source);
  await fs.writeFile(filepath, output);
  console.info("✅", filepath);
}
