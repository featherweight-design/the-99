import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  owned: new Map<string, { imageUri: string | null }>(),
  deck: new Map<string, { imageUri: string | null }>(),
  ownedArgs: undefined as unknown,
  deckArgs: undefined as unknown,
}));

vi.mock("../collection/owned-printings", () => ({
  resolveOwnedPrintings: async (...args: unknown[]) => { calls.ownedArgs = args; return calls.owned; },
}));
vi.mock("../decks/printings", () => ({
  resolveDeckOwnedPrintings: async (...args: unknown[]) => { calls.deckArgs = args; return calls.deck; },
}));

import { chainArt } from "./chain-art";

beforeEach(() => {
  calls.owned = new Map();
  calls.deck = new Map();
  calls.ownedArgs = undefined;
  calls.deckArgs = undefined;
});

// The chain card details uses: the deck's pick, then the owned printing; a card the player does not
// own is absent, so a caller keeps the catalog art it holds. One rule for every hover preview.
describe("chainArt", () => {
  it("asks the deck's chain when a deck is in context, and the player's owned printing when none is", async () => {
    calls.deck = new Map([["a", { imageUri: "deck-pick.jpg" }]]);
    calls.owned = new Map([["a", { imageUri: "owned.jpg" }]]);
    expect(await chainArt("u", "d", ["a"])).toEqual(new Map([["a", "deck-pick.jpg"]]));
    expect(calls.deckArgs).toEqual(["u", "d", ["a"]]);
    expect(calls.ownedArgs).toBeUndefined();
    expect(await chainArt("u", null, ["a"])).toEqual(new Map([["a", "owned.jpg"]]));
    expect(calls.ownedArgs).toEqual(["u", ["a"]]);
  });

  it("leaves out a card with no owned art, a null id and a printing with no image", async () => {
    calls.deck = new Map([["a", { imageUri: "a.jpg" }], ["b", { imageUri: null }]]);
    const got = await chainArt("u", "d", ["a", "b", "c", null, undefined, "a"]);
    expect([...got]).toEqual([["a", "a.jpg"]]);
    expect(calls.deckArgs).toEqual(["u", "d", ["a", "b", "c"]]);
  });

  it("reads nothing for no ids", async () => {
    expect(await chainArt("u", "d", [null])).toEqual(new Map());
    expect(calls.deckArgs).toBeUndefined();
  });
});
