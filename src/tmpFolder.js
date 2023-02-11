// @ts-check
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

/**
 * @param {string[]} browsers
 */
export default async function tmpFolder(browsers) {
  // generating into the node_modules folder prevents pm2 from restarting.
  const projectFolder = path.dirname(
    path.dirname(fileURLToPath(import.meta.url))
  );
  const tvkitFolder =
    path.basename(path.dirname(projectFolder)) === "node_modules"
      ? path.resolve(projectFolder, "../.tvkit")
      : path.resolve(projectFolder, "node_modules/.tvkit");

  await fs.stat(tvkitFolder).catch(() => fs.mkdir(tvkitFolder));
  const slug = browsers
    .join("_")
    .toLowerCase()
    .replace(/[ .\\/]+/gm, "");
  const folder = path.join(tvkitFolder, slug);
  await fs.stat(tvkitFolder).catch(() => fs.mkdir(tvkitFolder));
  await fs.stat(folder).catch(() => fs.mkdir(folder));
  return folder;
}
