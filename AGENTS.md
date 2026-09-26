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

- **Read the part of a file you need, not the whole file.** For anything over a
  few hundred lines, reach for `sed -n 'X,Yp'`, `grep -n` or `rg`, or pass
  `offset`/`limit` to the Read tool. Delegate whole-file reading and broad
  searches to a subagent, whose context is separate and discarded.

  This overrides the general preference for dedicated file tools over shell
  commands, on cost grounds, and only for large files. Measured over 14 recent
  transcripts in this repository (42,650 messages): tool traffic is 93% of all
  context, and within it **206 `Read` calls carried 30.3 MB of characters against
  9.8 MB from 14,147 `Bash` calls** — 147k characters per Read on average, 648k
  at worst, which is most of a context window in one call. The top 1% of tool
  results carry 75% of all result bytes.

  It matters because context is re-read on every turn: a large file read once is
  paid again on every later turn of that session. About 90% of token spend is
  cache reads, and per-turn context size — not session length — is what predicts
  cost. An 11,558-message session holding ~109k context ran $0.25 per message; a
  2,570-message session holding ~581k ran $0.98.


- **MEASURE AGAINST `staging`, NOT `local-dev`.** Ruled 2026-09-20. `local-dev` is a probe
  playground — its accounts are built by fixtures that never commit, never buy and never finish a
  deck, so any FREQUENCY read off it is an artefact of the fixtures rather than a fact about the
  app. `staging` carries the real collection and the decks that actually get played, and it is the
  bar a new change is held to: a threshold, a distribution, a payload delta, a "how often would a
  reader see this" — all of them are counted there.

  This has already cost measurable work twice. The deck-status marks were designed against a
  `local-dev` split of 34 of 34 uncommitted decks, where production is 4 of 8, and shipped a phase
  cascade aimed at a state that barely exists. The commander row's gap line reads 5.4% on the
  seeded fixture account and 67.2% on the reference account **in the same database** — an edge
  case on one and the default on the other.

  Read-only measurement against `staging` is free and needs no permission. **What does NOT change
  is where a probe WRITES**: a script that creates fixtures still points at `local-dev` or a
  scratch branch, and `probe:arrivals` — whose `replaceCollection` DELETES every collection row
  for the user it is given — must never be pointed anywhere else. Measure on staging, mutate on
  local-dev.

- All work happens in worktrees under `.worktrees/<branch>`; copy `.env` from the repo root into a new worktree before running the app. The main checkout stays clean on `main`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build, then `git fetch origin && git rebase origin/main`.
- Database migrations apply automatically during each Vercel **production** build (`vercel-build` → `scripts/vercel-migrate.ts`). Every Vercel project therefore needs `MIGRATE_DATABASE_URL` set — **Production scope, and Production alone** — with the same value as that project's `DATABASE_URL`, or its production builds fail by design. Preview deployments skip migrations entirely.

  **The SCOPE is the half that bites, and the sensitivity is not.** A copy scoped to Preview is
  inert, because previews skip migrations; production then finds nothing and refuses to build.
  That is `decideMigration`'s fail-closed branch working — shipping code without its schema is
  what #70 cost — but the message it prints names the variable rather than the scope, so the
  failure reads as "never set" when the truth is "set somewhere it is never read".

  Marking it **Sensitive is correct and is what ships** on both projects, and that is a
  MEASUREMENT rather than a preference: the variable is Sensitive today and production builds
  read it — the 14:54Z and 20:46Z builds on 2026-09-21 logged `migrations applied successfully`,
  and this script fails the build outright when the value is absent, so a build that migrated had
  it. Sensitive additionally keeps the value out of the dashboard, the same treatment
  `DATABASE_URL`, `CLERK_SECRET_KEY` and `CRON_SECRET` carry. The deploy spec's §Credential
  handling was written on the opposite premise — that a build step cannot read a Sensitive
  variable — and carries a note saying so; which of the two was true in July is not established,
  only what is true now.
  This line previously said "non-sensitive", which was wrong, and reading it is a plausible
  route to "re-scope this variable": on 2026-09-21 it moved to Preview on both projects and
  every production deploy failed for five hours, across seven deployments and five merged PRs.
  Nothing was down — the running build kept serving — but nothing new shipped either.
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
- **`job=printings` alone is the sharp tool, and its blast radius is every set.** The ingest
  refuses to publish denominators from a run that skipped orphans, and skipping the oracle
  refresh is what produces orphans — so the two together used to blank `base_set_size` for
  the whole database and leave every set reading `not indexed yet` until a clean run, behind
  a green job. Since #704 the publish clears and fills in one transaction, so a refused run
  leaves the previous denominators standing and EXITS NON-ZERO instead. Dispatch `job=all`
  unless you have a reason not to; the run takes about a minute either way.
- **A `reversible_card` printing is ingested from its FACES**, since 2026-09-21. Scryfall gives
  that layout no top-level `oracle_id`, no `image_uris` and no `flavor_name` — all three sit on
  the faces — so the obvious read produces an FK orphan, and the ingest used to drop the whole
  layout. What that cost is a printing a player OWNS and the catalog denies: the art then
  resolves to the set's representative printing, which is a different collector number with a
  different picture, silently. All 82 that exist carry the SAME oracle id on both faces (one
  card printed on both sides, not two cards sharing stock), which is what makes face 0 an
  answer rather than a guess; the skip is kept for faces that disagree, which is a different
  thing and exists nowhere today. `skippedReversible` in the ingest report is therefore a
  narrow counter now, not a constant ~82.

- **Each ingest stamps `catalog_refreshes`, and every cached list payload is keyed on it**
  (#705). That is how a refresh retires readers' caches: `revalidateUserLists` takes a user
  id and a weekly job has no list of readers, so the generation goes in the key instead and
  a stale entry is never asked for rather than hunted down. The stamp is deliberately
  NON-FATAL — this workflow runs the seed scripts directly and never runs `db:migrate`, so
  a database without the table costs one refresh's staleness and a warning, not a red job
  after a successful ingest.
- The catalog refresh (`.github/workflows/catalog-refresh.yml`) runs 09:00 UTC every Monday and refreshes **both** `catalog-staging` and `catalog-production`. A stale catalog is silent: collection CSV rows whose card is missing land in `unmatched` and are dropped, so a set that lands between refreshes simply appears not to exist.
- `pnpm check:copy-drift` fails when a design table still quotes a string the code stopped
  emitting, in PUNCTUATION or in WORDS. Two checks, and they are built for different drift.

  **Punctuation** was the original: `MARKS` is `[—:,.]`, and a quotation differing from the code
  in one of those and in nothing else is reported. That is what the em-dash sweep needed.

  **Words** was added 2026-09-19, after the `brew` → `draft` rename left sixteen stale quotations
  across four tables and the check printed `No design table quotes a form the code stopped
  emitting` over every one. A rename leaves the punctuation alone, so the first check cannot see
  it by construction. Review found them by reading, three rounds running.

  The word check compares PROSE only — a class string, a CSS declaration and a filename are not
  copy, and indexing them compared Tailwind against Tailwind — and it looks for the SHAPE OF A
  RENAME: the same words in the same places with one or two swapped. Not set overlap, which
  rewards a table for quoting extra context and flags every label-joiner. Eight words minimum:
  below that `upload your collection` and `in your collection` are one substitution apart and
  unrelated.

  **An EXACT match is checked across every candidate before any near match is taken**, and that
  rule is worth more than it looks. Without it a table quoting a shipped string VERBATIM is
  reported the moment a sibling ships one word apart — which three refusals do
  (`We couldn’t add/clear/fill those. The deck is unchanged.`), so two tables quoting `add`
  correctly were reported as stale copies of `clear`.

  **Allowlisting that pair looked like a fix and was the opposite.** It suppressed the symptom
  and blinded the check to that sentence permanently: a later rename of the string those tables
  really quote would never be reported. Fixing the matcher instead cleared three of the four
  rows AND surfaced real drift the fourth had been hiding — `synergy-discovery.md` still quoted
  `lastSlots.fillFailed`, a key deleted when two refusal strings collapsed into one. **Reach for
  the matcher before the allowlist; an entry that hides a bug hides whatever else that bug hid.**

  **A false positive is allowlisted in `scripts/lib/copy-drift-allowlist.mjs`, with its reason,
  and that is a deliberate act that shows up in a diff.** An exemption granted silently is how
  the next rename hides. A row there says "these two look alike to a machine and are unrelated",
  never "this drift is fine". One used to name `deck-tuning.md` as a table for a feature not yet
  built; it came out when #10 shipped, and the first run without it caught real drift in that
  table (`Nothing has changed.` against the shipped `The deck is unchanged.`).

  **Its own failure paths are pinned** in `copy-drift.test.mts`, and they were run before it was
  believed: the first version reported green over a reverted rename, because `prose` tested the
  raw span and rejected every sentence containing `${…}` or a semicolon. That is the same failure
  as the guard it extends, in the guard that was extending it. The property tables ARE the spec someone implements from and they quote copy
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
- `pnpm pull:staging` copies a player's real decks and collection from **staging** into a local
  database, so a browser probe measures the decks that actually get played rather than a fixture
  built by a script that never buys, never commits and never finishes one. It is the answer to
  the gap that let the card mark ship drawing nothing in the deck's card view: every signed-in
  surface is verified against whatever the fixture account happens to own, and no agent can sign
  in as Hugh.

  **Only the Clerk identity changes.** Every surface reads by `user_id`, so re-owning the rows to
  a local account leaves the data — the long deck names, the contested copies, the decks with
  three Game Changers and the decks with none — exactly as it is on staging.

  ```
  PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=br-… pnpm pull:staging [--dry-run] [--replace]
  ```

  **ONE WAY, AND IT FAILS CLOSED.** Source and target are separate variables
  (`THE_99_NEON_STAGING_DIRECT`, `PULL_TARGET_URL`), the target is never defaulted, and the
  caller must NAME the target with `PULL_TARGET_BRANCH` — checked against the branch the target
  actually reports, before anything is deleted. "Not the source" is not the same as "safe to
  delete from": a pasted or mistyped URL naming some other database passes a difference check
  and destroys what it finds. Naming it means a typo no longer matches and the run stops.

  The same-database guard compares `neon.branch_id`, not the URLs and not
  `system_identifier` — local-dev is a BRANCH of staging's project, so the cluster identifier is
  byte-identical on both and would wave the run through.

  **Whose decks:** named with `PULL_FROM_USER_ID`, or inferred only when the source holds decks
  for exactly one account. "The account with the most decks" is a silent choice on a shared
  database with ties broken by the planner. A named account that owns nothing is refused before
  any target write, because every read would come back empty and the run would delete the
  target's snapshot and report success.

  **REPLACING IS OPT-IN.** A run whose target account already holds decks REFUSES; `--replace`
  is how a caller says they meant it, and the common case — a fresh fixture account — has no
  destructive path at all. That is a scope decision rather than a guard: three review rounds ran
  on this file and every finding was about the delete, so the delete stopped being the default.

  **With `--replace` it REPLACES rather than merges** — a merge leaves decks from an older snapshot standing
  beside the new ones and quietly makes the fixture a thing that never existed on staging. Takes
  `--dry-run`, which prints the counts and writes nothing. It is a SNAPSHOT: re-run it before a
  measurement that matters.

  **Both ends are transactional.** The source reads are one `repeatable read` transaction, or
  they combine instants — a commit landing between the deck read and the version read produces a
  deck list that never existed. The target's delete and every insert are one transaction too, or
  a failing insert leaves the old snapshot deleted and a PREFIX of the new one behind. There is
  no `on conflict do nothing`: a conflict means the target already holds that id, probably under
  another user, and skipping the parent would attach these children to a stranger's deck.

  Inserts are batched 500 rows to a statement, because the first version issued one per row over
  ~6,400 rows and did not finish inside two minutes — the cost here is round trips to a
  serverless Postgres, not work.

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
  the deck it is asked about, and `SYNOPSIS_STUB` switches it to `partial`, `refused`, `malformed`,
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
  empty state's ring through the write, its heading stepping from `Reading your deck…` to
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
  target's mark in the header, no chips, and a candidate whose way back names the target bracket.
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
  well, then Help me choose, then swap tools (one switch, two entries), then with all four off. Next 16 allows one `next dev` per project, so stop any dev server in the
  worktree first. It proves the cookie a browser held from before a flip does not hide the sheet,
  that the sheet names only the entry just switched on, that the visit records it by id, and that a
  later flip names only the second entry and a third only the third, while a fourth names BOTH
  of swap tools' entries in page order; it also measures all five figures at 390 and 1300. Keying the
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
- `pnpm db:seed:combos` ingests Commander Spellbook into `spellbook_variants`,
  `spellbook_variant_cards` and `card_bracket_flags`. **The sweep runs BEFORE the bulk file**,
  and that order is the whole design: `/estimate-bracket` answers per batch of 600 cards at 80
  requests a minute and returns Scryfall oracle ids directly, so it resolves without a name
  index at all — the plan's whole name-resolution step turned out to be unnecessary and was
  dropped. The bulk file is a SINGLE 656MB JSON document, so it is parsed incrementally rather
  than read into memory; the parser throws on truncation rather than silently ingesting a
  prefix, which is the failure a streaming parse otherwise makes invisible.

  **The publish is two transactions, flags then bulk**, and it refuses rather than publishing a
  partial ingest. Per-source collapse FLOORS are checked first — `mldFromSweep` 30,
  `mldFromRule` 20, `extraTurnFromSweep` 23, `extraTurnFromRule` 26, `sweepResolutionShare`
  0.5, `variantsKept` 53,000 — every one measured on the first real run rather than guessed —
  and `tutorFromRule` 209, half the 419 counted on staging's catalog when the column was added.
  A run under any floor leaves the previous tables standing and exits non-zero, because a
  half-ingested combo index is indistinguishable from a complete one to every reader. The
  classifier floors are `classifierCollapse`, a pure function with one test per floor, rather
  than checks inline in the ingest where nothing asserted them.

  **It also stores the TUTOR** (since 2026-09-22): `isTutor` over the same oracle text, sourced to
  `oracle_rule` alone, because `/collection` selects no oracle text and the mark has to read a
  column. A column added by migration is false on every row until the next run writes it, so the
  tutor mark is dark after a deploy until this job runs — dispatch it rather than wait for Monday.

  `card_bracket_flags` carries per-flag SOURCES (`spellbook_sweep`, `oracle_rule`) with a check
  constraint tying the boolean to a non-empty source array, so a row can never say "true, and
  nobody claims it". An ABSENT id means no flag applies and nothing more — a card the
  sweep resolved and cleared is byte-identical to one it never returned, and no reader may
  describe it as if it could tell them apart.

- `pnpm check:spellbook` validates Spellbook's contract without a database — the index shape,
  a real parse, and the `card_count` versus deduped-`uses` relationship. It runs daily in
  `Upstream contract checks` for the same reason the Scryfall and ManaPool checks do: the
  ingest is weekly, so a silent shape change would sit unnoticed for days.

  One tension is deliberate and worth knowing: it asserts against the LIVE feed rather than a
  fixture, so it can fail for an upstream change that is correct and expected. That is the
  point — a fixture-only check passes forever over a feed that has moved.

- `pnpm build:combo-features` regenerates `produces-kinds.generated.ts`, the vocabulary
  `isInfiniteOrGameEnding` and `producesInfiniteTurns` read. Developer-run rather than
  scheduled, and **the diff IS the review**: the file is a list of upstream's own feature
  strings bucketed by what they mean, and a new bucket assignment is a judgement someone has
  to make rather than a refresh someone can rubber-stamp.

  CARD COUNT IS NEVER THE TEST. A two-card variant producing "infinite squirrels" is a
  two-card variant; what decides whether the bracket system counts it is what it PRODUCES.
  `probe:bracket` proves that against the real index, and the mutation dropping the check
  measured nothing until the probe grew a fixture holding a mundane pair — 703 of 3,842
  sampled two-card variants produce something that is not counted.

- The `Combo refresh` workflow runs `db:seed:combos` 13:00 UTC every Monday against **both**
  `catalog-staging` and `catalog-production`, through a `plan` job feeding a matrix for the
  same reason `Catalog refresh`, `Price refresh` and `Commander index` do — an expression on
  `environment` sends every scheduled run to production alone. It needs the
  `COMBO_REFRESH_ENABLED` repository variable set to `'true'` to fire on schedule, and a manual
  dispatch ingests only the environment it names. 13:00 rather than 09:00 so it lands AFTER the
  catalog refresh that morning: the ingest resolves against `cards`, and a variant naming a
  card the catalog does not yet hold is dropped as unresolvable.

- `pnpm db:build:staples` derives `format_staples` and `identity_composition` from the
  commander index. It runs as a STEP in each `Commander index` matrix leg rather than as a
  `workflow_run` chain, because the floors are derived from the index that leg just wrote and
  `workflow_run` fires once per run with no way to tell which leg it is hearing about — the
  same constraint that pins `Commander prose` to production.

  **It prints its whole derivation, and that is the point rather than a courtesy**: the bucket
  distribution, where the cut falls in it, the weighted-versus-unweighted delta, both sides of
  every condition's boundary, and the per-condition sizes. Sub-project 2 builds against these
  numbers, so the output is what anyone disputing them argues with. `measure-gap-line.mts` is
  the precedent: a threshold nobody can see the working for is an asserted constant with extra
  steps.

  Three rules it learned in review, each the same shape — **a derivation reproducing a ratified
  figure has to reproduce its NULL POLICY too, and a null policy is invisible until the data
  has nulls in it.** `coalesce(deck_count, 1)` and not 0. A row with no inclusion figure
  carries no weight, via a FILTER on the sum and never a `where`, because the ratified floors
  query filters inclusion nowhere and a `where` narrows the breadth denominator with it. Both
  were inert on local-dev — 0 of 859,794 `commander_support_cards` rows have a null inclusion —
  so a re-run reproducing the ratified numbers proved only that the change was inert.

  The count fallback (`count:N`) exists because without it the basis chain's fourth rung is
  dead: the 100-commander bar admits exactly 15 exact identities, and **544 commanders —
  colourless plus every three-plus identity — would look up a key no row carries**. It is
  restricted to the commanders an exact bucket cannot serve, because the chain takes the first
  hit and a wider bucket would drag its own averages with commanders that never read it.

  Neither table is cleared by an empty derivation. `format_staples` refuses and exits non-zero;
  `identity_composition` needs its own branch rather than the same refusal, because an empty
  composition is a LEGITIMATE state until the first widened index run and a hard refusal would
  fail every run until then and take the floors down with it.

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

- `pnpm measure:load` times the pages and the card-details press in a real browser at 1300x900
  and 390x844. It is the before/after tool every performance PR puts in its body (the performance
  lane, from `plans/2026-09-27-performance-research.md`). Per route (Home, `/decks`, a deck,
  `/collection`, `/commanders`, `/discover`) it reads cold, warm and client-navigation loads:
  TTFB, the first frame `<main>` holds content rather than the route's `LoadingScreen`, when the
  server finished streaming, and the first card image. It also reads the card-details press on the
  deck page, to the dialog and to its art. The median of `MEASURE_RUNS` runs (default 3), printed
  as a Markdown table.

  **Point it at `next start`, never `next dev`**, whose compile times swamp every figure. The
  server runs on a scratch Neon branch holding a `pull:staging` copy, and the worktree's `.env`
  `DATABASE_URL` must name that branch: `env.mjs` loads `.env` over the shell, so a
  `DATABASE_URL` on the command line reaches the server but not the harness. The harness signs in as
  `E2E_AUDIT_USER_EMAIL` and marks the About entries seen, and refuses production and staging for
  that write, by `neon.branch_id`. Two optional readings:

  - `MEASURE_SERVER_LOG`: the stdout of a server started with `PERF_TIMING=1`. The `[perf]` lines
    `src/lib/perf/timing.ts` logs after each request are attached to the route they timed, so a
    before/after says WHICH read moved. Off, `perfRoute` hands every request one frozen no-op
    tracker, and the test pins that. The line carries route patterns, labels and milliseconds, and
    never an id or a name.
  - `MEASURE_DB_URL` with `MEASURE_DB_BRANCH`: database execution time per warm load, from
    `pg_stat_statements`, reset before each load. The reset is a write, and the figure means
    nothing on a database others are using, so it runs only when the URL reports the named branch,
    and never on production or staging.

  **Two traps it was built around.** Playwright turns the HTTP cache OFF for a context carrying a
  route, and Clerk's testing token is one. So the harness signs in once, carries the session into
  contexts with no route, and only then is "warm" warm. The first version read 0 cached scripts on
  every warm load. And React's `cache` is not request-scoped inside a server action: the first
  timing module keyed its spans on it, and the card-details action logged its total with none of
  its spans. So `perfRoute` returns an explicit tracker instead.

- `pnpm measure:tutors` prints what `classifyTutor` does to the live catalog — the 22-card
  fixture with a reason per card, the corpus splits, reach against a real combo piece, and the
  first 60 parses for reading. Read-only.

  It exists because a classifier built from a named fixture agrees with that fixture and says
  nothing about the 960 cards nobody listed. Four of its five design decisions contradict what
  the plan assumed, and every one came out of reading the sweep: the hate cards need no
  negation rule (zero of the 960 contain "can't search"); the opponent check is SENTENCE-scoped
  because 65 of the 79 cards mentioning an opponent do so in a different sentence; a graveyard
  destination assembles nothing on its own; and two mana-value phrasings were read inverted
  until they were counted.

  It also splits `alternatives` from `conjunctions` — 81 tutors against 61 on the shipped
  catalog — because collapsing the two is the false positive the classifier was fixed for: a
  tutor for `a legendary creature card` reached any legendary LAND until the and/or structure
  was preserved, and the reach count against one real combo piece fell from 239 to 194.

  Its `unreachable` counter is a structural INVARIANT rather than a live guard, and the
  script says so: `kinds` is either `"any"` or a non-empty list, so an empty one is
  unconstructible and a non-zero figure means `targetWords` started returning an empty array.
  The regression it cannot see is the likelier one — a word DROPPED rather than kept gives
  `words === null` and lands in the `any` bucket, silently widening every such tutor. Watch
  `any` against 129 for that.

- **The bracket system's classifiers are all PARTIAL, and every surface says so.** Mass land
  denial is 22 of 24 on a curated set with both misses named; extra turns have no misses among
  the 56 cards whose text mentions one; combos come from Spellbook's index excluding
  template-gated variants. Those strings live beside the classifiers they describe
  (`oracle-rules.ts`, `combo-features.ts`) and are re-exported by `bracket/rules.ts`, so a
  verdict consumer imports one module while each definition stays where it can be re-measured.

  **The B2/B3 chain-or-loop flag does not exist and is not coming from a reading.** WotC's text
  above bracket 1 is about CHAINING extra turns, which is not a property of a decklist — so the
  count is reported with no verdict attached, and the only thing that violates bracket 3 is a
  measured LOOP: an assembled combo Spellbook records as producing infinite turns. The
  self-recurring single card is NOT detected, and the detection copy says so rather than
  letting the absence read as a clean deck.

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
- **A MULTI-ROUND FEATURE LINE BATCHES ITS ABOUT ENTRIES AT THE END OF THE LAUNCH.** Ruled
  2026-09-21. A line like deck analysis ships five rounds, each a piece of one capability — and
  an `ABOUT_VERSION` bump puts a one-time sheet in front of every account. For a returning account
  it names the new entries and offers the page; a brand-new account's sheet introduces the page in
  one line instead. Until the About rethink ships
  (`docs/superpowers/design-briefs/2026-09-25-about-rethink.md`, Hugh 2026-09-25), a bump still
  redirects every account to `/about` instead. Either way, bumping once per round spends that
  attention five times to announce fragments, and the early
  entries describe a surface the reader cannot use yet. One bump at the end describes the thing
  as it works.

  This moves WHEN, never whether. The entries are still owed, Design still draws them on the
  per-entry artboard, and the LINE's close-out does not pass without them. A readiness audit on
  round N of such a line should not report a missing entry as a finding — it should confirm the
  line's plan names the batched task, or the requirement quietly evaporates.

  **Everything below applies unchanged to a feature that ships in one round.**

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

  The version is what makes this matter: a bump shows every account a one-time sheet over whatever
  page they opened, naming the new entries for a returning account (a brand-new account's sheet
  introduces the page in one line). Until the About rethink ships, a bump redirects to
  `/about` instead. Either way, a feature with no entry reaches nobody who is not already
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

- `scripts/measure-gap-line.mts` measures the commander row's gap line against a real
  database — read-only, no fixture, no locks. It exists because the line's `allPlayed`
  state turned out to be the DEFAULT rather than an edge case, and that is invisible from
  the code: the frequency is a property of the reader's played set, so it reads 5.4% on the
  seeded fixture account and 67.2% on the reference account in the same database. A
  measurement taken against the wrong account is how a state the reader sees two rows out of
  three gets designed as an exception.

  It prints the occupant distribution per lane, the distribution in each sort's first screen,
  the depth of the themes the row would name, and Option E's whole curve — the table the
  design table's rejection of "narrow the played set to each commander's top N tags" is
  sourced from. `MEASURE_USER_ID` picks the account; the default is the busiest, and it lists
  every account it saw rather than picking one silently.

  Two defects in it, both found by the pre-open pass rather than by running it, and both the
  same shape — **a script that restates a rule instead of calling it**. Its `Something new`
  order was a RATIO (unplayed / eligible) where the shipped `byNovelty` ranks on the absolute
  `unplayedCount`, so a commander with 2 eligible tags and 1 unplayed sorted above one with 30
  eligible and 12 unplayed, the reverse of the app; the header meanwhile called that order
  "ascending" while sorting descending, and claimed the script "orders by the same figures the
  lanes do rather than by a proxy" in the same breath. It now imports `byNovelty` and calls it.
  And it said "built decks" throughout: `loadPlayedTags` joins no `deck_versions`, so a BREW
  counts — deliberately — and `novelty.ts` records that this exact wording was corrected there
  once already. Every figure it prints includes brews.
