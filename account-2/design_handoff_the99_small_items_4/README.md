# The 99 · Small items 4 (account 2, 2026-10-29)

Canvas: https://claude.ai/artifact/RjJEJd6ZKGQCxbxby3642G
Status: R1 (items 1, 3) and R1b (item 2, after Hugh's notes), awaiting Hugh's review. Goes to main only on approval, as `design/design_handoff_the99_small_items_4/`, beside `design_handoff_the99_small_items_3/`.

A light addendum of three items (item 3 added later on 2026-10-29), each drawn over the shipped surface it changes. Brief: Hugh's "Small items 4" design prompt, 2026-10-29. Everything not listed here stays as shipped. Strings marked as drafts are for /copy-review.

Open `Main.dc.html` for the calls, or a board's page; each needs `support.js` and `art/` beside it. `scratch-gen/scg/si4.py` regenerates them (it extends the Suggested changes v2 kit). Sources read: main @c6909b9; `src/components/collection/filter-bar.tsx` (`FiltersTrigger`, the compact head), `src/components/decks/cart/{cart-chassis,cart-view}.tsx`, `src/components/ui/{filter-chassis,filter-panel,checkbox,availability-marker}.tsx`, `src/components/commanders/rack/filter-rack.tsx`, `src/components/decks/{tuning-limits-box,suggested-changes-pick-line,suggestion-line,suggested-changes-confirm,pull-control}.tsx`, `src/lib/tuning/answer.ts`, `src/lib/copy/{availability,suggested-changes-v2,deck-description,deck-versioning}.ts`; handoffs small_items_3, suggested_changes_v2, all_decks_cart_v2 (with addendum-r3). Collection is drawn over Hugh's shipped capture `public/about/pages/amonkhet/phone/p-collection.webp`.

| Board | Item |
|---|---|
| `Filters.dc.html` | 1 · Filters on Collection and the cart |
| `Other-Decks.dc.html` | 2 · Suggested changes: cards from my other decks |
| `Dock-Header.dc.html` (and `Dock-Header.html`) | 3 · About: the phone top dock and the returning header |

## 1 · Filters on Collection and the cart

Small items 3 (item 7) ruled the 44px Filters box for every compact page, but its "shipped" column was wrong for Collection and the cart: both ship a deliberate 36px pill (`FiltersTrigger`, reused by `cart-chassis.tsx`) with a 44px hit overlay.

**Call (recommended): the 44px box on both pages.**
1. Collection and the cart take the shared Filters box: 44px tall, 10px radius, `--surface-sunken`, a 1px `--border-strong` edge (accent with a filter on), 13px label and the shipped count badge (the rack's `FilterRackTrigger` look).
2. **What it costs.** The cart: nothing. Its controls row is already 44px tall (the search field and the ⇅ sort), so its pinned block keeps its height. Collection: +8px. Row B goes from 36 to 44, so the pinned head goes from **108 to 116** (8 + 50 + 6 + 44 + 7 + 1). At 844 tall that leaves 575px of list under it (was 583).
3. **Collection's Sort** stays its labelled pill (Name · A–Z ▾) but drops `compactTriggerHeightPx={36}` and takes the panel's own compact 44, so row B has one height.
4. **Engineering.** `FiltersTrigger` takes the rack trigger's classes, or the two share one component; its `after:` overlay goes. `filter-bar.tsx`'s head arithmetic comment and STATES H1 become 116. The 900–999 one-row form stays 66.
5. **If Hugh keeps the pill instead:** nothing changes in code, and Small items 3's table gets an exception for these two pages (head stays 108).

Drawn at 390, at rest and pinned, both ways.

## 2 · Suggested changes: cards from my other decks

Today, with **Only cards I own**, a run offers spare copies only (`answer.ts`: `owned` needs `free > 0`). Engineering is widening that to every spare, recommended first, with no UI change. This adds a choice to also offer copies that sit in another deck.

R1b (Hugh, 2026-10-29): Apply's confirmation carries Review changes' Pull so the player picks which deck the card leaves; the results marker drops the deck name; the desktop checkbox no longer leaves empty space under the cost and set fields.

1. **The box.** One checkbox in the Kept for this deck box: **Also cards in my other decks**, with the line *Apply asks whether to pull each one from its deck.* Off by default, kept for the deck like the other limits, shown only while Only cards I own is on (with Any card those cards are already offered, marked, with a buy tag for a second copy). Phone: its own 44px row under the toggle. Desktop: a foot row across the whole box under a hairline (label and line on one row), so the three fields keep their one-row height. The shipped 18px `Checkbox`.
2. **The mark.** A result from another deck carries the shipped hard marker, nameless: **none free** (`AvailabilityMarker`, `nameless`, `selfExcluded`), where the add mark already sits: after the name on desktop, on its own line on a phone. No deck name and no +N: which deck is Apply's question. No buy tag on these rows: the player asked for cards they own.
3. **Apply: the shipped Pull.** In the confirmation, each held card coming in carries Review changes' Pull (`PullControl`'s look): *in HD - Gishath* with **Pull it**, or *in 2 decks* with **Pull it ▾**, which opens the shipped source picker (a sheet on a phone, the 372px popover from md) with its order line, stamps, card counts, consequence line, Cancel and **Pull from {deck}**. Choosing stages the pull: the row reads *pulls from {deck}* and **Undo** takes the choice back. Nothing moves until **Apply**.
4. **Pulling is the player's choice.** A card left unpulled is added here and stays in its deck too (the foot line *A card you don't pull stays in its deck too.* says so); the shipped availability then shows it spoken for twice, as the deck page's message card (deck messages A6) and Shopping already do. A pulled card leaves its deck through the shipped pull: that deck gets a draft with the card going out (or it joins its draft). **Undo all** takes this deck's changes and the pulls back.
5. **Engineering.** `limits.otherDecks` (boolean, stored with the deck's limits, part of the run fingerprint). When on, owned candidates include cards with `free ≤ 0` whose copies sit in other decks (`loadAvailability` with `excludeDeckId`), and `owned` on the answer row stops requiring `free > 0`. Ordering stays the run's (recommended first); when two cards fit as well, a spare copy goes ahead of a held one. The confirmation carries the `DeckClaim`s for each held card and the chosen pulls go with the apply, with the pull's own guards (locked and commander rows are passed by, as on Review changes). You asked reads *only cards I own, and in my other decks*.
6. **Copy (drafts):** *Also cards in my other decks* · *Apply asks whether to pull each one from its deck.* · *pulls from {deck}* · *Undo* · *A card you don't pull stays in its deck too.* · *only cards I own, and in my other decks*. The marker, *in {deck}*, *in N decks*, *Pull it* and the picker are shipped copy.

Drawn at 390 and 1300: the form (box off, on, and Any card with no box; desktop foot row), results with two held cards, the confirmation with Pull it and Pull it ▾, the phone source sheet, both chosen, the desktop popover, and the applied state. Fixture: HD - Half Shell at 99, N = 3; Path to Exile in HD - Gishath, Atreus in HD - Kratos and HD - Thorin.

## 3 · About: the phone top dock and the returning header (addendum)

Small items 3 item 6 docks a low region's label at the top, 12px under the back bar (or the header), and says the dock doesn't move once placed. If the quick-return header was away at the tap and the reader scrolls up, the header comes back behind the label, which covers its lower edge (the back bar already rides `--header-offset`, so it moves under the header and the label covers it too).

**Call (recommended): the label rides the header.**
1. The top dock's top is `calc(var(--header-offset, 0px) + var(--about-back-h, 0px) + 12px)`: 12px under the back bar, or under the header when no back bar shows. `--header-offset` is the shipped room a returned header takes (79 while shown, 0 otherwise); `--about-back-h` is the back bar's height while it shows (0 without one).
2. It moves on the header's own slide: 200 ms in, 160 ms out, the same curve. It never sits over the header or the back bar.
3. Small items 3's "scrolling afterwards doesn't move it" still holds for where it docks: the top-or-foot choice is made once, on the tap. Only its offset follows the header, as the back bar's does.
4. **Not recommended: holding the header away while a label is docked.** It takes the menu, search and ? out of reach for a reason the reader can't see. The shipped hold (a focused field) exists so the header never covers typing; nothing is typed here.
5. The foot dock is unchanged. Desktop has no dock. No new strings.

Drawn at 390 with the shipped 79px header cropped from the capture (in place of Small items 3's simplified bar): at the tap, the defect, A, B, and A without a back bar. `scratch-gen/dock/dock4.py` builds it on Small items 3's `build.py` and `si3.css`.
