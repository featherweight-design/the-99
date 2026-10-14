# The 99 — Basic lands stepper · R1 handoff package

A quick way to add or take away basic lands on their own row, in list view and Card view, at 390 and desktop.

Source of truth: `docs/superpowers/design-briefs/2026-10-14-basic-lands-stepper.md` (branch
`brief/basic-lands-stepper`).

## Start here

| Read | For |
|---|---|
| **`The 99 - Basic Lands Stepper (R2).dc.html`** | **R2, current.** The five calls and the minimal row at both widths. **Start here.** |
| `R2 - List-Phone.dc.html`, `R2 - List-Desktop.dc.html` | Every state on the list row. |
| `R2 - Card-Phone.dc.html`, `R2 - Card-Desktop.dc.html` | Every state on the tile. |
| `The 99 - Basic Lands Stepper (R1).dc.html`, `R1 - *.dc.html` | R1, the boxed control, kept for the diff. |
| `R1 - Access.dc.html` | Tab order, labels and announcements. |
| `README.md` | Calls with reasons, component and eng notes, gap report. |
| `STATES-stepper.md` | The matrix, the rules, per-state copy. |
| `READINESS.md` | Amber: two calls for Hugh's audit. |
| `basic-lands-stepper - copy strings.ts` | Proposed strings, placeholders for `/copy-review`. |
| `design-tables/basic-lands-stepper.md` | The design-table section. |
| `brand/` | The locked brand sheet. |

## The answer in one line

*The count becomes the control.* `− count +` replaces the ✕ and the `×N` on basic rows, and on the tile it rides a
band across the foot of the art. Presses move the count at once; one save writes the final figure.
