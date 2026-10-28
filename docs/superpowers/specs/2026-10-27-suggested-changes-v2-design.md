# Suggested changes v2: the design

**Status:** design, awaiting Hugh's approval. Do not build from it until he approves.
**Branch:** `spec-suggested-changes-v2`
**Sources:**
- Hugh's rulings in the rethink board (`boards/suggested-changes-rethink-2026-10-27.md`, outside the repository).
- The count-mechanism eval (#2291, `docs/superpowers/eval/count-mechanism/summary.md`).
- The lopsided-run triage and fix (#2289).
- The product principle "give the player a choice" (Hugh, 2026-10-27).

**Who decided what.** Every decision below is marked. **(Hugh)** is his ruling, quoted or paraphrased from the rethink board or the triage thread. **(a2)** is this author's call, made to fill a gap the rulings leave; each is open to Hugh's veto. Questions only Hugh can answer are collected in §12, most important first.

---

## 1. Intent, and why

Suggested changes asks a model to improve a finished deck: cards to add, cards to cut. On 2026-10-27 Hugh ran it on HD - Goblins, asked for five changes, and got five cuts and no additions:

> "We cannot have lopsided recommendations like this. What is a user supposed to do when we offer to put their deck below 99, but don't recommend any way to bring it back up?"

The triage (reported 2026-10-27) found the cause in the pipeline, not the model. The model returned five additions. Validation dropped all five, because a strategy-focus citation was filed as `intent` on a deck with no intent, and one bad citation cost the whole line. Across production, 6 of 11 focus runs had more cuts than additions. #2289 fixed that cause.

The rethink goes further than the bug. v10 treats the model's answer as something to filter down: up to 6 asked per list, 5 kept, and anything that fails a rule silently vanishes. Hugh's direction inverts that:

- **The player's request is the contract.** They ask for N cards in. They get N, or they are told plainly why not.
- **Never hold results back.** **(Hugh)**
- **Give the player a choice.** Every recommendation surface offers a pool larger than the need, and the player picks. **(Hugh)**
- **Ask, don't limit.** Ask the player refinement questions rather than limit the output. More context gives better results; with none, do our best. **(Hugh)**

The eval (#2291) showed the new shape works on Hugh's own decks. The chosen mechanism (two calls, arm C) filled the count in all 24 of its runs in a prototype that trimmed additions to N before asking for cuts (§9); across all 141 runs of every arm and flow, 20 missed. On Mutant Menace's original list with his request, 15 of 20 suggested cuts were cards he had cut himself.

## 2. Goals, non-goals, anti-goals

**Goals**
1. **The count is fulfilled.** A run for N returns at least N valid additions and N valid cuts, or says plainly how many it could find and why. **(Hugh)**
2. **The player's words lead.** Their request is the strongest signal. The app's own reads (the overview, the focus, games, role gaps) support it and never replace it. **(Hugh)**
3. **The player chooses.** The run returns about 1.5N valid suggestions per list as one list each, and the player picks any N from each. **(Hugh)**
4. **The deck stays its size.** Cuts are chosen after additions, to make room for them, and the player picks as many cuts as additions. **(Hugh)**
5. **Each suggestion is grounded.** It cites what it rests on, and the app checks the citation. That is unchanged from v10.

**Non-goals**
- **Pairing.** An addition is not tied to a cut. **(Hugh)**
- **Ranking.** The pool comes back in the model's order. No second ranking pass. **(a2)**
- **Owned-first ordering.** Ownership still never affects which cards are suggested or their order (`ownershipNotRanking`, kept).
- **Building toward 99 or past it.** That belongs to the other tools (§3).

**Anti-goals: things v2 must never do**
- Silently drop a requested card count, or show fewer than the player asked for without saying so. **(Hugh)**
- Pre-fill the player's request box. **(Hugh)**
- Put a "Suggest again" form at the bottom of results. A new run starts from a fresh intake. **(Hugh)**
- Let one ungroundable citation discard a suggestion whose other citations hold. This is shipped in #2289 and kept.
- Let the app's reads override what the player asked for. **(Hugh)**

## 3. Tool boundaries (Hugh)

| Deck size | Tool | Job |
|---|---|---|
| under 99 | Top-off | Brings a short deck to 99. |
| exactly 99 | Suggested changes | 99 to 99: N in, N out. |
| over 99 | Proposed cuts | Brings a deck down to 99. It offers a pool larger than the surplus, and the player picks: "a deck 3 over shows 6 possible cuts, and the player picks 3." |

Analysis unlocks at 99. Suggested changes is offered only when the deck is exactly 99 (plus commanders). A deck over or under is pointed at the right tool. **(Hugh)** How that pointer reads is Design's (§11).

- **"At size" (a2):** the deck's total, commanders included, equals `DECK_SIZE` (100): `profile.counts.total`, the same arithmetic Proposed cuts uses for "over". A partner or Background deck is 98 + 2. A companion counts only if the deck's total already counts it today; this spec adds no counting rule.
- **The gate is on Suggested changes only (a2).** It does not gate the rest of the Analysis tab. "Analysis unlocks at 99" describes the rethink's flow; gating the whole tab is out of scope here.

## 4. Intake: three steps, then send (Hugh)

1. **How many cards.** N, the cards in. Cuts equal N.
   - **(a2)** N runs from 1 to 20. The eval measured 3, 10 and 20. A ceiling above 20 is untested, and at 1.5N it means asking for 30+ cards per list. 20 is measured; a higher ceiling is §12 Q6.
2. **What are you looking to change?** The player's own words, never pre-filled. **(Hugh)**
   - Beside the box: suggestions drawn from what the app knows (two short on removal, the focus, a recent game note, a role gap). Tapping one adds its words to the box; it's a suggestion, not an assumption. **(Hugh)**
   - The text is player input reaching a prompt, so it goes through `playerText`, with the system rule naming its tags. That is AGENTS.md's rule. Its cap is §12 Q8.
   - Empty is allowed. With no request, the run works from the deck's own weaknesses. **(Hugh: "with none, do our best")**
3. **Any restrictions?** A price cap, sets, owned cards only. These are the existing three limits. **(Hugh)**
   - **(a2)** One change in meaning: today `runTuning` clears `ownedOnly` when no owned card fits (`ownedNone`, `tuning-actions.ts`), so an owned-only run can come back with cards to buy. v2 removes that fallback. An owned-only run that can't fill the count returns short (or empty, refunded) and says owned-only bound it (§5.5).

**Signal trust, strongest first** **(Hugh)**:
1. The intake request (the player's stated intent for this run).
2. The overview.
3. The focus.
4. The deck description (`intent`, weak).

The prompt states this order. The app's reads feed in "when they help answer the request, never in place of it".

## 5. Processing

### 5.1 Two calls: additions first, then cuts (Hugh, on the eval)

| Call | Sees | Asks for | Keeps |
|---|---|---|---|
| 1. Additions | The deck pack, the request, the restrictions | ceil(1.5N) additions, no cuts | Every addition that passes validation |
| 2. Cuts | The same, plus "Coming in": the additions call 1 kept | ceil(1.5N) cuts that make room for them: the cards that make the least sense once those are in | Every cut that passes validation |

**Arm C** **(Hugh, choosing the eval's recommendation)**: ask 1.5N. If fewer than N survive validation, make ONE refill call for that list. The refill is told what was kept, and what was rejected and why (in the rule's own words), and asks for exactly the shortfall. Measured results:

- The count was filled in 24/24 runs (prototype; it trimmed additions to N before the cut call, where v2 sends the whole pool, §9).
- Measured cost: $0.104 at N=20, $0.074 at N=10, $0.042 at N=3.
- p50 latency: 56s at 20, 40s at 10, 14s at 3.

One-call was cheaper (within arm C: 36% at N=3, 22% at 10, 3% at 20) but missed the count 13 times in 69 runs.

The cut call sees the additions call 1 KEPT. Those are the cards the player can pick from; they are not yet chosen. **(a2)** This means the cuts make room for the pool, not for the player's final picks. §12 Q3 asks whether the cut list should be re-asked after the player picks additions.

### 5.1a When the additions fall short (a2)

If call 1 and its refill keep K additions, fewer than N:

- Call 2 asks for ceil(1.5·K) cuts, not 1.5N. The player can apply at most K pairs (§7), so the cuts make room for what can actually come in.
- If K is 0, call 2 is skipped. The run ends `ungrounded` and is refunded.
- Both lists state the count they reached (§5.5).

### 5.2 Every valid suggestion is kept

v10 kept the first 5 per list (`MAX_SUGGESTIONS`) and asked for 6 (`ASK_PER_LIST`). v2 keeps every addition and every cut that passes, up to the ask. **(Hugh: "show ALL good suggestions (~1.5N per list)")**

- **A loose schema cap.** The reply schema's per-list `max` stays loose, at twice the ask **(a2)**. The app then keeps what passes. In the eval, 6 of 20 misses were malformed replies, most from a reply running over a strict cap; the whole reply was rejected for one card too many.
- **Over the ask:** a reply that runs over keeps its first ask-many valid lines. **(a2)**
- **Duplicates across calls** (a refill naming a card already kept) are dropped. **(a2)**

### 5.3 Citations

- **`focus` is a citable kind.** It is checked against the deck's real focus name and carries no figure. Shipped in #2289, kept.
- **An ungroundable citation costs only itself** (#2289, kept):
  - `intent` on a deck with no intent;
  - `focus` on a deck with no focus, or on a cut.
  A line left with no citation still drops.
- **`notes` becomes `request`.** **(a2)** In v2 the intake text is the run's request. The `notes` citation kind is renamed `request`, is checked the same way (a whole-line quote or a bare part), and appears on the chip as the request. The rename costs one schema and one prompt line (PROMPT_VERSION 11, §10).

### 5.4 The bracket move (Hugh)

A request can name a bracket, either typed ("bring it down to 3") or tapped from a suggestion beside the box. The run then treats the bracket as a goal:

- **Moving up:** additions favor what moves the deck there.
- **Moving down:** cuts favor what holds it higher.

This mirrors Help me choose's bracket target (`bracketReach`). The app already computes each suggestion's `bracketAfter` and shows the move. That stays, and `noBracketClaim` stays: the model never names a bracket, the app does.

**(a2)** v2's first release reads a bracket target only from a structured choice beside the box, never by parsing the free text. Parsing the player's words for an instruction is fragile, and their text is data, never an instruction (`playerText`). Whether to offer the choice at all in release 1 is §12 Q7.

### 5.5 When the count can't be filled

After the refill, a list can still hold fewer than N. Examples: a strict price cap, owned-only on a small collection, a narrow set filter. The run then:

- shows every valid suggestion it found;
- states the count it reached ("Found 14 additions under your $2 cap");
- names the restriction that limited it, from the drops it recorded. **(a2)** `chooseRefusal` picks a sentence for an empty run today, but `RefusalDetail` (`validate.ts`) only tells `commander`, `locked`, `overCap` and `nothingLeft` apart: a run bound by `offSet` or `notOwned` falls to `nothingLeft`. v2 adds `offSet` and `notOwned` details so the sentence can name them.

It never pads with invalid cards and never silently shows fewer than asked. **(Hugh: "fulfilled or explicitly negotiated")** Whether a short run refunds its credit is §9.

## 6. Validation rules: keep, relax or drop

The verdicts are **(a2)** unless marked. "Drop count" comes from the eval's 141 runs.

### 6.1 Hard filters

These check whether the card can be suggested at all.

| Rule | What it stops | Verdict |
|---|---|---|
| `cardExists` | A name the catalog doesn't hold | **Keep.** It's in the refill's reasons. |
| `duplicate` | The same card twice in one list | **Keep.** Also applied across a refill. |
| `cutInDeck` | Cutting a card not in the deck | **Keep.** |
| `commander` | Cutting the commander | **Keep.** |
| `neverCut` | Cutting a card the player locked | **Keep.** The player's rule, and not a model error. |
| `keyCard` | Cutting a strategy key card | **Keep, as a stated exception to the signal order (a2).** Key cards come from the app's overview, so this filter can overrule a request that asks to cut one. The request is free text, never parsed for instructions (§5.4), so v2 cannot tell a request to cut that card apart from one that merely mentions it. The player can still cut it by hand. |
| `universalStaple` | Cutting Sol Ring and its kin only to fix a role count | **Keep.** The request counts as player evidence, so a staple can go when the player asked. |
| `colourIdentity` | An addition off the commander's colors | **Keep.** This was the top addition drop in the eval. The refill names the rule. |
| `addNotLegal` | An illegal card, or one already in the deck | **Keep.** |
| `overCap` / `offSet` / `notOwned` | The player's three restrictions | **Keep.** These are the player's own limits. A short list says which one bound it (§5.5). |

### 6.2 Citation and presentation rules

These check whether the reason is grounded and fit to show.

| Rule | Today | Verdict |
|---|---|---|
| `citation` | One unsupported citation drops the line | **Relaxed in #2289**, kept that way: an ungroundable citation costs itself. Every other unsupported citation still drops its line. |
| `noPercentage` | A percentage anywhere | **Keep.** |
| `noNet` | A signed integer or "net" | **Keep.** |
| `denominator` | A count without its "of M" | **Keep.** It dropped 24 lines across 141 runs (23 additions, 1 cut), and the refill now names it in the rule's words. |
| `quotedNote` | A misquoted game note | **Keep.** |
| `noBracketClaim` | The model naming a bracket | **Keep.** The app shows the move (§5.4). |
| `noResultClaim` | A promised result | **Relax, on the word "stronger" only.** See below. |
| `ownershipNotRanking` | Owned cards ranked first | **Keep.** It's a prompt rule, not a validator drop. |
| `oneCard` | One card per line, with its own reason | **Keep.** |

**`noResultClaim`** was the top cut-drop reason in the eval: 14 of a cell's drops at N=20. Its pattern catches two kinds of text:
- predictions about games: "will win", "would lose", "win more", "lose less";
- the bare word **"stronger"**.

On a cut, "stronger" is nearly always a comparison of cards ("frees the slot for a stronger draw spell"), not a promise. Proposal **(a2)**:
- Keep every prediction pattern, on both lists.
- Narrow "stronger" to the deck as its subject ("makes the deck stronger", "a stronger deck").

The change is measured before it ships. Re-score the 141 stored replies? Not possible: the replies were not kept. So it's one small eval at N=20 on two decks (about $1) to see the drop fall and nothing worse pass. Hugh may prefer to drop the rule on cuts entirely (§12 Q9).

### 6.3 Pipeline steps that go

These are the v10 drop points that are not validation rules.

| v10 step | v2 |
|---|---|
| Ask 6 per list (`ASK_PER_LIST`) | Ask ceil(1.5N) per list |
| Keep the first 5 per list (`sizeLists`, `MAX_SUGGESTIONS`) | Keep every valid line, up to the ask (§5.2) |
| A strict per-list schema cap | Loose, at twice the ask (§5.2) |
| A second ask only when NOTHING was kept | A refill per list whenever it is short of N (§5.1) |
| The refund rule (`refundsCredit`: fewer than 3 kept, or fewer than a third of the lines the model returned, on a single-ask run) | Re-decided against the count (§9) |

## 7. Results (Hugh, with presentation left to Design)

- **The lists:** additions and cuts, each about 1.5N valid suggestions, in the model's order. **(Hugh)**
- **Picking:** the player picks any N additions and N cuts. **(Hugh)**
  - **(a2)** The picks may be unequal while choosing, but applying requires equal counts. Applying an unequal set would move the deck off 99, which Suggested changes never does (§3).
  - How applying and undo work is §7a (§12 Q1).
- **Each suggestion shows** the card, its reason and its citation chips. The app adds:
  - the focus chip with its figure (`strategyChips`);
  - the off-plan cut chip;
  - the bracket move.
- **No "Suggest again" form** under the results. A new run starts at a fresh intake. **(Hugh)**

## 7a. Applying the picks (Hugh's, §12 Q1)

Today each suggestion applies the moment it is pressed and undoes alone, so the deck can drift off 99. That contradicts §3's "99 to 99".

**Proposal (a2):**
- Applying is ONE action that writes M picked additions and M picked cuts in one transaction, where M is at most N and at most the shorter of the two lists (a short run, §5.1a, offers fewer than N on one side). It refuses unequal counts and a deck no longer at size.
- Undo reverts the whole applied set, not single cards.
- The pool stays readable after applying. Taking more from it later is a NEW apply of an equal-count set, allowed while the deck is at size and the run is not stale (`readVersion`).

This replaces today's per-card apply and undo for v2 runs. It changes how a player handles the results, so it is Hugh's call.

## 8. What is stored

**Runs and suggestions.** The `deck_suggestion_runs` and `deck_suggestion_items` tables stay, as the one run record every Tuning tool shares. New per run:

- **`requested_count`** (N), an integer.
- **`request_text`**: the player's request, the same text that went to the model.
  - **(a2)** Stored, because "old runs live in history" **(Hugh)** needs to show what was asked, and today's notes field is never saved.
  - It's per-user data, so the account purge already covers the table.
  - Whether to keep it is §12 Q5: it's the first time a player's typed request is kept.
- **Restrictions:** already stored on the deck. The run snapshots them **(a2)**, so history shows what bound an old run.
- **`call_count`**, and a `refilled` flag per list, in the validation report **(a2)**, so a run's cost is explainable.

**Picks.** An item's `verdict` (`pending` / `accepted` / `dismissed`) carries the pick. **(a2)** A suggestion the player didn't pick stays `pending` and is never auto-dismissed, so history shows the whole pool and what was taken from it.

**Running again (a2).**
- v2 drops today's "unchanged deck" gate (`gateReason`) and its "Suggest again anyway" state. Every run starts from an explicit intake that spends a credit, so the player's press is the consent.
- The fingerprint already hashes the restrictions (`tuningFingerprint`); it gains N and the request, so history can show what changed between runs.
- Identical inputs on an unchanged deck ask once before spending ("Same request as your last run: run again?"). Design words it.

**History.**
- A deck's runs list newest first, each with its request, N, restrictions, date and pool.
- A run is read-only once a newer version of the deck exists. That's today's rule (`readVersion`), kept.
- How history is laid out is Design's.

## 9. Cost, and the credit question

**These are prototype measurements.** The eval trimmed each list's survivors to N before the cut call saw the additions; v2 sends the whole surviving pool (about 1.5N). The cut prompt is therefore longer in v2, so cost and latency here are a floor, not a validation of the pool-based flow. Pricing (Q2) and the time limit (Q4) should allow for that, and the build re-measures on the real flow before either is fixed.

| N | Prototype measured cost per run (two calls, arm C) | v10 today |
|---|---|---|
| 3 | $0.042 | ~$0.035 |
| 10 | $0.074 | ~$0.035 |
| 20 | $0.104 | ~$0.035 |

v10 asks for 6 + 6 and keeps 5 + 5, whatever the player wants. v2 at N=20 costs about 3× a v10 run, and at N=10 about 2×. Latency rises too: p50 56s at 20.

**For Hugh, not decided here:** a run costs 1 credit today. Options:
- keep 1 credit at any N;
- price by N (1 credit to 10, 2 credits above);
- cap N at 10 for one credit.

This is §12 Q2.

**Refunds (a2, pending Q2).** v10 refunds a single-ask run that kept under 3 lines or under a third of the lines the model returned (`refundsCredit`). In v2:
- A run whose two lists BOTH reach N is charged.
- A short run is charged only when, on each short list, the restriction drops (`overCap`, `offSet`, `notOwned`) account for the whole deficit: the list's shortfall below N is no larger than its restriction drops. The restriction cost those cards, not the pipeline, and the run says so (§5.5).
- Any other short run is refunded whole. That includes the model returning too few lines after the refill (under-production, with no drops to explain it), a mix of under-production and restriction drops, a model-caused drop on a short list, a malformed reply, and a skipped call 2.
- An empty run is refunded and fails as `ungrounded`, as today.
- Credits are whole, so a run is charged or refunded, never split.

## 10. Migration from v10

- **PROMPT_VERSION 11.**
  - The size and aim sentences are replaced by the count and the two-call wording.
  - `notes` becomes `request`.
  - The signal-trust order is added.
  v2 has no unchanged-deck gate to reopen (§8). A run stored at v10 stays readable in history, drawn as it was.
- **Constants:** `ASK_PER_LIST` and `MAX_SUGGESTIONS` stop governing Suggested changes, and the count drives the ask instead. **(a2)** Proposed cuts keeps its own constants until its own redesign (Hugh's pool shape applies there too, in a separate spec).
- **Schema:**
  - two new nullable columns on `deck_suggestion_runs` (`requested_count`, `request_text`);
  - the report fields in the existing `validation_report` jsonb;
  - no backfill: a v10 run has no N. Its `requested_count` stays null, and history shows the addition and cut counts derived from its stored items. `sizeLists` only capped each list at five and short runs were kept, so "5 + 5" would misstate many of them.
- **The run action:** `runTuning` becomes two-call with the refill. The prototype that proved it is `scripts/eval/count-mechanism.mts`, built on the app's own pack, prompt, model and validator, but under looser limits than `runTuning` has today. The build must carry them across or re-measure:

  | | Eval | `runTuning` today |
  |---|---|---|
  | Deadline per call | 300,000 ms | `MODEL_TIMEOUT_MS` 110,000 |
  | Reply ceiling | max(8,000, 600 per line + 4,000): 22,000 tokens at 30 lines | `TUNING_MAX_TOKENS` 8,000 |
  | Streaming | on | off |
  | Reservation | none | `FEATURE_CALLS.tuning`, one 8,000-token call (two attempts) |

  **(a2)** The reservation grows to cover two calls and up to two refills at the scaled ceiling, so a run never spends past what it reserved. The ceiling scales with N, as in the eval. Streaming is needed for a reply that large inside the deadline.
- **The switch.** **(a2)** v2 ships behind the existing Suggested changes surface's own switch, or a new one only if Hugh asks for one (no new switches without him). Production keeps v10 until v2 is approved and shipped.
- **Open v10 runs at cutover (a2).** A v10 run with pending items becomes read-only history. Its per-card apply would move the deck off 99, which v2 never does. An item already applied keeps its undo until the deck's next version, as today.
- **Proposed cuts keeps its rules (a2).** The `noResultClaim` narrowing (§6.2) applies to Suggested changes only, through a parameter on the shared check (`presentation.ts`). Proposed cuts keeps today's rule until its own redesign; its citation kinds are its own (`cuts-schema.ts`), so the `notes` to `request` rename does not reach it.
- **About entry:** v2 changes what the feature does, so its About entry is rewritten in the same round. Design draws it.

## 11. What is left to Design

Design owns these, under Hugh's rule that results presentation is a UI call:

1. **The intake screens.**
   - The three steps.
   - The suggestion chips beside the request box, which are never pre-filled.
   - The bracket choice, if Q7 says yes.
   - How a deck not at 99 is pointed to Top-off or Proposed cuts.
2. **The results lists.**
   - How about 1.5N suggestions per list read, grouped or flat ("grouped vs lists", open in the rethink).
   - How a player picks N from each, and how the equal-counts rule is shown.
   - How a short run states its count and its reason (§5.5).
3. **The running state.** Two calls take 15–60s at p50, up to 114s at p90 at N=20. The wait needs a design.
4. **History.** The run list, an old run's pool and picks, and a read-only stale run.
5. **The About entry**, rewritten for v2.

## 12. Hugh's questions, most important first

1. **How applying works.** Today each suggestion applies, and undoes, one card at a time, so the deck can leave 99. Proposal: one action applies the picked N + N together, with one undo for the set (§7a). Agree, or keep per-card apply?
2. **The credit price.** A v2 run costs about 3× a v10 run at N=20, and 2× at 10. Keep 1 credit at any N, price by N, or cap N per credit? Pricing by N touches the payments ledger (`reserveModelCall`). (§9)
3. **Cuts made for the pool, or for the picks?** The cut call makes room for every addition call 1 kept. Should the cuts be re-asked once the player has picked their N additions? That's a second, smaller paid call and a new run state, with cuts that fit the actual picks better. (§5.1)
4. **The time limit.** Runs execute after the response, inside the deck page's 120-second function limit. Two calls at N=20 took 56s at p50 and 114s at p90 in the eval, so a refill can push past 120s. Raise the limit for this action (function time costs money, against the 2026-10-23 cost audit), or skip a refill that would overrun, so the run returns short and refunded? My lean: skip the refill and keep 120s.
5. **Storing the request text.** History needs it to show what was asked, and it's the first time a player's typed request is kept. Store it (purged with the account), or show history without it? (§8)
6. **The count's ceiling.** 20 is measured. Allow more (untested, about 1.5× the tokens per extra card), or cap at 20? (§4)
7. **The bracket move in release 1.** Offer a structured "move to bracket N" choice beside the request box now, or ship the count and the request first and add the bracket goal after? (§5.4)
8. **The request's length.** Today's "Additional notes" cap is 500 characters (`deckDescriptionCopy.notes.maxLength`). Keep it, or change it for a request? (§4)
9. **`noResultClaim` on cuts.** Narrow "stronger" to the deck as its subject (my proposal, measured first), or drop the rule on cuts entirely? (§6.2)

## 13. Decision log

| Decision | By |
|---|---|
| Never hold results back; the request is fulfilled or negotiated | Hugh |
| Give the player a choice: a pool larger than the need, and the player picks N | Hugh |
| Tool boundaries: Top-off under 99, Suggested changes 99 to 99, Proposed cuts over 99 | Hugh |
| Additions first, then cuts to make room; not paired; cuts equal adds | Hugh |
| The three-step intake; the request never pre-filled; suggestions beside the box | Hugh |
| Signal trust: request > overview > focus > description | Hugh |
| No "Suggest again" form; a fresh intake, with old runs in history | Hugh |
| Two calls, arm C (1.5N, one refill if short) | Hugh, on the eval |
| Show all ~1.5N valid suggestions per list, one list each | Hugh |
| The bracket move as a goal | Hugh |
| Results presentation goes to Design | Hugh |
| An ungroundable citation costs only itself; `focus` is citable | Shipped (#2289), kept |
| N from 1 to 20 | a2 (Q6) |
| A loose schema cap at twice the ask; the first ask-many valid lines kept | a2 |
| `notes` renamed `request` | a2 |
| A bracket target only from a structured choice, never parsed from text | a2 (Q7) |
| Picks may be unequal while choosing; applying requires equal counts | a2 |
| Unpicked suggestions stay pending, never auto-dismissed | a2 |
| Store `requested_count`, `request_text`, a restrictions snapshot and call counts | a2 (Q5) |
| The refund follows the cause of a shortfall | a2 (Q2) |
| `noResultClaim`: narrow "stronger", measured first | a2 (Q9) |
| PROMPT_VERSION 11; v10 runs readable as they were | a2 |
| "At size" is a total of 100 including commanders; the gate is on Suggested changes only | a2 |
| Short additions: call 2 asks ceil(1.5·K), skipped when K is 0 | a2 |
| One apply for the picked set, with one undo | a2 (Q1) |
| No "unchanged" gate; identical inputs ask once before spending | a2 |
| Charged when both lists fill, or each short list's deficit is covered by restriction drops; else refunded whole | a2 (Q2) |
| Open v10 runs become read-only at cutover | a2 |
| Proposed cuts keeps today's rules; the narrowing is scoped to Suggested changes | a2 |
| The owned-only fallback is removed; an owned-only run returns short rather than with cards to buy | a2 |
| `keyCard` kept as a stated exception to the signal order | a2 |
| Apply M + M, with M at most N and at most the shorter list | a2 (Q1) |
