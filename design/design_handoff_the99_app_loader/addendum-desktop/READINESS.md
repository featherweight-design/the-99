# Readiness Review — App loader on the installed desktop app (addendum R1)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14 (cold read, against `origin/main` @23c3b4018; the branch rebased clean)
**Related ticket(s):** design PR #2952; brief `docs/superpowers/design-briefs/2026-11-15-desktop-app-loader.md` (branch `brief/desktop-app-loader`); parent handoff `../READINESS.md` (D3, Green); shipped loader PR #2871
**Plan PR target:** TBD (one small UI PR: no migration, no copy, no switch, no About label)

## Summary

The addendum answers all five of the brief's open calls, draws every window class the brief asked for (1280 × 800, 1920 × 1080,
a 1180 × 820 tablet), keeps every locked fact (gates, mark, card, flip, crown, 1.66 s timeline, Low Sun, Home underneath, no copy,
no switch) and its build sketch fits the shipped code: the landing figures check out against `nav.tsx`, `marks.tsx` and
`globals.css`, and the change is a gate line in `launch-detect.ts` plus landing variables in `globals.css`. It is Yellow, not
Green, for five eng-side clarifications the plan records (the breakpoint unit, two undrawn window classes the handoff's own
patterns settle, the numeral-settle override, keyboard input under the overlay) and one housekeeping item (the `scratch-gen`
folder). Nothing needs a Design round. Next: the plan PR, recording the clarifications below as decisions.

(This file replaces the authoring session's own self-assessed READINESS note on this branch; its "For engineering" content was
verified and is carried into the sections below.)

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary is the brief's: the desktop and tablet landing, the gate, nothing else. Non-goals inherited from the brief (phone
  loader, iPhone startup images, `LoadingScreen`, signed-out launches, browser tabs, in-app loader). README "What stays exactly as
  D3" lists the locked facts; "where this addendum is silent, D3 and the shipped code stand".
- [✅] All five open calls answered (README § The calls 1–5), each with a board.

### 🎭 State coverage

- [✅] Real speed and 4× slow (`Main`, `d-slow`), keyframe frames 0–1660 ms (`d-f*`), 4× landing close-ups (`d-z*`), first paint
  before the loader (`d-window`), reduced motion (`d-reduced`), two other saved themes (`d-theme-*`), large window (`l-*`), the
  rejected scaled card (`l-alt-*`, "Not recommended"), tablet (`t-*`). Signed out: no loader, inherited from D3 call 1.
- [🟡] **Narrow desktop window (< 768 wide, fine pointer) is not drawn.** Dropping the pointer clause lets it qualify, and below
  `md` the shell draws `MobileHeader`, not the rail, so the phone landing (66.75, 24.75 plus the numeral settle) is the right one:
  the header's lockup sits at a fixed offset from the top-left at any width (`nav.tsx:984`, `px-5 pt-5`). Settled by D3's phone
  pattern; see clarification 2.
- [🟡] **`touch-short` (a phone in landscape ≥ 768 wide, or a short tablet) is described, not drawn**: crown centre y 16 under the
  rail's 10 px padding (`nav.tsx:782`). The figure follows from the drawn rail pattern; see clarification 1.
- [🟡] **Very short windows.** The card is fixed at 260 × 363 centred (call 2). Under about 425 px of height its top edge clips
  for the ~0.9 s it is up. The addendum checks 768 × 560 only. Accept the clip (cold start only, under a second); see
  clarification 2.

### 🔌 Data contract

- [✅] None. The loader reads no data; the gate is `matchMedia` plus `sessionStorage` (`src/lib/pwa/launch-detect.ts:26-33`). The
  signed-in gate is structural and unchanged: the overlay mounts only in the signed-in shell (`src/components/shell/shell.tsx:170`),
  and the page lift is scoped to `html[data-launch]:has(.launch-loader) main` (`src/app/globals.css:1879`), so a signed-out desktop
  document that gets `data-launch` draws nothing.

### 🧱 Codebase fit

- [✅] Landing figures verified against the code:
  - x: the rail is `w-[var(--rail-w)]` with a 1 px right border, `items-center` (`nav.tsx:782-786`), so the lockup's centre is
    `--rail-w / 2 - 0.5`: 30.5 on the 62 px rail, 43.5 on the 88 px `hover: none` rail (`globals.css:624-625`).
  - y: `py-[14px]`, the crown first in `Crowned99` with an 8.5 px large diamond (12.0 px tall rotated), so the crown centre is at
    ~20; `touch-short:py-[10px]` gives 16.
  - scale: `rail-62` small diamond 6 px (`marks.tsx:96-97`) against `icon.svg`'s 7.381-unit small diamond (5.219 √2,
    `launch-loader.tsx:16`) is 0.813 px/unit; the launch mark is 205.7 px over 48 units = 4.285 px/unit; 0.813 / 4.285 = 0.1897.
  - timing: 1216 / 1472 / 1504 / 1616 ms are the shipped `ll-lift` (40.533%, 49.067%) and `ll-fly-box` (50.133%, 53.867%)
    stops of the 3000 ms run (`globals.css:1934-1946`). Unchanged.
  - the numeral: `icon.svg` is drawn from `CROWNED99_SPECS["rail-62"]` (`marks.tsx:30-33`, pinned by `icon.test.ts`), so no settle
    is needed at the rail; the phone's settle exists only for `mobile-header`'s different weight and size (`marks.tsx:107-111`).
- [✅] Mechanism is plain CSS: `var()` inside `@keyframes ll-lift` resolves on `.ll-fly`, which inherits the variables from
  `.launch-loader`; no JS measuring (the shipped code never took D3's "read the live rect at 1.2 s" route either).
- [✅] No new token, colour or component. The card's `ll-label` wordmark is the existing `publicPagesCopy.shell.wordmark`.
- [🟡] **Breakpoint unit.** The sketch writes `@media (min-width: 768px)`; the rail is drawn by Tailwind's `md:flex`
  (`nav.tsx:782`), which is `48rem`. They differ when a reader's default font size is not 16 px. `globals.css` already uses both
  forms (`:637`, `:680` px; `:867`, `:881` rem). See clarification 1.

### ♿ Cross-cutting

- [✅] Reduced motion: no loader at all, three ways (the head script returns, `display: none` under `reduce` at
  `globals.css:1773-1775`, and every keyframe sits under `no-preference` at `:1859`). Every `.anim-*` class in `globals.css` is
  listed in the reduced-motion block at `:1424` (checked by set difference: none missing); the loader adds no `.anim-*` class.
- [✅] The overlay is `aria-hidden` and drops out at 1664 ms (`visibility: hidden`), so it never holds the app.
- [🟡] **Keyboard under the overlay.** The overlay takes pointer input until it hides (`globals.css:1762-1764`), but on desktop a
  keyboard can Tab to and press Home's controls beneath it during the 1.66 s. Phone never had a keyboard to think about. See
  clarification 4.
- [✅] Performance: same overlay, same timeline; one more media-query block. No analytics or telemetry expected (D3 had none).

### ⏰ Drift from reality

- [✅] Every file and symbol the addendum names exists as named on `origin/main`: `LAUNCH_DETECT`'s pointer line
  (`launch-detect.ts:29`), `@keyframes ll-lift` (`globals.css:1934`), `ll-num` (`:1953`), `--ll-cx` / `--ll-cy` (`:1769-1770`),
  `--rail-w` (`:624-625`), `touch-short` (`:16`), `NavRail` with `Crowned99 variant="rail-62"` (`nav.tsx:752`, `:799-802`),
  `manifest.ts` `background_color` `#14110E`. Rebased onto `origin/main` @23c3b4018 with no conflict; the diff touches only
  `design/`.
- [✅] Home under the overlay on the boards is the real `NavRail` + `Dashboard` rendered from `src/`, not a mock.

### 📝 Decision log

- [✅] Five calls, each stated with its reason and board; approval recorded ("Approved by Hugh 2026-11-15"); the rejected
  alternative (scaled card) drawn and labelled "Not recommended".
- [🟡] **`scratch-gen/` ships without the README explaining it.** The addendum README never mentions the folder; only
  `scratch-gen/NOTES.md` does. The generator is not runnable as committed: `desk.py` imports `loader_lib`, which is not there (the
  note says to copy D3's `../../scratch-gen/loader.py` beside it); `scratch-run.cjs` requires a `scratch-clerk.js` that is not
  there; `scratch-render.tsx` imports `./src/...` relative to wherever it was copied, calls `named()` from
  `src/lib/person-name/mint`, and writes to `hero/`; `shoot*.cjs` hard-code `/opt/pw-browsers/chromium` and a `q-home.html` that
  is not there. It is harmless to the build (`design` is excluded from `tsconfig.json` and ignored by `eslint.config.mjs:42`, and
  the third-party-names guard reads `src/` only), nothing under `src/` or `scripts/` imports from `design/`, and nothing is copied
  into `public/`. Other handoffs carry a `scratch-gen` too (`add_card_anywhere`, `add_panel/addendum-phone-add`, D3's parent). See
  clarification 5.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Landing variables, keyed to the rail's own breakpoint.** Replace the literal landing in `@keyframes ll-lift` with
   `--ll-land-x/-y/-s` on `.launch-loader`: phone default `66.75px / 24.75px / 0.156`; under `@media (min-width: 48rem)` (Tailwind's
   `md`, the query that draws the rail, not `768px`) `calc(var(--rail-w) / 2 - 0.5px) / 20px / 0.1897`; and under
   `(min-width: 48rem) and (hover: none) and (max-height: 459.98px)` (the `touch-short` variant's query) `--ll-land-y: 16px`.
   Follows the drawn rail landing (boards `d-f1472`, `t-*`) and the rail's own padding rule.
2. **Narrow and short desktop windows follow the drawn patterns.** Below `md`, any qualifying window (fine pointer included) takes
   the phone landing and numeral settle, because it draws `MobileHeader` (D3's phone boards). Under about 425 px of height the
   fixed card clips at the top for under a second; accepted per call 2 (card fixed at every size), no special case.
3. **Numeral settle off at `md` and up.** `.launch-loader .ll-num { animation-name: ll-num }` lives inside the `no-preference`
   block (`globals.css:1892`); the desktop override (`animation-name: none`, so `.ll-num` keeps `transform: none`) must sit in the
   same block after it, inside the `48rem` query, or it loses on order. Follows call 1.
4. **Keyboard input under the overlay: leave as is.** D3 and the shipped code chose an overlay that never holds the app (no
   `inert` on Home); a keystroke in the first 1.6 s of a cold start reaching Home is the same trade the pointer rule already makes
   at 1664 ms. The plan records it rather than adding `inert`, which would need the script it was designed not to depend on.
5. **`scratch-gen/`.** Either add one README line ("`scratch-gen/` is the generator scratch for the boards and the Home captures;
   not runnable as committed, see NOTES.md; never imported, never served") or delete the folder in the plan PR. It must never be
   imported or copied into `public/`. Housekeeping, not a Design round.
6. **Docs and tests.** Update the doc comments that say "phone": `launch-detect.ts:4`, `:17-18`; `launch-loader.tsx:46`;
   `globals.css:1748` and `:1755-1756` (the landing). Rewrite `launch-detect.test.ts:41-45` (its "desktop or tablet stays quiet"
   case becomes "qualifies") and drop the `pointer: coarse` branch of its stub (`:13-16`). Unit-test the gate (standalone × width
   × pointer × seen × reduced motion); don't test the timeline. Prove the landing with a `ui-probe` at 1280 × 800 and the tablet
   (the flyer's crown rect over the rail lockup's at 1472 ms, failing with the old literal landing).

## Decisions inherited

- Locked by the brief: same gates as the phone (installed, first document load of a session, signed in, normal motion; never a
  browser tab, a reload or an in-session navigation); same mark, card, flip, crown lights and ~1.66 s timeline; Low Sun always,
  Home in the saved theme; Home renders underneath and the overlay never holds the app; no new switch, no copy, no About label.
- Calls approved by Hugh 2026-11-15 (R1): (1) straight flight into the `rail-62` lockup, same easing and 1216–1472 ms window, no
  numeral settle; (2) card fixed at 260 × 363 at every window size; (3) start from the 128 px icon, centred; (4) the shipped
  `ll-page` as is: ground clears 1408–1664 ms, only `<main>` rises 10 px, the rail does not move and arrives with Home; (5) tablet
  (coarse pointer at `md` and up) follows desktop, landing in the 88 px rail's lockup.
- From D3 and the shipped code: `--ll-cx` / `--ll-cy` centre the card on any window; the overlay's own `animationend` removes
  `data-launch`; the overlay is the only writer of the seen flag.
- `design/` is reference material: never import from it, never copy its assets into `public/`.
