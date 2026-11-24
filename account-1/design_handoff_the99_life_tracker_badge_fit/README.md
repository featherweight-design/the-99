# Life tracker · every badge fits (addendum)

Account 1, 2026-11-24. Round from Hugh: "If a player has several counters and damage from multiple other commanders, the indicators on the main playing board are not all rendered/visible. We need a solution to fix this that works across device types."

Canvas: https://claude.ai/artifact/2Yoo4DJa9wgqVmt9vjmMBi (boards Main, Phone, Tablet). Status: R1, awaiting Hugh's review.

## The problem (measured on the shipped PlaySurface)

`Panel` draws every badge as a full-word pill ("Ghalta, Primal Hunger 8") in one `overflow-hidden` row. With damage from every opponent, four counters, tax and the crown (9 badges at 4 seats, 11 at 6):

| Board | Shipped: badges whole | Proposed |
| --- | --- | --- |
| Phone, one on each side | 1 of 9, name cut to "C" | 4 + "+5" |
| Phone, your turn | 0 of 9 | 2 + "+7" |
| Phone, six ends | 1 of 11 | 4 + "+7" |
| Phone, three and three (sideways) | 0 of 11 | 2 + "+9" |
| iPad, two and two (foot) | 2 of 9 | all 9 |
| iPad, one on each side | 2 of 9 | all 9 |
| iPad, three and three (foot) | 1 of 11 | 4 + "+7" |
| iPad, six ends | 1 of 11 | 3 + "+8" |
| Desktop 1440, three and three | 1 of 11 | 5 + "+6" |

## Calls

1. **Compact chips.** Damage: the attacker's commander art and the figure. Counters: the icon and the figure. Tax: the arrow and "+4". Monarch and initiative: the icon alone in the accent ring. The full words stay in each chip's aria-label (unchanged `badgeAria`) and a `title` for desktop hover. Same pill tokens as shipped.
2. **What ends the game leads.** Damage and poison first, ordered by nearness to lethal (n/21 per commander, n/10 poison); then tax, the other counters in `COUNTER_KEYS` order, then monarch and initiative.
3. **Whole chips and a +N.** No chip is ever cut. The row measures every chip in an unseen ruler and shows the longest run that fits beside a "+N" chip (`--elevated`, semibold). +N opens the shipped sheet on the tab of the first chip left out (and its counter's focus). Re-fits on resize and rotate, a badge change, End turn appearing, and font load (the ruler is observed too).
4. **Who gives way.** The name never shrinks (min 3ch, shipped caps); the deck name gives way first (`shrink-[999]`), then chips go behind +N. End turn and the sheet button unchanged.
5. **Hit areas.** Shipped `after:inset-[-10px_-3px]`: 44 px tall in a name row, 48 px in the iPad foot; chips are 44 to 51 px wide.

## Open questions

- **Q1** Where +N goes. A (rec): the shipped sheet on the first left-out chip's tab. B: a popover listing every chip with its words.
- **Q2** On your turn End turn takes room. A (rec): keep its label. B: drop to the 44 px arrow circle while chips overflow.

## Files

- `Main.dc.html`, `Phone.dc.html`, `Tablet.dc.html`: the boards; `art/fit-*.webp` (base = shipped, prop = proposed; `-zoom` = the loaded seat's row).
- `copy strings.ts`: new copy keys.
- `STATES.md`, `READINESS.md`.
- `scratch-gen/`: `proposal.diff` (panel.tsx + copy, against main 79223cc), the render pipeline (see HOW below), `gen.py canvas|repo <out>`.

### HOW (cloud render)

Scratch at /home/user/work: `npm i react@19.2.4 react-dom@19.2.4 tailwindcss@4 @tailwindcss/postcss postcss esbuild`, symlink global playwright into node_modules, copy repo `src` into `base/` and `prop/` (apply proposal.diff to prop), `TREE=x node build.mjs && TREE=x OUT=x.css node css.mjs`, serve `out/` on :8765 with `out/tracker` -> `public/tracker` and `out/fonts` -> `src/app/fonts` (counter icons are absolute `/tracker/*.svg` masks, so file:// shows none), art crops from `design_handoff_the99_small_items_10/art/` into `out/art/`, then `node shot.mjs base|prop specs.json` and `node count.mjs`.
