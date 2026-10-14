# STATES — Shopping reads availability (amendment 5)

Every state of the Shopping view across the two counts it now holds, so an audit can check that
**nothing changes for a player with no contested cards** and that nothing new was left undrawn.

Two figures drive every state:

- **`missing`** — unowned, non-basic cards in the deck. Today's whole list. `cardCopies`.
- **`spokenFor`** — cards in the deck whose availability is `over` from this deck's own vantage
  (`availabilityState(a, { selfExcluded: true })`), basics excluded. `cardCopies`.

`n = missing + spokenFor` is the `Shopping N` pill, the intro's leading figure and the footer's
leading figure. The two are disjoint by construction: `availabilityState`'s `owned <= 0` guard
returns `free` before anything else, so an unowned card is never `over`.

## 1. The range

| `missing` | `spokenFor` | pill | intro | groups | footer | drawn |
|---|---|---|---|---|---|---|
| 0 | 0, deck filled | `Shopping 0` | — | *Nothing to buy. Your shelf covered it.* | — | shipped, canvas E1 |
| 0 | 0, never filled | `Shopping 0` | — | *No cards to buy.* | — | shipped, canvas E2 |
| 8 | 0, all auto | `Shopping 8` | `intro` (the fill's sentence) | 4 role groups | `footer` | **shipped, byte-identical** |
| 8 | 0, mixed | `Shopping 8` | `introUnfilled` | 4 role groups | `footerMixed` | **shipped, byte-identical** |
| **8** | **2** | `Shopping 10` | `introSplit` | 4 role groups **+ Spoken for** | `footerSplit` | **new** — canvas A1/A2 |
| **0** | **2**, deck filled | `Shopping 2` | `introOnlySpokenFor` | **Spoken for alone** | `footerOnlySpokenFor` | **new** — canvas E3 |
| **0** | **2**, never filled | `Shopping 2` | `introOnlySpokenFor` | Spoken for alone | `footerOnlySpokenFor` | **new** — same frame; the branch that differs at zero does not exist here, because the list is not empty |
| 8 | 2, availability read down | `Shopping 8` | `introUnfilled` | 4 role groups | `footerMixed` | **new but invisible** — canvas E4: identical to today's list |

The first four rows are the point of the table.

## 2. The two rows, element by element

| | unowned row (shipped) | spoken-for row (new) |
|---|---|---|
| shell | 52px phone / 34px desktop, `--surface-rail` | **same** |
| ownership dot | dashed, hollow, `--border-dashed` | **solid `--success`** — the card is owned and the dot may not lie |
| name | 12.5px / 13.5px, `--fg`, the detail trigger | same |
| EDHREC figure | `edhrec 41%` phone meta line / `41%` inline desktop | same, and the figure is often high — these are staple duplicates |
| availability marker | absent (an unowned card is always `free`) | **count-only** — `◆◆ short 1`, `--avail-over-fg`. A Shopping row is a `nameless` host: the clause's fixed prefix never truncates by contract, and the figure, the tag and the 44px `✕` leave no width for a name that could still read as one. The named form stays in the All view, the summary band and card detail. |
| row tint | none | `inset 0 0 0 1px var(--avail-over-border)`, shipped at `decklist-row.tsx:170` |
| tag | `buy` | **`2nd copy`**, same plate, same 9/9.5px mono |
| `✕` | 44px phone target | same — and it is the other exit from the contest |
| accessible name | name, type, `not owned` | name, type, `owned`, then the marker's own prose: *"your Atraxa list also includes this card and you don't own enough for both"* |

## 3. Group states

| case | behaviour |
|---|---|
| `spokenFor === 0` | **No group.** Not an empty group, not a zero heading — the same rule the roll-up bands follow. |
| `spokenFor > 0` | One group, **pinned last**, after `Other`. Header `SPOKEN FOR` + `{n} · already in the deck`. |
| Role group headers | **Untouched at every value of `spokenFor`.** `from` counts owned cards, which already include these, so `closes 7→10` stays exactly what it says. |
| A contested card in a role with no target (`other`, non-basic land) | Still the Spoken-for group. Group membership is decided by availability first; the `Other` group keeps meaning "unowned, untargeted". |
| Sort inside the group | Alphabetical, like every other decklist group. Not by shortfall — a `short 2` is not more urgent to buy than a `short 1`, it is a bigger purchase, and the marker states it. |
| `quantity > 1` (an "any number" card) | One row, count inline after the name (shipped `×3`), and the header counts **copies** — every Shopping figure does. README gap 3. |
| Basic land, contested | **Never enters.** The basics filter runs first, unchanged, and the fill never buys them. |

## 4. The summary-as-index

| case | band | link |
|---|---|---|
| `overCommitted > 0`, builder | shipped band, unchanged wording | `See them in Shopping`, trailing the body (desktop) / own line under it (390px) |
| `overCommitted > 0`, filter already `shopping` | band unchanged | **link absent** — it would point at the screen the player is on |
| `overCommitted > 0`, deck card on `/decks` | shipped band, unchanged | **no link, ever** — there is no Shopping list on that route |
| `overCommitted === 0`, `softClaimed > 0` | soft line alone, unchanged | none — a soft claim is not a purchase |
| both lines | fixed severity order, unchanged | link on the red line only |
| availability read down | no band at all (shipped) | — |

## 5. Edge cases

| case | behaviour |
|---|---|
| **Removing a spoken-for card from Shopping** | The undo row renders in place, as it does in `All`. Requires decision 7's one-line change; without it the row vanishes with no receipt. |
| **Buying the card in real life** | Nothing in the app changes until the collection quantity does. Then `free` goes to 0 or above, the row leaves the list on the next read, and the band's count drops. No announcement — the player did it. |
| **Cutting the card instead** | Same exit, one click. The list shrinks by one and the band may disappear. **No warning, no confirm** — Addendum 2 §6: a cut releases a copy. |
| **A brew elsewhere is finished** | Its soft claims go hard, which can push a card here to `over`. The list grows by one with no action on this deck. Deliberate; undrawn. README gap 4. |
| **The deck itself crosses 99** | Amendment 3's `Over` state and this list are a rule apart. The trim line is deck arithmetic; these rows are collection arithmetic. Both render, neither mentions the other. |
| **A spoken-for card carrying `auto`** | Possible — the fill places owned cards. It is swept by `Clear all auto`, counts in the footer's auto clause, and takes the shipped `auto` tag beside its `2nd copy` tag. |
| **`spokenFor > 0` and the deck was filled** | The fill's expressive intro does not run. `introSplit` states the two kinds instead of claiming every row closes a gap. |
| **Every row contested, none missing** | The list renders; `emptyCovered` cannot fire. The compliment is now unreachable while a single contested card exists — which is the correction, stated as a state. |
| **A degraded read mid-session** | Rows disappear from the list between reads, silently, and the pill drops. No banner, no message. The builder has always failed quiet. |
| **The deck name, at any width** | Never drawn on a Shopping row, at either width — `nameless`, so `markerAria` gives `overAriaCountOnly` and the two halves agree (Addendum 2 §3's rule, applied to a second surface). The All-view row one tab away still names it. |
| **`hard` on this list** | Unreachable (Addendum 2 §6 / R5 §2). If one is ever rendered here, the vantage was wrong upstream — not a state, a bug. |
| **`soft` on this list** | Never enters. There is nothing to buy yet. |

## 6. What is NOT a state

- **No second tag skin.** One `BuyTag` plate; only the word changes.
- **No new colour, token, glyph or motion.** The over glyph, tint and foreground are #43's.
- **No urgency ladder.** A `short 2` row looks exactly like a `short 1` row.
- **No "cut it instead" control, advice line or confirm.** Never a soft block.
- **No count on the deck card, and no change to it.** Locked decision 2 still holds.
- **No banner on a degraded read**, on this surface or any builder surface.
- **No pricing, no totals, no "buy all" action.** Shopping copies names, as it ships.
