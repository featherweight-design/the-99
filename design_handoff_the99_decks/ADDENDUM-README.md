# Addendum — price on the buy tag (#291)

A light addendum to the shipped Decks handoff. **Nothing in it is reopened**: `The 99 - Decks.dc.html`,
`The 99 - Decks README.md` and the R2 reviewer notes stand as written, and the add-panel addendum's
§7 ruling — the tile borrows the decklist row's `buy` tag, same hex, same word — is inherited, not
revisited.

Canvas: `The 99 - Decks · Price Addendum.dc.html`. Two densities, four states, each drawn at both
widths.

**The one-line summary:** *one tag, four tails, no new marks.* The `buy` tag keeps its word, its
amber and its position on both densities. What changes is what follows the middot — a figure, a
figure and a word, a word, or nothing — and the fourth of those is the tag we already ship.

## The answer to "four marks or fewer"

**Zero new marks.** The ingest's four states are four *tails* on one tag:

| # | Ingest condition | Row (Shopping) | Tile (Consider) | What it means |
|---|---|---|---|---|
| 1 | non-foil price, fresh timestamp | `buy · $45.00` | `buy · $45.00` | buyable now, at that price |
| 2 | non-foil `null`, foil price set | `buy · $2.10 foil` | `buy · $2.10 foil` | buyable now, in foil only |
| 3 | row present, stale timestamp | `buy · sold out` | `buy · sold out` | in the table, not buyable now |
| 4 | absent from the price table | `buy` | `buy` | never stocked at ManaPool |

Four presentations, distinguishable in greyscale, with **no new glyph, no new hue and no new
token**. This is `availability-marker.tsx`'s logic shape reused rather than a second vocabulary:
one atom, one axis, and the least-informative state is the quietest. There the axis was severity
(hollow → solid → doubled) and silence meant *free*; here the axis is **how much we can say about
buying it** and silence means *we have never had it*.

**State 4 is today's tag, byte-identical** — same markup, same accessible name, no em dash, no
skeleton, no `—`. The locked rule from the discovery pass applies unchanged: *missing data is
omitted, never zeroed.* A card ManaPool has never stocked is not free and not `$0.00`, and a dash
would be us asserting something about the card when the fact is about us.

**State 3 keeps the word `buy`, and that is deliberate.** `buy` is the ownership signal — it says
*you need this and you don't have it*, which stays true when the store is out. The tail says what
you can do about it today. Dropping the tag on a sold-out card would delete the ownership fact to
report a stock fact, and the ownership fact is the one the deck is built on.

## 1. Where the number lives → **inside the tag, both densities**

Not the meta line. `decklist-row.tsx:94` and `suggestion-tile.tsx:342` both have one, and both are
already spoken for — the row's carries `×N owned` and the availability clause, the tile's carries
type and cost. More to the point, **price is the consequence of unownedness**, and the tag is where
unownedness is declared. Split them and the player reads two places to learn one thing, at two
densities that would then disagree.

So the tag grows a second segment: `buy` `·` figure. One atom, one component, one place in
`buy-tag.tsx` where buy and its colour are declared — which is where the price arrives too.

**The row's figure right-aligns into a 58px slot.** Under the Shopping filter every row carries a
tag, so eight tags in a column make a column of figures whether we plan one or not; a fixed slot
means they line up and `buy` lines up with them. `sold out` and `$2.10 foil` both fit the slot, so
states 1–3 align on both edges and only the bare tag (state 4) is short. **Under `All` the slot is
off** and the tag hugs its content — that list is mostly owned rows with no tag at all, so there is
no column to form and a padded tag would be a phantom one.

**The tile tag grows leftward from its 6px inset**, capped at 62% of the art width. `buy · $2.10
foil` fits a 168px tile at 9px mono; `buy · $219.00 foil` does not, and that tile **falls back to
the bare tag** rather than truncating a figure. A clipped price is worse than no price, and the
deck-level line still accounts for the card.

**One size rule, borrowed:** the row's figure takes `--fg-body`, the tile's takes `--fg`. Same
reason `--avail-hard-fg` exists — 9px mono on a scrim over card art needs the brighter ink, and
that is a size decision, not a hue one.

**Magnitude never changes the colour**, only the brightness, and only past three figures — the
discovery pass's rule (`STATES-price-and-empties.md`, Part 1) inherited verbatim. `$219.00` is not
a warning. A price in `--warning` is the product having an opinion about the player's money, and
the amber here belongs to `buy`, not to the number.

## 2. Does the tag become a link → **no. Not this tag, not this pass.**

Three independent reasons, any one of which is enough:

- **The tile tag is `pointer-events: none` over card art, and the tile's own action is Add.** A
  link inside it is a target nested in a target, at 9px, in a grid of 44px Add buttons. The
  availability pass ruled the same way for the same reason: *the marker itself is never a target.*
- **It fails the target line at both densities.** The row tag is 9.5px mono with 1px×5px padding;
  the tile tag is 9px on a scrim. Getting either to 44px means the tag stops being a tag. #184
  exists because something shipped under that line.
- **This would be the app's first link-out, and a first should not be an accident of density.**
  Leaving the product is a new affordance class — it needs a visible affordance, a stated
  destination, a new-tab decision and whatever disclosure the store relationship requires. None of
  those fit in a chip, and eight of them down one list is eight exits from a page whose job is to
  finish a deck.

**Where it belongs instead, when it is wanted:** the **shopping-list export dialog** — one
deck-level action beside `Copy shopping list` and `Download .txt`, on the one surface where a
basket is the unit and a full-size button has room to say where it goes. That is a ticket, not a
restyle, and it is not drawn here beyond the empty slot it would occupy. Carried to
`ADDENDUM-READINESS.md` as the one product call this pass raises.

## 3. Deck-level total → **yes, one figure, on the Shopping filter header only**

Eight amber tails down a list is the same pattern-nobody-perceives problem that put the
over-committed summary at the top of the decklist. One line makes eight prices legible as a fact
about the deck, and "what does finishing this cost" is the only question a player asks of prices in
aggregate.

**It carries its own denominator, because it cannot sum all four states.** States 3 and 4 have no
current price, so the figure is honest only with the count beside it:

- some unpriced — **`$85.95 · 6 of 8 priced`**
- all priced — **`$129.50 · 8 cards`** (the clause drops; nothing is missing, so nothing is named)
- none priced — **no figure at all**, just the shipped `8 cards you don't own`. A total of zero
  cards is not a total.

**Foil prices count toward the sum, silently.** A foil price is the price of the only copy you can
buy, so excluding it would understate the deck by the one card the player most needs warning
about. The per-card tag already says `foil`, so the one that differs is findable; the header does
not need a third clause to say so.

**Never rounded** — whole cents from one store, summed and printed. **Never on `/decks`.** The deck
index keeps the status pill meaning card count and nothing else; the same locked decision that kept
the availability roll-up off it. A deck index of dollar figures makes this a price aggregator, and
the reviewer note that prices are "tricky/sticky" is exactly about that drift.

**The `All` header gets nothing.** A total over a list that is mostly owned cards would invite the
reading *this deck costs $85.95*, which is false — it costs that much to **finish**.

## 4. Staleness → **three levels of honesty, and only one of them shows a date**

| Level | What it says | Why there |
|---|---|---|
| The tag | `sold out` — no date, ever | Eight dates at 9px is noise, and the player's question is *can I buy this*, not *when did you look* |
| The Shopping header | `prices from ManaPool · updated Monday` | Provenance named once per surface, quietly — and a weekly cadence makes age material, so the age rides with the source |
| The accessible name | `$45.00 at ManaPool, priced Monday` | Said in words, once per card, to the reader who cannot see the header |

So **yes, "priced Monday" gets said** — once on the page and once in every price's accessible name,
and never inside the tag. A weekday rather than `3 days ago`: the ingest is weekly, so the weekday
is the fact, and a relative phrase goes wrong at exactly the boundary where staleness starts to
matter.

A price with no source is a claim the product cannot stand behind — the discovery pass's rule. This
extends it by one word, because *that* pass had no cadence to disclose and this one does.

**No last-known price on a sold-out card.** `buy · $0.34 · sold out` was the tempting version and it
is two facts fighting: a figure we will not stand behind, in a slot the header then has to decide
whether to sum. It is the strongest of the roads not taken and it is in the gap report.

## Component notes

Every value below is an existing token. **No new token, no new hue, no new dependency, no motion.**

| Component | Spec |
|---|---|
| **Buy tag (row)** | Unchanged shell: Plex Mono `9.5px`, `--warning` word, `rgba(224,145,60,0.13)` fill, radius `4px`, `1px 5px`. New: `·` separator in `--border-strong`, then a price segment — `--fg-body`, `min-width 58px`, right-aligned, **Shopping filter only**; content-width under `All`. |
| **— price segment** | Figure at `--fg-body`; `--fg` at four significant digits and above. `foil` follows the figure in the same size, `--fg-faint`. `sold out` replaces the figure at `--fg-body-dim` (`#A89B84`). State 4 renders no segment and no separator. |
| **Buy tag (tile)** | Unchanged shell from add-panel §7: `9px --warning` on `rgba(20,17,14,.82)`, `inset 0 0 0 1px rgba(224,145,60,.5)`, radius `4px`, top-right on the art, `pointer-events: none`. Figure takes `--fg`. `max-width: 62%` of the art box; over that, the segment drops and the bare tag renders. |
| **Shopping total** | Right of the shipped `8 cards you don't own` line. Figure Plex Mono `13px --fg`, clause `10.5px --fg-faint` after a middot. Absent when nothing is priced. |
| **Provenance line** | Plex Mono `9.5px --fg-locked`, under the header line, replacing the shipped `export copies names only · pricing is a planned add` on the Shopping filter only. That string stays on the export dialog, where it is still true. |

## Notes for engineering

- **`buy-tag.tsx` is the only component that changes.** It takes an optional `price` prop —
  `{ cents: number | null, foilCents: number | null, updatedAt: Date | null }` or `null` for absent
  — and derives the tail. Both call sites pass it through; neither branches. One place declares buy
  and its colour, and now its price.
- **The four states are derived, not stored.** `absent` = no row; `foilOnly` = `cents === null &&
  foilCents !== null`; `soldOut` = `updatedAt` older than the refresh window; otherwise `priced`.
  Same shape as `availabilityFor()` — a pure function over one row, returning a discriminated
  union, so the two densities cannot disagree.
- **The stale window is the ingest's cadence plus a grace period, and it is one constant.** Not a
  per-surface magic number and not a user-facing setting. If the cadence changes, `sold out` starts
  and stops lying from one place.
- **`decklist-row.tsx`**: the aligned slot is a prop off the filter state (`dense={filter ===
  'shopping'}`), not a media query. Row height does not change in any state.
- **`suggestion-tile.tsx`**: no new branch — `suggestion.owned === false` already gates the tag; the
  price rides the same object. The `max-width` fallback is measured in CSS, not JS.
- **The total is summed server-side with the shopping list**, over states 1 and 2 only, returning
  `{ cents, pricedCount, totalCount }`. Never summed in the client from rendered strings, and never
  recomputed per render — eight rows, one figure, one query.
- **Fail quiet, per the shipped rule.** A failed price read renders every unowned card at state 4
  and the header with no figure — which is the honest picture, and no control ranks, filters or
  sorts on price, so nothing changes meaning. **No banner.**
- **Exports are untouched.** Names only, both tabs. The reviewer note holds: price stays out of the
  copied text, and the export dialog's `names only · prices for reference` caption is unchanged.

## Accessibility contract

```
span.buy-tag[aria-label="Dockside Extortionist, not in your collection, $45.00 at ManaPool, priced Monday"]
span.buy-tag[aria-label="Deflecting Swat, not in your collection, $2.10 at ManaPool in foil only, priced Monday"]
span.buy-tag[aria-label="Grim Hireling, not in your collection, sold out at ManaPool"]
span.buy-tag[aria-label="Squirrel Nest is not in your collection"]        ← shipped string, unchanged
```

- **State 4 produces today's accessible name byte for byte.** The price clause is a suffix on the
  shipped ownership string, appended only when there is a price fact — the same rule `rowAria` took
  in the availability pass.
- **Colour is never the sole signal.** Every state is a word or a figure or the absence of one; the
  amber carries `buy`, which is a word in all four.
- **The tag is never a target** at either density, so no focus style, no hover state and no 44px
  question. See ruling 2.
- **Contrast** against the row surface `--surface-sunken #1A160F`: `--warning #E0913C` ≈ 7.1:1 ·
  `--fg-body #C6B79A` ≈ 9.4:1 · `#A89B84` ≈ 7.0:1 — all AAA at normal size, and the tag's tint
  sits between them and the surface, raising all three. On the tile scrim `rgba(20,17,14,.82)`,
  `--fg #EDE6D8` ≈ 13:1.
- **The total is static text in the existing header**, not a live region. It changes when the
  decklist changes, and the decklist's own announcement already covers that.

## Gap report

1. **A sold-out card's last known price is dropped, and someone will want it.** The strongest road
   not taken (see §4). If it comes back it needs a figure treatment that cannot be mistaken for
   current *and* a ruling on whether the header sums it — two decisions, not one.
2. **`sold out` is an inference, not a fact.** The ingest never deletes, so a stale row means
   *either* sold out *or* the ingest missed a run. The copy asserts the first. A run-health signal
   would let the header say `prices are behind` instead of eight cards claiming to be sold out, and
   nothing in #291 provides one.
3. **The 58px slot is measured against the eight names in this deck.** A five-figure price
   (`$1,240.00`) overflows it and pushes `buy` left on that row. Real for reserved-list cards; the
   slot grows and the column bends rather than truncating, which is the right failure but is not
   drawn.
4. **One store, unlabelled per card.** `manapool` is named once on the header, not per row — cheaper
   and quieter, but if a second source ever lands, every tag needs the source back and this pass
   sets no precedent for where it goes.
5. **Foil-only prices sum silently into the total.** Defensible (§3) and stated in the README, but
   the header figure is then not comparable to a non-foil quote a player finds elsewhere, and
   nothing on screen says so.
6. **Nothing tells the player prices refresh weekly** — only when they last did. `updated Monday`
   implies a cadence without naming it, which is enough for a returning player and not enough for a
   first-time one. A cadence sentence belongs on the export dialog if anywhere.
7. **The link-out slot is asserted, not designed.** §2 names the export dialog as the home and draws
   the space; the affordance, its copy, its new-tab behaviour and any disclosure are a separate
   ticket.
8. **`buy` now means two things at one remove.** On the tag it is an ownership fact; beside a price
   a reader may take it as a verb — the label of a thing to press. Ruling 2 says it never is. Two
   surfaces, one word, and the tile is where a mis-tap would land.

## Files
- `The 99 - Decks · Price Addendum.dc.html` — this addendum's canvas.
- `ADDENDUM-README.md` — this file.
- `ADDENDUM-READINESS.md` — the verdict.
- `The 99 - Decks.dc.html`, `The 99 - Decks README.md`, `REVIEWER NOTES.md` — the shipped handoff,
  unedited.
