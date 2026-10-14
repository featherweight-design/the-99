import { describe, expect, it } from "vitest";

import { db } from "../../db";
import { loadPreconArrivals, preconArrivalsQuery } from "./arrivals-read";

describe("preconArrivalsQuery", () => {
  const { sql, params } = preconArrivalsQuery("user_1", new Date("2026-10-14T12:00:00Z"), db).toSQL();

  it("joins each precon to its own first-seen stamp, by file name", () => {
    expect(sql).toContain(`inner join "catalog_first_seen" on ("catalog_first_seen"."kind" = $1 and "catalog_first_seen"."key" = "precons"."file_name")`);
    expect(params[0]).toBe("precon");
  });

  it("keeps arrivals only: not the baseline, within thirty days, and no twin", () => {
    expect(sql).toContain(`"catalog_first_seen"."baseline" = $`);
    expect(sql).toContain(`"catalog_first_seen"."first_seen_at" > $`);
    expect(sql).toContain(`"precons"."twin_of" is null`);
    expect(params).toEqual(expect.arrayContaining([false, "2026-09-14T12:00:00.000Z"]));
  });

  it("matches MTGJSON's uppercase set code to the catalog's lowercase one", () => {
    expect(sql).toContain(`left join "sets" on "sets"."code" = lower("precons"."set_code")`);
    expect(sql).toContain(`select "precons"."file_name", "precons"."name", lower("precons"."set_code"), "sets"."name"`);
  });

  it("reads whether this reader holds lists:<code>, from their own prefs row, qualified", () => {
    expect(sql).toContain(`coalesce(('lists:' || lower("precons"."set_code")) = any("user_prefs"."upcoming_seen_codes"), false)`);
    expect(sql).toContain(`left join "user_prefs" on "user_prefs"."user_id" = $2`);
    expect(params[1]).toBe("user_1");
  });

  it("gives the oldest arrival first", () => {
    expect(sql).toMatch(/order by "catalog_first_seen"."first_seen_at", "precons"."file_name"$/);
  });
});

describe("loadPreconArrivals", () => {
  it("passes each row through as the read gave it", async () => {
    const row = {
      fileName: "Final_Frontier_TRC", name: "Final Frontier", setCode: "trc", setName: "Star Trek Commander",
      releasesOn: "2026-11-13", arrivedAt: new Date("2026-10-13T09:00:00Z"), listsSeen: false,
    };
    const chain = { from: () => chain, innerJoin: () => chain, leftJoin: () => chain, where: () => chain, orderBy: async () => [row] };
    expect(await loadPreconArrivals("user_1", new Date("2026-10-14T12:00:00Z"), { select: () => chain } as never)).toEqual([row]);
  });
});
