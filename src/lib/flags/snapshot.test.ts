// The overrides are read once per 30 seconds per instance, served stale while a read refreshes them behind the
// response, and a failed read is never held.
import { beforeEach, describe, expect, it, vi } from "vitest";

// The HTTP driver's query function: every call is one statement, and `reads.n` counts them.
const reads = vi.hoisted(() => ({
  n: 0, fail: false, rows: [] as unknown[], members: [] as unknown[], texts: [] as string[],
  // When set, the next read waits for `release()` instead of answering at once.
  gate: null as Promise<void> | null,
}));
// `after()` outside a request throws; here it records what it was asked to keep alive.
const kept = vi.hoisted(() => ({ calls: [] as (() => unknown)[], throws: false }));
vi.mock("next/server", () => ({
  after: (task: () => unknown) => {
    if (kept.throws) throw new Error("`after` was called outside a request scope");
    kept.calls.push(task);
  },
}));
// The data cache, passed through: `built` records how the entry was declared, `lookups` each read through it,
// `unavailable` stands for a scope with no cache to give, and `retired` each tag a write retired.
const cache = vi.hoisted(() => ({
  built: [] as { key: string[]; opts: { tags?: string[]; revalidate?: number } }[],
  lookups: 0, unavailable: false, retired: [] as unknown[][],
  // What the cached function threw: Next stores nothing for a call that throws.
  threw: [] as unknown[],
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, key: string[], opts: { tags?: string[]; revalidate?: number }) => {
    cache.built.push({ key, opts });
    return async () => {
      if (cache.unavailable) throw new Error("Invariant: incrementalCache missing in unstable_cache");
      cache.lookups++;
      try {
        return await fn();
      } catch (error) {
        cache.threw.push(error);
        throw error;
      }
    };
  },
  revalidateTag: (...args: unknown[]) => { cache.retired.push(args); },
}));
vi.mock("@neondatabase/serverless", () => ({
  neon: () => ({
    query: async (text: string) => {
      reads.n++;
      reads.texts.push(text);
      const fail = reads.fail;
      const answer = [{ overrides: reads.rows, members: reads.members }];
      if (reads.gate) await reads.gate;
      if (fail) throw new Error("down");
      return answer;
    },
  }),
}));
process.env.DATABASE_URL ??= "postgres://stub:stub@localhost/stub";

const {
  clearSwitchSnapshot, resolveFlags, switchSnapshot, switchSnapshotState,
  SNAPSHOT_CACHE_SECONDS, SNAPSHOT_MAX_STALE_MS, SNAPSHOT_SQL, SNAPSHOT_TAG, SNAPSHOT_TTL_MS,
} = await import("./snapshot");

describe("switchSnapshot", () => {
  beforeEach(() => {
    clearSwitchSnapshot();
    Object.assign(reads, { n: 0, fail: false, rows: [], members: [], texts: [], gate: null });
    Object.assign(kept, { calls: [], throws: false });
    Object.assign(cache, { lookups: 0, unavailable: false, retired: [], threw: [] });
  });

  const row = (value: "on" | "off") => ({ switchName: "FEEDBACK_ENABLED", scope: "app", groupId: null, userId: null, value });
  const gated = () => {
    let release = () => {};
    reads.gate = new Promise<void>((r) => (release = r));
    return () => {
      reads.gate = null;
      release();
    };
  };
  const settle = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  it("reads once and serves the window from memory", async () => {
    await switchSnapshot(1_000);
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS - 1);
    expect(reads.n).toBe(1); // the overrides and the memberships, in one statement, once
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS);
    expect(reads.n).toBe(2);
  });

  it("serves the held snapshot at once past its window, and refreshes it behind the response", async () => {
    reads.rows = [row("on")];
    await switchSnapshot(1_000);
    reads.rows = [row("off")];
    const release = gated();
    const served = await switchSnapshot(1_000 + SNAPSHOT_TTL_MS); // answers while the refresh is still held at the gate
    expect(served?.overrides[0]?.value).toBe("on");
    expect(reads.n).toBe(2);
    expect(kept.calls).toHaveLength(1); // the refresh is kept alive past the response
    // a second request while it is in flight is served stale too, and starts no read of its own
    expect((await switchSnapshot(1_000 + SNAPSHOT_TTL_MS + 1))?.overrides[0]?.value).toBe("on");
    expect(reads.n).toBe(2);
    release();
    await kept.calls[0]();
    expect((await switchSnapshot(1_000 + SNAPSHOT_TTL_MS + 2))?.overrides[0]?.value).toBe("off");
    expect(reads.n).toBe(2);
  });

  it("makes only an instance's first read wait", async () => {
    const release = gated();
    let answered = false;
    const first = switchSnapshot(1_000).then((s) => (answered = true, s));
    await settle();
    expect(answered).toBe(false);
    release();
    expect(await first).not.toBeNull();
  });

  it("keeps serving the held snapshot when a refresh fails, and asks again next request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    reads.rows = [row("on")];
    await switchSnapshot(1_000);
    reads.fail = true;
    expect((await switchSnapshot(1_000 + SNAPSHOT_TTL_MS))?.overrides[0]?.value).toBe("on");
    await kept.calls[0]();
    expect((await switchSnapshot(1_000 + SNAPSHOT_TTL_MS + 1))?.overrides[0]?.value).toBe("on");
    expect(reads.n).toBe(3);
  });

  it("refreshes even outside a request, where after() throws", async () => {
    await switchSnapshot(1_000);
    kept.throws = true;
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS);
    expect(reads.n).toBe(2);
  });

  it("does not let a refresh begun before an admin write land after it", async () => {
    reads.rows = [row("on")];
    await switchSnapshot(1_000);
    const release = gated();
    await switchSnapshot(1_000 + SNAPSHOT_TTL_MS); // a refresh that read the pre-write rows, held at the gate
    clearSwitchSnapshot(); // the write commits
    reads.rows = [row("off")];
    reads.gate = null; // the post-write read answers at once, BEFORE the pre-write one
    expect((await switchSnapshot(1_000 + SNAPSHOT_TTL_MS + 1))?.overrides[0]?.value).toBe("off");
    release(); // the pre-write read lands last
    await kept.calls[0]();
    expect((await switchSnapshot(1_000 + SNAPSHOT_TTL_MS + 2))?.overrides[0]?.value).toBe("off");
  });

  it("waits on the read past the staleness cap, and answers the fallbacks when it fails there", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    reads.rows = [row("on")];
    await switchSnapshot(1_000);
    reads.rows = [row("off")];
    const release = gated();
    let answered = false;
    const late = switchSnapshot(1_000 + SNAPSHOT_MAX_STALE_MS).then((s) => (answered = true, s));
    await settle();
    expect(answered).toBe(false); // too old to serve: it waits
    release();
    expect((await late)?.overrides[0]?.value).toBe("off");
    reads.fail = true;
    expect(await switchSnapshot(1_000 + 3 * SNAPSHOT_MAX_STALE_MS)).toBeNull();
    expect(switchSnapshotState(1_000 + 3 * SNAPSHOT_MAX_STALE_MS)).toBe("miss");
  });

  it("reports a read as a miss, pending while another's is in flight, a hit once held, stale past the window", async () => {
    expect(switchSnapshotState(1_000)).toBe("miss");
    const read = switchSnapshot(1_000);
    expect(switchSnapshotState(1_001)).toBe("pending");
    await read;
    expect(switchSnapshotState(1_002)).toBe("hit");
    expect(switchSnapshotState(1_000 + SNAPSHOT_TTL_MS)).toBe("stale");
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
  // would silently get the fallbacks alone.
  it("names each field the resolver reads, from the column that holds it", () => {
    const pairs = [
      `'switchName', o."switch"`, `'scope', o.scope`, `'groupId', o.group_id`, `'userId', o.user_id`, `'value', o.value`,
      `'userId', m.user_id`, `'groupId', m.group_id`,
    ];
    for (const pair of pairs) expect(SNAPSHOT_SQL).toContain(pair);
  });

  it("hands the resolver what the statement returns", async () => {
    reads.rows = [{ switchName: "FEEDBACK_ENABLED", scope: "group", groupId: "g1", userId: null, value: "on" }];
    reads.members = [{ userId: "u1", groupId: "g1" }];
    const env = await resolveFlags("u1", {} as unknown as NodeJS.ProcessEnv);
    expect(env.FEEDBACK_ENABLED).toBe("true");
  });

  it("reads again at once after an admin write clears it", async () => {
    await switchSnapshot(1_000);
    clearSwitchSnapshot();
    await switchSnapshot(1_001);
    expect(reads.n).toBe(2);
  });

  it("serves each switch's fallback when the read fails, and asks again next time", async () => {
    reads.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await switchSnapshot(1_000)).toBeNull();
    await Promise.resolve();
    reads.fail = false;
    await switchSnapshot(1_001);
    expect(reads.n).toBe(2);
  });

  it("resolves a failed read to each switch's fallback, not its variable", async () => {
    reads.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const env = await resolveFlags("u1", { FEEDBACK_ENABLED: "true" } as unknown as NodeJS.ProcessEnv);
    expect(env.FEEDBACK_ENABLED).toBe("false");
    expect(env.LIST_CACHE_ENABLED).toBe("true");
  });

  it("drops a row naming a switch this build does not know", async () => {
    reads.rows = [
      { switchName: "RETIRED_ENABLED", scope: "app", groupId: null, userId: null, value: "on" },
      { switchName: "FEEDBACK_ENABLED", scope: "user", groupId: null, userId: "u1", value: "on" },
    ];
    expect((await switchSnapshot(1_000))?.overrides.map((o) => o.switchName)).toEqual(["FEEDBACK_ENABLED"]);
    const env = await resolveFlags("u1", {} as unknown as NodeJS.ProcessEnv);
    expect(env.FEEDBACK_ENABLED).toBe("true");
  });
  it("reads through ONE tagged data-cache entry every instance shares, keyed on the database, with a ceiling", async () => {
    await switchSnapshot(1_000); // beforeEach's clear stands for a write here: this read goes to Neon (below)
    await switchSnapshot(1_000 + SNAPSHOT_MAX_STALE_MS);
    expect(cache.lookups).toBe(1);
    expect(cache.built).toEqual([{ key: [SNAPSHOT_TAG, "localhost"], opts: { tags: [SNAPSHOT_TAG], revalidate: SNAPSHOT_CACHE_SECONDS } }]);
    await switchSnapshot(1_000 + 2 * SNAPSHOT_MAX_STALE_MS);
    expect(cache.lookups).toBe(2);
    expect(cache.built).toHaveLength(1); // declared once, not per read
  });

  it("reads Neon, not the entry it is retiring, on the instance that wrote", async () => {
    await switchSnapshot(1_000 - 2 * SNAPSHOT_MAX_STALE_MS);
    clearSwitchSnapshot();
    reads.n = 0;
    await switchSnapshot(1_000);
    expect(reads.n).toBe(1);
    expect(cache.lookups).toBe(0);
    await switchSnapshot(1_000 + SNAPSHOT_MAX_STALE_MS);
    expect(cache.lookups).toBe(1); // only the first: after it, the shared entry again
  });

  it("never stores a failed read: the cache sees it thrown and the request gets the fallbacks", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await switchSnapshot(1_000);
    reads.fail = true;
    reads.n = 0;
    expect(await switchSnapshot(1_000 + SNAPSHOT_MAX_STALE_MS)).toBeNull();
    expect(cache.lookups).toBe(1);
    expect(cache.threw).toHaveLength(1); // thrown out of the cached function, never returned as a value to store
    expect(reads.n).toBe(1); // and not read again behind it: the failure is the answer
  });

  it("reads Neon directly where there is no data cache to give", async () => {
    await switchSnapshot(1_000);
    cache.unavailable = true;
    reads.rows = [row("off")];
    reads.n = 0;
    const snapshot = await switchSnapshot(1_000 + SNAPSHOT_MAX_STALE_MS);
    expect(snapshot?.overrides).toEqual([row("off")]);
    expect(reads.n).toBe(1);
    expect(cache.lookups).toBe(0);
  });

  it("retires the shared entry on every write once the response is sent, and gives up quietly outside a request", () => {
    clearSwitchSnapshot();
    expect(cache.retired).toHaveLength(0); // never inline: a render forbids it, an action would ship its page again
    expect(kept.calls).toHaveLength(1);
    kept.calls[0]();
    expect(cache.retired).toEqual([[SNAPSHOT_TAG, { expire: 0 }]]);
    kept.throws = true;
    expect(() => clearSwitchSnapshot()).not.toThrow();
  });
});
