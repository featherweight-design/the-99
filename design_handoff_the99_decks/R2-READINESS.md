# READINESS — price on the buy tag (#291), R2

**Verdict: 🟢 Green.** All three blockers are closed, the four citations are corrected, the etched
guard is stated and the export copy call is written. No decision is waiting on anyone.

R1's canvas and documents are untouched; R2 is new files only. Four stale drawings are recorded in
`R2-README.md` §7 rather than redrawn.

## What blocked, and what R2 does

| Blocker | Closed by |
|---|---|
| **1 · Staleness derivation contradicts the locked semantics** | The wall-clock window is withdrawn. `live = as_of === max(as_of)`; `soldOut = row exists && !live`. No constant, no clock. **The failure mode inverts:** a missed run leaves every row live, so no card says sold out. |
| **1b · The retired gap — draw the run-health state or rule it out** | **Drawn.** A table whose newest `as_of` is older than the cadence is the signal, and it lands as one clause on the header's provenance line: `prices from ManaPool · last checked 12 August · these are behind`. Figures and total stay; no banner; not a warning colour. |
| **2 · `--fg-body-dim` is not a token** | Withdrawn, and the fix **removes** a colour: `sold out` takes `--fg-body`, the figure's own ink, because it sits in the figure's slot. Three inks became two. |
| **3 · Contrast table is pre-theme and single-theme** | Withdrawn entirely and restated as a token table. **This pass introduces no new pairing:** every ink is one the shipped tag and row text already use on `--surface-sunken`, and the tag's `--warning`-at-13% fill raises every ratio. The AAA claim is the theme pass's, unchanged. |

## Carried forward

- **The one ask of eng:** the measured ratio for `--warning` on the tile tag scrim in all six
  themes. 9px mono on a scrim over card art is the size exception `--avail-hard-fg` exists for, and
  on a theme where `--warning` and `--accent` sit close it is the one thing worth looking at on a
  real row. I will put the figures in the ledger rather than infer them. **Not a blocker** — the
  scrim and inset are the shipped tile tag's, not new.
- **`export.pricingNote`** — `Prices show in the app · exports copy names only`. Replaces
  `export-dialog.tsx:397`, which this pass makes false. A copy correction, not a feature; the
  exports still copy names only.
- **`price.tagEtched`** — the guard's one string. `buy · $6.80 etched`, same slot, same inks. Zero
  rows in staging; renders correctly the day one appears.

## Open, non-blocking

- **Gap §2 is retired**, replaced by a drawn state. Gaps §1, §3, §4, §5, §6, §7 and §8 from
  `ADDENDUM-README.md` stand as written.
- **The "behind" clause is the provenance line's third and last.** Two clauses is the shipped
  shape and three is the ceiling; a fourth fact about pricing needs a different home, not a fourth
  middot.
- **The threshold is shared by two behaviours.** Past the cadence the line both switches from a
  weekday to a date and gains the clause. One constant, two effects — deliberate, so a player never
  reads an ambiguous weekday on a table we already know is behind, but it does mean one number
  governs both and nobody has tested where the seam feels right.
- **`buy` beside a figure can still read as a verb** (gap §8). Unchanged by this pass, still the one
  thing worth watching in a beta session rather than arguing about now.

## Unchanged and still verified

Rulings 1–4 accepted and not reopened · four tails, zero new marks · state 4 byte-identical to the
shipped tag · the tag is never a target at either density · missing data omitted, never zeroed · no
new token, hue, dependency or motion · fail quiet, no banner · exports copy names only.
