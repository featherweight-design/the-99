// The admission lock's own SQL and its release, which the read's tests mock away. A real Postgres
// proves the lock itself (`probe:the-read`); this pins what the code asks of its connection.
import { beforeEach, describe, expect, it, vi } from "vitest";

const conn = vi.hoisted(() => ({
  queries: [] as { text: string; values?: unknown[] }[],
  got: true as unknown,
  released: 0,
  ended: 0,
  options: [] as unknown[],
}));
vi.mock("@neondatabase/serverless", () => ({
  Pool: class {
    constructor(options: unknown) { conn.options.push(options); }
    async connect() {
      return {
        query: async (text: string, values?: unknown[]) => {
          conn.queries.push({ text, values });
          return { rows: text.includes("pg_try_advisory_xact_lock") ? [{ got: conn.got }] : [] };
        },
        release: () => { conn.released += 1; },
      };
    }
    async end() { conn.ended += 1; }
  },
}));
vi.mock("../../db", () => ({ db: {} }));

const { withReadAdmission } = await import("./run-store");
const texts = () => conn.queries.map((q) => q.text.split(" ").slice(0, 2).join(" "));

beforeEach(() => {
  conn.queries = []; conn.got = true; conn.released = 0; conn.ended = 0; conn.options = [];
});

describe("withReadAdmission", () => {
  it("takes the player's own try lock on a dedicated one-connection pool, runs the work inside it, and commits", async () => {
    const out = await withReadAdmission("user_1", async () => { conn.queries.push({ text: "WORK" }); return 42; });
    expect(out).toBe(42);
    expect(texts()).toEqual(["begin", "select pg_try_advisory_xact_lock(hashtextextended($1,", "WORK", "commit"]);
    expect(conn.queries[1].values).toEqual(["intake-admit:user_1"]);
    expect(conn.options[0]).toMatchObject({ max: 1 });
    expect([conn.released, conn.ended]).toEqual([1, 1]);
  });

  it("answers busy, runs nothing and releases the connection when another press holds the lock", async () => {
    const run = vi.fn();
    for (const got of [false, undefined, null]) {
      conn.got = got;
      expect(await withReadAdmission("user_1", run)).toBe("busy");
    }
    expect(run).not.toHaveBeenCalled();
    expect(conn.queries.some((q) => q.text === "commit")).toBe(false);
    expect([conn.released, conn.ended]).toEqual([3, 3]);
  });

  it("rolls back and releases when the work throws, and passes the error on", async () => {
    await expect(withReadAdmission("user_1", async () => { throw new Error("pool read failed"); })).rejects.toThrow("pool read failed");
    expect(conn.queries.map((q) => q.text)).toContain("rollback");
    expect(conn.queries.some((q) => q.text === "commit")).toBe(false);
    expect([conn.released, conn.ended]).toEqual([1, 1]);
  });
});
