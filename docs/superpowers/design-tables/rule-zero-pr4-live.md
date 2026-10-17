# Design Property Table — Rule 0 PR 4: the changed dot and Since you looked

Source: `design/design_handoff_the99_rule_zero/R1 - Swap-Phone.dc.html` (S5), `R2 - Swap-Desktop.dc.html` (W5).
Verified against `src/components/rule-zero/table-seat.tsx` (`Changed`, the changed line) and
`src/components/rule-zero/read-card.tsx` (the since paragraph); cells `s5-phone`, `w5-desktop` of the
`rule-zero` contact sheet.

## Changed mark (`.chg`)

| Property | Mobile | Desktop | Verify |
|----------|--------|---------|--------|
| display | inline-flex | inline-flex | ✅ |
| align-items | center | center | ✅ |
| gap | 6px | 6px | ✅ |
| font | 10.5px IBM Plex Mono | same | ✅ `font-mono text-[10.5px]` |
| color | var(--accent) | var(--accent) | ✅ |

### Dot (`.chg i`)

| Property | Mobile | Desktop | Verify |
|----------|--------|---------|--------|
| width / height | 7px | 7px | ✅ |
| border-radius | 50% | 50% | ✅ |
| background | var(--accent) | var(--accent) | ✅ |
| display | block | block | ✅ |

## Seat's changed line

| Property | Mobile (`.ln`) | Desktop (`.ctl`) | Verify |
|----------|--------|---------|--------|
| position | relative | relative | ✅ |
| display | flex | flex | ✅ |
| align-items | center | center | ✅ |
| justify | space-between | flex-end, mark `margin-right:auto` | ✅ one child: both start-aligned |
| gap | 8px | 10px | ✅ |
| padding | 0 12px 12px | 0 16px 8px 162px | ✅ |
| margin-top | -6px | -8px | ✅ |
| placement | after the seat's strip, last in the card | same | ✅ |

## Read's since line (`.read p`)

| Property | Mobile | Desktop | Verify |
|----------|--------|---------|--------|
| font-size / line-height | 13.5px / 1.6 | same | ✅ |
| color | var(--fg-body) | same | ✅ |
| text-wrap | pretty | pretty | ✅ |
| mark font-size | 12px | 12px | ✅ |
| deck `b` | 600, var(--fg) | same | ❌ → ✅ color added |
| replaces the read's sentence | yes | yes | ✅ |

## State coverage

| State | Triggering condition | Rendered | Verify |
|-------|---------------------|----------|--------|
| S4/W4 looked since the swap | every other seat's `changedAt` ≤ the visit's `seenAt` | no mark, the read's sentence | ✅ `s4` cells |
| S5/W5 next look after a swap | a seat's `changedAt` > the visit's `seenAt`, not the viewer's | dot + `changed N min ago`, `Since you looked` | ✅ `s5`, `w5` cells |
| First visit | `seenAt` null | nothing marked | ✅ unit test |

Copy keys: `ruleZeroCopy.read.since`, `read.swappedTo(name, deck)`, `seat.changedNow`, `seat.changedAgo(ago)`; wording is `/copy-review`'s.

VERDICT: 1 visual gap found, fixed; 0 remain.
