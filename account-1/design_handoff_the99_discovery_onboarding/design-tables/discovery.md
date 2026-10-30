## Moment bubble (R1, 2026-10-16)

| Property | Phone (390) | Desktop |
|---|---|---|
| Layer | top-layer popover, absolute in page coordinates (scrolls with the page); not fixed, not in flow | same |
| Width | viewport − 32, max 358 | max 300 |
| Background | `--elevated` | `--elevated` |
| Border | 1px `--border-strong` | 1px `--border-strong` |
| Radius | 10px | 10px |
| Shadow | `0 12px 30px rgba(0,0,0,.45)` | same |
| Padding | 10px 0 10px 12px | 10px 4px 10px 12px |
| Gap | 10px | 10px |
| Lead mark | 6px square, `--accent`, rotated 45°, margin-top 7px | same |
| Tool name | 13.5px, 600, `--fg` | 13px, 600, `--fg` |
| Line | 13.5px / 1.45, 400, `--fg-body`; at most 3 lines | 13px / 1.45, 400, `--fg-body`; at most 3 lines |
| ✕ | 44 × 44 hit, glyph 14px `--fg-faint`, aria-label `Dismiss` | 28 × 28, glyph 13px `--fg-faint`, aria-label `Dismiss` |
| Nib | 10px square, `--elevated`, two sides 1px `--border-strong`, rotated 45°, 6px outside the edge, centred on the control | same; a rail slot takes a left nib |
| Offset from control | 8–10px | 8–10px |
| Edge clamp | 16px from the screen's edges | 16px from the main column's edges |
| Halo on the control | `0 0 0 2px color-mix(--accent 60%), 0 0 0 6px color-mix(--accent 16%)` as box-shadow | same |
| Arrive | page settled + 600ms; opacity 0→1 and translateY 4px→0, 200ms `--motion-ease-out` | same |
| Reduced motion | opacity only | same |
| Leave | opacity 1→0, 140ms (`--motion-exit-quick`); instant under reduced motion | same |
| Z order | under sheets, dialogs, menus, toasts | same |
| A11y | non-modal note with an accessible name; the control's `aria-describedby` points at it while shown; one polite live announcement; focus unmoved | same |

## Friends Home card (R1, 2026-10-16)

| Property | Phone (390) | Desktop |
|---|---|---|
| Position | last on Home, after Commitments | Home's 316px right column, under Commitments |
| Section label | `FRIENDS`, mono 10px, .14em, `--fg-faint` | same |
| Card | radius 14, `--surface-inset`, 1px `--border`, overflow hidden | same |
| Table band | 132px; radial `--surface-raised` → `--surface-inset` | same |
| Table | dashed 1px `--border-dashed` oval, 220 × 70, `--surface-sunken` | 196 × 66 |
| Empty seats | 3 × 42px circles, 1.5px dashed `--border-dashed`, `--surface-sunken` | same |
| Your seat | 52px circle, your Friends commander's art (else your initials), ring `0 0 0 2px --bg, 0 0 0 3px --accent` | same |
| ✕ | 44 × 44 hit at the card's corner, 14px `--fg-faint`, `Dismiss` | 28 × 28 at 8/8, 13px |
| Title | 14.5px, 600, `--fg` (copy-review) | same |
| Line | 13px / 1.5, `--fg-body` (copy-review) | 12.5px / 1.5 |
| Press | `Add a friend`, 44px, radius 8, 1px `--border-strong`, 14px 600 `--fg`, full width | 32px, 12.5px, full width |
