// @ts-nocheck

/**
 * Removes :where from the selector so its matches, but it the specificity is different than it should be.
 *
 * Based on https://github.com/IlyaUpyackovich/postcss-pseudo-is
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const parser = require("postcss-selector-parser");

function transform(rule) {
  rule.each((selector) => {
    let lastSelectorsList = new Set([selector]);
    let detectedPseudoWhere = false;

    selector.walkPseudos((pseudo) => {
      if (pseudo.value !== ":where") return;

      detectedPseudoWhere = true;
      let newSelectorsList = new Set();
      let index = selector.index(pseudo);

      lastSelectorsList.forEach((lastSelector) => {
        pseudo.each((innerSelector) => {
          let selectorClone = lastSelector.clone();
          selectorClone.at(index).replaceWith(innerSelector);
          newSelectorsList.add(selectorClone);
        });
      });

      lastSelectorsList = newSelectorsList;
    });

    if (detectedPseudoWhere) {
      lastSelectorsList.forEach((lastSelector) => {
        selector.parent.insertBefore(selector, lastSelector);
      });

      selector.remove();
    }
  });
}

let processor = parser(transform);

module.exports = () => {
  return {
    postcssPlugin: "postcss-pseudo-where",
    Rule(rule) {
      if (!rule.selector || !rule.selector.indexOf(":where") === -1) {
        return;
      }

      processor.processSync(rule, {
        lossless: false,
        updateSelector: true,
      });
    },
  };
};

module.exports.postcss = true;
