# The 99 · Small items 4 (account 2, 2026-10-29)

Canvas: https://claude.ai/artifact/RjJEJd6ZKGQCxbxby3642G
Status: R1, awaiting Hugh's review. Goes to main only on approval, as `design/design_handoff_the99_small_items_4/`, beside `design_handoff_the99_small_items_3/`.

A light addendum of two items, each drawn over the shipped surface it changes. Brief: Hugh's "Small items 4" design prompt, 2026-10-29. Everything not listed here stays as shipped. Strings marked as drafts are for /copy-review.

Open `Main.dc.html` for the calls, or a board's page; each needs `support.js` and `art/` beside it. `scratch-gen/scg/si4.py` regenerates them (it extends the Suggested changes v2 kit). Sources read: main @c6909b9; `src/components/collection/filter-bar.tsx` (`FiltersTrigger`, the compact head), `src/components/decks/cart/{cart-chassis,cart-view}.tsx`, `src/components/ui/{filter-chassis,filter-panel,checkbox,availability-marker}.tsx`, `src/components/commanders/rack/filter-rack.tsx`, `src/components/decks/{tuning-limits-box,suggested-changes-pick-line,suggestion-line,suggested-changes-confirm}.tsx`, `src/lib/tuning/answer.ts`, `src/lib/copy/{availability,suggested-changes-v2,deck-description}.ts`; handoffs small_items_3, suggested_changes_v2, all_decks_cart_v2 (with addendum-r3). Collection is drawn over Hugh's shipped capture `public/about/pages/amonkhet/phone/p-collection.webp`.

| Board | Item |
|---|---|
| `Filters.dc.html` | 1 · Filters on Collection and the cart |
| `Other-Decks.dc.html` | 2 · Suggested changes: cards from my other decks |

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

1. **The box.** One checkbox under Only cards I own, in the Kept for this deck box: **Also cards in my other decks**, with the line *Each one says which deck has it. It stays in that deck too.* Off by default, kept for the deck like the other limits, shown only while Only cards I own is on (with Any card those cards are already offered, marked, with a buy tag for a second copy). Phone: its own 44px row under the toggle. Desktop: under the toggle, in its column. The shipped 18px `Checkbox`.
2. **The mark.** A result from another deck carries the shipped marker **none free, in HD - Gishath** (`AvailabilityMarker`, hard, named: drop `nameless`, keep `selfExcluded`) where the add mark already sits: after the name on desktop, on its own line on a phone. Held in two or more decks: the first deck and the cart's **+N** press (cart v2 call 2), which opens the decks in place and reads **less** to fold them. No buy tag on these rows: the player asked for cards they own.
3. **Apply adds the card here and leaves it in the other deck.** Nothing changes in the other deck. The confirmation says so under the name (*stays in HD - Gishath*, *+1* for more decks). From then on the shipped availability carries it: this deck's row reads *none free, in HD - Gishath*, and once both decks are committed the copy is spoken for twice, which the deck page's message card (deck messages A6) and Shopping already show.
4. **Not drawn: moving it.** Apply could also cut the card from the other deck. Rejected: it changes a deck the player isn't looking at, leaves it at 98 needing its own Top off, and Undo would have to reach two decks. The player can still cut it there; nothing is locked in.
5. **Engineering.** `limits.otherDecks` (boolean, stored with the deck's limits, part of the run fingerprint). When on, owned candidates include cards with `free ≤ 0` whose copies sit in other decks (`loadAvailability` with `excludeDeckId`), and `owned` on the answer row stops requiring `free > 0`. Ordering stays the run's (recommended first); when two cards fit as well, a spare copy goes ahead of a held one. You asked reads *only cards I own, and in my other decks*.
6. **Copy (drafts):** *Also cards in my other decks* · *Each one says which deck has it. It stays in that deck too.* · *stays in {deck}* · *only cards I own, and in my other decks*. The marker is shipped copy.

Drawn at 390 and 1300: the form (box off, on, and Any card with no box), results with two held cards (one in two decks, +1 opened), the confirmation, and the applied state. Fixture: HD - Half Shell at 99, N = 3; Path to Exile in HD - Gishath, Atreus in HD - Kratos and HD - Thorin.
