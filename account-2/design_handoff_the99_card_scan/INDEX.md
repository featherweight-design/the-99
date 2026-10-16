# The 99 — Card scanning · R1 handoff package

Scan cards with the phone's camera (or a webcam, or photos on desktop): download the card index once, choose Fast or
Normal, shoot a batch confirming each card, review the batch on the Add cards list, then add it with one Save.

Source of truth: `docs/superpowers/research/2026-10-15-card-scan-feasibility.md` on branch `scan-real-photos`, with
its **Real photos, 2026-10-16** section, and Hugh's brief of 2026-10-16 (project thread "Card scanning").

## Start here

| Read | For |
|---|---|
| **`The 99 - Card Scan (R1).dc.html`** | **The calls, the locks and the gaps, in one board.** |
| `R1 - Start-Phone.dc.html` | E1 the Scan press in the Add cards sheet; D1–D7 the index (ask, downloading, offline, paused, stopped), camera blocked, ready. |
| `R1 - Viewfinder-Phone.dc.html` | V1–V9: looking (Fast, Normal), unsure, sure, held under a finger, added, not sure (top three), dark with and without a light, light on. |
| `R1 - Review-Phone.dc.html` | R1–R4 re-scanning the same card (duplicate vs second copy); L1–L4 the review on the Add cards list, fixing a wrong card, Normal's printing step, saved. |
| `R1 - Desktop.dc.html` | W1–W6: the Scan press, the webcam panel in the sheet (sure, not sure), photos, the index, no webcam. |
| `R1 - About-Entry.dc.html` | The new About entry, desktop and phone. |
| `README.md` | Each open question answered, with reasons; the gap report. |
| `STATES-card-scan.md` | The matrix. |
| `READINESS.md` | R1's verdict and what engineering needs. |
| `card-scan · copy strings.ts` | Every new string, for `/copy-review`. |
| `about · scanning your cards.ts` | The About entry as code. |
| `design-tables/card-scan.md` | The property table. |
| `brand/` | The locked brand sheet. |
| `art/` | The card images the boards use (uploaded to the canvas as assets; the boards reference them by `/_blob` url). |

Open the `.dc.html` files with `support.js` beside them. The same canvas is live as a Design artifact in account 2.

## The answer in one line

A **Scan** press beside the Add cards search opens a full-screen camera; a card's name shows only once it holds steady,
one press adds it (or one of the top three when we're not sure), and Review lands the batch on the shipped Add cards
list, where a wrong card is fixed from its name and one Save adds the lot.
