# READINESS — the Mana Pool link-out (#330), R2

**Verdict: 🟡 Amber, one item lighter than R1.** The §2.2 amendment is absorbed: the card link's
label now promises the shelf it lands on, and the one-state ruling has a second foundation. The
amber is unchanged in kind and not a design gap — the spec named in the brief is not in this
project, so two mechanical facts are carried. §2.2 closes the third.

R1's canvas and documents are untouched. Its two stale labels and one withdrawn claim are recorded
in `LINKOUT-R2-README.md` §6 and in the canvas's item 6 rather than quietly overwritten.

## The amendment, as absorbed

| Item | Ruling |
|---|---|
| **The card label** | **`Buy any printing at Mana Pool ↗`.** A bare `Buy at Mana Pool` is not wrong and not enough — it is silent about the one thing that makes this destination unlike a checkout, and **a player who expects one listing and lands on a grid of twelve has been surprised by us**, which is the exact cost the glyph and the named destination exist to avoid. `any printing` promises a plural, names no price, pre-selects nothing, and keeps `Buy`. `See all printings` rejected: more literal, but it demotes the link to a lookup on a surface with a printing picker two rows up. |
| **The deck label** | **`Buy these at Mana Pool ↗`** — preposition only, so one grammar covers both: `Buy … at Mana Pool`, the middle naming what the player will find there. You buy *at* a store, *on* a listing. |
| **One state** | **Unchanged, and now over-determined.** No price on or beside the link, so priced and unpriced cards render identically; and nothing about the destination varies by card, so a conditional would be a branch with one arm. |
| **Unconditional** | **Unchanged.** The player-facing reason stands (a one-copy owner is the person most likely to want a second, a foil, or another printing) and §2.2 adds the structural one. |
| **The hairline** | **Now load-bearing, not merely tidy.** A link directly under `6 printings you own ▾` would read as *buy this printing* — the one thing it does not mean. The picker and the link are never combined and no printing state is passed to the link. |
| **The three routes** | **Claim strengthened.** The link takes the **oracle card** and nothing else — not the printing on screen, not the caller, not the collection. Deck builder, `/collection` and the commander page produce a byte-identical link: **one link per card in the whole app.** |
| **Everything else** | **Untouched.** Weight and its two rejects, placement, the five states, the empty state, the buy tag, the Decklist tab, and item 5's six-theme ink derivation — which is about 14px text on six backgrounds and has nothing to do with what the link points at. |

## Carried — two, mechanical

1. **The URL shape for both mechanisms.** Deck payload; the card grid URL. **What the card link is
   keyed by is no longer open:** the oracle card.
2. **`rel` beyond `noopener`.** The safe floor is specified. If a referral arrangement needs the
   referrer, `noreferrer` must not be added. Commercial, not visual; not guessed at.

**Closed since R1, and withdrawn:** R1 §6.1's *"the card link should resolve to the printing on
screen."* Exactly backwards — the printing on screen is the picker's state, not the
recommendation's.

## Open, non-blocking

- **The card label is the longest string in either footer** (29 characters + glyph). Fits both drawn
  widths on one line; worth one look at 390px in Rune Frost. It wraps before *at Mana Pool*, and the
  glyph stays bound to *Pool*.
- **`any printing` is a plural promise the destination must keep.** If the grid ever lands filtered
  — to in-stock, or to one condition — the label overpromises, and it is the string to revisit.
- Carried from R1: the second footer row is a new construct on a shipped dialog; 44px applies to the
  row, not the text; `--accent-hover` now holds two jobs, with no adjacency today.

## Unchanged and still verified

The buy tag is never a target at either density · the price strip is the Shopping filter's · the 92%
scrim, the 50% inset and the R2 token table · `export.pricingNote` and its two call sites ·
`builder-spine.tsx:391` · exports copy names only · every shipped element of the export dialog and
of the card modal, including all a11y behaviour from `useDialogA11y` · `:visited` identical to rest ·
curly apostrophes throughout.
