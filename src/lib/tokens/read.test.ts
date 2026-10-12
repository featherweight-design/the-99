import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { assembleDeckTokens, userTokenStateQuery, type DeckTokenInputs, type TokenPrintingFacts } from "./read";
import type { TokenPriceFact } from "./price";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";
const M1 = "10000000-0000-4000-8000-000000000001";
const M2 = "10000000-0000-4000-8000-000000000002";

const tok = (oracleId: string, name: string, over: Partial<DeckTokenInputs["tokens"][number]> = {}) => ({
  oracleId, name, typeLine: "Token Creature — Goblin", colors: ["R"], power: "1", toughness: "1",
  oracleText: `text of ${name}`, ...over,
});
const printing = (scryfallId: string, tokenOracleId: string, setCode: string, collectorNumber: string): TokenPrintingFacts =>
  ({ scryfallId, tokenOracleId, setCode, collectorNumber, imageUriSmall: `s-${scryfallId}`, artCropUri: null });
const fact = (scryfallId: string): TokenPriceFact => ({
  cents: 15, foilCents: null, etchedCents: null, asOf: new Date("2026-10-11"),
  printing: { scryfallId, setCode: "x", collectorNumber: "1", productName: null, productSet: null, productNumber: null },
});

const base = (over: Partial<DeckTokenInputs> = {}): DeckTokenInputs => ({
  links: [{ tokenOracleId: A, makerOracleId: M1, makerName: "Zed", makerImageUri: null }],
  tokens: [tok(A, "Goblin")],
  held: new Map(), read: true, joined: new Set(), printings: [], prices: new Map(), newestPriceAsOf: null,
  ...over,
});
const ok = (r: ReturnType<typeof assembleDeckTokens>) => {
  if (r.status !== "ok") throw new Error(`expected ok, got ${r.status}`);
  return r;
};

describe("assembleDeckTokens", () => {
  it("is absent when the deck's cards make no token, or no token row came back", () => {
    expect(assembleDeckTokens(base({ links: [] })).status).toBe("absent");
    expect(assembleDeckTokens(base({ tokens: [] })).status).toBe("absent");
  });

  it("never draws a held token as joined, whatever the join row says", () => {
    const held = ok(assembleDeckTokens(base({ held: new Map([[A, "manual"]]), joined: new Set([A]) }))).tokens[0];
    expect(held).toMatchObject({ state: "owned", source: "manual", joined: false });
    const not = ok(assembleDeckTokens(base({ joined: new Set([A]) }))).tokens[0];
    expect(not).toMatchObject({ state: "not", joined: true });
  });

  it("is unknown, not 'not owned', before the account has been read", () => {
    expect(ok(assembleDeckTokens(base({ read: false }))).tokens[0].state).toBe("unknown");
  });

  it("shows rules text only for tokens that share a face inside the deck", () => {
    const r = ok(assembleDeckTokens(base({
      links: [A, B, C].map((t) => ({ tokenOracleId: t, makerOracleId: M1, makerName: "Zed", makerImageUri: null })),
      tokens: [tok(A, "Goblin"), tok(B, "Goblin"), tok(C, "Goblin", { power: "2", toughness: "2" })],
    })));
    const byId = new Map(r.tokens.map((t) => [t.oracleId, t.oracleText]));
    expect(byId.get(A)).toBe("text of Goblin");
    expect(byId.get(B)).toBe("text of Goblin");
    expect(byId.get(C)).toBeNull();
  });

  it("lists each maker once, A to Z, and counts distinct makers across tokens", () => {
    const r = ok(assembleDeckTokens(base({
      links: [
        { tokenOracleId: A, makerOracleId: M1, makerName: "Zed", makerImageUri: null },
        { tokenOracleId: A, makerOracleId: M2, makerName: "alpha", makerImageUri: null },
        { tokenOracleId: A, makerOracleId: M2, makerName: "alpha", makerImageUri: null },
        { tokenOracleId: B, makerOracleId: M2, makerName: "alpha", makerImageUri: null },
      ],
      tokens: [tok(A, "Goblin"), tok(B, "Treasure", { colors: [] })],
    })));
    expect(r.tokens.find((t) => t.oracleId === A)!.makers.map((m) => m.name)).toEqual(["alpha", "Zed"]);
    expect(r.makerCount).toBe(2);
  });

  it("pictures the priced printing, else the first by set and number, and reports how many exist", () => {
    const ps = [printing("p2", A, "tbb", "10"), printing("p1", A, "tbb", "9"), printing("p0", A, "taa", "5"), printing("p9", A, "tcc", "10"), printing("p8", A, "tcc", "9")];
    const unpriced = ok(assembleDeckTokens(base({ printings: ps }))).tokens[0].picture!;
    expect(unpriced).toMatchObject({ scryfallId: "p0", printings: 5 });
    const priced = ok(assembleDeckTokens(base({ printings: ps, prices: new Map([[A, fact("p2")]]) }))).tokens[0];
    expect(priced.picture).toMatchObject({ scryfallId: "p2", printings: 5 });
    expect(priced.price?.printing.scryfallId).toBe("p2");
  });

  it("compares collector numbers as numbers within a set (9 before 10)", () => {
    const ps = [printing("p10", A, "tbb", "10"), printing("p9", A, "tbb", "9")];
    expect(ok(assembleDeckTokens(base({ printings: ps }))).tokens[0].picture!.scryfallId).toBe("p9");
  });

  it("has no picture for a token with no printing row, rather than failing", () => {
    expect(ok(assembleDeckTokens(base())).tokens[0].picture).toBeNull();
  });

  it("orders rows by name, then colors, then id", () => {
    const r = ok(assembleDeckTokens(base({
      links: [A, B, C].map((t) => ({ tokenOracleId: t, makerOracleId: M1, makerName: "Zed", makerImageUri: null })),
      tokens: [tok(C, "Treasure", { colors: [] }), tok(B, "goblin", { colors: ["G"] }), tok(A, "Goblin", { colors: ["R"] })],
    })));
    // B (green) sorts before A (red) although A has the lower id: only the colors rule gives this order.
    expect(r.tokens.map((t) => t.oracleId)).toEqual([B, A, C]);
  });

  it("shows a maker with the art the deck draws for it, else the catalog's", () => {
    const r = ok(assembleDeckTokens(base({
      links: [
        { tokenOracleId: A, makerOracleId: M1, makerName: "Zed", makerImageUri: "catalog-1" },
        { tokenOracleId: A, makerOracleId: M2, makerName: "Alpha", makerImageUri: "catalog-2" },
      ],
      art: new Map([[M1, { imageUri: "owned-1", name: "Zed (Secret Lair)" }]]),
    })));
    const byId = new Map(r.tokens[0].makers.map((m) => [m.oracleId, m]));
    expect(byId.get(M1)).toMatchObject({ imageUri: "owned-1", name: "Zed (Secret Lair)" });
    expect(byId.get(M2)).toMatchObject({ imageUri: "catalog-2", name: "Alpha" });
    // Sorted by the name it is shown under, not the oracle name.
    expect(r.tokens[0].makers.map((m) => m.name)).toEqual(["Alpha", "Zed (Secret Lair)"]);
  });

  it("keeps a joined token whose maker has left the deck, with no maker named; drops it once it is held or not joined", () => {
    const orphan = tok(B, "Treasure", { colors: [] });
    const withJoin = ok(assembleDeckTokens(base({ tokens: [tok(A, "Goblin"), orphan], joined: new Set([B]) })));
    expect(new Set(withJoin.tokens.map((t) => t.oracleId))).toEqual(new Set([A, B]));
    const row = withJoin.tokens.find((t) => t.oracleId === B)!;
    expect(row).toMatchObject({ makers: [], joined: true });
    // Held: it is owned, so it is not on a Shopping list and the deck does not make it.
    const held = ok(assembleDeckTokens(base({ tokens: [tok(A, "Goblin"), orphan], joined: new Set([B]), held: new Map([[B, "manual"]]) })));
    expect(held.tokens.map((t) => t.oracleId)).toEqual([A]);
    // Not joined: a stray token row is still not this deck's.
    const stray = ok(assembleDeckTokens(base({ tokens: [tok(A, "Goblin"), orphan] })));
    expect(stray.tokens.map((t) => t.oracleId)).toEqual([A]);
  });

  it("is present for a deck whose only token is a joined orphan (no links at all)", () => {
    const r = assembleDeckTokens(base({ links: [], tokens: [tok(B, "Treasure", { colors: [] })], joined: new Set([B]) }));
    expect(r.status).toBe("ok");
  });

  it("skips a token row no link reaches", () => {
    const r = ok(assembleDeckTokens(base({ tokens: [tok(A, "Goblin"), tok(B, "Stray")] })));
    expect(r.tokens.map((t) => t.oracleId)).toEqual([A]);
  });
});

describe("userTokenStateQuery", () => {
  const dialect = new PgDialect();
  const render = (ready: boolean) => dialect.sqlToQuery(userTokenStateQuery("d1", "u1", [A, B], ready) as SQL);

  it("reads the holdings, the read marker and the joins in ONE statement, so they share a snapshot", () => {
    const q = render(true);
    expect(q.sql.match(/^\s*select/gi)?.length).toBe(1);
    expect(q.sql).toContain("from token_ownership");
    expect(q.sql).toContain("from token_reads");
    expect(q.sql).toContain("from deck_token_joins");
    expect(q.params).toContain("d1");
    expect(q.params.filter((p) => p === "u1").length).toBe(4);
  });

  it("scopes every read to the player and the holdings to the deck's tokens", () => {
    const q = render(true);
    expect(q.sql).toContain("o.user_id =");
    expect(q.sql).toContain("r.user_id =");
    expect(q.sql).toContain("j.user_id =");
    expect(q.sql).toContain("o.token_oracle_id = any(");
  });

  it("names none of the three player tables where they do not exist yet (the readiness check covers the joins too)", () => {
    const q = render(false);
    expect(q.sql).not.toContain("token_ownership");
    expect(q.sql).not.toContain("token_reads");
    expect(q.sql).not.toContain("deck_token_joins");
  });
});
