import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// The real stylesheet, compiled the way `next dev` does: Tailwind scans the project for class
// candidates, then lightningcss parses what came out. A candidate that is a test FIXTURE (a class
// string written to prove a check fails) can compile to a rule lightningcss rejects, and then every
// page 500s under `next dev` while the production build, which skips that scan path, stays green.
// Neither typecheck, lint nor the unit tests see it: #1418 shipped exactly that.
//
// postcss and lightningcss are Tailwind's own dependencies, not ours, so they are resolved through
// the package that brings them rather than declared a second time.
const here = createRequire(import.meta.url);
const viaPostcssPlugin = createRequire(here.resolve("@tailwindcss/postcss"));
const viaTailwindNode = createRequire(viaPostcssPlugin.resolve("@tailwindcss/node"));

describe("globals.css", () => {
  it("compiles with the real source scan into CSS lightningcss can parse", async () => {
    const postcss = viaPostcssPlugin("postcss");
    const { transform } = viaTailwindNode("lightningcss");
    const tailwind = (await import("@tailwindcss/postcss")).default;
    const from = "src/app/globals.css";
    const out = await postcss([tailwind()]).process(readFileSync(from, "utf8"), { from });
    expect(out.css.length).toBeGreaterThan(100_000);
    expect(() => transform({ filename: "globals.css", code: Buffer.from(out.css) })).not.toThrow();
  }, 60_000);
});
