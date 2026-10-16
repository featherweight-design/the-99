# The 99: Discovery and onboarding · R1 handoff package (the moments), approved

How a player learns what the app can do. R1 is the moments: a one-line, quiet introduction to a tool, pointed at the
control that opens it, the first time the player's own data makes it useful.

Source of truth: `docs/superpowers/design-briefs/2026-10-16-discovery-and-onboarding.md` (main, #1914).

## Start here

| Read | For |
|---|---|
| **`Main.dc.html`** | **The calls: the quiet form (Q1), which moment wins (Q2), the Friends Home card (Q8), and the index of all 16.** |
| `Deck-Page.dc.html` | M1 Top off, M2 Suggested changes, M3 Proposed cuts, M4 Mana Balance, at 1280 and 390. |
| `Deck-Rows.dc.html` | M5 Cheaper stand-ins, M6 Friends' spares, M7 Card assignments. |
| `Card-Details.dc.html` | M8 Find a deck, M9 Wishlist. |
| `Games.dc.html` | M10 Matchups, M11 Friends after the first game. |
| `Pages.dc.html` | M12 Help me choose, M13 Lineup, M14 Precons, M15 Collection Sync. |
| `Home-Friends.dc.html` | M16 the Friends Home card, and the banner winning Home. |
| `States.dc.html` | S1 dismissed, S2 switch off, S3 two qualifying on one visit. |
| `Moment.dc.html` and the other parts | The bubble and the shipped screens every board mounts. |
| `README.md` | Locks held, the calls with reasons, where each moment points, gaps G1–G10. |
| `STATES-moments.md` | A moment's life, and the matrix per moment. |
| `READINESS.md` | Green: R1 approved by Hugh, 2026-10-16. What engineering needs. |
| `discovery · copy strings.ts` | Every line, as placeholders for `/copy-review`. |
| `design-tables/discovery.md` | The property tables. |
| `brand/` | The locked brand sheet. |
| `art/` | The card art the boards use (uploaded to the canvas; boards reference it by `/_blob` url). |

Open the `.dc.html` files with `support.js` beside them. The same canvas is live as a Design artifact in account 1.

## The answer in one line

*A moment is one quiet line beside a control the screen already has: it moves nothing, spends nothing, and shows once.*

---

# R2 · the showcase and About as a reference

Round 2, beside R1. The canvas is in `r2/`: open its `.dc.html` files with `r2/support.js` beside them. It is live as a Design artifact
in account 1 (`The 99 - Discovery R2 · Showcase and reference`).

| Read | For |
|---|---|
| **`r2/Main.dc.html`** | **The calls: About's two tabs (C1), the fourteen tools (C2), Try it (C3), the ? (C4), the Reference (C5), the links (C6).** |
| `r2/Showcase.dc.html` | S1: Tools at 1280 and 390. |
| `r2/Tool-Card.dc.html` | T1, anatomy; T2, Try it by how many decks fit; T3, where it lands. |
| `r2/Help-Deck.dc.html`, `Help-Shopping`, `Help-Collection` | H1–H3: the ? on the deck page, Shopping and Collection, with search. |
| `r2/Reference.dc.html`, `Reference-Search` | R1–R3: the full list, and search with results and with none. |
| `r2/Links.dc.html` | L1–L2: where each place leads, and no dead ends. |
| `README-r2.md` | Locks held, the calls, every entry's screen, gaps G11–G21. |
| `STATES-showcase-reference.md` | Every state of a card, Try it, the ? panel and the Reference. |
| `READINESS-r2.md` | R2 for audit, and E8–E15 for the plan. |
| `discovery-r2 · copy strings.ts` | Every new string, as placeholders for `/copy-review`. |
| `design-tables/discovery-r2.md` | The property tables. |
| `r2/art/` | The staging captures and crops. They are uploaded to the canvas, and the boards reference them by their `/_blob` url. |

*Every tool on the screen it lives on; every entry on the screen it explains, one ? away.*
