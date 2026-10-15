# Collection Sync: implementation plan

- Brief: `docs/superpowers/design-briefs/2026-10-14-collection-sync.md`, with the audit's corrections at its head.
- Handoff: `design/design_handoff_the99_collection_sync/` (R2, approved by Hugh 2026-10-15; PR #1771).
- Readiness audit and rulings: that folder's `READINESS.md`, §Engineering readiness audit.

This feature writes collection data and has a delete path. Under **Everything** a Sync removes holdings the file
dropped, and a conflict answered File lowers or removes the player's own count.

## Approval conditions (d9, 2026-10-15)

1. `measure:sync` opens its production connection inside a READ ONLY transaction (`set transaction read only`, with
   `default_transaction_read_only` on the session too), takes its URL from the existing env convention
   (`scripts/lib/env.mjs`), and never writes a connection string to disk.
2. PRs 1 and 3 carry the delete paths, so their merge bar is clean-after-clean.
3. The switch is on in staging from PR 2. d9 sets it when PR 1 merges: staging `true`, production `false`.

## Standing rulings (not re-litigated)

- **The rule** (brief, locked). File-only changes are taken. App-only changes are kept. A conflict is asked, per card
  or in bulk, and nothing is pre-picked. There are no data changes before confirm. The result is one History entry
  that Revert takes back. Replace and Add are unchanged.
- **The base is the last file, not the collection after it** (audit, approved). It is `preview_payload.pendingItems`
  of the newest confirmed upload that is an **anchor**, read per holding as `(oracle id, set, collector number,
  finish)` → quantity.
- **What counts as an anchor:** a Replace, or a Sync made under **Everything**, that has not been reverted.
  - Never an Add (ruling 1): its cards read as the app's side.
  - Never a reverted upload.
  - Never a Sync made under **Only what it adds** or **Only its tokens**. That last one is a plan refinement of the
    approved rule: a partial Sync did not take the file's removals, so its file is not what the collection was
    reconciled to. Without it, the next full export would read every card the stale file lacked as a file-side
    addition.
  - First imports are Replaces, and so is every upload before the ledger, since Add came with the ledger. Hugh's
    Oct 2 upload anchors.
- **Sync is unavailable**, with its reason on the card (call 8), when:
  - **never uploaded**: no confirmed upload;
  - **no anchor**: no unreverted Replace or full Sync. This uses the drawn `no record of the last upload` reason;
  - **old file**: the anchor's payload lacks `collectorNumber` or `finish` (stored before migration 0008). This also
    uses the `no record` reason.

  `past 90 days` (C3b) no longer fires. The state is drawn and kept for the copy file, and no code path reaches it.
- **Tokens** (ruling 2):
  - Under **Everything** and a plain Sync, Replace's rule (`writeUploadTokens` in replace mode).
  - Under **Only what it adds**, additive: for each token and each token printing the file reads, the `upload` row
    becomes the GREATER of what it holds and what the file reads, and nothing is deleted. That makes it idempotent:
    re-syncing an unchanged export changes nothing, where Add's accumulate would double it.
  - Under **Only its tokens**, Replace's rule, which is Hugh's case. Lock 2 says tokens are synced the way Replace
    records them, and this pick exists for exactly that.
  - Tokens are never conflicts.
- **Receipt** on the shipped summary layout, with Sync's lede (ruling 3).
- **No new revert warning** (ruling 4).
- **No `ABOUT_VERSION` bump** (ruling 5). The `upload-choice` entry's Sync form follows `COLLECTION_SYNC_ENABLED` and
  is announced on its flip. Hugh may overrule.
- **The overwrite anchor moves** after a Sync (G7, brief proposal 8): `editsSinceUpload` counts from the Sync. That is
  already the behavior of `handEntriesSince`, which anchors on any confirmed upload. No change is needed, and it is
  pinned in a test.

## The switch

`COLLECTION_SYNC_ENABLED`, `kind: "feature"`, `needs: "COLLECTION_EDIT_ENABLED"`, added to the registry in PR 1.

- Staging: `'true'` from PR 2, when the card first draws.
- Production: unset until Hugh flips it after PR 4 and the acceptance walk.

Off means no third card, `previewUploadChange` and `confirmUpload` refuse `mode: "sync"`, and the About entry reads
as today.

## The merge (pure, `src/lib/collection/sync.ts`)

`planSync({ base, app, file, pick, answers })`, per holding key, with `b`, `a`, `f` as quantities (0 when absent):

| Case | Result | Bucket |
|---|---|---|
| `f = b` | keep `a` | `kept` when `a ≠ b`, else `unchanged` |
| `a = b`, `f ≠ b` | take `f` | `taken` |
| `a ≠ b`, `f ≠ b`, `a = f` | nothing | `agreed` (counted in `nothing to do`) |
| `a ≠ b`, `f ≠ b`, `a ≠ f` | the answer: `app` keeps `a`, `file` takes `f`, none is undecided | `conflict` |

- **Only what it adds:**
  - a `taken` row with `f < a` is dropped, as a removal or a lowering;
  - a conflict is a conflict only when `f > a`, and a lower file count is ignored (handoff, Other decisions).
- **Only its tokens:** the card plan is empty.
- Printing attributes (`scryfallId`, `condition`) ride with the side that wins. A holding that differs only in
  condition is not a conflict, and keeps `a`.
- **Bulk answers are rules, never row ids** (G11): `answers = { all?: "app" | "file", byKey: Record<key, "app" |
  "file"> }`. A per-row answer overrides `all`, so a bulk press decides every conflict, shown or not.
- The output is the planned rows (before/after, as `planReplace` returns) plus the counts the tiles, bar, receipt and
  History read:
  - `taken`, `kept`, `agreed`, `unchanged`, `conflicts`, `undecided`, `answeredFile`;
  - all in holdings ("cards", handoff call 6).

**Staleness** (`staleness(file, anchor, earlier)`, pure):

- `noNewer`: the file's cards equal the anchor's. This is S1, Hugh's case.
- `older`: either the file is nearer, by symmetric holding difference, to an earlier confirmed upload than to the
  anchor; or, over 50% of its differences from the anchor reverse the anchor's own changes from its predecessor.
- otherwise `null`.

The thresholds are constants. G2 says they are unmeasured, so the test pins them and the probe prints them.

## The base read (`src/lib/collection/sync-base.ts`)

`readSyncBase(userId)` returns either:

- `{ anchor: { uploadId, confirmedAt, items: Map<key, qty> }, earlier: UploadSummary[] }`, or
- `{ unavailable: "neverUploaded" | "noRecord" }`.

It reads the newest confirmed `csv_uploads` row that is not reverted and whose ledger entry, if any, is an
`upload_replace`, or an `upload_sync` recorded with pick `everything`.

- **Reverted:** its ledger entry has `reverted_by`.
- **A pre-ledger upload** has no entry and is a Replace by construction.
- **The pick** is stored on the Sync's own upload payload (`syncSummary.pick`, below), so no column is needed.
- It is owner-scoped in its own SQL.

`.toSQL()` tests pin both the owner scope and the anchor order.

## PR boundaries

Each PR merges before the next opens. There are no stacked PRs. The sizes are estimates against the ~20 files and
~800 lines split rule.

### PR 1: the engine, dark (no UI; about 14 files)

- **Registry:** `COLLECTION_SYNC_ENABLED`.
- **Migration 0125:** drop and re-add `collection_history_kind_check` with `upload_sync`; `schema.ts` kind enum.
- **`sync.ts`:** `planSync` and `staleness`, with unit tests for every row of the table, both partial picks, the bulk
  rule over a hidden conflict, and the 500-cap independence.
- **`sync-base.ts`** with tests (SQL shape, anchor skipping Add, reverted and partial Syncs, the pre-0008 payload).
- **`write.ts`:**
  - `CollectionChange` gains `{ kind: "sync"; items; uploadId; tokens; pick; answers }`;
  - `applyCollectionChange` re-reads the base under its own lock and plans with `planSync`;
  - a conflict still undecided at the write refuses (`undecided`), and nothing is written;
  - it writes through `writeRows`, never Replace's delete-all;
  - `entryKind` → `upload_sync`, `uploadOf` gives the source;
  - the dry run returns the counts;
  - the confirm stores `syncSummary: { pick, kept, decided, answeredFile }` on the upload's payload (G9; no column);
  - deck check, `wouldShort` and `confirmShort` unchanged.
- **`ownership.ts`:** `writeUploadTokens` takes `mode: "replace" | "add" | "additive"`. Ruling 2's additive is
  `greatest(held, file)` per token and per token printing: never a delete, and never an accumulate. Add's accumulate
  would turn 2 recorded plus an unchanged export of 2 into 4. A test pins that an unchanged re-sync changes nothing. The test pins that a `manual` row the file reads still becomes an `upload` row under
  replace.
- **`actions.ts`:**
  - `UploadMode` gains `"sync"`, behind the switch;
  - `previewUploadChange(uploadId, "sync", { pick, answers })` returns the counts, the conflict rows (capped at 500,
    with the total), the kept rows, `stale`, `unavailable`, the token totals, and **`planDigest`**. That is a hash over
    every planned row's key, `before` and `after`, sorted, and over the token plan.
  - `confirmUpload` takes the same plus that digest. The confirm plans again under the lock and refuses `stale`, writing
    nothing, when its digest differs. This is the stale-preview contract, Sync's form of Revert's `expected` map. A
    holding another tab moved since the preview (a File answer that would now remove more copies than were reviewed,
    say) changes a row's `before`, so it changes the digest;
  - `parseMode` refuses `"sync"` with the switch off.
- **`pnpm probe:collection-sync`** (`scripts/probe-collection-sync.ts`) runs on a scratch branch from local-dev. Its
  fixtures are its own, and it refuses staging and production by `neon.branch_id`. Each check is mutation-checked
  against the rule it names:
  - **a. Hugh's shape:**
    - a Replace of file F;
    - three hand entries (2 new holdings, 1 raised);
    - Sync of F plus tokens: 0 taken, 3 kept, 0 removed, and the tokens recorded as `upload` rows;
    - a re-sync of the same file: nothing to sync, and no entry written.
  - **b. Conflict:** the app raises X to 3 and the file says 2.
    - Undecided refuses.
    - Answered app keeps 3. Answered file writes 2.
    - Bulk `file` decides a conflict past the shown rows.
  - **c. Everything removes:** a file-side removal of an untouched holding is taken, and a short deck asks first.
  - **d. Revert:**
    - a Sync's entry holds only taken and file-answered rows;
    - Revert restores them and leaves the kept rows alone;
    - the recorded tokens stay (G3).
  - **e. Anchors:**
    - after an Add, the base is the previous Replace;
    - after reverting the last upload, the base is the one before it;
    - after an additions-only Sync, the base is unchanged.
  - **f. Only what it adds:** no removal or lowering is written, and tokens are upserted with none deleted.
- **`pnpm measure:sync`** (`scripts/measure-sync.mts`) is read-only.
  - It runs `readSyncBase` and `planSync` for one account (`MEASURE_USER_ID`) against a stored upload
    (`MEASURE_UPLOAD_ID`), or against the anchor file itself, and prints the buckets.
  - It writes nothing, reads by SELECT alone, and may read production. That is d9's SELECT-only rule.
  - **This is the acceptance check for Hugh's case before the flip.** Expected on his production account: 0 taken,
    40 kept, 0 conflicts, `noNewer`, plus the file's tokens.
- **Docs:** AGENTS.md (one entry: the base rule, the anchor rule and the switch) and `docs/probes.md`.

### PR 2: the choice step (about 9 files)

- **`upload-choice.tsx`:**
  - a third card, Sync, drawn third, nothing preselected;
  - the R2 desktop card layout (radio on the title row) for all three cards, ruled by Hugh in R2;
  - `md:grid-cols-3`;
  - roving radios over the available cards, the unavailable card focusable with `aria-disabled` and
    `aria-describedby` naming its reason;
  - Sync's note (`Keeps the N cards you changed in the app…`, or the tokens-only and nothing-new forms);
  - the step title (`What’s this file for?`, G10, ruled R2).
- **Stale banner** at the step head, and the follow-up fieldset after the cards when Sync is picked. **Only what it
  adds** is pre-picked. There is no follow-up when the file adds no card (S1).
- **`replace-flow.tsx`:** carries `pick` and `answers` across Back, a failure and a retry (K4). One `previewUploadChange`
  per mode is already read; the stale follow-up's options each read their own dry run when picked (G8), cached per
  pick in the flow, as the mode reads are.
- **Copy:** `collection-edit.ts` `upload.sync*`, run through `/copy-review` in the PR.
- **About specimen:** the `upload-choice` plate renders the live `UploadChoice`, so its fixture and
  `about-page.test.tsx` get the third card.
- **Proof:**
  - `design-review` against the Choice and Stale boards;
  - the contact sheet: `docs/superpowers/inventories/collection-sync.json`, rows C1–C4, S1, S2 at 390 and 1300;
  - the states drawn at one width are built from that width's content in the other width's shipped chrome.

### PR 3: the Sync review and the confirm (about 12 files)

- **`replace-review-detail.tsx`, `mode="sync"`:**
  - four tiles (`to decide`, `from the file`, `kept from The 99`, `nothing to do`), with `Tile` taking a border prop
    and the grid one `aria-live="polite"` region;
  - the tokens line;
  - the conflicts section (`SyncConflicts`, `ConflictRow`: a fieldset, two 44px radios, the accessible name carrying
    the card and both counts);
  - the bulk presses, which are rules sent with the confirm;
  - the shipped file-side lists, then `Kept from The 99`, with `Rows` gaining the `--fg-body` tone;
  - the overwrite banner and `edited` tags, only for conflicts answered File.
- **`review-screen.tsx`:**
  - the Sync bar sentence;
  - the held button (`aria-disabled`, .4), whose press scrolls to and focuses the first unanswered row;
  - `Sync collection` / `Syncing…`, or `Record N tokens`;
  - `Nothing to sync.` with `Back to Collection` (R3, call 10), which writes no History entry.
- **`short-deck-warning.tsx`:** `source: "sync"`, with `Syncing leaves N decks short` / `Sync anyway`.
- **Refused and unconfirmed:** the shipped A5 forms, inline. G6 (`We couldn’t sync that`) is decided in
  `/copy-review` here.
- **G4:** the preview splits the skipped count, and a Sync's issues panel says `emblem rows skipped`. `actions.ts`
  carries tokens and emblems as two counts; Replace's panel sums them and is unchanged.
- **Proof:**
  - `design-review` against Review, Conflicts, Edge-States and Confirm;
  - contact sheet rows R0–R5, K1–K4 and X1–X4 at both widths;
  - a browser probe (`probe-collection-sync-ui.mjs`) presses a conflict radio, a bulk press and the held button at
    both widths, and confirms on a scratch branch.

### PR 4: receipt, History, Revert and About (about 10 files)

- **Receipt** (`arrivals-summary.tsx`, `card-assignments.ts`):
  - the shipped layout, with Sync's lede clause and sentence (ruling 3);
  - `nowShort` takes a verb (`Replacing` / `Syncing`);
  - the tokens-only lede;
  - the new stamp key named so it does not collide with `card-assignments`' `stamp`.
- **History** (`history-kind.ts`, `history-list.tsx`, `history-view.ts`, `collection-edit.ts`):
  - kind `uploadSync` labelled `Sync upload`, ink `--fg`, titled by the file;
  - the opened entry's lead line, read from the upload payload's `syncSummary` (G9);
  - Revert's confirm is `Revert this sync?`, with the tokens line (`RevertConfirm` gains a title shape) and the Y3
    partial lede.
- **About:**
  - the `upload-choice` entry's three-choice title, caption and key line, and the `post-import` half-line;
  - the entry follows `COLLECTION_SYNC_ENABLED` for its Sync form, announced on the flip, with no `ABOUT_VERSION` bump
    (ruling 5);
  - if the About model holds one switch per entry and cannot carry a switched form, the PR says so and the entry's
    switch moves to `COLLECTION_SYNC_ENABLED` with its two-choice text kept for readers without it;
  - the content hash is re-pinned.
- **Proof:** contact sheet rows Y1, Y1b, Y2, Y3 and the About entry at both widths; `probe:collection-sync` grows a
  revert-through-the-action check.

## Close-out (feature-acceptance)

- **Route × viewport inventory**, every cell ticked against the running app on staging with the switch on:
  - `/collection/replace`: choice, stale, review, conflicts, confirm;
  - `/collection/replace/summary/[uploadId]`;
  - `/collection/history`;
  - `/about`;
  - Home first-run, where Sync never appears.
  Each at 390 and 1300.
- `design-review` against the whole handoff.
- **Before the production flip:** `pnpm measure:sync` against Hugh's production account, read-only, must read 0 taken,
  40 kept, 0 conflicts and `noNewer` for `The Vault 10-1-26.csv` (or what his collection holds that day, with every
  kept holding in his ledger). The reading goes to d9.

## Copy for `/copy-review` (from the audit)

- The Y1 lede: `15 arrived and 2 left` against the shipped `A arrived, L left`, and the trailing `Here’s what…`
  sentence.
- Drawn but missing from the copy file: the Y3 revert lede, `changed since, stays`, and the Y1 heading. The Y1 heading
  is dropped under ruling 3.
- G6, `We couldn’t sync that`.
- The stamp key collision.

## Risks

- **A wrong base deletes data.** The base read is the one place a bug turns "keep" into "remove". It is unit tested,
  `.toSQL()` tested, probed (e), and measured on production read-only before the flip.
- **Concurrency.** The confirm re-reads the base and the collection under the write's per-user lock, and plans again.
  If the plan's `planDigest` differs from the one the preview returned, it refuses as `stale`, as a Revert does, rather
  than writing a merge the player did not see.
- **Stale heuristics** are unmeasured (G2). The warning says "looks". **Only what it adds** is the safe pre-pick.
