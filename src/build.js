#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */

import fs from "fs/promises";
import path from "path";
import Babel from "@babel/standalone";

const config = {
  presets: [["env", { modules: "systemjs" }]],
};

processFolder("./build");

/**
 * @param {string} folder
 */
async function processFolder(folder) {
  await fs.readdir(folder).then(async (entries) => {
    /** @type {string[]}  */
    const folders = [];
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.endsWith(".es5.js")) {
          return;
        }
        const filepath = path.resolve(folder, entry);
        if (entry.endsWith(".js")) {
          const outfile = path.resolve(
            folder,
            `${entry.substring(0, entry.length - 3)}.es5.js`
          );
          const source = await fs.readFile(filepath, "utf-8");
          await fs.writeFile(
            outfile,
            Babel.transform(source, config).code,
            "utf-8"
          );
          console.info("✅", outfile);
        } else {
          const info = await fs.stat(filepath);
          if (info.isDirectory()) {
            folders.push(filepath);
          }
        }
      })
    );

    await Promise.all(folders.map((f) => processFolder(f)));
  });
}
