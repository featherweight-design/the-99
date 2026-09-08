# Gate 1 — state reachability, top-off panel (#360 / #361 / #359)

Run before any component of PR 3 is written, against
`design/design_handoff_the99_top_off/STATES-top-off.md`.

Three columns, per the gate:

1. **Type** — is the triggering field present in the type the component receives?
2. **Route** — does `src/app/decks/[id]/page.tsx` actually compute and assign it?
3. **Runtime** — given how `LastSlotsStrip` is mounted, seeded and revalidated, can the
   condition ever be true?

Marks: ✅ reachable · ⚠️ type present, route incomplete · ❌ not surfaced · 🚫 unreachable at
runtime.

The scope of this pass is the **twenty panel states**. The ledger's fourteen (`a`–`j`, `i2`–`i4`,
`l0`) and the mark's four (`k`–`n`) belong to PR 4 and are covered by that PR's own gate run;
`summariseFillPasses` and `undoFillPass` shipped in PR 2, so their seam is already proven by
`fill-passes.test.ts` and `last-slots-actions.test.ts`.

---

## The seam as it stands today

`LastSlotsStrip` is mounted from `builder-shell.tsx:636` and fed two scalars the route derives at
`page.tsx:84-94`: `ownedCandidates` and `unownedCandidates`. PR 3 replaces both with the candidate
list itself (`listLastSlotsCandidates`, shipped in PR 1 and currently unused by any route).

The candidate rows are `SynergyCard` values from `readSynergyCards`
(`src/app/commanders/[slug]/synergy-read.ts:24-78`). That type is:

```ts
type SynergyCard = {
  oracleId: string; name: string; typeLine: string; facet: CardFacet;
  inclusionPct: number | null; synergyPts: number | null;
  owned: boolean; committedTo: string | null;
};
```

**Three field classes the design's rows need are absent from it, and from the route.** They are
the whole content of this gate:

| Need | Drawn by | Today | Mark |
|---|---|---|---|
| Mana cost (Scryfall's `{2}{U}` string) | `CostPips` | `cards.mana_cost` exists in the schema (`schema.ts:29`) but `readSynergyCards` does not select it and `SynergyCard` has no field | ❌ |
| Price | `BuyTag` on every unowned row; the commit row's `{b} to buy · {money}` | `loadPrices` runs at `page.tsx:59` over deck cards + suggestions only. A candidate is by definition **not** in the deck, so no candidate is ever priced | ❌ |
| Availability | `AvailabilityMarker` count-only (states 18, 19) | `loadAvailability` is not called by the builder route at all — `search-action.ts:104` is the only caller in this area | ❌ |

Two more that read as gaps and are not:

- **`owned` is a boolean, not a copy count.** Nothing the design draws in a candidate row needs
  the count: the tick preselection is `owned === true`, and the "×N owned" figure belongs to the
  search row, not this one. ✅ as it stands.
- **The ownership dot's third state.** `OwnershipDot`'s `committed` skin is fed by
  `availabilityDotState({ owned, committedTo })` (`ownership-dot.tsx:69`), and `committedTo`
  is already on `SynergyCard` from `readCommittedDecks`. The dot does **not** need the
  availability aggregate; only the marker does. ✅.

### The three fixes, before any component is written

1. Add `manaCost: cards.manaCost` to `readSynergyCards`' select and `manaCost: string | null` to
   `SynergyCard`. The column is on the row the inner join already produces, so this is one more
   projected column and no new join. The commanders panel ignores it.
2. Price the **unowned** candidates: extend the existing `loadPrices` call at `page.tsx:59` with
   their oracle ids. Owned candidates draw no `BuyTag`, so pricing them buys nothing. The read is
   already `.catch(() => null)` — a failed price read degrades to bare rows, never a broken
   builder.
3. Load availability for the **owned** candidates:
   `loadAvailability(userId, { excludeDeckId: id, oracleIds })`, owned-only for the same reason
   `search-action.ts:101` gives — the query is driven by the collection and an unowned card can
   never come back from it. `excludeDeckId` is the deck being built, so its own claims (including
   its commander) do not count against itself. Swallowed like the price read; a failure means no
   marker, which is state 19's own rendering.

Nothing else in the twenty needs a new field.

---

## The twenty panel states

| # | State | Triggering condition | Type | Route | Runtime | Mark |
|---|---|---|---|---|---|---|
| 1 | At rest (closed door) | `openSlots > 0` and `candidates.length > 0`; door note needs `owned` count | `openSlots` ✅ · `SynergyCard.owned` ✅ | ⚠️ route passes two counts, not the list | reachable once the list is passed | ⚠️ → ✅ with fix (route change, PR 3 item 10) |
| 2 | Open, untouched | list open, selection seeded from `owned === true` | ✅ | ⚠️ same | client state, no server dependency | ⚠️ → ✅ |
| 3 | Mixed selection | some unowned ticked; consequence line states `{b} to buy · {money}` | **money ❌** — no candidate carries a price | ❌ | the count is reachable, **the money is not** | ❌ → ✅ with fix 2 |
| 4 | Owned-only, deep pool (`owned ≥ n`) | preselection clamps at `openSlots` | ✅ | ⚠️ | pure arithmetic over the list | ⚠️ → ✅ |
| 5 | Shallow pool (`owned < n`) | same clamp, other side | ✅ | ⚠️ | reachable; Gate 2 forces it by emptying the collection fixture | ⚠️ → ✅ |
| 6 | At the tick cap | `ticked === openSlots` and untouched rows remain | ✅ | ⚠️ | client state | ⚠️ → ✅ |
| 7 | A decline | client-only decline set | ✅ (no server field) | n/a | client state, survives close, dies on reload (rule 11) | ✅ |
| 8 | Commit in flight | `commitTopOff` pending | ✅ — action shipped PR 2 (`actions.ts:929`) | ✅ | reachable; **needs the network throttled to be visible** — Gate 2 forces it | ✅ |
| 9 | Settled, slots remain | after a commit, `openSlots > 0` and `candidates.length > 0` | ✅ | ⚠️ | `revalidatePath` over `claimSurfaces` re-renders the page with a smaller `openSlots` and a shorter list; the client selection survives because the list component is not remounted | ⚠️ → ✅ |
| 10 | Settled at 99 | `openSlots <= 0` | ✅ | ✅ | `LastSlotsStrip` already returns null at `openSlots <= 0` (`last-slots-strip.tsx:95`) | ✅ |
| 11 | Nothing ticked | `ticked === 0`, by hand or `owned === 0` on open | ✅ | ⚠️ | client state | ⚠️ → ✅ |
| 12 | Every candidate unowned | every `SynergyCard.owned === false` | ✅ | ⚠️ | **reachable only because the route passes the list.** Today the strip is gated on `ownedCandidates > 0 \|\| unownedCandidates > 0` (`builder-shell.tsx:636`); that gate must go, or a pool of purely unowned candidates whose top-up plan is empty takes the door away — which rule 1 forbids | ⚠️ → ✅, **and the shell gate is deleted** |
| 13 | Candidates exhausted (`cand === 0`, `n > 0`) | `candidates.length === 0` with `openSlots > 0` | ✅ · `lastSlots.short` shipped | ⚠️ | **🚫 today.** The `builder-shell.tsx:636` gate unmounts the whole strip when both counts are 0, which is exactly this state. The strip must outlive its control | 🚫 → ✅, same deletion as 12 |
| 14 | Deck already at 99 | `openSlots <= 0` at first render | ✅ | ✅ | `openSlots = 99 - detail.built` server-side, so the strip is absent from the first paint and never flashes | ✅ |
| 15 | Commit refused | `commitTopOff` returns `{ ok: false, message }` | ✅ | ✅ | reachable — the action catches and returns the refusal (`actions.ts:948-951`). Forced in Gate 2 by committing past the cap | ✅ |
| 16 | Undo in flight / settled | `undoFillPass` pending / settled | ✅ (PR 2) | ✅ | reachable, but the *ledger line* it renders on is PR 4. In PR 3 the strip only has to **recount** after an undo, which the same `revalidatePath` delivers | ✅ (recount half) |
| 17 | A ticked row goes illegal while open | the card is added by hand elsewhere, or falls out of colour | `commitTopOff` already refuses illegal ids (`actions.ts:900-911`) | ⚠️ | **partial by design.** The list holds a snapshot; it learns a row is illegal from the refusal, not from a poll. The in-deck half *is* live — a hand-add revalidates the page, the candidate list is re-derived without that oracle id, and the row leaves. The colour half cannot change while a deck is open (identity is the commander's) | ⚠️ — see below |
| 18 | Owned, every copy sleeved elsewhere | `availabilityState(a) === "hard"` | ❌ no availability on a candidate | ❌ | **🚫 today** | ❌ → ✅ with fix 3 |
| 19 | Owned, copies spare | `availabilityState(a) === "free"` → marker returns null | ❌ | ❌ | 🚫 today; the silent case is indistinguishable from "we never asked", which is the defect this gate exists to catch | ❌ → ✅ with fix 3 |
| 20 | The bottom slot at 390px | list open, phone width | `QuickAddBar` is mounted at `builder-shell.tsx:979` | n/a | reachable; the shell must **collapse and not unmount** the dock so query and focus survive (rule in the plan, item 8) | ✅ (shell change in PR 3) |

### State 17, stated honestly

The design draws a row that "unticks itself, states why, goes untickable, and keeps its slot".
Two triggers, two different reachability answers:

- **`already in the deck`** — ✅. A hand-add anywhere on the builder revalidates the deck page,
  the route re-derives `listLastSlotsCandidates` against the new `inDeckOracleIds`, and the
  oracle id leaves the candidate list. PR 3 renders the departed-but-ticked row from the
  difference between the client selection and the fresh candidate list, so the row keeps its slot
  rather than vanishing — which is rule 5.
- **`not in these colours`** — 🚫 by construction, and correctly so. `readSynergyCards` is scoped
  to one commander and a deck's commander cannot change under an open list. The branch still
  ships (the copy exists, the refusal path can name it) but there is no runtime path that reaches
  it from the panel alone. **Named here rather than silently skipped**; it is exercised in Gate 2
  by forcing the refusal, not by producing the condition.

---

## Verdict

**Three ❌ and two 🚫 before the build starts.** All five resolve into work that happens before
the first component file:

1. `manaCost` onto `SynergyCard` + the synergy read. (states 1–20, every row)
2. Price the unowned candidates in the route. (states 3, and every unowned row's `BuyTag`)
3. Load availability for the owned candidates in the route. (states 18, 19)
4. Delete the `ownedCandidates > 0 || unownedCandidates > 0` gate at `builder-shell.tsx:636` and
   pass the candidate list. (states 12, 13 — both currently unreachable)
5. Collapse rather than unmount `QuickAddBar` while the list is open. (state 20)

Nothing here is deferred and nothing is escalated.
