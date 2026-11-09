import { describe, expect, it } from "vitest";

import { scanNames, type ScanRules } from "./name-scan";

const rules: ScanRules = {
  personKeys: ["player", "friends", "opponent"],
  people: ["Wren Calloway", "Alex", "Torin", "Riley"],
  freeText: { deckName: ["Ashen Banner Parade"], notes: ["Sleeved for game night"] },
};

const clean = {
  player: "Wren Calloway",
  friends: ["Alex", "Torin"],
  decks: [{ deckName: "Ashen Banner Parade", notes: ["Sleeved for game night"], cards: [{ name: "Sol Ring" }, { name: "Jace, Multiverse Architect" }] }],
  games: [{ opponent: "Riley" }],
};

describe("scanNames", () => {
  it("passes data that names only the fixture's invented people and text, and any catalog card name", () => {
    expect(scanNames(clean, rules)).toEqual([]);
  });

  it("fails a person field holding a name outside the fixture's list, wherever it sits", () => {
    expect(scanNames({ ...clean, friends: ["Alex", "Jordan"] }, rules).map((f) => [f.path, f.value])).toEqual([["friends", "Jordan"]]);
    expect(scanNames({ ...clean, games: [{ opponent: "Jordan" }] }, rules).map((f) => f.path)).toEqual(["games[0].opponent"]);
    expect(scanNames({ ...clean, player: "Hugh" }, rules).map((f) => f.path)).toEqual(["player"]);
  });

  it("fails free text that is not the fixture's own", () => {
    expect(scanNames({ decks: [{ deckName: "Hugh's brew" }] }, rules).map((f) => f.path)).toEqual(["decks[0].deckName"]);
    expect(scanNames({ decks: [{ notes: ["Sleeved for game night", "Ask Sam about this"] }] }, rules).map((f) => f.value)).toEqual(["Ask Sam about this"]);
  });

  it("fails an email, an @handle, an account id and a profile URL in any string", () => {
    const why = (s: string) => scanNames({ blurb: s }, rules).map((f) => f.why);
    expect(why("write to someone@example.com")).toEqual(["an email address"]);
    expect(why("ping @someone about it")).toEqual(["an @handle"]);
    expect(why("owner user_2abcDEF123456")).toEqual(["an account id"]);
    expect(why("see https://www.reddit.com/u/someone")).toEqual(["a profile or social URL"]);
    expect(why("see https://moxfield.com/users/someone")).toEqual(["a profile or social URL"]);
    expect(why("a deck at https://edhrec.com/commanders/sol-ring-fan or https://moxfield.com/decks/abc123")).toEqual([]);
  });

  it("does not take a card name or a card's mana text for an address", () => {
    expect(scanNames({ name: "Sol Ring", text: "{T}: Add {C}{C}." }, rules)).toEqual([]);
  });
});
