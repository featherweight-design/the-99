# Gate 1 — state reachability, card availability Task 8

Task 8 of `docs/superpowers/plans/2026-08-13-card-availability-plan.md` bundles two
independent surfaces: the commander-detail in-use disclosure (design table §11) and the
deck-detail commitments roll-up (§12). They share no code and no data path.

Gate 1 clears §12 and blocks §11. The verdict below is why Task 8 ships as the roll-up
alone, with the disclosure held for a product call.

## §12 · Deck detail — commitments roll-up

| # | State | Type | Route | Runtime | Verdict |
|---|---|---|---|---|---|
| 12.11 | Silent — nothing contested | `DeckDetailCard.availability` | `read.ts:153–181` loads it per deck | both counts 0 → no region | ✅ |
| 12.12 | Soft only | same | same | `availabilityState(a, { selfExcluded: true }) === "soft"` | ✅ |
| 12.13 | Over only | same | same | `… === "over"` | ✅ |
| 12.14 | Both | same | same | disjoint by the partition in `availabilityState` | ✅ |
| 12.15 | At 99 | same | same | soft falls to zero on its own; no size check | ✅ |

`src/lib/decks/read.ts:153–181` already calls `loadAvailability(userId, { excludeDeckId })`
and hangs the result on every card, so both counts are derivable in the client with **no
second query**. That excluded vantage is exactly the one `selfExcluded` documents.

## §11 · Commander detail — in-use disclosure

| # | State | Verdict | Why |
|---|---|---|---|
| 11.4 | Claiming deck's status pill | ❌ | not surfaced by any type |
| 11.6 | Collapsed | 🚫 | no host list to summarise |
| 11.7 | Expanded — phone (filter) | 🚫 | nothing to filter |
| 11.8 | Expanded — desktop (split) | 🚫 | nothing to split |
| 11.9 | Nothing claimed — absent | ✅ | vacuously: nothing renders either way |

Three separate blockers, in increasing order of how hard they are to clear.

**1. The list the disclosure annotates does not exist.** The handoff's §6 is explicit that
this is an annotation and not a new surface — *"A separate 'in use' list would duplicate the
matched-cards list. Twelve of the thirty-four are already on that page"* — and the canvas
caption repeats it: *"No separate list. The annotation is on the cards that were already
going to be here."* But `src/components/commanders/detail.tsx` has no such list. Its Pool
section (`:577–607` phone, `:875–902` desktop) is a heading, `{colorPoolSize} cards fit this
identity`, and one sentence. The only card lists on the page are the four role panels
(`:626–634`), which are names grouped by role and cover a different set, and the EDHREC
overlap chips (`:403–416`), which are the *synergy* overlap and not the identity pool.

So the drawn design is not an annotation pass. It is a new ~34-row list with art thumbs,
quantities, availability markers and status pills, on which the disclosure then operates.

**2. Row quantity is not in the payload.** Every drawn row leads with `×N owned`.
`PoolCard` (`src/lib/recs/score.ts`) carries `oracleId, name, typeLine, oracleText,
keywords, colorIdentity, imageUri, manaCost` — no quantity. `Availability.owned` is a true
owned count and would serve, but only for cards that appear in the availability map.

**3. The status pill has no data behind it.** Row 11.4 rides the *claiming deck's* status
pill along in the expanded state. `Availability` (`src/lib/decks/availability.ts:24–29`)
carries `hardDeckNames: string[]` and nothing else about those decks — no id, no built
count, no owned count. `statusPill()` (`src/lib/decks/status.ts:15`) needs
`{ built, ownedCount, unresolvedCount }`. None of it is reachable from here, and widening
`hardDeckNames` into deck objects changes a query four shipped surfaces already consume.

Blocker 3 is the one that cannot be resolved inside Task 8 by scope alone.

### What the plan got wrong, and what it got right

The plan's blockquote at `:1436–1442` says Step 0 must widen `scoreOneCommander` and
`CommanderScore` to return `{oracleId, name}[]`, and calls it "the largest part of this
task". That is now **out of date and unnecessary**: Task 6 exported `commanderPool()` from
`src/lib/recs/score.ts` for exactly this reason, built `receiptCountsByCommander()` in
`src/lib/commanders/in-use.ts` to join a pool against an availability map by `oracle_id`,
and made `loadCollectionPool` request-scoped with React `cache()`. The detail page can
therefore do the join itself at no extra query cost, and no persisted ranked row needs to
grow. Step 0 is a few lines, not the bulk of the task.

The plan was right that a join key was missing from the *payload*; it just no longer has to
be added there.

### Escalated, not improvised

Building the host list is a design question (what it contains, how it orders, how it
coexists with the role panels one section below) and blocker 3 is a data-model question.
Neither is an eng judgement call, so both go to Hugh rather than getting stretched into the
nearest existing surface. Recorded in the run's close-out list.
