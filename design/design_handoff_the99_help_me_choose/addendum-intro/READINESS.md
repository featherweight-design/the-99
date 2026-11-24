# Readiness Review — Help me choose intro (addendum R1)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-23 (against `origin/main` at c444a93eb)
**Related ticket(s):** design PR #3266 (addendum to `design_handoff_the99_help_me_choose`)
**Plan PR target:** TBD (one PR: `ChooseIntro`, its copy file, one column, one server action)

## Summary

Buildable as drawn. The surface is one new panel on the form view of `/commanders/choose`, and every state it names is reachable from code that exists today. The four open gaps (G1 to G4) are engineering decisions that the nearest shipped pattern settles, so none needs a Design round. Findings: G1 needs one additive migration; the credit and allowance logic is read, never changed; the daily line reuses a number the page already reads. Phone and desktop are both drawn. Next: plan PR records the clarifications below, then the copy-review pass (G4).

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary stated: the form view only; results, History, the form and the loading screen unchanged. Non-goals and "No About entry" stated. Q1 to Q3 settled and logged.
- 🟡 The README names G1 to G4 as engineering gaps, which is the right place for them (resolved below).

### 🎭 State coverage

- ✅ Open, folded, opened-again, and phone and desktop at 390 and 1300 are drawn.
- 🟡 "Credits off" (payments off, model calls paused, standing unreadable) is marked "not drawn (eng)". The code settles it: `readAllowance(...).catch(() => null)` already yields a null standing on the form; the daily line is omitted when standing is null, and the paid tile keeps its line (see clarification 4).
- ✅ Signed-out: the route calls `requireUserId()`, so there is no signed-out state.
- ✅ Loading/error: the panel reads nothing that can fail the page except the mark, which is lean and fails open (see clarification 1).

### 🔌 Data contract

- ✅ Daily line: `readAllowance` already computes `limit` from `dailyLimitFor` (`src/lib/model/allowance.ts`), and the page already passes `standing` (via `toStanding`) to `IntakeForm`. The intro needs no new allowance read. The ledger is not feature-filtered, so "shared by every tool" is true.
- ✅ "Leave it empty and nothing is spent": `submitChoose` redirects with no reservation when words are empty.
- 🟡 Per-account intro mark (G1): no column exists; needs a new nullable `user_prefs` column (see clarification 1).
- 🟡 Example art (G2): the catalog has `cards.art_crop_uri`; see clarification 2. The example's figures (91%, 79 of 99, $135) are fixed illustrative copy; the row facts use the shipped `figTheme`/`ownCount`/`ownBuy` shapes.

### 🧱 Codebase fit

- ✅ Look reuses Home's search panel tokens (`color-mix(var(--accent) 55%, var(--border))`, accent wash to `--surface` at 60%, 12px radius, verified in `home-search-panel.tsx`). The `1 credit` pill reuses `helpMeChooseCopy.read.cost`.
- ✅ Copy lives in a new `src/lib/copy/help-me-choose-intro.ts`, like the sibling `help-me-choose-history.ts`. Strings carry no em dash and no AI/model/LLM wording.
- 🟡 Desktop shows ranks 2 and 3 as unnamed thumbnails and bars; their commanders are not named in the copy file (clarification 2).
- 🟡 `ChooseIntro` needs a client island (fold state, jump link). The page is a Server Component, so the fold decision is made on the server and passed as a prop (clarification 1).
- ✅ `allowance-rule.ts` lives at `src/lib/model/allowance-rule.ts`; the intro adds no `used`/`limit` comparison (`credit-gates.test.ts` stays green).

### ♿ Cross-cutting

- ✅ `Hide` and the folded line are 44px buttons on phone; folded line carries `aria-expanded` and `foldedAria`.
- 🟡 `Go to Anything else? ↓` must move focus to the words textarea (G3, clarification 3).
- ✅ Performance: one extra indexed read on the form view only; results views are untouched. No telemetry asked.

### ⏰ Drift from reality

- ✅ Named files and components exist as named: `choose/page.tsx` (form branch with `ChooseHeader`, `IntakeForm`), `home-search-panel.tsx`, `IntakeForm`'s `Anything else?` label, the `1 credit` pill, `dailyLimitFor`.
- ✅ The route is `/commanders/choose` as the README says; the older `/decks/new/choose` path is the previous home.

### 📝 Decision log

- ✅ Q1 A, Q2 A, Q3 A settled and approved; G1 to G4 logged with owners. The handoff marks what is locked.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **G1, the intro mark.** New nullable column `user_prefs.choose_intro_seen_at timestamptz` (precedent: `tour_seen_at`, `welcome_strip_dismissed_at`, `find_a_deck_closed_at`). It needs one additive migration (next drizzle number at plan time, after `0270`), applied by the Vercel production build; no backfill (null reads as "open", per the table's convention; existing players see it open once and can Hide). A `user_prefs` array key or a moments id does not fit: moments are a closed registry of discovery moments, and the existing columns are all unrelated. Write once, only while null (`insert ... onConflictDoUpdate ... setWhere isNull`), because `user_prefs` carries the `user_data_touch` stamp trigger, which would otherwise retire Home's cached payload for nothing. Two writers: `submitChoose` marks it after its size guard and before any redirect (so empty-words submits count), best effort, outside the credit reservation; and a small `hideChooseIntro` server action for Hide, with no `revalidatePath` (the client folds locally). The page reads the mark in the form branch only, alongside History and the allowance, and passes `initiallyOpen` as a prop, so there is no flash. A failed read draws the panel open. Opened-again is client state for this view only. Add the column to the account purge only if a per-column list exists (the table is already purged whole). No flag: it rides the route.
2. **G2, example art.** Read Ghalta's `cards.art_crop_uri` by name on the form view, a decoration with a failed read drawing the example without art (as the page does for `sets`). Ranks 2 and 3 on desktop use two Dinosaur commanders chosen at plan time from the board's `hmc-d-zoom.webp` (names not in the strings) and read the same way; or draw them as bars only. Never copy `design/art/` into `public/`. Pin the example's figures as constants, labeled "Example", so nothing reads as the player's own.
3. **G3, jump link.** Anchor to the words textarea: give the field a stable DOM id (it currently uses `useId`), `scrollIntoView` with a bottom scroll margin of the dock's measured height (`useDockClearance` / `--dock-reserve`, the dock is `fixed` over the tab bar on phone), then `focus({ preventScroll: true })`. Probe at phone width.
4. **Credits off.** Standing null or `paused`: omit the daily line, keep the tile's line. Owner share or group allowance: the line says the reader's own `limit`. Plural via the copy file's `daily(free)`.
5. **Copy-review (G4)** runs before the build; the `1 credit` pill text comes from `read.cost`, not a second string.

## Decisions inherited

- Fold after the first Find commanders or Hide; open on every visit before that (Q1 A).
- One fixed example for everyone, no read (Q2 A).
- The header's sub line stays (Q3 A).
- Never the words AI, model or LLM; no em dashes; no About entry this round.
- Decide the fold on the server so the open panel never flashes.
- `design/` is reference only: nothing imported, no assets copied.
