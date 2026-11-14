# Readiness Review: Account in Settings

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14 (cold read, against the tree rebased onto `origin/main` at `1b72470d2`)
**Related ticket(s):** PR #2931 (handoff R1); brief `docs/superpowers/design-briefs/2026-11-14-account-settings.md` (branch `brief/account-settings`)
**Plan PR target:** TBD (`docs/superpowers/plans/`)

## Summary

The handoff answers every "open for Design" item in the brief and keeps every locked product call: name, devices and delete in the app; email, password and Google stay on Clerk's hosted page behind **More account options**; the delete erases at once with no grace period and no notice to friends; and no Clerk prebuilt UI is loaded (D2 is drawn in our own modal through `useReverification`'s `onNeedsReverification`). Every shipped part it names exists as named, and the Clerk APIs it relies on are in the pinned SDK. Nothing needs a Design round. What remains is engineering: the handoff's gaps G1 to G7 hold, but four of its code claims are wrong or incomplete (G2, G5, G6 twice), and those become decisions in the plan PR. One item is a spike that can turn into a question for Hugh (G3, Google-only re-verification). New strings go through `/copy-review` before the build, and one draft string drops a refund condition the shipped copy carries.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] The boundary matches the brief's locked calls and Hugh's 2026-11-14 product calls (README "Product calls"). Out of scope is stated: email, password and Google in-app, sign-out-all, two-factor, a grace period, a goodbye page.
- [✅] Removing the last sign-in method is explicitly not drawn, with its reason (no trigger in the app; Clerk refuses it on its own page) and a fallback string recorded for a later round (Delete-States).
- [✅] The engineering gaps are logged (G1 to G7), and G3 is named as a blocker for Hugh if the spike fails, not as a workaround.

### 🎭 State coverage

- [✅] The brief's state list is covered: devices loading and read-failed, name editing, a device signing out and its failure, one device, password account; D1 empty, typed, credits held (plan and packs, packs only), deleting, step-up cancelled, failed delete, rate limited; D2 password, code, Google, wrong password, wrong or expired code, deleting, rate limited; the landing after (`STATES-account-settings.md`).
- [✅] All six themes are drawn for the section and for D1 with credits (`Themes.dc.html`).
- [🟡] Desktop is drawn for the section (default, editing), the menu before and after, D1 held, D2 (password, code, Google) and the landing. The in-place states (devices loading, failed, signing out, one device; D1 empty, typed, cancelled, failed, limited; D2 wrong, busy, limited) are drawn at 390 only. Each lives in a component whose md frame is drawn (the 720 column; SocialModal's 440 dialog), so md is derived from those frames (clarification 9).
- [🟡] Not drawn: a plan subscriber who holds **no** paid credits (a live plan, every plan credit spent). `warnsBeforeDelete` (`src/lib/payments/held-rule.ts:10`) would draw no split, but the subscriber still needs "Your plan ends now and won't renew." (clarification 4).

### 🔌 Data contract

- [✅] Delete: `clerkClient.users.deleteUser` exists in `@clerk/backend` 3.29.0 (the backend that `@clerk/nextjs` 7.10.0 resolves to), and the deletion fires the same `user.deleted` webhook, so `purgeAccount`, its Stripe step 0 and the sweep are unchanged (`docs/agents/account-purge.md`). "Your plan ends now" holds: step 0 deletes the Customer, which cancels its subscriptions (`src/lib/payments/delete-customer.ts`; `docs/agents/payments.md:78`).
- [✅] Re-verification: `useReverification` with `onNeedsReverification({ cancel, complete, level })` is in `@clerk/shared` 4.45.1 (`dist/react/hooks/useReverification.d.ts:9-37`), so D2 can be our own UI. `SessionVerificationFirstFactor` is `EmailCodeFactor | PhoneCodeFactor | PasswordFactor | PasskeyFactor | EnterpriseSSOFactor` (`dist/types/sessionVerification.d.ts:39`): there is no OAuth factor, which confirms the handoff's G3 premise. D2 is driven by `session.startVerification`, `prepareFirstFactorVerification` and `attemptFirstFactorVerification` (`dist/types/session.d.ts:272-284`). These are the classic resource methods: the pinned SDK has no Future-API equivalent for session verification (only `signInFuture` and `signUpFuture`), so D2 cannot follow the sign-in flow's Future pattern (#2870) and must not pretend to.
- [✅] Devices: `user.getSessions()` returns `SessionWithActivitiesResource[]` with `latestActivity` (`browserName`, `deviceType`, `city`, `country`, `isMobile`) (`dist/types/user.d.ts:262`, `session.d.ts:338-350`). `clerkClient.sessions.getSession` and `revokeSession` exist for the server action's ownership check (`@clerk/backend` `SessionApi.d.ts:54,74`).
- [🟡] **G2 is a requirement, not a description.** The handoff says the shipped name action "also sets Clerk's `firstName`". It does not: `setDisplayNameAction` (`src/app/friends/actions.ts:43-50`) writes only the profile through `setDisplayName` (`src/lib/social/friends.ts:109`), and it has no rate limit. The plan adds both (clarification 2).
- [🟡] **G5's read is not `heldPaidAction`'s.** `heldPaidAction` (`src/app/account/delete-warning-actions.ts:11`) returns `readHeldPaid`, which is `{ plan, pack }` credit counts only (`src/lib/payments/held.ts:9-12`). It cannot say whether a plan is live. That read is `readPlanFacts` (`src/lib/payments/plan-read.ts:11`, with `holdsPlan`) (clarification 4).
- [🟡] **Settings has no profile read today.** `src/app/settings/page.tsx:25-46` loads news, push, spares and deck prefs only. The name row needs the reader's display name, and a reader who has never opened /friends may have no profile row (`setDisplayNameAction` answers `noProfile`) (clarification 3).
- [🟡] Rate rules: `src/lib/rate/rules.ts` has no account bucket (checkout, invites, friends, reports and so on). Delete, device sign-out and the name write each need one, enforced like the rest (brief locked decision 5; clarification 5).

### 🧱 Codebase fit

- [✅] Every reused part exists as named: `SECTION_HEAD` (`src/components/social/friends-list.tsx:26`), `TextField`, the name field and `socialCopy.page.nameField` (`src/lib/copy/social.ts:85`), `SocialModal` with `onBack` for D2's ‹ (`src/components/social/social-modal.tsx:53`), `SupportLink` (`src/components/credits/support-link.tsx:7`), `CodeBoxes` (`src/components/join/join-parts.tsx:51`), `SIGN_ERR` and `CODE_ERR` (`src/components/sign-in/auth-parts.tsx:24,29`), `SheetGrabber`, `ToastFrame` (`src/components/collection/edit-toast-frame.tsx:103`), `mirrorUrl` (`src/lib/url/mirror.ts:40`), and the shipped `codeWrong`/`codeExpired`/"It works for 10 minutes." (`src/lib/copy/join.ts:25,32-33`).
- [✅] Settings structure: one 720 column (`src/components/settings/settings-view.tsx:8`) with Notifications, Spares and Your decks (`src/app/settings/page.tsx:39-45`). Account goes after Your decks, in the shipped section pattern.
- [✅] Tokens: only `--fg`, `--fg-muted`, `--accent-text`, `--danger`, `--border`, `--surface-raised` and `--bg` (`Themes.dc.html`).
- [✅] Copy rules: no em dash and no British spelling in any product string (`account · copy strings.ts`, `PRIVACY-copy.md`). The two "—" in `STATES-account-settings.md` and the one in the README title are doc table cells and a heading, not copy. "coloured" appears only in a board's design note.
- [🟡] One draft string drops a condition. The widened refund line "Bought a pack or started your plan in the last 14 days?" loses the shipped "and not used it" (`src/lib/copy/credits-page.ts:70`), while the shipped refunds rule says "Unused packs and a plan's first month come back in full; used credits don't" (`credits-page.ts:78`). That is a factual regression for `/copy-review`, not a Design gap (clarification 8).

### ♿ Cross-cutting

- [✅] Accessibility: the typed word replaces a hold, for switch and screen-reader users (call 7); failures are `role=alert` and receipts `role=status`; device Sign out has its own label (`signOutAria`); autocapitalize and autocorrect are off on the word.
- [🟡] Delete must also do what the menu's Sign out does on this device. `onSignOut` clears recent card searches (`clearRecent`, `src/components/shell/account-menu.tsx:553`) and the push subscription (`forgetThisDevice`, `:557`), and the Privacy page promises recent searches are "cleared when you sign out" (`src/lib/copy/legal/privacy.ts:29`). The purge erases the server's push rows, but not this browser's local search list. So the delete clears recent searches and forgets the push subscription, both before the server call, while the session still holds (clarification 6).
- [✅] Performance: devices load on the client after paint, so the page's server render is not held by Clerk's API; held credits are read server side, so D1 needs no loading state (G5).
- [🟡] Telemetry: a delete must not trip GhostSession's Sentry warning (`ghost-session.tsx:62`), or #2926's production count of real ghosts fills with deliberate deletes (clarification 7).

### ⏰ Drift from reality

- [✅] The handoff was drawn from main the same day; the rebase onto `origin/main` was clean. Every file, component and copy key it names exists: `account-menu.tsx` (`manageAccount` row `:107`, `redirectToUserProfile` `:516`, `DeleteWarning` path `:35-37,526-543`), `creditsPageCopy.del` (`credits-page.ts:59-74`), `shellCopy.accountMenu.manageAccount` (`src/lib/copy/shell.ts:100`), and Privacy's "Deleting your account" (`privacy.ts:81`, whose text is exactly the handoff's "Now"). The sign-up hint already promises "Change it any time in Settings." (`src/lib/copy/join.ts:173`), which this build makes true.
- [🟡] **G6 is wrong about the toast's foot.** `--tabbar-h` is not 0 on the landing: it is set to 74px on `html` app-wide (`src/app/globals.css:587`), and `ToastFrame`'s center slot sits at `var(--tabbar-h,0px)+16px` (`edit-toast-frame.tsx:149`). Drawn as is, the toast floats 90px off the foot. The landing sets its own value, as `/report` does (`src/app/report/page.tsx:49`) (clarification 7).
- [🟡] **G6's "full load of `/?deleted=1`" collides with GhostSession (#2926).** After `deleteUser`, the browser's session token outlives the session by about a minute (`ghost-session.tsx:3-7`). `/` decides signed in or out by `auth()` (`src/app/page.tsx:96`), so a plain load draws the signed-in shell. GhostSession then fires, signs out and runs `window.location.replace("/")` (`ghost-session.tsx:69`), which drops `?deleted=1`, so the toast never shows (clarification 7).

### 📝 Decision log

- [✅] Ten design calls and Hugh's product calls are recorded with their reasons (README). Every new string is marked DRAFT for `/copy-review`. "Where a shipped component and a handoff disagree, the component wins" is stated.
- [🟡] One small inconsistency: the Failed-delete caption names `user.delete()` (client), while G1 rules a server-side `clerkClient.users.deleteUser`. G1 wins (clarification 1).

## Eng-side clarifications (Yellow)

1. **The delete runs on the server** (G1, as ruled): a server action checks `auth().has({ reverification: "strict" })` and returns Clerk's `reverificationError` when it fails. It is rate limited, then calls `clerkClient.users.deleteUser(userId)`. The client wraps it in `useReverification(action, { onNeedsReverification })` and shows D2 from that callback, never Clerk's modal. D2's ‹ calls `cancel()` and lands on D1's "Nothing was deleted." The Delete-States caption's `user.delete()` is read as this action.
2. **One name** (G2): Account's Change calls `setDisplayNameAction`. The plan adds a rate rule to it, and a best-effort `clerkClient.users.updateUser(userId, { firstName })` after the profile write commits. A Clerk failure is logged, never shown, because the profile is the name of record. The spike confirms no display surface reads Clerk's `firstName` except `accountIdentity` (`src/lib/shell/identity.ts`) when the player has no face.
3. **The name row's data**: Settings reads the reader's own profile (the `ensureProfile` path `/friends` uses, `src/lib/social/friends.ts:50`), so a reader who never opened /friends still has a name to show and to change.
4. **D1's money facts** (G5): Settings reads `readHeldPaid` and `readPlanFacts` in parallel, server side. The split draws when `warnsBeforeDelete` holds. The plan line draws whenever `holdsPlan` holds, **with or without held credits**. A live plan with no held credits draws the plan line and the widened refund line with no split, in the slot where the split's sentence sits. A failed read draws nothing, as the menu does today. A plan already set to cancel at period end still takes the line, since deleting ends it now.
5. **Rate rules**: three new enforced buckets in `src/lib/rate/rules.ts`: the delete (small, for example 5 an hour), the device sign-out and the name write. Clerk's own 429 maps to the same `tooMany` line.
6. **Before the delete call**: clear recent card searches (`clearRecent(user.id)`) and forget this device's push subscription (`forgetThisDevice`) while the session still holds, as Sign out does (`account-menu.tsx:553-557`).
7. **After the delete** (G6, corrected): on success the client calls `clerk.signOut({ redirectUrl: "/?deleted=1" })` (the session is already revoked, so a throw is caught and followed by `window.location.replace("/?deleted=1")`). Never a bare load, so the server reads no stale token, GhostSession never fires, and `?deleted=1` survives. The landing reads the param on the client, shows `ToastFrame` (`role=status`), strips it with `mirrorUrl`, and sets its own `--tabbar-h` (as `/report` does) so the toast sits 16px off the foot.
8. **Copy**: every new string goes through `/copy-review` before the build. It must restore the "not used" condition to the widened refund line (see Codebase fit) and look at Privacy's proposed paragraph, where "It happens at once" sits beside "within minutes" in a sentence with two colons. Privacy's change bumps `LEGAL_UPDATED` (`src/lib/copy/legal/shared.ts:26`). Retire `shellCopy.accountMenu.manageAccount`, `creditsPageCopy.del.says` and `del.go`, plus `DeleteWarning`, `heldPaidAction`'s menu use and the menu's held read (`account-menu.tsx:489-543`) once nothing imports them. The D2 code and password lines reuse the shipped `join.ts` strings.
9. **md for the 390-only states** follows the drawn md frames: the section's rows keep the 720 column's md sizes as drawn in `amonkhet-d-s-default`; D1 and D2 states keep the 440 dialog as drawn in `amonkhet-d-d1-held` and `amonkhet-d-d2-*`, with presses at 40 (D1) and 36 (the section's Delete account), as call 3 and call 6 say.
10. **D2's code target** is the email address on the `email_code` factor from `startVerification`'s supported first factors (its `safeIdentifier`), not the account's primary email. For a Google-only account that is the Google email, as drawn.

## Spike before the plan (may go to Hugh)

- **G3, Google-only accounts.** Confirm on Clerk's dev instance that `startVerification({ level: "first_factor" })` for a user whose only sign-in is Google offers `email_code`. If it does, D2 for Google ships as drawn. If it does not, this goes to **Hugh** as a product question (as the handoff says), not to Design, and the plan holds the delete for Google-only accounts until he rules.
- Also in the spike: the `strict` window (10 minutes, first factor) is the level G1 uses.

## Gaps requiring a Design round-trip

None.

## Decisions inherited

- Hugh, 2026-11-14: name, devices and delete in the app; email, password and Google on Clerk's hosted page behind **More account options** (`redirectToUserProfile()`); delete erases at once, no grace period, friends not told; no Clerk prebuilt UI in the app (Hugh, 2026-10-12).
- Brief locked: deletion semantics unchanged (webhook, tombstone, Stripe step 0, purge, sweep); unspent paid credits forfeited and the paid-credits warning shown before any delete; destructive steps re-verify; every server-side account action is rate limited and never reveals another email's account; mobile and desktop parity in the same PR; six themes; US English.
- Design calls 1 to 10 (README): Account is the last section on `/settings`; the menu's Manage account row leaves; one name with two doors; no sign-out-all; the delete is one SocialModal with D1 and D2; typing `delete` is the confirm (any case, trimmed); the plan subscriber's line and the widened refund line; re-verify by first factor; after delete, `/` signed out with the toast.
- "Paid" is `PAID_SOURCES` (plan, pack): the split never counts welcome or gift credits (`readHeldPaid` already excludes them).
