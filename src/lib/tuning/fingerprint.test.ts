import { describe, expect, it, vi } from "vitest";

import { tuningFingerprint, type FingerprintInput } from "./fingerprint";

const base: FingerprintInput = {
  list: "l1",
  games: [{ id: "g1", result: "loss", podSize: 4, worked: [], hurt: ["mana"], note: null }],
  intent: null,
  collection: null,
};

describe("tuningFingerprint", () => {
  // Locked, D6. The hash of a deck with no locks must not move, or every tuning gate in production
  // (where the switch is off) would reopen at once. Pinned to the literal hash, not only to itself.
  it("hashes a deck with no locks exactly as before locks existed", () => {
    const before = "890518455c4146b0351e082f4cbac27fb2d65357bd493557c4aea280cf707c8f";
    expect(tuningFingerprint(base)).toBe(before);
    expect(tuningFingerprint({ ...base, locks: [] })).toBe(before);
  });

  it("changes when a card is locked, whatever order the locks arrive in", () => {
    const one = tuningFingerprint({ ...base, locks: ["a", "b"] });
    expect(one).not.toBe(tuningFingerprint(base));
    expect(tuningFingerprint({ ...base, locks: ["b", "a"] })).toBe(one);
    expect(tuningFingerprint({ ...base, locks: ["a"] })).not.toBe(one);
  });

  it("ignores the order games arrive in, and the order of their marks", () => {
    const two = { ...base, games: [...base.games, { ...base.games[0], id: "g2", hurt: ["speed", "mana"] }] };
    const shuffled = { ...two, games: [...two.games].reverse().map((g) => ({ ...g, hurt: [...g.hurt].reverse() })) };
    expect(tuningFingerprint(shuffled)).toBe(tuningFingerprint(two));
  });

  it("changes with the list, a game, a note, the intent and the collection", () => {
    const at = tuningFingerprint(base);
    expect(tuningFingerprint({ ...base, list: "l2" })).not.toBe(at);
    expect(tuningFingerprint({ ...base, games: [...base.games, { ...base.games[0], id: "g2" }] })).not.toBe(at);
    expect(tuningFingerprint({ ...base, games: [{ ...base.games[0], note: "flooded" }] })).not.toBe(at);
    expect(tuningFingerprint({ ...base, intent: "go wide" })).not.toBe(at);
    expect(tuningFingerprint({ ...base, collection: "2026-09-23T10:00:00.000Z" })).not.toBe(at);
  });

  it("tells a mark moving from worked to hurt apart from staying put", () => {
    const worked = { ...base, games: [{ ...base.games[0], worked: ["mana"], hurt: [] }] };
    expect(tuningFingerprint(worked)).not.toBe(tuningFingerprint(base));
  });

  it("fingerprints a deck with no games — nothing gates on a game count", () => {
    const none = { ...base, games: [] };
    expect(tuningFingerprint(none)).toBe(tuningFingerprint({ ...none }));
    expect(tuningFingerprint(none)).not.toBe(tuningFingerprint(base));
  });

  // A prompt change is stored as a column, never hashed: a bump must not read as the player
  // having changed their deck. Re-imported under a mocked version so a hash that read the
  // constant would move.
  it("does not move when PROMPT_VERSION does", async () => {
    vi.resetModules();
    vi.doMock("./prompt-version", () => ({ PROMPT_VERSION: 999 }));
    const bumped = await import("./fingerprint");
    vi.doUnmock("./prompt-version");
    vi.resetModules();
    expect(bumped.tuningFingerprint(base)).toBe(tuningFingerprint(base));
  });
});
