# Gap report — Shopping strip link-out (R4)

Verified against `docs/superpowers/design-tables/shopping-strip-linkout.md` at 320px, 390px, 768px
and desktop. Breakpoint is Tailwind `md:` = 768px.

**Verdict: 0 visual gaps, 0 state gaps, 0 layout gaps.** No Agent 3 confirmation round was needed —
Agent 2 found nothing to fix.

## Scope verified

- Strip container, figure line, priced clause, provenance line, link row, `ExternalLink` primitive
- The `/add-deck` href contract: percent-encoded standard base64 of `"<qty> <name>"` lines
- Five named states: partially priced, fully priced, none priced, empty list, behind clause
- Layout under `md:flex-row-reverse` when the figure line is absent

## Layout findings worth recording

**`md:mr-auto` on the wrapper.** In the none-priced state the figure `<p>` no longer renders, so the
wrapper is the only flex child. A lone item under `row-reverse` + `justify-between` sits at
main-start, which is the physical *right* edge. Auto margins consume free space before
`justify-content` applies, so `margin-right: auto` holds the wrapper flush left. With two children it
resolves to the positions `justify-between` already produced, so the priced states are unchanged.

**Baseline alignment survives the wrapper.** A block-container flex item's baseline is its first
in-flow line box. The wrapper's first in-flow child is the provenance `<p>` (which carries `m-0`), so
the baseline `md:items-baseline` aligns the figure to is the same line as before the wrapper existed.

**320px.** The label plus glyph measures roughly 165–175px at 14px/500 against about 262px of inner
width, so it does not wrap. The binding character before `↗` is U+00A0, so the glyph cannot orphan
even if a longer label ever wraps.

## Non-gaps recorded, deliberately unchanged

1. `price-strip.tsx` gates the link row on `buyHref`, where the table says "no second condition".
   `totalCopies` is summed over the same array the list is mapped from, so `totalCopies > 0` implies
   a non-empty list and the strip's own guard has already returned. The check is type narrowing.
2. `external-link.tsx`'s `rounded-[6px]` is not in the table. On a boxless inline anchor it only
   rounds the focus outline, and it is inherited unchanged from R3.

## Fixed during verification

- A source comment claimed a tap anywhere on the link row works. The row is `flex`, which
  shrink-wraps the anchor, so horizontal whitespace beside the text is not a hit target. The comment
  now describes the 44px as the row's height rather than the link's box. No behaviour change — the
  table specifies `min-height` on the row and nothing more.
