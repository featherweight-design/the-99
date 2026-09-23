// The on-demand profile fetch's wire contract.
//
// What this layer owns: that the flag is answered BEFORE any read, that a malformed id never
// reaches a `uuid` column, that the three outcomes stay distinct, and that `disabled` is not
// reported as a failure. `probe:bracket` proves the profile the loader builds; nothing there
// calls this export, because a server action needs a request and a signed-in reader.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  enabled: true,
  profile: null as unknown,
  /** When set, the press is refused as an illegal deck with these counts. */
  illegal: null as null | { built: number; size: number },
  /** The press's `analyzedAt`: a fresh compute stamps now, a store answer its own row's time. */
  pressedAt: new Date(),
  storedFresh: true,
  /** Every read this action performed, in order. The flag check is only meaningful if the
   *  reads it precedes can be observed NOT to have happened. */
  reads: [] as string[],
  /** What a stored lookup finds. */
  stored: null as unknown,
  revalidated: [] as string[],
  deferred: 0,
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

vi.mock("../../lib/auth", () => ({
  requireUserId: async () => {
    stub.reads.push("auth");
    return "user-1";
  },
}));

const STORED_AT = new Date("2026-09-18T12:00:00Z");

vi.mock("../../lib/profile/stored", () => ({
  computeAndStoreProfile: async () => {
    stub.reads.push("profile");
    if (stub.illegal) return { kind: "illegal", ...stub.illegal };
    return stub.profile
      ? { kind: "ok", reading: { profile: stub.profile, analyzedAt: stub.pressedAt, fresh: true, versionId: null } }
      : null;
  },
  readStoredReading: async () => {
    stub.reads.push("stored");
    return stub.stored
      ? { profile: stub.stored, analyzedAt: STORED_AT, fresh: stub.storedFresh, versionId: null }
      : null;
  },
}));

const { fetchDeckProfile, fetchStoredDeckProfile } = await import("./profile-actions");

const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  stub.enabled = true;
  stub.profile = { brackets: {} };
  stub.illegal = null;
  stub.pressedAt = new Date();
  stub.storedFresh = true;
  stub.reads = [];
  stub.stored = null;
  stub.revalidated = [];
  stub.deferred = 0;
});

describe("fetchDeckProfile", () => {
  it("returns the profile when the flag is on and the deck is the reader's", async () => {
    const result = await fetchDeckProfile(DECK);
    // A press is dated when it ran: the bracket box prints `analyzed a moment ago`.
    expect(result).toEqual({ ok: true, profile: { brackets: {} }, analyzedAt: expect.any(String) });
    expect(Date.now() - Date.parse((result as { analyzedAt: string }).analyzedAt)).toBeLessThan(5_000);
    expect(stub.reads).toEqual(["auth", "profile"]);
  });

  // RULING 5: a press on an unchanged list answers from the store, and the reading keeps the
  // moment it was computed rather than being re-dated by the press that returned it.
  it("dates an answer from the store by its own row, not by the press", async () => {
    stub.pressedAt = STORED_AT;
    expect(await fetchDeckProfile(DECK)).toEqual({
      ok: true, profile: { brackets: {} }, analyzedAt: STORED_AT.toISOString(),
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
  it("answers disabled before reading anything at all", async () => {
    stub.enabled = false;
    expect(await fetchDeckProfile(DECK)).toEqual({ ok: false, reason: "disabled" });
    expect(stub.reads).toEqual([]);
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
      expect(stub.reads).toEqual([]);
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
  it("retires /decks after a press, deferred", async () => {
    await fetchDeckProfile(DECK);
    expect(stub.revalidated).toEqual(["/decks"]);
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
    });
    expect(stub.reads).toEqual(["auth", "stored"]);
  });

  // A STALE reading still answers `none` until C2 draws the held states: the surface today is
  // the press, and a stale reading shown as if current would be the lie C2 exists to avoid.
  it("answers none for a stale reading", async () => {
    stub.stored = { brackets: { 3: {} } };
    stub.storedFresh = false;
    expect(await fetchStoredDeckProfile(DECK)).toEqual({ ok: false, reason: "none" });
  });

  it("answers disabled before reading anything at all", async () => {
    stub.enabled = false;
    expect(await fetchStoredDeckProfile(DECK)).toEqual({ ok: false, reason: "disabled" });
    expect(stub.reads).toEqual([]);
  });

  it("refuses a malformed id before any read", async () => {
    expect(await fetchStoredDeckProfile("deck-1")).toEqual({ ok: false, reason: "not-found" });
    expect(stub.reads).toEqual([]);
  });
});
