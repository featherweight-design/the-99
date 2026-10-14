# The three fill controls — states matrix (§7.5)

Three controls of related shape end up on the same surface, and two of them are opposites:

| | Control | Act | Where it lives |
|---|---|---|---|
| **A** | `Fill {n} from my collection` | adds owned, ranked by synergy | last-31 strip |
| **B** | `Top up with cards to buy · {n}` | adds unowned, ranked by synergy | last-31 strip |
| **C** | `Clear all auto · {n}` | removes every untouched auto card | decklist toolbar (**shipped, unmoved**) |

**The separation is structural, not visual.** A and B share a strip directly under the provenance
line — they are about the open slots that line just described. C stays exactly where it ships,
right-aligned in the toolbar beside the All / Shopping filter, below a `1px --border` rule.
Nothing that shipped moves, and the two adds never sit in the same row as the sweep at either
width.

**Three weights, in order:** brass outline (A) → neutral ghost with a `--warning` count (B) →
neutral ghost, a rule and a row away (C).

---

## The matrix

`n` = open slots. `owned` = ranked owned candidates in colour, not in deck, singleton-legal.
`unowned` = the same without the ownership filter. `auto` = untouched auto rows.

| # | State | A · owned fill | B · buying top-up | C · clear all auto |
|---|---|---|---|---|
| 1 | 68 cards, deep pool (`n`=31, owned≥31) | `Fill 31 from my collection` | `Top up with cards to buy · 31` | `Clear all auto · 68` |
| 2 | 68 cards, shallow pool (`n`=31, owned=12) | `Fill 12 from my collection` — **states what it can place, never the gap** | `Top up with cards to buy · 31` | unchanged |
| 3 | A in flight | `Sleeving 24 cards…`, disabled, border `--accent-shadow` | **disabled, not hidden** | **disabled, not hidden** |
| 4 | A settled at 99 | **absent** | **absent** | `Clear all auto · 92` |
| 5 | A settled short (92/99, pool exhausted) | **absent** | `Top up with cards to buy · 7` | `Clear all auto · 92` |
| 6 | 0 owned candidates from the start | **absent** | present | unchanged |
| 7 | 0 auto (all kept, or hand-built at 68) | unchanged | unchanged | **absent**; `keptNote` stays |
| 8 | B in flight | disabled | `Sleeving 7 cards…`, disabled | disabled |
| 9 | Deck already at 99 | **absent** (strip unmounts) | **absent** (strip unmounts) | present if auto > 0 |
| 10 | Either write refused | present, enabled; `MutationError` beneath | present, enabled | unchanged |
| 11 | EDHREC degraded | present — ordering degrades to inclusion then name | present | unchanged |
| 12 | 0 unowned candidates (EDHREC list fully owned) | present | **absent** | unchanged |

## The rules the matrix is generated from

1. **A control with nothing to do is absent, not disabled.** The shipped `Clear all auto`
   established this at zero auto; A and B follow it. No disabled control advertising an unavailable
   thing.
2. **Nothing unmounts mid-action.** During any write, the other two go **disabled and stay in
   place**. Hiding B while A runs moves C under the cursor — the exact failure `SuggestionTile`
   keeps its slot to avoid.
3. **The strip unmounts as a unit** when there are no open slots (states 4, 9). Two disabled
   buttons under a heading reading "the last 31" on a deck at 99 is worse than no strip.
4. **A never promises 99.** Its label carries what it can place, which is `min(n, owned)`. §7.6
   exists because `owned < n` is the common case.
5. **A refusal does not disable the other control.** One rejected write is not evidence the other
   will fail. The message is the shipped sweep's refusal with one noun changed, under the control
   that was clicked, as `AutoTag` stacks its own.
6. **C is never affected by A or B beyond its count.** How a card arrived has nothing to do with
   whether there is room for another one; that A just placed 24 cards changes C's number and
   nothing else.
7. **Everything A and B place is `auto`** (ruling 7), so both feed C's count and both are undone
   by it. That is the intended relationship and the reason the sweep needs no new vocabulary.

## Copy, per control state

| Control | State | String |
|---|---|---|
| A | rest | `Fill {n} from my collection` |
| A | in flight | `Sleeving {n} cards…` — the shipped `fill.fillingRows` |
| A | settled | *(no message; the strip's line and the counts are the receipt)* |
| A | refused | `We couldn't fill those. The deck is unchanged.` |
| B | rest | `Top up with cards to buy` + `{n}` on its face |
| B | in flight | `Sleeving {n} cards…` |
| B | refused | `We couldn't add those. The deck is unchanged.` |
| C | all | **unchanged** — `auto.clearAll`, `auto.clearAllMobile`, `auto.swept`, `auto.sweptUndo` |

## §7.6 — the shortfall line

Shown in the strip when A settles below 99. `FillPlan.shortfalls` is the existing vocabulary, but
the last 31 has no role targets to be short of — the roles were met by the 68-card baseline — so
the shortfall here is a **count of slots**, not a list of roles:

> **92 of 99. Your collection ran out 7 short — you own what you own, EDHREC knows what it knows,
> and that is everything we have.**

The clause after the dash is lifted **verbatim** from the shipped `fill.provenanceShort`, which
already says this exact thing about the 68-card fill. Two wordings for one fact is two voices.

It takes the **provenance line's shape**, not the warning banner's: `border-left 3px --accent`,
not `--warning`. Running out of cards you own is not an outage and must not borrow an outage's
colour. B sits directly beneath it as the way forward.

## Announcements

One live-region message per settle, on the existing region — never one per row.

| Event | Message |
|---|---|
| A settles at 99 | `{n} cards added. 99 of 99.` |
| A settles short | `{n} cards added. {total} of 99, {short} short.` |
| B settles | `{n} cards added. {total} of 99, {buy} to buy.` |
| C settles | **unchanged** — `auto.sweptAnnounce` |
