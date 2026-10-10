# Overview accuracy and evidence, phase 1

Priority 4b (Hugh, 2026-10-09). **A plan only.** Nothing here has spent a dollar: every figure below is read from existing rows, the committed ledger and `scripts/eval/lib/pricing.mts`. Hugh's cap for this line is **$15 of paid eval spend**. Plans need his approval before any PR in section 7 starts. **Approved 2026-10-10, with the amendments of section 11** (his comparison corpus, a new first PR for combo and deck-stats facts, the archetype checklist). Where section 11 and an earlier section disagree, section 11 governs; the earlier text is left as reviewed.

Principle (Hugh): accurate most of the time, humble when not. "Humble" is implemented as **silence, not hedging**: a claim the harness cannot support is dropped, and a verdict the model marks `unknown` renders nothing.

## 1. What the evidence says is wrong

Two cases, both against Deckcheck. Source for the first: production Neon `misty-rain-01681654`, branch `br-noisy-violet-a6vw4ess`, deck `f7f11d07-5432-4fd6-b516-0b7e740df12e` ("The Mummy Imhotep", Imotekh the Stormlord), its stored contract-7 overview, read 2026-10-09. The Gishath case is from priorities.md "Unranked / OVERVIEW ACCURACY" (2026-10-07), which this item absorbs.

| # | Ours said | Deckcheck / the rules | Class of defect |
|---|---|---|---|
| 1 | "Mana base is entirely Swamps and black-only rocks, limiting color flexibility" (mono-black) | not a weakness | **Non-weakness**: a claim true of the data and meaningless for the deck |
| 2 | Three untiered weaknesses: graveyard hate in general, the non-weakness above, early ramp answered | Critical: exile effects (Rest in Peace, Dauthi Voidwalker, Bojuka Bog). Moderate: sorcery-speed removal against fast combo; commander dependence. Minor: artifact sweepers | **Vague, untiered, hate unnamed; interaction speed and commander dependence never assessed** |
| 3 | Key cards: Mystic Forge, Diabolic Intent, Phyrexian Scriptures, Living Death... no Biotransference | Engine-centric: Tortured Existence, Biotransference, Skorpekh Lord, Mirkwood Bats, Living Death, Their Name Is Death, Buried Alive, Illuminor Szeras, Canoptek Tomb Sentinel | **Generic value over engine**: key cards not chosen by how they drive the commander's own ability |
| 4 | Mulligan lines generic | Keep a self-mill or Tortured Existence / Ichor Wellspring | Not tied to engine pieces |
| 5 | Tip: "Black creatures entering from [[Shard of the Void Dragon]]'s forced sacrifices still trigger [[Ayara, First of Locthwain]]'s drain" | **False.** Shard makes opponents sacrifice; nothing enters under your control | **A false rules claim** that passed every existing check |
| 6 | Gishath: Marauding Raptor + Polyraptor read as value | A mandatory infinite loop that draws the game without an outlet | **Missed risk** (a forced loop, read as an upside) |
| 7 | Gishath "cascades" | Gishath has no cascade | **Keyword the commander lacks** |
| 8 | (absent) | No cheap instant interaction (combo vulnerability); combat-only win path (fogs, pillowfort, Farewell); tapping out for an 8-drop; Boros Charm / Akroma's Will / Knight of the Stampede / Pantlaza / Quartzwood Crasher as key cards | Missed assessments and missed engine cards |

Ours was right on Ichor Wellspring + Deadly Dispute and Canoptek Spyder (kept as regression anchors in the corpus).

**Why #5 and #7 got through.** `validate.ts` checks that a tip's cards are in the deck (`tip_not_in_deck`, with `TIP_MIN_CARDS = 2`), that marks resolve, budgets, counts, strength words, mulligan figures and a Key card's `claims` against the app's own categories (`jobSupported`). Nothing reads what a sentence asserts about two cards' rules text. That is the gap the harness work below closes, and the reason the answer is a verifier and not more prompt.

## 2. What exists today (read before changing)

| Piece | Where | Relevant fact |
|---|---|---|
| Prompt | `src/lib/synopsis/prompt.ts` (151 lines) | SYSTEM + `LENGTH_RULES` + `plusRules` + `MULLIGAN_BUDGET_RULES`; user message is commander, identity, mulligan figures, then every card with type line, categories, oracle text. Card labels are **not** in the prompt. |
| Reply shape | `src/lib/synopsis/response-schema.ts` (35) | `overview`, `primer{strategy,mulligan{keep,sendBack},tips[{cards,text}]}`, `keyCards[{card,claims,job}]`, `weaknesses[string]` |
| Counts and budgets | `limits.ts` | weaknesses 1 to 3 at 176 chars; key cards 5 to 8, job 60 chars; tips 2 to 4 at 176; `SYNOPSIS_MAX_TOKENS = 3000`; `SYNOPSIS_CONTRACT_VERSION = 7` |
| Validator | `validate.ts` (413) | Contract A: a list section drops failing lines and renders if its minimum survives; prose fails whole. Contract B: one automatic repair. |
| Facts | `facts.ts`, `generate.ts:factsFor` | `FactCard` has `oracleId`, name, type line, categories, `oracleText`. No `keywords`, though `cards.keywords` exists (`schema.ts:52`). |
| Model | `model.ts` | `claude-sonnet-5`, `effort: "low"` (the only setting measured to work) |
| Reuse rule | `generate.ts:~425`, `schema.ts` note | **Reuse is keyed on the list fingerprint alone (ruling B).** A contract bump never re-stales an overview, so a player with an unchanged list is never offered a new method. This is why item 4 needs new plumbing. |
| Eval | `scripts/eval/synopsis.mts`, `lib/*`, `variants/synopsis.mts`, `docs/superpowers/eval/` | Batch-first runner, deck split (4 dev, 15 held-out, seeded), per-answer scoring through the app's own validator, ledger with a hard cap |

## 3. Prompt and output contract changes (contract 8)

All four sit behind one switch, `OVERVIEW_V2_ENABLED` (server-side, default off, on in staging; Hugh flips production himself). The stored `contract_version` is `flag ? 8 : 7`, so outcomes of the two stay separable in the eval and in `deck_synopses`.

### 3.1 Weaknesses: a checklist, then tiers

The model first fills a fixed, closed **assessment**, then writes the weaknesses from it. Only verdicts that are `weakness` render; `not_a_weakness` and `unknown` render nothing. That reconciles "always assess interaction speed and commander dependence" with "no non-weaknesses".

```
assessment: [{ topic, verdict: "weakness" | "not_a_weakness" | "unknown",
               tier?: "critical" | "moderate" | "minor", hate?: [Name], evidence: [ref] }]
topics (closed): graveyard_or_zone_hate, artifact_enchantment_removal, interaction_speed,
                 commander_dependence, win_path, combo_vulnerability, mana_and_colors
```

- **Hate cards are named** for the zone/type the deck depends on (marks, catalog cards allowed as weaknesses already are: refusal reasons list "in Weaknesses: in the catalog").
- **Rendered weaknesses** are chosen in code, not by the model: `weakness` verdicts ordered critical, moderate, minor, top `SECTION_COUNTS.weaknesses.max`. The tier is a leading word in the existing line ("Critical:"), so **no new slot** (see section 8).
- **`mana_and_colors` guard (defect 1), deterministic.** For an identity of one color or colorless, a weakness matching color flexibility, fixing, splash or "entirely <basic land type>" is dropped. Pinned test uses the exact Imotekh sentence.
- Each `weakness` verdict carries the line's text (`line`, within the 176-character budget). It may yield up to 4 candidates; 3 render. **Minimum:** `SECTION_COUNTS.weaknesses.min` is 1, so a deck whose honest assessment has no weakness would render zero and fail the section. The prompt therefore requires the single least-bad item as `minor`; whether an empty state is better is a question for the light Design round (section 8), and until then the minimum stays 1. Raising the rendered max is a layout question (section 8), not defaulted here.

### 3.2 Key cards chosen by the commander's own ability

- The user message gains `Engine candidates:` up to 12 deck cards, computed deterministically and listed with the term they share with the commander: shared trigger/payoff words from the commander's oracle text (for Imotekh: graveyard, artifact creature, Necron), and, where a card has a label, the label's `trigger` / `kind` fields (`src/lib/labels/types.ts`, `Job`). Labels are an aid, not a dependency: the code path works with no label rows, and the eval reports with and without (variants `v8b`, `v8c`).
- Rule added to SYSTEM: pick key cards by what they do **with the commander's ability**, not by general strength; a key card whose job line names neither the commander's trigger nor its payoff is the exception, not the rule.
- Existing rules stay: not a universal staple, job under 60 characters, `claims` supported by the app's categories.
- **Whether this works is measured as engine-card recall (section 5.2), not assumed.**

### 3.3 Mulligans tied to engine pieces

SYSTEM rule: at least one keep line names an engine piece from `Engine candidates` (`[[Name]]` mark, existing mulligan rules unchanged: 80 characters, no land count, no commander in hand, figures only from the facts). A validator check is **advisory in the eval, not a refusal** (a refusal would cost a whole section for style); the eval counts it.

### 3.4 Evidence phase 1: every claim carries its cards

Each decklist line in the user message gains a deck-local short ref (`c12`), about 3 tokens against about 25 for a UUID. The reply carries `evidence: ["c12","c40"]` on: each strategy step, each mulligan line, each tip (replaces and absorbs `cards`), each key card (the card itself, plus the commander-ability partner), each assessment. The overview paragraph's evidence is its own `[[marks]]`, already resolved today.

- Stored in `deck_synopses.content` (jsonb) as resolved **oracle ids**. No migration: the shape gains optional fields, and an old row reads as having no evidence.
- `TIP_MIN_CARDS = 2` still applies to tips, on top of the at-least-one rule.
- **Validated deterministically:** every ref exists in the decklist (or is a commander), at least one per claim, at most `EVIDENCE_MAX` (4). A claim failing it is a dropped line under contract A, with refusal reason `evidence_not_in_deck`.
- **What "evidence" does and does not mean.** The refs are the cards the claim is *about*. They prove the claim is anchored to real cards in this list, and they give the reader a tap-through. They do **not** prove the claim is true; that is section 4.2's job. The UI must not imply otherwise.

### 3.5 Output budget

Added fields lengthen the reply. Measured today (staging, 14 contract-7 answers, section 6): 2,064 output tokens mean against `SYNOPSIS_MAX_TOKENS = 3000`, i.e. already 69% of the ceiling. I **assume** about +40% (about 2,900) for assessment and evidence refs; that is an assumption E1 replaces with a measurement. `SYNOPSIS_MAX_TOKENS` must rise (proposed 4,500) and `SYNOPSIS_DEADLINE_MS` (110 s) is re-checked at the new latency, since truncation was the failure that ruled out full-effort Sonnet.

## 4. Harness checks

### 4.1 Deterministic validators (model-free, run for every answer, tested)

All in a new `src/lib/synopsis/claims.ts`, called from `validateSynopsis`, each with a refusal reason and one test per failure path (run against the shipped contract-7 answers before believing a green, per the guard rule in AGENTS.md).

| Check | Rule | Scope of the claim |
|---|---|---|
| Cited card in decklist | every `evidence` ref and every tip `cards` entry resolves to a deck card | Already half-present (`tip_not_in_deck`); extended to every claim |
| Banned keyword | a closed list of keyword abilities (cascade, storm, flash, flying, trample, haste, ...). If a sentence attributes one to a marked card (`[[Card]] cascades`, `[[Card]] has haste`) and that card's `keywords` array and oracle text lack it, drop the line. `factsFor` adds `cards.keywords` to its existing select. | Defect 7 |
| Non-weakness | the `mana_and_colors` guard in 3.1 | Defect 1 |
| Weakness checklist | the closed topics are all present exactly once with a verdict | Always assessed |
| Edict is not an entry | a tip saying a card's creatures "enter/entering" whose only cited source for it is an edict ("each opponent sacrifices", no create, put onto the battlefield or return) is dropped | Defect 5, the **known shape only**; the open set is 4.2 |

The edict rule is deliberately narrow and its limit is stated here so nobody reads a green as general coverage. A regex over oracle text cannot decide "X enables Y" for the long tail.

### 4.2 The practical check for "X triggers/enables Y" tips: a verifier pass

A second, cheap model call **per answer**, not per tip, run only on relational claims (tips, and key-card jobs naming the commander's ability).

- **Model:** `claude-haiku-4-5` ($1 in, $5 out per million; `RATES` in `pricing.mts`). Fallback if calibration (E2) misses: `claude-sonnet-5` at low effort.
- **Input:** each claim's text plus the **oracle text of exactly the cards it cites** (refs from 3.4), nothing else. About 2,200 input tokens, 250 output.
- **Output per claim:** `holds: "yes" | "no" | "unclear"`, and for `no` a `quote` copied from one cited card's oracle text that contradicts the claim.
- **Drop rule (this is the humility rule):** a claim is dropped on `no` **only if the `quote` is a verbatim substring of a cited card's text** (deterministic check: it stops a fabricated quotation, but NOT a wrong judgement, since any real sentence from the card passes it), and on `unclear` (the humility rule: a tip the verifier is unsure of is dropped, including true ones). The cost of that is measured as tip survival. A dropped tip can take a list below its minimum; mitigations are asking for the maximum (4 tips) up front, and the existing repair call. Tip survival rate is a reported metric so this cost is visible, not hidden.
- **Runs inside the one write**, after `validateSynopsis`, before the row is stored; its usage is added to the run's `input_tokens`/`output_tokens` and priced. A verifier failure (upstream error) **drops every relational tip as unverified** and never fails the write: the player gets an overview with fewer tips rather than none.

What this cannot do: it checks a claim against the cited cards' text. A claim that is wrong because of a card **not cited** (a replacement effect in a third card) passes. Stated in the About copy only if Hugh wants it (section 8).

### 4.3 Mandatory loops (defect 6) and combat-only win paths (defect 8): **a follow-up, not this line**

Spellbook's mandatory/optional flags are **not stored** (memory: "Combo modal payload gap"), so "this loop is forced" cannot be read from our data. **Superseded by section 11.1 and 11.3:** assembled combos go into the prompt as facts in the new first PR, and mandatory-loop detection is a recorded follow-up. Until it exists the prompt never calls a loop "value": a combo the facts list is described by what it produces ("infinite mana", "infinite turns") and the primer names it as the win condition. Combat-only win paths are covered by the archetype checklist (11.2).

## 5. The comparison-corpus eval

### 5.1 Format

Hugh supplies Deckcheck pairs in bulk, so the format must make adding one cheap and keep the claims, not Deckcheck's page, in the repo (it is third-party text; store atomised claims, paraphrased, never the pasted report).

```
docs/superpowers/eval/corpus/<slug>.json
{
  "id": "imotekh-mummy",
  "deck": { "deckId": "f7f11d07-...", "source": "production", "listFingerprint": "..." },
  "gold": {                                    // atomised from Deckcheck, one line per claim
    "weaknesses":  [{ "topic": "graveyard_or_zone_hate", "tier": "critical", "hate": ["Rest in Peace","Dauthi Voidwalker","Bojuka Bog"] }, ...],
    "keyCards":    ["Tortured Existence","Biotransference","Skorpekh Lord", ...],
    "mulligan":    [{ "pieces": ["Tortured Existence","Ichor Wellspring"] }],
    "mustNotSay":  [{ "kind": "keyword", "card": "...", "text": "cascade" }],
    "knownFalse":  [{ "cards": ["Shard of the Void Dragon","Ayara, First of Locthwain"], "claim": "forced sacrifices trigger Ayara" }],
    "loops":       [{ "cards": ["Marauding Raptor","Polyraptor"], "forced": true }]
  },
  "ours": { "contract": 7, "synopsisId": "...", "claimsGraded": [ ... ] },   // per-claim grades, below
  "regressionAnchors": ["Ichor Wellspring","Deadly Dispute","Canoptek Spyder"]
}
```

Decks are read **by id from the database the pair was taken on** (production for Imotekh: read-only; the harness never writes there). A deck that later changes no longer matches the pair, so `listFingerprint` is pinned and a mismatch skips the case loudly rather than scoring a different list.

### 5.2 Scoring, per claim

Every claim in **our** answer is graded `correct`, `wrong` or `unsupported`; every gold item we lack is `missed`. Grading is by code where code can decide and by Hugh where it cannot:

| Metric | Computed by | Gold |
|---|---|---|
| Key-card **engine recall** | gold `keyCards` in our key cards, over gold size | corpus |
| Weakness recall by topic and tier | topic and tier match, plus hate cards named | corpus |
| False-claim rate | `knownFalse` or verifier-contradicted claim present | corpus + 4.2 |
| Non-weakness rate | 4.1 guard would have fired on the shipped answer | code |
| Banned keyword rate | 4.1 keyword rule | code |
| Mulligan tied to an engine piece | a keep line names a `pieces` card | corpus |
| Evidence integrity | share of claims whose refs resolve | code |
| Tip/line survival | tips after the verifier / tips written | code |
| Loop flagged | gold `loops` present in weaknesses | corpus |
| **Combo recall** | gold `winCombos` (the deck's primary deterministic combo, as card names) named in the primer's strategy or overview | corpus |
| Claim grades | every claim of ours graded `correct` / `wrong` / `missed` against the corpus (11.1) | corpus + Hugh on the residue |
| Cost per accepted answer | usage rows x `pricing.mts` | ledger |

`correct/wrong/missed` for items code cannot decide (is a key card "engine-centric", is a tip *useful*) is Hugh's call on a sample, and **the scorer never reports a number it computed from claims it did not grade**. Report is `docs/superpowers/eval/metrics-overview-accuracy.md`, generated like `metrics-synopsis.md`.

Seed cases, written in the corpus PR: **the nine decks of Hugh's comparison corpus** (section 11.1), atomised from `boards/deckcheck-corpus-2026-10-09.md`, which supersedes the earlier two-seed plan. The Gishath case is no longer partial.

### 5.3 Free first: a model-free baseline

`eval:rescore-lines` already re-validates stored answers with no model call (`metrics-overview-contracts.md`). PR 2 adds the corpus scorer and runs the new deterministic validators over the **423 stored rows** (7 runs across haiku, sonnet-low and sonnet and several prompt variants, so not all shipped contract-7 output) plus the two production/staging answers. That costs $0 and answers, before any spend: how often does each check fire on shipped contract-7 output, and does the Shard/Ayara tip appear in the stored set.

## 6. Measured cost

**Inputs, all read 2026-10-09, read-only.**

| Source | Rows | Mean $ | p90 / max | In tok | Out tok |
|---|---|---|---|---|---|
| Staging `deck_synopses` x `model_calls`, contract 7, `claude-sonnet-5`, survived | 14 answers, 10 decks | **$0.0515** | $0.0727 / $0.0752 | 15,446 | 2,064 |
| Production, same filter | 5 answers, 5 decks | $0.0589 | n/a | 17,211 | 2,443 |
| Eval `metrics-synopsis.md`, sonnet-low budgets-plus, held-out | 45 answers | $0.0330 | n/a | 9,102 | 1,481 |

**The eval's figure is 36% below the app's, with 9.1k against 15.4k input tokens. I could not explain that gap from the files read** (the shipped prompt, and the app's `factsFor`, may include more per-card text than the eval's decks). The plan therefore uses the **app's** figures, the higher ones, and PR 2 reconciles them in the first dry run (`--dry-run` calls nothing).

Rates (`pricing.mts`): `claude-sonnet-5` $2 in, $10 out; `claude-haiku-4-5` $1 in, $5 out; Batch API halves both.

**New-method per answer (assumptions marked):** input 17.2k (production mean) plus the engine list and refs, call it 17.2k; output 2,900 (the +40% assumption). Real-time: 17.2k x $2/M + 2.9k x $10/M = $0.0344 + $0.0290 = **$0.0634**. Batch: **$0.0317**. A repair call costs about as much as a first answer for the refused sections; the shipped repair multiplier measured in `metrics-overview-contracts.md` ($0.0510 per accepted against $0.0330 per answer) is **x1.55**, used here as 1.5. Verifier: 2.2k x $1/M + 0.25k x $5/M = $0.0035 real-time, $0.0018 batch. **All-in batch per answer: $0.0317 x 1.5 + $0.0018 = $0.049, rounded to $0.050.**

**Runs.**

| Run | What | Answers or calls | $ |
|---|---|---|---|
| E0 | Rescore 423 stored answers with the new validators; reconcile the token gap with `--dry-run` | 0 | **$0** |
| E1s | Priced smoke for the facts PR: 3 corpus decks (Wizards, Counter Intelligence, Gishath), real-time, one trial. No paid run precedes it | 3 | 3 x ($0.0634 x 1.5 + $0.0035) = $0.30 |
| E1 | Prompt development: 4 dev decks + 4 corpus decks (Gishath, Wizards, Eldrazi, Imotekh: the motivating cases, called the **tuned-on** group), 3 variants (`v8a` tiers/checklist, `v8b` + evidence, `v8c` + engine candidates and facts), 1 trial; then a second round of 2 variants | 24 + 16 = 40 | 40 x $0.052 = $2.08 |
| E2 | Verifier calibration: 80 stratified tips from stored answers, plus every `knownFalse` claim in the corpus (replaces Hugh labelling about 30 tips, 11.3), 4 per call on Haiku (20 calls), then the same on sonnet-low as a comparison cell | 40 calls | 20 x $0.0035 + 20 x $0.0069 = $0.21, carried as **$0.35** |
| E3 | Held-out: 15 held-out + all 9 corpus decks (the other 5 are **unseen**, reported separately from the tuned-on 4), 3 trials, the chosen variant | 72 | 72 x $0.052 = $3.74 |
| E3b | A second candidate on the same set, only if E1 does not separate them. **If run, E5 is cut to what remains under $15** | 72 | $3.74 |
| E3c | Contract-7 control: the corpus's own stored production answers are the control and are rescored free; a reserve for any corpus deck whose contract-7 row is not stored (about 6 answers) | 6 | $0.30 |
| E4 | End-to-end smoke through the real write path on staging, real-time, 6 decks | 6 | 6 x ($0.0634 x 1.5 + $0.0035) = $0.59, carried as $0.60 |
| E5 | Hugh's further pairs beyond the nine, budgeted for 20 decks x 3 trials; **marginal $0.16 per deck** | 60 | 60 x $0.052 = $3.12 |
| | **Subtotal without E3b** | | **$10.49** |
| | Contingency 25% (output length, batch re-sends, a third E1 round) | | $2.62 |
| | **Planned ceiling** | | **$13.11** |

Per-answer batch cost is now $0.052: the facts of section 11.1 add about 1k input tokens (combos, ramp count, interaction counts), an **assumption** E1s replaces with a measurement: 18.2k x $2/M x 0.5 + 2.9k x $10/M x 0.5 = $0.0327, x 1.5 + $0.0018 = $0.051.

**Fits under $15 with $1.89 to spare** (with E3b run and E5 zeroed the ceiling is $13.9). If output is 3,300 tokens instead of 2,900 the subtotal rises about $0.50 and the ceiling stays under $15; if E1 is forced to real-time (Batch latency), E1 becomes 30 x ($0.0634 x 1.5 + $0.0035) = $2.96, the subtotal $12.24 and the 25% ceiling about **$15.3, over the cap**. The first fallback is therefore to drop E3b (-$3.74). **E5 is the elastic line: Hugh's corpus size sets it, not the plan.** If he supplies more than 20 pairs, the extra costs $0.15 each from the contingency or he raises the cap.

**The existing ledger cannot hold this campaign, and that was not obvious.** `scripts/eval/lib/ledger.mts` has `HARD_CAP_USD = 25` and `ASK_AT_USD = 15`, and the committed `docs/superpowers/eval/ledger.jsonl` sums to **$23.72** by the guard's own `spent()` rule (settled spend plus unsettled worst cases), leaving $1.28. PR 2 therefore makes the ledger path and both limits arguments: this campaign gets its own file `docs/superpowers/eval/ledger-overview-accuracy.jsonl` with `HARD_CAP_USD = 15` and `ASK_AT_USD = 11`, and a run against the old ledger still refuses as before. The guard's per-batch worst case (`worstCaseUsd`) at the proposed 4,500-token ceiling is 2 x 0.5 x (17.2k x 1.25 x $2 + 4,500 x $10)/1e6 = $0.088 per request in batch, so a 51-answer batch is checked at about $4.49 before it is sent.

**Not in the $15, and system spend:** the free re-runs of section 7.4. Production holds **5 decks with an overview** of 31; staging 10. A press goes through the same write as E4 (repair multiplier and verifier included), $0.0634 x 1.5 + $0.0035 = **$0.099**, so **$0.49 on production, $0.99 on staging** if every owner pressed once. The bound for any deployment is eligible decks x about $0.14 (the staging p90 of $0.0727 x 1.23 uplift x 1.5 + $0.0035).

## 7. PR boundaries, order and the free re-run

No stacked PRs; each is cut from fresh `main`, reviewed once, merged. Line counts are estimates from the files read, each under about 800.

| PR | Contents | Est. lines | Spends | Notes |
|---|---|---|---|---|
| **1** Combo and deck-stats facts (11.1) | pure fact builders (`facts-combos.ts`, `facts-stats.ts`), loaded beside `factsFor`; prompt text that states them and requires the primer to name the primary win condition; `OVERVIEW_V2_ENABLED` introduced here | ~600 | **E1s** | Dark with the switch off |
| **2** Corpus, scorer, campaign ledger | corpus format + schema + the nine seed cases; scorer and metrics doc (incl. combo recall); ledger path/limits as arguments (+ test that the old ledger still refuses); E0 | ~750 | $0 | The only PR that edits `scripts/eval/lib/ledger.mts` |
| **3a** Contract 8: shape and validators | response schema (`assessment`, `evidence`), `claims.ts` deterministic checks, `factsFor` adds `keywords`, new refusal reasons, `SYNOPSIS_CONTRACT_VERSION` follows the flag; one test per failure path, run against stored answers | ~750 | $0 | Dark with the switch off |
| **3b** Contract 8: prompt and generation | `prompt.ts` (checklist with the archetype list of 11.2, tiers, engine candidates, mulligan rule, refs on decklist lines), `SYNOPSIS_MAX_TOKENS`, eval variants `v8a-c` | ~600 | **E1** | Staging only |
| **4** Verifier pass | verifier prompt + call + verbatim-quote rule, usage added to the run, upstream-failure behaviour | ~550 | **E2** | Haiku default |
| *(gate)* | E3/E3b/E3c/E4 on staging; the corpus scoring and Hugh's sample; headline report | docs | **E3, E3b, E3c, E4** | Decision: ship, tune, or stop |
| **5** Method notice and free re-run | section 7.4 | ~650 | $0 | Needs the gate to pass first |
| **6** Evidence tap-through | claim chips and a card sheet | ~700 | $0 | **After the light Design round: not built by the autonomous run; a Design need goes to the orchestrator** |
| *(close)* | `feature-acceptance`, About entry and one `ABOUT_VERSION` bump (11.3), switch to Hugh | docs | E5 as Hugh supplies pairs | |

### 7.4 The "method changed, re-analyze your deck" notice and the free re-run

**Can the Notices system (`NOTICES_ENABLED`) carry it without a Design round? Not the sheet; yes the existing stale state, and I recommend that.**

- The Notices sheet and tag are built on `deck_data_changes` entries scoped to a deck's stored reading (`touches.ts`, `read.ts`), grouped by `GROUP_ORDER` (`group.ts`). The only global kind is `rules`, written at deploy from `BRACKET_RULES_VERSION` and worded as a bracket-rule change. Reusing it would tell every deck its **bracket verdict** moved, and mark the overview stale by `movedWithin`, which is false twice. A sibling kind plus a new group and tag semantics is a Design-drawn surface. **Rejected for this line.**
- The Overview already has a Design-drawn stale state (`stale` in `src/lib/copy/synopsis.ts`: "Your deck has changes since this was written, so parts of it might not match your list.") with a *Write a new overview* action, driven by `read.ts` (`stale`, `dataMoved`, `wouldSpend`). A new reason, **`methodOutdated`** (stored `contract_version` below the version that carries this change, while `OVERVIEW_V2_ENABLED` is on), reuses that layout with **one new copy line**. Copy goes through `/copy-review`; copy never justifies a Design round.

**Eligibility, with no migration.** A deck is eligible when its shown synopsis for the current list has `contract_version < 8`, and no `deck_synopses` row for that deck at `contract_version = 8` joins to a `model_calls` row with `origin = 'system'` that survived. That is one free run per deck per method version by construction: the free run itself writes a version-8 row. A **failed** free run leaves the deck eligible, which would let a flaky upstream loop, so attempts are capped at 2 per deck per version, counted from the same join.

**Ledger.** `reserveModelCall` (`allowance.ts`, the `insert` at about line 191) hardcodes `origin: "player"` and checks the player allowance and the spend cap first. It gains an `origin` argument. A `system` call skips the allowance check, is written `origin = 'system'` (the check constraint `model_calls_origin_check` already allows it), and settles `spent` or `refunded` like any other. **Consequence to state plainly:** `monthSpend` and the allowance read `origin = 'player'` only (`allowance.ts:86, 94, 267`), so this spend is invisible to the app-wide monthly cap. The bound is therefore the eligibility rule plus the 2-attempt limit, both in section 6, and PR 5 adds a test that a system call never reaches the player allowance and a second one for the same deck and version is refused.

**The read side.** `read.ts` (`wouldSpend`, lines ~122-124) hides the press when the allowance is paused, the owner share is hit or credits are used up. An eligible free run must bypass those in `read.ts` as well as in `reserveModelCall`, or an out-of-credits player is told the free run is unavailable.

**Who pays and when.** Only on the owner's press (*Write a new overview*, relabelled while eligible, with the credit note saying it is free). Not automatic and not a batch: a dormant deck costs nothing.

**What the press does.** The `reused` early return is bypassed for an eligible deck exactly as `replacing` bypasses it for D11 data movement. It exists at two sites, the pre-check (`generate.ts:~429`) and the re-decision under the reservation lock (`~337`), and both must learn the rule or the lock-side one hands the old overview back. The new overview replaces the old one as the shown row; the old row stays in `deck_synopses` for the eval.

**Open: "re-analyze your deck".** Hugh's wording. This plan reads it as *rewrite the Overview* (the stored profile and the bracket reading are unchanged). If he means the full Analysis, that is a different and larger action and this section changes.

## 8. Design, copy and About

**Needs Design: one light round, the claim tap-through (PR 6).** The brief, written by a subagent after approval, asks for: (1) how an item's supporting cards show (inline chips against a count that opens a sheet), on the desktop Overview tab and the phone modal, both in the same PR; (2) the card sheet, which should reuse the existing card-open trigger that `[[marks]]` already render, so it is a new entry point to an existing component and not a new component; (3) what a verified item looks like against an unverified one (the plan's answer is that unverified items are dropped, so there is **no** per-item verified badge, and the brief should confirm that); (4) the weakness line's tier lead word, and whether the rendered max rises from 3 to 4. Everything else below needs no Design.

**Eng-decidable without Design:** the tier as a leading word in the existing weakness slot; the assessment, evidence and verifier plumbing; the `methodOutdated` state reusing the stale layout.

**Copy (`/copy-review`, not Design):** the method-changed line, the free-run credit note, the tier words. US English, no em dashes.

**About entry.** The Overview has no entry of its own; it appears in the credits entry (`copy/about.ts`: "Writing a deck's Overview" uses a credit). Two determinations, and the ruling is Hugh's:

- **Free re-run:** an **ordinary edit** to that credits line, no version bump (the capability is not new).
- **Claim tap-through:** a reader can now see the cards behind a claim, which is something the app can do that it could not. My recommendation is that this **owes an entry**, batched at the close of the evidence line (phases 1 and 4c's benchmarks share one reader-facing idea), with one `ABOUT_VERSION` bump then, per the "multi-round line batches at the end" rule. Accuracy changes alone owe nothing (they restyle nothing and teach nothing to do).

## 9. Risks and what this plan did not verify

- **The +40% output assumption** and the 9.1k-versus-15.4k input gap (section 6) are the two numbers that move cost. Both are replaced by E0/E1 measurements; the campaign ledger is the backstop.
- **Tip survival.** A strict verifier will drop true tips. If survival falls under the section minimum often, the fix is the repair call and 4 tips up front, and failing that, relaxing `unclear` to keep-with-hedge, which is a decision to bring to Hugh with the number.
- **Mandatory-loop detection** may not be recoverable from stored combo data (4.3); the fallback is a hedge, not a claim.
- **The Gishath gold set is partial** until Hugh supplies the Deckcheck export.
- **The verifier is a model grading a model.** The verbatim-quote rule stops fabricated quotations only. A verifier can wrongly drop a true tip (by `no` with a misread real quote, or by `unclear`) and can wrongly pass a false one; E2 measures both rates on tips Hugh labelled, and tip survival is reported.
- Nothing in this plan changes tuning, Suggested changes, or the bracket reading.

- **Verifier scope.** It covers tips and key-card jobs only. A false two-card rules claim in a strategy step, mulligan line, weakness or the overview paragraph gets no verifier. E1 counts how often such claims appear before deciding whether to extend it (cost scales with claims).

## 10. Asks of Hugh

1. Approve the plan and the $15 cap, including a separate campaign ledger (the old one has $1.28 of headroom).
2. ~~Supply the Deckcheck pairs and label about 30 tips~~ Done 2026-10-09 as the comparison corpus; it replaces the labelling (11.3).
3. ~~Confirm "re-analyze"~~ Decided (11.3): it rewrites the Overview only.
4. ~~About entry for the tap-through~~ Decided (11.3): it gets an entry, batched at the line's close.
5. Whether the weakness slot may grow from 3 to 4 (Design round, section 8).

## 11. Amendments of 2026-10-10 (Hugh's comparison corpus)

Source: `boards/deckcheck-corpus-2026-10-09.md`, nine decks (eight of Hugh's, the friend's Imotekh) with Deckcheck against ours, findings tagged MISS / WRONG / WEAK / OURS+. It ranks six patterns; the plan's contract-8 work already answered patterns 2 to 5, and this section adds the top one and the missing checklist.

### 11.1 The top lever: combos and deck stats as facts (new first PR)

**Combo blindness is 4 of the 9 decks**: a deterministic combo missed in Wizards (Ghostly Flicker + Naru Meha), Counter Intelligence (Magistrate's Scepter / Inspirit; Basalt Monolith + Zirda), Eldrazi (Basalt Monolith + Forsaken Monument), and a mandatory loop read as value in Gishath. The data is free: `loadAssembledCombos` (`src/lib/profile/load.ts`) already returns the two-card combos a deck assembles from `spellbook_variants` / `spellbook_variant_cards`, with `produces`, `mana_needed`, `steps`, and `src/lib/combos/near-miss.ts` holds the one-piece-short pairs.

PR 1 adds to the user message, as **facts**, each stated by name and by what it produces:

- **Detected combos**: assembled combos of counted kinds only (`isCountedCombo`; card count is never the test), each with its pieces and `produces`, capped to the 6 most decisive (game-ending or infinite first).
- **Near-assembled**: pairs with one piece missing from the deck, same cap of 3, labelled as missing a piece so the model does not claim them as a win condition.
- **Deck stats**: ramp count and mana-rock/land supply from `jobTally` and `manaSupply`; **expected commander cast turn**, a deterministic function of the commander's mana value and the ramp count (the corpus's Zhulodok "turn 6" against T4 is the case), which the model is told to quote and not to guess; interaction counts by speed (instant versus sorcery) and by cost (one or two mana versus more) from the same oracle text the categories read.
- **Prompt rule**: when a detected combo exists, the primer names it as the primary win condition. When none exists the rule does not fire (no invention). A forced-versus-optional loop is not asserted (11.3).

Tested pure: fixtures built from the corpus's combos; a test that an empty combo set emits no combo lines; the cast-turn function pinned on the Zhulodok figures. Measured by combo recall (section 5.2) on the corpus.

### 11.2 Archetype weakness checklist

Added to the SYSTEM rule that fills the `assessment` of 3.1 (PR 3b). The model names the **hate card** for each that applies:

- graveyard decks: graveyard hate (Rest in Peace, Bojuka Bog, Dauthi Voidwalker)
- artifact decks: artifact wipes and Null Rod / Collector Ouphe
- ninjutsu and activated-ability engines: Cursed Totem and its kin
- indestructible decks: exile wipes (Farewell, Sunfall)
- combat decks: fogs and pillowfort (Propaganda, Ghostly Prison)
- combo decks: removal at the key window (the commander on its combat or ETB trigger)
- every deck: a count of cheap instant-speed interaction, taken from the facts of 11.1 and not estimated

### 11.3 Decisions recorded (orchestrator, 2026-10-10)

1. **"Re-analyze" rewrites the Overview only** (7.4 stands as written).
2. **The claim tap-through gets an About entry**, batched at the close of the line with one `ABOUT_VERSION` bump (8 stands).
3. **The corpus replaces Hugh's labelling of about 30 tips** for verifier calibration (E2).
4. **Mandatory-loop detection is a follow-up.** Spellbook's step text is partly selected today (`steps`), but forced/optional flags are not stored; the prompt never calls a loop value, and describes it by what it produces.
5. **The corpus is the gold set** (5.1 to 5.2): every claim of ours graded correct, wrong or missed, plus combo recall. Store atomised, paraphrased claims in the repo, never Deckcheck's text. The Aang colour-count dispute and the Chain Reaction anti-synergy item are corpus cases whose gold is checked against the decklist and oracle text before scoring, not taken from Deckcheck.
