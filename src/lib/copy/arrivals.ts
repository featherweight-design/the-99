// The arrivals banner on Home (upcoming precons, plan `2026-10-14-upcoming-precons.md` PR 3; handoff
// `design/design_handoff_the99_upcoming_precons/`, frames `R1 - Home-Banner`, STATES H1–H8). A set's name is
// drawn apart from the rest of its line (in `--fg`), so each line is its name plus `rest`.
//
// No model calls: every word is fixed copy over a set name or a count from the catalog.
//
// About's line (About on the banner, plan `2026-10-15-about-on-the-banner.md`; `R2 - Home-About`, A1–A3) reuses the
// sheet's heading and Show me (`aboutSheetCopy`), so the two never word one notice two ways.

import { aboutSheetCopy } from "./about";

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
  /** About behind (A1, A2): the lead, drawn in `--fg`. The sheet's heading, with its colon. */
  aboutLead: (count: number) => `${aboutSheetCopy.heading(count)}:`,
  /**
   * After the lead: the titles under `sheetTitles`' cap, the last joined by `and`, and `N more` past the cap.
   * `shown` is how many titles to name.
   */
  aboutRest: (titles: readonly string[], shown: number, more: number) => {
    const items = [...titles.slice(0, shown), ...(more > 0 ? [`${n(more)} more`] : [])];
    if (items.length <= 1) return ` ${items.join("")}.`;
    return ` ${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}.`;
  },
  /** About first run (A3): the lead, the sheet's first-run heading with its colon. */
  aboutFirstRunLead: `${aboutSheetCopy.firstRunHeading}:`,
  /** After the first-run lead. */
  aboutFirstRunRest: " every mark and figure in the app, and where to find it, on one page.",
  /** About's link, to `/about`. The sheet's own. */
  aboutShow: aboutSheetCopy.show,
} as const;
