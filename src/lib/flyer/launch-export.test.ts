// The export over a recording transaction: the read left-joined oldest first, the audit row with the
// row count written in the same transaction as the read, and no event when the file cannot be built.
import { asc } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchList } from "../../db/schema";

const log: string[] = [];
const events: Record<string, unknown>[] = [];
let read: { email: string; store: string | null; code: string | null; addedAt: Date }[] = [];
let joined = false;
let ordered: unknown[] = [];
let inTx = false;

const name = (t: object) => String((t as Record<symbol, unknown>)[Symbol.for("drizzle:Name")]);
const tx = {
  select: () => ({
    from: () => ({
      leftJoin: (table: object) => {
        joined = name(table) === "flyer_codes";
        return { orderBy: async (...o: unknown[]) => { ordered = o; log.push(inTx ? "read:tx" : "read"); return read; } };
      },
    }),
  }),
  insert: (table: object) => ({
    values: async (v: Record<string, unknown>) => {
      if (name(table) === "admin_events") {
        log.push(inTx ? "audit:tx" : "audit");
        events.push(v);
      }
    },
  }),
};
vi.mock("../../db", () => ({
  db: {
    transaction: async (fn: (t: typeof tx) => unknown) => {
      inTx = true;
      try {
        return await fn(tx);
      } finally {
        inTx = false;
      }
    },
  },
}));

const { exportLaunchListFile } = await import("./launch-export");
const now = new Date("2026-11-02T10:00:00Z");

beforeEach(() => {
  log.length = 0;
  events.length = 0;
  joined = false;
  ordered = [];
  read = [
    { email: "ana.r@example.com", store: "Knight Moves Cafe", code: "KNT3HZ", addedAt: new Date("2026-10-31T18:02:11Z") },
    { email: "jo@example.com", store: null, code: null, addedAt: new Date("2026-11-01T14:08:03Z") },
  ];
});

describe("exportLaunchListFile", () => {
  it("reads with a left join ordered oldest first, then audits, all in the transaction", async () => {
    const out = await exportLaunchListFile("u_hugh", { now });
    expect(log).toEqual(["read:tx", "audit:tx"]);
    expect(joined).toBe(true);
    expect(ordered).toEqual([asc(launchList.createdAt), asc(launchList.email)]);
    expect(out.filename).toBe("the-99-launch-list-2026-11-02.csv");
    expect(out.rows).toBe(2);
    expect(out.csv).toBe("email,store,code,added_at\r\nana.r@example.com,Knight Moves Cafe,KNT3HZ,2026-10-31T18:02:11Z\r\njo@example.com,,,2026-11-01T14:08:03Z\r\n");
  });

  it("records one launch_list_exported event naming the actor and the row count", async () => {
    await exportLaunchListFile("u_hugh", { now });
    expect(events).toEqual([{ actorId: "u_hugh", kind: "launch_list_exported", newValue: "2", at: now }]);
  });

  it("an empty list is still audited and still a header-only file", async () => {
    read = [];
    const out = await exportLaunchListFile("u_hugh", { now });
    expect(out.csv).toBe("email,store,code,added_at\r\n");
    expect(events[0]).toMatchObject({ newValue: "0" });
  });

  it("writes no event when the file cannot be built", async () => {
    read = [{ email: "x@y.co", store: null, code: null, addedAt: new Date("nope") }];
    await expect(exportLaunchListFile("u_hugh", { now })).rejects.toThrow();
    expect(events).toEqual([]);
  });
});
