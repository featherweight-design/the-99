# Addendum: About’s Terms · Privacy line

Account 2 · 2026-10-21 · touch sizes and missing states round. No new surface: rulings and missing states on what shipped from this handoff.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ (board: `About-Legal.dc.html`). The full round, all seven items, is in `design/design_handoff_the99_touch_sizes_addendum/`.

Coarse-pointer rule for the touch items: grow only on `pointer: coarse`. A grown hit never reaches into a neighbour's; where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse everything is as shipped.

## Item 2 · About's `Terms · Privacy` line

**Was:** `<LegalLinks className="mt-[32px] px-[16px] md:px-0" />` sits after `AboutTabs`, at the page foot under both tabs, ahead of `FanContentNotice`, with a code comment saying placement awaits Design.

**Answer: confirmed as shipped.** No move. The code comment can go.

- Same order as /credits and /sign-up: the surface's last line, then the notice. One rule for every page that carries it.
- Not inside the notice: the notice's only link stays the policy, as its brief locks.
- Not at the top of either tab: About's head is its title, tabs and the tour link.

Measured: phone 32px under the tab's last line and 30px to the notice's hairline; desktop 32px under and 64px to the hairline (`md:pb-[64px]`). Coarse hit 44px, 4px low, as shipped; fine pointer the 17px line.
