import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

import { bracketMarksCss, CSS_TARGET, EXPECTED as FILES, SOURCE, TARGET as DIR, strip } from "./lib/bracket-marks.mjs";

// The COPIES, asserted rather than the copier. What matters is that `public/brackets/` holds ten
// drawable marks — a script that runs cleanly over an empty source would satisfy any test of the
// script itself.
//
// The names come from `markAsset`'s OWN table, never a list spelled here. A third copy would let
// a rename leave these assertions green against the old files while the renderer resolves a path
// that 404s, which is the whole failure this asset step exists to prevent.



describe("the bracket marks in public/", () => {
  it("has all ten, and nothing else", () => {
    const present = readdirSync(DIR).filter((f) => f.endsWith(".svg")).sort();
    expect(present).toEqual([...FILES].sort());
  });

  // A SILENT 404 IS THE FAILURE THIS GUARDS. `markAsset` resolves a path and the markup is
  // identical whether or not the art arrived, so the only place to catch a missing or empty file
  // is here.
  it.each(FILES)("%s is a real drawable svg", (file) => {
    const svg = readFileSync(`${DIR}/${file}`, "utf8");
    expect(svg).toContain('viewBox="0 0 40 40"');
    expect(svg).toMatch(/<path\b/);
    expect(svg.length).toBeGreaterThan(100);
  });

  // The provenance blob is 91% of the shipped bytes and nothing reads it to draw a glyph. It
  // stays in `design/`, which is its home.
  it.each(FILES)("%s carries no provenance blob", (file) => {
    expect(readFileSync(`${DIR}/${file}`, "utf8")).not.toContain("<metadata>");
  });

  // THE COMMITTED COPY IS THE CURRENT SOURCE, which is the one thing every check above misses.
  // They all read `public/` alone, so a mark Design reissued after the last `assets:brackets` run
  // satisfies every one of them — the old file is still ten files, still drawable, still stripped,
  // still distinct. `pnpm test` runs in CI and `assets:brackets` does not, so without this a
  // reissue ships the previous drawing indefinitely and nothing says so. Comparing a stripped
  // SOURCE against the committed TARGET is what closes it, and it uses the copier's own `strip`
  // rather than a second implementation that could drift into agreeing wrongly.
  it.each(FILES)("%s matches the current design source", (file) => {
    const expected = strip(readFileSync(`${SOURCE}/${file}`, "utf8"));
    expect(readFileSync(`${DIR}/${file}`, "utf8")).toBe(expected);
  });

  // Each rank's own art: a copier that wrote one file ten times would pass every check above.
  it("gives every mark its own art", () => {
    const bodies = FILES.map((f) => readFileSync(`${DIR}/${f}`, "utf8").replace(/\s+/g, ""));
    expect(new Set(bodies).size).toBe(FILES.length);
  });
});

// The marks draw from a stylesheet of inline art (`src/app/bracket-marks.css`), so a mask never
// waits on a fetch: a fetched mask paints its numeral disc alone until the file lands, a square.
describe("the bracket marks' stylesheet", () => {
  it("is the build of the committed files (run `pnpm assets:brackets`)", () => {
    expect(readFileSync(CSS_TARGET, "utf8")).toBe(bracketMarksCss((file) => readFileSync(`${DIR}/${file}`, "utf8")));
  });

  it("carries a rule per file, the full form with its numeral disc and the chip without", () => {
    const css = readFileSync(CSS_TARGET, "utf8");
    for (const file of FILES) {
      const key = file.slice(0, -".svg".length);
      const rule = css.split("\n").find((l) => l.startsWith(`.bracket-art[data-art="${key}"]`));
      expect(rule, key).toBeDefined();
      expect(rule).toContain("data:image/svg+xml,");
      expect(rule!.includes("radial-gradient"), key).toBe(!key.endsWith("-chip"));
    }
    expect(css).not.toMatch(/url\(["']?\/brackets/);
  });
});
