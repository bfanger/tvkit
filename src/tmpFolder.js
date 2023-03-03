// @ts-check
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import browsersSlug from "./browsersSlug.js";

/**
 * @param {string[]} browsers
 * @param {Record<string, boolean>} supports
 */
export default async function tmpFolder(browsers, supports) {
  // generating into the node_modules folder prevents pm2 from restarting.
  const projectFolder = path.dirname(
    path.dirname(fileURLToPath(import.meta.url))
  );
  const tvkitFolder =
    path.basename(path.dirname(projectFolder)) === "node_modules"
      ? path.resolve(projectFolder, "../.tvkit")
      : path.resolve(projectFolder, "node_modules/.tvkit");

  await fs.stat(tvkitFolder).catch(() => fs.mkdir(tvkitFolder));

  const folder = path.join(tvkitFolder, browsersSlug(browsers, supports));
  await fs.mkdir(folder, { recursive: true });
  return folder;
}
