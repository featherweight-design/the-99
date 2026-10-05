# Probe scripts

Every `pnpm probe:*` browser or database script, moved out of AGENTS.md verbatim on
2026-10-03 (Hugh-approved docs-only move). AGENTS.md keeps a short pointer here plus
the standing safety rules; nothing about any probe's behaviour changed in the move.

Safety rules (restated from AGENTS.md, they govern every entry below):

- Probes never touch production.
- `probe:arrivals` deletes the given user's whole collection via `replaceCollection`;
  mutate on `local-dev` or a scratch branch, never anywhere else, and measure
  comparisons on staging.
- Never `pkill` or `killall` by pattern. Stop a dev server only by the exact PID you
  started, checked first with `ps -o pid=,comm= -p <pid>`.

---
- `pnpm probe:catalog-copy` proves the harness and `db:copy:combos` against TWO SCRATCH branches
  cut from staging (`PROBE_COPY_SOURCE_URL`/`_BRANCH`, `PROBE_COPY_TARGET_URL`/`_BRANCH`; it
  refuses production, staging and local-dev by id). Every refusal is a fact about what two
  databases hold and the rollback is a fact about what one committed, so no unit test reaches
  them. Its sections: a wrong named target and a same-branch pair; no build, a failed build and
  an unfinished one; a target whose card TEXT differs under equal ids, and a source that moved
  since its build; the floors; a verified copy that makes the target's three tables equal the
  source's, grows its notice log and moves its stamp; a tampering publish refused and rolled back;
  a copy that waits for a running ingest's lock on the target, and one that does not start reading the source while an ingest there holds it; and, with `PROBE_COPY_SOURCE_READER_URL` naming a
  SELECT-only, `default_transaction_read_only` role on the source, a copy through that role, which
  is how production reads staging. The lock check lets go a fixed 6s after the copy finishes
  READING, never on a clock: its first version slept 8s and passed with the lock removed, because
  the source reads alone outlast that. Seven mutations fail it: the lock removed, the
  verify removed, the build refusal removed, the named-target check removed, the floor refusal
  removed, and (in the unit pin) `game_changer` dropped from the fingerprint and a raw
  `cc.rarity` read added to a builder. It writes ledger rows, flags, variants and one
  card's text, and puts the text back in a `finally`. Its index section proves `db:copy:index` over a
  target a staging build would never produce: a commander only the target lists (dated ahead), a
  moved header column, a sentence on a shared row, a stored score, and a pair only a target deck
  holds. A publish that verifies wrong rolls the score clear back; a good one leaves the six tables
  equal to the source's, deletes the target-only commander, keeps the sentence, clears the scores
  and reports the pair. It adds a deck and a score under a per-run user, deleted in the `finally`.

- `pnpm probe:list-stamp` proves the stamp against a real Postgres: every table the check
  computes carries a deferred trigger keyed on the column it owns; an insert, an update and a
  delete on each one move the stamp by exactly one, on the run's own fixture rows; a rollback
  moves nothing, and an update of a whole collection moves it once; and the deadlock pair
  above. `--timing` runs only its cost section: a collection replace and a commit at the
  largest account's real sizes, median of 3, which is how the before figure is taken on a
  database the migration has not reached. Measured on a `pull:staging` copy, the median of three
  runs each with every trigger disabled and then enabled: a 3,250-row collection replace went
  544ms to 587ms (about 7 microseconds for each of its ~6,500 row events, a delete and an insert per row), and a 96-row commit
  377ms to 375ms, which is no measurable change. It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it
  at `local-dev` or a scratch branch, **never production**.

- `pnpm probe:declaration` proves the declaration's STORAGE against a real Postgres — the two
  columns a commit writes onto a version, and the rule that decides what goes in them.

  The rule is pure and unit-tested; what no unit test here can reach is whether the transaction
  wrote it. Five facts live there. A declaration inside the committed version's permits is
  CARRIED into it, which is the ruling the round rests on: the choice travels with the version
  it was made for, so nothing ever asks a player to change what they said. A declaration the
  version's own cards do NOT permit is not carried — the version records none rather than
  asserting a bracket it contradicts, while the deck keeps its live answer, stated and not
  deleted. **The version's copy never moves afterwards**, which is the whole point of the
  column: without it a version's answer would follow the deck and *Version 1: chose 4* would
  become a lie the moment the player chose again. A commit with no snapshot records neither
  column, which is where every version committed before the migration already is. And the check
  constraint refuses anything but 1–5 or null on BOTH tables.

  **It proves the storage, not the surface.** Nothing draws a declaration yet, so there is no
  action to call and no reader to observe; the header says so rather than letting the name imply
  more.

  Two mutations were run against it and both fail: carrying the declaration unconditionally, and
  skipping the sort on the permits snapshot. Its first run also found that local-dev had never
  had the migration applied — the column did not exist.

  Same fixture discipline as `probe:claims`: a per-run `user_id` deleted in a `finally`, pointed
  at `local-dev` or a scratch branch, **never production**.

- `pnpm probe:profile-store` proves the stored deck analysis against a real Postgres, through
  its lifecycle (Hugh's rulings, 2026-09-23), by calling the real `computeAndStoreProfile`,
  `readStoredReading`, `readStoredPermits`, `pinAnalysisToVersion` and `touchDeck`. Pressing
  Analyze writes `deck_profiles`. Opening the Analysis tab reads it back WITHOUT computing, which
  is what lets an analysis survive a reload without breaking Round 4's ruling 7 (no auto-run on
  tab open).

  **A reading never lapses.** It is FRESH while its `fingerprint` still matches the deck and
  `dirty` is clear, and STALE otherwise, and a stale reading is still returned. The fingerprint is
  `listFingerprint`, the list alone. `touchDeck` sets `dirty` in the edit's own transaction, and
  every analysis clears it. A moved catalog and a row eight days old both still read fresh. Only
  a whole deck is analyzed (ruling 1): a short body is refused with its counts, computing and
  writing nothing. A second press on an unchanged list answers from the store (ruling 5).

  **A version bump is not an edit** (Hugh's condition at plan approval). A row an older
  `PROFILE_VERSION` wrote, over an unchanged list, reads back fresh: it is rebuilt quietly and
  never marked dirty. The same row on a dirty or illegal deck reads as nothing, because an old
  document's shape is never shown; version.ts records the NaN that costs.

  **A commit pins the reading** (ruling 2) to the version it wrote. The pin runs in `after()`
  and carries the fingerprint of the list the commit froze, so a pin for a list the deck no
  longer holds writes nothing. That check measured nothing on its first run: it pinned a made-up
  version id, which failed the foreign key, and the pin swallows that error, so the row read null
  on any build. It pins the real id now.

  Five mutations fail it: ignoring `dirty`, dropping the quiet rebuild, dropping the pin's list
  guard, dropping `touchDeck`'s write, and (in the unit suite) dropping the commit's `after`.
  Both functions take their two cached reads as injected deps, because `unstable_cache` raises
  outside a request, so the probe exercises this module's SQL rather than a copy of it. The
  fixture is a whole 99-card deck. Same discipline as `probe:claims`: a per-run `user_id` deleted
  in a `finally`, `local-dev` or a scratch branch, **never production**.

  It also proves the two BRACKET CHIP readers, which HOLD over an edit (ruling 4):
  `readStoredPermits` (the deck header) and `storedPermitsSql`, the deck list's correlated
  subquery. Neither carries a freshness clause, and after an edit both still read the last
  analyzed bracket.

- `pnpm probe:synopsis` proves the deck synopsis's writes and reads against a real Postgres
  (sub-project 6) by calling the real `writeSynopsisFor`, `retrySynopsisFor`, `readSynopsisState`,
  `readVersionSynopsis` and `pinSynopsisToVersion`. Every rule those apply to what they READ is
  unit tested. What only a database answers is what they WROTE: the run row and its allowance
  unit settled in one transaction, the partial index that allows one run per deck, the reaper that
  frees a deck a crash left pending, and the version copy taken once, at the commit, onto the
  newest version only.

  **The model is injected and spends nothing.** Outside production the synopsis never calls the
  real model unless `SYNOPSIS_LIVE=1` is set; `src/lib/synopsis/stub.ts` answers instead, built from
  the deck it is asked about, and `SYNOPSIS_STUB` switches it to `partial`, `refused`, `malformed`, `rejected`,
  `busy` or `timeout`. So a dev server and every UI probe run free. `--live` is the one path that
  opts in: it needs `ANTHROPIC_API_KEY`, runs `--max-calls` (default 3, capped at 5) real calls,
  and prints tokens and an estimated cost after each, inside Hugh's $25 eval budget. To measure a
  real list, `pull:staging` a deck and name it with `PROBE_SYNOPSIS_DECK`: its cards are COPIED onto
  the run's own fixture deck, so nothing of the named deck or its owner is ever written.

  **Each path of the reaper is proved on its own stranded run**, and that is a lesson paid for:
  with one stranded run read before the write, removing the WRITE's reap passed, because the read
  had already reaped it. Seven mutations fail it: reuse keyed on nothing, a charge that ignores
  what was shown, a failed retry charged, either reap removed, the pin's list guard removed, and the
  pin made an upsert. It writes a fixture under a per-run `user_id` and deletes it, and its ledger
  rows, in a `finally`. Point it at `local-dev` or a scratch branch, **never production**.

- `pnpm probe:bracket-chip` walks the bracket chip on the deck tile and in the deck header at
  1300x900 and 390x844: the header draws it on a FRESH load, from the stored analysis, before any
  tab is pressed; both copies are the handoff's chip, 22px on a phone and 24px from `md`, with a
  mono label, and they share the status pill's line rather than pushing a second one (or, on the ~190-230px tiles of the 640-1000px grid, wraps below the
  pill); nothing paints over the bar, whose track keeps a 40px floor; the tile's copy stays inside
  its tile; and pressing the header's lands on the Analysis tab. It runs at 1300, 700 and 390,
  because 700 is the width where the bar collapsed to 0px before the floor. Two traps it hit, both by running it: the tile's footer is NOT inside the
  tile's link, so a chip searched under `a[href]` reads 0; and both header widths stay mounted,
  so `querySelector` returns the hidden desktop copy at 390 and the phone reads 0 chips on a build
  that draws one. It searches every host and keeps the visible ones. With the phone header's chip
  unmounted, the 390 header check fails; with the bar's floor reverted, the 700 bar reads 0px.
  **It reads a RANGE separately.** The walked deck is the first one the account lists, which on
  local-dev is a single bracket, and there "the high mark is dimmed" holds on any build. So a
  deck whose stored reading is an unanswered range is found by query, and its header is read
  without a press: both names, and only the high mark at 0.65. No such deck fails the run. With
  the dim removed it reads `opacity 1, 1` at both widths.
  It NEVER EDITS A DECK. The rule that an edit HOLDS the header chip (ruling 4) and a change of
  deck retires it is `use-header-bracket.test.tsx`'s, and `probe:verdict-block`'s 2i walk reads
  the held chip in a browser. Pressing Analyze upserts one `deck_profiles` row, which the
  `finally` puts back as it was, each cleanup step on its own so one failing cannot skip the
  rest. Point it at `local-dev`, **never production**.

- `pnpm probe:claims` proves the deck claim model against a real Postgres by calling the real
  `loadAvailability` — a committed version holds its cards against every other deck's draft, an
  uncommitted removal still claims, and per-card `since` decides between two committed decks. The
  claim model is raw SQL no unit test in this repository can reach, so this script is the only
  proof it behaves. It writes a fixture under a per-run `user_id` and deletes it in a `finally`;
  point it at `local-dev` or a scratch Neon branch, **never production**. On a deck's own page
  `free` is a surplus, not a count of copies: 0 means "holds what it needs and no spare", and a
  negative figure is the number of copies that deck has to buy. The claim it subtracts for the
  deck itself is that deck's **draft** ask — its `deck_cards` rows plus its live commander
  columns — not what its committed version asked for. A card staged into the draft therefore
  counts against the supply the moment it is added, which is what makes a shortfall visible
  before the commit rather than after it.

  Its second and third sections cover `card_assignments` — a player's own allocation of a
  contested copy, overriding seniority. They are separate fixtures under their own `user_id`s
  rather than more steps on the first, and that is not tidiness: every figure here is a
  subtraction over EVERY deck claiming the card, and the first section deliberately accumulates
  a brew, a draft-add deck and two list claimants, so a case whose expected value is worked out
  by hand cannot live there. Read against that fixture the folded-commander case reports -2,
  which is correct arithmetic and proves nothing about commanders.

  Eight mutations were run against it and all eight fail. **Four of them failed nothing on the
  first attempt**, and each one bought a case the reading had missed:

  - **The ask cap needs a GENEROUS supply to be visible.** With one copy owned the supply
    ceiling binds first, so a reservation of three grants one whether or not the ask is capped.
    The case owns three.
  - **The commander subtraction from the ask only bites when the folded deck is the one
    RESERVING.** Assigning to a third deck never exercises it; a deck whose ask is
    commander-plus-list booking two copies for an ask of two does, and the copy it steals lands
    on a bystander nobody was choosing between.
  - **A reserved senior is invisible whenever the remainder is 0**, which it is in every
    headline case, because `least(senior, remainder)` absorbs the double count. It takes three
    copies and two reserved seniors for a third deck to report it.
  - **A brew's commander sets no ceiling**, and the brew has to be led BY the contested card for
    the restriction to committed decks to matter at all.

  The off-decklist read is asserted too, since it takes the one branch nothing else here
  reaches, and its check is an INVARIANCE: two committed decks claiming one copy read -1 with or
  without a reservation, because a reserved copy is still sleeved in the same deck it was.
  `loadDeckBuyRows` is asserted beside `loadAvailability` rather than assumed to agree — it
  computes the same allocation through a second, independently written expression, and a
  reservation that moved one and not the other would leave the deck page and the receipt
  disagreeing about the same card.

  Its last section covers **the release a `Pull it` writes** (Hugh, 2026-09-27). A pull takes the card out of
  the SOURCE deck's draft and commits nothing; a `pull_releases` row subtracts the pulled copy from
  that deck's committed claim, so the asking deck's buy tag clears before anyone commits. The
  subtraction lives once, in `all_claims`, which `loadAvailability` and `loadDeckBuyRows` both
  read, and every figure in the section is asserted through BOTH. The two readers cannot be
  mutated apart on this rule, because there is one expression: dropping it fails both readers'
  checks at once. The discard, the commit and the add are the REAL functions. Only the source's
  commit and discard DELETE a release; no add does, Put back included. The release is limited
  instead: `all_claims` never subtracts more than the version lists beyond the source's draft, so a
  card back in the draft cancels its own release by any path, and cutting it again before the
  commit makes it count once more. Mutations that fail it: the subtraction dropped (both readers),
  the limit removed, the release left standing by a discard or by a commit, and the chooser
  ignoring the release. The commit case needs a second step to bite: a release a commit leaves
  behind subtracts nothing until the source commits the card AGAIN, and then hands the asker a
  copy nobody gave up.

- `pnpm probe:arrivals` proves the collection confirm's own lock and its receipt against a real
  Postgres by calling the real `replaceCollection`. Two things live there that no unit test here
  can reach. THE LOCK: `confirmed_at` is stamped by a conditional update inside the replace
  transaction (`where confirmed_at is null returning id`), and the transaction is abandoned when
  it returns no row — whether that stops a second confirm is a question about what the database
  did, and a read-then-write guard passes every unit test while replacing the collection twice.
  Its third case starts two confirms of ONE upload together and asserts exactly one wins; with
  the stamp made unconditional, two of its checks fail. A separate case races two DIFFERENT
  uploads, because the conditional stamp does nothing there — both rows are unconfirmed and both
  pass it — and what serializes them is a per-user advisory lock taken inside the same
  transaction. What that protects is the collection: two interleaved delete-and-reinserts leave a
  MIXTURE of the two lists or raise 23505, so the check asserts the collection is exactly one of
  the two. With the lock removed it fails on every run.

  THE RECEIPT: the arrivals diff reads the collection either side of a write, and there is no
  collection to read either side of anything in jsdom. It calls `writeArrivalsReceipt` — the
  helper `confirmUpload` uses, extracted so a probe can reach it without a request — and reads
  the stored column back rather than trusting the return value, because persistence is half of
  what the case proves.

  Three of its cases exist because a mutation run measured nothing without them. **A receipt with
  no DECKS emits no rows**, so the frozen-name checks passed over an empty name map until the
  fixture grew a committed deck that owes the arriving card. **Contention needs demand above
  supply among committed decks**, so the claim read could be replaced by an empty map and every
  other check still passed until a second deck asked for two copies against the two that arrived.
  And the lock case above needed two uploads rather than one.

  What it does NOT cover, deliberately: the ORDER of the invalidations and the receipt write
  inside `confirmUpload`. That function needs a request and a signed-in reader, so the probe calls
  the helper beneath it — skipping the receipt write in the action is invisible here. The
  ordering's reason is in the code: the invalidations run first because the replace has already
  committed, and a failed receipt must not leave stale caches behind as well. It writes a fixture under a per-run
  `user_id` and deletes it in a `finally` — point it at `local-dev` or a scratch branch, **never
  production**, and note that this one is stricter than the other probes about that:
  `replaceCollection` DELETES every collection row for the user it is given.

- `pnpm probe:folders` proves deck folders against a real Postgres by calling the real
  queries — a deck files and unfiles, a cross-user move is refused from either side, and
  deleting a folder unfiles its decks without deleting any of them. That last rule is the
  foreign key's `on delete set null`, which no unit test in this repository can reach. It
  writes a fixture under a per-run `user_id` and deletes it in a `finally`; point it at
  `local-dev` or a scratch Neon branch, **never production**.

- `pnpm probe:folder-flash` answers a question about round trips rather than pixels: how many
  times one folder write refetches `/decks`, and whether the route's `loading.tsx` or a document
  load appears between the filters and the decks. It was written for a report of "a loader screen
  shows briefly" and found the cause — the round called `router.refresh()` on top of a Server
  Action that already calls `revalidatePath("/decks")`, so every write fetched an expensive route
  twice. **A Server Action that revalidates the route it was called from already returns the
  updated payload**; the client refresh was pure duplication, and removing it halved the traffic
  with no staleness, which the probe proves by asserting the segment's count, the renamed shelf
  and the deleted one. It files, unfiles, renames and deletes its own folder in a `finally`, and
  counts loads across twelve writes — a create, nine moves, a rename and a delete — rather than
  one, because the fault was intermittent. One caveat
  it taught: the FIRST create after a cold `pnpm dev` does reload the document, and that is Next
  compiling the route, not the app.

  **It walks Hugh's delete at 390 too** (2026-09-28): a folder made, a deck filed into it, that
  shelf selected, then deleted from it. His staging walk found the phone's sheet still listing the
  deleted shelf with its deck and `Unfiled` one short, until a reload. The stamp and the page cache
  were both right. The cause was the delete's callback writing the URL (`onShelf` →
  `replaceState`) as soon as the action's RETURN VALUE arrived, while its revalidated payload was
  still streaming: the router refetched mid-stream and settled on the old tree. **An action's
  promise resolves before its payload lands, so nothing that writes the URL belongs in its
  callback.** The fallback to All decks now comes from the payload (`shelfMissing` and the URL
  effect keyed on `folders`). The probe reads the sheet's rows, the `Unfiled` count against the
  database, and the same rows after a fresh load. It is a race, so the mutation (the URL write put
  back) was run three times and failed all three.

  Its round trips count the `/decks` page alone, never a prefetch. A revalidation re-prefetches
  every tile's `/decks/<id>` link (18 per write on a 20-deck staging copy), and an action posted
  from `?folder=` re-prefetches the bare `/decks` link (`next-router-prefetch: 1`). Counting either
  failed every write on a real account while measuring nothing. Point it at a staging-shaped
  scratch branch or `local-dev`, **never production**.

- `pnpm probe:stats` proves the deck-stats loader against a real Postgres by calling the
  real `loadDeckStats` — a deck the player does not own is refused, both commanders are
  folded into the curve and the spread despite not being `deck_cards` rows, a grouped game
  tally comes back as a record, and each deck's cost is its own. The pure half is unit
  tested; only a database can answer whether the loader assembles the right rows. Same
  fixture discipline as `probe:claims`: a per-run `user_id` deleted in a `finally`, pointed
  at `local-dev` or a scratch branch, **never production**.

- `pnpm probe:writer-version` proves the `commander_scores` writer stamp against a real Postgres:
  a writer that announces `app.writer_version` keeps it, one that says nothing has every row it
  touches marked stale, and the announcement does not outlive its transaction. That last one is
  the point — the column exists so a reader can tell a set written before built commanders were
  scored (rows deleted out of it, otherwise indistinguishable from a whole one) from a current
  one, and an older deployment's UPDATE would otherwise leave its truncated set marked current.
  A trigger is unreachable from any unit test, so this script is the only proof it behaves. Same
  rules as `probe:claims`: per-run `user_id`, deleted in a `finally`, **never production**.

- `pnpm probe:score-lock` proves the advisory lock that coordinates score writes with a
  commander-index rebuild. `commander_scores` is scored against that index, so a rebuild
  invalidates every synergy figure in it: the build deletes the table, and `persistScores`
  re-reads `max(commander_support.computed_at)` inside its own transaction and abandons a write
  whose fingerprint has moved. **The comparison alone is not enough** — it proves the index had
  not moved when it ran, not at COMMIT, so the clear can land between that check and the inserts
  and leave the pre-rebuild rows it meant to delete behind, marked `writer_version`-current and
  indistinguishable from a fresh set.

  A lock is invisible in every value these functions return, so a unit test can only read back
  the statements a stubbed transaction executed. That says the right text was issued; it cannot
  say the lock was taken on the same connection as the delete, held across it, or that it blocks
  anything. Two connections can. Its second case is the COUNTERFACTUAL — the same interleaving
  with no lock, where the pre-rebuild row survives — and without it the first case proves only
  that a delete deletes.

  **Which side is real differs by case, deliberately.** Case 1 needs a writer that holds its
  transaction open across the clear and `persistScores` commits on its own, so there the CLEAR is
  the real function and the writer is the SQL it issues; case 3 is the mirror. Removing the
  exclusive lock fails both of case 1's checks, removing the shared one fails case 3's.

  Three defects in the probe itself, each found by running it, and each a trap for the next one
  of these: a cross-connection read **cannot see an uncommitted row**, so expecting the writer's
  own insert reads 0 on a working build and a COMMITTED sentinel is what proves a clear is
  blocked; a client released while its transaction is aborted **stays broken**, and the next
  caller to draw it from the pool was the cleanup, which then left the fixture behind; and
  `process.exit` in a `finally` **swallows the exception**, so the run printed "all checks
  passed" over a case that never ran a check.

  Same fixture discipline as `probe:claims`, and stricter about the target than most: the clear
  under test deletes `commander_scores` **wholesale, for every user** in the database it is
  given. `local-dev` or a scratch branch, **never production**.

- `pnpm probe:commander-row` measures the two figures on the shared commander row that cannot
  be derived, at 1300x900 and 390x844 on `/commanders` and `/discover`.

  **`labelAtPx`** tells the art wash where its ramp tops out. The two retired rows carried 56
  and 63, arrived at by adding up padding, glyph and gap heights — which is how the top of a
  rank ended up on a rising gradient once already. The probe asserts the PROPERTY instead: the
  scrim reaches full opacity above the tallest marked ink. Read off the painted gradient, never
  the constant — a first version printed both figures and asserted neither, and a second
  imported the constant, which only ever agrees with itself. Measured: full opacity at 152px,
  ink starts at 168px desktop and 176px phone.

  **The sentence clamp.** The longest stored sentence is 190 characters against a budget derived
  from a 190-character estimate, which is zero margin on a proxy — characters do not wrap, glyphs
  do. `innerText` reads back WHOLE on a clamped element, so every text assertion in the unit
  suite passes over a sentence the reader sees cut; only `scrollHeight` against `clientHeight`
  tells them apart. It draws 2 lines at 1300 and 4 at 390, with no overflow at either.

  **It searches the long sentence onto the screen, and fails if it did not.** The list is
  windowed, so the first screen is whatever ranked highest: the first version passed on a
  145-character worst case and proved nothing about the clamp it exists for. The assertion is
  ONCE PER WIDTH rather than per route, because the lanes are disjoint by construction —
  `/commanders` lists what the reader owns and `/discover` what they do not — so no commander
  appears on both, and the per-route form failed on the lane that cannot hold it. The search box
  is cleared again when a lane does not hold the commander, or the run is left with no rows.

  Three defects in the probe itself, each found by running it: `process.exit` in a `finally`
  **swallowed a throw** and reported "all checks passed" after one check — the THIRD time that
  trap has been written here, after `probe:score-lock` and `probe:payload`; matching the scrim on
  `"180deg"` found nothing across 50 nodes, because 180deg is CSS's default direction and
  computed style drops it; and a `*` sweep of the band's descendants found no gradient at all,
  because the wash mounts its own wrapper. It makes no writes. Point it at `local-dev`.
  Its last pair came from the CONTACT SHEET rather than from any assertion: the foot line
  wrapped as `1,179 decks tracked ·`, separator dangling at the line end with the price below.
  That is the same dangling separator review reported in round 1 of #708 — reachable by
  WRAPPING rather than by a null field, which is why the null-field reading of it was wrong and
  the fix was still owed. The separator now travels with the figure it precedes in one flex
  item, and the probe reads it by GEOMETRY: no separator may be the last box on its line.
  **Only `/discover` at 390 reaches that check**, because it is the only route and width where
  the line is long enough to wrap; the other three cells pass on a broken build.

- `pnpm probe:draft` proves the draft readers against a real Postgres by calling the real
  `loadDraftState` and `loadDraftRows` — a brew has no version rather than an empty change
  list, a draft identical to its version is clean, a basics-only edit is a NAMED row carrying
  the pair it moved between and costing nothing, `names` covers the changed cards only, an
  unowned add with a live price is quoted and one that has never been stocked is counted out
  of the coverage, and a row's `quantity` is the delta rather than the copy count.
  A basic is a row in both change lists and an absence in every money figure, and the probe
  asserts both halves: it buckets `free` before the availability map is consulted, is asked
  about by neither the claim read nor the price read, reads back `owned` so no buy tag is
  drawn, and leaves `unfreeCount`, `total` and `pullableCount` where they were.
  Those figures come out of a snapshot transaction, a diff, a claim read, a price join and a
  collection lookup, which no unit test here can assemble. Only the diff is transaction-bound:
  the claim, price and collection reads run after that transaction closes, deliberately, because
  a claim is point-in-time whatever boundary is drawn around it — another deck can commit between
  the read and the reader's click — and what makes a pull safe is the server action re-reading
  every claim in its own transaction and refusing with a named reason. The draft's figures may
  therefore mix times, which is the contract, not a gap in it. Its last step is a two-connection
  race rather than a figure: a card removal that starts while a discard holds the `deck_cards` row
  lock resumes to find its row deleted and writes nothing, where the single unconditional statement
  it replaced matched nothing and then deleted the freshly restored row. Same fixture discipline as
  `probe:claims`: a per-run `user_id` deleted in a `finally`, pointed at `local-dev` or a
  scratch branch, **never production**.

- `pnpm probe:touched` proves the deck touch stamp against a real Postgres — the column
  Home's resume block orders on. Two things live there that no unit test here can reach.
  The FIGURE: `lastCommittedSql` is a correlated subquery, and one written the obvious way
  returns null for every row with no error, so the `committed` verb would simply never print;
  `src/lib/decks/last-committed.test.ts` renders the SQL and this proves the answer against a
  fixture whose true value is known. The RULE: a commit must NOT move `last_edited_at` or that
  verb becomes unreachable, while a discard back to a version MUST move it — both are facts
  about what a transaction wrote. It also pins the migration's backfill, since a deck whose
  `last_edited_at` was stated must read back that instant rather than the default `now()`.
  The fixture's game is logged with the database's clock rather than a stated date, because
  commits are stamped by that same clock and the order is the one thing that needs them
  comparable. Same discipline as `probe:claims`: a per-run `user_id` deleted in a `finally`,
  pointed at `local-dev` or a scratch branch, **never production**.

- `pnpm probe:versions` walks the version rail and the game-log stamp in a real browser at
  390x844 and 1300x900, because five of their rulings are only answerable there: that the rail is
  reached by pressing the deck's `Versions` tab and draws below the deck's own head rather than in
  place of it — geometry, so a rail nested anywhere inside the shell cannot buy a green; that the
  retired `/decks/[id]/versions` is GONE and answers not-found rather than still forwarding; that
  the deck page refuses a deck the reader
  does not own — the not-found page, and no rail; the response itself is a 200 because the page
  streams behind `decks/[id]/loading.tsx`, so the status is flushed before the guard throws — that
  a row's diff is fetched when the row opens rather than shipped with the page, that nothing on
  either surface carries a
  transition or animation (READINESS 19 forbids motion outright, and a count of 0 is the only way
  to show it), and the stamp slot's width and ink. It signs in through Clerk's dev instance —
  see the local-auth note in memory — writes its own deck, three versions and two games under the
  account it signed in as, and deletes the deck in a `finally`; versions, version cards and games
  cascade. Point it at `local-dev`, **never production**. What it measured on the phone: the two
  stamps do not share a vertical, because the meta cell to their left sizes to its date text below
  `md:` — the game log's existing behaviour, not this surface's.

- `pnpm probe:games-empty` walks the Games tab's empty state in a real browser at 1440x900
  and 390x844, because its three rulings are facts about laid-out geometry rather than
  markup: that the desktop group is centred, that the card-fan mark sits level with the top
  of the content column in BOTH the collapsed and expanded states, and that the scope note
  is absent. The expanded state is the one that matters — collapsed, the old
  `align-items: center` was 36px out; with the form open it was 442px out.

  Two of its checks exist because of what the other one cannot see. **Equal gaps either side
  do not prove centring**: with the content column unconstrained the group spans the section
  edge to edge, so both gaps read as the section's own padding and look perfectly symmetric
  while centring nothing. That check passes on the broken build, which is why the probe also
  asserts the column's 720px cap and that the free space either side clears 100px. Run with
  the fix reverted, 10 of its 18 checks fail and the symmetry one is among the 8 that do not.

  It writes one deck with no games under the account it signs in as and deletes it in a
  `finally`; point it at `local-dev` or a scratch Neon branch, **never production**.

- `pnpm probe:review` walks `/decks/[id]/changes` at 390x844 and 1300x900: the route's guard on
  a clean deck, `?commit=1` arriving as a URL, the phone's segmented column pair, the `Pull it`
  control against a real claim, the what-changed strip drawing all six cells at both widths,
  its type-move rows not clipping their own names, the discard confirm at both doors, the
  type of the availability marker on a diff row, and a held row keeping both of its lines and
  both of its names.

  That last one needs a fixture no other check does. An `in` row buys by default, so an add
  that is unowned or hard-claimed draws a buy tag; an `out` row excludes its own claim, so a
  cut with no spare copy is deliberately silent. The one row that reaches the marker is an add
  whose lone copy is held by a **brew** — a deck with no committed version claims softly, so
  the add keeps its free bucket and the label reads `1 in a brew`. The probe builds that brew
  itself, and refuses to run at all when the collection holds no card free to put in it.

  The marker checks name the row they expect — a `1 in a brew` label on the brew's own card —
  rather than counting markers, and assert the size by value at each width: 11px under 768px,
  11.5px above it. Each clause closes a way a run could report a pass while measuring nothing.
  With the marker's type reverted the label reads 16px sans against a 12.5px card name; with
  only the `md:` step dropped it reads 11px on desktop, which is still under the name and
  passes every other check; with the brew's card left out of the staged draft it reads
  `markers: 0`. All three fail the run.

  The clipping check needs a layout twice over. `text-overflow: ellipsis` leaves `innerText`
  whole, so a truncated `Enchantment` reads back intact and every assertion on the row's text
  passes while the reader sees `Enchantme...`; what tells them apart is `scrollWidth` against
  `clientWidth` on the name itself. An empty move list FAILS rather than passing quietly — the
  fixture is built to move a type group, so no row means the check lost its subject. So does a
  phone run whose widest moved name holds less text than the retired 74px slot: the draft cuts
  whatever cards the fixture picked, and a run that happened to move only `Lands` would pass
  against the old slot as readily as against the flexible one.

  The held row is read at the run's own width and then again at 820px, the narrowest desktop,
  because the shortfall relocates rather than resolving. A single line demands about 561px; a
  paired type column offers 574px at 1300px and 165px at 820px, so a wide viewport reports a
  healthy name on the build that erased it. Three clauses, each closing a failure the others
  cannot see: the two names sharing a vertical means the row collapsed back to one line, a card
  name under 40px means the name went to zero, and a deck name under 40px means the fix pushed
  the collapse onto the other name instead of curing it. That last one is the whole reason for
  the second width — reverting the deck name's floor reads `deck 0px` at 820px and `deck 91px`
  at 1300px.

  Its fixture card is deliberately **costless**. `markerDrawn` is `auto || !manaCost`, so only a
  costless card draws the 46px marker box that the card name and the 54px cost track then have to
  share a line with; on a costed card that line fits and every clause passes over the regression.
  With the card costless and the first line's `flex-wrap` reverted it reads `name 13px` at 820px.
  That one class is also the only one of three candidate fixes that measured anything — a `min-w`
  floor on the name and suppressing the invisible half of the marker box both passed the mutation
  and were dropped, because `flex-wrap` sizes items at their hypothetical width rather than their
  shrunk one and so wraps the line before any item reaches zero.

  Its basics block is the one that found a defect the component tests could not. The fixture
  sleeves two basic lands into the version at five copies each and moves both — one cut whole,
  one cut by a single copy — and reads each row for its `from → to` pair, its buy tag, its
  availability marker and its `Put back` control. What it caught: all three diff surfaces
  decided whether to print the pair with their own copy of `from > 0 && to > 0`, which was
  right for exactly as long as no row could lose more than one copy, so a whole cut of five
  Swamps printed a bare `Swamp`. The rule is now one shared `printsPair` — `from > 1 || to > 1`
  — and `1 → 0` still prints bare, because the column heading has already said it. `Put back`
  is read as a QUANTITY test rather than a rule about basics: the `5 → 4` row keeps the control
  and the `5 → 0` row must not offer it, because a put-back adds one copy while the model
  beside it credits the whole row. A direct visit with no `?commit=1` is expected to be
  ADMITTED — the refusal is what left the edit undescribed in the first place.

  The fixture's THIRD basic, an add of five, is what makes the buy-tag and marker readings
  mean anything: a tag is an `in`-row treatment and an `out` row excludes its own claim, so
  a fixture of cuts alone reports both absent while measuring nothing. That add is also the
  one place this script touches the COLLECTION. `AvailabilitySlot` draws the tag on `!owned`,
  `owned` comes off a collection read, and the fixture account owns every basic in the
  catalog — so an added basic reads as owned whether or not the model forces it, and the
  reading passes over a build with the rule taken out. The block lifts that one basic's
  `collection_items` rows with `delete ... returning *`, puts them back inline and again in
  the run's `finally`, and prints how many it moved. Two rules the fixture follows because
  the alternative is permanent data loss: the cleanup handle is populated BEFORE each write
  it covers rather than returned at the end, so a throw part-way through cannot strand a
  player's collection; and every version row the fixture overwrites is captured first and put
  back, because the template is a real 99-card deck that may already sleeve any of these
  basics. The add is also chosen from basics the version does NOT hold — one it does would
  be a recount rather than an add, or no change at all. Four mutations were run against it and
  all four fail: reverting `printsPair`, dropping the `Put back` quantity gate, restoring the
  basics filter in `readDraft`, and taking the `owned` override off a basic row.

  It writes three decks under the account it signs in as and deletes them in a `finally`;
  point it at `local-dev` or a scratch Neon branch, **never production**.

- `pnpm probe:verdict-block` walks the Analysis tab's verdict at 1300x900 and 390x844 and
  proves how the bracket mark is DRAWN, which is the one thing every unit test here is blind to:
  each wrong way to draw it renders plausible markup and errors nowhere.

  `<img src="/brackets/…svg">` renders every mark **black** — the ten files ink every path with
  `currentColor`, and an external SVG resolves that against its OWN root, so the page's
  `--bracket-N` never reaches it. A CSS mask fixes the ink and leaves the numeral wrong: the
  files carry it as `<text font-family="Cinzel,serif">`, and an external SVG cannot load the
  page's webfont, so inside a mask it is the platform serif. Invisible at the 22px chip, which
  `ASSETS.md` calls decorative there, and plainly wrong at 26 / 36 / 44 where it is the thing
  being read. So the component masks the art, subtracts the file's own numeral with a second
  mask layer, and draws the numeral as real HTML text — and this probe reads the **resolved**
  font-family, the **painted** ink, and the bytes the mask URL actually serves.

  It also re-measures the contrast GROUND rather than inheriting one. `contract.test.ts` held a
  provisional list while nothing drew a mark; this block is the first mount and it draws on its
  own `--surface`, so the domain is one token. That retires the deferred rank-1 question: the
  handoff's claim is true as written — its twelve grounds are `--surface-inset` and
  `--surface-sunken` across six themes, and rank 1 clears 4.5:1 on all twelve — while `--surface`
  is a THIRTEENTH ground this component introduces, where rank 1 reads **4.4768**. The probe
  asserts 4.4 rather than 4.5, because asserting the stated bar would fail a build that is
  exactly as drawn; what it catches is a mark landing on a darker ground, where kaldheim
  `--elevated` reads 3.6857.

  **It clears the About gate before asking for any route**, by seeding `user_prefs` and calling
  `clearAboutSheet`. Since #658 `proxy.ts` redirects a reader below `ABOUT_VERSION` to
  `/about?next=…` (or, with `ABOUT_SHEET_ENABLED` on, draws the one-time sheet over the page), and
  the About page's own specimen deck links then read as the account's decks — the first run of this file reported
  "no Analysis tab" about `/decks/about-resume-edited`, a routing problem wearing a flag
  problem's clothes. **And it reaches the surface by a PRESS**: `BuilderTabs` is client state and
  produces no address, which is how the card mark shipped broken into a view a URL sweep
  photographed.

  **It also walks the tab around the box** (Analysis tab handoff §2). Before a reading the tab
  is one empty state: a 150px ring of five 44px marks, 1 at twelve o'clock and running
  clockwise on a 50px radius, then the heading in the display face, then Analyze with the
  provenance opener beside it at 1300 and under it at 390. With a reading, the climb and the box
  share a row at 1300, 2fr to 1fr, and stack box-first at 390. The gutters are 16px and 30px,
  and the mix sits inside them under a rule. To reach the empty state it DELETES the walked
  deck's `deck_profiles` row before each width, and puts the row back as captured in a
  `finally`. With the gutters and the grid reverted it reads `0px` and `ratio 1.00`.

  **The captured row is held ON DISK**, by `scripts/lib/profile-hold.mjs`, which
  `probe:analysis-tab` and `probe:bracket-chip` share. A restore held in memory is lost when the
  run dies or its one statement fails, and the reader's saved analysis goes with it. So the row is
  written to a file before the first delete, the restore is retried, and a restore that still
  fails keeps the file. The next run of any of the three puts the ORIGINAL back before it
  captures anything.

  **It walks 2i, the stale reading** (the lifecycle rulings, 2026-09-23). It marks the pressed
  row `dirty` (exactly what an edit's `touchDeck` does) instead of editing a card, and reloads.
  The reading must come back WHOLE under the banner. At 1300 the banner is one row, above the
  grid, with a 36px button at its end. At 390 it is a column with a full-width 44px button. The
  date line reads `before your changes`, and the header's chip holds. With the banner's stale
  condition removed, both widths read `no banner`.

  **The probe account's fixture decks are WHOLE since C1**, padded to 99 (98 for a pair) with a
  single Wastes row. Analysis runs only on a whole deck (ruling 1), so every probe that presses
  Analyze on a 4-card fixture is refused, and a pre-0054 row on an illegal deck reads as
  nothing. Wastes rather than Plains: a basic's type gives it a colour identity, and Plains in a
  non-white deck is an off-identity card that the legality notice (sub-project 9) will flag.
  Wastes is colourless and moves no bracket or colour fact. A script that rebuilds these
  fixtures has to build them whole.

  **The box's mark is found INSIDE the box.** It used to be the first mark on the page, which
  since #877 is the deck header's chip on the hidden desktop copy. That read `chip at 0x0` and
  failed a correct build.

  Needs a server with `ANALYSIS_TAB_ENABLED=true`. Five mutations were run against it and all
  five fail; the counts are in its header. Besides the `deck_profiles` row above, it writes only
  that one `user_prefs` row. Point it at `local-dev`, **never production**.

- `pnpm probe:analysis-load-order` reads the Analysis tab's FIRST PAINT at 1300x900 and 390x844,
  on a deck with versions, a stored analysis and a written overview (Hugh's staging walk,
  2026-09-25). A MutationObserver installed before the tab is pressed stamps each part's first
  visible frame and its top: the verdict, the overview, Suggested changes, and before any reading
  the empty state with the credit note beside Analyze. They must all paint in ONE frame when the
  loader lets go, and nothing may paint at or above a part already on screen. It also reads the
  tab row: one line with Analysis selected, and where five tabs are wider than a phone the ROW
  scrolls rather than the page.

  The rule it proves is `holdsOpening` in `use-opening-gate.ts`: the opening waits on the stored
  reading, the overview's first read (which prices the credit notes) and, over a reading,
  Suggested changes' first read. Each had arrived on its own clock, so an overview landed above a
  bracket already drawn and a credit line popped in after the rest. Suggested changes mounts
  HIDDEN behind the loader so its read can run, and `useOpenOnce` latches per visit so a press or
  refetch never brings the loader back. Two browser mutations fail it: the gate on the peek alone
  reproduces the overview landing above the verdict at both widths, and dropping the overview wait
  delays the credit note ~700ms. Its fixture WRITES the overview through "Write one": an Analyze press writes one only when its note said it would, and the slot draws the "write one" row otherwise, which the first version of the check read as written. Measure it on a staging-shaped deck set: `pull:staging` into a
  scratch branch, and name the account with `PROBE_EMAIL` and the deck with `PROBE_DECK`. It
  writes only what the walked deck lacked (a reading, an overview: stub, free) and deletes both again in a `finally`, reading what the deck had BEFORE any press, since an Analyze press may write the overview too; the About row is left set.
  Point `PROBE_TARGET_URL` at a scratch branch or `local-dev`, **never production**.

- `pnpm probe:overview-hold` walks a FIRST Analyze that also writes the overview, at 1300x900
  and 390x844 (Hugh's ruling, 2026-09-26; the overview-loading addendum). Such a press holds the
  empty state's ring through the write, its heading stepping from `Working out your bracket…` to
  `Writing the overview…`, and lets go ONCE: the verdict, the written overview and Suggested
  changes paint in one frame, nothing moves afterwards, and the verdict and the overview are
  announced together. Past `OVERVIEW_HOLD_MS` (25s) it lets go onto the verdict with the slot's
  status line, and the overview lands later in its slot.

  **The server decides which path is walked**, by how long its stub takes: run `pnpm dev` with
  `SYNOPSIS_STUB_DELAY_MS=3000` and `PROBE_HOLD=held`, then with `SYNOPSIS_STUB_DELAY_MS=30000`
  and `PROBE_HOLD=fallback`. The delay only slows the stub, which spends nothing. The limit was
  tuned from five live writes on Hugh's pulled decks (`probe:synopsis --live`): every write made
  one model call and took 17.0 to 18.3s, so 15s would have made every first press fall back. On
  the fallback, Suggested changes lands with the overview rather than the verdict, because Next
  runs a page's server actions one at a time and its read waits behind the write; it is drawn at
  the foot and moves nothing, and the probe asserts that ordering.

  Its first run found that Suggested changes painted ~740ms after the rest, because it mounted
  only at release; the reading now mounts HIDDEN behind the loader while the overview is written.
  With the panel's hold removed it fails four checks. It writes a reading and an overview onto a
  deck that had neither and deletes both, with the overview's ledger unit, in a `finally`. Point
  it at `local-dev` or a scratch branch, **never production**.

- `pnpm probe:verdict-findings` walks the Analysis tab's findings and their receipt at
  1300x900 and 390x844 — thirty-four checks, and every one is a fact about layout or about two
  dialogs at once, which jsdom has neither of.

  **The five findings are one list restyled at `md:`**, tiles in a row on desktop and rows in a
  column on the phone, so a class that did not compile leaves identical markup and the wrong
  layout; the probe groups them by MEASURED top and left edge. **A card opened from a receipt
  STACKS** (verdict addendum, ruling 1): the receipt stays, steps down to `--surface-sunken`,
  and on the phone the card sheet starts at 96px so the receipt's header row is whole above it.
  That last clause is asserted as the header's rect against the sheet's top, and it is the one
  that found a defect: the header measured 46px against a 43px strip and was cut along its
  bottom edge by the sheet that exists to show it. **Two Escapes land in the order the sheets
  opened** — `useDialogA11y` ignores a key pressed inside another dialog, and only a real focus
  model says it did.

  **It also walks the tab's other sheets** (Analysis tab handoff §3). The receipt is 760px with
  four tiles across. On desktop a stacked card's close becomes a `← {sheet}` way back, and the
  card's name row keeps clear of it by a MEASURED reserve: with the reserve pinned back to 46px,
  the name row's ink reads 981px against a pill starting at 900. How we make these decisions opens
  as a 560px sheet. What would have to go opens from the climb's lower rung as a 700px sheet: the
  target's mark in the header, no chips, and a candidate whose way back names the sheet itself
  (`What would have to go`, one wording at both widths since 2026-10-05 — the bracket name alone
  read as a place in the climb, not a way back here).
  On the phone that header is 43px, and its 14px sentence must be WHOLE. An ellipsized title
  reads `scrollWidth` only 1px over `clientWidth`, so the width test carries no tolerance. With
  a pixel of tolerance it passed a truncated build.

  It finds its own fixture by pressing the account's decks until one draws a finding with cards
  behind it, and FAILS when none of the first twelve does, because a run over a deck with nothing
  in it reports every receipt check as passing about nothing. Two mutations fail it: the stacked
  offset removed (`top 0`) and the desktop grid removed (`5 distinct tops`). It writes only the
  `user_prefs` About row `probe:verdict-block` writes. Point it at `local-dev`, **never
  production**.

- `pnpm probe:verdict-lean` walks the lean and the reasoning modal at 1300x900 and 390x844,
  against every deck the account owns that draws a lean — both readings where it has both. The
  reasoning is the receipt's chrome with a third body, so what it proves is layout and stacking:
  two 100×140 plates side by side at 700px and stacked at 390, the plates painted with the deck's
  own art, the heading unclipped, and the qualifier drawn ONCE — in the header on desktop and
  opening the body on the phone, because the phone's 43px header cannot hold both. The contact
  sheet found that one before the probe existed, both halves truncated. A tutor opened from the
  reasoning stacks on it with the reasoning's header whole above the card sheet, and Escape lands
  back on the reasoning.

  It reads the header through `innerText`, never `textContent` or rects: the aside's wrapper is
  always mounted, and its first run read the phone's hidden qualifier as drawn and failed a build
  the screenshot showed correct. Reverting the qualifier's move fails two checks per walked deck
  at 390 — the heading clipped and the qualifier drawn twice — and the local-dev fixture walks
  two decks, so the run reads four. Its 43px check reads whether the header's mark, heading and
  qualifier END INSIDE it, not the header's height: a class pins the height, so a height check
  passes on any build. The 44px close control is excluded, since it overhangs by a pixel by design. It FAILS when
  no deck among the first twelve draws a lean; `deck-lean.json` names the two local-dev decks
  built for it. Writes only the `user_prefs` About row. Point it at `local-dev`, **never
  production**.

- `pnpm probe:commander-availability` walks the two panels on `/commanders/[slug]` that
  draw a card's claim — Role Coverage and the synergy panel — at 1300x900 and 390x844,
  because their rulings are resolved styles rather than markup: the chip's 28px against a
  name that must not wrap, each marker's resolved size and family, the dot key's 6px pip
  on the key's first line, and the synergy slot's fixed 88px.

  Its fixture is the point. The slot's marker only draws for a card that is owned with no
  free copy, and on the dev account every claim is SOFT — brews claim softly by design —
  so no row ever reached a marker, the check counted zero, printed a note and passed. It
  had measured nothing for its whole life. The probe now reads an owned synergy card's
  name OFF THE PAGE, sleeves every copy into a committed deck, and deletes that deck in a
  `finally`. By name rather than by re-deriving the commander from its slug: slug
  resolution spans three rankings, and a second copy of it in SQL drifts from the real one
  a round at a time, which is what `probe:build-from` took three rounds to stop doing. The
  deck is led by any owned legend, deliberately neither the card under test nor the page's
  own commander — the deck exists only to hold a claim, and either of those would change
  what is being measured.

  Zero markers is a FAILURE once the fixture has built the claim, and a `note` only when
  the account owns no claimable support for that commander. The run says which.

  One rule it learned the hard way, and the reason `report()` counts its own failures:
  the count used to live at each call site, so a check that forgot it printed ` FAIL ` and
  then `All checks passed.` over the top, with the exit code agreeing with the wrong half.
  A probe whose own output cannot be read is worse than no probe. Point it at `local-dev`
  or a scratch Neon branch, **never production** — and confirm the port you pass is
  serving YOUR worktree, since a mutation run against another one reports a pass.

- `pnpm probe:colour-box` measures the colour control's box on `/commanders` and `/discover` at
  1300x900 — the gap between the box's border and its outermost contents, either side. The pips
  and the `Any` / `Exactly` modifier share one wrapper whose `px-[10px]` pays both sides, and the
  modifier's group had a `pr-[6px]` of its own on top: 11px in on the left against 17px on the
  right, on both lanes. jsdom lays nothing out and the two paddings live on different elements, so
  a class-list assertion cannot see it. It walks OUT from the `radiogroup` to whatever draws the
  border rather than matching a composed class list, and it makes no writes. The control is
  reached through `onPage` and its own `aria-label` — the scope alone is not enough here,
  because a lane's rack mounts more than one `radiogroup` and "the first visible one" would
  be a coin toss between this control and the order control beside it. It evaluates THROUGH
  that locator rather than against a selector string of its own, so `onPage` keeps owning
  what "the page" means.

- `pnpm probe:pip-gap` measures the horizontal gap between every neighbouring pair of mana
  pips on `/decks/[id]`, `/decks/[id]/changes` and `/collection`, at 1300 and 390. The pips
  used to overlap by 5px each past the second — a 40px track cannot hold three 12px pips at a
  3px gap — and two black pips overlapping read as one, which on these rows is the difference
  between a two-drop and a four-drop. jsdom lays nothing out, so a unit test can assert the
  absence of a negative margin and nothing more; whether two discs cover each other is a
  question for a layout engine. `/collection` is visited as `?view=rows` on purpose: its
  desktop default is the grid, which draws no pips, and a run that took the default would
  sweep nothing clean at the width the defect was reported on. Point it at `local-dev`.

- `pnpm probe:collection-tabs` walks the collection's place head (`CollectionPlaceHead`,
  collection surfaces Call 4 and R2) on `/collection`, `/collection/sets` and
  `/collection/proxies` at 1300, 768, 390 and 360. The head is ONE component mounted on three
  pages, so the property worth proving is that pressing one of its own tabs never moves it: the
  strip's top and its first tab's TEXT edge (read through a Range, since the link carries 10px of
  padding) must be equal on all three routes at every width, at y 109 and x 34 at 1300; on the
  phone the strip is first in `<main>`, carries Replace, and `/collection`'s h1 is not drawn. It
  also reads `aria-current` and the strip's border-box height (40, 48).

  **Sets and Proxies center their content column under the head instead of anchoring it left**
  (Hugh's ruling, #1222 follow-up — reverses R2's left anchor, which started each route's h1 under
  its own tab). At 1300 and 768 the probe asserts each column's own midpoint (its h1's parent
  element, not the h1 itself, whose text only fills part of the column) sits on `<main>`'s
  midpoint. A mutation that re-anchors either route left fails this, even though every
  strip/tab-position check above it stays green — those compare the three routes to each other,
  not the content to `<main>`, so all three could drift together and still pass.

  Its first run failed on its own arithmetic, expecting the 1px rule outside the 40: the canvas
  is border-box. Makes no writes; point it at `local-dev`.

- `pnpm probe:nav-labels` walks the desktop rail by input (desktop nav labels handoff): 1300x900
  with a pointer, where it is today's 62px rail with no visible label and no native `title`, and
  the name tag (R2, T2) is walked with a real mouse: nothing at 200ms, open by 500ms, 28px at
  12.5px / 500, 8px off the rail, centred on its slot and painted over the page; it follows to the
  next slot at once, holds while the pointer rests on it, closes once the pointer leaves, waits the
  full delay again after the grace, and closes on Escape, a press and blur, while keyboard focus
  opens it at once. With the gap set to 0 and the close timer removed, three of those fail. The
  timers themselves are pinned with fake timers in `rail-tag.test.tsx`; 768x1024 and 852x393 under
  `(hover: none)`, where it is 88px and every slot is the tab bar's 72 x 52 slot with its label at
  9px on a 12px line (72 x 44 on the short screen, V1); and 390x844, where the tab bar must carry
  none of the rail's touch classes. Every rule is a media query and jsdom applies none, so the unit
  tests read classes and this reads geometry. `(hover: none)` comes from a `hasTouch` context: CDP's
  `Emulation.setEmulatedMedia` does NOT emulate `hover` (its first version read false under it and
  measured the pointer rail as touch), and `isMobile` turns 768 into a 980px layout viewport. Each
  touch context first asserts the query MATCHES, so that failure cannot recur silently, and 768
  asserts no name tag is mounted under it.
  On the short screen it reads the account control whole in the viewport and outside the nav (the
  nav is the one scroll region), and the first slot's focus ring 4px clear of the region's edges
  (audit V-E2). First run needs an account with no cards, which neither fixture account is:
  `PROBE_LOCKED_EMAIL` names a `+clerk_test` one, and adds the 80px well and an open lock note
  following the nav as it scrolls (V-E3); unset, that row FAILS as not measured rather than passing.
  `PROBE_TOUCH=1 pnpm probe:home` is the other half (audit E6): the 88px rail takes 26px from
  `main`, so Home's 1180 split is re-measured under `(hover: none)` by its existing stamp-clip
  check, at 1190 as well. A width in a contact-sheet inventory takes `"touch": true` for the
  same emulation (`docs/superpowers/inventories/desktop-nav-labels.json`). Makes no writes beyond
  signing in; point it at `local-dev`.

- `pnpm probe:catalog-stamp` proves the WRITE half of the catalog generation against a real
  Postgres: two stamps leave one row and move the value, the key the reader derives changes
  with it, and the check constraint refuses any id but the canonical one. `cacheForUser`'s
  key is unit-tested with the generation mocked, which proves the reader and nothing about
  the writer — a broken `ON CONFLICT` or a lost single-row invariant would pass the whole
  suite while every catalog refresh left readers on stale lists for the hour ceiling, which
  is the failure #705 exists to end. Unlike the other probes it cannot scope itself to a
  fixture user: the table holds exactly one row, and the run leaves the stamp set to now,
  which is what any ingest would have done. Point it at `local-dev`, **never production**.

- `pnpm probe:commander-art` proves a deck's commander is drawn from the copy the player owns,
  against a real Postgres, by calling the real `getDeckDetail` and `listDecksWithStats`.

  `cards.image_uri` and `cards.art_crop_uri` are ORACLE-LEVEL — one arbitrary printing per card
  — and the commander is the one card on the deck surfaces that never went through the
  collection reader, because it is a column on `decks` rather than a `deck_cards` row. The
  decklist beneath it had resolved every other card to the owned printing for months.

  Its five sections cover the page, the tile through its OWN query (the two loaders could
  drift at any time), the `/decks/new` picker's own loader, the `includeCommanderArt` gate — `/decks/[id]` calls the same loader
  for a deck-name list and must not pay a collection aggregation per deck — and the
  fallback: a commander the player does not own keeps the oracle
  art, unchanged. That last one is what says the fix costs nothing on a database whose
  `printings.art_crop_uri` is still null everywhere — which is every database until the next
  catalog refresh, and therefore the state it ships in.

  It writes the one sentinel this repository's probes allow into the shared catalog: an
  `art_crop_uri` on ONE printing, because a column that is null everywhere cannot tell a
  resolved crop from a fallback. The previous value is read BEFORE the write and restored in
  the same `finally` as the fixture user's rows.

  Three mutations were run against it. Reverting `getDeckDetail`'s override fails 3 of its 13
  checks and `listDecksWithStats`'s fails 2 — 5 with both reverted — while all four fallback
  checks pass in every case, which is the shape a correct probe has. Making
  `aggregateCollection` take `cards.art_crop_uri` directly fails the two crop checks — that one
  is the reason the probe reaches through the resolver rather than asserting the join. The third
  measured NOTHING and corrected a comment instead: the `?? row.artCropUri` in the loader is
  unreachable for an owned card, because the oracle-level fallback already lives in
  `resolveArtCropUri`, and the code said otherwise until the run proved it. Same fixture
  discipline as `probe:claims`: a per-run `user_id` deleted in a `finally`, pointed at
  `local-dev` or a scratch branch, **never production**.

  **What it does NOT cover, deliberately: `/commanders` and Home's hero.** Both read
  `getRankedList`, whose cold path is the EDHREC fanout — a probe fixture user has no
  stored scores, so calling it would make a network-dependent ranking run to assert a URL.
  The override is pinned instead by `src/lib/recs/ranked-list.test.ts` on BOTH paths (the
  stored one and the recompute), plus that the built-commander filter runs first so no
  printing is resolved for a row nobody draws. The rendered half is
  `commander-row.test.tsx` and `commanders-view.test.tsx`. The 2026-09-19 build was walked
  in a browser at 1300px against a seeded alternate printing and drew the owned crop; that
  reading is a one-off, not a check.

- `pnpm probe:printing-pick` presses a printing pick on `/collection` and answers two
  questions no component test can. THE ART MOVED: the patch is a client-side state write, so
  what proves it is a painted `background-image` on the tile, read after the modal is gone.
  AND NOTHING WAS REFETCHED: a `router.refresh()` here would look identical on screen while
  re-reading the largest payload in the app, so the probe reads the SIZE of the write's own
  reply rather than counting navigations.

  That size is the whole finding. A Server Action that revalidates during its own run
  re-renders the route it was called from into its response: picking a printing returned
  **1,665,949 bytes** against **122** with the revalidation deferred into `after()`. Cutting
  only `revalidatePath("/collection")` and keeping the other two measured the same 1.6 MB —
  ONE revalidation of any path re-renders the current route — so the fix is the timing and
  never the path list. `after` is also the only option that keeps `updateTag`: a route
  handler throws on it, and `revalidateTag` serves one stale read of the very list the write
  just changed.

  Navigations are deliberately NOT the measure: the modal mirrors the open card into the URL
  with `history.replaceState`, which fires `framenavigated` three times over one press and
  fetches nothing.

  It finds its own fixture by ASKING THE MODAL — the picker's trigger is drawn only for a
  card owned in more than one printing — and fails rather than passing when the account has
  none among the first 25 tiles. It picks a printing that is NOT the one on screen, since
  picking the one already shown writes a preference and moves no art, which would pass every
  check here while proving nothing.

  It WRITES an art preference for the account it signs in as and clears it in a `finally`,
  through the region's own `Use the default again`. That control is ASSERTED rather than
  attempted, and the reset is read back afterwards: the first version guarded the click with
  a `count()` and named a control that does not exist, so it left a pick on the fixture
  account and printed "restored" over it. A card that ALREADY carries a pick is refused as a
  fixture for the same reason — this cleanup clears, and clearing is not restoring. Point it
  at `local-dev`, **never production**.

- `pnpm probe:build-from` proves that `/commanders` free mode LISTS from the free pool, not
  just scores against it. The rule is decided in `rankFree` and unit-tested there; what only a
  browser can answer is whether a commander the reader can see actually leaves the list once a
  finished deck has sleeved its card, and whether the result line accounts for the row it
  removed. It checks both widths, because the rack draws inline from `CHASSIS_WIDE_MIN_PX`
  (1000px) up and inside a sheet
  below it.

  It exists because the contact sheet cannot cover this. On the dev account every claim is
  soft — brews claim softly by design — so `?a=free` photographs the same list as `All my
  cards` with no aside, and that picture reads as coverage while proving nothing. The state has
  to be BUILT, so the probe writes one deck with a committed version holding every copy the
  account owns of one commander candidate. `hard` is `sleeved` rather than full (the JSON key
  is still called `mature`, but it is `cd.sleeved`), so the deck claims without needing a
  99-row body.

  Its fixture picks TWO candidates, and the second one is the point: the deck's own commander
  leaves both lists through `notBuiltBy`, in either mode, so using the card under test to lead
  the deck would prove nothing about this feature. It picks them by ASKING THE PAGE which
  owned legends the free list holds, rather than by writing a claim predicate of its own.
  Three consecutive review rounds landed on the version that tried: it excluded `deck_cards`
  rows the application does not treat as claims, then every historical version's commander
  columns rather than only the newest. A second copy of `loadAvailability` written from memory
  drifts from it, one round at a time; the rendered list cannot, because it is the thing under
  test. It also asserts the row is
  still on `All my cards` and that the aside does NOT print there — a fix that hid the
  commander everywhere would pass a check that only looked at free mode. It searches for the
  name rather than scanning the list, because the list is windowed and a commander ranked past
  the first batch is absent from the document while being perfectly present in the list. Run
  with the membership filter reverted, 4 of its 8 checks fail. It deletes the deck in a
  `finally`; point it at `local-dev` or a scratch Neon branch, **never production**.

- `pnpm probe:commit-offer` measures the desktop deck header in the one state that collapsed
  it: a versionless deck at a full body, where `Commit as v1` and its note join the action
  column. That note is a single ~318px mono line, the column sized to its content and was
  `flex-none`, and the deficit came out of the title column, which resolved to **0px** — the
  deck's name, its commander line and its progress track each measured zero while every one
  of them sat in the DOM with its text intact, and the actions drew 283px past the band's
  right edge. jsdom lays nothing out, so every component test on this header passed over it.

  No fixture account happened to own a deck in that state, which is why no probe saw it
  either, so this one writes it: a brew with 99 `deck_cards` rows and no version, which is
  the exact gate `builder-shell.tsx` reads. The deck's name is deliberately LONG, because a
  short one leaves slack in the title column and slack is what hid this — the column has to
  be asked for more than it can have before it can be seen giving way. It asserts resolved
  widths against floors rather than asserting a class list, the defect having been a resolved
  width and not a missing rule, and it fails when the fixture draws no offer at all rather
  than quietly measuring the header every other check already covers. Its last block presses
  the rename control at 820 and reads §B14's own row; that one is an INVARIANCE rather than a
  mutation-proved case — the controls end inside the band whether or not the column is
  shrinkable there — so it earns nothing today and catches a future widening of that row. It waits for the title
  `attached` rather than `visible`: a collapsed title is zero-width, which Playwright calls
  hidden, so waiting on visibility turns the defect into a 30s timeout that abandons every
  width after the first. Run with the fix reverted, 15 of its checks fail across four widths.
  It deletes its deck in a `finally`; point it at `local-dev` or a scratch Neon branch,
  **never production**.

- `pnpm probe:pip-preload` proves the sprite ends the pop, in Chromium AND WebKit at 390x844 and
  1300x900, each on an empty HTTP cache: on `/commanders` the sprite has arrived before the first
  pip is drawn (stamped by a MutationObserver installed before the document parses), every pip
  draws from it, each pip's window PAINTS its symbol (redrawn to a canvas from its own computed size
  and position, and required to cover half its box: the fragment build covered none of it), no
  per-symbol file is fetched, and the card modal's cost reuses the sprite. It also reads the deck
  page's commander art as a `link`-initiated request, which the page's high-priority preload makes it
  (~700ms against ~1,700ms when style finds it). Every request is held 150ms by `page.route`,
  because on localhost everything lands before the first paint preloaded or not, and the phone waits
  for `networkidle` before pressing the filter sheet open, since `load` fires before hydration on a
  held connection. Three mutations fail it: the sprite preload removed, the window sized with
  `contain`, and the art preload removed. Writes only the About row, captured and restored. Point it
  at `local-dev`.

- `pnpm probe:mana-symbols` proves the two pip rulings in a real browser at 1300x900 and
  390x844: that the card modal's cost draws printed symbols at its 26/22px box, and that the
  deck's card view draws none. Both are facts about painted pixels — the unit tests can say
  which sprite cell a pip ASKS for and that a tile renders no run, and neither of those says the art
  RESOLVED. A sheet that failed to load leaves markup identical to the working build's, so the
  probe reads back the served bytes and requires a 200 with an SVG body for the sprite, and a
  window on each pip that lands on a WHOLE cell of it (a window half a cell out fails it). It reads the pips
  as the children of the run inside `[data-testid="modal-mana-cost"]`, never every span in
  that slot — the slot also holds the run's container and the sr-only cost, and a sweep of
  all three reads a 57px box and a lettered string belonging to neither pip, which is a probe
  reporting its own markup as a defect. The card-view check reads pips over art by GEOMETRY — any
  drawn round box whose centre lies inside the art's own rect — and takes its liveness from the
  count of tiles actually drawing art. Both halves were paid for. It first counted the ownership
  dots beside the pips, which went stale the moment that dot moved into the caption, and then
  reported every tile unmarked and failed a build that was correct. Its replacement keyed on the
  no-art pips' `data-testid`, which the component renders in the NO-ART branch alone — so
  `pipsOverArt` could never fire for an arted tile, and a regression drawing pips over art under
  any other wrapper would have reported a clean run. A wrapper is what the component happens to
  use today; the rect is what the rule is about.

  Its last two checks are a card printing TWO costs — `split`, `adventure` and `prepare` put two
  real castable costs on one piece of stock, and this surface and `/collection/proxies` draw both. The
  load-bearing clause is the SEPARATOR rather than the pip count: a build drawing the front half
  alone paints the right pips for the wrong card, and every other check here passes over it. A
  run with no separator therefore FAILS rather than passing quietly — the fixture is a two-cost
  card, so a missing mark means the reading lost its subject. The mark is also read for its TYPE,
  because it comes out of the same list as the pips: a pip carries art and no text, the separator
  text and no art, and a classifier that lumped them would see a separator as a pip that fell
  back to a letter.

  Its last check is the header's own geometry: **no cost squeezes the name onto a second line.**
  An INVARIANT rather than an outcome — a cost sharing the name's line means the name was not
  squeezed by it — because demanding the cost be on its own line would be a fact about one card,
  and `PROBE_SPLIT_CARD` is meant to take any two-cost card the account holds. `Fire // Ice` is
  narrow enough to sit beside its own four pips and should. Read at BOTH widths: the name block is
  in that row on a phone too, since the art header takes it only in the collapsed state, which
  wants the printing picker expanded.

  Seven mutations were run against it and all seven fail: the tile's pips restored, the symbol art
  suppressed, a typo in the slug (written for the per-file build, where it passed every DOM
  assertion while serving 404s; since the sprite a bad slug falls back to a letter, and the pip's
  window is read for a whole cell instead, which a window half a cell out fails), the front half
  drawn alone, a background put on the separator,
  `flex-wrap` dropped from the header row, and a `flex-1` put on the name block, which leaves the
  class list reading correctly while the row shrinks the name instead of wrapping. It makes no
  writes. Point it at `local-dev`.

- `pnpm probe:deck-grid` measures the decks grid at 1300x900 and 390x844 — two rulings that
  are facts about laid-out geometry, which jsdom cannot produce.

  **Tiles in a row end level.** A tile's footer draws a detail line only where there is a
  figure or a real last-played date to put in it, so one tile carries `13 to buy · $14.84`
  and the two beside it carry nothing — and the two beside it stopped short, because the
  `<li>` stretched to the grid row and the tile inside it sat at its own content height.
  Rows are grouped by MEASURED top edge rather than by index: the column count is a function
  of the viewport, and a probe that divided the list into threes would compare tiles from two
  different rows the moment the grid reflowed. A run where no row holds two tiles FAILS
  rather than passing quietly — the ruling is about tiles beside each other.

  **The last tile clears the tab bar.** The shell reserves exactly `--tabbar-h` under
  `<main>`, so a list with no bottom padding of its own ends flush against the phone's bar.
  It scrolls to the foot first, because the gap is only measurable once the list is actually
  at it.

  Its own fix taught the trap the phone check exists to catch: `h-full` on the `<li>` is a
  percentage height resolved against a container the item is sizing, and below `sm` this list
  is a flex COLUMN with no height of its own — 34 tiles took the phone's document to
  **357,576px**. Every unit test passed, and the gap check read -73.5px. Both fixes were
  reverted against it and both fail: the tile's `sm:h-full` (24.75px spread) and the list's
  bottom padding (0.5px to the bar). Makes no writes; point it at `local-dev`.

- `pnpm probe:discover-window` proves that at 1300x900 and 390x844 with the fields route HELD, so
  nothing arrives in the background while it looks: five URLs, each with its own order, colour
  and search, draw 25 rows on arrival and are not busy; `Show more` stays busy until the route is
  released, then draws its rows. Two mutations fail it: the page cutting the DEFAULT window
  whatever the URL asks for (3 checks, `?o=name` drawing 2 rows), and the fields fetch never
  sent (the released rows never draw, at both widths). Makes no writes; point it at `local-dev` or a
  scratch branch.

- `pnpm probe:collection-window` proves that at 1300x900 and 390x844 with the fields route HELD:
  six URLs, each with its own view, sort, direction, search and availability, arrive drawn (200
  cards, or what a search or a filter leaves) and not busy; `Show more` draws nothing new, stays busy, ignores a second
  press, and draws 200 more once the route is released. Two mutations fail it: the browser
  parsing its first render from the defaults rather than the URL (six checks, `?q=the` drawing 14
  cards), and the fields fetch never sent (the released cards never draw, both widths). A card is
  counted by its own button's `aria-busy="false"`. Makes no writes; point it at `local-dev` or a
  scratch branch.

- `pnpm probe:list-scroll` presses every expandable list on `/commanders/[slug]` at both
  widths and proves each one reopens at its top.

  A collapse does not discard a scroll position. The element is the same DOM node across
  every open and close, so the offset survives while the box is unscrollable and the browser
  hands it back the moment `maxHeight`/`overflowY` return — measured at **offset 1752 either
  side of a close**, with `scrollTop` reading 0 in between, which is the box being
  unscrollable rather than the offset being gone. `useDiscardedScroll`
  (`src/components/ui/scroll-reset.ts`) is the one rule; jsdom stores `scrollTop` as a plain
  number with no layout behind it, so the unit tests prove the write happens and only this
  proves the box returns.

  **EVERY visible disclosure, selected by STRUCTURE and never by its words.** The page draws
  Role Coverage's four role lists beside the synergy panel's own; they have the same rule, and
  the first version took the first match and measured one of them while naming the other. Both
  had the defect. Three clauses were each paid for by a run:

  - A closed `aria-expanded` button naming a list in the document is the selector. Matching
    `/Show all/` on the text is the PHONE's wording — the desktop role disclosure reads
    `+N more` (`coverage-chip.tsx`) — so the 1300px run pressed the synergy panel alone,
    claimed to sweep every list, and passed a revert of `RolePanelDesktop`'s hook.
  - The sweep filters on VISIBILITY: the width the probe is not running at keeps its copy of
    every disclosure in the DOM, and a hidden button spends thirty seconds failing to be
    clicked.
  - A list is collapsed by pressing its OWN toggle, never `[aria-expanded="true"]`, whose
    first match at 390 belonged to another section — the list never collapsed, the state never
    moved, and the check failed on a working build.

  A list that opens without scrolling is reported as measuring nothing rather than passing.

  **The counterpart rule is checked too, and it is the one a careless dependency breaks:** a
  list the reader is READING holds its place while the section around it re-renders.
  `sortRoleCards` returns a fresh array for every order but the default, so keying the discard
  on the array rather than on the JOINED IDS fires the effect on every render, and pressing any
  other role's disclosure yanks the open one to its top. Only reachable with the order changed
  to `Availability` — the default hands back the same array and the fault cannot appear there
  — which is why the probe presses the order control before measuring it. The joined ids are
  what the key has to be rather than the sort key, because the degraded RETRY replaces
  `roleCards` wholesale while neither `expanded` nor the sort moves, and an offset into rows
  that no longer exist can sit past the new end.

  **A run where no list scrolls fails.** One shallow role is reported as measuring nothing and
  is not a failure — a role with 12 cards has no 320px of them — but a run where every list is
  like that has proved nothing, and printing `All checks passed` over it is this probe's own
  "not a pass" rule broken by the probe.

  Its last check is the path as REPORTED: scrolled to the foot, a different facet pill
  pressed, then `Show all` on that facet. It also asserts the commander's identity is NAMED
  (`Temur`) and that no bare WUBRG run is on the page. Four mutations fail it — the hook's
  write removed (every list), `RolePanelDesktop`'s hook alone reverted (the three desktop role
  lists, and nothing else), the array dependency restored (both hold-its-place checks), and
  `colorLabel` reverted to `join("")` (`found GRW`). Makes no writes; point it at `local-dev`.

- `pnpm probe:last-slots` walks the Last 31 list at 1300x900 and 390x844 — six rulings that
  are facts about laid-out geometry or about a pointer, and jsdom has neither.

  **The desktop list is bounded; the phone's is not.** `LONG-LIST-thirty-one-rows.md` refuses
  an inner scroller on four grounds and is right about every one AT 390px, so the phone keeps
  what it drew: one scroll surface, the commit pinned in the quick-add dock's slot. But it
  costs the decision as "a player scrolls past up to 38 rows", because "the list can never be
  longer than 99 − built" — and `listLastSlotsCandidates` returns the whole ranked pool.
  Measured on the shipped index: **262 candidates for the average commander, 423 at the
  widest, and 3,264 of 3,279 commanders carry more than 100** even after the negative tail is
  cut. Desktop therefore shipped the one option that note refused by name, an unpinned commit
  at the end of the list. Run with the box removed, the probe reads the defect exactly: the
  commit's top at **18,877px on a 900px viewport**.

  **The row lights under a pointer**, which needed the fill to leave the inline `style` — an
  inline background outranks every utility, so no hover could exist at all, and a class-list
  assertion cannot see that. **The name opens the card and does not tick the row**, those
  being the same press on a control nested in the tick's label. **The type word is drawn on
  desktop and absent on the phone**, whose row is two lines by design with no room for it.

  **The card itself appears under the pointer.** The row borrows the shared
  `HoverPreviewProvider` rather than drawing its own, so one instance owns the image, the
  geometry and the two delays rather than one per row — 262 candidates for the average
  commander, 423 at the widest, and more again for a PAIR, whose two support lists merge
  (the fixture deck this probe runs against draws 480). The probe reads a PAINTED
  252x352 background image after the 240ms open delay, because the markup is identical
  whether or not the catalog had a picture for the card — and `usePreviewRow` no-ops on a null
  `imageUri` rather than drawing an empty frame.

  **The header and the rows share one content width**, which is why the column header sits
  INSIDE the scroll box, sticky, rather than above it. A classic scrollbar takes its width out
  of the scroll container's content box, so a header outside reads about 15px wider than the
  rows and every heading after the flex-auto name column sits that far right of the data it
  names — the same failure this component's own header comment records at 32px, arriving from
  the other direction. macOS draws OVERLAY scrollbars, so the width delta reads 0 either way
  on the machine the probe runs on; the check therefore asserts the structural fact — the
  header is inside the box — which is what makes the delta 0 on Windows and Linux too.

  **A slot has to be FREED before the hover can be measured, and that is the fixture rather
  than a workaround.** On open the seed fills every slot, which leaves no row able to light: a
  ticked row already carries the hovered colour (a hover rule there would be a no-op dressed
  as a state), and every unticked row is INERT at the cap, where a fill would promise a tick
  the row cannot take. The probe unticks one row first, which is what a reader does before
  choosing a different card.

  Two defects in the probe itself, each found by running a mutation against it. The trigger
  check was scoped with `onPage` and nothing more — but the DECKLIST behind the strip is
  inside `<main>` too and every one of its rows carries a `View details for …` trigger, so
  removing this list's trigger entirely still opened a dialog and still reported a pass: the
  probe was proving the decklist works. It is scoped to the row group now. And the phone's
  pinned bar was read through `commit.closest("div")`, which is an inner flex wrapper and
  static at both widths — it walks up to whatever is actually positioned instead.

  Makes no writes. Point it at `local-dev`, **never production**.

- `pnpm probe:hover-preview` walks EVERY surface that draws a card preview — the decklist,
  the top-off list and the review page (`/decks/[id]/changes`) — at 1300x900, and proves the box
  follows the pointer. The review page needs a deck with a draft: `PROBE_CHANGES_DECK` names one,
  or the probe tries the first twelve decks' review pages and FAILS when none lists a row.

  It used to be placed against the ROW it belonged to. That works while a row is about as wide
  as the box and fails completely when it is not: a top-off row spans the whole list, so
  "beside the row" could only resolve to "past its far edge" — flush right, over TYPE, COST,
  the availability, SYNERGY and DECKS, which are exactly the figures a reader hovers a row to
  compare, with several hundred pixels of empty row going unused. Following the pointer answers
  that without any surface having to describe its own columns, and cannot cover what the reader
  is pointing at.

  **Both surfaces are walked rather than one, because the rule is shared.** That is precisely
  why it is worth checking: a change to the provider reaches every consumer, and inheritance is
  the thing to verify rather than assume.

  Asserted as a RELATION to the cursor and never against a column's position — a
  column-relative assertion would be a fact about one list's widths at one viewport. **The
  pointer must stay inside a row throughout**, since leaving one closes the box, so "move to
  the window's edge" is not available and the ROW's own right edge is what the flip is measured
  at. That matters: with the pointer mid-row a box that never flips passes every other check,
  and the mutation removing the flip was invisible until the pointer went somewhere it
  mattered. The flip is asserted only where the geometry demands one — the decklist's rows are
  narrow enough not to need it and the probe says so rather than failing a working build.

  **The vertical clamp is deliberately NOT measured here.** Reaching it needs the pointer near
  the window's foot and still inside a row, and both surfaces have furniture there — the commit
  bar on one, the quick-add dock on the other — so the pointer lands on that and the box
  closes. `hover-preview.test.tsx` pins the arithmetic instead, deterministically. A fragile
  browser check over a solid unit one is the worse trade.

  **It finds a PREVIEWABLE row by hovering until one opens the box.** `imageUri` is nullable on
  both a deck row and a `SynergyCard`, and `usePreviewRow` no-ops on null by design — so a fixed
  nth row lands on a card the catalog has no picture for and reports "no preview" about a build
  that is working. Nothing in the DOM says which rows have art, so the box opening IS the test;
  it tries the first eight and fails with which of the two it could not tell apart.

  Two mutations fail it: the rows reporting no movement, and the edge flip removed. Makes no
  writes; point it at `local-dev`.

- `pnpm probe:card-prefetch` proves the card modal reads ahead on INTENT, never through the
  server-action queue, and that a press is never slower for it — at 1300x900 and 390x844 on a
  deck page, by reading the network. A pointer passing over names reads nothing and the one it
  rests on is read, and it is THAT card; a resting pointer (focus at 390, as a keyboard reader)
  reads a card ONCE, as `GET /api/card-detail`, and the press after it paints from that read; no
  prefetch is ever a server action (the check that catches a prefetch turned back into one); and
  a server action pressed while a prefetch GET is provably still reading (the probe holds card
  reads for 4s) starts at once.

  **Two reads, and each is where it is for a reason.** A prefetch reads the ROUTE because Next
  runs a page's server actions one at a time: a prefetch that was an action would sit in the same
  queue as the reader's writes, so hovering a few rows and pressing Add would wait behind reads
  nobody asked for. A press reads the ACTION because on Vercel a route handler runs in a
  different function from the page — the staging build groups `decks/[id]` and `api/health` into
  different functions — so the route's first request pays a cold start and fresh database
  connections, where the action runs in the function that just drew the page. Measured locally,
  a separate pool alone took the first press from 358ms to 881ms. A press whose card is still
  being prefetched WAITS on it for at most `PREFETCH_WAIT_MS`, then reads through the action and
  shows only the action's answer. It does not race the two: an earlier build did, and a prefetch
  painting while the press's action was still pending made the NEXT action on the page run
  ~800ms client-side, so another card opened 400ms after closing one took 815ms (315ms before) —
  and with 2.5s between presses the effect vanished. The probe holds card reads 900ms and asserts
  the press costs at most the wait over the action alone.

  **A press never starts a prefetch of its own**, neither on pointerdown nor on the focus a press
  brings (only keyboard focus, `:focus-visible`, counts as intent). A read the press starts has no
  head start on the press's own action, so it can only add the wait: measured at 390, where a tap
  is all there is, the route (~190ms) missed the 180ms wait often enough that the medians went from
  354 to 408ms for a first press and 336 to 828ms for the next card. A tap now reads through the
  action, exactly as before this feature.

  The route's payload carries `Date`s (a price fact's `asOf`), which plain JSON turns into
  strings: the first build of the route took the page down on the first press, at
  `asOf.getTime()`, with every unit test green. `card-detail-wire.ts` tags a `Date` on the wire
  and brings it back one, at any depth, and `route.test.ts` asserts the route and the action
  answer the same card.

  Its deck is the account's largest with two or more versions. It writes only the About row, captured first and put back in a `finally`.
  Point it at `next start` on `local-dev` or a scratch branch, **never production**.

- `pnpm probe:card-note` measures the card note on all three of the deck page's add surfaces —
  the Consider tile, the top-off row and the quick-add result row — at 1300x900 and 390x844.
  Seventy-one checks.

  Four of its rulings are facts about laid-out geometry and jsdom produces none of them. **The
  note is INSIDE the row's box**: drawn after the box instead, the markup is identical element
  for element while the reader sees a sentence hanging under a bordered row, and what tells them
  apart is whether the note's rect lies inside the box's. **The row reserves no height for a note
  it is not drawing** — measured as a difference between a noted host and an un-noted one, since
  most of a 480-candidate pool carries no fact and a reserved slot would be the commonest
  rendering on the surface. **The type is read RESOLVED** (12.5px on a row, 11.5px on a tile, a
  9px mono uppercase label), because a Tailwind arbitrary value that does not compile leaves the
  class string reading correctly and the text at its inherited size. And **the note starts at the
  row's own laid-out NAME**, never at a constant: the handoff's `27px` is derived from a tick this
  row does not have, so the shipped indents (49px at 390, 46px above `md`) live in the code and
  the probe asserts the property they came from — the `labelAtPx` rule from `probe:commander-row`.
  The desktop figure is also why they are measured rather than derived: its parts sum to 45 and
  the laid-out name is at 46.

  **Its Adds check caught this feature's own regression.** A tile is a grid item and stretches to
  its row, so before the note every tile's content ended level; the note is ~30px on one tile in
  six, and the six Add buttons in a row went **90 to 91px** out of line while the tiles around
  them still ended level. Rows are grouped by MEASURED top edge rather than by index — the column
  count is a function of the viewport — and a run where no row mixes a noted tile with an
  un-noted one FAILS rather than passing, because every tile carrying a note, or none, lines up
  on any build. Same rule everywhere here: a run that finds no note at all is reported as having
  measured nothing.

  **It measures §C2's MARKS too**, the slot's other half: the three glyphs at 16px, on their own
  line above the tile's name and inline after the row's, plus the key that glosses all four —
  including the lemniscate `ComboClause` had been drawing unglossed on both surfaces since
  sub-project 3. **A marked tile is only reachable with the shelves EXPANDED**: at the default
  cap every tile on the fixture deck is a tutor, which carries no glyph by Round 2's design, so
  a run taking the first screen reports the mount missing on a build that draws it. It presses
  every `Show all` first, and `Mystical Tutor` is what it finds.

  **The row's mark is measured against the name's TEXT, via a Range, and never its element.**
  Two defects came out of that one reading. Mounted once outside the tick's label, the glyph
  landed on the phone's SECOND line — 73px from the row's left against a name ending at 251px;
  it is mounted once per width now, guarded by `isDesktop`, which is the pattern the name beside
  it already uses. And the name GROWS to fill its cell, so a `flex-none` mark after it sat at
  the far right of the column beside the buy tag: **535px past the end of `Mu Yanling` at 1300
  and 87px at 390**, while the first version of this check read the element's rect and reported
  a healthy 10px for every row. A gap measured against a grown box is satisfied by construction
  for any mark placed after it. The name and its marks are one `flex-auto` group now, and the
  grow lives on the group — left on the name inside it, the fix measured as no fix.

  Eleven mutations were run against it and all eleven fail: the indent removed, the tile drawn at
  row density, the rule above the note removed, the note left un-hidden on the row, the note's
  sentences dropped from `rowLabel`, the empty-note guard removed (which draws a reserved box),
  the note moved outside the row's box, the row's marks mounted once outside the label (which
  reproduces the phone defect exactly), the key unmounted, and the tile's mark made `silent`.
  `mt-auto` reverted on the tile's Add reads the 91px spread.

  **The quick-add row is searched into existence.** It types `tutor` with `Owned only` turned
  OFF — through the hidden input with `force`, since the drawn switch intercepts a pointer —
  because a search restricted to what the account owns can return nothing the note has anything
  to say about. It is measured BEFORE the top-off list opens, because at 390 an open list takes
  the dock's slot and hides the bar. Its note is FLUSH with the row's content edge — §C gives the
  name-column indent to the top-off row alone — and the first build got that wrong by analogy
  with the host beside it. Two more mutations fail it: that indent put back (label at 53px
  against a row line at 11px), and `grow` put on the name inside its line, which puts the mark
  121px past the end of `Mystical Tutor`. Its last check hovers the FIRST row's mark and reads the
  tooltip against the results scroller, because the results are their own `overflow-y-auto` box and
  a bubble above the first row would hang over the search input — `FactTooltip` opens below when
  the room above is short. The bubble itself is portalled to the body since 2026-09-23, so no box
  clips it and it takes the page's face rather than its host's; `probe:card-mark` asserts both on
  every surface, after the /collection tile cut it off at the tile's edges in its caption's mono. The first row is reached by SEARCHING it there (`mystical tutor`), never by scrolling:
  the `tutor` list is too short to scroll, and the first version read a bubble 117px clear of the
  edge and passed a build that clips. With the flip removed it reads -2px. A first try at that second one measured nothing
  and passed, because the mutation was written as a `style` prop on an element that already had
  one — the later prop wins in JSX, so the build under test was the working one. It makes no
  writes; point it at `local-dev`.

- `pnpm probe:about` walks the About rethink at 390, 800 and 1300 with `ABOUT_SHEET_ENABLED` on:
  the one-time sheet draws on a document load, sits beside the rail from `md` and above the tab
  bar below it, survives `router.refresh()`, and closes on Later (writing nothing) and on Show me;
  opening `/about` records the visit; the what's-new index jumps, washes and focuses the entry
  20px down, and Back returns; the contents search filters the list and leaves the page's
  sections alone; a legacy `about_v` cookie does not hide the sheet, and a forged
  `x-about-sheet` header summons nothing. Five mutations fail it; the counts are in its header.

  It WRITES the account's `user_prefs` row — `about_version_seen` and `about_seen_ids` — HELD ON
  DISK before the first write and restored in a `finally`, the `profile-hold.mjs` rule. "Behind"
  clears the ids as well as lowering the version: with an entry's switch on, a stale id would
  mark that entry seen and the sheet would never draw. Point it at
  `local-dev`, **never production**.

  **`pnpm probe:about --flip` walks a real switch flip**, and it OWNS its server: a switch is read
  when the server starts, so the walk starts `next dev` itself (port `PROBE_FLIP_PORT`, default
  3297) with every switch off, restarts it with Change commander on, then with Locked cards on as
  well, then Help me choose, then swap tools (one switch, two entries), then the Analysis tab (one switch, two entries), then with all five off. Next 16 allows one `next dev` per project, so stop any dev server in the
  worktree first. It proves the cookie a browser held from before a flip does not hide the sheet,
  that the sheet names only the entry just switched on, that the visit records it by id, and that a
  later flip names only the second entry and a third only the third, while a fourth names BOTH
  of swap tools' entries in page order and a fifth both of the Analysis tab's; it also measures all seven figures at 390 and 1300. Keying the
  sheet cookie on `<user>.<version>` alone fails it at F2 and F4. It needs migration 0066
  (`about_seen_ids`), so point the worktree's `.env` at a migrated database.

  **Every probe that clears the About gate calls `clearAboutSheet`** (`scripts/lib/about-clear.mjs`)
  as well as writing `about_version_seen` (audit E5). Since entries follow their features'
  switches (Hugh, 2026-09-25) the version write covers only entries WITHOUT a switch: one tied to
  a switch is seen by its id, so a switch left on in the server a probe runs against would still
  put a card over the page. The helper is the one place a probe marks those seen — it raises the
  version floor (never lowering it) and adds every catalog id to `about_seen_ids`, all of them because a probe cannot read the server's switches,
  and does not put them back, which says no more than the version write already says. A probe
  that puts the About columns back captures them with `captureAboutSeen` before its first write
  and restores it with `restoreAboutSeen`, which writes both columns (or deletes a row that was not
  there). `probe:help-me-choose-doors` is the one exception, and a sound one: it snapshots the
  WHOLE `user_prefs` row and restores it in its own transaction, which covers both. A hand-written restore of `about_version_seen` alone left the ids this helper added on the
  fixture account, and the test fails any probe that sets the version to a stated value without the ids, as an update or an upsert. That write
  is the guarantee. The cookie it also sets is only the proxy's fast path while no switch is on:
  the proxy keys its cookie to the switched entries it draws, which a probe cannot know. It
  presses Later if a card is already up. `about-clear.test.mts` sweeps every
  probe that writes the column and fails one that does not call it, and pins the ids it reads
  out of `about.ts` against `aboutEntries`.

- `pnpm probe:about-numerals` walks every keyed figure on `/about` at 390x844 and 1300x900 and
  proves each key line's numeral is PLACED on its figure: one per line, measured onto its part,
  inside the figure's box, not on another numeral, and painted on top. `about-page.test.tsx`
  counts the numerals in jsdom, and that count cannot tell a placed numeral from one that never
  found its part, because every numeral is in the document from the first render.

  Numerals on a MOUNTED app component are placed by `AnchoredNumerals` (`about/numeral.tsx`),
  which finds each part after layout and measures against its box rather than a fixed offset.
  The offsets it replaced were right at one width and wrong at the other. Its finders prefer a
  laid-out match, because many components draw a phone and a desktop copy and hide one, and a
  hidden copy measures as a zero box at the origin: three figures read "outside" until that
  rule went in.

  **The painted-on-top check is the one a count cannot replace.** The export figure's numerals
  measured placed and inside while sitting under the dialog's own layer; with the numeral's
  `z-[60]` put back to `z-10` the check fails at both widths. It reads through the figure's
  `inert` and `pointer-events: none` for that one hit test, since both hide an element from
  `elementFromPoint`. It writes the account's About row through `clearAboutSheet`, captured and
  restored with `captureAboutSeen`. Needs a server with every About switch on. Point it at
  `local-dev`, **never production**.

- `pnpm probe:scroll-lock` presses every overlay the app draws over a scrim — the filter
  sheets on `/collection`, `/commanders`, `/discover`, `/decks` and a set page, the
  `FilterPanel` sort sheet, and the card modal — and proves the page behind each one does
  not move under 900px of wheel and comes back to the same offset when it closes. The lock
  is `document.body.style.overflow`, and whether that stops a wheel is a question about the
  viewport's overflow propagation rather than about the property, so jsdom reports every
  route as passing. A surface whose trigger is not on the page FAILS rather than being
  skipped. Point it at `local-dev`. One row is exempt from the offset half and says so: the
  sort panel returns focus to its trigger, which scrolls it back into view.

- `pnpm probe:bracket` proves the bracket verdict against a real Postgres by calling the real
  `loadDeckProfile`. Every rule the verdict applies is a pure function and every one is unit
  tested; what no unit test here can reach is the GATHER — a deck row, `deck_cards`, a flags
  read, a four-rung composition chain, a staples join and a Spellbook combo join with three
  rules in its SQL.

  Forty-five checks. The draft IS the deck, so a card staged into `deck_cards` moves the slot
  with no commit. The combo join's three §4.3b rules get one case each, and the
  most consequential is the false-NEGATIVE half: a `mustBeCommander` piece AS the commander
  must slot. A Game Changer COMMANDER counts against every limit — the commanders-are-cards
  rule end to end, on the one card that is a column rather than a row.

  **The basis chain needs SENTINELS**, and that is why this probe writes to the catalog at all:
  local-dev carries neither an `identity_composition` row, a `commander_pair_support` row, nor
  a non-null `commander_support.avg_*`, so without them the chain has exactly ONE reachable
  state and three of its four rungs are asserted by nobody. All four are covered. Order
  matters and the code says why: rung 3 is read BEFORE rung 2 is written, because with a
  commander row present the identity rung is unreachable by construction; and the PAIR rung is
  read against its own two-commander deck, because reading it from the same fixture would make
  it and rung 2 mutually unreachable and one would silently stop being asserted.

  The pair sentinel is also what makes the POPULATION assertable — `of: "pair"`, its
  declared total, and the deck count beside it, which is the pair the design exists to keep
  together: a reader shown "200 decks" who believes it is out of 1,200 has been misled.

  **Two cleanup shapes, kept distinct because confusing them loses data.** A commander's
  `avg_*` is an UPDATE to a row that exists, so it is capture-before-write and RESTORED; the
  identity row is new, so it is DELETED. Every handle is populated before the write it covers,
  and every cleanup step runs even when an earlier one throws — a cleanup that stops at the
  first failure poisons the next run of itself.

  **`comboReach` is read through the real loader**, not only through hand-built
  `CandidateFacts`. The loader classifies every card's oracle text and hands the builder a
  predicate, and a regression there makes the [3,4] lean wrong while every other check passes.
  BOTH SIDES of the relation are asserted — the piece the tutor can find and the one it cannot
  — because a reach-only check passes on a build where the predicate always returns true,
  which is exactly what "every tutor reaches every piece" looks like.

  It refuses to start over empty tables, finds every fixture BY QUERY rather than by a name
  that rots with the catalog, and FAILS rather than skipping when a fixture it needs is
  unreachable. Six mutations, all six fail; the counts are in its header. Point it at
  `local-dev` or a scratch Neon branch, **never production**.

- `pnpm probe:role-targets` proves `deriveAndWriteRoleTargets` against a real Postgres — the
  four measured role targets, per commander and per pair.

  It exists because every one of `seed-index.test.ts`'s 22 cases INJECTS this pass. That is the
  right trade for those tests — a default reaching the database would make each of them need a
  real Postgres — and it leaves the writer's whole SQL surface asserted by nobody: the support
  read, the per-commander UPDATE, the pair key split, the clearing of a row the derivation no
  longer reaches, and the refusal. The derivation itself is pure and unit tested; none of that
  is. The cost of the gap is on record in the PR that added it — a comment written with `//`
  INSIDE a SQL template shipped in `build-staples.ts` and would have failed every run of the
  derivation, past typecheck, past lint, past 7,456 tests. Running the thing is what caught it,
  and then caught the first FIX too, which quoted `//` in backticks and closed the template.

  Nineteen checks in five sections. Its refusal case turns on OWNERSHIP: a refused publish
  clears the roles on exactly the rows that run replaced — the ids it recorded as it replaced
  them — and leaves every other commander's standing. Ids rather than a `computed_at` range,
  which looks like the same rule and is weaker: a range also covers a CONCURRENT build's rows,
  so a refusal keyed on time would clear that build's freshly derived roles and leave its
  support lists without targets. The probe plants a sentinel on each side, because one on the
  owned side alone cannot tell a correct clear from a blanket one. Two of them need a state no database here carries, so the
  probe BUILDS it: a header that is not `ok` while still carrying support cards. The derivation
  reads `commander_support_cards`, and the index loop leaves a degraded header and its previous
  cards in place — so without a restriction those stale commanders count toward a floor whose
  denominator is `ok` alone, and a run reaching well under 90% of the current `ok` commanders
  passes it. Every row on staging and local-dev is `ok` and `degraded` is never written, so
  nothing would assert that rule otherwise; with the restriction reverted the run reads
  `written: 3280` against 3,279.

  It reaches the refusal by RAISING the denominator rather than
  lowering coverage: rows with `synergy_state = 'ok'` and no support cards count in `ok` and
  derive nothing, so enough of them tips the floor.

  **It stamps every commander row it inserts and sweeps its own debris on the way in**, because
  a mutation run behind it was killed part-way through and its `finally` never ran, leaving a
  fixture row that inflated the next run's `ok` count. A STAMP rather than a shape: "an ok
  commander with no support cards" is exactly what section 2 has to create, so sweeping on that
  would be a script that deletes a real row the day the catalog produces one. The pair sentinel
  carries no stamp — `commander_pair_support` has no prose column — so it is ANCHORED on a
  stamped commander id and swept by key, which is the same rule rather than an exception to it.

  Like `probe:catalog-stamp` it cannot scope itself to a fixture user: the pass operates on the
  whole table by design. So the four role columns on every commander and pair row are captured
  first and restored wholesale — restored, never re-derived, since re-running the pass would
  leave the table holding this script's output rather than what it found. Point it at
  `local-dev` or a scratch Neon branch, **never production**.

- `pnpm probe:pair-index` proves the Commander index's partner-pair sweep against a real
  Postgres, by driving the real `loadPairs` and the real `buildCommanderIndex`. **It sends no
  EDHREC traffic and makes no writes**: the pair fetch, the pair write, the role pass and the
  score clear are all injected, and the commander walk is handed no commanders. The only reads
  are the catalog and `decks`.

  The index used to fetch only pairs someone had built — one pair row on staging against 3,380
  single commanders — so Change commander's "Change pair" offered nothing. It now sweeps every
  legal pair: `canPair` over `partnerAbility`, among cards that pass `isCommanderCandidate`,
  which is 1,717 pairs as of 2026-09-25 (1,653 of them generic `Partner` × `Partner`), plus
  every pair a deck holds. Backgrounds and Doctor's companions are out, because `canPair` does
  not form them.

  The unit suites prove the rules over hand-built cards and the pass over an injected list.
  What only a database answers is the join between them: whether the loader's SQL prefilter
  hands `legalPairs` every partner card, whether that clears `LEGAL_PAIR_FLOOR` (1,500) on the
  real catalog, and whether the pass over ~1,700 real pairs skips a resumed pair and trips
  the 5% attempted-pair floor where the unit cases say. Every kind is found by reading each
  pair's own text rather than by name, so a rotated card does not rot the check.

  **One half measures nothing on local-dev, and the probe says so.** A refused sweep must
  still return the pairs decks hold; local-dev holds none, so "kept exactly the built pairs"
  is true of an empty list either way. The probe prints `n/a` there and counts nothing, and
  that half is pinned by `choosePairs` in `pair-enumerate.test.ts`, which fails when a refusal
  drops the built pairs.

  Mutations: narrowing the prefilter to `Partner with` fails the floor and the kinds check; removing
  the enumeration floor fails the refusal check. Point it at `local-dev` or a scratch branch.

- `pnpm probe:printed-in` proves that `Printed in`'s two readers are one rule, against the real
  catalog. The rule is decision 9's: a card is printed in a set when ANY of its printings is.
  Help me choose asks it in SQL through `printedIn(oracleId, codes)`, and the commander lanes
  test rows they already hold against an index, `loadCommanderPrintings`, that each page crosses
  with the rows it ships. The unit suite proves the emitted SQL and the index's shaping over
  hand-built rows. Only a database answers whether they AGREE, so the probe counts up to twenty
  sets both ways (the ten busiest and the ten newest, less any on both lists), plus a card printed in two sets matching
  either, two sets taken as the union, case, and an unknown code. Every fixture is found by query.

  The index covers the commander candidates by the ranking's own `isCommanderCandidate`, and the
  probe checks that too: a legendary type-line shortcut leaves out the cards that only SAY they
  can be your commander, and a Printed in selection then hides them whatever their printings.
  With the read narrowed back to that shortcut, three checks fail (`index 3860, catalog 3866`).
  With the predicate's correlation broken to `pi.oracle_id = pi.oracle_id` it reads every
  candidate in every set and fails three more. It makes no writes, so it can point at staging.

- `pnpm probe:printed-in-lanes` presses `Printed in ▾` on `/commanders` and `/discover` at
  390x844 and 1300x900 (filter-chassis decision 9). At 1300 it opens the rack's popover. At 390 it
  opens the filter sheet, then the set list as a SECOND layer over it (decision 23), and asserts the
  sheet goes inert under that layer and that Done closes the layer alone. It picks the enabled set
  with the most rows by ASKING THE PANEL, so the fixture follows the account rather than a set name.
  Then it asserts `?p=`, the chip, that the result line holds exactly the count the option promised,
  and that every row on screen is printed in that set. That last one is checked against the
  DATABASE (card names and flavor names), never against the index the page shipped, which would
  only prove the index agrees with itself. Removing the chip must give the rows back.

  Its last walk is the owned lane's one fix, with Printed in as one candidate beside the pips. It
  tries color sets until the lane empties with the set lit, then asserts that pressing the named
  `Drop …` returns what the sentence promised. With the owned lane's set filter taken out of the
  view, three checks fail at 390 (`194 shown, option said 39`). It writes only the account's About
  row, captured and restored. Point it at `local-dev`, **never production**.

- `pnpm probe:edhrec-snapshot` proves How it works §5.2 against a real Postgres: the live half of
  the app and the commander index read ONE EDHREC snapshot per commander. The index scores a
  commander from its own fetch, and the live readers read `edhrec_cache` under a 30-day TTL, so
  before this one commander could show figures from two snapshots a month apart. A cached page
  fetched before the index fetched that commander is now RETIRED: `readEdhrecCache` joins
  `commander_support` in its one SELECT and hands back the index's stamp (`computed_at`) beside
  each row, and `resolveEdhrecData` refetches a retired page even inside the TTL (`cacheRowRetired`).

  **The marker is per commander and already on both databases.** The index build stamps
  `computed_at` when it writes a commander, and `db:copy:index` carries the column to production
  exactly, so production needs no ledger row of its own to know when its index changed. **A retired
  row is never deleted**: it stays the stale-on-error fallback when EDHREC cannot be reached.

  It calls the real `readEdhrecCache` and `resolveEdhrecData` with `fetch` stubbed (a counter that
  serves a fixture page, or fails), over two real indexed commanders and one card the index does
  not hold: a current page served from the cache, a retired one refetched and stored past the
  stamp, the TTL alone for an unindexed commander, a retired page served when EDHREC is down, a
  copy landing (the stamp moved past a current page), and a retired page EDHREC confirms is gone,
  which answers absent rather than the older snapshot while a throttle still serves it. A cleanup
  step that fails counts as a failure, so a run that left the branch changed never passes. Five mutations fail it: the cutoff dropped,
  an unindexed commander treated as indexed just now, a retired row treated as gone, and the stamp read off the wrong
  table, and the confirmed-missing branch removed. It writes those rows' timestamps and puts back the exact text it read, in a `finally`;
  through a `Date` they would come back shifted by this machine's zone, because both columns are
  `timestamp` without one and Drizzle stores UTC. **Scratch branches only**: the database must
  report `PROBE_SNAPSHOT_BRANCH`, and staging, production and local-dev are refused by id.

- `pnpm probe:fill` proves `planFill` against a real Postgres and the real catalog — fourteen
  checks in seven sections, one per rule the fill gained when it stopped building to four
  asserted constants.

  Every rule is unit tested against a hand-built pool, and a hand-built pool is exactly what
  cannot answer these. Four checks turn on facts only the CATALOG holds — which cards are
  `modal_dfc` against `transform`, which land-backed spells exist at all — and two more on a
  skeleton assembled from five reads down a four-rung chain. A fixture stating those facts
  would be asserting the answer it was built to check.

  **It writes a composition sentinel and restores it**, for the reason `probe:bracket` writes
  its own: local-dev carries no composition columns at all, so without one the skeleton has a
  single reachable state and six of the seven sections are asserted by nobody. The sentinel's
  land count is deliberately NOT 37 — the whole of check 1 is that the measured figure replaced
  the asserted constant, and a sentinel of 37 passes on a build that never read the skeleton.

  **Three defects in the probe itself, each found by running it, and each the same shape — a
  fixture chosen by what a query matched rather than by what the code under test would say.**
  Its ramp creature came from `oracle_text ilike '%search your library for a%land%'` and drew
  `Spider-Bot`, which `classifyRoles` gives NO role, so the tie-break case measured an artifact
  beating an ineligible card. Its `limit 1` queries carried no `order by`, so the fixture
  changed between runs. And a fixture left at the pool's own inclusion sorts wherever it sorts
  — the body is 99 slots and the card was never reached, reporting "never placed" about a build
  that was working. Fixtures are picked THROUGH `classifyRoles` now, ordered, and weighted.

  **Check 6 tested nothing for its first three runs.** It passed `skeleton: null`, which
  bypasses the flat fallback rather than exercising it, so removing that fallback failed
  nothing. It nulls the sentinel's four role columns and reloads instead — the state of every
  commander on a database indexed before the role pass — and asserts the TYPE chain still
  serves beside it, since a fallback dragging both would pass a check watching only the roles.

  Seven mutations for seven sections, all seven fail: `landTarget` back to the flat 37, the
  type tie-break removed, `playableAsLand` reduced to a type-line test, `castFaceText` out of
  the fill, the residual ignoring its ranking, the flat fallback removed from the skeleton, and
  `layout` dropped where the land-capable count reads it. Point it at `local-dev` or a scratch
  Neon branch, **never production**.

  **Sections 9 to 14 are the staples step and the inclusion band** (H25, Hugh's rulings of
  2026-10-03). The fill seeds the deck's `format_staples` staples before its role pass: universal
  first, then the identity condition's rows at `avg_inclusion` 50 or more, at most 10 nonland, never a
  Game Changer, and only universal ones for a colorless, four- or five-color deck. A land staple
  goes to the land sweep, which takes it first. The tie-break may no longer hand a slot to a card
  more than 10 inclusion points below the one under the cursor, or with no figure at all: that is
  what built every ramp slot for Omnath, Locus of Creation out of zero-inclusion dual-role cards. The
  staples are read from the real table through `loadFillStaples`. Two states no database here
  carries are BUILT: no Game Changer reaches the bar today (the highest reads 30.4), so section 12
  raises one past it as a sentinel and restores it in the `finally`; and no offered staple costs
  $20, so the budget is set just under the dearer staple's own price. The three-color identity is
  derived from the `count:3` row it checks, since that bucket pools every three-color identity.
  Nine more mutations fail it: the band removed, the step removed, the condition ignored, the
  `count:3` fallback dropped, staples placed past the gate, the Game Changer exclusion removed, land
  staples placed by the step, the slot limit ignored, and the allow-list ignored. The last one
  passed until section 14 put Sol Ring IN the scoped pool: left out, it dropped for want of a
  candidate whether or not the list was read.

- `pnpm probe:view-flash` proves a cold desktop `/collection` draws its real view from the
  server: at 1300x900 on the slow profile (Slow 4G and a 4x CPU throttle, `measure:load`'s), rows
  are never laid out before the grid. The server could not see a reader's width or stored view, so
  it drew rows and the grid replaced them at hydration, on every cold desktop visit. Two cookies
  now carry those facts (`src/components/ui/view-cookie.ts`, parsed to a closed set, anything else
  absent), and a visit with neither draws both views split by CSS until hydration picks one. An
  init script stamps the first LAID-OUT frame of each view, so the CSS split's hidden rows never
  count. Three cases, each from exactly the cookies it names: `bare`, `stored`
  (`collection_view=grid`) and `hinted` (`collection_wide=1`). The selectors are the two views'
  root classes, and a case where the grid never lays out FAILS rather than passing about nothing.
  Run against main, all three fail (rows on screen 4.1s to 7.8s before the grid, under load). It
  prints each case's median hydration, read on a quiet machine, for the before/after. Makes no
  writes; point it at a server for the worktree under test.

- `pnpm probe:grid-art` proves the `/collection` grid asks only for the art it can show, at
  1300x900 and at 390x844 with `?view=grid`. The tile's art was a CSS background, which a browser
  fetches for every rendered element on screen or not, so the grid asked for all 200 windowed
  tiles' `normal` images at once. It became a native `loading="lazy"` img, which still starts on
  the HTML parse, and once the server drew the grid (`?view=grid`) ~2.4MB of art landed before
  hydration on the slow profile and held the page at ~20s. Since the list payload plan's PR 4 the
  /collection tile draws `HydratedImg` (`ui/hydrated-art`): the first `GRID_EAGER_TILES` (4)
  ask for their art in the server HTML and the rest wait until they come within 600px of the
  viewport, which they can only learn after hydration. The deck page's tiles are still native
  lazy imgs. The probe counts the Scryfall requests the page made, never an attribute, and holds
  them under half the window.
  It also reads the first tile's art as painted, `cover` and centred, under the 1px inner edge,
  which moved onto an overlay because an inset shadow on the art box would paint under its img.
  And every tile brought into view must paint. `probe:printing-pick` and `probe:card-art-corners`
  read the grid's art through the img since, scrolled in and loaded first.

  **The deck page's Card view and its Consider shelves are walked too**, and their tiles draw
  art the same way since the follow-up: a 99-card deck asked for every card's `normal` art at
  once, and an expanded shelf for every candidate's. The Card view is counted from the press,
  because the chosen view lives in localStorage and a fresh context opens on the List view, which
  asks for card images of its own; the shelves from their `Show all` presses. Only the tiles' own
  images count, since the deck page also asks for its commander's art. The limit is three
  quarters of the tiles with art rather than half: at 1300 the tiles are small enough that the
  lazy distance reaches 51 of 88. With the background build put back, all ten Card view checks
  fail (88 of 88 asked). The shelves skip the request count: a shelf's first tiles load before its
  `Show all` starts the count, so it reads 14 for the background build against the lazy build's
  20 and would pass over it; their eight img checks are what fail. Every surface's last check is
  that every tile brought into view PAINTS, read off the imgs rather than counted as requests. The deck walked is the account's first on `/decks`, or `PROBE_DECK`.
  `probe:mana-symbols` and `probe:printed-name` read a tile's art as either form. Makes no
  writes.

- `pnpm probe:payload` holds the big list payloads to budgets, over EVERY account in the database
  it is pointed at: `/discover` and the `/commanders` owned lane against 1.6MB of the data cache's
  2MB per-entry ceiling (an entry over it is silently never stored), and since the list payload
  plan's PR 2, `/collection` twice. Its CACHE ENTRY (the list `cacheForUser` stores) is held to the
  same 1.6MB. Its SHIPPED WIRE (`encodeCollection`: each deck a claim names crosses once, each image
  as its Scryfall id and stamp) is held to 1.25MB, a little over the 1.129MB (228.8KB gzipped) the
  staging-shaped account measured when it landed. The wire budget fails on the pre-trim shape
  (1.439MB with each card's full availability). Makes no writes.
