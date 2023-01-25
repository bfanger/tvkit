import Babel from "@babel/standalone";

/**
 * @param {string} source
 * @returns {string}
 */
export default function transformJavascript(source) {
  return Babel.transform(source, {
    presets: [["env", { modules: "systemjs", targets: ["ie 11"] }]],
  }).code;
}
