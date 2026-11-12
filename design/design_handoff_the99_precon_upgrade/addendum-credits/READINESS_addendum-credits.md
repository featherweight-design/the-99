# Readiness Review — Upgrade this precon, the credits path (addendum-credits)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-12 (cold read against origin/main at df3509205, after #2898 merged)
**Related ticket(s):** PR #2899 (this addendum); parent handoff R2d (PR #2794); A2c (PR #2873); A3 close-markers (#2898 merged, #2897 open)
**Plan PR target:** TBD

## Summary

The addendum is buildable on today's code with no Design round. Every piece it reuses exists as named: `GetMoreLink` and `splitGetMore` (`src/components/ui/credits-text.tsx`), `creditsCopy.withMore` (`src/lib/copy/credits.ts:145`), `preconUpgradeCopy.strategy.freeOnly` (`src/lib/copy/precon-upgrade.ts:89`), `runFunding` (`src/lib/model/allowance-rule.ts:271`), `creditLineKind` (`src/lib/model/credit-line.ts:44`), the `--warning` token, and the landing's `CreditTips` rows and diamond tiles. `panel.allowance` already carries `payments` (`withPayments`, `src/lib/precons/upgrade/run.ts:142`), so the link needs no new read. The shipped divergence it names is real: the Strategy press line at 1 credit is `freeOnly` without `withMore` (`upgrade-flow.tsx:146`, cited as :143 before #2898). Six clarifications remain. The largest: G23's shortfall rule (`short`, or `spent` with kind `spent`) also catches readers for whom the sentence is false: a daily limit of 2 or more (owner, friend groups), the paid limit shut with a free credit left (L6), and a lot held but only 1 paid run left today. The plan narrows the rule. Two shipped addenda landed after the boards were drawn (A3 #2898, A4 #2896), so `scratch-gen/crpatch.diff` no longer applies and the intro foot follows A3, not the boards. Wording goes to `/copy-review`.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Both asks from the brief are answered (README calls 1 to 6), the locks are restated (2 credits a run, a free credit covers 1, welcome stays 15), and "Not drawn" names what is out (Commander and Bracket at 1/0, the deck-page flow, the phone tip overhang).
- [🟡] The in-app "Written for you" list (`writtenForYouCopy.rows`, `src/lib/copy/discovery.ts:116`, read by `src/lib/discovery/showcase.ts` and `src/lib/copy/welcome-credits.ts`) also lists the paid tools and has no Upgrade row. The addendum is silent. Not a Design gap (it's a copy row in a drawn pattern); flagged for the orchestrator as a follow-up, wording through `/copy-review`.

### 🎭 State coverage

- [✅] Intro and Strategy at 1 and 0 credits, payments on and off, phone (390) and desktop (1300): all eight drawn (C1, C2). Back from Credits (C3) at both widths. Funded, paid limit, owner share and paused stay shipped (STATES table).
- [✅] Landing L1 (listed), L2 (tip open) at both widths; shipped baseline drawn for comparison.
- [🟡] L3 (welcome credits and payments off) is drawn at 390 only. Desktop follows L1's 1300 board with the welcome tile omitted, as shipped. STATES says "No value block", but the board (`art/lp-upgrade-off-390.png`) shows the value block with the daily tile only, which is what shipped `ValueBlock` draws (`src/components/landing/credits.tsx:57-95`). The board wins.
- [🟡] G22's return is underspecified (when the flow reopens, how long the picks live). See clarification 3.

### 🔌 Data contract

- [🟡] **G23 over-catches.** `runFunding` returns `short` whenever `hasCredit` is true but no single source funds 2 (`allowance-rule.ts:285-287`). That includes (a) a daily limit of 2 or more with 1 free left, or 0 left (`spent`): for these readers (owner 10, friend groups 5) the free credits do fund a run after the reset, so "a free credit covers 1" and dropping the reset time are both wrong; (b) L6, `creditLineKind` = `limitFree` (a free credit left, lots held, the paid limit shut), which the handoff says keeps its shipped line; (c) a lot holding 2 or more with only 1 paid run left today (`paidRoom` false at 2, `hasCredit` true). See clarification 1.
- [✅] Mixed lots (1 free + 1 welcome, 1 welcome alone, 1 pack alone) are `short` and the sentence holds, as G23 says.
- [✅] The 0-credit, no-lot case is `spent` with kind `spent`; L5 (`limit`) is `spent` with kind `limit` and is correctly excluded.
- [✅] No schema or endpoint change. G24's `LandingClaims.upgrade` follows `suggestedTwo` (`src/lib/landing/claims.ts:19`, app-wide `resolveFlags(null)`); `PRECON_UPGRADE_ENABLED` is registered (`src/lib/flags/registry.ts:46`).
- [🟡] G22: after a purchase Stripe returns to `/credits?checkout=done` (`src/lib/payments/checkout-rule.ts:56`), so the browser's Back lands on Checkout, not the precon. In practice the return is the next visit to the precon or deck page, inside the same tab's session storage. See clarification 3.

### 🧱 Codebase fit

- [✅] The link is `GetMoreLink` through `CreditsText` (it splits `withMore`'s trailing line), the warning ink is `--warning` (present in `src/app/globals.css`), and the landing row reuses `CreditTips`' row, ⓘ and `Preview`. No new token or component except the `upgrade` glyph in `src/components/landing/icons.tsx` (in the diff).
- [🟡] `IntroStep` (`src/components/decks/precons/upgrade/intro-step.tsx:20`) takes only `versions`; it needs a `short` prop to draw the sentence and link under the `credit` line, as the diff does.
- [🟡] `coversEveryToolThreeTimes` and `ThreeTimes` iterate `landingCopy.tools` (`credits.tsx:10,27-49`). Adding Upgrade to that array changes `TOOLS.length` (5 to 6) and breaks the three-times claim while the switch is off. The off state must stay byte for byte (STATES): filter Upgrade out of the three-times set, as the diff does.
- [🟡] `scratch-gen/crpatch.diff` no longer applies (`git apply --check` fails on `upgrade-flow.tsx` after #2898 and `credit-tips.tsx` after #2896). It is reference only; it also carries render-only props (`initStep`, `initPicks`, `initOpen`) and dead R1a strings (`threeTimesOne`, `enoughOne`, `enoughOneV2`) that must not ship.

### ♿ Cross-cutting

- [✅] The sentence is plain text in the list item, read in order before the link; the link keeps `GetMoreLink`'s `PendingReporter`. Next stays on, so keyboard flow is unchanged.
- [✅] Performance: no new read on the flow (allowance already on the panel); the landing adds one app-wide switch to an existing claims read.
- [🟡] Analytics: none stated. The plan follows the existing `/credits` link handling; no new event.

### ⏰ Drift from reality

- [🟡] **A3 (#2898, merged df3509205) shipped after these boards were drawn.** It removed the intro's `Not now` (the title row's ✕ is the only close) and makes the intro's single press full width on a phone (`upgrade-flow.tsx:292-298`). C1's boards still draw `Not now · Next · Commander`. Build the foot as A3 ships it; the addendum's own change (sentence and link in the body, no standing line in the foot) is unaffected.
- [🟡] The desktop foot fix (`md:ml-auto` on the press group) is still needed and now matters on the intro too: with A3 the intro has one press and, in the shortfall state, no line, so `md:justify-between` drops it to the left.
- [🟡] **A4 (#2896) shipped phone tips in the list's flow.** The "Not drawn" note about the last row's tip overhanging its card on a phone is resolved by A4; the Upgrade row inherits it. L2's 390 board predates it.
- [✅] Open PR #2897 touches `src/lib/precons/upgrade/{run,store,facts,validate}.ts` and `src/db/schema.ts`; this addendum needs none of those files (the allowance and `payments` are already on the panel). No overlap. #2898 overlapped `upgrade-flow.tsx` and `precon-upgrade.ts` but is merged; the plan builds on it.

### 📝 Decision log

- [✅] Calls 1 to 6 are numbered and the R1b change is dated (Hugh, 2026-11-12). Gaps G22 to G24 are numbered clear of A3's G19 to G21. Must-nots are listed.
- [🟡] The folder's own `READINESS.md` is Design's self-assessment (Green); this file is the audit of record.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Narrow G23.** The shortfall states (C1a to C1d, C2a to C2d) apply only when all hold: `runFunding(allowance, 2)` is `short` or `spent`; the reader's daily `limit` is below 2 (so free credits can never fund a run); `creditLineKind` is not `limit` or `limitFree`; no lot holds 2 or more (so it is not the paid limit with 1 run left); and neither `ownerShare` nor `paused`. Every other blocked reader keeps the shipped line, with the shipped-fix `withMore` added to `freeOnly` where payments are on. Follows the handoff's own rule that L5, the owner's share and the pause keep their shipped lines.
2. **Intro foot after A3.** In the shortfall state the intro foot is the single `Next · Commander` press, full width on a phone, right-aligned on desktop (`md:ml-auto`), with no standing line. Funded states keep the shipped standing line.
3. **G22 picks.** On a press of `Get more credits` from the flow, store `{ commander, bracket, strategy }` in session storage keyed by the precon file. The next press of the entry (precon page) or the band (deck page) opens the flow at Strategy with those picks, after validating them against the current panel (`commanderOf`, `strategiesFor`; any pick no longer offered falls back to `impliedPicks`). The flow never opens itself on page load. Stored picks clear on a confirmed run or when the player closes the flow from the intro. The press is on when the refreshed panel funds the run (C3).
4. **Landing off state.** Upgrade is filtered out of `TOOLS` for `coversEveryToolThreeTimes` and `ThreeTimes`; with `claims.upgrade` false the section is byte for byte as shipped, pinned by a test.
5. **Twice check.** Beside `coversEveryToolThreeTimes`, a pure `coversEveryToolTwice(welcome, tools)` sums each listed tool's low cost (Upgrade 2, every other 1: 7) and requires `units >= 2 × 7`. The cost strip draws whenever Upgrade is listed and the value block shows; the sentence only when the check holds. The chip reads `1–2 per run` while Upgrade is listed, whatever `suggestedTwo` is.
6. **L3 desktop.** Built from L1's 1300 board without the welcome tile, as shipped; no new board needed.

## Decisions inherited

- Hugh approved the addendum as R1b on 2026-11-12, including the cost strip replacing the three-times picture.
- Locked: an Upgrade costs 2 credits, a free daily credit covers 1 (the default limit), welcome credits stay 15.
- Never turn `Next · Commander` off for a shortfall; never show `Get more credits` with payments off; never show a reset time as the answer to a shortfall (for readers inside clarification 1's rule); never say the shortfall twice on one screen.
- A3's foot (no `Not now`, the ✕ in the title row) and A4's phone tips stand.
- R2d and A2c stand except where this addendum says otherwise; the deck page's flow takes the same states unchanged.
- Copy in `copy strings.ts` is DRAFT and goes through `/copy-review`.
