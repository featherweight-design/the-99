# Swap tools addendum: the ranking rebuild, drawn (2026-09-25)

This amends `../` and `../addendum_staples_door_stacking/`, and replaces neither. It follows Hugh's rulings of 2026-09-25. The canvas is `Ranking Addendum.dc.html`, drawn at 1300 (the sheet at 640, the picker at 560) and at 390. The child DCs are copies with only the rebuilt states:
- `Stand-ins Sheet`: `lands`, `landsall`, `creature`, `creatureall`.
- `Fits Your Decks`: the picker, Basalt Monolith.

## Behaviour it draws
- **Lands** rank on a ladder read from their text:
  1. untapped with no drawback;
  2. untapped with a condition;
  3. enters tapped;
  4. one-time or utility.
  - Within a rung: synergy first, then price. Free copies count as price 0, so they lead within a rung.
  - One-time mana (tap, sacrifice: any color) doesn't count as making that color.
- **Other cards** are ranked in three steps:
  1. same card type first;
  2. then every job the card does;
  3. then by this commander's synergy.
- **Synergy** is two plain shares: this commander's decks and all decks in its colors. The difference orders the list but is never drawn as a score.
- **Find a deck** ranks decks by synergy with each deck's commander. Each row's reason is a combo, else a theme, else the two shares.

## 1a · The land row's mana line
- The fact line reads `{mana line}` + ` · {drawback}`, and the row keeps its two lines.
  - The mana line is in `--fg-body`.
  - The drawback is in `--fg-muted`.
- The four forms of the mana line:
  - `makes {colors}, untapped`
  - `makes {colors}, untapped if … / with …`
  - `makes {colors}, tapped`
  - A one-time color leaves `{colors}` and goes into the drawback segment: `{color} once, by sacrificing it`.
- A condition that costs something (a shockland's 2 life) is the condition, so there's no separate drawback segment.
- Fetches keep the parent's `finds …` line.

## 1b · Type groups
- The groups are `same type · {type plural}`, then `other types`. For lands there's one group, `same type · lands`.
  - Each group heading carries an order note on the right: `by {cmdr} synergy`, or `best mana first` for lands.
- Each group shows its top 3. Below them is a text-button row:
  - it reads `Show all {n} {noun} ▾` and becomes `Show fewer ▴`;
  - it's 34px tall, 44px on the phone;
  - it expands the group in place, with `aria-expanded`;
  - a group of 3 or fewer gets none.
- The lead states the jobs once (`ramps and fixes, as Lotus Cobra does`), so the rows don't repeat them.
  - An other-types row starts with its type (`sorcery ·`).
  - Synergy reads `in 58% of Gishath decks, 41% of Naya`.
- Ownership stays on the row as the green dot and the `free` tag. The `yours, free` and `to buy` groups are retired.
- **The ladder is implied.** No rung labels or dividers are drawn: the first words of each mana line show the rung.
- **Staples keep their treatment:** the clause `staple, any commander` and no figure.
- **Design's readings, which Hugh may overrule:**
  - A land is offered only lands.
  - A staple sorts after the synergy-ranked cards in its type group. It has no commander-specific synergy to rank on.
  - This retires the staples addendum's `to buy · staples, cheapest first` group.

## 1c · Find a deck: the reason line
- The commander chip (`N% of X decks`) and the need chip become one mono line: `{reason}` + ` · this deck {need}`. Row height doesn't change, and at 390 the line wraps between its segments.
- The reason is one of three:
  - `Completes a combo with {card}`, in `--fg`, with the card name dotted (it opens that card's details). A combo counts only if every other piece is in that deck's draft. The piece can be the commander.
  - Otherwise `Joins {n} other {theme} cards`, in `--fg-body`.
  - Otherwise the two shares, `in 6% of Atraxa decks, 4% of four-color`, in `--fg-muted`.
- A staple still reads `staple · any commander`, and the staple list stays by name, as in the staples addendum.
- The group's order note becomes `by each commander's synergy`.

## Copy (owed to /copy-review)
- `makes {colors}, untapped` / `untapped if {condition}` / `untapped with {condition}` / `tapped`
- `{color} once, by sacrificing it`
- `same type · {type}` · `other types` · `best mana first` · `by {cmdr} synergy`
- `Show all {n} {noun}` · `Show fewer`
- `in {a}% of {cmdr} decks, {b}% of {colors}`
- `Completes a combo with {card}` · `Joins {n} other {theme} cards` · `this deck {need}`
- The two sheet leads, in `Stand-ins Sheet.dc.html`

## About
A3 and A4 are revised in `design_handoff_the99_about/addendum-launch-entries/` (the r2 canvas and `about-launch-entries-r2.ts`).
