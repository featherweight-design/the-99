import { expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { filterKnownPrintings } from "./seed-prices";

const row = (scryfallId: string) => ({
  scryfallId, priceCents: 100, priceCentsNm: null,
  priceCentsFoil: null, priceCentsEtched: null,
  availableQuantity: 1, buyUrl: null, asOf: new Date(0),
});

it("drops rows whose printing we do not have and counts them", () => {
  // printing_prices.scryfall_id has an FK to printings. The two ingests are not
  // lock-stepped, so ManaPool routinely lists a printing from a set our catalog
  // has not pulled yet. Filtering in memory keeps one unknown id from failing a
  // whole 500-row batch — the same rule seed-printings.ts applies to oracle ids.
  const { rows, skippedOrphan } = filterKnownPrintings(
    [row("a"), row("b"), row("c")],
    new Set(["a", "c"]),
  );
  expect(rows.map((r) => r.scryfallId)).toEqual(["a", "c"]);
  expect(skippedOrphan).toBe(1);
});

it("keeps everything when every id is known", () => {
  const { rows, skippedOrphan } = filterKnownPrintings([row("a")], new Set(["a"]));
  expect(rows).toHaveLength(1);
  expect(skippedOrphan).toBe(0);
});
