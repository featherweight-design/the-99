# Launch epic: compliance, onboarding credits, privacy and terms

Status: plan, 2026-10-17. Rulings by Hugh, 2026-10-17. Owner of each PR: TBD (assigned by the orchestrator per lane).

## Goal

Make The 99 safe to take money in production and safe to onboard more players: the Fan Content notice on every page,
a privacy page and a terms page, pricing copy that sells model runs and nothing else, welcome credits with a page that
shows where they work, admin PII masking, and (later in the epic) a free, read-only public surface. Each piece follows
the pattern the closest peer (DeckCheck) already runs in public, so the app is in the least-gray position available
without written permission from Wizards, and nothing is left out by omission.

This plan sequences work. It does not restate the two plans it depends on:

- **Buying credits UI** (U1 to U5): `docs/superpowers/plans/2026-10-17-buying-credits-ui.md`, on branch
  now on `main`; U1 merged as #2006.
- **Admin PII masking** (PR 1 to PR 4): `docs/superpowers/plans/2026-10-17-admin-pii-masking.md`, on branch
  `admin-pii-masking` (not yet on `main`); brief #2001 and handoff #2003 are merged.

## Sources (outside the repo)

The research briefs live in Hugh's Claude project folder, `~/.claude/projects/-Users-huey-Projects-the-99/boards/`, not
in this repository. Read them there; the quotes below are the ones this plan relies on.

- `fcp-scryfall-terms-2026-10-17.md` (the terms reading). FCP rule 1: "You can't require payments, surveys, downloads,
  subscriptions, or email registration to access your Fan Content." Rule 2's note goes "with your Fan Content." Scryfall:
  "You may not 'paywall' access to Scryfall data" and "End-users should be able to access card data anonymously or with
  free accounts." Wizards ToU 14.1: the FCP "only permits noncommercial activities."
- `mtg-paid-tools-precedent-2026-10-17.md` (what peers do). DeckCheck sells AI credits in packs and plans beside a free
  builder: "The deck builder, collection, card search, and playtest are free," "Every account gets 5 free credits each
  day," and a footer that cites the FCP. The brief's conclusion: "There is no 'not a gray area' option short of Wizards'
  written permission. The honest goal is the least-gray version of the common pattern." Observed: "no peer gates card
  content behind login."
- `teaser-credits-and-tiers-2026-10-17.md` (welcome grant sizing). Recommended 15 credits for 30 days, about $0.85 per
  signup at most; a migration is needed (`credit_grants.source` is checked to `plan`/`pack`, and `credit_grants_pack_never_expires_check` allows `expires_at` only on `plan`); spend order free, welcome,
  plan, pack. Its `HARD_STOP_USD` arithmetic no longer applies: the app-wide spending limits are being removed (see D0).
- The Phase F1 research brief on what peers show logged out (in the same folder). It informed the public surface ruling
  (L12).
- `hugh-todos.md`, sections "Terms decisions" and "Welcome credits + supporter tier", and the privacy page line.

## Locked decisions

| # | Ruling (Hugh, 2026-10-17) | Source |
|---|---|---|
| L1 | Avoid contacting Wizards where possible. Follow the observed peer pattern (DeckCheck the closest analog) as its least-gray version, and never be gray through omission: every notice, credit and free path the pattern carries, we carry. | precedent brief §1, §verdict |
| L2 | Invite-only stays for a while. A free, read-only PUBLIC surface is planned later in this epic to answer the FCP's free-access and "email registration" point; its scope is researched in Phase F (card pages, commander pages, shared-deck pages; what peers show logged out); the first cut is ruled as L12. | FCP brief item 3; precedent brief "no peer gates card content" |
| L3 | No per-crop artist credit (peers crop art without one). The card-art blur and wash are treated as covered (DeckCheck blurs art washes; the card itself stays visible). A Design alternative is optional and adopted only if it matches today's intent. | FCP brief item 4; precedent brief |
| L4 | The FCP notice appears on every page, signed in or out, but SUBTLY: small muted footer text, Scryfall style, plus /about and the Terms. Text: the FCP template naming "The 99", then "Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices from Mana Pool. Not affiliated with Wizards of the Coast, Scryfall or Mana Pool." | FCP rule 2; precedent brief §recommendation |
| L5 | Welcome credits for new sign-ups: 15 credits (3 runs of each smart tool), expiring after 30 days, plus an onboarding "Where credits work" section. Ships BEFORE more users onboard, after payments U2a. | teaser brief §2 |
| L6 | Pricing copy sells AI runs, states that every card, deck and collection view stays free, never says "unlock", and leads with the pack. Both the pack and the monthly plan ship at launch; the plan sits behind the pack on `/credits` and is worded as a credit bundle that renews, never a membership. | FCP brief item 6; precedent brief |
| L7 | A privacy page and a terms page (none exist): receipts and refunds via support@the-99.dev, the admin PII line ("admins can see account emails for support; views are logged"), the FCP notice, and data deletion (the account purge exists). | hugh-todos privacy line |
| L8 | Admin PII masking is a launch prerequisite (its own plan, in progress). | PII masking plan |
| L9 | The supporter tier is post-launch and out of this epic. | teaser brief §4 |
| L10 | The app-wide spending limits (`BUDGET_USD`, `HARD_STOP_USD`) are removed entirely. The Anthropic workspace limits carry spend: $150 a month for The 99's workspace, $250 for the org. The removal ships as three PRs by another lane: A (server and `/admin`), B (UI readers and copy), C (the type). | Hugh, 2026-10-17 |
| L11 | Users must be 18 or older (Hugh answered No to Anthropic's under-18 question). | Hugh, 2026-10-17 |
| L12 | The public surface's first cut is public card pages and public commander pages: read-only catalog loaders that read no per-user data, cached at the CDN. The card page route is new; the commander page needs its own catalog-only loader. Anonymous reads get an IP-keyed rate-limit bucket, and a test proves the public loaders import nothing from collection, decks or `src/lib/social/`. Sign-up stays invite-only; search links out to Scryfall. Shared deck pages are deferred, to be decided together with opening sign-up. | Hugh, 2026-10-17; F1 brief |

## Phases and PRs

No stacking: each PR is cut from fresh `main` after the one it depends on merges. Sizes: S under ~200 lines, M under
~500, L up to the ~800-line ceiling.

| ID | What | Depends on | Design? | Copy-review? | Size | Owner |
|---|---|---|---|---|---|---|
| **A. Fan Content notice** | | | | | | |
| A0 | Design brief and one board: the footer line on every shell (signed in, signed out landing, `/join`, `/sign-up`, `/offline`), its type and contrast in all six themes, and the layout for /privacy and /terms | none | Yes (brief, then handoff) | Yes | S (doc) | TBD |
| A1 | The site-wide footer notice (L4 text), one component in the root layout, drawn at 390 and 1300; a test that every layout branch renders it | A0 | Built from A0 | Yes | M | TBD |
| A2 | The notice on /about; an audit that mana and guild symbols stay out of the logo, favicon, manifest icons and marketing (FCP rule 4) | A1 | No (existing About layout) | Yes | S | TBD |
| A3 | Record L3 as settled (no artist line; washes stay). Optional: a Design exploration of an unblurred wash, adopted only if it keeps today's intent | none | Optional | No | S (doc) | TBD |
| **B. Privacy and terms** | | | | | | |
| B1 | Public `/privacy` and `/terms` (added to `isPublic` in `src/proxy.ts`): receipts and refunds via support@the-99.dev, the admin PII line, the FCP notice, data deletion (`purgeAccount`), the AI vendor named, and that users must be 18 or older (L11). Linked from the footer, `/credits` and `/sign-up`. An invited player makes the account on Clerk's hosted sign-up, not on `/sign-up` (an invite-only explainer), so B1 also sets the hosted sign-up's terms and privacy links in Clerk and checks them during an invitation redemption from `/join/[token]` | A0, A1; E3 for the "views are logged" sentence | Built from A0 | Yes, and `prose-pass` for the long text | M | TBD |
| **C. Pricing copy** | | | | | | |
| C1 | `/credits` and every offer string pass L6: lead with the pack, say "Browsing is always free. Anything we write just for you uses a credit." (the page head's third line, `design_handoff_the99_buying_credits/addendum-r4/`; Hugh with the copywriter, 2026-10-21, replacing "Credits pay for AI model runs ... view stays free"), no "unlock", "premium" or "full access"; the monthly plan reads as a credit bundle that renews, never a membership | U1 (#2006, merged) | No (copy only) | Yes | S | TBD |
| U3 | The monthly plan, per the buying-credits plan, in the launch and drawn behind the pack on `/credits` (L6) | per that plan; C1 for its wording | per that plan | Yes | per that plan | TBD |
| **D. Welcome credits** | | | | | | |
| D0 | REPLACED (2026-10-17): no budget step. The app-wide limits are removed instead (L10), in three PRs owned by another lane. Welcome credits do not wait on them | none | No | No | none | other lane |
| D1 | Migration: `credit_grants.source = 'welcome'` in `credit_grants_source_check`, `credit_grants_pack_never_expires_check` rewritten so `expires_at` is required on `welcome` (today it allows `expires_at` only on `plan`), a partial unique index (one per user ever); the grant written on `user.created` (the webhook route exists) and on first signed-in load, idempotent; spend order free, welcome, plan, pack; the 20-a-day paid limit applies; behind a new switch; a ledger probe on a scratch branch | U2a | No | No | M | TBD |
| D2 | Onboarding "Where credits work": the five tools, one line each, a Try it link per tool (`?tool=` landings), and a live line ("15 welcome credits, expire Nov 16. Each run uses 1."); a Moment pointing to it | D1, U2b, a Design handoff | Yes | Yes | M | TBD |
| **E. Admin PII masking** (its own plan) | | | | | | |
| E1 to E4 | PII masking PR 1 (masked at the source), PR 2 (surfaces, including masked names in the `/admin` Costs per-account table, per the R3 design table), PR 3 (Show, the reveal log), PR 4 (exact-email lookup) | per that plan | Handoff #2003 | per that plan | per that plan | TBD |
| **F. Public read-only surface** | | | | | | |
| F1 | Research: what DeckCheck, EDHREC, Archidekt, Moxfield and Scryfall show logged out; which of card pages, commander pages and shared-deck pages to open; cost, caching and abuse notes; a recommendation for Hugh. DONE 2026-10-17; ruled as L12 | none | No | No | S (doc) | done |
| F2 | Design brief and handoff for the L12 scope: a public card page and a public commander page, signed out, with search linking out to Scryfall | F1 (done), L12 | Yes | Yes | doc | TBD |
| F3+ | Build, split per route at plan time: the new card page route and the commander page's catalog-only loader, each public in `src/proxy.ts`, CDN-cached, no per-user data, the footer notice; an IP-keyed rate-limit bucket for anonymous reads; a test that the public loaders import nothing from collection, decks or `src/lib/social/` | F2 | Built from F2 | Yes | split at plan time | TBD |
| **G. Close-out** | | | | | | |
| G1 | About entries for the features Hugh names (welcome credits, the public surface), one `ABOUT_VERSION` bump at the end of the launch, per the 2026-09-21 batching ruling | all feature PRs | Yes (About artboards) | Yes | S | TBD |

Admin costs, a note rather than a phase: `/admin` Costs will read Anthropic's Usage and Cost API per workspace through
`ANTHROPIC_ADMIN_KEY` (set on both Vercel projects), replacing the hand-typed Elsewhere figure.

## Open decisions for Hugh

None remain.

## Decided

- **The budget and the hard stop** (2026-10-17). Removed entirely rather than raised (L10); D0 is replaced by that
  removal.
- **The welcome grant** (2026-10-17). 15 credits, expiring after 30 days. Converting the leftover on purchase stays out
  of scope (below).
- **Plan vs pack** (2026-10-17). Both ship at launch. The pack leads on `/credits`; the monthly plan (U3) sits behind it,
  worded as a credit bundle that renews, never a membership (L6).
- **The public surface's scope** (2026-10-17). Card pages and commander pages first; sign-up stays invite-only;
  shared deck pages deferred until sign-up opens (L12).
- **Age** (2026-10-17). Users must be 18 or older, stated in `/terms` (L11).

## Order

**Before `PAYMENTS_ENABLED` goes on in production:**

1. U1 and U2a merged (the credits plan already gates production on U2a).
2. A1 (the notice is on every page) and C1 (pricing copy).
3. K2 (refunds and disputes) from the buying-credits plan. Today the Stripe webhook acknowledges every event except
   `checkout.session.completed` without acting on it, so without K2 a refunded or disputed pack keeps spendable credits.
4. E1 to E3 (masking and the reveal log), then B1, whose privacy page states that reveals are logged. A privacy
   page must not claim a log that does not exist yet.
5. B1 merged and linked from `/credits`, so receipts and refunds have a stated route.

**Before the monthly plan (U3) goes on sale in production:** U3 is in the launch, after C1 and behind the pack, and
sales wait on the buying-credits plan's R step too (Stripe Customer delete on account deletion). Today the purge
deletes the local `stripe_customers` row without deleting the Stripe Customer or cancelling its subscription, so a
deleted account would keep being charged with nothing left locally to find it by.

**Before invites widen (any new batch of invites beyond the current players):**

1. D1 and D2 (welcome credits and where they work), with U2b merged so the credit line can show a welcome lot.
2. Everything in the payments list above, since a new player can reach `/credits` on day one.

**Before invite-only is lifted or any public launch:** F2 and F3 (F1 is done and the scope is ruled, L12), then G1.

A2 and A3 have no dependencies and can run in parallel with the rest.

## Not in this plan

- The supporter tier (L9; revisit at about 10 plan subscribers).
- Invite credits for the sender, the leftover-conversion on purchase, and the day-23 reminder (teaser brief §3). Each is
  a candidate follow-up once welcome credits have run for a month.
- Shared deck pages, and opening sign-up: deferred and decided together (L12).
- Removing the app-wide spending limits (L10): three PRs owned by another lane.
- Contacting Wizards or Scryfall (L1). If a public launch ever outgrows the peer pattern, revisit.

## Feature-acceptance close-out

Run the `feature-acceptance` skill per UI PR and again at the epic's close:

- **Inventory**: `docs/superpowers/inventories/launch-epic.json`, authored in A1 and extended per PR. Rows: the footer
  on every shell (signed in home, a deck, `/credits`, `/admin`, the signed-out landing, `/join/[token]`, `/sign-up`,
  `/offline`), `/about`, `/privacy`, `/terms`, the onboarding section, and each public route F3 opens; each at 390 and
  1300, with the footer checked in all six themes for contrast.
- **Contact sheet**: `scripts/contact-sheet.mjs` over that inventory, one image per PR.
- **Sameness**: `pnpm check:shared` checks one shared binding per inventory, by direct import, so it cannot prove a
  footer mounted once in the root layout reaches every shell, or that `CreditButton` shows welcome credits. Use two
  inventories: one for the spend surfaces (each imports `CreditButton`), one for the shells. A1's render test proves
  every layout branch draws the footer, and a separate test proves the credit line shows a welcome lot.
- **Markers**: a probe asserts the exact L4 text on a signed-out and a signed-in page, and that `/privacy` and `/terms`
  load with no session.
- **Walk**: the close-out walk on staging against L1 to L8: no card, deck or collection view sits behind credits;
  pricing copy never says "unlock"; a fresh invited account receives exactly one welcome grant that expires on the
  stated date; a deleted account's grants are purged.
