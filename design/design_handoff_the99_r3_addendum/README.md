# The 99 — R3 addendum: buying credits and discovery onboarding (design handoff)

`design/design_handoff_the99_r3_addendum/` · 2026-10-18 (relayed 2026-10-21) · Hugh relayed it, so it is already reviewed.

Board: `R3-addendum-credits-discovery.html` (a bundled canvas, 11MB; open it from disk, never read it whole). Six boards
plus the Friends-on-Home parts the discovery boards mount (unchanged, that handoff's). Source of truth: the two shipped
handoffs, `design_handoff_the99_buying_credits/` and `design_handoff_the99_discovery_onboarding/`. Where engineering
departed from a board, the shipped value is Hugh's ruling and these boards redraw to it. No new surface, token, string or
motion. The prompt it answers: `boards/design-prompts-2026-10-18.md` §3.

Eleven items confirm what shipped; three are Design's calls (4, 10, 12).

| # | Item | Answer | Board |
|---|---|---|---|
| 1 | Pack button | Confirmed. Reads `Buy pack`; accessible name `Buy pack: 40 credits · $5`. 44px full width at 390, 40px beside `Checkout on Stripe · US cards` at desktop (463px offers column). | Credits-Pack §1 |
| 2 | Diamond numeral | Confirmed. 21px, face's bold, `lining-nums`, `text-box: trim-both cap alphabetic`; ink within 0.5px of centre in all six faces. First Frost (Metamorphous) has no lining set; the shipped 3px `.offer-numeral` pad centres it. | Credits-Pack §2 |
| 3 | Packs cell `+N` | Confirmed. `+N` only while the cell holds more than N; a first purchase leaves it to the band (`40 pack credits added`). `+N` in `--success`. | Credits-Balance §3 |
| 4 | `support@the-99.dev` as a link | **Design's call.** One mailto link in the Refunds line and the slow-return sentence (`SupportLink`). Drawn in `--fg`, underlined in `--accent` (10.60:1 lowest on the band, 12.06 on `--bg`), because `--accent` on the band's `--surface` is 4.25 in Oil Haze and 4.46 in First Frost. If the text-inks addendum's `--accent-text` lands first the link moves to it. | Credits-Balance §4 |
| 5 | Chip height on the phone | Confirmed. The pill itself is 44px in the sheet; 30px in the desktop popover. Nothing pads it invisibly. | Credits-Chip §5 |
| 6 | Undrawn chip cases | Confirmed. Paid limit with free spent: `94 credits`, filled. Spent, payments off, once bought: `0 credits`, hollow. Expiring with payments off: as expiring (`74 plan credits expire Nov 16` under the chip). | Credits-Chip §6 |
| 7 | P5/P5b clock clause | Confirmed. Drawn after hydration only, both sides. The Free cell's sub wraps at 390 with three cells, so the strip grows 15px on hydration (note for engineering: reserve two lines, 29.4px, to hold it still). | Credits-Balance §7 |
| 8 | Chip count ink | Confirmed. `--fg` clears 8.17:1 lowest (First Frost) on the 16% accent tint. A 35% accent tint (`color-mix(in srgb, var(--accent) 35%, var(--fg))`, 6.15:1) is drawn for comparison, not proposed. | Credits-Chip §8 |
| 9 | `114 paid.` | Confirmed (PR #2066). Count and `paid.` join with a no-break space at both widths. | Credits-Line §9 |
| 10 | 390 dock with `Get more credits →` | **Design's call.** On the phone `Get more credits →` moves from the dock to directly under the `Anything else?` box, under its spent caption (`Won't be read: 0 of 5 left · reset at 2:01 AM.`), 44px, left-aligned with the field. The dock keeps the press and its line and drops from 138px to 92px. No new string. Desktop unchanged. Shows only while payments are on, as today. Alternative if Hugh prefers the dock: the link at 32px there (dock 126px). | Credits-Line §10 |
| 11 | Warning vs accent | Confirmed in every theme (1.11 to 1.71:1 apart; Witching Hour closest). The line under the expiring chip (`74 plan credits expire Nov 16`, 6.17:1 lowest) carries the meaning; colour only agrees. | Credits-Chip §11 |
| 12 | Find a deck's landing at 390 | **Design's call.** Yes: while a Find a deck landing waits, the next card opened at 390 opens at the full sheet (the teaser-to-full snap; a cut under reduced motion), its `Find a deck for it →` door scrolled into view under the Mana Pool link and haloed 2.4s with R1's ring, once. Nothing is pressed: no credit moves. Pull down or Escape returns to the teaser. Engineering: the deferred landing hands the provider a one-shot when the card carries a fits door; a card without one (not Commander-legal, or no deck) opens at the teaser and the landing keeps waiting. | Discovery-Landing |
| 13 | Replay step 1 with data | Confirmed. The Collection slot lit at 1280 (rail) and 390 (tab bar), with the replay body `Start with what you own` / `Everything here is built from your collection. Drop in a new file whenever it changes.`, no precon line, footnote `Six stops · about a minute · ✕ skips the tour`. Ring: 5px room, 14 corner; card 24 right of the slot and 32 above at 1280. | Discovery-Replay §13 |
| 14 | Replay card over the open bar | Confirmed. 86px: the open bar is 74, the card foot sits 12 above it; the lit tab's ring reaches 3px above the bar, leaving 9px of scrim to the card. Step 2 (tallest card) grows upward. The locked bar keeps 100. | Discovery-Replay §14 |

Existing code: `src/components/credits/`, `src/components/shell/credit-chip.tsx`, `src/components/intake/intake-form.tsx`,
`src/components/discovery/`.
