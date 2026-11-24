# Life tracker · every badge fits (addendum)

Account 1, 2026-11-24. Round from Hugh: "If a player has several counters and damage from multiple other commanders, the indicators on the main playing board are not all rendered/visible. We need a solution to fix this that works across device types."

Canvas: https://claude.ai/artifact/2Yoo4DJa9wgqVmt9vjmMBi (boards Main, Phone, Tablet). Status: R2, awaiting Hugh's review.

## R2 (Hugh's notes on R1, 2026-11-24)

Hugh: compact chips approved; asked why the name sits at the top on some boards and the bottom on others; the top row felt packed; +N should be a quick view, not the sheet (else it duplicates the sheet button).

- **One anatomy.** Shipped: the iPad grid boards (`foot: true`, F12/F18/F19) put the name on the outer edge and a 52 px foot toward the strip; every other board (phone, iPad ends) put name, deck, badges, End turn and the sheet button in one 44 px row toward the strip (F04). R2: every board draws the name and deck on the outer edge and one controls row toward the strip (End turn, badges, sheet button); `foot` now only picks the 52 px sizes. The out face follows. Phone one-on-each-side goes from 4 + "+5" to 6 + "+3".
- **+N is a quick look.** It turns into a ✕ and opens a read-only card from the seat's inner edge toward the table's middle (the panel's width, min 268, max 420, turned with the seat, lifted over neighbours). Every badge in row order with short words (commander up to its comma, counter name, Tax, Monarch); damage and poison read 8/21, 3/10. ✕, a tap off it, or Escape closes it; it closes if the seat goes out or badges clear. No steppers: the sheet button stays the way to change counts.
- Q1 is settled by Hugh's note (quick view). Q2 settled A by Hugh (End turn keeps its label).

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
3. **Whole chips and a +N.** No chip is ever cut. The row measures every chip in an unseen ruler and shows the longest run that fits beside a "+N" chip (`--elevated`, semibold). +N opens the quick look (R2). Re-fits on resize and rotate, a badge change, End turn appearing, and font load (the ruler is observed too).
4. **Who gives way.** R2: name and deck have their own outer-edge strip, so chips only share the row with End turn and the sheet button.
5. **Hit areas.** Shipped `after:inset-[-10px_-3px]`: 44 px tall in a name row, 48 px in the iPad foot; chips are 44 to 51 px wide.

## Open questions

- **Q1** settled in R2: +N is a quick look.
- **Q2** On your turn End turn takes room. A (rec): keep its label. B: drop to the 44 px arrow circle while chips overflow.

## Files

- `Main.dc.html`, `Phone.dc.html`, `Tablet.dc.html`: the boards; `art/fit-*.webp` (base = shipped, prop = proposed; `-zoom` = the loaded seat's row).
- `copy strings.ts`: new copy keys.
- `STATES.md`, `READINESS.md`.
- `scratch-gen/`: `proposal.diff` (panel.tsx + copy, against main 79223cc), the render pipeline (see HOW below), `gen.py canvas|repo <out>`.

### HOW (cloud render)

Scratch at /home/user/work: `npm i react@19.2.4 react-dom@19.2.4 tailwindcss@4 @tailwindcss/postcss postcss esbuild`, symlink global playwright into node_modules, copy repo `src` into `base/` and `prop/` (apply proposal.diff to prop), `TREE=x node build.mjs && TREE=x OUT=x.css node css.mjs`, serve `out/` through Playwright's `page.route` (`serveLocal` in shot.mjs; a background http server is refused here) with `out/tracker` -> `public/tracker` and `out/fonts` -> `src/app/fonts` (counter icons are absolute `/tracker/*.svg` masks, so file:// shows none), art crops from `design_handoff_the99_small_items_10/art/` into `out/art/`, then `node shot.mjs base|prop specs.json` and `node count.mjs`.
