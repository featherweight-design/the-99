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
