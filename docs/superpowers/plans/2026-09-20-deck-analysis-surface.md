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

Named before implementation starts, per the repo's split rule. Nine PRs; none over ~20 files.

| PR | What | Blocked by |
|---|---|---|
| **1 — the tab and the payload** | The Analysis tab, **its address** (see below), `cachedDeckProfile` behind it, the mix strip moved in, and the empty / loading / refused readings. No verdict content. | — |
| **2 — receipts reshaped** | `lean.receipts[].tutors` keyed per piece; the deciding combo marked on `BracketLean`. Pure, unit-testable, no UI. | — |
| **3 — the declaration's write path** | The server action, its refusal rules (never defaulted, never inferred), **`deck_versions.declared_bracket` captured at commit**, and `probe:declaration`. No skip, in any form. | — |
| **4 — the verdict block** | Permitted range, the three limits tables, violations with receipts, the population line. **This IS Round 2's build** — the chrome rounds 3 and 4 sit inside. | 1 |
| **5 — the declaration ask and sub-line** | The readings that survive the 2026-09-21 ruling, plus `permits: [4]`, which draws no line. No skip, no "you said". | 3, 4 |
| **6 — the lean and the reasoning modal** | The lean line, the modal body, the command-zone `found by` reading, and image resolution **at the draw** rather than in the profile. | 2, 4 |
| **7 — the drift row** | **HELD on Design** — see risks. | Design answer |
| **8 — the push line** | Wherever Round 4 places it, including the `kind: "none"` sentence. | Round 4 design |
| **9 — the upgrade path** | Candidate sets, never a pick; the `blocked` reading. | Round 4 design |

PRs 1, 2 and 3 are **unblocked today** and in that order they are the whole spine: a tab that
loads a profile, a verdict shaped the way the modal needs it, and the one write. PRs 4–6 wait on
Round 2's build, which is the critical path for everything drawn.

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

**PR 1.** A probe that presses the tab rather than visiting a URL — the reason the card mark
shipped broken into Card view is that the probe swept by URL and the surface was reached by a
press. It must read the mix strip in its NEW home and assert it is gone from the header, or the
move is invisible to every check.

And it must retire the cache with an input the FINGERPRINT ACTUALLY READS.
`profileFingerprint` deliberately excludes `auto` and takes no deck name, so "edit the deck"
is not a proof — a rename or a fill can leave the fingerprint byte-identical while the cache is
working perfectly, and the check would pass either way. Change a card's quantity, a commander, or
the declaration, and assert the second read differs from the first.

**PR 2.** Pure unit tests, mutation-proved. The deciding-combo rule reuses `comboLandsEarly`'s
per-combo predicate rather than a second copy of it.

**PR 3.** `probe:declaration` against a real Postgres, with this repo's fixture discipline — a
per-run `user_id` deleted in a `finally`, pointed at `local-dev` or a scratch branch, never
production. Three facts no unit test can reach: a declaration survives a re-import and a
re-analysis; a skip is never re-asked; and the column's check constraint refuses anything but
1–5 or null. **The refusal rules matter more than the write**: the app must never default or
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
sub-project 6. PR 1 builds the slot and its three empty readings and **ships no sentence**.
`commander_support.prose` is the precedent for the null state.

**R4 — `permits: [4]` is young.** The 3-vs-4 boundary was ruled to resolve on 2026-09-20 and
`[3,4]` no longer exists. Every surface here must read correctly with one or two brackets on
either side, and any copy or table still carrying `[3,4]` is stale.

**R5 — five rounds, one About bump.** No PR here writes an About entry. The line's entries are
written once at launch (PR #770). A plan task at close-out carries the entry and the
`ABOUT_VERSION` bump; `feature-acceptance` does not pass without them.

---

## Measured, 2026-09-21 — and it decides PR 1's shape

`pnpm measure:profile-cost` against **staging**, on the real decks:

| | |
|---|---|
| median cold build | **625–639ms** across runs |
| slowest (HD · Gishath, 95 cards) | **1.8–3.0s**, varying with compute warmth |
| head read alone | ~120ms |

**So the profile is fetched ON DEMAND, when the tab is pressed** — option 3 above, not option 1.
Adding half a second to three seconds to every `/decks/<id>` load, for a tab most visits never
open, is precisely the regression the decklist's own cache exists to prevent. The figure also
retires the idea that the head read is the expensive half: it is a fifth of the cost, and it is
the only part that has to run before the cache can be consulted.

Not measured, and stated rather than implied: a WARM `cachedDeckProfile` hit. That path is
`cacheForUser`, which needs a request context, so a script calling it would either throw or run
two cold builds and report the second as a cache. The warm cost is the cache layer's, not this
gather's.

---

## The 2026-09-21 rulings

Three, all from Hugh, and they simplify this surface rather than growing it.

**1. The tab ships behind `ANALYSIS_TAB_ENABLED`, and so does the mix strip's move.** Read server-side at request time and passed
down as a prop — never `NEXT_PUBLIC_*`, so there is no build-time inlining and no rebuild to flip
it. **Defaults off when unset**, so production is unaffected until the variable is set
deliberately. It gates the LOADER as well as the tab: a hidden tab whose payload still loads is
the worst of both. Set on the staging Vercel project first; until then the tab is dark
everywhere, which is a thing to say out loud when PR 1 lands rather than discover.

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
