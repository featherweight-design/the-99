# Plan — Deck-state marks

**Handoff:** `design/design_handoff_the99_deck_statuses_pending/` (R4) · **Verdict:** 🟡 Yellow,
`design/design_handoff_the99_deck_statuses_pending/READINESS.md`

**The verdict's errata ledger is the build value**, not the handoff's §Decisions. R4 supersedes
R1–R3 and four places in the folder still carry the earlier answer. Where a document and the
ledger disagree, the ledger wins — the rule is `--fg` and not `--accent`, the facet is `Deck
state` with two rows and not `Changes` with one, the labels are Title case, and the no-v1 deck
takes the hollow plate rather than no mark.

**What ships.** Two marks on one box, on two axes, and neither is a seventh status.

| Reading | Plate | Edge | Bar |
| --- | --- | --- | --- |
| A plan — no committed v1 | `--bg`, no status tint, fully opaque | — | status colour at 50% |
| A deck — v1 exists | the status token at its own alpha | — | full |
| A deck, mid-tinker | the status token at its own alpha | 2px `--fg` left rule | full |

Mutually exclusive by definition: the edge requires a version, the hollow plate means there is
none. `StatusPill`, `STATUS_ORDER`, `STATUS_COPY_KEY` and `statusPill()` are untouched in every
PR below — if a diff changes one of them, the seventh-value mistake has come back.

**Four PRs, cut on file count** (§10: `correlation(files, rounds) = +0.73`). Boundaries are named
here, before implementation, and do not move without saying so in the PR body.

| PR | What | Files (est.) |
| --- | --- | --- |
| 1 | The data and the model — nothing visible changes | 7 |
| 2 | The marks, on five surfaces | 11 |
| 3 | The `Deck state` facet | 6 |
| 4 | The About entry and the version bump | 4 |

They are sequential, not stacked. Each is cut from `main` after the previous merges.

---

## PR 1 — The data and the model

No visible change. This PR makes the two facts readable and the two treatments expressible, and
ships the copy block both later PRs draw from.

### Task 1.1 — `hasPendingChanges` on the list read

`src/lib/decks/read.ts`. The plate needs nothing: `DeckListItem.lastCommittedAt` already ships
via `lastCommittedSql` and is null exactly when no version exists. The edge needs a new figure.

**A real per-deck diff in the query, not a stored flag.** Ruled at the audit: a persisted boolean
is correct only while every draft write path remembers it, and a missed one lies silently.

**The cheap proxy is wrong and must not be written.** `lastEditedAt > lastCommittedAt` reports a
deck as pending for ever after a discard, because a discard moves `last_edited_at` by design —
pinned by `scripts/probe-touched.ts`. Task 1.5 is the case that fails on it.

The comparison is the draft's `deck_cards` against the newest version's rows, plus the deck's
live commander columns against that version's — a commander swap is a pending change and is not
a `deck_cards` row. Model it on `loadDraftState`'s own diff so the list read and the deck page
cannot disagree about what "differs" means.

**Drizzle qualification.** This is a correlated subquery in the PROJECTION of a select whose
`from` names one table, which is exactly the trap `AGENTS.md` documents: column references are
emitted bare, so `where ${deckCards.deckId} = ${decks.id}` renders as `where "deck_id" = "id"` —
each row's own foreign key against its own primary key, matching nothing, for ever, with no
error. Alias every inner table and write both sides out, as `lastCommittedSql` does.

### Task 1.2 — `.toSQL()` test for the new subquery

`src/lib/decks/pending-changes.test.ts`, modelled on `src/lib/decks/last-committed.test.ts`.
Assert the QUALIFIED form — `"deck_cards"."deck_id"` — not that the column name appears somewhere.
A component test receives the figure as a prop and stays green however the query was written; only
the rendered SQL catches this class.

### Task 1.3 — `statusPillStyle` gains one argument

`src/lib/decks/status-style.ts`.

- `statusPillStyle(status, opts?: { hollow?: boolean; pending?: boolean })`. Hollow swaps the
  plate's mix target for `--bg` at 0% — **the colour the tint was already mixing into**, so the
  plate stays fully opaque and the art-wash amendment holds on the mobile spine. One argument,
  not a branch. A literally transparent chip is the defect this is written around.
- `pending` adds `borderLeft: "2px solid var(--fg)"`. It composes with Building's dashed
  hairline: a line *style* against a line *weight*, two facts on one box.
- `statusBarStyle(status, built, bodySize, opts?: { provisional?: boolean })` — 50% opacity when
  the deck has no version, so the row reads as one provisional object rather than a hollow chip
  beside a solid bar.
- **Assert the exclusion in the type or a comment, and prove it in Task 1.4**: no call site may
  pass `hollow` and `pending` together. The exclusion is definitional, so the code should not be
  able to express the impossible state.

### Task 1.4 — style unit tests

`src/lib/decks/status-style.test.ts`. One case per treatment, and one asserting the hollow plate's
resolved `background` names `--bg` rather than `transparent` — the trap, in the file that would
catch it.

### Task 1.5 — the probe that kills the proxy

Extend `scripts/probe-touched.ts`, which already owns a fixture with a commit and a discard.

Three cases, and the third is the whole point:

1. A draft identical to its version reads **not pending**.
2. One add reads **pending**.
3. **A discard back to the version reads not pending** — and this case fails on
   `lastEditedAt > lastCommittedAt`, because the discard moved `last_edited_at` past the commit.

Run it with the diff replaced by the proxy and confirm case 3 fails before believing the run.
Same fixture discipline as the rest of the directory: a per-run `user_id`, deleted in a `finally`,
pointed at `local-dev` or a scratch Neon branch, **never production**.

### Task 1.6 — the copy block

`src/lib/copy/deck-state-marks.ts`, transcribed from the handoff's
`deck-statuses-pending · copy strings.ts` with the ledger applied — the retired-chip comment there
names `--accent` and is superseded.

- `markAria: "pending changes, not yet a version"` — the pill's accessible-name suffix. The full
  phrase, because an edge has no text.
- `phase.notCommitted: "Not committed yet"` and `phase.markAria: "not committed yet"`.
- `detail(changes, version)` — calls `deckVersioningCopy.pending.since` rather than phrasing the
  sentence a second time.
- `cardAriaSuffix: "pending changes"`.
- `filter: { heading: "Deck state", notCommitted, hasPending }`.
- `STATE_PARAM = "state"`, `STATE_ORDER = ["uncommitted", "pending"]`.

Copy tests beside it, and `pnpm check:copy-drift` before the push — the handoff's tables quote
these strings.

---

## PR 2 — The marks, on five surfaces

### Task 2.1 — `StatusPillBadge` takes the two marks

`src/components/decks/status-pill.tsx`. Two booleans through to `statusPillStyle`, and the
accessible-name suffix appended from the copy block. Colour stays out of this file, as its header
already rules.

### Task 2.2 — The deck tile

`src/components/decks/deck-card.tsx`.

- Plate and bar from the deck's own `lastCommittedAt`.
- The edge from `hasPendingChanges`.
- **The change figure outranks the count figures in `detailFor`**, with `Unresolved` the one
  exception — an unnamed line is not a consequence of editing, and the shipped cascade already
  ranks it above shopping. The figure is `--fg-faint`, which is what the canvas draws; the
  `--accent` in the states matrix is item 5 of the ledger.
- It ranks above the proxy fallback. `detailFor`'s existing rank order absorbs it without a new
  branch shape.
- **A plan's detail row is untouched** — that slot holds `31 to buy · $284.10`, the figure a plan
  is opened to see. The phase is never worded here.

### Task 2.3 — Home's resume row

`src/components/home/resume-decks.tsx`. Both marks on the 19px pill, no figure: the stamp on the
first line already reads `edited 2h ago`, and `touchedBy` returns the edit as the winning act for
exactly these decks. Nothing shrinks — the marks cost 2px and a plate swap. The to-buy clause
stays.

### Task 2.4 — Both spines

`src/components/decks/spine-desktop.tsx`, `src/components/decks/spine-mobile.tsx`. The marks on
the chip, the 50% bar for a plan. The mobile meta row is `flex-nowrap` and the rule is
`flex-none`, so `labelAtPx={115}` is asserted unchanged — and probed in Task 2.6 rather than
asserted in a comment.

### Task 2.5 — The phase, in words, on the deck page

`src/components/decks/builder-shell.tsx`, beside the existing `Commit as v1` offer. The one
surface with no grid to teach the hollow plate by contrast. Watch the collapse this header
already has a probe for (`pnpm probe:commit-offer`): the offer's column is the one that took the
title column to 0px, and this adds to it.

### Task 2.6 — `pnpm probe:deck-state-marks`

A new browser probe, because every ruling here is a resolved style and jsdom computes none.

- The hollow plate's resolved `background` on the **mobile spine**, over the wash: fully opaque,
  resolving to the theme's `--bg`, never `transparent`.
- The ⚠ the handoff asks for: on the card footer the ground is `--surface-inset`, so a `--bg`
  plate reads slightly recessed. Measure it and record the figure rather than ruling on it.
- The rule's resolved width (2px) and colour (`--fg`), and that it composes with Building's dash
  rather than replacing it.
- The bar at 50% on a plan and full on a deck.
- At 1300x900 and 390x844.

**It writes its own fixture**, because no account happens to own a deck in each reading: a plan
(cards, no version), a clean committed deck, and a committed deck with one add. Deleted in a
`finally`, `local-dev` only. **Run each check against a reverted build before believing it** —
every failure mode here is a silent pass, the same hazard `check:tokens` exists for.

### Task 2.7 — Component tests

`deck-card.test.tsx`, `resume-decks.test.tsx`, `status-pill.test.tsx`, `builder-spine.test.tsx`.
Mutation-check each: revert the fix, confirm the test fails, restore.

---

## PR 3 — The `Deck state` facet

### Task 3.1 — The filter value

`src/lib/decks/filter.ts`.

- `DeckFilters` gains `states: DeckState[]`; `DeckState = "uncommitted" | "pending"`.
- `FilterableDeck` gains the two booleans it filters on.
- `filterDecks` ORs within the heading, as every other facet does. The two are mutually
  exclusive, so ticking both returns every deck that is not settled — a legal read, not a
  contradiction.
- `filtersToParams` / `filtersFromParams`: `?state=uncommitted,pending`, absent when empty, read
  back through the existing `readList` so an unknown value is harmless and the order is canonical.
- `activeFilterCount` gains the ticked VALUES, not the heading — that is what the phone badge
  counts.

### Task 3.2 — Both renderings

`src/components/decks/decks-view.tsx` (desktop column) and
`src/components/decks/deck-filter-sheet.tsx` (phone sheet), directly beneath Status. Adjacency
says the two are read together; the heading boundary says they are different questions. The
heading takes `--accent` while anything under it is ticked and `--fg-faint` otherwise — a
two-row facet at the other headings' ink reads as a stray checkbox. **Status's `6 of 6` is
untouched**, and the new heading carries no count, as no row in this column does.

### Task 3.3 — Filter tests

`src/lib/decks/filter.test.ts` and `decks-view.test.tsx`: round-tripping the param, the AND
across headings (`Complete` + pending returns finished decks mid-edit), a hand-typed unknown
value ignored, and the badge count.

---

## PR 4 — The About entry

**A feature does not launch without its About entry, in the round that ships it** — and the
ruling taken at the audit is **amend `versions`, and bump**. The amendment is right: the marks
are a second reading of the draft/commit model that entry already teaches, and `statuses` is at
the template's four-key cap where its four keys ARE the six values. The bump is owed: the plate
changes what every deck badge means on three surfaces, which is a capability change and not a
restyle.

### Task 4.1 — The deltas

`src/lib/copy/about.ts`, exactly as `ADDENDUM-about-deck-state-marks.md` writes them.

- `versions.keys` 2 → 3, the appended line covering both marks in the order a deck lives them.
- One sentence appended to `statuses.caption` stating both boundaries.
- `ABOUT_VERSION` 4 → 5.
- Entry count stays 33, chapter counts unchanged, `since` stays `1` on both touched entries, no
  `NEW` plate is spent.

### Task 4.2 — The specimen

`src/components/about/figures.tsx`: one `Complete` badge in all three readings — unfilled, filled,
filled with the rule and `36 changes since v2` beneath it — inside the `versions` entry's existing
figure block. It composes `statusPillStyle`, as the file's existing figure composes
`statusBarStyle`; it does not replicate the tile.

### Task 4.3 — Re-pin the content hash

`src/lib/copy/about.test.ts`. The hash forces either a deliberate bump or a deliberate re-pin;
this round is the bump.

---

## Not in scope

- The banner, the commit sheet, the review page, Discard and the game-log stamp — all
  `design_handoff_the99_deck_versioning/`. This work changes nothing in them.
- **`statusKeylineStyle` is dead code** and About's `resume` caption still describes a keyline no
  component renders. Pre-existing, unrelated to these marks, and its own ticket — not a passenger
  on any PR here.

## Close-out

`feature-acceptance` at the end of PR 2 and again after PR 4: the route×viewport contact sheet
over `/decks`, `/`, `/decks/[id]` at both widths, in all three readings. A review reads a diff, so
it cannot see a surface that never got the mark.
