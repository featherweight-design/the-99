# Readiness Review — Card request history (R1d)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** #2984 (handoff PR #2995)
**Plan PR target:** TBD

## Summary

Buildable as drawn on today's tree. Every shipped piece it names exists as named. `sections.diff` applies cleanly to the five shipped files it patches (`your-requests.tsx`, `waiting-on-you.tsx`, `friends-list.tsx`, `pods-pane.tsx`, `friends-view.tsx`). The history rows it draws come from columns `spare_requests` already stores, except one: the date of a withdrawal. That needs the `withdrawn_at` migration the handoff names itself (G2). Rows survive an unfriend, as the handoff claims: `unfriend` deletes only `friend_links`, and `purgeSocialIn` deletes `spare_requests` only on account delete. So Q2's "re-friend and they return" holds with the friend-grant join. What's left are eng-side clarifications the drawn patterns settle. The plan PR records them, and the copy review (G5) still runs before implementation.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary is explicit: one Requests box with two tabs on `/friends` (R1d), Request history at the box's foot, one new route `/friends/requests` with You asked · Asked of you, Pods boxed on the right at 448. R1c's C1 is marked retired. The answer sheet's "All your requests ›" is unchanged.
- [✅] Q1 (keep everything) and Q2 (ex-friends hidden, with a foot line) are logged with recommendations, and Design's file says Hugh approved them.

### 🎭 State coverage

- [✅] Phone (390) for every state: H1/H2/H3, E1/E2, R1/R2, P1. Desktop: H1/H2 at 1300, D1–D3 at 1440.
- [✅] Every drawn state has a trigger: open/yes/no/expired/withdrawn on the asker side; open/yes/no/expired on the holder side; an empty tab (H3); an empty box tab (`PanelEmpty` sm); the ex-friend foot line.
- [🟡] Not drawn: the empty history tab on desktop (H3 is phone only), the "Show older requests" loading and failure states, and the route's loading and error states. Each follows a drawn or shipped pattern (see clarifications).
- [🟡] Two derived states aren't covered. (a) An open ask whose card the holder no longer offers: the asker reads it as `unavailable` (shipped kicker "No longer spare"), and `loadIncomingAsks` drops it from the holder's Waiting on you, so H's "Answer it under Waiting on you." would point at a row that isn't there. (b) An open ask that `expireStaleQuery` wrote `expired` because the friendship ended before day 14 (the asker re-asked the card after an unfriend). Its derived end date `created_at + 14d` can fall in the future.

### 🔌 Data contract

- [✅] `spare_requests` (`src/db/schema.ts`) carries status (`open|yes|no|expired|withdrawn`), `created_at`, `answered_at`, `copies`, `deck_id` (set null on deck delete), `asker_cleared_at` and `standalone`. Indexes `spare_requests_asker_idx (asker_user_id, created_at)` and `spare_requests_holder_idx (holder_user_id, status)` exist. The holder-direction page orders by `created_at`, which the holder index does not cover. That's fine at dozens of rows; the plan can add an index if it measures a need.
- [✅] Expiry is derived (`requestState`, `SPARE_REQUEST_DAYS = 14`, `expiresAt`). "No answer" dates come from `created_at + 14d`, as G2 says.
- [🟠→flag] **Migration:** there is no stored withdrawal time (no `withdrawn_at` in the schema or in `drizzle/`; latest migration is `0244`). G2's nullable `withdrawn_at`, written by both `withdrawQuery` and `withdrawForInsteadQuery`, is a product-approved migration in the handoff, not a gap. Rows withdrawn before the migration have a null date.
- [✅] The friend's face is the existing `OtherSide`/`faceOf` (commander art else initials), as Your requests reads it.
- [✅] G1 `loadRequestHistory` and G3's ex-friend count both belong in `src/lib/social/` (`check:social-reads`). G3 reads a count only, no names.

### 🧱 Codebase fit

- [✅] Reuses `SegmentedSwitch` (`kind="tabs"`, `size="compact"`, `fill`, `count`), `PersonText`/`personText`/`PersonInitials`/`ThirdPartyName`, `FadingImg`, `ART_CROP_TRIM`, `SpareGlyph`, `CardDetailProvider`/`useCardDetail`. Names reach the client as `ThirdPartyName` through `named()` in `src/lib/social/`.
- [✅] Tokens: `--surface-rail`, `--surface-inset`, `--surface-sunken`, `--elevated`, `--border`, `--border-dashed`, `--border-strong`, `--accent`, `--accent-text`, `--success`, `--fact`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint` are all in `globals.css`.
- [🟡] `--surface-hover` (the history row's hover, `scratch-gen/request-history.tsx`) is not a theme token. It falls back to `transparent`, so as written the row has no hover.
- [✅] Route: `/friends/requests` is a static segment beside `/friends/[publicId]`. `public_id` is a uuid, so the two can't collide.
- [🟡] On desktop, `SegmentedSwitch`'s compact `fill` is `md:flex-none` / `md:w-auto`, so the tabs take their content width. That matches D3 and H-desktop as rendered, but not the Tabs board's prose ("filling the band"). The frames rule.
- [🟡] The scratch code formats dates in a hard-coded `America/Denver` zone, which is a scratch artefact.

### ♿ Cross-cutting

- [✅] The tabs are a real tablist. Bare lists keep an sr-only heading. `HandoverMark` is `aria-hidden` with the words in the heading. Tap targets are 44px on phone. Names are marked `ph-no-capture` through `PersonText`.
- [✅] Performance: paged at 30 by cursor, one read per tab. No model call, no spend, no email, no new feature switch (the page rides the spare-request line's existing switch on `/friends`).

### ⏰ Drift from reality

- [✅] Rebased on e47c3e709. `sections.diff` dry-runs clean. `FriendsView`, `waiting-on-you.tsx` (which now includes friend requests, #2911), `pods-pane.tsx`, the copy keys (`yourRequests.kind.*`, `sheet.all` "All your requests ›") and Collection history's "Show older changes" all exist as named.

### 📝 Decision log

- [✅] R1b, R1c and R1d are recorded with dates, R1c's C1 is marked superseded, and Q1/Q2 are recorded as decided. G1–G5 are named for the build.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- C1 `withdrawn_at` (G2): a nullable column, written by `withdrawQuery` and `withdrawForInsteadQuery`. A pre-migration withdrawn row shows its kicker date as the day asked, the same as an open row.
- C2 Open ask the holder no longer offers. You asked: kicker "No longer spare" (the shipped `yourRequests.kind.unavailable`) with the open line. Asked of you: show it with the plain "asked" line, never "Answer it under Waiting on you." (it isn't there).
- C3 Ended date for expired rows is `min(created_at + 14d, now)`, so a row the unfriend path expired early never shows a future date.
- C4 Desktop empty tab: the H3 panel (`PanelEmpty` lg) inside the 720 column, as H1/H2-desktop place the list.
- C5 "Show older requests" loading and failure: Collection history's "Show older changes" behaviour, with the button pending and an inline retry. The route's loading and error states follow `/friends`' own.
- C6 Month groups: a month split across two pages merges into one band when the older page arrives, and the band count is the loaded count.
- C7 Row hover: the shipped list-row hover from Your requests or the Friends list, not the undefined `--surface-hover`.
- C8 Dates in the app's shipped date formatting, not the scratch code's fixed zone.
- C9 Tabs at desktop: content width, as rendered in D3/H-desktop (the shipped `fill` behaviour).
- C10 G5: copy review on `historyCopy` and `boxCopy` before implementing; strings go into `src/lib/copy/social.ts`.

## Decisions inherited

- Q1: everything kept, no retention job. Q2: ex-friends' rows hidden behind the friend-grant join; the foot line appears only when the viewer has such rows (a count, no names).
- Withdrawn asks never show on the holder's side. Cleared asks (`asker_cleared_at`) do show in history.
- History rows have no ✕ and no Ask again; the whole row opens card details.
- R1b boxed sections and empty marks; R1d one Requests box (opens on Waiting on you when anything waits; the unseen-answer diamond sits on Your requests' tab); Request history in the box's foot; desktop from 1180 puts Requests then Friends on the left and Pods (448) on the right; phone order is Requests, Friends, Pods.

## Flags (product calls, not gaps)

- Migration: `spare_requests.withdrawn_at` (nullable). No new feature switch, model call, spend or email.

## Design's own read (kept)

# READINESS · Card request history · R1d · Green

Approved by Hugh, 2026-11-18 ("This LGTM"). Issue #2984.

| Check | Verdict |
|---|---|
| Drawn over shipped UI | Yes: every frame is the shipped shell, `/friends` and its rows rendered from main with the shipped CSS, proposal applied (`scratch-gen/`). |
| Phone and desktop | Both: 390 for every state; 1300 for the history page; 1440 for the full `/friends` page with pods. |
| States with real triggers | Live and history rows from stored statuses; empty tabs; nothing open but a history; the ex-friend foot line only when the viewer has such rows. |
| Reads | New read stays in `src/lib/social/` with the friend-grant join (G1, G3); names via `PersonName`. |
| Open for the build | G2 `withdrawn_at` migration; G4 `CardDetailProvider`; **G5 copy review owed** on every new string before implementing. |

Decisions in force: Q1 show everything kept; Q2 ex-friends hidden with a foot line; R1b boxed sections and empty marks; R1d one Requests box with tabs, Request history in its foot, Pods on the right at 448. R1c's right-column move is superseded by R1d.
