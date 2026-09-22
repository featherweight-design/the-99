import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

// The COPIES, asserted rather than the copier. What matters is that `public/brackets/` holds ten
// drawable marks — a script that runs cleanly over an empty source would satisfy any test of the
// script itself.

const DIR = "public/brackets";
const SLUGS = [
  "bracket-1-exhibition", "bracket-2-core", "bracket-3-upgraded",
  "bracket-4-optimized", "bracket-5-cedh",
];
const FILES = SLUGS.flatMap((s) => [`${s}.svg`, `${s}-chip.svg`]);

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

  // Each rank's own art: a copier that wrote one file ten times would pass every check above.
  it("gives every mark its own art", () => {
    const bodies = FILES.map((f) => readFileSync(`${DIR}/${f}`, "utf8").replace(/\s+/g, ""));
    expect(new Set(bodies).size).toBe(FILES.length);
  });
});
