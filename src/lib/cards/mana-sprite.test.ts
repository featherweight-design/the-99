import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MANA_SPRITE_ORDER, MANA_SPRITE_PATH, buildManaSprite, manaSpriteBackground } from "./mana-sprite";
import { MANA_SYMBOL_SLUGS } from "./mana-symbol-slugs";
import { manaSymbolBackground } from "./mana-symbols";
import { PIP_BACKGROUND } from "../copy/filter-chassis";

const DIR = join(process.cwd(), "public/mana");
const committed = readFileSync(join(DIR, "sprite.svg"), "utf8");
const files = readdirSync(DIR).filter((f) => f.endsWith(".svg") && f !== "sprite.svg");

describe("the mana sprite", () => {
  // A symbol file added or edited without `pnpm build:mana-sprite` would ship a sheet that does not
  // hold it, and its pip would draw the wrong cell: the state the sprite exists to end.
  it("is the build of the committed symbol files", () => {
    const rebuilt = buildManaSprite(
      files.map((f) => ({ slug: f.slice(0, -4), svg: readFileSync(join(DIR, f), "utf8") })),
    );
    expect(committed).toBe(rebuilt);
  });

  it("holds one cell for every symbol the renderer will ask for, and no other", () => {
    expect(files.map((f) => f.slice(0, -4)).sort()).toEqual([...MANA_SYMBOL_SLUGS].sort());
    expect((committed.match(/<svg x="/g) ?? []).length).toBe(MANA_SYMBOL_SLUGS.size);
  });

  it("is what the cost pips and the colour pips both draw", () => {
    expect(manaSymbolBackground("2/R")).toEqual(manaSpriteBackground("2R"));
    expect(manaSymbolBackground("{nonsense}")).toBeNull();
    expect(Object.values(PIP_BACKGROUND)).toEqual(["W", "U", "B", "R", "G"].map((s) => manaSpriteBackground(s)));
    expect(PIP_BACKGROUND.W.backgroundImage).toBe(`url(${MANA_SPRITE_PATH})`);
  });

  // The arithmetic a pip's window rests on, on a three-cell sheet: 100-unit cells 10 apart make a
  // 320-unit sheet, drawn at 320% of the box; cell i's left edge is at i·110 of a 220-unit overhang.
  it("places each cell's window by percentages that hold at any box size", () => {
    const order = ["A", "B", "C"];
    const at = (x: string) => ({
      backgroundImage: `url(${MANA_SPRITE_PATH})`,
      backgroundPosition: `${x}% 0%`,
      backgroundSize: "320% 100%",
      backgroundRepeat: "no-repeat",
    });
    expect(manaSpriteBackground("A", order)).toEqual(at("0"));
    expect(manaSpriteBackground("B", order)).toEqual(at("50"));
    expect(manaSpriteBackground("C", order)).toEqual(at("100"));
    expect(manaSpriteBackground("D", order)).toBeNull();
    expect(MANA_SPRITE_ORDER.length).toBe(MANA_SYMBOL_SLUGS.size);
  });

  it("fits each symbol into a square cell and drops its ids", () => {
    const sprite = buildManaSprite(
      [
        { slug: "HW", svg: "<svg viewBox=\"0 0 50 100\"><path d='M0 0'/></svg>" },
        { slug: "W", svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle id='Shape' r='50'/></svg>" },
      ],
      ["HW", "W"],
    );
    expect(sprite).toContain('<svg x="0" y="0" width="100" height="100" viewBox="0 0 50 100">');
    expect(sprite).toContain('<svg x="110" y="0" width="100" height="100" viewBox="0 0 100 100">');
    expect(sprite).not.toContain("Shape");
  });

  it("refuses a symbol that references an id, which would resolve across the whole sheet", () => {
    expect(() =>
      buildManaSprite([{ slug: "X", svg: "<svg viewBox='0 0 10 10'><path fill='url(#g)'/></svg>" }], ["X"]),
    ).toThrow(/references an id/);
  });
});
