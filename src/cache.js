import crypto from "crypto";

/**
 * @type {Record<string, string>}
 */
const inMemoryCache = {};

/**
 * Cache a transformation
 *
 * @param {string} content
 * @param {number} ttl in seconds
 * @param {(content: string) => string|Promise<string>} transformer
 */
export default async function cache(content, ttl, transformer) {
  const key = crypto.createHash("md5").update(content).digest("hex");
  if (!inMemoryCache[key]) {
    inMemoryCache[key] = await transformer(content);
    setTimeout(() => {
      delete inMemoryCache[key];
    }, ttl * 1000);
  }
  return inMemoryCache[key];
}
