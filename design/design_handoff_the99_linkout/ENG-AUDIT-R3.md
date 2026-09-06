# ENG AUDIT — Mana Pool link-out (#330), R3

**Verdict: 🟢 Green. No Design round-trip.** Both blockers raised against R2 are corrected with
drawings rather than prose, and every remaining item is resolvable engineering-side or belongs to
`/copy-review`. Eng spec: `docs/superpowers/specs/2026-09-05-manapool-checkout-design.md`.

## The two blockers, closed

| Blocker (raised against R2) | R3 | Verified against |
|---|---|---|
| R2 asserted the card modal has no actions row. It does, on desktop. | The link joins the pinned `‹ Prev · N of M · Next ›` row at its leading edge, sharing the rule that row already has. R2's claim is withdrawn. | `card-modal.tsx:513` — a `hidden md:flex` sibling of the scrolling column, with `borderTop: 1px solid var(--border)` |
| The phone export sheet was drawn with a full-width button that is not shipped. | Redrawn from shipped: one flex row, `Copy shopping list` + `.txt`. The centring ruling is withdrawn; the link is left-aligned, matching desktop. | `export-dialog.tsx:488–516` — both buttons render at both breakpoints, `.txt` on mobile and `Download .txt` on desktop |

The 590px sheet holds: eight rows fit with the link's row in place, and a ninth card is what starts
the scroll (`export-dialog.tsx:123`).

## Decided eng-side, not sent back

1. **The desktop export drawing inserts a new divider** (`margin:0 24px; height:1px`) between the
   button row and the link row, while the package's own rule says the convention adds no dividers.
   **The rule wins.** The footer already carries `borderTop: 1px solid var(--border)`
   (`export-dialog.tsx:493`); the link's row sits below that existing hairline, and no second one is
   drawn. The phone drawing already does exactly this.
2. **The mobile card-modal link row sits in-flow**, inside the `padding: 20px` scrolling column,
   rather than becoming a pinned row. **Correct as drawn, and not an inconsistency.** The nav row is
   `hidden md:flex`, so the asymmetry between the breakpoints is shipped behaviour, not this
   ticket's invention.
3. **Tab order in the pinned row.** Design left this to eng conditional on the nav being
   focus-trapped first. It is not: `card-modal.tsx:231` calls `useDialogA11y(dialogRef, onEscape)`
   with no `initialFocusRef`, so the trap follows DOM order. **The link goes first, as drawn.**
4. **The `&nbsp;` binding the glyph to the last word lives in the component, not in the string.**
   The copy file's own markup contract already renders the glyph as an aria-hidden sibling span, so
   the string stays clean and the binding is a rendering concern.
5. **`:focus-visible`, not `:focus`,** for the `outline: 2px solid var(--accent); outline-offset: 2px`
   ruling — a mouse click on an inline link should not paint a ring.
6. **Glyph contrast** is measured with the repo's existing theme-contrast tests rather than asserted
   from the canvas, since the ink ruling (`--accent-hover` at rest, `--fg` on hover and active) was
   derived for 14px text on six backgrounds and the glyph rides the same colour.
7. **Row margin** takes the container's existing spacing at both breakpoints rather than a value of
   the link's own.

## Routed to `/copy-review`, not to Design

`Buy these at Mana Pool` and `Buy any printing at Mana Pool` are settled as *decisions* — one
grammar, no count, no price, `any printing` promising the plural the destination delivers. Any
remaining question about their wording is copy content and gets a copy review, never a design round.

## Structure eng owns and Design does not

Both URLs (`/add-deck?deck=<base64>` for the list, `/cards?q=<name>` for the card), `rel="noopener"`
with no referral arrangement, and the card link being keyed by the **oracle card** rather than the
printing on screen. All three are settled in the eng spec; none was ever a design question.
