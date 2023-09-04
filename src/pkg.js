import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

export default JSON.parse(
  fs.readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../package.json",
    ),
    "utf8",
  ),
);
