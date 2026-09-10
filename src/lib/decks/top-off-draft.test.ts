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
    expect(readTopOffDraft('{"t":["sol-ring"]}')).toBeNull();
    expect(readTopOffDraft('{"t":"sol-ring","d":[]}')).toBeNull();
    expect(readTopOffDraft('{"t":[],"d":null}')).toBeNull();
  });

  // An id is an oracle id and nothing else. A number or a nested object
  // reaching the ticked set would be compared against candidate ids that are
  // strings, so it could never match — it would sit in the set forever,
  // counted by the commit bar and dropped by the commit itself.
  it("is null when an entry is not a string", () => {
    expect(readTopOffDraft('{"t":[1],"d":[]}')).toBeNull();
    expect(readTopOffDraft('{"t":[],"d":[{"oracleId":"sol-ring"}]}')).toBeNull();
  });

  it("reads a selection written by an older tab of this app", () => {
    expect(readTopOffDraft('{"t":["sol-ring","mana-crypt"],"d":["chrome-mox"]}')).toEqual({
      ticked: new Set(["sol-ring", "mana-crypt"]),
      declined: new Set(["chrome-mox"]),
    });
  });
});
