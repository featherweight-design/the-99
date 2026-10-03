# Card details as a carousel

Design brief, 2026-10-02. A rework of an existing surface (the card details modal, opened from
every list in the app); no new data.

## The finding

From Hugh's walk on 2026-10-02 (intake item H23), in his words:

> When viewing Card Details, I should be able to click/swipe to the next card from where ever I am
> (Collection, Deck Details, etc.). I should see the upcoming and previous cards like a carousel,
> similar to how ManaBox does it. If this is more feasible in zoom mode, I'm okay with that, but
> having it available on the details view would be ideal.

## What ships today (the record)

Paging already exists, but only part of it is drawn.

1. **The modal already pages through a list.** `CardDetailProvider` takes "the ordered oracle-id
   list the card belongs to" with every open (`card-detail-provider.tsx:63`; `setSiblings`, :103),
   finds the open card in it, and hands the modal a position, a total and two loaders
   (:861–865, :944–951). A list of one still draws `1 of 1` on desktop, both controls disabled.
2. **Only the desktop draws it.** The control is `‹ Prev`, a mono `N of M`, and `Next ›`, at the
   right end of the pinned footer row beside the Mana Pool link (`card-modal.tsx:1908–1944`). The row is
   `hidden md:flex`, and the phone draws nothing in its place. **A phone reader cannot page at
   all today.** No arrow key, no swipe, and nothing of the neighboring cards is drawn at either
   width.
3. **The zoom refused paging by ruling.** The card detail handoff, decision 2
   (`design/design_handoff_the99_card_detail/README.md`, "Refused, each for its own reason"):
   "**Prev/Next** — paging inside a zoom turns a look into a browser, and the modal behind it is
   already the browser." Hugh's message offers zoom as an acceptable home. That contradicts the
   ruling, and the ruling is Design's to revisit, with Hugh deciding.
4. **A new card starts on its front.** Card surfaces handoff: "Prev/Next resets to the front face"
   (`design/design_handoff_the99_card_surfaces/README.md`, flip control), and the flip control sits on
   the art "so it cannot read as a sibling of Prev/Next".

### What "the list" is on each surface

The list is whatever the opener passes. Where an opener passes none, the card opens alone.

| Surface | The list paged through | Source |
|---|---|---|
| `/collection` (grid and rows) | The whole filtered, sorted list, **not** the 200-card window, so paging runs past what is rendered. Re-filed when the filter moves; a card that leaves the results closes the modal. | `collection/browser.tsx:491–545` |
| Set page (`/collection/sets/[code]`) | What the grid draws, in grid order, deduped by oracle id (a set can draw two cells for one card). Reconciled like Collection. | `sets/set-grid-view.tsx:320–356` |
| Deck page, List view | The decklist flattened in render order, across type or role groups. | `decks/decklist.tsx:559` |
| Deck page, Shopping filter | The shopping sections, in their order. | `decks/decklist.tsx:824`, :921 |
| Deck page, Card view | The same list the List view pages. | `decks/decklist-group.tsx:98–103` |
| Consider panel, top-off list, stand-ins | One shelf or group each. | `consider-panel.tsx:301`, `top-off-list.tsx:1132`, `stand-ins-sheet.tsx:165` |
| Analysis receipts, lean | The cards in that receipt or combo. | `receipt-modal.tsx`, `lean-line.tsx:52` |
| Notices sheet | Every card in every notice, across groups. | `notices-body.tsx:62` |
| Review page (`/decks/[id]/changes`) | One list across both columns. | `review-changes.tsx:331`, :360 |
| A suggestion | Two cards: the cut and the add. | `suggestion-card.tsx:223` |
| `/commanders/[slug]` | One role list, or the synergy shelf. | `coverage-section.tsx:258`, `synergy-panel.tsx:392` |
| Opens alone | Deck header commander, proxies list, overview sentence names, upgrade path, the update flow's diff (its rows are four groups, two collapsed, so it passes none), Help me choose rows, the read-as bar, Fits your decks, commander full-card buttons, Change commander's door. | `spine-desktop.tsx`, `spine-mobile.tsx`, `proxy-list-view.tsx`, `synopsis-text.tsx`, `upgrade-path.tsx`, `update-diff-row.tsx:396–400`, `intake/choose-row.tsx`, `intake/read-as-bar.tsx`, `fits-picker.tsx`, `full-card-trigger.tsx`, `change-commander-door.tsx` |

Lists range from 2 cards to a 3,000-card collection. `/discover` opens no card modal; its
lazily loaded fields (`use-draw-fields.ts`) never reach this surface.

### Loading the next card

- **A page reads its card on the press**, through the server action, and paints at once from a
  per-visit cache when that card was already opened (`card-detail-provider.tsx:472`, :549).
  Nothing reads the neighbors ahead.
- **Intent prefetch exists for the first open only.** A resting pointer or keyboard focus reads
  `GET /api/card-detail` after 100ms (`INTENT_DELAY_MS`), and a press waits on it for at most
  `PREFETCH_WAIT_MS` = 180ms (:180) before reading for itself. A tap starts no prefetch: measured
  on the phone, a read started by the press only added the wait (AGENTS.md, `probe:card-prefetch`).
- **The provider holds ids, not art.** Drawing a neighbor's image means the opener hands over
  more than an oracle id. Collection already ships every card's image in its list payload, so the
  art is on the client. That is engineering's problem and does not limit what Design draws.

### The URL

Only `/collection` mirrors the open card into the address: `?card=`, written through `mirrorUrl`,
which uses `history.replaceState` (`browser.tsx:96`, :547–558). A link carrying it opens the card
again. Paging moves that parameter and writes no history entry, so Back leaves the page rather
than stepping back through cards. Every other surface leaves the URL alone.

## Prior art (reference, not decision)

- **ManaBox.** Its public pages do not describe the detail view. Its App Store notes confirm a
  "deck card swiper" (4.1.10: "Keep the position of the card in the deck card swiper when
  changing the board"), and Hugh describes neighbors visible either side. Design should work
  from screenshots of the app itself, not from this description.
- **Material 3 carousels.** The "hero" layout centers one large item with smaller ones peeking
  either side, and snaps to one item per swipe. "Full-screen" shows one item edge to edge.
- **WAI-ARIA carousel pattern.** Slides are labelled `N of M` where there is no better name. The
  previous and next buttons do not move focus, so a reader can press them repeatedly. A
  non-rotating carousel announces through a polite live region.

## The ask

**Paging that works the same from every list, at both widths, with the neighboring cards in
view.** A reader who opens a card from a list can move to the next or previous card in that list
by swipe on the phone and by click or key on desktop, and can see that there is a card on either
side before moving.

## Open for Design

1. **Where the carousel lives.** In the details view (Hugh's preference), in the zoom (which
   reverses decision 2 of the card detail handoff), or both. Name which, and if the zoom gains
   paging, say what is left of "a look, not a browser".
2. **What a neighbor shows.** A sliver of its art, the whole card scaled down, or only its name.
   On the phone the art is 180px wide (about 251px tall at 63/88) at the top of the sheet, and
   shrinks to a 72px thumbnail once the sheet scrolls (`compactArt`, `card-modal.tsx:1528`). Say
   whether the peek lives beside that art, survives the compact state, or the modal slides as a
   whole.
3. **What a swipe moves.** The art header only, or the whole sheet. The sheet scrolls vertically,
   and the printing picker and zoom already take presses on the art, so say how a horizontal
   swipe is told apart from those.
4. **The desktop controls.** Keep `‹ Prev / N of M / Next ›` in the footer, move it, or replace it
   with arrows on the neighbors. Say whether the arrow keys page (they do not today).
5. **The ends of the list.** Stop, or wrap from the last card to the first. Today the controls
   disable at each end.
6. **A list of one, and a list of two.** Most "opens alone" surfaces above are one card, and a
   suggestion is two. Say what the carousel draws when there is nothing either side, and whether
   the desktop still draws `1 of 1` with both controls disabled, as it does today.
7. **Motion and reduced motion.** Whether a page slides, and what it does under
   `prefers-reduced-motion`. The nearest precedent is the flip: the card surfaces handoff ruled
   it a swap with no motion, and the card detail handoff later amended it to a 320ms turn, which
   ships (`anim-card-turn`, `card-modal.tsx:1327`) and stops under reduced motion. Say whether
   paging follows it.
8. **What a screen reader hears** on arrival at a new card: the position, the name, both, or
   nothing beyond the modal's existing single live region.
9. **Paging past a stacked layer.** A card opened from a sheet over a held card pages through its
   own list (`card-detail-provider.tsx:994–1001`), while the held card under it draws no paging
   (`onPrev={null}`, :898–899). Confirm both stay.
10. **The About entry.** Whether this is a feature owing an entry or a change to the existing
    card details entry. Hugh decides.

Copy for any new label goes through `/copy-review`, not this round. Today's `Previous card` /
`Next card` names are inline strings in `card-modal.tsx`, not copy keys, and that is engineering's
to fix.

**Out of scope:** what a list contains or its order (each surface's own), the card detail
content itself, and the printing picker.

## Where it lives

- `src/components/cards/card-detail-provider.tsx`: the list, position, loaders, prefetch, cache.
- `src/components/cards/card-modal.tsx`: the footer controls, the zoom (`zoomed`), the phone header.
- `src/components/collection/browser.tsx`: the `?card=` mirror and the list reconciliation.
- `src/components/sets/set-grid-view.tsx`: the set page's list.
- `src/components/decks/decklist.tsx`, `decklist-group.tsx`: the deck page's lists.
- Handoffs: `design/design_handoff_the99_card_detail/` (zoom, decision 2),
  `design/design_handoff_the99_card_surfaces/` (flip and front-face reset).
- Intake: H23.
