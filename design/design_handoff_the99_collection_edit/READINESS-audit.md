# Readiness audit — collection edit R1 (sub-projects 1+2)

Eng audit, 2026-10-09. Verdict: **YELLOW** — Hugh has ruled on the one open design call; only
engineering-resolvable items remain.

## Verified against source of truth

- Brief `docs/superpowers/design-briefs/2026-10-06-collection-foundation.md` (origin/main, already
  carries the 2026-10-09 rulings), plan `docs/superpowers/plans/2026-10-09-collection-write-path.md`,
  roadmap `docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`.
- **PR #1304 is merged** (`gh pr view 1304`: mergedAt 2026-10-09T16:32:53Z). READINESS.md's
  "Blocking #1, PR #1304 unmerged" is stale as of this audit — the brief on `origin/main` already
  reads as the handoff assumed. Not a live blocker.
- One handoff covers sub-projects 1+2 (ruling 12): confirmed, both README and brief agree.
- Every player action is one history entry: confirmed in STATES' Must-nots (B8, C3) and the
  README's "Notes for engineering."
- First import into an empty collection skips Replace/Add (A6): confirmed, matches brief's
  2026-10-09 exception.
- Empty collection offers Add cards beside the upload, both `/collection`'s empty state (B0b) and
  Home's first-run step one (B0c): confirmed at both widths.
- Short-deck warning runs inside the save and names the decks; confirm re-checks (E4–E6): confirmed
  against brief §E and write-path plan Decision 5 (check runs inside the transaction, under the
  lock; a changed answer redraws rather than going through stale).
- A card reduced to zero is removed, not shown as 0 (C8, D): confirmed against write-path plan
  Decision 1 step 5 (zero rows are deleted, never stored at `quantity = 0`).
- Revert links that aged out past 90 days are drawn as absent (F1, README point 8): confirmed.
- Duplicates mean the exact same card, printing and finish (B5, README §B): confirmed, matches
  the brief exactly.
- Switch-off state matches `main` exactly (G): confirmed, no slots reserved for absent controls.
- Surfaces A–G: every state in STATES-collection-edit.md draws at both 390 and desktop unless
  explicitly noted single-width (a handful of in-sheet list states, B2/B3/B4/B5, which is
  reasonable — the sheet's own width/structure is already drawn at both widths in B0/B1).
- The three "Design's call" items the brief delegates (§B desktop sheet shape, §C owning-vs-art
  separation, §F where History lives) are each made and recorded in the README.
- Tokens: every `var(--…)` referenced across the four `.dc.html` canvases exists in
  `src/app/globals.css` (checked by hand — `check:tokens` does not scan `design/`).
- Copy: no em dashes and no British spellings found in the shipped `collectionEditCopy` object or
  the About entries' copy (the one em dash hit is a source-file comment, not a player-facing
  string; the STATES table's `—` cells are "no must-not" placeholders, not copy).
- About entries: all five use valid `chapter`/`width` enum values, 0–4 `keys`, and `since: 12`
  with no immediate `ABOUT_VERSION` bump — correctly deferred per AGENTS.md's batching rule. The
  per-entry template fields (title, route, `opens` where the link doesn't land on the page itself,
  caption, up to four key lines) are all present.

## Findings

1. **[Resolved] The phone-strip trade (README "Open 1" / READINESS "Blocking 2") is ruled.**
   Taking History as a fourth tab moves the phone's Upload control into the Add sheet's first
   line; the alternative kept History off the phone strip (reached from Cards) with a standalone
   `↻ Replace` control. **Hugh ruled 2026-10-09: History is a fourth tab on the phone strip
   (Design's preference). Upload moves into the Add sheet's first line on phone, and also stays
   in the empty state and History.** Nothing left open here; build against the tab.

2. **[eng-resolvable] `importCaptionLineSwitches` quotes the wrong apostrophe.** The existing
   `import` entry's caption line in `src/lib/copy/about.ts` reads `…it doesn't add to it.` with a
   straight apostrophe (`'`). The addendum's `about · collection edit entries.ts` quotes the same
   line with a curly apostrophe (`’`) as the lookup key for `captionLineSwitches`. `captionLineSwitches`
   matches by exact literal text (`visible.ts`'s `resolveLine`), so as written this key will never
   match and the stale line will never hide once `COLLECTION_EDIT_ENABLED` is on. Fix: copy the
   literal string from `about.ts`, not a re-typed one.

3. **[eng-resolvable, open] The negated-switch syntax the addendum proposes doesn't exist yet.**
   README "Open 1" asks for a `'!COLLECTION_EDIT_ENABLED'` key in `captionLineSwitches`, but
   `src/lib/about/visible.ts`'s resolver indexes `SWITCHES` directly by the key
   (`SWITCHES[sw](env)`) with no negation handling — passing a `!`-prefixed name today would look
   up a nonexistent switch. Either `visible.ts` needs a negation feature built, or (the addendum's
   own fallback) the line gets rewritten at the bump and the switch-off case is accepted as
   momentarily wrong. This is Hugh's call per the addendum's own "Open," but it's a small, named
   one and doesn't block the rest of R1.

4. **[Plan mismatch] READINESS.md item 4 asks for a measurement the write-path plan doesn't
   contain.** It says the Replace-revert deck-check's latency on a ~4,000-row delta will be
   "measured in the write-path plan (#1300)." The plan's only pre-UI measurement commitment
   (Decision 4, "To measure before the UI PR") is the *score recompute* cost after a one-card
   edit — not the deck-check's latency for a large delta (Decision 5, which the §E long-list rule
   depends on). This isn't blocking — READINESS already flags it "Not blocking" — but the plan as
   approved does not supply what the handoff says it will, and whoever picks up PR 1 of the write
   path should add that measurement rather than assume #1300 already covers it.

5. **[cosmetic, eng-resolvable] Naming drift.** The handoff's "Notes for engineering" calls the
   single write function `applyCollectionDelta` (the brief sketch's name); the approved write-path
   plan names it `applyCollectionChange`. No functional difference — trivial to reconcile when
   implementing.

6. **[eng-resolvable, open — missed in the first pass of this audit] The history `kind` values and
   the "up/down" figure don't match the approved write-path plan.** `collection-edit · copy
   strings.ts`'s `history.kinds` lookup keys on `manual_add`, `manual_edit` and a standalone
   `remove`; the approved plan (`docs/superpowers/plans/2026-10-09-collection-write-path.md`,
   §2) stores exactly five `kind` values — `upload_replace`, `upload_add`, `add`, `edit`,
   `revert` — and folds a removal into `edit` ("`removed` from the brief's sketch is folded into
   `edit`: a removal is an edit to zero, and the history view can label an entry whose every row
   ends at zero as a removal. `manual_edit` becomes `edit`, and `add` is the in-app sheet, kept
   apart from `upload_add`"). As written, the handoff's lookup has no entry for the plan's `add`
   or `edit` keys and a dead entry for a `remove` kind the plan never stores. Separately,
   `history.figures(up, down, cards)` presents `up`/`down` as **copy-quantity deltas** ("+3 · −1
   copies across N cards"), while the plan's `raised`/`lowered` columns are **counts of rows**
   whose quantity moved, not a delta of copies. These differ for a multi-copy holding (a row
   whose quantity moved 4→2 raises `lowered` by 1 row, not by 2 copies), so implementing the
   handoff's figure literally against the plan's columns renders the wrong number. **This needs a
   Design call, not an eng guess**: whether the kind lookup collapses to the plan's five values
   with "Removed" derived presentation (an `edit` entry whose every row ends at zero), and
   whether the figure is restated as a row count or the plan grows a copy-delta column instead.
   Flagging rather than resolving — this was missed in the audit's first pass.

## Not re-litigated

- READINESS.md's items 5–8 (the `edited` tag needing a ledger-derived read, the 80% overlap
  threshold being a judgement, the reserved/ghosted `From Shopping` tag, and Undo-as-revert being
  one more dialog than a pure undo) are each already correctly self-flagged as non-blocking and
  are not design defects.
- The rename `Replace collection` → `Upload a file` (README "Open 2" / READINESS "Blocking 3") is
  explicitly a copy-review call per the handoff itself, not a Hugh design call, and doesn't gate
  this verdict.

---

# R2 re-audit (Add cards revisions)

Eng audit, 2026-10-09, of the revised drop Hugh worked through with Design. Verdict: **YELLOW**.
Nothing needs a new Hugh ruling to start the build. One server gap and a set of Design re-sync
items need closing first or beside it.

## What changed, and why (from the README's decisions log)

- **B Add cards:** the printing is a required step with no default (Hugh, 2026-10-09): a result
  opens its picker with nothing selected, search and Save are disabled until a tile is chosen,
  Escape or the close mark cancels the add, and a one-printing card skips the step. New state B4a
  (and B4m on the phone). The duplicate match is checked when the printing is chosen. Tiles show
  `you own ×N`. The rationale is that a guessed printing saved in a hurry would be corrected later in History.
- **C Edit copies (new R2 canvas, replaces R1 C+D):** editing copies leaves the card modal. An
  `Edit copies` link on the "In your collection" receipt opens the Add cards sheet scoped to one
  card (`AddCardsSheet mode="edit"`), drawn only when the modal was opened from /collection (a
  `collectionEdit` prop). `Move` and the `Your copies` block are gone: a wrong printing is fixed by
  re-picking the line's printing, a partial fix is lower plus `Add another printing`. The diff sits
  beside Save only, never in the modal's owned line.
- **D Rows:** rows stay as shipped (no ⋯, no Undo strips). Removal is `Remove from collection` in
  the sheet's footer, then a toast with Undo (a revert). This changes the brief's §D, which put
  the control on the row.
- **F History / G Switch off:** the upload mark is the shipped `ReplaceIcon` SVG, not the ↻ glyph;
  the printing-fix entry title reads "1 printing changed"; the revert lede reverted to
  "This takes out the N copies it added" (see finding 4).
- **About addendum:** U3 and U4 rewritten around the sheet (Move language removed, removal lives in
  Edit copies), U3's specimen is `AddLine` in edit mode (no `CardDetailProvider`), and the
  `import` caption-switch key text edited (see finding 5).
- **READINESS.md:** now "Approved to ship (Hugh, 2026-10-09)" and records the five review rulings
  (side sheet, required printing, editing in the Add cards sheet, removal in the sheet, edit access
  from /collection only).

## Re-checked against the brief and closed rulings

- One history entry per action: holds. One Save is one entry, including a printing fix (two rows
  in one `edit`), a removal and an add session (README "Every write"; STATES C3b "Must not: split
  it into two entries").
- First import skips Replace/Add; empty collection offers Add cards beside the upload (B0b, B0c);
  History is the 4th phone tab; a card at zero is removed (`lastCopy`, `remove.confirm`); aged-out
  revert links drawn as absent (F1, README point 8); duplicates are card + printing + finish (B5;
  matches the key `oracleId|setCode|collectorNumber|finish` in `src/lib/collection/key.ts`): all unchanged and
  still correct.
- Tokens: every `var(--…)` in the R2 C, B and F canvases and the About canvas exists in
  `src/app/globals.css` (checked by script; `check:tokens` does not scan `design/`).
- Copy: no em dash and no British spelling in the copy strings or About entries. The em dashes in the
  canvases are in design annotations and one card type line ("Legendary Creature — Elder Demon",
  real card data), not player copy. The B canvas annotation says "centred", an annotation and not copy.
- R1 audit findings: #1 stays resolved. #2 is superseded (see finding 5). #3 stands. #4 and #5 stand
  unchanged. #6 is **not resolved**: `history.kinds` still keys on `manual_add`, `manual_edit` and
  `remove`, and `figures` is still a copies delta (see finding 1).

## Against the shipped write path (`applyCollectionChange`)

- A printing fix, "Add another printing" and a removal all map to one `edit` (rows with
  `expected`); a plain add session maps to `add`; Undo maps to `revert`. `stale`, `wouldShort`
  and `confirmShort` cover §E and the two-tab case. `planEdit` throws if one key appears twice, so
  the sheet must merge two lines that land on the same printing and finish (B5) before it sends.
- A printing fix keeps the total, so `committedShortfalls` finds nothing new; the README's "never
  warns about decks" holds provided the shortfall is per card, not per printing.
- Reads the sheet needs already exist: `card-detail` returns per-printing quantity and finish
  breakdown (`you own ×N` tiles, the pre-filled lines).

## Findings

1. **[Design, open] Still unresolved from R1 #6: history kinds and the up/down figure.** The ledger
   stores `upload_replace | upload_add | add | edit | revert` (`src/db/schema.ts`). The drop's
   `history.kinds` has `manual_add`, `manual_edit`, `remove` and `shopping_mark_bought`, and
   `figures` is a copy delta while the entry stores a count of rows (`raised`, `lowered`). Also the
   `manual_edit` label "Edited in details" is now wrong: editing happens in the Add cards sheet,
   not in details. Needs the kind lookup collapsed to the ledger's values, "Removed" derived from
   an `edit` whose every row ends at zero, a row-count or copy-delta decision, and a new label.
2. **[eng-resolvable, server gap] An `edit` row cannot carry `scryfallId` or `condition`.**
   `EditRow` is identity + `quantity` + `expected`, and `planEdit` gives a row that does not exist
   `{ scryfallId: null, condition: null }`. Two R2 flows create such rows through an `edit`: the
   printing fix (copies go to the newly chosen printing) and `Add another printing` saved in edit
   mode alongside other changes (it must share the one entry). The new row then has a null
   `scryfall_id`, which `browse.ts` documents as missing the exact art join and showing the
   representative printing's art. A fix of the printing would silently show the wrong art. Either
   `EditRow` gains optional `scryfallId`/`condition` used only when the row is new, or the
   printing fix carries the old row's `condition`. This is a small write-path change, not a
   design change. It must land before the edit-mode build.
3. **[eng-resolvable] The brief is now behind the closed R2 rulings.** §B says the printing is
   "preset to the card's default", §C describes `Move` and editing in the modal, §D puts removal on
   the row. Hugh's 2026-10-09 review rulings supersede all three; the brief should be updated in
   the build's first PR, not left for the next reader to build from. The README itself flags §D as
   "a change to the brief for Hugh" and READINESS records him approving it.
4. **[Design, re-sync] The drop regressed text fixed on main in #1308.** (a) `lede` is back to
   "This takes out the N copies it added", which is false for reverting a removal, a lowering edit
   or a Replace, the reason main had made it direction-neutral. (b) README source-of-truth line
   again says #1304 is "not yet merged" (merged 2026-10-09T16:32:53Z), and README Open 1 lost
   Hugh's "History tab" ruling note. (c) READINESS.md still lists "Blocking 1: PR #1304 is
   unmerged", still says "readiness R1", and its item 8 still says "Undo on C and D". (d) The
   About addendum README dropped the correct caveat that `captionLineSwitches` only removes a
   line and never inserts one (`resolveLine` in `src/lib/about/visible.ts` confirms it), so the
   shipped `import` caption must be edited to carry both lines. The drop should be re-synced
   against main, taking the R2 changes only.
5. **[eng-resolvable] The apostrophe moved the wrong way.** The shipped line in
   `src/lib/copy/about.ts` reads `it doesn't add to it.` with a straight apostrophe, and the key
   in main's addendum matched it. The R2 `.ts` now writes `doesn’t` (curly), so the key would no
   longer match. R1 finding 2 was therefore wrong about main's addendum and is retracted;
   the mismatch is real in the R2 drop. Fix: use the literal from `about.ts`. Negated
   switch keys (`'!COLLECTION_EDIT_ENABLED'`) are still unsupported in `visible.ts` (R1 #3).
6. **[Design, minor] G Switch off annotations are stale.** Row C still says "no `Your copies`
   block" and row D "no ⋯ on rows", both R1 vocabulary, and G still names `applyCollectionDelta`
   (the shipped name is `applyCollectionChange`). The B canvas annotation uses "centred".
7. **[Hugh, informational] The side sheet and the required printing step are ruled, but two
   build-time choices remain with him:** the desktop `Edit` fallback for a row control (README
   Open 6) and `Upload a file` as the label (copy-review, README Open 2). Neither blocks.

## Verdict

**YELLOW.** All the closed rulings still hold in the R2 surfaces, tokens and copy pass, and no
open item needs a new design round. The build can start on A, E, F and the plain Add cards sheet.
Edit mode waits on the `EditRow` change (finding 2). Finding 1 needs a Design call before F's
History list is built, and finding 4 needs a re-sync pass so the repo does not carry text main
had already corrected.

## R2 re-sync fixes applied (2026-10-09)

Findings 4 and 5 fixed in the handoff files, taking the R2 changes only and restoring text main
had already corrected in #1308:

- **Revert lede** (`collection-edit · copy strings.ts`): back to the direction-neutral
  "From {when}. Reverting this changes {copies}." with main's explanatory comment.
- **README source-of-truth line:** PR #1304 reads "merged 2026-10-09".
- **README Open 1:** Hugh's "Ruled by Hugh 2026-10-09: the History tab" note restored.
- **READINESS.md:** "Blocking 1, PR #1304 unmerged" replaced by the post-audit status (#1304 merged;
  item 2 ruled; item 3 a copy-review call); title reads R1 + R2; item 8 now describes the toast
  Undo in the Add cards sheet rather than "Undo on C and D".
- **About addendum README:** the `captionLineSwitches` caveat restored (it only removes a line, it
  never inserts one, so the shipped `import` caption must carry both lines).
- **About key** (`about · collection edit entries.ts`): `doesn't` is straight again, matching
  `src/lib/copy/about.ts`, in a double-quoted key as on main.

Left as build-PR findings, unchanged: finding 1 (history `kinds` lookup and the up/down figure) and
finding 2 (`EditRow`/`planEdit` cannot carry `scryfallId`/`condition`). Nothing under `src/` changed.
Finding 6 (stale G annotations, `applyCollectionDelta` name, "centred") is a Design re-sync item
and is untouched here.

