# The 99 · Small items 2 (account 1, 2026-10-28)

A light addendum of eight unrelated items, each drawn over the shipped surface it changes. Brief: posted by Hugh in the
project chat on 2026-10-28 ("Small items 2: eight open calls across About, the game log, Home and the deck builder").
Goes to main as `design/design_handoff_the99_small_items_2/` (mirroring `design_handoff_the99_small_items/`) only after
Hugh approves.

Canvas: https://claude.ai/artifact/FfZa2ufJLTuEYicbR9H4rj (account 1; account 2 rebuilds from `scratch-gen/`) — Main, Good-To-Know, Try-It, Seat-Picker, Ledger, Filtered-Empty, Quick-Add-Details,
Consider-Tile, Quick-Add-Failed.

**Status: R1, awaiting Hugh's audit.** Items 1, 4 and 7 are ratifications; item 4 has no board. Every string is shipped
copy unless a note marks it new for /copy-review.

Sources read: main @4c65806; `feat/about-visual-pr5` (PR #2340); issues #477, #412, #182, #172 and #148; PRs #188,
#395; `docs/superpowers/design-pipeline-status.md`, `design-tables/add-panel.md`, the backlog audits; handoffs
about_visual, small_items, friend_decks, game_log, rule_zero, top_off, deck_messages, add_panel, consider_tiles.

## 1 · About, Good to know: two across until xl (`Good-To-Know`, ratification)

**Call: ratify the build.** Good to know is `md:grid-cols-2 xl:grid-cols-3`, gap 16 (#2333, `rule-card.tsx`). At 768
the content column is 646px, so a third is 205px and a 250px diagram (300 for role cells) clips in its plate (drawn:
"Not this · 768"). Redrawing the plates to fit 181px would shrink the app's own shapes (card row, role cells) below
the size they're recognised at elsewhere. The plate is `min-height: 150` in the build (the boards fixed 150), so a tall
diagram grows its plate instead of clipping: ratified too. Phone swipe row unchanged.

Noted, no change: Try it (PR 5) goes to three at lg (1024), so between 1024 and 1279 Good to know is two across above a
Try it row of three. The tool cards carry no diagram and read at 290.

## 2 · About, Try it on the phone: "N more below" (`Try-It`)

Hugh asked for this. PR 5 (`try-it.tsx`) made the line a one-way button. Drawn:

- **The press** keeps its type (Plex Mono 10/500, tracking .04em, `--fg-faint`; hover and pressed `--fg-muted`) and gains
  a `▾` (`aria-hidden`) so it reads as something that opens. 44 × 44 at every pointer. `aria-expanded="false"`,
  `aria-controls` the list; its name is its visible text. (2a, 2b)
- **Opened**: the press is replaced by the remaining cards, in place under the first; focus moves to the first new card
  (its Try it press). (2c)
- **Folds back**: `Show fewer ▴` (same type, 44 × 44, `aria-expanded="true"`) after the last card removes them, puts
  focus on the restored press and keeps it on screen. Per visit; a new visit or a ? landing starts folded. (2d)
- Desktop unchanged: every card shows.
- Copy for /copy-review: `Show fewer` (reuses the Consider panel's `consider.collapse`).

## 3 · The game log's seat picker: "A deck not listed" (`Seat-Picker`)

**The row** takes Rule 0 setup's dashed slot at the picker's own art size: 56 × 40, 6px radius,
`1px dashed var(--border-dashed)`, no ground, the mark centred in `--fg-muted` (`?`, sans 16, as Rule 0 draws it).
The two text-only rows under it take the same slot with their own mark, so every row's text starts at the same edge:
Another commander, the search glyph (16); Just *name*, the friend's initials (mono 12), which is what their seat then
shows. Slots are `aria-hidden`. Row height (52), press, order and what each row seats are unchanged. Hugh's words are
locked: **A deck not listed** / **no deck is named**. (3a phone sheet, 3c the 340 desktop panel; 3b the seat after,
shipped.)

**When it shows (the README note asked for):** in a friend's deck list in the game log's seat picker, after their decks
and before Another commander, for **every** friend whose friend decks switch is on (`PickerFriend.withheld`), whatever
their settings hide or don't. It seats the friend with no deck, exactly as Just *name* does. It never says whether a
hidden deck exists, how many, or which: no count, no "hidden", and a friend with nothing listed is not told "has no
decks". (Drawn: Peter, who hides a deck, and Colin, who hides none, end their lists the same way.)

Rule 0 setup's Leave it to *name* keeps its own 58 × 42 slot.

## 4 · Answer sheet errata (small items, item 3), ratification, no board

**Call: ratify all three as built; no frame wins over the prose.**

- (a) Opening marks the answer seen, so behind the open sheet the item has no diamond and What's new loses its
  `· 1 new` (with one new item the `<em>` goes). The frames that still drew them (390 · Accepted, 1300 · Accepted) are
  wrong; the README and frame 2's own caption are right.
- (b) Declined with no other spare shows the shipped Your requests line `nobodyElse`: *Nobody else you know has a spare
  of it.* The frames drew only the `othersHave` case, which the build matches.
- (c) The scrim and Escape close the sheet (ModalChrome's default, the same `onClose` as ✕), and focus returns to the
  Home item's press. The design was silent; nothing changes visually.

## 5 · The auto-added ledger's numbers, #477 (`Ledger`)

Hugh's direction, drawn in the to-do card's foot (deck-messages A3), both widths:

- Each line leads with **two figures**: `{placed} placed, {here} still here` (both `--fg` 600); equal: `all {n} still here`;
  zero: `none still here`.
- The seed and top-off clauses follow after a colon as today (`: the roles and the mana base, 4 to buy.`); kept and
  removed follow after a `·` in `--fg-locked` (`· 3 now yours, 4 removed since`).
- **The header is unchanged** (`Where these 80 cards came from`, live auto-added cards) and now equals the sum of the
  still-here figures (52 + 24 + 0 + 4 = 80). Desktop meta counts every line shown (`4 passes · 6 to buy`).
- **A fully undone pass keeps a line**: dashed `--border-strong`, no ground, label in `--fg-locked`, no Show and no
  Undo: `9 placed, none still here · undone`. A fully kept pass: `· all {n} now yours`. It stays until the pass would
  leave the deck's record (a new version, or Clear all auto).
- Show and Undo still count the live cards; `Putting {n} back…` unchanged.
- Engineering: `summariseFillPasses` keeps a pass with `live = 0` and knows whether it ended by undo or by keeping;
  `provenance-line.test.tsx:92` stays; add a test that the still-here figures sum to the header.
- Copy for /copy-review: the sentences above.

## 6 · Two card-surface questions, #412

### 6a · Filtered-empty states (`Filtered-Empty`)

**Call: one component; the commanders `ZeroState` geometry wins** (three hollow 10px diamonds, Cinzel 600 19, body
`--fg-muted` max 520, gap 12, buttons 48 and full width on a phone, hugging at 32 from 640). It's the app's common shape
(`/decks` and the set page share the heading and the 44 → 32 hairline button) and sits quietly under a chassis that's
still on screen. **Each surface keeps its own words**: collection's heading names the query and colors
(`noResults.heading`) and keeps its caption. Collection's presses: with a query, **Keep only search** (primary, now at
both widths) then **Clear all filters**; filters only, **Clear all filters** alone. Collection's crown and vignette
retire here. Engineering: share `ZeroState` (e.g. `ui/`), render it from `no-results.tsx`; collection's breakpoint
moves md → sm. Copy: `Clear filters` → `Clear all filters`; a key for `Keep only search`. Open to Hugh: keep the crown
instead.

### 6b · Card details from quick-add (`Quick-Add-Details`), Hugh's pick

- **A (recommended): a grid popup.** A combobox may own a grid instead of a listbox. Each row is two cells: the
  thumbnail and name (opens the shared card detail, `View details for {name}`) and Add. ↑↓ move rows, →/← switch cells,
  ↵ acts on the active cell, typing resets to row 1's Add cell, so type-and-↵ still adds the top match. The name
  underlines on hover like a decklist name. On a phone the name cell (full row height) and Add (56 × 44) are the two
  targets; elsewhere on the row still adds. Closing the detail returns to the field with the query and list kept.
  Hint copy for /copy-review: `→ details`, `← back to Add`, `↵ opens details`.
- **B: no details from quick-add**, as a rule in the card-row doc: the whole row is the add, and the card is one press
  away once it lands.
- Either way: no modifier, long-press or open-on-focus.

## 7 · Add panel divergences and the consider tile, #182 (`Consider-Tile`, ratification)

`VERDICTS-2026-09-07` is not on main or on `design-assets`, and #182's original list is only in its edit history, so
this reconciles the three items PR #395 names against the record in the repo:

1. **Sort label** (desktop `Coverage gaps first ▾`, phone `Gaps first ▾`): filed on #182 as a caret question
   (add-panel.md §16 q4); PR #175 dropped the literal ▾ since the native select draws one. Ships `Coverage gaps first`
   at every width. **Ratify, close.**
2. **Role-counter cell as a button, not a link**: settled by `add-panel-addendum.md` E-N4/S10 (`strip.cellLink`,
   `consider →`). **Ratify, close.**
3. **No-art tile: `commanderGradient()` (README) vs the flat plate (canvas)**: PR #175 shipped the plate; the Consider
   tiles handoff (H30, Hugh's LGTM 2026-10-03, after the verdict) ratified it (c10). **The change isn't wanted: keep the
   plate, close.** Drawn: the plate as shipped at both widths, and the gradient for comparison.

Nothing to build. #182's other open item ("99 means three things") is not in this brief and stays open. If Hugh has the
verdict file, items 1 and 2 get checked against its wording.

## 8 · Quick-add's failed search, #172 (`Quick-Add-Failed`)

**Call: the shared toast** (`ToastFrame`, deck slot), per Hugh's transient-error rule: **Couldn’t search just now.**
with **Try again** (the seat picker's own failed-search words, split). The bar is untouched: the field keeps what was
typed and keeps focus, no list opens, the status line stays empty, so nothing on the bar claims a result. The no-results
state stays out (it's a claim about the collection a failed request hasn't earned). The Consider panel's degraded block
was the other precedent but is sized for a panel.

- When: a search for a query the bar would search (2–100 chars) is rejected or times out, for the latest query only.
- Goes when a search for the field's text succeeds (Try again or typing), the field is cleared, or on the toast's 8s
  timer (held on hover or focus). Fails again: it comes back.
- Try again re-runs the current query once and returns focus to the field (the keyboard stays up on a phone).
- The deck slot lifts above the quick-add dock while the dock is on screen (phone: above the dock; desktop: bottom =
  dock height + 10), so the toast never covers the field. `role="alert"` as ToastFrame does for errors.
- Engineering: `use-card-search.ts` keeps `setRows(null)` on a rejection and raises the toast.

## Files

- `*.dc.html`, `canvas.json`, `support.js`: the canvas boards (images by `/_blob/` url on the canvas; `art/` for local
  rendering).
- `art/`: card images and commander crops the boards use (cut from the design folders' card images). Reference only;
  never copy into `public/`.
- `scratch-gen/` (stays on `design-assets`): `dm/` (deck-page boards, on account 2's deck-messages kit), `about/`
  (items 1–2, on account 2's About generator), `b6a_empty.py` (on account 1's cart v2 kit). `build_si2.py`,
  `build_root.py`, `about/build_si2.py` build; `render*.py` check every board for broken images and clipping.
