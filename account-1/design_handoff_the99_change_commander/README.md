# The 99 — change commander (design handoff · R3, approved)

> **Start with `HANDOFF.md`.** This file is the short why. Approved 2026-09-25.

**The door is on the commander.** One joined plate on the art, `⛶ Card details │ ⇄ Change commander`
(desktop), or a vertical ⇄ / ⛶ pair (phone). Both halves act on the card in the band. The action row stays as
shipped (*Update from a list · Export · Commit as v1*), so a full brew never grows a fourth button.

**The figure is the only claim, so the figure is the door to its proof.** Tapping *41 of 62 are in its decks*
opens the 41 inline. Mana value is a fact beside it (`CostPips` + *(n less than Gishath)*), never an order.

**Ownership groups, figure orders.** *Yours* (free or held) then *To buy*. A pair with any half to buy is a
purchase, so it sorts in *To buy*. A held half is still owned.

**Names open the card you already know.** The existing `CardModal`, stacked on the sheet with
`← Change commander`.

**The swap is a draft change like any other.** The confirm replaces the list in the same sheet; the banner
(both densities) and the review page gain one commander entry each.

## Tried and dropped

- **A fourth button in the action row** (R1). Wraps at 390 on a brew with *Commit as v1*.
- **An *Edit deck ▾* menu** (R2-B). Keeps the row short but hides the only way in.
- **Two separate plates on the art** (R2-A). Cluttered on the phone; joined into one in R3.
- **Mana value as a mono figure** (`mv 5 · …`). The app draws costs as pips everywhere else.
- **A nested view for the counted cards.** A third sheet; depth stops at two.
- **Search.** The list is for finding a name you don't know. Revisit if mono-colour lists prove long.

## Files

- `The 99 - Change Commander.dc.html` — canvas. **R3 (top) is the approved state**; R2 and §1–§5 below it
  are the record, and §2–§5 frames render the approved components.
- `Deck Page 1300.dc.html`, `Deck Page 390.dc.html` (`state`, `controls` — ship `joined`),
  `Change Commander Sheet.dc.html` (`variant`, `phone`), `Review Page.dc.html` (`state`, `phone`). `theme` on each.
- `HANDOFF.md` (R3 section at the foot supersedes §1 and the R1 mana/error notes), `STATES-change-commander.md`,
  `change-commander - copy strings.ts`, `READINESS.md`. `brand/`, `support.js`.
- Repo path: `design/design_handoff_the99_change_commander/`.
