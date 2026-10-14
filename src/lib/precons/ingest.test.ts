import { describe, expect, it } from "vitest";
import type { FeedCard, PreconFeed, PreconFeedDeck } from "./feed";
import { MAX_UNMAPPED_SHARE, planPrecons } from "./ingest";

const c = (oracleId: string | null, count = 1, commander = false, scryfallId: string | null = `p-${oracleId}`): FeedCard =>
  ({ oracleId, scryfallId, count, commander, foil: false });

/** A 100-card deck: one commander, `filler` copies of a basic, and the cards given. */
function deck(fileName: string, extra: FeedCard[] = [], over: Partial<PreconFeedDeck> = {}): PreconFeedDeck {
  const used = extra.reduce((n, x) => n + x.count, 0);
  return {
    fileName, name: fileName, code: "SET", releaseDate: "2024-01-01",
    cards: [c(`cmd-${fileName}`, 1, true), ...extra, c("plains", 99 - used)], tokens: [],
    ...over,
  };
}

const feed = (decks: PreconFeedDeck[]): PreconFeed => ({ indexKey: "k", fetchedAt: "t", decks });

/** Enough decks to clear the floor, each its own list. */
const many = (n: number) => Array.from({ length: n }, (_, i) => deck(`D${i}`));

function known(f: PreconFeed) {
  const o = new Set<string>(); const p = new Set<string>();
  for (const d of f.decks) for (const x of d.cards) { if (x.oracleId) o.add(x.oracleId); if (x.scryfallId) p.add(x.scryfallId); }
  return [o, p] as const;
}

describe("planPrecons", () => {
  it("counts each row's foil copies, and keeps the tokens the token catalog holds", () => {
    const f = feed(many(181));
    const [o, p] = known(f);
    const d = f.decks[0];
    d.cards[0] = { ...d.cards[0], foil: true };
    // The feed can list one printing twice, a foil beside a non-foil: one row, foil counted on it.
    d.cards.push({ ...c("plains", 2), foil: true });
    d.cards[d.cards.length - 2].count -= 2;
    d.tokens = [{ scryfallId: "t-goblin", count: 2 }, { scryfallId: "t-goblin", count: 1 }, { scryfallId: "t-monarch", count: 1 }, { scryfallId: null, count: 1 }];
    const plan = planPrecons(f, o, p, new Set(["t-goblin"]));
    const rows = plan.cards.filter((r) => r.fileName === "D0");
    expect(rows.find((r) => r.isCommander)?.foilQuantity).toBe(1);
    expect(rows.find((r) => r.oracleId === "plains")).toMatchObject({ quantity: 99, foilQuantity: 2 });
    expect(plan.tokens).toEqual([{ fileName: "D0", tokenPrintingId: "t-goblin", quantity: 3 }]);
    expect(plan.report.tokensMissing).toBe(2);
  });

  it("publishes the feed's exact list, counts and commanders", () => {
    const f = feed([deck("A", [c("sol-ring")]), ...many(180)]);
    const plan = planPrecons(f, ...known(f), new Set());
    expect(plan.refusals).toEqual([]);
    const a = plan.cards.filter((r) => r.fileName === "A");
    expect(a.reduce((n, r) => n + r.quantity, 0)).toBe(100);
    expect(a.filter((r) => r.isCommander).map((r) => r.oracleId)).toEqual(["cmd-A"]);
  });

  it("drops and counts a card the catalog lacks, and keeps its deck", () => {
    const f = feed([deck("A", [c("new-card", 2)]), ...many(180)]);
    const [o, p] = known(f);
    o.delete("new-card");
    const plan = planPrecons(f, o, p, new Set());
    expect(plan.precons.find((r) => r.fileName === "A")?.unmappedCount).toBe(2);
    expect(plan.cards.some((r) => r.oracleId === "new-card")).toBe(false);
    expect(plan.report.unmappedCopies).toBe(2);
  });

  it("counts a card with no oracle id as unmapped, never matching it by anything else", () => {
    const f = feed([deck("A", [c(null)]), ...many(180)]);
    expect(planPrecons(f, ...known(f), new Set()).precons.find((r) => r.fileName === "A")?.unmappedCount).toBe(1);
  });

  it("keeps a card whose printing the catalog lacks, with no printing", () => {
    const f = feed([deck("A", [c("sol-ring", 1, false, "unknown-printing")]), ...many(180)]);
    const [o, p] = known(f);
    p.delete("unknown-printing");
    const plan = planPrecons(f, o, p, new Set());
    expect(plan.cards.find((r) => r.oracleId === "sol-ring")?.scryfallId).toBeNull();
    expect(plan.report.printingsMissing).toBe(1);
  });

  it("merges one printing listed twice into one row", () => {
    const f = feed([deck("A", [c("sol-ring"), c("sol-ring")]), ...many(180)]);
    const rows = planPrecons(f, ...known(f), new Set()).cards.filter((r) => r.oracleId === "sol-ring");
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(2);
  });

  it("keeps two commanders for a partner precon", () => {
    const f = feed([deck("A", [c("partner", 1, true)]), ...many(180)]);
    const a = planPrecons(f, ...known(f), new Set()).cards.filter((r) => r.fileName === "A" && r.isCommander);
    expect(a.map((r) => r.oracleId).sort()).toEqual(["cmd-A", "partner"]);
  });

  it("drops a deck that is not 100 cards, and names it", () => {
    const short = deck("A");
    short.cards.pop();
    const f = feed([short, ...many(180)]);
    const plan = planPrecons(f, ...known(f), new Set());
    expect(plan.precons.some((r) => r.fileName === "A")).toBe(false);
    expect(plan.report.dropped).toEqual(["A: 1 cards, not 100"]);
  });

  it("drops a deck whose commander the catalog lacks", () => {
    const f = feed([deck("A"), ...many(180)]);
    const [o, p] = known(f);
    o.delete("cmd-A");
    expect(planPrecons(f, o, p, new Set()).report.dropped).toEqual(["A: its commander is not in the catalog"]);
  });

  it("makes the plain edition stand for its Collector's Edition twin, whatever the order", () => {
    const shared = [c("sol-ring")];
    const plain = deck("ZForces_40K", shared, { name: "Forces of the Imperium" });
    const ce = deck("AForcesCE_40K", shared, { name: "Forces of the Imperium Collector's Edition" });
    ce.cards[0] = { ...plain.cards[0], scryfallId: "p-other-art" };
    for (const order of [[plain, ce], [ce, plain]]) {
      const f = feed([...order, ...many(180)]);
      const [o, p] = known(f);
      const plan = planPrecons(f, o, p, new Set());
      expect(plan.precons.find((r) => r.fileName === "AForcesCE_40K")?.twinOf).toBe("ZForces_40K");
      expect(plan.precons.find((r) => r.fileName === "ZForces_40K")?.twinOf).toBeNull();
      expect(plan.report.twins).toBe(1);
    }
  });

  it("does not call a reprint in another set a twin, though its list is identical", () => {
    const shared = [c("sol-ring")];
    const original = deck("Evasive_C13", shared, { name: "Evasive Maneuvers", code: "C13" });
    const anthology = deck("Evasive_CMA", shared, { name: "Evasive Maneuvers", code: "CMA" });
    anthology.cards[0] = original.cards[0];
    const f = feed([original, anthology, ...many(180)]);
    expect(planPrecons(f, ...known(f), new Set()).report.twins).toBe(0);
  });

  it("does not call two decks twins when the same cards lead each one", () => {
    // The same 100 oracle ids in both; only which of X and Y is the commander differs.
    const a = deck("A", [c("Y")]);
    a.cards[0] = c("X", 1, true);
    const b = deck("B", [c("X")]);
    b.cards[0] = c("Y", 1, true);
    const f = feed([a, b, ...many(180)]);
    const plan = planPrecons(f, ...known(f), new Set());
    expect(plan.precons.map((r) => r.fileName)).toEqual(expect.arrayContaining(["A", "B"]));
    expect(plan.report.twins).toBe(0);
  });

  it("counts a dropped deck's unmapped copies, so it cannot dilute the share", () => {
    const f = feed(many(181));
    const [o, p] = known(f);
    // 10 decks each miss 2 copies (20 of 18,100 kept), and one 500-card deck missing all 500 is dropped.
    for (const d of f.decks.slice(0, 10)) d.cards.push(c("gone", 2)), d.cards[d.cards.length - 2].count -= 2;
    f.decks.push({ fileName: "Huge", name: "Huge", code: "X", releaseDate: "2024-01-01", cards: [c("cmd-huge", 1, true), c("gone", 499)], tokens: [] });
    const plan = planPrecons(f, o, p, new Set());
    expect(plan.report.unmappedCopies).toBe(520);
    expect(plan.refusals.join()).toMatch(/cap/);
  });

  it("does not let a fully mapped dropped deck dilute the share", () => {
    const f = feed(many(181));
    const [o, p] = known(f);
    // 190 unmapped copies across the kept decks: 190 of 18,100 is over 1%.
    for (const d of f.decks.slice(0, 95)) d.cards.push(c("gone", 2)), d.cards[d.cards.length - 2].count -= 2;
    // A 1,600-card deck, every card mapped, dropped for its size.
    f.decks.push({ fileName: "Huge", name: "Huge", code: "X", releaseDate: "2024-01-01", cards: [c("cmd-huge", 1, true), c("plains", 1599)], tokens: [] });
    o.add("cmd-huge");
    const plan = planPrecons(f, o, p, new Set());
    expect(plan.report.copies).toBe(18_100);
    expect(plan.refusals.join()).toMatch(/cap/);
  });

  it("never folds a deck with an unmapped card into a twin", () => {
    const a1 = deck("A1", [c("sol-ring"), c("gone-a")]);
    const a2 = deck("A2", [c("sol-ring"), c("gone-b")]);
    a2.cards[0] = a1.cards[0];
    const f = feed([a1, a2, ...many(180)]);
    const [o, p] = known(f);
    o.delete("gone-a");
    o.delete("gone-b");
    expect(planPrecons(f, o, p, new Set()).report.twins).toBe(0);
  });

  it("refuses a feed under the deck floor", () => {
    const f = feed(many(179));
    expect(planPrecons(f, ...known(f), new Set()).refusals).toEqual(["179 precons kept, under the floor of 180"]);
  });

  it("refuses when too many copies fail to map", () => {
    const f = feed(many(181));
    const [o, p] = known(f);
    o.delete("plains");
    const plan = planPrecons(f, o, p, new Set());
    expect(plan.refusals.join()).toMatch(/not in the catalog/);
    expect(plan.report.unmappedCopies / plan.report.copies).toBeGreaterThan(MAX_UNMAPPED_SHARE);
  });
});
