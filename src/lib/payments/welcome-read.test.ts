import { describe, expect, it, vi } from "vitest";
import { db } from "../../db";
import { RESERVATION_TTL_MS } from "../model/allowance-rule";
import { dismissWelcomeStripWrite, readWelcomeLot, welcomeLotQuery } from "./welcome-read";

const NOW = new Date("2026-10-25T12:00:00Z");
const EXPIRES = new Date("2026-11-20T12:00:00Z");

describe("welcomeLotQuery (G1)", () => {
  const { sql, params } = welcomeLotQuery("user_1", NOW, db).toSQL();

  it("reads the reader's welcome row alone, one row", () => {
    expect(sql).toContain(`where ("credit_grants"."user_id" = $`);
    expect(sql).toContain(`"credit_grants"."source" = $`);
    expect(params).toEqual(expect.arrayContaining(["user_1", "welcome"]));
    expect(sql).toMatch(/limit \$\d+$/);
  });

  it("keeps an expired lot: no expiry filter, unlike the allowance's read", () => {
    expect(sql).not.toMatch(/"expires_at" >/);
  });

  it("correlates both subqueries on the OUTER table's id, qualified, never a bare id", () => {
    const correlated = sql.match(/mc\.credit_grant_id = "credit_grants"\.id/g) ?? [];
    expect(correlated).toHaveLength(2);
    expect(sql).not.toMatch(/credit_grant_id = "id"/);
    expect(sql).toContain(`from "model_calls" mc`);
  });

  it("counts reservations only while they are young enough to hold a credit", () => {
    expect(params).toContain(new Date(NOW.getTime() - RESERVATION_TTL_MS).toISOString());
  });
});

/** A reader that answers `welcomeLotQuery` with `rows`. */
function reader(rows: unknown[]) {
  const chain = { from: () => chain, where: () => chain, limit: async () => rows };
  return { select: vi.fn(() => chain) } as unknown as Pick<typeof db, "select">;
}
const row = (over: Record<string, unknown> = {}) => ({
  id: "g1", units: 15, revokedUnits: 0, expiresAt: EXPIRES, createdAt: new Date("2026-10-21T12:00:00Z"), spent: 0, reserved: null, ...over,
});

describe("readWelcomeLot", () => {
  it("no row is no lot", async () => {
    expect(await readWelcomeLot("u", NOW, reader([]))).toBeNull();
  });

  it("a whole lot: units at the start, all left", async () => {
    expect(await readWelcomeLot("u", NOW, reader([row()]))).toEqual({ units: 15, left: 15, expiresAt: EXPIRES, expired: false });
  });

  it("spent rows and a young reservation each hold a credit; a stale reservation gives its credit back", async () => {
    const young = NOW.getTime() - 60_000;
    const stale = NOW.getTime() - RESERVATION_TTL_MS - 60_000;
    expect(await readWelcomeLot("u", NOW, reader([row({ spent: "5", reserved: [young, stale] })]))).toMatchObject({ left: 9 });
  });

  it("used up reads left 0 and not expired; past its date reads expired", async () => {
    expect(await readWelcomeLot("u", NOW, reader([row({ spent: 15 })]))).toMatchObject({ left: 0, expired: false });
    expect(await readWelcomeLot("u", EXPIRES, reader([row({ spent: 3 })]))).toMatchObject({ left: 0, expired: true, units: 15 });
  });
});

describe("dismissWelcomeStripWrite (G2)", () => {
  const { sql, params } = dismissWelcomeStripWrite("user_1", db).toSQL();

  it("stamps the reader's row with the time of the close", () => {
    expect(sql).toContain(`on conflict ("user_id") do update set "welcome_strip_dismissed_at" = now()`);
    expect(params).toContain("user_1");
  });

  it("updates only while the stamp is null, so a second close moves no stamp (the stamp trigger fires on any update)", () => {
    expect(sql).toMatch(/ where "user_prefs"\."welcome_strip_dismissed_at" is null returning /);
  });
});
