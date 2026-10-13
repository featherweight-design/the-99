// The on-demand profile fetch's wire contract.
//
// What this layer owns: that the flag is answered BEFORE any read, that a malformed id never
// reaches a `uuid` column, that the three outcomes stay distinct, and that `disabled` is not
// reported as a failure. `probe:bracket` proves the profile the loader builds; nothing there
// calls this export, because a server action needs a request and a signed-in reader.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestSwitchEnv } from "../../lib/switches/request";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: vi.fn(async () => process.env) }));

const stub = vi.hoisted(() => ({
  enabled: true,
  profile: null as unknown,
  /** When set, the press is refused as an illegal deck with these counts. */
  illegal: null as null | { built: number; size: number },
  /** The press's `analyzedAt`: a fresh compute stamps now, a store answer its own row's time. */
  pressedAt: new Date(),
  storedFresh: true,
  versionNumber: null as number | null,
  /** Every read this action performed, in order. The flag check is only meaningful if the
   *  reads it precedes can be observed NOT to have happened. */
  reads: [] as string[],
  /** What a stored lookup finds. */
  stored: null as unknown,
  revalidated: [] as string[],
  /** What the reading's benchmarks read answers. */
  benchmarks: null as unknown,
  /** The switch value each benchmarks read was handed (its third argument). */
  benchmarksEnabled: [] as unknown[],
  deferred: 0,
  /** The env each stored-profile read was built under (`requestProfileDeps`, reduced to its env). */
  profileEnvs: [] as unknown[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => stub.revalidated.push(path),
}));

// `after` runs its callback once the response is sent; here it runs it at once, so what is
// asserted is that the action SCHEDULED the revalidation, and scheduled it through `after`.
vi.mock("next/server", () => ({
  after: (fn: () => void) => {
    stub.deferred += 1;
    fn();
  },
}));

vi.mock("../../lib/decks/analysis-flag", () => ({
  analysisTabEnabled: () => stub.enabled,
}));

vi.mock("../../lib/benchmarks/reading", () => ({
  readingBenchmarks: async (profile: unknown, _userId: string, enabled?: boolean) => {
    stub.reads.push("benchmarks");
    stub.benchmarksEnabled.push(enabled);
    return profile ? stub.benchmarks : null;
  },
}));

vi.mock("../../lib/auth", () => ({
  requireUserId: async () => {
    stub.reads.push("auth");
    return "user-1";
  },
}));

const STORED_AT = new Date("2026-09-18T12:00:00Z");

vi.mock("../../lib/profile/stored", () => ({
  requestProfileDeps: (env: unknown) => ({ env }),
  computeAndStoreProfile: async (_deckId: string, _userId: string, deps?: { env?: unknown }) => {
    stub.profileEnvs.push(deps?.env);
    stub.reads.push("profile");
    if (stub.illegal) return { kind: "illegal", ...stub.illegal };
    return stub.profile
      ? { kind: "ok", reading: { profile: stub.profile, analyzedAt: stub.pressedAt, fresh: true, versionId: null, versionNumber: stub.versionNumber } }
      : null;
  },
  readStoredReading: async (_deckId: string, _userId: string, deps?: { env?: unknown }) => {
    stub.profileEnvs.push(deps?.env);
    stub.reads.push("stored");
    return stub.stored
      ? { profile: stub.stored, analyzedAt: STORED_AT, fresh: stub.storedFresh, versionId: null, versionNumber: stub.versionNumber }
      : null;
  },
}));

const { fetchDeckProfile, fetchStoredDeckProfile } = await import("./profile-actions");

const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  stub.profileEnvs = [];
  stub.enabled = true;
  stub.profile = { brackets: {} };
  stub.illegal = null;
  stub.pressedAt = new Date();
  stub.storedFresh = true;
  stub.versionNumber = null;
  stub.reads = [];
  stub.stored = null;
  stub.revalidated = [];
  stub.deferred = 0;
  stub.benchmarks = null;
  stub.benchmarksEnabled = [];
});

describe("fetchDeckProfile", () => {
  it("returns the profile when the flag is on and the deck is the reader's", async () => {
    const result = await fetchDeckProfile(DECK);
    // A press is dated when it ran: the bracket box prints `analyzed a moment ago`.
    expect(result).toEqual({
      ok: true, profile: { brackets: {} }, analyzedAt: expect.any(String), fresh: true, versionNumber: null, benchmarks: null,
    });
    expect(Date.now() - Date.parse((result as { analyzedAt: string }).analyzedAt)).toBeLessThan(5_000);
    expect(stub.reads).toEqual(["auth", "profile", "benchmarks"]);
  });

  // RULING 5: a press on an unchanged list answers from the store, and the reading keeps the
  // moment it was computed rather than being re-dated by the press that returned it.
  it("dates an answer from the store by its own row, not by the press", async () => {
    stub.pressedAt = STORED_AT;
    expect(await fetchDeckProfile(DECK)).toEqual({
      ok: true, profile: { brackets: {} }, analyzedAt: STORED_AT.toISOString(), fresh: true, versionNumber: null, benchmarks: null,
    });
  });

  // RULING 1: analysis runs only on a whole deck, and the refusal carries the counts the surface
  // will print (C2 draws it; until then the hook reads it as `missing`).
  it("refuses an illegal deck with its counts, and retires nothing", async () => {
    stub.illegal = { built: 87, size: 99 };
    expect(await fetchDeckProfile(DECK)).toEqual({ ok: false, reason: "illegal", built: 87, size: 99 });
    expect(stub.revalidated).toEqual([]);
  });

  // THE FLAG GATES THE LOADER, NOT ONLY THE TAB. A hidden tab whose payload still loads is the
  // worst of both — so the assertion is that NO read happened, which is the only way to tell a
  // gated loader from a gated render.
  it("answers disabled after the session, before reading anything else", async () => {
    stub.enabled = false;
    expect(await fetchDeckProfile(DECK)).toEqual({ ok: false, reason: "disabled" });
    // The session alone: the reader's switches resolve from it, so it is read before the gate.
    expect(stub.reads).toEqual(["auth"]);
  });

  // `disabled` is not a failure and must never be reported as one: nothing is wrong with the
  // deck, and a surface drawing "we could not read this" over a flag that is simply off would
  // be telling the reader something untrue.
  it("keeps disabled distinct from not-found", async () => {
    stub.enabled = false;
    const off = await fetchDeckProfile(DECK);
    stub.enabled = true;
    stub.profile = null;
    const missing = await fetchDeckProfile(DECK);
    expect(off).not.toEqual(missing);
    expect(off).toEqual({ ok: false, reason: "disabled" });
    expect(missing).toEqual({ ok: false, reason: "not-found" });
  });

  it.each(["not-a-uuid", "", "deck-1", "1"])(
    "refuses %p before any read, rather than letting Postgres answer",
    async (bad) => {
      expect(await fetchDeckProfile(bad)).toEqual({ ok: false, reason: "not-found" });
      // The session alone: the reader's switches resolve from it, so it is read before the gate.
      expect(stub.reads).toEqual(["auth"]);
    },
  );

  // A deck the reader does not own is ABSENT rather than forbidden — the profile read is scoped
  // by `user_id`, so this action never sees another player's deck to refuse.
  it("reports a deck it cannot read as not-found", async () => {
    stub.profile = null;
    expect(await fetchDeckProfile(DECK)).toEqual({ ok: false, reason: "not-found" });
    expect(stub.reads).toEqual(["auth", "profile"]);
  });
});

describe("fetchDeckProfile — the deck list", () => {
  // The tile's chip reads the row a press stores, so the press retires the `/decks` list the
  // router may hold — through `after`, never during the action, or the reply carries the page.
  // Home's resume row draws the same chip (Home bracket-chip addendum, F5), so it goes too, in
  // the same deferred call.
  it("retires /decks and Home after a press, deferred", async () => {
    await fetchDeckProfile(DECK);
    expect(stub.revalidated).toEqual(["/decks", "/"]);
    expect(stub.deferred).toBe(1);
  });

  it("retires nothing when nothing was computed", async () => {
    stub.profile = null;
    await fetchDeckProfile(DECK);
    expect(stub.revalidated).toEqual([]);
  });
});

describe("fetchStoredDeckProfile", () => {
  // TAB OPEN NEVER COMPUTES. Ruling 7 forbids an auto-run on tab open, so a miss answers `none`
  // and the only read is the stored lookup — asserted as the read list, because a lookup that
  // fell through to a build on a miss would return the same `ok` on a hit and look identical.
  it("answers none on a miss without computing anything", async () => {
    expect(await fetchStoredDeckProfile(DECK)).toEqual({ ok: false, reason: "none" });
    expect(stub.reads).toEqual(["auth", "stored"]);
  });

  it("returns a stored profile when one matches", async () => {
    stub.stored = { brackets: { 3: {} } };
    // A stored reading is dated when it was stored, never when it was read back.
    expect(await fetchStoredDeckProfile(DECK)).toEqual({
      ok: true,
      profile: { brackets: { 3: {} } },
      analyzedAt: STORED_AT.toISOString(),
      fresh: true,
      versionNumber: null,
      benchmarks: null,
    });
    expect(stub.reads).toEqual(["auth", "stored", "benchmarks"]);
  });

  // A STALE reading is answered AS stale (2i): the tab holds it under the banner rather than
  // withdrawing it, and names the version a pinned reading belongs to.
  it("answers a stale reading as stale, with its version", async () => {
    stub.stored = { brackets: { 3: {} } };
    stub.storedFresh = false;
    stub.versionNumber = 3;
    expect(await fetchStoredDeckProfile(DECK)).toEqual({
      ok: true, profile: { brackets: { 3: {} } }, analyzedAt: STORED_AT.toISOString(), fresh: false, versionNumber: 3, benchmarks: null,
    });
  });

  it("answers disabled after the session, before reading anything else", async () => {
    stub.enabled = false;
    expect(await fetchStoredDeckProfile(DECK)).toEqual({ ok: false, reason: "disabled" });
    // The session alone: the reader's switches resolve from it, so it is read before the gate.
    expect(stub.reads).toEqual(["auth"]);
  });

  it("refuses a malformed id after the session, before any deck read", async () => {
    expect(await fetchStoredDeckProfile("deck-1")).toEqual({ ok: false, reason: "not-found" });
    // The session alone: the reader's switches resolve from it, so it is read before the gate.
    expect(stub.reads).toEqual(["auth"]);
  });
});

describe("the reading's benchmarks", () => {
  it("sends a reading's benchmarks beside it, from a press and from the store", async () => {
    stub.benchmarks = { velocity: { step: 3 } };
    expect(await fetchDeckProfile(DECK)).toMatchObject({ ok: true, benchmarks: { velocity: { step: 3 } } });
    stub.stored = { brackets: {} };
    expect(await fetchStoredDeckProfile(DECK)).toMatchObject({ ok: true, benchmarks: { velocity: { step: 3 } } });
  });

  it("grades by the reader's resolved DECK_BENCHMARKS_ENABLED, from a press and from the store", async () => {
    // `readingBenchmarks` defaults its switch to the environment's, so a dropped argument still
    // compiles; the environment has it off here and the reader's override turns it on.
    vi.stubEnv("DECK_BENCHMARKS_ENABLED", "false");
    const resolved = { ...process.env, DECK_BENCHMARKS_ENABLED: "true" };
    vi.mocked(requestSwitchEnv).mockResolvedValueOnce(resolved).mockResolvedValueOnce(resolved);
    try {
      await fetchDeckProfile(DECK);
      stub.stored = { brackets: {} };
      await fetchStoredDeckProfile(DECK);
      expect(stub.benchmarksEnabled).toEqual([true, true]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  // Admin adoption 6c: the profile is built and keyed under the reader's resolved switches. A sentinel env,
  // compared by identity, so a failing diff prints nothing real.
  it("reads the profile under the env it resolved for the reader, from a press and from the store", async () => {
    const SENTINEL = { SENTINEL: "resolved" } as unknown as NodeJS.ProcessEnv;
    vi.mocked(requestSwitchEnv).mockResolvedValueOnce(SENTINEL).mockResolvedValueOnce(SENTINEL);
    await fetchDeckProfile(DECK);
    await fetchStoredDeckProfile(DECK);
    expect(stub.profileEnvs).toHaveLength(2);
    for (const env of stub.profileEnvs) expect(env).toBe(SENTINEL);
  });

  it("reads none when there is no reading to grade", async () => {
    stub.stored = null;
    await fetchStoredDeckProfile(DECK);
    expect(stub.reads).not.toContain("benchmarks");
  });
});
