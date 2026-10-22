# Close-out: Welcome credits (launch D2)

**Status: WALKED, About entry OWED.** Every surface in the inventory was loaded in a real browser at both widths and
matches R2. No defect found. The line does not close until the About entry lands (G7, below).

**Walked:** 2026-10-21, on `welcome-credits-closeout` at `origin/main` `3c18ee476`, against the plan
`docs/superpowers/plans/2026-10-21-welcome-credits.md` and the handoff `design/design_handoff_the99_welcome_credits/`
(R2, approved by Hugh 2026-10-21). Merged and in scope:

| Plan PR | What | PR |
|---|---|---|
| 1a | 0159, the lot read, the state rule, `dismissWelcomeStripAction` | #2151 |
| 1b | welcome on the credit line and the chip | #2152 |
| 2a | the Home strip and the `Where credits work` sheet | #2154 |
| 2b | the /credits Welcome cell, `probe:welcome-strip`, the inventories | #2155 |

**Where.** Neon scratch branch `scratch-welcome-credits-p2` (`br-steep-cell-a6ud95do`, from local-dev, migrated to
0159; `neon.branch_id` confirmed before every write). `next start` of this worktree on its own port with
`ABOUT_SHEET_ENABLED`, `PAYMENTS_ENABLED`, `WELCOME_CREDITS_ENABLED`, `TUNING_ENABLED`, `HELP_ME_CHOOSE_ENABLED`,
`PROPOSED_CUTS_ENABLED`, `SWAP_TOOLS_ENABLED`, `FIND_A_DECK_READ_ENABLED` and `ANALYSIS_TAB_ENABLED` on. Chromium at
390×844 and 1300×900.

**Fixtures.** The probe's own per-run Clerk test user (a welcome lot of 15, expiring in 30 days), kept with
`WELCOME_PROBE_KEEP=1 WELCOME_PROBE_STAGE=first-run` for the contact sheets. Then on that user only: the probe's twelve
collection rows (dashboard); `expires_at` moved to 2.5 days out (expiring); 6, then 15, `spent` `model_calls` rows on
the lot, with no model call made (partly spent, used up). Removed afterwards with `WELCOME_PROBE_CLEAN`; a sweep of every
`user_id` table found nothing left, and Clerk holds no `welcome-strip-*` user.

## Route inventory

Inventories: `docs/superpowers/inventories/welcome-credits-first-run.json` and `welcome-credits.json`. Every cell of
every run reached its surface (no `✗`).

| Surface | Route | 390 | 1300 | Seen |
|---|---|---|---|---|
| Strip, first-run Home | `/` | ☑ | ☑ | Under About's line, above Add your collection; the lot's mark `15`, `15 welcome credits to try the tools, until Nov 20. Where they work`, bare ✕. Above the fold at 390 (bottom 317 of 844). |
| Sheet, first-run | `/` → Where they work | ☑ sheet | ☑ modal | Title, L6 line, grant line, `Opens once your cards are in` once over all five rows, no Try it, `See packs and the monthly plan` at the foot. |
| Strip, dashboard (cards, no deck) | `/` | ☑ | ☑ | Heads the main column over Ready to build; at 1300 the right column is Commitments alone, no hole. Bottom 397 of 844 at 390. |
| Sheet, dashboard | `/` → Where they work | ☑ sheet | ☑ modal | Help me choose leads with `Try it ›`, then `Needs a deck, and you have none yet.` once over the other four; teaser at the foot. |
| Welcome cell | `/credits` | ☑ | ☑ | `WELCOME 15`, `expire Nov 20`, `Where they work` on its own line, after Free in spend order. |
| Sheet from the cell | `/credits` → Where they work | ☑ sheet | ☑ modal | The same sheet, no teaser (the probe asserts the absence; the phone photo ends at the viewport). |
| Expiring (2.5 days out) | `/`, sheet, `/credits`, chip | ☑ | ☑ | Strip `15 welcome credits expire in 3 days, on Oct 24.`; sheet grant line, cell `expire in 3 days, Oct 24`, chip `15 welcome credits expire Oct 24`. Computed colours: mark border, count and lead `--warning`, strip border a 60% `--warning` mix, grant lead and cell line `--warning`; no element resolves to `--danger`. |
| Partly spent (9 of 15) | `/`, sheet, `/credits` | ☑ | ☑ | `9 of your 15 welcome credits are left, until Nov 20.`; cell `9`; no colour change. |
| Used up (0 of 15) | `/`, `/credits`, chip | ☑ | ☑ | `You've used all 15 welcome credits. See packs and the monthly plan`, no Where they work; no Welcome cell; chip `5 free credits` (never-bought). |

Themes: both inventories in Neon Rain (Kamigawa), Low Sun (Amonkhet) and First Frost (Kaldheim); the expiring, partly
and used-up runs and the chip in Neon Rain. Accent, mark and teaser follow each theme; nothing breaks.

The grant line read `Your 5 free credits each day are spent first.` because the local allowance is 5; the board's `Your
free credit each day` is the one-credit form of the same string (`freeFirst`, both forms tested). Not a defect.

## Structural checks

- `pnpm check:shared docs/superpowers/inventories/welcome-credits.json`: `All 2 views import and use WhereCreditsWork from src/components/welcome/where-credits-work.tsx.`
- `pnpm check:shared docs/superpowers/inventories/welcome-credits-first-run.json`: `All 1 views import and use WhereCreditsWork from src/components/welcome/where-credits-work.tsx.`
- `pnpm probe:welcome-strip`: **38 of 38 PASS** (first-run and dashboard at both widths: above the fold, the held line,
  the sheet by deck state, Escape, the cell's date, no teaser from /credits, ✕ hides, writes
  `welcome_strip_dismissed_at`, and a reload draws none). The run removed its own user and rows.

## STATES walk

| State | Verdict | Evidence |
|---|---|---|
| Held, unused | drawn | first-run and dashboard sheets, all three themes |
| Expiring | drawn | expiring run, both widths, plus computed colours (`--warning`, never `--danger`) |
| Expired | covered by tests | `welcome-state.test.ts` (none by flag or date), `welcome-strip.test.tsx` (absent) |
| No lot | covered by tests | same two files |
| Switch off, lot held | covered by tests and code | Home and /credits read `readWelcomeState` with no `WELCOME_CREDITS_ENABLED` gate (`src/app/page.tsx:277`, `src/app/credits/page.tsx:89`); not drawn |
| Payments off, lot held | covered by tests | `welcome-state.test.ts` (no teaser with payments off); not drawn |
| Partly spent | drawn | partly run, both widths |
| Used up | drawn | used-up run: teaser form, no cell, never-bought chip; the free-credit form is `welcome-strip.test.tsx` |
| Paid limit | not checked | needs a purchase; the strip draws as partly spent (rule shared) |
| Also bought | covered by tests | `welcome-state.test.ts`, `welcome-strip.test.tsx` (no teaser once bought) |
| Dismissed | drawn | probe: ✕ hides, writes, a reload draws none; the cell does not take a dismissal (`Balance`), so it stays |

## Defects

None.

## About entry

**OWED; the close-out does not pass without it.** The plan's G7 defers it to the launch-end About batch (one
`ABOUT_VERSION` bump), and leaves to Hugh whether this is its own entry or the redrawn `credits` entry (#2144). This row
is ticked when that lands.

## Follow-ups

None beyond the About entry.
