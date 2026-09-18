<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# The 99 — repo conventions

MTG Commander companion: upload a collection CSV, get commander recommendations, build decks from what you own. Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest.

## Commands

Package manager is **pnpm** (pinned via `packageManager` in package.json) — never npm or yarn; `pnpm-lock.yaml` is the only lockfile.

- `pnpm dev` / `pnpm build` — build needs `DATABASE_URL` to exist but runs no queries; a stub works: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
- `pnpm typecheck` · `pnpm lint` · `pnpm test`
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` (Drizzle Kit; seed pulls the Scryfall catalog)

## Workflow

- All work happens in worktrees under `.worktrees/<branch>`; copy `.env` from the repo root into a new worktree before running the app. The main checkout stays clean on `main`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build, then `git fetch origin && git rebase origin/main`.
- Database migrations apply automatically during each Vercel **production** build (`vercel-build` → `scripts/vercel-migrate.ts`). Every Vercel project therefore needs `MIGRATE_DATABASE_URL` set — non-sensitive, Production scope only, same value as that project's `DATABASE_URL` — or its production builds fail by design. Preview deployments skip migrations entirely.
- `GET /api/health` (public, unauthenticated) reports migration state — 200 when the schema matches the build or is ahead of it, 503 when migrations are pending or the ledger is unreadable. Use it to confirm a deploy instead of loading a page that depends on the schema.
- `pnpm check:scryfall` validates Scryfall's bulk-data contract (index shape + first entry's required fields) without touching a database. The `Upstream contract checks` workflow runs it daily, because the catalog refresh is weekly and an upstream shape change would otherwise go unnoticed until it failed.
- `pnpm check:manapool` validates ManaPool's price-feed contract (payload shape, a real parse, and
  the `scryfall_id` duplication ratio) without touching a database, and runs daily in that same
  workflow. `/prices/singles` is a documented endpoint of the Mana Pool Public API, but those docs
  warn v1 "is subject to change without notice" and the ingest is weekly, so a silent shape change
  would otherwise sit unnoticed for days.
- `pnpm db:seed:prices` refreshes `printing_prices` from ManaPool. The `Price refresh` workflow runs
  it 09:00 UTC every Monday against **both** `catalog-staging` and `catalog-production`; it needs
  the `PRICE_REFRESH_ENABLED` repository variable set to `'true'` to fire on schedule, and a manual
  dispatch prices only the environment it names. The fan-out is a `plan` job feeding a matrix for
  the same reason `Catalog refresh` uses one: routing on an expression on `environment` sends every
  scheduled run to production alone, which left staging's newest `as_of` 9 days behind
  production's. The feed omits out-of-stock cards rather than listing them at zero, so a
  printing absent from `printing_prices` has never been stocked in any run so far, and a row with
  a null `price_cents` but a set `price_cents_foil` is stocked in foil only — neither is "free" or
  "unknown". The ingest upserts and never deletes, so presence is not the same as being stocked
  now: a sold-out printing keeps its last row with a frozen `as_of`, and any reader needing "stocked
  now" compares that `as_of` to the newest one in the table.
- `pnpm db:build:index` rebuilds `commander_support` / `commander_support_cards` from EDHREC.
  The `Commander index` workflow runs it monthly on the 3rd against **both** `catalog-staging`
  and `catalog-production` — the catalog refreshes every Monday, so by the 3rd a set released
  in the previous week has already been ingested and the name index can resolve it. Needs the
  `COMMANDER_INDEX_ENABLED` repository variable set to `'true'` to fire on schedule, and a
  manual dispatch indexes only the environment it names. It fans out through a `plan` job and
  a matrix for the same reason `Catalog refresh` and `Price refresh` do; an expression on
  `environment` sends every scheduled run to production alone, and this was the third and last
  workflow carrying that bug. Two details differ from those two, both because this job makes
  ~3,000 rate-limited EDHREC requests rather than pulling one bulk file: the matrix is
  `max-parallel: 1` under a single workflow-wide concurrency group, so neither two legs nor two
  runs can put a second request stream on EDHREC; and on a **scheduled** run the staging leg is
  `continue-on-error`, so a staging failure cannot make the run's aggregate conclusion `failure`
  and withhold the `Commander prose` chain from production for a month. A dispatched staging run
  is not excused that way and still reports its own failure, because that is the run an operator
  dispatched to find out about.
- `pnpm db:build:prose` writes one generated sentence per commander into `commander_support.prose`
  — sentence 1 of "Why this commander", and identical for every player, which is why no collection
  change invalidates it. Needs `ANTHROPIC_API_KEY`. The `Commander prose` workflow chains off a
  **scheduled** `Commander index` run rather than carrying its own cron, because the prompt and the
  input hash are built from the tags that job writes. That chain is pinned to **production**, and
  now deliberately rather than as a consequence of the index's own default: `workflow_run` fires
  once per run and cannot tell which matrix leg it is hearing about. Staging takes its sentences
  from `pnpm db:copy:prose` instead, which costs nothing; dispatch this workflow directly only to
  GENERATE for staging. A row
  whose stored `prose_input_hash` still matches its inputs is skipped, so a re-run costs nothing for
  a commander whose tags have not moved, and an interrupted run resumes by being dispatched again.
  A commander whose every attempt fails the accept contract keeps its null and renders with no
  paragraph — the state the design draws, and never a truncated sentence nobody wrote.
- `pnpm db:copy:prose` installs sentences one database has already generated onto another,
  reading `PROSE_COPY_SOURCE_URL` and `PROSE_COPY_TARGET_URL` from the environment and taking
  `--dry-run`. A sentence costs a model call to produce and nothing to move, so a database that
  has never been generated against takes them from one that has and pays only for the rows the
  two disagree about. A row is installed only when the hash the source stored equals the hash
  the *target's* own inputs produce, so a sentence describing themes the target no longer
  records is never written; those rows keep their null and are picked up by the next
  `db:build:prose` against that target, which is the run to do afterwards. A suppressed
  commander is skipped before any of that, exactly as the generator skips it: a source
  generated before an id joined the list still holds that sentence, so the copy is the one
  path that could put a pulled sentence back.
- The catalog refresh (`.github/workflows/catalog-refresh.yml`) runs 09:00 UTC every Monday and refreshes **both** `catalog-staging` and `catalog-production`. A stale catalog is silent: collection CSV rows whose card is missing land in `unmatched` and are dropped, so a set that lands between refreshes simply appears not to exist.
- `pnpm check:copy-drift` fails when a design table still quotes a string the code stopped
  emitting. The property tables ARE the spec someone implements from and they quote copy
  exactly, so a table that has drifted tells the next reader to ship a sentence the app no
  longer says. It runs in CI beside the other checks: static, no server, no browser, about a
  second.

  It exists because the 2026-09-13 em-dash sweep spent FOUR consecutive review rounds on this,
  each round naming a different partial list. Every fix was right and every round found more,
  because a list assembled by reading has a tail. It found **13 stale quotations across seven
  tables** that three hand-built inventories had all missed, because each of those was scoped
  to one PR's diff while the drift came from another PR entirely.

  Eleven of the 13 were invisible to the check's OWN first version, which is the more useful
  lesson: it printed "no design table quotes a form the code stopped emitting" over rows that
  plainly did, and review found that, not the check. **Run a guard's failure path before
  believing its green.** `scripts/lib/copy-drift.test.mts` now pins one case per failure path,
  each written as the shape that defeated the parser; every one of them was confirmed to fail
  against the version it was written for.

  **Nothing is synthesised.** The first version put a dash back where the punctuation now is
  and searched for that; it reported 46 findings, every one false, having rewritten
  `plural(n, "card", "cards")` into `plural(n — "card", …)` and matched it through wildcards
  loose enough to absorb the difference. Instead both sides reduce to their WORDS — `${…}` and
  every swept mark dropped — and a quotation is a finding only when its words match a shipped
  string exactly while its punctuation does not.

  **It reads components, not only `src/lib/copy`.** The convention here is copy-in-definitions
  and the app does not fully obey it, so `src/components/**/*.tsx` is scanned too — including
  JSX TEXT NODES, which are not string literals and which no amount of careful literal-scanning
  would ever see. `review-screen.tsx` draws its matched-count label that way, and two tables
  quoted the pre-sweep form of it.

  **Three parsing mechanics, each paid for by a miss.** Template literals nest, so an
  interpolation is skipped as a balanced `${ }` region rather than closed on the next backtick.
  A sentence assembled across `+` is folded into one string, because that is one sentence on
  screen and a table quotes it whole. And a table's quoted spans are paired by PARITY, never by
  regex search: a search-based matcher re-pairs from the next delimiter whenever a span falls
  outside its length window, and from there it reads the GAPS BETWEEN code spans as though they
  were the quotations. That one is why the first version reported clean over real drift.

  Two exclusions are deliberate. A quotation whose only extra mark is a LEADING dash is the
  component's label-joiner, not drift: `resolution-expander.tsx` renders `— {copy.prompt}`
  where `prompt` carries no dash, and those joiners were ruled deliberate on 2026-09-13. And
  prose that makes a CLAIM about the copy without quoting it — a module header saying
  "transcribed verbatim from the handoff" — is invisible to any string matcher; four of those
  were found by grepping for the claim instead, and no check covers them.

- `pnpm check:tokens` fails when a component reads a CSS custom property that no theme
  declares. It reads every `var(--x)` in `src/**` — including the interpolated
  `var(--${a ? "b" : "c"})` form, where it resolves each string literal in the expression —
  and compares them against every `--x:` in `globals.css`, plus the tokens components declare
  for their own subtrees (`--row-bg`, `--zoom-w`) and the ones `next/font` declares as
  `variable: "--font-plex-mono"`. Static, no browser, about a second.

  An unset custom property **fails silently by design** — that is what CSS does with no
  fallback — which is the whole hazard. `browse-figure.tsx` built a card-art wash from
  `--surface-2` and `--surface-3`; the palette has never had either (they are
  `--surface-raised`, `--elevated`, `--surface-sunken`), so five card tiles rendered as VOIDS
  with a count badge floating over empty space. TypeScript does not read class strings, the
  linter does not resolve CSS variables, and jsdom computes no styles, so typecheck, lint and
  6,676 tests all passed. A screenshot is what found it, which does not scale to 35 figures.

  Its first run across all 482 source files found `--base` in `review-changes.tsx` and
  `commit-sheet.tsx`, declared by no theme: the phone's sticky action bar on
  `/decks/[id]/changes` had no background at all and content scrolled visibly under it. Three
  design-table rows still specified the dead token and were swept in the same pass — nothing
  else catches a table that spells a token the code stopped reading, because `check:copy-drift`
  compares copy strings and this one reads `src/**`.

  Tests are skipped outright rather than exempted from reads only: a token declared in a test
  fixture is not declared for the app, so a component reading one must still be reported.

  **What it is about is SILENCE**, and two rules follow from that — both of which the first
  version got wrong, and review caught. A read carrying a FALLBACK is a parameter with a
  default, not a miss: `var(--bob-duration, 3s)` is `.anim-bob` letting a caller tune it, and a
  typo inside a fallback renders visibly at the fallback rather than invisibly at nothing. And
  a token a component sets on its own element is declared for THAT FILE'S subtree only — the
  first version unioned every file's declarations, so any component could read `--row-bg` with
  the property unset in its subtree and still pass.

  `globals.css` is scanned too, and is the one asymmetry: it may resolve against any
  component's declaration, because a rule selects by class and the element carrying that class
  is drawn by a component — `art-wash.tsx` sets `--art-wash-reduced-opacity` inline and the
  stylesheet reads it back under `prefers-reduced-transparency`. The reverse does not hold.
  Its own misspellings are still reported.

  `scripts/lib/tokens.test.mts` pins one case per failure path, each written as the shape that
  defeated an earlier version — because every failure mode here is a SILENT PASS, the same
  hazard as the bug it catches.

- `pnpm check:collection-routes` fails when a route renders a figure read out of
  `collection_items` and the collection replace does not invalidate it. It walks every
  `page.tsx`, follows its imports through `src/`, and compares what it finds against
  `COLLECTION_ROUTES` in `src/lib/collection/invalidate.ts`. Static, no server, no database.

  It exists because that list was assembled by READING and was wrong three review rounds
  running, each round naming a route the previous one had missed — `/collection/replace`,
  then `/decks/[id]/import`, then `/decks/new`. The sweep found a fourth nobody had named
  (`/decks/import`), which is the whole argument for computing it: a list built by reading has
  a tail.

  It checks the `dynamic` flag as well as the path, and that half matters more than it looks.
  `revalidatePath` needs its second argument for a route with a `[param]` and **silently does
  nothing without one**, so a path that is present but flagged wrong is invalidated in the
  code review's eyes and not in Next's. All three of the check's failure paths were run
  against it before it was believed: a dropped route, a wrong `dynamic` flag, and a stale
  route that no longer reads the collection.
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

- `pnpm fetch:mana` downloads Scryfall's mana symbols into `public/mana/` and rewrites the
  manifest the renderer checks before reaching for one. The five WUBRG files the color filter
  draws came from the same place; this is that set extended to the 59 symbols a mana cost can
  contain, filtered on Scryfall's own `appears_in_mana_costs` so tap, energy and loyalty never
  land here. The manifest exists because that list GROWS: a set with a new symbol arrives in the
  weekly catalog refresh while these files move only when someone runs this, so the large pip
  falls back to a lettered disc for a symbol it has no art for rather than drawing a 26px hole.
  The script asserts per symbol that its slug equals Scryfall's own filename, which is the one
  way a rename would otherwise ship as a silent 404.

- `pnpm probe:mana-symbols` proves the two pip rulings in a real browser at 1300x900 and
  390x844: that the card modal's cost draws printed symbols at its 26/22px box, and that the
  deck's card view draws none. Both are facts about painted pixels — the unit tests can say
  which file a pip ASKS for and that a tile renders no run, and neither of those says the art
  RESOLVED. A 404 on `/mana/2R.svg` leaves markup identical to the working build's, so the
  probe reads back the served bytes and requires a 200 with an SVG body for each of that
  cost's own files. Scoped to the cost's files rather than every `/mana/` request the page
  made, because the filter control draws the five hues on `/collection` too: a sweep of all
  requests reports five healthy files over a modal whose every pip failed. It reads the pips
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
  suppressed, a typo in the slug — that one passing every DOM assertion while serving 404s, which
  is the failure it exists for — the front half drawn alone, a background put on the separator,
  `flex-wrap` dropped from the header row, and a `flex-1` put on the name block, which leaves the
  class list reading correctly while the row shrinks the name instead of wrapping. It makes no
  writes. Point it at `local-dev`.

- `pnpm probe:scroll-lock` presses every overlay the app draws over a scrim — the filter
  sheets on `/collection`, `/commanders`, `/discover`, `/decks` and a set page, the
  `FilterPanel` sort sheet, and the card modal — and proves the page behind each one does
  not move under 900px of wheel and comes back to the same offset when it closes. The lock
  is `document.body.style.overflow`, and whether that stops a wheel is a question about the
  viewport's overflow propagation rather than about the property, so jsdom reports every
  route as passing. A surface whose trigger is not on the page FAILS rather than being
  skipped. Point it at `local-dev`. One row is exempt from the offset half and says so: the
  sort panel returns focus to its trigger, which scrolls it back into view.
- `scripts/contact-sheet.mjs` photographs every surface in a feature's inventory at both widths
  and lays them out as one image, so a route that never got the feature, or a phone that is wrong
  while the desktop is right, is visible in a glance. Inventories live in
  `docs/superpowers/inventories/*.json`.

  Every step verb — `click`, `clickRole`, `fill`, and the selector `wait` — reaches page
  content through `lib/surface.mjs` (`onPage`, `onPageRole`), so an inventory never spells
  `main` itself and the scope has ONE definition. A second prefix would chain `main` inside
  `main` and match nothing. `wait` is scoped for the same reason as the rest:
  `wait: "[role=dialog]"` is in every inventory, and the shell's account sheet is also a
  `role="dialog"` sitting before `<main>`.

  A row that exists at one width only says so with `"widths": ["phone"]` or `["desktop"]`;
  the other width is skipped and reported as such rather than counted a failure. There is
  deliberately no optional click: a step that may find nothing cannot fail, and a cell that
  photographs a closed route reads as coverage. And a run that photographs NOTHING fails,
  whatever the cause — no rows, an empty `widths`, every row skipped by its own.

  `pnpm check:shared <inventory>` answers the half a picture cannot: whether routes that are
  supposed to carry the same control do it by rendering the same component. It reads the same
  inventories, and does nothing for one with no `shares` block. When a `shares` block is present
  it passes only when each row's own `view` imports the named `binding` as a value AND references
  it — the module is not enough (a view can take a constant or a type out of it and render its
  own copy), the exported name is not the local alias, a default or namespace import binds
  something else, and nothing here flags an unused local.

  **`shares.module` names a component that is used as-is, and each row's `view` names the file
  that imports and uses it.** What the check proves is a value import plus a reference — not a
  render, so `const C = Thing` satisfies it. It reads that file directly and does not follow
  composition, so the two have to agree. `FilterChassis` takes its controls as props and is assembled by a
  route-level wrapper, so naming the chassis while the rows named route views failed three routes
  for composing it correctly — and naming a leaf while the rows still name route views would fail
  them again, because the wrapper owns the import. Pick the component first, then set `view` to
  wherever each route renders it, which may be a wrapper.

- Browser scripts reach the page through `scripts/lib/surface.mjs` — `onPage()` and `openSheet()`
  — never a bare selector. The shell renders `NavRail`, `MobileHeader` and `TabBar` around
  `<main>`, and its account menu is a `button[aria-haspopup="dialog"]` at phone width, first in
  document order: an unscoped query finds the shell's control on every route and then measures it
  while naming the surface it meant to measure. That produced two findings in `probe-sets.mjs`
  that looked real and were not. `openSheet()` also waits for whatever is animating on the sheet
  to finish — page sheets arrive under `anim-sheet-in`, the shell's menu under `anim-sheet-up`,
  both 180ms — because a box measured mid-transform reads as hanging below the fold.
  `scripts/lib/surface.test.mts` parses every `probe-*.mjs` and sweeps its string literals for
  the unscoped forms, the same way `env.test.mts` enforces the env convention.

- `pnpm.overrides` in `package.json` pins seven transitive packages to their patched versions.
  They are overrides rather than dependency bumps because not one of the seven is declared here.
  Two rules learned from the round that added them: an override can force a version the PARENT
  never tested against, so it has to be exercised, not assumed — forcing `brace-expansion@5`
  broke ESLint outright (`minimatch@3.1.5` calls `expand` as a function and 5.x changed its
  export shape), and the `esbuild` pin rewires `drizzle-kit` from 0.18.20 across several
  breaking 0.x boundaries on a path CI never runs, so `pnpm db:generate` and `drizzle-kit check`
  are the proof for that one and both pass.

- Stage files by name — never `git add -A` (`.env` and other untracked files must stay untracked).
- **You are authorized to dispatch the `pr-review` §10b pre-open review subagent without asking.** Immediately before `gh pr create`, dispatch a `general-purpose` agent (never a fork — a fork inherits the conversation and reads the code as intended rather than as written) with `~/.claude/skills/pr-review/precheck-prompt.md` as its prompt, then `node ~/.claude/skills/pr-review/precheck.mjs record`. Most sessions carry a system-prompt line forbidding subagent use unless the user requested it; this line is that request, and it is the only subagent use it covers. Verify every finding before acting on it — the pass generates findings, it does not rule on them, and it never gates the PR. The grant is **permanent** — Hugh ruled on 2026-09-16, after 18 scored PRs. Read its scoreboard the way he did: `precheck.mjs report` prints a hit rate against Copilot's round-1 findings (28%) and, above it, the count of defects the pass fixed before the PR ever opened (24, every one past the author's own tests and probes). The hit rate is scored against a denominator the pass deliberately shrinks — anything it finds and fixes never reaches round 1 to be predicted — so a LOW hit rate beside a high pre-open count is the pass working, not failing. Do not propose retiring it on the percentage alone.
- PR reviews follow the `pr-review` skill (`~/.claude/skills/pr-review/SKILL.md`), which is the single source of truth across every repo — invoke it rather than working from memory or from any copy. UI features additionally run `feature-acceptance` per PR and again at feature close. This repo merges via **squash**.

## A correlated subquery in a single-table select must alias and qualify

Drizzle omits table qualification from column references interpolated into a `sql` template in
the **projection** of a select whose `from` names a **single** table. A correlated subquery
written the obvious way:

```ts
sql`select count(*) from ${deckGames} where ${deckGames.deckId} = ${decks.id}`
```

renders as `select count(*) from "deck_games" where "deck_id" = "id"`. Both bare names resolve
against `deck_games`, so it compares each row's foreign key to its own primary key — always
false, count always 0, no error. Alias the inner table and write both sides out:

```ts
sql<number>`(
  select count(*) from ${deckGames} dg
  where dg.deck_id = ${decks}.id
)::int`
```

- **The collision is what bites, not the missing prefix.** Unqualified names are harmless when
  the inner table has no column of that name, because Postgres then falls through to the outer
  query. `id` collides constantly; `built` in `getDeckReviewHeader` survived for months purely
  because `deck_cards` has no `id` column.
- **A join saves you, a `where` saves you, the projection does not.** With two tables in the
  `from`, or with the same `sql` in `.where()`, Drizzle qualifies correctly. Confirmed by
  rendering all three through `PgDialect.sqlToQuery`.
- **A `.toSQL()` test catches it; a component test never will.** Component tests receive the
  figure as a prop and stay green however the query was written. Rendering the query and asserting
  on the emitted string does catch it, needs no database, and is what `src/lib/decks/built.test.ts`
  already does for `notBuiltBy` — assert the qualified form, `"deck_games"."deck_id"`, rather than
  that the column name appears anywhere. Keep a probe for the returned figure: emitted SQL proves
  the question, a fixture whose true count is known proves the answer, and `probe:versions` asserts
  both tab-row figures for exactly that reason. When a count reads 0 and should not, print
  `.toSQL()` first.

## Caching a list a reader flips between

When a control re-fetches the same list under different parameters — a sort order, an
availability mode — cache the payloads in the component that renders them, keyed on those
parameters, and serve a repeat ask from that cache instead of navigating.
`useDiscoveryCache` in `src/components/commanders/discovery-cache.ts` is the reference
implementation; `commanders-view.tsx` shows the other valid answer, shipping every ranking
in one payload when the set of parameters is small enough to precompute.

- **Never Next's `staleTimes`.** It is a global router setting whose blast radius is every
  route in the app, and this codebase has already shipped a bug that way. Component-held
  state caches the one thing being cached and nothing else.
- **A cache lives for one visit.** Leaving the route unmounts it, so a change made elsewhere
  needs no invalidation — there is nothing left to invalidate by the time the reader returns.
  Do not extend a cache's life past its component without an invalidation story.
- **A fresh server payload always wins** over a cached entry for the same key, and is filed
  on its way past. Adjust that during render, not in an effect, or the previous list paints
  once before being corrected.
- **A cache hit still writes the URL**, via `history.replaceState` rather than the router —
  routing is the request being avoided. Serialise defaults as absences, exactly as the
  navigating path does, and read every parameter you do not own back off the live URL rather
  than rebuilding it.

## Design pipeline

- UI work is gated on design handoffs in `design/design_handoff_the99_*` — no UI until the handoff exists and has a READINESS verdict. Backend/API/DB work may proceed without one.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`. Mobile + desktop parity ships in the same PR.
- Pipeline state lives in `docs/superpowers/design-pipeline-status.md`; plans in `docs/superpowers/plans/`; gap reports in `docs/superpowers/gap-report-*.md`.
- **No FEATURE launches without an About entry, in the same round that ships it.** `/about` is the
  app's own reference, and it is only true if a feature cannot land without one. Three places carry
  it, and the third is the one that catches what the first two miss:
  - **Design** — a UI handoff is not complete without its About entry, drawn on the per-entry
    template artboard in `design/design_handoff_the99_about/` (§8 of the R3 canvas; `STATES-about-r3.md`
    §G). Title, route, `opens`, caption, the specimen component and its fixture props, up to four
    key lines, and the phone reduction.
  - **The plan** — the entry and the `ABOUT_VERSION` bump are a named task, listed beside the PR
    boundaries rather than assumed. A feature whose entry is deferred says so there, with a reason.
  - **The close-out** — `feature-acceptance` does not pass until the entry exists on the page and
    the version moved. A copy edit is not a bump; a new entry always is.

  The version is what makes this matter: a bump puts the page in front of every account once more
  with the new entries marked, so a feature with no entry reaches nobody who is not already
  exploring. The `about.test.ts` content hash does the mechanical half — touching the copy forces
  either a deliberate bump or a deliberate re-pin — but nothing can detect an entry that was never
  written, which is why it is a rule and not a check.

  The first case for it is already on record: the post-import summary merged as #639 and #643 on
  2026-09-14/15, in the middle of the About design round, and reached `main` with no entry.

  **A COSMETIC CHANGE IS NOT A FEATURE, and does not owe an entry.** The rule is about a reader
  discovering something the app can now do. Restyling a surface they already know — moving a mark,
  respacing a chip, changing where an edge is drawn — teaches them nothing they need, and an entry
  for it spends a version bump putting the page in front of every account to announce that a
  caption looks different. Where a cosmetic change is worth describing anyway it is an ORDINARY
  EDIT to the entry that already covers that surface, at whatever version comes next, not a new
  entry and not a bump of its own.

  Card captions is the case on record for this half: it moved every modifier off the card art on
  two routes and added no capability, and Hugh ruled on 2026-09-15 that it carries no entry. The
  ruling is his to make — **Design draws the entries and Hugh decides which features owe one**, and
  he may overrule a determination from either Design or this file.

- `design/` is **reference material, never shipped code**. It sits outside both `public/` and `src/`, so no route serves it and no module imports it. Each handoff's `support.js` is a generated runtime that evaluates code dynamically and loads React from a CDN — it is read by opening that bundle's `.dc.html` from disk, and by nothing else. Never import from `design/`, and never copy a handoff asset into `public/`.
