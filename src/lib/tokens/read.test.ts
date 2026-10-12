import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { assembleDeckTokens, type DeckTokenInputs, type TokenPrintingFacts } from "./read";
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
  links: [{ tokenOracleId: A, makerOracleId: M1, makerName: "Zed" }],
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
      links: [A, B, C].map((t) => ({ tokenOracleId: t, makerOracleId: M1, makerName: "Zed" })),
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
        { tokenOracleId: A, makerOracleId: M1, makerName: "Zed" },
        { tokenOracleId: A, makerOracleId: M2, makerName: "alpha" },
        { tokenOracleId: A, makerOracleId: M2, makerName: "alpha" },
        { tokenOracleId: B, makerOracleId: M2, makerName: "alpha" },
      ],
      tokens: [tok(A, "Goblin"), tok(B, "Treasure", { colors: [] })],
    })));
    expect(r.tokens.find((t) => t.oracleId === A)!.makers.map((m) => m.name)).toEqual(["alpha", "Zed"]);
    expect(r.makerCount).toBe(2);
  });

  it("pictures the priced printing, else the first by set and number, and reports how many exist", () => {
    const ps = [printing("p2", A, "tbb", "10"), printing("p1", A, "tbb", "9"), printing("p0", A, "taa", "5")];
    const unpriced = ok(assembleDeckTokens(base({ printings: ps }))).tokens[0].picture!;
    expect(unpriced).toMatchObject({ scryfallId: "p0", printings: 3 });
    const priced = ok(assembleDeckTokens(base({ printings: ps, prices: new Map([[A, fact("p2")]]) }))).tokens[0];
    expect(priced.picture).toMatchObject({ scryfallId: "p2", printings: 3 });
    expect(priced.price?.printing.scryfallId).toBe("p2");
  });

  it("has no picture for a token with no printing row, rather than failing", () => {
    expect(ok(assembleDeckTokens(base())).tokens[0].picture).toBeNull();
  });

  it("orders rows by name, then colors, then id", () => {
    const r = ok(assembleDeckTokens(base({
      links: [A, B, C].map((t) => ({ tokenOracleId: t, makerOracleId: M1, makerName: "Zed" })),
      tokens: [tok(C, "Treasure", { colors: [] }), tok(B, "goblin", { colors: ["R"] }), tok(A, "Goblin", { colors: ["G"] })],
    })));
    expect(r.tokens.map((t) => t.oracleId)).toEqual([A, B, C]);
  });

  it("skips a token row no link reaches", () => {
    const r = ok(assembleDeckTokens(base({ tokens: [tok(A, "Goblin"), tok(B, "Stray")] })));
    expect(r.tokens.map((t) => t.oracleId)).toEqual([A]);
  });
});
