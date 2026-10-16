# Plan: Discovery R2 and R3, the showcase, the "?", the first-run tour and tools where the need is

2026-10-16. Approved by the orchestrator (d9) as Hugh's proxy. Brief:
`docs/superpowers/design-briefs/2026-10-16-discovery-and-onboarding.md` (#1914), §2 to §5. Handoff:
`design/design_handoff_the99_discovery_onboarding/`:

- R2 (#1927): `README-r2.md`, `STATES-showcase-reference.md`, `design-tables/discovery-r2.md`,
  `discovery-r2 · copy strings.ts`, `r2/*.dc.html`, and its engineering items E8 to E17 in `READINESS-r2.md`.
- R3 (#1933): `README-r3.md`, `STATES-tour-and-need.md`, `design-tables/discovery-r3.md`,
  `discovery-r3 · copy strings.ts`, `r3/*.dc.html`, and E18 to E27 in `READINESS-r3.md`.

Readiness: `docs/superpowers/readiness/discovery-r2.md` (17 gaps) and `docs/superpowers/readiness/discovery-r3.md`
(16 gaps). **Every resolution in those two audits binds this plan**, except where a ruling below overrides one. This plan
cites them as `R2 gap N` and `R3 gap N` rather than restating them; an implementer reads the gap before building the PR
that names it.

R1 (the moments, `2026-10-16-moments.md`) is fully merged. This plan builds layers 2 to 5 of the brief: the showcase,
About as a reference with a "?" on every screen, the first-run tour, and tools where the need is.

## Hugh's rulings (relayed by d9, 2026-10-16)

1. **Screenshots follow the reader's own theme.** All six themes are captured by script (answers R2's G11 and R3's G27;
   R3 gap 2 already applied it to the tour).
2. **The tour can be taken again** from a `Take the tour` press at `/about`'s head and in the account menu. On an account
   with data it runs on the real app (PR 11 below says how).
3. **Friends appears on the first-run checklist Home** (answers G25, R3 gap 5). Step 6 gains one sentence and a second
   light.
4. **The tour shows only on a first-run Home, with no back-fill** (G24, as R3 gap 1 resolved it). E18's migration fill is
   dropped.
5. **Cost chips stay as shipped** (G13): a card carries a chip only where the app already shows a cost, verbatim (R2 gap
   4). Help me choose, Find a deck and the rest carry none.

**About entries are paused**: no new entry and no `ABOUT_VERSION` bump anywhere in this plan. E16's and E17's copy
edits re-pin `about.test.ts`'s content hash and bump nothing (R2 gap 16).

## Decisions this plan adds

Each of these closes a choice the handoff and the audits leave to engineering.

1. **Three switches, all `feature`, all dark until Hugh flips them** (staging `'true'` from the PR that adds each one,
   production unset):
   - `ABOUT_TOOLS_ENABLED`, no parent: About's two tabs, the showcase, the Reference by screen, the note's move, the
     banner's new target (E14). Off: `/about` exactly as shipped.
   - `HELP_PANEL_ENABLED`, needs `ABOUT_TOOLS_ENABLED`: the "?" in the rail and the header, and its panel. Its rows lead
     to the Reference, so it cannot stand without it.
   - `FIRST_RUN_TOUR_ENABLED`, no parent (R3 gap 13): the tour, `/?tour=1`, and both `Take the tour` presses (About's
     head, which also needs `ABOUT_TOOLS_ENABLED`, and the account menu's row). With `MOMENTS_ENABLED` off the tour still runs.
   - **No switch for the nudges and doors** (E1, E2, N1 to N3). Each follows its own tool's switch, as the handoff
     specifies (L1), and each is a word in a slot the screen already draws. A dark switch over them would hide nothing a
     reviewer cannot read in the diff, and N2's change (dropping the hub rule) is the shipped shortcut drawn under its
     own switch.
   - **No switch for the `?tool=` landing either.** An unknown id, a tool whose switch is off, or a deck the reader does
     not own is stripped with no halo, so honoring the parameter is harmless with every other switch off.
2. **One target registry for halos and the tour.** R1's registry is keyed by `MomentId`, and the landing (E11), Show me
   (C4) and the tour (E20) all need targets that are not moments (Stats for your decks, Friends and pods, the tour's
   stops). `src/lib/discovery/targets.ts` holds the closed set `TARGETS`: every `MomentId`, plus the tool ids with
   no moment, plus `tour:step-one`, `tour:collection`, `tour:commanders`, `tour:decks`, `tour:account`,
   `tour:banner` and `tour:friends`. `useTarget(id)` (in `src/components/discovery/targets-provider.tsx`) registers a
   control's element; `useMomentAnchor` calls it, so a moment's control is a target with no second registration.
   Consumers ask `targetRect(id)`, `scrollToTarget(id)` and `haloTarget(id, ms = 2400)`, which sets the shipped
   `data-moment-halo` attribute and removes it after `ms`. The provider mounts in the shell beside `MomentsProvider`, on
   whatever the switches say.
3. **The tool registry** is `src/lib/discovery/tools.ts`, client-safe, the 14 tools of C2 in group order: `id`, `group`,
   `switch` (R2 gap 8: Collection Sync's is `COLLECTION_SYNC_ENABLED`), `entry` (the About entry id its `How it works ›`
   opens), `target`, `lands` (`"deck"` with a deck tab and view, or a route), `credit` (the shipped chip string or
   null, per ruling 5) and `needsDeck`. The Written for you section's five spenders are a second constant beside it,
   read off the credits entry's resolved caption, so each follows the switch `captionLineSwitches` gives its line.
   Four of the five lines carry one today; `- Writing a deck’s Overview` does not, so R2·5 gives it the switch the
   Overview's spend sits behind (read from its gate in `src/lib/synopsis/read.ts`), as an ordinary edit that re-pins
   the content hash.
4. **Screenshots** (E9, ruling 1, R2 gap 9) are captured by `pnpm capture:about` against `next start` on a **scratch
   Neon branch made from local-dev**, never staging or production. `scripts/about-fixtures.mts` builds the fixture
   account E9 lists (a deck under its body size, one over, a full deck with games and opponents, a row over its deck's
   limit, a friend with a spare, an earlier upload) and calls `assertScratchBranch` before its first write, because it
   reseeds the signed-in account's whole collection.
   - **What is captured, per theme:** one frame per screen of README-r2's table (a deck's tabs and views each count as a
     screen), the 14 tool crops, and the tour's three pictures (steps 2 to 4). At 390, 2x, as WebP, in
     `public/about/shots/<theme>/<id>.webp`, with the theme set by the theme cookie the picker writes.
   - **The manifest**, `src/lib/about/shots.generated.ts`, is written by the script: per image its size, and per entry
     and per tool its halo box as fractions of its frame.
   - **Budget:** a test fails when one image exceeds 90KB or the set exceeds 18MB, so the six-theme cost is held, not
     discovered.
   - **A test fails** when a tool or a visible entry has no image in any theme (STATES: "Fixture has no picture: never
     ships").
   - Reading an image picks the reader's theme from the same cookie the shell reads. An unknown theme reads the
     default's.
5. **The tour's scrim is one SVG mask, not a box shadow.** The property table's `box-shadow: …, 0 0 0 3000px` draws one
   hole, and ruling 3 puts two lights on step 6. The overlay draws the scrim as an SVG `<mask>` holding one rounded rect
   per lit target, and each ring (R1's halo) as its own element at its rect. Every other value in R3's spotlight table
   holds.
6. **The tour taken again** (ruling 2). `Take the tour` navigates to `/?tour=1`. Home starts the tour when
   `FIRST_RUN_TOUR_ENABLED` is on, whatever `tour_seen_at` says, and strips the parameter through `mirrorUrl`. It writes
   `tour_seen_at` only when null, so a replay moves no stamp. On a first-run account the replay is the first-run tour.
   On an account with data, the dashboard Home, it runs on the real app:
   - Step 1 lights the Collection slot (rail or tab bar) instead of step 1's card, and drops the precon line.
   - Steps 2 to 4 light the real, unlocked Commanders and Decks slots, keep their picture and drop the
     `once your cards are in` captions for replay captions.
   - Step 5 is unchanged. Step 6 lights the banner when its target is registered, else the centred fallback (R3 gap 6),
     and the Friends section when it is drawn.
   - The replay's own strings (step 1's body and the three captions) go to `/copy-review` with the rest. They are copy
     and need no Design round.
   - **The two presses:** the account menu's row sits directly under `About The 99`, drawn as that row is. At About's
     head it is a text press in the accent after the subtitle, drawn as R2·5's `Open the Reference →` press is. Both are absent with the
     switch off.
7. **Friends on the checklist** (ruling 3) needs the permanent Friends Home section, which is its own PR outside this
   plan, waiting on a Design addendum (moments plan, "Changes after approval"). That addendum must also say where the
   section sits on the checklist, because no board draws it there. **This is the one item that goes back to Design**,
   and d9 carries it. PR 12 mounts the shipped section and adds step 6's sentence and second light, and it waits for
   both.

## Architecture, by layer

- **Entries (E8, E12, R2 gaps 6 and 17).** `AboutEntry` gains `screen` (a closed set `ABOUT_SCREENS`, README-r2's 21) and
  `view` for a deck's tabs. `visibleEntries` stays the one switch filter. Search is rewritten (`src/lib/about/search.ts` reads titles only today, `matchTitle`) to read the
  title, the caption and the keys of the RESOLVED entry, so a line `captionLineSwitches` strips is never matched, and
  marks the matched word. The ? panel's payload comes from `GET /api/about/entries` (signed in, `private, no-store`,
  `HELP_PANEL_ENABLED` re-checked for the reader, 404 off): title, caption, keys, `screen`, `view`, no specimen. `aboutEntries` moves out of
  `src/lib/copy/about.ts` into its own module, `src/lib/copy/about-entries.ts`, and the client-graph guard
  (`scripts/lib/client-graph.test.mts`) gains a rule that no page outside `/about` imports that module. The rule names
  the entry list, not `about.ts`: the shell's account menu, `method-tag.tsx` and `provenance-panel.tsx` import
  `about.ts`'s other copy, and stay as they are.
- **Fits (E10, R2 gaps 1 to 3).** `loadToolFits(userId, env)` in `src/lib/discovery/fits.ts` runs on the server when
  `/about` loads, under `ABOUT_TOOLS_ENABLED`. Each tool's `fits(deck, facts)` is pure and compares against the deck's
  own body size (99, or 98 with a partner). Decks order by Home's `resume` touched order. Cheaper stand-ins reads the
  price read the Shopping total already makes. Friends' spares calls `loadFriendSpares` once over the union of every
  deck's missing cards, with no cap. Before PR 3 merges, `pnpm measure:friend-spares` (read-only) times it on staging. If it
  takes over 400ms for Hugh's account (this plan's bar), the card falls back to `Open Friends →` and nothing else changes (R2 gap 3).
- **The landing (E11, R2 gaps 7 and 11).** `useToolLanding()` on the deck page and on each tool's own page reads
  `?tool=<id>`, waits for the target to register, scrolls it into view, haloes it 2.4s with no bubble, spends the tool's
  moment through `spendMomentAction` when one exists and `MOMENTS_ENABLED` is on, and strips the parameter through
  `mirrorUrl`. A credit tool's target is its tile, never its run press. A deck gone since render lands on `/decks`.
  Find a deck lands on `/collection?avail=free&tool=fits-your-decks`, and the next card details opened halo
  `Find a deck for it` once.
- **About's shape (C1, C5, R2 gaps 9, 10, 12, 13, 14).** Tools is the absence of `?tab`; `?tab=reference` is mirrored
  through `mirrorUrl`. The visit is recorded when what's new is drawn (the Reference tab, or `#new`), not when `/about`
  loads. An opened Reference entry leads with its screen's frame and the entry's halo box. Each entry keeps its specimen
  until PR 7 retires them all at once, so no entry ever renders without a figure.
- **The ? (C4, E13, R2 gaps 5, 15 and 17).** The rail item sits above `OfflinePill` from `md`; the header press sits left
  of the account button below `md`. The panel is non-modal from `md`, a modal sheet below. The current screen is read
  from the path and, on a deck, from the tab and view in the URL. Card details stacking is R2 gap 5 exactly.
- **The tour (E18 to E22, R3 gaps 1, 4, 6, 13, 14).** `user_prefs.tour_seen_at timestamptz`, written once, only when null
  (`user_prefs` carries `user_data_touch`). Home's payload carries `tourDue` (`FIRST_RUN_TOUR_ENABLED` on, the checklist
  drawn, `tour_seen_at` null); the stamp moves on the write, so the cached key needs nothing new. The tour opens after
  the page settles plus `ARRIVE_MS` with nothing open over Home (`scrollLockCount`, `useMomentHold`), takes the visit
  through `takeVisit`, sets `inert` on the app root and renders `TourCard` (a modal dialog, Esc skips) outside it. The
  theme step renders `ThemePicker` with `panel="tour"`. `Read the note ›` opens PR 6's note dialog or sheet.
  `tour_seen_at` is purged with `user_prefs`, so the purge needs nothing new.
- **Doors and nudges (E23 to E26, R3 gaps 3, 7 to 12).** `DecksZeroActions` (`src/components/decks/decks-zero.tsx`) and the commanders `GuidedBanner`
  (`src/components/commanders/guided-banner.tsx`) take `helpMeChoose:
  boolean`. The role cell's dash slot takes `onSuggest` under `tuningEnabled(env)` on a deck at its body size, and
  `consider →` keeps the slot when a shelf exists. `builder-shell` draws `balance mana →` and `Proposed cuts →` each on
  its own switch; with the hub off each lands on the directly mounted panel, or `AnalysisEmpty` with no reading held.
  `MoneyCard` takes `overLimit: { count, limit } | null`, counted with `isOverLimit` over the rows `decklist.tsx`
  already uses, under `swapToolsEnabled(env)`. N1 and N3 land through `useToolLanding` (`?tool=suggested-changes`,
  `?tool=stand-ins`).

No model call is added anywhere in this plan, so it carries no spend.

## PR boundaries

No stacking: each PR branches from `main` after the PRs it depends on merge. Each stays under about 20 files and 800
lines of reviewable change. Generated images and `shots.generated.ts` are counted apart and reviewed through the contact
sheet. Every PR runs `/copy-review` on the strings it ships first, from the handoff's copy files and with the audits'
copy gaps (R2 gaps 2 and 14, R3 gaps 9, 10 and 16).

| PR | Scope | Depends on | Files (est.) |
|---|---|---|---|
| R2·1 · Entries | the three switches in the registry; `aboutEntries` in its own module; `screen` and `view` on all 71 entries, with a test that each has one; text search; `GET /api/about/entries`; the client-graph rule; E16 (`1 credit per run`); `src/lib/copy/discovery.ts` | — | ~14 |
| R2·2 · Targets and the landing on a deck | `targets.ts`, `TargetsProvider`, `useTarget` inside `useMomentAnchor`; `tools.ts`; `useToolLanding` on the deck page; targets for Top off, Proposed cuts, Suggested changes, Mana Balance, Cheaper stand-ins, Friends' spares, Matchups and Stats for your decks | R2·1 | ~16 |
| R2·3 · The landing on pages, and fits | the landing on Help me choose, Precons, Wishlist, Upload, Friends and `/collection` (Find a deck); `loadToolFits` and each tool's `fits`, with partner-deck and deck-gone tests | R2·2 | ~16 |
| R2·4 · The screenshot set | `about-fixtures.mts`, `pnpm capture:about`, the six-theme capture, `shots.generated.ts`, the budget and coverage tests | R2·1 | ~6 plus images |
| R2·5 · Tools | About's tabs; `ToolCard` in its five states; the five groups at 1280 and the phone's sideways rows; Written for you; the visit recorded on the Reference only | R2·3, R2·4 | ~14 |
| R2·6 · Reference | entries by screen with the screens index; an opened entry with its frame; what's new; search over text; How it works last; the note as the last row, its dialog and sheet (E17); the banner's new target (E14) | R2·5 | ~16 |
| R2·7 · Retire the specimens | the specimen figures and `src/lib/about/fixtures.ts` go, with their tests (R2 gap 9) | R2·6 | deletions |
| R2·8 · The ? | the rail item and the header press; the panel and the sheet; Elsewhere chips; Show me; search, none and `Nothing in About is about this screen yet.` | R2·6 | ~14 |
| R2·9 · The ? over card details | R2 gap 5's stack at `md` and up: the inert exemption, the layering, the Tab stop, the focus hand-off and Escape | R2·8 | ~6 |
| R3·1 · The tour | migration `tour_seen_at`; the spend action; `tourDue` in Home's payload; the SVG overlay; `TourCard`; steps 1 to 6 on first-run Home, with step 6's fallback; `ThemePicker` `panel="tour"`; the visit taken | R2·4, R2·6 | ~16 |
| R3·2 · The tour again | `/?tour=1`; the real-app stops (decision 6); both `Take the tour` presses, About's head and the account menu row | R3·1 | ~8 |
| R3·3 · Friends on the checklist | the shipped Friends section on the checklist where the addendum places it; step 6's sentence and second light | R3·1, the Friends Home PR | ~5 |
| R3·4 · Doors | E1 on `/decks` and Home, E2 on `/commanders`, M12's anchor moved to E2's door, and the moments plan's M12 row updated | R2·1 | ~8 |
| R3·5 · Nudges | N1, N2 and N2b on their own switches, N3 with its no-wrap test at 390 | R2·2 | ~12 |

**Build order.** R2·1, then R2·2 and R2·4 in parallel, then R2·3, R2·5 and R2·6 in turn, then R2·7 and R2·8 in
parallel, then R2·9. R3·4 can run any time after R2·1; R3·5 any time after R2·2 (R3 gap 11: its landings come from
R2·2). R3·1 follows R2·6, then R3·2. R3·3 follows R3·1 and the Friends Home PR, whichever lands last.

## Review focus

The conditions most likely to bite a reader that no single PR's happy path exercises. Each one gets its test in the PR
named.

1. **Every switch off, one at a time** (R2·5, R2·8, R3·1, R3·5): a tool's card absent and its group shrinking or gone;
   About exactly as shipped with `ABOUT_TOOLS_ENABLED` off; no ? with `HELP_PANEL_ENABLED` off; no tour, no row and no
   press with `FIRST_RUN_TOUR_ENABLED` off; each nudge's slot as shipped.
2. **A partner deck** (R2·3, R3·5): a 98-card body is full for Top off's fits and for N1, never "under".
3. **A stale `?tool=`** (R2·2): an unknown id, a switch now off, a deck deleted or not the reader's. Each is stripped,
   draws no halo and writes nothing.
4. **The tour against the rest of the page** (R3·1): a sheet open at load waits; a moment never arrives the same visit;
   reduced motion cuts both the cutout and the card; a reload spends it; a theme selected then skipped keeps the theme.
5. **A reader in a theme with no capture** (R2·4): reads the default theme's image rather than a broken one, and the
   coverage test fails the build before that can ship for a known theme.

## Inventory

`docs/superpowers/inventories/discovery-r2-r3.json`, written in R2·1 and filled in as each PR lands:

| Route / surface | Layer | 390 | 1300 |
|---|---|---|---|
| `/about` Tools, every group, the five card states | showcase | ☐ | ☐ |
| `/about?tab=reference`, closed, an entry open, search with and without results | reference | ☐ | ☐ |
| the note dialog / sheet | reference | ☐ | ☐ |
| the ? on Home, a deck (each tab), Shopping, Collection, a screen with no entries | ? | ☐ | ☐ |
| the ? over card details | ? | — | ☐ |
| a deck after `?tool=` for each deck tool | landing | ☐ | ☐ |
| first-run Home, tour steps 1 to 6, step 6's fallback | tour | ☐ | ☐ |
| the dashboard Home, the tour taken again | tour | ☐ | ☐ |
| `/decks` and Home with no decks; `/commanders` first run | doors | ☐ | ☐ |
| a deck's Recommended mix (N1, N2), Stats › Money (N3) | nudges | ☐ | ☐ |
| every row above with its switch off | all | ☐ | ☐ |

`shares`: `ToolCard` on Tools and nowhere else; the ? panel's rows and the Reference's rows from one component.

## About

None owed and no `ABOUT_VERSION` bump. New entries are paused until the line closes and are then written as one batch
(AGENTS.md, a multi-round line batches its entries). Whether the finished redesign is announced is decided then.

## Close-out

`design-review` against the handoff's R2 and R3 tables before each UI PR opens, and `feature-acceptance` per PR (a
contact sheet for the routes it touches) and at line close: the inventory walked at both widths with each switch on and
off, the screenshots checked in all six themes, and a tour run through to the end on a first-run fixture account and
taken again on a dashboard one. Every probe and capture writes only to a scratch branch, never staging or production.
Tell d9 as each PR merges.
