import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

const calls = vi.hoisted(() => ({
  owned: new Map<string, { imageUri: string | null }>(),
  deck: new Map<string, { imageUri: string | null }>(),
  opening: new Map<string, string>(),
  ownedArgs: undefined as unknown,
  deckArgs: undefined as unknown,
  openingArgs: undefined as unknown,
  fail: false,
}));

vi.mock("../collection/owned-printings", () => ({
  readOwnedPrintings: async (...args: unknown[]) => { calls.ownedArgs = args; if (calls.fail) throw new Error("ownership read failed"); return calls.owned; },
}));
vi.mock("./opening-printing", () => ({
  loadOpeningArt: async (ids: string[]) => { calls.openingArgs = ids; return new Map([...calls.opening].filter(([id]) => ids.includes(id))); },
}));
vi.mock("../decks/printings", () => ({
  readDeckOwnedPrintings: async (...args: unknown[]) => { calls.deckArgs = args; if (calls.fail) throw new Error("ownership read failed"); return calls.deck; },
}));

import { chainArt, withChainArt } from "./chain-art";

// The reader's resolved switches, a SENTINEL: an assertion on it never prints the process environment.
const ENV = { DECK_PRINTINGS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

beforeEach(() => {
  calls.owned = new Map();
  calls.deck = new Map();
  calls.opening = new Map();
  calls.ownedArgs = undefined;
  calls.deckArgs = undefined;
  calls.openingArgs = undefined;
  calls.fail = false;
});

// The chain card details uses: the deck's pick, then the owned printing; a card the player does not
// own is absent, so a caller keeps the catalog art it holds. One rule for every hover preview.
describe("chainArt", () => {
  it("asks the deck's chain when a deck is in context, and the player's owned printing when none is", async () => {
    calls.deck = new Map([["a", { imageUri: "deck-pick.jpg" }]]);
    calls.owned = new Map([["a", { imageUri: "owned.jpg" }]]);
    expect(await chainArt("u", "d", ["a"], ENV)).toEqual(new Map([["a", "deck-pick.jpg"]]));
    expect((calls.deckArgs as unknown[]).slice(0, 3)).toEqual(["u", "d", ["a"]]);
    // By identity, as a boolean: a chain that fell back to the environment must not print it on failure.
    expect((calls.deckArgs as unknown[])[3] === ENV).toBe(true);
    expect(calls.ownedArgs).toBeUndefined();
    expect(await chainArt("u", null, ["a"], ENV_VIEW)).toEqual(new Map([["a", "owned.jpg"]]));
    expect(calls.ownedArgs).toEqual(["u", ["a"]]);
  });

  it("leaves out a card with no owned art, a null id and a printing with no image", async () => {
    calls.deck = new Map([["a", { imageUri: "a.jpg" }], ["b", { imageUri: null }]]);
    const got = await chainArt("u", "d", ["a", "b", "c", null, undefined, "a"], ENV_VIEW);
    expect([...got]).toEqual([["a", "a.jpg"]]);
    expect((calls.deckArgs as unknown[]).slice(0, 3)).toEqual(["u", "d", ["a", "b", "c"]]);
    // The env handed in is the one handed on; compared by identity so a failure never prints it.
    expect((calls.deckArgs as unknown[])[3] === ENV_VIEW).toBe(true);
  });

  // A card nothing above resolves is one the reader does not own: it opens on the printing card details open an
  // unowned card on, so a preview and a press show one picture. Only the unresolved ids are asked.
  it("falls back to the opening printing for a card no owned printing resolves, and asks only for those", async () => {
    calls.owned = new Map([["a", { imageUri: "owned-a.jpg" }]]);
    calls.opening = new Map([["b", "opening-b.jpg"]]);
    const got = await chainArt("u", null, ["a", "b", "c"], ENV_VIEW);
    expect([...got].sort()).toEqual([["a", "owned-a.jpg"], ["b", "opening-b.jpg"]]);
    expect(calls.openingArgs).toEqual(["b", "c"]);
  });

  // A failed ownership read says nothing about ownership: it must not send an owned card through the unowned rule
  // (the preview would show the shop's printing while card details opens the one the reader owns).
  it("answers nothing, and applies no opening printing, when the ownership read fails", async () => {
    calls.fail = true;
    calls.opening = new Map([["a", "opening-a.jpg"]]);
    expect(await chainArt("u", null, ["a"], ENV_VIEW)).toEqual(new Map());
    expect(await chainArt("u", "d", ["a"], ENV_VIEW)).toEqual(new Map());
    expect(calls.openingArgs).toBeUndefined();
  });

  it("does not send a card the reader owns, whose printing has no art, through the unowned rule", async () => {
    calls.owned = new Map([["a", { imageUri: null }]]);
    calls.opening = new Map([["a", "opening-a.jpg"], ["b", "opening-b.jpg"]]);
    expect([...(await chainArt("u", null, ["a", "b"], ENV_VIEW))]).toEqual([["b", "opening-b.jpg"]]);
    expect(calls.openingArgs).toEqual(["b"]);
  });

  it("reads nothing for no ids", async () => {
    expect(await chainArt("u", "d", [null], ENV_VIEW)).toEqual(new Map());
    expect(calls.deckArgs).toBeUndefined();
  });
});

describe("withChainArt", () => {
  it("replaces the art of a card the chain knows and keeps the catalog art of one it does not", () => {
    const rows = [
      { oracleId: "a", imageUri: "catalog-a.jpg" },
      { oracleId: "b", imageUri: "catalog-b.jpg" },
      { oracleId: "c", imageUri: null },
    ];
    expect(withChainArt(rows, new Map([["a", "owned-a.jpg"], ["c", "owned-c.jpg"]])).map((r) => r.imageUri))
      .toEqual(["owned-a.jpg", "catalog-b.jpg", "owned-c.jpg"]);
  });
});
