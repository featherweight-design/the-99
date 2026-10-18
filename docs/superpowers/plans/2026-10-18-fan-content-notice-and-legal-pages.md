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

## Review outcome (subagent, 2026-10-18): what changed

All accepted. Where this contradicts the sections above, THIS section wins.

### A1 additions
1. **Tests and a probe that read `main`'s padding** (the audit said none did; corrected in the handoff's `READINESS.md`): `src/components/shell/shell.test.tsx:98` and `scripts/probe-locked-nav.mjs:232` move their assertion to the column (`main.parentElement`). Comments in `deck-bottom-stack.test.tsx:115` and `create-picker.tsx:423` are updated.
2. **The overlay is not the effect.** `pending-overlay.tsx` reads only the box's left and top. The real consequence is that `inert` and `aria-busy` stay on `<main>` and the notice, a sibling, is not inert during a pending navigation. The test is "the footer is a sibling of `main`, outside `inert`", not an overlay-box test.
3. **`--header-h`** is `0px` on desktop (`use-quick-return.ts` writes the hidden header's `offsetHeight`) and the measured height on the phone, with `nav.tsx`'s 79px fallback. `calc(100dvh - var(--header-h,79px) - var(--tabbar-h))` on the phone and `md:min-h-dvh` on desktop are right as drawn. The phone fold is `100dvh`, which moves with the iOS URL bar; at rest the notice's top edge sits under the fixed tab bar, covered, not offscreen.
4. **Pages that fill the viewport** now scroll by the notice's height, so the contact sheet names them: `review-parts.tsx` `STEP_FRAME`, `cart-view.tsx` (`md:h-dvh`), and the sticky `bottom-[var(--tabbar-h)]` bars (`builder-shell.tsx`, `precon-pick-view.tsx`, `create-picker.tsx`, `top-off-list.tsx`), plus the signed-out 404 (`not-found.tsx` is only `min-h-[400px]`, so the notice would sit above the fold on a tall screen: it gets `min-h-screen`, or the gap is accepted explicitly; `global-error.tsx` and Clerk's hosted pages get no notice, stated).
5. **The bare-branch mount needs its own gutter and measure** (16px side, 720px max), since the body has no horizontal padding, not only the 24px foot pad.
6. **`sw.test.ts` serves a stubbed HTML string**, so "stays green" proves nothing. A real render test of the signed-out `/offline` tree contains the footer replaces that proof; no service-worker `VERSION` bump (the offline copy refreshes hourly).
7. **Contrast test**: import `parseThemeBlocks` and `contrast` from `placeholder-contrast.test.ts`'s own modules, pin the six figures with `toBeCloseTo(x, 2)`, and assert the component source names no `var(--` other than `--fg-muted` and `--border` (`check:tokens` skips tests).

### B1 changes
1. **Routes**: `isPublic` gets `"/privacy", "/privacy/", "/terms", "/terms/"` (both slash forms, the matcher's convention), with `proxy.test.ts` cases in the style of its existing ones (exact and trailing-slash paths are public; `/privacy-policy`, `/terms-x`, `/privacy/x` still `protect`). A signed-in reader on a public path still gets `auth()` and the switches header. In legacy-cookie About mode a signed-in reader with an unseen About entry can be redirected to `/about?next=/privacy`, exactly as at `/` today; moot in sheet or banner mode. B1.1's "`force-dynamic`-free static content that reads `auth()`" was contradictory: the root layout is already dynamic; the pages simply read `auth()`.
2. **No nested `<main>`**: `LegalPage` renders `<article>` inside the shell and `<main>` plus the legal header when signed out.
3. **`pending-routes.ts`** defaults an unknown top segment to the Home overlay; `privacy` and `terms` get an entry (About's overlay), and `route-loading.test.ts` is checked.
4. **Metadata**: `export const metadata` titles for both pages; no `openGraph` (none is used anywhere). **No `robots.ts` or `sitemap.ts` exists in the app and none is added here**: the pages are deliberately not promoted; stated, not an oversight.
5. **Links**: `/sign-up` and `/credits` each get a named edit (copy file, test, inventory row); About's is A2's.
6. **Text under `src/lib/copy/legal/`**, not `src/lib/legal/`, so `check:copy-drift` and the copy-review path read it.
7. **Facts that the draft states and the code does not support (fixed in the text, not in the code):**
   - *Chargeback*: "A chargeback pauses buying ... and takes back the credits" is not built (`stripe-webhook/route.ts` ignores everything but `checkout.session.completed`; K2 is unbuilt; nothing writes `revoked_units`). Worded as policy ("we may take back credits from a disputed payment") and held out of the facts test until K2 ships.
   - *US cards only*: the draft's source (`checkout-rule.ts:39`) has no country restriction; the sentence is pinned to `credits-page.ts:72` ("Checkout on Stripe · US cards") and says nothing stronger.
   - *Refund paragraph*: not retypable verbatim (`refunds.before` + address + `refunds.after`, curly apostrophes, "A run that fails refunds itself."). The block is composed from those three parts with a mailto link; `LegalPage` blocks gain a "text + email" type.
   - *Deletion*: "within minutes" is followed by "with a final pass within a day" (the tombstone keeps the raw Clerk id for 24 hours); a waiting invite's address is "erased once the invite is resolved or has expired", since expiry is derived from time and a sweep writes it down.
   - *The 18+ line and invite-only* have no code source (they are rulings, L11 and L2): the facts test pins them to the text itself and says so.
   - *Anthropic*: cite `scripts/lib/prompt-identity.test.mts` (no identity fields in prompts).
   - *Processors*: the CSP also allows Cloudflare's bot challenge for Clerk and Clerk's telemetry and images; the text says "Clerk may load its bot check from Cloudflare". The processor test follows the CSP allowlist plus `mail.ts`, `model/client.ts`, `scan/models.ts` and Stripe.
   - *Display name*: the first name becomes the display name on first use of Friends, not at sign-up.
   - *The anonymous-counter paragraph is DROPPED from B1*: nothing calls `observeAnonymousHit` (it ships dead), so the text would describe data nobody collects. It returns, in the words `docs/agents/ops.md` prescribes, in the PR that wires it to the public pages. The draft's "swept hourly" wording is wrong and is not used.
8. **The "Card content" section is removed from the Terms** (decision, below).
9. **Effective date** = the PR's own date, written as a constant; if the merge lands on a later day, a one-line follow-up moves it. A later terms change moves it and owes a "What's new" note in About; the launch itself owes none.

### Decisions to approve
- **Drop the in-article "Card content" section from the Terms.** The draft repeats both Fan Content passages there; the handoff's STATES table says the legal page's article must not repeat the notice, and the brief only requires the Terms to carry it, which the footer does on every page. Default: drop. (Hugh wrote the draft with that section; this reverses part of it for a reason of duplication, not substance.)
- **The chargeback sentence is policy wording until K2.**
- **The signed-out 404** gets `min-h-screen`.
