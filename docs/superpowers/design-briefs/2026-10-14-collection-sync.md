# Collection upload: a third choice, "Sync"

Design brief, 2026-10-14. Asks for a Design round on one control and the review behind it: a third choice beside
Replace and Add when a player uploads a collection file, working name **Sync** (Design may rename it). Hugh ranked it.
Sync is a three-way merge: the file's changes are taken, the player's changes made in the app are kept, and a card both
sides changed differently asks the player. This brief says what the code stores, what staging holds, how the existing
screens draw their counts, what engineering proposes, and what Design owns. Where a figure comes from Hugh's account on
production rather than staging it is marked as relayed, not measured.

## The problem

A player who edits their collection in the app and also keeps a ManaBox export is forced to pick one source of truth at
every upload.

- **Replace** makes the collection exactly the file. Everything the player added or changed by hand since the last upload
  and the file does not carry is removed. The screen warns (`This overwrites 8 changes you made in the app since your
  Oct 2 upload.`) and then does it anyway.
- **Add** stacks the file's quantities on the collection. Nothing is removed, but a full export doubles every copy it
  shares with the collection. It is for a booster haul, not for a re-export.
- Neither can say "take what is new in the file, and leave what I did here alone."

Hugh's case, relayed from the orchestrator and not measured here: his file, `The Vault 10-1-26.csv` (3,550 rows), is older
than his Oct 2 upload, and he has 8 changes made in the app since. Replace would remove 38 cards and drop 2 more to short
in decks. What he wants from the file is its **tokens**, which the Oct 2 upload predates. Replace is the only way to read
tokens today, and it costs him his 8 edits.

Staging shows the same shape (see "What staging holds"): the last upload's file is identical in cards to the one before
it, and differs only in carrying tokens the earlier upload never read. Replacing with it would remove 112 holdings the
player added by hand since.

## Surfaces

One flow, three places it mounts (`src/components/collection/replace-flow.tsx`, `ReplaceFlow`):

- **Collection, Upload a file** (`/collection/replace`, from the head's `Upload a file` and the empty state's door). The
  full flow, at 390 and at desktop.
- **Home's first-run checklist, step one** (`first-run-step-one.tsx`), which embeds the same flow. A first import has
  nothing to replace and skips the choice and the confirm, so **Sync never appears there**.
- **The import summary** (`/collection/replace/summary/[uploadId]`), the receipt after a confirm. Sync's receipt
  reuses it (decks affected, arrivals), so it is a surface this round touches.

The steps today, with `COLLECTION_EDIT_ENABLED` on (the choice exists only then):

1. **Pick the file** (`UploadEntry`).
2. **The choice** (`UploadChoice`, `STEP 2 OF 4`): two radio cards, neither picked, each with the collection's size
   after it. The Replace card carries the hand-edits warning, the Add card the overlap note from 80% owned.
3. **The review** (`ReviewScreen` with `ReplaceReviewDetail`): four tiles, the overwrite banner, the decks that will read
   short, then the lists.
4. **The confirm**: the short-deck dialog when a deck would read short; otherwise the confirm bar is the confirm.

Sync adds a third card at step 2, its own review at step 3, and reuses step 4. Design owns where the third card sits and
how three cards read at 390.

## What exists today

All paths are on `main`; line numbers were read on 2026-10-14 and move.

**The collection** (`collection_items`, `src/db/schema.ts:428`). One row per **printing and finish**:
`(user, oracle id, set, collector number, finish)`, with `quantity`, `scryfall_id` and `condition`. `scryfall_id` and
`condition` are null when the rows folded into one holding disagree. A "holding" below is one such row.

**The last upload's file is kept, per upload, forever.** Every confirmed upload's `csv_uploads.preview_payload` holds
`pendingItems`: the file aggregated to holdings (the same key and quantity as above), plus its `tokens` where tokens were
read. Nothing nulls it after a confirm (`rg previewPayload` finds no clearing write). The file's rows the app could not
match are counts only, not rows. A payload written before migration 0008 has no collector number or finish, so it keys
differently and is not comparable (staging: the July and September-2 uploads).

**The ledger** (`collection_history`, `schema.ts:494`). One entry per collection write made through
`applyCollectionChange`, holding every row the write changed with its `before` and `after` state (`quantity`,
`scryfallId`, `condition`; null when the row did not exist). Kinds: `upload_replace`, `upload_add`, `add`, `edit`,
`revert`. Entries also carry `source` (`csv_uploads:<id>` for an upload, `shopping:<deck id>` for I got it,
`precon:<set>` for a precon added to the collection) and `precon_tokens`. Rows are pruned to null after 90 days
(`HISTORY_RETENTION_DAYS`), the entry staying.

**How in-app changes are recorded** (all through the ledger):

| In-app change | Ledger kind | Source |
|---|---|---|
| Add cards (the sheet) | `add` | none |
| I got it (a purchase marked bought) | `add` | `shopping:<deck id>` |
| A precon added to the collection | `add` | `precon:<set>`, with `precon_tokens` |
| Card details: set a count, remove a row | `edit` | none |
| Revert of any entry | `revert` | none |

An upload is not a hand change: the Replace warning counts `add`, `edit` and `revert` entries after the last confirmed
upload's own entry (`editsSinceUpload`, `src/lib/collection/history.ts:47`). **That count is entries, not holdings.** One
precon add is one "change" and 97 holdings. Hugh's "8 changes" is 8 entries.

**The base can be rebuilt, per holding.** The collection immediately after the last upload is: today's collection, with
each holding any later hand entry touched set back to its **earliest `before`** among those entries. A holding no hand
entry touched is unchanged since the upload. This is the same walk `editedKeysSinceUpload` already makes for the
`edited` tags. It carries quantity, `scryfall_id` and `condition` for every touched holding, and finish and printing are
in the key.

Verified on staging, read-only, 2026-10-14: for the account with a ledger entry for its last upload, rebuilding the base
this way and comparing it with that upload's stored file gave **3,393 of 3,393 holdings equal, 0 different, 0 missing**,
with 4 later hand entries touching 121 holdings (112 newly held, 9 raised, 0 lowered) undone in the rebuild.

**What the rebuild cannot do** (what engineering would need):
1. **Pruned entries.** A hand entry older than 90 days names no rows, so a holding only it touched is not rebuilt. The
   Replace warning already handles this: when the last upload is older than 90 days it quotes no number
   (`overwriteUnknown`). Sync has the same limit and needs a decision (Open question 8). Keeping the first-touch `before`
   past 90 days, or storing a snapshot of the collection at each upload, would remove it; neither exists.
2. **No ledger entry for the last upload.** An upload confirmed before the ledger existed, or with the switch off, has
   no `seq`; the walk falls back to `confirmed_at`, and hand changes before 2026-10-11 were never recorded at all (the
   ledger starts there on staging; 11 of the 12 confirmed uploads on staging have no ledger entry). For such a player there is no recorded app side.
3. **A reverted upload.** If the last upload was itself reverted, the base is the pre-upload state and the anchor is wrong.
4. **An Add as the last upload.** The stored `pendingItems` is then the delta, not the state, so the stored file is not
   the base. The ledger rebuild works for either kind; the stored file does not.
5. **Tokens are not in the ledger rows** (below).

**Tokens** (`token_ownership`, `token_printing_holdings`, `token_reads`; `writeUploadTokens`,
`src/lib/tokens/ownership.ts:109`). Ownership rows carry a `source`: `upload` (what the last confirmed upload read),
`manual` (`I have one`) and `precon`. App-side token changes are therefore **separable by source and never in the
ledger**: a hand mark is a `manual` row, a precon add a `precon` row, and an upload row cannot be unmarked by hand. Today:
- **Replace** removes every `upload` row and writes the file's; a `manual` row is left alone unless the file reads the
  same token, in which case it becomes an `upload` row of exactly what the file read.
- **Add** adds to the `upload` rows.
- A file whose payload has no `tokens` (read before tokens were) writes none and does not write the read marker.
So the token side of a Sync has the shape of Replace's already: the base is the `upload` rows, the app side the others.

**What Replace and Add's reviews draw today** (`src/lib/copy/collection-edit.ts`, `upload-preview.ts`):
- **Four tiles:** `unchanged`, `going up or new`, `going down`, `leaving`, in holdings. Around them the matched banner
  (`+N copies across M cards` for an Add), the collection's size before and after (`3,505 → 3,393 cards`), and for an
  Add `You already own N% of these cards`.
- **The overwrite banner** (Replace only): `This overwrites N changes you made in the app since your Oct 2 upload.`, or
  the unknown form past 90 days, or the never-uploaded form. The same line is on the Replace card at step 2.
- **`edited` tags** on rows in the lists that the player changed by hand since the last upload (Replace only).
- **Lists:** `Leaving your collection · N`, `Going down · N`, `Going up or new · N`, eight shown and `Show all N`, capped
  at 500 shipped rows with a `Showing the first 500 of N` note.
- **`Decks that will read short · N`** and the short-deck dialog (`Replacing leaves 2 decks short`, `Replace anyway`).
- **The confirm bar:** `Replaces your 3,505 cards with 3,393. 2 decks will read short.` and `Replace collection`.
- Everything is computed from the write's own dry run (`applyCollectionChange`, `dryRun`), so the screen and the save
  cannot disagree. Sync should keep that property.

**One History entry, and Revert** (`planRevert`, `src/lib/collection/write.ts:456`). Revert reverses an entry's rows
against today's collection, refuses what changed since (`stale`), and never goes below zero. Any write that returns its
rows as before/after pairs reverts the same way. The ledger's kind is a database-checked enum
(`collection_history_kind_check`), so a new `upload_sync` kind is a migration and a History label, not new revert logic.

## What staging holds

Read-only, staging (`br-polished-pond-a6e63y0b`), 2026-10-14. Production was not read. Staging has two accounts with
uploads: **A**, with the fuller ledger, and **B**, a copy made 2026-10-12 whose uploads carry no ledger entry.

- **Account A's last upload** is `The Vault 10-1-26.csv`, confirmed 2026-10-12: 3,550 rows, 3,393 holdings, **tokens
  read: 114 tokens, 313 copies**, recorded as `upload` rows (plus 6 `precon` rows). Its predecessor, `The Vault (11).csv`
  confirmed 2026-10-02, has the **same 3,393 holdings with 0 quantity differences** and no tokens in its payload. This is
  the "same cards, new tokens" case, and it is Hugh's case as the data shows it on staging. The filename's date (10-1) and
  the upload date (10-12) disagree.
- **Consecutive confirmed files differ little.** (9) to (10): 143 holdings added. (10) to (11): 16 added, 1 removed,
  1 raised. (11) to 10-1-26: nothing. File-to-file churn is 0 to 4% of holdings per upload.
- **The ledger is four days old** (first entry 2026-10-11): 11 entries on staging, 7 on A and 4 on B. After A's last
  upload: an Add of 24 holdings, two precon adds of 97 and one revert of 97, touching 121 holdings (112 newly held, 9
  raised, 0 lowered). **Replace of the same file today would remove 112 holdings and lower 9**, all of them the player's
  own. B's four entries are two precon adds and their two reverts, net zero.
- **App-side changes are mostly arrivals**, not edits: 112 of 121 touched holdings are newly held. A conflict needs a
  holding both sides changed to different values, so the likely conflicts are a card the player added by hand that the
  file also carries at another count.
- **Conflict frequency cannot be measured yet.** It needs a file uploaded after hand changes on the same holdings, and no
  such file exists on staging: the one upload after hand changes was identical to its predecessor. The honest statement
  is "rare, small, and concentrated in whatever the player added by hand just before exporting." Design for 0 conflicts,
  a handful, and a bulk case of ~100 (a precon the player added by hand and the export also lists).
- **Holdings and attributes:** A holds 3,505 holdings (4,616 copies), 174 foil/etched; 122 holdings have no condition, 0
  lack a `scryfall_id`.

## What engineering proposes

Leans from the code as read on 2026-10-14. The plan confirms or changes each before Design draws against them.

1. **One three-way merge per holding**, over `(oracle id, set, collector number, finish)`, with quantity deciding:
   - **Base** `b`: the collection after the last upload, rebuilt from the ledger (above).
   - **App** `a`: the collection now.
   - **File** `f`: the uploaded file's holding, 0 if absent.

   | Case | Result |
   |---|---|
   | `f = b` (file did not change it) | keep `a` |
   | `a = b`, `f ≠ b` (only the file changed it) | take `f` |
   | `a ≠ b`, `f ≠ b`, `a = f` (both changed it to the same value) | nothing to do, **not a conflict** |
   | `a ≠ b`, `f ≠ b`, `a ≠ f` | **conflict**: the player chooses `a` or `f` |

   Printing and condition ride with the side that wins; a holding that differs only in condition is not a conflict.
2. **A conflict default must be explicit.** Nothing is written on the player's behalf for a conflict. Bulk "keep mine" and
   "take the file's" exist; "keep mine" is the safer default if one is pre-selected.
3. **The write is one transaction through `applyCollectionChange`**, as Replace and Add are: the merge produces the same
   planned rows, so the dry-run preview, the deck check, the short-deck confirm, the receipt and Revert all apply
   unchanged. It is one ledger entry (a new kind, `upload_sync`, for History to label), source `csv_uploads:<id>`, and
   Revert takes it back whole.
4. **No data changes before confirm** is already how the choice works: the review is a rolled-back dry run.
5. **Tokens** follow Replace's token step exactly (the file's tokens become the `upload` rows; `manual` and `precon` rows
   stay), so a Sync has no token conflicts to ask about. A `manual` row the file also reads still becomes an `upload`
   row; Design should decide whether a differing count is worth surfacing (Open question 9).
6. **The base needs the last upload to have a ledger entry** (case 2 above). Without one, or past 90 days, the app side is
   unknown and Sync cannot say what it keeps. Engineering leans on disabling the card with a reason over merging with an
   unknown base.
7. **Stale-file detection** is by content, not by name or timestamp, using the uploads already kept: a file whose holdings
   equal an earlier confirmed upload's, or are nearer to an earlier upload's than to the last one's, or whose differences
   from the base mostly undo the last upload's own changes. The filename's date and the browser's `File.lastModified` are
   hints at most (a download resets both). It is a heuristic and the warning must say "looks older", never "is older".
   This does not detect a file merely different from the base.
8. **Whether the anchor moves.** After a Sync, "since your last upload" resets to the Sync, because it is an upload, so a
   kept in-app change reads as already uploaded. Engineering leans on moving it, and the plan decides.

## Constraints

- **No data changes before confirm.** Every figure on the review comes from the dry run; the confirm applies that merge.
- **The result is one History entry** that Revert can take back whole, with the existing `stale` refusal and
  `Revert what’s left`.
- **Replace and Add are unchanged**: same copy, same cards, same review, same behavior, with Sync a third option beside them.
- **Tokens sync** on a Sync, by Replace's rule, in the same transaction; a failing token write rolls the whole confirm back.
- **The deck check applies.** A file-side removal can leave a deck short exactly as a Replace can; `Decks that will read
  short` and the short-deck dialog draw for Sync from the same read, and the dialog's title and confirm are Sync's own.
- **The 500-row cap** on a shipped list stays. A long conflict list pages like the others, and a bulk choice must act on
  the whole set, not the shown rows.
- **Hit targets and keyboard:** every card, row and bulk control is a real control, 44px on the phone, with a visible focus
  ring. The choice is a radio group; the per-card conflict choice is a pair of radios per row; bulk controls name what they
  affect.
- **Screen reader:** the counts and the conflict total are announced once per change, not per press; a conflict row's
  accessible name carries the card and the two counts.
- **A choice is held across Back.** Going back to step 2 and forward again keeps the conflict choices made, as the mode
  choice is kept today.
- **COLLECTION_EDIT_ENABLED** gates everything here, as it gates the choice.

## Locked

1. **No data changes before confirm.**
2. **Tokens are synced** (recorded the way Replace records them, `writeUploadTokens`, holdings included).
3. **The result is one History entry** that Revert can take back.
4. **Replace and Add are unchanged.**
5. **The rules:** a change on the file side only is taken; a change on the app side only is kept; a conflict asks the
   player, per card or in bulk.

## Open for Design to call

1. **The name.** `Sync` is Hugh's working label. It is the one word that does not say what leaves, and it collides with
   no existing term in the app. Design may rename it (`Merge`, `Update from file`, `Keep my changes`); copy goes through
   `/copy-review`.
2. **The choice step with three cards.** Whether the three read as equals, or Sync is the recommended card, and **whether
   Sync becomes the default** when it is available (a player with in-app changes since their last upload and a file that
   is not new by itself) or stays unpicked like the other two. Draw how a card says why it is unavailable (first upload,
   no ledger entry for the last upload, last upload past 90 days), and at 390 whether three cards stack, with the
   figure on each. Each card shows the collection's size after it today; draw what Sync's figure says.
3. **How conflicts are presented.** A list of conflicting cards, each with its base, your count and the file's, and a
   choice per card; bulk `Keep mine` and `Take the file’s` above it; a count of undecided; whether Continue waits until
   every conflict is answered or defaults the rest to one side. Whether the list is its own step between the choice and the
   review, or a section inside the review. A card with 100 conflicts needs to be decidable in one press.
4. **The stale-file warning.** What it says, where it sits (on the choice card, or at the top of the review), and what it
   offers. Options to draw and choose between, since each is defensible:
   - **Treat the file as stale and take only its additions:** holdings the base did not have, and raised counts, never a
     removal or a lowered count. Everything the file lacks stays.
   - **Take only its tokens:** cards untouched, tokens recorded (Hugh's case on staging).
   - **Merge normally**, with the file's removals shown as such.
   - **Cancel.** Draw whether the first two combine.
   The warning must not claim certainty: detection is a heuristic.
5. **What a row shows in the review.** Sync has five kinds of movement, not Replace's four: taken from the file, kept from
   the app, conflicts, agreed (no action), and unchanged. Which are tiles and which are lists, in what order of risk, and
   whether `agreed` appears at all (it needs no action and may only add noise).
6. **How the summary counts read.** Today's tiles count holdings and the sentence counts copies and cards. Draw the Sync
   bar: how it says "taking 14, keeping 112, 3 to decide" in one line and what the confirm button says. The previous
   screens count **entries** in the overwrite banner (`8 changes`) and **holdings** in the tiles, which already disagree;
   draw one unit for Sync.
7. **The receipt.** After a confirm the import summary says what changed for the decks. Draw what it says for a Sync
   (taken, kept, the conflicts the player resolved) and what the History row is called.
8. **What happens when the base is unknown** (last upload past 90 days, or none recorded): disable Sync with a reason,
   or offer it with the app side described as unknown and the merge reduced to "take the file's additions."
9. **Token surfacing.** Tokens by Replace's rule never conflict. Whether the review shows them at all (a line:
   `114 tokens will be recorded`), whether a token a hand mark already holds at another count is worth a row, and where
   the line sits.
10. **A re-sync of the same file.** Uploading the file just uploaded changes nothing in cards; draw the "nothing to
    sync" state and whether it still offers the tokens.

## States to draw

At 390 and desktop:

- **The choice, three cards:** nothing picked; Sync picked; Sync unavailable (first upload; no record of the last upload;
  last upload past 90 days), each with its reason.
- **The choice with a stale-file warning:** the file looks older than your last upload, and the options.
- **Reading:** `Comparing with your collection…`, as the others.
- **The review, no conflicts:** taken, kept, agreed, tokens, the decks that will read short.
- **The review with conflicts:** a few (3); many (~100) with the bulk controls; all answered; some undecided with
  Continue held.
- **The review where the file adds nothing to cards** (same as the last upload) and carries tokens.
- **The review where the file changes nothing at all** (a re-sync).
- **The review where the app side is empty** (no in-app changes since the last upload): Sync reads as a Replace that
  cannot lose anything.
- **A long list:** 500 shipped, `Showing the first 500 of N`.
- **Decks that will read short** and the short-deck dialog, Sync's wording.
- **Confirming, failed** (`We couldn’t import that`, the retry), and **unconfirmed** (`We couldn’t confirm whether that
  went through`), as shipped.
- **The summary page** after a Sync, and **History** with the new entry, its Revert confirm, and a Revert that is partial
  (`Revert what’s left`).
- **Focus:** each card, each conflict row's radios, each bulk control.
- **Switch off:** no choice at all, the shipped Replace flow.

## Fixtures (staging, read-only)

Account A's last upload (`The Vault 10-1-26.csv`) is the "same cards, new tokens" case, with 114 tokens and 4 in-app
entries touching 121 holdings (112 newly held, 9 raised) after it. That is enough for: a review with kept changes and
tokens, the empty-conflict state, and the "file adds nothing to cards" state. No staging data yields a conflict, a stale
file, or a 100-conflict case, and no account has a pruned entry; those frames are hand-built from the rules above.
Hugh's production figures (8 changes, 38 leaving, 2 short) are relayed, not measured here.

## The About entry

**Likely an ordinary edit to the existing `upload-choice` entry (`src/lib/copy/about.ts`, `id: 'upload-choice'`,
`since: 12`, `switch: 'COLLECTION_EDIT_ENABLED'`), with no `ABOUT_VERSION` bump.** The entry already covers this exact
surface (`Replacing or adding from a file`): its title, caption and four key lines name two choices and need to name three.
Sync is a new capability on that surface, so the entry's title and caption change and one key line is added (`Sync keeps the
changes you made in the app and takes what is new in the file; if you changed the same card as the file did, it asks.`).
The entry is tied to a switch, so a switched entry is announced when its switch flips and nothing here bumps the version.
`post-import` (`How replacing your Collection affects your decks`) may take a half-line for the Sync receipt. The content
hash is re-pinned deliberately. Hugh decides whether a feature owes an entry and may overrule this; Design draws the edit
on the per-entry artboard if he does.

## Copy

Every string goes through `/copy-review`: the name, the card's title and body, the conflict controls, the bulk controls,
the stale-file warning and its options, the bar, the confirm and its pending state, the short-deck dialog's Sync wording,
the receipt, and the History label. Copy lives in `src/lib/copy/collection-edit.ts` (the `upload` block) and
`src/lib/copy/replace.ts`; the shipped refusal shape (`src/lib/copy/README.md`) applies to a failed Sync. Working strings
above are placeholders.

## Paths

- The flow and its steps: `src/components/collection/replace-flow.tsx`, `upload-choice.tsx`, `review-screen.tsx`,
  `replace-review-detail.tsx`, `short-deck-warning.tsx`, `confirm-modal.tsx`; the routes `src/app/collection/replace/`
  and `src/app/collection/replace/summary/[uploadId]/page.tsx`; Home's `src/components/home/first-run-step-one.tsx`
- The preview and confirm: `src/app/collection/actions.ts` (`previewUploadChange`, `confirmUpload`),
  `src/lib/collection/upload-preview.ts`, `src/lib/collection/pending.ts`
- The write and the ledger: `src/lib/collection/write.ts` (`CollectionChange`, `planReplace`, `planAdd`, `planRevert`,
  `applyCollectionChange`), `src/lib/collection/history.ts` (`editsSinceUpload`, `editedKeysSinceUpload`),
  `src/lib/collection/retention.ts`, `src/db/schema.ts` (`collectionItems`, `collectionHistory`, `csvUploads`)
- Tokens: `src/lib/tokens/ownership.ts` (`writeUploadTokens`, `recordUploadTokens`, `syncPreconTokens`), `schema.ts`
  (`tokenOwnership`, `tokenPrintingHoldings`, `tokenReads`)
- Copy: `src/lib/copy/collection-edit.ts`, `src/lib/copy/replace.ts`, `src/lib/copy/about.ts`
- Earlier handoffs: `design/design_handoff_the99_collection_edit/`, `design/design_handoff_the99_collection/`
- Switch: `COLLECTION_EDIT_ENABLED` (`src/lib/switches/registry.ts`)

## Deliverable

A handoff in `design/design_handoff_the99_collection_sync/`: the choice with three cards at 390 and desktop, the review
with and without conflicts and the conflict list with its bulk controls, the stale-file warning and its options, the
summary and History entry, every state above, the answer to each open question, and the `STATES` rows and design-table
sections they add. Include the About entry's edit on the per-entry artboard if Hugh rules it owes one.
