# F3 groundwork: the public loaders, their address, their guard and their rate bucket

Launch epic F3+, ruling L12. Backend only. No route, no proxy change: `src/proxy.ts`'s public list stays as it is until
the pages ship from Design's F2 handoff (brief `2026-10-17-public-card-and-commander-pages.md`, merged in #2031).

## What exists

- A card is one row in `cards` (key `oracle_id`, `name`, mana, identity, type line, oracle text, `commander_legal`, images,
  `layout`, back face); printings are in `printings`; prices (not public, decided) in `printing_prices`.
- A commander's catalog-only facts are `commander_support` (rank, deck count, themes, bracket and budget counts, engine,
  `synergy_state` `ok|absent|degraded`, the accepted `prose`) and `commander_support_cards` (its signature and similar
  cards). The signed-in page (`src/app/commanders/[slug]`) reads per-reader state around them.
- A commander's slug lives in `commander_scores.slug`, per reader (deduplicated by that reader's rank order). Cards have none.
- `rate_hits` counts hits per `(user_id, bucket, window)`; `observeHit` logs `[rate] would refuse` after the response and
  only when `RATE_LIMIT_ENABLED`. `recordHit` is keyed on a player id.
- `scripts/lib/list-cache-tables.mjs` already follows imports from entry files through `src/lib` and names every table
  they read, flagging a table PER-USER when it carries `user_id`, `deck_id` or `version_id` (`loaderFiles`, `tablesRead`).

## Decisions

1. **Address.** `<kebab-name>-<first 8 hex of the oracle id>`, for cards and commanders alike (`src/lib/public/slug.ts`,
   pure). The id suffix is what resolves; the name part is cosmetic, and a request whose name part is stale or wrong
   resolves and is answered with a redirect to the canonical form, so a rename or a typo never breaks a link. Eight hex
   characters cannot collide inside a catalog of about 30,000 cards at any rate that matters; the loader checks the suffix
   against `cards.oracle_id::text like '<hex>%'` and refuses (not-found) on an ambiguous prefix rather than guess. The
   routes (`/card/<slug>`, `/commander/<slug>`) are named when the pages ship; this PR fixes only the slug.
2. **Loaders** in `src/lib/public/`: `loadPublicCard(slug)` and `loadPublicCommander(slug)`. They import the schema, `drizzle-orm`
   and pure catalog helpers only. They return plain data and a typed `not-found` / `ambiguous` result, with no `Date.now()`,
   no cookies, no headers, no `auth()`: the same input gives the same output for every visitor, which is what lets the
   page be cached once. The commander loader maps `synergy_state` to `present | absent | degraded` for the page, and
   passes `prose` through only when the row's prose is accepted (the same filter the signed-in page uses).
3. **Guard.** `pnpm check:public-reads`, built on `loaderFiles` / `tablesRead`: from every `src/lib/public/**` entry it
   follows imports and fails if any reachable table is PER-USER, if any reachable file is under `src/lib/social/`,
   `src/lib/collection/`, `src/lib/decks/`, `src/lib/account/`, `src/lib/invites/` or `src/lib/payments/`, or if it
   reads `headers`/`cookies`/`auth`. It runs in `pnpm test` as a vitest case too (like `check:list-cache`), with unit cases
   that prove it fails (a fixture loader importing a per-user table).
4. **Anonymous rate bucket.** A new bucket `public-read` (provisional 120 / minute per visitor) and `observeAnonymousHit(headers)`
   in `src/lib/rate/`, observe-only under `RATE_LIMIT_ENABLED`, exactly like today's buckets. The key is
   `anon:` + the first 16 hex of `sha256(ip + utc-day)`: no raw address is stored, and the daily salt means a row cannot
   link one visitor across days. The `anon:` prefix cannot collide with a Clerk id, so `purgeAccount` never matches one,
   and `RETAIN_MS` already bounds the table. The IP is the first hop of `x-forwarded-for` Vercel sets; absent, the
   bucket is the literal `anon:unknown` (it can only over-count, and it is observe-only). The privacy page's facts
   inventory (B1) must state it. Enforcement is a later ruling after the logs say what honest traffic looks like.
5. **Split.** PR 1: slug + loaders + guard (no rate code, no route). PR 2: the anonymous rate bucket (touches `rules.ts`,
   `observe.ts`, the privacy facts note). Each is under the size line, and neither adds anything to the proxy's public list.
6. **Nothing is wired.** No caller exists until the pages ship; both PRs say so in the body ("ships dead by design,
   proven by tests and the guard"), per the no-caller memo.

## Proof

- Slug: round-trips; unicode and punctuation names (`Æther Vial`, `Fire // Ice`, `Jötun Grunt`); an empty-after-strip name falls
  back to the id; the suffix alone resolves; a wrong name part redirects; an ambiguous prefix refuses.
- Loaders: the SQL they emit names only catalog tables (rendered `toSQL()`, asserting the qualified form per the repo rule);
  a double-faced card carries both faces; a commander with `absent` and `degraded` states returns the right state and no
  prose for either; unknown slug is `not-found`.
- Guard: green on the tree, red on a fixture that imports a per-user table or a forbidden directory.
- A read-only probe against staging (`pnpm probe:public-loaders`, no writes) loads 20 known cards and 20 commanders and
  prints the shape and elapsed time, so the "about one read per page per day" claim has a measurement.

## Open questions for the review

- Is the 8-hex suffix enough, or should the suffix be the full uuid's first 12? (Cost: a longer URL.)
- Does anything reachable from the loaders read per-user data through a shared helper (the card-label read, the bracket
  classifier) that the guard would catch but the plan has not named?
