import { beforeEach, describe, expect, it, vi } from "vitest";

const ACTION = "44444444-4444-4444-4444-444444444444";
const ORACLE = "11111111-1111-1111-1111-111111111111";
const PRINTING = "22222222-2222-2222-2222-222222222222";
const FORGED = "99999999-9999-9999-9999-999999999999";
const line = { oracleId: ORACLE, setCode: "LEA", collectorNumber: "1", finish: "nonfoil", quantity: 2 };
const edited = { ...line, expected: 2 };
const deck = { deckId: "d", deckName: "Deck", oracleId: ORACLE, cardName: "Card", short: 1 };

const stub = vi.hoisted(() => ({
  ledger: true,
  apply: vi.fn(),
  resolve: vi.fn(),
  search: vi.fn(),
  choices: vi.fn(),
  invalidate: vi.fn(),
  warm: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/collection/edit-flag", () => ({ collectionEditEnabled: () => stub.ledger }));
vi.mock("../../lib/collection/write", async (actual) => ({
  ...(await actual<typeof import("../../lib/collection/write")>()),
  applyCollectionChange: stub.apply,
}));
vi.mock("../../lib/collection/catalog-read", async (actual) => ({
  ...(await actual<typeof import("../../lib/collection/catalog-read")>()),
  resolvePrintings: stub.resolve,
  searchCollectionCatalog: stub.search,
  loadPrintingChoices: stub.choices,
}));
vi.mock("../../lib/collection/invalidate", () => ({ invalidateCollectionReaders: stub.invalidate }));
// `after` runs its callback at once, so a test sees the warm the response would have scheduled.
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("../../lib/recs/warm", () => ({ warmCommanderScores: stub.warm }));

import { addToCollection, editCollection, loadPrintingChoices, searchCollectionCards } from "./edit-actions";

const catalogHolds = (finishes = ["nonfoil", "foil"]) =>
  stub.resolve.mockResolvedValue(new Map([[`${ORACLE}|lea|1`, { scryfallId: PRINTING, finishes }]]));

beforeEach(() => {
  stub.ledger = true;
  for (const f of [stub.apply, stub.resolve, stub.search, stub.choices, stub.invalidate, stub.warm]) f.mockReset();
  stub.resolve.mockResolvedValue(new Map());
});

describe("the edit actions", () => {
  it("are refused with the switch off, before reading anything", async () => {
    stub.ledger = false;
    await expect(addToCollection(ACTION, [line])).rejects.toThrow("collection editing is off");
    await expect(editCollection(ACTION, [line])).rejects.toThrow("collection editing is off");
    await expect(searchCollectionCards("sol")).rejects.toThrow("collection editing is off");
    await expect(loadPrintingChoices(ORACLE)).rejects.toThrow("collection editing is off");
    expect(stub.resolve).not.toHaveBeenCalled();
    expect(stub.search).not.toHaveBeenCalled();
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("refuse a malformed action id, an empty request and a malformed line before writing", async () => {
    await expect(addToCollection("nope", [line])).rejects.toThrow();
    await expect(addToCollection(ACTION, [])).rejects.toThrow();
    await expect(addToCollection(ACTION, [{ ...line, quantity: 0 }])).rejects.toThrow();
    await expect(addToCollection(ACTION, [{ ...line, finish: "shiny" }])).rejects.toThrow();
    await expect(editCollection(ACTION, [{ ...line, quantity: -1 }])).rejects.toThrow();
    await expect(editCollection(ACTION, [{ ...line, expected: 1.5 }])).rejects.toThrow();
    await expect(editCollection(ACTION, [{ ...edited, condition: "x".repeat(33) }])).rejects.toThrow();
    // No `expected` means no stale check: a sheet drawn before another tab's save would win.
    await expect(editCollection(ACTION, [line])).rejects.toThrow("bad collection row");
    expect(stub.apply).not.toHaveBeenCalled();
  });
});

describe("addToCollection", () => {
  it("adds under the client's id, taking the printing from the catalog and never from the client", async () => {
    catalogHolds();
    stub.apply.mockResolvedValue({ status: "applied", entry: { id: ACTION } });
    expect(await addToCollection(ACTION, [{ ...line, scryfallId: FORGED }])).toEqual({ applied: { id: ACTION } });
    expect(stub.apply.mock.calls[0][1]).toEqual({
      kind: "add",
      items: [{ oracleId: ORACLE, setCode: "lea", collectorNumber: "1", finish: "nonfoil", quantity: 2, scryfallId: PRINTING, condition: null }],
    });
    expect(stub.apply.mock.calls[0][2]).toEqual({ id: ACTION });
    expect(stub.invalidate).toHaveBeenCalledWith("user_1");
    expect(stub.warm).toHaveBeenCalledWith("user_1");
  });

  it("refuses a printing the catalog does not hold, or a finish it was never printed in", async () => {
    await expect(addToCollection(ACTION, [line])).rejects.toThrow("not a catalog printing");
    catalogHolds(["foil"]);
    await expect(addToCollection(ACTION, [line])).rejects.toThrow("not a catalog printing");
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("answers a retry of a committed add as the same success, and invalidates again", async () => {
    catalogHolds();
    stub.apply.mockResolvedValue({ status: "alreadyApplied", entry: { id: ACTION } });
    expect(await addToCollection(ACTION, [line])).toEqual({ applied: { id: ACTION } });
    expect(stub.invalidate).toHaveBeenCalledWith("user_1");
  });

  it("names a card the catalog dropped, and neither invalidates nor warms", async () => {
    catalogHolds();
    stub.apply.mockResolvedValue({ status: "missingCard", names: ["Gone"] });
    expect(await addToCollection(ACTION, [line])).toEqual({ missingCard: ["Gone"] });
    expect(stub.invalidate).not.toHaveBeenCalled();
    expect(stub.warm).not.toHaveBeenCalled();
  });
});

describe("editCollection", () => {
  it("edits with the counts the sheet showed, and a created row takes the catalog's printing", async () => {
    catalogHolds();
    stub.apply.mockResolvedValue({ status: "applied", entry: { id: ACTION } });
    const rows = [{ ...line, quantity: 3, expected: 1, condition: "LP", scryfallId: FORGED }];
    expect(await editCollection(ACTION, rows, [deck, { junk: 1 }])).toEqual({ applied: { id: ACTION } });
    expect(stub.apply.mock.calls[0][1]).toEqual({
      kind: "edit",
      rows: [{ oracleId: ORACLE, setCode: "lea", collectorNumber: "1", finish: "nonfoil", quantity: 3, expected: 1, condition: "LP", scryfallId: PRINTING }],
    });
    expect(stub.apply.mock.calls[0][2]).toEqual({ id: ACTION, confirmShort: [deck] });
    expect(stub.warm).toHaveBeenCalledWith("user_1");
  });

  it("edits a bare import's holding, which names no set and no printing, with a null id", async () => {
    // A `Name,Qty` export stores "" for both; the catalog holds some other printing of the card.
    catalogHolds();
    stub.apply.mockResolvedValue({ status: "applied", entry: { id: ACTION } });
    const bare = { ...line, setCode: "", collectorNumber: "", quantity: 0, expected: 2 };
    expect(await editCollection(ACTION, [bare])).toEqual({ applied: { id: ACTION } });
    expect(stub.resolve.mock.calls[0][0]).toEqual([expect.objectContaining({ setCode: "", collectorNumber: "" })]);
    expect(stub.apply.mock.calls[0][1].rows[0]).toMatchObject({ setCode: "", collectorNumber: "", scryfallId: null, condition: null });
  });

  it("refuses a bare holding in an add, which only ever names a catalog printing", async () => {
    catalogHolds();
    await expect(addToCollection(ACTION, [{ ...line, setCode: "", collectorNumber: "" }])).rejects.toThrow("not a catalog printing");
  });

  it("takes a holding of any size an import could have built, not only what one add may bring", async () => {
    stub.apply.mockResolvedValue({ status: "applied", entry: { id: ACTION } });
    await editCollection(ACTION, [{ ...line, quantity: 0, expected: 12_000 }]);
    expect(stub.apply.mock.calls[0][1].rows[0]).toMatchObject({ quantity: 0, expected: 12_000 });
    await expect(addToCollection(ACTION, [{ ...line, quantity: 12_000 }])).rejects.toThrow();
  });

  it("passes stale, a deck warning, unchanged and a missing card back, writing nothing", async () => {
    const current = [{ ...line, setCode: "lea", quantity: 4 }];
    stub.apply.mockResolvedValueOnce({ status: "stale", current });
    expect(await editCollection(ACTION, [edited])).toEqual({ stale: current });
    stub.apply.mockResolvedValueOnce({ status: "wouldShort", decks: [deck] });
    expect(await editCollection(ACTION, [edited])).toEqual({ wouldShort: [deck] });
    stub.apply.mockResolvedValueOnce({ status: "unchanged" });
    expect(await editCollection(ACTION, [edited])).toEqual({ unchanged: true });
    stub.apply.mockResolvedValueOnce({ status: "missingCard", names: ["Gone"] });
    expect(await editCollection(ACTION, [edited])).toEqual({ missingCard: ["Gone"] });
    expect(stub.invalidate).not.toHaveBeenCalled();
    expect(stub.warm).not.toHaveBeenCalled();
  });
});

describe("the sheet's reads", () => {
  it("search only for a string, and read printings only for a uuid", async () => {
    stub.search.mockResolvedValue([]);
    stub.choices.mockResolvedValue([]);
    expect(await searchCollectionCards(["sol"])).toEqual([]);
    expect(stub.search).not.toHaveBeenCalled();
    await searchCollectionCards("sol");
    expect(stub.search).toHaveBeenCalledWith("user_1", "sol");
    expect(await loadPrintingChoices("nope")).toEqual([]);
    expect(stub.choices).not.toHaveBeenCalled();
    await loadPrintingChoices(ORACLE);
    expect(stub.choices).toHaveBeenCalledWith("user_1", ORACLE);
  });
});
