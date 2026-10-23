import { beforeEach, describe, expect, it, vi } from "vitest";

const availability = vi.hoisted(() => ({ map: new Map<string, { free: number }>() }));
const prices = vi.hoisted(() => ({ map: new Map<string, unknown>(), newestAsOf: null as Date | null }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => availability.map) }));
vi.mock("../decks/price-query", () => ({ loadPrices: vi.fn(async () => ({ prices: prices.map, newestAsOf: prices.newestAsOf })) }));

import { db } from "../../db";
import { candidateQuery, FOCUS_CANDIDATES_MAX, loadFocusCandidates, rankCandidates, withFocusCandidates } from "./candidates";

const args = {
  userId: "u1",
  commanderOracleIds: ["c1"],
  colorIdentity: ["W", "U"],
  inDeck: new Set(["d1"]),
  limits: { capCents: null, sets: [], ownedOnly: false },
  stapleCondition: "WU",
};

describe("candidateQuery", () => {
  it("reads both sources with each subquery aliased and qualified, and leaves ownership out of an ordinary run", () => {
    const { sql } = candidateQuery(db, args).toSQL();
    // The correlated subqueries name the outer card explicitly (AGENTS.md, "a correlated subquery must alias").
    expect(sql).toContain('csc.oracle_id = "cards".oracle_id');
    expect(sql).toContain('fs.oracle_id = "cards".oracle_id');
    expect(sql).toContain('"cards"."commander_legal" = $');
    expect(sql).toContain("twin.name");
    expect(sql).not.toContain("collection_items");
  });

  // Review round 1: the staples bucket is the profile's resolved one, so a deck served by the colour-count fallback
  // keeps its staples, in the membership test and the share alike.
  it("reads the staples of the bucket the profile resolved, the colour-count fallback included", () => {
    const { params } = candidateQuery(db, { ...args, colorIdentity: ["W", "U", "B"], stapleCondition: "count:3" }).toSQL();
    expect(params.filter((p) => p === "count:3")).toHaveLength(2);
    expect(params).not.toContain("WUB");
  });

  it("keeps an owned-only run to the player's own cards", () => {
    const { sql, params } = candidateQuery(db, { ...args, limits: { ...args.limits, ownedOnly: true } }).toSQL();
    expect(sql).toContain("collection_items");
    expect(params).toContain("u1");
  });
});

describe("rankCandidates", () => {
  it("orders by inclusion, then the identity's share, then the name, with no input about owning", () => {
    const row = (name: string, inclusion: number | null, stapleShare: number | null) => ({ oracleId: name, name, inclusion, stapleShare });
    const ranked = rankCandidates([row("Z low", 5, null), row("Unlisted", null, 0.5), row("B high", 40, null), row("A high", 40, null), row("Bare", null, null)]);
    expect(ranked.map((r) => r.name)).toEqual(["A high", "B high", "Z low", "Unlisted", "Bare"]);
  });
});

describe("loadFocusCandidates", () => {
  // A catalog row as the query returns it: no label row, so only a type axis can count it.
  const row = (oracleId: string, typeLine: string, inclusion: number | null, oracleText = "") => ({
    oracleId, name: `Card ${oracleId}`, manaCost: "{2}", oracleText, layout: "normal", typeLine, manaValue: 2, keywords: [],
    labels: null, labelModel: null, promptVersion: null, inputHash: null, quantity: 1, inclusion, stapleShare: null,
  });
  const reader = (rows: ReturnType<typeof row>[]) =>
    ({ select: () => ({ from: () => ({ leftJoin: () => ({ where: async () => rows }) }) }) }) as unknown as Parameters<typeof loadFocusCandidates>[1];
  const base = { ...args, deckId: "deck", focus: "artifacts" as const, roleBasis: "classifier" as const, env: {} as NodeJS.ProcessEnv };

  beforeEach(() => {
    availability.map = new Map();
    prices.map = new Map();
    prices.newestAsOf = null;
  });

  it("keeps only cards on the focus, ranked, with their roles", async () => {
    const out = await loadFocusCandidates(base, reader([
      row("sorcery", "Sorcery", 90),
      row("low", "Artifact", 5),
      row("rock", "Artifact", 50, "{T}: Add {C}."),
      row("land", "Artifact Land", 99),
    ]));
    expect(out.map((c) => c.oracleId)).toEqual(["rock", "low"]);
    expect(out[0].roles).toContain("ramp");
  });

  it("drops an owned-only card with no free copy, and a card over the cap", async () => {
    availability.map = new Map([["claimed", { free: 0 }], ["free", { free: 1 }]]);
    const asOf = new Date("2026-10-22");
    prices.newestAsOf = asOf;
    prices.map = new Map([["dear", { cents: 5000, foilCents: null, etchedCents: null, asOf }]]);
    const out = await loadFocusCandidates(
      { ...base, limits: { capCents: 1000, sets: [], ownedOnly: true } },
      reader([row("claimed", "Artifact", 80), row("dear", "Artifact", 70), row("free", "Artifact", 60)]),
    );
    expect(out.map((c) => c.oracleId)).toEqual(["free"]);
  });

  it("sends at most the cap, and nothing for a deck with no commander", async () => {
    const many = Array.from({ length: FOCUS_CANDIDATES_MAX + 5 }, (_, i) => row(`a${i}`, "Artifact", 100 - i));
    expect(await loadFocusCandidates(base, reader(many))).toHaveLength(FOCUS_CANDIDATES_MAX);
    expect(await loadFocusCandidates({ ...base, commanderOracleIds: [] }, reader(many))).toEqual([]);
  });

  // Review round 1: roles by the profile's own rules, so a listed role is one the addition moves in its counts.
  it("reads a candidate's roles off its front face, as the profile counts them", async () => {
    // A transform card whose BACK face taps for mana: the profile does not count it as ramp.
    const transform = { ...row("dfc", "Artifact", 50, "Draw a card.\n//\n{T}: Add {C}."), layout: "transform" };
    const [card] = await loadFocusCandidates(base, reader([transform]));
    expect(card.roles).not.toContain("ramp");
  });

});

describe("withFocusCandidates", () => {
  // Review round 1: on an owned-only run every addition must come from the shortlist, so a focus candidate the
  // shortlist missed (a staple-only card, or one past its cap) joins it, after the shortlist's own order.
  it("adds the candidates the owned shortlist lacks, keeping its order and never repeating one", () => {
    const shortlist = [{ oracleId: "a", name: "A", typeLine: "Artifact" }, { oracleId: "b", name: "B", typeLine: "Artifact" }];
    const candidates = [
      { oracleId: "b", name: "B", typeLine: "Artifact", roles: [] },
      { oracleId: "staple", name: "Staple", typeLine: "Artifact", roles: ["ramp"] },
    ];
    expect(withFocusCandidates(shortlist, candidates).map((c) => c.oracleId)).toEqual(["a", "b", "staple"]);
  });
});
