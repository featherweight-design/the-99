# The 99 — Find a deck for it, with a read (design handoff, R1)

`design/design_handoff_the99_find_a_deck_read/` · 2026-10-11 · mirrors `design_handoff_the99_tuning_hub/` (R3 shape)

**Status: R2, approved (LGTM, Hugh, 2026-10-11).** Build target: `The 99 - Find a Deck Read (R2).dc.html`. Hugh’s R1 feedback and the plan-source addendum are in “R2” at the end. R1 is kept as `The 99 - Find a Deck Read (R1).dc.html` with `Find a Deck View R1.dc.html`. Source of truth: `docs/superpowers/design-briefs/2026-10-11-find-a-deck-read.md` (main). Hugh’s two rulings, the orchestrator’s eight defaults and engineering’s ten locks are taken as given. This round answers §“What Design owns” 1–11 and Open questions 1–6.

Read alongside (main): `src/components/cards/{fits-picker,fits-door,card-modal,card-detail-provider}.tsx`, `src/lib/copy/{swap-tools,credits}.ts`, `src/components/intake/choose-results.tsx`, `src/components/decks/cuts-panel.tsx`, and the `swap_tools`, `stacked_sheets` and `tuning_hub` handoffs.

**About these files.** The canvases are design references in HTML. Open them with `support.js` beside them, then rebuild in the app’s stack. Kaldheim values. **No new tokens, no new motion curve, no new dependencies.**

| File | Holds |
|---|---|
| `The 99 - Find a Deck Read (R2).dc.html` | **Current.** The R2 changes, the calls, then D1, P1–P10, P3f–P3g and P6b–P6c, each at 900 (the 820 × 620 dialog) and 390. |
| `The 99 - Find a Deck Read (R1).dc.html` · `Find a Deck View R1.dc.html` | R1, kept for the record. |
| `Find a Deck View.dc.html` | The view as one component (`state`, `phone`), imported by the canvas. |
| `STATES-find-a-deck-read.md` | One row per state, drawn or not, plus must-nots. |
| `design-tables/find-a-deck-read.md` | Geometry, and every string quoted. **Commit to `docs/superpowers/design-tables/find-a-deck-read.md`.** |
| `find-a-deck-read · copy strings.ts` | Proposed `swapToolsCopy.fits.read` and the `creditsCopy` widening. Placeholders. |
| `The 99 - About · Find a Deck Read Entry.dc.html` · `about · find a deck read.ts` | The About entry, §G per-entry template at 760 and 390. |
| `READINESS.md` | Readiness and the gap report. |
| `brand/` · `support.js` | Locked brand sheet, and the canvas runtime. |

## Frames

| Id | State | Fixture |
|---|---|---|
| D1 | card details, the door, and how the pane gives way | Ajani Unrelenting |
| P1 | the view, with the press | Ajani, 11 decks |
| P2 | loading | Ajani |
| P3 | three result rows, one swapped in | Ajani: Goblins, Kratos, Gishath |
| P4 | fewer than asked, thin: the credit came back | Kwia Vigorbloom, 4 decks |
| P5 | fewer than asked, complete: one candidate | Molten Collapse, 1 deck |
| P6 | no fit | Tangle Wire, 21 decks |
| P7 | failure | Maddening Hex |
| P8 | no credit left | Mind’s Eye, 21 decks |
| P9 | a stored read, reopened | Ajani |
| P10 | a stored read where a deck has changed | Ajani, Goblins edited |

The three plan sources are on the rows: Goblins and Gishath read `plan from its overview`, Kratos `plan from its commander and themes`.

## Design’s calls

### 1 · The view inside card details (ruling 2)
- **Desktop:** the 322 art column stays and only the right pane changes. The card stays in sight while the reader decides where it goes, so the picker’s plate retires and the view head carries the identity and copies line.
- **Phone:** the view takes the sheet from 0. The art band and the details stay mounted, `inert`, with their scroll kept.
- **The way back:** `← {card}` is a pill top-left in the view head. ✕ stays where it is and closes the dialog. Escape and hardware Back go one layer: view → details, with focus on the door. Prev/Next and the footer hide in the view, so it never pages to another card.
- **Motion:** 180ms, the sheet-snap curve, 16px slide + fade. A plain swap under reduced motion.
- **Unchanged:** Stand-ins keeps the stacked geometry. A card opened from inside the view still stacks over the dialog, with its pill reading `← Find a deck for it`.
- This reverses stacked-sheets call 7 for this picker only.

### 2 · Where the press lives (Open 1 and 2)
- **Placement:** the band comes first, under the head, above the free list, in the same spot in every state. It shows for one candidate or more, since a single candidate still gets a how and a cut (lock 8). It’s absent only in `allHold` / `noneByColors`, and while a current read is on screen.
- **Lead line:** says what the read adds that the list doesn’t: the few decks it really helps, how, in each deck’s own cards, and what it would replace. That’s default 1 and lock 10, in the reader’s words.
- **Button:** filled. It’s the view’s one filled control until a swap fills a row. It uses Proposed cuts’ button-with-segment, `◆ 1 credit`, with the shared standing line under it.
- **When a read lands:** it takes the band’s place, and the free list folds to one row, `Every deck that could take it`, with its count. Before a read, and after a failure or a no fit, the fold is open.

### 3 · Loading
The band turns `--accent` and names what it’s doing (`Reading 11 decks for Ajani Unrelenting`, `each deck’s plan and list, against the card’s text · 0:12`). Three still skeleton rows hold the read’s place, so nothing jumps when it lands.
- **The free list stays visible and live:** it’s free and true. An Add made during the read just shows that deck as changed when the read lands.
- **No Stop.** The credit is refunded on every bad outcome anyway, and the run outlives the view (lock 5). Back in details mid-run, the door carries `reading your decks…`.

### 4 · The result row (Open 3 and 5)
Each row has:
- the deck, which opens the deck
- the commander, and where the plan came from
- one sentence, with the deck’s own cards as card-open marks (the Overview’s dotted `--accent`)
- the cut on its own line under a rule, so the sentence stays about the plan

The row has one action, **Swap in**, which is `takeStandInAction` with the read’s cut. Every deck is full, so a plain Add would put it at 100.
- **Select/unselect, never a tick:** pressed, it fills `--accent` and reads `Swapped in` (`aria-pressed`), and the cut is struck. Pressed again, the swap is undone.
- **Last copy:** once it’s spoken for, the other rows read `Swap in to buy`.
- The free rows keep today’s Add and Add to buy.

### 5 · No fit, failure, fewer than asked
- **No fit:** a plain box in the band’s place, `None of these decks is a real fit`, with the refund and the list open beneath. No press: the same inputs would say the same thing.
- **Failure:** Proposed cuts’ failed band, with the refund and `Try again` with its segment.
- **Fewer than asked:** two cases.
  - **Thin:** fewer than a third held up, so the credit comes back. The rows that held up are shown, then a dashed note: `Only one deck held up, so the credit came back.`
  - **Complete but short:** one or two true fits spend the credit. A single candidate gets a foot line saying it’s the only deck that can take the card, so one row never reads as a shortfall.

### 6 · Stored reads (Open 4)
- **Current:** reopens free and dated, with no press.
- **A deck changed:** shown, marked out of date, never as current (lock 6).
  - A dashed note names the deck and offers `Read again`, using `again` in place of `creditsCopy.again`, which names suggestions.
  - The changed deck’s row is dimmed, tagged `changed since`, and can’t be swapped, because its cut may be gone.
  - The other rows stay readable and live, since the read about them is still true.
  - A set change (a deck added, deleted or newly able) says so, and tags no row.
- Hiding the read until pressed again would throw away a paid answer over one edited deck.

### 7 · The need line (Open 6)
Left alone. The free row is today’s (lock 7).

## Other decisions
1. **No digits in the sentence, but counts in the chrome.** `{shown} of {n} decks` and the credit standing are app counts, not model output.
2. **Plan source on every row.** `plan from its overview` or `plan from its commander and themes` (Finding 1). It costs one mono line, and it tells the reader why a sentence is thinner for a deck with no Overview.
3. **Copies re-read after a swap.** The view head and every row’s label come from the server’s count, as the picker does after an Add today.
4. **Order of the rows is the read’s order.** It isn’t a rank, and no number is drawn.

## About entry
- **Placement:** `find-a-deck-read`, chapter 03, right after `fits-your-decks`, which stays and describes the free list.
- **Switch:** `FIND_A_DECK_READ_ENABLED`, a new `AboutSwitch` member. No `ABOUT_VERSION` bump; `since: 14`.
- **Template:** `The 99 - About · Find a Deck Read Entry.dc.html` at 760 and 390, with `about · find a deck read.ts`.
- **Specimen:** one ReadRow, read-only, without Swap in.
- **Key lines:** quote no fixture figure.

## Gap report
See `READINESS.md`, G1–G9.

---

## R2 · Hugh’s feedback on R1 (2026-10-11)
1. **One control: the ✕ becomes `← {card}`.** It sits in the ✕’s own slot, top-right, which is stacked-sheets call 2’s pattern. The view head is one row: the title on the left, the pill on the right. There’s no ✕ in the view, so R1’s pill-plus-✕ was incongruent. To close from the view, press Escape twice (one layer each) or the scrim on desktop.
2. **Add without swapping.** Every read row carries `Add only` beside `Swap in`. It is today’s add with nothing cut, so the deck goes to 100, and the row says so: `In the draft, which is now at 100. Cut a card of your choice from {deck}.` The suggested cut stays in, with its note `still in · cut it or anything else`.
   - Both buttons are select/unselect, and pressing one disables the other on that row.
   - `Add only` uses the quiet outline, and fills `--fg-body` when pressed, so it never competes with the swap’s accent.
   - With no free copy, the row reads `Add only, to buy`.
3. **A no fit is remembered (P6, P6b, P6c).** A no-fit result is stored for the card like any read. Reopening shows it dated (`read {when} · kept until your decks change`), with no press.
   - The press returns only when a candidate deck changes. It returns as `Read again`, with the old no fit left on screen, faded.
   - A no fit refunds the reader, so the cost being saved is the app’s spend. Without this rule, a reader could press for free forever.
4. **Credits: link, don’t list. Hugh’s decision, app-wide.** No credit line names the features that share credits. `spent` reads `0 of 3 left · reset at 2:20 AM · What uses credits?`, and the link goes to the About `credits` entry, which lists them. **Engineering: apply this everywhere `creditsCopy` names features.**
   - `spent` and `pausedReason` drop their `deeperLooks` / `tuning` tables.
   - Their callers stop passing those flags.
   - The About entry is the one place the list is kept, and it is gated per line by switch, as it is today.

## Addendum · decks without an overview (brief item 12, Open question 8)
Fixtures: HD - Gishath (v2), HD - Omnath (older), HD Tune - Prismari Artistry (none), all Ajani candidates. Counts are a 2026-10-11 snapshot; Hugh is running Overview on more decks.
- **Every row says what it was read from,** quietly, in the commander line: `from its overview` (v2), `from an older overview`, `from commander and themes`.
  - The sentence and the row read the same in all three. The reader isn’t asked to trust one row less; the note says why one sentence is thinner.
  - Only a stored overview can be quoted (lock 3), so a no-overview sentence cites cards alone (lock 10). The difference already shows in the words.
- **Older and none add one muted line plus a link to the deck page:**
  - older: `Read from an overview written the older way.` `Update it on the deck page →`
  - none: `No overview yet, so this read went on {commander} and the deck’s top themes.` `Write one on the deck page →`
  - A v2 row adds nothing.
- **The picker points, it doesn’t run.**
  - An Overview is its own credit and its own wait, and it belongs to the deck’s Analysis tab, where its result is read.
  - Running it from inside a card’s picker would spend a second credit mid-read, for a deck the reader may not choose.
  - The link closes the dialog and opens that deck on Analysis, at the Overview.
- **What a new overview does to the read (P3g):** it changes that deck’s input hash, so the stored read goes out of date for it (lock 6).
  - The note says `{deck} has a new overview since this read on {when}. Read again to use it.`
  - That row is tagged `new overview`, its actions are off, and the others stay live.
  - It is the same path as any edit, so a no fit for the card is re-offered too.
