import crypto from "crypto";

/**
 * @param {string[]} browsers
 */
export default function browsersSlug(browsers) {
  return browsers.length === 1
    ? browsers[0].replace(/ /, "")
    : `multiple_${crypto
        .createHash("md5")
        .update(JSON.stringify(browsers))
        .digest("hex")}`;
}
