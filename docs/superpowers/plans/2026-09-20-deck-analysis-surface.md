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
| **4a — the verdict head** ◐ | The permitted range, the bracket chips, and the population line. **This establishes Round 2's chrome** — rounds 3 and 4 sit inside it, so it is the one every later surface renders into. | 1b, **Round 2 re-audit** |
| **4b — limits and violations** ◐ | The three limits tables and the violations list with their receipts. Renders inside 4a's chrome. | 4a |
| **5 — the declaration ask and sub-line** ◐ | The readings that survive the 2026-09-21 ruling, plus `permits: [4]`, which draws no line. No skip, no "you said". | 3b, 4a |
| **6 — the lean and the reasoning modal** ◐ | The lean line, the modal body, the command-zone `found by` reading, and image resolution **at the draw** rather than in the profile. Mana drawn **as a state** — pips above zero, "No mana needed" at zero — plus the notable-prerequisites line. | 0, 2, 4b |
| **7 — the drift row** ◐ | What survives of drift once the "you said" framing is gone — the permitted side can be a single bracket, which needs a reading. | 4a |
| **8a — the facts payload** ✅ | The profile threaded into the builder shell and the top-off list, and a BATCHED `CandidateFacts` read for the whole pool. Measured above; Round 4's own list does not contain it. | — |
| **8b — the push line** | The atom at two densities, on the quick-add row, the Consider tile and the top-off row. | 8a |
| **9 — the upgrade path** ◐ | Candidate sets, never a pick; the `blocked` reading. | Round 4 design |

## Where this stands — 2026-09-22

**Tier B's rules are done.** ✅ marks a row that shipped whole; ◐ marks one whose RULE has
shipped and whose RENDERING has not.

Every rule in this table is written, swept across each shape it can be asked about, and
mutation-proved: PR 0 (#820), 3b (#821), 1b (#825), 4a's `verdictHead` (#828), 8a (#830),
5's `declarationAsk` (#831), 6's `comboModal` (#832), 4b's `climb`/`findingState` (#833),
7's `versionComparison` (#834), and the mark's size rules (#835). `upgradePath` shipped in
Tier A. The bracket marks reached `public/` in #837 and the `--bracket-1…5` palette in #838.

**What remains is rendering** — the component halves of 4a, 4b, 5, 6, 7 and 9, plus PR 8b,
which carries Round 4's three copy defects when it transcribes that module. Each wants the
design-review property-table pass, a probe and a contact sheet, so they are build work rather
than the tail of a rules run.

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
`verdictHead` rule shipped in #828. That audit is the only one never revisited: it
carries twelve errata engineering was told to fold in — twelve, not eleven: R1's list numbers
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

PR 4b, 5 and 6's RENDERING waits on 4a's; PR 6's additionally waits on 4b's. PR 0 is no longer a
gate on anything — it shipped in #820.

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
its own idle, loading, failed and ready readings. The loader had been written and left with no
caller in the app — one of three dead payloads this round found and closed.
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
