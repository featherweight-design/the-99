# Readiness Review — On-page copy editor

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-24 (cold read by Claude after Design's own draft; this replaces it)
**Related ticket(s):** none (brief was Hugh's design prompt, 2026-11-24; R1 approved)
**Plan PR target:** TBD (`docs/superpowers/plans/`, opens after this handoff PR merges)

## Summary

All five locked points are drawn and every required state exists at phone (390) and desktop (1300) in `art/ce-<p|d>-*.webp` (24 shots, 12 states each). The live rule errors line up with the import's refusals except for the small gaps listed below. Tokens are app tokens, copy obeys the copy rules, and nothing requires importing from `design/`. Yellow, not Green, because the build rests on several engineering calls the handoff only gestures at: the server-side Submit, how visible text maps to a key (data text especially), and a few small states and rules the boards do not draw. Each has a nearest drawn pattern, so none needs Design. No Orange or Red gap found. UI may start once the plan PR records the decisions below.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Five locked points mapped in README "Source of truth"; hidden text, production and players are excluded explicitly.
- ✅ Four open questions (Q1 to Q4) settled and marked LOCKED.
- 🟡 Non-goals are implicit only: no editing of non-key text, no merge handling, no multi-admin conflict handling. The plan states them.

### 🎭 State coverage
- ✅ Off, on, targeted, editor (plain, fill-ins, variations, rule error, read-only), tray, submitting, submitted, failed: all at both widths. Read-only (`ce-d-ed-ro`) and phone Failed (`ce-p-failed`) viewed and match the README.
- 🟡 Not drawn: empty tray (bar "0 edits" or `N edits ›` pressed with none); the overlay's own loading and error state (the export rows fail to load when the mode turns on); a Submit refused for a rule or a GitHub or network error (README says "same banner, own line" and `copy strings.ts` has no strings for either). Follow the Failed banner and the bar's pattern.
- 🟡 Editor keyboard and focus behavior (desktop Esc, focus trap, return focus to the targeted text, keyboard targeting of text) is not stated; the app's existing popover and sheet behavior is the pattern.
- 🟡 Outline on clipped text: `outline` is clipped inside `overflow:hidden`, line-clamped or truncated boxes. The boards were drawn over one page. The plan decides a fallback (inset ring) for clipped nodes.

### 🔌 Data contract
- 🟡 Key matching: "overlay matches visible text nodes against the export rows" (templates as patterns, plural twins, shared text via Q1). This is plausible but unbuilt; the export (`scripts/lib/copy-sheet/walk.mts`) must be exposed to the admin on staging. Plan decides the payload shape and a match-ambiguity rule beyond Q1.
- 🟡 Read-only data text (theme names, card names in demo decks) has no row in the export (it is data, not a leaf), yet the read-only editor shows a key (`EDHREC data · theme · dinosaurs`). Something must tell the overlay the text is data. README also says "no new attributes in the pages", which cannot be true for this case. Eng call: mark the few data surfaces with a marker where they render, unmarked unmatched text stays plain; plan records which surfaces. Hugh would want to know only if he expects every visible word outlined.
- 🟡 Submit: the import (`scripts/lib/copy-sheet/land.mts`, `pnpm copy:import`) makes a git worktree, runs typecheck and lint, then pushes and opens the PR; a serverless staging deploy has no checkout. Plan must choose a GitHub API commit path (validate on the server with `problems()`, skip typecheck and lint since CI runs them, run the test-literal rewrite) and a token with narrowest scope held only on the staging project. Admin gate: `isAdmin(userId)` plus `adminEnvironment() === "staging"`, checked in the server action and the data route, not only the render.
- 🟡 Staleness has a timing gap: staging syncs once a day from main, but the import's stale check compares against `origin/main`. A string changed on main today (or in an open copy-edit PR) shows old text in "Now" and fails as stale. The Failed copy covers it ("Changed on main since this page loaded"); the plan should say so and consider a second admin's open PR on the same key.
- 🟡 Variation labels ("When n is 1", "Otherwise") come from the row's read-only `context` column. Only the plural-helper shape is drawn; ternaries with other conditions need a generic fallback label ("Variation 1", showing the condition) from the nearest pattern.
- 🟡 Validator parity. Matched in the editor: placeholders missing, em dash, exclamation, tell words, British spellings, caps by key kind, read-only, stale. Not in `copy strings.ts`: extra or duplicated fill-in or braces where there are none; a line break; leading or trailing space; the second tell pattern (stock phrases, `TELLS` in `validate.mts`); the bare `—` exception (a lone em dash is allowed for a no-value row). Plan reuses `problems()` from `validate.mts` client-side so the list cannot drift, and adds a string per extra rule in the same voice as `rules.*`. The cap shown ("3 of 8 words") counts a fill-in as one word, as `wordCount` does.

### 🧱 Codebase fit
- ✅ Tokens: `overlay.js` uses only `var(--accent|accent-text|bg|border|border-strong|danger|elevated|fg*|font-*|modal-shadow|success|surface-raised|surface-sunken|warning)`; all exist in `src/app/globals.css`. No hex in the overlay.
- 🟡 Two raw values: scrim `rgba(8,6,4,.55)` and the shadows `rgba(0,0,0,.6|.35)`. Use the app's existing scrim and `--modal-shadow`; not a Design gap.
- ✅ Staging dot reuses `--warning` per the admin head chip; the door matches the admin chrome (`adminEnv` in `shell.tsx`, `adminEnvironment()`).
- ✅ Copy: `copy strings.ts` has no em dash or exclamation mark; US English; button labels are 3 words or fewer (`Open pull request`, `Add to edits`, `Open on GitHub ↗`, `Update edit`, `Remove edit`, `Clear all`, `Try again`). The only em dash found in the handoff is in the README H1 and an intentional error demo in `overlay.js` (not shipped). Mind `check:inline-copy`: the strings go in `src/lib/copy/`, not inline, and the key-tag mono text and "Preview:" prefix come from there.
- ✅ Nothing requires importing from `design/` or copying assets to `public/`; `scratch-gen/` is reference only.
- 🟡 Needs the new switch (flag) decision: `requestFlags` rules apply if gated by a switch; the admin check may be enough and the plan says so. Do not add a switch without asking Hugh.

### ♿ Cross-cutting
- 🟡 Accessibility: see keyboard and focus above. Dashed accent outlines and `--fg-faint` dotted lines are non-text indicators, but the read-only state is also carried by the lock and cursor, not color alone. Admin-only, so no WCAG launch blocker.
- ✅ Performance: the overlay and export rows load only for an admin on staging; plan must keep them out of the player bundle (dynamic import behind the server check, which README says).
- ✅ Telemetry: none expected; a ThirdPartyName or card names are never sent anywhere.

### ⏰ Drift from reality
- ✅ Boards drawn over `/commanders/choose` from main 5a06e8c; the files named (`docs/agents/copy-sheet.md`, `scripts/lib/copy-sheet/`, `src/lib/copy/`, `adminEnvironment()`) exist as named. Rebase check before the plan: `check:inline-copy` and the copy moves (#3282 to #3288) just landed, so key names in the art (`help-me-choose · intake.title`) should be re-read against the current copy files.

### 📝 Decision log
- ✅ Locked (C1 to C5, Q1 to Q4) separated from "For engineering (suggested, the plan PR decides)".

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: Submit path. GitHub API commit from a server action, validate with the shared `problems()`, `copy-edit-<utc>` branch, old to new table, tests rewritten as the import does; token only on staging; admin and staging checked server-side.
- Item 2: Key matching and data text. Overlay receives the export rows; ambiguity beyond Q1 shows the same "which one is this" picker; data surfaces carry an explicit marker so read-only reasons can show. Record which surfaces.
- Item 3: Undrawn states (empty tray, overlay load failure, rule refusal and GitHub or network failure copy) follow the Failed banner and bar patterns; add strings to `copy strings.ts` leaf in `src/lib/copy/`.
- Item 4: Rules parity: client uses the server's `problems()`; add strings for the missing rule kinds (extra fill-in, whitespace, line break, stock phrase).
- Item 5: Variation labels fall back to the row's condition when it is not the plural shape.
- Item 6: Stale-vs-staging-lag wording and the second-admin same-key case.
- Item 7: Clipped text gets an inset ring; keyboard and focus follow the existing popover and sheet.
- Item 8: Scrim and shadow use the app's existing tokens.

## Decisions inherited

- Admins only, staging only; players and production get no door and no script.
- Visible text only; hidden text goes through the review after submit; no search UI.
- Tray across pages and reloads in the browser (Q2); one Submit, one PR; staging unchanged until it merges.
- Click targets text while the mode is on, Done gives the page back (Q3); edits preview solid (Q4); shared text asks which key (Q1).
- Chips move but never delete; variations edit together; Add is disabled while any error stands.
- Phone is a first tap to target, second tap to edit; phone and desktop ship together.
