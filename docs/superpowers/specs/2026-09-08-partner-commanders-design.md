# Partner commanders — design

**Date:** 2026-09-08
**Branch:** `design/partner-commanders`
**Serves:** #364
**Status:** spec — approved in conversation 2026-09-08, pending Design handoff and implementation plan

---

## 1. Why this exists

A Commander deck is one commander and ninety-nine other cards, and the app has believed that since its
first migration. `decks.commander_oracle_id` is a single `notNull` column, every count in the codebase
is measured against 99, and every surface that draws a commander draws exactly one.

Magic has had partner commanders since 2016. A deck declaring two legends is a hundred cards the same
as any other, but it is two commanders and ninety-eight, and none of that is expressible here. The
motivating case is a real deck: Atreus and Kratos, a `Partner—Father & son` pair, 88 lines totalling
100 cards. Today that list does not fail loudly. It imports. The first commander named takes the
commander slot, the second becomes an `extraCommanderDeclared` note and is dropped, and the deck reads
98 of 99 — one short, with a commander missing and no indication which. Worse, `add-validation.ts`
then measures colour identity against the primary alone, so half the deck's cards become unaddable to
the deck they are already in.

The goal is narrow and stated as the player stated it: **be able to have two cards as a commander, and
see both at the top.** Everything below serves that and stops.

### What this is not

Out of scope, explicitly and by decision:

- **Pair-aware discovery and ranking.** `/commanders` and `/discover` continue to rank single
  commanders. There is no "pairs you could build" surface, no pair scoring, no pair in the two-lane
  layout.
- **Backgrounds and Doctor's companion.** Both are partner-shaped mechanics with a non-legend or
  asymmetric second half. Neither is modelled.
- **Legality beyond what the paste declares.** The app validates a pair it is asked to create; it does
  not audit a deck for format legality it never claimed to enforce.

---

## 2. The data model, and what stays still

`decks` gains one nullable column:

```
partner_oracle_id uuid NULL REFERENCES cards(oracle_id)
```

Migration **0022** (0021 is the highest on disk). No backfill: every existing deck is a single-commander
deck and `NULL` says so correctly.

`commander_oracle_id` stays `notNull`. It is the **primary**, and that word does the work of an ordering
column — a pair's order is fixed by which column holds which id, so no position field is needed and no
pair can be stored ambiguously. A CHECK constraint keeps the two apart:

```sql
CHECK (partner_oracle_id IS NULL OR partner_oracle_id <> commander_oracle_id)
```

**The invariant that must not move:** neither commander is ever a `deck_cards` row. This is already true
and already load-bearing — `deckCounts` (`src/lib/decks/grouping.ts:111-123`) sums `deck_cards`
quantities and therefore needs no change at all. Three places enforce it for one commander and widen to
two:

| Site | Today | Change |
|---|---|---|
| `src/app/decks/import-actions.ts:163` | filters the parsed rows against `commanderOracleId` | filter against both |
| `src/lib/decks/add-validation.ts:51` | refuses adding the commander to the 99 | refuse either |
| `src/lib/decks/add-validation.ts:47-49` | colour identity containment against the commander | containment against the **union** |

That last row is the one that makes the motivating deck usable: Atreus is Boros, the pair is Jeskai, and
the deck's blue cards are legal only under the union.

**Export must carry both.** `src/lib/decks/export-helpers.ts:15` builds
``const lines = [`1 ${commanderName}`, ...cards.map(...)]``, so a pair deck exported today loses its
partner and re-imports as a different deck. Export emits a `Commander` section holding both — the same
section shape `commanderSectionLines` (`src/lib/decks/import.ts:287-302`) already reads, so the
round-trip closes against parsing code that exists.

---

## 3. Declaring a pair, and what counts as legal

A new pure module, `src/lib/decks/partner.ts` — no database, no IO, unit-testable in isolation:

```ts
partnerAbility(oracleText: string):
  | { kind: "generic" }
  | { kind: "restricted"; label: string }   // "Partner—Father & son"
  | { kind: "with"; name: string }          // "Partner with Pir"
  | { kind: "friendsForever" }
  | null

canPair(a, b): boolean
```

`canPair` is a label-equality test, not a rules engine: two generics pair, two `friendsForever` pair,
two `restricted` pair when their labels match, and `with` pairs only with the named card. The
motivating deck needs the `restricted` arm — Atreus and Kratos carry `Partner—Father & son`, and a
bare-`Partner` substring check would miss them entirely.

**Create flow.** The second slot does not exist until the first pick has a partner ability. Once it
does, the slot's list is the owned legal commanders filtered by `canPair` against the first. This is
where the flow was nearly cut from scope, and it should not be: forcing a player to build their partner
decks in some other app and then import them is not a product decision anyone would defend.

**Import flow.**

- A list declaring two commanders takes both. This replaces the `extraCommanderDeclared` note
  (`src/lib/decks/import.ts:212-218`) — the second commander is no longer surplus.
- An **illegally paired** declaration is accepted, with a note. The list is the player's assertion about
  their own deck, and the app is not the judge it never claimed to be. A refusal here would block a real
  deck over a rules reading the app might have wrong.
- A list declaring none opens the picker. When exactly two candidates carry partner abilities and those
  two `canPair`, the picker proposes that pair pre-selected — a proposal, not a decision.

**The server re-validates.** `import-actions.ts:157-161` already re-checks the commander because a
server action is reachable by crafted request; the partner gets the same treatment plus a `canPair`
re-check.

---

## 4. The ceiling

One derived function replaces the literal:

```
deckBodySize = 100 − commanderCount   // 99 today, 98 for a pair
```

`MATURE_DECK_SIZE` (`src/lib/decks/availability.ts:11`) is retired. Call sites:

| Site | Note |
|---|---|
| `src/lib/decks/status.ts:61-62` | `< 99` → Building, `> 99` → Over; both become the derived size |
| `src/lib/decks/availability.ts` | **claim maturity becomes per-deck** — the hard/soft claim distinction now depends on which deck is asking |
| `src/lib/decks/suggest.ts:52` | `const MAX = 99` |
| `src/lib/decks/fill.ts:38-39` | `FILL_BASELINE_TOTAL`, the roles-plus-lands sum |
| `src/lib/decks/suggest.ts:53` | `LAND_TARGET = 37` → **36** for a pair (imported by `fill.ts:3`) |

**The land ruling.** The fill's role targets are its actual argument and must sum correctly against the
body size; land count is advisory and elastic, the one number a player routinely overrides. So the pair's
missing slot comes out of the lands: 37 becomes 36. Taking it from a role target would change what the
fill is arguing for.

**Claim maturity is the subtle one.** `availability.ts` treats a deck at or above the mature size as
physically sleeved, making its claims hard. That threshold is now a property of the deck rather than a
constant, and the availability system is the largest consumer of it.

---

## 5. Merged advice

Every recommendation surface reads `commander_support_cards` keyed by one commander id. The change is
the lookup, not the algorithm: widen `eq` to `inArray` over one or two ids, group by `oracleId`, take
`max(synergy)` and `max(inclusion)`.

**There is no pair branch.** Over a single id, the grouped-max result is byte-identical to today's, so
single-commander decks cannot regress by construction. `suggestDeck` takes the merged list, which covers
the fill, the last-31 strip and Consider in one change.

`synergyState` precedence is **`degraded` → `ok` → `absent`**. The schema comment
(`src/db/schema.ts:396-399`) warns that collapsing `absent` and `degraded` loses the retry signal, and
this ordering preserves it: a pair where one half is degraded reports degraded, and the retry still
happens.

Explicitly untouched: `/commanders/[slug]`'s score explanation and the `edhrecTotal` denominator. Both
describe a single commander's page and stay that way.

**A caveat for the motivating deck.** Atreus and Kratos are recent Secret Lair cards and the commander
index rebuilds monthly, so the pair may be `absent` from `commander_support` entirely on first import.
The deck will import and render correctly; its recommendations may be empty until the next index run.
That is the designed behaviour of `absent`, not a partner bug.

---

## 6. The surfaces

Six places render exactly one commander. Four are Design's call and go in the handoff; the rest are
mechanical.

**For Design:**

1. **The deck-detail hero.** `src/components/decks/builder-spine.tsx:286-364` draws one art thumb, then
   `{commander.name} · {identityLabel}` and the pips. Two portraits at a size that still reads on
   mobile, and one name line that holds two names without crowding the count. This is the ask the
   motivating deck is blocked on.
2. **The second slot in the picker.** `src/components/decks/create-picker.tsx` is one component serving
   `mode="create"` and `mode="import"`, deliberately — its header comment says a second component would
   be a second thing to keep in sync. Design draws the slot once and both flows get it: empty before the
   first pick has a partner ability, disabled, and the pre-selected import proposal.
3. **The wash and the portrait.** `src/components/home/deck-rail.tsx:123` uses `commanderImageUri` as a
   full-bleed background; `src/components/home/resume-decks.tsx:84` uses `commanderArtCropUri` as a
   portrait. Both take one image. Primary-only is unambiguous and cheap; a diptych is a real option. The
   rail is where a pair deck is least distinguishable from a single, so Design rules.
4. **The name line where two names do not fit.** `resume-decks.tsx:115`. Truncation rule, or
   primary-only with no partner indication.

**Eng carries, no Design ask:**

- **Pips and identity label** become the union, derived from §2's colour rule. The pips are already a set.
- **`commanderShortName`** (`builder-shell.tsx:278`) feeds the guided banner and two empty-state
  strings, all grammatically singular. The primary keeps that slot.
- **Deck tiles on `/decks`** render no commander today. Nothing to widen.
- **Import state 12** (`import-no-commander.tsx`) is the no-candidates dead end and is unchanged; a pair
  still needs at least one candidate.

---

## 7. Interaction with the in-flight top-off work

`main` already carries #462 (the top-off list). Two branches are still live: `feat/top-off-ledger` and
`fix/top-off-cold-eyes`. Line references here are against the ledger branch, since that is what partner
rebases onto.

The ceiling change from §4 has five more call sites there, and one of them belongs to §5:

- **`src/app/decks/[id]/page.tsx:36`** — `const openSlots = 99 - detail.built;`. Feeds the whole strip.
- **`src/app/decks/[id]/page.tsx:49`** — `readSynergyCards(userId, detail.commander.oracleId, [])`. A
  single commander id: this is §5's merged lookup, not the ceiling. Left alone, a pair's top-off list
  would rank against the primary while the fill ranked against both.
- **`src/components/decks/top-off-list.tsx:215`** — `const total = 99 - openSlots + tickedCount;`
  reconstructs the built count from the literal. With a corrected `openSlots` and an uncorrected 99, a
  pair deck's counter reads one high — silent, and plausible enough to survive review.
- **`src/lib/copy/top-off.ts:167, 171, 322, 324, 328`** — five strings hardcode "of 99". Mechanical
  parameterisation; the sentence shape does not change, so this is neither a Design ask nor a copy
  review.
- **`src/app/decks/actions.ts:262, 549, 782`** — the ledger writes: `openSlots: 99` on both seed paths,
  `99 - built` on top-off.

**The ledger column needs nothing.** `fill_passes.open_slots` (`src/db/schema.ts:227`) records how many
slots stood open when that pass committed, and its own comment notes the number is unrecoverable
afterwards. Rows already written are correct history at 99. No backfill, no migration.

**Sequencing:** partner lands after both top-off branches merge. These sites are named here so the plan
rebases onto the ledger's shape rather than racing it, and so a partner-caused edit is distinguishable
from a merge conflict.

---

## 8. Testing

- `src/lib/decks/partner.ts` — pure, and tested as such: each `partnerAbility` arm against real oracle
  text (including `Partner—Father & son`), and `canPair` across every legal and illegal combination.
- Import: a list declaring two, a list declaring an illegal pair, a list declaring none with two
  pairable candidates, and a list declaring none with one.
- The ceiling: a pair deck reads 98, reaches Complete at 98, and fills to 36 lands.
- Merged advice: a single-commander lookup returns exactly what it returns today — the regression guard
  that makes "no pair branch" safe.
- The motivating deck, end to end, as an import fixture.

---

## 9. Known adjacent gap (not in scope)

Two lines in the motivating deck — `Freya, Queen of the Valkyries` and `Battle of Olympus` — are Secret
Lair **flavor names** for Iroas, God of Victory and World at War. The catalog stores no flavor names and
the matcher indexes `cards.name` front-face only (`src/lib/collection/match.ts:41, 58-63, 75-76`);
`flavorName` appears nowhere in `src/`, `scripts/` or `drizzle/`. Those two lines land in
`deck_unresolved_rows` regardless of anything in this spec. Recorded here so it is not rediscovered as a
partner bug; no issue filed.
