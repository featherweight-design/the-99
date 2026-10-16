# Collection features (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Collection Sync** (plan `2026-10-15-collection-sync.md`), behind `COLLECTION_SYNC_ENABLED`, which needs
  `COLLECTION_EDIT_ENABLED` (staging `'true'` from the plan's PR 2, production unset until Hugh flips it; off, the upload
  actions refuse `mode: "sync"` as an unknown mode). A Sync merges an upload against a BASE, per holding key: file-only
  changes are taken, app-only changes kept, and a conflict (both moved, to different counts) is answered app or file,
  per card or by a bulk rule that decides every conflict, shown or not; nothing is pre-picked, and a confirm with one
  undecided refuses (`planSync`, `src/lib/collection/sync.ts`, pure). **The base is the last FILE, never the
  collection after it**: the stored `pendingItems` of the newest confirmed upload that is an ANCHOR (`readSyncBase`,
  `sync-base.ts`, owner-scoped in its own SQL and read under the write's per-user lock). An anchor is an upload with
  no ledger entry (pre-ledger, or confirmed with the ledger off: a Replace by construction), an `upload_replace`, or an
  `upload_sync` whose upload payload says `syncSummary.pick = "everything"`, and its entry is not reverted. Never an
  Add, and never a partial Sync (**Only what it adds**, **Only its tokens**), which did not take the file's removals.
  No anchor, or an anchor stored before migration 0008, is `noRecord`; no confirmed upload is `neverUploaded`. It
  writes through `writeRows` (never Replace's delete-all) as one `upload_sync` entry Revert takes back; the preview
  returns a `planDigest` over every planned row and the token plan, and the confirm REQUIRES it back and refuses as
  `stale` when the plan under the lock differs. A Sync that would change no card and no token writes nothing, the
  upload stamp included (`nothingToSync`). Tokens follow Replace's rule, except under Only what it adds, which is
  idempotent (`greatest(held, file)`, nothing deleted), and except for a HAND-MARKED token (source `manual`): under
  Everything or Only its tokens `keepHandMarks` drops the file's holding for it when the file did not change it since the
  base file's own token list (the anchor upload's `preview_payload.tokens`) or when the hand count is at least the file's,
  so a Sync never lowers a hand mark and asks nothing; with no base token list only the second test applies. The same
  filtered list feeds the plan, the digest and the write; the file's PRINTINGS for a kept token are still recorded. `pnpm probe:collection-sync` proves it on a scratch branch;
  `pnpm measure:sync` prints the buckets for one account inside a read-only, repeatable-read transaction, and is the
  acceptance check for Hugh's production account before the flip.

- **A way in without a collection** (plan `2026-10-15-no-collection-entry.md`), behind `NO_COLLECTION_ENTRY_ENABLED`,
  which needs `COLLECTION_EDIT_ENABLED` (staging `'true'` from PR 1, production unset until the line closes; off, every
  route is as shipped). PR 1 is the write, dark: `importDeck` with `own: true` and a uuid `actionId` adds the list's
  cards to the collection and writes the deck in ONE transaction (`importDeckOwned`, `src/lib/decks/import-own.ts`):
  the add first, the deck inside its `inside` hook, so a refusal leaves neither. The lines are `deckOwnLines`, pure:
  every body line and each commander at the printing the import kept, else the list's first named printing, else none;
  an unresolved line adds nothing, and nothing is reserved. The deck's id is minted first so the ledger entry (kind
  `add`) carries source `deck:<deck id>`: History lists it as `Deck add` titled `Added from <deck>` by the deck's
  current name, Revert takes it back like any add and leaves the deck, and a retry with the same `actionId` finds the
  deck through that source (no `decks` column). Off, or with `own` unset, the import is exactly as shipped.
  `pnpm probe:deck-own` proves it on a scratch branch.

- **Card scanning matches on the server** (plan `2026-10-16-card-scan.md`, Hugh's decisions relayed 2026-10-16),
  behind `CARD_SCAN_ENABLED`, which needs `COLLECTION_EDIT_ENABLED` (staging `'true'` from PR 1, production unset). The
  phone runs the detector and the dhvazquez fp32 embedder and sends the 256-float fingerprint to
  `POST /api/card-scan/match` (signed in, the switch re-checked for the reader, 404 off, `private, no-store`, counted
  in the observe-only `card-scan` rate bucket). `scan_index` holds one pgvector `halfvec(256)` row per printing face
  of the every-printing gallery under an HNSW cosine index, and `scan_index_meta` its version and model (a request
  naming another model is 409). Each guess is the nearest row of a card not already guessed (`lookupGuesses`, one
  repeatable-read transaction), so a card with hundreds of printings cannot crowd out the second and third
  guesses. `pnpm db:seed:scan-index <dir>` publishes `export_index.py all --server`'s files in ONE transaction on a
  NAMED target (`SCAN_INDEX_TARGET_URL`, `SCAN_INDEX_TARGET_BRANCH`, never defaulted, checked by `neon.branch_id`),
  refusing a wrong model, a row off unit length or fewer than 100,000 rows; never through the Neon MCP. Until it
  has run on a database, the endpoint there answers 503 `no-index`. Production's index comes by a copy step, not a
  second embedding run. `pnpm probe:card-scan-match` proves it on a scratch branch. Where the camera is blocked or
  absent, the scanner offers Choose photos (PR 5): each photo is read ONCE, in order, through the camera's own
  detector and embedder and one lookup (`usePhotoReader`), and nothing is added until the player presses. A photo
  row names the card and never a printing: the index matches the card, and the printing added is the sheet's (Fast
  takes the first, Normal asks), drawn on the list line.
  In the camera (Hugh, 2026-10-16), Fast adds a sure card with no press, at its first printing, and Normal opens that
  card's printings on the panel (the shipped `PrintingRegion`) and adds the one picked; a card added and never out of
  the frame is not taken again (R1), and a second copy needs the frame to empty first (R2). Below the gate the panel
  still asks Not sure, and nothing reaches the collection before the review's Save.
  **The read loop reads no frame while the scanner waits on the server** (speed lane, 2026-10-16): a lookup in flight,
  an add waiting for the list, or Normal's printings loading, and each read starts only after the previous frame is
  painted (`afterPaint`). A read is one long run of the models, and every step of a response (its headers, its body,
  the render it sets off) waited for the read in progress, so reading on made a 100ms lookup take about 1.4s and an
  add about 0.9s. `pnpm measure:scan` times the scanner in desktop Chromium at phone width under a 4x CPU throttle,
  with a fake camera putting a card down and taking it away and the match answered locally; on 2026-10-16 it read
  frame to guess 3112ms before and 1852ms after, and add to on-list 911ms before and 102ms after. The scanner posts
  one timing row per session as it closes (`src/lib/scan/timing.ts`: frame to guess, add, mode press to the next
  read, Review to the list, the median read; no id, no card name) to `POST /api/card-scan/timing`, which logs one
  `[scan-timing]` line only while `SCAN_LAB_ENABLED` is on for the reader (staging); find them with
  `vercel logs -p the-99-staging -q "scan-timing"`.

- **The wishlist** (scope §2, Hugh's ruling Q7, 2026-10-12; Social R2), behind `SOCIAL_WISHLIST_ENABLED`, which
  stands alone (`'true'` on staging, unset on production; dark until its UI PR). `wishlist_items` holds cards wanted
  outside any deck at CARD level (any printing), with `quantity` the copies wanted IN ALL. **A card the collection
  holds that many of, deck copies included, is COLLECTED and leaves the list** (Social R2 G5, Hugh, 2026-10-15,
  reversing Q9's "stays until cleared"): `sweepCollectedIn` (`src/lib/wishlist/collected.ts`) deletes the line and
  records it in `wishlist_collected` for the tab's one-time strip, INSIDE the write that reached the want:
  `applyCollectionChange` (every ledger write, Revert included) and `replaceCollection`, after their rows. A
  rolled-back write takes the delete back with it. A FIRST want the player sets at or below what is held
  (`setWishlistQuantity`, under the same per-player lock) leaves no line and answers `held`, and is not recorded: the
  strip names what was collected since they last looked. The want is copies IN ALL, so a set never lowers an UNMET line
  off the list (`wantFloor`, under that lock): it is floored at one more than held, the steppers' − stops there too
  (2026-10-15, d9 for Hugh), and Remove is the way off. **A read never deletes**: every own read leaves out a line the collection already
  reaches, so a copy that arrived around the chokepoints hides the line until the next write sweeps it. The strip's ✕
  is `dismissCollected(viewer, shown)`, which forgets exactly the notices the strip drew (card and timestamp), never
  everything up to a time. `loadWishlistTiles` adds the
  catalog's name and full card image and the price read's figure (G1); `loadWishlistWant` is card details' want.
  `wishlist_collected` is purged with the account. The owner's own rows are read and written in `src/lib/wishlist/`;
  a FRIEND's wishlist is visible (Q7) and is read only through `src/lib/social/wishlist.ts`, which joins the viewer's
  friendship row in the same statement and returns the card (with the catalog's name and full card image, for the
  friend page's tiles) and the wanted count, never an owned count and no got: like every own read it leaves out a
  line the friend's collection already reaches (Social R2 PR 6), so a friend's tile reads `wants N` only.
  `pnpm probe:wishlist` proves it on a scratch branch.
