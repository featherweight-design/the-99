# The 99: deck description, and tailored Suggested changes (design handoff, H35)

**Source of truth:** `docs/superpowers/design-briefs/2026-10-03-deck-description-and-tailored-suggestions.md` (main).
Drawn against `analysis-empty.tsx`, `analysis-banner.tsx`, `spine-desktop.tsx` / `spine-mobile.tsx`, `deck-intent-line.tsx`, `deck-intent.tsx`, `tuning-panel.tsx`, `ui/filter-panel.tsx`, and copy in `deck-tuning.ts`, `deck-analysis.ts`, `help-me-choose.ts`, `collection.ts` and `about.ts`. Redrawn against Hugh's 1300 and 390 screenshots of the shipped header, empty state and panel.

**Status:** R3. Reviewed with Hugh across R1–R3 and ready to build. /copy-review owes a pass on the placeholders.

**One line:** *say what the deck is once; add notes for each run.*

## Files
- `The 99 - Deck Description.dc.html`, the canvas. Every frame is at 1300 and 390.
  - 1a: the calls
  - 1b–1d: the empty state
  - 1e–1g: the tagline and the shared pencil
  - 1h–1k: Suggested changes (never run, describing in place, limits set, the run's four checklist states, results with refusal)
  - 1l: About
  - 1m: states
- `STATES-deck-description.md`, the states table.
- `deck-description · copy strings.ts`. Strings marked HUGH are final; the rest are PLACEHOLDER.
- `ABOUT-entry.md`, the new `suggested-changes` entry with `ABOUT_VERSION` going 9 → 10.
- `DESCRIPTION-where-it-lives.md`, which replaces `design_handoff_the99_deck_tuning/INTENT-where-it-lives.md`.
- `READINESS.md`, the build checklist.
- `brand/`, `support.js`.

## What changes, by surface
1. **Empty state.** "Describe your deck" sits between the second paragraph (reworded) and Analyze. The help text sits under the field, with the counter always at its end. It saves on blur and on the press. The loading state is unchanged, and the field is not drawn during it.
2. **Tagline.** The sentence alone: no dashed rule, `edit`, disc or chip. At 390 it clamps to two lines.
3. **Pencil.** It edits the name and the description, as two fields of one width. Save and Cancel replace Update and Export at both widths.
4. **Suggested changes.**
   - The intent ask is gone. "Kept for this deck" takes its place: Most per card, Set (`Set: Any`), and Cards to add.
   - "Additional notes" sits above the action row and is cleared once read.
   - A missing description is a dashed checklist row whose `Describe your deck →` opens the field in place.
5. **The run.** Limits and notes join the checklist as rows, with no secondary text. Reads tick about 350 ms apart from the press, then "Writing your suggestions…" waits on the model. Past 20 s it says it is still working.
6. **Refusal.** One sentence in AnalysisBanner's frame, above the set.
7. **About.** New entry `suggested-changes`, chapter 04.

## Engineering notes
1. Delete `DeckIntentAsk`. `AnalysisEmpty` gains `description` and `onSaveDescription`, and the press awaits the save before it reads.
2. `DeckIntentLine` becomes read-only. The phone clamps it to two lines; desktop never clamps.
3. The header rename (`useDeckRename`) grows to two fields with one commit. Blur commits only when focus leaves the pair. The pencil's aria becomes `pencilAria`. The decks-list `RenameForm` stays name-only.
4. Ruling 3 migration: null out `intent` where `intent_seeded`. The column's future is engineering's call.
5. Widen the `decks.intent` check to 240.
6. New per-deck columns for the cap, the sets and owned-only. Seeding them from `answer_budget_cents` / `answer_owned_only` is engineering's call.
7. `buildEvidencePack` / `prompt.ts`: the limits are hard filters, so the validator drops violators. The notes go in as one quoted block. `src/lib/synopsis/` starts reading the description.
8. **Additional notes are untrusted input.** 500-character hard stop. Pass them to the model as quoted data, never as instructions, and guard against prompt injection and query-string injection.
9. The checklist stagger is client-side and presentational, and it never holds back a result. The writing row stays pending until the run settles; its long-wait line appears at 20 s.
10. The refusal sentence is chosen by the app from the validator's drops, not written by the model. It uses AnalysisBanner's frame with no button (a `variant="note"` prop, not a new component).
11. Copy amends: `bodyPersist`, and every credits "next one at" becomes "reset at".
12. New cite kind `YOU ASKED`, beside the shipped `YOU SAID`.

## Ledger
1. "The ceiling" in ruling 6 is read as the per-card cap. If it means the five-swap ceiling, use `refusal.tooMany` in the same frame.
2. About bump vs switch: see `ABOUT-entry.md`.
3. Credit figures in the frames are fixtures; the wording is shipped.
