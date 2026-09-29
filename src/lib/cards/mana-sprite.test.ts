import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildManaSprite, manaSpriteHref, manaSpriteId } from "./mana-sprite";
import { MANA_SYMBOL_SLUGS } from "./mana-symbol-slugs";
import { manaSymbolSrc } from "./mana-symbols";
import { PIP_SRC } from "../copy/filter-chassis";

const DIR = join(process.cwd(), "public/mana");
const committed = readFileSync(join(DIR, "sprite.svg"), "utf8");
const files = readdirSync(DIR).filter((f) => f.endsWith(".svg") && f !== "sprite.svg");

describe("the mana sprite", () => {
  // A symbol file added or edited without `pnpm build:mana-sprite` would ship a sprite that does not
  // hold it, and its pip would draw an empty box: the state the sprite exists to end.
  it("is the build of the committed symbol files", () => {
    const rebuilt = buildManaSprite(
      files.map((f) => ({ slug: f.slice(0, -4), svg: readFileSync(join(DIR, f), "utf8") })),
    );
    expect(committed).toBe(rebuilt);
  });

  it("holds a view for every symbol the renderer will ask for", () => {
    const ids = new Set([...committed.matchAll(/<view id="([^"]+)"/g)].map((m) => m[1]));
    const asked = [...MANA_SYMBOL_SLUGS].map(manaSpriteId);
    expect(asked.filter((id) => !ids.has(id))).toEqual([]);
    expect(ids.size).toBe(asked.length);
  });

  it("is what the cost pips and the colour pips both point at", () => {
    expect(manaSymbolSrc("2/R")).toBe(manaSpriteHref("2R"));
    expect(Object.values(PIP_SRC)).toEqual(["W", "U", "B", "R", "G"].map(manaSpriteHref));
  });

  it("keeps each symbol's own box, apart from its neighbours", () => {
    const sprite = buildManaSprite([
      { slug: "W", svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle id='Shape' r='50'/></svg>" },
      { slug: "HW", svg: "<svg viewBox=\"0 0 50 100\"><path d='M0 0'/></svg>" },
    ]);
    expect(sprite).toContain('<view id="m-HW" viewBox="0 0 50 100"/>');
    expect(sprite).toContain('<view id="m-W" viewBox="60 0 100 100"/>');
    expect(sprite).not.toContain("Shape");
  });

  it("refuses a symbol that references an id, which would resolve across the whole sheet", () => {
    expect(() =>
      buildManaSprite([{ slug: "X", svg: "<svg viewBox='0 0 10 10'><path fill='url(#g)'/></svg>" }]),
    ).toThrow(/references an id/);
  });
});
