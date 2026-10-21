# Welcome credits: where they work (launch epic D2)

2026-10-21. Builds `design/design_handoff_the99_welcome_credits/` (R2, approved by Hugh 2026-10-21, READINESS Green,
engineering audit against `ace45d6ae`) from the brief `docs/superpowers/design-briefs/2026-10-18-welcome-credits-onboarding.md`.
The brief's rulings and the orchestrator's six are closed. Three PRs, one at a time, never stacked. PR 1 was built as one
and came to 28 files, so it ships as 1a (the data, the rule and the action) and 1b (the credit line and the chip), each
under the 20-file bar.

## PR 1a: the data, the rule and the action (no surface)

- **Migration 0159**: `user_prefs.welcome_strip_dismissed_at timestamptz null`. `user_prefs` already carries the
  `user_data_touch` trigger (0123) and is in `PURGE_ORDER`, so nothing else moves.
- **The lot read** (`src/lib/payments/welcome-read.ts`): `readWelcomeLot` (one indexed read of the welcome row, its
  ledger rows gathered by two correlated subqueries, aliased and qualified, `remaining`/`isLive` deciding),
  `readWelcomeStripDismissed`, `dismissWelcomeStripWrite` (only while null), and `readWelcomeState`, which composes them
  with `readEverBought` (`chip.ts`, the chip's own rule, extracted as `boughtFrom`) and `PAYMENTS_ENABLED` from `env`.
- **The state rule** (`src/lib/payments/welcome-state.ts`, pure): `welcomeState` maps the lot, `now`, the dismissal,
  `everBought` and payments to `none | held | partly | expiring | usedUp | dismissed`, carrying `lot` (the lot's own
  state under a dismissal), `units`, `left`, `expiresAt` and `teaser`.
- **`dismissWelcomeStripAction`** (`src/app/welcome-actions.ts`): signed in, writes only for a reader holding an
  unexpired welcome lot, checks no switch, revalidates nothing.

## PR 1b: the credit line and the chip (no new surface)

- **`Allowance.welcomeExpiresAt`** (`welcomeLotExpiry`, filled beside `planExpiresAt`), carried through Help me choose's
  `Standing`. The stale spend-order comment on `Allowance.welcome` now names welcome first.
- **The credit line**: welcome is its own segment in spend order (`1 of 1 free · 15 welcome · 40 paid`; `paid` is held
  less welcome, a gift stays in it); L3 `this run uses 1 of 15 welcome`; `first`/`again` say a welcome credit; L5 names
  welcome among what is banked; an expiring welcome tail shaped like L7, drawn in `--warning` by `CreditsText`. Every
  reader with no welcome credit reads the shipped strings byte for byte.
- **The chip**: still one number. Its expiring line names the earlier of a cancelled plan's and the welcome lot's (G5).
- **The class swept**: every "uses a paid credit" form that a welcome credit can fund, including Fits' own
  (`swap-tools.ts`).

## PR 2: the surfaces

- **The Home strip**: first-run Home under the About line; the dashboard, heading the main column over Ready to build.
  One line in the About line's family, `Where they work`, a bare ✕ calling `dismissWelcomeStripAction`. Drawn from
  `readWelcomeState`, read per request beside the chip's read, OUTSIDE Home's cached payload (neither `credit_grants`
  nor `model_calls` moves the stamp). Every state of `STATES-welcome-credits.md`.
- **The `Where credits work` sheet** in the shipped `SocialModal` at its 440 default (the board's 460 is a misread; no new
  width): the title, R4's L6 line (`creditsPageCopy.viewsFree`, reused), the grant line, the five rows from
  `writtenForYou(resolvedCaption)` (G6), `Try it` from the shipped resolver, the lock line or `NEEDS_A_DECK` once, the
  teaser while `teaser`.
- **The /credits Welcome cell**: `expire <date>` (or the expiring form) after hydration, and `Where they work` on its own
  line opening the sheet without the teaser.
- **Acceptance**: the route × viewport inventory, a contact sheet, a probe of the strip's states and the ✕, and the
  `feature-acceptance` close-out.

## Gaps, and where each is settled

| # | Gap | Settled |
|---|---|---|
| G1 | The lot read: units, left, expiry, expired | PR 1a, `readWelcomeLot`; read per request in PR 2 |
| G2 | Dismissal per account | PR 1a, 0159 and `dismissWelcomeStripAction` (a timestamp, not `moments_spent`: the strip is not a moment) |
| G3 | Welcome forms on `creditsCopy`; `Allowance.welcomeExpiresAt` | PR 1b |
| G4 | The reader's own day | PR 1b, `localDay`: the line's welcome tail is held back by `CreditsText` until hydration; the chip gets the count and instant and words it after hydration. The plan's UTC `shortDay` is unchanged. PR 2's cell and strip draw the same way |
| G5 | Plan and welcome both expiring | PR 1b: the chip names the earlier (welcome on a tie); the line names both, welcome first |
| G6 | Rows follow `captionLineSwitches` | PR 2, through `writtenForYou` |
| G7 | About | Deferred to the launch-end About batch (one `ABOUT_VERSION` bump), Hugh's call whether this is its own entry or the redrawn `credits` entry (#2144). Owed at close-out |
| G8 | Copy | Every new string goes through `/copy-review` in the PR that adds it |

## Decisions this plan makes

- `dismissWelcomeStripAction` checks no switch: the strip draws with `WELCOME_CREDITS_ENABLED` or `PAYMENTS_ENABLED` off
  (STATES), so a switch check would refuse a close the reader can see. It refuses a reader with no unexpired lot.
- `again` beside a welcome-funded run says `uses a welcome credit`, beside `first`'s `Uses a welcome credit.`
- L5 with welcome banked reads `credit runs` rather than `paid credits` (welcome runs count toward the limit).
- With both expiring, the line's tails go in spend order (welcome, then plan).

## Not in scope

Converting leftover welcome credits on purchase, invite credits, email reminders, a new About entry in this line.
