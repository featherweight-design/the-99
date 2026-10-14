# Upcoming precons and the arrivals banner: implementation plan

Brief: `docs/superpowers/design-briefs/2026-10-14-upcoming-precons.md`. Handoff:
`design/design_handoff_the99_upcoming_precons/` (R2, approved by Hugh 2026-10-14; PR #1751), and its engineering
readiness audit in that folder's `READINESS.md`: Green for this release, Yellow for moving About onto the banner.

The data half is on `main` (#1742): `loadUpcomingSets`, `markUpcomingSeen`, `utcDay` (`src/lib/precons/upcoming.ts`)
and `catalog_first_seen` (`src/lib/catalog/first-seen.ts`). Nothing calls them yet.

## Standing rulings (not re-litigated)

- **A separate release from Precons**, which ships without it.
- **Seen is per reader, in `user_prefs.upcoming_seen_codes`.** It is written on ✕ or on any Precons visit, never on
  being shown (handoff call 6, STATES rule 6).
- **No model calls.** Every word is catalog data or fixed copy.
- **Build from R2, with R1 wherever R2 leaves it unchanged.** The group folds and is closed by default. A set row is
  precon-shaped. The banner sits in the page.
- **About stays on its sheet this release** (G8, R1 H5): when the banner and the sheet are both due, both show.
  Moving About onto the banner is Phase 2 below, held.
- **Defaults where Design drew one:**
  - G2: a revealed commander links nowhere.
  - G5: `new ·` lasts 14 days from each precon's arrival, the same for everyone.
  - G6: the banner window is 30 days.

  Hugh may overrule any of them, and each one is a constant or a single branch.

## The switch

`UPCOMING_PRECONS_ENABLED` (G7), `kind: "feature"`, `needs: "PRECONS_ENABLED"`, added to the registry in PR 1.
`'true'` on staging from PR 1, unset on production until Hugh flips it after PR 3. Off means nothing is drawn and
nothing is written: no group, no banner, no `new` tag, no About entry.

## What every account sees (readiness audit, restated as the build target)

- **Flip day.** The switch-tied About entry `Commander sets on the way` appears. It is announced by the sheet once per
  browser, with no `ABOUT_VERSION` bump. No banner shows, because Star Trek and Darkhold are stamped `baseline` by the
  first `catalog_first_seen` run.
- **An unseen arrival** (within 30 days of a non-baseline `arrivedAt`) puts the banner on Home only, on every load and
  on every device, until ✕ or a Precons visit.
- **First-run accounts** see no banner, and nothing is marked seen.
- **The About sheet is untouched.**

## Pure rules (unit tested, no database)

`src/lib/precons/arrivals.ts`:

- **`arrivalsFor(sets, precons, seen, now)`** produces the banner's lines.
  - An arrival is either a set announced (`kind: "set"`) or a set's decklists listed (`kind: "precon"`, rolled up by
    `set_code`).
  - Only non-baseline arrivals count, within 30 days of `arrivedAt`.
  - A set the reader never saw that was announced and then listed is one line, the lists line, not two (STATES
    rule 5).
  - Soonest arrival first, then code.
- **`seenKeysFor(lines)`** gives the keys ✕ writes. That is `trc` for a set, and `trc` plus `lists:trc` for lists, so
  dismissing a lists line marks both (G4).
- **`countdown(releasesOn, today)`** gives `tomorrow`, `in N days` from 2 to 60, and `in N months` past 60, rounded.
  At or after release it gives the `out …` form (call 3). Both arguments are UTC days.
- **`revealedCommanders(printings)`** keeps legendary creatures only. Printings merge by oracle id, the lowest
  collector number wins, and the result is ordered by collector number (call 2, STATES rule 3).
- **`preconIsNew(arrivedAt, today)`** is true for 14 days (G5).
- **`announcedOpensByItself(sets, seen, hash)`** is true when the group holds an unseen set, or the hash is
  `#announced` (R2 change 1).
- **The filters over announced sets.**
  - Name, code or revealed commander name match.
  - Color identity matches by containment.
  - The result is `N of 15 revealed matches`.
  - A set with no match leaves.
  - Most owned hides the group.

## PR boundaries

No stacked PRs. Each one is under ~20 files and ~800 lines; PR 2 is pre-split below in case it runs over.

### PR 1: Reads, rules and the switch (dark, no UI)

- **The switch:** registry and flag function (`upcomingPreconsEnabled(env)`, requiring `PRECONS_ENABLED`).
- **E1, release day.**
  - `upcomingSetsQuery` also keeps a released `commander` set while no `precons` row carries its `set_code`.
  - `UpcomingSet` gains `released: boolean`.
  - The `today` rule stays the UTC day.
- **E2, revealed commanders.**
  - `loadRevealedCommanders(codes)` reads `printings` × `cards` for those set codes.
  - It returns each card's name, oracle id, color identity, small art and collector number.
  - It passes them through `revealedCommanders`.
- **E3, precon arrivals.** `loadPreconArrivals(now)` returns `precons.set_code`, the file name and the non-baseline
  `catalog_first_seen.first_seen_at` (kind `precon`), within 30 days.
- **E4, the seen keys.**
  - `markUpcomingSeen` accepts `lists:<code>` beside a bare code, through one widened check.
  - Unit tests cover both forms and the refusal of anything else.
- **The pure rules above, with tests.**
- **`probe:upcoming-precons`** (rolled back, local-dev) gains these states:
  - release day;
  - one set with no commanders;
  - lists landed for some decks;
  - an announced set later listed, unseen.

  Each prints the shapes PR 2 and PR 3 receive.
- No migration: `upcoming_seen_codes` is already a `text[]`.

### PR 2: The Announced group on Precons (first UI)

Split as **2a** (the group: disclosure, tiles, landing states, seen-on-visit) and **2b** (rows view and filters) if 2a
passes ~800 lines.

- **`AnnouncedSet` and the group head (C1–C3)**, above the newest year. They show in Newest order only and are hidden
  under Most owned.
  - The head is an `<h2>` button with `aria-expanded`.
  - The closed count reads `2 sets · next Nov 13`.
  - The group opens by itself per `announcedOpensByItself`. Otherwise the reader's last press holds, from
    `localStorage` `the99:precons:announced`, read and written in try/catch.
  - The open/close animation is 160ms, none under reduced motion.
- **Tiles (T1–T6, T9).**
  - Revealed cards are 84×117 at 900 and 76×106 at 390. Each card is named in text and carries its full name in the
    accessible name.
  - The strip wraps at 900 and scrolls sideways at 390.
  - With none revealed, a single plate shows.
  - `new` tag beside the name for an unseen set.
- **Landing (L1–L3).**
  - Release day reads `out … · decklists not listed yet`.
  - The `N decklists listed ↓` jump appears.
  - `new ·` on precon tiles, before `you own`, for 14 days.
- **Rows (Q1–Q3, R2–R3).**
  - Each set is a precon-shaped dashed row. Its thumb is the first revealed card.
  - The name and countdown are line 1, the first commander `and N more` is line 2, and dots, code and date are line 3.
  - A row opens its cards under a dashed rule, is closed every visit, and doesn't open with nothing revealed.
- **Filters.**
  - The result line adds `· N announced set(s)`.
  - The no-match state appears only when both are empty.
- **E5, the cache.**
  - The cached `precons` payload gains the upcoming sets and revealed commanders, both catalog data keyed on the
    catalog generation, and the UTC day enters its key for `new ·` and the countdown.
  - Seen is read OUTSIDE the cached payload, per request, because `user_prefs` moves no stamp.
  - The visit writes `markUpcomingSeen` in `after()` for every set it drew, behind the switch.
  - A failed upcoming read draws the list as shipped (T9).
- **Copy:**
  - in `src/lib/copy/precons.ts`;
  - from the handoff's placeholders;
  - through `/copy-review` before the PR opens.
- **Docs and probes.**
  - Design table rows for R2's head and set row (E6).
  - Inventory `docs/superpowers/inventories/upcoming-precons.json`.
  - `probe:upcoming-precons-ui` presses the head, a row and the `#announced` arrival at both widths.

### PR 3: The arrivals banner on Home, the About entry, close-out

- **`ArrivalsBanner` (H1–H8)** sits in Home's flow between the header and Ready to build, spanning both columns at
  desktop.
  - It is a labelled region, not an alert.
  - With one arrival it shows one sentence and one link. With several it shows a count heading and lines capped by
    `sheetTitles`.
  - ✕ is 32×32 at desktop and 44×44 at 390. It runs a server action that writes `seenKeysFor(lines)`, then collapses
    the banner in 160ms (instant under reduced motion) and moves focus to the page's `<h1>`.
  - Links go to `/decks/precons#announced`, or to the year group for a lists line.
  - It is absent on the first-run checklist, when the switch is off, when the read failed and when there is nothing
    to show.
- **E5 on Home.**
  - Home's cached payload is untouched. The banner reads its lines per request, outside `cachePageForUser`, from
    the catalog reads plus the reader's seen state.
  - `check:list-cache` must stay green, since `user_prefs` is not among the tables it covers.
- **The About entry `upcoming-precons`**, `Commander sets on the way`.
  - It sits in chapter 03 after `precons`, with its specimen from the §G artboard, through `AboutSwitch` on the new
    switch.
  - `since` is the current version, so there is no bump. The content hash is re-pinned (the `deck-tokens` precedent).
  - The existing `precons` entry is unchanged.
- **Copy** goes through `/copy-review`.
- **Close-out.**
  - The `feature-acceptance` walk covers every row of the inventory at both widths, with the banner beside the
    sheet (H5).
  - A contact sheet.

### Phase 2, HELD: About on the banner (R2 A1–A3)

Not planned in detail until Hugh answers the readiness audit's Q1–Q4:

- reach, and overturning the About rethink's H1;
- whether ✕ writes About's `seen`;
- where the How it works appendix line goes;
- whether the bump keeps its live announcement.

R2 recommends a small follow-up handoff of its own; Design decides whether A1–A3 is enough to build from once those
answers are in.

The shape it would take is one PR behind `ABOUT_SHEET_ENABLED`, with no new About entry (a restyle of a notice).

- **Retires:** `AboutSheet`, the `--about-sheet-h` reserve (shell `<main>` padding, `pending-overlay`), and
  `about-sheet-presence.ts` with the tab bar's waiting-note rule.
- **Moves:** the proxy's `sheetDecision` from a request header to a read Home makes.

Because it changes what every account sees on every page, it gets its own approval before building.

## Route and viewport inventory

| Route | State | 390 | 1300 |
|---|---|---|---|
| `/decks/precons` tiles | C1 closed, C2 open (unseen), T2, T4, T5, T6 (`chapel`), T9, L1, L2, L3 | ✓ | ✓ |
| `/decks/precons` rows | Q1, Q2, Q3, R2 | ✓ | ✓ |
| `/decks/precons#announced` | opens by itself | ✓ | ✓ |
| `/decks/precons?order=owned` | group hidden (T7) | ✓ | ✓ |
| `/` | H1, H2, H3, H4, H5 (with the sheet), H6 after ✕ and after a Precons visit, H8 focus | ✓ | ✓ |
| `/` first run | H7, no banner | ✓ | ✓ |
| `/about` | the new entry in chapter 03 | ✓ | ✓ |

## Verification, per PR

- The pre-push gate, the pre-open pass, and `pr-review` to its bar.
- Every UI PR runs `design-review` and `feature-acceptance`, and the probes listed under its PR.
- Fixtures come from `probe:upcoming-precons` on local-dev. Measurements are taken on staging.

## Risks and decisions I took

- **E5 is the one that would ship a bug silently.** A banner inside Home's cached payload would survive its own ✕
  until the next stamp-moving write. So the seen read stays outside the cache, and PR 3's probe presses ✕ and reloads.
- **Release-day sets (E1) widen a read the data half shipped.** The probe covers a set released today with no
  `precons` row, and one with a row.
- **No banner exists on staging until a real arrival lands after the baseline.** The UI is proved on probe fixtures.
  The first live banner is whatever the catalog gains next.
