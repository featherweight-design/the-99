// The overrides are read once per 30 seconds per instance, and a failed read is never held.
import { beforeEach, describe, expect, it, vi } from "vitest";

const reads = vi.hoisted(() => ({ n: 0, fail: false, rows: [] as unknown[], members: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: {
    select: () => ({
      from: (table: { _: unknown } | unknown) => {
        reads.n++;
        if (reads.fail) return Promise.reject(new Error("down"));
        return Promise.resolve(String((table as { [k: symbol]: unknown })[Symbol.for("drizzle:Name")]) === "flag_group_members" ? reads.members : reads.rows);
      },
    }),
  },
}));

const { clearSwitchSnapshot, resolveSwitchEnv, switchSnapshot, SNAPSHOT_TTL_MS } = await import("./snapshot");

describe("switchSnapshot", () => {
  beforeEach(() => {
    clearSwitchSnapshot();
    Object.assign(reads, { n: 0, fail: false, rows: [], members: [] });
  });

  it("reads once and serves the window from memory", async () => {
    await switchSnapshot(1_000);
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS - 1);
    expect(reads.n).toBe(2); // the overrides and the memberships, once
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS);
    expect(reads.n).toBe(4);
  });

  it("reads again at once after an admin write clears it", async () => {
    await switchSnapshot(1_000);
    clearSwitchSnapshot();
    await switchSnapshot(1_001);
    expect(reads.n).toBe(4);
  });

  it("serves the environment alone when the read fails, and asks again next time", async () => {
    reads.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await switchSnapshot(1_000)).toBeNull();
    await Promise.resolve();
    reads.fail = false;
    await switchSnapshot(1_001);
    expect(reads.n).toBe(4);
  });

  it("drops a row naming a switch this build does not know", async () => {
    reads.rows = [
      { switchName: "RETIRED_ENABLED", scope: "app", groupId: null, userId: null, value: "on" },
      { switchName: "DECK_NOTES_ENABLED", scope: "user", groupId: null, userId: "u1", value: "on" },
    ];
    expect((await switchSnapshot(1_000))?.overrides.map((o) => o.switchName)).toEqual(["DECK_NOTES_ENABLED"]);
    const env = await resolveSwitchEnv("u1", {} as unknown as NodeJS.ProcessEnv);
    expect(env.DECK_NOTES_ENABLED).toBe("true");
  });
});
