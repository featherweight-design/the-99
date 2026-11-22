# Life tracker addendum: the player sheet on a tablet, and the coin toss (account 1, 2026-11-22)

Canvas (Design type): https://claude.ai/artifact/57VqDifoTFPvzp4VGgzd2E (Main, Sheet, Damage, Portrait, Tabs, Coin, Faces).
Status: **Approved and merged** (#3185, 2026-11-22). **R3 adds call 5, the coin's faces: Hugh picked option C** (struck mana pips).

The approved handoff drew the sheet for phone and desktop. On an iPad (1180×820 landscape, 820×1180 portrait) the
shipped sheet covers the whole table, its Commander damage art is a 56 px strip, its content uses the top quarter, and
Table sits alone at the far right of the tab row. The coin flip spins flat in place next to a full 3D dice throw. This
addendum draws the tablet sheet and a coin toss with the dice's energy. Every board and every board in the earlier
addenda stays locked; no new counters, no new tabs, and no copy changes.

Every frame is the shipped tracker (`src/components/tracker/`, main 6aaf82a) bundled and run in a browser at the real
viewport, with this addendum's changes patched in (`scratch-gen/patch.py`, `coin.css`; the whole change is
`scratch-gen/proposal.diff`). Fixtures: four seats, you (Chris) play Sai, Colin Ghalta, Peter Giada, Max Gisa; Colin's
turn, round 2; you took 6 from Ghalta and 3 from Giada and have 2 poison. D3 adds Max on Bruse Tarl + Ishai (partners),
Sam on Killian and Alex with no deck.

## Calls

1. **Half the table, from the opener's edge (tablet and desktop).** The sheet is a panel anchored to the edge of the
   seat that opened it (it is still drawn in that seat's turned frame, as shipped), **50% of the table along that
   seat's axis**: 410 px of 820 in landscape; in portrait the seats sit on the long edges (V boards), so 410 of 820
   there too and the content is the same size. Fixed height, not fitted to the tab, so the edge never moves when
   switching tabs; a 380 px floor for short desktop windows. Radius 20 on its two inner corners, `--surface-raised`.
   The rest of the table shows through a **42% black veil**; a tap on it closes the sheet (as the dice and Menu
   popovers close), and ✕ and Esc still close it. Every tab fits without scrolling; only an open History scrolls.
2. **Commander damage: the art fills the card (tablet and desktop).** One card per opponent, all in one row at every
   count. The commander's art fills the card edge to edge (255 px tall at four seats, against 56), under a top and foot
   scrim; the player's name top left; the commander's name and the shipped `damageOne` stepper over the foot. A count
   above 0 is in the accent (`tone="set"`, as Counters). A partner pair splits the art and **each half carries its own
   name and stepper** under its own art, the count stacked over − and + (the Mana tab's stacked stepper) so a half fits
   at five across (R1.1, after the readiness audit). A seat with no deck draws the plain card surface. The phone keeps F06.
3. **Table joins the tab row (every device).** The `ml-auto` on the Table tab goes; the five tabs sit together in the
   drawn order. Nothing changes on the phone's drawing, because its tabs already fill the row.
4. **The coin toss (every device).** The coin gets a rim (7 stacked discs), a toss arc (rises toward you to 1.8× and up
   55% of its width, then falls), five end-over-end turns about its width plus a half-turn for tails, a 250 ms rattle as
   it lies flat, a shadow that stays on the table, and the dice's landing ring at the landing. The result still lands at
   **1150 ms** (`COIN_MS` unchanged). 120 px on a tablet, 72 px on a phone (today's size). Reduced motion: no toss; the
   coin lies on its face and the result shows at once, as today.
5. **The coin's faces: struck mana pips (R3, Hugh's pick, every device).** The words alone looked unfinished next to the
   dice, so each face is now an engraved coin face (Faces board, option C): a reeded edge, an inner ring, and
   HEADS / TAILS in Cinzel along the bottom on their own band. **Heads** carries the five mana symbols W U B R G, each a
   disc cut into the coin with its symbol left standing in the metal, in a ring that fills the face. **Tails** carries one
   large {C}. No colour: every mark is the theme's accent metal and its shade, so each theme recolours the coin.
   The motion, size and timing from call 4 are unchanged; the Coin board's frames still show the word-only faces.

### The coin face, measured

One SVG per face on a 100×100 box, laid over the shipped `.coin-face` metal (which keeps its gradient and drops its text):

| Part | Value |
|---|---|
| Reeded edge | circle r 47.6, stroke 2.8, dash .7 / 1.3, shade at 75% |
| Outer line | r 45.8, stroke .9, shade |
| Inner ring | r 35, stroke .7, shade at 80% |
| Word | `trackerCopy.dice.heads` / `.tails` in capitals, Cinzel 700, 6.4, tracking 2, shade, on the arc r 43 from 9 o'clock under to 3 o'clock |
| Heads pips | five discs r 11.6 (23% of the coin) at r 19.5 from the centre, W at the top then clockwise U B R G; each disc shade with a light lip (+.5, +.6, 50%); the glyph at 60% of the disc in the metal |
| Tails pip | one disc r 25 at the centre; the {C} glyph at 58% of it |
| Glyphs | the app's own `public/mana/{W,U,B,R,G,C}.svg`, last path only (the coloured disc is dropped) |
| Colours | shade `color-mix(in oklab, var(--accent) 34%, black)`; light `… 45%, white`; glyph metal `… 88%, white` |

Options A (Magic's day/night markers), B (spark and planeswalker) and D (bare symbols) are kept on the Faces board as the
record. Hugh picked C so day and night stay with the spine's own button, which keeps its shipped sun and moon (he found
Magic's day marker hard to read there). A legend for the tracker's controls is a separate piece of work.

### Phone and desktop

- **Desktop changes with the tablet, for consistency.** The tracker already classes a desktop window as a tablet
  (`readScreen`: short side ≥ 600 px), so calls 1 and 2 apply there with no separate layout (D6).
- **Phone:** the full-cover sheet and the F06 cards stay. It gets call 3 (no visible change) and call 4 (shared code).

## Motion

| Part | When | What | Easing |
|---|---|---|---|
| Sheet (tablet) | 0–260 ms | `translateY(100%)` → 0 from its edge | `cubic-bezier(.2,.8,.2,1)` (the shipped sheet curve) |
| Veil | 0–260 ms | opacity 0 → 1 | ease-out |
| Coin spin | 0–900 ms | rotateX 0 → 1800° (+180° tails); rotateZ tilt − 50° → tilt | `cubic-bezier(.12,.6,.3,1)` |
| Coin arc | 0–900 ms | scale 1 → 1.8 → 1, up 55% at 46% | `cubic-bezier(.2,.7,.35,1)` up, `cubic-bezier(.6,0,.9,.45)` down |
| Coin shadow | 0–900 ms | scale 1 → .55 → 1, opacity .55 → .18 → .55, blur 3 → 10 → 3 px | the arc's |
| Coin rattle | 900–1150 ms | rotateX +18°, −9°, +4°, −1.5°, 0 | ease-out |
| Landing ring | 900–1400 ms | 166% of the coin, scale .55 → 1.2, opacity .9 → 0 | ease-out |
| Result card | 1150 ms | shipped | shipped |

All of it is `motion-safe:` only; under `prefers-reduced-motion` the sheet and veil appear at once and the coin is
drawn at rest. The dice frames on the Coin board are the shipped `@3d-dice/dice-box-threejs` throw, rendered
(swiftshader); each is a separate throw sampled at that time.

## Boards

| Board | What |
|---|---|
| Main | Before and after (landscape), the four calls, phone and desktop |
| Sheet | Landscape, all five tabs at half height (D1, C1, X1, X2, X3), a sheet opened from the far side (D2), the table at rest |
| Damage | Six seats with a partner and a seat with no deck (D3), two seats (D4), a partner at four seats (D7), a seat at the short end (E1), desktop 1440×900 (D6) |
| Portrait | 820×1180: now (B2), Commander damage (D5), Counters (C2) |
| Tabs | The tab row before and after on the tablet; the phone before and after |
| Coin | The toss animated (tablet, shipped, phone), 12 frames with times, shipped frames, the d20 beside it, timing table, reduced motion |
| Faces | The coin's faces (R3): four options, flat, tilted and in place on the tablet; the pick (C) on the phone |

Files: `*.dc.html` + `canvas.json` (open with the handoff's `../support.js`), `art/ts-*.webp` (2×), `STATES.md`,
`copy strings.ts`, `READINESS.md`, `scratch-gen/` (reference only, never import: `build.mjs` bundles the shipped
`PlaySurface` with three stubs, `css.mjs` compiles `globals.css`, `shots.mjs` + `specs.json` take the stills,
`motion.mjs` the coin and dice frames with `document.getAnimations()` paused at each time, `gen.py` the boards,
`coins/` the coin faces: `faces.mjs` draws them, `shots.mjs` and `inplace.mjs` render them).
