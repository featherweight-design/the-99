// Which of the builder's four tabs a visit lands on, and how a URL says so.
//
// The tab is component state on the builder itself — switching tabs is not a
// navigation, and making it one would push a history entry per click. The tab
// row is a row of `<button>`s for that reason.
//
// So NOTHING IN THE APP PRODUCES A `?tab=` URL. The parameter used to be
// justified by `/decks/[id]/versions` redirecting here carrying it; that route
// is retired, and what the parameter answers now is a URL written by hand or
// kept in a bookmark. It is read on arrival only, and never written back as the
// reader switches — which is the same contract it always had, minus the one
// in-app producer.

export type BuilderView = "deck" | "consider" | "games" | "versions";

export const TAB_PARAM = "tab";

const VIEWS: readonly BuilderView[] = ["deck", "consider", "games", "versions"];

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
export function initialBuilderView(view: BuilderView, versionCount: number): BuilderView {
  return view === "versions" && versionCount === 0 ? "deck" : view;
}
