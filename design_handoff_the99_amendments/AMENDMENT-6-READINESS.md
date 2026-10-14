# Readiness — Amendment 6, Keep all auto

R1 · 2026-09-06 · **🟢 Green.** Nothing blocks build.

| Call | Verdict | Why it is safe to build |
|---|---|---|
| 1 · Placement and weight | 🟢 | Reuses `ClearAutoButton`'s ghost geometry and its zero-state rule verbatim. The only new layout is `flex-wrap` on the toolbar container at 390px. |
| 2 · Receipt | 🟢 | Nothing new is drawn. One message into a live region that already exists and already carries two of these. |
| 3 · The `keptNote` | 🟢 | No string edited, no branch added; the note keeps the behaviour the shipped design table already asked for. |
| §5 · The `handAdded` deletion | 🟢 | Four keys removed from an unbuilt copy file. No component reads them yet. |

## What an audit should check first

1. **That the write really is the one already shipped.** `keepAllAutoCards` must be
   `update deck_cards set auto = false where deck_id = ? and auto` and nothing else — no quantity
   touched, no row deleted, no `filled` reset. Compare against `update-actions.ts:307`.
2. **That both controls disable during either flight.** State 3 and state 6 in
   `STATES-keep-all-auto.md`. The shipped `pending` prop is wired to `sweepPending` only, so this is
   a real (small) change to how the two controls see each other, and it is the one place a race can
   put a keep and a delete on the same forty rows.
3. **That absence still keys on the count, not on the callback.** Both buttons absent at
   `autoCount === 0`; the wrapper absent only when the note is gone too (state 7).
4. **That the announcement fires once.** One message per settle, debounced like the sweep's — not
   one per row and not once per optimistic pass.
5. **That the phone's second row keeps 44px targets** and does not push `By role` off the edge at
   390px.

## What carries forward from earlier amendments

- **The schema rule is untouched.** `auto` still clears by a keep control alone. Amendment 6 adds a
  keep control; it does not add an expiry.
- **Amendment 2 (re-import)** already clears `auto` in bulk on apply. That is the precedent for both
  the write and the sentence *"a card the list names is a card the player chose, so it stops being
  the app's."*
- **Amendment 5 (shopping availability)** is untouched: the Shopping list's predicate, groups and
  counts do not read `auto` except in the footer's existing `· {n} auto` clause, which follows the
  count it already followed.
- **The sweep's own gap stays open**: `ClearAutoButton` renders disabled in flight where the design
  table says never disabled. Amendment 6 does not resolve it and inherits it for the new button, on
  purpose — one inconsistency, not two treatments.

## Sequencing

Independent of amendments 1–5. It touches one file each in components, actions, optimistic state and
copy; nothing it edits is edited by another amendment, and `deck-reimport · copy strings.ts` is
edited only by deletion of keys nothing reads.
