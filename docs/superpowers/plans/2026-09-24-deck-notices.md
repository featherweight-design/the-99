# Plan: deck notices (sub-project 9) and the Home bracket chip

**Date:** 2026-09-24 · **Lane:** notices (`boards/lanes/notices.md`) · **Base:** `origin/main` at `3f420a71`
**Sources, in precedence order:**
1. Hugh's rulings: brief `docs/superpowers/design-briefs/2026-09-23-deck-notices.md` §2 and §5; H1 to H6 at the top of
   `design/design_handoff_the99_deck_notices/READINESS-audit.md`; the Analysis tab lifecycle rulings
   (`design/design_handoff_the99_analysis_tab/READINESS-r1-audit.md`); R1 (marks only) and R2 = C (every Home row is three
   lines) for the Home chip.
2. The designs: `design/design_handoff_the99_deck_notices/` (HANDOFF, STATES, copy strings), with the audit's F1 to F18
   as corrections; `design/design_handoff_the99_home/addendum-bracket-chip/README.md` (PR #903, section C), not the
   canvas headline.
3. The engineering map: brief §6.

**Approval:** Hugh approves this plan before any code. The PR boundaries below are fixed at approval; changing one goes
back through the orchestrator.

---

## What changed on `main` since the audit

The audit read `dac4fd5c`. Since then the synopsis shipped: the Overview, the full overview sheet and the credit note
(#905, #912, #916, #917). So **F12 is resolved**: the credit note's slot and *Write one* exist, and HANDOFF §6's check
note has somewhere to go. Everything else the audit cites was re-read on `3f420a71` for this plan.

## Decisions this plan makes (engineering's, recorded so review does not re-ask)

- **D1. `Not legal in Commander.` ships from `cards.commander_legal`.** No Scryfall `legalities.commander` column, so
  no *Banned in Commander.* (audit §5, eng 2). One boolean, one reason line, no migration for it.
- **D2. The log is one table on its own sequence**, `deck_data_changes` (name final at PR 2): `seq` (bigserial),
  `kind` (`gameChanger | massLandDenial | extraTurns | combo | rules | notLegal`), `direction`
  (`added | removed | moved`), `oracle_ids` (uuid[], the cards a deck must hold to be touched; empty for `rules`),
  `detail` jsonb (F16: a combo stores its card names and `produces` at diff time; a rules entry stores its rule name
  and what it now reads), `published_at`.
- **D3. The mark lives on `deck_profiles`:** `seen_seq` (the log head when the reading was computed) and
  `notices_read_seq` (the last entry the player opened). The migration backfills both to the log's head, which is
  empty at migration time, so every existing reading starts clean (audit eng note, "the mark on existing rows").
- **D4. A quiet rebuild keeps `seen_seq` AND `computed_at`** (brief §6, F4). `rebuildOf` already carries the pin; it
  carries these two the same way. So *since analyzed {date}* is the player's press, never the deploy's rebuild.
- **D5. Which cards a data entry is tested against: the list the stored reading analyzed** (audit eng note). A card
  added since is the dirty flag's job, and double-reporting it would merge the two signals.
- **D6. Legality is derived live** from the deck's current cards against `commander_legal` and the commanders'
  identity, the same rule as `build.ts:392-403`, and it needs no analysis. Its read state (F11) is the sorted set of
  offending oracle ids the player last saw, stored on the deck (`notices_legal_seen`); the `/decks` enum is
  `none | unread | notLegalUnread | notLegalRead`. The `notLegal` log entry exists only to date a BAN; a card that came in
  by import or *Update from a list* is standing state with no entry and no date.
- **D7. The data-entry filter for combos is the verdict's own rule**, the §4.3b piece rules plus
  `isInfiniteOrGameEnding`, applied to added and removed `variant_id`s. It is extracted from `load.ts:119-176` into one
  predicate both callers use, never restated.
- **D8. A bracket-rules version** (`BRACKET_RULES_VERSION`) lives beside `src/lib/bracket/rules.ts`, apart from
  `PROFILE_VERSION`. A deploy that bumps it writes one `rules` entry, idempotently (keyed on the version), from the
  migration step in `scripts/vercel-migrate.ts`, non-fatal. Its first value writes no entry.
- **D9. H1's recompute, precisely:** Re-analyze on an unchanged list answers from the store only when no log entry
  past `seen_seq` touches the deck. Otherwise it recomputes, writes, and advances `seen_seq` to the head. No model
  call. An unedited deck with nothing new still returns the stored reading (ruling 5 as amended).
- **D10. H3 against "Analyze is disabled on an illegal deck".** There are two meanings of illegal and they do not
  collide:
  - a deck **short of its body** (ruling 1, `deckLegality`): Analyze stays disabled, unchanged;
  - a deck holding a **card that is not legal** (this feature): Analyze and Re-analyze RUN the bracket (brief §2.7).
    A new overview is withheld (HANDOFF §6): the credit note's slot reads the check note, no credit is spent.
    The SAVED overview stays shown (H3), with the warning line above it. With no saved overview the withheld form
    draws (HANDOFF §6). F13: when a deck is both short and holds an illegal card, `blocked` wins and no check note draws.

  The warning line over a saved overview is the one state no frame draws. This plan draws it from the withheld form:
  the same line, placed above the overview rather than instead of it, with *See which →*. New copy goes to
  `/copy-review` with a picture. **Q4 below asks whether that is acceptable or goes to Design.**
- **D11. H4.** A notice-driven re-analysis updates the bracket only. The overview is marked possibly out of date by
  comparing its reading's `seen_seq` with the current one, and the Overview draws its existing stale form with
  *Write a new overview*. It uses the synopsis's own stale state; no second form.
- **D12. F2 and F3.** The Analysis tab banner draws only when the held reading is not fresh or the press retries a stale
  one. A press from the Notices foot shows busy on its own button and, on failure, turns the foot sentence into a
  failure line with *Try again*; the sheet stays open. The foot carries the credit note's slot as CREDITS places it on
  the banner (F3), and drops *See which →* inside Notices.

---

## PRs

Each PR runs the pre-open pass, the pr-review skill, the fence check before merge, and a rebase plus `pnpm typecheck`
on the rebased tree before `gh pr merge --squash`. Every UI PR also runs design-review, a probe whose failure path was
mutation-checked, a contact sheet at 390 and 1300, and feature-acceptance.

### PR 1 · Home resume row: the bracket chip (about 10 files)

Build from addendum §C. **Depends on #903 merging**, so the handoff is on `main`.
- `src/app/page.tsx`: `includeBracket: analysisTabEnabled()` on `listDecksWithStats`, as `/decks` does.
- `src/components/home/resume-decks.tsx`: every row is three lines (name and stamp; pill, chip and commander; bar and
  count), `py-[4px]`, text column `gap-[4px]`, the bar from `statusBarStyle`. The pill is `aria-hidden`, with
  `statusWithBracket` in an `sr-only` span (F4).
- `src/components/decks/bracket-chip.tsx`: `face?: boolean` (default true), `pl-[2px] pr-[2px]` without the face.
  **Shared, ask first** (audit F9: the tile's yield reuses it in PR 5).
- `src/app/decks/profile-actions.ts:82`: add `"/"` to the deferred revalidate (F5). **Shared, ask first.**
- `scripts/probe-refresh-home.mjs` (`pnpm probe:home`; **outside the fence**, whose glob is `probe-home*`, so ask): rows at 360, 390, 1180 and 1300 carry three lines inside 72px; the commander is the only
  child that shrinks; the count group never truncates; the chip draws marks only; a range reads 55px and a single 28px.
  Mutations: `face` ignored, `flex-none` dropped from the count group.
- Tests: `bracket-chip.test.tsx` (face off), `resume-decks.test.tsx` (sr-only line, no chip without a bracket).
- Design table `docs/superpowers/design-tables/home-bracket-chip.md`; inventory rows for the chip in
  `docs/superpowers/inventories/home-parity.json`.
- This plan file.
- No About entry: cosmetic on a known surface (the addendum says so).

### PR 2 · The change log and the catalog's entries (about 12 files)

- Migration **0058** (confirm the number first): `deck_data_changes`, `deck_profiles.seen_seq`,
  `deck_profiles.notices_read_seq`, `decks.notices_legal_seen`.
- `src/lib/notices/log.ts`: `diffCardBatch(before, after)` (pure) and `writeEntries(tx, entries)`.
- `src/lib/scryfall/seed.ts`: per batch, in ONE transaction, read the batch's `game_changer` and `commander_legal`,
  upsert, insert the entries for rows that moved (brief §6). A failed later batch leaves every committed change logged.
  **Shared (ingest), orchestrator sequences and reviews.**
- `src/lib/profile/stored.ts`: the write sets `seen_seq` to the head; a `rebuildOf` write keeps `seen_seq` and
  `computed_at` (D4, F4). **Shared, ask first.**
- `scripts/probe-notices-log.ts`: a batch that moves a Game Changer writes one entry in the same transaction; a batch
  that throws after the read writes neither; a rebuild keeps the mark and the date. Local-dev only.
- Unit tests for the diff.

### PR 3 · The combo log and the rules version (about 10 files)

- `src/lib/spellbook/seed.ts`: the flag diff (mass land denial, extra turns; never tutor) inside the flag publish's
  transaction, the combo diff inside the variant publish's. Brief §6's three stopping points hold: refused before the
  flags writes nothing; refused after writes flag entries only. **Shared (ingest).**
- `src/lib/profile/load.ts`: the combo-counting predicate extracted (D7). **Shared, ask first.**
- `src/lib/bracket/rules-version.ts` and its one caller in `scripts/vercel-migrate.ts` (D8), non-fatal.
- Probe cases added to `probe-notices-log.ts`: each of the three stopping points, and a combo between cards the deck
  does not hold writing an entry that no deck reads (the filter is on read, not write).

### PR 4 · The notices read, H1, and the payloads (about 12 files)

- `src/lib/notices/read.ts`: `loadDeckNotices(deckId, userId)`: data entries past `seen_seq` touching the analyzed
  list (D5), grouped in HANDOFF §2's order with F8's correction (read `FINDING_ORDER` and `findings.labels`), plus live
  legality (D6).
- `src/lib/notices/summary-sql.ts`: the `/decks` and header state as one correlated subquery, aliased and qualified
  per `AGENTS.md`, with a `.toSQL()` test.
- `src/lib/decks/read.ts`: `notice` on `listDecksWithStats` behind `includeBracket`. **Shared, ask first.**
- `src/lib/profile/stored.ts`: H1 (D9). **Shared.**
- A server action `markNoticesRead(deckId)` (sets `notices_read_seq` to the head and `notices_legal_seen` to the
  current set). Its file is decided with the orchestrator; `profile-actions.ts` is shared.
- `scripts/probe-notices.ts`: an entry the deck's list does not touch never reaches it; a card added after the analysis
  is not reported; opening marks read and a new entry brings the dot back; Re-analyze on an unedited deck with a
  pending entry recomputes and clears it, and with none returns the stored reading; a legality entry survives both and
  clears when the card leaves. Five mutations, each named in the probe header.

### PR 5 · The tile: the new footer and the notice (about 10 files)

- `src/components/decks/deck-card.tsx` (**ask which file first**): HANDOFF §1a's three fixed rows (92px, 94 from `md`
  per F6), the count slot sized to `100 / 99` at 12.5px (F7), last played at both widths (H6), today's wrap kept below
  the 330px floor (F5), the one yield (`@container` at the measured point, `BracketChip face={false}`, F6).
- `src/components/decks/notice-tag.tsx`: the condensed tile form (`● 3`, `● Not legal`) and the header form.
- The tile link's accessible name carries `tag.aria`.
- `src/lib/copy/notices.ts` from the handoff's copy strings, with a test.
- Probes: `probe:bracket-chip`'s tile assertions updated (the wrap moves below the floor), `probe:deck-grid` still ends
  rows level, and a notices tile check at 1300, 1000 and 390 with `Exhibition or Core`, `Unresolved` and `Not legal`.
- **H5 is in this PR:** the `Over` pill in `status-style.ts` and the new `Not legal` take `--fg` text, red border and
  tint, with contrast tests over all six themes (F17's pairs, now clearing 4.5:1).

### PR 6 · The header tag and the Notices sheet (about 12 files)

- `spine-desktop.tsx`, `spine-mobile.tsx`: the tag after the chip, or in the chip's slot. **Held by the tuning lane
  through D2; ask for them.** F18: the phone row yields the range name before it wraps.
- `src/components/decks/notices-body.tsx`: the fifth `ModalChrome` body at 560, groups and rows per HANDOFF §2, dates
  with `formatShortDeckDate` (F10), card names through `CardDetailTrigger`, the two feet (D12). **`ModalChrome` is a
  shared surface; the body is new, the chrome is not edited.**
- `builder-shell.tsx`: opening the sheet, *Analysis tab →* closing onto the tab. **Shared, ask first.**
- `analysis-panel.tsx`: F2's banner condition. **Shared, ask first.**
- `scripts/probe-notices-sheet.mjs`: the tag's position after the chip at both widths; one line at 390 with the widest
  row (F18); the sheet's groups in order; a card name stacks the card sheet and Escape returns; the foot's busy and
  failure states on its own button (no banner drawn); the dirty foot has no Re-analyze.

### PR 7 · The check before the overview (about 8 files)

- The overview write refuses on a deck holding a card that is not legal, and spends nothing (HANDOFF §6, D10).
  The write path is the synopsis lane's (`actions.ts`, `synopsis-actions.ts`): **ask first.**
- The check note in the credit note's slot, the withheld Overview, the warning line over a saved one (D10), H4's stale
  mark (D11), and F13's precedence.
- Probe cases added to `probe-notices-sheet.mjs`: press Analyze on an illegal deck and read the note and no spend; a
  saved overview stays drawn with the warning.

### Not a PR here: the About entry

`ABOUT-entry.md` joins the analysis line's launch batch, `since: 10`, one `ABOUT_VERSION` bump, counted at the batch
(F15). It is named as a task on the launch, not built by this lane.

---

## Open, for the orchestrator or Hugh

- **Q1 (orchestrator).** Migration number: this plan takes **0058** (0057 is the spend cap, on `main`).
- **Q2 (orchestrator).** Shared files and their order: `bracket-chip.tsx`, `profile-actions.ts` and `scripts/probe-refresh-home.mjs` in PR 1; the two
  ingests; `stored.ts`, `load.ts` and `read.ts`; the tile file; the spines; `builder-shell.tsx` and `analysis-panel.tsx`;
  the synopsis write path.
- **Q3 (orchestrator).** PR 1 waits on #903. Merge it, or should PR 1 carry the addendum folder?
- **Q4 (Hugh).** The warning line over a saved overview on an illegal deck (H3) is undrawn. This plan draws it from
  the withheld form, as one line above the saved overview, and sends the copy to `/copy-review`. Accept that, or send
  it to Design?
