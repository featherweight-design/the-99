# Plan: the Analysis tab, consolidated (sub-project 1, last rounds)

Lane `analysis-tab`. Sources, in precedence order: Hugh's rulings of 2026-09-23 at the top of
`design/design_handoff_the99_analysis_tab/READINESS-r1-audit.md`, then that audit's findings and
PR split, then the handoff's `HANDOFF.md`, then its `README.md`.

**Goal.** The Analysis tab reads as one page. A deck carries one standing analysis, which is the
last one the player ran, and it holds until the player runs another.

**Five PRs, in this order, one at a time, never stacked:** A, B, D, C1, C2. The audit's PR C is
split here into data (C1) and surface (C2), because together they come to about 26 files. The
split is settled now so that it does not need a second approval later. Nothing ships E (the
synopsis, which waits for sub-project 6) or F (the About batch, which waits for Design to redraw
the entry under finding 18).

Every UI PR (A, B, D, C2) carries:

- a design-review pass, with its gap report in `docs/superpowers/gap-report-*.md`;
- the probes it moves, run against `local-dev` with `ANALYSIS_TAB_ENABLED=true`, each with at
  least one mutation that fails it;
- a contact sheet at 390 and 1300 from `docs/superpowers/inventories/deck-verdict.json`;
- `check:tokens`, `check:copy-drift` and `check:shared`;
- the pr-review skill.

C1 is data only. It carries `probe:profile-store` and pr-review.

---

## PR A · the sheets (about 17 files)

`ModalChrome` becomes the one sheet for everything the tab opens. What changes:

- **`mark` becomes optional, and the chrome gains a 760px width.** `wide: boolean` becomes
  `width: 560 | 700 | 760`, and every caller is migrated in the same PR.
- **The receipt goes to 760px**, with 4 tiles across, 12px names in `--fg-body`, and no fact mark
  on a tile.
- **The behind-sheet body steps down to 0.35**, which is new. The header's 0.55 is already
  shipped.
- **The upgrade path becomes sheet 3b**, at 700px. It opens from the climb's lower rung and shows
  one target only, the bracket directly below. The head moves into the header. The target chips
  and "open your decklist" are removed, so `onOpenDecklist` is deleted all the way down from
  `builder-shell`.
- **The provenance disclosure becomes sheet 3c**, at 560px. The panel's toggle turns into a sheet
  opener, and its body is unchanged.
- **`CardModal` gains `backLabel?: string`.** When the modal is `stacked` and has a label, the
  desktop ✕ becomes a `← {label}` pill in the same slot. The name block's reserve widens from
  46px to the pill's measured width (finding 10), and only when a label is set.
  - Every sheet passes its label: the receipt passes the finding's label, 3b the target
    bracket's name, and the reasoning its title.
  - The labels thread through `card-detail-provider.tsx`, whose `openCard` gains an optional
    `backLabel`.

**Retired strings, with the design tables swept in the same PR:** `targetLabel`, `targetsAria`
and `toDecklist` (from `upgrade-path.ts`), and the tables `upgrade-path.md` and
`declaration-surface.md`.

**New strings** go in `deck-analysis.ts`: the sheet titles and close labels from the handoff's
`sheets` block. Provenance reuses `deckAnalysisCopy.provenance.toggle`, per the audit's copy
section.

**Files:**

- `src/components/decks/`: `receipt-modal.tsx`, `lean-line.tsx`, `findings-block.tsx`,
  `bracket-climb.tsx`, `upgrade-path.tsx`, `provenance-panel.tsx`, `analysis-panel.tsx`,
  `builder-shell.tsx`, and their tests.
- `src/components/cards/card-modal.tsx` and `card-detail-provider.tsx`, plus their tests. **This
  folder is shared, so this is an ask-first item:** `backLabel` is the only change made there.
- `src/lib/copy/upgrade-path.ts` and `deck-analysis.ts`.
- `docs/superpowers/design-tables/upgrade-path.md` and `declaration-surface.md`.
- The probes: `probe-verdict-findings.mjs` and `probe-verdict-lean.mjs` are re-run, and gain a
  `backLabel` check covering pill geometry, name-block clearance, and ← or Esc popping one
  level. 3b and 3c are walked in `probe-verdict-findings.mjs` itself, at both widths: their
  widths, the 43px phone header, and the stacked card. That probe already opens the tab and holds
  the fixture, so a separate script would have repeated both.

## PR B · the tab with a current reading (about 14 files)

- **Empty state, before any reading (2a, 2b, 2c).** It is full width and has no grid.
  - It shows the five marks on a ring (a 150px box, 50px radius, marks at 44px), the display
    heading and body, **Analyze**, and **How we make these decisions →**, which opens 3c.
  - Loading lights the marks with `at-wave`, a 1.6s cycle with 0.16s stagger, and is static
    under reduced motion. The heading is the live region.
  - The failed state sits at 0.3 opacity with **Try again**. Under finding 17 the ring is
    `aria-hidden` and is exempt from `DIM_OPACITY`, and the exemption is recorded in the code.
- **With a reading.** A 2fr / 1fr grid.
  - The left column is the climb. The right column is the redrawn bracket box: marks at 36 / 26,
    with a range showing both and the upper mark at 0.65; then the name in the display face at
    21 / 19; then `analyzed {when}`, the reason, the lean or declaration or version row, and the
    population foot. The box has no label, no pill and no provenance sentence.
  - Findings run full width, with the 3c opener at the end of the head row.
  - Then the mix: `RoleCounterStrip` gets an `inset` mode (`px-0`, top rule).
  - Phone order: the bracket box, then the climb, the findings and the mix.
- **No Overview section, under finding 6.** `SynopsisSlot` and the `synopsis` copy are deleted.
- **The settle announcement**, once per settle: `Analysis ready. Your cards permit {range}.`
- **Copy:**
  - Retired: `panel.analyze`, `panel.analyzeCost` and `panel.again`.
  - Added: `empty.*` and the settle line.
  - The lean conform follows the handoff's `leanConformed`: all five pair-naming readings say
    "two-card infinite combo". That conform, the empty-state copy and the voice in finding 16
    go to `/copy-review`.
- **Date line.** Only the `asked` form ships here: relative under an hour, then the en-US date.
  The committed and stale forms need C1's data and land in C2.
- **Tokens** (`globals.css`, shared, ask-first):
  - One new keyframes block, `at-wave`.
  - No new token: `--display` maps to the existing `font-display` class.
- **Files:**
  - `src/components/decks/`: `analysis-panel.tsx`, `verdict-block.tsx`, `role-counter-strip.tsx`,
    `bracket-climb.tsx`, a new `analysis-empty.tsx`, `bracket-mark.tsx`, `builder-shell.tsx`,
    and their tests.
  - `src/lib/copy/deck-analysis.ts` and its test.
  - `src/app/globals.css`.
  - `scripts/probe-verdict-block.mjs`, updated for the grid, the empty state and the new box.
  - A design table, `docs/superpowers/design-tables/analysis-tab.md`.

## PR D · the header (about 11 files)

- **The chips row at both widths, in one order.** The deck name, then pips with the commander and
  colour, then the chips row (status pill and bracket chip), then the progress bar.
  - At 1300 the status pill moves off the commander line.
  - At 390 it moves off the front of the meta row. `HANDOFF.md` wins over the canvas table, per
    finding 4.
- **`BracketChip` is redrawn once, and both the header and the tile draw it** (finding 3).
  - The redraw: radius 6, a `color-mix(ink 12%, --bg)` plate, a 55% ink hairline, mono 11 / 10,
    22px marks, and 24px tall on desktop.
  - A range reads unrounded (`Optimized or cEDH`), so `splitChip` retires.
  - The 44px hit area and landing on the tab stay as built in #877.
- **Files:**
  - `src/components/decks/`: `spine-desktop.tsx`, `spine-mobile.tsx`, `bracket-chip.tsx`,
    `deck-card.tsx`, and their tests.
  - `src/lib/copy/deck-analysis.ts`.
  - `docs/superpowers/gap-report-bracket-chip.md`.
  - `probe-bracket-chip.mjs`, re-run at 390, 700 and 1300 with its 40px bar floor.
  - `probe-commit-offer.mjs`, re-run.

## PR C1 · the lifecycle: data (about 14 files)

- **The list fingerprint and the shape version are separate (Hugh's condition at approval).**
  Today `fingerprint.ts` hashes `PROFILE_VERSION` into the fingerprint. So a deploy that bumps it
  would make every stored analysis read as changed, and every deck would say "your deck has
  changes" when the player changed nothing. That breaks ruling 6.
  - The fingerprint covers the list alone: cards and commanders. It decides "same list" and "fresh".
  - A new `profile_version` column records the shape and rules version the stored JSON was
    written under.
  - On a version mismatch, the next read recomputes quietly. That is deterministic, with no model
    call. It does not set `dirty` and shows no banner.
  - Changing the fingerprint's inputs changes every stored hash once. The migration therefore
    recomputes nothing and sets nothing dirty. The first read after deploy finds the version
    mismatch, recomputes quietly and rewrites the fingerprint.
  - Tests: a unit case, plus a `probe:profile-store` case in which a bumped version over an
    unchanged list reads as clean.
- **No lapse.** `readStoredProfile` stops checking the catalog generation and the 7-day age, and
  `STORED_PROFILE_MAX_AGE_DAYS` goes.
  - The read returns the row with `{ fresh: fingerprint matches && !dirty }` rather than
    refusing a row that does not match.
  - The `catalog` column stays, for the future change-notices feature (board row 9).
- **The isDirty flag.** A new column, `deck_profiles.dirty boolean not null default false`, in
  one migration taking the next free number on `main` (0053 today, re-checked before generating).
  - `touchDeck` sets it in the same transaction. `touchDeck` is already the single stamp every
    list edit calls: add, remove, fill, sweep, restore, undo-fill, pull, import, update, and
    discard-to-version.
  - A rename writes `last_edited_at` directly without `touchDeck`, so it does not dirty the
    analysis. That is correct, because a rename is not a list edit.
  - Every analysis upsert writes `dirty = false`.
  - A deck with no profile row has nothing to dirty.
- **A same-fingerprint re-analyze answers from the store.** `computeAndStoreProfile` reads the
  row first. When the fingerprints match, it clears `dirty` and returns the stored profile
  without computing (ruling 5).
- **Analysis only on a legal deck (ruling 1).** `main` does NOT enforce this today: the analysis
  path has no count check.
  - `fetchDeckProfile` refuses with `{ reason: "illegal" }` unless the body count equals
    `deckBodySize(partner)`. This is the same test `commitDeckVersion` already applies.
  - **The surface for this refusal is undrawn. See question 1.**
- **Pinned at commit (ruling 2).** The commit writes the version's id into `deck_profiles` through
  a new `version_id` column.
  - **As built:** the pin runs in `after()`, not under the commit's lock. Holding the lock through
    a 630ms-to-2.2s analysis on every commit was the plan's cost, and it bought nothing: the
    commit hands the pin the fingerprint of the list it froze, and the pin writes nothing if the
    deck no longer holds that list. `commitSnapshotFor` keeps its declared-only gate.
  - When the stored fingerprint already matches, nothing is recomputed. The row's `version_id`
    is set and `dirty` is cleared.
  - **Correction:** a commit is NOT legal by construction. Only a first version enforces the body
    size, and later commits may be any size. So the pin runs `computeAndStoreProfile`, which
    refuses an illegal body, and a version that is not a whole deck is not pinned.
  - This gives finding 7 its data: the row carries `version_id`, and the date line reads
    `analyzed with version n` when the fingerprint matches and the deck is clean at version n.
- **The chip holds (ruling 4).**
  - `readStoredPermits` drops its fingerprint and age checks.
  - **As built:** a document an older `PROFILE_VERSION` wrote is never SHOWN, since version.ts
    records that an old shape reads NaN. On a clean legal deck the read rebuilds it quietly. On a
    dirty or illegal deck it reads as nothing until the next press. The chip readers still return
    its permits, which are two integers.
  - `storedPermitsSql` drops the `computed_at >= decks.last_edited_at` clause, so both the tile
    and the header show the last analyzed bracket.
  - `use-header-bracket.ts`'s hide-on-edit rule is reversed in C2. This PR only changes what the
    readers return.
- **Files:**
  - `src/db/schema.ts`, plus the `drizzle/` migration, snapshot and journal.
  - `src/lib/profile/`: `stored.ts`, `stored-sql.ts`, and their tests.
  - `src/lib/decks/touch.ts` and its test.
  - `src/app/decks/profile-actions.ts` and `actions.ts` (the commit).
  - `scripts/probe-profile-store.ts`, extended to cover:
    - no lapse on catalog or age;
    - dirty set by `touchDeck` and cleared by an analysis;
    - same fingerprint answers without computing;
    - an illegal deck refused;
    - the commit pins with and without a recompute;
    - the chip readers holding over an edit.
  - `AGENTS.md`, whose `probe:profile-store` and `probe:bracket-chip` entries state the
    retired rules.

## PR C2 · the lifecycle: surface (about 12 files)

- **The hook (finding 8).** `useDeckProfile` gains a held profile:
  - `ready` carries `fresh` and `version`;
  - `loading` and `failed` both carry an optional held profile;
  - the peek on open returns stale rows instead of `none`.
- **The banner.** It is the only place staleness is said, and it sits above the grid:
  - 2i: `banner.stale` with **Re-analyze**. The button disables in place while it loads.
  - 2d: `banner.failedHeld` with **Try again**, and the held reading stays whole.
  - It is `role="status"`, and is not announced on load.
- **The date line in all three forms:** asked, committed (`analyzed with version 3 · 18 Sep`,
  en-US per finding 14), and stale.
- **A dirty range withholds its declaration chips (§4.2, finding 12).** Any existing answer
  stays. `declareBracket` refuses on a dirty profile as the server-side guard.
- **A press names its version (build amendment, agreed with the-99-d9, 2026-09-23).** When a press
  runs on a draft equal to the deck's newest version (clean at version n), the reading is pinned
  to that version. A reading of an unchanged committed list IS that version's reading. This
  repairs a failed `after()` pin from a commit, and names a reading for versions committed before
  C1. It is guarded like the commit pin: the reading's list fingerprint must equal the version's
  list, or nothing is written.
- **The header and the tile hold the last bracket.** `use-header-bracket.ts`'s hide-on-edit rule
  is reversed, and its test is rewritten.
- **Files:**
  - `src/components/decks/`: `use-deck-profile.ts`, `analysis-panel.tsx`, a new
    `analysis-banner.tsx`, `verdict-block.tsx`, `declaration.tsx`, `use-header-bracket.ts`, and
    their tests.
  - `src/app/decks/declaration-actions.ts`.
  - `src/lib/copy/deck-analysis.ts`.
  - The probes: `probe-bracket-chip.mjs`, updated to include an edit that holds the chip, and
    `probe-verdict-block.mjs`, extended for 2i and 2d. It edits one card, then puts it back in a
    `finally`.

---

## Answered at approval (Hugh, 2026-09-23)

1. **An illegal deck** keeps the 2a empty state, with **Analyze** disabled and the line
   `Analysis needs a full deck: {built} of {size}.` If the deck held a reading before it went
   illegal, the reading stays, and **Re-analyze** is disabled with the same line. There is no
   Design round. The copy goes to `/copy-review`.
2. **"Legal" means the body count only** (99, or 98 with a partner). A pre-check for banned,
   off-identity and duplicate cards is a later design pass, and it is not this lane's.

## Found outside the fence (to be filed on the board, not built)

- `design-briefs/2026-09-23-the-synopsis.md:10` names `SynopsisSlot`, which PR B deletes.

