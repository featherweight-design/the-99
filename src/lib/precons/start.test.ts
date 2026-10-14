import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ makes: new Set<string>(), writes: [] as unknown[], refuse: false }));
vi.mock("../tokens/deck-printings", () => ({
  deckMakesTokenIn: async (_tx: unknown, _deck: string, _user: string, token: string) => calls.makes.has(token),
  writeDeckTokenPrintingIn: async (_tx: unknown, w: unknown) => { calls.writes.push(w); return calls.refuse ? "notHeld" : "ok"; },
}));
vi.mock("../decks/write-imported-deck", () => ({ writeImportedDeck: async () => "deck-1" }));
vi.mock("../decks/versions", () => ({ commitVersion: async () => ({ version: {}, cardCount: 0 }) }));
import { preconPins, preconTokenPins, preparePreconDeckIn, writePreconDeckIn, type PreparedPreconDeck } from "./start";

const deck: PreparedPreconDeck = {
  commanderOracleId: "c", partnerOracleId: null, cards: [], printings: [], builtFromPrecon: "P",
  tokens: [{ tokenOracleId: "t1", tokenPrintingId: "p1" }, { tokenOracleId: "t2", tokenPrintingId: "p2" }],
};
const tx = {} as Parameters<typeof writePreconDeckIn>[0];

describe("writePreconDeckIn's token pins", () => {
  beforeEach(() => { calls.makes = new Set(); calls.writes = []; calls.refuse = false; });

  it("sends each token the deck makes to the one writer, at the box's printing, and no other", async () => {
    calls.makes = new Set(["t2"]);
    expect(await writePreconDeckIn(tx, "user_1", "Deck", deck, process.env)).toBe("deck-1");
    expect(calls.writes).toEqual([{ deckId: "deck-1", userId: "user_1", tokenOracleId: "t2", tokenPrintingId: "p2" }]);
  });

  it("starts the deck all the same when the writer refuses a printing the player does not hold", async () => {
    calls.makes = new Set(["t1", "t2"]);
    calls.refuse = true;
    expect(await writePreconDeckIn(tx, "user_1", "Deck", deck, process.env)).toBe("deck-1");
    expect(calls.writes).toHaveLength(2);
  });
});

describe("preconTokenPins", () => {
  it("keeps one printing per token, the first by id, whatever order the rows arrive in", () => {
    const rows = [
      { tokenOracleId: "t2", tokenPrintingId: "p9" },
      { tokenOracleId: "t1", tokenPrintingId: "p5" },
      { tokenOracleId: "t2", tokenPrintingId: "p3" },
      { tokenOracleId: "t1", tokenPrintingId: "p7" },
    ];
    const want = [{ tokenOracleId: "t1", tokenPrintingId: "p5" }, { tokenOracleId: "t2", tokenPrintingId: "p3" }];
    expect(preconTokenPins(rows)).toEqual(want);
    expect(preconTokenPins([...rows].reverse())).toEqual(want);
  });

  it("pins nothing for a box with no tokens", () => {
    expect(preconTokenPins([])).toEqual([]);
  });
});

describe("preconPins", () => {
  it("pins each card at its first printing in the feed's order, lowercasing the set", () => {
    expect(preconPins([
      { oracleId: "a", quantity: 1, isCommander: true, setCode: "FRC", collectorNumber: "1" },
      { oracleId: "b", quantity: 2, isCommander: false, setCode: "FRC", collectorNumber: "300" },
      { oracleId: "b", quantity: 2, isCommander: false, setCode: "FRC", collectorNumber: "301" },
      { oracleId: "c", quantity: 1, isCommander: false, setCode: null, collectorNumber: null },
    ])).toEqual([
      { oracleId: "a", setCode: "frc", collectorNumber: "1" },
      { oracleId: "b", setCode: "frc", collectorNumber: "300" },
    ]);
  });
});

/** A transaction whose selects answer `answers` in order: the head, the list, the leads, then the box's tokens. */
function reads(answers: unknown[][]) {
  const chain = () => {
    const rows = answers.shift() ?? [];
    const q: Record<string, unknown> = {};
    for (const k of ["from", "innerJoin", "leftJoin", "where", "orderBy"]) q[k] = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(rows).then(res);
    return q;
  };
  return { select: () => chain() } as unknown as Parameters<typeof preparePreconDeckIn>[0];
}

describe("preparePreconDeckIn's tokens", () => {
  it("reads the box's token rows into the deck, one printing per token, which the start then pins", async () => {
    const lead = { oracleId: "c", name: "Lead", typeLine: "Legendary Creature — Human", oracleText: "", manaCost: "{1}", layout: "normal", commanderLegal: true };
    const prepared = await preparePreconDeckIn(reads([
      [{ fileName: "P", twinOf: null }],
      [{ oracleId: "c", quantity: 1, isCommander: true, setCode: "p", collectorNumber: "1" }],
      [lead],
      [{ tokenOracleId: "t1", tokenPrintingId: "p9" }, { tokenOracleId: "t1", tokenPrintingId: "p2" }, { tokenOracleId: "t2", tokenPrintingId: "p5" }],
    ]), "P");
    expect(prepared.tokens).toEqual([{ tokenOracleId: "t1", tokenPrintingId: "p2" }, { tokenOracleId: "t2", tokenPrintingId: "p5" }]);
    calls.makes = new Set(["t1", "t2"]);
    calls.writes = [];
    await writePreconDeckIn(tx, "user_1", "Deck", prepared, process.env);
    expect(calls.writes).toEqual([
      { deckId: "deck-1", userId: "user_1", tokenOracleId: "t1", tokenPrintingId: "p2" },
      { deckId: "deck-1", userId: "user_1", tokenOracleId: "t2", tokenPrintingId: "p5" },
    ]);
  });
});
