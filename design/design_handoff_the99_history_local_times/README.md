# History in local time · R1 (issue #2986)

Account 2, drawn 2026-11-18. Canvas: https://claude.ai/artifact/Gg7P49gAwdsWtJ3BtDtLFH (Main = phone before/after + rules, Desktop = before/after at 1280).
Status: **APPROVED by Hugh 2026-11-18** (LGTM; Q1-Q4 stand as recommended).

Frames are the shipped `HistoryList` + `CollectionPlaceHead` + shell, SSR'd with shipped CSS (art/B1-*, art/A1-*). Reader in America/Denver, now = Wed Nov 18 2026, 2:14 PM MST (21:14Z). Same eight entries in both; one at 11:40 PM Nov 17 local (06:40Z Nov 18) is the midnight case.

## The change

Every date and time on /collection/history is the reader's wall clock, in the zone the browser reports. Nothing else on the page moves.

### Time slot (each entry, top right; desktop right of the body, beside Revert)

| Age | Reads |
| --- | --- |
| under 1 minute | `Just now` |
| under 1 hour | `12 min ago` (floor of minutes) |
| older, in any day group | `2:02 PM` (clock only; the group heading carries the day) |

- 12 / 24 hour follows the browser locale (`Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })`): `14:02` in en-GB.
- Same element style as shipped (mono 11.5px `--fg-faint`), now a `<time dateTime={iso}>` with `title` = full stamp: `Wednesday, November 18, 2026 at 2:13 PM MST`.
- While the page is open, relative labels re-render once a minute (only while any entry is under an hour old) and turn into the clock at 60 minutes. Day groups recompute at local midnight on the same tick.

### Day headings (grouped by the reader's calendar day)

| Day | Reads (shipped mono uppercase style) |
| --- | --- |
| today | `Today · Nov 18` |
| yesterday | `Yesterday · Nov 17` |
| 2 to 6 days ago | `Monday · Nov 16` (new: weekday) |
| older | `Nov 8` |
| outside the reader's current year | `Dec 30, 2025` |

### Sentences that quote a time: one phrase, `whenPhrase`

`just now` · `12 min ago` · `today at 9:30 AM` · `yesterday at 3:15 PM` · `Nov 12 at 12:05 PM` (`Dec 30, 2025 at …` in another year).

| Where | Shipped | Proposed |
| --- | --- | --- |
| Reverted line | `Reverted · by the revert at 16:30` | `Reverted · by the revert today at 9:30 AM` |
| Revert confirm lede | `From Nov 17, 15:15. Reverting this changes 1 copy.` | `From yesterday at 3:15 PM. Reverting this changes 1 copy.` |
| Foot / empty state / aged revert title | UTC day | the reader's day (`before Aug 20`, `since Aug 1`) |

Shipped `revertedBy` gave a time with no day, so a revert from a later day read as the same day's.

## Copy (DRAFT, for /copy-review)

`collectionEditCopy.history`: `revertedBy: (when) => \`by the revert ${when}\`` (drops "at"; `when` carries it); new `weekday: (day, date) => \`${day} · ${date}\``; new time strings `justNow: "Just now"`, `minAgo: (n) => \`${n} min ago\``, and their lower-case sentence forms. Comments saying "UTC" in history-view.ts and the copy module go.

## Engineering notes (not design calls)

- Zone on the server render: issue #2986 lists two ways. Recommended: a `tz` cookie set by the client shell from `Intl.DateTimeFormat().resolvedOptions().timeZone` (validated with `validTimeZone`, `src/lib/time/zoned.ts`), read by the page and passed to `HistoryList` as `timeZone`; first visit without it renders the slot and headings after mount (keep the slot's width, no flash of UTC). Locale for 12/24 h is the browser's, so the slot text itself is client-rendered or uses `suppressHydrationWarning` on `<time>`.
- Tests pin `America/Denver` with an entry at 06:40Z (lands on Yesterday at 11:40 PM), and one across a DST change.
- The frames' generator (scratch-gen, with proposal.diff, a logic sketch, not the build) is on design-assets at account-2/design_handoff_the99_history_local_times/ (02534b0).

## Calls (ruled as recommended, 2026-11-18)

- **Q1** Weekday headings for the last week (`Monday · Nov 16`). Drawn; recommended. Alt: date only, as shipped.
- **Q2** Clock time on older rows vs relative all the way (`3 days ago`). Drawn: clock, because the heading already says the day and Revert needs the exact moment. Recommended.
- **Q3** Same fix elsewhere. Other UTC date helpers: collection head `last updated` (`formatLastUpdated` runs on the server, so its "today" is the UTC day), `date-figure.tsx`, `tuning/note-date.ts`, `decks/format.ts`, `format/when.ts`. Recommended: a follow-up issue reusing the same `tz` plumbing, not in this round.
- **Q4** Copy DRAFT above.

See issue #2986 for the confirmed cause (`history-view.ts` `getUTC*`, `groupByDay` on the UTC day).
