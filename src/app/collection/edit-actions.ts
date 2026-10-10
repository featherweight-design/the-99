"use server";

import { after } from "next/server";
import { requireUserId } from "../../lib/auth";
import { collectionEditEnabled } from "../../lib/collection/edit-flag";
import {
  loadEditSheetData, loadPrintingChoices as readPrintingChoices, printingRefKey, resolvePrintings,
  searchCollectionCatalog, type CardHolding, type CatalogCardResult, type PrintingChoice,
} from "../../lib/collection/catalog-read";
import { invalidateCollectionReaders } from "../../lib/collection/invalidate";
import { isFinish, type CollectionItemIdentity } from "../../lib/collection/key";
import type { PendingItem } from "../../lib/collection/pending";
import {
  applyCollectionChange, parseShortDecks, type ChangeResult, type EditRow, type ShortDeck,
} from "../../lib/collection/write";
import { warmCommanderScores } from "../../lib/recs/warm";
import { isUuid } from "../../lib/uuid";

/**
 * The Add cards sheet and its edit mode (collection screens plan, PR 1). Every action here exists
 * only with `COLLECTION_EDIT_ENABLED` on, because each writes the ledger, and every write is one
 * ledger entry under the action id the client minted when the sheet opened, reused on retry.
 */

async function signedInEditor(): Promise<string> {
  const userId = await requireUserId();
  if (!collectionEditEnabled()) throw new Error("collection editing is off");
  return userId;
}

/**
 * Called when a sheet that saved is closed. The write invalidated the readers after its response
 * (`settled`), and a `router.refresh()` from the close could reach the server before that ran and
 * draw the old list from its cache. This invalidates inside the action instead, so the reply
 * carries the page as it now is and nothing races: by the time the sheet closes, the reader is
 * about to look at that page anyway.
 */
export async function settleCollectionWrite(): Promise<void> {
  invalidateCollectionReaders(await signedInEditor());
}

/** A sheet session is ten to forty cards; this is a bound on a request, not on a session. */
const MAX_LINES = 500;
/** A card's whole holdings list rides along as `seen`: every printing in every finish, so a wider bound. */
const MAX_SEEN = 5000;
/** What one add line may bring in. A typo bound, not a holding bound: holdings can grow past it. */
const MAX_ADDED = 9999;
/** `collection_items.quantity` is a Postgres integer. An edit names a holding of any size. */
const MAX_HELD = 2_147_483_647;
/** Conditions are short codes (`NM`, `LP`, `near_mint`); anything longer is not one. */
const MAX_CONDITION = 32;

const isCount = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/**
 * The holding a line names, or null for anything that is not one. Set codes are stored lowercase.
 * An empty set code is a holding, not a malformed one: a bare `Name,Qty` import stores `""` for
 * both the set and the collector number, and that holding must still be editable and removable.
 */
function identityOf(v: unknown): CollectionItemIdentity | null {
  if (typeof v !== "object" || v === null) return null;
  const { oracleId, setCode, collectorNumber, finish } = v as Record<string, unknown>;
  if (!isUuid(oracleId)) return null;
  if (typeof setCode !== "string" || setCode.length > 12) return null;
  if (typeof collectorNumber !== "string" || collectorNumber.length > 16) return null;
  if (typeof finish !== "string" || !isFinish(finish)) return null;
  // Lowercased: Postgres hands uuids back lowercase, and every map this is looked up in is keyed
  // on what it returned.
  return { oracleId: (oracleId as string).toLowerCase(), setCode: setCode.toLowerCase(), collectorNumber, finish };
}

function linesOf(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LINES) throw new Error("bad collection lines");
  return value;
}

/** Applied, or applied by an earlier request with this id: either way, the readers are stale. */
function settled(userId: string, result: ChangeResult): { applied: { id: string } } | null {
  if (result.status !== "applied" && result.status !== "alreadyApplied") return null;
  // A retry invalidates again: the request that wrote it may have died between its commit and
  // its own invalidation.
  // After the response, never inside the action: a Server Action that revalidates re-renders the
  // route it was called from into its own reply, and the empty /collection and first-run Home
  // would turn into their populated pages and unmount the sheet that is still showing its saved
  // state. The warm follows the invalidation, as it did when both ran in the action.
  after(async () => {
    invalidateCollectionReaders(userId);
    await warmCommanderScores(userId);
  });
  return { applied: { id: result.entry.id } };
}

export type AddOutcome = { applied: { id: string } } | { missingCard: string[] };

/**
 * Adds the sheet's lines to the collection as one `add` entry. Adding never lowers a count, so
 * there is no deck check (handoff B7). Every line must name a catalog printing in a finish it
 * exists in: the sheet only ever offers those, and the printing's `scryfall_id` is taken from the
 * catalog, never from the client.
 */
export async function addToCollection(actionId: string, lines: unknown): Promise<AddOutcome> {
  const userId = await signedInEditor();
  if (!isUuid(actionId)) throw new Error("bad action id");
  const parsed = linesOf(lines).map((l) => {
    const identity = identityOf(l);
    const quantity = (l as { quantity?: unknown }).quantity;
    if (!identity || !isCount(quantity, 1, MAX_ADDED)) throw new Error("bad collection line");
    return { ...identity, quantity };
  });
  const catalog = await resolvePrintings(parsed);
  const items: PendingItem[] = parsed.map((l) => {
    const printing = catalog.get(printingRefKey(l));
    if (!printing || !printing.finishes.includes(l.finish)) throw new Error("not a catalog printing");
    return { ...l, scryfallId: printing.scryfallId, condition: null };
  });
  const result = await applyCollectionChange(userId, { kind: "add", items }, { id: actionId });
  const done = settled(userId, result);
  if (done) return done;
  if (result.status === "missingCard") return { missingCard: result.names };
  throw new Error(`collection add refused: ${result.status}`);
}

export type EditOutcome =
  | { applied: { id: string } }
  | { unchanged: true }
  | { stale: (CollectionItemIdentity & { quantity: number })[] }
  | { wouldShort: ShortDeck[] }
  | { missingCard: string[] };

/**
 * Sets each named holding to a new count, as one `edit` entry: an edit-mode save, a printing
 * fixed by re-picking (the old holding to zero, the new one up), another printing added, or a
 * removal (every holding to zero). Each row MUST carry `expected`, the count the sheet showed (0 for
 * a holding it adds), and a collection that moved since answers `stale` with today's counts.
 *
 * A lowering that leaves a committed deck short answers `wouldShort`; the client resends the SAME
 * action id with those decks as `confirmShort`, which the server re-checks.
 *
 * A row this edit creates takes its printing's `scryfall_id` from the catalog, and its `condition`
 * from the client, carried across a printing fix. A row naming no catalog printing (a bare
 * `Name,Qty` import's) keeps a null id.
 */
export async function editCollection(
  actionId: string,
  rows: unknown,
  confirmShort?: unknown,
  seen?: unknown,
): Promise<EditOutcome> {
  const userId = await signedInEditor();
  if (!isUuid(actionId)) throw new Error("bad action id");
  const parsed = linesOf(rows).map((r) => {
    const identity = identityOf(r);
    const { quantity, expected, condition, clearCondition } = r as {
      quantity?: unknown; expected?: unknown; condition?: unknown; clearCondition?: unknown;
    };
    // `expected` is REQUIRED: without it `staleEdits` has nothing to compare, and a sheet drawn
    // before another tab's save would overwrite the newer count.
    if (!identity || !isCount(quantity, 0, MAX_HELD) || !isCount(expected, 0, MAX_HELD)) {
      throw new Error("bad collection row");
    }
    if (condition !== undefined && condition !== null
      && (typeof condition !== "string" || condition.length === 0 || condition.length > MAX_CONDITION)) {
      throw new Error("bad collection row");
    }
    if (clearCondition !== undefined && typeof clearCondition !== "boolean") throw new Error("bad collection row");
    return { ...identity, quantity, expected, condition: condition as string | null | undefined, ...(clearCondition === true ? { clearCondition: true } : {}) };
  });
  // Every holding of the card the sheet showed. Absent for a caller that never drew the card's list.
  // An empty list is a valid claim (a card the player did not own), so it is checked apart from `linesOf`.
  if (seen !== undefined && (!Array.isArray(seen) || seen.length > MAX_SEEN)) throw new Error("bad collection lines");
  const seenIdentities = seen === undefined ? undefined : (seen as unknown[]).map((s) => {
    const identity = identityOf(s);
    const q = (s as { quantity?: unknown } | null)?.quantity;
    if (!identity || !isCount(q, 0, MAX_HELD)) throw new Error("bad collection row");
    const cond = (s as { condition?: unknown }).condition;
    if (cond !== undefined && cond !== null && (typeof cond !== "string" || cond.length > MAX_CONDITION)) {
      throw new Error("bad collection row");
    }
    return { ...identity, quantity: q, condition: (cond as string | null | undefined) ?? null };
  });
  const catalog = await resolvePrintings(parsed);
  const editRows: EditRow[] = parsed.map((r) => {
    const printing = catalog.get(printingRefKey(r));
    // A row the sheet showed at zero and now raises is one this edit CREATES (a stale guess is
    // refused by `expected` before it is written). Like an add line, it must name a catalog
    // printing in a finish that printing has; a row that already exists keeps its own columns.
    if (r.expected === 0 && r.quantity > 0 && (!printing || !printing.finishes.includes(r.finish))) {
      throw new Error("not a catalog printing");
    }
    return { ...r, scryfallId: printing?.scryfallId ?? null, condition: r.condition ?? null };
  });
  const result = await applyCollectionChange(
    userId, { kind: "edit", rows: editRows, seen: seenIdentities }, { id: actionId, confirmShort: parseShortDecks(confirmShort) },
  );
  const done = settled(userId, result);
  if (done) return done;
  switch (result.status) {
    case "unchanged": return { unchanged: true };
    case "stale": return { stale: result.current };
    case "wouldShort": return { wouldShort: result.decks };
    case "missingCard": return { missingCard: result.names };
    default: throw new Error(`collection edit refused: ${result.status}`);
  }
}

/** The sheet's search: every game card whose name matches, with what the player owns of each. */
export async function searchCollectionCards(query: unknown): Promise<CatalogCardResult[]> {
  const userId = await signedInEditor();
  if (typeof query !== "string") return [];
  return searchCollectionCatalog(userId, query);
}

/** One card's catalog printings for the required printing step, with what the player holds. */
export async function loadPrintingChoices(oracleId: unknown): Promise<PrintingChoice[]> {
  const userId = await signedInEditor();
  if (!isUuid(oracleId)) return [];
  return readPrintingChoices(userId, oracleId as string);
}

/**
 * What the Edit copies sheet starts from for one card: every catalog printing (a printing fix and
 * `Add another printing` pick from these) and every holding the player has of it, the tiles' counts
 * derived from the same holdings read.
 */
export async function loadEditSheet(oracleId: unknown): Promise<{ choices: PrintingChoice[]; holdings: CardHolding[] } | null> {
  const userId = await signedInEditor();
  if (!isUuid(oracleId)) return null;
  return loadEditSheetData(userId, oracleId as string);
}
