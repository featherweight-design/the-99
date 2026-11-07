// Small items 10, item 5: a flyer code is ended when the trial is off for the account that made it, resolved once
// per creator. The switch read is injected; the query half is covered with the delete's own statement.
import { describe, expect, it, vi } from "vitest";

const where = vi.hoisted(() => vi.fn<(w: unknown) => Promise<{ id: string; createdBy: string }[]>>(async () => []));
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where }) }) } }));
const resolveFlags = vi.hoisted(() => vi.fn());
const resolveFlagsStrict = vi.hoisted(() => vi.fn());
vi.mock("../flags/snapshot", () => ({ resolveFlags, resolveFlagsStrict }));

const { endedCodeIds, loadEndedCodeIds } = await import("./group-codes");
const { PgDialect } = await import("drizzle-orm/pg-core");

const codes = [
  { id: "a", createdBy: "u_hugh" },
  { id: "b", createdBy: "u_hugh" },
  { id: "c", createdBy: "u_other" },
];
const env = (on: boolean) => ({ FLYER_TRIAL_ENABLED: on ? "true" : "false" }) as unknown as NodeJS.ProcessEnv;

describe("endedCodeIds", () => {
  it("ends every code of a creator whose trial is off, and none when it is on", async () => {
    expect([...(await endedCodeIds(codes, async () => env(false)))].sort()).toEqual(["a", "b", "c"]);
    expect([...(await endedCodeIds(codes, async () => env(true)))]).toEqual([]);
  });

  it("reads each creator's switch once, and per creator", async () => {
    const resolve = vi.fn(async (u: string | null) => env(u === "u_hugh"));
    expect([...(await endedCodeIds(codes, resolve))]).toEqual(["c"]);
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it("ends nothing for no codes", async () => {
    expect([...(await endedCodeIds([], async () => env(false)))]).toEqual([]);
  });
});

describe("loadEndedCodeIds", () => {
  const G = "11111111-1111-4111-8111-111111111111";

  it("looks at the group's unrevoked codes only, and reads the switch strictly", async () => {
    where.mockResolvedValueOnce([{ id: "a", createdBy: "u_hugh" }]);
    resolveFlagsStrict.mockResolvedValueOnce(env(false));
    expect(await loadEndedCodeIds(G)).toEqual(["a"]);
    const { sql: raw, params } = new PgDialect().sqlToQuery(where.mock.calls[0][0] as never);
    expect(raw).toContain('"flyer_codes"."group_id" = $1');
    expect(raw).toContain('"flyer_codes"."revoked_at" is null');
    expect(params).toEqual([G]);
    expect(resolveFlagsStrict).toHaveBeenCalledWith("u_hugh");
    expect(resolveFlags).not.toHaveBeenCalled();
  });

  it("throws when the strict read fails, so the delete refuses rather than ending codes from fallbacks", async () => {
    where.mockResolvedValueOnce([{ id: "a", createdBy: "u_hugh" }]);
    resolveFlagsStrict.mockRejectedValueOnce(new Error("down"));
    await expect(loadEndedCodeIds(G)).rejects.toThrow("down");
  });
});
