# Paste-ready Design feedback — printing picker R1 → R2

Copy the block below into Claude Design verbatim.

---

> **Printing picker R1 audited: 🟠 Orange. One blocker, and one of your two data questions is
> answered — the other reverses.**
>
> **The blocker — placement.** Decision 1 makes the chooser a second view of the same modal, with
> `card-modal.tsx` gaining `view: 'card' | 'printings'`. That's the option the locked spec explicitly
> rejects: locked decision 4 reads *"Inside the existing card detail modal. No new route, no modal
> modes."* It was raised in the workshop as "a second panel or tab within the modal, so the modal
> gains a mode" and turned down there. Because the whole canvas is composed around the turnover — the
> card view is replaced wholesale, there's a `Back to {cardName}`, Prev/Next spans a view the card
> view lacks — this is a redraw rather than something engineering can absorb.
>
> For R2, put the picker **inside** the card view: on desktop, an inline region under the art panel;
> on mobile, an inline expansion of the full-width `Set` row you already promote out of the 2×2 grid.
> Keep that promotion — it's the right call. The card stays on screen while the user chooses, which
> is the point of the locked decision.
>
> Settle the mobile art contradiction in the same pass. You're right that it's real, and the brief is
> the correct document: `card-modal.tsx:180` is `hidden md:flex`, so mobile genuinely has no art
> panel. The Collection handoff's drawing is stale.
>
> **Your pin-identity blocker is disproved.** `(oracle_id, set_code, collector_number)` has **zero**
> duplicate groups across all **100,601** rows of `printings`, and **zero** rows carry a null or
> empty `collector_number` — the numberless-promo class you were guarding against doesn't exist in
> the catalogue. The Scryfall print id is also the wrong key in the other direction:
> `collection_items.scryfall_id` is nullable by design, because bare `Name,Qty` CSV exports carry no
> Scryfall ID at all. Pinning on it would deny the feature to exactly those users. The spec's
> `(set_code, collector_number)` key stands. Your `no number` treatment is still needed — the
> bare-CSV case is the **empty string**, not null.
>
> **Two behaviour corrections against the locked ten** (engineering will apply these; noted so R2's
> copy and states agree with them):
>
> 1. `README.md:174-176` drops a pin silently when its printing isn't in a new export. Locked
>    decision 5 is the inverse: keep the pick, fall back silently, and reactivate it if the printing
>    comes back. The preference table deliberately has no foreign key to the collection so a pin can
>    outlive a traded card.
> 2. `copy strings.ts:29` says "Your pick shows everywhere this card appears," and state 3 promises
>    "the list, the grid, and every deck it's in." Locked decision 2 scopes the pin to collection
>    surfaces only — grid, rows, modal. Deck builder, recommendations and commanders keep the
>    resolver's choice; per-deck printing choice is deferred to #42. R2 copy should name the
>    collection, not decks.
>
> Also: per-finish selection was rejected in decision **3**, not 5 — decision 5 is the replace
> behaviour.
>
> **Everything else survives R1 untouched.** The caption-as-entry-point, the three non-colour signals
> for chosen vs default and the SC 1.4.1 argument, the overflow model (grid + search + finish chips +
> set group headers past 12, no virtualisation — correct for the real 54-`Forest` ceiling), the
> foil-shown-not-chosen treatment, the radiogroup and live-region model, and the externalised copy.
> R2 is placement plus the two copy corrections; don't reopen the states.
