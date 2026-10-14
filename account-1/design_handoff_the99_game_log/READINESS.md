# READINESS — Win/loss tracking, the Games tab (R1)

**Self-assessed: 🟢 Green. No rulings requested, no dependencies open, no redraw pending.**

The audit against the spec's locked decisions is what settles this; the note below is what Design
believes it is handing over.

## Not gated, and not gating

**Phase 1 is untouched.** §6 splits #9 deliberately: schema, migration, the vocabulary constant,
`logGame`, `deleteGame`, the read module and all their tests are ungated and can ship as backend
with no user-visible surface. **Nothing in this handoff asks for a change to any of it** — no new
column, no new action, no change to `summarizeGames`' return shape, no change to §4's validation
rules, no change to the keys.

The one thing Design put somewhere the spec left open: **the eight labels and their sixteen glosses
live in `src/lib/copy/game-log.ts`**, not in `src/lib/decks/game-axes.ts`. The constant keeps its
`{ key, label }` shape and stays the source of truth for which axes exist and in what order. If eng
prefers the label string in the constant, that is a one-line move and Design has no objection — but
the glosses must not become extra columns of the database vocabulary.

## The five §8 calls, all called

| # | Question | Called |
|---|---|---|
| 8.1 | Axis labels | Eight plain nouns + a per-column gloss. **Zero key changes.** |
| 8.2 | Whether Mixed is shown | **Shown**, as one line under a rule, at every N. |
| 8.3 | Form presentation | **Inline**, expanding in place. No dialog, no mobile sheet. |
| 8.4 | The empty state | Pitches the third game, quotes the real output, states the cost, draws the scope line. |
| 8.5 | Low-N presentation | Three dials — denominator, heading, ink — behind one constant, `PATTERN_MIN = 3`. |

## Called, not asked — flagged for the record

1. **`PATTERN_MIN = 3` is the spec's own number, not a measurement.** §1 uses three twice — *three
   games is enough for a person to notice*, and *this happened three times out of three* as the
   sentence the feature exists to print. Design drew that number rather than inventing one. It is
   one exported constant read by the headline, the bucket headings and the cell ink; changing it to
   four is one edit and no redraw.
2. **No percentages anywhere in this feature, at any N.** A permanent rule, not a low-N one. If a
   percentage formatter appears in review it is a defect. `LOW-N-summary.md` lists seven checks the
   audit can run mechanically.
3. **`net` sorts and never renders.** The cell prints `3 of 3` and `0 up · 3 down`. A signed integer
   needs a legend and invites arithmetic nothing here supports.
4. **The conflict case is a move, not a validation.** Ticking an axis on one side unticks it on the
   other, so `worked` and `hurt` are disjoint before submit and §4's "no key appears in both lists"
   rule is never exercised by this UI. The rule stays for crafted requests; it is not dead code.
5. **Delete gets one inline confirm.** §4 has no edit action, so delete-and-relog is the correction
   path — which makes a stray tap unrecoverable on a game the player will not remember. The confirm
   is the mitigation; a five-second undo would be better and would need a toast this product does
   not have.
6. **Losing is never `--danger`.** `W` takes `--success`; `L` and `D` are neutral, in the form and
   in history. A list of losses in the error colour reads as a list of errors, and this is a diary.
7. **Fix is drawn above Keep**, because the reason to open the tab is what is wrong — and it is what
   #10 reads first, so the surface and its successor agree on what matters.
8. **The tab's count is games logged, never the record.** `Games · 3`, not `Games · 2–1`, in a pill
   row that otherwise counts things. Bare `Games` at zero: the count is absent, the tab never is.

## Not blocking, and worth reading before estimating

9. **The headline is derived, in one place.** Strongest Fix → strongest Keep → Mixed-only → the
   record line, using `summarizeGames`' existing sort. Design adds **no second sort**, so the
   panel's order is the pure function's order and stays exhaustively testable per §7.
10. **The axis cell is `role-counter-cell`'s geometry with a two-segment bar**, and a fill one
    surface step up because it nests inside a panel rather than sitting on the builder's ground.
    Extracting a shared cell component is fine; the role strip must not gain a split-bar mode it
    does not use.
14. **The reuse was traced from the decks handoff canvas, not the component files.**
    `builder-tabs.tsx` and `role-counter-strip.tsx` do not exist in this design project, so the
    pill row and the counter cell come from `design_handoff_the99_decks/The 99 - Decks.dc.html`
    (lines 509–538). If the shipped components disagree, they win and the component table in
    `README.md` is what to correct.
11. **Delete revalidates through `deckSurfaces()`** exactly as the log does (§4). The record line on
    the deck list and the home page both move when a game is deleted.
12. **One live-region message per settle** — the move, the save, the delete. Never one per tick;
    individual checkbox state is already spoken by the checkbox. The **move** is announced because
    two rows changed and the player touched one.
13. **The empty state's CTA opens the same inline form, expanded.** One form, two entry points, no
    second surface for the first log.

## Not blocking

- No new token, no new hex, no new motion class, no new empty-state construct, no modal, no toast,
  no tray, no confirm dialog, no tooltip, no disclosure on the axis list, no virtualisation, no
  pagination on history.
- No card is named, shown, suggested, linked or implied anywhere on this surface. The scope line is
  drawn once, in the empty state, in the player's favour, with no reference to a future feature.
- `BuilderTabs` gains one entry and no new geometry. `Decklist` and `Consider` are unchanged in
  position, label and treatment.
- Every axis mark the player made is visible at every N. Low N is quieter in ink, never hidden,
  never dimmed to unreadable, never disclaimed.
- Every figure in the canvas is arithmetically consistent with the three Gisa games it claims:
  2–1 across 3 · `card_flow` 0 up / 3 down · `board` and `engine` 2 up / 0 down · `mana` 1 up /
  1 down (the Mixed case) · `interaction` 0 up / 1 down. The N=5 ladder panel is a separate
  hypothetical and is labelled as one.
- Contrast: every figure and label is full-opacity ink on `--surface` or `--elevated`. The low-N
  treatment changes hue, never alpha. The form's axis gloss is `--fg-faint` at rest (4.57:1) and
  `--fg-muted` when ticked (6.19:1) — deliberately **not** `--fg-locked`, which measures 2.84:1 at
  10px and would make the one string preventing a mis-sided tick the hardest string to read.
- Targets: 46px form rows desktop / 48px phone; 40px result and pod squares desktop / 44px phone;
  30px delete desktop / 44px phone. The whole form row is the label — the 18px box is decoration.
