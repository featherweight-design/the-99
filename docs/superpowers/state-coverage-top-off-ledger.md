# Gate 1 — state reachability, the provenance ledger (#359)

Run before any component of PR 4 is written, against
`design/design_handoff_the99_top_off/STATES-top-off.md` § "The provenance ledger (#359, in full)".

`state-coverage-top-off.md:16-19` deferred these states to this pass: the ledger's fourteen
(`a`–`j`, `i2`–`i4`, `l0`) and the mark's four (`k`–`n`).

Three columns, per the gate:

1. **Type** — is the triggering field present in the type the component receives?
2. **Route** — does `src/app/decks/[id]/page.tsx` actually compute and assign it?
3. **Runtime** — given how the ledger is mounted, seeded and revalidated, can the condition ever
   be true?

Marks: ✅ reachable · ⚠️ type present, route incomplete · ❌ not surfaced · 🚫 unreachable at
runtime.

---

## The seam as it stands today

**The data layer is already complete.** PR 1 and PR 2 shipped every read and every write this
feature needs:

- `readFillPasses(deckId)` (`src/lib/decks/fill-passes.ts:184`) returns `FillPassSummary[]`,
  oldest first, passes with `live === 0` already dropped.
- `FillPassSummary` carries `id`, `kind`, `ordinal`, `openSlots`, `createdAt`, `live`, `kept`,
  `removed` and `liveCards` (`{ oracleId, quantity }[]`) — which is every figure the design's
  lines state, plus the id set the mark needs and the per-card quantities the undo counts.
- `undoFillPass(deckId, passId)` (`src/app/decks/actions.ts:840`) takes the deck row lock,
  re-derives attribution, throws on a seed pass, and returns 0 for an already-undone one.
- The whole `ledger` copy block ships (`src/lib/copy/top-off.ts:203-291`), along with
  `announce.undone`, `announce.marked` and `announce.markCleared`.

So this gate is not about missing fields. **It is about wiring**, and there is exactly one ❌:

| Need | Drawn by | Today | Mark |
|---|---|---|---|
| The pass summaries | every ledger line | `readFillPasses` is called by **no route**. `page.tsx:37`'s `Promise.all` holds suggestions, deck list, synergy cards and games; the ledger's data is never read | ❌ |
| The live cards of the marked pass | the 3px accent edge on `DecklistRow` | `liveCards` is on the summary, but `DecklistRow` is mounted from five call sites (`decklist-group.tsx:84`, `decklist.tsx:409/439/469`) and no prop path reaches them | ❌ |
| `auto` on a deck row | the legacy line (`l0`), the ledger's presence | `DeckDetailCard.auto` ✅, already consumed by `builder-shell.tsx:592` | ✅ |
| Card counts for `buy` | every line's `{b}` | `DeckDetailCard.owned` ✅ | ✅ |

### The two fixes, before any component is written

1. **Call `readFillPasses(id)` in the deck route** and thread the result to `BuilderShell`.
   It joins the first `Promise.all` at `page.tsx:37`: it depends only on `id`, so it costs no
   extra round trip. Unlike `loadPrices`/`loadAvailability` it is **not** swallowed with
   `.catch(() => null)` — a ledger that silently disappears would tell the player their passes
   are gone, which is a lie about deck state rather than a missing ornament.
2. **Carry the mark through a context, not through props.** `DecklistRow` has five call sites and
   three intermediate components; a `markedOracleIds` prop would thread through all of them for
   one boolean. `optimistic-deck.tsx` is this codebase's pattern for exactly this — a context with
   a no-op/empty fallback outside a provider, so a row mounted anywhere else still renders.

### Two eng rulings settled here

- **`{b}` / `buy` in every ledger string is a count of cards, never money.** The canvas prints
  `two passes · 10 to buy` and `68 cards — the roles and the mana base, 7 to buy.`; the design
  table's §13c wording ("money") is loose. So the figure is
  `cardCopies(liveCardsOfPass.filter((c) => !c.owned))`, and `formatCents` is not involved
  anywhere in the ledger.
- **The header's `{total}` is the deck's live auto copy count**, which `builder-shell.tsx`
  already computes as `filledCount`. Not the sum of the lines: rule 7 forbids a deck-wide total
  derived from passes, and the legacy case (`l0`) has no passes to sum. `ledger.header` describes
  the sweep, and the sweep is the auto rows.

**Structural note, not a Design round-trip.** The canvas draws two wordings for the seed line
(desktop `We filled the roles and the mana base — 68 cards, 7 of them to buy. 5 now yours.` vs
phone `68 cards — the roles and the mana base, 7 to buy.`) where the shipped copy file ships one
per state. Per the design-review skill's copy rule and `STATES-top-off.md`'s own closing line
("Every string is in `top-off · copy strings.ts`"), the shipped copy file wins at both widths.
Recorded for the gap report.

---

## The ledger's fourteen states

| # | State | Triggering condition | Type | Route | Runtime | Mark |
|---|---|---|---|---|---|---|
| a | No auto cards | `cards.every((c) => !c.auto)` | ✅ | ✅ | reachable — the shipped strip already returns null on this test (`provenance-line.tsx:54`), and it is kept. `readFillPasses` also returns `[]` here, because a swept deck leaves every pass with `live === 0` | ✅ |
| b | Seed only | `summaries.length === 1 && summaries[0].kind === "seed"` | `FillPassSummary.kind` ✅ | ❌ never read | 🚫 today; ✅ with fix 1. Every deck built by the fill since PR 2 is in this state until it is topped off | ❌ → ✅ |
| c | Seed + one top-off | `summaries.length === 2` | ✅ | ❌ | 🚫 today; ✅ with fix 1 | ❌ → ✅ |
| d | Seed + three top-offs | `summaries.length === 4` | ✅ | ❌ | ✅ with fix 1. `recordFillPass` allocates ordinals per deck **and per kind** (`fill-passes.ts:155`), so the three top-offs are 1, 2, 3 | ❌ → ✅ |
| e | A pass undone — its line leaves | that pass's `live === 0` | ✅ | ❌ | ✅ with fix 1. `summariseFillPasses` drops it (`fill-passes.ts:123`), and `undoFillPass` never deletes the pass row, so **ordinals do not renumber** — rule 3 holds by construction | ❌ → ✅ |
| f | Every top-off undone → back to (b) | only the seed retains live cards | ✅ | ❌ | ✅ with fix 1, same mechanism as (e) | ❌ → ✅ |
| g | Undo in flight | `useTransition` pending, per line | ✅ (client) | n/a | ✅. **Per line, not per ledger** — rule g requires neighbours stay enabled, so the pending flag is the pending pass's id, never a single boolean. Gate 2 forces it by throttling | ✅ |
| h | Undo refused | `undoFillPass` rejects | ✅ | ✅ | ✅ — the action throws on a seed pass and on a lock/DB failure. Forced in Gate 2. Renders the shipped `MutationError` beneath the ledger | ✅ |
| i | Cards removed by hand | `summary.removed > 0` | ✅ | ❌ | ✅ with fix 1. A hand-remove revalidates the deck page; `summariseFillPasses` compares membership against live `deck_cards` and the difference is `removed` | ❌ → ✅ |
| i2 | Cards kept | `summary.kept > 0` | ✅ | ❌ | ✅ with fix 1. `Keep` clears `auto`, and `summariseFillPasses` routes a non-auto row to `kept` rather than `live` (`fill-passes.ts:115-120`) | ❌ → ✅ |
| i3 | A pass entirely kept — its line leaves | `live === 0` with `kept > 0` | ✅ | ❌ | ✅ with fix 1; same drop as (e). The distinction between (e) and (i3) is invisible to the ledger by design — an empty pass is an empty pass | ❌ → ✅ |
| i4 | `Keep all` ran — the whole ledger goes | every row's `auto` is false | ✅ | ❌ | ✅ with fix 1. Rule 6's equivalence holds *mechanically*: no auto rows ⟹ every pass has `live === 0` ⟹ `readFillPasses` returns `[]`. **The (a) guard and the empty-summaries case must therefore agree**, or the header would render over no lines | ❌ → ✅ |
| j | `Clear all auto` ran → back to (a) | same as (a) | ✅ | ✅ | ✅, same mechanism as (i4) | ✅ |
| l0 | A deck predating the ledger | `summaries.length === 0` **and** some row has `auto` | ✅ | ❌ | 🚫 today — with no `readFillPasses` call, *every* deck reads as this state. ✅ with fix 1. Reachable for real: decks built before PR 2's migration have auto rows and no pass rows | ❌ → ✅ |

### (a) and (l0) are one guard read twice

The ledger renders when `cards.some((c) => c.auto)` — the shipped test, unchanged. Within that,
`summaries.length === 0` is the legacy line and nothing else: no header, no label column, no
controls. This ordering matters: reading `summaries.length === 0` *first* would take the ledger
away from a swept deck by the legacy branch rather than by the (a) branch, and print a dashed
sentence about a record we keep on a deck with nothing to record.

---

## The mark's four states

| # | State | Triggering condition | Type | Route | Runtime | Mark |
|---|---|---|---|---|---|---|
| k | Not marked | no pass marked | ✅ (client) | n/a | ✅ — the default | ✅ |
| l | Marked | `markedPassId === pass.id`; rows whose `oracleId` is in `liveCards` | `liveCards` ✅ on the summary | ❌ never read | ❌ today — no prop path reaches `DecklistRow`. ✅ with fix 2 | ❌ → ✅ |
| m | Another line marked — the mark moves | a second `Show these` tap | ✅ | ❌ | ✅ with fix 2. Single `markedPassId` state, so "one at a time" is the representation rather than a rule to enforce | ❌ → ✅ |
| n | Cleared — tapped again, pass undone, or list committed | id set to null | ✅ | ❌ | ⚠️ **partial without care.** The re-tap is client state ✅. The other two are *server* events: after an undo or a commit the marked pass may no longer exist in the fresh summaries, and a stale `markedPassId` would mark nothing while `aria-pressed` stayed true on a line that is gone. The mark is therefore reconciled against the incoming summaries **during render**, not in an effect — the same rule the caching convention states for a fresh payload | ❌ → ✅ with fix 2 + the render-time reconcile |

The accessible-name half of (l) — *"from top-off 1"* — has no obvious home: `DecklistRow`'s name
is a `CardDetailTrigger` button and the row itself carries no `aria-label` to extend. It ships as
visually-hidden text inside the row, which is additive to the button's own name rather than a
replacement for it.

---

## Verdict

**Two ❌ classes covering thirteen of the eighteen states, and no 🚫 that survives them.** Both
resolve into work that happens before the first component file:

1. `readFillPasses(id)` into the deck route's first `Promise.all`, threaded to `BuilderShell`.
   (states b–f, i, i2, i3, i4, l0)
2. A pass-mark context consumed by `DecklistRow`, with the marked id reconciled against fresh
   summaries during render. (states l, m, n)

Nothing here is deferred and nothing is escalated.
