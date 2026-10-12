# Card-labels model tiering: Haiku 5.5 and Sonnet 5.5 against the stored Sonnet 4.5 labels (2026-10-11)

Hugh approved this eval with a $1 cap and no production change. Nothing here touches `prompt.ts`, a stored label or a database write.

**Question.** Does `claude-haiku-5-5` ($0.10/$0.50 per million) or `claude-sonnet-5-5` ($2/$10) reproduce the labels staging already holds from `claude-sonnet-4-5` ($3/$15), under the same prompt?

## Method

- **Sample.** 299 cards, drawn deterministically (FNV hash, no RNG) from staging's 32,099 fresh `card_labels` rows written by Sonnet 4.5 under prompt version 8. Ten strata of up to 30 cards each, overlaps counted once: nonland ramp, draw, removal, wipes, protection and tutor; lands with a job; empty labels; two-faced layouts; anything. The sample is not weighted to the catalog: it oversamples lands, two-faced and empty labels and cards that carry a given job, which moves prevalence and can raise or lower any agreement figure. The percentages describe these 299 cards only.
- **Calls.** The app's own `buildRequest` prompt (SYSTEM, `renderBody`), 12 cards per request as production does, one call per model per request, `max_tokens` at production's ceiling.
- **Scoring.** The label scorer's own `bestPairing` and the six limit fields plus `affects`, `to` and `method`. Reference and candidate both drop a land-only tutor the way `freshLabels` does. Agreement is not accuracy: two models can agree and both be wrong, and the stored labels are Sonnet 4.5's opinion, not gold.
- **Script.** `scripts/eval/labels-tiering.mts`, resumable, staging read-only, every reply priced as it lands against the cap. It prints the job-set and full agreement, role and theme recall and precision, identical-role cards, rejected-job counts and the per-role table; re-running it on a finished out file re-scores without a call. The 20 disagreements per model were read by hand from the `-diffs.json` files it writes next to the out file.

## Findings that block use before the numbers matter

1. **Neither model accepts `temperature`.** Both answer 400 "`temperature` is deprecated for this model", exactly as `claude-sonnet-5` does. `acceptsTemperature` in `src/lib/labels/prompt.ts` (`model !== "claude-sonnet-5"`) would send `temperature: 0` to both and fail every request. It needs both ids added.
2. **Thinking has to be turned off, and the two spell it differently.** Haiku 5.5 accepts `thinking: { type: "disabled" }`. Sonnet 5.5 answers 400 and asks for `{ type: "between_tools" }` instead. `needsThinkingDisabled` returns true only for `claude-sonnet-5` and sends `disabled`, so Sonnet 5.5 needs its own branch. The eval ran both with thinking off.
3. **Sampling differs from the reference.** The reference was written at temperature 0; the candidates ran at their default. The comparison is matched on prompt, batch size and scorer, not on temperature.

## Results (299 cards each)

| | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|
| Same job set as the stored label | 47.2% (141) | 69.6% (208) |
| Same jobs and every limit | 24.4% (73) | 51.2% (153) |
| Role jobs identical on the card | 77.3% | 88.0% |
| Role recall / precision | 82.4% / 82.4% | 86.3% / 94.2% |
| Theme recall / precision | 66.8% / 72.3% | 79.4% / 87.4% |
| Jobs rejected by the parser | 10 (7 invalid `kind`, e.g. `drain` as a role; 3 invalid `trigger`) | 1 (`trigger "cycle"`) |
| Measured cost, 299 cards, real time | $0.0415 | $0.8019 |
| Cost per 1,000 cards, standard | $0.14 | $2.68 |
| Cost per 1,000 cards, batch (production) | $0.07 | $1.34 |

Input was identical for both, 180,347 tokens; output was 47,020 (Haiku) and 44,119 (Sonnet). Sonnet 4.5 at batch rates on those same tokens is about $2.01 per 1,000, so Sonnet 5.5 is roughly two thirds of it and Haiku 5.5 is roughly 3.5%. (Derived from the measured tokens, not billed.) Total spend on this eval: $0.84 of the $1 cap, plus about $0.05 on a ten-card smoke.

### Per-role reproduction of the stored label

| Role or theme | stored | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|---|
| role:draw | 62 | 96.8% (16 extra) | 90.3% (10 extra) |
| role:removal | 52 | 94.2% (12 extra) | 92.3% (3 extra) |
| role:ramp | 47 | 89.4% (13 extra) | 80.9% (1 extra) |
| theme:protection | 41 | 85.4% | 90.2% |
| role:tutor | 35 | 68.6% | 62.9% |
| role:wipes | 33 | 93.9% | 87.9% |
| **role:land** | 30 | **23.3%** | **100%** |
| theme:tribal | 26 | 26.9% | 65.4% |
| theme:counters | 26 | 80.8% | 88.5% |
| theme:evasion | 23 | 73.9% (8 extra) | 91.3% (7 extra) |
| theme:pump | 18 | 83.3% | 55.6% |

("extra" is a job the model added that the stored label lacks. Rare themes under 10 stored cards are in the full output and too few to read.)

## What the disagreements are (20 read per model, random order)

**Haiku 5.5.**
- It drops the `land` role on mana lands: Mystic Monastery (`{T}: Add {U}, {R}, or {W}`) comes back with no job, and Sunhome comes back `haste,ramp` with no `land`. 7 of the 30 lands reproduced. Land is a role the app reads, so this is the finding that matters most.
- It invents jobs on thin cards: Ali Baba (`{R}: Tap target Wall`) as removal, Douser of Lights as removal, Putrid Imp as `evasion,pump`, Stronghold Gambit as `castFree`.
- It adds `drain` to every damage spell (Invasive Maneuvers, Lavaball Trap) and sometimes emits a `kind` that is not in the space (`drain` as a role), which the parser rejects (10 jobs in all, 7 of them invalid kinds).
- It drops third and fourth jobs on dense cards (Essence Feed keeps only `ramp` of `drain,lifegain,ramp,tokens`).

**Sonnet 5.5.**
- Most differences are borderline themes the stored label was itself arguable on: Tectonic Break `stax,wipes` against `stax`, Pearl Lake Ancient `protection,pump,spellslinger` against `protection`, Season of Gathering dropping `pump`, Outbreak dropping `tribal`.
- It repeats a kind (`draw,draw`, Eshki Dragonclaw) where the stored label has one.
- It adds a real extra now and then (Warg Tactics `evasion`, Spider-Slayer `evasion`).
- It misses an occasional role the text carries (Fire Nation Raider's Clue is `draw` in the stored label and none here; Ingenious Mastery loses `ramp` and `treasure`).
- No invented jobs on thin cards.

## Limits of this result

- **One run per candidate.** The control below re-asks Sonnet 4.5 once, so it gives one observed reference point for 4.5's self-agreement, not its spread or a proven ceiling.
- **The reference is not truth.** Where a stored label is wrong, a candidate that disagrees scores a miss.
- **Real time, not Batch, for the candidates.** Production uses the Batch API at half price; the candidates' batch rows above are the standard cost halved, not a batch run. Only the Sonnet 4.5 control was a real batch.
- **Pricing.** `scripts/eval/lib/pricing.mts` already prices both models (Haiku 5.5 at the up-to-100K-token rate). The label prompts here are about 600 input tokens per card and about 9,000 per request, so the higher Haiku tier never applies and the repository holds no rate for it. `scripts/lib/card-labels-pricing.mjs` has no row for either model; it needs one, tied to the canonical table by `card-labels-pricing.test.mts`, only if a model is adopted.

## Control: Sonnet 4.5 asked again (2026-10-11)

The same 299 cards, the same prompt (version 8, batch size 12), sent to Sonnet 4.5 by Batch exactly as the labeler sends it (`labels-tiering.mts --control`), scored against the stored Sonnet 4.5 labels with the same pairing. This is one observation of the stored label's own run-to-run agreement, a reference point for the candidates rather than a proven ceiling.

| | Sonnet 4.5 again | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|
| Same job set as the stored label | 75.9% (227) | 69.6% | 47.2% |
| Same jobs and every limit | 60.2% (180) | 51.2% | 24.4% |
| Role jobs identical on the card | 94.6% (283) | 88.0% | 77.3% |
| Role recall / precision | 94.7% / 96.5% | 86.3% / 94.2% | 82.4% / 82.4% |
| Theme recall / precision | 83.2% / 86.5% | 79.4% / 87.4% | 66.8% / 72.3% |
| Jobs rejected by the parser | 0 | 1 | 10 |

Measured spend: $0.58 (135,988 input and 50,139 output tokens, batch rates), against a $0.60 estimate; the budget guard's reservation ceiling was set to $4 for the run because it reserves every reply at `max_tokens` twice over. Per 1,000 cards that is $1.94 at batch rates, Sonnet 4.5's measured cost, against the $2.01 derived above from Sonnet 5.5's token counts. (The script's own summary line printed $0.97 for this mode because it halved an already batch-priced figure; fixed in this change.)

What it says:

- **In this run, most of the job-set miss is also present in 4.5 itself.** Sonnet 4.5 disagrees with its own stored label on 24% of cards (40% on full jobs and limits), so Sonnet 5.5's 30% (49%) is 6 points (9) beyond that one observation. One repeat gives no spread, so these are observed differences, not a significance test.
- **The role gap is the largest observed difference.** 4.5 reproduces 94.6% of cards' role jobs against 5.5's 88.0%, and recall drops 94.7% to 86.3%. Roles are what mana-base and ramp counts read; themes differ by about 4 points of recall, which is within what a self-repeat moves.
- **Per-label noise sits on the same labels.** The control's weak rows (`role:tutor` 77.1%, `theme:spellslinger` 40.0%, `theme:tribal` 65.4%) are borderline themes, where any model would score low.

Recommendation: stay on Sonnet 4.5. Sonnet 5.5 is closer than the single run read, but its 6.6-point role gap is a measured loss on the labels that feed counts, for a saving of about a third ($1.34 against $1.94 per 1,000 cards at batch rates).

## Decision for Hugh

Nothing is changed. The evidence:

- **Haiku 5.5 is not safe as a drop-in.** It costs about 3.5% of Sonnet 4.5 but drops the `land` role on three lands in four, invents jobs on thin cards and returns invalid kinds. A mana-base or ramp count built on its labels would be wrong.
- **Sonnet 5.5 comes close on roles** (88% of cards identical on every role, 94% precision, land 100%) at about two thirds of the 4.5 cost, but it matches the stored label in full on only 51% of cards. The 4.5 self-repeat above answers the rest: 4.5 reproduces itself on 60% of cards in full, so 51% is nine points under that ceiling, and the role gap (88.0% against 94.6%) is the largest difference observed.
- **Either model needs two code changes first** (`acceptsTemperature` and `needsThinkingDisabled`, above), and `LABEL_PROMPT_VERSION`'s freshness rules mean relabeling under a new model is a deliberate `list:` build, not a silent restale.

Options: (a) stay on Sonnet 4.5 (the control above supports it); (b) ~~the 4.5 self-repeat control~~, now run (above) to decide whether Sonnet 5.5 is a safe switch for roughly a third off the label bill; (c) try Haiku 5.5 only on a narrow step where the land role does not matter, after a prompt trial on lands. My lean, now that (b) is done, is (a).
