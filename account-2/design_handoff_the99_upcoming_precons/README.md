# The 99: Upcoming precons and the "New in the app" banner (design handoff, R1)

`design/design_handoff_the99_upcoming_precons/` · 2026-10-14 · mirrors `design_handoff_the99_precons/`

**Status: R2, approved (Hugh, 2026-10-14). Build from the R2 files, with R1 where R2 doesn't change it.** R2 applies Hugh's three R1 notes (2026-10-14): `The 99 - Upcoming Precons (R2).dc.html`
(the notes and answers), `R2 - Precons.dc.html` (C1–C3, Q1–Q3), `R2 - Home-About.dc.html` (A1–A3, a proposal). R1's files
are kept beside them, unchanged. R2 wins where they differ.

## R2 changes (supersede R1 where they differ)

1. **The Announced group folds (note 1).** Its `<h2>` holds a button with `aria-expanded`, a `▸`/`▾` at the right, and
   a closed count of `2 sets · next Nov 13`. It's **closed by default**. It opens by itself only on a visit that
   draws a set this reader hasn't seen, or one that arrives from the banner's `#announced` link. Otherwise the
   reader's last press wins, stored per browser as `the99:precons:announced`. Closed, it costs one heading row (34px
   at 900, 44px at 390). Tiles and rows share it. The open/close animation is 160ms, none under reduced motion.
2. **Rows are precon rows (note 2).** R1's wrapping list of names is gone. A set is a precon row in a dashed shell:
   - a thumb showing the first revealed card, or the empty plate when none is revealed;
   - line 1: the name, with `in 30 days` where a precon has `you own`;
   - line 2: `Christine Chapel, Combat Medic and 14 more` (every name when there are one or two; `No commanders
     revealed yet` when there are none);
   - line 3: the set's dots, then `TRC · Nov 13, 2026`.

   Pressing the row opens its cards (the tile block's strip) under a dashed rule. Each row is its own disclosure,
   closed every visit. A set with nothing revealed doesn't open.
3. **About on the same banner (note 3), proposed.** The About sheet's announcement becomes a line in the Home banner:
   - `2 new in About: …titles. Show me`, capped by `sheetTitles`, About's line first;
   - one ✕ for the whole banner, which marks everything seen, the About line included (today's Later writes
     nothing);
   - the first-run sheet becomes a line on the checklist page.

   The sheet, its reserved height and the tab-bar note that waits behind it all go. The cost is reach: the banner is
   on Home only, while the sheet appeared on any page a document load opened. **Recommended: ship it as its own
   follow-up handoff and PR**, behind `ABOUT_SHEET_ENABLED`, with no new About entry, once the banner component has
   landed with this release. Until then R1 H5 holds. G8 taken as recommended: a follow-up, not this release.

*R1 status:* R1, for audit. Source of truth: `docs/superpowers/design-briefs/2026-10-14-upcoming-precons.md`
(branch `brief/upcoming-precons`). Canvas: `The 99 - Upcoming Precons (R1).dc.html` (the calls), frames
`R1 - Precons-Tiles`, `R1 - Precons-Rows`, `R1 - Precons-Landing`, `R1 - Home-Banner`, each at 900 (Home: 1280) and
390. About entry: `The 99 - About · Upcoming Precons Entry.dc.html`, `about · upcoming precons.ts`. STATES
`STATES-upcoming-precons.md`. Copy `upcoming-precons · copy strings.ts`. Design table
`design-tables/upcoming-precons.md`.

A separate release from Precons, on its own switch behind `PRECONS_ENABLED`. Kaldheim only, as the precons rounds.

## Brief locks, held

| Lock | How R1 holds it |
|---|---|
| The data exists (sets, revealed printings, `arrivedAt`, per-reader seen) | Every word drawn is a set name, code, date or card name, or fixed copy. Nothing asks for a deck name, a deck count, a commander→deck match or a price. |
| No model calls | No generated sentence anywhere. The banner's lines are templates over a name and a count. |
| Seen is per reader | ✕ and opening Precons both write through `markUpcomingSeen`. Nothing is stored per browser. |
| Precons ships without this | Nothing on the shipped page moves when the switch is off or the read is empty or fails (T1, T9, R3, H1). |
| Upcoming sets can't read as precons | No tile shell, no art box, no caption, no "you own", no link, no Start. A dashed block (the basics tile's and the not-owned dot's mark for "not counted"). |
| A date is a date, UTC day | `preconDate` form first, then the countdown, both against `utcDay`. |
| Banner never blocks | In the page's flow, not fixed. No modal, scroll lock or focus grab, and no live announcement. ✕ is a real button. |
| A failed read draws nothing | T9 and H1. |
| Screen readers | The group has an `<h2>`, each set an `<h3>`. Each commander is named in text. The banner is a labelled region, not an alert. |
| Reduced motion | The banner has no entrance motion (the server draws it). The close collapse is instant under reduced motion. |

## The calls (brief §Open)

1. **Tile versus group: a group.** "Announced" uses the year head's anatomy and sits above the newest year, one
   dashed block per set, soonest first. A 205px tile shows three of fifteen. A tile that opens adds a page for a set
   with one card. The group holds both sets at full size and reads as part of the list's order.
2. **A revealed commander shows its small art, its name and its dots.** 84px at 900, 76px at 390, 63:88.
   - The name is printed under the card, two lines at most. The full name goes in the card's accessible name.
   - Every card shows. At 900 the block wraps, nine to a row. At 390 it's one row that scrolls sideways; the cut card
     at the edge is the cue.
   - A double-spoiled card is one card, from its lowest collector number (Chapel, TRC 78).
   - With none revealed, the block shows one plate, `none revealed yet`, sized as a card.
   - A commander doesn't link anywhere (G2).
   - Rows view prints the names as one wrapping mono line, with no art.
3. **The date reads `Nov 13, 2026 · in 30 days`.**
   - The countdown is `tomorrow` at 1 day, `in N days` from 2 to 60, and `in N months` past 60, rounded
     (Darkhold, 177 days: `in 6 months`).
   - On release day and after, it reads `out Nov 13, 2026 · decklists not listed yet` until the lists arrive (needs
     G3).
4. **The banner sits between Home's header and Ready to build, in the page.**
   - At desktop it spans both columns.
   - It's in the flow, so it never meets the About sheet. When both are due, both show and neither yields.
   - A first-run account doesn't see it, and nothing is marked seen.
5. **What it says.**
   - Two kinds of arrival: a set announced, and a set's decklists listed, rolled up by set.
   - One arrival is one sentence with one link. Several get a count heading, one line each, and the About sheet's
     cap (`sheetTitles`: all of them up to four, else three and `and N more`).
   - An arrival is bannered only within 30 days of its `arrivedAt`.
6. **Seen happens on ✕, or on opening Precons by any route.**
   - Being shown writes nothing, like the sheet's Later. Scrolling into view isn't used.
   - There's no undo, because the set is still on Precons.
   - The trace is a mono `new` beside the set's name on the first Precons visit after it arrives. That visit marks
     the set seen, so the tag goes the next time.
7. **When decklists land.**
   - Before release, with some lists in, the block stays and adds `N decklists listed ↓`.
   - Once the set is out and has a listed precon, the block leaves. Its precons lead their year with `new ·` before
     `you own`, for 14 days from each precon's arrival, the same for every reader.
   - A reader who never saw the announcement gets one banner line (`Star Trek Commander: 4 decklists listed.`), not
     two.

### Also called

- **Filters.** Announced sets filter with the list. Search matches the set name, the code or a revealed commander's
  name. Colors match a commander's identity (contains). A block shows only its matching commanders (`1 of 15
  revealed matches`) and leaves if none match. The result line counts decklists, then adds `· N announced set(s)`.
  The no-match state draws only when both are empty.
- **Most owned.** The group hides, as the year heads drop, because there's nothing to own.
- **Order.** Soonest release first, ties by code (the read's order).
- **Rows.** The toggle holds. In rows, each set is one dashed row: the name, `in 30 days` where a precon row has
  its figure, the names line, then `TRC · releases Nov 13, 2026 · 15 commanders revealed`.

## About

A new entry, `Commander sets on the way`, in chapter 03 after `Starting from a precon`. It's tied to the new switch
and announced when the switch flips (as `precons`: `marksPending`, no `ABOUT_VERSION` bump). The banner is one more
surface this entry describes, not a second entry. The existing `precons` entry is unchanged. Drawn on the §G
per-entry artboard: `The 99 - About · Upcoming Precons Entry.dc.html`, slots in `about · upcoming precons.ts`.

## Gaps for Hugh and the plan

- **G1 · Fixture names.** Only Christine Chapel and Gargantos are named in the brief, and staging and Scryfall
  weren't reachable from the design session. The other fourteen Star Trek cards are `[TRC commander NN]`, with
  illustrative color dots, and Star Trek's precons are `[Star Trek precon A–D]`. `pnpm probe:upcoming-precons` has
  the real names. Nothing in the layout depends on them except the two-line clamp, which is drawn with Chapel's
  long name.
- **G2 · Revealed commander links nowhere.** Card details could open on the printing the catalog holds, but its
  legality block may lag for a brand-new card (eng lock 5). Open for Hugh: link to card details with the legality
  hidden, or leave it as drawn.
- **G3 · Release day needs a read change.** `loadUpcomingSets` drops a set on its release day. L1 keeps a released
  commander set with no `precons` rows in the group as `out … · decklists not listed yet`. That needs the read to
  return those too, and to drop them when their first list lands. Without it, the set vanishes on release day and
  comes back later as tiles.
- **G4 · Seen key for lists.** The banner keys a lists arrival by set (`trc` for announced, and a second key such
  as `trc:lists` for lists landed). Dismissing a lists line marks both. The key's shape is the plan's (eng lock 7).
- **G5 · `new` on precon tiles is time-based, not per reader.** Fourteen days from the precon's own arrival, the
  same for everyone. It needs no new seen key. If Hugh wants it per reader, it becomes "until you open Precons",
  which needs a precon-level key.
- **G6 · 30-day banner window.** A design choice so a reader back after a long break isn't shown stale news. It is
  a constant, not a lock.
- **G8 · About on the banner.** Approved with R2 as a separate follow-up handoff (R2 change 3). Not in this release;
  R1 H5 (both show) holds until it ships.
- **G7 · Switch name.** `UPCOMING_PRECONS_ENABLED` is a placeholder. One switch covers both surfaces, since the
  banner's link has nowhere to go without the group.

## Not done this round

- Loading: the group is part of the server render, so it has no skeleton of its own.
- Most owned, and the group over an empty collection band (L2 of the precons handoff), are rules in STATES only.
- Amonkhet and Kamigawa themes aren't reviewed.
