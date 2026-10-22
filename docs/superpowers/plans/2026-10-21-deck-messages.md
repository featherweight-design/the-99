# Deck page messages: one to-do card, one pass sheet

2026-10-21. Builds `design/design_handoff_the99_deck_messages/` (approved by Hugh 2026-10-22, READINESS Green,
engineering audit against `33ec792dd`, erratum 1 added) from the brief
`docs/superpowers/design-briefs/2026-10-21-deck-messages.md` (#2166). The A1 to A18 numbering is the brief's. Four PRs
and a close-out, one at a time, never stacked. Each PR is one mount at both widths.

## Calls (d9 for Hugh, 2026-10-22)

- **A6 beside Commit as v1** draws both: the header's primary button and the red A6 row (READINESS erratum 1).
- **Design's defaults stand** (Hugh ruled, 2026-10-22): the ran-out row gets a `Consider` press, and Commit and
  Discard live only in Review.
- **About** (Hugh ruled, 2026-10-22): the close-out edits the existing deck page entry (picture and wording). No new
  entry and no `ABOUT_VERSION` bump.
- **Side findings absorbed:** A10/A12's shared dismissal key retires (PR 4); "either tab below" (copy-review, PR 1);
  the guided banner's and `mixSourceLine`'s copy moves into `src/lib/copy` (PRs 1 and 4); Clear all auto's note moves
  into the provenance ledger, which draws at both widths (PR 2); the last N's titles come from the deck's body size,
  so a partner deck says 98 (PR 1); the dead `passRecountedAllKept` is deleted (PR 3).
- **Not absorbed:** the phone group-toggle note (not in the handoff).
- **Copy** runs through `/copy-review` once, before PR 1, for every new string; all of it lands in `src/lib/copy`.

## PR 1: the to-do card and its rule (1a, 1b, 1c)

PR 1 measured at about 2,000 changed lines (the last N's 696-line test file, and most of the pending banner going
dead), so it ships as three, approved by d9 2026-10-22:

- **1a:** `deckTodo` with every kind and its pair tests, the copy module, `TodoCard` and its row, and the fill failed
  and unresolved rows (their banners retire). Those two lead the precedence, so the next step is right in between.
- **1b:** the last N and ran out (`LastSlotsStrip` becomes the A8 row, its list opening inside the card under the row;
  `Consider` on ran out) and first run (the guided banner's step and crumbs head the card; the deck page's
  `GuidedBanner` retires, its strings into `src/lib/copy`, `0/{bodySize}`).
- **1c:** pending as a row, Review only; `PendingBanner` keeps only its version strip until PR 2's foot.


- **`deckTodo`** (`src/lib/decks/todo.ts`, pure): from the deck's facts, the rows present, their order, and the next
  step: the first present of fill failed › unresolved › over the 99 › the last N (or ran out) › pending changes.
  Spoken for twice is never the next step and sits right after it; then warnings, then actions in that order. A test
  per pair.
- **`TodoCard`** and its row (`src/components/decks/todo-card.tsx`): head (eyebrow, `{n} to do`; first run's step and
  crumbs), rows with a 30px mark tile, title, one line of body and one press (96px at 390, 132px at 1300, one column),
  the next step's label, tint, 3px inset edge and only filled press. The whole row is the hit area on the phone. Each
  short press carries the full shipped string as its accessible name.
- **Rows moved in:** fill failed (A9), unresolved (A15), the last N and ran out (A8, the door to the top-off list
  unchanged, M1 on its press), pending (A14, Review only), first run (A17, the guided banner's step and crumbs head
  the card). `builder-shell.tsx` mounts the card where those banners stood.

## PR 2: the header's lines and the card's foot

- The proxy line (A3) and the over line with Proposed cuts (A4) leave both spines. A4 becomes the over row; M3
  registers once, on its press.
- Spoken for twice (A6 over) becomes a row; `RollupBands` retires.
- **The foot:** version · proxies · `Where these N cards came from ▾` · `N in other drafts too ▾`. Provenance opens
  inside the card under the foot (the shipped ledger lines and Clear all auto's note); one disclosure open at a time,
  for the visit. With nothing to do, the foot stands alone as the quiet strip.
- Contrast gate for the `--danger` mark on its tint and the `--avail-over-fg` titles in all six themes.

## PR 3: the pass sheet

- `Show these N` and `N in other drafts too` open one `ModalChrome` sheet (phone) / modal (desktop): eyebrow the pass,
  title `{n} cards`, the pass's ledger sentence, its live cards, `Undo these N` and `Done`; the other-drafts form groups
  the cards under each draft.
- Rows are `DecklistRow`, All view, mounted unchanged inside the deck page's providers. A row opens the shipped card
  detail stacked through `registerSheet` with the pass's label; the ✕ removes as in the list.
- `PassMark` retires; `passRecountedAllKept` is deleted.
- Inventory `docs/superpowers/inventories/pass-sheet.json` with `shares.module` naming `DecklistRow`, so `pnpm
  check:shared` holds the row.

## PR 4: receipts, the toast and the mix (4a and 4b if it runs over, split at the migration)

- **Receipts last the visit:** `?from=precon`, `?imported=1`, `?updated=` are read once and stripped; ✕ hides for the
  visit; `arrivalDismissKey` retires. Every other reader of those params is checked first.
- The precon receipt (A10) is shorter; the update arrival (A13) draws on `ArrivalBandShell`; A12's phone takes the
  desktop sentence.
- **A11's ✕ on the account:** a new append-only `user_prefs` column per deck and precon (migration; `user_prefs` is
  already stamped and purged).
- The remove failure (A1) becomes the deck toast (`ToastFrame placement="deck"`, `role="alert"`, no press).
- The mix (A16) gains phone parity: the source line and the draft note join the phone's label row.

## Close-out

The full inventory below at 390 and 1300, the contact sheet, the walk against the brief and the handoff, and the edit to
the deck page's About entry (picture and wording, no version bump). Fixtures are written on local-dev or a scratch branch only.

## Inventory

| Surface | 390 | 1300 | Shares with |
|---|---|---|---|
| Deck page, card with the next step and warnings (Stack 1–3) | ☐ | ☐ | — |
| Deck page, ran out | ☐ | ☐ | — |
| Deck page, first run | ☐ | ☐ | — |
| Deck page, quiet strip (nothing to do) | ☐ | ☐ | — |
| Deck page, provenance opened in the foot | ☐ | ☐ | — |
| Pass sheet, from Show these N | ☐ | ☐ | `DecklistRow` (deck list) |
| Pass sheet, N in other drafts too | ☐ | ☐ | `DecklistRow` (deck list) |
| Card detail stacked on the pass sheet | ☐ | ☐ | card detail |
| Receipt band: precon, import, update, suggestion | ☐ | ☐ | `ArrivalBandShell` |
| Remove failure toast | ☐ | ☐ | `ToastFrame` (deck) |
| Recommended mix label row | ☐ | ☐ | — |
