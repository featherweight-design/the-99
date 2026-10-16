# The 99 — Rule 0 table check · R1 handoff package (for audit)

A pod surface: seat tonight's players from a pod, give each a deck, and read whether the table is balanced. Phone first
and desktop. Behind its own switch (needs `SOCIAL_FRIENDS_ENABLED`); logging needs `SOCIAL_GAMES_ENABLED`.

Source of truth: `docs/superpowers/design-briefs/2026-10-16-rule-zero-table-check.md` (main).

## Start here

| Read | For |
|---|---|
| **`The 99 - Rule Zero (R1).dc.html`** | **Start here: the four calls, the locks, the gaps.** |
| `R1 - Entry-Phone.dc.html` / `R1 - Entry-Desktop.dc.html` | The pod card's row, a table open, Home's table card, switch off. |
| `R1 - Setup-Phone.dc.html` / `R1 - Setup-Desktop.dc.html` | Who's playing, too few, a deck for each seat, a friend's decks. |
| `R1 - Read-Phone.dc.html` / `R1 - Read-Desktop.dc.html` | Balanced, high, low, two outliers, split, ranges, drifted, not ready, read on the spot, not enough. |
| `R1 - Swap-Phone.dc.html` / `R1 - Swap-Desktop.dc.html` | The suggestion, the swap, Change deck, another seat's view before and after. |
| `R1 - Log-Phone.dc.html` / `R1 - Log-Desktop.dc.html` | Log this game, the pre-filled log, games off, expired. |
| `README.md` | Each decision with its reason; the gap list. |
| `STATES-rule-zero.md` | The matrix. |
| `READINESS.md` | R1's verdict and what engineering needs. |
| `rule-zero · copy strings.ts` | Every new string, for `/copy-review`. |
| `brand/` | The locked brand sheet. |

The same canvas is live as a Design artifact in account 1. Open the `.dc.html` files with `support.js` beside them.

## The answer in one line

A row on the pod card seats tonight's players; every seat's phone shows the same read, the five brackets on one rail
with each seat's face, flags any deck a bracket or more from the middle with what puts it there, offers only that
player their own closer decks, and logs the game with the table already across from you.
