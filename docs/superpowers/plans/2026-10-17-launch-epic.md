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
  `docs/buying-credits-ui-plan` (not yet on `main`); U1 is open as #2006.
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
  signup at most; a migration is needed (`credit_grants.source` is checked to `plan`/`pack`); spend order free, welcome,
  plan, pack; about 24 fully used grants reach `HARD_STOP_USD`.
- `hugh-todos.md`, sections "Terms decisions" and "Welcome credits + supporter tier", and the privacy page line.

## Locked decisions

| # | Ruling (Hugh, 2026-10-17) | Source |
|---|---|---|
| L1 | Avoid contacting Wizards where possible. Follow the observed peer pattern (DeckCheck the closest analog) as its least-gray version, and never be gray through omission: every notice, credit and free path the pattern carries, we carry. | precedent brief §1, §verdict |
| L2 | Invite-only stays for a while. A free, read-only PUBLIC surface is planned later in this epic to answer the FCP's free-access and "email registration" point; its scope is researched in Phase F (card pages, commander pages, shared-deck pages; what peers show logged out). | FCP brief item 3; precedent brief "no peer gates card content" |
| L3 | No per-crop artist credit (peers crop art without one). The card-art blur and wash are treated as covered (DeckCheck blurs art washes; the card itself stays visible). A Design alternative is optional and adopted only if it matches today's intent. | FCP brief item 4; precedent brief |
| L4 | The FCP notice appears on every page, signed in or out, but SUBTLY: small muted footer text, Scryfall style, plus /about and the Terms. Text: the FCP template naming "The 99", then "Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices from Mana Pool. Not affiliated with Wizards of the Coast, Scryfall or Mana Pool." | FCP rule 2; precedent brief §recommendation |
| L5 | Welcome credits for new sign-ups (recommended 15 credits, 3 runs of each smart tool, 30-day expiry; Hugh confirms), plus an onboarding "Where credits work" section. Ships BEFORE more users onboard, after payments U2a, and only once `BUDGET_USD`/`HARD_STOP_USD` are raised. | teaser brief §2; `src/lib/model/spend-rule.ts` |
| L6 | Pricing copy sells AI runs, states that every card, deck and collection view stays free, never says "unlock", and leads with the pack. | FCP brief item 6; precedent brief |
| L7 | A privacy page and a terms page (none exist): receipts and refunds via support@the-99.dev, the admin PII line ("admins can see account emails for support; views are logged"), the FCP notice, and data deletion (the account purge exists). | hugh-todos privacy line |
| L8 | Admin PII masking is a launch prerequisite (its own plan, in progress). | PII masking plan |
| L9 | The supporter tier is post-launch and out of this epic. | teaser brief §4 |

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
| B1 | Public `/privacy` and `/terms` (added to `isPublic` in `src/proxy.ts`): receipts and refunds via support@the-99.dev, the admin PII line, the FCP notice, data deletion (`purgeAccount`), the AI vendor named. Linked from the footer, `/credits` and `/sign-up` | A0, A1; E3 for the "views are logged" sentence | Built from A0 | Yes, and `prose-pass` for the long text | M | TBD |
| **C. Pricing copy** | | | | | | |
| C1 | `/credits` and every offer string pass L6: lead with the pack, "Credits pay for AI model runs ... Every card, deck, collection and recommendation view stays free," no "unlock", "premium" or "full access" | U1 (#2006) | No (copy only) | Yes | S | TBD |
| **D. Welcome credits** | | | | | | |
| D0 | Raise `BUDGET_USD` and `HARD_STOP_USD` in `spend-rule.ts` to the number Hugh sets (open decision 1) | Hugh's number | No | No | S | TBD |
| D1 | Migration: `credit_grants.source = 'welcome'`, `expires_at` required on it, a partial unique index (one per user ever); the grant written on `user.created` (the webhook route exists) and on first signed-in load, idempotent; spend order free, welcome, plan, pack; the 20-a-day paid limit applies; behind a new switch; a ledger probe on a scratch branch | U2a, D0 | No | No | M | TBD |
| D2 | Onboarding "Where credits work": the five tools, one line each, a Try it link per tool (`?tool=` landings), and a live line ("15 welcome credits, expire Nov 16. Each run uses 1."); a Moment pointing to it | D1, U2b, a Design handoff | Yes | Yes | M | TBD |
| **E. Admin PII masking** (its own plan) | | | | | | |
| E1 to E4 | PII masking PR 1 (masked at the source), PR 2 (surfaces), PR 3 (Show, the reveal log), PR 4 (exact-email lookup) | per that plan | Handoff #2003 | per that plan | per that plan | TBD |
| **F. Public read-only surface** | | | | | | |
| F1 | Research: what DeckCheck, EDHREC, Archidekt, Moxfield and Scryfall show logged out; which of card pages, commander pages and shared-deck pages to open; cost, caching and abuse notes; a recommendation for Hugh | none | No | No | S (doc) | TBD |
| F2 | Design brief and handoff for the chosen scope | F1, Hugh's scope ruling | Yes | Yes | doc | TBD |
| F3+ | Build, split per route at plan time (each route public in `src/proxy.ts`, no per-user data, the footer notice, rate limiting considered) | F2 | Built from F2 | Yes | TBD by F1 | TBD |
| **G. Close-out** | | | | | | |
| G1 | About entries for the features Hugh names (welcome credits, the public surface), one `ABOUT_VERSION` bump at the end of the launch, per the 2026-09-21 batching ruling | all feature PRs | Yes (About artboards) | Yes | S | TBD |

## Open decisions for Hugh

1. **The budget and the hard stop.** Today `BUDGET_USD = 10` and `HARD_STOP_USD = 20` a month; about 24 fully used
   welcome grants reach the stop, which pauses every model call in the app until the 1st. The brief suggests budgeting
   about $1 per expected signup on top of current use, inside the shared $100 Anthropic account cap. D0 waits on the
   number.
2. **The welcome grant.** 15 credits and 30 days is the recommendation; confirm both or name others. Also confirm the
   brief's "convert the leftover on purchase" idea is out of scope for this epic (listed below as not in this plan).
3. **The public surface's scope.** Decided after F1 reports: which routes open, and whether sign-up opens with them.
4. **Plan vs pack emphasis.** L6 leads with the pack. Decide whether the monthly plan (U3) ships at launch at all; the
   FCP brief reads a plan as closer to the barred "subscriptions" than a one-off pack.

## Order

**Before `PAYMENTS_ENABLED` goes on in production:**

1. U1 and U2a merged (the credits plan already gates production on U2a).
2. A1 (the notice is on every page) and C1 (pricing copy).
3. E1 to E3 (masking and the reveal log), then B1, whose privacy page states that reveals are logged. A privacy
   page must not claim a log that does not exist yet.
4. B1 merged and linked from `/credits`, so receipts and refunds have a stated route.

**Before invites widen (any new batch of invites beyond the current players):**

1. D0, D1 and D2 (welcome credits and where they work), with U2b merged so the credit line can show a welcome lot.
2. Everything in the payments list above, since a new player can reach `/credits` on day one.

**Before invite-only is lifted or any public launch:** F1 to F3 and Hugh's scope ruling, then G1.

A2, A3 and F1 have no dependencies and can run in parallel with the rest.

## Not in this plan

- The supporter tier (L9; revisit at about 10 plan subscribers).
- Invite credits for the sender, the leftover-conversion on purchase, and the day-23 reminder (teaser brief §3). Each is
  a candidate follow-up once welcome credits have run for a month.
- Contacting Wizards or Scryfall (L1). If a public launch ever outgrows the peer pattern, revisit.

## Feature-acceptance close-out

Run the `feature-acceptance` skill per UI PR and again at the epic's close:

- **Inventory**: `docs/superpowers/inventories/launch-epic.json`, authored in A1 and extended per PR. Rows: the footer
  on every shell (signed in home, a deck, `/credits`, `/admin`, the signed-out landing, `/join/[token]`, `/sign-up`,
  `/offline`), `/about`, `/privacy`, `/terms`, the onboarding section, and each public route F3 opens; each at 390 and
  1300, with the footer checked in all six themes for contrast.
- **Contact sheet**: `scripts/contact-sheet.mjs` over that inventory, one image per PR.
- **Sameness**: `pnpm check:shared` proves every shell imports the one footer component, and every spend surface reads
  welcome credits through the same `CreditButton` line.
- **Markers**: a probe asserts the exact L4 text on a signed-out and a signed-in page, and that `/privacy` and `/terms`
  load with no session.
- **Walk**: the close-out walk on staging against L1 to L8: no card, deck or collection view sits behind credits;
  pricing copy never says "unlock"; a fresh invited account receives exactly one welcome grant that expires on the
  stated date; a deleted account's grants are purged.
