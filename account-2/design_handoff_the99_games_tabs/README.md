# Games tabs redesign · R1 (2026-11-25, account 2)

Hugh's ask: redesign Decks › Games and Deck details › Games (rows hard to read), and replace the native selects on
Decks › Games with custom components. R1 = three concepts; Hugh picks one, R2 fleshes it out.

Canvas: https://claude.ai/artifact/8pkTj22gDkKYCHQG6DR8n9 (Main, Filters, A/B/C × Desktop/Phone).

## Feedback → answers
1. Trophy placement · A: badge pinned to the winner's seat tile corner · B: own "Won by" column · C: winner in the row headline ("Lost to Peter"), badge on their face.
2. "vs" offset · all three drop the vs line (A seat grid, B "At the table" column, C face stack + sheet).
3. Floating version · stamped with the deck (A deck tile, B under deck name, C subline / sheet seat).
4. No grouping · A three bands per game, marks split Helped / Hurt · B strict columns with a header row per month · C one-line rows, details grouped in the game sheet.
5. Month headings · all: each month is a box (SectionPanel PANEL) whose band carries HomeSectionHead's type (◆, display 17px, mono count) + month record. Proposed app-wide (Keep, Matchups here; later Request history months, Friends sections, Stats).

## Shared: filters (Filters board, F1–F5)
- Deck: custom trigger (art stack, count) → anchored panel (desktop, search + rows with art + game counts + ✓) / Sheet (phone, 56px rows). Lists only decks with games; foot says how many are left out and why.
- Result: inline SegmentedSwitch Any · Won · Lost · Drawn (desktop view row; phone inside Filter games sheet).
- Played against: shipped anchored panel; trigger shows the picked face + name with ✕ to clear.
- F3 filters on: accent-edged triggers, filtered summary line.

## Concept C behaviour change
Rows open a game drawer (desktop) / sheet (phone) instead of jumping to the deck tab; cross-deck sheet has "Open on {deck} ›", deck tab sheet has Delete game (replaces the row ✕).

## Fixtures
Colin, Peter, Max, Chris; art crops already in the project (Gisa, Sai, Sokka, Omnath, Ghalta, Giada, Ishai, Bruse, Kilo). Chrome: rail/tab bar/top bar cropped from public/about/pages/amonkhet captures.

scratch-gen/gen_games.py writes the boards; shoot.js renders and measures them.

## R2 (2026-11-25): Headline rows + seats in the details (boards D-Desktop, D-Phone)
Hugh's R1 read: B is out; C's light rows + details are strong; A's seats are the most interesting (less faded).
- Row: deck art + result square, headline "Lost to [winner face] Peter" (face inline beside the name), subline deck + version + pod, date + chevron. No art wash (R2b, Hugh: heavy-handed). No marks tally on the row.
- Month band record: win share bar + counted W and L squares (zero side dimmed).
- Details (drawer desktop 460, sheet phone): A's seat tiles at 84px, art barely dimmed, winner ringed with a "🏆 Won" tag; Helped / Hurt groups and the note with no Marks/Note headings.
- Matchups: a commander only gets L when they won; a game somebody else won is a dashed "–" square (no placings are tracked). Squares sit in one fixed column (desktop) / under the name (phone). Trophy count column dropped (L now means they won). Key is three drawn squares, not a sentence.

## R3 (2026-11-25): back to A's Seats rows (boards E-Desktop, E-Phone)
Hugh: R2's headline rows still didn't land; A's rows are the favourite, and a drill-down isn't needed when a game's details are this sparse.
- Row: Lost/Won pill + pod · date, then the seat grid (5 across desktop, 2 phone), seat tiles 74px with art barely dimmed (R1 was too faded), "You" tile with deck + version stamp, winner ringed with a "🏆 Won" tag; Helped / Hurt groups; note. Cross-deck row › opens the deck's Games tab at that game (shipped); deck tab keeps the ✕.
- Kept from R2: month band record (win-share bar + counted W/L squares), Matchups fixes (L only for the winner, dashed – when someone else won, fixed squares column, no trophy count, three-square key).
