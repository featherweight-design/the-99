# States · You have it R2

## Request history rows (an offer)
| Tab | State | Kicker (ink) | Title | Line |
|---|---|---|---|---|
| From you | open | `Offered` (accent) · day offered | `You offered {card} to {friend}` (`You offered {n} {card} to {friend}`) | `{n} days left. Withdraw it from {friend}’s Wishlist tab.` |
| From you | yes | `Accepted` (success) · day answered | `{friend} said yes to {card}` | `Offered {date}` |
| From you | no | `Declined` (faint) · day answered | `{friend} passed on {card}` | `Offered {date}` |
| From you | expired | `No answer` (faint) · 14th day | `{friend} didn’t answer about {card}` | `Offered {date}` |
| From you | withdrawn | `Withdrawn` (faint) · day withdrawn | `You withdrew your offer of {card} to {friend}` | `Offered {date}` |
| To you | open | `Waiting on you` (accent) · day offered | `{friend} offered you {card}` (`… {n} {card}`) | `{n} days left. Answer it under Waiting on you.` |
| To you | yes | `Accepted` (success) | same title | `You said yes. The handover is between you.` |
| To you | no | `Declined` (faint) | same title | `You said no.` |
| To you | expired | `No answer` (faint) | same title | `It ran out after 14 days without an answer.` |
| To you | withdrawn | not shown | | |

Ask rows are unchanged. Months, 30 a page, Show older, the ex-friends foot line: as shipped (copy names offers).
Empty: From you `Nothing from you yet`; To you `Nothing to you yet` (bodies in `copy strings.ts`).

## The offerer's answer sheet
| State | Draws |
|---|---|
| Home item | Kicker `Your offer` · age, diamond while unseen, title and line as shipped, press `Your offer ›`, ✕. |
| Opening | The press `aria-busy`; nothing else moves. |
| Accepted | `Your offer` sheet: row kicker `Accepted` · age, `{friend} said yes to {card}`, `Hand it over when you meet; …`, mono `Offered {date} · {n} copy`. Foot `Request history ›`. |
| Declined | Kicker `Declined` (faint), `{friend} passed on {card}`, `Nothing else changes.`, the mono line. |
| Refused or failed open | Goes to `/friends/requests`. |
| Close (✕, Esc, scrim) | Focus back on the press. The item stays; its diamond is gone for the visit. |

## Spares under the Offer threshold (friend's Wishlist tab)
| State | Draws |
|---|---|
| 0 < your spares < threshold, not kept back | Press: faint glyph, dashed box, name `You have a spare {card}, under your threshold of {n}`. |
| Kept back, or no spare | Nothing (as shipped). |
| Only under-threshold spares on the list | Call-out `You have {m} spare(s) under your threshold` / `{names}. You offer a card from {n} spare copies; change it in Settings › Spares.` No filter. Key: `under your threshold`. |
| Offerable and under-threshold | Call-out as shipped, body ends `{m} more is/are under your threshold.` Filter counts offerable only. Key adds `under your threshold`. |
| Filtered to You can spare | Offerable tiles only. |
| Sheet on an under-threshold card | Row `{n} spare(s)` / `under your threshold of {t}`, no Offer. Foot `You offer a card only when you have {t} or more spare copies.` + `Change it in Settings ›`. |
| Settings › Spares | Under the threshold sentence: `This also decides which cards you can offer from a friend’s wishlist.` |
| Threshold lowered in Settings | The next visit to the tab draws the press as offerable (no live update across pages). |
