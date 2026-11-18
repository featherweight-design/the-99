# Flip between decks + custom deck order — R2

Canvas (Design type): https://claude.ai/artifact/J1fqAViFdGh9ET3sqKZiWU (files in `canvas/`, frames in `shots/`).
Hugh's R1 feedback (2026-11-18): give a canvas, not PNGs; use the full shipped Decks and Deck Details UI; the ‹ › on the commander art (esp. phone) is out, show alternates.

## How frames were made
Every frame is the shipped shell (NavRail, MobileHeader, TabBar) plus the shipped SpineMobile / SpineDesktop or DecksView / DeckCard, rendered with the shipped CSS (kaldheim). Below the deck header, the rest of the deck page is the shipped kaldheim capture (`art/p-body.png`, `art/d-body.png`, `art/p-rows.png`). Recipe = friends_link scratch-gen: copy main, npm install, `tsconfig.json` here, `patch -p1 < proposal.diff`, `node dz/css.mjs`, `npx tsx dz/render.tsx`, `node dz/shoot.cjs`.
`proposal.diff` is scratch only: `custom` sort, Arrange row in OrderMenu, a hook for one extra header action, and render-time switches (`__WIDE`, `__SORT`, `__SORTOPEN`).

## Ways to flip (Q1)
- **A · Deck strip (recommended):** row above the band. Phone 52px: `‹ All decks` (folder name when in one) 44px link + `2 of 5` + two 44×44 ghost squares. Desktop 48px: `Decks / All decks · Last played` crumb + `2 of 5` + 32px squares; hover/focus names the deck and key.
- **B · Neighbour buttons:** under the actions row, Previous / Next each naming the deck; caption `Last played · All decks · 2 of 5`.
- **C · Switch deck:** `2 of 5` button in the actions row opening the full list (phone sheet, bare ✕; desktop menu). Desktop row overflows at 1300 (⋯ wraps).
- **D · Foot tiles:** shipped DeckCard tiles for next (phone, plus a Previous button) / previous + next (desktop) at the end of the page.
All: ←/→ on desktop with the R1 guard list, ends wrap, hidden for a one-deck list, tab kept.

## Custom order (unchanged calls from R1, now drawn in the shipped UI)
Shipped OrderMenu + `Custom` + `Arrange decks…` (phone uses the same ⇅ menu, not a sheet — R1 drew a sheet, wrong). Arrange mode: one column of rows, handle the only move control, Done/Cancel, filters step aside, folder arranges its own decks.

## Open
Q1 which flip (A rec; A + D possible). Q2 direct open falls back to All decks in saved sort (rec). Q3 new decks top (rec). Q4 folders by name (rec). Copy DRAFT.
