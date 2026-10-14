# READINESS — Deck proxies (R2)

**R2 · self-assessed: 🟡 amber, and one step from green.** The mark's skin is ratified (A) and folded in,
so the only thing still open is the read-only list, which is a ruling rather than a redesign. It
stays amber because R1 has had no full review pass against the spec's locked decisions — everything
else is drawn, measured and written down, and the backend work the spec unblocks does not wait on any
of it.

## What is green

- **The mark.** Glyph, geometry, the shared slot, both variants, the three word-carriers, and the
  contrast measured in all six themes against the darkest surface it ever sits on.
- **The mark family's skin — ratified as A** (`--fg` at 600 on a dashed `--fg-locked` edge), with the
  three rejected candidates kept in §1b as the reasoning's receipt for the next mark that asks for a
  colour.
- **The key**, and the argument that makes it necessary: once marks are a family the glyph has to
  identify and colour cannot, so the key is not a convenience but the thing that lets a
  one-character mark stay honest.
- **The exclusion.** A proxy tag and a buy tag cannot co-occur, expressed as a type rather than a
  convention (`deckRowTag`), with the failure mode it prevents written down.
- **"Covered is not owned."** The dot rule, the marker rule, the status-pill rule and the language
  contract, with a refused-alternatives column for each.
- **All three surfaces' happy paths**, desktop and 390px, plus the commander pair case.
- **The receipt at both branches** — owned-and-proxied, and the headline case of owned-in-none,
  which is the one the spec's own worked example lands on.
- **The rack entry**, including the ungated state that is the whole reason it exists, and the 390px
  two-pill row.
- **The list's three empty branches**, including the all-printed player with no collection.
- **Copy.** Every string in `deck-proxies · copy strings.ts`, with singular forms and aria names.

## What is amber

### The list is read-only, by decision
Gap report item 1. The reasoning is written down and the alternative is drawn in prose rather than
pixels. **One ruling, not a redesign** — if Product wants per-deck unmark controls on the list, the
row grows a trailing cluster and nothing else in the package moves.

### One thing is outside the spec
Decision 6, the *7 of these are proxies* line under the deck's progress bar. It answers a constraint
the brief names (*the deck can read Complete*) that the spec's three surfaces do not. Severable and
marked as such. It should be ratified or cut rather than shipped quietly.

### One review pass, and it behaved exactly as the siblings' did
R1 was audited against the spec's locked decisions and reproduced. **R2's own read of the source then
found a shipped defect** — `AvailabilitySlot` draws a buy tag on a proxied add, because the add is
unowned — which is precisely the class of thing the siblings found at R2: a collision with a shipped
control on a surface nobody had drawn. That is finding 1 in `ADDENDUM-README.md`, and it is a defect
rather than a design call.

**One R2 item is flagged rather than decided:** `groupInBreakdown`'s three terms stop summing once a
proxied add exists. Recommendation is to leave it under-summing; a fourth term is a change to a
shipped surface R2 was not given.

## Not blocking, but I want eyes on it

**The band scrim is inherited, not measured.** The 92% `--bg` scrim under the commander tag comes
from `BuyTag`'s tile variant. It is the right precedent, but a 9px dashed hairline over a bright art
crop is a thinner thing than a filled warning plate, and nobody has rendered one over real art.

**The mark at 9px on a phone.** One character of Plex Mono at 9px sits inside a ~16px box. It is the
collapsed buy tag's own size, so it is not a new risk — but that one has a plate behind it and this
has an edge, and edges thin out at small sizes on low-DPI displays. **This is the strongest argument
for option B in §1b, and it is a measurement rather than a matter of taste:** make it on a device.

**`P` is an initial, and initials are language-bound.** `$` is a symbol and survives translation;
`P` for *proxy* does not. Nothing in this app is localised today, so it is not a live problem — but
the key spelling the word out is what keeps it a one-line fix rather than a redesign, which is worth
saying while the key is being added for other reasons.

**`Running a proxy` as a heading in the receipt.** It is a gerund where the two headings above it are
prepositional phrases (`In your collection`, `On your lists`). That is deliberate — it is a *thing you
are doing* rather than a place — but it is the sort of grammatical seam a copy review may want
levelled, and if it is levelled the candidate is `Printed for`, which I like less because it names
the object again.

**Whether the proxy list should show a card's real holders.** A row currently names only the decks
proxying it. A card you own one of, held by Kinnan Ramp and printed in two others, says nothing here
about Kinnan Ramp — you have to open the receipt. That is the right scope for a print-run list, and
it is also the one fact a buying decision might want in place.

## R2's dependencies

- **A `proxied` count on `DeckListItem`** — §11. One figure per tile, from the same anti-joined read
  the deck page uses.
- **A `"proxied"` member on `BucketedAdd.bucket`**, and `bucketAdds` filing a proxied add under it —
  §12. Every purchase figure downstream (`footer.buy`, the commit sheet's total, the pending banner's
  *short of spare copies*) then excludes it by falling out of `unowned`.
- **`AvailabilitySlot` testing proxied before `!card.owned`** — finding 1. Without it the row prices a
  card the player has decided not to buy.

## Dependencies

- **`deck_proxies` and both anti-joins** — the whole feature. Backend, unblocked, and the drawings
  assume `list_claims` got the second one: without it a proxied row keeps a buy tag and §1's three
  rows are a lie.
- **The `proxied` flag on `DeckDetailCard` and on each `DeckCommander`** — §1 and §2.
- **The proxying-decks field on the card detail payload, loaded on both branches of
  `loadCardDetail`** — §4b does not exist without it.
- **`CardDetailProvider.open` threading a deck id** — §3. The absence of one is also what makes the
  control correctly vanish on `/collection`.
- **Extended `claimSurfaces`** — `/decks/[id]` and `/collection/proxies`.
- **`printing_prices`** — the list's cost strip only. The list works without it; the figure does not.

## What I would cut to ship sooner

**The cost strip on `/collection/proxies`,** and nothing else. The list, its rows, the named decks and
the three empty branches are the feature; the money is the second visit. Cutting it removes one head
block and one copy sub-block and leaves every state untouched — the per-row price can stay, because
it is the thing a reader actually scans, and it costs one join rather than an aggregate with caveats.

Everything else in this package is load-bearing on "covered is not owned", which is the constraint
the brief says the app could break here.
