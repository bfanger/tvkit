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

/**
 * @param {string} feature
 * @param {string[]} browsers
 * @returns
 */
function featureIsSupported(feature, browsers) {
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
