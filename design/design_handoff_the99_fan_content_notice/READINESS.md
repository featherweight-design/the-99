# Readiness · Fan Content notice (R1 to R2)

**Approved (LGTM, Hugh, 2026-10-17), R2. Self-assessed: Green for the build.** Hugh approved R1 except placement and asked for the notice to be present but out of the way; R2 puts it at or below the fold on every page. Every surface the brief lists is drawn at 390 and desktop: signed in (short and locked at rest and scrolled, long), the five signed-out surfaces, `/privacy` and `/terms` signed in and out, and the notice alone in all six themes with measured contrast. Every board was rendered headless with the app's fonts: no board cut off, no broken image, the notice below the fold on every at-rest frame, its last line above the tab bar on every scrolled one, and 3 + 3 lines at 390 throughout.

**Build from** `The 99 - Fan Content Notice (R2).dc.html` for the calls and gaps, `R2 - Signed-In` and `R2 - Signed-Out` for placement, and `R1 - Privacy-and-Terms` and `R1 - Themes` (unchanged in R2). The R1 main, Signed-In and Signed-Out boards are the record and are not built.

**The brief's locked items, all honoured** (table on the main board): the words set verbatim (L4), on every page signed in or out, subtle and never fixed or dismissible, real text at AA, no Wizards contact or per-crop credit, no mana or guild symbols. The Decided link is drawn in four states.

**Design's calls:** at or below the fold on every page, from two mounts in `shell.tsx` (not the root) (R2); 11px / 16px phone and 12px / 18px desktop in `--fg-muted`, two paragraphs; the link in the notice's own ink, underlined, with `↗`; one centered treatment for the signed-out shells; one `LegalPage` container.

**Open for Hugh, not blocking:** Q1 (how `/privacy` and `/terms` are reached; drawn as an option only), Q2 (no About entry).

**Settle in the plan:** G1 to G6 in the README.

---

## Engineering readiness audit (2026-10-18) · 🟢 Green

Audited against the brief (`docs/superpowers/design-briefs/2026-10-17-fan-content-notice.md`: Locked, Decided, Open) and the shipped tree on `main` at c81e35eab. Method: the brief's items one by one; every figure the handoff states recomputed from `src/app/globals.css`; every code claim read in `src/components/shell/shell.tsx` and `navigation-pending.tsx`; all eight boards loaded headless (no page error, no failed request, no broken image: 30 and 24 images on the two signed-in boards, none broken).

### Locked and Decided
| Item | Verdict |
|---|---|
| L4 the words, set verbatim | **Held.** Both passages in `fan-content-notice · copy strings.ts` equal the brief's text character for character (compared programmatically, line wraps normalized), "Fan Content Policy" is the only linked phrase. |
| Subtle: not a banner, never fixed, never dismissible | **Held.** Last thing on the page, `position` static, no control; R2's "at or below the fold" is stricter than the brief asked. |
| Real text at AA | **Held, and re-measured.** `--fg-muted` on `--bg` computed from the six theme blocks: Low Sun 6.91, Neon Rain 6.84, Canopy 7.35, Oil Haze 6.76, Witching Hour 6.61, First Frost 7.24. Every figure matches the handoff to two decimals. `--fg-faint` is 4.12 (Neon Rain) and 4.29 (Oil Haze), so it is rightly not used. The link underline (`--fg-faint`, decorative) is at least 4.12, over the 3:1 non-text floor. |
| No Wizards contact, no per-crop credit, no mana or guild symbols | Held. The only glyph added is `↗`, `aria-hidden`. |
| "Fan Content Policy" links out, new tab, `rel="noopener noreferrer"` | Held; drawn in four states; the new tab is said in the accessible name. |
| No em dash in the copy file | Held (none; US English). |

### Open items, as Design called them
| Open | Design's call | Engineering check |
|---|---|---|
| 1 Placement | At or below the fold on every page, from two mounts in `shell.tsx` (not the root) | **Feasible as drawn.** The root mount would sit behind a 74px band and cannot read the locked 88px (the brief said as much); inside the column the notice reads `--tabbar-h` from the `display: contents` wrapper that sets 88px while locked. `ShellMain` is `<main>` at `navigation-pending.tsx:309`; nothing reads its padding (`first-run-tour.tsx` pads `body`). See note E1. |
| 2 Type and token | 11/16 phone, 12/18 from `md`, `--fg-muted`, two paragraphs | Held; 3 + 3 lines at 390 is the "not a wall" the brief asked for. |
| 3 The link | Own ink, underlined, `↗`, ring on focus | Held. |
| 4 Signed-out shells | One centered treatment, pages untouched (`min-h-screen` kept) | Confirmed: `/`, `/friend/[token]`, `/offline` and `newcomer-column.tsx` carry `min-h-screen`, so the notice lands below the fold with no page edit. |
| 5 `/privacy`, `/terms` | One `LegalPage`: 680px article, `Last updated`, `On this page`, 18px headings, signed-out header with `Sign in`, the notice after the article | Held; covers every part of the brief's list (title, date, headings, measure at both widths, jump list, a way back or to sign in, the notice). |

### Findings, all resolved by engineering (none goes back to Design)
- **E1 (G1).** `ShellMain`'s bottom padding moves to its parent column. `navigation-pending.tsx` uses `mainRef` for the pending overlay's box, so the overlay stops covering the reserve band. That is the better behavior; A1 asserts it with a render test rather than assuming it.
- **E2 (G2).** `Shell`'s bare branch (`shell.tsx:54-55`) is where every signed-out route, `/offline` included, renders, so one mount covers the five surfaces. `sw.test.ts` pins what the service worker caches; A1 re-runs it (the cached `/offline` HTML now contains the notice).
- **E3 (G3).** The AA test reads `--fg-muted` and `--bg` out of the six theme blocks as `placeholder-contrast.test.ts` does; the six figures above are its expected values.
- **E4 (G5).** `/privacy` and `/terms` join `isPublic` in `src/proxy.ts`. `isPublic` is path-only, so the legal page must itself read `auth()` to choose the shell header or the bare legal header.
- **E5 (G6).** The link's accessible name, `Last updated`, `On this page` and the two titles are `/copy-review` placeholders, not Hugh's and not Design's.
- **E6.** The notice is a `<footer>` that is a child of the column, a sibling of `<main>`, so it exposes the `contentinfo` landmark (it would not inside `main`, `section` or `article`).

### Open for Hugh, with a default
- **Q1 (how `/privacy` and `/terms` are reached).** Default: not linked from the notice (the brief's "nothing else in the notice is a link" stands). They are linked from the pages that need them: `/sign-up`, `/credits` (B1), and About (A2).
- **Q2 (About entry).** None owed: a legal line and two legal pages are not features, and the rule makes Hugh the judge of which features owe one. Recorded here so the close-out does not flag it; Hugh may overrule.

### Verdict
**Green.** Nothing to send back to Design. Next: plan A1 (the notice and its mounts) and B1 (the two pages, from `boards/b1-privacy-terms-draft-2026-10-18.md`), each with a subagent review.

