# Touch sizes and missing states · addendum round

Account 2 · 2026-10-21. No new surface: rulings and missing states on shipped handoffs. The merged handoffs are the source of truth; where a value shipped against the mock it is treated as a ruling and confirmed or redrawn, not reopened. Each item is drawn at both widths.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ. This folder is the full canvas export (`canvas.json`, every board, `support.js`, `art/`). Each named handoff folder has its own addendum README.

| # | Item | Addendum | Call |
| --- | --- | --- | --- |
| 1 | Scan not-ready state (no index) | `design_handoff_the99_card_scan/addendum-not-ready` | Redrawn: still camera-blocked screen, camera off, ✕/Stop only, new copy |
| 2 | About's Terms · Privacy line | `design_handoff_the99_fan_content_notice/addendum-about-legal` | Confirmed as shipped; drop the "awaits Design" comment |
| 3 | Phone deck header row | `design_handoff_the99_decks/addendum-phone-header` | Confirmed at 390+; under 390 the first button reads "Update" |
| 4 | Menu rows at 38px | `decks/`, `commanders_discover/`, `social_r1/` `addendum-touch-sizes` | Coarse: 44px rows, 14px labels (as the pod menu) |
| 5 | Consider sort select; stepper figure | `consider_tiles/addendum-touch-sizes`, `card_rows/addendum-one-line/addendum-touch-sizes` | Coarse: select 44px; stepper three 44px slots |
| 6 | Precons' phone pips | `design_handoff_the99_precons/addendum-touch-sizes` | Coarse: 22px pip in a 44px slot, no gap; fits at 360 |
| 7 | Proxy row deck links | `design_handoff_the99_collection_surfaces/addendum-touch-sizes` | Coarse: 44px link line, row bottom padding 0 |

Items 4 to 7 change only on `pointer: coarse`. A grown hit never reaches into a neighbour's: where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse every one is as shipped.

Shipped surfaces to build against: `src/components/collection/scan/`, `src/components/legal/legal-links.tsx`, `src/components/decks/spine-mobile.tsx`, `src/components/ui/touch-hit.ts`.

Boards: `Main` (summary), `Scan-NotReady`, `About-Legal`, `Deck-Header`, `Menus`, `Consider-Stepper`, `Precon-Pips`, `Proxy-Links`.

Status: drawn and approved by Hugh 2026-10-21.
