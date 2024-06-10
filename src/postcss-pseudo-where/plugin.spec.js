import { describe, it, expect } from "vitest";
import plugin from "./plugin.cjs";
import postcss from "postcss";

/**
 * @param {string} input
 * @param {string} output
 */
async function run(input, output) {
  let result = await postcss([plugin()]).process(input, {
    from: undefined,
  });
  expect(result.css).toEqual(output);
  expect(result.warnings()).toHaveLength(0);
}

describe("postcss-pseudo-where", () => {
  it("remove :where from selector", async () => {
    await run(
      "footer.svelte-hash a:where(.svelte-hash) {}",
      "footer.svelte-hash a.svelte-hash {}",
    );
  });
});
