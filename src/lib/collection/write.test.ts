import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DeckClaim } from "../decks/availability";
import type { HistoryRow } from "../../db/schema";
import { collectionItemKey, type CollectionItemIdentity } from "./key";
import {
  committedShortfalls, countMoves, newlyShort, normalizeItems, placementToUndo, restoreToUndo, planAdd, planEdit, planReplace,
  planDigest, planRevert, staleEdits, unseenHoldings, staleRevert, warningCovers, type ShortDeck,
} from "./write";
import { collectionEditEnabled, collectionSyncEnabled } from "./edit-flag";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const id = (oracleId: string, setCode = "lea"): CollectionItemIdentity =>
  ({ oracleId, setCode, collectorNumber: "1", finish: "nonfoil" });
const held = (oracleId: string, quantity: number, scryfallId: string | null = "s1", condition: string | null = "NM") =>
  ({ ...id(oracleId), quantity, scryfallId, condition });
const coll = (...rows: ReturnType<typeof held>[]) => new Map(rows.map((r) => [collectionItemKey(r), r]));

describe("the collection edit switch", () => {
  it("is on only for the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", " true"]) {
      expect(collectionEditEnabled({ COLLECTION_EDIT_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
    expect(collectionEditEnabled({ COLLECTION_EDIT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("normalizeItems", () => {
  it("lowercases, defaults and folds to one item per key with the upload's own rule", () => {
    const out = normalizeItems([
      { oracleId: A, setCode: "LEA", condition: "NM", scryfallId: "s1", quantity: 1 },
      { oracleId: A, setCode: "lea", collectorNumber: "", finish: "nonfoil", condition: "LP", scryfallId: "s1", quantity: 2 },
    ]);
    expect(out).toEqual([{
      oracleId: A, setCode: "lea", collectorNumber: "", finish: "nonfoil",
      quantity: 3, scryfallId: "s1", condition: null, name: undefined,
    }]);
  });

  it("keeps the name an item carries, the one a missing card is refused by", () => {
    expect(normalizeItems([{ oracleId: A, setCode: "lea", condition: null, quantity: 1, name: "Gone" }])[0].name)
      .toBe("Gone");
  });

  it("refuses a quantity that is not a positive integer", () => {
    expect(() => normalizeItems([{ oracleId: A, setCode: "lea", condition: null, quantity: 0 }])).toThrow();
    expect(() => normalizeItems([{ oracleId: A, setCode: "lea", condition: null, quantity: 1.5 }])).toThrow();
  });
});

describe("planAdd", () => {
  it("adds to a held row and creates a new one", () => {
    const plan = planAdd(coll(held(A, 3)), [held(A, 1), held(B, 2)]);
    expect(plan).toEqual([
      { ...id(A), before: { quantity: 3, scryfallId: "s1", condition: "NM" }, after: { quantity: 4, scryfallId: "s1", condition: "NM" } },
      { ...id(B), before: null, after: { quantity: 2, scryfallId: "s1", condition: "NM" } },
    ]);
  });

  it("nulls a printing or a condition the stored row disagrees with (pending.ts contract)", () => {
    const [row] = planAdd(coll(held(A, 1, "s1", "NM")), [held(A, 1, "s2", "NM")]);
    expect(row.after).toEqual({ quantity: 2, scryfallId: null, condition: "NM" });
  });
});

describe("planReplace", () => {
  it("removes rows not named, sets named rows exactly, and skips rows that did not move", () => {
    const plan = planReplace(coll(held(A, 2), held(B, 1)), [held(A, 2), held("c", 1)]);
    expect(plan.map((p) => [p.oracleId, p.before?.quantity ?? null, p.after?.quantity ?? null]))
      .toEqual([[B, 1, null], ["c", null, 1]]);
  });

  it("records a row whose count held but whose condition moved", () => {
    const plan = planReplace(coll(held(A, 2, "s1", "NM")), [held(A, 2, "s1", "LP")]);
    expect(plan).toHaveLength(1);
  });
});

describe("planEdit", () => {
  it("DELETES a row edited to zero rather than storing a zero", () => {
    const [row] = planEdit(coll(held(A, 2)), [{ ...id(A), quantity: 0 }]);
    expect(row.after).toBeNull();
  });

  it("gives a row it creates the printing and condition it names", () => {
    const [row] = planEdit(coll(), [{ ...id(A), quantity: 2, scryfallId: "s9", condition: "LP" }]);
    expect(row.after).toEqual({ quantity: 2, scryfallId: "s9", condition: "LP" });
  });

  it("keeps an existing row's own printing and condition over the ones named", () => {
    const [row] = planEdit(coll(held(A, 1, "s1", "NM")), [{ ...id(A), quantity: 3, scryfallId: "s9", condition: "LP" }]);
    expect(row.after).toEqual({ quantity: 3, scryfallId: "s1", condition: "NM" });
  });

  it("creates a bare row when none are named", () => {
    const [row] = planEdit(coll(), [{ ...id(A), quantity: 1 }]);
    expect(row.after).toEqual({ quantity: 1, scryfallId: null, condition: null });
  });

  it("clears an existing row's condition only when told the folded copies disagreed", () => {
    const [kept] = planEdit(coll(held(A, 3)), [{ ...id(A), quantity: 4, expected: 3 }]);
    expect(kept.after?.condition).toBe("NM");
    const [cleared] = planEdit(coll(held(A, 3)), [{ ...id(A), quantity: 4, expected: 3, clearCondition: true }]);
    expect(cleared.after?.condition).toBeNull();
  });

  it("refuses a negative count and a row named twice", () => {
    expect(() => planEdit(coll(), [{ ...id(A), quantity: -1 }])).toThrow();
    expect(() => planEdit(coll(), [{ ...id(A), quantity: 1 }, { ...id(A), quantity: 2 }])).toThrow();
  });

  it("is stale only where an expected count differs from today's", () => {
    const current = coll(held(A, 3));
    expect(staleEdits(current, [{ ...id(A), quantity: 2, expected: 3 }])).toEqual([]);
    expect(staleEdits(current, [{ ...id(A), quantity: 2, expected: 2 }])).toHaveLength(1);
    expect(staleEdits(current, [{ ...id(B), quantity: 1, expected: 0 }])).toEqual([]);
    expect(staleEdits(current, [{ ...id(A), quantity: 1 }])).toEqual([]);
  });

  it("finds a holding the editor never showed, one whose count moved or that is gone, and claims nothing without `seen`", () => {
    const current = coll(held(A, 3), { ...held(A, 1), setCode: "lea2" } as never);
    const seen = (q: number, set = "lea") => ({ ...id(A, set), quantity: q, condition: "NM" });
    expect(unseenHoldings(current, undefined)).toEqual([]);
    expect(unseenHoldings(current, [seen(3)])).toHaveLength(1); // lea2 was never shown
    expect(unseenHoldings(current, [seen(3), seen(1, "lea2")])).toEqual([]);
    expect(unseenHoldings(current, [seen(2), seen(1, "lea2")])).toHaveLength(1); // untouched holding moved
    expect(unseenHoldings(current, [seen(3), seen(1, "lea2"), seen(2, "lea3")])).toHaveLength(1); // one drawn, now gone
    // A condition changed in another tab is a change too (the fixture holds NM).
    expect(unseenHoldings(current, [seen(3), seen(1, "lea2")])).toEqual([]);
    expect(unseenHoldings(current, [{ ...seen(3), condition: "LP" }, { ...seen(1, "lea2"), condition: "NM" }])).toHaveLength(1);
  });
});

const entryRow = (oracleId: string, before: number | null, after: number | null, attrs = { scryfallId: "s1", condition: "NM" }): HistoryRow => ({
  ...id(oracleId), name: `card ${oracleId}`,
  before: before === null ? null : { quantity: before, ...attrs },
  after: after === null ? null : { quantity: after, ...attrs },
});

describe("planRevert", () => {
  it("is the inverse of the entry's change, applied to today", () => {
    // The entry took 1 to 4; one more was added since: the revert takes the 3 back, leaving 2.
    const [row] = planRevert(coll(held(A, 5)), [entryRow(A, 1, 4)]);
    expect(row.after?.quantity).toBe(2);
  });

  it("can do less than the entry did, clamping at zero (brief §F)", () => {
    // The entry added 3 copies; 2 were removed since. The revert can take away only 1.
    const [row] = planRevert(coll(held(A, 1)), [entryRow(A, null, 3)]);
    expect(row.before?.quantity).toBe(1);
    expect(row.after).toBeNull();
  });

  it("brings a removed row back with the date its entry recorded, and no date for a row that stands", () => {
    const dated = { ...entryRow(A, 2, null), before: { quantity: 2, scryfallId: "s1", condition: "NM", addedAt: "2026-09-02T12:00:00.000Z", addedExact: false } };
    const [back] = planRevert(coll(), [dated]);
    expect(back.after).toMatchObject({ quantity: 2, addedAt: "2026-09-02T12:00:00.000Z", addedExact: false });
    // A row that still stands keeps the date it has: the revert does not plan one for it.
    const [standing] = planRevert(coll(held(A, 5)), [dated]);
    expect(standing.after).not.toHaveProperty("addedAt");
  });

  it("recreates a removed row with the columns it had", () => {
    const [row] = planRevert(coll(), [entryRow(A, 2, null, { scryfallId: "s9", condition: "LP" })]);
    expect(row.after).toEqual({ quantity: 2, scryfallId: "s9", condition: "LP" });
    expect(row.name).toBe(`card ${A}`);
  });

  it("puts back the columns a Replace moved only where nobody has changed them since", () => {
    const moved: HistoryRow = {
      ...id(A), name: "x",
      before: { quantity: 2, scryfallId: "s1", condition: "NM" },
      after: { quantity: 2, scryfallId: "s1", condition: "LP" },
    };
    expect(planRevert(coll(held(A, 2, "s1", "LP")), [moved])[0].after?.condition).toBe("NM");
    // Edited to MP since: the revert moves no count and leaves the player's edit alone.
    expect(planRevert(coll(held(A, 2, "s1", "MP")), [moved])).toEqual([]);
  });

  it("is stale when today's outcome is not the one the confirmation showed", () => {
    const plan = planRevert(coll(held(A, 1)), [entryRow(A, null, 3)]);
    expect(staleRevert(plan, { [collectionItemKey(id(A))]: 0 })).toBe(false);
    expect(staleRevert(plan, { [collectionItemKey(id(A))]: 1 })).toBe(true);
    expect(staleRevert(plan, {})).toBe(true);
    expect(staleRevert(plan, { [collectionItemKey(id(A))]: 0, [collectionItemKey(id(B))]: 2 })).toBe(true);
  });
});

describe("countMoves", () => {
  it("counts rows raised and lowered, not copies", () => {
    expect(countMoves([entryRow(A, 1, 5), entryRow(B, 2, null), entryRow("c", null, 1)])).toEqual({ raised: 2, lowered: 1 });
  });
});

const claim = (deck: string, quantity: number, since: number | null, extra: Partial<DeckClaim> = {}): DeckClaim => ({
  id: deck, name: `deck ${deck}`, quantity, mature: since !== null, since, pending: false, commander: false, senior: true, ...extra,
});

describe("committedShortfalls", () => {
  it("covers the longest-held committed claim first, and leaves a brew out", () => {
    const short = committedShortfalls({
      owned: 1,
      claims: [claim("young", 1, 200), claim("old", 1, 100), claim("brew", 1, null)],
    });
    expect(short.get("old")?.short).toBe(0);
    expect(short.get("young")?.short).toBe(1);
    expect(short.has("brew")).toBe(false);
  });

  it("breaks a seniority tie on the deck id", () => {
    const short = committedShortfalls({ owned: 1, claims: [claim("b", 1, 100), claim("a", 1, 100)] });
    expect(short.get("a")?.short).toBe(0);
    expect(short.get("b")?.short).toBe(1);
  });

  it("grants reservations first, as the claim model granted them", () => {
    const short = committedShortfalls({
      owned: 1,
      claims: [claim("old", 1, 100), claim("picked", 1, 200, { granted: 1 })],
    });
    expect(short.get("picked")?.short).toBe(0);
    expect(short.get("old")?.short).toBe(1);
  });
});

describe("newlyShort", () => {
  const names = new Map([[A, "Sol Ring"]]);

  it("names a deck the change takes from covered to short, by how many", () => {
    const before = new Map([[A, { owned: 2, claims: [claim("old", 1, 100), claim("young", 1, 200)] }]]);
    const after = new Map([[A, { owned: 1, claims: [claim("old", 1, 100), claim("young", 1, 200)] }]]);
    expect(newlyShort(before, after, [A], names)).toEqual([
      { deckId: "young", deckName: "deck young", oracleId: A, cardName: "Sol Ring", short: 1 },
    ]);
  });

  it("does not name a deck that was already short by as much", () => {
    const before = new Map([[A, { owned: 1, claims: [claim("old", 1, 100), claim("young", 1, 200)] }]]);
    const after = new Map([[A, { owned: 1, claims: [claim("old", 1, 100), claim("young", 1, 200)] }]]);
    expect(newlyShort(before, after, [A], names)).toEqual([]);
  });

  it("names only the started deck when a precon start's revert reads its before with the reservation standing", () => {
    // Production's shape (2026-10-14): one copy held by the senior deck, a junior deck short of it, and the box's copy
    // reserved to the new deck. The revert takes the box's copy and releases the reservation.
    const claims = [claim("senior", 1, 100), claim("junior", 1, 200), claim("started", 1, 300)];
    const standing = { owned: 2, claims: claims.map((c) => (c.id === "started" ? { ...c, granted: 1 } : c)) };
    const reverted = { owned: 1, claims };
    expect(newlyShort(new Map([[A, standing]]), new Map([[A, reverted]]), [A], names).map((d) => d.deckId)).toEqual(["started"]);
    // Read after the release instead, the box's copy goes by seniority to the junior deck and the revert "takes" it.
    const released = { owned: 2, claims };
    expect(newlyShort(new Map([[A, released]]), new Map([[A, reverted]]), [A], names).map((d) => d.deckId)).toEqual(["junior"]);
  });

  it("reads a card no longer owned at all as every committed claim on it going short", () => {
    // The claim read is driven by the collection, so a card with no row left is absent after.
    const before = new Map([[A, { owned: 1, claims: [claim("old", 1, 100), claim("brew", 1, null)] }]]);
    expect(newlyShort(before, new Map(), [A], names)).toEqual([
      { deckId: "old", deckName: "deck old", oracleId: A, cardName: "Sol Ring", short: 1 },
    ]);
  });
});

describe("warningCovers", () => {
  const d = (deckId: string, short: number, oracleId = A): ShortDeck =>
    ({ deckId, deckName: deckId, oracleId, cardName: "", short });

  it("passes a confirm only while the warning shown still covers the change", () => {
    expect(warningCovers([d("x", 1)], [d("x", 1)])).toBe(true);
    expect(warningCovers([d("x", 2)], [d("x", 1)])).toBe(true);
    // Another tab moved the answer in between: a deck named now that the player never saw,
    // a deck now shorter than shown, or the same deck short of a different card.
    expect(warningCovers([d("x", 1)], [d("x", 1), d("y", 1)])).toBe(false);
    expect(warningCovers([d("x", 1)], [d("x", 2)])).toBe(false);
    expect(warningCovers([d("x", 1)], [d("x", 1, B)])).toBe(false);
    expect(warningCovers([], [d("x", 1)])).toBe(false);
  });
});

describe("placementToUndo", () => {
  const at = "2026-10-12 09:00:00.123456";
  it("drops the undo's pick only on a card the reverted entry wrote", () => {
    const rows = [{ oracleId: A }];
    expect(placementToUndo({ oracleId: A, deckId: "d", createdAt: at }, rows)).toEqual({ oracleId: A, deckId: "d", createdAt: at });
    expect(placementToUndo({ oracleId: B, deckId: "d", createdAt: at }, rows)).toBeNull();
    expect(placementToUndo(undefined, rows)).toBeNull();
    // Never every reservation of the card: an undo naming no deck drops nothing.
    expect(placementToUndo({ oracleId: A, createdAt: at } as never, rows)).toBeNull();
  });
  it("names the exact reservation, never any pick of the deck", () => {
    // No instant from the undo or the entry: nothing to tell the press's pick from a newer one.
    expect(placementToUndo({ oracleId: A, deckId: "d" }, [{ oracleId: A }])).toBeNull();
    // The entry's own record wins over what the undo says, for the pick the entry made.
    const own = "2026-10-12 08:00:00.5";
    expect(placementToUndo({ oracleId: A, deckId: "d", createdAt: at }, [{ oracleId: A, placed: { deckId: "d", createdAt: own } }]))
      .toEqual({ oracleId: A, deckId: "d", createdAt: own });
    // Another deck's record says nothing about this deck's pick.
    expect(placementToUndo({ oracleId: A, deckId: "d", createdAt: at }, [{ oracleId: A, placed: { deckId: "e", createdAt: own } }]))
      .toEqual({ oracleId: A, deckId: "d", createdAt: at });
  });
});

describe("restoreToUndo", () => {
  const was = { deckId: "a", copies: 1, createdAt: "2026-10-01 10:00:00.123456" };
  const rows = [{ oracleId: A, placed: { deckId: "b", displaced: was } }];
  it("puts back only the reservation the entry recorded its own press displacing", () => {
    expect(restoreToUndo({ oracleId: A, deckId: "b", restore: { deckId: "a", copies: 1 } }, rows)).toEqual(was);
  });
  it("puts back nothing the entry did not record", () => {
    // Another deck, another count, another card, another pick, no pick, or no restore asked for.
    expect(restoreToUndo({ oracleId: A, deckId: "b", restore: { deckId: "z", copies: 1 } }, rows)).toBeNull();
    expect(restoreToUndo({ oracleId: A, deckId: "b", restore: { deckId: "a", copies: 2 } }, rows)).toBeNull();
    expect(restoreToUndo({ oracleId: B, deckId: "b", restore: { deckId: "a", copies: 1 } }, rows)).toBeNull();
    expect(restoreToUndo({ oracleId: A, deckId: "c", restore: { deckId: "a", copies: 1 } }, rows)).toBeNull();
    expect(restoreToUndo({ oracleId: A, restore: { deckId: "a", copies: 1 } } as never, rows)).toBeNull();
    expect(restoreToUndo({ oracleId: A, deckId: "b" }, rows)).toBeNull();
    // A pick the press wrote without a move, and an entry with no pick at all.
    expect(restoreToUndo({ oracleId: A, deckId: "b", restore: { deckId: "a", copies: 1 } }, [{ oracleId: A, placed: { deckId: "b" } }])).toBeNull();
    expect(restoreToUndo({ oracleId: A, deckId: "b", restore: { deckId: "a", copies: 1 } }, [{ oracleId: A }])).toBeNull();
  });
  it("drops the pick on its own: placementToUndo never carries the restore", () => {
    const made = [{ oracleId: A, placed: { deckId: "b", createdAt: "2026-10-12 09:00:00.1", displaced: was } }];
    expect(placementToUndo({ oracleId: A, deckId: "b", restore: { deckId: "a", copies: 1 } }, made))
      .toEqual({ oracleId: A, deckId: "b", createdAt: "2026-10-12 09:00:00.1" });
  });
});

// The two precon-start readouts are WIRING: the rules above hold either way, and what decides the answer is when
// applyCollectionChange reads relative to the work that moves the reservations. These pin that order in the source,
// so reverting either fix fails here as well as in probe:precon-start-owned (cases l and m).
describe("the order a precon start's readouts are read in", () => {
  const src = readFileSync(join(process.cwd(), "src/lib/collection/write.ts"), "utf8");
  const at = (needle: string) => {
    const i = src.indexOf(needle);
    expect(i, needle).toBeGreaterThanOrEqual(0);
    expect(src.indexOf(needle, i + 1), `${needle} appears once`).toBe(-1);
    return i;
  };

  it("drops a revert's start reservations only after the deck check reads its before", () => {
    const locked = at("startRelease = await lockPreconReservations(tx, userId, change.entryId);");
    const before = at("const claimsBefore = lowered.length > 0");
    const dropped = at("if (startRelease) await dropPreconReservations(tx, userId, startRelease);");
    const after = at("const claimsAfter = await loadAvailability(");
    expect(locked).toBeLessThan(before);
    expect(before).toBeLessThan(dropped);
    expect(dropped).toBeLessThan(after);
  });

  it("grants Went to's before with the reservations read before the inside work", () => {
    const read = at("const insideBefore = opts.placements && opts.inside");
    const inside = at("if (opts.inside && change.kind === \"add\") await opts.inside(tx);");
    const placed = at("raisedCards(tx, userId, plan, opts.env, insideBefore)");
    expect(read).toBeLessThan(inside);
    expect(inside).toBeLessThan(placed);
    expect(src).toContain("const reservations = prior ?? await readRaisedReservations(tx, userId, ids);");
  });
});

describe("the collection sync switch", () => {
  const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
  it("is on only with its own switch and collection editing, both the exact string 'true'", () => {
    expect(collectionSyncEnabled(env({ COLLECTION_SYNC_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" }))).toBe(true);
    expect(collectionSyncEnabled(env({ COLLECTION_SYNC_ENABLED: "true" }))).toBe(false);
    expect(collectionSyncEnabled(env({ COLLECTION_SYNC_ENABLED: "TRUE", COLLECTION_EDIT_ENABLED: "true" }))).toBe(false);
    expect(collectionSyncEnabled(env({ COLLECTION_EDIT_ENABLED: "true" }))).toBe(false);
  });
});

describe("planDigest", () => {
  const row = (oracleId: string, before: number | null, after: number | null) => ({
    ...id(oracleId),
    before: before === null ? null : { quantity: before, scryfallId: "s1", condition: "NM" },
    after: after === null ? null : { quantity: after, scryfallId: "s1", condition: "NM" },
  });

  it("does not depend on row order", () => {
    expect(planDigest([row(A, 1, 2), row(B, null, 1)], [])).toBe(planDigest([row(B, null, 1), row(A, 1, 2)], []));
  });

  it("moves with any row's before or after, a printing attribute included, and with the token plan", () => {
    const base = planDigest([row(A, 1, 2)], []);
    expect(planDigest([row(A, 1, 3)], [])).not.toBe(base);
    expect(planDigest([row(A, 2, 2)], [])).not.toBe(base);
    expect(planDigest([{ ...row(A, 1, 2), after: { quantity: 2, scryfallId: "s1", condition: "LP" } }], [])).not.toBe(base);
    expect(planDigest([row(A, 1, 2)], [{ kind: "token", id: "t", from: null, to: 1 }])).not.toBe(base);
    expect(planDigest([], [])).not.toBe(base);
  });

  it("moves with the final token state alone, so a precon add reverted before the confirm is caught", () => {
    const final = (source: string) => ({
      owned: new Map([["t", { quantity: 5, source, entryId: null }]]), uploadPrintings: new Map<string, number>(), preconPrintings: new Map<string, number>(),
    });
    const tokens = [{ kind: "token" as const, id: "t", from: 2, to: 5 }];
    expect(planDigest([row(A, 1, 2)], tokens, final("precon"))).not.toBe(planDigest([row(A, 1, 2)], tokens, final("upload")));
    expect(planDigest([row(A, 1, 2)], tokens, final("precon"))).toBe(planDigest([row(A, 1, 2)], tokens, final("precon")));
  });
});

// A Sync writes through `writeRows`, never Replace's delete-all, and re-reads its base under the lock.
describe("the sync write, in the source", () => {
  const src = readFileSync(join(process.cwd(), "src/lib/collection/write.ts"), "utf8");
  const at = (needle: string) => {
    const i = src.indexOf(needle);
    expect(i, needle).toBeGreaterThanOrEqual(0);
    return i;
  };

  it("deletes every row only for a replace", () => {
    const branch = at('if (change.kind === "replace") {\n        await tx.delete(collectionItems)');
    expect(src.indexOf("await tx.delete(collectionItems)", branch + 1)).toBe(src.lastIndexOf("await tx.delete(collectionItems)"));
  });

  it("reads its base after the per-user lock, inside the transaction", () => {
    expect(at("pg_advisory_xact_lock(hashtextextended(${userId}, 0))")).toBeLessThan(at("const base = await readSyncBase(userId, tx, { excludeUploadId: change.uploadId });"));
  });

  it("reads its base without the upload it stamped confirmed just before, so a first upload is neverUploaded", () => {
    const stamp = at(".set({ confirmedAt: sql`clock_timestamp()` })");
    const read = at("const base = await readSyncBase(userId, tx, { excludeUploadId: change.uploadId });");
    expect(stamp).toBeLessThan(read);
    // The one call: no other read of the base inside the write.
    expect(src.match(/readSyncBase\(/g)).toHaveLength(1);
  });

  it("decides nothing to sync by the one rule, which counts an unanswered conflict as something", () => {
    at("nothing: nothingToSync(merged, tokenChanges.length),");
  });

  it("refuses undecided, a missing or other digest, and nothing to sync, only on a confirm", () => {
    const guard = at("if (!opts.dryRun) {\n            if (merged.counts.undecided > 0)");
    expect(guard).toBeLessThan(at("if (change.expectedPlan !== digest)"));
    expect(at("if (change.expectedPlan !== digest)")).toBeLessThan(at('throw new Refused({ status: "nothingToSync" })'));
  });
});
