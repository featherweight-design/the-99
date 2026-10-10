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
  "src/lib/commander-change/write.ts",
  "src/lib/decks/versions.ts",
  "src/lib/swaps/draft-swap.ts",
  "src/lib/tuning/cuts-verdicts.ts",
];

/**
 * Every `.delete(deckCards)` in the file, by index, and the block each one sits
 * in.
 *
 * TWO EARLIER VERSIONS OF THIS HELPER WERE WRONG, in opposite directions, and
 * both are worth stating because each passed its own test run:
 *
 * 1. Walking braces from every `db.transaction(` captured three of this file's
 *    four delete sites and silently skipped the fourth, so a delete added after
 *    a prune passed the guard.
 * 2. Replacing that with "a prune within the next 1200 characters" could be
 *    satisfied by a prune in a LATER function, so a delete with no prune in its
 *    own unit of work would still pass.
 *
 * What is bounded here is the delete's own enclosing block, found by walking
 * forward from the delete until the brace depth goes negative — the closing
 * brace of whatever `{` contains it. No window, no anchor to guess at, and
 * nothing outside that block can satisfy it.
 */
function deleteSites(source: string): number[] {
  const sites: number[] = [];
  const marker = /\.delete\(deckCards\)/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(source)) !== null) sites.push(m.index);
  return sites;
}

/** The source from `at` to the end of the block containing it. */
function enclosingBlockFrom(source: string, at: number): string {
  let depth = 0;
  for (let i = at; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth < 0) return source.slice(at, i);
    }
  }
  return source.slice(at);
}

// Both reconciles, proxies and locks (Locked, sub-project 5.1): a lock left live on a card that
// has gone would make a re-added card arrive silently still locked, which F2 forbids.
function prunedAfter(source: string, at: number, prune: string): boolean {
  return new RegExp(`${prune}\\(`).test(enclosingBlockFrom(source, at));
}

describe("proxy rows are reconciled wherever deck membership shrinks", () => {
  it.each(FILES.flatMap((file) => ["pruneOrphanProxies", "pruneOrphanLocks"].map((prune) => [file, prune])))(
    "%s runs %s after every deck_cards delete", (file, prune) => {
    const source = readFileSync(file, "utf8");
    const offenders = deleteSites(source)
      .filter((at) => !prunedAfter(source, at, prune))
      .map((at) => `${file}@${source.slice(0, at).split("\n").length}`);
    expect(offenders).toEqual([]);
  });

  it("sees every delete site, so a missed one cannot pass by being invisible", () => {
    // The count is asserted because the guard above is only as good as the set
    // it walks, and the first version of this test silently walked a subset.
    const counts = FILES.map((file) => deleteSites(readFileSync(file, "utf8")).length);
    expect(counts).toEqual([4, 1, 1, 1, 2, 1]);
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
    const locks = source.indexOf("pruneOrphanLocks(", del);
    expect(reinsert).toBeGreaterThan(del);
    expect(prune).toBeGreaterThan(reinsert);
    expect(locks).toBeGreaterThan(reinsert);
  });

  // The discard's other half runs the OTHER way round: a removed locked card comes back locked
  // (Hugh, 2026-09-25), so its dormant lock is woken BEFORE the reinsert. After it, the insert
  // trigger has already deleted the dormant row in the insert's own statement.
  it("wakes the discard's dormant locks before the reinsert, and clears the rest after it", () => {
    const source = readFileSync("src/lib/decks/versions.ts", "utf8");
    const del = source.indexOf(".delete(deckCards)");
    const reinsert = source.indexOf(".insert(deckCards)", del);
    const revive = source.indexOf("reviveDormantLocks(");
    const clear = source.indexOf("clearDormantLocks(", reinsert);
    expect(revive).toBeGreaterThan(-1);
    expect(revive).toBeLessThan(del);
    expect(clear).toBeGreaterThan(reinsert);
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

describe("pruneOrphanProxies statements", () => {
  it("prunes the deck's printing picks as well as its proxies, both scoped by current membership", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const { pruneOrphanProxies } = await import("./prune-proxies");
    const dialect = new PgDialect();
    const texts: string[] = [];
    const runner = {
      execute: async (q: unknown) => {
        texts.push(dialect.sqlToQuery(q as Parameters<typeof dialect.sqlToQuery>[0]).sql);
        return { rows: [] };
      },
    } as unknown as Parameters<typeof pruneOrphanProxies>[0];
    await pruneOrphanProxies(runner, "deck");
    const picks = texts.find((t) => t.includes("delete from deck_printings"));
    expect(texts.some((t) => t.includes("delete from deck_proxies"))).toBe(true);
    expect(picks).toBeDefined();
    // Both commander columns count as membership, or a commander's pick would be undone by the
    // next edit to the list below it.
    expect(picks).toContain("d.commander_oracle_id = dp.oracle_id");
    expect(picks).toContain("d.partner_oracle_id = dp.oracle_id");
    expect(picks).toContain("dc.deck_id = dp.deck_id and dc.oracle_id = dp.oracle_id");
  });
});
