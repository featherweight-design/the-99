# Help me choose · round: the read (R1, approved 2026-10-11)

> Brief: `docs/superpowers/design-briefs/2026-10-11-help-me-choose-rework.md`. Its rulings (1–5) and engineering
> locks (1–8) are closed and aren't redrawn here. **Everything in `../HANDOFF.md` and `../addendum-three-answers/`
> stands** except what this file retires. Canvas: `The 99 - Help Me Choose · The Read (R1).dc.html` (§B0–§B14,
> 900 and 390). Frame: `Help Me Choose Read.dc.html`, with a `scene` prop for each STATES row.

## What changes

1. **The box.** `intake.words` (*In your own words*, the first field) becomes **Anything else?**, the last field,
   after Bracket and a rule, with a mono `optional` tag. It's one field, renamed, not a second one. **No free match
   runs on it**: no chips, no Not used. The textarea, the 800 cap and `playerText` stay as they are.
2. **The press.** Find commanders keeps its verb. When the box has text and a credit is free, the DeeperLook pill
   (`1 credit`) goes inside the primary button, with `creditsCopy.first` beside it (desktop) or under it (dock).
   With an empty box there's no pill and no line. With no credit left the button stays live as the free search,
   the box edge drops, and the line says the text won't be read (§B4). The free search is never disabled.
3. **The wait.** The press goes straight to the results. The free results show at once, at 0.45 (best fits too),
   and the shipped DeeperLook panel runs the read: one charge and one Stop, with two named steps (scan N, then
   weigh the closest). No motion. Only step 1's dot and colour change when it ends.
4. **The result.** It's the same list, re-ordered. The top ten each carry one **reason line** under the name, and
   rows 11 and on follow under a *The rest of your results* rule, in the free order. The order head reads
   *Ordered by what you wrote*.
5. **Read as.** It becomes **Your answers**, holding only the chips set in the controls, then **You wrote** with
   the text quoted whole. Retired: *Not used*, *Still not used*, the dashed deeper chip, the `deeper` mark, and the
   `d` / `n` params.

## The reason line

- One sentence of 140 characters at most, 13 / 1.5 `--fg-body` (12.5 on a phone), under the name on rows 1–10
  and on best-fit cards. It wraps to three lines at most and is never truncated. If the model returns more than
  140 characters, the row is refused, not cut.
- **It never reads as a score.** No numbers, no fit words (*strong*, *great*, *best*), no ranks, no stars. The
  ownership figures beside it are the free search's and stay as they are.
- It ties what the commander does, in rules language, to what was written. **It never names a card label.**
- It names one of the player's decks **only when the ask was about difference**, and only by its commander in
  600 `--fg`: *your **Omnath** deck*. Ask A names none.

## Calls on the open questions

| Q | Call |
|---|---|
| 1 Box placement | Last field, renamed, marked optional. **Consequence:** the card answer came only from words before. The form now needs a card picker (Theme picker pattern). That's flagged for Hugh and not drawn |
| 2 Nothing-fits refund | Yes, per lock 7. The panel says *Nothing fits what you wrote*. The refund shows only in the mono line |
| 3 "Unlike my decks" | Only when the ask asks for difference, and named by commander |
| 4 No decks | One sentence in the panel's lead. The rows don't mention decks |
| 5 Second press | No warning. The pill names the cost on every press. An exact repeat, under the full fingerprint, is free, and its done line says so |
| 6 Standing | On the form beside the press, only when the box has text. On the results it's the panel's line |
| 7 Read as / Not used | See *What changes* 5 |

## Fixtures

Hugh's staging account, 21 decks, 10 credits, one already out (`9 of 10 left · reset at 2:01 AM`). Ask A has no
answers: 3,445 scanned, 36 weighed. Ask B has no answers, Omnath is absent (built), and 38 are weighed. Ask A with
exactly Black: 268. Ask B with Colorless: 58, nothing fits. The no-decks account has 5 credits and an index of
3,467. The commanders and reasons are illustrative, and the counts are consistent across frames.

## Most likely to break

1. **A reason line with a figure in it** ("fits 9/10", "92% match"). Strip it or refuse it, never draw it.
2. **The box still free-matched into chips.** Nothing in it becomes a chip, even an exact theme name.
3. **A deck named on Ask A**, or any deck named by its title instead of its commander.
4. **The no-credit press disabled.** It's the free search, and it must run.
5. **Nothing-fits drawn as the narrow note.** The read never loosens a filter. It's one link to Change answers.

Copy: `the read · copy strings.ts` (placeholder, owed to /copy-review). About: `about · help me choose r2.ts`.

## Files

| File | What it is |
|---|---|
| `The 99 - Help Me Choose · The Read (R1).dc.html` | The canvas: §B0 calls, §B1 Read as, §B2–§B13 frames at 900 and 390, §B14 About entry |
| `Help Me Choose Read.dc.html` | The frame, with a `scene` prop for each STATES row (7a–7l) and a `phone` prop |
| `STATES-the-read.md` | Changed and new STATES rows, plus the credit line by allowance |
| `design-tables · the read.md` | Design-table sections for `docs/superpowers/design-tables/help-me-choose-deeper.md` |
| `READINESS.md` | Build order, tests to assert, what isn't drawn |
| `the read · copy strings.ts` | New and retired keys for `src/lib/copy/help-me-choose.ts`, plus the `credits.ts` widening |
| `about · help me choose r2.ts` | The revised About caption, key lines and credits bullet |
| `support.js` | The canvas runtime (open the `.dc.html` files directly) |

Repo path: `design/design_handoff_the99_help_me_choose/addendum-the-read/`.
