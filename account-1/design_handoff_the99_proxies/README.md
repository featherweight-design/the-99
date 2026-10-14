# The 99 — Deck proxies (design handoff, R2)

`design/design_handoff_the99_proxies/` · 2026-09-14

**R1 — the first round.** Drawn on the shipped surfaces, not on sketches of them:
`collection/filter-bar.tsx` for the rack, `cards/card-modal.tsx`'s `AvailabilityDetail` for the
receipt, `decks/buy-tag.tsx` for the slot a proxy tag occupies, `decks/decklist-row.tsx` and
`decks/spine-desktop.tsx` for the row and the commander caption, and `sets/set-index-view.tsx` +
`lib/copy/set-collections.ts` for the sibling route. Four calls are made and one is flagged for
Product rather than settled.

Structural sibling: `design/design_handoff_the99_set_collections/` — same folder convention, same
copy-export shape, same READINESS format, and the same shape of problem (a new route under the
collection reached from the filter bar's rack).

Source of truth: **`docs/superpowers/specs/2026-09-14-deck-proxies-design.md`**, read in full at
`main`. The five rulings are drawn as written and not reopened. Where this package adds something
the spec does not decide, it is marked as a **call** (four of them) or a **decision** (numbered
below), and the two things I want ruled on are in the gap report.

| File | What it holds |
|---|---|
| `The 99 - Deck Proxies (R2).dc.html` | The deliverable. Ten frames: the tag and its slot, the commander caption, the sheet's control at three states, the receipt at two, the rack entry at three, the list populated, the list empty at three branches, the language contract, the six-theme matrix, the component contract. Carries a `theme` prop — switch it and every frame re-renders in that palette. |
| `STATES-proxies.md` | Every state across the three surfaces, at both widths, including what each must **not** do. |
| `COVERED-not-owned.md` | The language contract, the per-theme contrast measurements, and the list of pixels that must never change when a card is proxied. |
| `deck-proxies · copy strings.ts` | Production strings for all three surfaces. |
| `READINESS.md` | Self-assessed readiness and what blocks a green. |
| `brand/` | The locked brand sheet, copied in for self-containment. |

**Alignment.** Drawn on the R6 token contract read from `src/app/globals.css` at `main`: accent
reserved for *in use / to buy*, Cinzel for headings, Plex Sans for body, Plex Mono for every figure
and label, 44px phone / 34px desktop row floors. **No hex literal appears inside any frame** — every
value is `var(--token)`.

---

## The five rulings, and where each is visible

| # | Ruling | Where |
|---|---|---|
| 1 | A proxied card releases the physical copy | §4a — the receipt reads `1 in use · 0 free` with three lists wanting it and nobody short |
| 2 | Proxying is outside versioning | §3 — one mono line (*takes effect at once*), no confirm, no Apply, no undo receipt |
| 3 | Commanders can be proxied | §2 — the spine caption, including the pair case |
| 4 | Three surfaces, not one | §1–2 the deck, §4 the receipt, §6–7 the list |
| 5 | A proxy covers the whole ask; no quantity | §1 — the tag is one word with no tail; §4 — the second list has no figure column at all |

---

## The four calls left to Design

### Call 1 · The mark's form → **one glyph, `P`, in the buy tag's collapsed box, decoded by a key**

`BuyTag`'s box to the pixel — mono, radius 4, `px 5 / py 1`, 9px phone / 9.5px desktop, `flex-none` —
at **the density the All view already draws money at**. `$` is to buy; `P` is proxy. Same box means
**the row does not move when the state flips**, which is the reason the two share a slot rather than
sitting beside each other.

**The asymmetry in densities is the model's, not a shortcut.** The buy tag has two (collapsed `$` in
All, full `buy · $32.90` in Shopping) because it carries a figure. The proxy mark has one, because a
proxied card is never a Shopping row — so there is no surface where the word would be drawn beside a
card name at all.

**A letter, not a shape.** Every small geometric mark here is taken: the rotated diamond is the
availability glyph in four states, a filled diamond is `printing_picker`'s `Your pick`, an outlined
one is `BY NAME` and the rack's link, a disc is the ownership dot. A fifth diamond would be
unreadable, and any new shape needs teaching anyway — at which point a letter teaches faster, because
a key can spell it.

**The word is still authored, in three places:** the key, the `title`, and the accessible name. The
last is not a new mechanism but `BuyTag`'s own — at collapsed density it draws `$` `aria-hidden` and
speaks the word and the price in full from an `sr-only` span.

**The feature spends no colour, and that is the central call rather than a saving.** Every hue in
this app is booked: `--accent` is *in use / to buy*, `--warning` is money, `--success` is complete,
`--danger` is over-committed. A proxy is none of those, and the one thing it must never say is
*owned*. Neutral ink on a dashed edge borrows no meaning.

**Dashed is not decorative.** It is already this app's word for *not settled cardboard*: the unowned
ownership dot, the unresolved row, the spent-slot receipt, the missing set cell. A printed card is
exactly a card-shaped thing that is not cardboard.

**The edge is `--fg-locked`, never `--border-dashed`** — `set_collections`' general rule restated:
*a dashed line that carries state takes a foreground token, not a border token.* Measured against
`--surface-rail`, `--fg-locked` clears **3.14–3.35:1** in all six themes; `--border-dashed` clears
none of them. The word takes `--fg-body` (9.1:1 in Low Sun) because it is text and owes 4.5:1.

**Rejected words.** `printed` — one letter from *printing*, on a surface that ships a printing
picker. `paper` — slang, and it names the object rather than the deck's answer. `covered` — the word
this package uses in prose, but as a label it states the effect and hides the cause, and the cause is
the only thing a player can act on.

### Call 1b · The key, and the mark family's skin → **a key under the toolbar; skin A**

**The key sits under the decklist's toolbar, above the first group heading, and lists only the marks
present in the current view.** An empty legend is furniture, and this app is already strict about
that. One mono line, `--fg-faint` words beside the real marks at their real size, so it is a *sample*
rather than a description. It grows by one pair per mark and wraps rather than scrolling. A trailing
hairline link — *what the marks mean* — is the door to the about page, and **absent rather than dead
until that page lands.**

**That reframes the colour question.** Once marks are a family — money, proxy, game changer, bracket
mover — a reader cannot learn four hues and the contract does not have four to give, so **the glyph
identifies, the key decodes, and colour only has to say *there is a mark here*.** Which turns *what
colour is proxy* into *what colour are marks*, decided once. Money keeps `--warning` as the
exception, not the precedent: a price is the one mark you can act on with a credit card.

**The colour audit is in §1b and its answer is uncomfortable:** the contract has exactly four hue
families and all four are booked (`--accent` in use/to buy, `--warning` money, `--success` complete —
forbidden here by definition — `--danger` over-committed). The `--avail-*` keys are aliases of those;
the WUBRG swatches mean colour identity. And minting one does not escape it, because `--accent` is
the per-theme hue and across the six it lands on orange, pink, yellow-green, teal, violet and blue —
six of the eight hue regions. **Any fixed hue collides with at least one theme's accent, in the one
theme whose reader will never see the others to compare.**

**Ratified: A.** The skin is `--fg` at weight 600 on a `1px dashed var(--fg-locked)` edge, no fill —
which is what every frame in the canvas draws. **B, C and D stay in the package rather than being
deleted,** because the argument they carry is the one a future mark will reopen: the day someone asks
for a game changer in green, §1b is the record of why the family shares one neutral skin and why no
fixed hue survives six accents. **C is the one to revisit if that ever changes**, and it is a
deliberate change to what `--accent` means rather than a free win.

§1b draws the four candidates in all six themes: **A neutral bright** (`--fg` at 600 on the dashed
`--fg-locked` edge — recommended, and already louder than the word it replaces), **B filled plate**
(mass instead of hue; loses the dashed edge, which was carrying meaning), **C accent** (real colour,
themes for free, and a deliberate loosening of what accent means — the option to pick if you want
colour), **D a minted hue** (drawn so the Witching Hour collision is visible rather than argued).
Ratified as A; the other three are kept as the reasoning's receipt.

### Call 2 · The control → **a square tick in a deck-scoped block in the card sheet**

`filter-panel.tsx` ships the ruling and `card_assignments` spent a round confirming it: *round for
single-select — a square tick on a one-of-many list promises you can have two.* The assignment
chooser went round because one copy cannot honour that promise. **A proxy claims nothing, so here the
promise is true:** every deck can be proxying the same card at once, independently. Same rule,
opposite answer, because the supply constraint is gone.

Geometry is the panel's, unchanged: 16px desktop / 18px phone, gap 11/12, 1px ring, 44px row floor at
both widths, radius 2. Fill is `--fg-body` and the check is `--bg` — **not accent**, which is
reserved for *in use / to buy* on every surface this sheet opens from.

**No Apply, no confirm, no undo receipt.** Ruling 2 lands the toggle immediately. Unmarking can put
the deck back to short, and the spec is explicit that this is the same arithmetic a pull already
performs and needs no warning of its own — so marked → unmarked is one tap with nothing in between.

**Absent, not disabled, with no deck context.** Opened from `/collection`, a set cell or commander
detail there is no deck to proxy into. The *grey in place, never absent* rule protects a control's
**state**; here there is no state, because there is no deck the control could be about.

### Call 3 · The receipt's proxy line → **a second list below the split, with no figures**

`AvailabilityDetail` is a receipt and it has to add up: `in use + free === owned`. A proxying deck was
never in that arithmetic. So it rides **below the split line, behind a hairline** — the hairline is
the boundary of the accounting — under its own heading, `Running a proxy`.

**That list has no right-hand column.** `holds N` / `wants N` are quantities of cardboard and there
is none here; `prints 1` would put a quantity on a thing ruling 5 says has none. The missing column
**is** the statement, and it also makes the two lists tell themselves apart at a glance with no
legend to learn.

**`Availability.claims` keeps carrying real claimants only.** Folding proxies in would make
`hardDecks`, `pullSources`, the markers and the pull authorization all start subtracting cardboard
that does not exist.

### Call 4 · `/collection/proxies` → **one card per row, its decks named beneath, its price to the right**

Newest first on `deck_proxies.created_at`, which the spec names as load-bearing — *the only record of
when a printed copy entered a deck*. The page answers the two questions in ruling 4's own terms: the
decks are **named** (what to print), and a cost strip states what owning them for real would cost
(what to buy later), always with its own gap stated — *$486.20 over 7 of the 9*, unpriced named
underneath.

**The row price is a bare figure, not a buy tag.** `isShoppingCard` has just removed every one of
these cards from every Shopping list; drawing the tag they were removed from would put two surfaces
in direct disagreement. And **no `Send N to ManaPool`** — the cart builder assumes a shopping list,
and this is a list of things the player has decided not to buy.

---

## Other decisions this handoff makes

**1 · The ownership dot never changes, and this is the single most important pixel in the package.**
A proxied row keeps its hollow dashed dot, because the dot reads `card.owned` and a proxy changes
nothing about the collection. **The dot is the box's word; the tag is the deck's word.** The row
honestly reads *not in your collection · covered by a proxy*. Filling that dot in would be the app's
first lie about what is in a box. Rejected with it: a half-filled dot and a third dot state — both
make the collection's own glyph answer a question about a deck.

**2 · No availability marker on a proxied row, and nothing is added to suppress it.** The marker's
`free` state renders `null` by design, and the anti-join in `all_claims` already makes a proxied card
free. The model and the drawing agree with no special case.

**3 · The exclusion is structural.** One function — `deckRowTag(card): "proxy" | "buy" | null` — and
one slot. Two sibling conditionals express the exclusivity as a property of two booleans that happen
to disagree today; the co-occurrence they permit is the one state in this feature nobody has drawn.
This is the same move the spec makes when it scopes the proxy read to membership rather than
enumerating six cleanup paths.

**4 · The commander tag takes a scrim, and only on the band.** Everywhere else the dashed edge sits
on a flat surface where it measures 3.14–3.35:1. On the art band nothing is guaranteed, so it takes
`color-mix(in oklab, var(--bg) 92%, transparent)` — `BuyTag`'s own tile scrim, at its own opacity,
for its own stated reason (a lighter canvas wants a lighter scrim, or the tag reads as a hole punched
in the art). **Unconditional, never gated on how bright the crop is:** a primitive deciding how to
look from what is behind it is the defect that comment warns about.

**5 · The pair case is the one place the tag names its owner.** Two commanders, two independent
flags, one caption row. A bare `proxy` would be ambiguous and `proxy ×2` is banned by ruling 5, so
the pair case — and only the pair case — reads `proxy · Tymna`. Both proxied draws two tags in name
order; the row already wraps. A single commander never pays for this.

**6 · One line under the deck's progress bar, and it is severable.** *7 of these are proxies*, mono
`--fg-muted`, absent at zero, no colour and no control. **R2 puts the same fact on the `/decks` tile**
as `7 proxies`, in the tile's own detail slot — see `ADDENDUM-README.md` §11. A 99-card deck reading `Complete` with seven
printed cards is correct and is also the exact moment a player could be misled. **Not a roll-up
band** — those are alarm chrome for over-commitment, and a proxy is not a problem to be solved.
**This is the one thing in the package the spec does not ask for.** Cut it and nothing else moves.

**7 · The status pill still says `Complete`.** The app's vocabulary is already explicit that
*finished lists hold*; the pill has always been a claim about the list, never about a box. Rejected:
a `Complete*` variant or a sixth pill. A proxied deck is finished, and inventing a lesser word for it
is a judgment the app has no business making.

**8 · The rack pill is `--border-strong` with an outlined diamond, not a second accent hairline.**
Two accent hairlines inside 180px is two permanent off-default signals, and the second one stops
meaning anything. The outlined diamond is `printing_picker`'s unset half again — the same move
`set_collections` made for `BY NAME`. **Ranking is not disabled-ness:** the label stays `--fg-body`,
identical to its neighbour's, which matters most in the state where this pill is the only one on the
row.

**9 · The pill carries no count.** `Proxies · 12` was drawn and dropped for the reason `By set · 34`
was: it competes with the real count 40px to its left, and the number of cards you print is not a
figure anyone is tracking toward zero.

**10 · No entry point from `/decks`.** Tempting, because proxies are made in decks — but the list is
*across* decks, and a door on a per-deck page implies a per-deck list. One door, one list.

**11 · Three empty branches, and only one of them is a gap.** *Nothing proxied yet* (ghost button to
`/decks`; the body says where the act lives, because there is no way to start one from here). *No
decks at all* — a different heading, because it is a different fact, and the only branch with a
filled button. And **a full list with no collection**, which renders exactly as it does for anybody
else: no upload prompt, no banner, no empty-collection chrome anywhere on this route. Prices still
work there, because a price is a catalogue fact.

**11b · The key is the only place the word appears on the deck page, and that is the point.** The
brief's instruction stands behind this: the deck page does not have to carry all the information, and
the about page will. So the surface carries a glyph and a two-word gloss, and anything longer than
two words lives elsewhere. Hover alone was considered and refused — not because of touch, but because
a tooltip teaches one reader at a time on a surface whose whole job is scanning ninety-nine rows.

**12 · No proxy tag on the proxy list's rows.** Every row is a proxy; a tag on all of them is a
legend, not a mark. A `commander` plate does appear where the proxy is a commander, in the neutral
hairline skin, because ruling 3's case is otherwise invisible in that list.

**13 · The list is read-only.** See the gap report — this is the one flagged for Product.

---

## Component notes

The canvas §10 carries the full contract. The four engineering is most likely to get subtly wrong:

| Component | Spec |
|---|---|
| **ProxyTag** | Mono, radius 4, `px 5 / py 1`, 9/9.5px, `flex-none`. Glyph `P` at `--fg` weight 600, edge `1px dashed var(--fg-locked)`, no background. Two variants like `BuyTag`: `row` and `band` (the unconditional 92% `--bg` scrim). One glyph, one density, no word on the row — the word rides the key, a `title` and an `sr-only` span. No price, no tail, no quantity, never a tap target. |
| **MarkKey** | One mono line under the decklist toolbar, above the first group heading. Renders only the marks present in the current view, and nothing at all when there are none. Real marks at real size beside `--fg-faint` words; the about-page link is `--fg-locked` with a `--border-strong` hairline underline, and omitted while that page does not exist. **Takes the marks as data, not as a hardcoded pair** — it is the surface every future mark is added to. |
| **deckRowTag** | `"proxy" \| "buy" \| null`, one slot. The exclusivity constraint expressed as a type rather than a convention. |
| **ProxyControl** | `null` without a `deckId`. Block chrome is `AvailabilityDetail`'s verbatim so the two read as one column. Tick 16/18px, radius 2, ring `1px --fg-faint`, checked fill `--fg-body` with a `--bg` check, 44px row floor. Optimistic, no confirm, no spinner — the tick is the receipt. |
| **ProxyRow** | The set-index row's shell (`rounded-[10px] px-[12px] py-[11px] min-h-[44px]`, hover `--elevated`). The card name opens the sheet; the deck names are separate links and **must not nest inside it** — the row is a container, never a button. |

## Notes for engineering

- **Copy** lives in `src/lib/copy/proxies.ts` — see `deck-proxies · copy strings.ts`. One block,
  `proxyCopy`, with `entryPoint` shaped like `setPageCopy.entryPoint`.
- **One count function.** The subtitle's *9 cards across 4 decks*, the cost strip's denominator and
  the tail's *… 5 more* are three readings of one computation.
- **Revalidation is a visible bug if missed.** A toggle moves figures on *other decks'* detail pages
  and changes the new list, so `claimSurfaces` gains the `/decks/[id]` pattern and the literal
  `/collection/proxies`. Without the first, the ruling-1 drawing is a screen a player never sees
  update.
- **Route boundary.** The rack pill is a plain link — no query, no memory of anything. `/collection`'s
  filters are not applied to the proxy list and it has none to apply back. Same rule `By set` took
  after the Commanders/Discover warning.
- **Mock data.** The Ozolith in HD Gods is the spec's own example. Every other card, deck, figure and
  date in the canvas is invented and internally consistent; the art band is a striped stand-in for
  `art_crop_uri`.

## Gap report

1. **The proxy list is read-only, and this is the one call I want overruled or confirmed.** The row
   opens the sheet with no deck id — a card here belongs to several decks and the sheet's control is
   per deck — so unmarking happens in the deck, via the deck-name links on each row. The alternative
   is expressible (the row knows every deck id), and it is not drawn because it puts *N*
   state-changing controls in a row of a list whose job is to be read, and because a mis-tap there
   silently puts a deck back on the shopping list. **If the print-run workflow involves pruning the
   list in place, reopen this first.**
2. **The line under the progress bar (decision 6) is outside the spec's surfaces.** It is drawn
   because constraint 2 names *the deck can read Complete* as the danger zone, and nothing else in
   the spec answers it. Severable, and stated as such.
3. **The deck-page tag has no drawn hover or focus state, because it has none** — it is a mark, like
   the availability marker and the buy tag. If review wants the tag to be the control's target, that
   is a different design and it changes the row's target model.
4. **The proxy list's price provenance is assumed, not re-derived.** It follows the set page's cost
   strip (`printing_prices`, newest `as_of`, page-level staleness line) on the assumption that the
   same feed and the same rounding apply.
5. **CLOSED in R2** — see `ADDENDUM-README.md` §12. The word is `proxied`, a chip rather than a
   bucket heading (those were withdrawn at deck-versioning R2). The original wording follows.
   **Nothing here decides what `/decks/[id]/changes` shows for a card that is proxied while a draft
   is pending.** Ruling 2 says a proxy never appears there, and `bucketAdds` gets its own bucket so
   the review screen does not bill it — but the *word* on that bucket is undesigned, because the
   commit receipt was not one of the three surfaces. Small, and it will be needed in PR 4.
6. **The 92% scrim on the band variant is taken from `BuyTag` rather than measured against a real
   crop.** A very bright art under a 9px dashed hairline is the one case that could still fail, and
   it is the same risk `set_collections` filed against real art luminance.


---

## R2

Two additions, no R1 surface reopened: the proxy count on the `/decks` tile, and the `bucketAdds`
word on the review row. Both are documented in **`ADDENDUM-README.md`**, with states in
**`ADDENDUM-STATES.md`**. R2 also found a shipped defect the word exposed — the review row draws a
buy tag on a proxied add — which is finding 1 there.
