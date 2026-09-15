import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

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

/**
 * Every `.delete(deckCards)` in the file, by index.
 *
 * NOT a parse into transaction callbacks, which is what this test did first and
 * why it is worth a comment: that version walked braces from each
 * `db.transaction(` and silently captured only three of this file's four delete
 * sites, so a delete added after a prune passed the guard. A guard that skips a
 * site reports clean over the exact defect it exists for.
 *
 * Positions and a window are cruder and cannot skip anything: for each delete,
 * a prune has to appear after it and close enough to be in the same unit of
 * work. Every real call site here sits within a few lines of its prune.
 */
const WINDOW = 1200;

function deleteSites(source: string): number[] {
  const sites: number[] = [];
  const marker = /\.delete\(deckCards\)/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(source)) !== null) sites.push(m.index);
  return sites;
}

function prunedAfter(source: string, at: number): boolean {
  const window = source.slice(at, at + WINDOW);
  return /pruneOrphanProxies\(/.test(window);
}

describe("proxy rows are reconciled wherever deck membership shrinks", () => {
  it.each(FILES)("%s prunes after every deck_cards delete", (file) => {
    const source = readFileSync(file, "utf8");
    const offenders = deleteSites(source)
      .filter((at) => !prunedAfter(source, at))
      .map((at) => `${file}@${source.slice(0, at).split("\n").length}`);
    expect(offenders).toEqual([]);
  });

  it("sees every delete site, so a missed one cannot pass by being invisible", () => {
    // The count is asserted because the guard above is only as good as the set
    // it walks, and the first version of this test silently walked a subset.
    const counts = FILES.map((file) => deleteSites(readFileSync(file, "utf8")).length);
    expect(counts).toEqual([4, 1, 1]);
  });

  // The ordering is load-bearing on exactly one path. `restoreDraftFromVersion`
  // replaces the whole list — delete, then reinsert from the version — so a
  // prune placed beside the delete would reconcile against an empty list and
  // drop the proxies of every card the version restores. It has to run after
  // the rewrite.
  it("prunes after the rewrite, not beside the delete, when the list is replaced", () => {
    const source = readFileSync("src/lib/decks/versions.ts", "utf8");
    const del = source.indexOf(".delete(deckCards)");
    const reinsert = source.indexOf(".insert(deckCards)", del);
    const prune = source.indexOf("pruneOrphanProxies(", del);
    expect(reinsert).toBeGreaterThan(del);
    expect(prune).toBeGreaterThan(reinsert);
  });

  it("covers every file that deletes deck_cards at all", () => {
    // The list above is a list, so it can go stale in the other direction: a
    // NEW file that deletes deck_cards would simply not be tested.
    const all = readdirSync("src", { recursive: true, encoding: "utf8" })
      // `.tsx` as well: a server action lives beside its component often enough
      // that a future `delete(deckCards)` could land in one, and a guard that
      // swept only `.ts` would pass while missing it entirely.
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file))
      .map((file) => `src/${file}`)
      .filter((file) => /\.delete\(deckCards\)/.test(readFileSync(file, "utf8")));
    expect(all.sort()).toEqual([...FILES].sort());
  });
});
