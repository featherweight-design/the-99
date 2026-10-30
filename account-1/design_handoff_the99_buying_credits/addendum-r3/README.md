# The 99 · Buying credits · R3 addendum (for Hugh's audit)

`design_handoff_the99_buying_credits/addendum-r3/` · 2026-10-18 · account 1

Small redraws and missing states on the shipped buying-credits handoff (`/credits`, the credit chip, the paid meter, Help me choose's credit line). No new surface, token, string or motion. Source of truth: this handoff as merged, and the shipped code on main at `c81e35e` (plus PR #2066 for item 9). Where engineering departed from a board, the shipped value is Hugh's ruling, and these boards redraw to it.

Design canvas: **The 99 · R3 addendum · Buying credits and discovery** (account 1). Its entry board, `Main.dc.html`, lists all fourteen items across both handoffs.

## Files

| File | Items |
|---|---|
| `Main.dc.html` | All fourteen items, with answers and where each is drawn |
| `Credits-Pack.dc.html` | 1, 2 |
| `Credits-Balance.dc.html` | 3, 4, 7 |
| `Credits-Chip.dc.html` | 5, 6, 8, 11 |
| `Credits-Line.dc.html` | 9, 10 |

Every board is drawn from the shipped components (`credits/*.tsx`, `shell/credit-chip.tsx`, `lib/payments/chip-rule.ts`, `intake/intake-form.tsx`) in the six themes' own tokens from `src/app/globals.css`. Ratios are WCAG 2 contrast, tints composited in sRGB over their real ground.

## Items and answers

| # | Item | Answer |
|---|---|---|
| 1 | Pack button (R1 Billing-Page, R2b Picks, copy `buy`) | **Confirmed.** Redrawn as `Buy pack`. Accessible name `Buy pack: 40 credits · $5` (`pack.buyAria`): the visible words lead the name, so a second pack on sale stays distinct. |
| 2 | Diamond numeral | **Confirmed.** 21px, the face's bold, `lining-nums`, `text-box: trim-both cap alphabetic`. Measured at 4× in all six faces: the ink centre is within 0.5px of the diamond's centre in every one. Metamorphous (First Frost) has no lining figures (its 4 descends; ink 21.5px tall), and the shipped 3px pad on `.offer-numeral` is what centres it (+0.25px). No change. |
| 3 | Packs cell `+N` (R1 Checkout-Return) | **Confirmed rule:** `+N` shows only while the Packs cell holds more than N. A first purchase (40 of 40) shows no `+40`; the band says it. A second (80) shows `+40` in `--success` until the reader leaves. |
| 4 | support@the-99.dev as a link | **Design's call.** One mailto link (`SupportLink`) in the Refunds line and in R4's slow-return sentence. Measured, `--accent` on the band's `--surface` is 4.25:1 in Oil Haze and 4.46:1 in First Frost, under 4.5. Drawn in `--fg` with its underline in `--accent`: 10.60:1 at the lowest, both sentences, every theme. (On the Refunds line's `--bg`, `--accent` clears, 4.51:1 lowest; one rule for one component is simpler.) **Depends on the text inks addendum** (`design_handoff_the99_themes/addendum-text-inks/`, R1, 2026-10-17): if Hugh approves it first, its `--accent-text` clears 4.5:1 on every ground and the link just uses it like every other text link; the `--fg` treatment is only for without it. |
| 5 | Chip on the phone: 44px pill or hit area? | **Confirmed shipped:** the pill itself is 44px in the sheet (`min-h-[44px]`). The desktop popover keeps 30px. |
| 6 | Undrawn chip cases | **Confirmed, drawn from `chipFor`.** Paid limit, free spent: `◆ 94 credits ›`, filled (the count is what is held; the limit is said on the credit line, L5, and on `/credits`, P5b). Spent, payments off, once bought: `0 credits`, hollow, no `Get more credits`. Expiring with payments off: unchanged expiring chip with its line; expiry is a fact, not an offer. |
| 7 | P5/P5b clock clause | **Confirmed:** drawn on first paint (no time) and after hydration. **Noted while drawing:** with three cells at 390 the Free cell is 94px inside, so `reset at 2:01 AM` wraps to two lines past the one line `min-h-[14.7px]` reserves; the strip grows 15px at hydration, as does the near line (two lines to three). A note for engineering, not a redraw: reserving two lines (29.4px) for the Free cell's sub at 390 when three cells show would hold the strip still. |
| 8 | Chip count contrast (R1b Themes) | **Confirmed `--fg`:** 8.17:1 at its lowest (First Frost) on the chip's 16% accent tint, sheet and popover grounds. A tint that also clears is `color-mix(in srgb, var(--accent) 35%, var(--fg))`, 6.15:1 lowest, drawn for comparison and not proposed. Measured, `--accent` on its tint is 4.48:1 in Low Sun (the brief's 4.10 matches Oil Haze's accent straight on the menu, 4.14); it fails in Low Sun, Oil Haze (3.48) and First Frost (3.44). |
| 9 | "114 paid." no-break space (R1 Credit-Line, L2/L3) | **Confirmed** (PR #2066): `paid()` joins the count and its word with U+00A0; drawn before and after at Help me choose's 380px line and the 390 dock. |
| 10 | 390 Help me choose dock with L4's `Get more credits →` | **Design's call.** Measured, the dock is 138px with the link (Hugh's ~145). On the phone, `Get more credits →` moves out of the dock to under the *Anything else?* box, after its spent caption `Kept here for when a credit comes back.` (44px, left-aligned with the field). The dock keeps the press and its line: 92px. No new string. Still its own line under a line saying nothing can be spent, and only while payments are on. Desktop unchanged. Alternative if Hugh keeps it docked: a 32px link there, dock 126px. |
| 11 | Warning and accent hues, Low Sun | **Confirmed, and in every theme:** `--warning` and `--accent` are 1.11:1 (Witching Hour) to 1.71:1 apart. The expiring chip's meaning is its line, `74 plan credits expire Nov 16`, 6.17:1 lowest; the count on its tint is 4.89:1 lowest. |

## For Hugh

Three calls want your word: **4** (the address in `--fg` with an accent underline), **10** (Get more credits moves to the box on the phone) and, in the discovery addendum, **12**.

## For engineering, once approved

- Item 4: `SupportLink` draws `text-[color:var(--fg)] underline decoration-[color:var(--accent)]` (one component, both sentences).
- Item 10: in `intake-form.tsx`, the phone dock's line drops `Get more credits` (`formLine` without `withMore` there), and the field renders `CreditsText`'s `Get more credits →` link under `captionSpent` below `md`. Desktop's line keeps `withMore`.
- Item 7 (optional): `min-h-[29.4px] md:min-h-[14.7px]` on the Free cell's sub when three cells show.

## Not in this round

The plan card (K1 to K6) is not on shipped `/credits` yet; nothing here touches it. No About entry: no feature launches here.
