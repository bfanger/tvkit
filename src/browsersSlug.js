import crypto from "crypto";

/**
 * @param {string[]} browsers
 * @param {Record<string, boolean>} supports
 */
export default function browsersSlug(browsers, supports) {
  return browsers.length === 1 && Object.keys(supports).length === 0
    ? browsers[0].replace(/ /, "")
    : `multiple_${crypto
        .createHash("md5")
        .update(JSON.stringify({ browsers, supports }))
        .digest("hex")}`;
}
