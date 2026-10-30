// Proposed additions. Placeholders until /copy-review. US English. No model calls: every string is fixed copy over
// a set name, code, date, card name or count from the catalog.
//
// Announced group: beside `preconsCopy` in src/lib/copy/precons.ts, as `preconsCopy.upcoming`.
// Banner: beside `refreshCopy.home` in src/lib/copy/refresh.ts, as `refreshCopy.home.arrivals`.

const n = (x: number) => x.toLocaleString("en-US");
const plural = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

/** Days from `today` to `releasesOn`, both UTC calendar days (`YYYY-MM-DD`), as `utcDay` gives them. */
export const daysUntil = (releasesOn: string, today: string) =>
  Math.round((Date.parse(`${releasesOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

export const upcomingCopy = {
  heading: "Announced",
  headingCount: (sets: number) => plural(sets, "set", "sets"),
  /** The countdown after the date. 0 or less never reaches here: a released set reads `out`. */
  until: (days: number) =>
    days === 1 ? "tomorrow" : days <= 60 ? `in ${n(days)} days` : `in ${n(Math.round(days / 30.44))} months`,
  /** 900: one line. `date` is `preconDate(releasesOn)`. */
  meta: (code: string, date: string, until: string, revealed: number) =>
    `${code} · ${date} · ${until} · ${revealed === 0 ? "no commanders revealed yet" : `${plural(revealed, "commander", "commanders")} revealed`}`,
  /** 390: two lines. */
  metaPhoneDate: (date: string, until: string) => `${date} · ${until}`,
  metaPhoneCount: (code: string, revealed: number) =>
    `${code} · ${revealed === 0 ? "no commanders revealed yet" : `${plural(revealed, "commander", "commanders")} revealed`}`,
  /** Release day and after, before any list (needs gap G3). */
  out: (date: string) => `out ${date} · decklists not listed yet`,
  /** A filter narrowed the block. */
  matches: (shown: number, revealed: number) => `${n(shown)} of ${n(revealed)} revealed ${shown === 1 ? "matches" : "match"}`,
  nonePlate: "none revealed yet",
  noneRow: "No commanders revealed yet",
  /** Rows view, line 3. */
  rowMeta: (code: string, date: string, revealed: number) =>
    `${code} · releases ${date}${revealed > 0 ? ` · ${plural(revealed, "commander", "commanders")} revealed` : ""}`,
  /** Lists have landed for some decks while the set is still on the way. */
  listed: (count: number) => `${plural(count, "decklist", "decklists")} listed ↓`,
  newTag: "new",
  /** Added to the list's result line when a filter is on and sets survive it. */
  resultSets: (sets: number) => ` · ${plural(sets, "announced set", "announced sets")}`,
  /** A revealed card's accessible name: its full name, never clipped. */
  cardAria: (name: string, colors: string) => `${name}, ${colors}. Revealed commander.`,
  /** On a precon tile's meta line, before `you own`, for 14 days from the precon's arrival. */
  tileNew: "new · ",
} as const;

export const arrivalsCopy = {
  regionLabel: "New in the app",
  dismiss: "Dismiss",
  announced: (set: string, revealed: number) =>
    revealed === 0 ? `${set} is announced.` : `${set} is announced, with ${plural(revealed, "commander", "commanders")} revealed.`,
  listed: (set: string, decks: number) => `${set}: ${plural(decks, "decklist", "decklists")} listed.`,
  heading: (count: number) => `${n(count)} new in Commander precons`,
  /** Only for two or more, by `sheetTitles`: four lines show in full. */
  more: (count: number) => `and ${n(count)} more`,
  seeOne: "See it in Precons",
  seeMany: "See them in Precons",
} as const;

export const UPCOMING_NEW_DAYS = 14; // `new ·` on a listed precon's tile
export const ARRIVAL_WINDOW_DAYS = 30; // how long an unseen arrival is bannered
