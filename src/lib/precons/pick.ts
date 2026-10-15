/**
 * Precons I own (`/decks/precons?pick=own`, no-collection entry S2 to S7), as pure rules: where the pick was entered
 * from, what the foot counts, which file each ticked box adds (a twin adds exactly one edition), and the per-box run
 * that names what landed and what didn't. The page, the action and Home's receipt all read these.
 */
import { isUuid } from "../uuid";
import type { PreconAddResult } from "./add";
import type { PreconBox } from "./list";

export const PICK_PARAM = "pick";
export const PICK_VALUE = "own";
/** On the destination after an add: the landed entries' ids, comma-separated. A claim, read back from the ledger. */
export const PICK_RECEIPT_PARAM = "precons";
/** At most this many boxes in one add: more than the catalog lists, so only a forged request meets it. */
export const PICK_MAX = 250;

/** Where the pick was opened: a closed set, read from `from`, so no free path ever reaches a link. */
export type PickEntry = "home" | "collection";
export const pickEntry = (from: string | null | undefined): PickEntry => (from === "collection" ? "collection" : "home");
export const PICK_ENTRY_HREF: Record<PickEntry, string> = { home: "/", collection: "/collection" };
/** The way into the pick from Collection (no-collection entry S18): the Add cards sheet's empty state. */
export const PICK_FROM_COLLECTION_HREF = `/decks/precons?${PICK_PARAM}=${PICK_VALUE}&from=collection`;

/**
 * Where an add lands (S5, S19): back on the page the pick was opened from, which draws the receipt the landed entries'
 * ids claim. Home and Collection both draw it.
 */
export const pickReceiptHref = (entry: PickEntry, entryIds: readonly string[]) =>
  `${PICK_ENTRY_HREF[entry]}?${PICK_RECEIPT_PARAM}=${entryIds.join(",")}`;

export type PickEdition = "regular" | "collector";

/**
 * Each row's newest standing precon add (S17), as an ISO timestamp, keyed by the row's file: a row stands for its own
 * box and its Collector's Edition twin, and an add of either marks it. Read from ONE read of the player's standing adds
 * for the whole list (`standingPreconAdds`), never per row. Only a precon History entry marks a box: owning its cards
 * some other way marks nothing. Pure.
 */
export function pickAddedOn(
  rows: readonly { fileName: string; box?: PreconBox }[],
  adds: readonly { fileName: string; createdAt: Date }[],
): Record<string, string> {
  const newest = new Map<string, Date>();
  for (const a of adds) {
    const at = newest.get(a.fileName);
    if (!at || a.createdAt > at) newest.set(a.fileName, a.createdAt);
  }
  const out: Record<string, string> = {};
  for (const r of rows) {
    const own = newest.get(r.fileName);
    const twin = r.box?.twin ? newest.get(r.box.twin.fileName) : undefined;
    const at = own && twin ? (own > twin ? own : twin) : own ?? twin;
    if (at) out[r.fileName] = at.toISOString();
  }
  return out;
}

/** The file a ticked box adds: its own, or its Collector's Edition twin's. Never both. */
export function pickFile(rowFile: string, box: PreconBox, edition: PickEdition): string {
  return edition === "collector" && box.twin ? box.twin.fileName : rowFile;
}

/** The foot's figures over the ticked boxes, each at its chosen edition. */
export function pickTotals(picked: readonly { box: PreconBox; edition: PickEdition }[]): { boxes: number; cards: number; tokens: number } {
  let cards = 0;
  let tokens = 0;
  for (const { box, edition } of picked) {
    const side = edition === "collector" && box.twin ? box.twin : box;
    cards += side.copies;
    tokens += side.tokens;
  }
  return { boxes: picked.length, cards, tokens };
}

/** `file` is the edition file the press meant to add, so a retry is matched to that file and no other. */
export type PickRequest = { fileName: string; edition: PickEdition; file: string; actionId: string };
export type PickBoxToAdd = { rowFile: string; fileName: string; actionId: string };

/**
 * The request as a closed set, or null: each entry names a plain box the catalog lists (never a twin's own file),
 * an edition the box has (Collector's only where a twin exists), the file that edition adds today, and its own uuid;
 * no box or id twice.
 */
export function resolvePick(requests: unknown, catalog: readonly { fileName: string; twinOf: string | null }[]): PickBoxToAdd[] | null {
  if (!Array.isArray(requests) || requests.length === 0 || requests.length > PICK_MAX) return null;
  const plain = new Set(catalog.filter((c) => c.twinOf === null).map((c) => c.fileName));
  const twin = new Map(catalog.filter((c) => c.twinOf !== null).map((c) => [c.twinOf as string, c.fileName]));
  const files = new Set<string>();
  const ids = new Set<string>();
  const out: PickBoxToAdd[] = [];
  for (const r of requests as unknown[]) {
    if (typeof r !== "object" || r === null) return null;
    const { fileName, edition, actionId, file: asked } = r as Record<string, unknown>;
    if (typeof fileName !== "string" || !plain.has(fileName) || files.has(fileName)) return null;
    if (edition !== "regular" && edition !== "collector") return null;
    if (!isUuid(actionId) || ids.has(actionId as string)) return null;
    const file = edition === "collector" ? twin.get(fileName) : fileName;
    if (file === undefined || file !== asked) return null;
    files.add(fileName);
    ids.add(actionId as string);
    out.push({ rowFile: fileName, fileName: file, actionId: actionId as string });
  }
  return out;
}

/**
 * The requests a committed precon add already answers, split from the rest. A retry after a lost answer is recovered
 * from its own entry BEFORE the catalog is consulted, because a refresh between the commit and the retry can drop or
 * re-map the box and refuse a request whose add already landed. `committed` maps this reader's own precon add entries,
 * by id, to the box file their source names. A request is recovered only by an entry for the exact file it asked to
 * add (`file`, carried from the press, so no catalog is needed): its own for Regular, a different one, its twin, for
 * Collector's Edition. Recovery writes nothing: it reports an add of this reader's that already stands. An id any
 * other write holds is left in the rest, where the add itself refuses it. Pure.
 */
export function recoverCommitted(
  requests: unknown,
  committed: ReadonlyMap<string, string>,
): { recovered: PickOutcome[]; rest: unknown[] } | null {
  if (!Array.isArray(requests)) return null;
  const recovered: PickOutcome[] = [];
  const rest: unknown[] = [];
  for (const r of requests as unknown[]) {
    const { fileName, edition, actionId, file: asked } = (typeof r === "object" && r !== null ? r : {}) as Record<string, unknown>;
    const file = typeof actionId === "string" ? committed.get(actionId) : undefined;
    const ofRow = typeof fileName === "string" && file !== undefined && file === asked
      && (edition === "collector" ? file !== fileName : edition === "regular" && file === fileName);
    if (ofRow) recovered.push({ rowFile: fileName as string, ok: true, entryId: actionId as string });
    else rest.push(r);
  }
  return { recovered, rest };
}

/**
 * A box's outcome. `unknown` is a box whose add threw: it may have committed with its answer lost, so it is neither
 * added nor refused, and only a retry under the same id can say which.
 */
export type PickOutcome =
  | { rowFile: string; ok: true; entryId: string }
  | { rowFile: string; ok: false; unknown?: true };

/**
 * One add per box, in order, each with its own id, so each is its own History entry. A box that refuses or throws
 * is reported and the run goes on: nothing is retried here, and a retry is the caller's, with the same ids.
 */
export async function runPickAdds(
  boxes: readonly PickBoxToAdd[],
  add: (fileName: string, actionId: string) => Promise<PreconAddResult>,
): Promise<PickOutcome[]> {
  const out: PickOutcome[] = [];
  for (const b of boxes) {
    let result: PreconAddResult;
    try {
      result = await add(b.fileName, b.actionId);
    } catch (error) {
      // not a fallback: and not a refusal either. The add may have committed with its answer lost, so it is reported as
      // unknown and the caller holds the box and its edition until a retry under the same id says which.
      console.error("precons: a pick's box failed", error);
      out.push({ rowFile: b.rowFile, ok: false, unknown: true });
      continue;
    }
    out.push(result.ok ? { rowFile: b.rowFile, ok: true, entryId: result.entryId } : { rowFile: b.rowFile, ok: false });
  }
  return out;
}

/** The receipt's ids off the destination's URL: uuids only, at most `PICK_MAX`, each once, in order. */
export function parsePickReceipt(value: string | string[] | undefined): string[] {
  if (typeof value !== "string") return [];
  const ids = [...new Set(value.split(",").filter((id) => isUuid(id)))];
  return ids.slice(0, PICK_MAX);
}

/** The receipt's dismissal, per receipt: an entry id names it, since there is no deck (not `arrivalDismissKey`). */
export const pickReceiptDismissKey = (entryIds: readonly string[]) => `the99:precon-pick-receipt:${entryIds[0] ?? ""}`;
