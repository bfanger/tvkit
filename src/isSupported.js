import caniuse from "caniuse-lite";
import browserslist from "browserslist";

/**
 * @param {string|string[]} featureOrFeatures
 * @param {string} target
 */
export default function isSupported(featureOrFeatures, target) {
  const browsers = browserslist(target);
  if (Array.isArray(featureOrFeatures)) {
    return featureOrFeatures.every((feature) =>
      featureIsSupported(feature, browsers)
    );
  }
  return featureIsSupported(featureOrFeatures, browsers);
}

const supportMatrix = {
  // https://caniuse.com/mdn-javascript_builtins_string_normalize
  normalize: {
    chrome: 34,
    safari: 10,
    firefox: 31,
    edge: 12,
    ie: Infinity,
  },
  // https://caniuse.com/mdn-api_event_composedpath
  composedPath: {
    chrome: 53,
    safari: 10,
    firefox: 59,
    edge: 79,
    ie: Infinity,
  },
  // Detect IE11
  ie11: {
    chrome: Infinity,
    safari: Infinity,
    firefox: Infinity,
    edge: Infinity,
    ie: 11,
  },
};

/**
 * @param {string} feature
 * @param {string[]} browsers
 */
function featureIsSupported(feature, browsers) {
  if (feature in supportMatrix) {
    return inSupportMatrix(browsers, supportMatrix[feature]);
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
        `No stats available for feature "${feature}" in combination with "${browser} ${version}"`
      );
      return false;
    }
    if (support === "n") {
      return false;
    }
  }
  return true;
}

/**
 * @param {string[]} browsers
 * @param {Record<string, number>} matrix
 */
function inSupportMatrix(browsers, matrix) {
  for (const browserFull of browsers) {
    const split = browserFull.split(" ");
    const browser = split[0];
    const version = parseFloat(split[1]);
    if (browser in matrix) {
      if (version < matrix[browser]) {
        return false;
      }
    } else {
      console.warn(
        `normalize support is implemented  for browser "${browser}"`
      );
      return false;
    }
  }
  return true;
}
