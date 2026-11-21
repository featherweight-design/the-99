# Life tracker addendum: tablet 2 and 3, the tablet upright, the strip's Menu (account 2, 2026-11-21)

Canvas: https://claude.ai/artifact/9PFoKAYvCXK8QijxU3XVZs (Version 25), page "Flow · direction C", rows from y=24200
("Addendum · Tablet with 2 or 3 players", "Addendum · The tablet held upright", "Addendum · The strip's Menu").
Status: **awaiting Hugh's review.** Every board in the approved handoff and the two earlier addenda stays locked; this
only adds what was never drawn.

Engineering improvised three things: a tablet with 2 or 3 players falls back to the phone canvas, a tablet held upright
letterboxes the landscape canvas, and the strip's Menu is a bare bottom bar holding **Back to the table** and **Close**.

Boards use the F12/F18 panel anatomy and strip unchanged (CSS copied from F18; name row at the player's edge, the foot
with End turn, badges and the 52 px sheet marker, 150 px life). Generator: `scratch-gen/gen_tablet_menu.py` (reads the
live F18 and F03 boards, writes `T*`, `V*` and `M1-*.dc.html`). Fixtures as F18: Colin's turn, round 2, Max holds the
monarch, Peter has 6 from Ghalta, you have 2 poison; Chris and Sam (no deck, the S2 plain ground) fill 5 and 6.

| Board | State | What it settles |
|---|---|---|
| T1-Tablet2 | Tablet, 2 players | **Face to face** across the long sides: one full-width panel per side, the strip between. One layout, as on the phone. |
| T2-Tablet3End | Tablet, 3 players, default | **One at the end**: a seat on each long side (900 wide) and one at the right short end (full height, like L5), strip between the long sides. |
| T3-Tablet3Side | Tablet, 3 players, the other choice | **Along one side**: all three on the near long side, tall panels, the strip along the far side (L3's grammar). |
| V2 to V6 | Tablet upright, 2 to 6 players | Each landscape layout turned a quarter: the long sides keep their seats, the strip runs down the middle as a column. One board per count (V3 = one at the end, V5 = three and two, V6 = three and three). |
| M1-Menu-Phone / -Tablet | The strip's Menu, open | Menu is the strip's last button (⋯, after Undo). It opens a small menu above itself holding one row: **Back to the table**, with the line that says nothing is lost. |

## Decisions (for Hugh)

1. **Tablet 3 gets a choice, like phone 3.** The same two names the phone uses: *One at the end* (default, the shape
   most tables make) and *Along one side*. Tablet 2 gets one layout, *Face to face*: the two long sides give each player
   a whole side of glass.
2. **Upright gets its own arrangements, no rotate prompt.** A tablet lying flat has no real up: the OS's portrait or
   landscape is whatever it last guessed, so "turn the tablet" would ask the table to fix the OS, not their seats. Each
   upright layout is its landscape twin turned a quarter (the landscape bottom edge becomes the upright left edge), so
   the long sides hold the same seats either way and setup offers the same choices.
3. **If the screen turns mid-game, the seats don't move.** Someone lifts or nudges the tablet and the OS flips: the
   board redraws with the twin turned the matching way, so every panel stays on the edge it was on, facing the same
   player. No prompt, no animation beyond a 0.2 s fade (none under reduced motion).
4. **Menu holds one thing: Back to the table.** History and End game already live in the Table tab, so the Menu repeats
   neither (one control per action). The shipped **Close** goes: like the dice picker, the Menu closes by tapping Menu
   again or anywhere outside.
5. **No confirm before leaving.** Leaving loses nothing: the game stays on the device and the table page shows
   **Back to the game** (S3). The Menu's second tap is the guard against a stray elbow, and the row's line tells
   the table what happens.

## Copy (final, for `/copy-review`)

| Where | Copy |
|---|---|
| Strip button | accessible name **Menu** (icon ⋯, `aria-haspopup="menu"`, `aria-expanded`) |
| Menu row | **Back to the table** |
| Its line | `The game stays on this {phone\|tablet}. Back to the game picks it up.` |
| Setup Table row, tablet 2 | *Face to face* |
| Setup Table row, tablet 3 | *One at the end* (default) · *Along one side* |

## Rules for engineering

### Layouts (`src/lib/tracker/layouts.ts`)

New tablet layouts, same grammar (cells clockwise from the seat nearest the bottom; rot 0 bottom, 180 top, -90 right):

```ts
{ id: "tablet-2", device: "tablet", seats: 2, canvas: TABLET, label: "Face to face",
  cells: [c(10, 452, 1160, 358, 0), c(10, 10, 1160, 358, 180)], spine: TABLET_SPINE },
{ id: "tablet-3-end", device: "tablet", seats: 3, canvas: TABLET, label: "One at the end",
  cells: [c(10, 452, 900, 358, 0), c(10, 10, 900, 358, 180), c(920, 10, 250, 800, -90)], spine: r(10, 378, 900, 64) },
{ id: "tablet-3-side", device: "tablet", seats: 3, canvas: TABLET, label: "Along one side",
  cells: [c(790, 84, 380, 726, 0), c(400, 84, 380, 726, 0), c(10, 84, 380, 726, 0)], spine: r(10, 10, 1160, 64) },
```

With these, every tablet count 2 to 6 has a layout, so the `layoutsFor(device === "phone" ? "tablet" : "phone", …)`
fallback in `play-surface.tsx` goes.

### Upright (any screen in its other orientation)

- **Device class from the short side**, not the width: tablet when `min(screen w, h) >= 600px`. Today's
  `(min-width: 768px)` makes an upright iPad mini (744 px) a phone and a phone on its side a tablet.
- **Turned** when the screen's orientation is not the device's natural one (tablet taller than wide; phone wider than
  tall). Then the play surface draws `turned(layout)`: canvas `{ w: h, h: w }`; each cell
  `{ x: canvas.h - (y + h), y: x, w: h, h: w, rot: rot + 90 }` (normalised to 0 / 90 / 180 / -90); the spine the same
  way. The strip is then a column, which `Spine` already handles (`rect.h > rect.w`). The drawn boards are the tablet
  case; the phone on its side follows the same rule.
- **Which way to turn** follows `screen.orientation.angle` (90 vs 270), so a mid-game flip keeps every panel on its
  physical edge. Fade 0.2 s; off under `prefers-reduced-motion`.
- **Setup** offers the layouts in the orientation the screen has now (the mini diagrams draw `turned()` cells).
  The saved game keeps the layout id; turned or not is decided at draw time, never stored.

### The Menu (`src/components/tracker/spine.tsx`, `play-surface.tsx`)

- Menu is the strip's last button, after Undo: the shared `.sb` circle with the ⋯ icon (the drawn `more` icon), lit
  (accent fill, `--bg` icon) while open, like the dice button.
- It opens a `role="menu"` popover **above the button, centred on it**, 300 px wide, `--elevated`, radius 16, the dice
  menu's shadow; on a phone column it centres on the strip and clamps 8 px from the screen edges. Drawn unrotated, as
  the dice menu is.
- One `role="menuitem"` link, 64 px tall: the door icon in a 44 px circle, **Back to the table**, its line.
- Closes on Menu again, a tap outside (the dice menu's invisible backdrop) and Esc. Opening it closes the dice picker,
  a monarch/initiative pick and any open sheet; only one popover at a time.
- Leaving commits any pending life delta first, keeps the game in storage, and goes to `backHref`; the table page
  shows the S3 game card. The bottom-bar dialog and its Close button are removed.
- Not shown while the Result is up (the Result has its own Back).

## Out of this addendum

Changing the layout mid-game, a rotate prompt, and phone layout changes beyond the turned rule.
