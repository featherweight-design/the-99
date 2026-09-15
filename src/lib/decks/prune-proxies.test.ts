import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

// Every write that can remove a card from a deck must reconcile that deck's
// proxy rows, or a card re-added later arrives silently already proxied.
//
// This is a STATIC test for the same reason `env.test.mts` and
// `surface.test.mts` are: the rule is about a set of call sites, and a set of
// call sites grows. Six paths delete or replace `deck_cards` today; the seventh
// is the one that would ship the bug, and nothing in a runtime test would catch
// it because the bug is an ABSENCE at a site nobody wrote yet.
//
// It reads the source rather than the AST on purpose — the thing being asserted
// is "these two calls appear in the same function", which a grep answers and a
// type system does not.
const FILES = [
  "src/app/decks/actions.ts",
  "src/app/decks/update-actions.ts",
  "src/lib/decks/versions.ts",
];

/** Source split into function bodies, crudely: a `delete(deckCards)` and the
 *  prune that answers it are always inside the same `db.transaction` callback,
 *  and transactions here never nest. */
function transactionBlocks(source: string): string[] {
  const blocks: string[] = [];
  const marker = /(?:db|tx)\.transaction\(/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(source)) !== null) {
    // Walk braces from the callback's opening to its close.
    let depth = 0;
    let i = m.index;
    let start = -1;
    for (; i < source.length; i += 1) {
      if (source[i] === "{") {
        if (depth === 0) start = i;
        depth += 1;
      } else if (source[i] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (start >= 0) blocks.push(source.slice(start, i));
  }
  return blocks;
}

describe("proxy rows are reconciled wherever deck membership shrinks", () => {
  it.each(FILES)("%s prunes in every transaction that deletes deck_cards", (file) => {
    const source = readFileSync(file, "utf8");
    const offenders = transactionBlocks(source)
      .filter((b) => /\.delete\(deckCards\)/.test(b))
      .filter((b) => !/pruneOrphanProxies\(/.test(b));
    expect(offenders).toEqual([]);
  });

  it("covers every file that deletes deck_cards at all", () => {
    // The list above is a list, so it can go stale in the other direction: a
    // NEW file that deletes deck_cards would simply not be tested.
    const all = globSync("src/**/*.ts", { exclude: (p) => p.includes(".test.") })
      .filter((p) => /\.delete\(deckCards\)/.test(readFileSync(p, "utf8")));
    expect(all.sort()).toEqual([...FILES].sort());
  });
});
