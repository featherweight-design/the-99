# READINESS — No-collection entry (R2, R3 addendum)

**🟢 R2, approved by Hugh 2026-10-15. R2 replaces path (a)’s offer with a checkbox on the import.** Every brief state is drawn at both widths; the seven §Open questions are called. G1 is settled by
Hugh's loosened ruling 1 (alternatives beside the upload). G2 (Collection opens at zero cards) is drawn in R2's calls
board and was approved with R2.

**🟢 R3 addendum, approved by Hugh 2026-10-15.** It places the way into Precons I own for a player who already has cards (the audit's item 1 on #1788): one row in the Add cards sheet. It also settles G7 by showing `you own N of M` on the pick whenever the collection holds cards, and it redraws S17 on the shipped pages. The rest of R2 stands as approved.

## Locks held

| Lock | How R1 holds it |
|---|---|
| No data loss | Adds only, one History entry per box or deck, Revert takes each back; S14 names what Replace would remove. |
| Upload stays primary | The only fill on step 1 and the empty Collection. |
| Precon add reused | `addPreconForUser` per box, unchanged. |
| Ruling 1's order | Every path ends in owned cards; an unowned deck unlocks nothing. |
| Switches | Absent, never disabled (S15, S16). |
| Hit targets, keyboard, screen reader | Every press ≥44px; the group is `role="group"` named by its kicker; pick rows are labels with the checkbox first; the add is `aria-disabled` while held; refusals are `role="alert"` toasts; the receipt strip is `role="status"`. |

## Open questions, called

1 below the upload, as ways to give us cards · 2 precons lead; (c) is leaving, not a button · 3 strip line + Shopping
head, every line, no ticks · 4 pick mode of the list, rows, year groups, twin radios · 5 Sync's handoff, plus Replace's
named clause · 6 Collection open, three locked, `Add your cards` outside first run · 7 `Nothing to rank yet` →
`Add your cards`.

## Engineering needs

- R3: the Add cards sheet's empty state gains the precon row at both widths (`add-cards-sheet.tsx`, beside the phone's upload row, on `PRECONS_ENABLED`); the pick takes `from=collection` for its back link and returns there; Collection draws the S5 receipt under its tabs; the pick rows show the shipped `you own N of M` when the collection is not empty.

- The deck-to-collection add (one entry, kind `Deck add`, titled by the deck), with an idempotency id.
- A caller for `addPreconForUser`: the pick's multi-add, one call per box, each with its own id, reporting per box.
- `shell.tsx:42` / `nav.tsx` lock: Collection leaves `LOCKABLE` when the edit switch is on; the note's button by
  context.
- Copy keys for the `/commanders` and `/discover` empties (inline literals today).
- The two stale comments the brief names (`first-run.tsx:1-4`, `page.tsx:103-106`).

## For the audit

G1, G2 and G3 are the three calls most worth checking. Full gap report in README.

## Engineering readiness audit (2026-10-15)

**Verdict: GREEN for the zero-card paths, with one phase held for Design.** The audit read the handoff against the
code on `main`, not against this file. Every brief state is drawn at 390 and 1300, every token named is declared in
`globals.css`, and `addPreconForUser` fits as is (one id per box, `notFound` / `failed`, twins by file name). Upload
stays the only fill on step 1 and the empty Collection, with the other ways beside it as text presses (Hugh's
loosened ruling 1). S14 reuses Collection Sync's choice step and adds only Replace's clause; it does not redraw Sync.

**Rulings recorded.**
- G1: settled by Hugh's loosened ruling 1.
- G2, Collection opens at zero cards: **confirmed by Hugh, 2026-10-15** (relayed by the orchestrator), because a
  deck import is now a way to start.

**Held for Design: the way into the precon pick for a player who already has cards.** The pick is reached from step 1
and the empty Collection only, and both are gone once a card lands. S17 (a box already added), G7 and the precons
About edit (`Pick them under Precons I own, from your Collection`) depend on that way in, and nothing drawn places it.
The prompt has gone to Hugh for Design. Until it is drawn, the build ships the zero-card paths, leaves S17 and the
precons About edit for the held phase, and words the new About entry so it promises nothing that is not built.

**Design's answer, R3 addendum (approved by Hugh 2026-10-15):** the way in is one row in the Add cards sheet. See README §R3 addendum, S17 to S19, and the reworded About edit.

**Engineering-resolvable, decided in the plan.** A History kind, source and title for the deck add; the deck add's
printing fallback (the list's named printing, then a default) and its commander lines, written in one transaction
through `applyCollectionChange`'s `inside`; the import's tick through unresolved lines, printing clauses and the
commander-needed step, with its refusal in the page's own `FailureBanner`; the shell reading the deck count and the
first-run state for the lock note, `LOCKABLE` dropping Collection, the phone bracket's span and `useGoToStep1`'s
fallback; per-box token totals on `PreconSource`, `added <date>` from `standingPreconAdds`, a cache key for
`?pick=own`; Home's receipt with its own dismiss key; the copy shapes `replaceBuilt` and `pick.cards` need, and the
switch-off link (`/collection` today); the About caption's precon sentence restructured so it can follow
`PRECONS_ENABLED`, one caption at both widths; and a dark switch of the line's own, `needs: COLLECTION_EDIT_ENABLED`,
which the About entry follows. Collection Sync's PR 2 lands before S14.

New components the handoff draws without naming them: the "ways" group (step 1, the empty Collection, the About
specimen), the pick-mode rows and foot, and Home's precon receipt.
