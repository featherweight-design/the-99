# Readiness · Welcome credits (R2)

**Approved (LGTM, Hugh, 2026-10-21), R2 with two fixes: the teaser reads `See packs and the monthly plan`, and `Where they work` sits on its own line in the Welcome cell. Self-assessed: Green for the build,
with six items engineering settles in the plan.** Every board was rendered headless and checked: no board cut
off, no broken image, no em dash in any string, never the word "unlock".

**Build from** the `R2-*` boards (README "R2"), with Line-and-Chip and Credits-Page from R1 and `Main.dc.html` for the gaps. Where R1 and R2 differ, R2 wins.

**The brief's rulings, closed and honoured** (table on Main)
- The lot: 15 credits, 30 days, spent after the free credit and before plan and packs.
- `Try it` only on tools with a landing of their own; the shipped needs-a-deck reason line, once.
- No view drawn behind a credit; never "unlock"; no new account-menu row.
- Payments off: teaser and every buy control absent, never disabled.
- Nothing arrives on the tour's visit or over an open surface; nothing promises leftover conversion.
- Expiring 3 days out, dated in the reader's own day.

**Design's calls (for Hugh)**
1. Placement B as a one-line strip high on Home, the list in the shipped sheet and modal (R2).
2. Before a collection no Try it (the shipped lock line once); cards in, no deck: Help me choose leads, the reason line once over the other four.
3. Welcome as its own segment on the line; the chip keeps one number.
4. Welcome cell `expire Nov 20`.
5. Expiring in `--warning` on every surface that names the lot.
6. One teaser line, gone once anything is bought.
7. Bare ✕ dismisses for good (per account); expired leaves nothing.

**Settle in the plan** (README G1 to G6)
1. Per-request read of the lot outside the cached Home payload.
2. Dismissal stored per account.
3. `creditsCopy` welcome forms and the welcome expiry on `Allowance`.
4. Local-day dates (the shipped `expiring` and `shortDay` read UTC).
5. Plan and welcome both expiring: the chip names the earlier.
6. Rows follow `captionLineSwitches`.

**Not in this round:** the About entry (G7, Hugh's call, batched at launch); copy (G8, /copy-review).

## Engineering audit (2026-10-21, against `main` at ace45d6ae, rebased)

**Verdict: Green.** Every claim the boards make about shipped code was checked against the tree. None is wrong in a
way that changes what is drawn. G1 to G6 are engineering's and are settled in the plan. G7 is Hugh's, at the launch
About batch. G8 goes to /copy-review.

| Claim | Holds? | Evidence and how the build reads it |
|---|---|---|
| `WELCOME_CREDITS_ENABLED` needs `PAYMENTS_ENABLED` and gates the write only | Yes | `registry.ts:76`, `flag.ts:22-28`, sole caller `clerk-webhook/route.ts:69`. So "switch off, lot held" draws as held. |
| Spend order: free, welcome, plan, gift, pack | Yes | `SOURCE_RANK` (`credit-rule.ts:70`). The comment at `allowance-rule.ts:139` omits welcome. That is doc-sync in the build. |
| The `Allowance` carries the welcome count, not its expiry | Yes | `welcome?` (`allowance-rule.ts:141`), and only `planExpiresAt` (`:154`). G1 and G3 add one read of the grant row (units, left, expiry). |
| The chip reads per request, outside Home's cache | Yes | `shell.tsx:91` → `readChip` (`chip.ts:20-33`); total `freeCount + heldCredits` (`chip-rule.ts:31`). Home is cached (`page.tsx:177`), so the strip's read sits beside the chip's, not in the payload. |
| A `Welcome` cell exists on `/credits` | Yes | `balance.tsx:15`, shown only while `welcome > 0` (`page-model.ts:98`). The build adds its line. The Free cell already draws after hydration (`balance.tsx:62`), so that is the model for G4. |
| `expiring` and `shortDay` read UTC | Yes | `credits.ts:50-52`. G4 adds a local-day form drawn after hydration. `clockTime` is already local. |
| L6 line shipped on `/credits` | Yes | `creditsPageCopy.viewsFree` (`credits-page.ts:52`), drawn by `credits-head.tsx:16`. It is reused, not restated. |
| The five rows reused whole, and they follow `captionLineSwitches` | Yes | `writtenForYou(resolvedCaption)` (`showcase.ts:104-111`) is the rule G6 names. The sheet calls it, so every row off means no section. |
| `Try it` landings | Yes | Help me choose → `/decks/new/choose` (`tools.ts:42`). Suggested changes and Proposed cuts land on a deck (`kind: "deck"`). The shipped Try-it resolver (`showcase.ts:50-68`) picks the deck and the one-time parameter, and the sheet reuses it. No second landing. |
| Lock line and reason line are shipped strings | Yes | `refresh.ts:262` (`step2Locked`) and `discovery.ts:69` (`NEEDS_A_DECK`). |
| Nothing runs before a collection | Yes, for the strip | At 0 cards Commanders and Decks are locked (`shell.tsx:67`, `nav.tsx:59-61`) and New deck is replaced by `Add your cards` (`dashboard.tsx:62`). The strip is one component on both Homes, so a lot partly spent on first-run Home (a case no board draws) would still read correctly. |
| The sheet is "the shipped SocialModal, a 460 modal on desktop" | Partly | `social-modal.tsx:99`: the shipped default width is **440**, and the other widths are 420, 520 and 640, with no 460. The board's intent is to reuse the shipped modal, so the build uses its 440 default and adds no width. This is a misread of a number, not a design call. |
| The pack card's diamond | Yes | `OfferArt({ count })` (`offer-art.tsx:11`), CSS only. It is reused. |
| No new account-menu row; `Get more credits` absent with payments off | Yes | It is the chip's own label (`chip-rule.ts:35-36`), not a row. |
| Dismissal per account (G2) | New | `user_prefs` has no dismissed flag. The build adds one timestamp column. It is not `moments_spent`, because the strip is not a moment and that set follows `MOMENTS_ENABLED`. |
| `everBought` | Note | The chip computes it from lot sources (`chip.ts:30`) and `/credits` from `history.length > 0` (`page-model.ts:92`). The teaser uses the chip's rule, so one figure decides "nothing bought" everywhere the strip and sheet draw. |

**Not reopened:** every ruling in the brief, and every call in the buying-credits README. **About:** the entry is a
stated deferral to the launch-end batch (G7). The plan names it, and the close-out reports it as owed.
