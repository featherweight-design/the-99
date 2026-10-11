# Gap report: evidence benchmarks PR 3 (the How it plays block)

Checked against `docs/superpowers/design-tables/evidence-benchmarks.md`, which was enumerated from
`design/design_handoff_the99_analysis_tab/addendum_evidence_benchmarks/` without reading the code.
Verify pass: 10 visual gaps, 0 state gaps. Openers are tested in the component and wired to the
Analysis tab in PR 4, along with the ledger. The About entry is PR 5.

| # | Gap | Resolution |
|---|-----|-----------|
| 1 | No-combo panel at 1300 has no `min-width: 0` | Fixed: `md:min-w-0` |
| 2 | InfoTip ring has no `aria-describedby` | Fixed: the ring names its tooltip, for both callers |
| 3 | Ring glyph weight 600, line-height 1 | Ruled: the shared InfoTip (audit build rule 5) keeps Deck stats' ring |
| 4 | Ring `cursor: help` | Ruled: shared InfoTip, rule 5 |
| 5 | Ring `flex: none` | Ruled: shared InfoTip, rule 5. The ring is fixed at 18px in a row that does not shrink it |
| 6 | 1300 hit area 28px, not 18px | Ruled: shared InfoTip, rule 5 |
| 7 | Tooltip positions against the whole Dependencies box, so it opens under the last row | Fixed: the head row is the positioned ancestor, as Deck stats' card header is for its tip |
| 8 | Tooltip box (width 260, padding 9 by 11, 12px) | Ruled: shared InfoTip, rule 5, whose box is Deck stats' (340, 12 by 14, 12.5px) |
| 9 | None panel's checked line keeps `line-height: 1.5` at 1300 | Fixed: `md:leading-normal` |
| 10 | Stale banner line and note have no `text-wrap: pretty` at 1300 | Fixed |
| - | The banner's button spanned an empty second row when there was no note, raising the line above the button's center | Fixed: the button spans two rows only when the note is drawn |

Verdict: 0 open gaps.
