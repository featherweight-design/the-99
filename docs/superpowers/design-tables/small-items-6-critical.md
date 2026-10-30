# Design Property Table — Small items 6, item 4 (Critical chip)

Source: `design/design_handoff_the99_small_items_6/Critical.dc.html` (`.sev`, `.sev.mod`, `.sev.crit`, the "Order and engineering" note).

## Component: WeaknessLine — severity chip

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| font-family | IBM Plex Mono (`font-mono`) | same |
| font-size / weight | 10px / 500 | same |
| letter-spacing / transform | 0.1em / uppercase | same |
| padding | 2px 8px | same |
| border-radius | 999px | same |
| border | 1px solid | same |
| Critical ink | `#E07A65` | same |
| Critical edge | `color-mix(in oklab, #C6533F 60%, transparent)` (`--danger`) | same |
| Moderate ink / edge | `--warning` / `--warning` 45% | same |
| Minor ink / edge | `--fg-muted` / `--border-strong` | same |
| placement | chip over its line | chip column left of the line |

## State coverage

| State | Trigger | Rendered |
|---|---|---|
| Critical line | stored line starts `Critical: ` | Critical chip, tier word cut from the line |
| Order | any weaknesses list | Critical, then Moderate, then Minor; model order within a tier |
| Plain line | no tier prefix | no chip, full width |
