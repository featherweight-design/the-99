# Readiness: App loader (D3)

**Verdict: Green.** Hugh approved D3 on 2026-11-11. One UI PR (M): no migration, no new copy. Checked against `origin/main` @86e19b5. Ship behind a switch only if engineering sees a regression risk (it overlays every cold start); Hugh's rule is switches only when a regression is plausible.

## For engineering

- **Decide before paint.** The theme is resolved on the server (`layout.tsx`), so first paint is already Home in the saved theme. The loader has to be in the server markup and switched on before paint, or Home flashes first:
  - Render the overlay in the signed-in shell's markup (hidden by default), with `data-theme="amonkhet"` on it so it is Low Sun whatever the page's theme (the attribute selector already supports nesting, as the theme picker's chips do).
  - A plain inline `<head>` script (like `INSTALL_PROMPT_CAPTURE`) sets `data-launch` on `<html>` only when: standalone (`matchMedia('(display-mode: standalone)')` or `navigator.standalone`), no `sessionStorage` launch flag (then set it), and not `prefers-reduced-motion: reduce`. CSS shows the overlay only under `html[data-launch]`.
  - The animation is CSS keyframes from the README's table (no JS timing). Remove `data-launch` on the last `animationend` with a ~1.8 s timeout as a fallback.
- **Input**: the overlay takes taps until Home starts fading up (1408 ms), then `pointer-events: none`.
- **Landing spot**: drawn on a 390 phone (the mobile header's `Crowned99`). On other widths, read the live header logo's rect (mobile header, or the rail's `rail-62` lockup on desktop) once at about 1.2 s and fly to it through CSS variables (`--land-x`, `--land-y`, `--land-s`), with the phone values as a fallback. The card and the mark are centred on the viewport at every width.
- **The mark** is `icon.svg`'s geometry (outlined Cinzel 900 numeral, so no font wait). Reuse its paths. `icon.test.ts` already pins that geometry to `CROWNED99_SPECS`.
- **Tokens**: Low Sun's `--accent`, `--accent-strong`, `--accent-shadow`, `--surface-raised`, `--elevated`, `--fg`, `--foil-glint-a…e`. One new literal: the lit diamond `#F6CF99`, used by this loader and the loading screen only (or as `color-mix(in oklab, var(--accent) 45%, white)` if you prefer no new hex).
- **iPhone startup images** (owed): add `apple-touch-startup-image` links for current iPhone screen sizes (portrait), each the icon at 128 pt centred on `#14110E`. Generate them from `icon.svg` in a script, like the maskable icon. Android needs nothing.
- **Loading screen**: `LoadingScreen`'s `Crown` becomes the small flipping card (README § In-app). `still` and reduced motion keep the still crown. `commanders/(list)/choose/loading.test.tsx` and any test that asserts the crown's pulse will need updating.
- **Tests**: unit-test the head script's decision (standalone × flag × reduced motion × signed out). Don't test the timeline.
- **About**: no entry. The About captures don't show a cold start.

## Calls taken (flag if you disagree)

1. Signed-out cold starts get no loader (the public landing has no header logo).
2. The loader plays in Low Sun for every theme. Home arrives in the saved theme.
3. It covers Home for about 1.4 s even on a fast load. Hugh accepted this (cold start only, 2026-11-11).
