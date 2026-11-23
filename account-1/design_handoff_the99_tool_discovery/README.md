# Finding the tools · R1

Account 1, 2026-11-23. Status: **R1, for Hugh's review.** Canvas (Design type): https://claude.ai/artifact/V8o2BWkvp4pL8hnqkWM6k3 (Main, Find, Tuning, Welcome).

A workshop round: three questions about whether players find the app's tools, answered before any build. The prompt: a
newer player said *"I have a bunch of cards I want to add to my other decks, but I don't know where to go."* They found
neither Suggested changes (the Analysis tab's Tuning hub, under the whole reading) nor Find a deck (a link inside a card's
details) without being shown.

Read with: `design_handoff_the99_tuning_hub` (the hub), `design_handoff_the99_swap_tools` (Find a deck, the door),
`design_handoff_the99_welcome_credits` (strip and sheet), `design_handoff_the99_discovery` (Try it, moments, the tour),
`design_handoff_the99_you_have_it` (the call-out and switch pattern this round reuses).
Source of truth on main 7563036: `src/lib/decks/builder-tab-specs.ts`, `src/components/decks/tuning-hub.tsx`,
`src/components/cards/fits-door.tsx`, `src/components/welcome/welcome-strip.tsx`, `where-credits-work.tsx`.

## Calls

1. **Q1 · Find a deck lives where your cards are.** `/collection`'s Cards tab, under the filter chassis:
   - A call-out, the deck page's to-do card row as a statement (you-have-it R3's `HaveCalloutR3`): eyebrow `Find a deck`,
     the door's two-diamond glyph in the mark tile, `212 of your cards are in no deck` /
     `Narrow to them, then press a card’s two diamonds to see which of your decks it fits.` A bare ✕ closes it for good,
     per account, as the welcome strip's does. Drawn while the reader has a deck and the Availability filter's Free count
     is above zero (the count the filter already reads; no new query).
   - Under it the shipped `SegmentedSwitch` (radio, neutral, compact): `All · 2,926` / `In no deck · 212`. It is the
     Availability filter's Free option, not a second filter: choosing it sets `availability: ["free"]` (chip and all),
     clearing the chip or choosing All clears it. Shown only while Free is alone or nothing is set; any other filter
     hides the switch, and the chips say what is on.
   - While the list is narrowed to Free alone (by the switch or the filter menu, the call-out closed or not), every grid
     tile draws the **Find a deck press**: the #3202 tile press (26px box over the caption's lower right, `TOUCH_HIT` 44px)
     with the door's glyph. The name line yields the press's room (`padding-right` 32 / 40) so names truncate clear of it.
     The press opens the card window straight on the shipped Find a deck view; its back press is the card's details.
   - Not on All: most of a collection is in no deck, and 2,000 glyphs would be noise.
   - Unchanged: the door in card details, its M8 moment, the view, Add / Add to buy, Which deck needs it most?.
   - Every Try it for Find a deck (`tools.ts` lands `/collection?avail=free`) now arrives on the presses: About's Tools
     tab, the tour, and the welcome sheet (call 3).
2. **Q2 · Tuning gets a tab, Consider moves into it** (the idea on the table, taken):
   - Tabs: `Your deck · Analysis · Tuning · Games · Versions`. Still five, so the phone row scrolls as it does today, and
     Versions stays the one behind the scroll. Tuning is always drawn (the hub draws for any deck). No count, like Analysis.
   - The Tuning tab is the shipped `TuningHub`, unchanged in behavior: tiles, a tool opens in place, the desktop underline
     row, the phone's `‹ Tuning` and `N of 5 tools`. Its `Tuning` h2 becomes `sr-only` (the tab names the panel) and its
     top rule goes.
   - **Consider is the hub's first tool**, a tile spanning both columns from md: mark (three cards, the middle lifted), `Consider`,
     `free`, `Cards that fill what this deck is short of, the ones you own first.`, status `14 you own · 26 to buy` (the
     panel's own owned and unowned counts). It opens the shipped `ConsiderPanel` in place.
   - Analysis keeps the reading (verdict, Overview, strategy, bracket, findings). The hub leaves its foot.
   - Every way in retargets: the to-do card's `Cuts`, the land cell's `balance mana →`, the role cells' `consider →`
     (Tuning with Consider open), the Games tab's link, `tools.ts` lands (`top-off` stays Your deck; `proposed-cuts`,
     `suggested-changes`, `mana-balance` land `tuning`), `?view=consider` maps to Tuning with Consider open.
   - Why a tab and not a link: the tab row is the one thing every deck visit shows, and the player's question ("where do
     I go to change this deck") now has one answer. Merging Consider keeps the row at five and gathers every
     change-this-deck tool: add (Consider), swap (Suggested changes), balance (Mana Balance), trim (Proposed cuts), the record (History).
3. **Q3 · The welcome credits point at the tools.**
   - Home's strip is unchanged.
   - Where credits work: **every row has Try it.** Overview lands on a deck's Analysis tab (the most recently touched deck,
     as the resolver picks for the others); Which deck needs it most? lands on `/collection?avail=free`.
   - Where lines: Suggested changes and Proposed cuts read `A deck’s Tuning tab`; Which deck needs it most? reads
     `A card in no deck`. Overview keeps `A deck’s Analysis tab`.
   - **A free block** before the teaser, in the sheet's shipped reason-line form (diamond, mono 11): `Free, no credit needed`,
     then `Consider` · `A deck’s Tuning tab` and `Find a deck` · `A card in no deck`, each with a `free` pill and Try it.
     The same block on the /credits Welcome cell's sheet. `locked` shape: under the lock line with no Try it; `noDeck`
     shape: under the reason line, no Try it (both need a deck).
4. **Phone and desktop:** one design.

## Open questions (Hugh)

- **Q1 · Does Tuning open straight on Consider while a deck is short?** A (drawn, recommended): the tab always lands on
  the tiles. B: under size it lands on Consider open. Board: Tuning, T1 and T2.
- **Q2 · Keep the free block in Where credits work?** A (drawn, recommended): keep. B: spenders only. Board: Welcome, S1.
- **Q3 · One word for the filter.** A (recommended): rename the Availability option and chip `Free` to `In no deck`
  (switch, menu and chip read the same). B: the switch says `Free`. Board: Find, C1 (drawn with the shipped `Free` chip).

## Files

| File | What |
|---|---|
| `Main.dc.html` | The three answers, the open questions |
| `Find.dc.html` | C0–C2 desktop and phone: call-out and switch, narrowed with presses, the press opens Find a deck |
| `Tuning.dc.html` | T0 today's tab row; T1 the Tuning tab; T2 Consider open in it |
| `Welcome.dc.html` | H0 Home's strip (unchanged); S0 the sheet today; S1 proposed |
| `STATES.md` · `copy strings.ts` · `READINESS.md` | Every state, every new string, the gaps |
| `art/td-*.webp` | The frames (2x), rendered from main 7563036 |
| `scratch-gen/` | How the frames were made (`HOW.md`). Reference only; never import. |
