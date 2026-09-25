# Gap report: swap tools, PR 4a (the stand-ins sheet and the row's ⇄)

Design review ran against `docs/superpowers/design-tables/swap-tools-sheet.md` (about 270 property
rows, 19 states), enumerated from `design/design_handoff_the99_swap_tools/` with README R2, audit H3,
F1, F5, F6, F7, F8, F12, F14 and F15 applied.

## Deferred to PR 4b, by the plan

- **Take**, and every outcome it opens: receipt, refused, taken, Undo swap. A Take drawn in 4a would
  be a press that does nothing, so the row's grid keeps its first two columns until 4b adds the third.
- **A stand-in's name opening its card**, and the hover preview.
- **The key line under the limit line.** Its copy says a card's stand-ins "are also in its details",
  and that door is 4b's.

## Verify: 13 visual gaps, 4 state gaps

Fixed in this PR, and confirmed by the confirm pass:

- The head thumb draws the tapped row's art at once, rather than waiting for the read.
- The head's name and the failed line's `kept` use the display name, as the row does.
- A land's own job line says `gives up nothing` when it has no cost of its own (the handoff's Plateau).
- `finds only a basic` leads a fetch's facts. The engine returns costs first; the unit test now
  feeds them in that order, where it had hand-built the answer.
- The commander is named short, `Gishath` and not `Gishath, Sun's Avatar`, in every lead, heading,
  figure and sentence. `shortName` is the app's existing rule.
- A fetch's lead reads `a Mountain or a Forest`.
- The availability marker on a held free copy is mono 10.5 and does not shrink.
- A no-role card's sheet decides land or spell on the FRONT face, as `jobOf` does, so a spell with a
  land back face gets `noRole` rather than `noRoleLand`.

Not gaps, with the reason:

- **ModalChrome's own geometry** (four rows): vertical centring rather than 60px from the top, the
  app's `--modal-shadow`, the phone header's padding, and the title's 15px on a phone. Every sheet the
  app draws shares that chrome, and the README asks for "the same geometry as the Brackets sheet".
- **BuyTag's 9px on a phone** is the shipped tag's, used unchanged so a price reads the same
  everywhere.
- **The loading status names a spell's job only.** A Shopping row carries no oracle text or colors,
  so a land's colors or a fetch's types are unknown until the read lands. The heading still draws.

## Open, recorded

- **An unnamed drawback** (the italic `gives up something we couldn’t name · read the card`) is not
  reachable: the classifier names every cost it recognizes and does not yet report the ones it does
  not. What `gives up nothing` claims is exact, because it is computed by comparing the two cards'
  abilities (H3). A cost the classifier misses is simply not listed. Reporting unrecognized costs is
  engine work, owed with the H3 copy review.
- **A sold-out original's sheet (F5)** is wired and unit tested, but nothing in 4a opens it: the ⇄ is
  drawn on an over row only, and a sold-out card is never over. 4b's card-modal door reaches it.

## Copy owed to /copy-review

Four keys the handoff has no string for: `sheet.givesUp`, `sheet.leadSpellsUnlisted`,
`sheet.leadSoldOut`, `sheet.soldOutNone`. There are also the 12 quoted H3 abilities measured on
staging. All went to the orchestrator for /copy-review on 2026-09-24.
