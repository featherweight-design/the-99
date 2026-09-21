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
| **3 — the declaration's write path** | The server action, its refusal rules (never defaulted, never inferred), the skip state, migration if §3.1 goes persisted, and `probe:declaration`. No UI beyond the control it needs. | — |
| **4 — the verdict block** | Permitted range, the three limits tables, violations with receipts, the population line. Round 2's chrome, which rounds 3 and 4 then sit inside. | Round 2 build |
| **5 — the declaration ask and sub-line** | All four readings plus `permits: [4]`, which draws no line. | 3, 4 |
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

## Measurement owed before PR 1

**How big is a profile payload, and how long does a cold build take?** `cachedDeckProfile` has
never run in a request. The mix strip's move is justified by ~150px of header; the tab's cost is
justified by nothing measured yet. `loadDeckProfileFromHead` is the UNCACHED body inside `cachedDeckProfile`, so calling it twice
measures two cold builds and no cache at all. Measure **`cachedDeckProfile` twice**, and measure
it against **staging** — it is a read-only measurement and staging is where the real collection
and the real decks are, which is the standing rule for a bar on new work; `local-dev`'s fixture
decks would answer a question nobody asked. Record cold and warm here — the same way the navigation-performance work measured `/collection` at 1.6MB
before deciding anything. A tab that adds a second expensive read to the deck page is a
regression the decklist's own cache was built to prevent.
