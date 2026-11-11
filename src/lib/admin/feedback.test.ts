import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const requireAdmin = vi.fn();
const listAccounts = vi.fn();
vi.mock("../../db", () => ({ db: { execute: (q: unknown) => execute(q) } }));
vi.mock("./access", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("./accounts", async (orig) => ({ ...(await orig<typeof import("./accounts")>()), listAccounts: () => listAccounts() }));

const { readFeedback, markFeedbackRead, feedbackQuery, markReadQuery } = await import("./feedback");

const text = (q: SQL) => new PgDialect().sqlToQuery(q);
const U = "user_2abcdefghijk";
const ID = "11111111-1111-4111-8111-111111111111";
const notFound = () => {
  throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
};

function stat(rows: unknown[], extra: Record<string, unknown> = {}) {
  return { rows: [{ rows, total: 3, problems: 2, check_ins: 1, fresh: 2, avg: 4, ...extra }] };
}

beforeEach(() => {
  execute.mockReset();
  requireAdmin.mockReset().mockResolvedValue({ userId: "user_admin", env: "production" });
  listAccounts.mockReset().mockResolvedValue({ accounts: [{ id: U, name: "Colin R.", email: "c•••@g•••.com", named: true }], clerk: "ok" });
});

describe("a non-admin", () => {
  it("gets nothing: both functions reject and the db is never touched", async () => {
    requireAdmin.mockImplementation(notFound);
    await expect(readFeedback({ filter: "all" })).rejects.toThrow("404");
    await expect(markFeedbackRead(ID)).rejects.toThrow("404");
    expect(execute).not.toHaveBeenCalled();
    expect(listAccounts).not.toHaveBeenCalled();
  });
});

describe("feedbackQuery", () => {
  it("aliases and qualifies every column, and parameterizes filter, limit and offset", () => {
    const q = text(feedbackQuery("problem", 50, 100));
    expect(q.sql).toContain("from feedback f");
    expect(q.sql).toContain("left join flag_group_members fm on fm.user_id = f.user_id");
    expect(q.sql).toContain("left join flag_groups g on g.id = fm.group_id");
    expect(q.sql).toContain("order by f.created_at desc, f.id desc");
    // The counts are one pass, and the average counts only what coerceAnswers would show: a JSON number 1..5.
    expect(q.sql).toContain("from feedback c) t");
    expect(q.sql).toContain("jsonb_typeof(c.answers->'rating') = 'number' and c.answers->>'rating' ~ '^[1-5]$'");
    expect(q.params).toEqual(["problem", "problem", 51, 100]);
    // No bare `feedback.` qualification dropped and no unaliased column in the subqueries.
    expect(q.sql).not.toMatch(/\bfrom feedback where\b/);
  });
});

describe("readFeedback", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: ID, userId: U, kind: "problem", groupName: "testers", createdAt: "2026-11-10T10:00:00", readAt: null,
    page: "/decks", device: "iPhone", digest: "abcdef1234567890", source: "error", answers: { what: "broke", doing: 5 }, ...over,
  });

  it("returns masked names, coerced answers and counts; never a user id or an email", async () => {
    execute.mockResolvedValue(stat([row(), row({ id: "22222222-2222-4222-8222-222222222222", userId: null, kind: "check_in", source: "report", answers: null })]));
    const out = await readFeedback({ filter: "all" });
    expect(out.rows[0]).toMatchObject({ name: "Colin R.", group: "testers", unread: true, digest: "abcdef12", at: "2026-11-10T10:00:00.000Z", answers: { what: "broke", doing: "" } });
    expect(out.rows[1].name).toBeNull();
    expect(out.rows[1].answers).toEqual({ rating: null, uses: [], pod: "", note: "" });
    expect(out.counts).toEqual({ all: 3, problem: 2, check_in: 1 });
    expect(out.fresh).toBe(2);
    expect(out.avg).toBe(4);
    const json = JSON.stringify(out);
    expect(json).not.toContain(U);
    expect(json).not.toMatch(/[^\s"@]+@[^\s"@]+\.[a-z]+/i);
    expect(json).not.toContain("userId");
  });

  it("names an id Clerk does not list as an unlisted account, still masked", async () => {
    listAccounts.mockResolvedValue({ accounts: [], clerk: "down" });
    execute.mockResolvedValue(stat([row()]));
    const out = await readFeedback({});
    expect(out.rows[0].name).toMatch(/^Account/);
    expect(JSON.stringify(out)).not.toContain(U);
  });

  it("reports hasMore from the extra row and trims it; bad filter reads as all", async () => {
    execute.mockResolvedValue(stat([row(), row({ id: "33333333-3333-4333-8333-333333333333" })]));
    const out = await readFeedback({ filter: "'; drop", limit: 1 });
    expect(out.rows).toHaveLength(1);
    expect(out.hasMore).toBe(true);
    expect(text(execute.mock.calls[0][0]).params.slice(0, 2)).toEqual(["all", "all"]);
  });

  it("skips Clerk when no row has an account, and an empty average is null", async () => {
    execute.mockResolvedValue(stat([row({ userId: null })], { avg: null }));
    const out = await readFeedback();
    expect(listAccounts).not.toHaveBeenCalled();
    expect(out.avg).toBeNull();
  });
});

describe("markFeedbackRead", () => {
  it("rejects anything that is not a uuid without touching the db", async () => {
    for (const bad of ["x", null, undefined, 5, {}, [ID], { id: ID }, `${ID}'; drop table feedback; --`, "1 or 1=1", ""]) {
      expect(await markFeedbackRead(bad)).toEqual({ ok: false });
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("sets read_at only, while it is still null, with the id as a parameter", async () => {
    execute.mockResolvedValue({ rowCount: 1 });
    expect(await markFeedbackRead(ID)).toEqual({ ok: true, changed: true });
    const q = text(execute.mock.calls[0][0]);
    expect(q.sql).toBe("update feedback set read_at = now() where id = $1 and read_at is null");
    expect(q.params).toEqual([ID]);
    expect(text(markReadQuery(ID)).sql).not.toMatch(/answers|user_id|delete|select/);
  });

  it("is idempotent: a second call changes nothing", async () => {
    execute.mockResolvedValue({ rowCount: 0 });
    expect(await markFeedbackRead(ID)).toEqual({ ok: true, changed: false });
  });
});
