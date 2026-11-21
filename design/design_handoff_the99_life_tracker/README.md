# The 99 · Life tracker (account 2, 2026-11-18)

Canvas: https://claude.ai/artifact/9PFoKAYvCXK8QijxU3XVZs (Version 24; v18 was the approved round, v19–v21 add the undrawn-states addendum, v22–v24 the Undo addendum)
Research brief: https://claude.ai/artifact/8ATRY8gc8mTc3fgnd1ZS2B
Status: **APPROVED by Hugh 2026-11-18** ("I think this LGTM… we can safely open a PR with the design handoff").

A Commander life tracker inside The 99, launched from a Rule 0 table and modeled on what the MTG Companion app does.
One device sits in the middle of the table and every seat reads its own panel. Low Sun theme, drawn over the shipped
Rule 0 table (`src/components/rule-zero/`). New pieces match shipped UI; nothing here needs a schema change.

To view a board, open any `*.dc.html` with `support.js` and `art/` beside it. `P1-Prototype.dc.html` is interactive
("Try it"): tap and hold life, end turns, pass the monarch, roll dice, open the sheet. `scratch-gen/` holds the
generators (`gen_phone.py` for the F boards, `gen_layouts.py` for L1–L5, `gen_icons.py` for I1–I2), `emu.js` (a
Playwright mini runtime used to click through the prototype) and `map.json` (blob id → `art/` file).

## Addendum (2026-11-20)

The states READINESS.md listed as 🟡 not drawn are now drawn: boards S1–S6, approved by Hugh 2026-11-20. See
[ADDENDUM-undrawn-states.md](ADDENDUM-undrawn-states.md): Start off at 7–8 seated, a seat still picking its deck,
resuming a saved game, the table closing or reseating mid-game, a draw, and starting the next game without closing the table.

## Addendum (2026-11-21): Undo a mistaken ending

Boards U1–U5, approved by Hugh 2026-11-21. See [ADDENDUM-undo-ending.md](ADDENDUM-undo-ending.md): the Result gets
**Undo the last change** under the winner (it names the change that ended the game and undoes only that change, with no
confirm and a "Game back on" toast). It is no longer offered once anyone seated logs the game, after 6 am, or after
Rematch or Start, and a note in its slot says why. The Last game card on the table page carries the same Undo.

## Boards

| Board | What |
|---|---|
| F01 Start | Rule 0 table with **Start the game** |
| F02 Setup | Table layout picker (mini layouts), starting life, who goes first (Random / I'll pick) |
| F02b SetupAround | Setup with the "around the table" layout chosen |
| F02c SetupPick | "I'll pick": tap a seat; it is ringed **Goes first** |
| F03 First / F04 Life | Play: panels, the centre strip, End turn on the active panel |
| F13 Monarch | Monarch and initiative: pick mode, crown flies to the holder |
| P1 Prototype | Interactive version of the whole loop |
| F05 Counters | Your sheet → Counters (no "Other") |
| F06 Damage | Your sheet → Commander damage (first tab) |
| F07 Tax / F08 Mana | Commander tax; mana pool |
| F09 Table | Table tab: day/night, history by round, undo |
| F10 Out | A player goes out (the panel flips), round 3 |
| F11 Result | Game over: placements, rounds, **Log this game**, **Rematch, same seats** |
| F12 Tablet / F18 Tablet4 / F19 Tablet5 | Tablet at 6, 4 (2+2) and 5 (3+2) |
| F15 Badge | Tapping a panel badge opens its counter (Poison focused) |
| F14 Partner / F16 PartnerDamage / F17 PartnerWidth | Partners: split art; damage per partner; 6-player all-partner stress test |
| L1–L5 | Seat layouts: phone 4 around, phone 3 end, phone 3 side, tablet 6 ends, tablet 5 end |
| I1 Icons / I2 IconsPass2 | Counter icon set and the second pass (Ring A, Speed A chosen; storm = the original tornado) |
| A2, B1, B2, C1, C2, Main | Earlier concepts (page "Concepts A B C"); direction C won |

## The approved design

### Entry and setup
- Entry: **Start the game** on the Rule 0 table (setter only). Seats and decks come from the table; no re-entry.
- Setup sheet, one screen: **Table** (mini layout options per seat count, see Layouts), **Starting life** (a −/+ stepper,
  40 default), **Who goes first** (Random, default; or I'll pick → tap a seat, ringed *Goes first*). Start.
- Random rolls the d20 on screen for each seat (the dice library is loaded at setup when Random is chosen).

### Panels
- One panel per seat, rotated to face that seat. Commander art fills the panel; partner decks split it (two halves).
- Life number centred. **Tap** the left/right half for −1/+1; **hold** repeats −10/+10. A pending delta ("−3") shows
  beside the number and commits after **2 s** of no input, then writes one history entry.
- Badges under the name for active counters (poison, energy, monarch, initiative…). Tapping a badge opens the sheet on
  that counter.
- The active seat shows **End turn** on its own panel (one control per action). The panel border lights as the turn ring.
- Out: at 0 life or 21 commander damage from one commander (10 poison too), the panel flips to its back on its own
  (grey art, "Out · 21 commander damage from Ghalta · round 3") with **Undo** on it. Play skips that seat.

### The centre strip
Round number (display only), Monarch, Initiative, Day/night, Dice, Undo, Menu. The round increments only when play passes
the first player's seat again, so it is the round, not the turn. If the monarch/initiative holder goes out it passes
to the active player.

### Your sheet (tap your name)
Tabs in this order: **Commander damage**, **Counters**, **Tax**, **Mana**, **Table**.
- Commander damage: one card per opponent; partners show two steppers stacked vertically in the same card.
- Counters: Poison, Energy, Experience, Rad, Tickets, Speed, Storm, The Ring, City's blessing, Dungeon. No "Other".
- Tax: per commander (+2 per cast), per partner when partnered.
- Mana: the six-colour pool with the shipped mana symbols.
- Table: day/night, history grouped by round, undo.

### Result
Placements, rounds played, and **Log this game** (prefills the shipped log form for everyone seated), plus
**Rematch, same seats** (same decks, same layout, back to setup's first player step).

### Layouts
Seats per device size, per seat count 2–6 (L boards; cells are absolute with per-cell rotation B0 / L90 / T180 / R−90):
phone 2 (face to face), 3 (end or side), 4 (around), 5, 6; tablet 4 (2+2), 5 (3+2 or end), 6 (3+3 or ends). Name
column caps at 110 px on phone, 150 px on tablet. **The tracker caps at 6 seats** (Rule 0 tables allow 8 today).

### Motion (all off under `prefers-reduced-motion`)
| What | Spec |
|---|---|
| Life tick | opacity 0.7 → 1, 120 ms ease-out (no scale jump) |
| Gain/loss pulse | panel tint at 0.3 opacity, 0.6 s ease-out |
| Turn ring | SVG border, 4 paths with `pathLength=1`, stroke-dashoffset 1 → 0 over 0.65 s `cubic-bezier(.4,.1,.2,1)`, starting at the middle of the top and bottom (long) borders and tracing outward to the corners |
| Monarch/initiative | icon flies to the holder, 0.55 s `cubic-bezier(.5,0,.3,1)` |
| Out | panel flip 0.45 s |
| Sheet | slide 0.26 s `cubic-bezier(.2,.8,.2,1)` |
| Dice | d6 / d20 / coin from one Dice button (menu). The roll tumbles across the whole screen, ~1.15 s, lands 0.5 s |

### Dice
One Dice button in the strip opens d6 / d20 / Coin. In production use a 3D dice library (physics roll across the
full screen), **lazy-loaded on the first dice tap**, or at setup when Random picks the first player. The prototype
fakes it in CSS (3D d6 cube, faux-3D d20, 3D coin).

### Icons (I1, I2)
Use official symbols where they exist, fetched at build time like the mana symbols: Poison (Phyrexian), Energy ({E}),
Tickets ({TK}), Day/night (DFC sun/moon), **The Ring = the LotR (LTR) set symbol**, as the Companion uses (the canvas
draws a stand-in). Our own drawn icons for the rest: Rad (trefoil), City's blessing (Orazca stepped temple), Dungeon
(linked rooms), Initiative (descending stairs), Monarch (crown), Experience (chevrons), Speed (4-segment gauge, A),
Commander tax (up-arrow circle), **Storm = the original tornado** (no official symbol).

### Data
Game state lives on the device only (local storage; survives a reload or the app sleeping). No schema change. The only
write is the existing game log, through the shipped prefill.

### Out of scope
"Each opponent loses N", "Other" (custom) counters, syncing one game across several phones.
