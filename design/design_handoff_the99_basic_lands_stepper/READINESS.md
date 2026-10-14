# READINESS — Basic lands stepper (R2)

**🟢 Green: approved (LGTM, Hugh, 2026-10-14).** R2 applies Hugh's one R1 note, "a bit more minimalist": bare
glyphs and count, no box or bar (README §R2 changes). Hugh's approval covers the two calls R1 flagged for audit: no
basics panel this round (G1 stays open as a possible later round), and the `from 6` marker on basic rows (call 5).

## Locks held

| Lock | How R1 holds it |
|---|---|
| Basics only | Gated on `isBasicLand`. No change to Shopping, money or ownership. |
| One save writes the final count | Presses are optimistic; one `setBasicQuantity` per settle. |
| No new 99-card cap | + is live at 99; the shipped over figure takes over. |
| Shipped refusal shape | `We couldn’t change that. The deck is unchanged.` |

## Open questions, called

1. **Control:** stepper with a typed count. No panel this round.
2. **− at 1:** becomes the shipped ✕; the row leaves into #185's receipt.
3. **Card view:** a band across the foot of the art.
4. **Desktop reveal:** always visible, quiet at rest.
5. **Change marker:** `from N` beside the name; the stepper holds the new count.

## Constraints checked

- **Hit targets:** 44×44 for − and + on the phone, in both views.
- **Not crowding the ✕ and quantity:** the stepper replaces both on basic rows, so there is nothing beside it to
  crowd. Basic names are short, so nothing truncates at 390.
- **No row or tile grows** at either width.
- **Keyboard:** real buttons and a real input, Tab order name → − → field → +, Enter/blur/Escape on the field.
- **Screen reader:** labels name the card and the result; one polite announcement per settle.

## Gap report

Six items in README §Gap report. The one to decide: **G1, a basics panel**, as R2 or never.

---

## Engineering readiness audit (2026-10-14, against `main` at adf89f854)

**Verdict: 🟢 GREEN.** Audited against the brief (`docs/superpowers/design-briefs/2026-10-14-basic-lands-stepper.md`,
added to `main` in this PR), not against the verdict above. Every lock holds, all five open questions are answered,
and every state in the brief is drawn at 390 and desktop in both views. No gap needs Design. The items below are
engineering's to resolve in the plan; none changes a drawing.

### Checked against `src`

| Named in the handoff | On `main` |
|---|---|
| `isBasicLand` gate | `src/lib/decks/grouping.ts:149` (snow basics included) |
| The ✕ at 1, `removeAria` | `decklist-row.tsx:836-853`, `deck-card-tile.tsx:516-533`; `decks-builder.ts:317` |
| #185 receipt and undo tile | `decks-builder.ts:324-333`; `deck-card-undo-tile.tsx` |
| `MutationError` under row and tile | `decklist-row.tsx:857`, `deck-card-tile.tsx:537` |
| Recount strings | `deck-versioning.ts:125` `addMarkRecountedA11y`, `:131` `cutMarkRecountedA11y` |
| The 2px accent pending edge | `decklist-row.tsx:371`; tile `:213` |
| Over figure and trim line | `overCopy` / `trim`, `decks-builder.ts:396-470` |
| Shipped stepper to lift | `src/components/collection/add-line.tsx:152-172` |
| Every `var(--*)` in the R2 canvases and the Access board | All declared in `globals.css` (9 tokens checked: `fg`, `fg-body`, `fg-muted`, `fg-faint`, `border-dashed`, `border-strong`, `accent`, `bg`, `surface-sunken`) |
| Art foot under the tile band | Only the cost pips sit there, and only on a tile with no art (`deck-card-tile.tsx:319-329`); a basic has no cost. Nothing is covered. |
| A typed field inside a clickable row | The row's open-card handler already skips `input` (`decklist-row.tsx:424`). |

### Engineering-resolvable (the plan settles each)

1. **Doc drift inside the handoff.** README's "Component notes" table, its states row 6 ("lights the box") and
   `STATES-stepper.md` S6 ("box border `--accent`") are R1. R2 is the 2px `--accent` underline under the count, and
   `design-tables/basic-lands-stepper.md` is R2 throughout. **Build from the design table and README §R2 changes.**
2. **The refusal has two halves since #1746** (`src/lib/copy/README.md`). "The deck is unchanged" is allowed only
   for a refusal the server RETURNED before any write; the handoff's S3 draws that one. A write that THREW may have
   committed, so it takes the `We couldn’t confirm that saved. Reload to see …` shape, and the row cannot honestly
   revert to the last saved count. Plan: on a throw, keep the slot's `MutationError` with the confirm-shape line and
   re-read the deck rather than revert. Same slot, same visuals; the wording goes to `/copy-review`.
3. **Lock cards mode on a basic row or tile** (not drawn). In the mode the ✕ is the lock toggle (`decklist-row.tsx:
   804`); the stepper yields to the toggle the same way, so the mode reads exactly as on any other row. A locked
   basic outside the mode keeps its 14px lock mark left of the stepper. Staging holds 0 locked basics today.
4. **A fill-added basic (`deck_cards.auto`)** keeps its `AutoTag` (`decklist-row.tsx:731`). A stepper write is a
   deliberate count, so `setBasicQuantity` clears `auto` as the keep control does. Staging holds 0 auto basic rows
   today, but the fill's basics step writes them.
5. **The typed cap.** Presses go past 99 (lock); the field restores a figure above 99 (S6). A row already above 99
   by presses shows its true figure in the field, and Enter on it unchanged is a no-op, not a restore.
6. **G2 tile widths**: the band is full width, so the shipped grid's column rule needs no change.

### For `/copy-review` (not Design)

The six placeholder strings in `basic-lands-stepper - copy strings.ts`, plus: `countAria` pluralises by appending
`s`, which reads `Wastess` and `Snow-Covered Islands`-style names oddly; and the confirm-shape line from item 2.

### About

No entry and no edit (README §About). Agrees with the brief: no basics panel shipped, so nothing new to discover.
