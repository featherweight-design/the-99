# The 99 · Discovery onboarding · R3 addendum (for Hugh's audit)

`design_handoff_the99_discovery_onboarding/addendum-r3/` · 2026-10-18 · account 1

Missing states on the shipped discovery handoff: Find a deck's landing at 390, and the tour taken again (R3·2, `/?tour=1`) on an account with data. No new surface, string or motion. Source of truth: this handoff as merged (R3b, `STATES-tour-and-need.md`, `r3/`) and the shipped code on main at `c81e35e` (`discovery/first-run-tour.tsx`, `lib/discovery/tour-steps.ts`, `discovery/use-tool-landing.ts`, `cards/fits-door.tsx`, `cards/card-modal.tsx`).

Design canvas: **The 99 · R3 addendum · Buying credits and discovery** (account 1). Its entry board, `Main.dc.html`, lists all fourteen items across both handoffs.

## Files

| File | Items |
|---|---|
| `Main.dc.html` | All fourteen items, with answers and where each is drawn |
| `Discovery-Landing.dc.html` | 12 |
| `Discovery-Replay.dc.html` | 13, 14 |
| `HomeDesk`, `HomePhone`, `Rail`, `PhoneChrome`, `Friends` `.dc.html` | Parts mounted, unchanged, from `design_handoff_the99_social_r3/addendum-friends-home/` (the shipped dashboard) |
| `art/` | Their crops, `card-dina.jpg` (from this handoff) and `screen-commanders.jpg` (from `r3/art/`). On the canvas they are uploads. |

## Items and answers

| # | Item | Answer |
|---|---|---|
| 12 | Find a deck's landing at 390 (`Card-Details.dc.html:47`): it arrives as the teaser, and the halo waits for All details. Should the landing open All details itself? | **Design's call: yes.** While a Find a deck landing waits, the next card opened at 390 opens at the full sheet instead of the teaser (the teaser-to-full snap; a cut under reduced motion), its door scrolled into view and haloed 2.4s with R1's ring. Once: the landing ends there and later cards open at the teaser. Nothing is pressed; the read starts only from the picker's own press. A card without the door (not Commander-legal, or no deck) opens at the teaser and the landing keeps waiting. 1280 is unchanged (the door is in the modal's footer). |
| 13 | The replay's step 1 on an account with data (`STATES-tour-and-need.md`, `r3/FirstRunDesk`, `r3/FirstRunPhone`) | **Confirmed, drawn.** Over the real dashboard: the rail's Collection slot at 1280 (slot 12, 110, 38 × 38; ring with 5px room, 14 corner; card 24 right of it and 32 above), the tab bar's at 390. The replay's body (`Everything here is built from your collection. Drop in a new file whenever it changes.`), no precon line, the footnote kept; the page reads from the top. |
| 14 | The replay card over the unlocked tab bar: draw it, or confirm 86px | **Confirmed 86, and drawn.** The open bar is 74 tall, so the card's foot sits 12 above it. The lit tab's ring reaches 3px above the bar (8px pad, 5px room, 6px outer ring), leaving 9px of scrim to the card. Step 2, the tallest card (its picture), grows upward and clears the same way. The locked bar keeps 100. |

## For Hugh

Item **12** is a call that wants your word. 13 and 14 confirm what shipped.

## For engineering, once approved

- Item 12: the deferred landing (`useToolLanding`, `deferred`) gives the card detail provider a one-shot "open full" for the next `load()` whose card carries a fits door; `targets.scrollToTarget` and the 2.4s halo then run as today. Spent by that open whether or not the reader stays.

## Not in this round

No About entry (no feature launches). Themes other than Low Sun are not drawn for 12 to 14; every part uses tokens all six declare.
