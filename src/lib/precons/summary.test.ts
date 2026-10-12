import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ next: [] as unknown[] | Error }));
vi.mock("../../db", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../db")>();
  return {
    db: {
      select: (...a: Parameters<typeof real.db.select>) => {
        const q = real.db.select(...a);
        const from = q.from.bind(q);
        return Object.assign(q, {
          from: (t: Parameters<typeof from>[0]) => {
            const w = from(t);
            const where = w.where.bind(w);
            return Object.assign(w, {
              where: (c: Parameters<typeof where>[0]) => {
                const built = where(c);
                return Object.assign(built, {
                  then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
                    (rows.next instanceof Error ? Promise.reject(rows.next) : Promise.resolve(rows.next)).then(res, rej),
                });
              },
            });
          },
        });
      },
    },
  };
});

import { preconSummaryQuery, readPreconSummary } from "./summary";

describe("readPreconSummary", () => {
  it("counts plain editions only: a twin folds into the edition it names", () => {
    expect(preconSummaryQuery().toSQL().sql).toContain(`where "precons"."twin_of" is null`);
  });

  it("answers the count and the newest release", async () => {
    rows.next = [{ count: 181, newest: "2026-10-02" }];
    expect(await readPreconSummary()).toEqual({ count: 181, newest: "2026-10-02" });
  });

  it("answers null for an empty table and for a failed read, never throwing", async () => {
    rows.next = [{ count: 0, newest: null }];
    expect(await readPreconSummary()).toBeNull();
    rows.next = new Error("down");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await readPreconSummary()).toBeNull();
  });
});
