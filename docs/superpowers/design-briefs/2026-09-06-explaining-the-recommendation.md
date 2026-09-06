# Design Brief — Explaining the recommendation

**Workshop:** 2026-09-06, Hugh + agent, against **#342**, folding in **#366** (the undefined Pool/Roles/Synergy legend), the scoring-denominator problem recorded on #342, **#346** (committed-card marks), **#347** (Role Coverage sorting) and **#345** (home-screen rotation). **Track 1, stage 2** — this brief is the source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `20b8c1d` on 2026-09-06.** Every `file:line` below was read on that commit, not recalled.

The complaint behind #342 is simple: the app tells you a commander is a 74 and never says why. Everything in this brief serves that one sentence — the paragraph that explains the number, the legend that makes its parts readable, and the denominator that makes the number honest in the first place.

---

## §0 Dependency — the explanatory prose needs a generation step that does not exist yet

The **material** is already precomputed. `commander_support` (`src/db/schema.ts:271-324`) carries per commander: `engine` (an enum — `etb` / `triggered` / `activated` / `tap` / `static`), `tags`, `bracketCounts`, `budgetCounts`, `similarOracleIds`, `deckCount`, `rank`, `saltScore`, `synergyState`. `commander_support_cards` carries per-card `inclusion` and `synergy`. Per-user figures (`ownedSupport`, `roleCounts`, `edhrecOwnedCount`) are computed at request time already.

What is missing is the prose itself. **The workshop settled how it gets written (§4.1) and that decision has an eng cost but no design dependency.** Design can draw the paragraph's placement, length and states from the sample copy in §4.2 without waiting for the generator.

**This handoff is not gated.** The readiness audit may treat it as ready-to-build.

---

## §1 Feature / surface + route

**Primary surface: `/commanders/[slug]`** — `src/app/commanders/[slug]/page.tsx`, rendering `CommanderDetail` (`src/components/commanders/detail.tsx`, 673 lines).

Current section order at both widths: **Fit Hero → The Pool → Role Coverage → EDHREC Synergy**.

**Secondary surface: the home dashboard's `HeroCommander`** (`src/components/home/hero-commander.tsx`), which consumes the same paragraph in far less room. See §5.3.

---

## §2 Where it lives in the flow (entry → this → exit)

- **Entry:** a row on `/commanders` — from either scope. `discovery-row.tsx:289-290` already links here, as does the owned rec card. Also the home dashboard's hero.
- **This surface:** the page that justifies the recommendation.
- **Exit:** "Build this deck" → `createDeck` → `/decks/[id]`, or back to the list. Unchanged.

---

## §3 Design system / files to build from

- **Brand tokens:** `design/design_handoff_the99_brand/`
- **Six-theme visual system:** `src/app/globals.css`.
- **The handoff this extends:** `design/design_handoff_the99_recommendations/`, plus `design/design_handoff_the99_synergy_discovery/` for the synergy panel this page already carries.
- **Committed property table this brief reopens:** §Commander Detail Page.

---

## §4 The three decisions taken at the workshop

### 4.1 The prose is generated at index build, stored, and regenerated on input change

**Hybrid.** A model writes the commander-level paragraph during the monthly `commander_support` index build; a templated clause about *your* collection is appended at request time.

Three constraints the workshop attached, which Design should know because they bound what the paragraph can say:

1. **Stored and versioned, never streamed at request time.** A bad paragraph is then a data fix, not a live incident, and every paragraph is reviewable before a player sees it.
2. **Never states rules text or card interactions as fact** beyond what the oracle text supports. The paragraph describes what the commander's deck *tends to do* according to the index, not what any two cards do together.
3. **Regenerates on input change, not on schedule.** `scripts/build-commander-index.ts:5-6` recomputes every commander on the monthly run by default. Prose must not ride that cadence — it is gated on a hash of its inputs plus a prompt version. A full backfill of ~3,300 commanders costs roughly $5 at Haiku-class rates (~800 tokens in, ~150 out); steady state is the month's new releases, so cents. A prompt revision is a deliberate ~$5 re-backfill, which is cheap enough that the writing can be iterated.

**Consequence Design must draw for:** there is always a window between a set landing and the next index run, so **a commander with no paragraph yet must render correctly with the templated clause alone.** That is a normal state, not an error state.

### 4.2 The paragraph gets its own section between the Fit Hero and The Pool

Nothing currently drawn moves. It preserves the page's existing rhetoric — claim, then evidence — with the three evidence sections following it.

There is a precedent immediately below it. "The Pool" already carries a hand-written explanatory sentence: *"Cards from your collection that fit within {name}'s color identity and could slot into the 99."* Commander-agnostic boilerplate, but prose explaining a number. This is the same move made commander-specific.

**Content shape — one generated paragraph, then at most two templated sentences, in this order:**

1. *(generated, commander-level)* what this commander's decks tend to do, drawn from `engine` and `tags`.
2. *(templated, per-user)* where you stand — e.g. *"You own 34 of its 100 most-played cards. Twelve of those are already in Kess."*
3. *(templated, per-user)* the single largest gap, **naming the weakest role and nothing else.**

Sentence 3 deliberately carries no price, no card names and no buy prompt. All three exist below as real interactive elements, and a templated sentence that half-duplicates a live component ages badly the moment either changes. The clause hands off to the sections beneath it; it does not replace them.

### 4.3 The score prints its real denominator

`src/lib/recs/score.ts:172-184` currently rescales when EDHREC data is absent:

```ts
const score = fitSynergy == null
  ? Math.round(((fitPool + fitRoles) / 40) * 100 * 10) / 10
  : Math.round((fitPool + fitRoles + fitSynergy) * 10) / 10;
```

With synergy the weights are 15 + 25 + 60 = 100. Without it, `(pool + roles)` is rescaled from a 40-point maximum onto 100 — **printed identically to a genuine 100-point score.**

This bites hardest on exactly the commanders reached from discovery. `page.tsx:32` calls `scoreOneCommander` unconditionally, so a commander whose *row* deliberately showed no score gets a full 0–100 the moment it is opened. That is the fabricated-comparability problem the discovery list refuses to allow in itself, appearing one tap later.

**Ruling: no synergy data means the hero reads `40` over `/40 measurable`, not `74/100`.** Scope-independent, no branching by arrival, and the two cases become visibly different at a glance. The legend then shows only the segments that were actually measured.

**Consequence for the list:** once denominators can differ, the owned list is openly sorting across two scales and has to say so. That is the same exclusion-transparency pattern §4.4 of the companion brief establishes.

**What Design decides:** how the hero draws a non-100 denominator without it reading as a broken or partial render, at both widths, in the `absent` and `degraded` synergy states.

---

## §5 Three items folded in

### 5.1 #366 — the legend is jargon, and its percentages mislead

`detail.tsx:47-51` labels the three segments with a colour swatch and a bare word — `Pool`, `Roles`, `Synergy`. **Nothing on the page defines any of them.** No key, no tooltip, no disclosure.

Worse, the number beside each label is that segment's share of the achieved total, not progress toward its own ceiling (`detail.tsx:53-56`):

```ts
const total = c.fitPool + c.fitRoles + (c.fitSynergy ?? 0);
const segPct = (val: number) => (total > 0 ? `${Math.round((val / total) * 100)}%` : "0%");
```

`Pool 20%` means "pool supplied a fifth of the points you scored". It reads as "you own 20% of the pool". The three figures always sum to 100%, which reinforces the wrong reading rather than correcting it — and a commander that maxes every component still shows `Pool 15% / Roles 25% / Synergy 60%`, indistinguishable from a poor result.

**What Design decides:** where the three definitions live so a reader can reach them from the hero at both widths (a tooltip alone is insufficient on touch), and what the per-segment number should express — share of total, progress against that segment's ceiling, or raw points out of the segment's weight — labelled so the chosen reading is the only available one.

### 5.2 #346 and #347 — the evidence sections below

- **#346:** Role Coverage and the synergy panel list cards without saying which are already committed to a deck. A player reads a recommendation to acquire cards they already own and have already used. The exclusion rule the page already applies (`page.tsx:36-40` — an owned card drawn in any role list is not repeated in the synergy panel) shows the page already reasons about card identity across sections; this adds a state to it.
- **#347:** Role Coverage has no ordering control. Sorting by EDHREC rank, by synergy, or by availability are three different questions a player asks of the same list.

**What Design decides:** a mark treatment for #346 that survives the four role panels and the synergy panel without adding a fifth visual language; and for #347, whether a sort control per section is affordable on a page that already carries a hero, four role panels, a facet strip and a synergy panel — or whether one control governs all of them.

### 5.3 #345 — the home hero should rotate, and explain itself

`hero-commander.tsx` calls `getRankedList` and renders rank 1. **It is the same commander every time you load the app** until the collection changes.

The rotation cadence and the selection rule are eng calls and are not being asked of Design. What is being asked is narrow and must be answered **in this handoff rather than a later one**:

**How does the §4.2 paragraph read in a home-screen card, given far less room than the detail section?**

The reason this cannot wait: the paragraph is generated once for ~3,300 commanders. If it is written to fit only the detail page and the home screen later needs a different length, that is a full re-backfill. Design deciding both placements now costs a few lines; deciding them apart costs a regeneration.

---

## §6 Must-nots

1. **Do not move the Fit Hero, the fit bar, or the segment gradient.** They are drawn in the committed table and the ramp takes three specific tokens (`detail.tsx:38-41`).
2. **Do not have the paragraph state card interactions or rules text as fact.** See §4.1 constraint 2.
3. **Do not make the paragraph a required element.** A commander with no generated prose is a normal state (§4.1).
4. **Do not draw the per-user clause as a buy prompt.** Price, card names and acquisition all exist as live elements below it (§4.2).
5. **Do not solve #366 with a hover-only tooltip.** The page is used on touch.

---

## §7 Open for Design — one question this brief cannot answer

The detail page already carries a hero, an explanatory paragraph, a pool section, four role panels with disclosures, a facet strip and a synergy panel — and this brief adds a legend key, a committed-card mark and at least one sort control to it.

**Design should say whether the page's section stack still holds at 375px with these additions, or whether the evidence sections need a different structure** — tabs, an accordion, or a reordering that puts the two sections a player actually acts on above the two they only read.

The workshop did not pre-commit to an answer. Every option we could construct was drawn from the current stack's premise and inherited its constraints.
