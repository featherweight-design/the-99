# States · Welcome credits (R2)

R2-States draws each state as the Home strip, on the Home it can happen on, at 390 and desktop. Before a collection
nothing can run, so a lot can only be whole there. Fixtures: 15 credits granted Oct 21, expiring Nov 20; free 1 a day;
reset 2:01 AM. Chip, credit line and Welcome cell as R1 (Line-and-Chip, Credits-Page).

| State | Trigger | Home | Strip | Sheet | Chip | Welcome cell | Must not |
|---|---|---|---|---|---|---|---|
| Held, unused | lot, not expired, welcome = 15 | first-run (or dashboard) | `15 welcome credits to try the tools, until Nov 20. Where they work` ✕ | whole; first-run: lock line, no Try it | `16 credits` | `15` · `expire Nov 20`, then `Where they work` on its own line | say "unlock"; draw a view behind a credit |
| Expiring | welcome > 0, within 3 days | either | `--warning` border, mark and count: `15 welcome credits expire in 3 days, on Nov 20.` | grant line `--warning` | warning chip, `… expire Nov 20` | `expire in 3 days, Nov 20` | use `--danger`; arrive over an open surface |
| Expired | expiresAt <= now | either | absent | unreachable | never-bought | absent | leave a last line |
| No lot | no welcome row | either | absent | unreachable | as shipped | absent | invent a grant |
| Switch off, lot held | welcomeCreditsEnabled false | either | as held | as held | as held | kept | hide true facts |
| Payments off, lot held | paymentsEnabled false | either | as held | no teaser | no `Get more credits` | kept; page reduced | draw a disabled buy control |
| Partly spent | 0 < welcome < 15 | dashboard only | `9 of your 15 welcome credits are left, until Nov 20.` | Try it per deck state | `9 credits` | `9` | change colour |
| Used up | welcome = 0, not expired | dashboard only | `You've used all 15 welcome credits. See packs and the monthly plan` (or `Your free credit comes back each day.`) | not linked | never-bought | absent | promise more welcome credits |
| Paid limit | paidAtLimit (needs a purchase) | dashboard only | as partly spent | no teaser | count | kept | use `--danger` |
| Also bought | everBought | dashboard | as held | no teaser | total | beside Packs | promise leftover conversion |
| Dismissed | ✕ pressed (per account) | either | absent for good | still from the Welcome cell | as the lot | as the lot | come back on another device |
