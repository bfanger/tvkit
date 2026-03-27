import { matchesGlob } from "node:path";

/**
 * Check if the path should skip the transformation step
 *
 * @param {string} path Relative path
 * @param {string[]} skipTransform Globs to match against
 * @returns
 */
export default function matchSkipTransform(path, skipTransform) {
  for (const glob of skipTransform) {
    if (matchesGlob(path, glob)) {
      return true;
    }
  }
  return false;
}
