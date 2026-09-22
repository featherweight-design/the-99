# Implementation plan — Deck analysis, Tier B (the surface)

**Goal:** Put the Deck Profile on screen. Tier A shipped the ingest, the profile and four pure
verdicts with no consumer; this plan builds the **Analysis tab** that reads them — the verdict,
the declaration, the lean, the drift row, the push line and the upgrade path — plus the slot the
narrative synopsis will later occupy.

**Tech stack:** unchanged. No new dependencies. Next.js 16 App Router, React 19, Tailwind 4,
Drizzle on Neon, Vitest, Playwright probes.

**Status of the inputs, verified on `main` 2026-09-20:**

| Input | State |
|---|---|
| Spellbook combo ingest, `spellbook_variants`, `db:seed:combos`, `check:spellbook` | **built** |
| `buildDeckProfile`, `loadDeckProfile`, `cachedDeckProfile` | **built, no consumer** |
| `slotDeck` / `bracketDelta` / `upgradePath` / `fitSkeleton` | **built, unit-tested, no consumer** |
| `decks.declared_bracket` column + check constraint | **built, no write path** |
| Round 0 — the frame | merged (#753) |
| Round 1 — the card mark | **shipped** |
| Round 2 — the verdict | design complete, **unbuilt** |
| Round 3 — the declaration | audited 🟡 Yellow at R7, 2026-09-21; no Design question open |
| Round 4 — the push line and the upgrade path | audited 🟡 Yellow at R2, 2026-09-21; Design self-assesses Green |

---

## Architecture

**Read-only, except one write.** Everything on this tab is a pure function over a profile the
loader already builds. The single exception is the declaration — the first thing on this surface
a player can change and the first thing the app remembers.

**`cachedDeckProfile` is the entry point, and this is what proves it.** Its own doc comment says
no shipped route calls it yet, and names the first Tier B consumer as the proof of
stamp-retirement end to end. PR 1b is that consumer: the head is one cheap read outside the cache,
the fingerprint keys it, and a deck edit retires the entry by changing the key rather than by
being hunted down.

**The verdicts stay pure and stay where they are.** No component may re-derive a rule. Where a
surface needs a figure the verdict does not expose, the verdict grows the field — the alternative
is a second copy of a rule in a component, which is how `probe:build-from` spent three rounds
drifting from `loadAvailability`.

**Analysis is the SECOND tab**, and the Recommended mix strip moves into it (Round 0's ruling,
`FRAME-where-analysis-lives.md`). Net vertical above the tabs falls ~150px, so the decklist rises
on every visit — the tab is affordable only because the strip leaves the header, and a PR that
adds the tab without moving the strip spends that budget twice.

---

## PR boundaries

Named before implementation starts, per the repo's split rule. **Fourteen rows below**, and the
count is the row count — 1/1b, 3/3b, 4a/4b and 8a/8b are each two PRs, not one. Every row is
within the ~20-file / ~800-line split.

**PR 4 is split because it would not have been.** The verdict block as Round 2 draws it is the
permitted range, three limits tables, a violations list with receipts and the population line —
comfortably past the rule, and the rule says a PR that size is split *with its boundaries named
here, before implementation*, rather than noted as an exception. The seam is the chrome: **4a**
establishes the head that rounds 3 and 4 sit inside, **4b** fills it.

**Revised 2026-09-21** after two plan reviews, five rulings, and a pre-open pass. **Four rows were
added and the count went from nine to fourteen**, so the dependency history is auditable:

- **PR 0**, because the reasoning modal specifies two columns the database does not have.
- **PR 1b**, because PR 1 shipped deliberately narrower than this table described.
- **PR 3b**, because PR 3 shipped its storage and not its write path — found by the pre-open pass,
  the same orphaning as PR 1 in the same table.
- **PR 4b**, because PR 4 exceeded the split rule and the rule says split rather than annotate.

`8a`/`8b` were already two rows and are unchanged by this revision.

| PR | What | Blocked by |
|---|---|---|
| **0 — the combo payload** ✅ | `spellbook_variants` gains `mana_needed`, `mana_value_needed`, `steps` and `notable_prerequisites`; `db:seed:combos` ingests them, `check:spellbook` asserts them, `ComboRef` carries them. No UI. **The modal cannot be built before this.** | — |
| **1 — the tab** ✅ | The Analysis tab, its flag and the mix strip moved in. **Shipped reading no profile** — see PR 1b. | *shipped* |
| **1b — the payload and the tab's states** ✅ | `cachedDeckProfile` reached from the surface (shape 3 below), the empty / loading / refused readings, and the synopsis slot with no sentence. | 1 |
| **2 — receipts reshaped** ✅ | `lean.receipts[].tutors` keyed per piece; the deciding combo marked on `BracketLean`. | *shipped #792* |
| **3 — the declaration's storage** ✅ | `decks.declared_bracket` and `deck_versions.declared_bracket`, both check-constrained; the copy at commit, gated on the version's own permits; `permits` stored sorted; `probe:declaration`. | *shipped #797 #801 #802 #803 #809* |
| **3b — the declaration's write path** ✅ | The server action and its refusal rules — never defaulted, never inferred, no skip. Shipped #821 as `declarationRefusal` plus `declareBracket`; `probe:declaration` still cannot call it, and now says *that* rather than that the action is absent. | — |
| **4a — the verdict head** ✅ | The permitted range, the bracket chips, the sub-line and the population line, plus `BracketMark`. **This establishes Round 2's chrome** — rounds 3 and 4 sit inside it. Shipped #851. | *shipped* |
| **4b — the climb** ✅ | "Where you sit, and what moves you": the three rungs, their marks at 22/26/36, the drop sentence from `upgradePath`, and the declare rung. Renders inside 4a's chrome. Shipped #853. | *shipped* |
| **4c — the findings and their receipt** ✅ | The five findings — tiles at desktop, rows at 390, three states — and the card-list body of the receipt modal. **Split out of 4b during the run**, because a present finding's control OPENS: "the climb states, the findings open" is the handoff's own rule, so findings without their modal are either a dead affordance or a state the design does not draw. PR 6's combo body then lands in this chrome rather than beside it. **Both bodies shipped here** — the card list and the combo, by the 2026-09-22 scope ruling — plus the provenance panel and the tutor glyph. PR 6 keeps the lean and the reasoning body. See `gap-report-deck-findings.md`. | 4b |
| **5 — the declaration ask and sub-line** ✅ | The readings that survive the 2026-09-21 ruling, plus `permits: [4]`, which draws no line. No skip, no "you said". Shipped #862. | *shipped* |
| **6 — the lean and the reasoning modal** ✅ | The lean line, the modal body, the command-zone `found by` reading, and image resolution **at the draw** rather than in the profile. Mana drawn **as a state** — pips above zero, "No mana needed" at zero — plus the notable-prerequisites line. **Its combo body lands inside 4c's modal chrome**, so it waits on 4c rather than on 4b. **Shipped with 4c's chrome shared**: the reasoning is `ModalChrome` with a third body, 700px on `--elevated`. The combo's mana state and prerequisites landed in 4c's combo body, so this row is the lean, the reasoning body and the command-zone reading. See `gap-report-deck-lean.md`. | 0, 2, **4c** |
| **7 — the drift row** ✅ | What survives of drift once the "you said" framing is gone — the permitted side can be a single bracket, which needs a reading. Shipped #866 as §E's version comparison. | *shipped* |
| **8a — the facts payload** ✅ | The profile threaded into the builder shell and the top-off list, and a BATCHED `CandidateFacts` read for the whole pool. Measured above; Round 4's own list does not contain it. | — |
| **8b — the card note, on the deck's own add surfaces** | The note atom at two densities — the sentence on the top-off row, the clause on the Consider tile — its copy module, and the pure rule that picks which sentence a candidate draws. **The push line this row used to name is withdrawn**; see below. | 8a |
| **8b-ii — the marks the note leans on** | §C2's three fact glyphs on the Consider tile and the top-off row, the key that glosses them and the lemniscate sub-project 3 left unglossed, and the mass-land-denial note restated as a CONSEQUENCE. Asked for by Hugh against the shipped tile; both questions were real omissions. | 8b |
| **8c — the card note on the quick-add row** | The search action's own facts read, and the note on the search result row. A different payload question from 8b's: the two deck-page hosts are fed by 8a's batched pool read, and the quick-add row is fed by a live per-keystroke search that loads no facts at all. | 8b |
| **9 — the upgrade path** ✅ | Candidate sets, never a pick; the `blocked` reading. Shipped #867, on the climb's lower rung. | *shipped* |

## Where this stands — 2026-09-22

**Tier B's rules are done.** ✅ marks a row that shipped whole; ◐ marks one whose RULE has
shipped and whose RENDERING has not.

Every rule in this table is written, swept across each shape it can be asked about, and
mutation-proved: PR 0 (#820), 3b (#821), 1b (#825), 4a's `verdictHead` (#828), 8a (#830),
5's `declarationAsk` (#831), 6's `comboModal` (#832), 4b's `climb`/`findingState` (#833),
7's `versionComparison` (#834), and the mark's size rules (#835). `upgradePath` shipped in
Tier A. The bracket marks reached `public/` in #837 and the `--bracket-1…5` palette in #838.

**4a and 4b shipped on 2026-09-22** as #851 and #853, and the row count is now SIXTEEN: the
findings were split out of 4b as 4c, and 8b was split into 8b and 8c, each for the reason its own
row gives. **5, 7 and 9 shipped the same day** as #862, #866 and #867 — see *What 5, 7 and 9
settled* below — beside 4c and 6, which shipped in parallel as #863 and #865. 8b and 8b-ii
shipped too, as #854 and #859, though their rows above carry no mark. **8c is the one row still
open**, and it wants the design-review property-table pass, a probe and a contact sheet like the
rest.

---

## Row 8b is the CARD NOTE, not the push line — 2026-09-22

**This row was written on 2026-09-20 and the premise under it was withdrawn on 2026-09-21.** The
2026-09-21 revision moved four boundaries and recorded that `8a`/`8b` were "unchanged by this
revision", which was true of their *boundary* and not of what 8b draws. Correcting it here rather
than building the withdrawn surface.

**What was withdrawn.** §4.1 of Round 4's brief said the push line fires at the moment of an add.
Hugh ruled that a deck's standing is determined **only on ask or on commit**, so a per-add sentence
about the deck can only recompute what the ruling says is not recomputed, or quote a reading from
four edits ago as current. `design_handoff_the99_push_line/READINESS.md` puts it in the engineering
list as an exclusion: **"Not in the list: `bracketDelta` on any add surface."**
`READINESS-r3-audit.md` is Green on the withdrawal.

**What replaces it, in the same slot, on the same hosts, at the same two densities: the card
note.** It states what the CARD is and what the RULES say about that kind, never the deck's
standing. It needs the declaration, the candidate's facts and a count of a kind in the current
list — no `buildDeckProfile`, no `bracketDelta`. It is strictly more often useful than what it
replaces: the push line spoke only on a transition, and the note speaks whenever the card carries
a fact.

**8a is the proof this is the right reading of the row.** Its payload is `loadCandidateFacts`,
whose five facts are exactly the note's five, and its own PR body says so: *"Round 4's card note
draws these, and it cannot be built against a loader nothing calls."* The comment it left in
`src/app/decks/[id]/page.tsx` names 8b's job as threading a facts-bearing suggestion type through
the client components **when it draws the note**.

**`push-line - copy strings.ts` is therefore NOT transcribed by 8b.** Its destinations
(`src/lib/copy/bracket-delta.ts`, `upgrade-path.ts`) are the *verdict's* vocabulary now — Design
kept the file for that reason — so those strings land with the surfaces that explain a determined
verdict: 4b and PR 9. Transcribing them here would ship a fourth copy module nothing calls, which
is the dead-payload shape this run has closed three times.

**Round 4's copy defects split with the modules.** `ERRATA-eng.md` assigns them per module, not per
round. Defect 2 (the `@/lib/copy/shared` import, in both modules) is applied to the card-note module
by 8b. Defects 1 and 3 live **entirely** in that module's `verdictBlock` export — the `analyse`
spelling is the trigger's and the `21 Sept` stamp is the committed verdict's provenance — so they
travel to whichever PR draws the verdict block. Defect 1's three production-final strings are in
any case **already correct on `main`**: `deck-analysis.ts` shipped `Analyze this deck` and
`Analyze again` in #828.

**What 8b-ii corrected, 2026-09-22.** 8b built §C's note matrix and not §C2's MARK matrix. The
three glyphs are specified on both add surfaces and drew on neither — `CardFactMark` rendered on
every surface showing a card you already have and none showing a card you are deciding to add —
so the words carried the whole load where the glyph was meant to lead. Neither surface had a KEY
either, which made the lemniscate `ComboClause` has drawn since sub-project 3 a wordless mark
with nothing glossing it: the exact failure the deck-status marks were retired in a day for.

And the note's mass-land-denial sentence now states the CONSEQUENCE — *"Nothing below Optimized
allows it"*. That is not the withdrawn push line: MLD is forbidden outright at 1, 2 and 3, so
where the card puts you needs no verdict and no count. It does not generalise, and is not
applied to the other two — extra turns are counted at bracket 1 alone, and a game changer's
consequence depends on the count, which IS the verdict the ruling removed.

**One ruling 8b makes, and it belongs here rather than in a component:** state n8, *"This completes
A + B, a two-card infinite"*, is **not drawn**. Sub-project 3 shipped the same statement on the
same two rows first, as `comboAwarenessCopy.clause.completes` with a glyph and a key entry, and
both hosts already render it (`consider-combo.test.tsx`, `top-off-combo.test.tsx`). Two sentences
about one combo on one row is a defect, and the shipped one is the shorter of the two and is
glossed. The string is still transcribed, and says in its own comment what draws the fact instead.

**Two things the rendering inherits, both measured rather than assumed:**

1. **The marks ink with `currentColor`.** An `<img src="/brackets/…svg">` renders every mark
   black — an external SVG resolves `currentColor` against its own root, so the page's
   `--bracket-N` never reaches it. The markup looks correct and nothing errors.
2. **A CSS `mask-image` fixes the colour and breaks the numeral.** These files carry a
   `<text>` numeral at `font-family="Cinzel,serif"`, and an external SVG cannot load the
   page's webfont. Invisible at the 22px chip, which `ASSETS.md` calls decorative — but the
   full mark ships at 26/36/44, where it reads. Inline the SVG, or mask the art and draw the
   numeral as HTML text, which is what the handoff's "the numeral inside the mark is text"
   appears to intend. Open, and it wants a probe reading the numeral's *resolved*
   font-family: every wrong answer here renders a plausible-looking mark.

**One open question for Design**, not blocking. `HANDOFF.md` states every rung clears 4.5:1,
and §2 reasons it out — *"the numeral inside the mark is text, so every rung owes 4.5:1 … it
cannot be made quiet by being made darker."* On the four grounds the card mark's own gate
names, `--bracket-1` (#8A857C) fails two: kaldheim `--surface` at 4.4768 and kaldheim
`--elevated-hover` at 4.3204. #838 ships the palette as drawn and gates it at the *measured*
floor, so nothing silently claims 4.5 and any regression fails.

**That ground list is provisional**, and this is the plan's business rather than a footnote:
nothing draws the mark yet, so the honest claim today is about the grounds a comparable mark
uses. Whichever of these PRs first renders a `BracketMark` decides the real list — and if it
lands on `--elevated`, where rank 1 reads 3.6857 on kaldheim, the shortfall gets worse rather
than better. Re-measure there; do not inherit this figure.

---

**PRs 1, 2 and 3 have shipped** — 3 as storage only; see 3b.

**PR 4a is the critical path** — rounds 3 and 4 sit inside the chrome it establishes — and it
carried two gates. **Both are discharged**: PR 1b's tab shipped in #825, and Round 2's readiness
audit was re-run 2026-09-21 and came back Green (#816). What remains of 4a is its rendering; the
`verdictHead` rule shipped in #828. That audit had been the only one never revisited until
2026-09-21, and it carries twelve errata engineering was told to fold in — twelve, not eleven: R1's list numbers
1–10, then 12 and 13, and every summary of it since has repeated the wrong count.

**RE-AUDITED 2026-09-21, and the result is 🟢 Green.** The audit is
`design/design_handoff_the99_verdict/READINESS-r2-audit.md`, **merged in #816** and on `main`. Five errata
are resolved, one is retired by the 16px mark ruling, one is stale as written (the `MarkKey`
prop claim — the key split in two in #776), and the five that remain are engineering's to carry
at build time. Nothing needs Design.

**One claim this plan made about that audit was false and is corrected here.** It said R1
predates the 3-vs-4 boundary resolving. It does not: R1 is dated 2026-09-20, the same day as
the ruling, and its §2 covers it explicitly — concluding *"nothing in this package needs
redrawing"*. `permitsFor` shipping without `[3,4]` is the package's own expectation. The
re-audit was still worth running; the reason given for it was not.

PR 5, 6, 7 and 9's RENDERING waited on 4a's, which shipped in #851. **PR 6 now waits on 4c**
rather than on 4b: 4b is the climb, which opens nothing, and the modal chrome PR 6's combo body
renders into arrives with the findings. PR 0 is no longer a gate on anything — it shipped in #820.

---

## PR 1b's decision: the tab has no address, and the profile is expensive

**`BuilderTabs` is client state.** `builder-view.ts` says so in its own header — switching tabs is
not a navigation, because making it one would push a history entry per click, and **nothing in the
app produces a `?tab=` URL**; the page reads the parameter on arrival only. So the obvious shape —
a route loader that fetches the profile when the Analysis tab is active — **cannot work**: no
navigation happens when the reader presses the tab, and the loader never re-runs.

That leaves three shapes. PR 1 shipped without picking one — it reads no profile at all — so
this is **PR 1b's** to implement deliberately rather than discover:

1. **Fetch on the server, unconditionally**, adding `cachedDeckProfile` to the deck page's
   existing `Promise.all`. Simple, and **every deck visit pays the profile's cost whether or not
   the reader opens Analysis** — which is the regression the deck page's own cache exists to
   prevent.
2. **Give Analysis a real route segment.** Round 0 argued for a tab partly on the grounds that a
   collapsed section is "a tab with worse ergonomics and **no address**", so an address is
   something the frame already wants. Costs a navigation per tab press unless the segment is
   nested so the shell persists.
3. **Fetch on demand from the client** when the tab is first pressed, through a server action or
   route handler, cached in component state for the visit — the pattern
   `useDiscoveryCache` already establishes for a list a reader flips between.

**Recommendation: 3, unless the measurement below says the profile is cheap enough for 1.** It
keeps the tab free for every reader who never opens it, needs no new route, and the repo already
has the caching convention for it.

---

## What each PR must prove

**PR 0.** `check:spellbook` asserts the four new fields against the LIVE feed, and the ingest
refuses on a per-field collapse floor the way it already does for the others — a widening that
silently stores nulls is indistinguishable from an upstream that stopped sending them.

**Sample the feed from more than its head.** Measured 2026-09-21 across 347 variants drawn from
the head plus two mid-file slices. Upstream's field names are not the column names: its
`description` is the `steps` column, and its `manaNeeded` / `manaValueNeeded` / 
`notablePrerequisites` keep theirs. `description` is set on 100% (avg 395 chars, max 754),
`manaNeeded` on 41%, `notablePrerequisites` on 64%. The first 52 records report `manaNeeded` on
**2 of 52**, which reads as broken upstream data and nearly cost the modal its mana line. It is not
missing: `manaValueNeeded > 0` agrees with `manaNeeded` on exactly the same 41%, so the other
59% genuinely need **no mana to execute**, and that zero is a fact worth drawing rather than a
gap to hide.

**PR 1b.** The probe presses the tab rather than visiting a URL — the reason the card mark
shipped broken into Card view is that the probe swept by URL and the surface was reached by a
press. `scripts/probe-analysis-tab.mjs` already does this and already asserts the strip's move
("the strip has LEFT the spine", "exactly one mix strip exists"); PR 1 shipped it. **PR 1b moves
no strip**, so that requirement has no subject in its diff and must not be rebuilt there — it
is listed here only so a reader does not conclude it was dropped.

What PR 1b owes is two assertions the existing probe cannot make, because PR 1 loads no profile:

**It retires the cache with an input the FINGERPRINT ACTUALLY READS.** `profileFingerprint`
deliberately excludes `auto` and takes no deck name, so "edit the deck" is not a proof — a
rename or a fill can leave the fingerprint byte-identical while the cache is working perfectly,
and the check would pass either way. Change a card's quantity or a commander, and assert the
second read differs from the first.

**NOT the declaration.** It was removed from the fingerprint deliberately (#797) because the
profile does not read it — `fingerprint.ts` lists it under "What is OUT" — so changing only
`declared_bracket` cannot move the key. Requiring it to would make this proof impossible, and
"fixing" that by putting the declaration back in the fingerprint would couple a one-column
write to a full profile rebuild, which is the 630ms the whole on-demand shape exists to avoid.

**And the profile is NOT fetched for a reader who never presses the tab.** That is the whole
reason shape 3 was chosen, and a check proving only that the tab works passes just as happily on
the shape that costs every deck visit a profile build.

**PR 2.** Pure unit tests, mutation-proved. The deciding-combo rule reuses `comboLandsEarly`'s
per-combo predicate rather than a second copy of it.

**PR 3 — storage. SHIPPED.** `probe:declaration` against a real Postgres, with this repo's
fixture discipline — a per-run `user_id` deleted in a `finally`, pointed at `local-dev` or a
scratch branch, never production. The facts no unit test can reach, all of them about what the
transaction WROTE: a declaration inside the committed version's permits is carried into it; one
the version's own cards do not permit is not; **the version's copy never moves afterwards**; a
commit with no snapshot records neither column; and the check constraint refuses anything but
1–5 or null on both tables.

**PR 3b — the write path. SHIPPED #821**, and the refusal rules are what it shipped. They outrank
the write: the app must never default a declaration and never infer one. **No skip case, because
there is no skip.** `declarationRefusal` is the pure rule — out-of-range, no-choice, not-permitted
— and `declareBracket` in `src/app/decks/declaration-actions.ts` is the thin action over it,
guarded on a uuid and on `slotDeck(profile).permits`, exporting no clear and no skip.

**`probe:declaration` still cannot call it**, and its header now says *that* rather than saying no
action exists. What it proves is the STORAGE: a declaration inside the committed version's permits
is carried into it, one the version's cards do not permit is not, and the check constraint refuses
anything but 1–5 or null on both tables. The action-level refusals are unit-tested instead, which
is where a pure rule belongs — the gap a probe would close is whether a request reaches the action
at all, and nothing draws a declaration yet to make that request.

**PRs 4a–6.** Both widths in the same PR, per the standing rule. A contact-sheet inventory, and
`check:shared` where two routes are meant to carry the same control.

---

## Risks and open questions

**R1 — drift has undrawn shapes, and one sentence is wrong (blocks PR 7).** `permitsFor` returns
`[1,2] | [2] | [3] | [4] | [4,5]`, and `declaredOutsidePermits` is plain set membership, so a
deck tuned DOWN out of its declared range reads "moved this deck past that" — false. Design owes
the sentence and the single-bracket layout. Recorded in `READINESS-r1-audit.md` on PR #773.
**PR 7 is the only thing this blocks.** No SURFACE in PRs 0–6 reads `declared` against
`permits` — but one shipped writer already does, and it is not a counter-example: `commitVersion`
compares them to decide whether a version records the declaration at all, and that comparison
has no sentence attached to it. The drift row is about the sentence.

**R2 — the ask and the lean cannot co-occur, and Round 3's flagship frames draw them together.**
The ask needs a permitted range; `leanFor` returns null unless `permits.length === 1`. Resolved
in the audit as an engineering correction rather than a design round, but **PR 5 must not
reproduce frames 1e/1f as drawn** — they are states the code cannot produce.

**R3 — the synopsis slot has no content design.** Round 0 drew the slot and its absent, stale and
refused readings; what the sentences may claim, their length and their accept contract belong to
sub-project 6. **PR 1b** builds the slot and its three empty readings and **ships no sentence**.
`commander_support.prose` is the precedent for the null state.

**R4 — `permits: [4]` is young.** The 3-vs-4 boundary was ruled to resolve on 2026-09-20 and
`[3,4]` no longer exists. Every surface here must read correctly with one or two brackets on
either side, and any copy or table still carrying `[3,4]` is stale.

**R5 — five rounds, one About bump.** No PR here writes an About entry. The line's entries are
written once at launch (PR #770). A plan task at close-out carries the entry and the
`ABOUT_VERSION` bump; `feature-acceptance` does not pass without them.

**R6 — the modal draws a field Round 2 never asked for.** `notablePrerequisites` is set on 64%
of variants and is the line that tells a player whether a combo works in *their* deck ("You
control at least five creatures with different powers"). Ruled 2026-09-21 to be drawn. It needs
a slot, and that slot is settled in **Round 2's re-audit** rather than a Design round — same
modal, one more line, which is the threshold for an engineering call.

**R7 — the mana line is a state, not a figure.** 59% of variants need no mana at all. Drawn as
a cost the slot is empty on most combos; drawn as a state the zero becomes the most informative
thing in the modal, because a free combo is the scarier one. No surface here may render a blank
where the answer is "none".

---

## Measured, 2026-09-21 — and it decides PR 1b's shape

`pnpm measure:profile-cost` against **staging**, on the real decks:

| | |
|---|---|
| median cold build | **630ms**, over **all 20 decks** |
| slowest | **1.8–2.2s**, varying with compute warmth |
| fastest | 559ms |
| head read alone | ~120ms |

Over every deck rather than a sample, and sized by `sum(quantity)` rather than a row count —
both corrections from review. Cost depends on combos, staples and the collection as well as
list length, so a sample ordered by size is the one sample guaranteed not to contain the
slowest deck.

**So the profile is fetched ON DEMAND, when the tab is pressed** — option 3 above, not option 1.
PR 1 shipped the tab without it, so this became **PR 1b's** decision to implement rather than
PR 1's to make. **Implemented in #825**: `src/app/decks/profile-actions.ts` calls
`cachedDeckProfile` from a press, deck-keyed and behind a generation token, and the panel draws
its own idle, loading, failed and ready readings.

**#825 is the first SURFACE consumer, not the first caller** — a distinction worth keeping,
because two server-side callers arrived alongside it and a flat "first caller" claim is already
wrong: `declaration-actions.ts:68` reads the profile for `slotDeck(profile).permits` before it
will accept a declaration, and `actions.ts` reads it to snapshot the permits onto a committed
version. Before all three the loader had been written and left with nothing calling it at all —
one of three dead payloads this round found and closed.
Adding half a second to three seconds to every `/decks/<id>` load, for a tab most visits never
open, is precisely the regression the decklist's own cache exists to prevent. The figure also
retires the idea that the head read is the expensive half: it is a fifth of the cost, and it is
the only part that has to run before the cache can be consulted.

Not measured, and stated rather than implied: a WARM `cachedDeckProfile` hit. That path is
`cacheForUser`, which needs a request context, so a script calling it would either throw or run
two cold builds and report the second as a cache. The warm cost is the cache layer's, not this
gather's.

---

## Measured, 2026-09-21 — what a row of push-line facts costs

`pnpm measure:facts-cost` against **staging**, on the two biggest real decks:

| | |
|---|---|
| the profile, cold | 0.9–1.9s (the floor, paid once) |
| `completesCombos` for a **480-candidate pool, one statement** | **177–192ms** |
| the same, candidate by candidate | ~195ms each → **91–95s** |

**One statement is 480–540× cheaper than a query per candidate**, so the facts payload is a
batched read or it is not shippable. That settles the shape of the PR that Round 4's own
engineering list does not contain: every two-card variant with exactly one piece already in the
deck and the other among the candidates, expressed as a set rather than as a diff of two runs
per candidate.

The other three flags — game changer, mass land denial, extra turn — are column reads on `cards`
and a flags table the profile already loads. They are not the question.

**The measurement seeds the pool with real completions first**, because a pool of arbitrary
catalog cards matches nothing and an empty match is cheaper than a real one. Its first version
did exactly that and reported `0 completions` beside its timing — pricing the empty case under a
heading claiming it priced the real one.

---

## The 2026-09-21 rulings, first batch

Three, all from Hugh, and they simplify this surface rather than growing it.

**1. The tab ships behind `ANALYSIS_TAB_ENABLED`, and so does the mix strip's move.** Read server-side at request time and passed
down as a prop — never `NEXT_PUBLIC_*`, so there is no build-time inlining and no rebuild to flip
it. **Defaults off when unset**, so production is unaffected until the variable is set
deliberately. It gates the LOADER as well as the tab: a hidden tab whose payload still loads is
the worst of both. Set on the staging Vercel project first; until then the tab is dark
everywhere, which is a thing to say out loud when PR 1 lands rather than discover.
(PR 1 has landed; `docs/superpowers/runbooks/informed-building-production.md` is the operator's
copy of this step.)

The strip's move is gated by the SAME flag, because Round 0 pays for the tab with the ~150px the
`RoleCounterStrip` vacates — and an unconditional move would take that strip off the deck page in
production, where there is no tab to receive it. Flag off is today's layout exactly; flag on is
the drawn one. Two real states, both testable.

**2. A declaration belongs to a VERSION, and the "you said" framing is gone.** The copy asking a
player to *change what they said* is dropped entirely — it read as though the app were holding
them to a claim. Instead the choice travels with the version it was made for: *Version 1: 4/5
split, chose 4*; *Version 1: 3, no choice needed*.

Mechanically this is a pattern the schema already has. `deck_versions` captures
`commander_oracle_id` at commit while `decks.commander_oracle_id` holds the live value, and the
declaration works the same way: **live on `decks.declared_bracket` while drafting, copied into a
new `deck_versions.declared_bracket` at commit.** One column, one migration, no deletion.

**ANALYSIS RUNS BETWEEN VERSIONS, and that is a requirement rather than a side effect.** A player
moves cards around to see what it does to the bracket and commits afterwards, so the analysis
reads the DRAFT — `deck_cards` plus the live commander columns — exactly as `probe:bracket`
already pins ("the draft IS the deck"). A version is where a declaration is FROZEN, never a gate
on the analysis being available.

**3. There is no skip.** A declaration may be left unanswered; it may not be dismissed. That
retires the storage question the audit raised — `declared_bracket`'s null means *unanswered* and
needs to mean nothing else — and removes the skip control from every drawn state.

**What this does to the Orange.** The drift row was escalated to Design because a deck tuned DOWN
out of its declared range read *"moved this deck past that"*, which is false in that direction.
With the "you said" framing dropped, **there is no stale claim to reconcile and the drift row as
drawn largely goes with it** — a version holds the answer that was true for it, and the draft
shows the current analysis. What survives is smaller and still owed: the permitted side can be a
single bracket, which needs a reading. `docs/superpowers/design-briefs/2026-09-21-declaration-drift-addendum.md`
carries the correction.

---

## The 2026-09-21 rulings, second batch

Five, settled after two plan reviews — one read by the author, one cold. Three of them move PR
boundaries; ruling 7 is a drawing decision settled inside Round 2's re-audit rather than in a
design round, and ruling 8 is a verification note about sub-project 2 that moves no boundary
here at all. None of the five needed a design round, which is why all five are recorded here.

**4. The combo payload is widened before the verdict block.** Round 2's reasoning modal specifies
a combo's mana and Spellbook's execution steps; `spellbook_variants` stores neither. The round's
own audit called this "the one erratum that can move the PR boundaries" and asked for it to be
sized before the surface was planned — and it was planned anyway. **PR 0** is that widening, and
PR 6 is blocked on it. See R7 for what the mana field turned out to be, and the sampling trap
that nearly hid it.

**5. Round 2's readiness audit is re-run before PR 4a starts.** DONE, 2026-09-21, verdict
🟢 Green — `READINESS-r2-audit.md`. It was the only round's audit never revisited, and PR 4a
is the biggest build in the epic, so starting it from an unchecked reading was the expensive
version of saving a cycle.

**The reason this plan gave for ordering it was wrong**, and the re-audit says so in its own
first section: R1 does not predate the 3-vs-4 ruling. What the pass actually found was worth the
cycle anyway — a stale `MarkKey` claim that would have cost a build round, twelve errata rather
than eleven, and five items already resolved that nobody had struck off.

**6. PR 1's unowned work becomes PR 1b, ahead of the verdict block.** PR 1 shipped the tab, the
flag and the mix strip's move, and deliberately read no profile — so the on-demand fetch, the
tab's empty/loading/failed readings and the synopsis slot had no owner. They land together,
before PR 4a, so the verdict block renders into a tab that already loads and PR 4 stays about
the verdict — which is itself split into 4a and 4b for the same reason.

**7. The modal draws mana as a state and adds the prerequisites.** R7 and R6 carry the reasoning
and the figures.

**8. Informed building is verified on staging in parallel, not as a gate.** Sub-project 2 shipped
while staging's index was unbuilt, so it had only ever run against the flat fallback. Staging
rebuilt 2026-09-21: every one of 20 real decks now resolves to measured role targets (19 at the
commander rung, 1 at the pair), and 18 of 20 moved off the flat 37/36 land count. Wipes fall to
**zero** on 7 of the 20 — the most visible behaviour change, and the one to look at first. The
measurement is recorded; the walk-through happens alongside Tier B rather than blocking it.

---

## What 4a and 4b settled — 2026-09-22

**The mark's drawing, and it needed a third mechanic nobody had named.** The ruling was "mask the
art, draw the numeral as HTML text", which fixes the `<img>`-renders-black problem and the
webfont-in-an-external-SVG problem. It leaves a third: a CSS mask uses the file's ALPHA, and the
files carry their numeral as opaque `<text>` — so the masked serif numeral survives underneath the
Cinzel one, in the same ink, as a doubled digit. `BracketMark` subtracts it with a second mask
layer: a hard-edged disc at 35% of `closest-side`, which is 7 of the 40 viewBox units. The numeral
is drawn at `font-size` 16 and fits inside it; the nearest ornament to the centre is an inner
diamond whose EDGE passes at 11.5/√2 ≈ 8.13 units, so nothing any of the ten files draws crosses
it.

**The contrast ground, measured rather than inherited — and the handoff was right.** Its twelve
grounds are `--surface-inset` and `--surface-sunken` across six themes, and rank 1 clears 4.5:1 on
all twelve. `--surface` is a THIRTEENTH ground the verdict block introduces, where rank 1 reads
**4.4768** on kaldheim: short by 0.0232, on one theme. Design's to settle, and it is a palette
question rather than a hex typo — a one-step lightening clears `--surface` and still fails
`--surface-raised`, so the real question is which grounds a bracket mark may sit on. A second item
joins it: a range's upper mark draws at `opacity: 0.45`, where rank 2 reads 2.2533–2.3116 and rank
5 reads 3.9807–4.0928. Not a WCAG failure — the bracket's name is full-contrast text directly
above — but recorded rather than left implied.

**Two readings the canvas never drew.** `[4]` arrives with `violatesB3` FALSE, so nothing at
bracket 3 was violated and a "what ruled the one below out" sentence built from violations would
be empty on a real deck; `verdictSubLine` gives it an `assembled` reading in Design's own
`singleExact` slot. And the absent population line is specified in `STATES-verdict.md` §E and the
copy file and drawn nowhere.

**What each gate actually caught, which is worth keeping for the rounds still to come:**

- **The design-review verify pass** — 13 gaps across the two PRs, all mechanical, mostly one root
  cause: the phone column was never split out of the desktop values.
- **The contact sheet** — two defects no property table could see, because the property was right
  and the CONDITION was wrong. The declare rung fired on the upper rung of ANY range, so a `[1,2]`
  deck read "Four and five share their card limits" at bracket 2; and a rung holding nothing fell
  back to the rung ABOVE's sentence, so a clean deck drew it twice, one under the other.
- **The pre-open pass** — six, including two tests of this feature's own rules that measured
  nothing, and one arithmetic bug that every other gate passed over: the climb derived its
  allowance from the CUTTABLE pool, which `upgradePath` filters commanders out of, so a deck with
  four game changers one of them its commander read "only two allowed at Upgraded" where Upgraded
  allows three.
- **The full test suite** — one regression the targeted runs missed: the climb's fact mark trips
  `fact-mark-parity`, which requires every `CardFactMark` mount to carry its hover. The climb's
  figure meets that guard's own exemption criterion — the rule's name is the next element — and a
  tooltip trigger would make the climb interactive, which its first build guardrail forbids.

**One design-table drift is carried rather than fixed.** The package ships `dropCut(n, rule)` —
*"Cut {n} {rule}, only {n} fewer allowed"* — which uses one parameter for both the cut and the
allowance and so cannot state them both, and `dropCutNamed(card, why)`, whose separator is an em
dash this repo's shipping strings do not carry. `check:copy-drift` is green because the table
quotes a form the code NEVER emitted rather than one it stopped emitting, which is the case that
check cannot see by construction.

---

## What 5, 7 and 9 settled — 2026-09-22

**The declaration's answer has one owner, and it earned that in review.** `useDeclaration` holds
it for the whole shell, because the card note on Consider and the top-off list read the same value
the verdict block draws. Two review rounds went on it, and each finding was real. The state is
keyed on the deck, because the shell survives a route change and two decks can hold the same
stored answer. The writes are SERIALIZED: two presses sent at once could commit in either order
and leave the column behind the screen. A superseded success still counts as confirmed, so a later
refusal restores to what the column holds. And `for version n` is named only when that version
RECORDED the answer on screen: a deck answered after its commit carries the answer on its draft.
The action's revalidation moved into `after()`, because inline it shipped the deck page back in
the action's reply: 112,778 bytes against 90.

**One ask per surface.** The ringed `?` retired from both the verdict's sub-line and the climb's
4–5 rung, and the rung now points at the block above. `verdictHead` resolves the face from an
answer, and refuses an answer that is outside the range or given on a single bracket, so no
component compares a declaration with `permits` itself.

**§E wins over §A5 by running first.** A commit refuses to copy a declaration its cards do not
permit, so after one both the version row and the drift line are true. The row's branch comes
first and the line never draws beside it. `versionComparison` gained `changed`: a predecessor
that recorded nothing is "unrecorded", which is not "different", so it draws no row.

**The upgrade path is a disclosure, which the climb's "nothing opens" rule now names as its one
exception.** Round 4's audits place it on the lower rung. It expands in place and opens no sheet.
`CoverageDisclosure` was NOT moved out of `commanders/` for it, although two audits said to: its
copy, its count and its cap all describe role coverage. Its targets are every bracket below the
reading's FLOOR, so u6 ("nothing would have to go") is built and tested but cannot be reached
from the rung.

**The pre-open pass earned its keep on 9.** It found seven defects, all real. Among them: a
commander offered as a combo half to cut, beside a sentence saying either half would do. A
shortfall sentence that assumed one commander, when partner commanders can both be game changers.
And a nearest-target count that counted a card in two items twice.

**That count then went three review rounds and was removed, which is the useful lesson.** "The
fewest cards that answer every line" is a set-cover problem. The sum over-counted, an exact solver
with a size cap overstated past the cap, and an uncapped exact solver is exponential in the number
of combos on a render path. Each finding was right. The nearest line now counts THINGS: the figure
the heading prints once that target is pressed, exact by definition and free to compute. Round 1
also found that at Upgraded two different rules put a combo on the list (a loop of extra turns,
and an assembled combo), so `upgradePath` carries a per-combo `reason`.

**Contrast outranked a drawing once.** The declaration canvas draws the superseded mark at 0.45.
The verdict addendum's ruling 3 (#861) holds every bracket mark at 3:1 as a graphic, so it ships
at `DIM_OPACITY` and the row's upper range member does too. Declined in review, and recorded in
#862's `## Settled`.

