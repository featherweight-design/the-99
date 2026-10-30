import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const wheres: unknown[] = [];
const chain = (rows: { n: number }[]) => {
  const c: Record<string, unknown> = {
    from: () => c,
    innerJoin: () => c,
    where: (w: unknown) => {
      wheres.push(w);
      return Promise.resolve(rows);
    },
  };
  return c;
};
let calls = 0;
vi.mock("../../db", () => ({ db: { select: () => chain([{ n: ++calls === 1 ? 4 : 9 }]) } }));
vi.mock("../decks/built", async () => {
  const { sql } = await import("drizzle-orm");
  return { notBuiltBy: () => sql`true` };
});

const { loadCommanderCounts } = await import("./counts");

describe("loadCommanderCounts", () => {
  it("counts only score rows at the writer version this deployment serves", async () => {
    const out = await loadCommanderCounts("u1", {} as NodeJS.ProcessEnv);
    expect(out).toEqual({ owned: 4, discover: 9 });
    const { sql } = new PgDialect().sqlToQuery(wheres[0] as never);
    expect(sql).toContain('"writer_version" = $');
  });
});
