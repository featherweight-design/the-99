// Which of the builder's tabs a visit lands on, and how a URL says so.
//
// The tab is component state on the builder itself — switching tabs is not a
// navigation, and making it one would push a history entry per click. The tab
// row is a row of `<button>`s for that reason.
//
// So the tab row never writes a `?tab=` URL. One in-app link produces one: a
// Rule 0 table's `Log this game` (`logGameHref`, `?tab=games&table=<id>`),
// which lands on Games with the log prefilled from that table. Otherwise the
// parameter answers a URL written by hand or kept in a bookmark (the retired
// `/decks/[id]/versions` redirect used to carry it). It is read on arrival
// only, and never written back as the reader switches.

import type { DeckView } from "../copy/about";

export type BuilderView = "deck" | "analysis" | "consider" | "games" | "versions";

export const TAB_PARAM = "tab";

// The set of names a URL may ask for. NOT the draw order — `readBuilderView` uses this as a
// membership test and nothing else, and `builderTabSpecs` owns where each cell lands. Analysis
// is second on screen because that function puts it there; reordering this array moves nothing.
const VIEWS: readonly BuilderView[] = ["deck", "analysis", "consider", "games", "versions"];

/** The tab a URL asks for, or "deck" for anything else — including an absent
 *  parameter, a repeated one, and a name no tab answers to. */
export function readBuilderView(value: string | string[] | undefined): BuilderView {
  if (typeof value !== "string") return "deck";
  return (VIEWS as readonly string[]).includes(value) ? (value as BuilderView) : "deck";
}

/** The tab the builder actually opens on. A URL can name `versions` on a deck
 *  that has none — an old link to the retired route, or a hand-typed parameter —
 *  and the row draws no Versions cell at zero, so landing there would leave every
 *  cell unselected above an empty panel. */
export function initialBuilderView(
  view: BuilderView,
  versionCount: number,
): BuilderView {
  // A URL naming a tab the row does not draw would leave every cell unselected above an empty
  // panel: `versions` on a deck with no history.
  if (view === "versions" && versionCount === 0) return "deck";
  return view;
}

/** Your deck's bodies other than its list: the Shopping view and the Stats and Notes panels. */
export type DeckBody = "shopping" | "stats" | "notes";

// The one URL that names a body: the ?'s `from` on a deck (About visual build, PR 6a), so "‹ Back to {deck}" returns to
// the view the ? was pressed on. Read on arrival only, on the deck tab only, and never written back as the reader moves:
// Shopping, Stats and Notes stay component state, as the tabs do.
export const BODY_PARAM = "panel";

const BODIES: readonly DeckBody[] = ["shopping", "stats", "notes"];

/** The body a URL asks for, or null for anything else (absent, repeated, unknown). */
export function readDeckBody(value: string | string[] | undefined): DeckBody | null {
  if (typeof value !== "string") return null;
  return (BODIES as readonly string[]).includes(value) ? (value as DeckBody) : null;
}

/**
 * A deck page's query, rewritten to open on `view` (the builder's live view, as the ? reads it) on `tab`: a tab by
 * `?tab=`, a body by `?panel=`, Your deck by neither. Consider is its own tab though it reads as Your deck, so it is
 * named by `?tab=consider`. Every other parameter is kept as it was. Returns `""` or `?…`.
 */
export function deckViewSearch(search: string, view: DeckView, tab: BuilderView = "deck"): string {
  const q = new URLSearchParams(search);
  q.delete(TAB_PARAM);
  q.delete(BODY_PARAM);
  if (tab === "consider") q.set(TAB_PARAM, tab);
  else if (view === "analysis" || view === "games" || view === "versions") q.set(TAB_PARAM, view);
  else if (view !== "your-deck") q.set(BODY_PARAM, view);
  const out = q.toString();
  return out ? `?${out}` : "";
}
