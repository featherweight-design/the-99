import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const stub = vi.hoisted(() => ({ queries: [] as SQL[], answers: [] as unknown[][], opts: undefined as unknown }));
vi.mock("../../db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => unknown, opts: unknown) => {
      stub.opts = opts;
      return fn({
        execute: async (q: SQL) => {
          stub.queries.push(q);
          return { rows: stub.answers.shift() ?? [] };
        },
      });
    },
  },
}));

import { lookupGuesses } from "./lookup";
import { EMBED_DIM, SCAN_MODEL } from "./match";

const dialect = new PgDialect();
const text = (i: number) => dialect.sqlToQuery(stub.queries[i]);
const vec = new Float32Array(EMBED_DIM);
vec[0] = 1;
const META = { version: "all-20261014", model: SCAN_MODEL, rows: 103823 };
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  stub.queries = [];
  stub.answers = [];
});

describe("lookupGuesses", () => {
  it("reads in one repeatable-read transaction, each guess the nearest row of a card not already guessed", async () => {
    stub.answers = [[], [META], [{ oracleId: A, scryfallId: "a1", name: "A", typeLine: "Instant", imageUri: "https://img/a1", distance: 0.1 }], [{ oracleId: B, scryfallId: "b1", name: "B", typeLine: "Sorcery", imageUri: null, distance: 0.3 }], []];
    const r = await lookupGuesses(vec, SCAN_MODEL);
    expect(stub.opts).toEqual({ isolationLevel: "repeatable read" });
    expect(r).toEqual({
      kind: "ok",
      index: "all-20261014",
      answer: { guesses: [{ oracleId: A, scryfallId: "a1", name: "A", typeLine: "Instant", imageUri: "https://img/a1", score: 0.9 }, { oracleId: B, scryfallId: "b1", name: "B", typeLine: "Sorcery", imageUri: null, score: 0.7 }], margin: expect.closeTo(0.2) },
    });
    expect(text(0).sql).toContain("hnsw.iterative_scan");
    expect(text(0).sql).toContain("'lock_timeout', '2s'");
    expect(text(2).sql).not.toContain("<> all(");
    expect(text(3).sql).toContain("where s.oracle_id <> all(");
    expect(text(3).params).toContain(`{${A}}`);
    expect(text(4).params).toContain(`{${A},${B}}`);
    // The nearest row is ordered over scan_index alone, so the planner can keep the HNSW index.
    expect(text(2).sql).toMatch(/from scan_index s\s+order by s\.embedding <=>/);
    // The printing's own image first, the card's when the printing has none.
    expect(text(2).sql).toContain("coalesce(p.image_uri, c.image_uri)");
  });

  it("refuses a model the index was not built by, and reads no rows", async () => {
    stub.answers = [[], [META]];
    expect(await lookupGuesses(vec, "other")).toEqual({ kind: "model", index: { version: META.version, model: SCAN_MODEL } });
    expect(stub.queries).toHaveLength(2);
  });

  it("answers no-index with no meta row or an empty index", async () => {
    stub.answers = [[], []];
    expect(await lookupGuesses(vec, SCAN_MODEL)).toEqual({ kind: "no-index" });
    stub.answers = [[], [{ ...META, rows: 0 }]];
    expect(await lookupGuesses(vec, SCAN_MODEL)).toEqual({ kind: "no-index" });
  });
});
