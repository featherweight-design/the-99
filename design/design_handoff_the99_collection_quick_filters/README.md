# The 99: Collection quick filters (design handoff)

A thin row of quick-filter chips on Collection › Cards. It gives Free (In no deck) a permanent home now that the Find a
deck call-out can be closed, and it gives one-press filters for every card mark: Two-card combos, Game changers,
Tutors, Extra turns, Mass land denial and Foil. Pressing Two-card combos turns the list into a view of every combo in
the collection, as pairs. Approved by Hugh 2026-11-24 (R2, option C).

Boards (canvas, pan/zoom): `Main.dc.html` (desktop 1300: calls, 5 states, questions) and `Phone.dc.html` (phone 390, 5
states). Drawn over the real Cards page, rendered from main d5f1466 with a 17-card sample collection and the call-out
closed. Every colour is an app token. `scratch-gen/` holds how the art was made (`HOW.md`; `overlay.js` draws the
strip and the combos view).

## Source of truth

No brief file. Hugh's prompt in the project thread (2026-11-24) is the brief:

- Free needs something permanent but less obtrusive than the call-out, such as a toggle or a chip.
- Users should be able to see every combo they own both halves of. The new-combo notification exists, but nothing lists
  them all. Combos you own one half of are useful too.
- There should be filters or quick filters for Game Changers, Tutors and the other marks the key already explains.
- No new sub tab, and the Cards page should not get busier.

Rounds: R1 compared A (the key becomes the filter), B (a Marks filter in the Filters panel) and C (quick chips). Hugh
chose C, and ruled out any change to the Filters panel and any new filter input. R2 is C only and was approved.

## Decisions (LOCKED by Hugh's approval of R2)

### C1. Where the strip lives
- **Desktop and tablet:** in the chassis chip row, which already exists (`data-chassis-row="chips"`). "No filters on"
  is replaced by `Quick:` followed by the chips. No new row, so no added height. Clear all filters stays at the right
  end.
- **Phone:** one new row under the Filters / Sort row, about 30px tall, with 16px side padding. It scrolls sideways
  without wrapping, and the last chip is cut off at the screen edge so it's clear there's more.
- The key (`CollectionMarkKey`) stays a plain legend. The Filters panel does not change.

### C2. Which chips, in what order
`In no deck` (the Free availability state, with the Fits glyph), `Two-card combos`, `Game changers`, `Tutors`,
`Extra turns`, `Mass land denial`, `Foil`. Each chip shows the mark's own glyph at 12px, its label and a count.
- A chip whose count is 0 is **not drawn**. Nothing is shown dim or as 0.
- Counts are **live**: they count the list the other active filters leave, so a chip disappears when its count
  reaches 0 (`r2-active`: blue instants leaves three chips).
- If every count is 0, the row shows today's "No filters on".

### C3. Chip states
- Idle: a 1px dashed `--border-dashed` pill (radius 999), mono 11px, `--fg-muted` label and `--fg-faint` count.
- Pressed: solid `--accent` border, 16% accent wash, `--fg` label, and a × at the end. A pressed chip is the only
  sign of that filter, so it never also shows up as an active-filter chip.
- One quick chip is on at a time. Pressing another replaces it, and pressing the pressed chip turns it off.
- When other filters are on, the order is the quick chips, then a 1px `--border-strong` hairline, then the
  active-filter chips (the existing `FilterChip` style). Clear all filters clears the quick chip too.

### C4. What each chip filters
- In no deck: Availability = Free, the same filter the call-out's Show them sets (`avail=free`). Pressing it here and
  choosing Free in the Availability menu are the same state, and both show the chip pressed.
- Game changers, Tutors, Extra turns, Mass land denial: cards whose `facts` include that fact (`CARD_FACTS`).
- Foil: cards with `foil` set (foil or etched).
- Two-card combos: see C5.
- Each one gets a URL param like the other filters, so the URL can be shared and back works.

### C5. The combos view
With Two-card combos pressed, the list shows **pairs** instead of cards.
- A toggle at the top switches between `You own both` (the default) and `You own one`, each with its count. A line
  beside it explains the view.
- **Own both:** two-card combos where both cards are in the collection (the same pairs the combo mark and the
  new-combo feed item come from). A pair card shows both cards with the lemniscate between them, the names joined by
  `+`, the result (`Infinite damage` and the other result words the combo copy already uses), and one fact: whether a
  deck already holds both (`Both in <deck>` or `In no deck together`). Actions: `Find a deck`, `How it works`.
- **Own one:** combos one card away. The missing card is a dashed slot labelled `not owned`. The fact line is
  `Missing <card> · <price on store>` or `· Wanted by <draft>`. Action: `Add to wishlist`.
- The pair the latest new-combo feed item announced is tagged `NEW`.
- Desktop: pair cards in a grid (`minmax(520px, 1fr)`), cards at 118px. Phone: one row per pair, with 54px
  thumbnails and a ›. Tapping opens the pair's detail, where its actions live.
- The chip's count is own-both pairs. Own one is counted on its side of the toggle.
- Adding any other filter, or pressing the chip again, goes back to the card list.

## Open questions (settled on approval, as drawn and recommended)
- Q1. One quick chip at a time: **yes** (C3).
- Q2. On phone, active-filter chips can scroll off screen. **Keep the drawn order.** The Filters button's existing
  count badge shows filters are on, and the strip can be scrolled.
- Q3. Should the new-combo feed item link to the combos view (own both) with that pair tagged NEW? **Yes.**

## For engineering (suggested; the plan PR decides)
- Counts: compute them in the same pass `filterCards` runs, per mark, over the list after the other filters. One
  pass over the rows, no new query.
- Own one needs the near-miss partners (`src/lib/combos/near-miss`, `near-combos`) for the whole collection, not just
  one card's modal. Load them only when the combos view opens.
- Pairs come from the same source as `comboPartner` / `comboPartners` on `BrowseCard`. Dedupe them (A+B equals B+A).
- The feed item (`src/lib/feed/combo-writer.ts`) is where the deep-link and NEW tag hook in.
