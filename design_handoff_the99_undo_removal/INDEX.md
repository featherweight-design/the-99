# The 99 — Undo a removal · R3 handoff package

**#390.** Reversing a single removal. Voice: Kitchen Table.

Sources of truth: `design_handoff_the99_deck_versioning/`,
`design_handoff_the99_add_panel/ADDENDUM-README.md` §5 (#185), and
`src/lib/decks/add-validation.ts` + `draft-state.ts`.

## Start here

| Read | For |
|---|---|
| **`The 99 - Undo Removal (R3) - standalone.html`** | The canvas, self-contained — opens in any browser, no server. Pan/zoom. **Start here.** |
| `READINESS.md` | **Green.** Every question the feature ever raised, closed. |
| `README.md` | What changed from R2 and why, the deletion table, the decisions log, component and eng notes, parity, gap report. |
| `STATES-restore.md` | The matrix — thirteen states, the twelve rules they generate from, per-state copy. |
| `undo-removal - copy strings.ts` | Production copy as a `restore` block, plus the one shipped string this feature edits. |
| `The 99 - Undo Removal (R3).dc.html` | The canvas source (needs `support.js` beside it). |
| `(R2).dc.html`, `(R1).dc.html` | Kept for the diff. |
| `brand/` | The locked brand sheet, copied in so this folder stands alone. |

## The answer in one line

*The row does not leave — until you put it back.* One brass link on every `Going out` row that
**always succeeds**, optimistically, on a surface that already enumerates every cut.

## What R3 changed

**Both of R2's refusal states were unreachable.** `Put back` is an add, and adds in this app price
contention rather than refusing it: `DeckAddRejection` is three legality/identity values and
`addCardToDeck` never reads availability. A row under `Going out` already passed those gates, and a
commander is not a `deck_cards` row.

R2 modelled the restore on the **pull** flow — but a pull is contended and a restore mutates only
your own draft. Refusing a restore would make it **stricter than an add of the same card one route
away**.

Deleted with the refusals: the `claimed` tag word, the commander variant, the 32px shared slot, the
`Pull it → Pull` demotion, the pull-flow framing, the money case, and — following the same logic one
step further — **the in-flight state**, since its only job was holding a row for a refusal to land
on.

## What engineering is buying

**One always-succeeding link, one edited string, one focus ruling.**

- `addCardToDeck`, unwrapped — **no new mutation**, the same call #185's undo makes.
- **Optimistic**: the row leaves on tap. A transport failure returns it via shipped `MutationError`.
- **No refusal enum, no guard branch, no client state, no new storage.**
- **No change to any shipped control**, including `Pull it`.
- Seniority is free (`versions.ts:175`); `revalidateClaims` is already called.

## Shipped strings

- **Edited: `review.outNote`** — its first clause (*"No per-row toggle…"*) is now false. The second
  clause is true and R3 leans on it: putting one back *is* adding it to the deck, which is exactly
  why it cannot be refused.
- **Withdrawn: R2's edit to `review.pull`** (the correct key; R2 twice wrote `pullCta`). `Pull it`
  is unchanged.
- **Flagged, not edited: `review.lede`** — wrong by one, though less wrong than in R2: a restore is
  a decision but never a contended one. A ratification question.

Gaps: README §Gap report (six items).
