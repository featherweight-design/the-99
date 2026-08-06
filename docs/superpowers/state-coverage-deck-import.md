# Gate 1 — State reachability: Deck import (#42)

Audit only. No code changed. Read against the worktree `feat/deck-import-pipeline`.

Sources of truth: `docs/superpowers/design-tables/deck-import.md` §"State coverage — Deck import
(19 states)", `src/app/decks/import-actions.ts`, `src/lib/decks/import.ts`, `src/lib/decks/read.ts`,
`src/db/schema.ts`.

Marks: ✅ reachable · ⚠️ type present, action incomplete · ❌ not surfaced at all ·
🚫 unreachable at runtime.

## Per-state table

| # | State | Surface | Type | Route/action | Runtime | Notes |
|---|---|---|---|---|---|---|
| 1 | Entry · empty | `ImportEntry` | n/a | n/a | ✅ | Needs no server data. Route `/decks/import` does not exist yet (PR 4) — expected. |
| 2 | URL fetching | Waiting block (indeterminate) | ❌ | ❌ | ❌ | No Moxfield client exists anywhere in `src/` (`moxfield` appears only in comments/copy). `importDeck` takes `text`, never a URL; `DeckImportSource` `"url"` (upload-limits.ts:23) only selects a byte cap. |
| 3 | Parsing & matching | Waiting block (determinate `done/total` + detected commander) | ❌ | ❌ | 🚫 | `importDeck` is one round trip returning only the final `ImportDeckResult`. No progress channel and no way to learn `total` or the detected commander before the action resolves — parse+match both happen server-side inside the same await. |
| 4 | Invalid / non-Moxfield URL | Failure banner | n/a | n/a | ✅ | Spec'd client-side; needs no backend. Blocked only on URL mode existing (PR 3/4). |
| 5 | Private deck (403) | Failure banner | ❌ | ❌ | ❌ | No fetch, no HTTP status surfaced. |
| 6 | Not found / deleted (404) | Failure banner | ❌ | ❌ | ❌ | Same. |
| 7 | Unreachable / 429 / 5xx | Failure banner + `Try again` | ❌ | ❌ | ❌ | Same. `Try again` is the only retry in the family and has nothing to retry against. |
| 8 | File rejected | Failure banner | ✅ | ✅ | ✅ | Client-side check can use `DECK_IMPORT_FILE_MAX_BYTES` / `DECK_IMPORT_FILE_MAX_LABEL` (upload-limits.ts:15–16). Caveat: the server's duplicate cap **throws** (import-actions.ts:61–67) rather than returning a union member, so a bypassed client check surfaces as an unhandled error, not the banner. |
| 9 | Nothing matched | Failure banner | ✅ | ✅ | ✅ | `{ ok:false, reason:"noneMatched", lineCount }` — import-actions.ts:86–88. Guard is on `cards` alone, which is correct. One false-positive path noted below. |
| 10 | Parsed but empty | Failure banner | ✅ | ✅ | ✅ | `result.lineCount === 0` (import-actions.ts:80) using `matched.length + unmatched.length` (import.ts:221), so section headers do not count. Reachable via an all-blank / all-sideboard paste. |
| 11 | Commander picker | `ImportCommander` | ✅ | ✅ | ✅ | `{ reason:"commanderNeeded", candidates }` from `result.legendaryCandidates`. Reachable. But candidates are **not** filtered for `commanderLegal` — see finding below. |
| — | Commander declared | nothing renders | ✅ | ✅ | ✅ | `declaredCommander` (import.ts:160–189) short-circuits the picker at import-actions.ts:90. |
| 12 | No legendary creature | Dead-end page | ⚠️ | ⚠️ | ⚠️ | Detectable only as `commanderNeeded` with `candidates.length === 0`. The variant carries **no line count**, so `copy.commander.noneBody(total)` has no data (import-actions.ts:40–44). |
| 13 | Arrival · clean | Arrival strip | ⚠️ | ⚠️ | ⚠️ | `unresolvedCount === 0` distinguishes 13 from 14, but the imported count `n`, the source (`from Moxfield`) and the per-deck dismissal flag have no field or column. |
| 14 | Arrival · unresolved | Unresolved banner + group | ✅ | ✅ | ✅ | `unresolvedCount` on the ok variant; `getDeckDetail` returns `unresolvedRows` (read.ts:91, 160–169). |
| 15 | Unresolved row at rest | `UnresolvedRow` | ✅ | ✅ | ✅ | `DeckUnresolvedRow` (read.ts:65–70) carries `rawName`, `quantity`, `sourceLine`; sorted `asc(sourceLine)` (read.ts:169) as the design requires. |
| 16 | Search & pick | Resolution expander | ⚠️ | ⚠️ | ⚠️ | Read side is complete (`row.id` seeds `expandedRowId`, `rawName` seeds the combobox). No mutation exists to act on the pick. |
| 17 | Nothing found | In-panel no-results | ✅ | ✅ | ✅ | Purely a function of the existing card-search result set. |
| 18 | Resolved | Row joins its type group + live note | ❌ | ❌ | ❌ | No server action writes to `deckUnresolvedRows` outside the import itself. |
| 19 | Deleted | Row removed from group and total | ❌ | ❌ | ❌ | Same — no delete action. |

## Cross-cutting rules from the design table (§20 and the conditional-render block)

| Rule | Mark | Notes |
|---|---|---|
| `statusPill` blocks `Complete` while any unresolved row exists (§20; README:61–63, 350) | ❌ | `statusPill({ built, ownedCount })` (`src/lib/decks/status.ts`) takes no unresolved input and cannot be given one. |
| `DeckCard` carries an unresolved-count badge on `/decks` (READINESS §Two product calls) | ❌ | `DeckListItem` (read.ts:182–193) has no `unresolvedCount`; `listDecksWithStats` never joins `deck_unresolved_rows`. |
| `deckCounts()` — unresolved rows included in `total` (§20) | ❌ | `deckCounts` (`src/lib/decks/grouping.ts:43–51`) returns `built`/`ownedCount`/`toBuyCount` only. There is no `total` at all, so state 19's `100 → 99` has nothing to decrement. |
| `ImportNote` kinds vs. the design's note surfaces | ⚠️ | §20 names `copy.notes.quantityClamped` as "the only non-fatal note", but `ImportNote` (import.ts:22–25) also emits `sectionSkipped` and `parseError`, both reachable, neither with a copy key or a drawn surface. Inverse gap: notes are produced with nowhere to render. |

## What would have to change

**🚫 State 3 (Parsing & matching, determinate).** `importDeck` (import-actions.ts:57) does the
parse, the catalog load, the match and the writes in one uninterrupted await and returns only the
terminal union. `done`/`total` and "detected commander name" are computed inside `buildDeckImport`
(import.ts:132) and discarded except as `lineCount`/`declaredCommander` on the *final* value. A
determinate bar and a mid-flight commander name are therefore not observable at runtime, whatever
props the component is given. Fix requires either (a) splitting the action into a cheap
`analyseDeckImport` that returns `{ lineCount, declaredCommander }` before the write, with the UI
driving the bar from it, or (b) demoting state 3 to indeterminate in the design.

**❌ States 2, 5, 6, 7.** Nothing in `src/` fetches a Moxfield deck; `grep -ri moxfield src` returns
only comments, copy and the export dialog. These are PR 3 scope, but nothing in the current backend
gives the UI a status code to branch on, so they cannot be built in the first UI PR.

**❌ States 18 and 19.** `deckUnresolvedRows` is written only in `importDeck`'s transaction
(import-actions.ts:125–134) and read only in `getDeckDetail`. `src/app/decks/actions.ts` exports
`createDeck`, `getDeckSuggestions`, `addCardToDeck`, `removeCardFromDeck`, `deleteDeck`,
`renameDeck` — none touches an unresolved row. Both states need new actions
(`resolveUnresolvedRow(rowId, oracleId)` deleting the row and inserting a `deckCards` row in one
transaction; `deleteUnresolvedRow(rowId)`), plus an Undo path.

**⚠️ State 12 has no line count.** The `commanderNeeded` variant is
`{ ok:false; reason:"commanderNeeded"; candidates: [...] }` (import-actions.ts:40–44).
`copy.commander.noneBody(total)` interpolates a total the UI cannot obtain — the only other place
it exists is `result.lineCount`, which is dropped on this branch. Add `lineCount` to the
`commanderNeeded` variant (it is already in scope at import-actions.ts:94).

**⚠️ State 11 can offer an illegal commander.** `legendaryCandidates` is filtered by
`isCommanderCandidate(card)` alone (import.ts:178), on a `DetailedCatalogCard` that has no
`commanderLegal` column. The re-validation on submit checks
`!commander.commanderLegal || !isCommanderCandidate(commander)` (import-actions.ts:100) and
**throws** on failure. So a banned-but-legendary creature (e.g. a banned legend) can be listed in
the picker and then hard-error when picked — a state with no design surface. Either load
`commanderLegal` into the detailed catalog and filter at import.ts:178, or return a union member
instead of throwing.

**⚠️ State 13 has no source and no dismissal.** `decks` (`src/db/schema.ts:125–133`) has
`id/userId/name/commanderOracleId/status/notes/createdAt` — no import-source column and no
arrival-dismissed column. The strip's copy `from Moxfield, just now` and the ruling "dismissal
persists per deck" (README:311) are both unsatisfiable. `createdAt` covers "just now"; the other
two need columns (or a `localStorage` dismissal, which contradicts "per deck, persists"). The
imported count `n` is also absent from the ok variant — derivable from `getDeckDetail().built` on
the deck page, but only if state 13 is rendered there rather than from the action's return.

**⚠️ State 16.** Read data is sufficient; it is blocked purely on the 18/19 mutations above.

**⚠️ State 9 false positive.** `cards` excludes the declared commander (import.ts:166–172, 185–189).
A list whose only *matched* line is its declared commander therefore reaches
`result.cards.length === 0` with `lineCount > 0` and renders "We couldn't find any of these cards"
even though one card matched. Not unreachability, but a wrong banner on a real input. The guard
would need to be `result.cards.length === 0 && !result.declaredCommander`, with a decision about
what a commander-only import should do.

**⚠️ Notes with no surface / counts with no field.** See the cross-cutting table: `statusPill`,
the `/decks` badge, `deckCounts().total`, and the `sectionSkipped` / `parseError` note kinds.

---

## Orchestrator triage (verified against the plan and the code, 2026-08-05)

Every claim above was re-verified by hand. **Most of the ❌ marks are not gaps** — they are
states the execution plan deliberately assigns to a later PR, and the audit was run without
the plan in context. Recording that here so a future reader does not re-open settled scope:

| Audit mark | Verified disposition |
|---|---|
| States 2, 5, 6, 7 (URL fetch, 403, 404, 5xx) | **PR 3**, currently blocked at hard pause point 1 — Moxfield returns 403 behind Cloudflare bot protection. Not a Gate 1 failure; a product decision. |
| States 18, 19 (Resolved, Deleted) | **PR 8** (`## PR 8 — Resolution: states 15–19`), items 1–8. Planned. |
| `deckCounts` has no `total`; `statusPill` cannot see unresolved rows; `DeckListItem` has no `unresolvedCount` | **PR 6**, items 1–4, 11, 12 — all three named explicitly. Planned. |

### Fixed before the UI build began

- **State 9 false positive.** `cards` excludes the declared commander, so a list naming only
  its commander had an empty `cards` and rendered "We couldn't find any of these cards" over
  a deck we were about to build successfully. The guard now also requires no declared
  commander.
- **State 11 could offer an illegal commander.** `legendaryCandidates` filtered on
  `isCommanderCandidate` alone, which reads only the type line. The picker's output is
  submitted straight back, and the action rejects an illegal commander by *throwing* — so a
  banned legendary became an unexplained error with no design surface. `DetailedCatalogCard`
  now carries `commanderLegal` and the candidate list filters on it.
- **State 12 had no total.** `commanderNeeded` carried only `candidates`, but the copy string
  is `noneBody(total)`. It now carries `lineCount`.
- **Notes were dropped on every failure path.** A `parseError` note is often the only
  explanation for state 10; all four result variants now carry `notes`.

### Escalated to Hugh — not an eng call

- **State 3 (🚫) is real and stands.** Design drew a *determinate* progress bar with
  `done/total` plus the detected commander name mid-flight. `importDeck` is a single
  server-action round trip, so nothing is observable until it resolves. Either the bar
  becomes indeterminate, or the action splits into parse → match → write. Recorded, not
  decided.
- **State 13's "imported from Moxfield" provenance and its per-deck dismissal** need columns
  on `decks` that do not exist and that no PR in the plan adds.
