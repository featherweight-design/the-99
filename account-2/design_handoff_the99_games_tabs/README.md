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

## R4 (2026-11-25): building on Seats (boards G-Desktop, G-Phone, G-Matchups)
- Row link: the corner › (shipped jump to the game on its deck's Games tab) becomes words, "Open {deck} ›" (phone "Open deck ›"), on the row's top line. Deck tab rows keep the ✕.
- Unlogged seats: one dashed "Seat not logged" tile per missing seat, from the pod size (a 5-player game with no opponents shows 4). No edit path exists, so no "add" action.
- Keep → "How it's playing" box: band legend (helped / hurt / not marked dots); lead = the shipped headline finding ("Mana is holding it back.") + one line; Helping (tall column) | Hurting + Both ways stacked; each mark row = one pip per game oldest→newest + "up in 1 of 3" / "down in 2 of 3" / "1 up · 1 down". Watch/Mixed retired. Footer band: "Suggested changes uses these games to pick what to cut and add." + "Open Tuning ›".
- Page head: "3 games logged. 1–2." + facts, with Log a game as the cream primary on the right (phone full width under it).
- Matchups v3: squares follow a fixed 300px name column, count right after them ("3 games"), past ten games the squares become counted W / L / – squares; Colors rows lead with WUBRG pips and the identity letters; Friend rows lead with the friend's most-played commander art (initials when none). Band count "14 of 20 games".

## R5 (2026-11-25): grounded summary, one-list How it's playing, matchups tidy (boards H-Desktop, H-Phone, H-Fuller)
- Unlogged seats: dashed tile with an anonymous silhouette, "Someone" / "Seat not logged" (one per missing seat, from the pod size).
- Games summary grounded in a box (both tabs): band "7 games logged · 4 decks" + record (win-share bar, W/L squares); cells Pods, Played, Last played, and Most played (Decks › Games) or the Log a game cream button (deck tab, so it no longer floats).
- How it's playing = one list that scales: name | status (Hurting / Both ways / Helping, ordered that way) | one dot per game, oldest first, last 10 at most ("+N earlier" on desktop, hidden on phone) | count ("down in 8 of 14"). "From your marks" dropped. Lead finding + one line above; Open Tuning footer. H-Fuller shows it with 14 games.
- Keys: both boxes put their key in a row at the bottom of the box, above any footer.
- Matchups desktop: grid thumb | name | count | squares, so the game count sits left of the squares and rows don't stagger (phone unchanged). Colors rows use the Stats color pips (PIP_STYLE lettered squares, --w/u/b/r/g with --pip-ink-*).

## R6 (2026-11-25): compact How it's playing, filled figure, Stats identity mark (boards I-Desktop, I-Phone, I-Fuller)
- Seat not logged: the figure is filled (--elevated) with a solid --border-dashed outline; the "?" is gone. The tile keeps its dashed edge.
- Colors matchups lead with the shipped IdentityMark (decks/lineup/identity-mark.tsx: clustered 7px pips in a 26px box, dashed halo union), not lettered squares.
- How it's playing is tighter in both options: the lead finding and its line share one row; the status moves to a dot before the name, and the count is coloured by status ("down 8 of 14", "up 6 of 14", "4 up · 3 down"). Dots show the last 10 games; the key says so.
  - A (recommended): desktop splits the list into two columns of rows. Phone shows the top 3 rows (worst first) and a "Show N more" row.
  - B: tiles, 4 across on desktop and 2 on phone (top 4 on phone, then "Show N more").
- R6b (Hugh prefers B tiles, asked about 20+ games): tiles never grow with games. There is one tile per mark (8 axes in src/lib/copy/game-log.ts at most), each tile shows the last 10 dots, and the count carries the total ("down 14 of 24"). The most there can be is 2 rows on desktop, and 2 rows plus "Show 4 more" on phone. Board J-Tiles24.
