// The arrivals banner on Home (upcoming precons, plan `2026-10-14-upcoming-precons.md` PR 3; handoff
// `design/design_handoff_the99_upcoming_precons/`, frames `R1 - Home-Banner`, STATES H1–H8). A set's name is
// drawn apart from the rest of its line (in `--fg`), so each line is its name plus `rest`.
//
// No model calls: every word is fixed copy over a set name or a count from the catalog.
//
// About's line (About on the banner, plan `2026-10-15-about-on-the-banner.md`; `R2 - Home-About`, A3) keeps the retired
// sheet's first-run heading and Show me (`aboutSheetCopy`). A launch's own lead ("New on Decks:") is the About pages'
// `bannerLead`, worded on the server (`lib/about/notice.ts`) so the pages' copy stays off Home's bundle.

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
  /** Past the cap (`bannerCap`): four lines show in full, more than four show three and this. */
  more: (count: number) => `and ${n(count)} more`,
  /** The link for one set announced. */
  seeOne: "See it in Precons",
  /** The link for decklists, or for several arrivals. */
  seeMany: "See them in Precons",
  /** About first run (A3): the lead, the retired sheet's first-run heading with its colon. */
  aboutFirstRunLead: `${aboutSheetCopy.firstRunHeading}:`,
  /** After the first-run lead. Launch-end batch (copy-review, 2026-10-21): About is no longer one page, so it is not said. */
  aboutFirstRunRest: " every tool, mark and figure in the app, and where to find it.",
  /** About's link, to `/about`. The sheet's own. */
  aboutShow: aboutSheetCopy.show,
} as const;
