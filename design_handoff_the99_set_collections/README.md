# The 99 — Set collections, two routes (design handoff, R3)

`design/design_handoff_the99_set_collections/` · 2026-09-11

**R3 — redrawn on the shipped `/collection`.** §1 is now the real toolbar rather than a sketch of it,
which surfaced a collision nobody had named (`Set ▾` already exists, one word from `By set`).
Collection rows gain the cost track the rest of the app has, the set grid is drawn at 390px in full,
the cell caption adopts the shipped `TLA · uncommon` format, three pieces of furniture come off the
100% head, and the set icon is written down.

**R2 — all three calls ratified, one overruled.** Product's rulings on the R1 form are folded in:
ruling 4 now **marks the cell** instead of the head (and the mark turns out to be the unset half of a
pin that already ships), the entry point is confirmed with its route boundary written down, nothing
is cut, and three edges outside the spec's state list are drawn. R1's proposals are kept below where
they were overruled, so the reasoning survives the reversal.

Structural sibling: `design/design_handoff_the99_commanders_discover/` — same folder convention, same
copy-export shape, same READINESS format, and the same shape of problem (a list route plus a filtered
grid with a state matrix).

Source of truth: **`docs/superpowers/specs/2026-09-10-set-collections-design.md`**, read in full. The
eight rulings are drawn as written and not reopened. Where this package adds something the spec does
not decide, it is marked as a **call** (three of them) or a **decision** (numbered below), and the
two things I want ruled on are in the gap report.

| File | What it holds |
|---|---|
| `The 99 - Set Collections.dc.html` | The deliverable, R3. The entry point on the shipped `/collection` chrome (3 options), the Collection row cost-track parity fix, the index at 5 states, the grid at 12 states across desktop and 390px, the dim in all six themes, the density arithmetic, the component contract. Carries a `theme` prop — switch it and every frame re-renders in that palette. |
| `STATES-set-grid.md` | Every state in the spec's "Surfaces and states", in full, at both widths, including what each must **not** do. |
| `DIM-missing.md` | The dim treatment, its three carriers, and the per-theme measurements. |
| `DENSITY-four-hundred-cells.md` | 399 cells on one page: the arithmetic, the three things that pay for the scroll, and what engineering is free to change. |
| `set-collections · copy strings.ts` | Production strings for both routes. |
| `READINESS.md` | Self-assessed readiness and what blocks a green. |
| `brand/` | The locked brand sheet, copied in for self-containment. |

**Alignment.** Drawn on `design_handoff_the99_refresh/` and the R6 token contract: one filled button
per screen, accent reserved for *in use / to buy*, Cinzel for headings, Plex Sans for body, Plex Mono
for every figure and label, 44px phone / 32px desktop target floors. **No hex literal appears inside
any frame in the canvas** — every value is `var(--token)` — because the feature rests on a dim that
must read the same in six palettes.

---

## The eight rulings, and where each is visible

| # | Ruling | Where |
|---|---|---|
| 1 | Base numbered run drives the figure; variants in their own section with their own count | §3 — two Cinzel sections in one scroll, extras' `7 / 123` one type-step down, and the head says *base run only · extras counted apart* |
| 2 | Child routes, not a view mode, not a sixth nav pillar | §1c draws the view-mode segment and rejects it in the spec's own terms |
| 3 | One cell per collector number; any finish fills it | §3 price strip, last cell: owned-in-foil, `◆ FOIL` on the art, no second cell |
| 4 | Unpinned holdings resolve by `oracle_id`, lowest unfilled cell | §3 base grid: Plains at #262 filled, Plains at #268 missing, two cells apart |
| 5 | Index lists sets you hold, search reaches any set | §2 — at rest 34 rows; `?q=blood` returns BRO and BLC at 0% |
| 6 | Missing cells render the real art, dimmed | §3 and §4 |
| 7 | Prices, a cost-to-complete total, a cart link-out | §3 head: `$1,284.40 over 193 of the 214 missing` + `Send 193 to ManaPool` |
| 8 | Three filters: missing-only, rarity, colour | §3 rack; colour is `filter-bar.tsx`'s pip row mounted verbatim |

---

## The three calls left to Design

### Call 1 · The entry point on `/collection` → **a hairline `By set →` pill in the trailing slot**

32px hairline pill with a 7px `--accent` diamond, in the toolbar's trailing cluster **beside the
Rows/Grid well and never inside it**. 86px of a row with ~300px spare at 1180. Phone gets a full 44px
pill paired with `Filters` in the row above the list, because the phone toolbar has no trailing slot
and a 44px target cannot hide in one.

**Prominence: deliberately low, and one filled button is not spent on it.** Set completion is a second
job, not the job; the entry has to be findable on the second visit rather than loud on the first. It
carries **no count** — `By set · 34` was drawn and dropped, because the number of sets you have touched
answers nothing and competes with the two real counts 40px to its left.

**Placement follows an existing rule on that toolbar:** the leading cluster changes *what is in the
list*, the trailing cluster changes *what surface you are on*. Sets changes the surface.

Two rejections, both drawn. **A recent-sets strip** (1b): 96px of furniture above the list on every
visit for a route most visits are not going to, and it invents a ranking nothing in the data defines.
**A third segment in the view well** (1c): this is ruling 2 redrawn in pixels — the well is a view
mode whose two segments render the same rows with the same filters and change no URL but `?view=`;
a segment that navigates away, drops the filters and renders an inverted population is the /commanders
defect exactly.

**First run: the pill is absent, not disabled.** With nothing uploaded the index would have nothing to
list and the locked upload surface already owns that moment.

### Call 2 · 100% complete → **the head becomes a sealed block; the grid is untouched**

The spec says it deserves a distinct treatment and is the point of the page, so this is not a colour
swap. The whole head block takes a `--success` hairline, the set icon is **ringed** rather than a
filled disc, the ratio is replaced by a Cinzel sentence — *Duskmourn, complete* — the percent and bar
go `--success`, and **the cost strip is replaced by the extras count promoted into the head**
(`Extras 18 / 123 — the only thing left in this set`) with one hairline `Cost the 105 extras` button.
Missing-only goes inert and is glossed *nothing missing to show*.

Below the head, **nothing changes**: same grid, same cells, same filters. The distinctness is
structural — a reader opening four sets from their index can tell this one from the top 120px — and it
survives greyscale, because the shape of the head differs and not only its colour.

**Rejected: any animation, and a badge on the index row.** This state is reached by a collection upload
three routes away and revisited later; a celebration fired on page load celebrates a page load. The
index row already reads `276 / 276 · 100%` in `--success`, which is the same fact without a trophy.

### Call 3 · Density → **one density, 116×162, no toggle**

116px art, 196px cell, gap 10/18 — 8 columns at 1180, 9 at 1280, 3 at 390 (108px). Base run 35 rows =
6,860px; extras 16 rows = 3,136px; **≈10,300px, about 11 screens**.

88px compact was drawn: 11 columns, ≈5,700px, **45% shorter** — and it truncates the card name at ~13
characters. The name is the only thing in a dimmed cell a reader can match against memory; the art is
at 28% and the collector number means nothing to anyone who has not memorised a checklist. **No
toggle either**: a second view control on a page whose sibling route already has one, buying a scroll
nobody performs end to end.

The scroll is paid for three other ways. **(1) The head sticks** — ratio, cost strip and the three
filters pin at 108px desktop / 96px phone, so the figure the page exists for is never scrolled away
from. **(2) Two sections, one jump** — `extras ↓` in the sticky result line is the page's only in-page
nav; no A–Z rail and no number scrubber, because collector-number order is already the reader's index.
**(3) Missing-only is the real density control**, and unlike shrinking everything it removes the cells
the reader is done with.

---

## Other decisions this handoff makes

**1 · The dim is on the art, never on the type — this is the whole separation from "disabled".**
A disabled control in this app dims its *label* to `--fg-locked` and stops responding. A missing cell
keeps its name at `--fg-body` (9.2–10:1 in all six themes), carries a live price, and opens the same
card-detail modal. It is *absent*, not *inert*. See `DIM-missing.md`.

**2 · The missing edge is `1px dashed var(--fg-locked)`, not `--border-dashed`.** The first draft used
`--border-dashed` on the reasoning that dashed is the app's existing *not settled* vocabulary. Measured,
that token runs **1.46:1 (Oil Haze) to 1.97:1 (Canopy)** against the sunken plate and fails the 3:1
non-text floor in all six. `--fg-locked` clears at **3.16–3.44:1**. The style stays, the token changes,
and the general rule is worth keeping: *a dashed line that carries state takes a foreground token, not
a border token.*

**3 · No quantity, anywhere.** An early draft badged owned cells `×2`. The spec makes a cell binary and
rules playsets out of scope, so the badge is gone — it would assert a count the page has decided not to
track. The only mark an owned cell carries is `◆ FOIL`, and only when the holding is foil.

**4 · Rarity is a mono letter (`C U R M`) at `--fg-locked` beside the collector number**, not a coloured
gem. Rarity colour would be a fifth palette on a page already carrying five colour identities and an
accent, and the letter is what the rarity filter itself is labelled with. **It drops at phone** — the
caption there holds the number and the price, and rarity is a filter you set rather than a fact you scan.

**5 · Missing-only brightens the collector number rather than marking the gaps.** The spec notes the
mode breaks number continuity by design. A gap glyph between #014 and #017 would be a cell for a card
the reader chose not to see. Instead the skip is stated once in the result line, and the number goes
`--fg-muted` in this mode: when the sequence stops being continuous the number stops being decoration
and becomes what you read — and what you type into a shop.

**6 · The filters are the selector.** #330's one-selector rule is satisfied by having **no per-cell
control at all**: the `Send N to ManaPool` button follows the filters, so filtering to red rares makes
it `Send 9` with the total recomputed. That is how a reader buys part of a set without a selection UI.
A checkbox on 214 cells would be a second mechanism *and* a 16px control inside a 116px art plate.

**7 · The cost figure states its own gap in the same sentence.** `$1,284.40 over 193 of the 214 missing`,
then `21 have never been stocked and are not in this figure` at `--fg-locked`. Never a total that
silently treats an unpriced card as zero.

**8 · Staleness is a page fact, not a cell fact.** `as_of` trailing the newest `as_of` is a property of
the feed; if the table is stale the cost strip carries one `prices as of 8 Sep` line. 214 individually
stamped tags would be noise in place of a fact.

**9 · Zero results with missing-only on is usually good news, and the copy says so.** Unlike the
/commanders zero state (nothing qualified), an empty set grid under missing-only means *you own
everything that matched*. The first correction offered is therefore the cheapest one that shows the
cards you **do** own, not *clear everything*.

**10 · Two failure pages, one layout.** A non-collectible code gets the reason plus a route to the cards
you hold from it (*Secret Lair Drop has no set to complete*); an unknown code gets *No set with the code
ZZZ* and only the escape. Neither is a 404 route — the breadcrumb survives so the reader is visibly
still inside Collection — and neither offers a search field, because the index is one tap away and
already has one. Both are distinct from **not indexed yet**, which is a real set with a real page that
is merely early.

**11 · The index has one search field and no scope control.** At rest the list is your sets in
`released_at desc`; typing widens to the collectible catalogue. The result line says how many matched
and how many are new to you — the only fact a scope toggle would have carried.

**12 · No cost figure on the index.** Cost to complete is a per-set computation over missing priced
cells; summing it across 34 sets prints a number nobody intends to spend.

---

## R2 decisions

**13 · Ruling 4 marks the cell, and the mark is the unset half of a pin that already ships.**
Product overruled R1's head-line proposal, and the reason reframes the state: *we let readers pick
preferred prints, these cards are cool, and this is the page where you can finally see which one you
have.* An unpinned fill is not an error to disclose — it is the one moment the app can ask a
question worth asking.

`printing_picker` already ships **`Your pick`** as a *filled* 7px brand diamond against
`card_art_preferences`. Unpinned is the same diamond **outlined**, plus mono `BY NAME`, bottom-left of
the art in `◆ FOIL`'s skin at the opposite corner. Not a new mark — the other half of one that exists.

Three properties make it affordable:

- **It never lands on a missing cell.** Only a filled cell can have been filled by name, so the three
  carriers of *missing* are untouched and the mark occupies an otherwise-empty channel. Full-strength
  art beneath it is its own disambiguator.
- **It is a mark, not a control.** Tapping does what tapping any cell does — opens card detail, where
  the shipped `Set` picker lives. No control enters a cell at any width, and the page adds no second
  write path against `card_art_preferences`.
- **It is quieter than the foil mark**: `--fg-body` 9px on a 68% scrim. On a pasted collection it can
  appear on hundreds of cells; at that weight, on cells whose art is at full strength, a field of them
  reads as texture on what you own rather than a field of errors. Accepted cost, stated.

**14 · Pinning from this page moves the fill, and the page must show it.** The pin key is
`(user_id, oracle_id)`, so picking #268 in the modal fills #268 and **empties #262** — two cells
changing from one act, with the ratio unmoved at `62 / 276`. The set page is the only surface where
that swap is legible, which is the argument for the mark in one sentence. **Engineering:** the modal's
existing `revalidatePath("/collection")` must extend to `/collection/sets/[code]`, or the swap happens
invisibly.

**15 · The entry point is ratified, and the route boundary is written down rather than assumed.**
Product confirmed 1a with a warning — *"By set" must be more than a toggle; we had bugs combining
Commanders and Discover.* Nothing crosses the boundary in either direction:

- **Filters do not carry.** /collection's search, type and availability filters are not applied to the
  set page, and colour / rarity / missing-only are not applied back. Different populations, different
  params, no shared key names.
- **Back is a route change, not a state restore.** /collection's filters are exactly as they were,
  because they were never touched.
- **Separate loading and empty states.** The set page has its own `loading.tsx` and its own four empty
  states; none of /collection's are reachable from it.
- **Shared components are mounted, never branched** — the colour filter, the card-detail modal, the buy
  tag. **If a component needs an `isSetPage` flag, that is the bug the warning is about, and the answer
  is two components.**
- **The pill carries no state** — a plain link to `/collection/sets`, no query, no memory of the last
  set. The same rule the /commanders → /discover link got.

**16 · An upload that completes while the page is open does not re-render it.** A grid that silently
relights cells while someone reads it destroys the one thing this surface sells: that what you see is
what you own. The stale page **holds every figure it was serving** and offers the update as an act —
one `--accent`-edged strip inside the head naming the delta *for this set* (`17 more cards from this
set are in your collection now`) with a `Refresh the grid` button.

**Not a toast** (it expires, and a reader who scrolled past it would keep reading a page they had been
told was wrong) and **not dismissible** (it leaves when the grid is right). If the delta is zero the
strip never appears.

**17 · A long set name clamps to two lines and the head grows once; the cost strip is what yields.**
At 390px the longest catalogue names push the sticky head 96 → 118px. Clipping a title the reader
navigated here by is worse than growing a header (the deck-details ruling), and clipping a figure is
worse than moving one — so above two title lines the cost strip collapses to the total and the button,
and its priced-of-missing sentence moves under the grid's result line.

**18 · 100% has three branches and never renders `0 / 0`.** Extras owned → `Extras 18 / 123` plus a
hairline button. Extras present, none owned → the same line at `0 / 96`, which is not a sad zero but
the clearest thing the page can say next, and the button still costs them. No extras at all → line and
button both go, and one `--success` mono line — *Nothing left in this set* — closes the block.

---

## R3 decisions

**19 · §1 is drawn on the shipped chrome, and that changed the recommendation's details.** The real
toolbar is: search field, a `COLOR` well of **round** pips, `Type ▾`, `Set ▾`, `Sort ▾` (accent border
off default), `Availability ▾`, then the view well — with `⟳ Replace collection` as a hairline in the
header and **no filled button on the page**. So: the pill is **46px, not 32px**, matching its
neighbours; it takes an **`--accent` hairline and a filled diamond**, because on this toolbar accent is
already the off-default signal and the pill is permanently "doing something"; and it sits **between
`Availability` and the view well** — the last control before the well, never inside it. The earlier
"one filled button not spent" argument survives: this page has none, and this is not what to spend it
on.

**20 · `Set ▾` and `By set` are opposites, and nothing may be shared between them.** `Set ▾` narrows
the cards you *own* to one set. `By set` leaves for a page of the cards you *do not*. Three carriers
keep them apart: **position** (leading cluster narrows the list, trailing changes the surface),
**shape** (chevron menu vs diamond link — no dropdown affordance on the pill), and **the words** (a
noun naming an axis vs a preposition naming a destination).

**The convenience that must not be built:** carrying `Set ▾`'s value into the route, so that filtering
to EOE and tapping `By set` lands on `/collection/sets/eoe`. That is precisely the state-sharing
behind the Commanders/Discover confusion, and it makes one pill go to two places depending on a
control set ten minutes ago. **The pill always goes to the index.** If the shortcut is wanted later it
belongs *inside* the `Set ▾` menu as an explicit row — `See EOE completion →` — which is a different
control saying so out loud. Not drawn.

**21 · Collection rows get the deck-side cost track (§1b).** A parity fix: every other card row in the
app states mana cost; the Collection row states colour identity alone. The identity pips **move out of
the leading slot** and become a fixed **90px right-aligned track** — a 20px mono mana-value disc then
13px pips — which is `deck-versioning`'s un-shingled track at the size it already ships. Phone: 76px
on the meta line.

Consequences: the name column gains ~74px (names truncate today); **lands keep an empty disc slot, not
a `0`**, so the track never ragged-edges and 37 rows do not print a figure where there is an absence;
and when the logged `ManaPip` work lands this track is one of its ~6 sweep sites with no geometry
change. **Severable** — this is `collection/rows-view.tsx` only and ships or slips on its own.

**22 · The cell caption adopts the shipped tile format.** The collection tile already captions
`TLA · uncommon` — mono, middot, lowercase word. The set page uses the same shape with the collector
number in the set code's slot: `042 · uncommon`. **This reverses R1 decision 4's rarity letter.** The
letter was defensible in isolation and wrong against a surface the reader reaches from one tap away.
Phone still drops rarity — number and price only — because the caption has room for two things.

**23 · Three things come off the 100% head, and one mystery button is withdrawn.**
- `nothing left to buy` — deleted. It restates `100%` in words.
- `nothing missing to show` — deleted, **and the Missing-only toggle is removed outright rather than
  greyed**. This is the one place the *grey in place, never absent* rule yields: that rule protects a
  control's **state**, and here there is no state to lose — the filter's population is empty and stays
  empty until the reader sells a card.
- `Cost the 105 extras` — **withdrawn as unclear**, correctly flagged. It named a verb the app does not
  use and did not say what it would do. In its place **the page's own cost strip re-scopes to the
  extras**: same component, same one-selector rule, same sentence shape, with *base run* swapped for
  *the extras* — `Cost to finish the extras · $412.90 over 98 of the 105 you are missing ·
  Send 98 to ManaPool`. Nothing new to learn, and it answers "what does it do" by being the thing it
  already is. With no extras at all the strip does not render.

**24 · The set icon is `sets.icon_svg_uri`, everywhere, and it is written down.** Every grey disc
marked `set` in this canvas — 26px index row, 44px set head, 30px phone head, 46px ringed at 100% — is
the real set symbol. Single-colour SVG: `--fg-muted` on an `--elevated` disc at rest, `--success`
inside a `1.5px --success` ring with no fill at 100%, **which requires the glyph to inherit
`currentColor`** — if it does not, that is a fetch-and-recolour job and it is the one asset risk here.
Always `aria-hidden`: the set code beside it is the identifier.

**25 · Quantity stays off the set-page cell, and this is a deliberate divergence from the shipped
tile.** Collection tiles badge `×1` / `×2`; set cells do not. The spec makes a cell binary (ruling 3 —
any finish fills it) and rules playset tracking out of scope, so a count on this grid would assert
something the page has decided not to mean. Stated here because "match what we have today" and the
spec point in opposite directions on exactly this one pixel, and the spec wins.

**26 · The §4 theme cards were sized `minmax(420px, 1fr)`, which is why cells differed in height.**
Auto-fit stretched the last row's cards wider than the rows above, and the cells inside were
`aspect-ratio`-sized off that width. Fixed: theme cards are a flat `452px` and the cells a flat
`64 × 89`, so every swatch in the matrix is now literally the same cell six times.

---

## Component notes

The canvas §6 carries the full contract. The four that engineering is most likely to get subtly wrong:

| Component | Spec |
|---|---|
| **Cell** | 116×162 art (63/88), radius 6, on `--surface-sunken`. Owned: art `opacity 1`, `1px solid var(--border)`. Missing: art `opacity .28` + `saturate(.55)`, `1px dashed var(--fg-locked)`. **No geometry differs between the two** — the grid must not reflow when a filter flips. |
| **Price tag** | The deck-side buy tag verbatim: mono 10px `--accent` on `1px solid var(--accent-dim)`, radius 4. Foil-only prefixes `◆ foil`. Unstocked is the word `no stock` in `--fg-locked` on `1px dashed var(--fg-locked)`, holding the slot's height. |
| **Cost strip** | Inside the set head, `--surface-sunken` on `1px --border`, radius 10. Mono 19px `--accent` total; the sentence names priced-of-missing; the unstocked count follows at `--fg-locked`. Trailing button is the page's one filled button and takes `--fg` bone, not accent — accent is already doing *to buy* on 193 tags below. |
| **Sticky head** | Ratio + cost strip + the three filters, 108px desktop / 96px phone. Whatever windowing engineering chooses must not break it or the `extras ↓` jump. |

## Notes for engineering

- **The colour filter is mounted, not forked.** Same component, same URL key, same lit/unlit rule.
  **No join-mode modifier on this page** — a card has one colour identity in a set list, so *any /
  exactly* has nothing to modify. Do not pass a disabled modifier through.
- **Every control is a URL parameter**: `c` (comma-joined), `r` (rarity), `m=1` (missing only), and
  `q` on the index. A filtered set page is linkable and survives reload.
- **One count function.** The result line, the `Send N` button label and the cost strip's denominator
  are three readings of one filtered-cell computation. Do not count in three places.
- **The cell is the only target.** No control inside a cell at any width; tapping opens the existing
  modal (`src/lib/collection/card-detail.ts`).
- **Copy** lives in `src/lib/copy/` — see `set-collections · copy strings.ts`. Two blocks,
  `setsIndexCopy` and `setPageCopy`, sharing `setFilterCopy`.
- **Mock data:** the EOE figures (276 base, 277–399 extras, 214 missing) are the spec's. `62 / 276`,
  `$1,284.40`, `193 priced`, `21 unstocked` are internally consistent but invented. Only the six card
  names the spec cites are real; every other name in the canvas is a placeholder, and every plate is
  an art stand-in for `image_uri_small`.

## Gap report

1. ~~**Unpinned matching is invisible on the cell, by decision.**~~ **Closed at R2 — Product ruled:
   mark the cell.** See decision 13. R1's head-line proposal is withdrawn.
2. **The duplicate-oracle case is drawn but its copy is not settled.** Plains #262 filled and #268
   missing is arithmetically right per the spec and visually indistinguishable from *you own one of
   the two full-arts* — which is, in fact, exactly what it means. No wording is proposed.
3. ~~**The 100% head is drawn on one set with 18 extras owned.**~~ **Closed at R2** — both branches
   drawn in §3b, and the no-extras line ratified as *Nothing left in this set*.
4. **Set icons are `icon_svg_uri` and are drawn here as a plain disc.** They are single-colour SVGs;
   the canvas shows the slot, its size (26px index / 44px head) and its tokens, not the glyph. The
   `--success` ring at 100% assumes the glyph inherits `currentColor`, which is unverified.
5. **Sticky-head height is still asserted, not measured on a device** — but the wrap case is now
   drawn (§3b): the head grows 96 → 118px and the cost strip yields its sentence. The figures remain
   derived from the drawn type sizes, not from a device.
6. ~~**Nothing here decides what happens when a set page is open and a collection upload
   completes.**~~ **Closed at R2** — drawn in §3b; see decision 16.
7. **Windowing is unresolved and left to engineering** (§5). The design does not depend on it, but it
   is the one implementation choice that can break the sticky head and the jump.
8. **The cost strip's currency and rounding follow #288/#330 by assumption.** Not re-derived here.
