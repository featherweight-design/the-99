# READINESS — the Mana Pool link-out (#330), R3

**Verdict: 🟢 Green. Nothing carried.** Both blockers are corrected with drawings rather than
prose, both token questions are ruled, and R2's two mechanical carries are closed by review.

R1 and R2 are untouched as the record. Their five superseded claims are ledgered in the canvas's
item 6 rather than quietly overwritten.

## The two blockers

| | Ruling |
|---|---|
| **1 · Desktop card modal** | **The link joins the pinned `‹ Prev · N of M · Next ›` row**, at its leading edge, sharing the rule that row already has. **R2's "the modal has no actions row" is withdrawn** — it did, and the consequence is better than the claim: no hairline is added to either surface. *Above it* rejected: two hairlines 44px apart, a one-item row between them, and the link back in the scroll column where it leaves the screen while a nav row holds the bottom. *Replaces it* not on the table: prev/next is a shipped affordance doing an unrelated job, and #330 is not the ticket that trades a player's way through their deck for a store link. |
| **2 · Phone export sheet** | **Redrawn from shipped** — one flex row, `Copy shopping list` + `.txt` — and **the centring ruling is withdrawn** with the premise it rested on. The link is **left-aligned**, matching desktop. The 590px fixed height holds at 8: **all eight rows fit with the link's row in place**, so the link costs the sheet its remaining slack rather than a row. A ninth card is what starts the scroll — one card sooner than without this row. If that trade bites, grow the sheet for the list, not lose the link. |

## The corrected rule

> ~~The outbound link is the last thing in its container, below a hairline.~~
> **The link-out lives in its container's pinned bottom row, below the hairline that row already
> has — and where no pinned row exists, it becomes one.**

R2 mistook the mobile case for the rule. Both surfaces now satisfy the corrected form without a
hairline of the link's invention: **the convention adds no dividers to this app.**

## The two token questions

| | Ruling |
|---|---|
| **Active ink** | **`--fg`, with the underline thickening 1px → 2px.** `#AB6E37` was darker than the `--accent` item 5 rejects for failing AA and unmeasured in all six; any darker step fails in the same two themes. Press reads as a change in weight, contrast can only improve, and no seventh value enters the table. |
| **Focus** | **A real `outline: 2px solid var(--accent); outline-offset: 2px`,** not the drawn asymmetric `box-shadow`. Beyond tidiness: `outline` follows the text box across a wrap and takes no layout space, which is what lets the link keep no box of its own in a row shared with buttons. Colour unchanged. |
| **Box metrics** | 14px / `line-height: 1.45` / `letter-spacing: 0` / `display: inline` / no padding, no min-width. **The 44px target is on the row**, below `md:`. |

## Closed since R2

`/add-deck?deck=<base64>` (deck) · `/cards?q=<name>` (card) · `rel="noopener"` alone, no referral
arrangement. **Neither was a design question and neither is carried.**

## Open, non-blocking

- **The desktop row at its narrowest** — the link should wrap before *at Mana Pool* rather than
  compress the counter.
- **The 590px sheet is at its limit** — eight rows fit with ~18px spare, a ninth scrolls. Revisit the
  sheet's height, not the link, if lists run longer.
- **Tab order in the pinned row** — the link precedes Prev/Next in DOM order. **If the shipped nav
  is focus-trapped first for keyboard deck-walking, keep the nav first and leave the visual order
  alone.**
- **Relayed, not read.** Every shipped fact corrected against came through review; the nav row's
  padding is matched to the shipped footer's rather than measured. Worth one check against the files.

## Unchanged and still verified

Weight and its two rejects · the §2.2 label ruling and its grammar (`Buy these at Mana Pool`,
`Buy any printing at Mana Pool`) · one state, unconditional, no price · `:visited` identical to rest
· the empty Shopping list absent rather than disabled, hairline included · the buy tag never a
target · the Decklist tab rejected, no slot held · item 5's six-theme ink derivation · the shipped
export dialog and card modal in every other respect, including all `useDialogA11y` behaviour ·
curly apostrophes throughout.
