# The 99 · Fan Content notice · R1 (for Hugh's audit, 2026-10-17)

A small, muted legal notice at the foot of every page, signed in or out, in all six themes, and one prose page for `/privacy` and `/terms` that carries it. Launch epic A0; the build is A1.

Source of truth: `docs/superpowers/design-briefs/2026-10-17-fan-content-notice.md` (main, #2030). Its Locked items (L1, L3, L4) are Hugh's and are not reopened here; the Decided link ("Fan Content Policy" links out) is drawn. These boards make the five Open calls.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then rebuild in the app's stack. Signed-in boards are drawn in Neon Rain over the shipped shell; signed-out boards in Low Sun, the theme a reader without a cookie gets. **No new tokens, no new motion, no new dependencies.** Card art is in `art/` by relative path (on the canvas it is uploaded as assets).

## Start here

| Read | For |
|---|---|
| **`The 99 - Fan Content Notice (R1).dc.html`** | **The five calls, the locked items and where each is honoured, the gaps, the questions for Hugh.** |
| `R1 - Signed-In.dc.html` | Short, long and locked (88px bar) at 390; the root mount drawn as rejected; short and long on desktop. |
| `R1 - Signed-Out.dc.html` | `/`, `/sign-up`, `/join/[token]`, `/friend/[token]` (signed out) and `/offline`, each at 390 and desktop. |
| `R1 - Privacy-and-Terms.dc.html` | The `LegalPage` container spec; `/privacy` and `/terms` full length, signed out and in, 390 and desktop. |
| `R1 - Themes.dc.html` | The notice alone in all six themes with measured contrast, the link in four states, desktop at the 720px measure. |
| `STATES-fan-content-notice.md` | Every surface and state, with what each must not do. |
| `READINESS.md` | The verdict and what blocks the build. |
| `fan-content-notice · copy strings.ts` | The notice (locked, for reference) and every new string, for /copy-review. |

## The five calls

### 1 · Placement: the foot of the viewport on a short page, the end of the page on a long one
The notice is the last child of the page column, and the page above it takes `flex: 1`. A short page pushes it to the bottom edge; a long one carries it after its content. Never `position: fixed`, never over anything.

- **Not the root mount.** The shell's column is already a viewport tall plus the tab-bar reserve, so a footer after `<Shell>` makes every short page scroll for the notice alone, and at the end of that scroll the column's 74px reserve sits empty above it. Drawn as R1 and R2 on Signed-In.
- **Two mounts of one component, both in `shell.tsx`:** after `ShellMain` inside the signed-in column (G1), and after `children` in the bare branch (G2). Every signed-out route, `/offline` included, renders through the bare branch, so there is no per-page mount.
- **It clears the tab bar and the sheets with the column's own reserve.** Inside the shell's wrapper `--tabbar-h` already resolves to 88px while locked, so the locked bar costs nothing extra (S3).
- **Desktop:** in the column beside the rail, never under it. The hairline spans the column; the text starts at the 34px gutter the full-bleed pages use and is held to 720px.

### 2 · Type and token
IBM Plex Sans **11px / 16px on the phone, 12px / 18px from `md`**, weight 400, no tracking, **`--fg-muted`**. Two paragraphs, 6px apart. Hairline `--border`, 20px above the text, 24px below (22 / 28 on desktop).

- Measured in Plex Sans: at 390 (356px inside 16px gutters) **3 + 3 = 6 lines**; 4 + 4 on a 360 phone; desktop 2 + 2 at 720px. 12px on the phone is 4 + 4 = 8 lines, the wall the brief warned of. Running the passages together saves no line at 390.
- `--fg-muted` on `--bg`: Low Sun 6.91, Neon Rain 6.84, Canopy 7.35, Oil Haze 6.76, Witching Hour 6.61, First Frost 7.24 (:1). `--fg-faint` fails in Neon Rain (4.12) and Oil Haze (4.29) and is not used.

### 3 · The link
Same ink and size as the notice, underlined (1px, `--fg-faint` as the line color, 2px offset), with a small `↗` kept on the same line as `Policy`. Hover and active `--fg`; focus the shipped link-out ring (2px `--accent`, 2px offset); visited as rest. `--accent` as the ink was rejected: louder than a legal line, and 4.51:1 in Oil Haze. The `↗` is `aria-hidden`; the new tab is said in the accessible name, the app's existing `newTab` pattern (G6).

### 4 · The signed-out shells
One treatment for all five, centered on the page's axis, since each of those pages centers its own text. Each page swaps `min-h-screen` for `flex-1` (G2) and otherwise keeps its composition: `/`, `/friend` and `/offline` center in the space above the notice; `/sign-up` and `/join` stay top-aligned on the phone. No per-shell margins.

### 5 · `/privacy` and `/terms`
One `LegalPage` for both, signed in or out: a 680px article (the 356px phone measure), a mono `Last updated` line in `--fg-muted`, the title in the theme's display face (28 / 36px), an `On this page` list (numbered 44px rows on the phone, a sticky 220px column on desktop with the brand diamond on the section in view), 18px section headings, body 15px / 1.65 in `--fg-body`. Signed in: inside the shell, no tab lit. Signed out: a 64px header (68 desktop) with the wordmark to `/` and a quiet `Sign in` (the shipped secondary button). The notice follows the article. Section names are B1's list in brackets and the grey bars are line length: `/prose-pass` writes the words.

## Gaps

| # | Gap | Who |
|---|---|---|
| G1 | Move `ShellMain`'s `pb-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:pb-0` to its parent column and render `<FanContentNotice />` after `ShellMain` inside it. `ShellMain` keeps `flex-1`. The notice is then a real `contentinfo` landmark beside `<main>`. Check nothing reads `main`'s padding. | Eng |
| G2 | `Shell`'s bare branch returns `<div className="flex flex-1 flex-col">{children}<FanContentNotice align="center" /></div>`; `min-h-screen` becomes `flex-1` on the landing's section, `NEWCOMER_MAIN` / `INVITE_MAIN`, the friend page's main and `/offline`'s main. No mount in `layout.tsx`. A1's every-branch test asserts both mounts. | Eng |
| G3 | The component reads `--fg-muted` only; a unit test measures it against `--bg` in all six theme blocks at ≥ 4.5:1, as `placeholder-contrast.test.ts` does. | Eng |
| G4 | The bare branch's notice pads its foot `24px + env(safe-area-inset-bottom)`; inside the shell the column's reserve covers it. | Eng |
| G5 | `/privacy` and `/terms` public in `src/proxy.ts`; in the shell when signed in, bare with the legal header when signed out; one `LegalPage` taking its sections for the list and anchors (`scroll-margin-top` on each). | Eng |
| G6 | The link's accessible name, `Last updated`, `On this page` and the two titles are placeholders in the copy strings file, for /copy-review. The notice's own words are Hugh's (L4) and go nowhere. | Copy |

## For Hugh

- **Q1 · How does a reader reach `/privacy` and `/terms`?** Nothing on these boards links to them, because the brief makes the policy the notice's only link. If they should be one tap from every page, the quiet place is a `Privacy · Terms` line at the top of the same footer (drawn once on the main board, not on any surface); that needs the brief's "nothing else in the notice is a link" amended. Otherwise the pages that need them link to them (A2, B1).
- **Q2 · About entry:** none drawn. A legal line isn't a feature; say if you want one.

## Not drawn

- `/about`'s placement (A2), the artist-credit question (A3), the pages' prose (B1), the public card and commander pages (F2, which take this same component).
- Clerk's hosted sign-in and sign-up pages, which sit outside the app's layout.
- A bottom sheet open over the notice: the sheets cover the page as shipped and reserve their own height; the notice is page content under them like any other.
