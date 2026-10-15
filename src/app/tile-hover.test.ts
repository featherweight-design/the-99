import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");
const CSS = read("app", "globals.css");

// Small-polish R2 §3, E7: hovering a tile brightens its art by 6% and moves nothing.
describe("E7: hover on tiles", () => {
  it("brightens the art only where there is a hover, with no translate and no shadow", () => {
    const hover = /@media \(hover: hover\) \{\s*([^}]*)\}/g;
    const rules = [...CSS.matchAll(hover)].map((m) => m[1]).find((r) => r.includes("art-lift-host:hover"));
    expect(rules).toBeTruthy();
    expect(rules).toMatch(/\.art-lift-host:hover \.art-lift/);
    expect(rules).toMatch(/\.art-lift-host:hover \.art-wash-art/);
    expect(rules).toMatch(/filter: brightness\(1\.06\)/);
    expect(rules).not.toMatch(/transform|translate|box-shadow/);
  });

  it("eases the filter over the quick length on the shared curve, and keeps the end state under reduced motion", () => {
    expect(CSS).toMatch(/\.art-lift,\s*\.art-lift-host \.art-wash-art \{ transition: filter var\(--motion-quick\) var\(--motion-ease\); \}/);
    const reduced = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.art-lift,\s*\.art-lift-host \.art-wash-art \{ transition: none; \}/);
  });

  // The tile families the handoff names: the deck tile, the card tile (collection grid, add panel, the deck's Card view and
  // the open precon's), the precon tile and the set cell. Each root hosts and each art image lifts.
  it.each([
    ["components/decks/deck-card.tsx", "host only: its art is the commander wash's layers"],
    ["components/collection/grid-view.tsx", "host and image"],
    ["components/decks/suggestion-tile.tsx", "host and image"],
    ["components/decks/deck-card-tile.tsx", "host and image"],
    ["components/decks/read-only-card-tile.tsx", "host and image"],
    ["components/decks/precons/precon-tile.tsx", "host and image"],
    ["components/sets/set-cell.tsx", "host and image"],
  ])("%s: %s", (file, what) => {
    const source = read(...file.split("/"));
    expect(source).toMatch(/\bart-lift-host\b/);
    if (what.includes("image")) expect(source).toMatch(/className="art-lift /);
  });

  it("leaves a list row alone: no row, header or commander row hosts it", () => {
    for (const file of ["components/decks/precons/precon-row.tsx", "components/collection/rows-view.tsx", "components/decks/decklist-row.tsx"]) {
      expect(read(...file.split("/")), file).not.toMatch(/art-lift/);
    }
  });
});
