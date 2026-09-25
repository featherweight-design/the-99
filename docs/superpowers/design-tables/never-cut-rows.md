# Design property table: Locked, the deck page's rows, the mode and the toolbar (PR 4a)

Sources: `design/design_handoff_the99_never_cut/README.md` (§The lock glyph; R2 table *Lock cards
mode*), `addendum-toolbar/README.md` (F3 answers, L3, `group-toggle.tsx` deltas),
`STATES-never-cut.md`, `never-cut · copy strings.ts`, and READINESS-audit corrections F11(b)(c),
T1, T2, T3, T5, T6. Orchestrator approvals 2026-09-25: T6's two announcements.

## LockMark

| Property | Mobile | Desktop | Verified |
|---|---|---|---|
| closed / open | arch 7.5 / 4.5 tall, open left leg 1.6×3.5 from y 3.5 | same | unit (lock-cards.test) |
| rest ink | closed `--fg-body`, open `--fg-faint` | same | unit |
| mode ink | closed `--accent`, open `--fg-muted` | same | unit (mutation: mode inks) |

## Lock cards button (cluster 2, last child)

| Property | Mobile | Desktop | Verified |
|---|---|---|---|
| position | last in cluster 2, before the hairline | same | probe (T1 row), screenshot |
| skin | `BULK_BUTTON_CLASS` + `gap-[7px] min-w-[116px] justify-center` | same | unit |
| height | `min-h-[44px]` | `py-[6px]` (~30px) | screenshot |
| icon | closed LockMark, `--fg-muted` | same | screenshot |
| Done | label `Done`, text, border and icon `--accent`, no fill | same | probe, screenshot |
| name | its visible label; no `aria-label`, no `aria-pressed` (T6) | same | unit |
| mode on | Keep all and Clear all auto stay in place, disabled at 50% | same | probe |
| Keep all's question open | Lock cards stands down | same | unit (mutation) |
| Shopping filter | absent; switching to Shopping ends the mode | same | probe, unit |
| List ↔ Card | keeps the mode | same | unit |
| T1 | n/a | one line at 1300 with two-digit auto/kept counts and a v10 draft note; 1280 recorded | probe (spread 5px at both) |

## The mode's line and the key

| Property | Mobile | Desktop | Verified |
|---|---|---|---|
| slot | the key's wrapper holds EITHER MarkKey OR the mode's line | same | unit (mutation), screenshot |
| line | *Locked cards are never suggested as cuts.* + mono `{n} locked` | same | probe |
| key entry | mark + `locked`, only when the view holds a locked card; list view only until tiles draw a lock (4b) | same | unit |

## Rows

| Property | Mobile | Desktop | Verified |
|---|---|---|---|
| at-rest mark | 14px locked mark after the name | the 22px slot left of ✕: locked mark, presses to unlock | unit, screenshot |
| hover shortcut | none | open lock on row hover, `tabIndex -1`, `aria-hidden`, title `row.titleOff` / `row.titleOn` | unit |
| mode toggle | replaces ✕: 36px box in a 44px hit | replaces ✕: 26×22 | probe (aria-pressed), screenshot |
| toggle name | `aria-label` `mode.toggleAria(card)`, `aria-pressed` | same | probe, unit |
| description | `mark.a11y` after the availability word | same | unit (mutation) |
| Shopping ⇄ | absent on a locked row, slot kept | same | unit (mutation) |
| refusal | reverts, `mode.refused` under the row | same | unit (mutation) |
| announcements | `announceLocked` / `announceUnlocked`; mode enter / leave (T6) | same | unit (mutation) |
| Undo | re-adds with `{ relock: true }`: a locked card returns locked (L1) | same | probe (mutation fails) |

## Clear all auto (L3, T5, T2, T3)

| Property | Mobile | Desktop | Verified |
|---|---|---|---|
| Keep all | counts every auto copy | same | unit |
| Clear label | `clearAllMobile(auto − lockedAuto)` | `clearAll(auto − lockedAuto)` | probe (`· 11` with one locked) |
| Clear at 0 clearable | absent; Keep all stays | same | screenshot, unit |
| sweep | skips locked cards (server) and the client prediction skips them too | same | probe (DB), unit (mutation) |
| receipt | `… removed · {n} locked card(s) stayed`, clauses `whitespace-nowrap`, middot in the second | same | probe, unit (mutation) |
| units | lockedAutoCount and the receipt count copies; `mode.count` counts cards | same | unit |

Gaps: none.
