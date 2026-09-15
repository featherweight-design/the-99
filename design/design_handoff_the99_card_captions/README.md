# The 99 — Card captions (design handoff, R1)

**Source of truth:** `docs/superpowers/design-briefs/2026-09-14-modifiers-below-the-card.md`, read in
full on `design/card-view-captions` (PR #635). The seven rulings in §2 are drawn as written and not
reopened — **including ruling 2's deletion: no cost pips appear anywhere in this handoff, at any
size.**

`design_handoff_the99_card_surfaces/` is the structural sibling and the thing this replaces: its
Matrix 2 is the deck tile whose four corners are being emptied. `design_handoff_the99_proxies/`
(on `feat/proxies`) is cited for one rule and not reopened — `STATES-proxies.md:27-30`, the buy
tag and the proxy mark share one slot.

File: `The 99 - Card Captions.dc.html` (canvas — pan/zoom). `STATES-card-captions.md` is the nine
states as a table, `card-captions · copy strings.ts` the strings, `READINESS.md` the two
dependencies.

**`ADDENDUM-the-key.md` answers erratum 7** of `docs/superpowers/readiness-card-captions.md`, which
withdrew ledger item 9 and carried it back to Design: card view draws marks and has no legend.
**Called: card view gets a key — the same component, in the same slot, with the tile's own word for
`$` and the list's word for `P`.** The divergence is one word wide, because `$` marks two different
sets of cards on the two surfaces while `P` marks the same one. Drawn as the addendum section at the
top of the canvas.

**The one-line summary:** *two lines, always, and the art keeps nothing — which is what lets the
three slot occupants become one visible box.*

## What Design read

The brief on its branch, and six components at `main`: `collection/grid-view.tsx`,
`decks/deck-card-tile.tsx`, `ui/availability-marker.tsx`, `decks/buy-tag.tsx`,
`ui/ownership-dot.tsx`, `cards/two-faced-mark.tsx`. Every geometry figure below is quoted from the
component that ships it. **Where a component and this handoff disagree, the component wins** and
these tables are what to correct.

Nothing here changes what a modifier means. The chip is `AvailabilityMarker density="chip"`, the
money tag is `BuyTag variant="tile" density="collapsed"`, the dot is `OwnershipDot`, the mark is
`TwoFacedMark`, the proxy is `ProxyTag`. **One prop is asked for and no new component** — see the
ledger.

## The four calls

| # | Question | Called |
|---|---|---|
| **A** | The caption's shape (§3) | **Two lines, always, both routes: a mono meta line, then the name.** The deck's `✕` is a full-height right column. 46px desktop / 52px phone, fixed. |
| **B** | Draft state (§4) | **The edge transfers, the pair moves house.** 2px accent inset edge on the *caption*, not the shell. The pair lands where the count was: `1 → 2` recounted, `+1` added, both suppressing `×N`. |
| **C** | The proxy mark (§5) | **The row's `P`, in the meta line's one slot, at the row's own size.** No new form. A proxied tile draws no chip, no price, no count, a hollow dashed dot, and does not grow. |
| **D** | What stays on the art | **Nothing, and the bottom scrim goes with it.** Ruling 1 permits keeping one corner; keeping one re-imports the shadow, which is the cost the brief is trying to recover. |

---

## A · The caption is two lines because one line is 72px short

**The shape.** Under the art, a mono **meta line** — ownership dot, the one slot, the count (or the
draft pair), and on `/collection` the right-aligned `SET · rarity`. Under that, the **name line** —
the printed front-face name, single line, never clamped, with the `//` mark after it on the deck
tile. On the deck tile the **`✕` is a full-height right column**, vertically centred, so it is the
only thing in the caption that is paid for twice.

| | Desktop | Phone |
|---|---|---|
| caption height | **46px**, fixed | **52px**, fixed |
| meta line | mono 9.5px, 14px box, gap 6 | mono 9px |
| slot box (all three occupants) | radius 4, `px 5 / py 1`, mono 9px | mono 8.5px |
| name line | 13px / 600 | 12px / 600 |
| pad left / right | 10px; **3px** beside the `✕`, 10px without | 9px; 3px / 9px |
| `✕` column | **32×32** | **44×44** |
| tile total | 178 + 249 art + 46 = **295px** | 175 + 244 + 52 = **296px** |

**The arithmetic that decided it.** At 178px the deck's meta content measures ~105px in its worst
non-draft state (8px dot + 6 + a `none free` chip at ~71px + 6 + `×2` at ~14px). The name needs
≥110px to read as a name — roughly sixteen characters at 13px. The `✕` and its padding take 45px
desktop / 56px phone off the top of both. **One line is short by ~72px**, and the only way to close
that is to cut the name to eight or nine characters: a tile whose caption reads *Smothering…* has
moved the modifiers off the art at the cost of the one thing the caption was already for.

**Two lines is arrived at, not preferred.** And because §3 forbids a data-dependent height, *every*
tile takes both lines — which is the same drawing as "two lines only when needed, padded to the
worst case", reached by a shorter route.

**The meta line is above the name, not below it.** The marks qualify the picture, so they sit
against it. The name then closes the tile, and in a six-up row the six names land on one line
instead of being pushed around by whatever marks each card happens to carry.

**Everything on the meta line is mono, and the split is by what the reader does with it.** Glyph,
count, set code, draft pair — all figures, all at figure sizes. The chip keeps its two words,
because `none free` and `short 1` are what the marker *means* and the *colour is never the only
carrier* rule forbids reducing them to a glyph.

**The two widths land 1px apart in total height**, which is ruling 3 paying out: the phone's taller
`✕` is almost exactly the 3px of art the narrower tile loses. Neither width is the compromise.

**`/collection` keeps its set line and gains nothing.** `SET · rarity` is already mono `--fg-faint`,
so it joins the meta line right-aligned rather than becoming a third row — and the shipped phone
behaviour, set code without the rarity, is what keeps it inside 175px.

### Rejected shapes

- **One line, name truncated harder.** Eight characters of name. See above.
- **Two lines only when there is something to say.** Forbidden by §3 and by both components' own
  comments (`grid-view.tsx:88-92`, `deck-card-tile.tsx:194-198`).
- **The `✕` on the name line only, caption 34px tall.** Saves 12px of tile height and costs the name
  32px of width, on the line where width is the scarce thing. The right column spends height, which
  a vertically-scrolling grid has.
- **A third caption row for the set line.** It right-aligns on the meta line instead.

---

## D · The art keeps nothing, and the scrim deletes with its occupants

Ruling 1 removes the modifiers and stops short of requiring a bare illustration. Design is going
the rest of the way, and the argument is three points long.

The tempting version keeps the availability chip top-left, because it paints its own scrim and never
depends on the art beneath it.

**1 · The slot would be in two places.** The chip, the money tag and the proxy mark are one slot by
rule. Drawing the chip on the art and its two alternates in the caption puts one slot's three
occupants in two locations — a rule the reader can no longer see, and §5's exclusivity is exactly
what it would stop showing.

**2 · The chip is the state that speaks least often.** The marker returns `null` at `free`, so the
kept corner is empty on most tiles in a healthy collection: a corner reserved on every card for a
mark most cards do not carry.

**3 · One mark still costs the whole scrim.** Legibility over unknown art is not per-mark. Keep any
corner and `inset 0 -40px 40px -30px rgba(0,0,0,0.6)` stays, or a new wash arrives at the top — and
the brief's own survey says that shadow has no other job. **Bare art is the only version that
recovers the picture rather than most of it.**

**Kept: the 1px inner edge**, `inset 0 0 0 1px rgba(0,0,0,0.25)`. Not a scrim for a mark — it keeps
a pale card frame from bleeding into the tile plate, which is a job nothing else does. And the art
stays one click target, now genuinely undivided.

**The quantity badge goes down with the rest.** It is the loudest thing on the art — accent fill,
`--bg` ink — and a count is the most ordinary fact a tile carries. On the meta line it is a mono
figure beside the dot, still absent at one copy.

**What the move pays for.** Off the art, the chip, the money tag and the proxy mark stop needing
scrims; with no scrim they are *the same box* — mono, radius 4, `px 5 / py 1`, differing only in ink
and edge. **The one-slot rule stops being a convention and becomes something a reader can see.**

---

## B · Draft state: the edge transfers, the pair moves house

The list view's treatment is a 2px accent inset edge on any touched row, plus an inline pair
(`Sol Ring 1 → 2`) in the name's place that suppresses `×N` (`decklist-row.tsx:124-142`). The card
view has neither: `usePendingChange` has exactly one consumer, so a deck with an uncommitted draft
photographs identically in card view whether the draft is clean or not (ruling 5).

**The edge: same 2px accent, on the caption block's left, full caption height.** Not the shell, and
nothing on the art.

- **The shell's border is already spoken for.** Over-committed tints it. An accent inset ring would
  sit 1px inside that tint — two unrelated facts on one edge, on the tile where both are most likely
  to be true at once.
- **The caption is the honest host.** The draft changed a *count*, and the count is in the caption.
- **Same 2px, not a tile-native thickness.** A reader switching views should see one treatment.

**The pair: where the count was, not where the name is.** `×N` is still suppressed, and the pair
takes the position it vacates on the meta line.

- **The row's reason does not survive the move.** The row puts the pair beside the name because the
  name is where its count lives. The tile's count has its own mono line, so the pair lands there,
  the double statement is still resolved, and **the name is not asked to give up 30px it does not
  have at 178px.**
- **Two figures, one family.** `1 → 2` for a recount between non-zero counts — the list view's form
  verbatim. `+1` for a card the draft added, which the list view has no shape for, because a row
  that did not exist has no count to move. Both accent, both mono, both *replacing* `×N`.
- **Neither is a control, and the `✕` is unchanged by the draft.** Removal in a dirty draft is the
  same tap as in a clean one.

**Rejected:** a tile-native accent corner or dog-ear on the art (call D just emptied it, and a draft
is the most temporary fact the tile knows); the pair in the name's place (the row's shape, and it
costs the tile its name); a word — `added`, `changed` (the meta line is figures, and the review
screen is where words live); accent on the shell border (collides with over-committed, and a tinted
edge in a grid of six reads as *selected*).

---

## C · The proxy mark is the row's mark in the row's box

The proxies handoff draws the mark on the decklist row, the receipt and the cross-deck list, and
never on a tile — `STATES-proxies.md` has no card-view state. **That gap closes with no new
drawing**, because the caption's slot is already `ProxyTag`'s own box.

**The mark: `P` at `--fg` weight 600 on a 1px dashed `--fg-locked` edge, no fill, mono 9px desktop /
8.5px phone, radius 4, `px 5 / py 1`.** Skin A, unchanged from the proxies handoff. In the meta
line's one slot, which is where the chip and the money tag also live.

**One drop.** The money tag's `--bg` 92% scrim goes with `plate={false}`: a scrim over a plate is a
hole in nothing. The chip loses its scrim on the same prop and for the same reason.

**A proxied tile must not draw:** an availability chip, a price, a quantity, a filled ownership dot,
or one extra pixel of height. Each falls out of the model rather than needing suppression — the
anti-join in `all_claims` makes a proxied card free, so the marker returns `null` on its own.

**The dot stays hollow, and that is not a lie about a covered slot.** The dot answers *what is in
your box*; the mark answers *what this deck needs*. Filling it would be the app's first false claim
about cardboard, which the proxies handoff already ruled.

**Card view is All-only, so the Shopping case cannot arise** — `isShoppingCard` tests `proxied`
first, so a proxied card is not a Shopping row at all. The tile never has to choose between a price
and a mark; it only has to be a place the mark fits.

**One thing this handoff asked for and did not draw: the key** — now settled in
`ADDENDUM-the-key.md`. R1 asked for `MarkKey` above the grid *"on the same terms as above the
list"*, and **erratum 7 disproved it**: the terms are not the same, because the row draws `$` on
unowned **and** spoken-for cards where the tile draws it on unowned only, so no one word is true of
both. **Called: same component, same slot, one differing word** — `$ not owned` in card view against
the row's `$ to buy`, and `P proxy` on both. The addendum has the entries, the placement at both
widths, and the 9a–9d ledger.

---

## §7's open question — one chassis, two components

The brief declines to force a component share. **The honest answer is that the caption block is
worth sharing and the tile is not.** The two captions are the same chassis to the pixel; the deck's
`✕` carries `useDeckMutation`, `useRemoveOptimisticCard`, `markSlotSpent` and an undo tile that
`/collection` has no use for. A shared `CardTileCaption` taking the meta line's occupants as children
and an optional trailing control is the share that pays; a shared tile is the contortion §7 predicted.

## Engineering ledger

| # | Change | Kind |
|---|---|---|
| 1 | **`AvailabilityMarker`** gains `plate?: boolean` (default `true`). `plate={false}` drops the scrim and the absolute positioning, keeps the glyph, the border and the 8.5px count-only label. **No new density.** | additive |
| 2 | **`BuyTag`** gains the same prop for the same reason. `corner` becomes irrelevant on the tile and should be ignored rather than removed while the Consider tile still uses it. | additive |
| 3 | **`deck-card-tile.tsx`** — four marks leave the art; caption becomes two rows plus a full-height `✕` column; the art's `inset 0 -40px/-50px` shadow deletes; `CostPips` and its import delete (ruling 2). **Net: the component loses code.** | swap + delete |
| 4 | **`collection/grid-view.tsx`** — same caption chassis: chip and `×N` down onto the meta line, set line right-aligned on it, name keeps its own row. Grid goes `md:grid-cols-6` (ruling 3). | swap |
| 5 | **`decklist-group.tsx`** keeps `auto-fill`; eng picks the `minmax()` floor that yields 178px at the default desktop width with the panel closed (§6). | tune |
| 6 | **`usePendingChange`** gains its second consumer: the tile reads the same touched / recounted pair as `decklist-row.tsx:124`, plus an `added` case the row has no shape for. | additive |
| 7 | **`ProxyTag`** — one new call site, no change. `deckRowTag` already guarantees one occupant. | reuse |
| 8 | **`MarkKey`** — **superseded by `ADDENDUM-the-key.md`.** R1's "on the same terms as above the list" was withdrawn by erratum 7. Same component, same slot, one differing word (`$ not owned`), plus one new string (`key.regionAriaCards`). Four lines, 9a–9d. | additive |
| 9 | **Severable:** `×1` suppressed on `/collection` too, matching the deck. The brief notes the redundancy and the meta line makes it louder by putting the count beside a chip. One condition, one line. | severable |

## Refused, across all four calls

- **A data-dependent caption.** §3, and both components' own comments.
- **Any mark on the art** — including the one corner ruling 1 would have allowed.
- **A second scrim anywhere.** The bottom wash deletes; nothing replaces it.
- **Cost pips relocated.** Ruling 2 deletes them; they are not here at any size.
- **A sub-floor `✕`.** 44 phone / 32 desktop, kept — still the only removal path in this view.
- **A third caption row** for the set line.
- **A new density** on the marker or the tag. One boolean prop on both.
- **A tap target on any mark.** Chip, tag, mark, dot, count and pair are all inert.
- **Motion.** Zero net motion is locked; nothing transitions, including the caption edge appearing
  when a draft opens.
- **The `//` mark on the collection tile.** Spec errata 3 stands: there the set code explains the
  name.
- **`/collection/sets/[code]`.** Ruling 4, out of scope, unchanged at 146px.
