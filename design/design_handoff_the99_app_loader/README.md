# Handoff: App loader (D3)

**Approved by Hugh 2026-11-11** ("D3 is the winner"). Canvas: https://claude.ai/artifact/SX3a4cEcy2bAjs4yR4N2Zh (rows A to D3; this folder holds the D3 row, the two system splash boards and D's in-app loading screen board). Design record: `design-assets` `account-2/design_handoff_the99_app_loader/` (R1 to R1d).

A launch animation for the installed app, in the spirit of Concert Crawl's: the icon on the splash grows, lands on a card that flips face up, the crown lights on the card's face, and the mark lifts into the header logo while Home fades up. About 1.66 s.

## Where it plays

- **Installed app, cold start only**: `display-mode: standalone` (or iOS `navigator.standalone`), on the first document load of a session. Never in a browser tab, never on client navigation or a reload inside a running session.
- **Signed in only.** Signed out, `/` is the public landing, which has no header logo to land on: no loader, straight to the page.
- **It never holds the app.** Home renders and loads underneath the whole time; the loader is an overlay on top of it.
- **Reduced motion**: no loader. A straight cut from the splash to Home.
- **Theme**: the system splash can't know the saved theme, so the loader always plays in **Low Sun** (Amonkhet) to continue the splash, and Home fades up in the saved theme (boards: Neon Rain, Eldraine). Hugh 2026-11-11.

## Before it plays: the system splash

Both are one static picture for everyone: the icon (`src/app/icon.svg`'s art) at 128 px, centred, on `#14110E` (the manifest's `background_color`).
- **Android** draws it from the manifest already. No change.
- **iPhone** shows `apple-touch-startup-image` files, and The 99 ships none today. Add them (board "iPhone startup image (owed)").

The loader's first paint is that same icon in the same spot (`translate(195px, 388.8px) scale(.467)` in the board's 390×844 frame: crown centre 33 px above the screen centre), so there is no jump.

## The mark

The launch mark is `icon.svg`'s lockup: the three crown diamonds (`--accent` `#CF8745`) over the numeral outlined from Cinzel 900 (`--fg` `#EDE6D8`). Outlined paths, so nothing waits on a font. At scale 1 it is drawn at 4.285 px per icon unit (crown 206 px wide); it starts at scale .467 (the 128 px icon) and lands at scale .156 on the mobile header's `Crowned99 variant="mobile-header"` (crown centre at 66.75, 24.75 on a 390 phone). On landing, the numeral also moves down 76.3 px (in mark units) and grows 1.2× so it sits exactly on the header's numeral (that variant's 30 px baseline gap and 24 px size), then the flyer fades and the real header logo is underneath.

## The card

260×363 (63:88), radius 14, centred on the screen (crown centre at card centre − 61 px).
- **Back**: `--surface-raised` `#211D18`, a diamond lattice of 1 px `--accent-strong` lines at 16% every 18 px at ±45°, a 2 px `--accent-strong` edge and a 1 px `--accent-shadow` inner rule inset 10 px. The 99's own back; it is not Wizards' card back. The mark sits on it.
- **Face**: `--elevated` `#29241F` with a soft accent radial (16%) behind the crown, a 2 px `--accent` edge, the same inner rule (inset 8 px), the mark, and `THE NINETY-NINE` (`font-mono` 11 px, 0.4em, `--accent`) 28 px from the foot, as on the signed-out hero.
- **Foil glint**: a 105° band of the five `--foil-glint-*` tokens at 33% alpha, `mix-blend-mode: screen`, crossing the face once.

## Timeline (ms from first paint; 3000 ms loop on the canvas only)

| ms | What happens | Easing |
|---|---|---|
| 0–176 | The icon holds at splash size. | |
| 176–528 | The mark grows to scale 1 while the card back fills in under it (back fades in 176–448), tilting to −6°. | `cubic-bezier(.16,1,.3,1)` |
| 560–912 | The card flips (rotateY 0 → 180°, `perspective(1100px)`) and straightens to 0°. The back hides and the face shows at the midpoint, 736. | `cubic-bezier(.65,0,.35,1)` |
| 864–1280 | The foil glint crosses the face. | same |
| 944 / 1040 / 1136 | The crown lights left, right, centre: each diamond eases to `#F6CF99` with a 1.3× pulse over 96 ms and back over 224 ms. The centre holds lit for 80 ms. | ease-out up, ease-in-out back |
| 1120–1392 | The card's edge glows (`box-shadow 0 0 46px 6px` `#F6CF99` at 38%, peak at 1232) and a soft bloom opens behind the crown (radial, scale 1.25 at 1264, gone by 1440). | ease-out, ease-in-out |
| 1216–1472 | The mark lifts off the card into the header logo's spot (scale 1 → .156, numeral settles as above). The card shrinks to .94 and fades 1232–1360. | `cubic-bezier(.65,0,.35,1)`; card ease-in |
| 1408–1664 | Home fades up from 10 px below. | `cubic-bezier(.2,.7,.2,1)` |
| 1504–1616 | The flyer fades out over the real header logo. The overlay is removed at 1664. | ease-out |

No sparkles (Hugh dropped them for D3).

## In-app loading screen

`LoadingScreen` (`components/shell/loading-screen.tsx`) swaps its pulsing `Crown` for a small card (46×64, radius 5): the same lattice back with the crown in `--accent-strong`, and a face (`--elevated`, `--accent` edge) whose crown lights left, right, centre. 2 s loop: tilted −4° face down until 250, flips to face up and straight by 550, the crown lights at 650, 800 and 950 (each to `#F6CF99` and 1.3× and back over 420), flips back 1600–1900. `still` and reduced motion keep today's still crown. Heading and status copy unchanged.

## Copy

None new. `THE NINETY-NINE` is the shipped hero label. The overlay is `aria-hidden`; nothing is announced (Home's own content is the page).
