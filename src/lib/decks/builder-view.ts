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
  /** Whether this deployment draws the Analysis tab at all — `ANALYSIS_TAB_ENABLED`. */
  analysisEnabled = false,
): BuilderView {
  // A URL naming a tab the row does not draw would leave every cell unselected above an empty
  // panel. Two ways that happens: `versions` on a deck with no history, and `analysis` where the
  // flag is off — including a bookmark made on staging and opened against production.
  if (view === "versions" && versionCount === 0) return "deck";
  if (view === "analysis" && !analysisEnabled) return "deck";
  return view;
}
