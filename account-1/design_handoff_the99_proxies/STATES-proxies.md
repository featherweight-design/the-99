# STATES — Deck proxies

Every state across the three surfaces, at both widths, with what each must **not** do. Ordered by
surface, as the spec is.

---

## Surface 1 · the deck — `/decks/[id]`

### 1.1 Card row, proxied
Desktop 34px, phone 52px. Hollow dashed ownership dot · name at `--fg` · fixed pip track · **no
availability marker** · the `P` mark in the tag slot · ✕.
**Must not:** fill the dot, draw a marker, draw a price, draw a quantity, change the row's height,
reserve a slot the mark is not in, or draw the word *proxy* on the row.

### 1.1b The key
One mono line under the decklist toolbar, above the first group heading, listing **only the marks the
current view contains** — `$ to buy` · `P proxy` — with a trailing *what the marks mean* link to the
about page.
**Must not:** render when the view has no marked rows; list a mark the view does not contain; render
the link before the about page exists; scroll horizontally (it wraps).

### 1.2 Card row, owned
Unchanged from today. Solid `--success` dot, empty tag slot.
**Must not:** grow a slot for a tag that is not there.

### 1.3 Card row, to-buy
Unchanged from today. Hollow dashed dot, `buy` tag — collapsed `$` in the All view, `buy · $32.90`
in Shopping.
**Must not:** ever render beside the proxy mark. The two share one slot and `deckRowTag` returns one.

### 1.4 Card row, proxied, in the Shopping view
**Does not exist.** `isShoppingCard` tests `proxied` first, so a proxied card is not a Shopping row
at all — it leaves the price strip, the cost stat and both Mana Pool hrefs with it.
**Must not:** appear under any Shopping heading, including `Spoken for`.

### 1.5 Card row, proxied, while the draft has pending changes
The row keeps its pending-change treatment (the 2px accent inset edge) and its proxy tag. The two are
orthogonal: one says *the draft touched this*, the other says *this deck's copy is printed*.
**Must not:** put the proxy on `/changes`, or bill it on the review screen (`bucketAdds` needs its
own bucket).

### 1.6 Commander caption, proxied — single commander
Identity pips · name · `· Esper` · the `P` mark in the **band** variant · status pill.
**Must not:** drop the scrim, name the commander in the mark, or become a tap target.

### 1.7 Commander caption, proxied — a pair
`P · Tymna`, short name after a middot. Both proxied draws two marks in name order; the row wraps.
**Must not:** print `P×2`, or draw a bare `P` that could belong to either name.

### 1.8 Deck header with proxies in it
Status pill reads whatever the counts say, including `Complete`. One mono `--fg-muted` line under the
progress bar: *7 of these are proxies*. Absent at zero.
**Must not:** become a roll-up band, take a colour, carry a control, or qualify the status pill.

### 1.9 Phone spine caption
The identity *label* is already dropped at this width, so the tag lands in that space and the row
does not grow.

---

## Surface 2 · the card's receipt — `AvailabilityDetail`

### 2.1 Owned, claimed, and proxied elsewhere
`In your collection` → `×1` → `On your lists` with `holds N` / `wants N` rows → the split → **a
hairline** → `Running a proxy` with unfigured deck rows → *These lists are covered and ask nothing of
your collection.*
**Must not:** put a proxying deck in `claims`, give the proxy rows a figure, or let the split change.

### 2.2 Owned in none, proxied
`In your collection` → `none` at `--fg-muted` → hairline → `Running a proxy` → one deck → the singular
note. No claims list, no split, no state note.
**Must not:** print `×0`, print an accent figure, or fail to render because `loadCardDetail` skipped
availability — the proxying decks are their own field on both branches.

### 2.3 Owned, claimed, not proxied anywhere
Today's block, byte for byte. The proxy section does not render.
**Must not:** render an empty `Running a proxy` heading.

### 2.4 Free, unclaimed, unproxied
The block does not render at all, as today.

---

## Surface 3 · the sheet's control

### 3.1 Unmarked, with a deck context
`IN THIS DECK` caption → empty 16/18px square tick, ring `1px --fg-faint` → *Run a proxy in HD Gods*
→ the mono ruling-2 line.
**Must not:** carry an Apply, a spinner, or a state line — silence is the unmarked state.

### 3.2 Marked
Tick filled `--fg-body` with a `--bg` check → the same label → *This deck's slot is filled. Nothing is
claimed from your collection.* → the mono line.
**Must not:** say *you have it*, *covered* alone, or anything that can be read as a purchase.

### 3.3 No deck context
The block does not render. Not disabled, not greyed, not a hint.

### 3.4 In flight
The tick is optimistic and lands at once. No spinner, no disabled state.
**Must not:** block the sheet, or queue a second tap — the second tap is the reverse and is legal.

### 3.5 Refused by the server
The membership validation can refuse (the card left the deck between render and tap). The tick
reverts and one `--danger` line renders under the row, in `MutationError`'s shipped skin.
**Must not:** reopen the sheet, toast, or leave the tick in the state that was refused.

---

## Surface 4 · `/collection/proxies`

### 3.6 Hover and focus on a mark
A `title` appears on hover for a pointer. There is no focus state, because the mark is not focusable —
it is a mark, like the availability marker and the buy tag.
**Must not:** become the control's target. The row opens the sheet and the sheet carries the control.

### 4.1 Populated
Breadcrumb → title → subtitle (*N cards across M decks*) → cost strip with its stated gap → rows,
newest first → a tail line past the window.
**Must not:** carry a `Send N to ManaPool`, a `P` mark on every row (every row is one — that is a
legend, not a mark), or a filter rack. No key here either: with nothing to tell rows apart, there is
nothing to decode.

### 4.2 Populated, no collection
Identical, minus the subtitle's second clause. Prices still render.
**Must not:** show an upload prompt, a banner, or any empty-collection chrome.

### 4.3 Row, commander proxy
Adds a neutral `commander` hairline plate after the set/rarity caption.

### 4.4 Row, unpriced
`no stock` at `--fg-locked`, holding the slot's height, and the card is named in the cost strip's
caveat count.

### 4.5 Empty — nothing proxied yet
*You're not printing anything* + where the act lives + a **ghost** button to `/decks`.

### 4.6 Empty — no decks at all
*Proxies start in a deck* + a **filled** button to the deck builder. A different heading, because it
is a different precondition.
**Must not:** be reached when the player has decks — 4.5 is that state and it says something else.

### 4.7 A proxy is unmarked while this page is open
The row leaves on the next navigation, not live. This page is not a live surface and nothing on it
writes; it is revalidated by `claimSurfaces` on the next write from anywhere else.
**Must not:** relight or re-sort under a reader, which is the defect `set_collections` decision 16
exists to prevent.

---

## States deliberately not drawn

- **Degraded availability read.** A proxy is not part of the availability read — it is a row in its
  own table — so a degraded read leaves every proxy tag and the whole proxy list intact. There is no
  new degraded state to draw.
- **An orphan proxy row** (the card left the deck). Inert by construction: every read joins against
  current membership, so it renders as nothing, everywhere. Drawing "nothing" is drawing nothing.
- **Bulk marking.** Out of scope. A proxy is one deck's answer about one slot, and a multi-select
  would be a second mechanism for a decision made one card at a time.
