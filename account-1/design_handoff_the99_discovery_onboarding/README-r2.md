# The 99: Discovery and onboarding · R2, the showcase and About as a reference (design handoff)

`design_handoff_the99_discovery_onboarding/` · 2026-10-16 · account 1 · beside R1 (`README.md`)

**Status: R2b, approved by Hugh (2026-10-16), with Try it option C.** Source of truth: `docs/superpowers/design-briefs/2026-10-16-discovery-and-onboarding.md`
(main, #1914), §2 (the showcase), §4 (About becomes a reference) and §Proposed split, R2. It follows R1's moments (#1919).

The canvas is `The 99 - Discovery R2 · Showcase and reference` (Design artifact, account 1). Its files are in `r2/`:

- `Main.dc.html`: the calls.
- The boards: `Showcase`, `Tool-Card`, `Help-Deck`, `Help-Shopping`, `Help-Collection`, `Reference`, `Reference-Search` and `Links`.
- The parts every board mounts:
  - `ToolCard`, `HelpSheet`, `PhoneShot`
  - `ShowcaseDesk` / `ShowcasePhone`, `ReferenceDesk` / `ReferencePhone`
  - `DeckDesk`, `CollectionDesk`
  - `Rail`, `MobileHeader`, `TabBar`, `Moment`

**Theme.** Amonkhet (the default theme), because every screenshot is Hugh's staging, which runs it. R1's parts were re-mapped
token for token from Kaldheim.

**Screenshots.** Every phone frame and every showcase picture is a real capture of `staging.the-99.dev` at 390 (2x), taken
read-only from Hugh's account on 2026-10-16. The exceptions:

- Top off and Friends' spares are rebuilt from `src/` (G12).
- The 1280 deck page and Collection are rebuilt from `src/` as in R1 (G20).

## Brief locks, held

| Lock | How R2 holds it |
|---|---|
| Real screenshots, not illustrations or detached snippets | Every tool card is a crop of a real screen, with its control haloed. An opened Reference entry leads with the same kind of picture. |
| Quiet: the ? must not crowd a screen; the deck page is near overload | The ? lives in the app's chrome: the rail foot at 1280, the header at 390. No screen gains a control. |
| Every About entry follows its switch | The ? panel, the Reference and search all read `visibleEntries`. A tool behind an off switch has no card. |
| A tool behind an off switch is absent | No card; its group shrinks; a group left empty is not drawn (T3 note, L2). |
| A tool whose moment was dismissed still appears | Drawn like any other card (C2, L2). |
| How it works stays inside the reference | It is the Reference's last section, its links both ways unchanged (R1, C5). |
| Wording goes to /copy-review | Every new string is a placeholder in `discovery-r2 · copy strings.ts`. |
| Credit tools are never pressed for the reader | Try it lands on the tile (T3). |

## The calls

### C1 · About's new shape: two tabs

- **Tools** (the default) and **Reference**, as tabs on `/about`.
- The account menu's `About The 99` still opens About, on Tools. No row is added anywhere.
- The letter is now `A note from the creator` (R2b, below).
- The four chapters give way to screens in the Reference. Chapters are the order a reader learns the app; screens are where they stand when they need it. Hugh's complaint was snippets without context, and the screen is the context.

### C2 · The showcase: 14 tools in 5 groups (§Open: which tools, order, grouping)

| Group | Tools |
|---|---|
| Start a deck | Help me choose · Precons |
| Tune it | Top off · Proposed cuts · Suggested changes · Mana Balance |
| Buy smarter | Cheaper stand-ins · Friends' spares |
| Use what you own | Find a deck · Wishlist · Collection Sync |
| Play | Matchups · Stats for your decks · Friends and pods |

- **Which tools.** A tool is something a reader presses to get an answer. Marks and states (Card assignments, availability, bracket marks, combos) stay in the Reference, where the ? finds them on the screen that draws them.
- **The order** is a deck's life, the same order R1's tie rule uses.
- **The card.** A real screenshot cropped 3:2 around the control with R1's halo on it; the surround dimmed 28%. Then:
  - the name and a cost chip (only where the app already shows a cost, G13);
  - one line on what it is for;
  - Try it;
  - `How it works ›`, which opens the entry in the Reference.
- **Layout.**
  - 1280: three columns of 354, cards 530 tall.
  - 390: one sideways row per group, cards 300 wide by 460 tall, with the next card peeking. A group count reads `4 · swipe`.

### C3 · Try it on your deck (§Open)

- **Which deck.** The whole card is the press (R2b, option C), and its footer names the deck it opens: the fitting deck the reader opened most recently (E10).
  - When several decks fit, the footer says so (`Opens HD - Kratos · +2`); there is no menu on the card.
- **Where it lands.** On the deck (or the tool's own page), with the tool named in the address.
  - The page scrolls the control into view and gives it R1's halo for 2.4 seconds, with no bubble.
  - The parameter is then stripped through `mirrorUrl`.
- **Credit tools** land on their tile, and nothing is run for the reader.
- **Moments.** Landing through Try it spends that tool's R1 moment.
- **No deck fits.** The press is replaced by one line saying what the tool needs, in a dashed box. When there is somewhere useful to go, a door follows; `How it works ›` is always there. On Hugh's account:
  - Top off: "Needs a deck under 99. All 21 of yours are full." No door.
  - Friends' spares: "Needs a friend with a spare of a card you’re missing. Colin has none right now." `Open Friends →`.
- **Tools that need no deck** name where they go instead: `Open Help me choose →`, `Browse precons →`, `Open your wishlist →`, `Upload a file →`, `Open Friends →`.

### C4 · The ? on every screen (§Open)

- **Where it sits.** In the chrome, so no screen gains a control.
  - 1280: a 38px rail item at the rail's foot, above the account button, drawn like the nav items.
  - 390: a 44px press in the header, left of the account button. The header is not sticky, so the ? scrolls away with it, exactly as the account button does (G15).
- **What it opens.** This screen's entries:
  - 1280: a non-modal panel 400 wide from the right edge, leaving the page usable.
  - 390: a modal sheet over a 62% scrim, 684 tall with a grabber.
  - The ? holds its pressed state while open.
- **On the deck page** it opens the entries of the tab and view in view. Your deck, Shopping, Stats, Notes, Analysis, Games and Versions each list their own. The others sit under `Elsewhere on this deck` as chips with counts, and a chip swaps the list in place.
- **A row** shows the title and the caption's first sentence.
  - Pressing it opens it in place: the rest of the first paragraph, up to two key lines, and `Read the whole entry ›`. One row is open at a time.
- **`Show me`** appears only when the entry's control is on screen now.
  - It closes the panel, scrolls to the control and halos it for 2.4 seconds, with no bubble. It never presses the control.
- **Search** (`Search all of About`) covers every entry on every screen. Results name their screen and mark the word. With none, the panel says so and offers `See every entry →`.
- **Footer:** `Tools ›` and `All of About ›`.

### C5 · The Reference (§Open: the full list, search)

- **Layout.**
  - Every entry by screen, 21 screens in the order a reader meets them, one line each until opened.
  - 1280: a screens index (with How it works) sits beside the list.
  - 390: each screen is a row that opens.
- **An opened entry** leads with a real screenshot of its screen, its control haloed. Then come the caption and keys as shipped. An entry that is also in Tools carries `in Tools` and keeps its Try it.
- **What's new** stays at the top, as the shipped `N new since your last visit`.
- **Search** now reads titles and text. Today it reads titles only (`Search reads entry titles only.`, G17). What's new hides while a search is open.
- **How it works** stays the last section, inside the Reference.

### C6 · How the places link (§Open)

- **The Home banner's `Show me`**, today `/about`, opens:
  - the Reference at what's new, for a returning reader;
  - Tools, for a brand-new account (G18).
- **The ? leads to** the control, the entry, the top of the Reference and Tools.
- **Tools leads to** a deck, the entry and the Reference.
- **The Reference leads to** a deck, How it works and Tools.
- **R1's moments** point at their control only; the ? on that screen lists the tool's entry.
- Board L2 lists every end and what is there instead of a dead end.

## R2b · after Hugh's notes (2026-10-16)

- **Try it, four ways** (`r2/Try-Options.dc.html`). R2's outlined press was heavy and read as a second thing to look at. The board draws four options across the five states a card can be in (one deck fits, several fit, none fits, none fits with a door, needs no deck), at 354 and 300:
  - **A.** R2 as drawn, kept for comparison.
  - **B.** A footer line: `Try it →` in the accent, then the deck in mono (a menu when several fit), and How it works.
  - **C.** The whole card is the press. The footer says where it opens, with an arrow in a ring; How it works stays its own press. There is no deck menu.
  - **D.** A `Try it →` chip on the picture's top-right corner.
  - **C is chosen** (Hugh, 2026-10-16), and every board now draws it. Making the card the press removes the second focal point, gives the phone its largest target, and still names the deck. What it gives up is choosing another deck from the card: the footer's `+N` says others fit, and the tool works on any deck once opened.
  - An opened Reference entry keeps a text press, `Try it on HD - Gishath` with the same ringed arrow, because a Reference row is not a card.
- **The drawer stays** as drawn (H1–H3).
- **A note from the creator** (`r2/Note.dc.html`).
  - The app names no one outside the note itself, so the letter is titled `A note from the creator`; the signature stays inside it.
  - It leaves the top of About. It is the last row of the Reference, after How it works, and it opens as a dialog (1280) or a sheet (390).
  - A new player meets it once, as the last step of the first-run tour; that step is drawn in R3.
  - The text (`aboutCopy.pageIntro`) is unchanged.
- **Written for you.** Tools gains a sixth section that groups everything that uses credits.
  - The five spenders, from the credits entry: the Overview, Suggested changes, Look deeper, Help me choose with "Anything else?", and Which deck needs it most?
  - Each has where it lives, one line, and its cost: `1 credit each`, `1 credit per run`, `per look`, `per search`, `per read`.
  - It closes with the free line from the credits entry and `How credits work ›`. Each spender follows its own switch, as the credits entry's lines do.
  - Buying credits joins this section with the payments designs; nothing about buying is drawn here.
- **`1 credit per run`.** It replaces `1 credit a run` on the card and in the copy. The shipped Tuning tile still reads `1 credit a run`, so the plan changes it too (E16).

## Screens: every entry's `screen` (E8)

| Screen | Entries |
|---|---|
| Home | ready-to-build, resume, commitments |
| Collection · Cards | browse, availability, collection-add, added-copy, start-without-a-collection, remove-card, card-marks, combo-awareness |
| Card details | card-detail, edit-copies, fits-your-decks, find-a-deck-read |
| Collection · Sets / Proxies / History / Wishlist | sets / proxies / collection-history / wishlist |
| Upload a file | import, upload-choice, post-import, import-issues |
| Commanders | commander-lane, fit-score, role-coverage, commander-availability |
| Discover | discover |
| New deck and precons | new-deck, help-me-choose, precons, upcoming-precons, deck-import, partners |
| Decks | statuses, folders, decks-stats, all-decks-cart |
| A deck · Your deck | deck-page, decklist-marks, roles, informed-build, auto-fill, locked-cards, add-cards, decklist-order, undo-removal, change-commander, export, deck-printings, deck-tokens |
| A deck · Shopping | shopping, buy-tag, stand-ins, friend-spares, shopping-got-it |
| A deck · Stats / Notes | deck-stats / notes |
| A deck · Analysis | deck-analysis, deck-benchmarks, suggested-changes, proposed-cuts, mana-balance, credits |
| A deck · Games | log-a-game, log-findings, opponents |
| A deck · Versions | versions, review-and-commit |
| Friends | friends |
| Account menu | themes |

71 entries, each on exactly one screen. A reader standing somewhere else finds it by search.

## About entries

No new entry. R2 changes how About is shaped and reached, and every entry stays as it is. Whether the new shape is announced
with an `ABOUT_VERSION` bump is Hugh's call (G19).

## Gaps for Hugh and the plan

- **G22 · Try it.** Settled: C.
- **G23 · The note in onboarding** is drawn in R3. Until R3 ships, the Reference row is its only way in.

- **G11 · One theme for screenshots.** The shipped pictures are captured in the default theme (Amonkhet). A reader in another theme sees Amonkhet pictures in a frame. The alternative is capturing every tool in all six themes. Hugh's call.
- **G12 · Two pictures are rebuilds.** Hugh's staging has no deck under 99 and no friend with a spare. Top off's and Friends' spares' pictures are rebuilt from `src/` and are captured for real at build (E9).
- **G13 · Cost chips.** Drawn only where the app already shows a cost: Top off, Proposed cuts and Mana Balance `free`, and Suggested changes `1 credit per run`. Help me choose, Find a deck and the others draw none until engineering confirms what they cost.
- **G14 · Collection Sync's control appears after a file is read.** Its card shows the upload page with the drop zone haloed, and Try it is `Upload a file →`.
  - With no earlier upload (the base Sync needs), the card says so and still offers the upload.
- **G15 · The ? scrolls away on the phone.** It sits in the header, which is not sticky. Putting it in the deck's sticky add bar would add to the deck page, which the brief rules out.
- **G16 · One screen per entry.** Shopping for all your decks lives on Decks, where its door is, and Help me choose under New deck. A reader elsewhere finds them by search.
- **G17 · Search reads text.** This changes the shipped `Search reads entry titles only.`, and the ? panel's search is the same search.
- **G18 · The banner's target moves** from `/about` to the Reference's what's new (returning) or Tools (new account). The banner's words are unchanged.
- **G19 · `ABOUT_VERSION`.** No new entry, so no bump is owed by the rule. A bump would put the new About in front of every account once. Hugh's call.
- **G20 · Mixed sources in the ? boards.** The 1280 deck page and Collection are R1's rebuilds (Sai's Workshop, from `src/`). The 390 frames are real captures of Hugh's decks.
- **G21 · A screen with no entries** (the all-decks cart, a friend's page). The panel says `Nothing in About is about this screen yet.` above its search and `All of About ›`. It is listed in L2, not drawn.

## Not done this round

- R3: the tour, the tools where the need is, and each empty state.
- Themes other than Amonkhet are not reviewed. Every part uses tokens every theme declares.
