import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));
const { ANON_REPORT_RETENTION_DAYS, purgeAnonymousReports } = await import("./purge");

const DAY = 24 * 60 * 60 * 1000;

describe("purgeAnonymousReports", () => {
  beforeEach(() => execute.mockReset().mockResolvedValue({ rows: [{ n: 4 }] }));

  it("keeps signed-out reports 90 days", () => {
    expect(ANON_REPORT_RETENTION_DAYS).toBe(90);
  });

  it("deletes from feedback alone, in one bounded statement, and reports the count", async () => {
    expect(await purgeAnonymousReports({ now: new Date("2027-03-01T00:00:00Z") })).toEqual({ deleted: 4 });
    expect(execute).toHaveBeenCalledTimes(1);
    const text = JSON.stringify(execute.mock.calls[0][0]);
    expect(text).toContain("delete from feedback");
    expect(text).toContain("limit");
    expect(text).not.toMatch(/delete from (?!feedback)/);
  });

  it("only ever targets rows with no user_id, in the subselect and the delete itself", async () => {
    await purgeAnonymousReports({ now: new Date("2027-03-01T00:00:00Z") });
    const text = JSON.stringify(execute.mock.calls[0][0]);
    expect(text.match(/user_id is null/g)).toHaveLength(2);
    expect(text).not.toMatch(/user_id is not null|user_id =/);
  });

  it("computes the cutoff as now minus 90 days", async () => {
    const now = new Date("2027-03-01T12:00:00Z");
    await purgeAnonymousReports({ now });
    const text = JSON.stringify(execute.mock.calls[0][0]);
    expect(text).toContain(new Date(now.getTime() - 90 * DAY).toISOString());
    expect(text).toContain("created_at <");
  });

  it("reports zero when nothing is old enough", async () => {
    execute.mockResolvedValueOnce({ rows: [{ n: 0 }] });
    expect(await purgeAnonymousReports({ now: new Date() })).toEqual({ deleted: 0 });
    execute.mockResolvedValueOnce({ rows: [] });
    expect(await purgeAnonymousReports({ now: new Date() })).toEqual({ deleted: 0 });
  });
});
