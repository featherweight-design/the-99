// The overrides are read once per 30 seconds per instance, and a failed read is never held.
import { beforeEach, describe, expect, it, vi } from "vitest";

// The HTTP driver's query function: every call is one statement, and `reads.n` counts them.
const reads = vi.hoisted(() => ({ n: 0, fail: false, rows: [] as unknown[], members: [] as unknown[], texts: [] as string[] }));
vi.mock("@neondatabase/serverless", () => ({
  neon: () => ({
    query: (text: string) => {
      reads.n++;
      reads.texts.push(text);
      if (reads.fail) return Promise.reject(new Error("down"));
      return Promise.resolve([{ overrides: reads.rows, members: reads.members }]);
    },
  }),
}));
process.env.DATABASE_URL ??= "postgres://stub:stub@localhost/stub";

const { clearSwitchSnapshot, resolveSwitchEnv, switchSnapshot, switchSnapshotState, SNAPSHOT_SQL, SNAPSHOT_TTL_MS } = await import("./snapshot");

describe("switchSnapshot", () => {
  beforeEach(() => {
    clearSwitchSnapshot();
    Object.assign(reads, { n: 0, fail: false, rows: [], members: [], texts: [] });
  });

  it("reads once and serves the window from memory", async () => {
    await switchSnapshot(1_000);
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS - 1);
    expect(reads.n).toBe(1); // the overrides and the memberships, in one statement, once
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS);
    expect(reads.n).toBe(2);
  });

  it("reports a read as a miss, pending while another's is in flight, and a hit once settled", async () => {
    expect(switchSnapshotState(1_000)).toBe("miss");
    const read = switchSnapshot(1_000);
    expect(switchSnapshotState(1_001)).toBe("pending");
    await read;
    await Promise.resolve();
    expect(switchSnapshotState(1_002)).toBe("hit");
    expect(switchSnapshotState(1_000 + SNAPSHOT_TTL_MS)).toBe("miss");
  });

  // Two reads could pair one table's old rows with the other's new ones, a combination that never
  // existed (an account moved between groups as its override changed). One statement is one snapshot.
  it("reads both tables in ONE statement, so one snapshot", async () => {
    await switchSnapshot(1_000);
    expect(reads.texts).toEqual([SNAPSHOT_SQL]);
    expect(SNAPSHOT_SQL).toMatch(/\bfrom flag_overrides\b/);
    expect(SNAPSHOT_SQL).toMatch(/\bfrom flag_group_members\b/);
    expect(SNAPSHOT_SQL.trim().toLowerCase().startsWith("select")).toBe(true);
    expect(SNAPSHOT_SQL).not.toContain(";");
  });

  // The mock below hands back rows already shaped, so the SQL's own keys are pinned here: a renamed key
  // would leave every row failing `isSwitchName`, or no group override ever matching, and every reader
  // would silently get the environment alone.
  it("names each field the resolver reads, from the column that holds it", () => {
    const pairs = [
      `'switchName', o."switch"`, `'scope', o.scope`, `'groupId', o.group_id`, `'userId', o.user_id`, `'value', o.value`,
      `'userId', m.user_id`, `'groupId', m.group_id`,
    ];
    for (const pair of pairs) expect(SNAPSHOT_SQL).toContain(pair);
  });

  it("hands the resolver what the statement returns", async () => {
    reads.rows = [{ switchName: "DECK_NOTES_ENABLED", scope: "group", groupId: "g1", userId: null, value: "on" }];
    reads.members = [{ userId: "u1", groupId: "g1" }];
    const env = await resolveSwitchEnv("u1", {} as unknown as NodeJS.ProcessEnv);
    expect(env.DECK_NOTES_ENABLED).toBe("true");
  });

  it("reads again at once after an admin write clears it", async () => {
    await switchSnapshot(1_000);
    clearSwitchSnapshot();
    await switchSnapshot(1_001);
    expect(reads.n).toBe(2);
  });

  it("serves the environment alone when the read fails, and asks again next time", async () => {
    reads.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await switchSnapshot(1_000)).toBeNull();
    await Promise.resolve();
    reads.fail = false;
    await switchSnapshot(1_001);
    expect(reads.n).toBe(2);
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
