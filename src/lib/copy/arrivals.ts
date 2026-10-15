// The arrivals banner on Home (upcoming precons, plan `2026-10-14-upcoming-precons.md` PR 3; handoff
// `design/design_handoff_the99_upcoming_precons/`, frames `R1 - Home-Banner`, STATES H1–H8). A set's name is
// drawn apart from the rest of its line (in `--fg`), so each line is its name plus `rest`.
//
// No model calls: every word is fixed copy over a set name or a count from the catalog.

const n = (x: number) => x.toLocaleString("en-US");
const plural = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

export const arrivalsCopy = {
  /** The region's accessible name. A labelled region, never an alert. */
  regionLabel: "New in the app",
  /** The ✕. */
  dismiss: "Dismiss",
  /** After the set's name: a set announced, with the commanders revealed so far. */
  announced: (revealed: number) =>
    revealed === 0 ? " is announced." : ` is announced, with ${plural(revealed, "commander", "commanders")} revealed.`,
  /** After the set's name: its decklists listed, rolled up by set. */
  listed: (decks: number) => `: ${plural(decks, "decklist", "decklists")} listed.`,
  /** Two or more arrivals: the count heading. */
  heading: (count: number) => `${n(count)} new in Commander precons`,
  /** Past the cap (`sheetTitles`): four lines show in full, more than four show three and this. */
  more: (count: number) => `and ${n(count)} more`,
  /** The link for one set announced. */
  seeOne: "See it in Precons",
  /** The link for decklists, or for several arrivals. */
  seeMany: "See them in Precons",
} as const;
