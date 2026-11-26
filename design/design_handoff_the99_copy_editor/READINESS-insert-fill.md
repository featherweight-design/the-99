# READINESS: copy editor addendum, insert a fill-in (#3357, merged bc6ce57f9)

**Verdict:** Yellow. Audited 2026-11-25 by an orchestrator subagent. No Design round-trip is needed.

All five questions are answered. The art covers 5a removed, 5b insert placing and 5c none left, at phone and desktop. The tokens are real (`--accent`, `--accent-text`, `--fg-faint`, `--fg-muted`), and the shipped strings have no em dash.

## Engineering clarifications (the plan or PR body records them)

1. **Insert rows.** Each field gets its own insert row, so each variation gets one too. A row offers only the fill-ins that row supplies (follow the Phone and Main boards).
2. **One use each.** The picker offers each fill-in once. The validator does not refuse a duplicate typed by hand.
3. **Rows with no insert row.** Read-only rows, and rows whose code supplies nothing, show no insert row.
4. **Long values.** A long value on an insert button truncates with an ellipsis and stays on one line.
5. **Notes.** Each chip gets one note line. A chip that has been removed gets none, as drawn in 5a.
6. **Focus.**
   - The ✕ is a Tab stop.
   - After a removal, the caret goes where the chip was.
   - After an insert, the field keeps focus (I1, line 34).
7. **Announcements and focus ring.** A polite `aria-live` line announces "{name} removed" and "{name} inserted". The ✕ and the insert button use the app focus ring.
8. **✕ size and hover.** The desktop ✕ gets an invisible 24px hit box, because the drawn 16px is under the WCAG 2.2 minimum. The hover look is as specified at line 40.
9. **Undo.** Undo restores a removed chip, if the field already has undo.
10. **Validation.** `validate.mts` and the copy-sheet import guard accept a dropped fill-in. PR A covers this.
11. **Copy.**
    - Replace `copy-editor.ts:37` with I5, through copy-review.
    - Use the semantic names (the B PRs).
12. **Label size.** Compare the 10.5px mono caps label with the field-label size in `editor.tsx`, and reuse the existing size.

## Doc cleanups for the handoff (ship in PR C)

- README rows 4 and 54 still say chips "move, never delete". Update them or point them to the addendum.
- Add rows 5a, 5b and 5c to the STATES.md state table.
- In ADDENDUM-insert-fill.md, change "colour" (line 39) to "color" and "centred" (line 42) to "centered".
- Move `scratch-gen-insert/` into `scratch-gen/`. Add a line to `scratch-gen/HOW.md` saying the scripts need external paths and don't run from the repo.
- Refresh the old "can't be deleted" line in `copy strings.ts`.
- Commit this verdict as `design/design_handoff_the99_copy_editor/READINESS-insert-fill.md`.
