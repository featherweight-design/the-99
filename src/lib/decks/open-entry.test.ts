import { describe, expect, it } from "vitest";
import type { DeckListItem } from "./read";
import { OPEN_TTL_MS, openFactsOf, parseOpenEntry, placeAfter, type OpenEntry, type OpenFacts } from "./open-entry";

const facts: OpenFacts = {
  id: "d1",
  name: "Scrappy Survivors",
  commander: "Dogmeat, Ever Loyal",
  identity: ["W", "R", "G"],
  artCropUri: null,
  status: "Complete",
  built: 99,
  partner: false,
};
const entry = (over: Partial<OpenEntry> = {}): string => JSON.stringify({ to: "d1", facts, place: { k: 1, n: 20, caption: null }, at: 1000, ...over });

describe("parseOpenEntry", () => {
  it("reads a fresh entry for its deck", () => {
    expect(parseOpenEntry(entry(), 1000 + 5)?.facts.name).toBe("Scrappy Survivors");
  });

  it("drops an entry older than the TTL", () => {
    expect(parseOpenEntry(entry(), 1000 + OPEN_TTL_MS + 1)).toBeNull();
  });

  it("drops an entry whose facts name another deck than `to`", () => {
    expect(parseOpenEntry(entry({ to: "d2" }), 1001)).toBeNull();
  });

  it("drops absent, malformed and shapeless entries", () => {
    expect(parseOpenEntry(null, 0)).toBeNull();
    expect(parseOpenEntry("{nope", 0)).toBeNull();
    expect(parseOpenEntry(JSON.stringify({ to: "d1", at: 1 }), 2)).toBeNull();
  });

  it("drops an entry whose facts lack a field the skeleton draws", () => {
    expect(parseOpenEntry(entry({ facts: { ...facts, identity: undefined } as unknown as OpenFacts }), 1001)).toBeNull();
    expect(parseOpenEntry(entry({ facts: { ...facts, name: undefined } as unknown as OpenFacts }), 1001)).toBeNull();
  });

  it("keeps an entry from an older build and drops a malformed artIdentity", () => {
    expect(parseOpenEntry(entry({ facts }), 1001)?.facts.artIdentity).toBeUndefined();
    const bad = parseOpenEntry(entry({ facts: { ...facts, artIdentity: "W" } as unknown as OpenFacts }), 1001);
    expect(bad).not.toBeNull();
    expect(bad?.facts.artIdentity).toBeUndefined();
  });
});

describe("openFactsOf", () => {
  const row = (over: Partial<DeckListItem>) =>
    ({
      id: "d1",
      name: "Pair",
      commanderName: "Tymna the Weaver",
      commanderPrintedName: null,
      partnerName: null,
      commanderColorIdentity: ["W"],
      partnerColorIdentity: null,
      commanderArtCropUri: "u",
      statusPill: "Draft",
      built: 40,
      ...over,
    }) as unknown as DeckListItem;

  it("names both commanders, merges identity and flags the partner", () => {
    const f = openFactsOf(row({ partnerName: "Kraum, Ludevic's Opus", partnerColorIdentity: ["U", "B"] }));
    expect(f.commander).toBe("Tymna the Weaver + Kraum, Ludevic's Opus");
    expect(f.identity).toEqual(["W", "U", "B"]);
    expect(f.artIdentity).toEqual(["W"]);
    expect(f.partner).toBe(true);
  });

  it("a solo commander is not a partner deck", () => {
    const f = openFactsOf(row({}));
    expect(f.partner).toBe(false);
    expect(f.commander).toBe("Tymna the Weaver");
  });
});

describe("placeAfter", () => {
  it("steps and wraps at both ends", () => {
    expect(placeAfter(1, 5, -1)).toBe(5);
    expect(placeAfter(5, 5, 1)).toBe(1);
    expect(placeAfter(2, 5, 1)).toBe(3);
    expect(placeAfter(3, 5, -1)).toBe(2);
  });
});
