# Readiness · Upcoming precons R2

**Engineering audit, 2026-10-14 (rebased on main at 9d1f125).** Audited against the brief
(`docs/superpowers/design-briefs/2026-10-14-upcoming-precons.md`, branch `brief/upcoming-precons`), the shipped
About sheet (`src/proxy.ts`, `src/lib/about/gate.ts`, `src/components/shell/about-sheet.tsx`,
`about-sheet-presence.ts`) and the About rethink brief (`2026-09-25-about-rethink.md`). Design's own table is kept
below, unedited.

## Verdict

| Part | Verdict |
|---|---|
| **This release:** the Announced group on Precons (C1–C3, Q1–Q3, R1's T/R/L where R2 doesn't change them) and the arrivals banner on Home (H1–H8) | ✅ **Green.** Every brief state is drawn at 390 and desktop, every §Open call is answered, every lock is held. The gaps are engineering's to close in the plan (E1–E7). |
| **The follow-up:** About's sheet moved onto the banner (R2 A1–A3) | 🟡 **Yellow.** Drawn as a proposal, and it reverses a locked ruling. It needs Hugh's answers to Q1–Q4 before it is planned. It does not block this release. |

## What every account sees

### This release (R1 H5 holds; G8 deferred)

The About sheet does not change. With `ABOUT_SHEET_ENABLED` on, an unseen entry still shows the sheet once per
browser, on the first document load of any page except `/about` (the `about_sheet` cookie is written when it
is shown). Later writes nothing. Only a visit to `/about` records `seen`. With the switch off, the legacy redirect
gate runs as it does today.

- **When the new switch flips**, the entry `Commander sets on the way` becomes visible. It is switch-tied, so there is
  no `ABOUT_VERSION` bump, like `precons` and `deck-tokens`. Every account whose switches include it gets the sheet once
  per browser: `1 new in About`. No banner shows that day. Star Trek and Darkhold are stamped `baseline` on staging's
  first `catalog_first_seen` run, so neither is an arrival.
- **A returning account with an unseen arrival** (within 30 days of a non-baseline `arrivedAt`) sees the banner on
  Home only, in the page's flow. It shows on every Home load and on every device until ✕ or any visit to Precons.
  That write is `user_prefs.upcoming_seen_codes`, per account. Being shown writes nothing.
- **Both due on one load**: both show and neither yields (H5). The banner is in the page and the sheet sits at the foot
  above the tab bar on a phone, or beside the rail at desktop.
- **A first-run account** gets the sheet's first-run card as today, and no banner. Nothing is marked seen.
- **With the new switch off**, nothing on Precons, Home or About changes.

### The follow-up, if Hugh rules it in (A1–A3)

- **The sheet is gone.** The foot card, `--about-sheet-h` (which the shell's `<main>` padding and `pending-overlay`
  read), and the tab bar's waiting-note rule (`about-sheet-presence.ts`) go with it.
- **A returning account with unseen entries** sees nothing on any page except Home. On Home the banner leads with
  `N new in About: {titles}. Show me`, capped by `sheetTitles`, and an arrival line follows it. The banner comes back
  on every Home load and on every device until ✕, Show me or a visit to `/about`. Today it shows once per browser.
- **✕ writes About's `seen`.** Today nothing but `/about` writes it.
- **A first-run account** gets the line on the checklist page in place of the sheet's first-run card.

## Gaps

### For Hugh: the follow-up (Q1–Q4, Design calls)

- **Q1 · Reach, and a locked ruling.** The About rethink kept H1: *"Nothing on the menu, the rail, the tab bar or Home:
  the sheet is the notice."* Its ruling 1 replaced the redirect on the strength that *"every reader is still shown
  the news."* A banner on Home alone gives that up. A reader who opens the app through a deep link or a shared deck
  and never lands on Home is never told. R2 names the cost; overturning H1 is Hugh's call.
- **Q2 · ✕ dismisses unread.** Ruling 3 makes an entry seen when `/about` is opened. If ✕ writes `seen`, the entries
  also leave the what's-new index at the top of `/about` without being read. Today Later leaves the index standing.
  Options: ✕ writes seen (as drawn), or ✕ hides the line for that browser and leaves `seen` alone (today's Later,
  with a cookie like `about_sheet`).
- **Q3 · The How it works line.** The sheet carries the `how-it-works` appendix id when `HOW_IT_WORKS_ENABLED` is on
  (`sheetDecision`). A1 has no place for it.
- **Q4 · The announcement.** The sheet speaks once through a polite live region (§N10). The banner is drawn as not
  announced. Moving About onto it makes a bump silent to a screen reader unless it keeps that line.

Also needed: confirm which release it is. The handoff's G8 says it is a follow-up. d9 relayed Hugh's view that R2 adds
it as scope. The plan treats it as a separate phase and holds it on these answers.

### For engineering: this release (E1–E7, resolved in the plan)

- **E1 · Release day (G3).** `upcomingSetsQuery` keeps `released_at > today`, so a set leaves the group the day it
  releases. Widen it to keep a released `commander` set while no `precons` row carries its `set_code`.
- **E2 · Revealed commanders.** No read exists. `loadUpcomingSets` returns sets only. Add a read over `printings` ×
  `cards` by set code: a legendary creature, one per oracle id, from its lowest collector number.
- **E3 · A precon's arrival.** The `new ·` tag (14 days, G5) and the banner's `N decklists listed` line need each
  precon's `catalog_first_seen` row of kind `precon`, non-baseline. The list read has no join to it today. `new ·` is
  time-based, so the cached list payload must key on the UTC day, or the tag must be computed at render.
- **E4 · The seen key for lists (G4).** `markUpcomingSeen` drops anything that fails `/^[a-z0-9]{2,8}$/`, so `trc:lists`
  is dropped today. The plan sets the key's shape and widens the check.
- **E5 · The cache.** `user_prefs` carries no `user_data_touch` trigger. Home and Precons are cached per reader on that
  stamp, so a ✕ or a Precons visit would not retire a cached banner, `new` tag or open-by-itself group. Read the seen
  state outside the cached payload (`check:list-cache` holds Home to it).
- **E6 · The design table** has R1 rows only. The plan adds rows for R2's disclosure head (C1–C3) and the
  precon-shaped set row (Q2, Q3).
- **E7 · The switch (G7).** `UPCOMING_PRECONS_ENABLED`, `feature`, `needs: PRECONS_ENABLED`. Registry entry, the About
  entry through `AboutSwitch`.

### Defaults taken where Design drew one (Hugh may overrule)

- **G2:** a revealed commander links nowhere.
- **G5:** `new ·` is 14 days from each precon's arrival, the same for everyone.
- **G6:** the 30-day banner window is a constant.
- **G1:** fixture names come from `pnpm probe:upcoming-precons`.

## Components and tokens

- **Exists in `src`:** `PreconListView`, `PreconTile`, `PreconRow`, `EmptyCollectionBand`, `PreconsDown`,
  `groupByYear`, `FirstRunChecklist`, `ResumeDecks`, `sheetTitles`, `preconDate`, `utcDay`, `loadUpcomingSets`,
  `markUpcomingSeen`, `AboutSwitch`, `marksPending`, `catalog_first_seen`, `user_prefs.upcoming_seen_codes`.
- **New, as intended:** `AnnouncedSet` and `ArrivalsBanner`.
- **Tokens:** all eleven tokens the STATES and design table name are declared in every theme in `globals.css`:
  `--accent`, `--border`, `--border-dashed`, `--border-strong`, `--fg`, `--fg-body`, `--fg-faint`, `--fg-locked`,
  `--fg-muted`, `--surface-rail`, `--surface-sunken`.

---

## Design's readiness table (as handed off)

**Green. R2 approved (Hugh, 2026-10-14). Build from it.** G8 is taken as recommended: About moves onto the banner in a separate follow-up handoff, not in this release.

| Check | State |
|---|---|
| Every brief state drawn at 390 and desktop | Yes. Precons T1–T6 (T7, T8 as rules), R1–R3, L1–L3; Home H1–H8. Read failed is T9 = T1 and H1. |
| Tiles and rows | Both. The view toggle holds. |
| Every §Open call answered | Yes, seven (README §The calls), plus filters, Most owned, order. |
| Locks held | Yes (README table). No deck names, counts, matches or prices drawn; no model calls. |
| About entry | New entry drawn on the §G artboard; switch-tied, no bump. |
| Copy | Placeholders, all through `/copy-review`. |
| Engineering asks | G3 (release-day read) and G4 (lists seen key) change the data half. G2, G5, G6, G7 need Hugh. |
| Fixtures | G1: fourteen Star Trek names and its decks are placeholders. |
