# READINESS: Find a deck for it, with a read (R1)

**Build from:** `The 99 - Find a Deck Read (R2).dc.html`. Hugh approved R2 on 2026-10-11.

## Files
| File | Role |
|---|---|
| `The 99 - Find a Deck Read (R2).dc.html` | **build target**: D1, P1–P10, P3f–P3g, P6b–P6c at 900 and 390; scrolled 900 frames for P3, P3f, P3g, P9, P10 |
| `Find a Deck View.dc.html` | the view component the R2 canvas imports (`state`, `phone`, `scroll`) |
| `The 99 - Find a Deck Read (R1).dc.html` · `Find a Deck View R1.dc.html` | R1, history |
| `README.md` | calls, R2 changes, addendum, About entry |
| `STATES-find-a-deck-read.md` | one row per state, plus must-nots |
| `design-tables/find-a-deck-read.md` | geometry and every string; commit to `docs/superpowers/design-tables/find-a-deck-read.md` |
| `find-a-deck-read · copy strings.ts` | `fits.read` and the `creditsCopy` change; placeholders for /copy-review |
| `The 99 - About · Find a Deck Read Entry.dc.html` · `about · find a deck read.ts` | About entry `find-a-deck-read`, gated on `FIND_A_DECK_READ_ENABLED` |
| `brand/` · `support.js` | brand sheet and canvas runtime |

**Hugh’s decision for engineering (app-wide):** credit lines never list the features that share credits; they link to the About `credits` entry (`What uses credits?`). Apply wherever `creditsCopy.spent` / `pausedReason` are drawn.

## Touches
| File | Change |
|---|---|
| `src/components/cards/card-modal.tsx` | With the switch on, the details pane gives way to the view: a `view: "details" \| "fits"` state on the dialog; footer and Prev/Next hidden in the view; the art column stays (md) |
| `src/components/cards/card-detail-provider.tsx` | `fitsDoor` sets the view instead of `setFitsFor` (switch on); `fitsOpen` drives the door’s focus return as now |
| `src/components/cards/fits-picker.tsx` | Renders inside the pane, not `ModalChrome`, when the switch is on; `FitsPlate` replaced by the view head; the band, the read and the fold added; `FitsRows` / `FitsHolds` unchanged |
| `src/components/cards/fits-picker.test.tsx:286` | The stacking pin holds only with the switch off; a new pin for the in-dialog view |
| new `ReadRow`, `ReadBand` | The result row (Swap in toggle) and the band (offer / running / failed / spent / again) |
| `src/lib/copy/swap-tools.ts` | `fits.read` from `find-a-deck-read · copy strings.ts` |
| `src/lib/copy/credits.ts` | R2, Hugh’s decision: `spent` / `pausedReason` stop naming features and end in the `What uses credits?` link to About `credits`; the `deeperLooks` / `tuning` tables and caller flags retire. **Applies to every surface that draws them** (Suggested changes, Overview, Help me choose, Proposed cuts, this read) |
| `src/lib/copy/about.ts` | `find-a-deck-read` after `fits-your-decks`; `AboutSwitch` gains `FIND_A_DECK_READ_ENABLED` |

## Readiness
| Area | Ready | Note |
|---|---|---|
| The view in the dialog (D1) | medium | Desktop is a pane swap; the phone reuses the sheet’s `inert` + scroll-keep from stacked sheets. Focus and Escape need new tests |
| Press and credit line (P1, P8) | high | Proposed cuts’ CreditButton and standing line, reused |
| Loading (P2) | high | Still rows, no shimmer; needs the run id for P2a |
| Result rows (P3) | medium | Swap in needs `takeStandInAction` reachable from the picker (G3) |
| Thin / short / no fit / failed (P4–P7) | high | Each maps to one lock-4 outcome |
| Stored reads (P9, P10) | medium | Needs per-candidate change reasons from lock 6’s hashes (G5) |
| About entry | high | One entry, one switch, no bump |
| Copy | low | Every string a placeholder until /copy-review |

## Gap report
- **G1 · Fixtures.** Every sentence, cut, plan quote and price on the canvas is illustrative. Card text is not quoted, and oracle text is a placeholder block. Replace them with eval output (lock 9) before /copy-review reads them.
- **G2 · Sentence length.** Rows are drawn at about 25–30 words. Lock 1’s length cap is engineering’s. At the desktop pane’s 438px measure, three lines is comfortable and four is the ceiling before rows stop fitting the 620 dialog.
- **G3 · Swap in.** `takeStandInAction` (`swaps/actions.ts:29`) takes a stand-in for a cut in one deck. The read needs it with the read’s cut, and its undo, from the picker. It also needs a `to buy` path when no copy is free. Confirm it does both, or extend it.
- **G4 · Which copy.** After a swap uses the free copy, the other rows go `Swap in to buy`. This needs the same re-read the picker does after an Add.
- **G5 · Change reasons.** P10 names the deck that changed. Lock 6 stores per-candidate hashes, so the changed ids are known. For a set change, the note doesn’t name decks. Confirm the stored result keeps enough to say which.
- **G6 · Credits copy.** `creditsCopy.again` names suggestions, so the read uses its own `again`. R2 retires the feature lists app-wide (Hugh’s decision); the link’s target is the About `credits` entry, which must keep the full, switch-gated list.
- **G7 · Leaving mid-run.** P2b’s `reading your decks…` under the door needs the run in flight to be readable from the card payload or a cheap poll.
- **G8 · Focus.** In the view, focus starts on the heading. Back moves it to the door, which today waits out `inert` a frame at a time. In-dialog, there’s no `inert` to wait on.
- **G9 · Contrast.** `--bg` ink on the filled `--accent` button, and the 0.72 changed row, need checking in all six themes.
- **G10 · Add only (R2).** The row’s `Add only` is today’s `addFromFits`. Its undo needs a remove-from-draft for a card the view just added. Confirm the reverse exists, or the pressed state can’t unselect.
- **G11 · No fit kept (R2).** Lock 6 already stores an empty result with its hashes. R2 asks only that the press stays hidden while that stored no fit is current. Lock 6’s full hash re-offers on any input change (labels, the index, a need figure), not only on deck edits. If that re-offers too often, narrow the no-fit re-offer to list and overview changes. That’s engineering’s call.
- **G12 · Plan source (addendum).** The row needs the plan source per candidate (v2 / older / none) returned with the read. The input builder already knows it (Finding 1). An older overview counts as quotable for lock 3.
- **G13 · Deck-page link (addendum).** `Update it` / `Write one` deep-links to the deck’s Analysis tab at the Overview. Confirm the anchor exists, and that the dialog closes first.
