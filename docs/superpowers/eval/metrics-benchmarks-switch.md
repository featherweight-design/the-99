# How it plays: the Overview with `DECK_BENCHMARKS_ENABLED` on and off

The pre-release check for the benchmarks switch (handoff `handoff-evidence-benchmarks-2026-10-11.md`,
step 1). One paid sample per staging corpus deck per arm, prompt v8 on production's settings
(`claude-sonnet-5-5`, medium effort, 16,000 tokens, 110 s deadline, streamed), through the app's own
`callModel`, prompt, schema and one repair. The only difference between the arms is the switch. Run
from a worktree whose `.env` does not set it (`env.mjs` loads `.env` over the shell).

```
DECK_BENCHMARKS_ENABLED=true pnpm eval:corpus run --prompt v8 --plan-done 0.5 --cap 1.5 --out answers/benchmarks-on-s55-medium.jsonl
                           pnpm eval:corpus run --prompt v8 --plan-done 0.5 --cap 1.5 --out answers/benchmarks-off-s55-medium.jsonl
```

The default `--cap 0.6` stops the first call, because the reservation is a worst case. `imotekh` is
on production, which this harness never reads, so both arms hold 8 answers (the other eight corpus decks).

## Verdict

**Safe to switch on, as far as the Overview goes.** Every one of the 16 answers rendered all four
sections on the first write; no repair was called in either arm. The switch changes what the
interaction line says, and nothing else in the checks moves beyond what a second sample of the same
prompt moves.

## Spend

| arm | answers | spend |
|---|---|---|
| on | 8 | $0.4026 |
| off | 8 | $0.3834 |
| both | 16 | $0.7860 |

Ledger `ledger-overview-accuracy.jsonl`: campaign $10.20 before and $10.99 after these two runs (the
$11 stop was not crossed by this check); $11.04 once another lane's $0.05 on main is counted, under the $15 cap. The brief estimated $0.51 for the ON arm alone, which came in at $0.40; the OFF arm is
what the brief did not price.

## Answers whose checks change

Scores are `pnpm eval:corpus score` on the rendered answers. These are two single samples, so a
change in a recall figure is as likely to be sampling as the switch. Read the interaction line
(next section) for the switch's own effect.

| deck | check | off | on |
|---|---|---|---|
| aang | claims wrong | 0 | 1 (`five-color`) |
| aang | key cards / weaknesses | 3/10, 2/3 | 4/10, 1/3 |
| counter-intelligence | combo recall / key cards | 1/2, 3/7 | 0/2, 0/7 |
| eldrazi | weaknesses | 1/3 | 2/3 |
| gishath | key cards | 2/7 | 1/7 |
| goblins | claims correct / weaknesses | 0 / 0/3 | 1 / 1/3 |
| gods | key cards / weaknesses | 2/7, 0/3 | 3/7, 1/3 |
| wizards | key cards / mulligan tied | 5/12, no | 6/12, yes |
| yuriko | none | | |
| all | combo / key cards / weaknesses | 4/6, 21/65, 9/25 | 3/6, 20/65, 11/25 |

The one new wrong claim is aang's `five-color`: the Overview calls it "a five-color Ally and Lesson
pile" and "hands missing most of the five colors", where the corpus rules the lands make no black.
The sentence is not about interaction; the OFF answer happens not to use the wording. One sample each
way cannot say whether the switch has anything to do with it. Unchanged in both arms: primary plan
(7/8 decks), strategy leads (4/8). The mulligan-tied rate moves 1/6 to 2/6 (wizards).

## Interaction lines, before and after

With the switch on, the Overview's interaction facts quote the shared reading (PR 1b, contracts 9 and
10). Five decks differ in what they say about interaction speed; two quote a figure in both arms, and the figures differ where the classifier and
the shared reading count differently:

| deck | off (classifier) | on (shared reading) |
|---|---|---|
| eldrazi | "Only 3 of 14 interaction pieces are instant speed and 2 cost two or less" | "Only 5 of 21 interaction pieces are instant speed" |
| gishath | "No interaction is at instant speed, so [[Wakening Sun's Avatar]] and other sorcery answers cannot stop a fast combo" | "Only 1 of 18 interaction pieces is at instant speed" |
| aang | "Only 2 interaction cards, 1 at instant speed" | no interaction-count line; a removal weakness instead |
| counter-intelligence | "Only 6 interaction cards, with no mass removal" | no interaction-count line |

Reading it:

- The shared reading counts more pieces (21 against 14 on eldrazi, 18 against a classifier
  "none at instant speed" on gishath). On gishath the OFF line says no
  interaction is at instant speed and the ON line counts one; the two readings disagree, which is the
  difference #1401 introduced.
- The ON answers use the same sentence shape ("Only N of M interaction pieces are instant speed"),
  and none was refused by contract 9 or 10: all 16 first writes were accepted.
- On aang and counter-intelligence the model dropped the count line altogether in the ON sample. That
  is one sample, and the Weaknesses section still names removal risks; if it recurs on a second
  sample, it is a prompt question for the Overview line, not a blocker for the switch.
- gods: no sentence in either arm, but the structured assessment of `interaction_speed` moves from
  `unknown` (off) to `weakness`, minor (on).
- goblins, wizards and yuriko quote no interaction figure in either arm.

## Not covered

- Stored Overviews keep the classifier's figure until their list changes (ruling B), so an old
  Overview can disagree with the block's grade after the switch. Unchanged by this check.
- `imotekh`, the one production deck, was not sampled.
- One sample per deck per arm; no variance estimate. Anything under about two decks moving is noise.
