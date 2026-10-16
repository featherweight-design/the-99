# Card search — R1

**Round 1.** Look up any catalog card by name from anywhere, as a doorway into card details. Phone and desktop.
**Brief:** `docs/superpowers/design-briefs/2026-10-16-card-search.md` (main, 875f54c). Its eight locks are not reopened here.
**Mirrors:** `design/design_handoff_the99_social_r2/` (the Wishlist search's row grammar and results panel).

**The answer in one line.** A quiet search glyph by the account button on the phone, and a ⌘K well at the top of the
rail on desktop, both open one name-only search. Its rows say what the reader owns and where. A result hands over to
card details exactly as it ships, and closing the card brings the search back as it was.

| File | What it is |
|---|---|
| `The 99 - Card Search (R1).dc.html` | **Start here.** The locks and where each is honoured, the eight calls, the gaps, Hugh's calls. |
| `R1 - Header-Phone.dc.html` | HP1–HP3 the icon in the header's cluster (with the offline pill and install slot, measured); Q1–Q5 quick return. |
| `R1 - Sheet-Phone.dc.html` | S1–S7 the sheet's seven states; H1–H3 card details from a result and back. |
| `R1 - Rail-Desktop.dc.html` | D1–D8 the rail field at rest, hover, focused, typing, results, none, failed, card details and back; the ⌘K and keys note. |
| `R1 - Deck-Page.dc.html` | DP1–DP4 both searches on the phone deck page, the header over the bottom controls, typing in Add a card; DD1–DD2 desktop. |
| `R1 - Rows.dc.html` | The result row's anatomy at both widths, every ownership case, and the wishlist signal A/B. |
| `The 99 - About · Card Search Entry.dc.html` | The About entry on the §G per-entry template, desktop and phone. |
| `STATES-card-search.md` · `READINESS.md` · `card-search · copy strings.ts` · `about · card search.ts` | The matrix, the verdict, every new string, the About entry as code. |
| `art/`, `brand/`, `support.js` | Carried so the folder opens standalone. |

Every board is drawn over the shipped shell: the 73px `MobileHeader`, the 74px tab bar, the 62px `NavRail` with the
crowned mark, Collection and the deck page, the shipped card sheet and 820 modal, Kamigawa tokens. New parts carry a
dashed pink outline. Every board was rendered in a browser with the brand fonts and checked: no broken images, no frame
cut off.

---

## The calls (§Open for Design)

**1. The sheet's states.** Full screen over the header and tab bar, the field focused and the keyboard up in the same
tap. Empty with no recent cards: one sentence over three catalog cards (S1). Empty with recent cards: those rows and
**Clear** (S2). Typing: search starts at 2 characters (the read's own minimum) 150ms after the last key (the shipped
debounce), with a 2px accent bar under the field and three skeleton rows; a later search keeps the previous rows at 50%
(S3). Results: up to 20, best match first (G3), with a count (S4); dragging the list lowers the keyboard (S4b); at 20 a
foot line says to type more of the name. No results: the shipped Add cards words (S5). Failed: the shipped failure
sentence and **Try again**, inline because nothing else is on screen to keep (S6). Offline: the field still types and
search runs by itself once back online; recent cards are hidden, since card details needs the network too (S7).

**2. The result row.** One row at both widths, in the Wishlist search's grammar. Art at card shape: 40×56 on the phone
(bigger than Wishlist's 30×42, because the art is how a card seen across the table is recognized), 30×42 in the
desktop panel. The name, 15/600 phone and 14/600 desktop, with the typed letters in the accent as the deck's Add a card
search draws them; it wraps to two lines on a phone and never cuts off. Then one mono line: `×N owned` or `not owned`
(the shipped quick-add words), then `· in {deck}` for the first of the reader's decks by name and `+N` for the rest;
a long deck name gives way first. The wishlist is a filled bookmark at the row's end, the wishlist's own glyph, named
`on your wishlist`. A Secret Lair flavor match is titled with the card's name, with `printed as {flavor}` (shipped words)
leading line 2 and ownership on line 3. One press per row, no other control. No type line, cost or price: lock 3 names
three things. **Hugh's call:** the bookmark (A, drawn) or the words on a line of their own (B).

**3. Quick return.** At the top the header is in the page as it ships. Away after 8px of downward travel once past it
(160ms); back after 12px up from the lowest point (200ms, the sheet curve), over the page with a shadow, never pushing
it. Sticky page heads (Collection's filter head) ride under it. Under a sheet or modal it freezes under the scrim. While
any page field has focus it doesn't return, and a returned header slides away (the tab bar's
`data-hide-on-note-focus` precedent). Beside the deck page's bottom controls: the header takes the top and the dock and
tab bar the bottom, 582px apart at 844, and typing in Add a card suspends it, so it never covers those results (lock 7).
A new page arrives with the header in place; scrolls the app makes don't move it (G4). Reduced motion: no slide.

**4. The desktop rail field.** The rail is 62px and icon-only, so the field's resting shape is a sunken 46×48 well under
the mark, above Home, with the glyph and `⌘K` (`Ctrl K` off a Mac; `Search` on the 88px touch rail). Hover fills it
like a nav slot and shows the rail's name tag. A press or ⌘K opens the 540 field beside the rail, the way the rail's
lock note opens (12px out, its top on the well's, a caret back), and results open in a **dropdown under the field**,
the Wishlist panel's look, never a separate panel. The page stays visible.

**5. Recent cards.** Yes: the last **8** cards opened from search, newest first, deduped, per account on this device,
cleared on sign-out, emptied by one **Clear**. Only cards opened from search; every card opened anywhere would fill it
with browsing. Ownership on them is read fresh when the field opens (G6). The reader's own, never another player's.

**6. The header icon.** A bare 20px glyph in `--fg-muted` on a 44px press, no box and no fill, directly left of the
account button: both open something over the page, and the avatar stays the loudest control (Hugh's noise concern).
Measured with the shipped type: with the offline pill, install slot and icon all showing, the wordmark keeps **21px**
of air at 390. At 375 it would be 6px and at 360 none, so **below 390, while offline, the install slot steps aside**
(G5, needs Hugh's yes). Online at 360 the cluster leaves 87px.

**7. Accessibility.** The icon is `Search all cards`, `aria-haspopup="dialog"`. The sheet is a modal dialog; focus goes
to the field in the tap's own handler so the phone keyboard rises. The field is a combobox with a listbox, as the deck's
Add a card field already is; ↑ ↓ move, ↵ opens. A polite live region, always mounted, says the count or the no-results
line once typing has paused 500ms; failure uses `role="alert"`, as shipped. Escape clears a query, then closes; Back
closes the sheet in one press. **⌘K on a Mac, Ctrl+K elsewhere**, everywhere including inside page fields (neither
edits text); **never Ctrl+K on a Mac**, which deletes to end of line in every text field; not while a dialog is up. The
well carries `aria-keyshortcuts`. Closing returns focus to the icon, or to wherever ⌘K was pressed.

**8. The handover.** **A result closes the search and opens card details on its own**, unstacked, paging through the
results (`3 of 10`). Nothing sits below it, so **Find a deck stays** with no change to card details (lock 1). The search
lives in the shell, not in card details' stack: when the card closes (✕, Escape, swipe, Back), the search comes back as
it was, query, results and scroll, with focus on the row that opened it. History: one entry for search, replaced by the
card's, so Back from the card returns to search and Back again to the page.

## The deck page (lock 6)

The deck's field already reads `Add a card by name · {identity} only`, so d9's **Add a card** is its first three words
and nothing changes there. The global search is **Search all cards** on the icon's name, the sheet's placeholder and the
rail well's name. DP4 shows the difference: a white card the Red deck's field would never offer. Collection's own field
(`Search your cards…`) is a third, already labelled apart.

## Gaps

| # | Gap | Who |
|---|---|---|
| G1 | A switch, named here `CARD_SEARCH_ENABLED`: the icon, the well, ⌘K, quick return and the About entry follow it. | Eng |
| G2 | Card details mounted once in the shell (the brief's note), and a close callback so search can come back after it. | Eng |
| G3 | `searchCollectionCatalog` orders by name. Search wants the name starting with the query, then a word starting with it, then any match, then by name. Same read, same limit. | Eng |
| G4 | Quick return must tell the reader's scrolling from the app's (`reveal()`, scroll restore). One way: ignore scroll for 300ms after a programmatic scroll or a navigation. | Eng |
| G5 | `InstallSlot` hides while offline below 390px. | Hugh |
| G6 | Rows need the reader's deck names per card and the wishlist flag beside `owned`; recent cards need the same read by oracle id. | Eng |
| G7 | Recent cards in local storage keyed by account id, removed on sign-out. No new table. | Eng |
| G8 | Every new string is in `card-search · copy strings.ts` for `/copy-review`; reused shipped strings are marked. | Note |
| G9 | These boards were written as repo files; the art is referenced under `art/`. To live on a Design canvas the images need uploading as assets. | Note |

## About entry

`Looking up any card`, chapter 01 after `A closer look at any card`, following `CARD_SEARCH_ENABLED`, so it is announced
when the switch flips and bumps nothing. Board: `The 99 - About · Card Search Entry.dc.html`; copy:
`about · card search.ts`. With the feature or in the discovery line's showcase is Hugh's call.

## Hugh's calls

1. The wishlist signal on a row: the bookmark (A, drawn) or the words (B).
2. G5, the install slot stepping aside offline under 390.
3. Where the About entry ships.
