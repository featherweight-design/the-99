import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "globals.css"), "utf8");

describe("global focus treatment", () => {
  // Unlayered rules outrank every layered one regardless of specificity, so an
  // unlayered :focus-visible cannot be overridden by `focus-visible:outline-none`
  // (Tailwind's utilities layer). That produced the doubled focus ring on every
  // field wrapped in a focus-within container, and survived several fixes aimed
  // at the components instead of the cascade.
  it("declares :focus-visible inside a cascade layer so components can override it", () => {
    const layerBase = css.match(/@layer base\s*\{[\s\S]*?\n\}/);
    expect(layerBase, "globals.css should declare an @layer base block").not.toBeNull();
    expect(layerBase![0]).toContain(":focus-visible");
  });

  it("has no unlayered :focus-visible rule", () => {
    const withoutLayers = css.replace(/@layer\s+\w+\s*\{[\s\S]*?\n\}/g, "");
    expect(withoutLayers).not.toMatch(/(^|\})\s*:focus-visible\s*\{/);
  });
});
