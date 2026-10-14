# PARITY — lightbox → card modal

Every element `CommanderLightbox` draws, and where it goes. The point of the table is that
nothing is dropped silently: each row is *kept*, *kept differently*, *absorbed* or **cut**, and
the cuts have reasons.

Source: `src/components/commanders/lightbox.tsx` at `main` (282 lines, as of `main`) →
`src/components/cards/card-modal.tsx`.

| # | Lightbox element | Shipped values | Destination | Verdict |
|---|---|---|---|---|
| 1 | Overlay | `color-mix(--bg 86%)`, `blur(6px)` backdrop, `padding 34px 30px`, `z-50` | Modal backdrop `color-mix(--bg 72%)`, and at 390px the sheet is full-screen so the backdrop is not visible | kept differently |
| 2 | Blurred art layer | full-bleed art, `opacity 0.28`, `blur(3px)` | Phone art header's wash: `opacity 0.45`, `blur(22px)`, `scale(1.2)`. Same device, further | kept |
| 3 | `Full card` label, top centre | mono 10px, `letter-spacing .16em`, `--fg-faint` | — | **cut**. The dialog's name comes from its `h3`; a mono caption over a full-screen sheet was labelling the surface, and the surface now labels itself with the card's name at 22px |
| 4 | Close `✕` | 34px circle, `top 20 / right 18`, `color-mix(--fg 10%)` on `color-mix(--fg 18%)` | Modal's phone `✕`: 32px, `top 22 / right 18`, `color-mix(--bg 55%)` | kept |
| 5 | Backdrop tap closes | `onClick` on the overlay | `onClick` on the modal backdrop | kept |
| 6 | Escape closes | `useDialogA11y` | `useDialogA11y`, plus a first stage that collapses an open printing region | kept + gained |
| 7 | Focus trap, focus return, scroll lock | `useDialogA11y` on the overlay | the same hook on the dialog | kept |
| 8 | `role="dialog"`, `aria-modal`, `aria-label="Full card — {name}"` | — | `role="dialog"`, `aria-modal`, `aria-labelledby="card-modal-title"` (the card name) | kept differently |
| 9 | Real card image | 262px, 63/88, radius 16px, `0 24px 60px rgba(0,0,0,.6)` | 180px, 63/88, radius 10px, `0 20px 40px rgba(0,0,0,.5)` + inset seam | **kept smaller** — the one regression, README decision 3 |
| 10 | `sr-only` type line + oracle text beside the image | — | Real type line (13px `--fg-muted`) and a real oracle block (13.5px `--fg-body` on `--bg`, `1px --border`, radius 10px), with keywords bolded and reminder text italic | absorbed, upgraded |
| 11 | Drawn card frame (no-image fallback) | 262px, `commanderGradient`, `inset 0 -80px 80px -46px`, three inner blocks | Art slot takes `identityGradient`; the frame's name, pips, type line and oracle text are the modal's own content at larger sizes | absorbed — **this is most of the 282 lines** |
| 12 | Frame's card name | display 14px, `textShadow` | The modal's `h3`, display **22px** (phone) / 29px (desktop) | absorbed, larger |
| 13 | Frame's mana pips | 16px discs, 9px glyph, `PIP_TEXT` per-colour ink | `ManaCost`: 22px (phone) / 26px (desktop), `--bg` glyph on all five | absorbed, larger, and **`PIP_TEXT` dies** (amendment 1) |
| 14 | Oracle glass panel | `color-mix(--bg 50%)`, `blur(3px)`, `padding 11px 13px` | The oracle block on `--bg` with a real border — opaque, because it no longer sits on art | kept differently |
| 15 | Frame's type line | 12px `--fg`, `textShadow` | 13px `--fg-muted` under the name | absorbed |
| 16 | Frame's oracle text | 11px, `line-height 1.45`, `white-space: pre-line` | 13.5px, `line-height 1.6`, paragraph-split with `<em>`/`<strong>` | absorbed, upgraded |
| 17 | Frame's identity pips row | five 10px discs, `inset 0 0 0 1px rgba(0,0,0,.4)` | The `Identity` meta field: one 12px disc + the identity **named in words** (`W/U/R`, `Black`) | absorbed, upgraded — not colour alone |
| 18 | `Tap anywhere to close` hint | mono 10.5px `--fg-faint`, `margin-top 18px` | — | **cut**. The gesture survives (row 5); at 390px the sheet is full-screen and there is no visible backdrop for the sentence to be about. README decision 4 |
| 19 | `PIP_TEXT` | 5-key ink map | — | **cut** (amendment 1) |
| 20 | `LightboxCommander` type | `name`, `manaCost`, `typeLine`, `oracleText`, `colorIdentity`, `imageUri` shipped to the client on every render | `{ oracleId, name }`; the rest is fetched on click by `getCardDetail` | **cut** — smaller payload, README decision 9 |

## What the modal adds that has no lightbox row

| element | why it matters here |
|---|---|
| `Set` + collector number | The printing actually on screen. |
| `Rarity` | — |
| `Identity` **in words** | Row 17's pips were colour-only. |
| `You own ×N` | Usually `×1`. Earns its slot in the two-copy and claimed cases. |
| **Printing picker** | `N printings you own ▾` → the region. The commander is the card players most want to pick art for, and there was no route to this from either width. |
| **Availability block** | *"×1 · none free — in Gonti Theft"* plus a note. A player picking a commander to build wants to know their only copy is sleeved in a finished deck. |
| Prev / Next | Renders `1 of 1`, both arrows disabled. Correct: a commander has no peers on its own page. |
| Desktop, at all | The lightbox is mobile-only. |

## Net

- **Cut outright:** 4 elements (the `Full card` caption, the tap hint, `PIP_TEXT`, the
  `LightboxCommander` payload) + 2 files.
- **Kept smaller:** 1 (the sharp art, 262 → 180px).
- **Absorbed and upgraded:** 8.
- **Kept as-is:** 5 (every a11y behaviour, and the close gesture).
- **Added:** 8, including the two — the printing picker and the availability block — that make
  the modal worth the 82px.
