# Readiness audit — the declaration, R2 (Round 3 of 5)

**Verdict: 🟠 Orange.** Audited 2026-09-21 against `main`, every claim checked against the shipped
source. R1's Orange is **answered** — §2a supplies the downward and single-mark drift shapes, and
that item is closed. This verdict is a **different and newer question**, created by two of the
2026-09-21 rulings meeting each other.

Design self-assessed 🟡 Yellow.

## The one thing that goes back to Design

**A declaration made on a DRAFT, whose reading then changes before any commit, is drawn nowhere
— and the package denies the state exists.**

Two rulings landed on 2026-09-21. *A declaration belongs to a version*, and *analysis runs on the
draft, between versions*. Both are right; together they produce a state neither anticipated.

The analysis reads the draft — `loadProfileHead` selects `deck_cards` and the live commander
columns — and it reads the **live** declaration in the same query:

```ts
// src/lib/profile/load.ts:77
declaredBracket: decks.declaredBracket,
```

So: a player declares Core on a draft permitting `[1,2]`, then adds a Game Changer. The draft now
permits `[4,5]`, `slot.ts:130` sets `declaredOutsidePermits`, and **no commit has happened, so
there is no earlier version to diff against.** §E's matrix is keyed on *this version* vs *last
version* and cannot draw it; `versionChange.line` takes a `previous.version` number that has no
value.

`HANDOFF.md` and `README.md` both state the opposite mechanism — *"A re-analysis produces a later
version with its own reading"* — which is not what the code does. A re-analysis produces no
version at all. The word *draft* appears zero times in the package.

**The question for Design:** what does the block draw while the draft reads differently from what
is currently declared on it — the same two-line diff under a different label, a return to the ask,
or nothing at all? And does *Declared X for this version.* stay worded that way on a draft that is
not yet a version?

This is reachable pre-commit on every declared deck, so it is not an edge.

## R1's Orange is closed

§2a answers it properly: a five-row shape matrix (`1|2→[4,5]`, `1|2→[4]`, `1→[2]`, `4|5→[3]`,
`4|5→[1,2]`), four desktop cards and two phone cards. The single-mark permitted side and the
downward move are both drawn. Risk R1 in the Tier B plan can be closed.

## Resolved without Design

1. **`STATES-declaration.md` mis-states the lean's verdict as `[4,5]`.** `slot.ts:177` sets
   `reachable` when `permits[0] === 4`, so the verdict is `[4]`. Read it that way. Add the
   precondition the package misses: `leanFor` also requires `combos.length > 0`
   (`slot.ts:162-163`), so a `[3]` or `[4]` deck holding no combos draws **no lean at all** —
   and §2a's cards assume a lean always accompanies a single mark.
2. **The skip survives in four files.** Withdrawn in `STATES` and the copy file; still specified
   in `HANDOFF.md` (the ask row, and build guardrail 2 — *"Do not re-ask after a skip"*), in
   `README.md` (three places, including a whole skipped-state description), and in `READINESS.md`
   five times, where it contradicts its own withdrawal. Treat `STATES` + the copy file as
   authoritative, per Design's own precedence convention.
3. **A withdrawn sentence is still live in the copy file.** `declaration - copy strings.ts` — the
   live-region announcement still reads *"You said Core. Your last changes moved this deck past
   that…"*, the exact form ruling 1 withdrew. `README.md` carries the corrected version. The copy
   file is what an engineer transcribes, so this one would have shipped.
4. **A withdrawn control is still drawn.** Canvas §1b renders a `change what you said` control
   under a heading saying no control exists, with an annotation beside it reading "All three are
   gone."
5. **`README.md` still instructs that `CardRef` must carry image uris.** It does not, and must not
   — the profile is cached, so art is resolved at the draw.
6. **Which combo decided the verdict is still unmarked** (R1 item 4, unapplied). `slot.ts:166`
   maps every combo; the modal draws one. Plan PR 2 owns it.
7. **A combo half covered by the COMMANDER still has no copy** (R1 item 5, acknowledged and
   deferred). Reachable today: a command-zone piece counts as covered and is skipped by the reach
   builder, so the modal prints *nothing in this deck searches for it* under a header saying both
   halves are findable.
8. **Em dashes remain in six shipping strings.** Softer than R1 implied — 26 such strings ship
   today across `src/lib/copy/` — but if they are rewritten, the quotations in `STATES`, `HANDOFF`
   and `README` move in the same PR or `pnpm check:copy-drift` reports the tables as stale.
9. **No in-flight, failed or optimistic reading for the declaration WRITE.** Conceded, unchanged
   from R1. The tab's own empty/loading states are Tier B PR 1's; the write's are not covered by
   them.

## Two engineering facts the package gets wrong about cost

**§E needs the previous version's READING, which nothing stores.** Producing it means building a
second `ProfileInput` from `deck_version_cards` and running `buildDeckProfile` and `slotDeck`
again — the expensive half included, and measured at 625ms median for one pass. `READINESS.md`
calls this "a version-history read, not a flag", which under-describes it by an order of
magnitude. **Snapshot the version's `permits` at commit** alongside the new column, and §E becomes
two column reads.

**Writing a declaration busts the profile cache.** `profileFingerprint` includes
`declaredBracket`, so the one write this surface makes forces a full rebuild on the next read.
That is correct — `declared` is an input to the verdict — but the plan's "read-only, except one
write" note does not say it, and it is the difference between a 0ms and a 625ms next paint.

## Schema owed, ahead of PR 3

`deck_versions.declared_bracket integer`, with the same `between 1 and 5` check
`decks.declared_bracket` carries, copied at commit exactly as `commander_oracle_id` already is.
Design's claim that a nullable per-version `declared` "was already in place" is not true: the
existing column is deck-scoped and `deck_versions` has no such column. Add the `permits` snapshot
in the same migration.

## Coverage

Both widths for the ask, the answered state and the version-change row. Missing: the reasoning
modal at 390 (prose only), the `drawOnly` modal body at either width, the command-zone reading,
every in-flight/failed state for the write, and the draft state above — which is not merely
undrawn but denied.

`HANDOFF.md` says the canvas is *"one turn, sections 1a–1f"*. §2a exists and is where this
round's most-argued content lives. Stale.
