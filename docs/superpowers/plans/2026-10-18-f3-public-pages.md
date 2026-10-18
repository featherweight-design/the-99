# Plan: F3, the public card page and the public commander page

2026-10-18 · lane the-99-02 · approver d9 (as Hugh's proxy) · launch epic F3 (`2026-10-17-launch-epic.md:84`).

Builds Design's R1 handoff (`design/design_handoff_the99_public_pages/`, #2068, audited GREEN in its `READINESS-audit.md`)
on 9f's merged groundwork: the loaders and the address (#2046, `src/lib/public/`), and the anonymous counter (#2051,
`src/lib/rate/anon.ts`). The brief is `docs/superpowers/design-briefs/2026-10-17-public-card-and-commander-pages.md`. Its
seven Locked items hold throughout and are not restated here except where the build turns on one.

## The constraint that shapes the plan

**Every route in the app renders dynamically today, and a public page has to give the same response to every visitor.**
There are three reasons:

- The root layout reads the theme cookie (`resolveTheme()`, `src/lib/theme/server.ts`).
- The root layout wraps everything in `Shell`, and `Shell` calls `auth()` and branches on it (`src/components/shell/shell.tsx:52-55`).
- No `Cache-Control` is set anywhere, and Next overwrites `Cache-Control` on dynamic pages.

So under today's layout, a signed-in member who opened `/card/x` would get the signed-in shell, rendered in their own
theme. If that response were CDN-cached, the next stranger would be served it. **Locked 5 (cached at the CDN) cannot
be met by adding a header.** The render must first be made independent of the visitor. There are three ways to do it:

| | How | Cost | Risk |
|---|---|---|---|
| A. Own root layout | Move every route into `src/app/(app)/`; `src/app/(public)/layout.tsx` has its own `<html>`, fonts, `DEFAULT_THEME`, no `ClerkProvider`, no `Shell`, no cookies, and mounts `FanContentNotice` itself. | A rename across the whole app (about 420 files mention `src/app` paths: tests, probes, inventories, guards). `global-not-found.js` (experimental) for unmatched URLs. A full page reload between the two groups. | Lowest once built: no session can reach the render. |
| B. Proxy-decided public render | `src/proxy.ts` is the one place that knows the path. On the public page paths it strips any incoming `x-the99-public`, sets it, and sets `Vercel-CDN-Cache-Control: s-maxage=86400, stale-while-revalidate=…` on the response. The root layout renders `DEFAULT_THEME` when the header is present, and `Shell` takes the bare branch. | Small: one header read in the layout and in `Shell`. The rest is the pages. | The header is the invariant. It is held by a test on the proxy, plus a probe that fetches each page signed in and signed out and requires byte-equal HTML. Vercel never caches a response carrying `Set-Cookie`, so a Clerk refresh on a member's request fails safe (uncached). |
| C. No CDN; data cache only | The pages stay dynamic. Each loader is wrapped in `unstable_cache`, keyed on the catalog generation and `DEPLOYMENT_ID`. | Smallest. The database still sees about one read per page per catalog refresh, which is the brief's stated purpose. | No CDN caching, so Locked 5 is not met as worded. Each visit costs a function run. |

**Decided 2026-10-18 (d9 for Hugh): C for the first cut; B is a named follow-up.**

- The catalog loaders measure about 99ms a load on staging, and traffic is invite-scale.
- B's failure mode is a member's signed-in render served to a stranger from the CDN. That is a privacy leak a header bug
  could cause silently, while C cannot leak by construction.
- A member who opens a public page keeps their normal shell around it.
- The anonymous rate bucket (#2051) covers abuse.

**This departs from Locked 5's "cached at the CDN", by d9's decision, recorded here.** Each loader is wrapped in
`unstable_cache`, keyed on the catalog generation and `DEPLOYMENT_ID`, which meets the brief's stated purpose: about one
database read per page per catalog refresh.

**The page CONTENT never reads the visitor.** No `auth()`, cookie or switch is read in the page, and nothing in the page
branches on a session. That keeps B open: only the layout and `Shell` would need to change.

### Follow-up B (when traffic justifies it)

The proxy-decided public render from the table above. Its gates, all required before any CDN header ships:

1. A Vercel preview shows `x-vercel-cache: HIT` on a second signed-out fetch.
2. A signed-in fetch is a MISS and is never served from the CDN.
3. A probe finds signed-in and signed-out HTML of the same page byte-equal, after confirming `ClerkProvider` embeds no
   per-request state.
4. A test on `src/proxy.ts` proves the incoming header is always stripped and set only on the public paths.

A stays the fallback if B's invariant cannot be held.

Facts a B build starts from (plan review, 2026-10-18):

- `ClerkProvider` (7.5.20) embeds request state only with `dynamic`, and the root layout does not pass it. A test fails
  if `dynamic` is ever added.
- Next overwrites `Cache-Control` on a dynamic page. Only a differently named header such as `Vercel-CDN-Cache-Control`
  can carry a CDN TTL.
- The CDN key ignores cookies, so the measurement cold-fetches signed in and then requires a signed-out HIT that is
  byte-equal to a signed-out origin render. It names the Clerk instance the preview runs.
- A short `s-maxage` with a long `stale-while-revalidate`, so a degraded page or a 404 is not held for a day.
- Every exit from a public page is a plain `<a>`: the root layout does not re-render on a soft navigation.
- B's plumbing ships as its own PR, measured before any UI depends on it.

## Settled with 9f (2026-10-18)

- **The loader contract is final.** Results are `ok` (with `canonicalSlug`), `not-found` or `ambiguous`. The route redirects
  (308) when the requested slug differs from `canonicalSlug`. `ambiguous` renders as not-found. The commander read never
  passes `accessMode`.
- **`check:public-reads` is the guard.** A new table, or a new file under `src/lib/public/**`, is a reviewed diff to
  `scripts/lib/public-reads.mjs`. Nothing under `src/lib/public` calls `headers()`, `cookies()` or `auth()`.
- **The counter.** `observeAnonymousHit(await headers())` is called from each page, which is dynamic at origin either way.
  It counts origin hits only, and a CDN hit never reaches it; that is accepted. When it is wired, B1's privacy page needs
  the paragraph `docs/agents/ops.md` prescribes, so 9f or lane 58 is told in the same round.
- **The footer.** A1 (9f, building now) mounts `FanContentNotice` in both branches of `Shell`, so under B a public page gets
  it as the bare branch's child, with no mount of its own. Under A, `(public)/layout.tsx` renders
  `<FanContentNotice align="center" />`. **No public page ships before A1 merges.**
- **Collisions.** The public routes join B1's `/privacy` and `/terms` on the `isPublic` line, and whichever lands second
  rebases. `pending-routes.ts` gets `card` and `commander` entries. A public page makes no Clerk Backend call
  (`src/lib/clerk-backend-calls.test.ts`).

## Plan review, folded in (2026-10-18)

- **The About gate must not catch the public paths.** `gateApplies` (`src/lib/about/gate.ts:87`) returns true for
  `/card/x`, so a member who has not seen About would be redirected to `/about` or handed the About cookie. It returns
  false for `/card/` and `/commander/`, with a test, in PR 2.
- **A degraded read is never cached.** The loader cache stores only `ok`/`absent` commanders and found cards. A
  `degraded` result is served and not stored, the same rule as the signed-in list cache. Wrap the loaders in
  `React.cache` too, so `generateMetadata` and the page share one read. The key reuses `catalogGeneration()` (already
  cached for 60s). `unstable_cache` is Next 16's legacy API, but the repo's standing one, so it stays.
- **A plumbing switch, `PUBLIC_PAGES_ENABLED`** (registered in `src/lib/switches/registry.ts`, app-wide only, so the page
  never varies by visitor). `isPublic` admits the two prefixes only while it is on. Off, the route answers 404 rather
  than sending a stranger to sign-in.
- **The card-side fragments** from C4 (bracket facts, and not Commander-legal on Mana Crypt) belong to PR 2. PR 3 takes
  the commander figure fragments.
- **The sitemap reads the catalog at request time.** It is `dynamic` (or revalidated) and never prerendered, because the
  build runs on a stub `DATABASE_URL`. `robots.ts` leaves `/` and `/_next/` allowed.
- **The service worker** registers in production for any visitor. A stranger keeps it: it caches only `/_next/static/`,
  and its offline page is public.
- **Size.** PR 2 is split if it passes ~20 files or ~800 lines: 2a is the page with its sections, and 2b is metadata,
  not-found, the probe and inventory rows. The boundary is fixed here, not mid-build.

## Addresses

`/card/<slug>` and `/commander/<slug>` (singular). Neither collides with an existing route: `src/app/cards/` holds only
actions, and the signed-in commander page is `/commanders/[slug]`, with per-reader slugs. Slugs are `slug.ts`'s
`<kebab-name>-<12 hex>`. A signed-in member is never routed to either page by the app (Locked 3).

## PRs (one at a time, no stacking)

1. **Shared pieces, no route.**
   - Extract `FlipControl`, `CardFaces` and `OracleText` from `card-modal.tsx` into `src/components/cards/`. Card details
     imports the extracted versions unchanged, so the flip cannot drift between the two surfaces (`check:shared`).
   - Move `identityGradient` and the WUBRG colors out of `lib/collection` / `lib/decks` imports into a catalog-neutral
     module. Today `ManaCost` reaches `lib/decks/availability`, which a public-surface guard must be able to forbid.
   - Extend the guard: `check:public-reads` also follows the two page files and every component they import, and fails on
     a per-user directory, a request API outside the page file itself, and `@clerk/` outside the proxy. The failure path is
     run before trusting a green.
   - Owes no About entry and no Design. No behavior changes.
2. **The card page** (A1 to A4, C1, C2, C3), after A1 merges.
   - `src/app/card/[slug]/page.tsx`: the 308, `ambiguous` and not-found handling, and `observeAnonymousHit`.
   - `generateMetadata` with title, description and Open Graph (C2's table). The image is the card's Scryfall art, with
     no `opengraph-image` generation in the first cut.
   - The top bar with the Scryfall hand-off, and the signed-out block (`About The 99`, `Sign in` to Clerk's hosted page).
   - The facts row, the printings chips (8 behind `Show all N` at 390; `first 40` and `More on Scryfall ↗` at the cap),
     and the commander cross-link when the card has a commander page. That cross-link needs a cheap existence read,
     added to `loadPublicCard` through the guard's allowlist (`commander_support`, already allowed).
   - The public not-found variant (no `View decks`, top bar), and the loader cache (`unstable_cache` on the catalog
     generation and `DEPLOYMENT_ID`), whose key test fails when the catalog moves.
   - `isPublic` and `pending-routes.ts`. Copy goes in `src/lib/copy/public-pages.ts`; the absent note's em dash goes
     through copy review.
3. **The commander page** (B1 to B4, C4's figure fragments).
   - `src/app/commander/[slug]/page.tsx` on the same shell.
   - Sections in order: prose under `Why this commander` (unmounted when null), On EDHREC (a figure drops when blank; the
     card unmounts when both are), Themes, Brackets, Most played with, Similar commanders.
   - The `absent` and `degraded` notes, and the card-page link.
   - The loader's `engine` and `budgetCounts` stay unrendered (README call 3).
4. **Robots and the sitemap.**
   - `src/app/robots.ts` allows `/card/` and `/commander/` and disallows everything else signed-in.
   - A sitemap index (`src/app/sitemap.ts` with `generateSitemaps`) splits about 35,600 card addresses and about 3,400
     commander addresses into files under 50,000 URLs each, read from the catalog through the same guarded module, and
     cached on the catalog generation.

## Proof, per PR

- **Every PR:** typecheck, lint, test, the stub build, `check:public-reads`, and `check:shared`.
- **2 and 3:**
  - A contact sheet of every state at 390 and 1300 on a scratch branch off local-dev, with new rows in
    `docs/superpowers/inventories/launch-epic.json`.
  - design-review against the handoff's tables. The six themes are not walked, because a visitor always gets
    `DEFAULT_THEME`; the A1 footer's own close-out covers its six.
  - A probe, `probe:public-pages`:
    - each state's page answers signed out, with no redirect to sign-in;
    - a wrong name part 308s, and an unknown slug answers 404 with no `View decks`;
    - the page content carries no reader data, so the `<main>` of a signed-out and a signed-in fetch is equal;
    - the response carries no `Set-Cookie` signed out.
- **4:** robots and one sitemap file fetched and parsed, and the index's URL count against the catalog's.

## Rulings (d9 for Hugh, 2026-10-18; plan approved)

1. **About: no entry.** The public pages serve logged-out visitors, and Hugh's About rule for members is "only what isn't
   evident". This is the close-out's stated deferral.
2. **No prose in `degraded`**, as drawn (B4).
3. **`PUBLIC_PAGES_ENABLED` stays off in production** until Hugh says otherwise.
4. **PR 4 (robots and the sitemap) waits on Hugh.** Whether search engines index the public pages while the app is
   invite-only is a product call. PRs 1 to 3 go ahead meanwhile. PR 2 also waits on A1's footer, as planned.

## Out of scope

Shared deck pages, card search, prices, a public profile, `opengraph-image` generation, the rate limit's enforcement
(`RATE_LIMIT_ENABLED` stays observe-only), and the footer itself (A1, 9f).
