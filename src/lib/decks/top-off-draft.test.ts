import { describe, expect, it } from "vitest";
import { encodeTopOffDraft, readTopOffDraft, topOffDraftKey } from "./top-off-draft";

describe("topOffDraftKey", () => {
  it("keys on the deck id", () => {
    expect(topOffDraftKey("a0000000-0000-4000-8000-000000000001")).toBe(
      "the99:top-off-draft:a0000000-0000-4000-8000-000000000001",
    );
  });

  // Same reasoning as arrivalDismissKey: two decks holding the same cards are
  // still two selections, so nothing about the contents reaches the key.
  it("gives two decks two keys", () => {
    expect(topOffDraftKey("deck-one")).not.toBe(topOffDraftKey("deck-two"));
  });
});

describe("encodeTopOffDraft", () => {
  it("round-trips a selection", () => {
    const draft = { ticked: new Set(["sol-ring"]), declined: new Set(["mana-crypt"]) };
    expect(readTopOffDraft(encodeTopOffDraft(draft))).toEqual(draft);
  });

  it("round-trips an empty selection", () => {
    const draft = { ticked: new Set<string>(), declined: new Set<string>() };
    expect(readTopOffDraft(encodeTopOffDraft(draft))).toEqual(draft);
  });
});

describe("readTopOffDraft", () => {
  it("is null when nothing has been stored", () => {
    expect(readTopOffDraft(null)).toBeNull();
  });

  // The whole value is rejected rather than half-read. A draft that restored
  // its ticks and silently dropped its declines would re-offer candidates the
  // player already passed on, which is the loss this module exists to prevent
  // wearing a different face.
  it("is null for a value this app did not write", () => {
    expect(readTopOffDraft("")).toBeNull();
    expect(readTopOffDraft("not json")).toBeNull();
    expect(readTopOffDraft('{"t":["sol-ring"]')).toBeNull();
    expect(readTopOffDraft("null")).toBeNull();
    expect(readTopOffDraft('["sol-ring"]')).toBeNull();
    expect(readTopOffDraft('{"v":2,"t":["sol-ring"]}')).toBeNull();
    expect(readTopOffDraft('{"v":2,"t":"sol-ring","d":[]}')).toBeNull();
    expect(readTopOffDraft('{"v":2,"t":[],"d":null}')).toBeNull();
  });

  // An id is an oracle id and nothing else. A number or a nested object
  // reaching the ticked set would be compared against candidate ids that are
  // strings, so it could never match — it would sit in the set forever,
  // counted by the commit bar and dropped by the commit itself.
  it("is null when an entry is not a string", () => {
    expect(readTopOffDraft('{"v":2,"t":[1],"d":[]}')).toBeNull();
    expect(readTopOffDraft('{"v":2,"t":[],"d":[{"oracleId":"sol-ring"}]}')).toBeNull();
  });

  it("reads a selection written by another tab on this rule", () => {
    expect(readTopOffDraft('{"v":2,"t":["sol-ring","mana-crypt"],"d":["chrome-mox"]}')).toEqual({
      ticked: new Set(["sol-ring", "mana-crypt"]),
      declined: new Set(["chrome-mox"]),
    });
  });

  it("refuses a draft chosen under an older seeding rule", () => {
    // The strip RESTORES a draft instead of re-seeding it, which rests on the
    // ticks having been the player's own. v1 auto-ticked every owned candidate,
    // claimed copies included, so a draft written then can hold ticks nobody
    // made for cards the current rule deliberately leaves alone — and restoring
    // those would buy cards on a default this app has withdrawn.
    expect(readTopOffDraft('{"t":["sol-ring"],"d":[]}')).toBeNull();
    expect(readTopOffDraft('{"v":1,"t":["sol-ring"],"d":[]}')).toBeNull();
    // Rejected WHOLE, as a half-parsed draft is: there is no way to tell which
    // of its ticks were the player's and which were the withdrawn default.
    expect(readTopOffDraft('{"v":1,"t":[],"d":["chrome-mox"]}')).toBeNull();
  });
});
