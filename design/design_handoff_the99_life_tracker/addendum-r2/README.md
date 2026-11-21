# Life tracker addendum R2: parity and motion (account 2, 2026-11-21)

Canvas: https://claude.ai/artifact/9PFoKAYvCXK8QijxU3XVZs (Version 26), page "Flow · direction C", three rows from
y=28400: "Addendum R2 · Every arrangement on every device", "… The gain/loss cue, without the pulse",
"… Motion: the strip press, day and night".
Status: **APPROVED by Hugh 2026-11-21 (gain/loss: A).** Every board in the handoff and the earlier addenda stays as approved; this
round only settles the four open items below.

Boards reuse the shipped anatomy unchanged: L1's name-row panel and column strip (phone, the tablet's ends), F18's
foot panel and row strip (tablet Two and two), F04's pressed half and pending delta. The strip carries the #3115 Menu
(⋯) after Undo. Generator: `scratch-gen/gen_r2.py` (reads the live L1, F18 boards; writes every board here). Fixtures
as F18: Colin's turn, round 2, Max holds the monarch, Peter has 6 from Ghalta, you have 2 poison; Chris and Sam (no
deck, the S2 plain ground) fill 5 and 6. Tablet landscape frames are the 1180×820 canvas drawn at 1024 wide (1024×712,
as the play surface scales it); upright frames are 820×1180.

| Board | Item | What it settles |
|---|---|---|
| P0-Parity | 1, 2 | Every arrangement at every count, phone / tablet / tablet upright, as setup's Table row offers them. New ones marked. |
| R1-Phone5-ThreeTwo | 1 | Phone 5, **Three and two** (default): three on the right long side, two on the left, the strip between. |
| R1-Phone5-End | 1 | Phone 5, **One at the end**: two per long side and one at the bottom end, like phone 3's end. |
| R1-Phone6-ThreeThree | 1 | Phone 6, **Three and three** (default): three per long side. |
| R1-Phone6-Ends | 1 | Phone 6, **Ends**: today's phone-6 cells, drawn for the first time; End turn keeps only its arrow on these short rows. |
| R2-Tablet4Around (1024), R2-Tablet4Around-Upright (820) | 2 | Tablet 4, **One on each side**, drawn: ends on the short edges full height, the pair on the long sides. |
| G1-Cue-Phone / -Tablet / -Upright | 3 | The 2 s window (A, recommended): the tapped half lit 18% accent, pending −3 / +2 beside the number. |
| G2-Settled-Phone / -Tablet / -Upright | 3 | The moment after commit: number ticked, half back at rest, nothing flashes. |
| G3-Tinted-Phone / -Tablet | 3 | Option B: the same window with the half and delta tinted danger (loss) or success (gain). |
| K1-Motion | 4 | Motion sheet: strip press and day/night spin, frames, timing, reduced motion. |
| K2-Motion-Try | 4 | Interactive: press any strip button, tap the sun; a switch plays it as reduced motion. |

## Decisions (for Hugh)

1. **Phone 5 and 6 take the tablet's two arrangements, with the tablet's names.** 5 = *Three and two* (default) /
   *One at the end*; 6 = *Three and three* (default) / *Ends*. The phone's undrawn 5 "Around" (an end at each short
   edge, two and one on the sides) goes: no tablet offered it, and parity means one set. Phone 6 Ends is today's
   `phone-6` cells, renamed from "Around".
2. **One name per arrangement, on both devices.** The phone's 4 labels change to the tablet's: *Two and two*
   (was "Two long sides, two players each") and *One on each side* (was "One player on each side"). Defaults match:
   the first listed is the default on both devices (4 Two and two, 5 Three and two, 6 Three and three).
3. **Tablet 4 One on each side is drawn, not scaled.** The phone's L1 cells are a portrait canvas: stretched onto
   the 1180×820 landscape canvas, x scales 3.0 and y 0.97, so the two ends become 1145×184 slivers along the long
   sides and the sides 470×427, with the life numbers sized for neither. Drawn in L4's grammar instead: the ends
   take the short edges at full height (250×800, rot ±90, 140 px life), the pair takes the middle of the long sides
   (640×358, 150 px life), the strip sits between them (640×64). Upright turns it a quarter like every other layout.
4. **Short rows: End turn keeps only its arrow.** Phone 6 Ends' side panels are 217 px long: name, End turn's label
   and the 44 px sheet button don't fit (the deck already truncates away). Below a 240 px row, End turn draws as a
   44 px accent circle with its arrow, accessible name "End turn". Every other row keeps the labelled pill.
5. **Gain/loss: A, nothing new (recommended).** With the pulse gone, the cue is the 2 s window the table already
   watches: the tapped half lit 18% accent and the pending ±N beside the number. At commit the half fades back over
   its shipped 120 ms and the number ticks; nothing flashes. The accent keeps one meaning on the panel (pressed), and
   the sign and the half's side already say which way. **B** (drawn, G3) tints the window by direction (danger 16% for
   a loss, success 16% for a gain, the delta in the same ink); it reads gain from loss by hue alone, and on Phyrexia
   the success green sits beside the green accent.
6. **Strip press = the app's press.** Accent ground, bg ink, ring off, `scale(.92)`; `--motion-quick` (200 ms) on
   `--motion-ease`, no beat, both ways. .92 is the panel's round sheet button; the fill is Dice open's and a monarch
   pick's, so lit means one thing on the strip.
7. **Day/night turns like a dial.** Always clockwise: the old icon turns out to +90°, the new one in from −90°,
   together, 320 ms on `--motion-ease-out`, no overshoot (the prototype's .45 s bounce wobbled on a 24 px icon). The
   state, the ring and the accessible name change on the tap; only the icon moves.

## Rules for engineering

### Layouts (`src/lib/tracker/layouts.ts`)

```ts
// phone 4: labels only
{ id: "phone-4-sides", …, label: "Two and two" },
{ id: "phone-4-around", …, label: "One on each side" },
// phone 5: replaces "Around"
{ id: "phone-5-sides", device: "phone", seats: 5, canvas: PHONE, label: "Three and two",
  cells: [c(6, 425, 155, 413, 90), c(6, 6, 155, 413, 90), c(229, 6, 155, 273, -90), c(229, 285, 155, 274, -90), c(229, 565, 155, 273, -90)],
  spine: r(167, 6, 56, 832) },
{ id: "phone-5-end", device: "phone", seats: 5, canvas: PHONE, label: "One at the end",
  cells: [c(6, 648, 378, 190, 0), c(6, 327, 155, 315, 90), c(6, 6, 155, 315, 90), c(229, 6, 155, 315, -90), c(229, 327, 155, 315, -90)],
  spine: r(167, 6, 56, 636) },
// phone 6: new default, then today's cells (id kept) renamed
{ id: "phone-6-sides", device: "phone", seats: 6, canvas: PHONE, label: "Three and three",
  cells: [c(6, 565, 155, 273, 90), c(6, 285, 155, 274, 90), c(6, 6, 155, 273, 90), c(229, 6, 155, 273, -90), c(229, 285, 155, 274, -90), c(229, 565, 155, 273, -90)],
  spine: r(167, 6, 56, 832) },
{ id: "phone-6", device: "phone", seats: 6, canvas: PHONE, label: "Ends",
  cells: /* today's phone-6 cells, unchanged */, spine: PHONE_SPINE },
// tablet 4: second arrangement (no foot: name row, like L4 and L5)
{ id: "tablet-4-around", device: "tablet", seats: 4, canvas: TABLET, label: "One on each side",
  cells: [c(270, 452, 640, 358, 0), c(10, 10, 250, 800, 90), c(270, 10, 640, 358, 180), c(920, 10, 250, 800, -90)],
  spine: r(270, 378, 640, 64) },
```

- Order inside each count is the order setup shows; the first is the default, on both devices.
- New cells get new ids, so a game saved mid-play never has its seats moved: `phone-6` keeps its cells (now *Ends*),
  and the retired `phone-5` ("Around") resolves to `phone-5-end` in `layoutById` (an alias, not listed in setup).
- `lifeSize` needs no change: 155×273 and 155×315 fall to 86 px, 250×800 to 140, 640×358 to 150.
- Panel row: when the name row is under 240 px long (phone 6 Ends' sides), End turn renders icon-only, 44×44,
  `aria-label="End turn"`, same accent fill and press.

### The gain/loss cue (`panel.tsx`, `globals.css`)

- **A (recommended):** delete the pulse `<span>` (the `pulse` state and its effect) and the `life-pulse` keyframes.
  Nothing else changes: the pressed half (`data-pressed`, 18% accent) and `life-pending` already carry the cue, and
  the half's `transition-[background-color] duration-[120ms]` is its fade at commit.
- **B (if chosen):** the pressed half's wash and `text-` ink, and the pending delta's ink, take
  `--danger` / `--success` by the sign of `pending` (16% wash), in place of the accent.

### The strip press (`spine.tsx`)

Add to `sb`: `motion-safe:transition-[transform,background-color,color,box-shadow] active:bg-[color:var(--accent)]
active:text-[color:var(--bg)] active:shadow-none motion-safe:active:scale-[.92]` (Tailwind's `transition` default is
`--motion-quick` on `--motion-ease`). Not on the round (a display) or a disabled Undo (`disabled:active:` resets).
The holder face is inside the button, so it scales with it. Keyboard: Space or Enter held is `:active` too.

### The day/night spin (`spine.tsx`, `globals.css`)

Render both icons stacked in the button, keyed on the change: the outgoing one plays `dn-out`, the incoming one
`dn-in`, 320 ms `var(--motion-ease-out)`, `both`.

```css
@keyframes dn-out { from { transform: none; opacity: 1 } to { transform: rotate(90deg) scale(.6); opacity: 0 } }
@keyframes dn-in  { from { transform: rotate(-90deg) scale(.6); opacity: 0 } to { transform: none; opacity: 1 } }
```

Off → day: the faint sun goes out, the lit sun comes in, the ring lights immediately. A tap mid-spin re-keys, so
the running pair ends and the next starts from the current icon. Under `prefers-reduced-motion` neither plays: only
the incoming icon renders.

## Copy (for `/copy-review`)

| Where | Copy |
|---|---|
| Setup Table row, phone 4 | *Two and two* · *One on each side* (labels aligned with the tablet) |
| Setup Table row, tablet 4 | *Two and two* (default) · *One on each side* |
| Setup Table row, 5 (both) | *Three and two* (default) · *One at the end* |
| Setup Table row, 6 (both) | *Three and three* (default) · *Ends* |
| Icon-only End turn | accessible name **End turn** |

## Tests

`layoutsFor(device, n)` returns the same labels, in the same order, for phone and tablet at every n from 2 to 6;
every new layout's cells sit inside the canvas without overlapping each other or the spine; a stored `phone-6` resolves
to Ends with its cells unchanged and a stored `phone-5` to One at the end; End turn is icon-only below a 240 px row and labelled above it; no
`life-pulse` element renders after a commit; a strip button gets the accent fill while `:active` and no scale under
reduced motion; the day/night button renders one icon under reduced motion and two (out/in) otherwise.
