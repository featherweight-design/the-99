// Which of the builder's three tabs a visit lands on, and how a URL says so.
//
// The tab is component state on the builder itself — switching tabs is not a
// navigation, and making it one would push a history entry per click. But the
// version-history route draws the same row of cells and its Consider and Games
// cells have to arrive somewhere, so an incoming URL may name the tab. Only the
// arrival is read: nothing writes this parameter back as the reader switches.

export type BuilderView = "deck" | "consider" | "games";

export const TAB_PARAM = "tab";

const VIEWS: readonly BuilderView[] = ["deck", "consider", "games"];

/** The tab a URL asks for, or "deck" for anything else — including an absent
 *  parameter, a repeated one, and a name no tab answers to. */
export function readBuilderView(value: string | string[] | undefined): BuilderView {
  if (typeof value !== "string") return "deck";
  return (VIEWS as readonly string[]).includes(value) ? (value as BuilderView) : "deck";
}
