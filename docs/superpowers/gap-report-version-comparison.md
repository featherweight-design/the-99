# Gap report: the version comparison row (PR 7)

Design-review for Round 3 §E and states S7–S10, against
`docs/superpowers/design-tables/declaration-surface.md`. §A and §B were verified in PR 5
(`gap-report-declaration-ask.md`).

## Verify pass

0 visual gaps, 0 state gaps. Every row in E1–E10 matches, or is left open by one of the table's
own contradiction notes. What the implementation does in each open case:

- **C6, an undeclared previous version.** It draws that version's reading, one mark or two, with
  the upper member dimmed as the current side's is.
- **C3, the date.** Not drawn. Only §3c draws one, and there it replaces the marks and reverses
  the sentence. The copy file has no key or format for it.
- **C13, a changed range this version already answered (S10).** The row, then the answered line
  with `change` inside the row's box. The face resolves to the answer, exactly as it does without
  a row.
- **E5, the dimmed upper mark** uses the mark's own `dim` (0.65). The table records the canvas's
  0.5, which predates the verdict addendum's ruling 3 (#861) holding a dimmed member at 3:1.

S7–S10 are all reachable end to end. `listVersions` returns `permits` and `declaredBracket`. The
shell derives `committedClean` and `previousVersion`, and `VerdictBlock` computes
`versionComparison` and hands it to the section. S9's precedence holds because the row's branch
runs before the drift branch.

## Confirm pass

Nothing to confirm: the verify pass returned no gaps.

## Found by the probe, not by the table

**The arrow sat 10px below the marks** on a build whose every class matched the table. Each mark
sat on an inline strut, so its box was taller than the mark and pushed the mark up. The row is
`items-end`, so the arrow's `pb-[13px]` then lifted the glyph to where the mark should have been
rather than where it was. The mark's wrapper is a flex box now, and the probe measures the arrow's
content-box centre against the mark's centre: 0px at both widths.
