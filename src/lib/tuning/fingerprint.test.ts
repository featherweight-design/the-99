import { describe, expect, it, vi } from "vitest";

import { tuningFingerprint, type FingerprintInput } from "./fingerprint";

const base: FingerprintInput = {
  list: "l1",
  games: [{ id: "g1", result: "loss", podSize: 4, worked: [], hurt: ["mana"], note: null }],
  intent: null,
  collection: null,
  limits: { capCents: null, sets: [], ownedOnly: false },
};

describe("tuningFingerprint", () => {
  // Locked, D6. The hash of a deck with no locks must not move, or every tuning gate in production
  // (where the switch is off) would reopen at once. Pinned to the literal hash, not only to itself.
  it("hashes a deck with no locks exactly as before locks existed", () => {
    // Re-pinned for H35 PR 2: `limits` joined the hash unconditionally (every deck gets the
    // field the day it ships), so this literal moved once, deliberately.
    const before = "264c02c0c5c18ad7c94f453c32a38c78953e6ed335b2012a27726b9a59cde1eb";
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

  // An owned-only answer depends on which cards the player owns, so ANY collection write reopens it
  // (an add or an edit moves `collection_history.seq` and leaves an upload's `confirmed_at` alone).
  // A deck without the limit ignores it: its answer does not read the collection.
  it("moves with the collection history for an owned-only deck and for no other", () => {
    const owned = { ...base, limits: { ...base.limits, ownedOnly: true } };
    expect(tuningFingerprint({ ...owned, collectionSeq: 41 })).toBe("758c6535732e3fbdfed52387688d53d4e33f0cdbcc8fcf9a66b128e75760109e");
    expect(tuningFingerprint({ ...owned, collectionSeq: 42 })).not.toBe(tuningFingerprint({ ...owned, collectionSeq: 41 }));
    expect(tuningFingerprint({ ...base, collectionSeq: 42 })).toBe(tuningFingerprint(base));
  });

  it("changes with the cap, the set of sets and owned-only, but not the sets' order", () => {
    const at = tuningFingerprint(base);
    expect(tuningFingerprint({ ...base, limits: { ...base.limits, capCents: 500 } })).not.toBe(at);
    expect(tuningFingerprint({ ...base, limits: { ...base.limits, sets: ["mh3"] } })).not.toBe(at);
    expect(tuningFingerprint({ ...base, limits: { ...base.limits, ownedOnly: true } })).not.toBe(at);
    // Only an owned-only deck's hash carries the shortlist marker, so no other deck's gate reopens.
    const ownedOnly = tuningFingerprint({ ...base, limits: { ...base.limits, ownedOnly: true } });
    expect(ownedOnly).not.toBe(tuningFingerprint({ ...base, limits: { ...base.limits, ownedOnly: false } }));
    // Pinned to the literal: `ownedOnly` itself is in the hash, so a comparison alone stays green with
    // the marker removed. This moves once, deliberately, for owned-only decks.
    expect(ownedOnly).toBe("432f85c49dc72b5b76c8a6daa9f2cbb7b134e7e5bcd82c5a872a060c1f023721");
    const ordered = tuningFingerprint({ ...base, limits: { ...base.limits, sets: ["mh3", "lci"] } });
    expect(tuningFingerprint({ ...base, limits: { ...base.limits, sets: ["lci", "mh3"] } })).toBe(ordered);
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
