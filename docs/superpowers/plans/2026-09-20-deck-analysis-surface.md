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
| Round 3 — the declaration | audited 🟠 Orange, PR #773; one Design question open |
| Round 4 — the push line and the upgrade path | brief written (#774); **not yet drawn** |

---

## Architecture

**Read-only, except one write.** Everything on this tab is a pure function over a profile the
loader already builds. The single exception is the declaration — the first thing on this surface
a player can change and the first thing the app remembers.

**`cachedDeckProfile` is the entry point, and this is what proves it.** Its own doc comment says
no shipped route calls it yet, and names the first Tier B consumer as the proof of
stamp-retirement end to end. PR 1 is that consumer: the head is one cheap read outside the cache,
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

Named before implementation starts, per the repo's split rule. Eleven PRs; none over ~20 files.

**Revised 2026-09-21** after two plan reviews and five rulings. Two PRs were added — a combo
ingest widening and a **PR 1b** — because PR 1 shipped deliberately narrower than this table
described, and because the reasoning modal specifies two columns the database does not have.

| PR | What | Blocked by |
|---|---|---|
| **0 — the combo payload** | `spellbook_variants` gains `mana_needed`, `mana_value_needed`, `steps` and `notable_prerequisites`; `db:seed:combos` ingests them, `check:spellbook` asserts them, `ComboRef` carries them. No UI. **The modal cannot be built before this.** | — |
| **1 — the tab** ✅ | The Analysis tab, its flag and the mix strip moved in. **Shipped reading no profile** — see PR 1b. | *shipped* |
| **1b — the payload and the tab's states** | `cachedDeckProfile` reached from the surface (shape 3 below), the empty / loading / refused readings, and the synopsis slot with no sentence. | 1 |
| **2 — receipts reshaped** ✅ | `lean.receipts[].tutors` keyed per piece; the deciding combo marked on `BracketLean`. | *shipped #792* |
| **3 — the declaration's write path** ✅ | The server action, its refusal rules, `deck_versions.declared_bracket` at commit, `probe:declaration`. | *shipped #797 #801 #802 #803 #809* |
| **4 — the verdict block** | Permitted range, the three limits tables, violations with receipts, the population line. **This IS Round 2's build** — the chrome rounds 3 and 4 sit inside. | 1b, **Round 2 re-audit** |
| **5 — the declaration ask and sub-line** | The readings that survive the 2026-09-21 ruling, plus `permits: [4]`, which draws no line. No skip, no "you said". | 3, 4 |
| **6 — the lean and the reasoning modal** | The lean line, the modal body, the command-zone `found by` reading, and image resolution **at the draw** rather than in the profile. Mana drawn **as a state** — pips above zero, "No mana needed" at zero — plus the notable-prerequisites line. | 0, 2, 4 |
| **7 — the drift row** | **HELD on Design** — see risks. | Design answer |
| **8a — the facts payload** | The profile threaded into the builder shell and the top-off list, and a BATCHED `CandidateFacts` read for the whole pool. Measured above; Round 4's own list does not contain it. | — |
| **8b — the push line** | The atom at two densities, on the quick-add row, the Consider tile and the top-off row. | 8a |
| **9 — the upgrade path** | Candidate sets, never a pick; the `blocked` reading. | Round 4 design |

**PRs 1, 2 and 3 have shipped.** What is unblocked today is **PR 0** and **PR 1b**, and they are
independent of each other: one widens an ingest, the other reaches a loader the app already has.

**PR 4 is the critical path** — rounds 3 and 4 sit inside the chrome it establishes — and it now
carries two gates rather than one. It needs PR 1b's tab to render into, and it needs **Round 2's
readiness audit re-run** (ruled 2026-09-21). That audit is the only one never revisited: it
predates the 3-vs-4 boundary resolving, marks being fixed at 16px, all five marks staying, and
the declaration coming off the cached profile — four rulings that change things underneath it —
and it carries eleven errata engineering was told to fold in, none of which has been checked
against the rulings since.

PRs 5 and 6 wait on PR 4; PR 6 additionally waits on PR 0.

---

## PR 1's first decision: the tab has no address, and the profile is expensive

**`BuilderTabs` is client state.** `builder-view.ts` says so in its own header — switching tabs is
not a navigation, because making it one would push a history entry per click, and **nothing in the
app produces a `?tab=` URL**; the page reads the parameter on arrival only. So the obvious shape —
a route loader that fetches the profile when the Analysis tab is active — **cannot work**: no
navigation happens when the reader presses the tab, and the loader never re-runs.

That leaves three shapes, and PR 1 has to pick one deliberately rather than discover it:

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
the head plus two mid-file slices: `description` is set on 100% (avg 395 chars, max 754),
`manaNeeded` on 41%, `notablePrerequisites` on 64%. The first 52 records report `manaNeeded` at
**3%**, which reads as broken upstream data and nearly cost the modal its mana line. It is not
missing: `manaValueNeeded > 0` agrees with `manaNeeded` on exactly the same 41%, so the other
59% genuinely need **no mana to execute**, and that zero is a fact worth drawing rather than a
gap to hide.

**PR 1b.** The probe presses the tab rather than visiting a URL — the reason the card mark
shipped broken into Card view is that the probe swept by URL and the surface was reached by a
press. It must read the mix strip in its NEW home and assert it is gone from the header, or the
move is invisible to every check.

And it must retire the cache with an input the FINGERPRINT ACTUALLY READS.
`profileFingerprint` deliberately excludes `auto` and takes no deck name, so "edit the deck"
is not a proof — a rename or a fill can leave the fingerprint byte-identical while the cache is
working perfectly, and the check would pass either way. Change a card's quantity, a commander, or
the declaration, and assert the second read differs from the first.

**PR 1b, continued.** It must retire the cache with an input the FINGERPRINT ACTUALLY READS
(the paragraph above), and assert the profile is **not** fetched for a reader who never presses
the tab — that is the whole reason shape 3 was chosen, and a check that only proves the tab
works passes on the shape that costs every deck visit a profile build.

**PR 2.** Pure unit tests, mutation-proved. The deciding-combo rule reuses `comboLandsEarly`'s
per-combo predicate rather than a second copy of it.

**PR 3.** `probe:declaration` against a real Postgres, with this repo's fixture discipline — a
per-run `user_id` deleted in a `finally`, pointed at `local-dev` or a scratch branch, never
production. Three facts no unit test can reach: a declaration survives a re-import and a
re-analysis; **it is captured into the version at commit and the version's copy never moves
afterwards**; and the column's check constraint refuses anything but 1–5 or null. **No skip
case** — there is no skip. **The refusal rules matter more than the write**: the app must never default or
infer a declaration, and a probe is what proves an action did not quietly write one.

**PRs 4–6.** Both widths in the same PR, per the standing rule. A contact-sheet inventory, and
`check:shared` where two routes are meant to carry the same control.

---

## Risks and open questions

**R1 — drift has undrawn shapes, and one sentence is wrong (blocks PR 7).** `permitsFor` returns
`[1,2] | [2] | [3] | [4] | [4,5]`, and `declaredOutsidePermits` is plain set membership, so a
deck tuned DOWN out of its declared range reads "moved this deck past that" — false. Design owes
the sentence and the single-bracket layout. Recorded in `READINESS-r1-audit.md` on PR #773.
**PR 7 is the only thing this blocks**; PRs 1–6 do not read `declared` against `permits`.

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
PR 1 shipped the tab without it, so this is now **PR 1b's** decision to implement rather than
PR 1's to make: `cachedDeckProfile` exists and today has no caller in the app.
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

Five, settled after two plan reviews — one read by the author, one cold. They move PR boundaries
rather than surfaces, which is why they are here and not in a design round.

**4. The combo payload is widened before the verdict block.** Round 2's reasoning modal specifies
a combo's mana and Spellbook's execution steps; `spellbook_variants` stores neither. The round's
own audit called this "the one erratum that can move the PR boundaries" and asked for it to be
sized before the surface was planned — and it was planned anyway. **PR 0** is that widening, and
PR 6 is blocked on it. See R7 for what the mana field turned out to be, and the sampling trap
that nearly hid it.

**5. Round 2's readiness audit is re-run before PR 4 starts.** It is the only round's audit never
revisited. Four rulings have landed underneath it and eleven errata sit unchecked against them.
PR 4 is the biggest build in the epic; starting it from a reading four rulings out of date is the
expensive version of saving a cycle.

**6. PR 1's unowned work becomes PR 1b, ahead of the verdict block.** PR 1 shipped the tab, the
flag and the mix strip's move, and deliberately read no profile — so the on-demand fetch, the
tab's empty/loading/failed readings and the synopsis slot had no owner. They land together,
before PR 4, so the verdict block renders into a tab that already loads and PR 4 stays about the
verdict. PR 4 busts the ~20-file split rule on its own; it does not also absorb this.

**7. The modal draws mana as a state and adds the prerequisites.** R7 and R6 carry the reasoning
and the figures.

**8. Informed building is verified on staging in parallel, not as a gate.** Sub-project 2 shipped
while staging's index was unbuilt, so it had only ever run against the flat fallback. Staging
rebuilt 2026-09-21: every one of 20 real decks now resolves to measured role targets (19 at the
commander rung, 1 at the pair), and 18 of 20 moved off the flat 37/36 land count. Wipes fall to
**zero** on 7 of the 20 — the most visible behaviour change, and the one to look at first. The
measurement is recorded; the walk-through happens alongside Tier B rather than blocking it.
