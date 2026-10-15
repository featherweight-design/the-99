# Plan: a way in without a collection

2026-10-15. Brief `docs/superpowers/design-briefs/2026-10-15-no-collection-entry.md`. Handoff
`design/design_handoff_the99_no_collection_entry/` (R2, approved by Hugh; G1 settled by his loosened ruling 1, G2
confirmed 2026-10-15). The engineering audit is in that handoff's READINESS.md.

This plan builds the whole line. The zero-card paths come first (PRs 1 to 4). Then the R3 addendum, also approved by
Hugh: the way into the precon pick for a player who already has cards, S17, S18 and S19 (PR 5). The seam, About and the
close-out come last (PR 6). The engineering re-audit of R3 is GREEN, so nothing is held.

**It changes first run for every new account**, so it ships dark behind a switch of its own and goes on in
production only at close, by Hugh.

## The switch

`NO_COLLECTION_ENTRY_ENABLED`, kind `feature`, `needs: COLLECTION_EDIT_ENABLED`.
- Every surface below is drawn only when it resolves on. Off, each route is exactly as shipped.
- PR 1 adds it: the registry, the `flag_overrides` switch-check migration, and `flags.ts`.
- It is `'true'` on staging from PR 1, and unset on production until the close-out.
- All features (#1790) raises it for Hugh's account like any other feature switch. Hugh can try the line on
  production before it opens to anyone else.

## PR boundaries

Each PR stays under about 20 files and 800 lines. UI PRs pass `design-review` and carry a contact sheet.

**PR 1: the write, dark.** Backend only, no UI.
- **The switch:** the registry entry, the migration and the flag function.
- **History** (`history-kind.ts`, `history-view.ts`, copy):
  - a `deck_add` kind;
  - source `deck:<deckId>`;
  - a title keyed by the deck's name.
  - Revert takes the entry back like any add.
- **The deck-to-collection add, inside the import** (`import-actions.ts`), behind the switch and an `own` input:
  - It runs as `applyCollectionChange`'s `inside` hook, as `start-owned.ts` does. The cards are added first, then
    the deck is written, so a refusal leaves neither.
  - Lines: every line the list names, at the printing the import kept. Failing that, the list's own named
    printing. Failing that, the card's default printing (`PendingItem` with no printing). Plus the commander(s),
    which `deckCardValues` leaves out. Unresolved lines add nothing.
  - **Nothing is reserved**: an import is not a precon start.
  - Idempotent on the import's action id.
- **Tests:**
  - the line set, including the fallback order, commanders included and unresolved lines excluded;
  - the refusal leaving neither deck nor cards;
  - Revert.
- **`pnpm probe:deck-own`** on a scratch branch made from local-dev: the add, its entry and its revert.

**PR 2: the import's tick** (`/decks/import`, both widths). S8 to S12.
- The `I own these cards. Add them to my collection.` checkbox, shown when the switch resolves on (G4: at any
  collection size). It uses `StartPreconDialog`'s opt-in anatomy.
- The tick carries through the commander-needed step and every arrival variant: clean, unresolved lines and
  printing clauses.
- The arrival uses `ArrivalBand`'s three-line form.
- The add's refusal goes in the page's own `FailureBanner`, not a toast: one refusal channel per page.
- **`ArrivalBand`'s dismiss becomes the ✕ alone** at both widths, 32px on desktop and 44px on the phone, for every
  arrival strip. This touches every arrival-strip test.

**PR 3: Precons I own** (`/decks/precons?pick=own`, both widths). S2 to S7.
- Pick mode on the shipped list, in rows:
  - search, pips and year groups are kept;
  - one row per twin pair, with a Regular / Collector's Edition radio when ticked;
  - a sticky foot: held at zero, then `3 boxes · 300 cards and 31 tokens`.
- Reads:
  - per-box token totals on `PreconSource`;
  - `?pick=own` gets its own `cachePageForUser("precons")` key;
  - the header's way back (`‹ Home` / `‹ Collection`) comes from the entry.
- The write is `addPrecons`, a server action that calls `addPreconForUser` once per box, each with its own action
  id: one History entry per box, tokens marked.
  - **Part-failure (S7)** names the boxes that landed and the ones that didn't, and retries none silently.
- After the add: Home's dashboard under a receipt strip in the arrival-strip anatomy, with its own dismiss key (not
  `arrivalDismissKey(deckId)`, since there is no deck).
- **Tests:**
  - the twin rule and the token sum;
  - part-failure across three boxes with the middle one failing;
  - one id per box, with a retry answered from the committed entries.

**PR 4: the ways in, and the lock** (Home's first run, the empty Collection, the shell). S1, S12 (Home), S13, S15,
S16.
- **The "ways" group** (`No file? Start another way`: Precons I own, Import a deck, Add cards by hand) is one
  component.
  - Desktop draws it as three columns; the phone as three 44px rows.
  - It is used on first run's step 1 and on the empty Collection. `Add cards by hand` moves out of step 1's button
    row into it.
  - Upload stays the only fill and comes first (ruling 1, loosened).
- **The nav lock at zero cards, with the switch on:**
  - Collection opens: `LOCKABLE` drops it.
  - The well and the phone bracket span the other three (the bracket moves from `ml-[20%]`, `nav.tsx:422`).
  - The note reads `Go to step 1` in first run, and `Add your cards` (to `/collection`) outside it.
  - With a deck, the note adds `Your decks are on Home until then.` That needs the shell to read the deck count and
    the first-run state beside `uniqueCards`.
  - `useGoToStep1`'s fallback is fixed.
- **`/commanders` and `/discover` empty states:** they move to copy keys (`Nothing to rank yet`, `Add your cards`).
  With the switch off they keep today's words and link (`/collection`).
- **Stale comments the brief names:** `first-run.tsx:1-4` and `page.tsx:103-106`.
- **Mobile and desktop parity** in this PR.

**PR 5: Precons I own, once the player has cards** (R3 addendum: S17, S18, S19, E2).
- **The way in (S18):** one row in the Add cards sheet's empty state, `Own precon boxes? Pick them ›`, a 52px row
  at both widths.
  - On the phone it sits under the shipped `Have a file? Upload it instead` row, with upload first. On desktop it is
    the only row, since the upload is already in the head.
  - It is shown only while the sheet's list is empty, with `PRECONS_ENABLED` and the line's switch on.
  - Pressing it closes the sheet and opens `/decks/precons?pick=own&from=collection`.
- **The pick with cards (E2):** the shipped `you own N of M` on every row while the collection holds any card. The
  back link and Done's destination follow `from` (`‹ Collection`).
- **S17:** the `✓ added <date>` mark and the plain note under a ticked row. Both read the player's standing precon
  adds (`standingPreconAdds`) once for the whole list, not once per row. A box marked this way stays pickable.
- **S19:** Done from Collection returns to Collection, with the receipt strip under the tabs. It uses PR 3's receipt
  component and its dismiss key.
- **Tests:** the row shown only while empty and with both switches; `from` deciding the back link and the
  destination; the added mark keyed by file name.

**PR 6: the seam, About, and close-out.**
- **S14:** Replace's warning gains the clause naming what a first file would remove. This lands after Collection
  Sync's PR 2 has merged; if it hasn't, this PR waits for it.
- **About** (batched to the line's last PR, per the multi-round rule):
  - the new entry `start-without-a-collection`, `since: 15`, which bumps `ABOUT_VERSION` 14 → 15 once;
  - it follows `NO_COLLECTION_ENTRY_ENABLED` through `AboutSwitch`, so it is announced when the switch flips;
  - its precon sentence is restructured so it can follow `PRECONS_ENABLED` line by line;
  - the app draws one caption at both widths;
  - the `deck-import` entry gains its key line (3 → 4);
  - the `precons` entry gains R3's sentence (`Press Add cards in your Collection, then Pick them…`), since the way in
    ships in PR 5.
- **`/copy-review`** over every new string in the line.
- **`feature-acceptance` close-out walk** on staging at 390 and 1300, against the inventory below.

## Route × viewport inventory

| Route / surface | 390 | 1300 | Shares |
|---|---|---|---|
| Home, first run, step 1 with the ways group | ☐ | ☐ | ways group |
| `/collection`, empty, with the ways group | ☐ | ☐ | ways group |
| The nav at zero cards: note, well and bracket (first run and outside it, with and without a deck) | ☐ | ☐ | — |
| `/decks/import` with the tick: clean, unresolved, commander-needed, refusal | ☐ | ☐ | `ArrivalBand` |
| `/decks/precons?pick=own`: empty, picked, twin, pending, part-failure | ☐ | ☐ | — |
| Home after a precon add, with the receipt strip | ☐ | ☐ | arrival strip |
| `/commanders` and `/discover` empty | ☐ | ☐ | `EmptyState` |
| `/collection/replace` choice after a built collection (S14) | ☐ | ☐ | `UploadChoice` |
| `/collection` Add cards sheet, empty, with the precon row (S18) | ☐ | ☐ | — |
| `/decks/precons?pick=own&from=collection` with cards: owned figure, added mark, S17 note | ☐ | ☐ | — |
| `/collection` after a pick from Collection, receipt under the tabs (S19) | ☐ | ☐ | receipt strip |
| `/about`, the new entry and the precons edit | ☐ | ☐ | — |

`docs/superpowers/inventories/no-collection-entry.json` carries these rows, plus a `shares` block naming the ways
group for step 1 and the empty Collection.

## Nothing held

The R3 addendum (approved by Hugh, 2026-10-15; engineering re-audit GREEN) drew the way in for a player who already
has cards, so PR 5 builds it. Nothing in the line waits on Design.

## Risks and how each is held

- **First run changes for everyone.** The line stays dark until close. All features lets Hugh see it on production
  first.
- **Data loss.** Every write is an add with one History entry, and Revert takes it back. No path replaces. The deck
  add writes cards before the deck in one transaction.
- **The ✕-only dismiss touches every arrival strip.** PR 2 runs its contact sheet over every surface that draws one.
