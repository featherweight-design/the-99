# Execution plan — Top off the last 31 (#360, #359, #361)

Design handoff: `design/design_handoff_the99_top_off` (🟢 Green, merged PR #439).
Briefing, premises and walk script: `docs/superpowers/plans/2026-09-08-top-off-briefing.md`.

Six PRs. The first two are server-only and change nothing a player can see; PRs 3 and 4 each swap
one shipped surface for its replacement at both widths in a single merge, because the route is live
and un-gated and a half-replaced control is not a shippable intermediate state.

---

## The one schema decision

The handoff leaves the shape to engineering: *"a fill-pass table (deck id, stable ordinal, kind,
created-at, and the placed row ids, or a pass id on the deck-card rows — eng's call"*.

**A pass id on the deck-card rows cannot work here, and the reason is a rule the design also
states.** `deck_cards` has no surrogate row id — its primary key is `(deck_id, oracle_id)` — and,
more decisively, a pass's line must read `27 cards · 3 now yours, 2 removed since`. Those counts are
derived from *what the pass originally placed*, so the record of placement has to survive the card
leaving the deck. A column on `deck_cards` dies with the row and would leave `2 removed since`
uncountable.

So: **two tables, and the membership record is immutable.**

```ts
export const fillPasses = pgTable("fill_passes", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),                       // 'seed' | 'top_off'
  // Stable, per deck AND per kind, so the label is read straight off the row:
  // the seed is always ordinal 1 of its kind, and `top-off 3` keeps its name
  // after `top-off 1` is undone. Never recomputed, never renumbered — a label
  // derived from a position in the rendered list would renumber every time a
  // line dropped out, which the copy file forbids in as many words.
  ordinal: integer("ordinal").notNull(),
  // How many slots were open when this pass committed. `ledger.passLine` says
  // "27 cards you chose from the last 31", and that 31 is unrecoverable
  // afterwards — the deck has been written to since. Stored, or the sentence
  // cannot be printed.
  openSlots: integer("open_slots").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("fill_passes_kind_check", sql`${t.kind} in ('seed', 'top_off')`),
  unique("fill_passes_deck_kind_ordinal_key").on(t.deckId, t.kind, t.ordinal),
  index("fill_passes_deck_idx").on(t.deckId),
]);

export const fillPassCards = pgTable("fill_pass_cards", {
  passId: uuid("pass_id").notNull().references(() => fillPasses.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  // What the pass placed, at the quantity it placed. Never updated, never
  // deleted — not by a keep, not by a sweep, not by an undo. It is the record
  // of an event, and events do not stop having happened.
  quantity: integer("quantity").notNull().default(1),
}, (t) => [primaryKey({ columns: [t.passId, t.oracleId] })]);
```

**Every count the ledger states is derived by left-joining `deck_cards` on
`(pass.deck_id, fill_pass_cards.oracle_id)`:**

| Deck row state | What the card is | Counted as |
|---|---|---|
| present, `auto = true` | still the app's | **live** — this is what `Undo these {n}` acts on |
| present, `auto = false` | the player kept or adopted it | **now yours** |
| absent | removed by hand or by a sweep | **removed since** |

**One card can appear in two passes, and the newest one owns it.** Pass 1 places Shark Typhoon; the
player removes it; pass 3 places it again. The oracle id is now in both membership records, and a
naive per-pass join would count it live in both — two lines claiming one row, and `Undo these {n}`
on pass 1 deleting a card pass 3 placed. So the read attributes each **live** row to **the newest
pass that placed it**, and every older pass counts that card `removed since`, which is what actually
happened to it. The overlap can only arise after a removal, because the candidate list excludes
cards already in the deck — a card cannot be placed twice while it is live. Undoing pass 3 deletes
the row, and pass 1 goes on reading `removed since`. Correct at every step, and it is one `distinct
on` in the read rather than a column anywhere.

**Nothing in this feature ever writes to `fill_pass_cards` after the pass is created.** Not the keep
controls, not the sweep, not the undo. This must be stated to the builder explicitly, because
STATES ledger state `j` reads *"the sweep removes every pass"* and a builder taking that literally
will write a delete. It is describing the ledger's **appearance** — `clearAutoCards` deletes every
auto row, so every pass has zero live rows and every line is absent, which is state (a). Writing an
actual delete would break `restoreAutoCards`: the sweep's own undo re-inserts those rows with
`auto: true` (`actions.ts:688`), and with the membership record intact the ledger comes back exactly
as it was. Deleting it would strand them as auto rows belonging to no pass.

That satisfies four handoff rules at once and writes nothing extra to do it:

- *"Kept and removed counts are derived, not stored."* They are, exactly.
- *"Keeping must clear a card's pass membership as well as its auto flag."* It does, in the only
  sense the ledger can observe: a kept card is not in the pass's **live** set, so `Undo these {n}`
  cannot reach it. **No join write is needed in `keepAutoCard` / `keepAllAutoCards`, and none is
  added** — the auto flag those actions already clear *is* the membership signal. This is the one
  place the plan resolves a handoff delta by doing less than it asked; the behaviour it names is
  delivered whole. Note that this makes the third `auto: false` writer
  (`update-actions.ts:355`, which un-autos the cards an update's plan leaves unchanged) correct for
  free as well, which a bespoke join in two named actions would have missed.
- *"`Keep all` empties every pass, so it removes the whole ledger."* With every row's `auto` false,
  every pass has zero live rows, so every line is absent. Same act, no second write.
- **The invariant:** `sweep absent ⟺ 0 auto rows ⟺ every pass has 0 live rows ⟺ ledger absent`. It
  holds by construction rather than by discipline, and there is a unit test asserting it —
  **scoped to decks with at least one pass row.** A legacy deck has auto rows and zero passes by
  design, which satisfies "every pass has 0 live rows" vacuously while its ledger is very much
  present as the legacy line. Asserting the chain over those decks would fail against correct
  behaviour.

The one thing to hold in code: **a pass with zero live rows renders no line.** Filter in the read,
not in the component.

---

## PR 1 — Briefing, plan, schema, and the seed pass

**Branch:** `feat/top-off` (already created from `origin/main` at `95983b3`).
**User-visible change:** none.

1. Commit this plan and the briefing.
2. Add `fillPasses` / `fillPassCards` to `src/db/schema.ts` as above; `pnpm db:generate` produces
   `drizzle/0020_*.sql`. **No backfill statement of any kind** — the design forbids synthesising a
   seed from `auto` rows or from `decks.filled`, and the legacy line is how existing decks render.
3. `src/lib/decks/fill-passes.ts` — the read helper, pure where it can be:
   - `recordFillPass(tx, { deckId, kind, rows })` — allocates the next ordinal inside the caller's
     transaction (`select coalesce(max(ordinal), 0) + 1`, under the deck row lock every caller
     already takes) and inserts the pass plus its cards. Returns the pass id. Inserts nothing and
     returns `null` when `rows` is empty: a pass that placed nothing is not a pass.
   - `readFillPasses(deckId)` — returns `{ id, ordinal, kind, openSlots, createdAt, live, kept,
     removed, liveOracleIds }[]`, **oldest first** (the seed is always the first element; a new pass
     appends), **excluding passes with zero live rows**. The order is the design's, not a default:
     README:260 and STATES:93-94 both read the ledger top-down as the deck's history. The label is
     built from the row's stored `kind` + `ordinal` and never from the element's index, or an undo
     would silently renumber every line below it.
4. Write the seed pass from the two build-fill paths — `createDeck`'s fill and `fillDeck`
   (`actions.ts:511`) — inside the transaction that inserts the rows, with `kind: 'seed'`.
   `fillLastSlotsOwned` / `fillLastSlotsUnowned` are **not** touched here; they are deleted in PR 3.
5. Tests (`src/lib/decks/fill-passes.test.ts` plus an action-level test): ordinal allocation is
   monotonic per deck; a kept card moves live→kept without a write to the pass; a removed card moves
   live→removed; a pass at zero live rows is absent from the read; `Keep all` empties every pass.

**Gate 6 applies** (this PR creates records in response to an event). Prove by running: the seed
pass exists after a build fill, exists exactly once when the fill is retried, and belongs to the
right deck when two decks are built in the same session. Commit
`docs/superpowers/side-effects-top-off.md`.

---

## PR 2 — Candidates, the commit, and the undo

**User-visible change:** none. Every export here is unreferenced until PR 3.

1. **`planLastSlots` keeps its arithmetic and loses its commit.** Add
   `listLastSlotsCandidates({ ranked, inDeckOracleIds })` returning **every** legal candidate in
   rank order, uncapped — the list shows the whole ranking, and the cap is a property of the
   selection, not of the pool. `planLastSlots` itself stays exactly as it is; `countLastSlotsUnowned`
   and the route's two derived counts are deleted in PR 3 along with their controls.
2. **`commitTopOff(deckId, oracleIds: string[])`** — one mutation, not 27:
   - `requireUserId` → `requireDeck`, then the `for update` lock and the re-read inside it, exactly
     as `fillLastSlots` does today.
   - **The tick cap is enforced server-side**: `oracleIds.length > openSlots` is a refusal, not a
     truncation. A caller that ticked past the cap has a stale view of the deck and should be told.
   - Input validation matching `restoreAutoCards`: UUID shape, no duplicates, and the full
     `validateCardForDeck` legality pass. **Unlike the fill, an illegal card is a refusal here, not
     a skip** — the player chose these 27 specifically, and silently placing 26 would make the
     receipt lie. **This refusal is a race guard, not the surface for state 17.** State 17 — a ticked
     row that goes illegal between tick and commit — is drawn and recounted client-side before any
     request leaves; the server only catches the case where the two disagree, and that renders as
     state 15 with the shipped copy `We couldn't add those. The deck is unchanged.`
     (`lastSlots.topUpFailed`). No new "the count that failed" string is invented for it.
   - Inserts with `auto: true` and `onConflictDoNothing`, calls `recordFillPass(tx, …)` with
     `kind: 'top_off'` and **only the rows that actually landed**, revalidates `claimSurfaces`.
   - Returns `{ ok: true, passId, added, total, boughtDelta }` or `{ ok: false, message }`.
     `boughtDelta` is the count of newly placed cards the player does not own — the shopping figure
     the commit row promised.
3. **`undoFillPass(deckId, passId)`** — a real inverse, not a client-side hide:
   - Ownership checked through `requireDeck`; the pass is re-read and its `deckId` verified against
     the argument, so a pass id from another deck is a 404 rather than a delete.
   - **A `kind === 'seed'` pass is refused.** The seed line grows no `Undo these {n}` at all — it
     names its reversal in prose (`the sweep reverses it`, README:236, STATES state b), and
     `clearAutoCards` is the control that performs it. The guard exists so a hand-made call cannot
     do what the UI declines to offer.
   - Deletes **only the pass's live rows** — `deck_cards` rows still present and still `auto` — in
     one statement. A kept card is not in that set and cannot be reached, which is the design's
     ruling stated as a `where` clause.
   - **Deletes neither the `fill_passes` row nor its membership.** The membership record is
     immutable, as above, and it does not need deleting to make the line go: with every card of the
     pass now absent the pass has zero live rows, so `readFillPasses` filters it out and the line
     disappears (ledger state `e`). Keeping the row also keeps the ordinals stable — deleting it
     would leave `top-off 3` needing a `top-off 1` that no longer exists to prove it never
     renumbered — and it makes "has this deck **ever** had a pass?" answerable, which is exactly the
     condition the legacy line turns on (STATES `l0`: the legacy line goes for good the first time a
     pass lands, not merely while one is showing).
   - Revalidates `claimSurfaces`, which is what gives the shopping list its money back — the list is
     derived from deck membership, so nothing separate restores it.
   - Returns the count actually removed, which is what the announcement says.
4. Delete nothing yet. `fillLastSlotsOwned` / `fillLastSlotsUnowned` stay live because the strip
   still calls them until PR 3.
5. Tests: the cap refusal; an illegal id refuses the whole commit; a duplicate id refuses; a
   concurrent hand-add that closes the last slot makes the commit refuse rather than overfill; undo
   removes live rows only and leaves kept ones; undo of an already-undone pass is a no-op; a pass id
   belonging to another deck refuses; a seed pass refuses; ordinals do not renumber after an undo,
   so a later pass keeps the label it was given.

---

## PR 3 — The list, both widths

**Closes #361.** The two CTAs are deleted, not restyled.

**Gate 1 runs before this build starts** — every state in `STATES-top-off.md`'s twenty panel states
gets its ✅/⚠️/❌/🚫 against the type, the route and *runtime reachability*, committed as
`docs/superpowers/state-coverage-top-off.md`. Gate 4 Agent 1's property table is committed to
`docs/superpowers/design-tables/top-off.md` **before any component is written**, and passed into
every build subagent's prompt.

1. `src/lib/copy/top-off.ts` — the handoff's copy block, verbatim, plus the REPLACES block applied
   to `synergyCopy.lastSlots`: delete `fillOwned`, `fillOwnedAria`, `topUp`, `topUpAria`,
   `fillFailed`; `ownedNote` becomes `strip.doorNote`; `caption` / `captionMobile` are replaced;
   the three announce functions become `announce.added` / `announce.addedNoBuy`. `lastSlots.short`
   is kept **verbatim** and narrowed to STATES §13 alone.
2. `last-slots-strip.tsx` becomes the door plus the list. The strip's own geometry
   (`--surface-rail` on `1px --border-strong`, radius 10px, padding `14px 16px`) is unchanged from
   the property table; the door is a `PrimaryButton` in brass outline with `aria-expanded` /
   `aria-controls` and **does not move focus** when it opens.
3. `top-off-list.tsx` — the candidate rows. One component, responsive classes, **not two mounted
   subtrees** (the verify agent marks a doubled subtree as MATCH on both columns; the repo has been
   bitten by this). Desktop 34px single line, phone 52px two lines. Existing atoms only:
   `OwnershipDot`, `CostPips` (`size` / `track` / `cap` / `spoken` on desktop; uncapped,
   unshingled, 13px on phone), `BuyTag` at `density="full"` at **both** widths, and
   `AvailabilityMarker` count-only. The availability slot is a fixed 84px with exactly one occupant
   and is silent at `free`.
4. Tick boxes: real checkboxes with `aria-checked`, 18px desktop / 26px phone, the row as the tap
   target. At the cap the remaining boxes go **inert, never hidden**, at 0.55 row opacity with
   `aria-disabled` and `aria-describedby` pointing at the cap line.
5. Selection is client state, held in the list component, keyed by oracle id. It survives closing
   the list and dies on reload — accepted, and named in the PR body.
6. **The list's furniture, which is not optional and is easy to leave out.** Above the rows: the
   selection head (`{t} of {n} slots ticked · {c} candidates, {u} untouched`), and beside it the two
   30px ghost controls side by side — `Tick the {owned} I own` and `Clear all ticks` — at 44px on
   phone. Desktop also gets the column header row above the rows: mono 9.5px uppercase, with the
   synergy column at 96px and the decks column at 58px. `Cancel` sits with the commit and is
   **always present**; in flight it is disabled, never hidden, so the commit row does not reflow
   under the player's thumb.
7. **State 9 — every remaining candidate declined.** The list closes to the door, and the door
   carries the note `You own none of the {c} left. The list reopens where you left it, declines and
   all.` The declines are part of the same client selection state, so reopening is genuinely where
   they left it.
8. The commit. Desktop: at the list's end under a `1px --border` rule, not sticky. Phone: it takes
   the quick-add dock's slot — `builder-shell.tsx` collapses `QuickAddBar` to the mono notice while
   the list is open, **without unmounting it**, so query and focus survive. Disabled primary at zero
   ticks carries the slots-stay-open note and **no error**.
9. **Every state the list itself can be in ships in this PR, not the next one.** The route is live
   and un-gated, so a merged list that only draws its happy path is a half-built control in front of
   real players — the same reason PRs 3 and 4 each ship both widths at once. That means, in this PR:
   the declined row and `Show it again` (state 7), the zero-ticked commit and the all-unowned list
   (states 11 and 12), the exhausted strip where the door goes and `lastSlots.short` prints
   (state 13), the commit refusal as a `MutationError` under the clicked control with the ticks
   preserved (state 15), the illegal row drawn on its own line and dropped from the selection with
   the count correcting itself (state 17), and the announcements — one message per settle, ticking
   debounced, through the live region already in `builder-shell.tsx:539-541`.
10. The route (`[id]/page.tsx`) stops deriving `ownedCandidates` / `unownedCandidates` and passes the
    candidate list instead. Delete `countLastSlotsUnowned`, `fillLastSlotsOwned`,
    `fillLastSlotsUnowned` and their tests.

Gates 2, 3, 4 and 7 all fire before `gh pr create`. Gate 2 forces every panel state, including the
ones that need the fixture emptied (state 5, state 12, state 13) and the network throttled
(state 8). Gate 3 greps for the deleted copy keys and for every surface still holding the old
strings.

---

## PR 4 — The provenance ledger, both widths

**Closes #359.**

1. `provenance-line.tsx` becomes the ledger: the shipped strip box (`1px --border`,
   `border-left 3px --accent`, radius 9px, 20px `i` disc), a header line stating passes and money
   only, then one 34px line per pass **oldest first — the seed is always the top line and a new pass
   appends below**. The newest line is not reordered to the top; it is merely accented,
   `--elevated-hover` on `1px --accent-shadow`.
2. Each line: a fixed **66px** mono uppercase label column, the sentence at 12.5px, `Show these {n}`
   with a dashed underline, and `Undo these {n}` as a `GhostButton` in a fixed **126px** column.
   Phone gives each pass its own card with 44px controls. **The seed line is the exception and gets
   no undo control at all** — its reversal column holds the prose `the sweep reverses it`
   (`ledger.seedReversal`), because the sweep is the control that performs it and the ledger does
   not duplicate it. The label in every line's column is `ledger.seedLabel` or
   `ledger.passLabel(ordinal)` read off the stored row, never off the line's position.
3. `Show these {n}` is a **client-side mark and nothing else** — no fetch, no route change, no query
   parameter. It sets `border-left 3px --accent` and `aria-pressed` on the matching decklist rows
   and **does not dim, filter, reorder or scroll**. One pass marked at a time.
4. `Undo these {n}` calls `undoFillPass`. In flight: the control shows its pending state, the line
   stays in place, no `Stop`.
5. **The legacy line** for a deck with auto rows and no passes: one dashed sentence
   (`1px dashed --border-strong`, 12.5px `--fg-faint`), no label column, no `Show these`, no undo.
   It goes for good the first time a pass lands.
6. The line's counts come from `readFillPasses`. Nothing is summed across passes; the header states
   passes and money, and `now yours` is never totalled.

The kept note, `Keep`, `Keep all` and `Clear all auto` are **untouched, unmoved and unedited**.

---

## PR 5 — The journey walk, and what it turns up

The list's own states ship in PR 3 and the ledger's in PR 4, so this PR is not a backlog of
undrawn panels. It is the gate that only exists once the whole vertical is reachable:

1. **Gate 5's four passes** — forward, reverse, repeat, resume — against the briefing's eighteen-step
   walk script, at both widths, recorded in `docs/superpowers/journey-lifecycle-top-off.md`. The
   repeat pass is the one with teeth here: Journey C step 12 places the same card a previous pass
   placed and an undo removed, and the newest-pass-wins attribution is what it is testing.
2. **The mutation-feedback sub-check** on the commit and on each undo, with the network throttled.
   The builder is server-rendered, so a mutation with no optimistic path reads as a dead button.
   Any optimistic override clears on the **server value changing**, never on mutation success.
3. **Gate 7** — `/copy-review` over the whole vertical's diff, PRs 3 and 4 included.
4. Whatever the walk turns up, fixed here rather than filed.

---

## PR 6 — Reserved polish

Unscoped. Takes the cold-eyes triage leftovers and the subjective calls, so they land in one branch
rather than spawning cleanup PRs after the run closes.

---

## Known holes, carried deliberately

Named here so they are not rediscovered as bugs mid-run:

1. **The ledger grows one line per pass, uncapped.** Ordinary use prunes it — fully kept and fully
   removed passes drop out — but heavy use grows it. The collapse-to-header fallback is designed and
   unbuilt.
2. **A pass that loses its line takes its money out of the ledger with it.** The shopping list is its
   own surface and nothing joins the two.
3. **The scratch selection dies on reload.** Up to 31 ticks of work.
4. **`decks.filled` is never reset.** This plan routes around it rather than fixing it; the legacy
   line does not read `filled` at all.

None is a blocker. Each is a candidate for the close-out follow-up list, which is offered to Hugh as
a ranked list and not filed as issues unilaterally.
