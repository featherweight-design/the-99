// The method-changed notice's eligibility and its bound (plan 7.4; the addendum_method_notice
// audit, build rules 3, 4 and 11). Pure decisions plus the shape of the one query that counts runs.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { FREE_ATTEMPTS, freeRunAvailable, freeRunsFor, methodNoticeOf } from "./method-notice";

const old = { contractVersion: 7 };
const none = { attempts: 0, succeeded: false };

describe("methodNoticeOf", () => {
  it("is owed to an overview written under an older contract, with the switch on", () => {
    expect(methodNoticeOf({ v2: true, shown: old, runs: none })).toEqual({ attemptsLeft: 2 });
  });

  it("is owed to nothing with the switch off, with no overview, or with one already at contract 8", () => {
    expect(methodNoticeOf({ v2: false, shown: old, runs: none })).toBeNull();
    expect(methodNoticeOf({ v2: true, shown: null, runs: none })).toBeNull();
    expect(methodNoticeOf({ v2: true, shown: { contractVersion: 8 }, runs: none })).toBeNull();
  });

  it("counts every free call as an attempt, failed ones included, down to the paid fallback", () => {
    expect(methodNoticeOf({ v2: true, shown: old, runs: { attempts: 1, succeeded: false } })).toEqual({ attemptsLeft: 1 });
    expect(methodNoticeOf({ v2: true, shown: old, runs: { attempts: FREE_ATTEMPTS, succeeded: false } })).toEqual({ attemptsLeft: 0 });
    // Never negative, whatever a race left behind.
    expect(methodNoticeOf({ v2: true, shown: old, runs: { attempts: 5, succeeded: false } })).toEqual({ attemptsLeft: 0 });
  });

  // A free run that produced an overview leaves the shown row at contract 8, and a later revert to
  // a list whose own overview is older must not offer a second free rewrite.
  it("is gone once a free run has produced an overview, even over an older shown row", () => {
    expect(methodNoticeOf({ v2: true, shown: old, runs: { attempts: 1, succeeded: true } })).toBeNull();
  });

  it("offers the free press only while an attempt is left", () => {
    expect(freeRunAvailable({ attemptsLeft: 2 })).toBe(true);
    expect(freeRunAvailable({ attemptsLeft: 1 })).toBe(true);
    expect(freeRunAvailable({ attemptsLeft: 0 })).toBe(false);
    expect(freeRunAvailable(null)).toBe(false);
  });
});

describe("freeRunsFor", () => {
  function fake(rows: { status: string; content: unknown }[]) {
    const wheres: unknown[] = [];
    const q = { select: () => ({ from: () => ({ innerJoin: () => ({ where: (w: unknown) => { wheres.push(w); return Promise.resolve(rows); } }) }) }) };
    return { q: q as never, wheres };
  }
  const okContent = { verdicts: [{ section: "overview", status: "ok" }] };
  const refusedContent = { verdicts: [{ section: "overview", status: "refused" }] };

  it("reads only this deck's system calls at contract 8", async () => {
    const { q, wheres } = fake([]);
    await freeRunsFor(q, "deck-1");
    const { sql, params } = new PgDialect().sqlToQuery(wheres[0] as never);
    expect(sql).toContain('"deck_synopses"."deck_id" = $');
    expect(sql).toContain('"deck_synopses"."contract_version" = $');
    expect(sql).toContain('"model_calls"."origin" = $');
    expect(params).toEqual(["deck-1", 8, "system"]);
  });

  it("counts a failed, a refused and a pending run as attempts, and succeeds only on a shown overview", async () => {
    const rows = [{ status: "done", content: null }, { status: "done", content: refusedContent }, { status: "pending", content: null }];
    expect(await freeRunsFor(fake(rows).q, "d")).toEqual({ attempts: 3, succeeded: false });
    expect(await freeRunsFor(fake([...rows.slice(0, 1), { status: "done", content: okContent }]).q, "d")).toEqual({ attempts: 2, succeeded: true });
    expect(await freeRunsFor(fake([]).q, "d")).toEqual({ attempts: 0, succeeded: false });
  });
});
