# Readiness — Partner commanders (R2)

**Self-assessment: 🟢 green.** Both R1 blockers on Design's side are closed; the two open items that
remain are Product's and eng's, and neither blocks a start.

R2 was forced by **#473**, which replaced the deck header's thumb with a full-bleed `ArtWash` seven
hours before R1 drew. R1 decision **16 is withdrawn**, **17 narrows to the picker**, **18 is
re-anchored**, **22 and 23 are new**. 19, 20, 21 stand.

## Ruled and drawn

| §6 item | Ruling | Drawn |
|---|---|---|
| 1 · Deck-detail hero | **22 — no portrait-level pair signal.** The band stays the primary's `left-portrait` at `band={168}`; the pair is the caption plus `/ 98`, and the partner's name is the trigger for its printing. **18** — caption takes both names; identity label stays on desktop (~547 of 644px), leaves on mobile (~390 > 354). Ordered shrink active 768–1085px. | Desktop header at 1180px and mobile at 390px, both drawn at the real wash geometry — 230px portrait, mask 58%, stops 0/134/230/240, vertical scrim; cover at 2.2:1 with the bottom-edge stops. Plus both rejected header treatments at the same geometry. |
| 2 · The picker's second slot | **20** — one slot, three states: **absent** (not disabled), empty-and-available, import proposal. Dashed = not settled. **17** survives here only: 44×62 primary, 38×54 partner. | All three sidebars + the re-headed list |
| 3 · The wash and the portrait | **21 — primary-only, no diptych**, and now the header's argument too. The rail's pair signal is the `/ 98`; the desktop rail carries none by ruling. | Rail phone rows, resume row with the real `left-portrait` layers, and the rejected diptych at all three real sizes (13px / 49px / 115px halves) |
| 4 · The resume name line | **19** — short names joined, rendering `Ishai + Br…` in the row's real ten characters; pair-only. **23** — the count is atomic and pinned at its short form; the to-buy clause drops on pair rows. | All three candidates at 334px, plus the three count forms |

## Dependencies

1. **Product: the to-buy clause dropping on pair resume rows** (23). Design's reasoning and the
   one-boolean alternative are both in the README; eng can build either.
2. **Sequencing: after both top-off branches merge** (§7). Nothing here races them — the header
   reads the derived body size rather than reconstructing a count from a literal.

## Assumed, not specified here

The §4 ceiling (`deckBodySize = 100 − commanderCount`), §3's `partner.ts` (`partnerAbility`,
`canPair`), and §2's union colour rule. **If the derived size is not in place, every frame is wrong
by one** — they read 98 on purpose.

## Two things eng must not paraphrase

1. **Truncation is an ordered shrink**, never a `flex-none` primary — group `overflow-hidden`, both
   halves `min-w-0` + ellipsis, partner shrinking first. The `flex-none` version overflows and draws
   under the count; this document shipped it for one round and saw exactly that.
2. **A figure is never partly truncated.** The count is pinned at `86 / 98`; the to-buy clause is a
   separate, droppable span. This overturns the comment at `resume-decks.tsx:115` deliberately and
   scoped to that line.

## What R2 does not reopen

Everything **#473** settled — band heights, scrim stops, mask ends, the 254px inset, the flat-ground
and cover ink rules, `FullCardTrigger`'s placements, the rename field's four states and its 352×29
box. Decisions **11–15** from `design_handoff_the99_deck_details_wash/`. The shipped picker row, radio
and dock contract · the 44px phone target floor · accent's reservation to *in use* / *to buy* ·
`IdentityPips`' squared shape · the `·` fact separator and `//`'s assignment to two-faced cards ·
`ArtWash`'s two strategies.
