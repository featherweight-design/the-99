# Readiness — public pages R1

## Against the brief's Locked items

| Locked | How the canvas holds it |
|---|---|
| L1 Two pages; search links out | Card + commander only. No search field anywhere; `Find another card on Scryfall ↗` in the top bar. |
| L2 Catalog only, even loading/empty | Every string and figure comes from `PublicCard` / `PublicCommander`. No loading state is drawn (cached HTML). Empty states name the catalog, never a person. |
| L3 Signed out is the design | No wall, modal, gate, banner or sticky bar. The block is in-flow. |
| L4 No "Sign up" | The block offers `Sign in` and explains the invite. No field, no form. |
| L5 Same for everyone | Nothing reads a cookie, a time, a locale or a session. The degraded copy says "the last time this page was built", which is true for every visitor. |
| L6 Footer on both, credits not repeated | A0 stub on every board. The body never repeats the Wizards/Scryfall/Mana Pool credit lines; the Scryfall links are links, not credits. |
| L7 Both widths | 1300 and 390 for every page state. |
| Decided: no prices | No price, no price tag, no `◆ foil`, no Mana Pool link. Prices are behind `Rulings, prices and every printing on Scryfall ↗`. |
| Decided: prose on the commander page | B1, leading the right column. |

## Tokens

No new token. Everything is a shipped token: `--bg`, `--surface`, `--surface-raised`, `--surface-rail`, `--surface-sunken`,
`--elevated`, `--elevated-hover`, `--border`, `--border-strong`, `--border-dashed`, `--fg`, `--fg-body`, `--fg-muted`,
`--fg-faint`, `--fg-locked`, `--accent`, `--accent-hover`, `--warning`, `--fact`, `--bracket-1..5`, `--w/u/b/r/g`. Fonts:
`font-display`, Plex Sans, Plex Mono. The boards are drawn in the default theme; a visitor with no account gets the default.

## Reused components

`ManaCost`, `OracleText`, `CardFactMark` (Bracket facts block), `BracketMark` (chip art at 26), the card tilt
(`card-tilt.ts`, hover only, no tilt under reduced motion), the flip (`TurnOverIcon`, 320ms `rotateY`), `ExternalLink`,
`identityGradient`, `Crowned99`, the not-found page, the synergy-note and coverage-note chromes. New: the top bar, the
facts row as a three-cell row, the printings chips, the signed-out block, the stats card's contents, the two lists.

## Accessibility

- Every link out is an `<a target="_blank" rel="noopener">` with the shipped ` (opens in a new tab)` sr-only suffix.
- Hit targets ≥ 44px at 390: the Scryfall link in the top bar, `Show all`, every list row (46px), the flip (44px), Sign in.
  Desktop printing chips are 32px (pointer); at 390 they are 36px and capped to 8 behind a 44px disclosure.
- The flip control's name is `Turn over to {other face}`; after landing it announces `Showing {face}` (shipped).
- `No image for this card` is the gradient box's accessible name.
- The block is a `section` named `About The 99`.
- Text contrast: smallest text on the page is mono 11px `--fg-faint` on `--bg` (shipped pairing for captions).

## Checked

Every board rendered headless with the three webfonts and measured; each frame is at least its content height plus 30px,
and the footer stub sits at the bottom of every frame. Images are the design folder's own scans and crops, uploaded as
canvas assets; none is a relative path.
