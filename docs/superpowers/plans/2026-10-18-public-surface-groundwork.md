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

## Review outcome (subagent, 2026-10-18): what changed

All of it accepted. Where it contradicts the decisions above, THIS section wins.

1. **Suffix is 12 hex, resolved by a uuid RANGE.** 8 hex gives about a 10% chance that two of ~30,000 cards share a prefix; 12 hex
   is about one in a million. The lookup is `oracle_id >= '<prefix padded with 0>'::uuid and oracle_id <= '<padded with f>'::uuid`
   so the primary key serves it (a `::text like` casts the column and scans). A test asserts the emitted SQL has no `::text`.
   The probe prints the collision count at 12 hex on staging (read-only) and asserts 0.
2. **The cosmetic slugifier is new** (`src/lib/public/slug.ts`), not `commanderSlug`, which keeps only the first half of a
   split card (`Fire // Ice` becomes `fire`) and is EDHREC's address. It keeps both halves, folds `Æ`/`æ`, `ß`, `ø`
   explicitly (NFD does not decompose them), and falls back to the bare 12 hex when nothing survives.
3. **Loaders reuse what is clean**: `loadSupportMeta` (`src/lib/edhrec/support-read.ts`) and `loadBracketFlags`
   (`src/lib/bracket/flags-read.ts`) import only `db`, the schema and types; `src/lib/recs/faces.ts` splits faces. New reads:
   the signature and similar cards (`commander_support_cards` joined to `cards`, ordered `inclusion desc nulls last, oracle_id`).
   Never imported: `synergy-read.ts` (joins the collection), `collection/card-detail.ts`, `profile/load.ts`. The card-label
   read stays out of the first cut.
4. **Prose** is `commander_support.prose` when present and not `isSuppressed(oracleId)`. The signed-in page shows prose whatever the
   `synergy_state`; the public page DELIBERATELY departs: no prose for `absent` or `degraded` (the brief's "not available right
   now"). An oracle id with no `commander_support` row is `not-found` on the commander loader. A catalog has only the front
   face's text plus `back_image_uri`; "both faces" means the row, the back image and names/type lines split on ` // `. The
   result carries `canonicalSlug` so a route can redirect.
5. **The guard is an ALLOWLIST, not a per-user-column test.** `schemaTables` calls a table per-user only when its body names
   `user_id`, `deck_id` or `version_id`, and 48 tables pass as catalog that are not (`pods`, `friend_invites`, `payment_records`,
   `rule_zero_tables`, `deck_game_opponents`, `account_tombstones`...). `check:public-reads` therefore fails on any table outside
   `cards`, `printings`, `sets`, `commander_support`, `commander_support_cards` and `card_bracket_flags`. It passes `{}` as the
   per-request map (the default silently skips three social modules), forbids `src/lib/{social,collection,decks,account,invites,
   payments,switches,wishlist,profile,recs,auth*}` and `src/lib/cache/{page-cache,user-lists}`, and text-scans every reachable
   file (comments stripped) for `next/headers`, `cookies`, `auth(`, `@clerk`. Lives in `scripts/lib/public-reads.mjs` with a
   `.test.mts` that proves red on fixtures, like `social-reads`.
6. **Rate bucket (PR 2)**: the key is `anon:` plus a SHA-256 of the client network address (IPv6 on its /64) and the UTC day. That
   is a pseudonymous key, NOT an unlinkable one (the IPv4 space is small enough to reverse), so the privacy text says "a
   one-way hash of your network address, kept for up to an hour" and no HMAC secret is introduced. The address is
   `x-real-ip`, else `x-vercel-forwarded-for`, else the first hop of `x-forwarded-for`. `observeAnonymousHit` resolves switches
   with `resolveSwitchEnv(null)`, never `requestSwitchEnv` (which would look up a fake user), and swallows every failure. It
   is called from the route, never `proxy.ts`. A comment on `rateHits` says `anon:` rows live in a table the purge treats as
   per-user and are never matched by an account purge.
7. **Cached once**: the root layout is already dynamic (`resolveTheme()` reads cookies), so a page under it is not CDN-static.
   "Cached once for everyone" means the loader's data cache, keyed on the catalog stamp and the deployment. Real abuse
   limiting of cached hits belongs to Vercel's firewall; an origin counter sees misses only. The loader cache is F3's, not this
   PR's. No "about one read per page per day" promise until then.
8. **Out of scope, and kept so by a test**: `/card/*` and `/commander/*` are NOT added to `isPublic`; no `robots`, no sitemap (30,000
   URLs needs a sitemap index); no `proxy.ts` rate call; no enforcement of any bucket but `checkout`. No About entry is owed
   (backend only).
9. **Open questions answered**: 12 hex plus the staging collision check; no per-user read is reachable through the named
   helpers and the allowlist guard is the backstop.
