# Guards (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

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

- `pnpm check:border-collision` fails when a `.tsx`, `.ts` or `.css` file under `src` uses a bare
  `border-r` or `border-b`. The mana palette is registered as theme colors named `w`, `u`, `b`,
  `r`, `g`, and Tailwind 4 turns each into a color utility, so `border-r` and `border-b` are
  ALSO `border-color: var(--r)` / `var(--b)`, and the color rule is emitted after the width rule
  and wins: a neutral divider paints mana red or black. Measured by compiling the real stylesheet
  against every utility prefix with each of the five letters: those two are the only ones that
  collide (`border-t`/`border-l` have no color token, and `rounded-r`/`rounded-b` take no color).
  A bare one needs a SIDE-SPECIFIC color beside it (`border-r-[color:var(--border)]`); a generic
  `[border-color:...]` or `border-{token}` is emitted earlier and loses. The override must carry
  the SAME VARIANT CHAIN as the token it fixes, because variant rules are emitted after the plain
  ones: `md:border-r` repaints red from `md` up over a plain override. Static, no browser, and
  `scripts/lib/border-collision.test.mts` runs the whole check against the shipped tree inside
  `pnpm test` as well as in its own CI step. It first shipped as #1272 (44 files fixed at once);
  the second pass added the variant rule and the `.ts` and `.css` files, and found none
  outstanding: 90 bare tokens in `src`, every one overridden at its own variant.

  **A side override repairs one side only** (#1440, bug 3). The bare utility is `border-color` on
  ALL FOUR sides, so a bare token whose class string also draws another side (`md:border` beside
  `md:last:border-b`, or `border-b` beside `border-l`) is reported even with its own side
  override, unless that other side has a color of its own or a zero width takes it back. The
  repair is the width alone (`border-b-[1px]`). The first run of that rule found two carets in
  `shell/nav.tsx` painting a side in mana black.

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

- `pnpm check:db-pool` fails when the built server carries its own copy of the Neon driver's `Pool`.
  Run it after `pnpm build`; CI does. `db.transaction` (drizzle-orm/neon-serverless) checks a
  connection out of the pool only when `client instanceof Pool`, with `Pool` from ITS copy of
  `@neondatabase/serverless`. Turbopack used to bundle a second copy for `src/db/index.ts`, so the
  check was false and a "transaction" ran its `begin`, its statements and its `commit` on whatever
  pooled connection was free: connections went back to the pool inside an open repeatable-read
  snapshot, and later writes read a world that was seconds old (zero-row UPDATEs of rows committed
  300ms earlier, "deck not found", `40001`). Measured on a production build, 12 concurrent
  two-statement transactions kept one connection 2 or 3 times out of 12 before the fix and 12 of 12
  after. `serverExternalPackages: ["@neondatabase/serverless"]` in `next.config.ts` is the fix; the
  check reads the build, because nothing in source shows it. `tsx` scripts load one copy and were
  never affected.

- `pnpm check:list-cache` fails when Home or `/decks` reads a per-user table the stamp does
  not cover. It COMPUTES the tables read by following both pages' imports through `src/lib`
  (never `src/components`, which query nothing), and collects every table named by its
  Drizzle binding or by name in raw SQL. The raw half is not optional: `card_assignments`,
  `deck_locks`, `deck_proxies` and `pull_releases` are named only in the claim model's SQL,
  and a binding-only scan passes a page that goes stale on a pull. A table is per-user when
  its own columns carry `user_id`, `deck_id` or `version_id`. The triggers are read out of the
  migrations in the order they apply, a later drop retiring an earlier create, and a trigger
  that is not `DEFERRABLE INITIALLY DEFERRED` does not count. Its failure paths are pinned in
  `scripts/lib/list-cache-tables.test.mts`, which also runs the whole check against the shipped
  tree, so CI runs it inside `pnpm test`. Static, no server, no database.

  **A read a cached page makes PER REQUEST** (outside its cached payload) is listed in `PER_REQUEST_READS`
  (`scripts/lib/list-cache-tables.mjs`), each module with its reason. The page's own import of a listed module is not
  followed, because its tables are read fresh on every request and cannot go stale. The claim is checked, not
  trusted (`perRequestProblems`, read from the page's TypeScript syntax tree): the page imports it by name, and every
  use sits directly in the page's `export default function`, which holds all its `cachePageForUser` calls, each a plain awaited statement of its body (`await cachePageForUser(...)` or `const x = await cachePageForUser(...)`),
  in a statement after the last of them: order is read from the body's statements, never source positions. A use in any other function or at module scope fails without tracing whether the load calls it: the rule is
  strict so it can be exact. No loader on the cached path may import it, and a listed module that is missing,
  unimported or reasonless is reported. This
  is how a surface whose facts move nothing in the key (a friend's rename, a link's expiry, another player's seat) sits
  on Home, rather than a key element plus a trigger.

## check:public-reads

`pnpm check:public-reads` (`scripts/lib/public-reads.mjs`, test `scripts/lib/public-reads.test.mts`) holds the public loaders
(`src/lib/public/**`) to the catalog. From every entry in that directory it follows imports through `src/lib` (the walk
`check:list-cache` uses, with the per-request exemptions switched off) and fails on a table outside `ALLOWED_TABLES` (`cards`,
`printings`, `sets`, `commander_support`, `commander_support_cards`, `card_bracket_flags`), a reachable file under a forbidden
directory (social, collection, decks, account, invites, payments, switches, wishlist, profile), a request API (`next/headers`,
`cookies()`, `headers()`, `auth()`, `@clerk/*`) or an import from `src/app` / `src/components`. It is an ALLOWLIST because
`schemaTables`'s per-user test only sees tables that name `user_id`, `deck_id` or `version_id`. Adding a table is a deliberate,
reviewed diff. The same test asserts the proxy's public list does not yet name a card or commander route.

It also holds the public SURFACE (F3): the page files and every component they draw. Its entries are
`PUBLIC_SURFACE_COMPONENTS` (the shared components the pages render, listed before their own directories exist) plus every
file under `src/app/card`, `src/app/commander` and `src/components/public`. From those it follows VALUE imports through
`src/components` and `src/lib` (an `import type` carries nothing at runtime) and fails on:

- a reachable file under a forbidden directory;
- `cookies()`, `auth()`, `currentUser()` or `@clerk/*` anywhere;
- `headers()` or `next/headers` anywhere but a `page.tsx` (which hands them to `observeAnonymousHit`); a layout may not;
- a dynamic import, `require` or a side-effect import other than a stylesheet (edges the walk cannot follow);
- a `"use server"` module;
- a reach into another `src/app` file;
- a table off the allowlist, checked only in files that import the schema or write SQL (so a copy string naming "decks" is
  not a read).

This is why the WUBRG palette lives in `lib/cards/colors.ts` and `identityGradient` in `lib/cards/gradients.ts`: mana pips
used to reach `lib/decks/availability` through `lib/collection/browse`. Proved by its failure path: pointing `cost-pips.tsx`
back at `lib/collection/browse` fails the standing test.

- `scripts/lib/prompt-identity.test.mts` (in `pnpm test`) holds the privacy page's claim that no model prompt carries
  who the player is (launch epic B1). What a prompt can say is bounded by what its builder is handed, so it walks the
  TYPES of every registered builder's parameters with the type checker, through objects, arrays, maps, unions, index
  signatures, utility types (`Pick`, `Omit`, `Partial`, `Record`: declared in the TypeScript lib, but narrowing an app
  type) and functions (what they take and what they return), and fails on a property named like an identity field: a
  user, Clerk, viewer, owner, sender, friend, actor or account id, an email, a display, first, last or full name, a
  username, a public id, a friend's name snapshot. Only built-ins (`Date`, `Map` itself) and third-party types are skipped. It also fails a builder that imports Clerk, the
  auth helpers, `src/lib/social/` or the admin account readers. Coverage is a CHECKED registry: every file under `src/`
  or `scripts/` that sends a model request (`callModel(`, `new Anthropic(`, a fetch of `/v1/messages`, a
  `.messages.create`/`.stream`/`.countTokens` or `.batches.create` call, a module typed to take an `Anthropic["messages"]`
  client, the eval harness's `buildParams(`) must be listed in `CALLERS` with its builders, so a new SENDING FILE fails
  until it is. Two things it cannot see: text an already-registered caller adds to a prompt itself, outside a builder
  (each such caller carries a `note`; the eval variant tables are registered as builders for exactly this reason), and
  an email typed into a plain `string` (a player's own words go through `playerText` and are not identity fields). Audited 2026-10-18 before it was written: no prompt path carried one. Proved by its failure
  paths: an email nested in a cuts card, a display name on the tuning pack, a `viewerId` reached only through a
  `Pick`, an email in a variant's function return, a display name in a `Record` variant table, an auth import in a
  builder, and an unregistered caller each fail it. Those rejection cases are also standing fixture tests in the same
  file (a scalar `email` parameter, a dynamic `import("../auth")` and a generic `callModel<Reply>(` among them), so a
  guard that always answered clean would fail.
