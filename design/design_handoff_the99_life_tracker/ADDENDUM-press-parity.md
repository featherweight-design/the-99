# Life tracker addendum: strip (spine) presses match the P1 demo

Requested by Hugh 2026-11-22: the strip's button presses "blink"; use the presses from the original interactive demo
(`project/P1-Prototype.dc.html`, canvas 9PFoKAYvCXK8QijxU3XVZs). Scope is the strip only. This replaces addendum R2's
"strip press" section (accent fill + scale .92 on `--motion-quick`). Values are read straight from P1's CSS.

| State | P1 demo (the target) | Shipped on main (bd67b89, `spine.tsx` `sb`) |
|---|---|---|
| Press (any strip button) | `scale(.92)` on `:active`, `transition: transform .08s`. Ground, ink and ring do not change. | Flashes the accent fill (bg ink, ring off) on every press, plus `scale(.92)`, over 200 ms. **This is the blink.** |
| Picking a holder (Monarch / Initiative tapped) | `.sb.act`: accent fill, bg ink, no ring, held until a player is picked. | Same (`aria-pressed`). Keep. |
| Dice menu open | `.sb.act`, the held fill. | Same (`aria-expanded`). Keep. Menu follows dice. |
| Someone holds it | `.sb.on`: accent ink, 1.5 px accent ring, `--elevated` ground. | Same. Keep. |
| Nobody holds it / day-night off | `.sb.off`: `--fg-faint` ink. | Same. Keep. |
| Undo with nothing to undo | `opacity .35`, no press. | Same. Keep. |

## The change

Only the press changes: remove the accent fill from `:active`, and run the `scale(.92)` over 80 ms. The held fill
(picking, open dice or Menu) and the ring once someone holds Monarch or Initiative stay exactly as shipped; they are the
demo's. Colour changes between states ease over 200 ms. Reduced motion: no scale.

Unchanged: everything off the strip, the day/night spin, Menu contents.
