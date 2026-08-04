# Epic Run Briefing — Add panel overhaul (#158)

Feature-specific facts for `epic-run`. Run mechanics live in the skill; repo conventions live
in `AGENTS.md`. Neither is restated here.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-08-04-add-panel-overhaul-plan.md` — the execution plan. Six
   PRs, task-level. **Follow its order exactly.** It doubles as the eng spec for this epic;
   there is no separate spec document, matching the decision taken for the printings epic on
   2026-07-27.
2. Issue [#158](https://github.com/HartiganHM/the-99/issues/158) — the four findings that
   opened this, which collapsed into one problem during the workshop.
3. `docs/superpowers/specs/2026-08-03-add-panel-overhaul-design.md` — the design brief. Locks
   the constraints and hands seven decisions to Design; deliberately does **not** pick a
   layout.
4. `design/design_handoff_the99_add_panel/` — visual ground truth, R2, verdict 🟢 Green.
   `README.md` is the decisions log and component spec; `add-panel · copy strings.ts` is
   keyed and ready to paste; the canvas is the `.dc.html`.
5. `docs/superpowers/design-tables/decks.md` — the current property table. §Add Panel
   (`:1287-1376`), §Suggestion Card (`:1377-1458`), §Search within Add Panel (`:1459-1586`),
   §"+ Add cards" sticky footer (`:2195`) and §2182 are superseded by this pass; everything
   else in that file must still hold when the epic ends.

## Current state (verified 2026-08-04)

**No environment variables, no external services, no infrastructure.** This epic adds no cron,
no worker, no bucket, no queue, no secret. Nothing in it is dormant-until-configured. That is
unusual for an epic here and is the reason the infra table in the final report will read
"none" — say so explicitly rather than omitting the section.

**No migration.** Every field this epic needs already exists on the `cards` table. `imageUri`
is ingested for the whole catalogue.

| Claim | Where | State |
|---|---|---|
| `imageUri` on the suggestions path | `src/lib/recs/score.ts` `PoolCard` | Present; `suggest.ts` drops it when building `DeckSuggestion` |
| `imageUri` on the search path | `src/app/decks/[id]/search-action.ts:33-48` | **Not selected.** Needs one column and one field on `SearchResult` |
| EDHREC raw payload | `src/lib/edhrec/client.ts` | Cached whole, 30-day TTL, so a lift figure costs a parse line and no fetch |
| EDHREC parse | `src/lib/edhrec/parse.ts` | Reads `inclusion` or `num_decks / potential_decks` only. The committed fixture is trimmed to `{ name }`, so **a `synergy` field cannot be proven present from the repo** — read it defensively |
| Owned-only default | `src/components/decks/search-pane.tsx:24` | Ships `useState(false)`. **Flips to `true`** — ruled 2026-08-04 |
| Suggestion source | `src/lib/decks/suggest.ts` | `suggestDeck` iterates `args.ownedPool` only, so every suggestion is already owned. This is why Consider has no owned/unowned axis and why an empty collection means an empty Consider |
| Reduced-motion block | `src/app/globals.css:237-243` | Explicit class list; adding an animation forces a static-fallback decision |
| Optimistic path | `use-deck-mutation.ts`, `useAddOptimisticCard` | Inherited unchanged by both new surfaces |

**Re-verify at kickoff.** The two `imageUri` claims are what PR 1 exists to fix; if either has
already changed, the plan's first PR shrinks rather than the rest shifting.

## Risk shape — copy/IA-driven

This epic ships no new record type, no scheduled job and no third-party write. Its bugs will
come from two places: **information architecture** — a view that becomes unreachable, a tab
that loses its counterpart, a strip link pointing at a shelf that did not render — and
**copy that names a construct the player can no longer see**, which is a defect this repo has
already shipped twice on this exact surface (`builderEmpty.captionFor` said suggestions were
"primed on the right"; `cta` said "Open suggestions" after the sheet was gone).

Gate 6 (side-effect provenance) does **not** fire — nothing here creates records in response
to events. Gates 2, 3 and 5 carry the weight, and Gate 3's string sweep matters more than
usual given the two prior copy defects.

## Launch gating — reachable on merge, deliberately

**No flag, no runbook step, no dark period.** This epic replaces a surface that is already
live at `/decks/[id]` and built on daily. There is no moment where something newly reachable
appears; there is a moment where the existing thing changes shape.

The vertical is fully live when **PR 6** merges, because that is the PR that removes
`add-panel.tsx` and rewires the shell. PRs 1–5 are additive and inert: the payload fields go
unread, and the new components exist but are not mounted. **This means PRs 1–5 can merge and
deploy safely in any state of partial completion** — a run that stops after PR 4 leaves
production exactly as it is today.

Safe because the product is in private beta with a single user. No `releases.ts` entry is held
back, because this repo has no `releases.ts`; user-visible change is recorded in the PR body
and the tracker.

## Off-happy-path homes

Every state below is drawn in the handoff. The one genuine product question — where a user
with an empty Consider goes — was ruled on 2026-08-04 and matches what Design had already
drawn.

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| Consider, empty (collection exhausted or thin) | Consider tab, empty state with a secondary CTA | Opening Consider when every fitting owned card is already in the deck | Yes — CTA goes to `/collection`; adding cards repopulates it. Copy is already written: `considerEmpty.cta = "Add to your collection"` |
| Consider, degraded (EDHREC unreachable) | Consider tab, shelves still render | Automatic when `resolveEdhrecData` returns `unreachable` | Yes — the `Try again` retry is the shipped `DegradedBanner` affordance. Shelves are ordered by coverage gap, which needs no EDHREC, so the room is not empty, only less well-informed |
| Empty deck (0 of 99) | Deck tab, empty state | A newly created deck | Yes. **No CTA** — the Consider tab sits 40px above the mark with its count on it, and the quick-add bar is focusable on the same screen. Two live entrances already; a third would teach that the tab is not the way |
| Quick add, no results | Inline under the bar, bar stays mounted | Typing a query that matches nothing | Yes — `Esc` clears back to idle without leaving the view |
| Card already in deck | Tile stays in its shelf, greyed, `✓ In deck` | Adding a card, or opening Consider after adding one elsewhere | Yes — removing it from the decklist returns the tile to addable. **This is the Gate 5 repeat pass** |
| Mid-add mutation failure | `MutationError` beneath the tile or row | A server refusal | Yes — the error clears when the server `deckOracleIds` value changes |

No row here is unfillable, which is the bar this section has to clear before PR 1.

## User journeys — walk script

Walked mid-run at Gate 5, and by Hugh after. Every journey is exercisable on **local dev** —
nothing here needs staging-only data or infrastructure, so Gate 5 never blocks on a deploy. That
is a statement about where the *development* passes run, not about acceptance: the same journeys
are walked once more on **https://staging.the-99.dev** before the epic is called done, per "Done
means" below. Local dev is sufficient to build against; staging is required to accept.

### Journey A — Quick add (retrieval)

Entry: `/decks/[id]` on an existing deck with cards.

1. Focus the quick-add bar at the bottom of the deck column. → Bar is mounted and idle at both
   widths; no view change occurred to reach it.
2. Type `sol`. → Results appear beneath the bar within one debounce, animated by
   `.anim-quickadd-in`. Each row carries a 30×42 thumbnail, an ownership dot **and** word.
3. Press `↓` twice. → `aria-activedescendant` moves; DOM focus stays in the input.
4. Press `↵`. → The card is added optimistically, the decklist and counts update, the live
   region announces `<name> added · <n> of 99 · <role> <have> of <target>`, and **the query
   is preserved** so a second add costs no retyping.
5. Press `Esc`. → Results dismiss, query stays. Press `Esc` again. → Query clears.

- **Reverse:** remove the added card from the decklist. Counts and the coverage strip return
  to their prior values.
- **Repeat:** add → remove → add the same card again. The second add must behave identically;
  a row that stays `✓ In deck` after removal is the keyed-state bug this pass is most likely
  to introduce.
- **Resume:** reload mid-query. The bar returns idle with no query — it is component state by
  design, and that is correct because a stale query is worse than an empty one.
- **Throttle the network before step 4.** On a server-rendered page a mutation with no
  optimistic path looks broken. The optimistic path is inherited, so this should be instant;
  if it is not, that is a real bug, not a slow machine.

### Journey B — Consider (discovery)

Entry: `/decks/[id]`, deck partially built.

1. Click the `Consider · N` tab. → The main column switches; the decklist is replaced, not
   pushed down. The coverage strip stays visible above the tabs.
2. Read the first shelf. → Shelves are ordered by the coverage the deck is short of. The role
   is the **shelf heading** and appears nowhere on a tile.
3. Click a tile's art. → The card-detail modal opens. `Prev`/`Next` page **within that
   shelf** — a capability suggestions do not have today.
4. Close the modal, click `Add` on a tile. → The tile **stays in place**, greys, and reads
   `✓ In deck`. The tab count, the shelf's `you have N of M`, and the coverage cell above all
   update optimistically. The list does not reorder under the cursor.
5. Click the `Your deck · N` tab. → The added card is in the decklist.

- **Reverse:** remove that card from the decklist, return to Consider. The tile is addable
  again, in the same position.
- **Repeat:** add → remove → add, twice. Watch the shelf's `you have N of M` specifically.
- **Resume:** reload while on Consider. Per the plan, `view` is component state, so the reload
  returns to the deck tab. Confirm that is what happens rather than a blank pane.

### Journey C — Strip to shelf

1. From the deck tab, click an under-target cell in the coverage strip (e.g. `removal 3 of 10`).
   → The view switches to Consider **and** scrolls to that role's shelf.
2. Confirm the shelf exists. → If a role has no owned candidates its shelf is absent; the link
   must not scroll into nothing. This is the Gate 1 runtime-reachability question for this
   journey, and it is the most likely place for a dead link in the epic.

### Journey D — Empty states

1. Create a new deck, open it on a phone viewport. → Empty-deck state, `roleHint` present, and
   **no `Open suggestions` button**.
2. Open Consider on a deck where every fitting owned card is already in it. → `considerEmpty`,
   whose CTA goes to `/collection`.
3. Force `resolveEdhrecData` to return `unreachable`. → Degraded banner, shelves still ordered
   by coverage gap, percentages absent rather than zeroed.

## Hard pause points — stop and ask

- **Any change to `suggestDeck`'s owned-pool premise.** It iterates `args.ownedPool` only, and
  the whole information architecture rests on that — it is why Consider has no owned/unowned
  filter. Recommending unowned cards was considered and deliberately not taken. If
  implementation pressure suggests widening it, stop and ask rather than re-deciding.
- **Feeding the new components the optimistic list instead of the server `deckOracleIds`.**
  The comment at `builder-shell.tsx:70` explains why; `use-deck-mutation` clears a row's error
  when that value changes. This is easy to "fix" by accident and the plan calls it out. If it
  looks wrong, it is not — ask.
- **Deleting anything in `docs/superpowers/design-tables/decks.md` beyond the five superseded
  sections listed above.**
- Standard skill defaults otherwise.

## Notify-and-proceed

- **Deleting `add-panel.tsx`, `suggestion-card.tsx`, `search-pane.tsx` and
  `search-result-row.tsx` in PR 6**, with their tests. Pre-authorized. Confirm first that no
  other surface imports them (`grep` the whole `src/`, not just `components/decks/`), then
  proceed. This is the PR that makes the change user-visible.
- **The owned-only default flipping to `true`.** Ruled 2026-08-04. Every state is drawn with
  both positions of the switch, so a reversal is one line with no redraw behind it.
- **Reading `card.synergy` when the fixture cannot prove it exists.** Proceed with the
  defensive read and both fixture cases. Absence is a supported shape, not a failure — it
  falls back to the `no EDHREC figure` omission Design drew.

## Done means

1. All six PRs merged at the full Copilot bar, deployed, and the vertical walked on
   **https://staging.the-99.dev** — not merely CI-green.
2. `add-panel.tsx`, `suggestion-card.tsx`, `search-pane.tsx` and `search-result-row.tsx` are
   gone, along with the `variant` union, `SheetWrapper`, the `useDialogA11y` mount and
   `.anim-sheet-in`. Net motion change across the epic: one class in, one out.
3. Journeys A–D walked forward, reverse, repeat and resume, recorded in
   `docs/superpowers/journey-lifecycle-add-panel.md` with what was forced and what came back.
4. Gate 1 artifact at `docs/superpowers/state-coverage-add-panel.md` covering all nine states,
   including the two honest omissions (`no art on file`, `no EDHREC figure`).
5. No string anywhere in `src/lib/copy/` names a construct the player cannot see. The sweep is
   part of PR 3 and its result is stated in that PR's body.
6. `docs/superpowers/design-tables/decks.md` regenerated for the new components, with the five
   superseded sections removed and nothing else disturbed.
7. Tracker updated: #158 moves 🟢 → ✅ Shipped.
8. #158 closed by giving it its own explicit `Closes #158` line. Do not append it to a
   comma-separated list behind another issue number — a bare `#N` after the first carries no
   keyword of its own and will not close.
9. Final report via the `feature-run-report` skill. Not free-form. Its infrastructure table
   will read "none", and that is the correct answer here rather than an omission.
