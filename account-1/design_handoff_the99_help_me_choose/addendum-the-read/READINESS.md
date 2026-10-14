# READINESS: the read (R1)

Read `ADDENDUM-README.md` first. Status: **approved 2026-10-11.** Copy: `the read · copy strings.ts`.

## Build
1. `IntakeForm`: move the words field to the end, after Bracket and a rule. The label is `intake.extra`, with an `optional` tag, and a new placeholder and captions (empty / filled / no credit) plus a count. The free match no longer reads it.
2. The submit takes the pill and credit line when `words` is non-empty and a credit is free, and it needs the standing on the form page (`Standing`, as `DeeperLook` reads it). With no credit it stays the plain button, with `extra.spentLine`.
3. The submit routes to the results with the read pending. `DeeperLook` runs the read: its phases are reused, its titles and leads are re-keyed (`read.*`), and its `steps` are drawn while looking. There's no offer phase, because a read starts on arrival.
4. `ChooseRow` / best fit: an optional `reason` prop drawn under the name. Its bold spans are deck commanders only (the model returns a commander id, and the app draws the name).
5. `ChooseResults`: rows 1–10 come in the read's order, then a *The rest of your results* rule, then the free order without those ten.
6. `ReadAsBar`: the label is `readAs.yourAnswers`, plus a *You wrote* block. Remove Not used / Still not used, `deeper` chips, `afterDeeper`, and the `d` / `n` params.
7. Credit lines: widen `creditsCopy.spent` / `pausedReason` from "deeper looks" to "Help me choose".
8. About: caption, key line 3 and the credits bullet (`about · help me choose r2.ts`). The `ABOUT_VERSION` bump is Hugh's call.

## Tests to assert
- Text in the box never yields a chip, even an exact theme or card name.
- An empty box charges nothing and draws no pill or credit line.
- No credit with text: the press runs the free search, and no reservation is made.
- No reason line contains a digit or `%`.
- Ask A's reasons name no deck. Ask B's name only Omnath or Teval, by commander.
- With exactly Black, no non-black commander is drawn anywhere on the page.
- Nothing fits: no narrow note, the free results are visible, and `No credit used` is in the line.
- An exact repeat under the full fingerprint charges nothing, and its line says so.

## Not drawn
- **A card picker on the form.** The card answer used to come only from words. It's needed and flagged for Hugh.
- Paused and owner-share on the form (§B4's frame with their lines). Step 2 of the wait (the same frame with the dot moved).
- The eval, the cache marker and repricing (locks 4 and 7, engineering's).
