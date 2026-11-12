# Public landing · addendum A4: tips on phones

`design_handoff_the99_public_landing/addendum-phone-tips/` · 2026-11-12 · account 2

**Status: APPROVED by Hugh 2026-11-12 (R1).** Canvas: https://claude.ai/artifact/Eb1daYtVt3wLjAbSTLPvfN (the A4 column, right of A3).

**Brief (Hugh, 2026-11-12).** On a phone, opening a tip in "With credits" draws it over the row below, so a reader has to close it before they can read the next row. Engineering recommended that on phones the tip opens in the flow and pushes the rows below it down, while desktop keeps the floating tip. Design calls the pattern. Draw one tip open mid-list, a long tip and the last row's tip at phone width, with the desktop tip unchanged for reference.

**What doesn't change.** Everything else in `design_handoff_the99_public_landing/` (R4, A1 to A3): the rows, the ⓘ, the costs, every word of the tips and their previews, one tip open at a time, and the floating tip from 768 up.

Every frame is the shipped `Credits` section and the `Close` band under it (`src/components/landing`), rendered with the shipped CSS and fonts. The recommended frames change only `credit-tips.tsx`'s classes (`scratch-gen/tips-variants.diff`).

| File | Holds |
|---|---|
| `A4-Calls.dc.html` | The call, the width table, today beside A4, engineering notes |
| `A4-Phone.dc.html` | Today and A4 at 390 (mid-list Proposed cuts, long Suggested changes, last row Which deck) and the long tip at 320 |
| `A4-Behaviour.dc.html` | Phone viewport frames: switching tips with the pressed row held in place, and the last row's tip scrolled into view |
| `A4-Desktop.dc.html` | 1300 and 768, unchanged (pixel-identical to shipped) |
| `A4-Themes.dc.html` | The in-flow tip in all six themes |
| `STATES-phone-tips.md` | Every state, with Must-nots |
| `READINESS.md` | Readiness |
| `art/` | The board images, also uploaded to the canvas |

## Design's calls

1. **Below 768 the tip opens in the flow (engineering's recommendation, taken).** It's the shipped tip card unchanged inside (icon, name, sentence, What you get, Example), the same border, radius and `--elevated` fill. It sits 2px under its row and 3px above the next row's rule, as wide as the row's text, and every row under it moves down by its height. It has no drop shadow on the phone, because it no longer lies over anything.
2. **768 and up stay exactly as shipped.** The two columns start at `md`, and the shipped tip already switches there from row width to its 330px float. With the recommended classes, 768 and 1300 render pixel for pixel as today.
3. **Opening.** Press the ⓘ. The card arrives with the shipped `.anim-menu-in` (no beat, eased, as popovers do). The rows below move at once, with no height animation sliding text under the reader.
4. **Closing.** Press the same ⓘ again, open another, or press Escape. On the phone a press elsewhere no longer closes the tip: it covers nothing now, and a scroll that starts outside the list would collapse it mid-swipe and jump the page. This matches the shipped export guides list, which opens each app's steps under its row the same way.
5. **Switching keeps the pressed row in place.** When a tip above the pressed row closes as the new one opens, the page scrolls by the height that closed, so the pressed row stays where the finger is. Without this, Proposed cuts jumps 240px up when Overview's tip closes.
6. **An open tip is always in view.** If the opened tip runs past the bottom of the screen (the last rows), the page scrolls just enough to show all of it with 16px to spare. If it's taller than the screen, its top goes 16px under the top instead. A tip already in view never moves the page. The scroll is smooth, or instant under reduced motion.
7. **Accessibility.** Below 768 the ⓘ is a disclosure: `aria-expanded` plus `aria-controls` on the tip's id, and the tip drops `role="tooltip"`. Its label stays `What is {name}?`.
8. **Not a sheet.** A bottom sheet would cover the list just as the float does, and adds a step for a two-line read.

## Not drawn
- The free column, the value block and the cost sheet. Nothing changes there.
- Hover on phones. Hover opens a tip only for a mouse, as shipped.
