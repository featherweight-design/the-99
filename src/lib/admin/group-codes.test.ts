// Small items 10, item 5: a flyer code is ended when the trial is off for the account that made it, resolved once
// per creator. The switch read is injected; the query half is covered with the delete's own statement.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("../flags/snapshot", () => ({ resolveFlags: vi.fn(), resolveFlagsStrict: vi.fn() }));

const { endedCodeIds } = await import("./group-codes");

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
