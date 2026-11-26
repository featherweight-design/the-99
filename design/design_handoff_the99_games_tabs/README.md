# The 99 · Games tabs redesign (account 2, 2026-11-25)

Canvas: https://claude.ai/artifact/8pkTj22gDkKYCHQG6DR8n9 (top row "Final"; rounds R1 to R6 below it)
Status: **APPROVED by Hugh 2026-11-25** after six rounds ("Alright, perfect, this LGTM").
design-assets: `account-2/design_handoff_the99_games_tabs/` (every round's boards and notes).

Hugh's ask: Decks › Games and Deck details › Games were hard to read. The trophy was awkwardly placed, the "vs" line
was offset, the version number floated, nothing was grouped, and the MONTH YEAR headings got lost (fix them the way
Home did, likely app-wide). The native `<select>`s on Decks › Games must become custom components.

To view a board, open it with `support.js` and `art/` beside it. `scratch-gen/gen_games.py <outdir>` writes every
round's boards (the final ones last); `scratch-gen/shoot.js` renders and measures them.

| Board | What |
|---|---|
| `Final-Desktop.dc.html` | Decks › Games (left) and Deck details › Games for HD - Sai (right) at desktop |
| `Final-Phone.dc.html` | The same two pages at phone |
| `Final-Matchups.dc.html` | Matchups with 14 of 20 games: Commander, Colors, Friend (desktop), Commander and Colors (phone) |
| `Tiles-24.dc.html` | How it's playing with 24 games and all 8 marks: desktop, phone closed, phone opened |
| `Filters.dc.html` | The custom filter components (F1 to F5) that replace the native selects |

Drawn over the shipped pages: `games-view.tsx`, `games-panel.tsx`, `game-history-row.tsx`, `game-seats.tsx`,
`game-matchups.tsx`, `game-axis-cell.tsx`, `games-filter-controls.tsx`, Home's `HomeSectionHead`, `social/section-panel.tsx`
(PANEL / BAND), `ui/segmented-switch.tsx`, and `decks/lineup/identity-mark.tsx`. Fixtures: Colin, Peter, Max, Chris.

## The design

### Sections are boxes (both tabs)
Every section is a box (SectionPanel PANEL) whose band carries Home's heading type (◆, Cinzel 17px, mono count). This
applies to the games summary, How it's playing, Matchups and each month. Hugh suggested taking this pattern app-wide
later; it is out of scope for this handoff.

- **Month box.** Band: "November 2026 · 4 games", and on the right the month's record as a win-share bar plus counted
  W and L squares (the zero side is dimmed).

### Games summary (both tabs)
A box at the top in place of the loose "7 games logged. 2–5." line. Band: "7 games logged · 4 decks" (deck tab: "3 games
logged · HD - Sai") with the record (win-share bar and W/L squares). Cells: **Pods** ("2 to 5 players"), **Played**
("Oct to Nov 2026") and **Last played**. The fourth cell differs by tab:
- On Decks › Games it is **Most played** (art, deck name, "3 of 7").
- On the deck tab it is the cream **Log a game** button, so the button no longer floats.

On phone the cells go two across, and Log a game spans the full width.

### Game rows (Seats)
- **Top line.** Won / Lost pill, then "3 players · Nov 19" in mono.
  - Decks › Games rows end in the words "Open {deck} ›" (phone: "Open deck ›"). This is the shipped jump to that game
    on its deck's Games tab, now in words instead of a bare ›.
  - Deck tab rows keep the ✕.
- **Seat grid.** One tile per seat, 5 across on desktop and 2 on phone, 74px tall, with commander art barely dimmed.
  - Your tile comes first and shows the deck name with its version stamp (v4).
  - An opponent's tile shows the name and commander. A friend with no commander logged shows initials and "No
    commander logged".
  - The winner's tile gets an accent ring and a "🏆 Won" tag in its corner.
- **Seat not logged.** Each missing seat, counted from the pod size, is a dashed tile, so a 5-player game with no
  opponents shows 4. The tile holds a filled figure (`--elevated` fill, solid `--border-dashed` outline, no "?") and reads
  "Someone" / "Seat not logged". There is no edit path, so the tile has no action.
- **Below the grid.** The "Helped" and "Hurt" mark groups, then the note. There are no "Marks" or "Note" headings.

### How it's playing (deck tab; replaces Keep)
- **Lead.** The shipped headline finding ("Mana is holding it back.", `deriveHeadline`) and one line beside it ("Marked
  against you in 8 of 14 games, and in 4 of the last 5."). "From your marks" is gone.
- **Tiles.** One tile per mark, never per game.
  - Order: Hurting first, then Both ways, then Helping.
  - Each tile has a status dot before the name (warning = hurting, success = helping, half and half = both ways).
  - Below the name: a row of dots for the last 10 games, oldest first (filled helped or hurt, hollow when not marked),
    and a count coloured by status: "down 8 of 14", "up 6 of 14", "4 up · 3 down".
  - Layout: 4 across on desktop and 2 across on phone, where the count sits under the dots.
- **How big it gets.** There are 8 marks at most (`axisCopy`), so desktop is 2 rows at most.
  - Phone shows the first 4 tiles, then a "Show N more" row that opens in place and becomes "Show fewer".
  - With 20+ games nothing grows: the dots stop at 10 and the count carries the total (`Tiles-24`).
- **Bottom of the box.** The key: helped / hurt / not marked, "last 10 games, oldest first". Then the footer:
  "Suggested changes uses these games to pick what to cut and add." with "Open Tuning ›".

### Matchups
- **Band.** "Matchups · 14 of 20 games", with the Commander / Colors / Friend SegmentedSwitch on the right on desktop
  and full width under the band on phone.
- **Desktop rows.** Thumb | name | "N games" | squares. The count sits before the squares, so rows don't stagger.
  - Phone keeps the squares under the name, with the count on the right.
- **Squares, one per game.**
  - **W**: you won.
  - **L**: *they* won. This is only given to the opponent who won.
  - Dashed **–**: someone else won. No placings are tracked, so a non-winner never takes a loss from you.
  - Past 10 games, the squares become counted squares: W 4 · L 5 · – 2.
  - The trophy count column is gone.
- **Thumbs.**
  - Commander: the commander's art.
  - Colors: the shipped **IdentityMark** (clustered pips, the same mark as Stats).
  - Friend: the art of the friend's most-played commander, or initials when there is none.
- **Key.** At the bottom of the box: W you won, L they won, – someone else won.

### Filters (Decks › Games)
- **Deck.** A custom trigger (art stack and name) opens an anchored panel on desktop (search, rows with art, game
  counts and ✓) or a Sheet on phone (56px rows).
  - Only decks with games are listed, and the panel's foot says how many are left out and why.
- **Result.** An inline SegmentedSwitch: Any · Won · Lost · Drawn. On phone it sits inside the Filter games sheet.
- **Played against.** The shipped anchored panel. The trigger shows the picked face and name, with ✕ to clear.
- **Filters on.** Accent-edged triggers, the filtered summary line, and "Clear all filters".

## For the build
- **Matchups rule change (engineering).** Today every opponent in a lost game gets an L. Under the new rule, only the
  winner gets L, and the others get "–". This changes `game-matchups.tsx`'s tally and its tests.
- **How it's playing.** It needs each mark's per-game sequence (last 10) as well as the totals in `AxisTally`. The
  per-game marks are already on `DeckGame`, so the sequence can be derived where the tally is built.
- **Seat not logged** count is `pod size − 1 − logged opponents`.
- **Copy is DRAFT** for `/copy-review`. New strings:
  - "Someone" / "Seat not logged"
  - "N games logged · N decks"
  - Pods / Played / Last played / Most played
  - "down N of M" / "up N of M" / "N up · N down"
  - "last 10 games, oldest first"
  - "Show N more" / "Show fewer"
  - "Open {deck}"
  - "someone else won"

## Round history (canvas rows, oldest at the bottom)
- **R1.** Three concepts: A Seats, B Ledger, C Headline rows.
- **R2.** Headline rows with seats in a drawer.
- **R3.** Back to A's Seats rows. Hugh: they are the favourite, and a drill-down isn't needed for sparse details.
- **R4.** "Open {deck}" link words, unlogged seats, Keep → How it's playing, fuller Matchups.
- **R5.** Grounded summary box, one-list How it's playing, keys at the bottom, count before the squares.
- **R6.** Filled figure and IdentityMark on Colors. How it's playing: two-column list (A) vs tiles (B), and Hugh chose
  **tiles**. R6b showed tiles at 24 games.
