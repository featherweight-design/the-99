# Judged labels (group hug, pillow fort, big mana, politics)

Four strategy themes no type line or text pattern can decide. A model decides them, on a narrow prompt of its own, only for cards a pre-filter selects.

## Why a delta, not a card-label prompt bump

Adding the themes to the card-label SYSTEM edits it, so it needs a version bump and a registry hash. Old rows stay fresh under their own version, so nothing relabels itself and the new themes reach no card until all ~32.6k are relabelled (about $65, the whole cap) to add four themes that fit about 6% of cards. The delta asks only the candidates, and its answers live in `judged_labels` (`src/lib/labels/judged.ts`), leaving `card_labels` and its append-only hash registry alone.

## Running it

`pnpm db:build:judged` is a **dry run**: it reads, plans and prices, writes nothing and calls no model. **Nothing is submitted without `--spend`**, and Hugh approves the spend before anyone passes it. `--sample` selects the ~200-card grading sample (40 pre-filter hits per theme plus 40 cards no pattern matched, picked by `md5(oracle_id)`, so it is reproducible). `--spend` also collects an ended batch; run it again until it reports nothing pending. **Never loop `--spend`.** A request that errored, was canceled or expired is reported and its cards are left out of the next plan (`withoutFailed`); `--retry-failed` asks them again, once the cause is fixed. `--model=<id>` overrides the model; Sonnet 5.5 takes no `temperature` and wants `thinking: {type: "between_tools"}`, not `disabled` (`thinkingOff` in `prompt.ts`).

- The cap is `JUDGED_CAP_USD` (default $15, ceiling $65) and binds on the worst case plus all spend by any `judged-*` run: one budget, so a new run id cannot reset it.
- The ledger is `card_label_batches`, `prompt_version` `j2`, run ids `judged-*`: the Costs page sees the spend. A judged batch that is open blocks a card-label build only for cards both ask about.
- An intent with no batch id (a crash between `create` and the id write) stops the next run until resolved by hand.
- The model is `DEFAULT_LABEL_MODEL`. Changing it goes to Hugh first.

## A theme ships only after it passes

Nothing in the app reads `judged_labels`. A theme becomes a strategy axis (names, glyphs, strategy loader) only after a hand-graded sample passes, per theme: precision at least 90%, recall at least 65% on the candidates, and at most 2 of the 40 control cards graded true (pre-filter miss at most 5%). A theme with fewer than 10 true positives in the sample is unproven and gets a second draw. A failing theme gets its definition rewritten (`JUDGED_SYSTEM`, `j2`) and is re-run alone.
