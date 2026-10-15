// The results' loader, under a read (rework plan PR 4): the read's picks lead in its order with their
// lines, the rest follow in the free order, and a slice past the first page continues that one list,
// so a pick is never repeated and a free row never skipped. The search and the decorations are stubbed;
// what is proved here is the order and the lines, which the page and the action only pass through.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
import { envViewWith } from "@/test/env-view";

const stub = vi.hoisted(() => ({ search: vi.fn(), cardRow: vi.fn(), chainArt: vi.fn(async () => new Map()) }));
vi.mock("./search", () => ({ searchCommanders: stub.search, loadCardRow: stub.cardRow }));
vi.mock("../cards/chain-art", () => ({ chainArt: stub.chainArt }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: [] })) } }));
vi.mock("../collection/owned-printings", () => ({ resolveOwnedPrintings: vi.fn(async () => new Map()) }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async () => new Map()), slotFor: () => ({ kind: "none" }) }));
vi.mock("../sets/printed-in-read", () => ({ loadCommanderPrintings: vi.fn() }));

const { loadCardChip, loadResultsPage, RESULT_PAGE } = await import("./rows");
const { loadAvailability } = await import("../decks/availability-query");

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
    const page = await loadResultsPage("u", answers, 0, picks, ENV_VIEW);
    expect(page.rows.map((r) => r.name).slice(0, 4)).toEqual(["Commander 20", "Commander 5", "Commander 1", "Commander 2"]);
    expect(page.rows[0].reason).toEqual([{ text: "First." }]);
    expect(page.rows[2].reason).toBeUndefined();
  });

  it("continues the same list across slices: no pick repeated, no free row skipped", async () => {
    const first = await loadResultsPage("u", answers, 0, picks, ENV_VIEW);
    const second = await loadResultsPage("u", answers, RESULT_PAGE, picks, ENV_VIEW);
    const all = [...first.rows, ...second.rows, ...(await loadResultsPage("u", answers, RESULT_PAGE * 2, picks, ENV_VIEW)).rows].map((r) => r.oracleId);
    expect(new Set(all).size).toBe(30);
    expect(second.rows.some((r) => r.reason)).toBe(false);
  });

  it("leaves the free order alone with no read", async () => {
    const page = await loadResultsPage("u", answers, 0, null, ENV_VIEW);
    expect(page.rows.map((r) => r.name).slice(0, 2)).toEqual(["Commander 1", "Commander 2"]);
  });
});

// Admin PR 6f-2: every claim read under the results and the card chip takes the reader's env. The env is
// opposite to the environment on both claim-model switches, so a dropped argument would read the other way;
// it is checked by identity, never compared.
describe("the reader's env", () => {
  const ENV = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
  beforeEach(() => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    vi.mocked(loadAvailability).mockClear();
    stub.cardRow.mockReset().mockResolvedValue({ name: "Sol Ring", owned: true, held: null, gameChanger: false, imageUri: null });
    stub.chainArt.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reaches the search and the owned rows' claim read from loadResultsPage", async () => {
    const owned = (i: number) => ({ ...ranked(i), candidate: { ...ranked(i).candidate, owned: true } });
    stub.search.mockResolvedValue({ rows: [owned(1), ranked(2)], order: "owned", tooNarrow: null, card: null });
    await loadResultsPage("u", answers, 0, null, ENV);
    expect(stub.search.mock.calls[0][2] === ENV).toBe(true);
    const [, opts] = vi.mocked(loadAvailability).mock.calls[0];
    expect(opts?.oracleIds).toEqual([id(1)]);
    expect(opts?.env === ENV).toBe(true);
  });

  it("reaches the card's claim read and its art from loadCardChip", async () => {
    await loadCardChip("u", id(7), ENV);
    expect(stub.cardRow.mock.calls[0].slice(0, 2)).toEqual(["u", id(7)]);
    expect(stub.cardRow.mock.calls[0][2] === ENV).toBe(true);
    expect((stub.chainArt.mock.calls[0] as unknown[])[3] === ENV).toBe(true);
  });
});

describe("loadResultsPage: picks the search no longer lists (History's aged run)", () => {
  it("names a pick the search does not return, in the read's order, and still lists the open ones", async () => {
    const picks = { picks: [
      { oracleId: id(5), reason: [{ text: "Open." }] },
      { oracleId: id(99), reason: [{ text: "Built since." }] },
      { oracleId: id(98), reason: [{ text: "Not ranked." }] },
    ] };
    const page = await loadResultsPage("u", answers, 0, picks, ENV_VIEW);
    expect(page.gone).toEqual([id(99), id(98)]);
    expect(page.rows[0].name).toBe("Commander 5");
    expect(page.rows.some((r) => r.oracleId === id(99))).toBe(false);
  });

  it("has none gone with no read, and none when every pick is still listed", async () => {
    expect((await loadResultsPage("u", answers, 0, null, ENV_VIEW)).gone).toEqual([]);
    expect((await loadResultsPage("u", answers, 0, { picks: [{ oracleId: id(3), reason: [{ text: "x" }] }] }, ENV_VIEW)).gone).toEqual([]);
  });
});
