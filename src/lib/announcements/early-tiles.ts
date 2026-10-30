/**
 * Early lists in the Announced group (announcements handoff, board `Announced.dc.html`, STATES 3.1, 3.2, call 5, G2):
 * once Wizards posts a set's Commander decklists, each list is a precon tile in the set's block, marked "early list",
 * opening its early page (`earlyListHref`).
 *
 * The pure half, safe in a client bundle: the tile's shape, the early seen key, which revealed commanders a list
 * already stands for, how many promised lists are still to come, and the filter. The database half is
 * `early-tiles-read.ts`.
 */
import { fold, type PreconCommander } from "../precons/list";

/** One posted list as the set block draws it: the precon tile's figures, read from the early page's own assembly. */
export type EarlyTile = {
  /** `earlyListHref(contentfulId, position)`. */
  href: string;
  name: string;
  /** The list's commanders, the commander first; a partner when it is a co-commander. */
  commanders: PreconCommander[];
  /** The commanders' union, in WUBRG order. */
  identity: string[];
  owned: number;
  of: number;
};

/**
 * A set's posted lists, in post order, and how many the post promised (null: it did not say). `released` holds the
 * commanders of the set's posted lists that have given way to their release list (STATES 3.4): no longer drawn as an
 * early tile, but still stood for, so a revealed one among them never reads as waiting for its list, and its list
 * never as still to come.
 */
export type EarlySet = {
  lists: EarlyTile[];
  promised: number | null;
  /** The commanders (and co-commanders) of the lists that gave way to their release list; absent reads as none. */
  released?: string[];
  /** How many posted lists gave way: posted, not drawn, and so neither waiting nor still to come. */
  releasedLists?: number;
};

/**
 * The early seen key (G2): `early:<code>:<count>`, kept apart from `lists:<code>` so seeing a set's early lists never
 * hides its release lists' news. It carries the count of lists the reader was shown, so a further list (3 → 5) makes
 * the set new again.
 */
export const earlySeenKey = (code: string, count: number): string => `early:${code.toLowerCase()}:${count}`;

const EARLY_KEY = /^early:([a-z0-9]{2,8}):(\d{1,3})$/;

/**
 * Whether a set's early lists are news to the reader: it has lists, and no `early:<code>:<k>` the reader holds counts
 * at least as many. Any other key (a set code, `lists:<code>`) says nothing about early lists.
 */
export function earlyIsNew(code: string, count: number, held: readonly string[]): boolean {
  if (count <= 0) return false;
  const want = code.toLowerCase();
  return !held.some((k) => {
    const m = EARLY_KEY.exec(k);
    return m !== null && m[1] === want && Number(m[2]) >= count;
  });
}

/**
 * How many lists the set has posted, the count every reader of it agrees on (the meta's "3 of 5 lists so far", the
 * early seen key, the news check, lists to come): the early tiles AND the lists that gave way to their release list, so
 * a list releasing never lowers the count and hides a later post's news. Zero while no early list remains to draw: a
 * set whose lists have all given way has no early lists to show, or to be news.
 */
export function earlyPosted(s: EarlySet | undefined): number {
  if (!s || s.lists.length === 0) return 0;
  return s.lists.length + (s.releasedLists ?? 0);
}

/** The keys a Precons visit writes for the early lists it could show: one per set with lists, at its posted count. */
export function earlySeenKeys(early: Readonly<Record<string, EarlySet>>): string[] {
  return Object.entries(early).flatMap(([code, s]) => {
    const posted = earlyPosted(s);
    return posted > 0 ? [earlySeenKey(code, posted)] : [];
  });
}

/**
 * The commanders a posted list already stands for: a revealed commander among them is drawn as its list, not again.
 * `released` adds the commanders whose posted list has given way to its release list: no tile, and no wait either.
 */
export function listedCommanderIds(lists: readonly EarlyTile[], released: readonly string[] = []): Set<string> {
  return new Set([...lists.flatMap((l) => l.commanders.map((c) => c.oracleId)), ...released]);
}

/**
 * The promised lists not yet posted nor stood for by a revealed commander still waiting for its list (STATES 3.2: "1 more
 * list to come"). Zero when the post promised no number.
 */
export function listsToCome(posted: number, promised: number | null, waiting: number): number {
  if (promised === null) return 0;
  return Math.max(0, promised - posted - waiting);
}

/**
 * The set's lists under the list's filters, as a revealed commander is filtered (`filterAnnounced`): colours by
 * containment in the list's identity; a search matches the set (`setMatches`), the list's name, or a commander's name.
 */
export function filterEarly(
  lists: readonly EarlyTile[],
  { q, colours }: { q: string; colours: readonly string[] },
  setMatches: boolean,
): EarlyTile[] {
  const needle = fold(q.trim());
  return lists.filter((l) =>
    colours.every((x) => l.identity.includes(x))
    && (needle === "" || setMatches || fold(l.name).includes(needle) || l.commanders.some((c) => fold(c.name).includes(needle))));
}
