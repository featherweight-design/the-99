import { describe, expect, it } from "vitest";

import { GAME_SUMMARY } from "./fixtures";
import { GAME_AXIS_KEYS } from "../decks/game-axes";

/**
 * The About figures render fixtures VERBATIM through the real components, so a
 * fixture that states an order the app cannot produce teaches the reader a
 * behaviour the app does not have. Nothing else catches that: the component
 * draws whatever it is handed, and every existing test hands it the fixture.
 *
 * Found by review on 2026-09-19, after `speed` and `closing` were added to
 * widen the figure. `fix` read card_flow(-4), board(-2), speed(-3) — the order
 * they were typed in — so `/about` ranked a weaker axis above a stronger one
 * under a heading whose whole claim is that the tab ranks.
 */
describe("GAME_SUMMARY states an order summarizeGames could produce", () => {
  const vocab = (k: string) => GAME_AXIS_KEYS.indexOf(k as never);

  it("lists `axes` in vocabulary order", () => {
    // `GameSummary.axes` says so in as many words, and it is the flat list the
    // N=1 panel draws — where ranking would be a claim about a single game.
    const order = GAME_SUMMARY.axes.map((a) => vocab(a.key));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  for (const bucket of ["fix", "keep"] as const) {
    it(`ranks \`${bucket}\` strongest first, ties by vocabulary order`, () => {
      // `sortAxes` is module-private, so this asserts the rule rather than
      // calling it: |net| descending, and vocabulary order between equals.
      const rows = GAME_SUMMARY[bucket];
      const sorted = [...rows].sort(
        (a, b) => Math.abs(b.net) - Math.abs(a.net) || vocab(a.key) - vocab(b.key),
      );
      expect(rows.map((r) => r.key)).toEqual(sorted.map((r) => r.key));
    });
  }

  // `summarizeGames` partitions on the sign of `net` alone (games.ts:160-162),
  // so a bucket is not merely an order — it is a predicate. Without this, a
  // positive-net row sitting in `fix` passes every assertion above: the order
  // check sorts on |net| and never reads the sign.
  it("puts each row in the bucket its own net decides", () => {
    for (const row of GAME_SUMMARY.fix) expect(row.net).toBeLessThan(0);
    for (const row of GAME_SUMMARY.keep) expect(row.net).toBeGreaterThan(0);
    for (const row of GAME_SUMMARY.mixed) expect(row.net).toBe(0);
    // And the partition is total: every axis lands in exactly one bucket.
    const bucketed = [...GAME_SUMMARY.fix, ...GAME_SUMMARY.keep, ...GAME_SUMMARY.mixed];
    expect(bucketed.map((r) => r.key).sort()).toEqual(GAME_SUMMARY.axes.map((a) => a.key).sort());
  });

  it("keeps every bucketed axis in `axes`, and every tally self-consistent", () => {
    const flat = new Set(GAME_SUMMARY.axes.map((a) => a.key));
    for (const row of [...GAME_SUMMARY.fix, ...GAME_SUMMARY.keep, ...GAME_SUMMARY.mixed]) {
      expect(flat).toContain(row.key);
      expect(row.net).toBe(row.worked - row.hurt);
      // A mark is one game, so a tally cannot exceed the count it is read against.
      expect(row.worked + row.hurt).toBeLessThanOrEqual(GAME_SUMMARY.count);
    }
  });
});

describe("ADDED_COPY_ROWS says what an upload could", () => {
  it("reads each row through the app's own placement, as the caption tells it", async () => {
    const { ADDED_COPY_ROWS } = await import("./fixtures");
    const { addedCopyCopy } = await import("../copy/added-copy");
    // The Sol Ring bought for Brago goes to Gishath, which committed it first.
    expect(ADDED_COPY_ROWS.map((r) => r.sentence)).toEqual([
      addedCopyCopy.row.goesTo("HD - Gishath"),
      addedCopyCopy.row.freeForBrew("HD -Thorin"),
    ]);
    // Each row carries a chooser, which is what draws its Change, with a deck to move the copy to.
    for (const r of ADDED_COPY_ROWS) expect(r.chooser.claimants.length).toBeGreaterThan(1);
  });
});
