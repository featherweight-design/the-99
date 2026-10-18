# A1 and B1: the Fan Content notice, and `/privacy` + `/terms`

Launch epic rows A1 and B1 (rulings L1, L4, L7, L11). Design: `design/design_handoff_the99_fan_content_notice/` (approved R2, engineering audit Green in its `READINESS.md`, E1 to E6 resolved there). Text: `boards/b1-privacy-terms-draft-2026-10-18.md` (lane 58; all of Hugh's questions answered 2026-10-18). Two PRs, A1 first, because B1's pages render the notice.

## A1 · the notice

1. **Copy** (`src/lib/copy/fan-content-notice.ts`): the two passages exactly as the handoff's copy file (compared to the brief programmatically in the audit), `policyLink`, `policyLinkAria`. A test pins the passages to the brief's text so a "fix" cannot reach them. The policy URL is one constant, Wizards' Fan Content Policy page.
2. **Component** (`src/components/shell/fan-content-notice.tsx`): a `<footer>` with a hairline `--border`, two paragraphs, one `<a target="_blank" rel="noopener noreferrer">`; 11/16 on the phone, 12/18 from `md`, `--fg-muted` and no other color token, `align="start" | "center"`. Never `position: fixed`, no state, no control, nothing dismissible. Server component, no client JS.
3. **Mounts** (`src/components/shell/shell.tsx`, two and only two): after `ShellMain` inside the signed-in column, and in the bare branch after `children` with `align="center"` and a foot pad of 24px + `env(safe-area-inset-bottom)`. No mount in `layout.tsx`.
4. **The fold** (G1): `ShellMain` loses its bottom padding, which moves to its parent column (`pb-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:pb-0`), and gains `min-h-[calc(100dvh-var(--header-h,79px)-var(--tabbar-h))] md:min-h-dvh` so the notice starts at or below the fold. The `display: contents` wrapper that sets `--tabbar-h: 88px` while the collection is locked wraps both, so the notice and the min-height read 88px. `mainRef` (the pending overlay's box) stops covering the reserve band: asserted, not assumed.
5. **Proof.**
   - Unit: the six contrast figures from the six theme blocks (>= 4.5:1; expected 6.91, 6.84, 7.35, 6.76, 6.61, 7.24), as `placeholder-contrast.test.ts` does; the component reads only `--fg-muted`/`--border`; a "both branches render it" test on `Shell` (signed in and signed out); the link attributes; no `fixed`; the passages pinned.
   - `sw.test.ts` stays green (the cached `/offline` HTML now contains the notice).
   - `check:tokens`, `check:copy-drift`, `check:border-collision` clean (the hairline uses a side-specific color).
   - The contact sheet (`docs/superpowers/inventories/fan-content-notice.json`): every surface in the handoff's STATES table at both widths, signed in (short, long, locked) and signed out (`/`, `/sign-up`, `/join/[token]`, `/friend/[token]`, `/offline`), with the notice below the fold at rest and above the tab bar scrolled. This is the `feature-acceptance` inventory for A1.
6. **No About entry**: a legal line is not a feature (audit Q2 default); no `ABOUT_VERSION` bump.

## B1 · the pages

1. **Routes**: `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`, both `dynamic = "force-dynamic"`-free static content that reads `auth()` only to choose the header (signed in: inside the shell, no tab lit; signed out: the legal header, 64/68px, wordmark to `/` and a secondary `Sign in`). `/privacy` and `/terms` join `isPublic` in `src/proxy.ts`; nothing else does.
2. **Container**: one `LegalPage` (`src/components/legal/legal-page.tsx`) taking `{ title, lastUpdated, sections }`: a 680px article, mono `Last updated`, the title in the theme's display face, an `On this page` list (numbered 44px rows on the phone, a sticky 220px column from `md` with the diamond on the section in view), 18px headings with `scroll-margin-top`, body 15/1.65 in `--fg-body`. The list is a real list of anchors, not hidden behind a toggle, never `fixed`. The notice follows the article (it comes from the shell mount; the page adds none).
3. **Text as data**: `src/lib/legal/privacy.ts` and `terms.ts` export sections (`{ id, title, blocks }`), written from the draft. No jokes (prose-pass D). The refund paragraph is IMPORTED from `src/lib/copy/credits-page.ts`, not retyped, so one change moves both. The effective date is one constant per page, set to the merge date at build time, and a terms change moves it (ruling 10).
4. **Stated facts are pinned to the code**: a test asserts each number the text states against its source: the invite hold (7 days, `HOLD_MS`), the welcome grant (15 credits, 30 days, `WELCOME_UNITS`, `WELCOME_DAYS`), the 18-or-older line, the support address, the `RETAIN_MS` wording from the anonymous counter ("held briefly ... cleared out as later requests are counted", never "up to an hour"), the processor list (Clerk, Neon, Vercel, Stripe, Resend, Anthropic, Scryfall images) against the code that calls each. A fact that drifts fails CI instead of going quietly false.
5. **Not linked from the notice** (the brief's "nothing else in the notice is a link", audit Q1 default). They are linked from `/sign-up` and `/credits` and, with A2, About.
6. **Proof**: unit tests for `LegalPage` (landmarks, one `h1`, every section reachable from the list, anchors resolve), the facts test, a no-em-dash and US-English sweep over both modules, a render of both routes signed in and out; the contact sheet gets both pages at both widths in both states; `check:public-reads`/`check:list-cache`/`check:social-reads` unaffected.
7. **Copy**: new headings ("Getting a copy", "No warranty", "Limit of liability"), every section title and the link labels go through `/copy-review`, never to Hugh. The privacy page quotes the retention of the anonymous counter in the words `docs/agents/ops.md` prescribes.

## Order, size, risks

- A1 touches `shell.tsx`, `navigation-pending.tsx` (if the padding move needs a prop), one component, one copy file, tests and an inventory: well under the line. B1 is mostly data plus one container.
- Risk: the padding move changes the shell's layout for every signed-in page. Mitigation: the contact sheet on the existing inventories' routes at both widths, before and after, and the locked-collection state.
- Risk: the min-height pushes short pages to a full screen. That is the point (R2), checked on the short-page frames.
- A1 first; B1 branches from it. No stacked PR: B1 opens after A1 merges.
