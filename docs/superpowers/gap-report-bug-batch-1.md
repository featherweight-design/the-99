# Design Gap Report — Bug batch 1 (#79–#83, #85, #87–#90)

**Date:** 2026-07-25
**Property tables:** `appshell.md`, `collection.md`, `commanders.md`, `decks.md`, `2026-07-20-issue-inspector.md`
**Verdict: 0 gaps remaining** (Agent 2 verify → fix → Agent 3 confirm)

## Scope

This is a fix branch, so verification covered only the elements it touched, not
the whole of four tables. Every changed element was checked against its locked
table row at both breakpoints, and classified as matching the table, authorised
by a filed addendum, or a gap.

## Process

- Agent 2 found **3 visual gaps**, all one root cause.
- One fix wave (`a2e3678`). Agent 3 confirmed **0 residual**, and confirmed the
  fix did not regress the five fields that take no border override or the one
  that overrides only at `md:`.

## Gaps found and fixed

All three were the same defect in the new shared text-field primitive. It set
its border with a `[border:1px_solid_var(--border-strong)]` arbitrary-property
shorthand, which `tailwind-merge` does not recognise as conflicting with a
caller's `[border-color:…]`. Both classes survived into the stylesheet and the
shorthand, emitted later, reset the caller's colour — so three fields rendered
`#3A3229` in place of the colour their table specifies.

1. `collection/confirm-modal.tsx:148` — type-to-confirm input — border-color — table: `var(--danger)` `#C6533F` → shipped: `#3A3229`.
2. `decks/search-pane.tsx:78` — search container — border-color — table (`decks.md:1455`): `#C9A24B` → shipped: `#3A3229`.
3. `decks/create-pre-filled.tsx:283` — deck-name input — border-color — table: `#C9A24B` → shipped: `#3A3229`.

Fixed by expressing the primitive's border as longhand utilities
(`border border-solid border-[color:…]`), which twMerge can reconcile, and
moving the callers to `border-[color:X]`. Verified by executing `twMerge`
against each real class string rather than by inspection.

## Deviations from the locked tables — filed for ratification

Ten deviations ship in this branch. The tables are locked, so each is recorded
in an addendum beside its handoff rather than by editing the table:

- `design/design_handoff_the99_appshell/ADDENDUM-home-hero-and-copy.md` — 🟠
- `design/design_handoff_the99_collection/ADDENDUM-card-modal-and-fields.md` — 🟠
- `design/design_handoff_the99_commanders/ADDENDUM-detail-card-and-dead-controls.md` — 🟠

All three are ORANGE, and for the same reason: five of the ten items delete a
component the table specifies (the "Update collection" CTA, the commander-card
mana-pip and oracle overlays, the "Compare with another commander" CTA, the
"Includes ▾" filter stub). A deletion is not a styling call — Design has to
either ratify the removal or commission a handoff for the feature. The
remaining items (the `↻` glyph → SVG substitution, the focus-ring correction,
the search-field unification, the card-modal height) are corrections Eng
believes are unambiguous, but they still change shipped values and are tabled
per breakpoint for Design to confirm.

## Accepted deviations (documented, not gaps)

- **`decks/search-pane.tsx:112`** keeps `peer-focus-visible:ring-*` after the
  ring sweep removed it from 47 other class lists. There the indicator is
  proxied from an `sr-only` checkbox onto a visible track; the global
  `:focus-visible` outline would render on the invisible input.
- **`commanders.md:1137` §P/T line** — never shipped (schema lacks
  power/toughness, issue #20), so its removal from the detail panel is vacuous.
- **`ui/button.tsx:33`** still uses the `[border:…]` shorthand that caused the
  three gaps above. Its own hover overrides are matching arbitrary properties
  and are covered by `button.test.tsx`, so it is correct today — but it is the
  same latent trap and worth converting when next touched.

## Accessibility

Two improvements fall out of the focus-ring correction, neither of which was
the reported bug:

- The brass focus indicator moves from `ring` (box-shadow, **no offset**, drawn
  inside the control's own border at 4.4:1 against it) to the global
  `outline-offset: 2px`, putting the full band on the page background at 7.9:1.
  A 2.4.11 / 1.4.11 improvement across 47 controls.
- `search-pane.tsx`'s untabled `#6E6353` placeholder (**2.9:1** — an AA
  failure) becomes `var(--fg-faint)` via the primitive.
