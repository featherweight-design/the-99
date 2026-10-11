import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

const exec = vi.hoisted(() => vi.fn());
const rec = vi.hoisted(() => ({ log: [] as string[], batches: [] as { op: string; table: string; n: number }[], transactions: 0 }));

vi.mock("../../db", () => {
  const tx = {
    insert: (table: object) => ({
      values: (rows: unknown[]) => {
        const name = getTableName(table as never);
        rec.log.push(`insert:${name}`);
        rec.batches.push({ op: "insert", table: name, n: rows.length });
        return { onConflictDoUpdate: async () => undefined, then: (ok: (v: unknown) => void) => ok(undefined) };
      },
    }),
    delete: async (table: object) => { rec.log.push(`delete:${getTableName(table as never)}`); },
  };
  return {
    db: {
      execute: exec,
      transaction: async (fn: (t: typeof tx) => Promise<void>) => { rec.transactions++; return fn(tx); },
    },
  };
});

import { publishTokenCatalog } from "./publish";
import { TOKEN_FLOORS, type TokenCatalog } from "./catalog";

const empty: TokenCatalog = {
  tokens: [], printings: [], links: [],
  stats: { tokenPrintings: 0, tokens: 0, links: 0, makers: 0, partRefs: 0, resolvedRefs: 0, unknownMakers: 0 },
};

/** A catalog over every floor, with `n` tokens so the batches cross the 1,000-row boundary. */
function full(n: number): TokenCatalog {
  const id = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
  return {
    tokens: Array.from({ length: n }, (_, i) => ({ oracleId: id(i), name: "T", typeLine: "Token", colors: [], power: null, toughness: null, layout: "token", oracleText: null })),
    printings: Array.from({ length: n }, (_, i) => ({ scryfallId: id(i + 1e6), tokenOracleId: id(i), setCode: "x", collectorNumber: "1", imageUri: null, imageUriSmall: null, artCropUri: null, backImageUri: null, finishes: ["nonfoil"] })),
    links: Array.from({ length: n }, (_, i) => ({ cardOracleId: id(i + 2e6), tokenOracleId: id(i) })),
    stats: {
      tokenPrintings: Math.max(n, TOKEN_FLOORS.tokenPrintings), tokens: Math.max(n, TOKEN_FLOORS.tokens),
      links: Math.max(n, TOKEN_FLOORS.links), makers: TOKEN_FLOORS.makers, partRefs: 100, resolvedRefs: 100, unknownMakers: 0,
    },
  };
}

describe("publishTokenCatalog", () => {
  beforeEach(() => { exec.mockReset(); rec.log = []; rec.batches = []; rec.transactions = 0; });

  it("skips, not refuses, when the tables are absent, even under every floor", async () => {
    exec.mockResolvedValue({ rows: [{ ok: false }] });
    const r = await publishTokenCatalog(empty);
    expect(r.status).toBe("skipped");
    expect(rec.log).toEqual([]);
  });

  it("refuses under a floor once the tables exist, writing nothing", async () => {
    exec.mockResolvedValue({ rows: [{ ok: true }] });
    const r = await publishTokenCatalog(empty);
    expect(r.status).toBe("refused");
    expect(rec.log).toEqual([]);
    expect(rec.transactions).toBe(0);
  });

  it("publishes in one transaction: tokens and printings upserted, links cleared then refilled", async () => {
    exec.mockResolvedValue({ rows: [{ ok: true }] });
    const catalog = full(2_500);
    const r = await publishTokenCatalog(catalog);
    expect(r).toEqual({ status: "published", stats: catalog.stats });
    expect(rec.transactions).toBe(1);
    // Tokens before printings (the foreign key), the delete before the first link insert, and
    // nothing deleted but the links: tokens and printings are upserted and never removed.
    const order = rec.log.filter((l, i, a) => a.indexOf(l) === i);
    expect(order).toEqual(["insert:tokens", "insert:token_printings", "delete:card_tokens", "insert:card_tokens"]);
    expect(rec.log.filter((l) => l.startsWith("delete:"))).toEqual(["delete:card_tokens"]);
    // 2,500 rows cross the 1,000-row batch boundary: 1,000 + 1,000 + 500, per table.
    for (const table of ["tokens", "token_printings", "card_tokens"]) {
      expect(rec.batches.filter((b) => b.table === table).map((b) => b.n)).toEqual([1000, 1000, 500]);
    }
  });
});
