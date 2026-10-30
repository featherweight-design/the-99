# Card details carousel — readiness (R2, H23)

**Status: LGTM (Hugh, 2026-10-03).** Phone is R2 (frames H1–H6). Desktop is R1 (§3, D1–D5). The R1
phone frames P1–P7 are kept for the record and are superseded.

| Part | Readiness | Note |
|---|---|---|
| Paging wrapper above the keyed modal | **Ready, new seam** | `CardModal` remounts per card, so the strip, the glide and the arrival announcement live in a wrapper in `card-detail-provider.tsx`. |
| Neighbor art | **Needs openers** | The provider holds ids. Openers pass `{oracleId, imageUri, colorIdentity}`; Collection, the set grid and the decklist already have them. Fallbacks: `identityGradient`, then an `--elevated` plate. Prefetch both neighbors on arrival. |
| Phone card-first sheet | **Ready** | Card `min(320px, (100dvh − 85px − 280px) × 0.7159)`. The teaser sheet is fixed at 280, full at top 64, two snaps. Replaces the 180px header and the compact 72px header. |
| Phone gestures | **Ready, tune on device** | Horizontal on the card band pages; vertical moves the sheet. Lock at 10px then 1.5×. Commit at 25% or 0.5px/ms. Edge 16px goes to the system. No paging in full. |
| Phone zoom retired | **Ready** | Remove the phone zoom trigger and `Tap to zoom`. Two-faced cards keep the turn plate on the card's corner. The desktop zoom stays. |
| Desktop neighbors | **Ready** | 168×235 on the backdrop, 24px off the modal, ≥ 1252px viewport only. A neighbor's press does not close the modal. |
| Arrow keys | **Ready** | ← → in the dialog, except the printing search, the radiogroup and the zoom. Top layer only. |
| Ends / one / two | **Ready** | Stop at both ends. End controls go `aria-disabled`. A list of one drops `1 of 1`. |
| Announcement | **Ready** | `{name}, {n} of {total}` in the provider's live region. Focus is restored to the same role after the remount. |
| Copy | **To /copy-review** | `card-carousel · copy strings.ts`. The two shipped inline aria-labels become keys. |

## Gap report

1. **Rulings reopened:** the full-card handoff's decision 3 (262→180), on the phone only. The card
   detail handoff's phone zoom is retired, and decision 2 (no paging in the zoom) stands where the
   zoom remains.
2. **Peek contrast** is decorative (`aria-label` carries the name). Measure the desktop neighbor names in `--fg-muted` over the backdrop on all six themes.
3. **1252px** depends on the 820 modal width.
4. **Stacked phone sheets** (96 / 140) run the same sizing formula on their shorter height. They aren't drawn at 140.
5. **Escape ladder** on the phone: full → teaser → close. On desktop it's unchanged.
6. **About entry:** none drawn. My recommendation is to fold it into the card details entry. Hugh decides.

## What a green looks like

- Phone, any list of 2 or more: opening shows the teaser at sheet top ≈ 532 on an 812px viewport, with both peeks where they exist. A horizontal drag on the card pages, and the teaser's name updates on the commit.
- Swiping up reaches full at top 64. Horizontal drags there do not page. Escape returns to the teaser, then closes.
- No `Tap to zoom` and no zoom layer on the phone. The desktop zoom opens as before.
- Desktop at 1300: neighbors are drawn, and clicking one pages without closing. At 1024 there are none. ← → page; at an end they announce `firstCard` / `lastCard`.
- A list of one: no counter, no peeks, and the desktop footer shows only the link.
- Reduced motion: no glide, no snap animation. Drags still track the finger.
- Arrival is spoken once as `{name}, {n} of {total}`. Focus stays on the control that paged.
- A held card under a sheet draws no paging.
