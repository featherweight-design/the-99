// The results' loader, under a read (rework plan PR 4): the read's picks lead in its order with their
// lines, the rest follow in the free order, and a slice past the first page continues that one list,
// so a pick is never repeated and a free row never skipped. The search and the decorations are stubbed;
// what is proved here is the order and the lines, which the page and the action only pass through.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("./search", () => ({ searchCommanders: stub.search, loadCardRow: vi.fn() }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: [] })) } }));
vi.mock("../collection/owned-printings", () => ({ resolveOwnedPrintings: vi.fn(async () => new Map()) }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async () => new Map()), slotFor: () => ({ kind: "none" }) }));
vi.mock("../sets/printed-in-read", () => ({ loadCommanderPrintings: vi.fn() }));

const { loadResultsPage, RESULT_PAGE } = await import("./rows");

const id = (i: number) => `0000aaaa-0000-4000-8000-${String(i).padStart(12, "0")}`;
const ranked = (i: number) => ({
  candidate: { oracleId: id(i), name: `Commander ${i}`, colorIdentity: ["G"], owned: false, ownedSupport: 0, supportTotal: 0 },
  themeFits: [], cardFit: null,
});
const answers = { colors: [], match: "contains", themes: [], budgetDollars: null, bracket: null } as never;

beforeEach(() => {
  stub.search.mockReset().mockResolvedValue({ rows: Array.from({ length: 30 }, (_, i) => ranked(i + 1)), order: "owned", tooNarrow: null, card: null });
});

describe("loadResultsPage under a read", () => {
  const picks = { picks: [{ oracleId: id(20), reason: [{ text: "First." }] }, { oracleId: id(5), reason: [{ text: "Second." }] }] };

  it("puts the read's picks first, in its order, with their lines, then the rest in the free order", async () => {
    const page = await loadResultsPage("u", answers, 0, picks);
    expect(page.rows.map((r) => r.name).slice(0, 4)).toEqual(["Commander 20", "Commander 5", "Commander 1", "Commander 2"]);
    expect(page.rows[0].reason).toEqual([{ text: "First." }]);
    expect(page.rows[2].reason).toBeUndefined();
  });

  it("continues the same list across slices: no pick repeated, no free row skipped", async () => {
    const first = await loadResultsPage("u", answers, 0, picks);
    const second = await loadResultsPage("u", answers, RESULT_PAGE, picks);
    const all = [...first.rows, ...second.rows, ...(await loadResultsPage("u", answers, RESULT_PAGE * 2, picks)).rows].map((r) => r.oracleId);
    expect(new Set(all).size).toBe(30);
    expect(second.rows.some((r) => r.reason)).toBe(false);
  });

  it("leaves the free order alone with no read", async () => {
    const page = await loadResultsPage("u", answers, 0, null);
    expect(page.rows.map((r) => r.name).slice(0, 2)).toEqual(["Commander 1", "Commander 2"]);
  });
});
