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
  /** Every read this action performed, in order. The flag check is only meaningful if the
   *  reads it precedes can be observed NOT to have happened. */
  reads: [] as string[],
  /** What a stored lookup finds. */
  stored: null as unknown,
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

vi.mock("../../lib/profile/stored", () => ({
  computeAndStoreProfile: async () => {
    stub.reads.push("profile");
    return stub.profile;
  },
  readStoredProfile: async () => {
    stub.reads.push("stored");
    return stub.stored;
  },
}));

const { fetchDeckProfile, fetchStoredDeckProfile } = await import("./profile-actions");

const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  stub.enabled = true;
  stub.profile = { brackets: {} };
  stub.reads = [];
  stub.stored = null;
});

describe("fetchDeckProfile", () => {
  it("returns the profile when the flag is on and the deck is the reader's", async () => {
    const result = await fetchDeckProfile(DECK);
    expect(result).toEqual({ ok: true, profile: { brackets: {} } });
    expect(stub.reads).toEqual(["auth", "profile"]);
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
    expect(await fetchStoredDeckProfile(DECK)).toEqual({ ok: true, profile: { brackets: { 3: {} } } });
    expect(stub.reads).toEqual(["auth", "stored"]);
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
