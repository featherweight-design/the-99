# Finding the tools · R10

Account 1, 2026-11-23. Status: **R10, for Hugh's review.** Canvas (Design type): https://claude.ai/artifact/V8o2BWkvp4pL8hnqkWM6k3 (Main, Show all, Calmer Home, Order and first run, Home in full, Ask, Find, Tuning, Welcome).

**R10 (Hugh's R9 note, 2026-11-23):** Show all no longer expands What's new in place (10+ items would stretch the
rail). The rail and the phone column keep five rows; Show all N opens a sheet: 460px from the right on desktop over a
scrim, full screen on a phone. Head: What's new, the count, a bare ✕, kind chips with counts. Body: Today, This week,
Earlier. Fixed foot: Past announcements, Choose notifications, Clear all (Q15).

**R9 (Hugh's R8 notes, 2026-11-23):** checked against two screenshots of a live Home. The fixture now draws What's
new's foot (Past announcements, Clear all, Show all N), deck pills, bracket marks and copies to buy, five friends, the
reader's face and the Fan Content notice. Seat art on Tonight's table and Game to log. Game to log's ✕ moves to the
card's top right at every width (its CTA sits like Open the table). `Choose your notifications` becomes `Choose
notifications`, which fits beside the What's new heading in the desktop rail.

**R8 (Hugh's R7 notes, 2026-11-23):** Q11 A and Q12 A settled (credits in the panel's foot, What's new under the lead; no
search on first run). On top of A: What's new moves to the top of the empty desktop rail (Q13), and Home's section
headings move from 10px faint mono labels to the display face with the accent diamond (Q14).

**R7 (Hugh's R6 notes, 2026-11-23):** a busy Home buries What's new (last block) and the welcome credits (a thin strip
between two loud blocks). Three orders drawn (Q11): A folds the credits into the search panel's foot and moves What's
new up under the lead (recommended); B puts notifications first, then the panel; C swaps the panel for a field in the
page head. First run (Q12): A waits for the collection (recommended), B adds a Look up any card row to the checklist.

**R6 (Hugh's R5 notes, 2026-11-23):** the panel drawn in Home's full company on a busy day: the arrivals banner, an open
Rule 0 table, a game to log, the welcome strip, the lead story, decks, What's new with unseen rows, Commitments, Friends
with a badge (board Home in full, H6). It sets the panel's place on a busy day (Q10).

**R5 (Hugh's R4 notes, 2026-11-23):** Home's search was easy to miss, and what a press did was unclear. It becomes a panel
(call 5, Home): an accent edge, a title and line, a 52px field, and a fan of the reader's own cards under a search lens. On
desktop the answers open in place under the panel's field (Q9 A, recommended); on a phone a tap opens the same full-screen
sheet as the magnifier.

**R4 (Hugh's R3 notes, 2026-11-23):** rows redrawn over the full shipped row (marks, combo, foil, pips, dates); the phone's
row button becomes a strip under the row (Q8). Home's search stays for good, first under the page head. No model call for Ask
(R3 Q6 settled). Call 5 sets down how card search and Ask share one field.

**R3 (Hugh's R2 notes, 2026-11-23):** the labelled Find a deck button is approved (R2 Q4, A); R3 draws it in row view, the
phone's default. Home's What you can do is withdrawn as too fixed to explore (R2 Q5 goes with it); call 5, Ask, replaces it:
the card search takes questions and answers with the tools, guided by starter questions, no model call.

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
   - **Row view (R4), over the full shipped row.** The phone's default view. Drawn sorted by Date added, as most
     collections are: copies, name, bracket marks, combo, foil, the date, the type line, cost pips, the set. In the Free
     view every row is free, so the shipped row draws no availability marker. A row is one button, so the control is its
     sibling, never nested:
     - **Phone:** a `Find a deck` strip under the row, inside its outline: 40px, full width, the glyph and the word, a
       `--border` hairline above, the row's bottom corners squared and the strip's rounded 7. The row keeps every cell and
       its whole name line. The call-out reads as the tiles': `Press Find a deck under a card…`.
     - **From md:** the button beside the row, the row's height, 136px, glyph and `Find a deck`, 6px from it; the row's
       chevron column stays. The call-out: `Press Find a deck beside a card…`.
     - Q8 B (drawn, not recommended): R3's 44px glyph button beside the phone row; names lose about ten characters.
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
4. **Withdrawn in R3: Home's What you can do** (R2). Too fixed: it offered three doors and no way to look further.
5. **Ask, in the card search (R3).** For a player new to Magic or to the app, who skips the welcome strip:
   - The shipped card search (the magnifier on every screen, ⌘K and the rail slot on desktop) takes a question as well as a
     card name. Placeholder (and the field's name): `Search cards, or ask a question`.
   - **Nothing typed:** `Not sure where to go? Ask` and four starter questions, as 44px pills (34px in the desktop
     dropdown), above the shipped Recent cards (and above the empty state when there are none; under Add several when it
     draws). A press types the question into the field, so the answer appears as if they had typed it, and the reader
     learns the field takes questions.
     `Where can my spare cards go?` · `How do I make my deck better?` · `What can I build with my cards?` · `What should I buy next?`
   - **A question:** `Tools for this` above the card results, up to three tool answers, best first. Each is the search
     row's frame (72px phone, 58px desktop) with the tool's mark on the accent wash in place of the card, the tool's
     shipped name and About line (`showcaseCopy.tools`), its cost pill (`free`, `1 credit`), the reader's own number where
     the tool has one (`212 of your cards are in no deck`, `--accent-text`), and where it lands (mono 11, `--fg-faint`, ›).
     A press lands as Try it does (`tools.ts` `lands`); the arrow keys move through tools and cards as one list. When no
     card name matches, the cards part is one line, `No card names match.`, never the no-results box.
   - **Nothing matches:** `Nothing here answers that yet` / `Try one of these, or search a card by name.`, the starters,
     and `Every tool, in About ›` (About's Tools tab). Never a dead end.
   - **Matching:** no model. Each tool in the registry carries a phrase list (its name, its About line's words, and plain
     questions: "spare", "extra", "not in a deck", "make better", "improve", "build", "buy", "cheaper"...). A query of two
     or more words that hits a list draws that tool; a card-name hit always draws its cards too. Free, instant, works
     offline once loaded, and nothing typed leaves the page.
   - **Home (R5), for good, a panel:** first under the page head, above the welcome strip. Not flashy, but it reads as
     the page's first thing to do:
     - The panel: radius 12, a 1px edge of `--accent` mixed 55% into `--border`, a wash from 10% `--accent` at the left to
       `--surface` by 60%. Title `Not sure where to go?` (display, 21 from md, 19 on a phone), line `Ask a question, or look
       up any card.` (13.5, `--fg-muted`).
     - The field: 52px, `--bg` on the tinted panel, `--border-strong` edge, the glyph in `--accent`, `Search cards, or ask a
       question`, `⌘K` from md; 720px wide from 1180, short of the fan below it.
     - The fan: three of the reader's own cards (most recent adds, as Recent cards), tilted -14°, 0°, 14°, with an
       `--accent` lens over them; right of the panel from md, beside the title on a phone. Decorative (`aria-hidden`); with
       fewer than three cards it draws what there is, none with no art.
     - The four starters under the field: one row that scrolls sideways on a phone and wraps from md.
     - **What a press does (Hugh's R4 question).** Desktop: the panel's own field takes the typing, and the answers open in
       place under it (Q9 A): the shipped dropdown's surface (`--surface-raised`, the rail dropdown's shadow), the same
       listbox as the rail's search, and Esc or ✕ closes it back to the panel. Phone: a tap opens the same full-screen
       sheet as the magnifier, with the starter's question typed when a starter was pressed; there is no room in place on
       a phone. Either way it is one search state: one query, one listbox, one set of results.
   - It never retires; the magnifier and ⌘K stay on every screen.
   - **Its place on a busy day (R6, Q10 A).** Down the main column: the arrivals banner (spans both columns, as shipped),
     Rule 0's cards (a table, a game to log), then the panel, then the welcome strip and the lead. Things that run out
     come first; the panel is the first thing that is always there. With no table, no game to log and no banner, it is
     first under the page head. On a 390 phone on a busy day the panel starts at the fold.
   - **One field, two jobs (R4).** What keeps card search and Ask apart:
     - Card names that read as questions (`Where Ancients Tread`, `Ask Urza`, `Find the Path`, `What Must Be Done`): a
       card whose name equals the query or starts with it always ranks first, tools under it. Tools lead only when no card
       name starts with the query.
     - One word answers a tool only when it is the tool's own name (Wishlist, Tuning, Consider); otherwise a question needs
       two or more words to hit a phrase, so typing a name stays a card lookup.
     - Card results are every card, as shipped; tool answers are about the reader's own cards and decks, and carry their
       numbers to say so.
     - One combobox, one listbox with two labelled groups (`Tools for this`, the cards); ↑ ↓ move through both.
     - A question with no match says so and offers the starters and About; never the card no-results box.
     - The search event records which group a press came from (tool or card), never the text.
     - Why one field: a new player will not know which of two boxes to use, and the app's rule is one control per action.
6. **Phone and desktop:** one design.

## Open questions (Hugh)

Settled: Tuning always lands on its tiles (R1 Q1, A); the free block stays in Where credits work (R1 Q2, A); the labelled
button under each tile (R2 Q4, A); no model call for Ask (R3 Q6, A). Withdrawn: R1 Q3 (with the switch), R2 Q5 (with What
you can do), R3 Q7 (it asked whether Home's field should go away after three uses; it now stays for good).

- **Q8 · Phone rows: a Find a deck strip under each row, or the glyph beside it?** A (drawn, recommended): the strip.
  B: R3's 44px glyph button beside the row. Board: Find, R5 (A) and R4 (B).
- **Q15 · Show all: a sheet, or expand in place?** A (drawn, recommended): the sheet, with kind chips (only kinds
  present; All first) and day groups; Clear all clears what the chip shows; Esc, ✕ or the scrim closes, focus back to
  Show all. B: expand in place as shipped. Board: Show all.
- **Q13 · What's new in the desktop rail?** A (drawn, recommended): top of the rail above Commitments and Friends; rows
  draw as on a phone (action under the text); `Choose notifications` (R9) beside the heading as on a phone; the foot keeps one line. B:
  under the lead in the main column (R7 A). Phone unchanged either way. Board: Calmer Home.
- **Q14 · Stronger section headings?** A (drawn, recommended): What's new, Pick up where you left off, Friends and
  Commitments in the display face at 17px, `--fg`, led by the accent diamond (7px, rotated); counts in mono `--accent-text`;
  10px more above each; the deck list's `last touched` caption hidden below sm. B: the shipped 10px mono labels.
- **Q11 · (settled A)** How should a busy Home be ordered? A (recommended): the welcome credits become the panel's foot (the shipped
  strip, edge dropped, its ✕ closes only that line) and What's new moves under the lead story, decks after. B: Rule 0's
  cards, the lead and What's new, then the panel, then decks. C: no panel; a 40px accent-edged field in the page head,
  starters in its open state. Board: Order and first run.
- **Q12 · (settled A)** Does the first-run Home get search? A (recommended): no; first run keeps its one job, the starters all need a
  collection, step 1 already offers Add cards by hand, and the magnifier is there. The panel arrives with the first Home
  after the collection is read. B: an unnumbered `Look up any card` row after step 3, before Add your friends.
- **Q10 · On a busy day, does the panel sit under Rule 0's cards, or above them?** A (drawn, recommended): under them; a
  table closing tonight and a game to log come first. B: the panel first under the page head always. Board: Home in full.
- **Q9 · Desktop: does Home's field answer in place, or open the rail's search?** A (drawn, recommended): in place, under
  the panel's field, so the reader's eyes stay where they typed. B: the panel's field is a press that opens the rail's
  dropdown (R4's behaviour), whose list opens at the rail, away from where the reader pressed. Board: Ask, H4 and H5.

## Files

| File | What |
|---|---|
| `ShowAll.dc.html` | R10: Show all as a sheet, All and Price drops, desktop and phone |
| `Calm.dc.html` | R8, R9: R7 A against R9 (What's new in the rail, display headings), desktop and phone |
| `Order.dc.html` | R7: the busy Home three ways (A, B, C) on desktop and phone; first run with and without search |
| `Home.dc.html` | H6 Home in full on a busy day, desktop and phone, and desktop typed in place (R6) |
| `Main.dc.html` | What changed since R4, the answers, the open questions |
| `Ask.dc.html` | A0 nothing typed, A1 a question, A3 nothing matches (desktop dropdown and phone sheet); H4 Home's search panel (R5), H5 desktop answering in place; H3 R4's field, kept for the record |
| `Find.dc.html` | F0–F2 desktop and phone: the call-out with Show them, Free with a button under each tile, the button opens Find a deck; R5 / R4 the row view over the full row (Q8 A / B) |
| `Tuning.dc.html` | T0 today's tab row; T1 the Tuning tab; T2 Consider open in it |
| `Welcome.dc.html` | H0 Home's strip (unchanged); S0 the sheet today; S1 proposed |
| `STATES.md` · `copy strings.ts` · `READINESS.md` | Every state, every new string, the gaps |
| `art/td-*.webp` | The frames (2x), rendered from main 7563036. `td-*-c0..c2` (R1's Find) and `td-*-h1` (R2's What you can do), `td-*-r1` and `td-*-h2` (R3) are kept for the record. |
| `scratch-gen/src-patches/` | R9: `home-log-card.tsx` with the ✕ moved (the one line changed in `Hide`'s className) |
| `scratch-gen/` | How the frames were made (`HOW.md`). Reference only; never import. |
