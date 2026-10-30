# The 99 — Collection Sync (design handoff, R2)

`design_handoff_the99_collection_sync/` · 2026-10-15 · account 2 · **R2: Hugh's R1 audit passed with two changes, both made here.**

Source of truth: `docs/superpowers/design-briefs/2026-10-14-collection-sync.md`, on branch `brief/collection-sync`
(not on main yet). Read alongside: `upload-choice.tsx`, `replace-review-detail.tsx`, `review-screen.tsx`,
`lib/copy/collection-edit.ts`, `lib/copy/card-assignments.ts` (the summary), `lib/copy/about.ts`, and the
`collection_edit` and `collection` handoffs this mirrors.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then
rebuild in the app's stack. Every value is an existing Kaldheim token (`--surface #1E1F26`, `--border-strong #2E3340`,
`--accent #5C86C9`, `--success #6FA368`, `--warning #E0913C`, `--danger #C6533F`, and the rest of the shipped block).
**No new tokens, no new components beyond the conflict row, no new dependencies.** Card and deck names are illustrative;
the fixture's figures come from the brief's staging reads.

| File | Holds |
|---|---|
| `The 99 - Collection Sync (R2).dc.html` | The ten calls, the merge rule, the locks. Start here. |
| `R1 - Choice-Desktop.dc.html` | C1 nothing picked, C2 Sync picked, C3 Sync unavailable (three reasons), C4 focus. |
| `R1 - Choice-Phone.dc.html` | The same at 390. |
| `R1 - Stale.dc.html` | S1 Hugh's case (file's cards match the last upload, carries tokens), S2 an older file with the follow-up choice. Both widths. |
| `R1 - Review-Desktop.dc.html` | The Sync review with no conflicts: tiles, tokens line, decks short, lists, bar. |
| `R1 - Review-Phone.dc.html` | The same at 390, plus R3, the tokens-only review (the staging fixture). |
| `R1 - Conflicts-Desktop.dc.html` | K1 three conflicts, bar held; K2 all answered, two to the file; K3 98 conflicts after a bulk press; K4 focus. |
| `R1 - Conflicts-Phone.dc.html` | The same at 390, plus the held button's jump to the first card left. |
| `R1 - Edge-States.dc.html` | Reading; a re-sync that changes nothing; nothing of yours to keep; the 500 cap; the stale pick named in the review. |
| `R1 - Confirm.dc.html` | Short-deck dialog (desktop) and sheet (phone) in Sync's words; confirming; refused; unconfirmed. |
| `R1 - Receipt.dc.html` | The import summary after a Sync (both widths), History's entry opened, the partial revert. |
| `R1 - About-Entry.dc.html` | The `upload-choice` and `post-import` edits. |
| `STATES-collection-sync.md` | Every state, with its Must-nots. |
| `READINESS.md` | R1's self-assessment. |
| `collection-sync · copy strings.ts` | Every new string, for `/copy-review`. |
| `about · collection sync.ts` | The About edits as code. |
| `design-tables/collection-sync.md` | The design-table section. |
| `brand/` | The locked brand sheet. |

The same canvas is live as a Design artifact in account 2.

## R2 (2026-10-15)

Hugh's audit of R1: two changes, everything else approved. The `R2 - *` boards and `The 99 - Collection Sync (R2).dc.html`
replace their R1 namesakes; boards with no R2 copy (Choice-Phone, Receipt, About-Entry) are unchanged from R1.

1. **Desktop choice cards lose their left gutter.** The radio now sits on the title row, and the body, the figure and
   the note run the full width of the card. Radio 22px at the card's padding (22, 22), title indented 34px
   (radio 22 + gap 12) with a 26px line so the radio centres on it. This is the shipped `Card` in
   `upload-choice.tsx`, so it changes Replace's and Add's cards on desktop too: same words and order, new layout.
   Phone (padding 14) keeps the radio column, which costs less there. Boards: `R2 - Choice-Desktop`, `R2 - Stale`.
2. **`Kept from the app` reads `Kept from The 99`**, in the tile (`kept from The 99`), the list heading
   (`Kept from The 99 · N`) and everywhere the board and tables quote it. Boards: Review, Conflicts, Edge-States,
   Confirm, Main.

---

## The answer in one line

A third card, Sync, drawn after Replace and Add, none picked; its review is the shipped review with four Sync tiles, a
tokens line, and the cards both sides changed on top as pairs of radios with two bulk presses; every count is in cards.

## The open questions, called (brief §Open)

1. **The name: Sync.** The card reads `Sync my collection`, beside `Replace my collection` and `Add these cards`. It is
   the word Hugh ranked and collides with nothing in the app; the body says what it keeps and what it takes. `Merge`
   reads as engineering; `Keep my changes` hides that the file is taken too.
2. **Three equal cards, none picked, Sync third.** Replace and Add keep their place and words (lock 4) and the shipped
   rule that the choice preselects nothing stands. Sync earns its pick with its note (`Keeps the 121 cards you changed in
   the app since your Oct 2 upload.`), in the quiet ⓘ style: keeping is not a risk. Desktop: three columns. 390: three
   stacked, each with its figure. The step title becomes `What’s this file for?` at both widths (the About caption's own
   words). Unavailable: the card stays, dimmed, focusable (`aria-disabled`), its reason in a dashed box where the figure
   was. One reason, in this order: never uploaded, past 90 days, no record of the last upload (a reverted last upload
   reads as no record).
3. **Conflicts: a section at the top of the Sync review, not a step.** An answer moves a card between the tiles above it,
   so the consequence is on the same screen. Each row is a `fieldset`: the card and its printing (mono), what it was at
   your last upload (`at Oct 2 ×1`), then two radios, `App ×3` and `File ×2`, each 44px. Nothing is pre-picked (brief
   proposal 2). Bulk: `Keep the app’s for all N` and `Take the file’s for all N`, ordinary buttons whose names carry the
   count, acting on every conflict, shown or not; one press decides 98. The bar waits: `N cards still to decide.` with
   `Sync collection` held (`aria-disabled`, .4); pressing it scrolls to and focuses the first unanswered row. No toast,
   no inline error: the bar's line is the reason.
4. **The stale file: a banner at the head of the choice step, options under the cards.** It concerns the file, and an
   old file is most dangerous under Replace, so it heads all three. It says “looks”, never “is”: `This file looks older
   than your Oct 2 upload.` or, for a file equal in cards to the last upload, `This file looks no newer than your Oct 2
   upload.` With Sync picked, a fieldset follows the cards (never nested in a card): **Only what it adds** (picked when it
   appears; it can take nothing away), **Only its tokens**, **Everything, removals too**. Cancel is the step's own.
   Tokens always ride with the cards' choice (lock 2), so additions-only and tokens-only combine; when the file adds no
   card, the follow-up isn't drawn and Sync's note says it records only the tokens (Hugh's case, S1). The review heads
   with one warning line naming the pick and a `Change` link back (E5).
5. **What a row shows: four tiles, in order of risk.** `to decide` (warning ink and edge while non-zero, faint at 0),
   `from the file` (the shipped up-or-new green), `kept from The 99`, `nothing to do`. Agreed cards (both sides moved the
   same way) count in `nothing to do` and are listed nowhere. Lists: To decide, then the shipped file-side three
   (`Leaving your collection`, `Going down`, `Going up or new`), then `Kept from The 99`, whose rows read the shipped way
   (`at last upload → now`). The `edited` tag and the overwrite banner appear only when a conflict is answered File,
   the one place Sync overwrites the player's work: `Taking the file’s count overwrites 2 cards you changed in the app
   since your Oct 2 upload.`
6. **One unit: cards** (one printing in one finish, what the shipped tiles count). Never ledger entries (a precon add is
   1 entry and 97 cards), never copies. Bar: `Taking 18 cards from the file and keeping 121 of yours, with 114 tokens.
   1 deck will read short.` Button: `Sync collection`, pending `Syncing…`. With no card moving, the button names what
   happens: `Record 114 tokens`. See G1 for the one inherited exception.
7. **The receipt.** The shipped import summary. The lede gains a clause and a sentence: `Was 4,616. 15 arrived and 2
   left, and the 119 cards you changed in the app stayed as you had them. You decided 3.` The short-deck sentence reads
   `Syncing left a deck short: …`. A tokens-only sync takes the nothing-to-report lede with Sync's ending. History: one
   entry, kind `Sync upload` (fits the 150px column), titled by the file; opened, it leads with `Kept the 119 cards you’d
   changed in the app. You decided 3. Recorded 114 tokens.` above the shipped groups. Revert and `Revert what’s left` are
   the shipped confirm with `Revert this sync?`.
8. **An unknown base: Sync is disabled, with the reason on the card.** A merge reduced to “take the file's additions”
   would be a fourth mode to explain, and Add already covers it for a player who wants nothing removed.
9. **Tokens: one line under the tiles, no token rows.** `114 tokens will be recorded from the file, as an upload records
   them. Tokens you marked by hand stay.` with `114 tokens · 313 copies` on desktop. A hand mark the file also reads takes
   the file's count, as Replace does today, without a row: a token count can't leave a deck short, and a row per token
   is noise in the one screen whose job is the cards.
10. **A re-sync.** The card's note says `Nothing new in this file. It matches your last upload, tokens included.` Its
    review states `Nothing to sync.` and the bar offers `Back to Collection`, so no empty History entry is written. Same
    file with new tokens: the tokens-only review (`Record 114 tokens`).

## Other decisions

- **Sync is drawn third**, not first, so the two shipped cards don't move. The step is the only shipped copy that
  changes (its title and its desktop lead-in), and that is the step's copy, not Replace's or Add's.
- **The choice's figure** for Sync is the shipped after-figure (so the three compare), and follows the stale follow-up's
  pick.
- **The short-deck dialog** is §E as shipped with `Syncing leaves N decks short` / `Sync anyway`. Kept app changes never
  lower a card, so Sync's dialog is usually shorter than Replace's for the same file; Hugh's 2 short decks under Replace
  are 0 under a tokens-only Sync.
- **Failures stay inline** (shipped A5, A-unconfirmed), not ToastFrame: the review is still on screen and the failure
  belongs to it. Conflict answers survive a failure, a retry and Back.
- **Under Only what it adds**, a card both sides changed is a conflict only when the file's count is higher; a lower
  file count is ignored with the rest of the file's removals. Under Only its tokens there are no conflicts.
- **A held button, not a disabled one**, so a keyboard player can press it and be taken to what's blocking.
- **Screen reader:** the tiles are one polite live region, announced once per answer or bulk press; a bulk press says
  `Kept the app’s count for all 98. You can still change any one.` once. A conflict row's accessible name is
  `Arcane Signet, at Oct 2 ×1, app ×3, file ×2`.

## Gaps

- **G1 · “cards” on the choice card is copies.** The shipped after-figure (`4,616 → 4,345 cards`) counts copies, while
  the tiles count printings-in-a-finish. Sync reuses the figure so the three cards compare; every other Sync count is
  cards in the tiles' sense. Engineering or `/copy-review` may want the figure to say `copies` on all three, which would
  touch Replace and Add's cards (lock 4), so R1 leaves it.
- **G2 · Stale detection is unmeasured.** No staging file is older than its predecessor; the only staging case is the
  equal one (S1). The two warning forms (no newer / older) follow the brief's three heuristics; their thresholds are the
  plan's.
- **G3 · Revert doesn't take tokens back.** Token writes aren't in the ledger, so Revert of a Sync (as of a Replace today)
  leaves the recorded tokens. The revert confirm says so (`The 114 tokens it recorded stay recorded.`). If engineering
  makes Revert restore token rows, that line goes.
- **G4 · The issues panel says tokens are skipped.** The shipped review counts `token and emblem rows skipped`, which
  reads against Sync's tokens line. On a Sync the line counts emblems only (`emblem rows skipped`), which needs the
  preview to split the two counts. Replace's panel is unchanged.
- **G5 · Conflict frequency is unmeasured.** Staging has no file uploaded after hand changes to the same cards. The
  3-conflict and 98-conflict frames are hand-built from the rules.
- **G6 · The refusal title says “import”.** `We couldn’t import that` is shipped; `/copy-review` may want `We couldn’t
  sync that` for this mode.
- **G7 · The anchor moves (brief proposal 8, assumed).** After a Sync, “since your last upload” counts from the Sync, so a
  kept change reads as uploaded. R1 draws no line about it.
- **G8 · The stale follow-up needs more reads.** Each option's figure and the choice's after-figure need its own dry
  run; the choice step reads one per mode today.
- **G9 · The history entry's kept and decided counts** aren't ledger rows. They need storing on the entry or the
  summary payload, or the opened entry drops that line.
- **G10 · The step's title changes** at both widths (`What’s this file for?` replaces `Replace your collection, or add
  to it?` / `Replace or add?`). It is the step's copy, not a card's; Hugh rules whether lock 4 covers it.
- **G11 · Bulk past the 500 cap** must resolve by rule on the server (all conflicts → app, or → file), never by the
  shipped row ids, or a bulk press would act on the shown rows only.

## Notes for engineering

- **New:** `ConflictRow` (fieldset, two radios, 44px each), `SyncConflicts` (heading, bulk presses, rows, Show all), the
  stale follow-up fieldset, the Sync tile set, the tokens line.
- **Changed:** `UploadChoice` gains a third card, its unavailable form and the stale banner; `ReplaceReviewDetail` gains
  `mode="sync"`; the confirm bar's sentence and held state; `ShortDeckWarning` titles; History kinds gain `uploadSync`;
  the summary's lede and `nowShort` take a Sync verb.
- **Unchanged:** Replace and Add's cards, reviews and confirms; the first import (`STEP 2 OF 3`, no choice).
- **Switch off:** no choice step, so no Sync; nothing reserved.
- **Reduced motion:** no new animation.
