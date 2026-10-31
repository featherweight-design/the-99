# Brief: Add a card to your collection from anywhere

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Source:** a friend's first session. They were on a deck, had just opened a pack, and wanted to add a card to their
collection without going back to Collection first.
**Existing handoffs to extend:** `design/design_handoff_the99_collection_edit/` (the Add cards sheet, README section B),
`design/design_handoff_the99_card_scan/` (scan, which opens from that sheet),
`design/design_handoff_the99_card_search/` (the global search layer, R2 approved),
`design/design_handoff_the99_card_detail/` (card details).
Where a shipped component and a handoff disagree, the component wins.

## Hugh's ruling (2026-10-31), which binds every screen here

1. **A player can add a card to their collection from anywhere in the app**, not only from `/collection`.
2. **ManaBox puts this in a menu.** The 99 lacks the room for that. A header placement could work, but the header is
   getting crowded, especially on the phone.
3. **Design shows 3 to 4 options in total**: a menu-item option, a header option, and one or two novel ideas. Phone and
   desktop for each.

## What exists today

**The add path.** The Add cards sheet (`src/components/collection/add-cards-sheet.tsx`) is a 480px side sheet on
desktop with no scrim and full height on the phone. It runs a name search, then a required printing step with no
default, then per-line finish chips and a stepper, and saves a local list in one step (`addToCollection` in
`src/app/collection/edit-actions.ts`). Scan opens from inside the sheet. Exact duplicates are combined.

**Where it is reached.** Only from Collection and from the first-run doors:
- Desktop: the `+ Add` ghost button in the Collection place head.
- Phone: the trailing `+` in the Collection tab strip (44px square beside five tabs).
- The empty-collection doors and Home's first-run step one.
- A card's own edit mode on `/collection` (`Edit copies` or `Add to collection` in the card details receipt heading).

**Card details has a collection add, but only on `/collection`.** The card details receipt heading draws `Add to
collection` (or `Edit copies` if owned), and the provider passes it only when the collection-edit flag is on and the
card was opened from `/collection`. On a deck page, a friend's deck, search, or anywhere else, the only add-style
control on a card is the wishlist bookmark. This is the gap.

**The global search layer.** Card search (`design/design_handoff_the99_card_search/`, `src/components/card-search/`) is a
name-only lookup from anywhere: a bare 20px glyph on a 44px press left of the avatar on the phone header, a 19px glyph
in a 38px square under the mark in the desktop rail, and Cmd/Ctrl+K everywhere. Each result row says what the reader
owns and where (`x2 owned`, `not owned`, `in {deck}`, a wishlist bookmark). A result opens card details and closing it
returns to the search as it was. The row carries no add control today.

**The shell is full.**
- Phone `MobileHeader`: wordmark on the left; on the right the offline pill, the install slot, the search glyph, Help,
  and the 38px avatar. At 390 with the offline pill, install slot and search all showing, the wordmark keeps 21px of
  air; at 375 it keeps 6px; at 360 none. The header also hides and returns on scroll. The tab bar is 74px.
- Desktop rail: 62px, icon-only on a mouse (88px labelled on touch). Order: crowned mark, search slot and a 24px
  rule, Home, Collection, Commanders, Discover, Decks, Friends, then the offline pill and account menu at the foot.

## The situations to design for

1. **On a deck page** (own deck, or a friend's deck), the reader sees a card they own in real life but have not
   logged, or one they just pulled.
2. **Just opened a pack**: several cards in a row, from anywhere. This is not one card, it is a short list. The existing
   sheet already takes a list and a scanner.
3. **Found by search**: the reader searches a card by name, sees `not owned`, and wants to add it from the result
   without opening card details first, or from card details.
4. **Mid-flow**: the reader is partway through something (reading a friend's deck, a recommendation, a table) and
   must be able to add a card and return to exactly where they were.

## Every state to draw

For each option, at 390 and on desktop:
1. At rest, with the entry visible.
2. The entry pressed: what opens (the existing Add cards sheet, or a lighter version of it).
3. A card chosen from where the reader already is (deck page, card details, search result), so the first step of the
   flow may already know the card. The printing step is still required and has no default.
4. Saved, and the return to the surface the reader started from, unchanged.
5. A list of several cards added in one visit (the pack case), including the scan route.
6. The collection edit flag off: the entry must not appear and must not leave a gap.
7. Offline (the header already steps its install slot aside; the entry must not make the crowding worse).

## Open calls for Design

1. **The four options.** At least a menu-item option, a header option, and one or two Design proposes. Each is drawn
   at both widths with its states. Design recommends one and says why.
2. **The header on the phone.** The wordmark has 21px of air at 390 in its worst case. A new glyph cannot be added
   without displacing something. Design says what yields, or why the header is the wrong home.
3. **What opens.** The existing 480px sheet / full-height phone sheet unchanged, or a lighter "add this card" step when
   the card is already known. The printing step and the finish chips stay either way.
4. **Per card vs per list.** A control on a card (card details, a search row, a deck row) adds that card. A control in
   the shell opens the list. Design decides whether both exist.
5. **After saving.** Whether the reader is told they now own the card on the surface they came from (the search
   row's `not owned` becoming `x1 owned`, a deck row's ownership mark updating).
6. **Reach.** Whether it appears on a friend's deck page and in the public card page, or only on the reader's own
   surfaces.

## Not in scope

- Changing the Add cards sheet's own steps, copy or save rule.
- A new scan flow. Scan stays where it is, behind the sheet.
- The wishlist control, which stays as it is.
- Adding a card to a deck (Quick add and Consider).
- An About entry: Hugh decides at launch.
- Any copy decision. `/copy-review` settles wording after the handoff.

## What eng builds before the handoff lands

Nothing. This is UI placement only; the add path and the search layer already exist and need no backend change. A
reader-facing "owned" figure that refreshes after a save is Design's call (open call 5).
