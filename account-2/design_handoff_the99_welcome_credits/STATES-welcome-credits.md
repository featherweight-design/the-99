# States · Welcome credits (R1)

Every row of the brief's "Every state to draw", drawn on the first-run Home at 390 and desktop (States-A to States-D),
with the chip, the credit line and the `/credits` balance beside each. Fixtures: 15 credits granted Oct 21, expiring
Nov 20; free allowance 1 a day; reset 2:01 AM. Themes board: Low Sun and First Frost beside Kamigawa.

| State | Trigger | Section (Home card) | Chip | Credit line | `/credits` Welcome cell | Must not |
|---|---|---|---|---|---|---|
| Held, unused | lot exists, not expired, welcome = 15 | Whole: diamond 15, grant line `You have 15 welcome credits to try these, until November 20.`, L6 line, intro, five rows, teaser | `16 credits` | W1 `1 of 1 free · 15 welcome` | `15` · `expire Nov 20` | say "unlock"; draw any view behind a credit |
| Partly spent | 0 < welcome < 15 | Diamond and grant line carry what is left: `9 of your 15 welcome credits are left, until November 20.` | `9 credits` | W2 `… this run uses 1 of 9 welcome` | `9` · `expire Nov 20` | change colour (spending a gift is not a warning) |
| Used up | welcome = 0, not expired | Diamond 0, `You've used all 15 welcome credits. Your free credit still comes back every day.` Rows and teaser stay; leaves on Nov 20 or ✕ | never-bought chip | shipped standing | gone (cell shows only while it holds a credit) | promise more welcome credits |
| Expiring | welcome > 0, expiry within 3 days | Border and grant line `--warning`: `9 welcome credits expire in 3 days, on November 20.` | `10 credits`, line `9 welcome credits expire Nov 20` | W4 tail `9 welcome credits expire Nov 20` | `expire in 3 days, Nov 20`, `--warning` | use `--danger`; arrive as a moment or over an open surface |
| Expired | expiresAt <= now | Absent | never-bought chip | shipped standing | absent | leave a last line |
| No lot | no welcome row | Absent, as shipped | never-bought chip | shipped | absent | invent a fallback grant |
| Switch off, lot held | welcomeCreditsEnabled false, lot exists | Draws as held (teaser while payments on) | `13 credits` | `… 1 of 12 welcome` | kept | hide true facts about credits the reader holds |
| Payments off, lot held | paymentsEnabled false, welcome > 0 | Draws without the teaser | count, no `Get more credits` | no `Get more credits` | kept; page reduced | draw a disabled teaser or buy control |
| Paid limit | paidAtLimit true (needs a purchase) | Unchanged, no teaser (bought) | `30 credits` | W6 `Today's 20 credit runs are used. 9 welcome and 21 paid are banked · back at 2:01 AM` | `9` | use `--danger` |
| Also bought | everBought true | Teaser gone; the rest stays until the date or ✕ | total, one number | `1 of 1 free · 15 welcome · 40 paid` | beside Packs | promise leftover conversion on purchase |
| Dismissed | ✕ pressed (per account) | Absent for good | as the lot's state | as the lot's state | as the lot's state | come back on another device |

Order of the line's segments is the spend order: free, welcome, paid (plan and packs as one number).
Dates render in the reader's own day, after hydration.
