import { beforeEach, describe, expect, it, vi } from "vitest";

const ENTRY = "33333333-3333-3333-3333-333333333333";
const ACTION = "44444444-4444-4444-4444-444444444444";
const id = { oracleId: "a", setCode: "lea", collectorNumber: "1", finish: "nonfoil" };
const KEY = "a|lea|1|nonfoil";

const stub = vi.hoisted(() => ({
  ledger: true,
  apply: vi.fn(),
  entry: vi.fn(),
  list: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/collection/edit-flag", () => ({ collectionEditEnabled: () => stub.ledger }));
vi.mock("../../lib/collection/write", async (actual) => ({
  ...(await actual<typeof import("../../lib/collection/write")>()),
  applyCollectionChange: stub.apply,
}));
vi.mock("../../lib/collection/history", async (actual) => ({
  ...(await actual<typeof import("../../lib/collection/history")>()),
  getHistoryEntry: stub.entry,
  listHistory: stub.list,
}));
vi.mock("../../lib/collection/invalidate", () => ({ invalidateCollectionReaders: stub.invalidate }));

import { loadCollectionHistory, previewRevert, revertCollectionEntry } from "./history-actions";

const state = (quantity: number) => ({ quantity, scryfallId: null, condition: null });
const deck = { deckId: "d", deckName: "Deck", oracleId: "a", cardName: "Card", short: 1 };

beforeEach(() => {
  stub.ledger = true;
  for (const f of [stub.apply, stub.entry, stub.list, stub.invalidate]) f.mockReset();
});

describe("the history actions", () => {
  it("are refused with the switch off, before reading anything", async () => {
    stub.ledger = false;
    await expect(loadCollectionHistory()).rejects.toThrow("collection editing is off");
    await expect(previewRevert(ENTRY)).rejects.toThrow("collection editing is off");
    expect(stub.list).not.toHaveBeenCalled();
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("refuses a page cursor that is not a positive integer", async () => {
    await expect(loadCollectionHistory(-1)).rejects.toThrow("bad page cursor");
    expect(stub.list).not.toHaveBeenCalled();
  });
});

describe("previewRevert", () => {
  it("answers from a dry run, with what the entry did beside what the revert does today", async () => {
    // The entry added 3; 2 were removed since; the revert can take away only 1.
    stub.entry.mockResolvedValue({ rows: [{ ...id, name: "Card", before: null, after: state(3) }] });
    stub.apply.mockResolvedValue({
      status: "preview", raised: 0, lowered: 1, decks: [deck],
      rows: [{ ...id, name: "Card", before: state(1), after: null }],
    });
    const preview = await previewRevert(ENTRY);
    expect(stub.apply.mock.calls[0][1]).toEqual({ kind: "revert", entryId: ENTRY });
    expect(stub.apply.mock.calls[0][2].dryRun).toBe(true);
    expect(preview).toMatchObject({ differs: true, decks: [deck], expected: { [KEY]: 0 } });
  });

  it("is not found for an entry that is not the player's, without a dry run", async () => {
    stub.entry.mockResolvedValue(null);
    expect(await previewRevert(ENTRY)).toEqual({ notFound: true });
    expect(await previewRevert("not-a-uuid")).toEqual({ notFound: true });
    expect(stub.apply).not.toHaveBeenCalled();
  });
});

describe("revertCollectionEntry", () => {
  it("reverts with the client's action id, preview and warning, and invalidates", async () => {
    stub.apply.mockResolvedValue({ status: "applied", entry: { id: ACTION } });
    expect(await revertCollectionEntry(ENTRY, ACTION, { [KEY]: 0 }, [deck, { junk: 1 } as never]))
      .toEqual({ reverted: { id: ACTION } });
    expect(stub.apply.mock.calls[0][1]).toEqual({ kind: "revert", entryId: ENTRY, expected: { [KEY]: 0 } });
    expect(stub.apply.mock.calls[0][2]).toEqual({ id: ACTION, confirmShort: [deck] });
    expect(stub.invalidate).toHaveBeenCalledWith("user_1");
  });

  it("answers a retry of a committed revert as the same success, and invalidates again", async () => {
    // The request that committed it may have died before its own invalidation.
    stub.apply.mockResolvedValue({ status: "alreadyApplied", entry: { id: ACTION } });
    expect(await revertCollectionEntry(ENTRY, ACTION, {})).toEqual({ reverted: { id: ACTION } });
    expect(stub.invalidate).toHaveBeenCalledWith("user_1");
  });

  it("passes a stale view and a deck warning back to be redrawn, writing nothing", async () => {
    stub.apply.mockResolvedValueOnce({ status: "stale", current: [] });
    expect(await revertCollectionEntry(ENTRY, ACTION, {})).toEqual({ stale: true });
    stub.apply.mockResolvedValueOnce({ status: "wouldShort", decks: [deck] });
    expect(await revertCollectionEntry(ENTRY, ACTION, {})).toEqual({ wouldShort: [deck] });
    expect(stub.invalidate).not.toHaveBeenCalled();
  });

  it("refuses a malformed action id or preview before writing", async () => {
    await expect(revertCollectionEntry(ENTRY, "nope", {})).rejects.toThrow("bad action id");
    await expect(revertCollectionEntry(ENTRY, ACTION, { [KEY]: -1 })).rejects.toThrow("bad revert preview");
    await expect(revertCollectionEntry(ENTRY, ACTION, [] as never)).rejects.toThrow("bad revert preview");
    expect(stub.apply).not.toHaveBeenCalled();
  });
});
