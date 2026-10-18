# Brief: Where credits work, for a new sign-up (launch epic D2)

2026-10-18. Launch epic D2, for Design. The grant itself (D1) is built and merged, behind `WELCOME_CREDITS_ENABLED`;
no screen names it yet, and none will until this brief has a handoff with a READINESS verdict.

**Sources.**
- The launch plan, `docs/superpowers/plans/2026-10-17-launch-epic.md`: L5 (`:49`), L6 (`:50`), the D1 and D2 rows
  (`:77`, `:78`), the welcome grant under "Decided" (`:99`), the order before invites widen (`:126`), acceptance (`:152`
  to `:158`).
- D1's plan, `docs/superpowers/plans/2026-10-18-welcome-credit-d1.md`, "Review outcome" (`:47` to `:64`).
- The orchestrator's research board `teaser-credits-and-tiers-2026-10-17.md`, §2 "Onboarding section" (`:46`) and §3.
  It lives on the orchestrator's boards, not in this repository, so every line this brief relies on is quoted where
  it is used.
- The code: `src/lib/payments/welcome.ts`, `flag.ts`, `chip-rule.ts`, `visible-rule.ts`; `src/lib/model/credit-rule.ts`,
  `allowance-rule.ts`, `credit-line.ts`; `src/lib/copy/credits.ts`, `credits-page.ts`, `discovery.ts`.

**What this brief asks.** Where a new player learns that they hold welcome credits, which tools spend them, when they
expire, and that `/credits` exists, and every state that surface has, on phone and desktop. One Design round.

## The problem

A new account is given 15 credits it did not buy and cannot see. Nothing names them: the account menu's chip counts
them into one total, the credit line calls them `paid`, and `/credits` draws a `Welcome` cell with no date under it.
A player who does not know what spends a credit will not spend one, and the lot expires unused. Hugh's ruling (L5)
pairs the grant with an onboarding "Where credits work" section, and it ships before more players are invited
(launch plan `:126`).

**Who sees it.** An account created while `WELCOME_CREDITS_ENABLED` (which requires `PAYMENTS_ENABLED`) was on for
it, and which therefore holds a welcome lot. Everyone else sees nothing new.

## Rulings that bind the screens

- **The grant** (`welcome.ts:8-16`, `:22-36`). 15 credits, once per account ever (a partial unique index,
  `src/db/schema.ts:2406-2407`). It expires 30 days after the ACCOUNT was created, not after it was granted, so a late
  or repeated write cannot extend it. It is written on Clerk's `user.created` only
  (`src/app/api/clerk-webhook/route.ts:61-76`); D1 shipped no in-page fallback (D1 plan `:55-57`).
- **Spend order: free allowance, then welcome, then plan, then pack** (`credit-rule.ts:13-14`, `:61`). The free daily
  allowance is always spent first, so a welcome credit is spent only on a run the free allowance cannot fund.
- **1 credit is 1 run of any tool** (`credits-page.ts:34`). Welcome runs count toward the 20-a-day paid limit like any
  lot (`allowance-rule.ts:78`; D1 plan decision 4).
- **The switch gates the write only** (`flag.ts:21-29`). A lot already granted is spent whatever the switch later says.
- **L6** (launch plan `:50`): copy sells AI runs, states that every card, deck and collection view stays free,
  **never says "unlock"**, and leads with the pack. Confirmed by the orchestrator (2026-10-18) as binding here: reading,
  browsing and seeing a result costs nothing; only running a model tool spends a credit. The shipped free lines already say so for the bracket and a past
  Help me choose (`discovery.ts:126-128`).
- **Required content** (orchestrator, and the D2 row `:78`): which tools spend credits, the grant and its expiry, and a
  conversion teaser to `/credits`.
- **Converting the leftover on purchase is out of scope** (launch plan `:99-100`). Nothing may promise it.
- **From the buying-credits handoff, not reopened** (`design/design_handoff_the99_buying_credits/README.md`):
  - No new row in the account menu (`:51`); the balance is the chip in the identity block.
  - Payments off: buying is absent, never disabled (`:75`; buying brief §6).
  - The expiry warning for plan credits is drawn 3 days out, in `--warning` (`:71`, G9). The same README's `Never --danger` (`:70`) is said of the
    daily paid-limit meter; this brief applies it to the welcome warning by analogy, for Design to confirm.
  - On a spending surface the paid total is one number; plan and packs split only on `/credits` (`:55-57`).
- **Moments and the tour, not interrupted.** One moment per visit, a spent moment never returns, and nothing arrives
  while a surface is open over the page (`docs/agents/moments.md:10-19`). The first-run tour takes the visit it opens
  on, so no moment arrives that visit (`src/components/discovery/first-run-tour.tsx:7-8`), and it ends by pointing at
  the Home banner (discovery brief, Locked 9, `2026-10-16-discovery-and-onboarding.md:147`).

## The five tools that spend a credit

Every spender reserves through `reserveModelCall`, one call site each: `fits-read-store.ts:94` (`fits_read`),
`intake/run-store.ts:255` (`intake`), `tuning/run-store.ts:107` (`tuning`), `cuts-run-store.ts:59` (`proposed_cuts`),
`synopsis/generate.ts:496` (`synopsis`). Their shipped names, places and costs are already one list, About's "Written
for you" (`src/lib/copy/discovery.ts:115-129`, drawn in `src/components/about/tools/tools-tab.tsx:40-80`):

| Shipped name | Where | Cost | `?tool=` landing (`src/lib/discovery/tools.ts`) |
|---|---|---|---|
| Overview | A deck's Analysis tab | 1 credit each | none: the registry has no Overview |
| Suggested changes | A deck's Analysis tab | 1 credit per run | `suggested-changes`, needs a deck (`:47`) |
| Look deeper, in Proposed cuts | A deck's Analysis tab | 1 credit per look | `proposed-cuts`, needs a deck (`:46`); offered only past 100 cards (`tuning-hub.ts:38`) |
| Help me choose, with "Anything else?" | New deck | 1 credit per search | `help-me-choose`, no deck needed (`:42`) |
| Which deck needs it most? | A card's details | 1 credit per read | none of its own; `find-a-deck` lands on `/collection?avail=free` and needs a deck (`:53`) |

Each row follows its own switch (`captionLineSwitches`, `about-entries.ts:1475-1490`); a row whose switch is off is
not drawn. Engineering's read: reuse these rows as the section's content, so the two lists cannot drift.

## What the server can tell a screen

Today, for a reader: the `Allowance` (`allowance-rule.ts:118-146`) carries `welcome`, the welcome credits left
(`creditTotals`, `credit-rule.ts:79-84`), beside free, plan and pack, and `payments` for the reader. This line adds:

- **The welcome lot's expiry date.** Not on the `Allowance` today: only `planExpiresAt` is (`:142`). It is on the
  grant row.
- **Whether the lot expired.** The allowance read drops an expired lot (`allowance.ts:189`), so today an expired lot
  and no lot read the same. So do a lot used up and no lot: `creditTotals` sums what is left per source
  (`credit-rule.ts:80-83`), so both read `welcome: 0`. One indexed read of the grant row (its `units`, what is left,
  and its expiry) tells all three apart, and the `Used up` and `Partly spent` rows below need it.
- **Units at the start.** 15 (`WELCOME_UNITS`), so "partly spent" is `welcome < 15`.
- **Live, per request.** Home's payload is cached per reader on `user_data_stamps`, and neither `credit_grants` nor
  `model_calls` bumps the stamp (the trigger list in `drizzle/0073_user_data_stamps.sql` and later). Any figure here
  is read outside the cached payload, as the chip's is (`src/lib/payments/chip.ts:8-16`).

Ask for anything else and engineering will say whether it can be read.

## Open for Design to call

1. **Placement.** The D2 row proposes a section plus a moment pointing to it (`:78`). Engineering's read of each
   candidate against what exists:
   - **A first-run moment.** Moments today are tool moments: each sits beside a control the reader has not used and
     follows that tool's switch (`src/lib/moments/registry.ts:3-28`). A welcome moment would be the first that is not
     a tool's, so it needs a slot in the fixed order and an anchor on screen. The chip is inside the closed account
     menu, and a menu open over the page holds every moment, so the chip cannot anchor one as drawn. It cannot arrive
     on the tour's visit, so for most new players it arrives on visit two at the earliest.
   - **A card on Home.** A new sign-up lands on the first-run Home (`FirstRunChecklist`, `src/app/page.tsx:321-330`),
     where the tour lights step one first. A card there competes with "Start with what you own" and must be read
     outside Home's cache (above). It is the one candidate that is on screen without a press.
   - **The account menu.** No new row (ruling above). What is left is the chip itself, or what the chip leads to:
     `/credits`, where a `Welcome` cell already draws (`src/lib/payments/page-model.ts:66-68`). The tour's look step
     already lights the menu (`tourCopy.lit.account`, `discovery.ts:236`).
   - **The tour's last step.** Locked 9 keeps the banner last, so this would be a seventh stop before it. That
     changes `Six stops · about a minute` (`discovery.ts:246`), runs only with `FIRST_RUN_TOUR_ENABLED`, once on its own (`src/lib/discovery/tour.ts:13-15`), and again only when
     the player asks for it (`/?tour=1`, `src/app/page.tsx:317-319`): a player who skips it and never takes it again
     never sees the stop.
2. **What `Try it` does** where no landing exists (Overview, the fits read) or the tool needs a deck a new player does
   not have yet. The showcase's answer for a tool with no fitting deck is a reason line (`NEEDS_A_DECK`,
   `discovery.ts:69`). Ruled: that reason line, with no second landing (below). Open for Design: only how it sits.
3. **How welcome credits are named on the credit line and the chip.** The line counts them in `N paid`
   (`credit-line.ts:28`, `credits.ts:54-58`), untrue for a gift; D1 left this to D2 (D1 plan `:64`). Draw whether
   welcome joins the one number under another word or takes its own segment, keeping plan and packs as one number.
   The chip counts free plus held as `N credits` (`chip-rule.ts:31`, `:40`).
4. **The `Welcome` cell on `/credits`.** It has no line under it (`balance.tsx:61-63`: only Free, Plan and Packs
   carry one). Draw its expiry line.
5. **The expiring state.** Its lead time is 3 days (ruled, below). Which surfaces turn `--warning`: the plan's
   version turns the plan card, the Plan cell and every credit line (README `:71`), and the chip separately
   (`chip-rule.ts:12`, `:38-39`).
6. **The conversion teaser.** Its form and where it sits, and that it goes to `/credits`. Not drawn while payments
   are off for the reader.
7. **Dismissal.** Whether the section can be closed for good, and whether it leaves on its own once the lot is used up
   or expired.

## Every state to draw

| State | Trigger, as the code reads it | What renders (Design calls the form) |
|---|---|---|
| Held, unused | lot exists, not expired, `welcome === 15` | the section: the five tools, the grant line with its date, the teaser |
| Partly spent | not expired, `0 < welcome < 15` | as above, with the count left |
| Used up | lot exists, not expired, `welcome === 0` | the grant line says so; the teaser stays (payments on) |
| Expiring | not expired, `welcome > 0`, expiry within 3 days | the expiring form, in `--warning` |
| Expired | lot exists, `expiresAt <= now` | Design calls: one last line, or nothing |
| No lot | no welcome row (switch was off at sign-up, an account older than 30 days, or a missed webhook) | nothing new anywhere |
| Switch off, lot held | `welcomeCreditsEnabled` false, lot exists | the lot still spends (`flag.ts:24-25`); Design calls whether the section still draws |
| Payments off, lot held | `paymentsEnabled` false, `welcome > 0` | the lot's facts may show; no teaser and no buying anywhere; `/credits` stays reachable, reduced (`visible-rule.ts:9-14`) |
| Paid limit reached | `paidAtLimit` true | the credit line's shipped limit form (L5/L6); the section adds nothing |
| Also bought | `everBought` true (`chip.ts:22`) | Design calls whether the teaser stays |

Every row at 390 and desktop. The section in at least two themes beside Kamigawa, as the buying handoff did (`R1b`).

## Copy

Structure only. Every string is a placeholder for `/copy-review`, never Design and never Hugh. US English, no em
dashes, no "unlock". Figures arrive as arguments; none is typed into a string.

- `welcomeCopy.title`, `welcomeCopy.intro(allowance)` (the free allowance goes first, so say a welcome credit funds a
  run once today's free ones are used).
- `welcomeCopy.rows`: reuse `writtenForYouCopy.rows` (`name`, `where`, `what`, `cost`) rather than new strings.
- `welcomeCopy.tryIt`, `welcomeCopy.none` (reuse the showcase's reason line if Design keeps it).
- `welcomeCopy.live(left, total, expiresOn)`, `.usedUp(expiresOn)`, `.expiring(left, expiresOn)`, `.expired`.
- `welcomeCopy.free`: the L6 sentence that every view stays free.
- `welcomeCopy.teaser`: the line to `/credits`.
- `welcomeCopy.moment`, if a moment is drawn; `welcomeCopy.dismiss`, if dismissal is drawn.
- `creditsCopy`: the welcome word or segment on the credit line and chip (open item 3).
- `creditsPageCopy.bal.welcomeSub(expiresOn)`: the cell's line.

## About entries

This is a feature, so it owes an About entry. It joins the launch-end batch, G1 (launch plan `:86`), which names
welcome credits: one `ABOUT_VERSION` bump at the end of the launch. Design draws the artboard in
`design/design_handoff_the99_about/`; Hugh decides whether it is a new entry or an edit to `credits`
(`about-entries.ts:1451`).

## Not in this brief

- The grant's size and length (L5, ruled), and converting the leftover on purchase (out of scope).
- Invite credits and the value recap at the wall (research board §3, ideas 2 and 3).
- Email reminders: the research board's reminder is in-app only (`:57`).

## Ruled by the orchestrator (2026-10-18; Hugh can override)

The six questions this brief raised, as d9 ruled them. Design draws to these.

1. **One `Try it` landing, not two.** Where a tool has no landing of its own, or the player has no deck yet, the line
   says the tool needs a deck instead of linking. No second landing is built.
2. **No in-page fallback for a missed webhook.** The grant is written by Clerk's `user.created` only, as decided on D1.
3. **The expiry warning shows 3 days out**, the same lead as a plan's (`credit-line.ts:26`). The research board's
   day-23 reminder is not taken: the teaser research says avoid nagging.
4. **Stored in UTC, shown as the player's own day.** The expiry instant stays UTC; the date a screen draws is the
   player's local day, so an evening US reader is never shown tomorrow's date.
5. **The spend order stays: the free daily run first, then the welcome lot.** Production's free allowance is one run
   a day (`MODEL_DAILY_ALLOWANCE=1`), not the code's default of five (`allowance.ts:57`), so a player who runs more
   than one tool a day reaches the welcome lot. Whether welcome credits should be spent before the free run is a money
   rule on Hugh's list, not a Design question.
6. **L6 as above is confirmed**: lead with the pack, every view stays free, never "unlock".
