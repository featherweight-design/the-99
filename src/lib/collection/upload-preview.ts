import type { HistoryRow } from "../../db/schema";
import { collectionItemKey, type CollectionItemIdentity } from "./key";

/**
 * What the Replace and Add previews draw beyond the dry run's two totals (collection edit §A):
 * four figures, the card lists behind them, and how much of an Add the player already owns. All of
 * it is computed from the rows the write's own dry run returned, so the screen cannot disagree with
 * the save. Figures count HOLDINGS (a printing in a finish), the unit the collection stores; the
 * `copies` fields count cards.
 */

/** Rows shipped per list. The review pages through these; a longer one says so by its total. */
export const PREVIEW_LIST_CAP = 500;

/** The file already holds this share of an Add or more: the choice screen notes the doubling. */
export const ADD_OVERLAP_NOTE_AT = 0.8;

export type PreviewListRow = {
  oracleId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  finish: string;
  before: number;
  after: number;
  /** The player changed this holding by hand since their last upload, and this write overwrites it. */
  edited: boolean;
};

export type PreviewList = { total: number; rows: PreviewListRow[] };

export type UploadPreviewDetail = {
  /** Holdings the write leaves as they are. */
  unchanged: number;
  /** Holdings going up, including ones the collection does not hold yet. */
  up: number;
  down: number;
  leaving: number;
  /** Copies in the collection now, and after the write. */
  copiesBefore: number;
  copiesAfter: number;
  lists: { leaving: PreviewList; down: PreviewList; up: PreviewList };
  /** An Add: file holdings the collection already holds, of all file holdings. */
  overlap: { held: number; of: number };
  /** Every holding in the file is already owned, so an Add only doubles copies. */
  allOwned: boolean;
};

const qty = (state: { quantity: number } | null) => state?.quantity ?? 0;

function listOf(rows: PreviewListRow[], order: (a: PreviewListRow, b: PreviewListRow) => number): PreviewList {
  return { total: rows.length, rows: [...rows].sort(order).slice(0, PREVIEW_LIST_CAP) };
}

const byName = (a: PreviewListRow, b: PreviewListRow) => a.name.localeCompare(b.name);

export function summarizeUploadPreview(args: {
  /** The dry run's changed rows. */
  rows: HistoryRow[];
  /** `collection_items` rows and copies now. */
  holdings: number;
  copies: number;
  /** `collectionItemKey`s of holdings changed by hand since the last upload. */
  editedKeys: ReadonlySet<string>;
  raised: number;
  lowered: number;
}): UploadPreviewDetail {
  const { rows, holdings, copies, editedKeys } = args;
  const leaving: PreviewListRow[] = [];
  const down: PreviewListRow[] = [];
  const up: PreviewListRow[] = [];
  let changedAmongHeld = 0;
  let held = 0;
  for (const r of rows) {
    const before = qty(r.before);
    const after = qty(r.after);
    if (r.before) {
      changedAmongHeld += 1;
      held += 1;
    }
    const row: PreviewListRow = {
      oracleId: r.oracleId,
      name: r.name,
      setCode: r.setCode,
      collectorNumber: r.collectorNumber,
      finish: r.finish,
      before,
      after,
      edited: editedKeys.has(collectionItemKey({ ...r, finish: r.finish as CollectionItemIdentity["finish"] })),
    };
    if (after === 0) leaving.push(row);
    else if (after < before) down.push(row);
    else if (after > before) up.push(row);
  }
  return {
    unchanged: Math.max(holdings - changedAmongHeld, 0),
    up: up.length,
    down: down.length,
    leaving: leaving.length,
    copiesBefore: copies,
    copiesAfter: copies + args.raised - args.lowered,
    lists: {
      leaving: listOf(leaving, (a, b) => b.before - a.before || byName(a, b)),
      down: listOf(down, (a, b) => b.before - b.after - (a.before - a.after) || byName(a, b)),
      up: listOf(up, (a, b) => b.after - b.before - (a.after - a.before) || byName(a, b)),
    },
    // For an Add every changed row is a file holding, and a row that existed before is one the
    // player already owns. A Replace has no such reading; its screen does not draw this.
    overlap: { held, of: rows.length },
    allOwned: rows.length > 0 && held === rows.length,
  };
}
