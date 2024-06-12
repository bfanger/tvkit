/**
 * Removes :where from the selector so its matches, but it the specificity is different than it should be.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const parser = require("postcss-selector-parser");

/**
 * @param {parser.Root} rule
 */
function transform(rule) {
  rule.each((selector) => {
    let replacements = new Map();

    selector.walkPseudos((pseudo) => {
      if (pseudo.value !== ":where") return;

      replacements.set(pseudo, pseudo.nodes);
    });

    if (replacements.size > 0) {
      replacements.forEach((nodes, pseudo) => {
        pseudo.replaceWith(nodes);
      });
    }
  });
}

let processor = parser(transform);

module.exports = () => {
  /** @type  {import('postcss').AcceptedPlugin} */
  const plugin = {
    postcssPlugin: "postcss-pseudo-where",

    Rule(rule) {
      if (!rule.selector || rule.selector.indexOf(":where") === -1) {
        return;
      }
      processor.processSync(rule, {
        lossless: false,
        updateSelector: true,
      });
    },
  };
  return plugin;
};

module.exports.postcss = true;
