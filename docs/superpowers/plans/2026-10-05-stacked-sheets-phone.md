# Plan: stacked sheets on the phone (R1)

Handoff: `design/design_handoff_the99_stacked_sheets/` (README, STATES, READINESS with the engineering audit of 2026-10-05). Work is pre-approved (orchestrator, 2026-10-05). It is **phone only**: below `md`, a card opened from a sheet replaces it, and the ✕ becomes a `← {sheet}` pill. Desktop stacking is unchanged.

## PR boundaries

Each PR ships on its own and none stacks on another's branch. Order: A, B, C, D.

### PR A: geometry, the pill, the sheet underneath
- On the phone, a **card** layer drops `STACKED_SHEET` (96) and `PHONE_TOP` 96 / 140, so a stacked card draws as unstacked: card 320 × 447 at y 64, teaser top 532 at 390×812. `PHONE_TOP[52]` no longer moves a card that a list sheet opens over (call 7). Desktop keeps every offset.
- **The pill.** `← {backLabel}` draws at both widths in the ✕'s slot (y 22–54, hit target 44). Its accessible name is `Back to {label}`. It ellipsizes at a 266 cap with the counter and 354 without. The phone ✕ goes from a stacked card. States b1–b7: rest, pressed, focus ring, disabled while a Take is pending. Focus moves to it on open. Inline `Back to ${back}` strings move to `cardSheetCopy.back`.
- **List sheets over a card** (stand-ins, the Find a deck picker): `ModalChrome`'s `overCard` phone × becomes a `← {card}` pill in the sheet head.
- **The sheet underneath** a card on the phone: opacity 0 after the open, plus `aria-hidden` and `pointer-events: none`, **not `inert`** (audit A10). It stays mounted with its scroll kept. The trigger names itself to `open`, so focus returns to the opener in Safari too (audit A6b).
- **No further layer from a stacked card** (call 8, audit A4): Find a deck is withheld when a sheet is under the card.
- Tests: geometry per path, the pill's name and states, Escape full → teaser → pop, the pill skipping the teaser, and focus on open and pop.

### PR B: Take in the teaser
- On the phone, the stand-in's `footer` moves into the teaser's 44px foot row beside All details (1 : 1.35), with `in place of …` as one oracle line. `teaserHeight` stops adding `footerHeight` on the phone. In full, Take pins to the sheet's foot. The footer's price plate goes, because the teaser already shows it.

### PR C: back labels per opener
- `registerSheet` gains an optional phone label: upgrade path draws `← What would have to go` on the phone and `← {target}` on desktop (audit A1).
- **Pull it** (audit A3): the phone sheet's head name becomes a `CardDetailTrigger`. The sheet registers `Which deck to pull from` and ignores an outside press while a card is up over it. The pick is kept.
- Copy for every label goes through `/copy-review`.

### PR D: motion, the ledger, feature close
- Open: the card rises 812 → 0 over 240ms `cubic-bezier(.2,.7,.2,1)` while the sheet beneath fades. Pop: the card drops in 200ms through a short exit state in the provider. Never sideways. Reduced motion: a swap.
- Ledger: the pill's contrast across six themes, measured in build.
- About: an ordinary edit to `card-detail`'s caption, no `ABOUT_VERSION` bump.
- Feature close:
  - walk every pair s1–s8 at 390 in WebKit and in Chromium touch, plus Escape, Back, the pill and reduced motion;
  - a contact sheet;
  - the design-review property table.

## Route × viewport inventory (phone; desktop is a regression check)

| Pair | Route | Opener |
|---|---|---|
| s1 receipt → card | `/decks/[id]` Analysis | a finding tile |
| s2 what would have to go → card | `/decks/[id]` Analysis | a candidate |
| s3 reasoning / synopsis → card | `/decks/[id]` | a card name |
| s4 stand-ins → stand-in | `/decks/[id]` Shopping | a stand-in name |
| s5 Pull it → card | `/decks/[id]/changes` | the list head's name |
| s6 card → stand-ins | `/decks/[id]` Shopping | the door |
| s7 card → stand-ins → stand-in | `/decks/[id]` Shopping | door, then stand-in |
| s8 after Take | `/decks/[id]` Shopping | Take |

Change commander (`/decks/[id]`) follows the s1 rule and is checked alongside.
