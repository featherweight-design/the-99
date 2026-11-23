# Finding the tools · R2

Account 1, 2026-11-23. Status: **R2, for Hugh's review.** Canvas (Design type): https://claude.ai/artifact/V8o2BWkvp4pL8hnqkWM6k3 (Main, Find, Home, Tuning, Welcome).

**R2 (Hugh's R1 notes, 2026-11-23):** Tuning and Welcome approved as drawn (R1 Q1 and Q2 settled, A). Find a deck redone: the
R1 switch duplicated the shipped Availability › Free filter, and the glyph press cut tile names short on a phone. New
call 4 answers the broader question (players new to Magic or the app, and the friend who skipped the welcome strip).

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

1. **Q1 · Find a deck lives where your cards are (R2).** `/collection`'s Cards tab, under the filter chassis:
   - **No switch.** The shipped Availability › `Free` option and chip are the one control. R1's `All / In no deck` switch is
     gone, and so is R1's Q3 (rename Free): the shipped word stays.
   - **On All, the call-out is the door to the filter.** The to-do card row as a statement (you-have-it R3's call-out):
     eyebrow `Find a deck`, the door's two diamonds in the mark tile, `212 of your cards are in no deck` /
     `See which of your decks each one could go in.`, and a ghost `Show them` (44px; inline at the line's end from md),
     which applies `availability: ["free"]`, chip and URL as the menu does. A bare ✕ closes it for good, per account.
     Drawn while the reader has a deck and the Free count is above zero (the count the menu already reads).
   - **On Free alone**, the same call-out without the button: `Press Find a deck under a card to see which of your decks it fits.`
   - **A labelled button under each tile** while the list is narrowed to Free alone: full tile width, 36px on a phone, 34px
     from md, `--surface` with `--border-strong`, radius 8, 6px under the tile; the door's two diamonds and `Find a deck`.
     The name keeps its whole line (no padding taken), and a reader who has never seen the glyph reads what it does. It
     opens the card window straight on the shipped Find a deck view; its back press is the card's details.
   - Not on All: most of a collection is in decks, and a button under every tile would be noise.
   - Unchanged: the door in card details, its M8 moment, the view, Add / Add to buy, Which deck needs it most?.
   - Every Try it for Find a deck (`tools.ts` lands `/collection?avail=free`) arrives on the buttons: About's Tools tab,
     the tour, the welcome sheet (call 3) and Home (call 4).
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
4. **Home says what you can do, in your words (R2).** For a player new to Magic or to the app, who skips the welcome strip:
   - A section on Home, under the welcome strip and above Pick up where you left off: eyebrow `What you can do`, a bare ✕.
     Goals in plain words, each with the player's own numbers, each row one press from the tool that answers it:
     - `Find a home for your spare cards` `free` · `212 of your cards are in no deck. See which of your decks each one fits.`
       → `/collection?avail=free` (call 1).
     - `Make Ashen Banner Parade better` `free to start` · `Cards you own that fill what it’s short of, then swaps and cuts.`
       → that deck's Tuning tab (the most recently touched deck, as the welcome sheet's resolver picks).
     - `Build another deck` `free` · `Commanders your cards can already lead, the closest first.` → `/commanders`.
   - Why it reaches the player who skipped the strip: it is page content, not a promo line; it names their cards and their
     deck; it says nothing about credits. The strip keeps the credits story.
   - A row draws only when it has something to say (no spares row at 0 in no deck; no tune row with no deck). A row leaves
     once its tool has been opened from anywhere; the section leaves with its last row; the ✕ closes it for good. At zero
     decks Home already draws its ways in, so the section waits for the first deck.
   - Mark tiles: the door's two diamonds, the Consider mark, the Commanders nav crown, on the call-out's accent wash.
   - Phone: one column of rows, the cost pill after the title. From 1180: three across in one bordered row.
5. **Phone and desktop:** one design.

## Open questions (Hugh)

Settled in R1: Tuning always lands on its tiles (R1 Q1, A); the free block stays in Where credits work (R1 Q2, A). R1 Q3
is withdrawn with the switch.

- **Q4 · In the Free view, a labelled button under each tile, or none?** A (drawn, recommended): the button. B: no
  button; a tile's own press opens Find a deck in the Free view, and the call-out says so. Board: Find, F1.
- **Q5 · Does What you can do retire row by row?** A (drawn, recommended): a row leaves once its tool is opened, the
  section with its last row. B: the rows stay until the ✕. Board: Home, H1.

## Files

| File | What |
|---|---|
| `Main.dc.html` | What changed since R1, the four answers, the open questions |
| `Find.dc.html` | F0–F2 desktop and phone (R2): the call-out with Show them, Free with a button under each tile, the button opens Find a deck |
| `Home.dc.html` | H1 desktop and phone: What you can do |
| `Tuning.dc.html` | T0 today's tab row; T1 the Tuning tab; T2 Consider open in it |
| `Welcome.dc.html` | H0 Home's strip (unchanged); S0 the sheet today; S1 proposed |
| `STATES.md` · `copy strings.ts` · `READINESS.md` | Every state, every new string, the gaps |
| `art/td-*.webp` | The frames (2x), rendered from main 7563036. `td-*-c0..c2` are R1's Find frames, kept for the record. |
| `scratch-gen/` | How the frames were made (`HOW.md`). Reference only; never import. |
