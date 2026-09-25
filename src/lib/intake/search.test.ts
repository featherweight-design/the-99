// The intake catalog's memo: a page that draws only the theme labels reads the vocabulary and never
// the card-name index, which is every commander-legal card and is built only for a submit.

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: async () => "g1" }));

const { loadIntakeCatalog, loadIntakeThemes } = await import("./search");
const text = (q: SQL) => new PgDialect().sqlToQuery(q).sql;
const reads = () => execute.mock.calls.map(([q]) => text(q));

describe("the intake catalog memo", () => {
  it("draws the labels without reading a card, then builds the index once, for the submit", async () => {
    execute.mockImplementation(async (q: SQL) =>
      text(q).includes("commander_support") ? { rows: [] } : { rows: [{ oracle_id: "x", name: "Sol Ring", type_line: "Artifact" }] });
    await loadIntakeThemes(1_000);
    expect(reads().some((q) => q.includes("from cards c"))).toBe(false);
    const a = await loadIntakeCatalog(1_000);
    const b = await loadIntakeCatalog(1_000);
    expect(a.index).toBe(b.index);
    expect(reads().filter((q) => q.includes("from cards c"))).toHaveLength(1);
    expect(reads().filter((q) => q.includes("commander_support"))).toHaveLength(1);
  });
});
