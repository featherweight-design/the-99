# Deck notes: build plan

2026-10-11. Source: `design/design_handoff_the99_deck_notes/` (R4, READINESS GREEN, Hugh's ruling 5 confirmed),
brief `docs/superpowers/design-briefs/2026-10-11-deck-notes.md` (Hugh's seven rulings, engineering's eight locks).
Nothing is built. Simple, per Hugh: one-line notes, auto-dated, select to mark done (`Done (N)`), edit and
delete, `[[Name]]` card links that open card details. No reminders, due dates or sharing.

## Scope decisions this plan makes

1. **Switch:** `DECK_NOTES_ENABLED` (`src/lib/decks/notes-flag.ts`, the `stats-flag.ts` shape: exact string
   `'true'`, server-read, off in production). Gates the segment cell, every action, the read, and the About
   entry (a new `AboutSwitch` member, wired in `src/lib/about/visible.ts`).
2. **One table, `deck_notes`** (lock 1, no trigger: Home and `/decks` do not read it, `check:list-cache` stays
   green, no tile mark). Columns: `id`, `deck_id` (cascade), `user_id`, `body`, `done_at`, `created_at`,
   `updated_at`. Check constraint `char_length(body) between 1 and 1000` (F6: the action enforces 140
   RENDERED code points; the raw cap is loose because a tag is stored longer than it draws). Index on
   `(deck_id, created_at)`. The 100-per-deck cap lives in the add action under a row lock on the deck, with the
   RF refusal for a race (F6).
3. **Tag storage:** `[[<oracle uuid>|<name at that moment>]]` inside `body` (lock 2). Pure module
   `src/lib/decks/notes-body.ts`: `parseBody` (segments: text | tag), `renderedLength` (a tag counts as its
   name), `formatTag`, validation of the uuid shape. A hand-typed `[[Name]]` with no id stays plain text. The
   draw resolves the current catalog name and falls back to the stored one; "held" is solid, "not held or
   departed" dashed, unresolvable plain (G2: no history per tag, as READINESS says).
4. **Four actions** in `src/app/decks/notes-actions.ts`, each `requireUserId` then `requireDeck`, shape-checked,
   flag-checked, revalidating `deckSurfaces`: `addNote`, `editNote` (date stays the creation date, no "edited"),
   `setNoteDone` (select or unselect; done notes keep `done_at` for `done 9 Oct`), `deleteNote`. Refusals use the
   shipped `MutationError` copy path. Notes go to no prompt, no fingerprint, no Suggested changes pack (lock 6,
   F10).
5. **Read:** `readDeckNotes(deckId, userId, deck)` (`deck` carries the commander and partner ids) in the deck page's
   loader behind the flag: the notes query, then, only when a note holds tags, two batched lookups, catalog names
   and which tagged cards the deck holds. It loads no art. Today is the player's local day (G6), as in the game log.
6. **Picker:** a separate lookup, `searchNoteCards` (`notes-store.ts`, exposed by `notes-actions.ts`), not a mode
   on `searchCards` (F5, G5): it shares `nameSearch` and `isGameCardWhere()`, has no legality filter, and
   returns `oracleId`, `name`, `typeLine`, `commanderLegal`, `imageUri` and the matched `flavorName`. No ownership,
   availability or facts: the per-keystroke Add search carries those for nothing here. The deck's own cards need
   no search (local list, first).
7. **UI:** `DeckPanel` gains `"notes"` (in-memory for one visit, like `"stats"`; F3, the handoff's stored-value
   language is stale). The hairline group draws when either switch is on: `All · Shopping | Stats · Notes`, with
   Stats off `All · Shopping | Notes` (F2). Panel: input (or the cap line), open notes newest first (six, then
   `Show all N`), `Done (N)` closed by default. Delete uses `DeleteConfirm`. `[[ ]]` button inserts with
   `setRangeText` and keeps focus so a phone keyboard stays up (G10). Phone focus hides the sticky add bar and
   tab bar through a small focus signal from the input to the shell (F7).
8. **Copy:** `src/lib/copy/deck-notes.ts` from `notes-copy.ts` with F9's edits (drop withdrawn R3 strings,
   interpolate `NOTES_PER_DECK`, reword the RF line), through `/copy-review`; the About caption through
   `/prose-pass`. Vocabulary: select/unselect, never tick.

## PR boundaries (each under ~20 files and ~800 lines, no stacking: each merges before the next opens)

| PR | Contents | Proof |
|---|---|---|
| **1 · data and actions** | migration + schema, `notes-flag.ts`, `notes-body.ts`, `notes-actions.ts`, `readDeckNotes`, the `searchNoteCards` lookup, `probe:deck-notes-actions` (add/edit/done/delete/cap race/refusals on local-dev) | unit tests per action (ownership, flag off answers nothing, caps at 140 rendered and 100 per deck, done keeps date, delete), `.toSQL()` assertion on the read, probe |
| **2 · panel** | `DeckPanel "notes"`, segment cell and counts, the Notes panel (empty, add, rows, Done, edit, delete, caps, many, refused), picker and tag draw opening card details, focus signal, copy module, design table committed to `docs/superpowers/design-tables/deck-notes.md`, contact-sheet inventory | component tests, `probe:deck-notes` in a browser at 1300 and 390 (add, `[[` pick, tag press opens details, select, edit, delete, cap), `feature-acceptance` route x viewport inventory, `check:copy-drift` |
| **3 · About** | entry in chapter 03 after Deck stats, `DECK_NOTES_ENABLED` AboutSwitch, re-pin of the About hash | `about.test.ts`, `check:copy-drift` |

PR 1 ships dark (no UI reads it); PR 2 ships behind the switch, off in production until Hugh walks it (lock 8).

## About: no bump (ruled, orchestrator, 2026-10-11)

The entry is added with `since: 14` (the current `ABOUT_VERSION`), gated on `DECK_NOTES_ENABLED` through an
`AboutSwitch`, and the content hash is re-pinned; no version bump. Readers see switched entries by id, so
flipping the switch is what announces it. READINESS G7 (and the audit's "bump in the build PR") is superseded
for switched entries.

## Caches (the deck page, #600)

The deck page caches exactly two reads through `cacheForUser` (`page.tsx:168`): `loadDeckSuggestions` and
`readSynergyCards`, under the `user-lists:<userId>` tag. The notes read is a separate, uncached read in the
page's own loader, outside both, so a notes write has nothing cached to retire there. The rendered route is
retired by `deckSurfaces(deckId)` (`/decks/{id}`, `/decks`, `/decks/shopping`, `/`), which every notes action
calls. Notes are in neither cached payload and in no list-stamp table. PR 1 pins this with a test that the read
is not routed through `cacheForUser` and that each action revalidates `deckSurfaces`.

## Risks and what I will measure

- **Cap race:** two adds at 99 notes. Row lock on the deck row inside the add transaction; probed with two
  concurrent calls.
- **Tag drift:** rename or removal of a card from the catalog; covered by the unresolvable-tag test.
- **Phone keyboard:** `setRangeText` plus refocus, walked at 390 in a real browser, not asserted in jsdom.
- **Measure on staging, mutate on local-dev:** the many-notes layout is checked on a staging-shaped deck
  pulled with `pull:staging` onto a scratch branch (deleted after).

## Not doing

Reminders, due dates, sharing, bulk delete, a mark on decklist rows, a tile count, an edit history, `edited`
labels, notes in any prompt.
