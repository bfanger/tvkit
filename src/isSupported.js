// @ts-check
import caniuse from "caniuse-lite";

/** @type {Record<string, boolean>} */
let overrides = {};

/**
 * @param {string|string[]} featureOrFeatures
 * @param {string[]} targets
 */
export default function isSupported(featureOrFeatures, targets) {
  if (Array.isArray(featureOrFeatures)) {
    return featureOrFeatures.every((feature) =>
      featureIsSupported(feature, targets),
    );
  }
  return featureIsSupported(featureOrFeatures, targets);
}

/** @type {Record<string, Record<string, number>>} */
const supportMatrix = {
  // https://caniuse.com/mdn-javascript_builtins_string_normalize
  normalize: {
    chrome: 34,
    safari: 10,
    firefox: 31,
    edge: 12,
    ie: Infinity,
    samsung: 4,
    opera: 21,
  },
  // https://caniuse.com/mdn-api_event_composedpath
  composedPath: {
    chrome: 53,
    safari: 10,
    firefox: 59,
    edge: 79,
    ie: Infinity,
    samsung: 6.2,
    opera: 40,
  },
  // https://caniuse.com/mdn-css_at-rules_keyframes
  "css-keyframes": {
    chrome: 43,
    safari: 9,
    firefox: 16,
    edge: 12,
    ie: Infinity,
    samsung: 4,
    opera: 30,
  },
  // https://caniuse.com/mdn-javascript_builtins_symbol
  symbol: {
    chrome: 38,
    safari: 9,
    firefox: 36,
    edge: 12,
    ie: Infinity,
    samsung: 4,
    opera: 25,
  },
  "dom-append": {
    chrome: 54,
    safari: 10,
    firefox: 49,
    edge: 17,
    ie: Infinity,
    samsung: 6.2,
    opera: 41,
  },
  // Detect IE11
  ie11: {
    chrome: Infinity,
    safari: Infinity,
    firefox: Infinity,
    edge: Infinity,
    ie: 11,
    samsung: Infinity,
    opera: Infinity,
  },
};

/**
 * @param {string} feature
 * @param {string[]} browsers
 */
function featureIsSupported(feature, browsers) {
  if (feature in overrides) {
    return overrides[feature];
  }
  if (feature in supportMatrix) {
    return inSupportMatrix(feature, browsers);
  }
  const packed = caniuse.features[feature];
  if (!packed) {
    throw new Error(`Unknown feature: ${feature}`);
  }
  const data = caniuse.feature(packed);
  for (const browserFull of browsers) {
    const split = browserFull.split(" ");
    const browser = split[0];
    const version = split[1];
    const support = data.stats[browser]?.[version];
    if (!support) {
      console.warn(
        `No stats available for feature "${feature}" in combination with "${browserFull}"`,
      );
      return false;
    }
    if (support === "n") {
      return false;
    }
  }
  return true;
}

/** @type {Record<string, string>} */
const browserAliases = {
  and_chr: "chrome",
  and_ff: "firefox",
  and_qq: "qq",
  and_uc: "uc",
  ios_saf: "safari",
  op_mob: "opera",
};
/**
 * @param {string} feature
 * @param {string[]} browsers
 */
function inSupportMatrix(feature, browsers) {
  const matrix = supportMatrix[feature];
  for (const browserFull of browsers) {
    const split = browserFull.split(" ");
    let browser = split[0];
    if (browserAliases[browser]) {
      browser = browserAliases[browser];
    }
    const version = parseFloat(split[1].replace(/-.+$/, ""));
    if (browser in matrix) {
      if (version < matrix[browser]) {
        return false;
      }
    } else {
      if (["qq", "uc", "op_mini", "kaios"].includes(browser)) {
        return false; // unknown support assume false to be safe
      }
      console.warn(`"${feature}" has no entry for browser "${browser}"`);
      return false;
    }
  }
  return true;
}

/**
 * @param {Record<string, boolean>} supports
 */
export function setOverrides(supports) {
  overrides = supports;
}
