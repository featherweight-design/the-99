/**
 * Every reader of wanted lines reads both sides of the wishlist (cart on your wishlist, G1): the hand lines and the
 * synced lines, through `lines.ts` (the owner) or `src/lib/social/wishlist.ts` (a friend, which builds on it). This
 * guard fails when code under `src/` names `wishlist_items` outside the files below, each with the reason it stays: a
 * new reader of the table alone would miss every line a deck put there.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/** The files that may name `wishlist_items` in code, and why. */
const ALLOWED: Record<string, string> = {
  "src/db/schema.ts": "the table's definition",
  "src/lib/wishlist/lines.ts": "the union's hand side",
  "src/lib/wishlist/wishlist.ts": "the hand-line writes (want, printing, clear), which only a player's own add controls make",
  "src/lib/wishlist/collected.ts": "the collected sweep's hand-line delete, beside its synced-line delete",
  "src/lib/feed/price-drop.ts": "by design: a synced line never gets a price baseline (Q4), so the price-drop job reads hand lines alone",
  "src/lib/social/trade-match.ts": "moves onto the union in the next PR (plan PR 3)",
  "src/lib/account/purge.ts": "the account purge deletes every row the player owns",
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|mts)$/.test(e.name) && !/\.test\.(ts|tsx|mts)$/.test(e.name) ? [path] : [];
  });
}

/** Code lines only: a comment that names the table reads nothing. */
function namesTable(text: string, pattern: RegExp): boolean {
  return text.split("\n").some((line) => {
    const t = line.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*") && pattern.test(t);
  });
}

describe("readers of wishlist_items", () => {
  it("are only the files that have a reason to read the hand side alone", () => {
    const readers = sourceFiles(SRC)
      .filter((f) => namesTable(readFileSync(f, "utf8"), /wishlist_items|\bwishlistItems\b/))
      .map((f) => relative(ROOT, f).split("\\").join("/"))
      .sort();
    expect(readers).toEqual(Object.keys(ALLOWED).sort());
  });

  it("leave the price-drop job on hand lines alone (Q4: a synced line has no price baseline)", () => {
    const text = readFileSync(join(SRC, "lib/feed/price-drop.ts"), "utf8");
    expect(namesTable(text, /wishlist_synced|\bwishlistSynced\b|wishlist\/lines/)).toBe(false);
  });

  it("would catch a new reader (the guard's own failure path)", () => {
    expect(namesTable("const rows = await db.select().from(wishlistItems);", /\bwishlistItems\b/)).toBe(true);
    expect(namesTable(" * reads wishlist_items", /wishlist_items/)).toBe(false);
  });
});
