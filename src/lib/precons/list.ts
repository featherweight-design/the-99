/**
 * The precon list (`/decks/precons`), as pure functions over what the loader reads, so every
 * figure on a row is unit tested without a database: the owned count, the twin fold, the shared
 * decks, and the search, colour and order the view applies.
 *
 * Owned is the app's one notion (brief lock 6): a `collection_items` row for the card, any
 * printing. The figure counts the precon's DISTINCT non-basic cards, its commanders included
 * (design G4); basics are left out and every figure says so.
 */
import { sharedCount, sharedWith } from "./shared";

export type PreconCardFact = {
  oracleId: string;
  name: string;
  isCommander: boolean;
  basic: boolean;
  colorIdentity: string[];
  imageUri: string | null;
  /** The printing's small render, for the list's 34px thumbs; absent or null where the catalog lacks it, and the thumb draws `imageUri`. */
  imageUriSmall?: string | null;
};

export type PreconSource = {
  fileName: string;
  name: string;
  setCode: string;
  releaseDate: string;
  twinOf: string | null;
  unmappedCount: number;
  cards: PreconCardFact[];
};

export type ReaderDeck = {
  id: string;
  name: string;
  commanders: string[];
  cards: ReadonlySet<string>;
  /** The precon the deck is linked to (`decks.built_from_precon`, always a plain edition). */
  builtFrom?: string | null;
};

export type PreconCommander = { oracleId: string; name: string; imageUri: string | null; imageUriSmall?: string | null; colorIdentity: string[] };

/** A reader's deck beside a precon: one the shared rule finds, or one linked to it (`linked`), which
 *  is listed whatever it shares (R3 K9). */
export type PreconBuilt = { deckId: string; deckName: string; shared: number; sameCommanders: boolean; linked: boolean };

export type PreconRow = {
  fileName: string;
  name: string;
  setCode: string;
  releaseDate: string;
  /** The Collector's Edition this row also stands for, by name. */
  twinName: string | null;
  commanders: PreconCommander[];
  /** The commanders' union, in WUBRG order. */
  identity: string[];
  owned: number;
  of: number;
  unmapped: number;
  /** The reader's decks linked to this list, then those that share it, the larger share first. */
  built: PreconBuilt[];
};

const WUBRG = ["W", "U", "B", "R", "G"];

/** By code point, never `localeCompare`: the server and the browser order a tie the same way, so a
 *  list hydrates in the order it was rendered (as `lib/decks/sort.ts` does). */
const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** One row per distinct list: a twin folds into the plain edition it names. */
export function summarisePrecons(
  sources: readonly PreconSource[],
  owned: ReadonlySet<string>,
  decks: readonly ReaderDeck[],
): PreconRow[] {
  const twinName = new Map<string, string>();
  for (const s of sources) if (s.twinOf !== null) twinName.set(s.twinOf, s.name);

  const rows: PreconRow[] = [];
  for (const s of sources) {
    if (s.twinOf !== null) continue;
    const counted = new Set(s.cards.filter((c) => !c.basic).map((c) => c.oracleId));
    let ownedCount = 0;
    for (const id of counted) if (owned.has(id)) ownedCount++;

    const commanders: PreconCommander[] = [];
    for (const c of s.cards) {
      if (!c.isCommander || commanders.some((x) => x.oracleId === c.oracleId)) continue;
      commanders.push({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri, imageUriSmall: c.imageUriSmall, colorIdentity: c.colorIdentity });
    }
    const identity = WUBRG.filter((x) => commanders.some((c) => c.colorIdentity.includes(x)));

    const precon = { cards: counted, commanders: commanders.map((c) => c.oracleId) };
    const built: PreconBuilt[] = [];
    for (const d of decks) {
      const linked = d.builtFrom === s.fileName;
      const match = linked ? sharedCount(precon, d) : sharedWith(precon, d);
      if (match) built.push({ deckId: d.id, deckName: d.name, ...match, linked });
    }
    built.sort((a, b) => Number(b.linked) - Number(a.linked) || b.shared - a.shared
      || byCodePoint(a.deckName.toLowerCase(), b.deckName.toLowerCase()));

    rows.push({
      fileName: s.fileName,
      name: s.name,
      setCode: s.setCode,
      releaseDate: s.releaseDate,
      twinName: twinName.get(s.fileName) ?? null,
      commanders,
      identity,
      owned: ownedCount,
      of: counted.size,
      unmapped: s.unmappedCount,
      built,
    });
  }
  return rows;
}

export type PreconOrder = "newest" | "owned";
export const PRECON_ORDERS: readonly PreconOrder[] = ["newest", "owned"];
export const isPreconOrder = (v: unknown): v is PreconOrder => v === "newest" || v === "owned";

/** Case- and accent-blind, as every precon search reads. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Search reaches the name, the twin's name, every commander and the set code (design call 3).
 * Colours keep a row whose identity CONTAINS every colour on, as `/decks` does.
 */
export function filterPrecons(rows: readonly PreconRow[], q: string, colours: readonly string[]): PreconRow[] {
  const needle = fold(q.trim());
  return rows.filter((r) => {
    if (colours.some((c) => !r.identity.includes(c))) return false;
    if (needle === "") return true;
    const hay = [r.name, r.twinName ?? "", r.setCode, ...r.commanders.map((c) => c.name)];
    return hay.some((h) => fold(h).includes(needle));
  });
}

/** Newest first; or most owned (by share, then newest), with A to Z as the last tie-break. */
export function orderPrecons(rows: readonly PreconRow[], order: PreconOrder): PreconRow[] {
  const share = (r: PreconRow) => (r.of === 0 ? 0 : r.owned / r.of);
  return [...rows].sort((a, b) =>
    (order === "owned" ? share(b) - share(a) : 0)
    || byCodePoint(b.releaseDate, a.releaseDate)
    || byCodePoint(a.name.toLowerCase(), b.name.toLowerCase())
    || byCodePoint(a.fileName, b.fileName));
}

/** Year heads for the newest order; one group per release year, in the rows' order. */
export function groupByYear(rows: readonly PreconRow[]): { year: string; rows: PreconRow[] }[] {
  const out: { year: string; rows: PreconRow[] }[] = [];
  for (const r of rows) {
    const year = r.releaseDate.slice(0, 4);
    const last = out[out.length - 1];
    if (last && last.year === year) last.rows.push(r);
    else out.push({ year, rows: [r] });
  }
  return out;
}

const PIPS = ["W", "U", "B", "R", "G"];

/** The list's two views (R4 §2). Tiles is the default, so only `rows` is ever written to the URL. */
export type PreconView = "tiles" | "rows";
export const isPreconView = (v: unknown): v is PreconView => v === "tiles" || v === "rows";

/** The URL's filters, order and view (`q`, `colour`, `sort=owned|newest`, `view`), parsed once by the page,
 *  so the first render draws the list the URL names. An order or view the URL does not name is null:
 *  the browser's remembered choice then applies (T2u: an unknown `view` is ignored). */
export function parsePreconParams(params: URLSearchParams): {
  q: string; colours: string[]; order: PreconOrder | null; view: PreconView | null;
} {
  const on = (params.get("colour") ?? "").split(",");
  const view = params.get("view");
  return {
    q: params.get("q") ?? "",
    colours: PIPS.filter((c) => on.includes(c)),
    // `sort=newest` is never written by the list's own mirror (Newest is the default), but a link that must
    // land on the year heads and the Announced group names it (the arrivals banner): explicit, it beats the
    // order this browser saved.
    order: isPreconOrder(params.get("sort")) ? (params.get("sort") as PreconOrder) : null,
    view: isPreconView(view) ? view : null,
  };
}
