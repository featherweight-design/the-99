# Design Brief — Owned is not available

**Workshop:** 2026-09-15, Hugh + agent. No ticket. This brief is the source of truth the Claude
Design handoff prompt points at.

**Verified against `origin/main` at `91236780` on 2026-09-15.** Every `file:line` below was read on
that commit, not recalled.

The commander detail page draws a dot beside every recommended card and tells the reader one of
three things: not owned, owned, or owned and already in a deck. That third reading is the problem.
It is printed identically whether the player owns four copies with three spare, or owns one copy
sleeved into a finished deck with no way to get it back without cutting a version. Hugh's words:
"something can be owned, in a deck with available copies, no copies, etc." Every other card surface
in the app answers that question properly. This one never got the component that answers it.

The second half of the report is a color problem, and it is separable: the green that means "owned
and available" clashes in the Canopy theme. §5 handles it and is not part of the design round.

---

## §1 What the three surfaces draw today

| Surface | Geometry | Dot | States it can show |
|---|---|---|---|
| Role Coverage chip (desktop) | 28px pill in a `flex-wrap`, gap 7px, cap 12 per panel, 4 panels (`commanders/coverage-chip.tsx:26`, `coverage-section.tsx:156`) | 6px (`coverage-chip.tsx:103`) | two |
| Role Coverage row (phone) | 44px full-width, `flex-col` gap 8px, cap 6 | 7px (`coverage-chip.tsx:158`) | two |
| Synergy row (both) | desktop `dot 7 · name(auto) · type 150 · synergy 64 · inclusion 46 · toggle 34`; phone `dot · name + meta line · toggle 44` (`commanders/synergy-row.tsx`) | 7px (`synergy-row.tsx:110`) | three |

Role Coverage shows two states and not three because it is drawn from the owned pool: `RoleCard`
(`lib/recs/score.ts:17`) carries `oracleId`, `name`, `inclusionPct` and `committedTo`, and no
`owned` field at all. The legend copy already states this. `SynergyCard`
(`lib/commanders/synergy-cards.ts:13`) does carry `owned`, so the synergy panel is the only one of
the three that can draw an unowned card.

The dot's three fills come from `availabilityDotState` (`components/ui/ownership-dot.tsx:69`),
which reads `committedTo` and nothing else. `committedTo` is stamped by `withCommitted` off
`readCommittedDecks` (`lib/decks/committed.ts:101`), a `deck_cards` join returning **the first deck
naming each card**. It knows nothing about how many copies are owned, how many are claimed,
whether the claiming deck is sleeved, seniority between claimants, or reservations.

The legend that explains the dots is three keys (`lib/copy/commander-explained.ts:246-248`):

```
dotFree:      "Owned and available."
dotCommitted: "Owned, already in a deck."
dotUnowned:   "Not owned."
```

`dotCommitted` is the false one. A brew wanting a card you own four of prints the same sentence as
a finished deck holding your only copy.

---

## §2 What the app already has, and why this page never got it

Every other card surface in the app reads a four-way availability model and draws a marker for it.

- **The model.** `loadAvailability` (`lib/decks/availability-query.ts:318`) takes an `oracleIds`
  narrowing and returns, per card, `{ owned, hard, soft, free, claims[] }` — copies owned, copies
  claimed by sleeved decks, copies claimed by brews, the surplus, and every claiming deck with its
  quantity and seniority.
- **The buckets.** `availabilityState` (`lib/decks/availability.ts:203`) partitions that into
  `free` / `soft` / `hard` / `over`. Free renders nothing, by design: a player whose collection
  covers their decks sees nothing new anywhere.
- **The marker.** `components/ui/availability-marker.tsx` draws `1 in a brew`, `none free, in
  Kyknos`, `short 2`, with a ratified count-only variant behind `MarkerOpts.nameless`
  (`:32`) that `/collection` uses because it has no deck-name surface behind it.
- **The slot.** `AvailabilitySlot` (`components/decks/update-diff-row.tsx:225`) is the shipped
  pattern for one slot with three occupants: a priced `BuyTag` (`components/decks/buy-tag.tsx:135`)
  when the card is unowned, the marker when it is owned and contended, nothing when it is free.

The commander detail page is the one recommendation surface that never received any of it. It got
a bespoke three-state dot instead, invented because the panel had no marker.

**`AvailabilityDot`, `availabilityDotState` and `LegendPip` are used by nothing but these three
commander surfaces** (`coverage-chip.tsx:103,158`, `synergy-row.tsx:110`, `coverage-section.tsx:73,78`,
`synergy-panel.tsx:259-263`). They retire wholly with this change.

The division the rest of the app uses is **dot = ownership, marker = availability**:
`decks/decklist-row.tsx:338` renders `OwnershipDot owned={card.owned}` with no `committed` prop,
and a separate `AvailabilityMarker` at `:455`.

One counter-precedent, named rather than hidden: `decks/deck-card-tile.tsx:214` keeps a
three-state dot, deriving `committed` from `availState === "hard" || availState === "over"`. That
is the app's answer for a tile with no room for a marker, and it reads availability rather than
`committedTo`. The chips here do get a marker, so the decklist division governs.

---

## §3 Rulings

Settled in the workshop. These are not open.

1. **No new vocabulary.** The page draws the app's existing five readings and invents none:
   unowned (priced buy tag), free (silent), soft (`1 in a brew`), hard (`none free…`), over
   (`short N`). A sixth reading for one page would break the one-vocabulary-per-page rule the
   legend copy already states.
2. **The dot drops to two states on all three surfaces.** Ownership only. The marker carries
   severity.
3. **Role Coverage takes a count-only marker,** never a deck name — the `nameless` contract
   `/collection` already ships. The chip grows roughly 40px in non-free states and is unchanged
   when free. Rejected: the full name-bearing marker (~120px, which drops a contended panel from
   about five chips per line to two and makes pill length a proxy for badness); the marker
   replacing the figure plate (which hides the EDHREC figure on exactly the cards being decided
   about, and that figure is the panel's default sort key).
4. **The committed border tint retires** from both `chipBorder` and `rowBorder`
   (`coverage-chip.tsx:35`, `:49`). The marker is the channel.
5. **The synergy panel gains one `AvailabilitySlot` before the toggle,** with a **priced** buy tag
   on unowned rows. Phone puts the marker on the existing meta line beside `+8 · 14%`. Rejected:
   an unpriced tag (every other buy tag in the app quotes a price); no tag at all (which leaves
   Hugh's stated problem — "if something needs to be bought, that should be clear upfront" —
   exactly where it is).
6. **Role Coverage never draws a buy tag.** It is owned-only; there is no unowned row to tag.
7. **The `Availability` sort option ships in the same round.** Its copy is written and ratified
   (`commander-explained.ts`, `coverageSort.availability`) and was held back only because "it needs
   the committed flag, which is slice B". This brief lands that read, four-way. Its sub-line needs
   rewording: it describes two buckets and there are now four.
8. **Scope is the detail page.** The `/commanders` list row keeps its existing aggregate receipt
   (`34 of your cards fit · 12 already in use`, `commanders/receipt-line.tsx`) unchanged — that is
   the right altitude for a ranked list, and its one-clause-by-severity shape is a settled §8
   ruling. `/discover` is untouched; it has no availability control by design.

---

## §4 Open for Design to call

1. **The aria coupling, and it is the one that needs a real ruling.** `markerAria` returns a
   count-only name whenever `nameless` is set, because `/collection` has no surface behind it that
   names decks. The chip does: the card modal names them, and today's `ariaSuffix`
   (`commander-explained.ts:261`) speaks `Already in ${deck.name}.` So this surface wants a
   **visible count-only label with a spoken deck name**, which no current option expresses and
   which departs from the coupled contract in `docs/superpowers/design-tables/card-availability.md`
   §2/§3. Ratify the divergence, or rule that the chip loses the spoken name (a regression against
   what ships today), or give the marker a third option. Design's call; note the marker is shared
   across eight surfaces, so a new option is not free.
2. **The legend.** Three keys for five readings. The existing rule holds and is not up for
   revision: **no counts** — a key sitting above four panels cannot count for any one of them.
   Design owns the new key set and its phrasing.
3. **The `Availability` sort sub-line.** Four buckets, one sentence, under the "no counts" rule.
4. **Marker type on the chip.** The marker sets no size or family of its own — card-availability
   §3.4 rules that row density rides the meta line it sits on, and the chip has no meta line.
   `update-diff-row.tsx:259` hit this exactly and answered it with an explicit
   `font-mono text-[11px] md:text-[11.5px]`. The chip needs its own ruling against an 11.5px mono
   name and a 10.5px figure plate, and the phone row against a 13.5px name and an 11.5px figure.
5. **The About entry** (title, route, `opens`, caption, specimen component and fixture props, up to
   four key lines, phone reduction), per the standing rule that no UI feature ships without one.

---

## §5 The Canopy clash, which is separable and ships first

`--success: #6FA368` is the **only** palette token identical in all six themes
(`src/app/globals.css:60, 108, 153, 197, 243, 287`). Every other color token is themed. The file
already documents the consequence, at `:127-129`:

> Theme: ixalan — "Canopy". Jungle daylight; the yellow-green accent is the third green in its own
> palette, so `--success` and `--g` are the two tokens with the least room here. Both clear the
> 0.10 ΔE floor, but only just.

So this is a known, documented near-miss rather than a new finding, and the fix is the token, not
any component: theme `--success` per palette, six values, ΔE checked against that theme's
`--accent`, `--g` and `--bg`. It lands on every ownership dot in the app at once — commander
panels, decklist, collection, export — which is why it ships **ahead of and separately from** this
design round and needs no handoff surface. Design supplies the six values.

---

## §6 Out of scope

- The `/commanders` list row and `/discover` (ruling 8).
- `readCommittedDecks` stays. `committedSupport` feeds the "Why this commander" sentence's named
  deck, which is a different question — which deck holds the most of this commander's support, not
  whether a copy is free.
- Any change to the four-state model, its copy, or the marker's existing states. This brief adds a
  surface to a shipped system; it does not revise the system.

---

## §7 Implementation notes, for the plan rather than for Design

Recorded here so the handoff round does not have to carry them.

- One `loadAvailability(userId, { oracleIds })` call on the detail page, off-decklist vantage
  (no `excludeDeckId`), narrowed to the role cards' and synergy cards' oracle ids. Never cached:
  a claim read is point-in-time by contract.
- `SynergyCard` carries no price today, so the priced buy tag adds a `printing_prices` join to this
  page. A printing absent from that table has never been stocked; a row with a null `price_cents`
  is stocked in foil only. Neither is "free" and neither is "unknown".
- The sort comparator orders on `availabilityState`, not on `committedTo`.
- `AvailabilityDot`, `availabilityDotState` and `LegendPip` are deleted, not deprecated.
- Likely two PRs: the read plus Role Coverage, then the synergy panel plus the price join. Both sit
  well inside the size bound, and neither stacks on the other.
