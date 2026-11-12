# Readiness Review — Friend links R1 (reusable link, QR and code; friend requests)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-12 (cold read against origin/main at a67749005, after #2879 and #2891 and migration 0239)
**Related ticket(s):** PR #2901 (this handoff); parents `design_handoff_the99_invites/`, `design_handoff_the99_social_r1/`
**Plan PR target:** TBD

## Summary

Every surface is drawn on the shipped shell and components, phone for every state and desktop for most, with the phone rule holding where a desktop frame is omitted (`STATES-friends-link-r1.md:3`). No state the build needs is undrawn, so there is no Design round. The handoff is a large backend change, though: a new friend-request table, a static per-player code, a reusable link, the newcomer becoming a request instead of a friend (Q1), and the retirement of single-use links. Two items in its own engineering gaps are security defects as written and must not be built as drawn. **G1 makes the link's token "follow the same rule" as the six-character code, and the drawn URL is `/f/<name>-<code>`** (`scratch-gen/render.tsx:40`). Together with Q2 (the signed-out page names the owner and shows their card), that gives an unauthenticated, enumerable directory of every player's name and signature card at about 30 bits per guess. It also puts the owner's name in a path that Sentry and PostHog scrubbing do not cover. **G6 holds one of the owner's invites from Join's Send code on a link that never ends.** With the shipped 7-day `HOLD_MS`, strangers can drain a leaked link's invites. Clarifications 1 and 2 settle both on the engineering side. The G1 token change departs from a line attributed to Hugh, so it goes to him as a call with a recommendation. Copy goes to `/copy-review` before implementing (README).

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Hugh's five rulings are mapped to boards (`README.md` "Hugh's rulings"). Ruling 5 (handles) is room only: the `Have a friend's code?` section is the slot, and nothing is drawn.
- [✅] What retires is named (G7: the chooser, the invite QR, Open friend links, `MAX_OPEN_INVITES` at `src/lib/social/client-rules.ts:53`).
- [🟡] The handoff does not say how pending requests are treated by the account purge (`src/lib/social/purge.ts`) or which feed or push kind a request raises. See clarification 7.

### 🎭 State coverage

- [✅] /friends: 0, 1 and several requests, answered, empty and newcomer (F0 to F5, S3). Add: A1 to A9. Reset: R1 to R3. Landing signed in: L1 to L7. Signed out: S1, S2 and L7. Phone is drawn for every state.
- [🟡] Undrawn but ruled in STATES: Sending, Copy failed, Reset failed, Join, and a request alongside spare asks. Each follows a shipped pattern (`press-wait.ts`, the shared toast, `/join` unchanged, `waiting-on-you.tsx` order).
- [🟡] `STATES` says V2 (initials, no signature card) is drawn (`STATES-friends-link-r1.md:70`), but `art/` has V1 only. The rule names the shipped initials draw, so this is clarification 8, not a gap.
- [🟡] No state for a code entered while the code-entry rate cap is reached. Draw it as A6's danger line with its own words (clarification 3).

### 🔌 Data contract

- [🔴→🟡] **Link token = code (G1, `README.md` G1; `render.tsx:40`, `/f/wren-k7q4xm`).** Today's link is 128 random bits (`isInviteToken`, `client-rules.ts:56`), and signed out it reads nothing (`src/app/friend/[token]/page.tsx:3`, E8). A six-character code over 31 symbols is about 8.9×10⁸ values. On a public route with no account, with Q2 naming the owner, that is an enumeration surface. The name slug also leaks the owner's display name (a `ThirdPartyName`) into URLs, history and referrers. `/f/` is not in Sentry's or PostHog's `TOKEN_PATHS` (`src/lib/sentry/scrub.ts:54`, used by `src/lib/analytics/posthog.ts:46`). This is clarification 1, Hugh call H1.
- [🔴→🟡] **Invite holds on a reusable link (G6).** `HOLD_MS` is 7 days (`src/lib/invites/rules.ts:14`). The shipped Send-code rate rule is per visitor and token, so many visitors can each hold an invite and drain the owner's balance. This is clarification 2.
- [🟡] There is no friend-request store. It needs a new table and migration (after 0239): one waiting row per ordered pair (partial unique index), `via` (`link` | `code`), state (waiting, accepted, declined, withdrawn), and timestamps for G3's 30-day notice quiet.
- [🟡] A static code needs a per-player store with uniqueness across every player, plus a set of retired codes that are never reissued (G1). Store a keyed HMAC (as `codeHmac`, `src/lib/invites/tokens.ts:45`) or the plaintext with a unique index. The owner's sheet must show the code, so a one-way hash alone does not work. Decide in the plan.
- [🟡] Q1 changes the newcomer path: `spendInviteOnSignUp` calls `welcomeInvitedIn` (`src/lib/invites/spend.ts:80`), which makes them friends. Under R1 it writes a waiting request instead.
- [🟡] The badge: `waitingAsksCount` (`src/lib/social/spare-requests.ts:635`, `shell.tsx:126`) gains friend requests (G8). It lives in `spare-requests.ts`, and the request count belongs in a new `src/lib/social/` module that the shell sums.
- [✅] The signed-in "opening sends" rule (G2) has a shipped pattern: a client component after mount (`SpendFriendLink`, `page.tsx:52`). A GET render never writes, so prefetches and unfurl bots send nothing.

### 🧱 Codebase fit

- [✅] Every `var(--…)` in `friend-links.diff` and `friend-link-body.tsx` exists in `src/app/globals.css`. Rows reuse `WaitingOnYou`'s spare row, `FriendCard`, `LandingColumn` and `SocialModal`.
- [🟡] `CodeBoxes` (`src/components/join/join-parts.tsx:51`) is digits only (`inputMode="numeric"` at :82, `parseCode` `^\d{6}$` at `rules.ts:132`). The friend code needs a letters variant: `inputMode="text"`, `autoCapitalize="characters"`, no `one-time-code`, case folded, the gap after three, and the 0/O/1/I/L alphabet rejected or mapped.
- [🟡] Strings in the copy file interpolate `name` into plain template strings. Under the `ThirdPartyName` rule they render through `PersonText` segments, as the diff's own row does (`friend-links.diff:292`, which uses `as any`; the build types it).
- [🟡] `scratch-gen/README.md` uses `npm install`. That is scratch-only, so nothing ships from it.

### ♿ Cross-cutting

- [✅] QR `aria-label`, the code read out character by character (`codeAria`), `role="alert"` on code errors, and 44px presses on phone.
- [🟡] **Rate limits are named only for wrong codes ("a cap … per hour", G1).** The `src/lib/rate/` infra exists (`RATE_RULES`, `rules.ts:19`). This is clarification 3.
- [🟡] G10 asks for one switch. A new switch needs Hugh first (H4).
- [🟡] Docs: `docs/agents/social.md:7,257` and AGENTS.md say "single-use invite link or QR, never search". Update them in the build PR that lands the change.

### ⏰ Drift from reality

- [✅] Frames are renders of current main (`FriendsView`, `WaitingOnYou`, `NavRail`, `MobileHeader`, `TabBar`). Every file the diff touches exists as named (`account-menu.tsx`, `social-modal.tsx`, `waiting-on-you.tsx`, `src/lib/copy/social.ts`).
- [✅] #2879 and #2891 (invite give-ups, `request_id` idempotency, `drizzle/0239_invite_request_id.sql`) touch only the email and QR reservation path. The email row stays (Q3), so it rides on them unchanged.
- [🟡] The avatar (V1) needs the shell to read the own display name and signature card. `account-menu.tsx:425-430` reads Clerk's name and email today. This is an own-profile read, not a cross-user one.

### 📝 Decision log

- [✅] Ten numbered calls, Q1 to Q3 with Hugh's approval (2026-11-12), and gaps G1 to G10 are recorded in `README.md`.
- [🟡] G3 says "suggest" a 30-day notice quiet, and the abuse items below are not decided. The plan records them.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **The link token stays a capability, separate from the code.** The link is `/friend/<128-bit random token>`, as `isInviteToken` shapes it today, with no name in the path. It is minted with the code and rotated with it on Reset (G5). The six-character code is typed only in the signed-in Add a friend box, behind the cap in item 3. The sheet's link field truncates as shipped. Add any new path to `TOKEN_PATHS`. Q2's named signed-out card then reaches only someone who holds a 128-bit link. Unknown, reset and never-existed tokens draw one identical L7 with no timing difference (one indexed lookup either way). Needs H1.
2. **Invite holds on a reusable link.** Hold an invite only at Send code and only for the email-code window (`CODE_TTL_MS`, 10 min), not `HOLD_MS`. Spend it at account creation, cap concurrent holds per link (proposal: 2), and keep the shipped per-visitor-and-token Send-code rule. Out of invites (S2) when nothing is free, including holds.
3. **Rate limits (new `RATE_RULES` buckets, ENFORCED).** Proposals:
   - Code entry per account: 10 wrong in an hour and 30 in a day. Count every try, not only misses, so a hit does not reset it.
   - Requests sent per account: 20 a day, by link or code.
   - Signed-out link landing per visitor: `anon.ts` keying.
   - Reset per account: 5 a day, so rotation cannot be used to churn tokens.
   - The capped state reuses A6's danger line with its own words.
4. **Request spam.** Keep one waiting row per pair. Withdraw (G4) followed by Send it again sends at most one owner notice per pair per 30 days, the same quiet as G3. A declined requester sees Request sent indefinitely and the owner gets no new row. Every request write locks the pair in the friendship rows' user id order, as spare requests do.
5. **Enumeration.** A5 names the code's owner. That is inherent and bounded by item 3. A6 never distinguishes a reset code from one that never existed (already ruled). A7 and A8 reveal nothing new.
6. **Every request read and write lives in `src/lib/social/`** and joins on the viewer. Payloads carry `public_id`, and names are `named()` and drawn by `PersonText`. `check:social-reads` covers the new table.
7. **Purge and feed.** The account purge deletes both directions of a user's requests. The kind of notice a request raises (a feed item and its push) follows the spare-request pattern, `kindEnabledAt` on by default.
8. **V2 avatar.** No signature card means the display name's initials, as Home draws them (shipped). No board is needed.
9. **Letters `CodeBoxes`**, as in Codebase fit.

## Hugh's product calls

- **H1.** G1 says "the link's token follows the same rule" as the code. Recommendation: the code rule applies to the code only, and the link keeps a 128-bit token (clarification 1). Building G1 literally, with Q2, publishes an enumerable directory of names and cards.
- **H2.** Block, or Decline and don't ask again. Today Decline is silent with a 30-day quiet, so a determined requester returns monthly. Assume abuse: a permanent decline per pair is recommended. It needs no new UI beyond Decline's meaning.
- **H3.** Reset keeps waiting requests (G5). Recommended as drawn. Bulk decline is a follow-up only if asked for.
- **H4.** The G10 switch. A new switch needs your yes. Recommended yes, since every add-a-friend path changes.

## Copy-review (before implementing, README)

- Every string in `friends-link · copy strings.ts`, plus the capped-entry line (item 3).
- `invitesNone`: "join through it" has no clear antecedent.
- `reset.done` leads with a "✓" glyph inside the string.
- `signedOutBody`, `noneFine` and `sentRules` are long, and each repeats the name two or three times.
- Confirm "Select, never Press" across the set (README call 10).

## Suggested PR split (no stacking, each under ~800 lines)

1. **Backend: requests and codes.** Migration (request table, code store, retired codes, link token); `src/lib/social/friend-requests.ts` (send by link or code, accept, decline, withdraw, pair lock, quiet); rate buckets; badge count; purge; `TOKEN_PATHS`.
2. **Backend: newcomer path.** Join on a reusable link: short holds, the concurrent cap, and the Q1 spend that writes a request; retire `createInvite` and `MAX_OPEN_INVITES` once existing links lapse (G7).
3. **UI: Add a friend sheet.** Link, QR, code, invites line, reset, letters `CodeBoxes`, A1 to A9 and R1 to R3.
4. **UI: /friends.** Waiting on you request rows (F0 to F5, S3) and the badge.
5. **UI: landing.** `/friend/[token]` signed in (L1 to L7) and signed out (S1, S2).
6. **UI: header avatar** (V1 and V2), then the docs and AGENTS.md update.

## Decisions inherited

- Hugh's rulings 1 to 5, and Q1 (newcomer = request, invite still used), Q2 (signed-out names the owner) and Q3 (keep email invite), approved 2026-11-12.
- The code is static and unique, replaced only by Reset, never reissued, six characters without 0, O, 1, I or L, and read without case (G1, Hugh).
- Only a signed-in page view sends (G2). Decline and Withdraw are silent (G3, G4). Reset rotates token and code together, and waiting requests stay (G5).
- Copy review runs before implementing (Hugh, 2026-11-12).
