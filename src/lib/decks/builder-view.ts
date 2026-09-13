// Which of the builder's four tabs a visit lands on, and how a URL says so.
//
// The tab is component state on the builder itself — switching tabs is not a
// navigation, and making it one would push a history entry per click. But a URL
// may still name the tab on arrival: `/decks/[id]/versions` redirects here
// naming `versions`, which is how an old link to that route lands on the rail.
// Only the arrival is read: nothing writes this parameter back as the reader
// switches.

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
