# Readiness verdict — Partner commanders

**Handoff:** `design/design_handoff_the99_partners/` (R2)
**Issue:** #364
**Spec:** `docs/superpowers/specs/2026-09-08-partner-commanders-design.md` §6
**Date:** 2026-09-09

## Verdict — 🟢 Green

R1's single blocker is closed, and closed at its root rather than patched. Every geometric figure R2
rules against was checked in the tree at `2b1c5c2` and every one of them is correct. What remains is a
short list of engineering corrections against the handoff's prose — stale line citations and one
internal contradiction — none of which is a design call and none of which needs a Design round-trip.

### The R1 blocker, and how R2 closed it

R1 decisions 16 and 17 shingled a commander thumb that **#473** had deleted from the deck header
seven and a half hours before the handoff was drawn. R2 does not re-place the thumb. It withdraws 16
outright, narrows 17 to the picker — the one surface in the handoff that still draws card thumbs —
and replaces the header ruling with **22**: the header carries no portrait-level pair signal, states
the pair in the caption and the `/ 98`, and gives the partner the affordance the declined portrait
would have carried, by making its name in the caption the trigger for its printing.

That is the second of the two answers the R2 prompt offered, argued rather than assumed, and it
generalises decision 21's diptych argument to the larger band instead of contradicting it.

R1's second finding — decision 19's shrink math omitting the `86 / 98 · 3 to buy` variant — is closed
by **23**, which measures the variant, finds it leaves negative room for any name, and rules the
figure atomic and the clause droppable.

## Every figure R2 asserts, checked against the tree

| R2 claim | Source | Finding |
|---|---|---|
| `ArtWash`'s portrait width *is* `band × 1.37`; 230px at `band={168}` | `src/components/ui/art-wash.tsx:54,138` | **Correct.** `PORTRAIT_RATIO = 1.37`, `width = Math.round(band * PORTRAIT_RATIO)`, and the file's own comment enumerates `230 \| 203 \| 99`. |
| Horizontal scrim stops at 0 / 134 / 230 / 240 | `art-wash.tsx:98-108,138-139` | **Correct.** `nearStop: 134`, `flatStop: 240`, the third stop being the computed width. |
| Desktop type inset 254, band 168 | `spine-desktop.tsx:76,80-84,96-98` | **Correct**, including `minHeight: 168` on the header and `padding: "0 24px 0 254px"`. |
| Mobile caption is centred on the wash inside `left:18 right:18`, so 354px at 390 | `spine-mobile.tsx:80-83` | **Correct.** `left: 18, right: 18, bottom: 12`, and the band is `aspectRatio: "2.2 / 1"` as stated. |
| `metaRow` is `flex-wrap`, so the pips and pill wrap below the names | `spine-mobile.tsx:33-45` | **Correct**, and the row is `gap: 8` at `fontSize: 10` as the arithmetic assumes. |
| The picker's Selected summary draws a 44×62 thumb | `create-picker.tsx:472-479` | **Correct**, and the comment names the figure. Decision 17's `44×62 / 38×54` therefore lands on a real surface. |
| Today the count is `flex-1 min-w-0` and absorbs the whole deficit before the name loses a character | `resume-decks.tsx:119-124` | **Correct.** The name span is `min-w-0 truncate` with no `flex-1`; the count span carries it, and the component's comment states the behaviour as intent. Decision 19 overturns exactly that comment, and says so. |
| `--border-dashed` is an existing token | `globals.css:30,95,140` | **Correct**, defined per theme. |
| The rail's spine is 26px | `deck-rail.tsx:121` | **Correct** (cited as `:123` — see correction 2). |
| `FullCardTrigger` already runs with `bandTapTarget={false}` on both spines | `spine-desktop.tsx:91`, `spine-mobile.tsx:74` | **Correct**, which is what makes open item 4's tab-order test the right shape. |

## Design's self-flagged risks, checked

| Item | Finding |
|---|---|
| READINESS's assumption that the §4 ceiling is in place — "if the derived size is not in place, every frame is wrong by one" | **Correctly flagged, and it is a build-order fact rather than a risk.** `MATURE_DECK_SIZE` is still imported at `deck-rail.tsx:15` and `overCopy.figure.denominator` is still the constant `" / 99"`. Spec §4 and §7 own this; the header reads the derived body size and never reconstructs it. |
| Sequencing after both top-off branches merge (open item 5) | **Satisfied.** #469, #474 and #475 are all on `main` at `2b1c5c2`. Nothing here races them. |
| Open item 2 — the partner name as a trigger needs a 44px hit area on the mobile caption | **Real, and correctly left to eng.** The mobile caption is a single 10px `<p>` at `spine-mobile.tsx:36-45`; decision 18 already requires splitting it into two shrinking spans, so the trigger's box is decided in the same edit. |
| Open items 1 and 3 — oracle text as a label, and the to-buy clause dropping | **Product's, and neither blocks a start.** Design has named the one-boolean alternative for 3; eng can build either. |

## Corrections carried into the build

The design calls are right. These are engineering findings against the handoff's prose.

1. **The short-name helper is named wrong in one place.** Decision 19 says `commanderShortName`
   (`builder-shell.tsx:278`) "already computes it". The helper is **`shortCommanderName`, exported and
   pure at `src/lib/copy/decks-builder.ts:17`**; `builder-shell.tsx:317` is a local `const` holding its
   result. The handoff's own *Closed since R1* section and its copy strings both have this right, so
   this is an internal contradiction rather than a wrong belief. Build against `decks-builder.ts:17`.

2. **Line citations have drifted**, mostly by the top-off merges that landed after R2 was drawn.
   `resume-decks.tsx:139-145` → **`:119-124`**; `resume-decks.tsx:84` → **`:82`**;
   `deck-rail.tsx:123` → **`:121`**. The surfaces and the arguments are unaffected.

3. **`overCopy.figure.denominator` is a constant, not a function** —
   `decks-builder.ts:363` is `denominator: " / 99"`, under a comment asserting that "the denominator
   never becomes the total: 99 is a rule of the format". Both spines read it
   (`spine-desktop.tsx:192`, `spine-mobile.tsx:210`). Spec §7 parameterises it; the comment is
   rewritten in the same edit, because for a pair the denominator *is* 98 and the sentence as written
   would then be false.

4. **Decision 23's 200px is a best case, not a floor.** The measurement is taken at the 334px row
   READINESS names, which is three rows plus gaps at ~1026px of Home. The resume section renders from
   `sm` (`resume-decks.tsx:142`), where three `flex-1` rows are ~205px each and the meta line — inside
   a `pl-[116px]` inset and an 18px right pad — is nearer **70px than 200**. The ruling still governs
   there: the count is pinned, the names are the only shrinking child, and the ellipsis eats the
   partner first. What does not survive is the *ten characters* — at `sm` a pair row may render
   `Ish…`. That is the ruled mechanism behaving correctly at a width Design did not draw, not a new
   state, and it needs no Design round-trip. Build the mechanism, not the character count.

## What eng carries without a drawing

Per §6's split, unchanged by R2: the union pips and identity label from §2's colour rule,
`shortCommanderName`'s three other callers staying singular on the primary, `/decks` tiles rendering
no commander, and `import-no-commander.tsx`.

## Next

`writing-plans` against spec §§2–7 plus decisions 17–23.
