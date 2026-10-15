# READINESS — No-collection entry (R2)

**🟢 R2, approved by Hugh 2026-10-15. R2 replaces path (a)’s offer with a checkbox on the import.** Every brief state is drawn at both widths; the seven §Open questions are called. Not green
until Hugh rules on G1 (ruling 1 on step 1) and G2 (Collection open at zero cards), which change shipped behaviour.

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

- The deck-to-collection add (one entry, kind `Deck add`, titled by the deck), with an idempotency id.
- A caller for `addPreconForUser`: the pick's multi-add, one call per box, each with its own id, reporting per box.
- `shell.tsx:42` / `nav.tsx` lock: Collection leaves `LOCKABLE` when the edit switch is on; the note's button by
  context.
- Copy keys for the `/commanders` and `/discover` empties (inline literals today).
- The two stale comments the brief names (`first-run.tsx:1-4`, `page.tsx:103-106`).

## For the audit

G1, G2 and G3 are the three calls most worth checking. Full gap report in README.
