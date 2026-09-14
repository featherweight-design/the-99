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
  it 09:00 UTC every Monday; it needs the `PRICE_REFRESH_ENABLED` repository variable set to `'true'`
  to fire on schedule. The feed omits out-of-stock cards rather than listing them at zero, so a
  printing absent from `printing_prices` has never been stocked in any run so far, and a row with
  a null `price_cents` but a set `price_cents_foil` is stocked in foil only — neither is "free" or
  "unknown". The ingest upserts and never deletes, so presence is not the same as being stocked
  now: a sold-out printing keeps its last row with a frozen `as_of`, and any reader needing "stocked
  now" compares that `as_of` to the newest one in the table.
- `pnpm db:build:index` rebuilds `commander_support` / `commander_support_cards` from EDHREC.
  The `Commander index` workflow runs it monthly on the 3rd — the catalog refreshes every
  Monday, so by the 3rd a set released in the previous week has already been ingested and
  the name index can resolve it. Needs the `COMMANDER_INDEX_ENABLED` repository variable
  set to `'true'` to fire on schedule.
- `pnpm db:build:prose` writes one generated sentence per commander into `commander_support.prose`
  — sentence 1 of "Why this commander", and identical for every player, which is why no collection
  change invalidates it. Needs `ANTHROPIC_API_KEY`. The `Commander prose` workflow chains off a
  **scheduled** `Commander index` run rather than carrying its own cron, because the prompt and the
  input hash are built from the tags that job writes; dispatch it directly to target staging. A row
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

- `pnpm probe:claims` proves the deck claim model against a real Postgres by calling the real
  `loadAvailability` — a committed version holds its cards against every other deck's draft, an
  uncommitted removal still claims, and per-card `since` decides between two committed decks. The
  claim model is raw SQL no unit test in this repository can reach, so this script is the only
  proof it behaves. It writes a fixture under a per-run `user_id` and deletes it in a `finally`;
  point it at `local-dev` or a scratch Neon branch, **never production**. On a deck's own page
  `free` is a surplus, not a count of copies: 0 means "holds what it needs and no spare", and a
  negative figure is the number of copies that deck has to buy.
- `pnpm probe:folders` proves deck folders against a real Postgres by calling the real
  queries — a deck files and unfiles, a cross-user move is refused from either side, and
  deleting a folder unfiles its decks without deleting any of them. That last rule is the
  foreign key's `on delete set null`, which no unit test in this repository can reach. It
  writes a fixture under a per-run `user_id` and deletes it in a `finally`; point it at
  `local-dev` or a scratch Neon branch, **never production**.
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
- `pnpm probe:draft` proves the draft readers against a real Postgres by calling the real
  `loadDraftState` and `loadDraftRows` — a brew has no version rather than an empty change
  list, a draft identical to its version is clean, a basics-only edit names no card and still
  counts as a change, `names` covers the changed cards only, an unowned add with a live
  price is quoted and one that has never been stocked is counted out of the coverage, and
  a row's `quantity` is the delta rather than the copy count.
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
  its type-move rows not clipping their own names, the discard confirm at both doors, and the
  type of the availability marker on a diff row.

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

  It writes three decks under the account it signs in as and deletes them in a `finally`;
  point it at `local-dev` or a scratch Neon branch, **never production**.
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
- `design/` is **reference material, never shipped code**. It sits outside both `public/` and `src/`, so no route serves it and no module imports it. Each handoff's `support.js` is a generated runtime that evaluates code dynamically and loads React from a CDN — it is read by opening that bundle's `.dc.html` from disk, and by nothing else. Never import from `design/`, and never copy a handoff asset into `public/`.
