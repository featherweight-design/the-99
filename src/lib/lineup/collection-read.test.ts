import { describe, expect, it, vi } from "vitest";

// Each `db.select(...)` chain resolves to the next queued result, in the order the reader issues them:
// the owned aggregate, then the single-commander index, then the pair index.
const queue: unknown[][] = [];
const calls: string[] = [];
const chain = (): unknown => {
  const result = queue.shift() ?? [];
  const c: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "groupBy"]) c[m] = () => c;
  c.then = (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok);
  return c;
};
vi.mock("../../db", () => ({ db: { select: () => { calls.push("select"); return chain(); } } }));
const AS_OF = new Date("2026-10-11T10:00:00Z");
vi.mock("../decks/price-query", () => ({
  loadPrices: async (ids: string[]) => ({
    prices: new Map(ids.filter((id) => id !== "unpriced").map((id) => [id, { cents: 500, foilCents: null, etchedCents: null, asOf: AS_OF }])),
    newestAsOf: AS_OF,
  }),
}));
const artEnv = vi.hoisted(() => ({ seen: [] as unknown[] }));
vi.mock("../cards/chain-art", () => ({
  chainArt: async (_u: string, _d: string | null, _ids: string[], env?: unknown) => (artEnv.seen.push(env), new Map([["boots", "owned-boots.jpg"]])),
}));
// A sentinel, never `process.env`: a failing comparison prints it whole.
const ENV = { DECK_PRINTINGS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

import { readCollection } from "./collection-read";

describe("readCollection", () => {
  it("assembles owned copies, both scopes, and the wanted list from a single and a canonicalised pair", async () => {
    queue.length = 0;
    queue.push(
      [
        { oracleId: "boots", name: "Swiftfoot Boots", typeLine: "Artifact", imageUri: "cat-boots.jpg", copies: "3" },
        { oracleId: "beast", name: "Beast Within", typeLine: "Instant", imageUri: null, copies: "1" },
        { oracleId: "unpriced", name: "Odd Card", typeLine: "Instant", imageUri: null, copies: "2" },
        { oracleId: "forest", name: "Forest", typeLine: "Basic Land — Forest", imageUri: null, copies: "40" },
      ],
      [{ commander: "gishath", oracleId: "boots", inclusion: 58.4 }],
      // The pair index stores the smaller oracle id first: "atreus" < "kratos", whatever the deck's order.
      [{ a: "atreus", b: "kratos", oracleId: "beast", inclusion: 31.2 }],
    );
    const { collection: c, asOf } = await readCollection(
      "u",
      [{ deckId: "g", oracleId: "boots", quantity: 1 }, { deckId: "brew", oracleId: "boots", quantity: 1 }, { deckId: "brew", oracleId: "forest", quantity: 10 }],
      [{ deckId: "g", commander: "gishath", partner: null }, { deckId: "k", commander: "kratos", partner: "atreus" }],
      new Set(["brew"]),
      ENV,
    );
    // The owned-printing art follows the reader's resolved switches, not the environment's.
    expect(artEnv.seen.at(-1) === ENV).toBe(true);
    expect(asOf).toEqual(AS_OF);
    // Basics are left out; the unpriced card counts as copies but not as value.
    expect([c.copies, c.cards, c.pricedCopies, c.valueCents]).toEqual([6, 3, 4, 2_000]);
    expect(c.all).toEqual({ inDeckCopies: 2, inDeckCents: 1_000 });
    expect(c.finished).toEqual({ inDeckCopies: 1, inDeckCents: 500 });
    expect(c.asOf).toBe(AS_OF.toISOString());
    expect(c.wanted).toEqual([
      { oracleId: "boots", name: "Swiftfoot Boots", imageUri: "owned-boots.jpg", owned: 3, wants: [{ deckId: "g", n: 1 }, { deckId: "brew", n: 1 }], hits: [{ deckId: "g", pct: 58.4 }] },
      { oracleId: "beast", name: "Beast Within", imageUri: null, owned: 1, wants: [], hits: [{ deckId: "k", pct: 31.2 }] },
    ]);
  });
});
