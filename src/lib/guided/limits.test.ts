import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { RESERVATION_TTL_MS } from "../model/allowance-rule";
import { UPGRADE_CALL_DEADLINE_MS, UPGRADE_REAP_MS } from "../precons/upgrade/constants";
import { SYNOPSIS_DEADLINE_MS } from "../synopsis/limits";

/** A page's `maxDuration`, in ms, read from its source: Next requires the export to be a literal. */
function pageLimitMs(route: string): number {
  const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../app", route, "page.tsx"), "utf8");
  const match = page.match(/export const maxDuration = (\d+);/);
  expect(match, `${route} must export a literal maxDuration`).not.toBeNull();
  return Number(match![1]) * 1000;
}

// A guided run is createDeck's `after()` on /decks/new (and a retry's on /decks/[id]): the page's limit bounds it. Worst case is
// the sharpening's two model calls plus the Overview's deadline; the reads and writes around them need room.
const WORST_CASE_MS = 2 * UPGRADE_CALL_DEADLINE_MS + SYNOPSIS_DEADLINE_MS;

describe.each(["decks/new", "decks/[id]"])("guided run under %s's maxDuration", (route) => {
  it("fits the worst case with 20s to spare", () => {
    expect(pageLimitMs(route) - WORST_CASE_MS).toBeGreaterThanOrEqual(20_000);
  });

});

// The run's own worst case, not the page's limit, is what the reaper and the reservation must outlast: a live run is never reaped.
describe("guided run's worst case", () => {
  it("ends before the reaper would fail it, and before its credits' reservation expires", () => {
    expect(WORST_CASE_MS).toBeLessThan(UPGRADE_REAP_MS);
    expect(WORST_CASE_MS).toBeLessThan(RESERVATION_TTL_MS);
  });

  it("is under /decks/new's limit, which stops the run itself at that page", () => {
    expect(pageLimitMs("decks/new")).toBeLessThanOrEqual(UPGRADE_REAP_MS);
  });
});
