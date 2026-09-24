# Plan: deck notices (sub-project 9) and the Home bracket chip

**Date:** 2026-09-24 · **Lane:** notices (`boards/lanes/notices.md`) · **Base:** `origin/main` at `3f420a71`
**Revision:** r2. It answers the plan review (APPROVE WITH CHANGES, items 1–13) and the orchestrator's rulings (b) and (c).
**Sources, in precedence order:**
1. Hugh's rulings: brief `docs/superpowers/design-briefs/2026-09-23-deck-notices.md` §2 and §5; H1 to H6 at the top of
   `design/design_handoff_the99_deck_notices/READINESS-audit.md`; the Analysis tab lifecycle rulings
   (`design/design_handoff_the99_analysis_tab/READINESS-r1-audit.md`); R1 (marks only) and R2 = C (every Home row is three
   lines) for the Home chip.
2. The designs: `design/design_handoff_the99_deck_notices/` (HANDOFF, STATES, copy strings), with the audit's F1 to F18
   as corrections; `design/design_handoff_the99_home/addendum-bracket-chip/` (PR #903): the README's section C, not the
   canvas headline, plus that addendum's audit findings N4 and N5.
3. The engineering map: brief §6.

**Approval:** Hugh approves this plan before any code. The PR boundaries below are fixed at approval; changing one goes
back through the orchestrator.

---

## What changed on `main` since the audit

The audit read `dac4fd5c`. Since then the synopsis has shipped: the Overview, the full overview sheet and the credit note
(#905, #912, #916, #917). So **F12 is resolved**: the credit note's slot and *Write one* exist, and HANDOFF §6's check
note has somewhere to go. Everything else the audit cites was re-read on `3f420a71` for this plan.

## Measured on staging (read-only, 2026-09-24)

- **Legality:** none of the 19 decks holds a card with `commander_legal = false` (0 rows). The catalog carries 53 Game
  Changers. No real deck reaches a legality state today, so every probe BUILDS one on local-dev (a not-legal card sleeved
  into a fixture deck). A run that finds no illegal deck FAILS rather than passing over nothing.
- **The `/decks` notice subquery:** 8.4 ms for all 19 decks. The log was synthetic, 500 single-card entries. The analyzed
  set was rebuilt from `deck_cards` on the fly, which is costlier than reading the stored `analyzed_oracle_ids` (D5).
  Re-measure with the real table and its GIN index in PR 5.

## Decisions this plan makes

These are engineering's, recorded so review does not re-ask them.

- **D1. `Not legal in Commander.` ships from `cards.commander_legal`.** There is no Scryfall `legalities.commander`
  column, so there is no *Banned in Commander.* (audit §5, eng 2).
- **D2. The log is one table on its own sequence, `deck_data_changes`.** Columns:
  - `seq`, a bigserial;
  - `kind`: `gameChanger | massLandDenial | extraTurns | combo | rules | notLegal`;
  - `direction`: `added | removed | moved`;
  - `oracle_ids` (uuid[]): every card a deck must hold for the entry to touch it. It is empty for `rules`;
  - `detail` (jsonb): a combo keeps its card names, `produces` and which piece `must_be_commander` (F16); a rules entry
    keeps its rule name, what the rule now reads and `rules_version`;
  - `published_at`.

  A GIN index covers `oracle_ids`. A unique partial index on `(detail->>'rules_version')` where `kind = 'rules'` makes a
  rules entry impossible to write twice.
- **D3. The marks live on `deck_profiles`:**
  - `seen_seq`: the log head read BEFORE the compute, beside `deps.generation()` (`stored.ts:282`);
  - `notices_read_seq`: the last entry the player opened;
  - `rules_version`: the bracket-rules version the reading was computed under;
  - `analyzed_oracle_ids` (uuid[]): the analyzed list, commanders included.

  Migration 0058 backfills all four. `seen_seq` and `notices_read_seq` get the log head, which is empty at migration.
  `rules_version` gets the version current at migration. `analyzed_oracle_ids` gets the deck's current cards. That last
  one is the list the reading describes on a clean row; on a dirty row the next analysis replaces it. Every existing
  reading therefore starts clean of DATA notices. Legality is live and does not start clean: ruling (b) says a deck that
  already holds an illegal card shows an unread `Not legal` on deploy, and staging has none.
- **D4. A quiet rebuild keeps `seen_seq`, `rules_version`, `analyzed_oracle_ids` and `computed_at`** (brief §6, F4).
  `rebuildOf` already carries the version pin; it carries these four the same way. So *since analyzed {date}* is the
  player's press, never a deploy's rebuild.
- **D5. How an entry matches a deck.** An entry touches a deck when `entry.oracle_ids <@ profile.analyzed_oracle_ids`
  (every card, so a combo needs every piece) and `entry.seq > profile.seen_seq`. For a combo whose `detail` names a
  `must_be_commander` piece, that piece must be one of the deck's commanders. Where no GIN form exists, that check runs in
  the TypeScript read. The list is the one the reading ANALYZED: a card added since is the dirty flag's job, and reporting
  it twice would merge the two signals.
- **D6. Legality is derived live** from the deck's current cards, checked against `commander_legal` and the commanders'
  identity. It is the same rule as `build.ts:392-403` and needs no analysis. Its read state (F11) is the sorted set of
  offending oracle ids the player last saw, kept in `decks.notices_legal_seen`. The `/decks` enum is
  `none | unread | notLegalUnread | notLegalRead`. A `notLegal` log entry exists only to date a BAN. A card that came in
  by import or *Update from a list* is standing state, with no entry and no date.
- **D7. The combo filter is the verdict's own rule, and the diff is between COUNTED sets.** The combo ingest computes the
  set of variants the verdict would count (template-free, two cards, `isInfiniteOrGameEnding`) before and after its
  publish, and logs the difference. A variant whose raw row changed while its counted status did not writes nothing. The
  counting predicate is extracted from `load.ts:119-176` so both callers share it rather than restating it. The §4.3b
  rules that depend on the deck (commander pieces) are applied on read (D5), so the ingest's filter never looks at a deck.
- **D8. A bracket-rules version** (`BRACKET_RULES_VERSION` in `src/lib/bracket/rules-version.ts`) lives apart from
  `PROFILE_VERSION`. Whenever the running build's version is above the highest logged one, `scripts/vercel-migrate.ts`
  writes one `rules` entry. The unique index makes a second write a no-op. The write is non-fatal (D13). A reading is
  touched by a rules entry when `profile.rules_version < entry.detail.rules_version`. That comparison uses the version
  stored on the reading, not the reading's timestamp, so a reading computed between the deploy and the entry's write is
  still judged correctly. The first value writes no entry.
- **D9. H1's recompute covers a player's PRESS only.** On an unchanged list, Analyze or Re-analyze answers from the store
  only when no entry touches the deck (D5, D8). Otherwise it recomputes with no model call, writes the row, and advances
  `seen_seq` and `rules_version`. **That recompute bypasses `cachedDeckProfile`** (`load.ts:577-586`). The cache is
  keyed on the fingerprint and the catalog generation, and that stamp is non-fatal, cached for a minute, written at the
  END of an ingest and never moved by a rules bump. So a cache hit could hand back the reading the notice is about.
  Bypassing the cache is chosen over adding the log head to the key, because the cache has no shipped caller besides this
  path (its own header says so) and a key change would retire every entry on each ingest for nothing.
  **The commit pin (`pinTo`) and `rebuildOf` keep ruling 5's shortcut.** A commit never moves the held bracket.
- **D10. H3 against "Analyze is disabled on an illegal deck".** The word "illegal" has two meanings here, and they do not
  collide:
  - a deck **short of its body** (ruling 1, `deckLegality`): Analyze stays disabled, unchanged;
  - a deck holding a **card that is not legal** (this feature): Analyze and Re-analyze RUN the bracket (brief §2.7). A new
    overview is withheld (HANDOFF §6): the credit note's slot reads the check note, and no credit is spent. A SAVED
    overview stays shown (H3), with a warning line above it. With no saved overview, the withheld form draws. F13: when a
    deck is both short and holding an illegal card, `blocked` wins and no check note draws.

  The warning line over a saved overview is the one state no frame draws. Q4 is with Hugh.
- **D11. H4: the overview's staleness is keyed on `deck_synopses.seen_seq`**, a column added in 0058 and set at write
  from the reading's `seen_seq`. It is backfilled to 0 for existing rows. An overview is marked possibly out of date when
  its `seen_seq` is below the reading's, and the Overview then draws its existing `stale` form with *Write a new
  overview*. It is chosen over `created_at < computed_at` because a notice-driven recompute keeps the fingerprint and
  moves only the data the overview's facts were drawn from, which is exactly what `seen_seq` records. A timestamp
  comparison also ties on the clock and is moved by writes that are not the reading. `read.ts:75`'s `stale` gains that
  one clause.
- **D12. What the Notices foot's Re-analyze does (H4, ruling (c)).** It recomputes the BRACKET only. It never writes an
  overview, a first one included, never spends a credit, and draws no credit note. The foot's note slot shows only the
  check note, and only when a legality entry stands (F3 (b)). Hence F3 (a) and F3 (c) do not arise on this press. F2: the
  Analysis tab's banner draws only when the held reading is not fresh or the press retries a stale one. A foot press
  shows busy on its own button. On failure the foot's sentence becomes a failure line with *Try again*, and the sheet
  stays open.
- **D13. No log write can fail an ingest.** The workflows never run `db:migrate`, so the log may not exist yet. Each run:
  - checks `to_regclass('deck_data_changes')` once; when it is absent, the run writes no entries and warns once;
  - writes each batch's entries inside a savepoint (a nested `tx.transaction`) with `try`/`catch` and `console.warn`, so
    a failed log write rolls back only the savepoint, and the batch's upsert commits;
  - counts lost entries in the ingest report (`logEntriesLost`).

  The same rule applies inside both Spellbook transactions and to D8's write in `vercel-migrate.ts`. That write can never
  fail a build. The model is `stamp-catalog.ts`.

**Dependency chain:** PR 1 stands alone. After it, 2 → 3 → 4 → 5 → 6 → 7, each merged before the next opens. There is no
stacking.

---

## PRs

Each PR runs the pre-open pass, the pr-review skill and the fence check before merge. Before `gh pr merge --squash`,
each is rebased and `pnpm typecheck` runs on the rebased tree. Every UI PR also runs design-review, a probe whose failure
path was mutation-checked, a contact sheet at 390 and 1300, and feature-acceptance. Every probe points at `local-dev`,
never production.

### PR 1 · Home resume row: the bracket chip (about 10 files)

This PR builds from addendum §C and starts once #903 is on `main`. It carries no About entry: the change is cosmetic on a
known surface.
- `src/app/page.tsx`: `includeBracket: analysisTabEnabled()` on `listDecksWithStats`, as `/decks` does.
- `src/components/home/resume-decks.tsx`: every row is three lines: name and stamp; pill, chip and commander; bar and
  count.
  - The row takes `py-[4px]`, and the text column `gap-[4px]`.
  - Line two is `h-[22px] md:h-[24px]` (N4).
  - The bar is `rounded-[2px]` on `--border-strong` from `statusBarStyle`, and keeps the tile's `built > 0` fill rule
    (N5).
  - The pill is `aria-hidden`, with `statusWithBracket` in an `sr-only` span (F4).
- `src/components/decks/bracket-chip.tsx`: adds `face?: boolean`, default true, with `pl-[2px] pr-[2px]` when the face is
  off. The prop is additive: a test pins that every existing call site renders byte-identical markup.
- `src/app/decks/profile-actions.ts`: adds `"/"` inside the existing deferred `after()` (F5), and nothing else.
- `scripts/probe-refresh-home.mjs` (`pnpm probe:home`) checks:
  - at 360, 390, 1180 and 1300, the three lines sit inside 72px;
  - the commander is the only child that shrinks, and the count group never truncates;
  - a mixed pair's deck names are level (N4);
  - marks only: a range reads 55px and a single 28px.

  It FAILS when the account holds no deck with a stored range. Mutations: `face` ignored; the bar's `flex-1` removed;
  line two's height removed (N4). Dropping the count group's `flex-none` was tried and measures nothing: the bar grows
  from a zero basis, so a count that fits is never squeezed. That check stays, recorded as an invariance.
- Tests: `bracket-chip.test.tsx` (face off, and the call sites unchanged) and `resume-decks.test.tsx` (the sr-only line;
  no chip without a bracket).
- A design table, `docs/superpowers/design-tables/home-bracket-chip.md`, and chip rows in
  `docs/superpowers/inventories/home-parity.json`.
- This plan.

### PR 2 · The log, the marks, and the catalog's entries (about 12 files)

- Migration **0058**:
  - `deck_data_changes`, with the GIN index and the unique rules index;
  - `deck_profiles.seen_seq`, `notices_read_seq`, `rules_version` and `analyzed_oracle_ids`, all backfilled (D3);
  - `decks.notices_legal_seen`;
  - `deck_synopses.seen_seq`.

  **`src/db/schema.ts` and `drizzle/**` are shared: ask first.**
- `src/lib/notices/log.ts`: `diffCardBatch(before, after)` (pure) and `writeEntries(tx, entries)`. `writeEntries`
  applies D13: the savepoint, the `to_regclass` probe and the lost count.
- `src/lib/scryfall/seed.ts`: for each batch, in ONE transaction, read the batch's `game_changer` and `commander_legal`,
  upsert, then log the rows that moved (brief §6), with the log write under D13. **Shared ingest: the orchestrator
  sequences and reviews it.**
- `src/lib/profile/stored.ts`: the write reads the head before the compute (D3) and stores `seen_seq`, `rules_version`
  and `analyzed_oracle_ids`. A `rebuildOf` write keeps all four plus `computed_at` (D4). **Shared, ask first.**
- `src/lib/bracket/rules-version.ts`: the constant only. **Ask first.**
- `scripts/probe-notices-log.ts` checks:
  - a batch that moves a Game Changer writes one entry in the same transaction;
  - a batch that throws after the read writes neither the upsert nor the entry;
  - **a log write that throws leaves the batch published** and counts one lost entry;
  - with the table absent, the run publishes and warns once;
  - a rebuild keeps all four marks and the date.

  Mutations: the savepoint removed (the ingest fails); the rebuild's `seen_seq` carry removed.
- Unit tests for the diff.

### PR 3 · The combo log and the rules entry (about 10 files)

- `src/lib/spellbook/seed.ts`: the flag diff (mass land denial and extra turns, never tutor) is written inside the flag
  publish's transaction. The COUNTED-combo diff (D7) is written inside the variant publish's. Both writes follow D13.
  Brief §6's three stopping points hold: a run refused before the flags writes nothing; a run refused after them writes
  the flag entries only. **Shared ingest.**
- `src/lib/profile/load.ts`: the counting predicate is extracted (D7). **Shared, ask first.**
- `scripts/vercel-migrate.ts`: the rules entry (D8), idempotent and non-fatal. **Shared, ask first.**
- Cases added to `probe-notices-log.ts`:
  - each of the three stopping points;
  - a log throw inside each Spellbook transaction, where the publish still lands;
  - a raw variant change that leaves the counted status alone, which writes nothing;
  - the rules entry written twice, which leaves one row.

  Mutations: diffing raw `variant_id`s (the no-op change then writes an entry); the unique index dropped.

### PR 4 · The notices read and H1 (about 10 files)

- `src/lib/notices/read.ts`: `loadDeckNotices(deckId, userId)` returns the data entries that touch the deck (D5, D8) and
  the live legality (D6). Groups follow HANDOFF §2's order with F8's correction, reading `FINDING_ORDER` and
  `findings.labels`.
- `src/lib/notices/touches.ts`: the single predicate that D5 and D8 describe. It is used by the read, by H1, and later by
  the summary SQL.
- `src/lib/profile/stored.ts` and `src/lib/profile/load.ts`: H1 (D9) on a press only. It recomputes past the cache and
  advances the marks. `pinTo` and `rebuildOf` keep the shortcut. **Shared.**
- `src/lib/synopsis/read.ts`: D11's clause. **Shared with the synopsis lane: ask first.**
- `scripts/probe-notices.ts` checks:
  - an entry the analyzed list does not wholly hold never reaches the deck;
  - a card added after the analysis is not reported;
  - a combo whose commander piece is not the commander is not reported;
  - Re-analyze on an unedited deck with a pending entry recomputes, clears the entry and moves the bracket against the
    current catalog; with no pending entry it returns the stored reading;
  - a commit pin never recomputes;
  - a rules entry touches only readings under the older version;
  - the overview reads stale after a notice-driven recompute;
  - a legality entry survives all of the above and clears when the card leaves. The fixture builds the illegal card and
    FAILS when none is found.

  Mutations: the `<@` match reduced to overlap (`&&`); the cache bypass removed; the press-only guard removed (the commit
  pin then recomputes); D11's clause removed.

### PR 5 · The tile: the new footer and the notice (about 11 files)

- `src/components/decks/deck-card.tsx` (ask first):
  - HANDOFF §1a's three fixed rows (92px, and 94 from `md` per F6);
  - the count slot sized for `100 / 99` at 12.5px (F7);
  - last played at both widths (H6);
  - today's wrap kept below the 330px floor (F5);
  - the one yield: `@container` at the measured point, then `BracketChip face={false}` (F6);
  - F14's derived forms: the 358px tile's `legalNoChip` and single-chip notice.
- `src/components/decks/notice-tag.tsx`: both forms (condensed on the tile, full in the header), and the read form (a tag
  with no dot, same ink; F14).
- `src/lib/notices/summary-sql.ts`: the `notice` enum as one correlated subquery, aliased and qualified per `AGENTS.md`,
  with a `.toSQL()` test.
- `src/lib/decks/read.ts`: `notice` on `listDecksWithStats` behind `includeBracket`. It is added here, beside the tile
  that first reads it. **Shared, ask first.**
- `src/lib/copy/notices.ts`, built from the handoff's copy strings, with a test. The tile link's accessible name carries
  `tag.aria`.
- **H5:** the `Over` pill and the new `Not legal` take `--fg` text, with the red on the border and tint only. Contrast
  tests over all six themes clear 4.5:1. **`status-style.ts` is shared: ask first.**
- Probes: `probe:bracket-chip`'s tile assertions updated, since the wrap moves below the floor; `probe:deck-grid` still
  ends rows level; and a notices tile walk in `scripts/probe-notices-tile.mjs` at 1300, 1000 and 390, with
  `Exhibition or Core`, `Unresolved` and `Not legal`. The walk builds its notice and its illegal deck, and FAILS when it
  finds no deck with a range or a notice.

  Mutations: the chips row allowed to wrap (fails the one-row check); the yield removed (range and `Not legal` overflow
  at 366); `Not legal` back in `--danger` text (fails contrast); the count slot back at 52px (`102 / 99` clips).
- The subquery is re-measured on staging with the real table.

### PR 6 · The header tag and the Notices sheet (about 12 files)

- `spine-desktop.tsx` and `spine-mobile.tsx` (free now; ask first): the tag after the chip, or in the chip's slot. F18:
  the phone row yields the range name before it wraps.
- `src/components/decks/notices-body.tsx`: the fifth `ModalChrome` body, 560 wide.
  - Groups and rows follow HANDOFF §2.
  - Dates use `formatShortDeckDate` (F10).
  - Card names go through `CardDetailTrigger`.
  - It has the two feet (D12).

  `ModalChrome` itself is not edited.
- `markNoticesRead(deckId)` is added here with its first caller, the sheet opening. It sets `notices_read_seq` to the head
  and `notices_legal_seen` to the current set. Its file is decided with the orchestrator.
- `builder-shell.tsx` handles opening the sheet, and *Analysis tab →* closing onto the tab. `analysis-panel.tsx` gets
  F2's banner condition. **Both shared, ask first.**
- `scripts/probe-notices-sheet.mjs` checks:
  - the tag sits after the chip at both widths;
  - the widest row stays on one line at 390 (F18);
  - the groups are in order;
  - a card name stacks the card sheet, and Escape returns;
  - opening the sheet quiets the tag, and a new entry brings the dot back;
  - the foot's busy and failure states draw on its own button, with no banner;
  - the dirty foot has no Re-analyze;
  - the foot's press spends nothing and writes no overview (D12).

  Mutations: the F18 yield removed (the row wraps at 390); F2's banner condition reverted (the banner draws on a foot
  press); `markNoticesRead` not called (the dot stays); the foot's press routed through the Analyze action that writes an
  overview (a synopsis row appears).

### PR 7 · The check before the overview (about 8 files)

- The overview write refuses on a deck that holds a not-legal card, and spends nothing (HANDOFF §6, D10). The write path
  (`actions.ts`, `synopsis-actions.ts`) belongs to the synopsis lane: **ask first.**
- It also draws:
  - the check note in the credit note's slot;
  - the withheld Overview;
  - the warning line over a saved overview (D10, as Q4 rules);
  - the stale mark from D11;
  - F13's precedence.
- Cases added to `probe-notices-sheet.mjs`:
  - pressing Analyze on a built illegal deck reads the note, and the allowance has not moved;
  - a saved overview stays drawn with the warning;
  - a short deck holding an illegal card draws `blocked` and no note.

  Mutations: the refusal removed (a synopsis row is written); F13's order reversed; the warning line removed.

### Not a PR here: the About entry

`ABOUT-entry.md` joins the analysis line's launch batch at `since: 10`, with one `ABOUT_VERSION` bump, counted at the
batch (F15). It is a task on the launch and is not built by this lane.

---

## Open

Nothing. **Hugh approved r2 on 2026-09-24** and ruled Q4: the warning line over a saved overview on an illegal deck is
built from the withheld line's form, with *See which →*; its wording goes through `/copy-review`, and PR 7's body carries a
390 and 1300 screenshot of it. No Design round.
