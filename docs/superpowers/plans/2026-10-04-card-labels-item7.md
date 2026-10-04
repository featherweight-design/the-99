# Card labels on three low-risk surfaces (item 7) Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.

Written 2026-10-04 against `origin/main`, after the v8 relabel (#1241, #1246, #1250). No model call is made by any PR here.

**Goal:** Let fresh card labels refine what the Consider panel offers (a filter) and which shelf an EDHREC pick sits under (display only), and prepare the card-note label lines for a Design round, without moving any count, budget, fill, score, profile or tutor reading.

**Architecture:** Labels are read ONCE per deck-page request, AFTER the cached suggestions payload resolves, for the suggestion ids the page renders, in the same post-cache wave that already reads prices, availability, `candidateFacts` and combo completions (`src/app/decks/[id]/page.tsx` ~L313). Two pure functions decide (1) which role-gap picks to drop and (2) a `labelRole` for EDHREC picks; the page attaches the results the way it attaches `facts`. Nothing label-derived enters `loadDeckSuggestions` or any `cacheForUser` entry.

**Tech Stack:** Next.js 16 server component, Drizzle raw SQL (`readLabels`), Vitest.

**Spec:** Hugh's approval of the comparison's ranked shortlist (2026-10-04), board `lanes/card-labels-item7-comparison.md` §6, §4, §3 and "Ranked shortlist".

**Global Constraints:**
- No change to `planFill`, role targets, `computeRoleCounts`/the mix strip, scoring, `deck_profiles`, `classifyTutor`/`isTutor`, or `relevant()` itself (stand-ins share it).
- A card with no fresh label (`readLabels` leaves it absent, including a stored `[]`) reads exactly as today. Every rule below is "label present AND says X", never "label absent means Y".
- One `readLabels` call per request, over rendered ids only (suggestion ids, at most `deckBodySize`), never catalog-wide.
- Switch off: `readLabels` is not called, no lens is read, the page is byte-identical to main.
- No new browser probe in this lane. Verification is unit tests, mutation runs, a throwaway read-only staging measurement, and a contact sheet.
- US English, no em-dashes; every new string goes through `/copy-review`.

**Review Focus:** that the filter can never drop an EDHREC-evidenced card; that `role` (which the optimistic add feeds into `computeRoleCounts`) is never overwritten; that the label read sits outside every cache.

---

## Findings that shape the plan

1. **Cached payloads.** `loadDeckSuggestions` is served through `cacheForUser(userId, ["deck-suggestions","2", id, indexGen])` (page.tsx L120). The key carries deployment and catalog generation, but a label publish (`publishRun`, `src/lib/labels/publish.ts`) moves neither, so a label read INSIDE that loader would serve the previous run's labels for up to the 1h `CEILING_SECONDS`. Reading after the cache avoids that, needs no key change, and keeps the switch out of the key (the switch is read per request; Vercel needs a redeploy to flip it anyway, which changes `DEPLOYMENT_ID`).
2. **`role` is load-bearing.** `suggestion-tile.tsx` `handleAdd` passes `suggestion.role` to `addOptimisticCard`, and the strip counts optimistic rows by `role` (`computeRoleCounts`, `src/lib/decks/mix.ts:32`). A label must therefore ride a NEW field; overwriting `role` would move the mix strip on add.
3. **Shelf headers count the deck by text.** `buildShelves` (`consider-panel.tsx:47`) prints `have / target` from `computeRoleCounts(deckCards)`. A card shelved by its label under Ramp does not move Ramp's `have` when added. See Open question 1.
4. **`synergy-cards.ts` cannot take the filter safely** (see Item 1 scope).
5. **Deck lens on the deck page.** `relevant()` needs a `DeckLens` (`src/lib/swaps/honest.ts:43`). Today it is built inline in `swaps/gather.ts` L183-190 (`lens()`), from draft rows with `type_line`, `oracle_text`, `quantity`, plus commander type lines and two hourly type lists (`loadCreatureTypes`, `loadNoncreatureSubtypes`). `detail.cards` carries no `oracleText`, so `heldSubtypes` would miss token-made subtypes (a Treasure deck would read as holding no Treasure). The page needs one small extra read when the switch is on.
6. **`keyCreatureType` is null below 5 creatures of a type** (`recs/themes.ts:137`). A fresh Lathril deck has no key type yet, so `relevant()` alone would read every Elf payoff as irrelevant. The Consider rule adds the commanders' own creature types as acceptable key types (Item 1).

## The switch

Add `LABEL_SURFACES_ENABLED` (`src/lib/labels/read.ts`, `labelSurfacesEnabled()`, exact string `'true'`, read per request). Reusing `STAND_IN_LABELS_ENABLED` would switch these Consider changes on in staging the moment they deploy and tie their production release to the stand-ins sheet's, which Hugh walks separately (every feature behind its own switch, the 2026-09-24 release ruling). The plan ASSUMES no About entry is owed (a refinement of an existing surface, not a new capability), pending Hugh's answer to Open question 4; until he answers, the switch is not added to `SWITCHES` in `src/lib/about/visible.ts`. If he rules an entry is owed, the switch is added there in the same PR as the entry.

## Design round

- **Item 1 (filter): no.** Fewer tiles on an existing shelf, no new element or copy. Logic only.
- **Item 3 (shelf grouping): no.** A card moves between EXISTING shelves with existing headings; the tile's `Fills <role>` line is only drawn for role-reason picks, which never move. Logic only.
- **Item 2 (card-note lines): YES, before any code.** `STATES-card-note.md` §A (push_line handoff) defines the note as "a card claim, a rules claim, or a count", caps facts at 2 on a row and 1 on a tile, and n9 says "nothing renders, no reserved height". Label lines would draw on most rows (29,364 jobs carry a trigger, 32,450 are repeatable), which changes the note from rare to common, changes tile height and the Add alignment `probe:card-note` measures, and needs a register ruling (model reads, so attributed?). Neither the push_line nor the consider_tiles handoff covers it.

---

## PR A: Consider filter (item 1)

Files (about 9, under 450 lines):
- Create `src/lib/labels/lens.ts`: `deckLens(input)` pure, moved from `swaps/gather.ts`'s inline `lens()`.
- Modify `src/lib/swaps/gather.ts`: call `deckLens` (behavior-preserving).
- Create `src/lib/labels/consider.ts` + `consider.test.ts`: `considerIrrelevant`, `filterConsider`.
- Create `src/lib/decks/consider-labels.ts` + `consider-labels.test.ts`: the request-time orchestration with injected deps.
- Modify `src/lib/labels/read.ts` (+ `read.test.ts`): `labelSurfacesEnabled`.
- Modify `src/app/decks/[id]/page.tsx`: call it in the post-cache wave; filter `suggestions` before `pricedSuggestions`.

**Scope: Consider's role-gap picks only.** The filter touches suggestions with `reasonType === "role"`: `suggestDeck` chose them from the whole owned pool by text role alone, with no evidence this commander plays them, which is where "Elvish Archdruid fills ramp" in a Dinosaur deck comes from. EDHREC picks (`reasonType === "edhrec"`, the synergy shelf) and the unowned Top picks are never dropped: EDHREC measured them in this commander's decks.

**`synergy-cards.ts` is NOT filtered** (recommendation; Open question 2). On `/commanders/[slug]` there is no deck, and `relevant(job, null, …)` returns false for every card-type and creature-type restriction, so it would hide every tribal payoff on a tribal commander's page. On the deck page the same list (`readDeckSynergy`) is the bulk controls' allow-list (`topOffAllowList`, `app/decks/actions.ts:2328`), so hiding rows either breaks the documented list/plan agreement or narrows what the plan may pick, which is a fill change. And it is EDHREC's own play data for that commander.

### Task A1: extract the deck lens

```ts
// src/lib/labels/lens.ts
type LensRow = { typeLine: string; oracleText: string | null; quantity: number };
export type LensInput = {
  /** The FULL draft: `keyType` reads these, as gather.ts:183-189 does. */
  keyRows: readonly LensRow[];
  /** Draft rows PLUS commander rows (type line AND oracle text, so a commander's token subtypes
   *  count), MINUS any cut card: `held` and `heldTypes` read these. */
  heldRows: readonly LensRow[];
  creatureTypes: ReadonlySet<string>;
  noncreatureSubtypes: ReadonlySet<string>;
};
export function deckLens(i: LensInput): DeckLens // keyType, isSubtype, held, heldTypes, exactly as gather.ts builds them
```
- [ ] Move the body of gather.ts `lens()` here. The two inputs stay separate because gather computes them from different rows: `keyType` from the full draft, `held`/`heldTypes` from draft plus commander rows minus the cut card. gather passes exactly those; the deck page passes the full draft for both plus its commander rows, with no cut.
- [ ] Tests: `keyType` ignores the cut card's exclusion and the commander rows; a commander's oracle-text token subtype (a Treasure maker) is held; a cut card is not held.
- [ ] Run `pnpm test src/lib/swaps` before and after; same pass count, no snapshot change.

### Task A2: the rule

```ts
// src/lib/labels/consider.ts
/** True only when the card HAS a fresh label and every job fails `relevant()` under the deck's
 *  lens AND under a lens keyed on each commander creature type. Lands are never irrelevant. */
export function considerIrrelevant(jobs: readonly Job[] | undefined, card: { typeLine: string },
  lens: DeckLens, commanderTypes: readonly string[], isCreatureType: (w: string) => boolean): boolean
export function filterConsider<T extends { oracleId: string; reasonType: ReasonType; typeLine: string }>(
  suggestions: readonly T[], labels: ReadonlyMap<string, Job[]>, lens: DeckLens,
  commanderTypes: readonly string[], isCreatureType: (w: string) => boolean): T[]
```
Uses `relevant()` per job directly (not `jobsByKey`, which also discards `land` keys and a ramp job with no `rampKind`, and would read those as irrelevant).

Tests (`consider.test.ts`):
- [ ] absent label: kept.
- [ ] every job `restrictedTo: "Elf"`, `affects: "self"`, deck key `Dinosaur`, commander not an Elf: dropped.
- [ ] same card, deck key null, commander `Elf Druid`: kept (finding 6).
- [ ] one job unrestricted: kept. A job `affects: "opponents"` restricted to `artifact`: kept.
- [ ] `restrictedTo: "artifact"`, deck holds an artifact: kept; holds none: dropped.
- [ ] land face with a restricted job: kept.
- [ ] `filterConsider`: an `edhrec` pick and an unowned pick with an irrelevant label are both kept; only the `role` pick goes.

### Task A3: request-time wiring

```ts
// src/lib/decks/consider-labels.ts
export type ConsiderLabelDeps = { readLabels; loadCreatureTypes; loadNoncreatureSubtypes; readLensRows: (deckId: string) => Promise<LensInput["keyRows"]> };
export async function considerLabels(args: { deckId: string; suggestionIds: string[]; commanderTypeLines: string[] },
  deps?: ConsiderLabelDeps): Promise<{ labels: Map<string, Job[]>; lens: DeckLens; commanderTypes: string[]; isCreatureType } | null>
```
`readLensRows` is one query: draft `deck_cards` joined to `cards` for `type_line, oracle_text, quantity`, scoped by the deck id the page has already guarded.
- [ ] Test: switch off returns null and calls no dep.
- [ ] Test: `readLabels` is called once, with exactly the suggestion ids (no candidates, no deck cards).
- [ ] Page: run it in the existing `Promise.all` at ~L313, `.catch(() => null)` like its neighbours (a failed read filters nothing). `ownedIds` is built before that wave (~L278), so the ancillary reads OVERFETCH over the pre-filter suggestions, deliberately: a dropped pick costs a few extra ids in reads that are already batched, and nothing is serialized ahead of the wave. `filterConsider` is applied at the render boundary, after the wave, to the list the panel receives.
- [ ] Mutations, each must fail a test: drop the `reasonType === "role"` guard; drop the commander-type lens; treat an absent label as irrelevant; ignore the switch.

### Task A4: verify
- [ ] Pre-push gate (`pnpm typecheck && pnpm lint && pnpm test`, stub-DB build).
- [ ] Throwaway READ-ONLY staging measurement (scratchpad script, `default_transaction_read_only=on` asserted, as the comparison did). `suggestDeck` adds EDHREC picks first and counts their roles before choosing role-gap picks (`suggest.ts:197-227`), and the loader excludes cards already in the deck (`suggestions-read.ts:170-174`), so the measurement must reproduce both: EDHREC picks from the STORED `edhrec_cache` rows only (never a fetch, which writes the cache), the same available pool and deck exclusion as `loadDeckSuggestions`. A deck whose EDHREC page is not cached is reported as not reproducible rather than measured with `edhrecTopCards: null`. Count role picks the filter drops, with the ten most-dropped names, in the PR body. A drop on a card that plainly helps the deck is a stop.
- [ ] Contact sheet: `docs/superpowers/inventories/label-surfaces.json`, the Consider tab reached by a press, 390 and 1300, on a `pull:staging` copy in local-dev, switch on and off.

## PR B: shelf grouping for EDHREC picks (item 3)

Opens after PR A merges (not stacked). Files (about 12, under 400 lines; most are test fixtures gaining one field):
- Modify `src/lib/labels/consider.ts` (+ test): `labelShelfRole`.
- Modify `src/lib/decks/suggest.ts`: `DeckSuggestionWithFacts.labelRole`, `shelfRoleOf`.
- Modify `src/app/decks/[id]/page.tsx`: attach `labelRole`.
- Modify the fixtures that build a `DeckSuggestionWithFacts` (`consider-panel.test.tsx`, `suggestion-tile.test.tsx`, `card-note.test.tsx`, `consider-combo.test.tsx`, `add-surface-marks.test.tsx`, `card-detail-surfaces.test.tsx`, `strip-cell-arrival.test.tsx`, `builder-optimistic.test.tsx`, `src/lib/about/fixtures.ts` if it builds one).

```ts
// labels/consider.ts
/** The first role a fresh label gives this card for this deck, in classifyRoles' order (ramp, draw,
 *  wipes, removal); `counterspell` reads as removal, `tutor` and `land` give none. Null for no label. */
export function labelShelfRole(jobs: readonly Job[] | undefined, lens: DeckLens, isCreatureType): MixRole | null
// suggest.ts
export type DeckSuggestionWithFacts = DeckSuggestion & { facts: CandidateFacts | null; labelRole: MixRole | null };
export function shelfRoleOf(s: DeckSuggestion & { labelRole?: MixRole | null }): ShelfRole {
  if (s.reasonType === "role" && s.reason !== "edhrec") return s.reason;   // unchanged
  if (s.role !== "other" || isLandFace(s.typeLine)) return s.role;         // text placed it: unchanged
  return s.labelRole ?? "other";                                            // promote from Other only
}
```
`labelRole` is attached ONLY while the switch is on: with it off, no property is added and the serialized suggestion is byte-identical to main. Enabled suggestions use a separate type (`DeckSuggestionWithFacts & { labelRole: MixRole | null }`), required and nullable there, the `facts` rule, so the switch-on path cannot forget it. **Promote from Other only**: a card text already shelves never moves, which keeps the label from relocating text-correct cards and keeps the header mismatch (Open question 1) to cards that today sit under Other. `role` is untouched, so the optimistic add and the strip are unchanged.

Tests:
- [ ] Cyclonic Rift (text other, label removal/bounce): Removal shelf. Nature's Lore (text other, label ramp/fetchesLand): Ramp.
- [ ] a text-ramp card whose label says removal: stays Ramp. A role-reason pick: stays on its reason.
- [ ] `labelRole` null: Other, as today. A land: never moved.
- [ ] `rolesWithShelves` agrees with `buildShelves` (one fixture, both read).
- [ ] `builder-optimistic.test.tsx`: adding a label-shelved tile passes `role: "other"` to the optimistic row and moves no strip cell.
- [ ] Mutations: remove the promote-only guard (text-ramp test fails); map `counterspell` to nothing (Rift-style counter test fails); feed `labelRole` into the optimistic row (strip test fails).
- [ ] Verify: extend the PR A measurement with staging `commander_support_cards` as the EDHREC-pick proxy: per deck, how many owned EDHREC picks leave Other and for which shelf. Contact sheet rerun.

No new copy in A or B.

## PR C: card-note label lines (item 2), after Design

Not drafted to code until Design returns. Engineering shape to hand Design:
- A separate pure `cardLabelLines(jobs, lens, density)` beside `cardNoteSentences`, never inside its fact cap, so a bracket sentence is never displaced.
- Inputs per job (relevant to the deck only): `trigger` other than `none`/`other`, `recurrence: "repeatable"`, `method` on removal/wipes.
- Data: the Consider tile and top-off row can share PR A's single read if it widens to `[...suggestionIds, ...candidateIds]` (the same union `loadCandidateFacts` already takes). The quick-add row's facts come per keystroke from the search action, so it needs its own `readLabels` over the result ids there.
- Strings (illustrative, for /copy-review, not final): `Repeatable.`, `Exiles.`, `Bounces.`, `On attack.`, `When it enters.`, `When it dies.` New keys in `src/lib/copy/card-note.ts`.
- Design must rule: placement against the note and the §C2 marks, tile vs row density, the cap, whether n9 still means "nothing renders", and register (attributed like n3-n6, since labels are model reads with measured precision 0.92).
- Verification then reruns the existing `probe:card-note` (Adds alignment, no reserved height), which is an existing probe, not a new one.

## PR D (optional, awaiting Hugh's decision): version-aware freshness

**Not approved and not built.** Listed here because the 2026-10-04 relabel showed the cost: any
edit to `SYSTEM` restales every `card_labels` row (`labelInputHash` hashes the prompt), so a one-line
prompt fix becomes a 32,000-card, ~$60 run. A version-aware rule would keep a row fresh across a
prompt version unless that version names the row's card or one of its job kinds as changed, so a
targeted prompt fix relabels only what it targets. It touches `labelInputHash`, `freshLabels`, the
build's stale set and the copy's `planCopy`, so it is its own PR, and it waits on Hugh.

## Spend

None. Every PR here reads stored labels; no PR adds, triggers or widens a model call. Hugh's rule
(2026-10-04): no paid model call without his explicit confirmation of scope, card count and dollars.

## Open questions for Hugh

1. **Shelf counts after a label-shelved add (PR B).** Ramp reads `have 6 / 10`; the reader adds Nature's Lore from it; the deck counts by text, so it still reads `6 / 10`. Fixing it means the deck's counts reading labels, which is the budget change ruled out. Accept that mismatch, or drop item 3?
2. **`synergy-cards.ts` stays unfiltered** for the three reasons under PR A's scope. Agree to scope item 1 to Consider?
3. **How it works.** Its handoff says card labels are excluded "until something in the app reads them" (brief 2026-09-28, line 45). Stand-ins already read them and Consider would too. Does How it works owe a row, and in which round?
4. **About entry.** Plan assumes none for A and B (refinements). Item 2 is Design's and Hugh's call when it is drawn.

## Risks

- Filter false drops where `restrictedTo` names something the lens misreads (a multi-word type, an unusual subtype). Mitigated by scope (role picks only), the commander-type lens, and `relevant()` keeping any restriction it cannot read. The staging measurement is the gate.
- `considerLabels` adds one `deck_cards` read and the two hourly type lists to the deck page when on. Both type lists are memoized; measure the page with `measure:load` once (warm), expected under 30ms.
- Labels are one model run (precision about 0.92, recall about 0.86); a wrong label can hide a role pick or misplace an EDHREC pick. Both are browse-only and switch-gated.
