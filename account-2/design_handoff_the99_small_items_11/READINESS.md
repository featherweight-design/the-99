# Readiness: small items 11

**Verdict: Green.** Hugh approved R1 and its four open calls on 2026-11-08. No migration and no new switch: item 3 rides `ANNOUNCEMENTS_ENABLED`, items 1 and 2 ride no switch (logic and layout on shipped surfaces). Item 4 is Green **conditional on the dev-instance spike**: if either Clerk transfer fails, item 4 returns to Design (as the brief and README say). Every DRAFT string goes through `/copy-review` before its PR merges. About entries: Hugh's call at launch (brief).

## For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Role counts open their cards (M, one PR).** One tally behind the strip, What we counted and the list (today the strip reads `jobTally` and What we counted reads `profile.roles`, which can exclude commanders: `src/lib/tuning/cuts.ts:109`). The list reuses `SheetFrame` (`src/components/decks/pass-sheet.tsx:189`) and `DecklistRow` (`src/components/decks/decklist-row.tsx:203`) with its shipped undo (`undo.removed` + `undo.action`, `src/lib/copy/decks-builder.ts:367-368`). Role-overage rows are told apart by `CountRow.source === "role"` (`src/lib/tuning/cuts-count.ts:27-30`). Tests pin each list to the figure it opens.
2. **Consider with a role over (S to M, one PR, after item 1).** `buildShelves` order and folding through the shipped `use-folded-shelves` (`src/components/decks/use-folded-shelves.ts:19`); the over clause and *your N →* open item 1's sheet.
3. **Past announcements (M, one PR).** `/announcements` (no route exists today), a paged, kind-filtered read over `wizards_announcements` with per-month counts, and the foot entry in `src/components/home/whats-new.tsx` beside `ShowAllFooter`.
4. **Sign-in on Clerk (spike, then L, two PRs as Small items 7 READINESS already splits).** Spike first: `signIn.create({ signUpIfMissing: true })` then `signUp.create({ transfer: true })`, and the reverse. The invited check reuses the pattern in `src/lib/invites/clerk.ts:80` (`getInvitationList({ query, status: "pending" })`, re-filtered on the exact email). The ticket path needs the custom `/sign-up` to read Clerk's ticket; today `src/app/sign-up/page.tsx` handles none and the invitation link lands on Clerk's hosted page.

## Engineering audit (2026-11-08, against `origin/main` rebased under this PR)

**Verdict: Green.** No Orange item. Every code claim in the README and the gap notes below was read in the code. The differences are small and eng-resolvable; none changes a drawing.

| # | Claim | Finding | Resolution |
|---|---|---|---|
| 1 | `SheetFrame` sheet at 390, modal from `md` | True (`pass-sheet.tsx:189`, on `ModalChrome`) | None |
| 1 | Rows are `DecklistRow`: dot, name, mana, ✕, name opens card detail | True (`decklist-row.tsx:203`) | None |
| 1 | Undo row *{name} removed · Undo* | Ships as two strings, `undo.removed` and the *Undo* press; the "·" is the drawing's separator | Reuse as shipped |
| 1 | *By role* groups by single `card.role` | True (`src/lib/decks/grouping.ts:318`) | Unchanged, as drawn |
| 1 | A3: a role with zero cards draws static *—*, no press | The cell's figure reads **0** and its caption is the static *—* when it is not a control (`role-counter-cell.tsx:192-201`) | Read A3 as the caption; the figure stays 0 |
| 1 | Captions *consider →* / *suggest →*, land *balance →* | True at 390; desktop reads *suggest swaps →* and *balance mana →* (`decks-builder.ts:95-96`, `tuning-hub-shortcuts.ts:9-10`) | *cards →* gets a desktop form only if `/copy-review` wants one |
| 1 | What we counted rows unpressable; role rows separable | True (`cuts-free-count.tsx:195-210`; `source` on each row) | None |
| 2 | Shelf order: short, then *Synergy · {commander}*, then met, then over | The board does not place the targetless **Threats & synergy** shelf (`decks-builder.ts:132`) | Eng keeps it after synergy and before met (it has no target to meet); flag in the PR |
| 2 | At-target clause *you have 10 of 10* | True (`decks-builder.ts:129`) | None |
| 3 | `FeedItemRow` seen ink, post-glyph plate, decklists' two presses, Home's diamond and ✕ | True (`feed-item.tsx:367,131-142,83-110,377,421`) | None |
| 3 | What's new has a foot for the entry | True: `ShowAllFooter` (`whats-new.tsx:147`) | None |
| 3 | Sub (DRAFT) *608 posts from Wizards since Jan 2023* | **608 is right; the date is not.** Production (read-only, 2026-11-08): 608 posts, the oldest published 2015-09-28, 606 of them baseline, 6 with no hero | The line is computed (count and first year) and its wording goes to `/copy-review`; the jump sheet spans 2015 to now |
| 4 | H2 uses the shipped `inviteOnlyCopy` body *with the proven email* | The shipped body is static and takes no email (`src/lib/copy/join.ts:55`) | A new body variant with the email, through `/copy-review` |
| 4 | J1/J2 follow the shipped *Confirming…* | True (`joinCopy.confirming`, `join.ts:28`); `joinCopy.failed` `:47`, `codeExpired` `:33` | None |
| 4 | Invited check needs Clerk's invitations list | The pattern already ships (`src/lib/invites/clerk.ts:80`) | Reuse |
| E | Errata E1 to E4 | Applied in this PR: `tuning_hub/README.md:90` and `READINESS-audit.md:176`, `small_items_7` README, READINESS and Sign-In board, `add_panel/README.md:14`, `announcements/README.md` | None |

### Needs Hugh

1. **Clerk dashboard (item 4):** ~~set the instance to email code only~~ (withdrawn by addendum A1, 2026-11-08): keep Google, email and password, and the email code switched on, and confirm the sign-up mode stays invitation-only (both Clerk instances). Hugh changes dashboard settings himself.

### Needs Design

Nothing.

---

## Design gap notes (R1)

For engineering's READINESS audit. Each note names what the drawing assumes that the code does not yet do.

## 1 · Role counts open their cards
1. **One tally.** The strip (`jobTally` via `label-role-counts.ts`) and What we counted (`profile.roles`) must read the same tally, and the list must come from it (brief: tests pin the list to the count). Cards with no label fall back to `card.role` in both or neither.
2. **Two-role cards.** The list is the tally's membership, not `card.role`, so Cyclonic Rift sits in Removal and Wipes. *By role* in the deck list is unchanged.
3. **Sheet/modal.** Reuse the pass sheet's `SheetFrame`; rows are `DecklistRow` with its ✕ and card-detail press. The undo row sits at the list's head; the list and the strip recount after a remove or undo.
4. **Captions.** `role-counter-cell.tsx`: met or over with count > 0 gains `cards →`; met with 0 stays static; under and land unchanged.
5. **What we counted.** Role-overage rows only gain a press (›, 44px hit). Curve, bracket and EDHREC rows stay static.

## 2 · Consider with a role over
1. **Shelf order.** `buildShelves` keeps short shelves first, then synergy, then met, then over.
2. **Folded default.** Met and over shelves start folded; `use-folded-shelves` stores the reader's opens as it does today. A role that goes over during the session folds on next render only if the reader hasn't opened it.
3. **Clause.** New over clause (DRAFT) beside the shipped at-target clause.
4. **your N →** opens item 1's sheet for that role.

## 3 · Past announcements
1. **Read.** A paged, kind-filtered read over `wizards_announcements`, newest first, 30 a page, with per-month counts for the heads and the jump sheet (brief).
2. **Includes** baseline, dismissed and switched-off kinds. Seen state is not written by the archive.
3. **Route** `/announcements`, signed-in only; entry in What's new's foot. No Settings, no push.
4. **States** drawn: loading skeletons, failed page (Try again), empty kind in a month.

## 4 · Sign-in on Clerk
1. **Spike first** (brief): prove `signIn.create({ signUpIfMissing: true })` → `signUp.create({ transfer: true })` and the reverse on the dev instance; record the instance's sign-up mode. If either fails, back to Design.
2. **Invitation-only routing.** After a proven code with no user: invited → S4 (*Use this email*) → U3; not invited → H2. Needs a check for a pending invitation on that email (Clerk invitations list, server-side).
3. **Ticket** lands on U3 with no code step.
4. **Busy and failure** states sit on the press; no new route.
5. **Dashboard:** ~~email code only~~. Withdrawn by addendum A1: the pages carry every method the dashboard has on (Google, password, email code). See below.

## 4 · Addendum A1: sign-in methods (Design gap notes, 2026-11-08; APPROVED by Hugh 2026-11-08)

Hugh's ruling: sign-in keeps Google, email and password, and the emailed code. Board `Sign-In-Methods` (K, L, M frames).

1. **Identify first.** K1's *Continue* runs `signIn.create({ identifier })` and reads `supportedFirstFactors`: `password` present → K2; otherwise `prepareFirstFactor({ strategy: "email_code" })` → S2, as today. An unknown email also goes to S2 (no enumeration on the code path). K2 itself shows the account has a password; Clerk's hosted page does the same today, so nothing new is revealed.
2. **Password:** `attemptFirstFactor({ strategy: "password" })`; a wrong one (`form_password_incorrect`) → K3. *Email me a code instead* → `prepareFirstFactor({ strategy: "email_code" })` → S2. Lockout after repeated tries is Clerk's: its message shows in the same `s7err` slot.
3. **Forgot password:** `reset_password_email_code` (K4), then `attemptFirstFactor` with the code and `password` (K5); a weak or breached password (`form_password_pwned`, length) shows Clerk's message in the `s7err` slot. Session set on success, landing as sign-in does.
4. **Google:** `authenticateWithRedirect({ strategy: "oauth_google", redirectUrl, redirectUrlComplete })` from K1 and L1, with an SSO callback route. M2 (email matches an existing account) is Clerk's account linking for verified emails; confirm it is on in the dashboard (the spike checks it). M1 is Clerk's `not_allowed_access` / restricted-mode refusal on the callback: route it to H2 with the Google email.
5. **Google with an invitation (L1):** sign-up by Google on an invited email is allowed in restricted mode when the Google email equals the invited one; the ticket must ride the OAuth sign-up (`ticket` / `__clerk_ticket` on the redirect). Add both to the item 4 spike: Google sign-up with a ticket, and a Google email that differs from the invited one (→ M1).
6. **Sign-up offers no password** (Hugh approved; L2 is not built). Setting a password later stays in Clerk's Manage account (`account-menu.tsx`).
7. **Spike additions:** the item 4 spike also proves Google sign-in, Google linking to an existing code/password account, and the password reset flow on the dev instance. If any fails, A1 returns to Design.

## Copy (for /copy-review)
DRAFT strings: item 1 lead; item 2 over clause and *your N →*; item 3 sub line, *Past announcements ›*, *Show older*, empty-month line and link, failed line; item 4 *{email} has an invitation.*, *Signing in…*, *Making your account…*; A1 *Use Google, or type your email.*, *Continue with Google*, *Continue*, *Enter your password*, *For {email}.*, *Forgot password?*, *Email me a code instead* (Hugh's words), *That password isn't right. Try again, or email yourself a code.*, *Reset your password* and its body, *Back to sign in*, *Choose a new password*, *At least 8 characters.*, *Save and sign in*, *Use the Google account for {email}.*, A1b *This password can’t be used anymore. Reset it to sign in.*, *Reset password* No em dashes; US spelling.

---

## Addendum A1 audit (engineering, 2026-11-08, against origin/main)

**Verdict: Yellow.** Nothing drawn is impossible on Clerk, and no state needs an app-owned session like `/join` did. Google, password, forgot password and the transfers all exist in `@clerk/nextjs` 7.5.20's Future API. Yellow because (a) the README and gap notes name the **legacy** API, (b) three states Clerk can produce are not drawn (new-device code, compromised password, a Google account with no first name), (c) the Google email on H2/M1 may not be obtainable, and (d) three pieces the drawing assumes are app work: an SSO callback page, the sign-in URL wiring, and an invitation `redirectUrl`. Every item is eng-resolvable except the three Design calls listed below, each with a stated fallback so the build is not blocked. Nothing here changes a drawing that is not already named.

**Verified in the installed types** (`@clerk/shared` 4.27.1 `dist/types/{signInFuture,signUpFuture,userSettings}.d.ts`, `@clerk/nextjs` 7.5.20 `dist/types/{index,legacy}.d.ts`). **Only a live spike can prove** runtime behavior: what Clerk returns for an unknown email, restricted-mode refusals, account linking, and the Google callback. The types carry no error-code-per-call table, so each "code" below is a string present in the package, not proof of which call returns it.

| State or claim | Finding | Resolution |
|---|---|---|
| README and gap notes 1 to 4 name `signIn.create`, `prepareFirstFactor`, `attemptFirstFactor`, `authenticateWithRedirect` | These are the **legacy** `SignInResource` methods. In 7.5.20 `useSignIn` from `@clerk/nextjs` is the Future hook; the legacy one is `@clerk/nextjs/legacy` (`legacy.d.ts:1`). The brief's `signUpIfMissing` and `transfer` are Future `create` params (`signInFuture.d.ts:36,44`), so the plan already assumes Future | Build on the Future API only. Map: Google `signIn.sso({ strategy: "oauth_google", redirectUrl, redirectCallbackUrl })` (both URLs required, `:180-193`); password `signIn.password({ password })` (`:385`); code `signIn.emailCode.sendCode()` and `.verifyCode({ code })` (`:389`); forgot `signIn.resetPasswordEmailCode.sendCode()`, `.verifyCode({ code })`, `.submitPassword({ password })` (`:451-467`); done `signIn.finalize()` (`:564`). No design change |
| K1 Continue: `create({ identifier })`, read `supportedFirstFactors`, password present goes to K2 | `supportedFirstFactors` exists on the Future resource and fills after an identifier is given (`:300`). **Unproven:** what `create` returns for an unknown email. `form_identifier_not_found` is a Clerk code in the package; with `signUpIfMissing: true` the brief expects `isTransferable` instead. The drawn rule "an unknown email gets a code (S2), no enumeration" needs `signUpIfMissing: true` on every K1 press, and Clerk then asks for a captcha when bot protection is on (`:44`) | Spike item 2. Build K1 on `create({ identifier, signUpIfMissing: true })`. If an unknown email still errors, the app shows S2 anyway and sends nothing, then S2 cannot verify; that is the failure to look for |
| K2 reveals "this account has a password" and README says Clerk's hosted page does the same today | Not checkable here (no hosted-page run). With identifier-first, `supportedFirstFactors` itself discloses a password. Clerk's instance setting for enumeration protection changes what comes back | Spike item 2 records it on both instances. If it differs from the hosted page, Hugh decides; the code path is unchanged |
| K3 wrong password, code `form_password_incorrect` | Present in the package, with a sibling `form_password_or_identifier_incorrect` (what Clerk uses when enumeration protection hides which half was wrong). K3 is reachable only after K1 found the account, but the app must map **both** codes to K3 | Map both codes to K3 and every other password error to the `s7err` slot. Test each |
| K3 and lockout: "Clerk's message shows in the `s7err` slot" | A pwned or compromised password at sign-in is its own refusal (`form_password_pwned__sign_in`, `form_password_compromised__sign_in`, `form_password_untrusted__sign_in` are in the package), and `needs_new_password` is a sign-in status (`:310`). K3's line, *That password isn't right*, would be false for these | **Needs Design 1:** a state for "this password can't be used; reset it" that lands on K4. Fallback so the build is not blocked: show Clerk's message in `s7err` and offer K4's link |
| New device after a correct password | `needs_client_trust` is a sign-in status (`:307`) and the MFA email code methods exist (`mfa.sendEmailCode`, `mfa.verifyEmailCode`, `:515-521`). If Client Trust is on in the dashboard, a correct password from a new device ends in an email code that K2 does not draw. Also `needs_second_factor` if any player has MFA | **Needs Design 2** (or Hugh turns the setting off; his call, it weakens password sign-in). Fallback: reuse S2 exactly (six boxes, resend) with the line *We sent a 6-digit code to {email}*; no new layout |
| K4 and K5 forgot password | Types match: `resetPasswordEmailCode` then `submitPassword` (`:451-467`); after submit the status is complete and `finalize()` signs in. Weak or breached refusals are `form_password_not_strong_enough`, `form_password_pwned`, `form_password_length_too_short` in the package | Buildable as drawn. *At least 8 characters* must be read from the instance's password settings (`PasswordSettingsData`), not hard-coded, or it drifts from the dashboard |
| Lockout after repeated tries and rate limits | Not in the types. Clerk's `user_locked` and 429 `too_many_requests` are documented, not verified here | Spike item 3 provokes both. Show Clerk's message in `s7err` as drawn |
| Google press: redirect and callback | `sso` needs `redirectUrl` (where the player lands) and `redirectCallbackUrl` (an app route Clerk returns to when a session was **not** created) (`signInFuture.d.ts:187-193`). Neither route exists: `rg sso-callback src` is empty. `/sso-callback` must also be added to the public matcher (`src/proxy.ts:43`) or a signed-out return loops to sign-in. The shipped `AuthenticateWithRedirectCallback` (`@clerk/nextjs` `index.d.ts:5`) is the legacy handler and cannot route to H2 or show M1 | **Build:** a public client page at `/sso-callback` that reads the sign-in: `status` complete then `finalize()`; `isTransferable` (no user for this Google account) then `signUp.create({ transfer: true })` and either `finalize()` or M1; an existing sign-up transferable (`signUpFuture.d.ts:357`) then `signIn.create({ transfer: true })`; anything else, the J3 failure line. Pin with a test per outcome |
| Google on invitation (L1, README gap note 5): "the ticket must ride the OAuth sign-up (`ticket` / `__clerk_ticket` on the redirect)" | **`SignUpFutureSSOParams` has no `ticket`** (`signUpFuture.d.ts:185-198`); `SignUpFutureCreateParams` has both `strategy` (includes OAuth) and `ticket` (`:33-69`). The webhook spends the invite only when the new user's public metadata carries `inviteReservation` (`src/app/api/clerk-webhook/route.ts:110-115`), which comes from the invitation through the ticket. A Google sign-up with no ticket never spends it | Build L1's Google press as `signUp.create({ strategy: "oauth_google", ticket, redirectUrl, ... })` or `signUp.ticket` then `sso`; the spike decides which carries the metadata. Test: the webhook spends the reservation for a Google sign-up |
| Invitation links land where? | `createInvitation` is called with no `redirectUrl` (`src/lib/invites/clerk.ts:92-98`) and `src/app/sign-up/page.tsx:1-5` says the link makes the account on Clerk's hosted sign-up, not here. H3 and L1 are reachable only when the invitation lands on the custom `/sign-up` | **Build:** pass `redirectUrl` to `createInvitation`, and set the instance's sign-up path (Needs Hugh 2). Invitations already sent keep their hosted links until they expire (`INVITATION_DAYS`) |
| M1 "H2 naming the Google email" | After a Google return with no user, `signIn.identifier` is **null** for OAuth (`:317`). The transfer refusal in restricted mode (`not_allowed_access` is in the package) may or may not leave an email on the sign-up. If it does not, the app does not know which address Google gave | Spike item 5 reads it. **Needs Design 3** only if it is absent: H2 without the address (the shipped static `inviteOnlyCopy.body`, `src/lib/copy/join.ts:55`, needs no email). Fallback is exactly that |
| L1 "allowed in restricted mode when the Google email equals the invited one", mismatch goes to M1 | Plausible, not stated in any type. Restricted mode is `SignUpModes = 'public' \| 'restricted' \| 'waitlist'` (`userSettings.d.ts:39`); "invitation-only" is `restricted`. Whether Clerk refuses a ticketed OAuth sign-up whose Google email differs from the invited one, and with what code, is runtime | Spike item 5 (both cases) |
| M2 "matches an existing account, signs in, no message" | Two mechanisms, both runtime: Clerk's automatic account linking for a provider-verified email (a dashboard setting), or the sign-up reporting `isTransferable` then `signIn.create({ transfer: true })` (`signInFuture.d.ts:36`). Clerk code `form_identifier_exists` and `external_account_not_found` are in the package. A Google email that matches an **unverified** email account will not link | Spike item 4. The callback above handles both outcomes. If Clerk refuses with an "already exists" code, the line is the J3 failure copy plus K1, and Design is told |
| Google account with no given name | U3 asks for a first name; the README says Google supplies it. A Google account can lack one, and the sign-up then reports `first_name` in `missingFields` (`signUpFuture.d.ts:349`) | **Needs Design 4:** none, if the callback falls back to the shipped U3 name field already drawn (reuse, name locked off Google's value only when present). Eng builds the fallback; flagging, not blocking |
| Proxy: `/sign-in` | Today `/sign-in` is a proxy branch that redirects a signed-out reader to Clerk's hosted page and a signed-in one Home (`src/proxy.ts:48-51`; the brief's `:43-48` is `isPublic` plus the start of this branch). Protected routes also call `redirectToSignIn`, which follows the instance's configured sign-in URL | **Build:** a real `/sign-in` page (server `auth()` keeps the signed-in-goes-Home rule, `session_exists` is in the package for the two-tab case), `/sign-in(/.*)?` and `/sso-callback` added to `isPublic`, and `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` on both Vercel projects (a public, non-secret value) plus the dashboard path (Needs Hugh 2). `src/app/clerk-hosted.test.ts` pins hosted sign-in by redirect and `prefetchUI={false}` (`layout.tsx:33`); it is rewritten, not deleted: `prefetchUI={false}` stays because the Future hooks use no prebuilt UI (spike item 1 confirms) |
| README: "setting a password later stays in Clerk's Manage account (`account-menu.tsx`)" | True: `account-menu.tsx:492` calls `clerk.redirectToUserProfile()` | None |
| Sign-up offers no password (L2 not built) | Consistent with the sign-up types: password is optional on `signUp.create` and a code-only account has none; K2 then correctly falls through to S2 | None |
| Edits to other handoffs (audit item 7) | **This PR touches only `small_items_11`** (README, READINESS, Main, Sign-In, new Sign-In-Methods board, `scratch-gen/`). It does not edit `small_items_7`, `tuning_hub`, `add_panel` or `announcements`; those errata merged in #2675. Consistent with the brief and with Hugh's ruling: `Main.dc.html` rule 4, README items 4 and the READINESS lines now strike *email code only*. Left stale: `small_items_11/Sign-In.dc.html` (header still reads "the email code, no password") and `small_items_7/README.md:148` ("methods beyond the email code ... need their own small board", which A1 now is) | Needs Design 5, no build effect: one-line correction of the Sign-In board header; a pointer under `small_items_7/README.md:148` |
| Brief item 4 rule 3 recommended *email code only*; the brief's `:171-173` still says so | The brief is the pre-ruling record | Leave it; the README and READINESS carry the reversal |

### Spike checklist (Clerk DEV instance, before any screen is built)

Prove on the dev instance with a scratch page, then record results under this section. A failure returns A1 (or item 4) to Design.

1. **Future hooks.** `useSignIn` and `useSignUp` from `@clerk/nextjs` work with `ClerkProvider prefetchUI={false}` and no prebuilt UI.
2. **Identify.** `create({ identifier, signUpIfMissing: true })` for (a) an account with a password, (b) code only, (c) unknown email. Record `supportedFirstFactors`, `isTransferable`, any error code, whether a captcha is demanded, and compare enumeration behavior with the hosted page.
3. **Password.** Sign in; wrong password (which code: `form_password_incorrect` or `form_password_or_identifier_incorrect`); a breached password; repeated wrong tries until the lockout; a new device (does `needs_client_trust` appear); forgot flow end to end with a session after `finalize()`.
4. **Code transfers (S4, U4).** The brief's two transfers, both directions, in restricted mode.
5. **Google, invitation-only.** (a) Google sign-in for an existing Google-created account; (b) Google email equal to a code-only account's verified email (links, or `isTransferable`); (c) uninvited Google account: the exact refusal code and whether any email is readable for H2; (d) invited, with the ticket carried through the OAuth sign-up, with the Google email equal to and different from the invited one; (e) the webhook receives `inviteReservation` in the new user's public metadata for (d); (f) a Google account with no first name.
6. **Callback.** `/sso-callback` outcomes: complete, sign-in transferable, sign-up transferable, refusal, user cancels at Google (what Clerk returns, and the page shown).

### Needs Hugh

1. **Clerk dashboard, both instances:** Google, email, password and email code stay on; sign-up mode stays `restricted`; automatic account linking on; **Client Trust** and **enumeration protection** states read back to Design (spike items 2 and 3). Hugh changes dashboard settings himself.
2. **Clerk paths, both instances:** sign-in path `/sign-in`, sign-up path `/sign-up`, and the Vercel public env `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`SIGN_UP_URL` (not secret). Without them protected routes and invitation emails still go to the hosted pages.
3. **Google OAuth credentials for production:** the dev instance can use Clerk's shared development credentials; production needs Hugh's own Google OAuth client, with the redirect URI Clerk shows for that instance, set in the Clerk dashboard. He sets the client secret himself; it never passes through a file or chat. Google's consent screen shows the app name and the privacy and terms links.

### Needs Design

All five drawn in **A1b** (2026-11-08, `Sign-In-Methods` section N), each as the fallback above:

1. ~~A state for a password Clerk refuses at sign-in~~ **N1:** K2 with the danger edge, (DRAFT) *This password can't be used anymore. Reset it to sign in.*, the press **Reset password** (sends the reset code, lands on K4); *Email me a code instead* stays.
2. ~~A new-device code~~ **N2:** S2 exactly (title, body, boxes, resend); Confirm signs in. Also serves an MFA email code. Client Trust on or off stays Hugh's call.
3. ~~H2 without the Google email~~ **N3:** only if the spike can't read it: M1 without its first sentence, the shipped `inviteOnlyCopy.body` alone.
4. ~~A Google account with no first name~~ **N4:** confirmed, the shipped U3 field, empty, Make my account wakes on text. A Google first name skips U3.
5. ~~Housekeeping~~ Done: the `Sign-In` board header now points at A1, and `small_items_7/README.md` open item 2 points here.

### /copy-review, propose mode (no files touched; 2026-11-08)

Classes by function. Em dashes: none in any A1 string. US spelling holds. Cap breaches alone are `TIGHTEN`, never `CUT`.

| String | Class | Verdict |
|---|---|---|
| *Use Google, or type your email.* | Chrome | **CUT.** Delete test: *Continue with Google* above an email field with a *Continue* press explains itself. It also names the methods the screen already shows |
| *Continue with Google* | Data (the provider's button wording) | KEEP; follows Google's brand wording |
| *Continue* | Chrome | KEEP |
| *Enter your password* | Chrome title | KEEP |
| *For {email}.* | Teaching | KEEP; says which account, as `codeBody` does |
| *Forgot password?* | Chrome | KEEP |
| *Email me a code instead* | Chrome | KEEP as Hugh's words. Over the 3-word cap and first person where the shipped *Send a new code* is imperative; recorded `TIGHTEN`, waived by his naming |
| *That password isn't right. Try again, or email yourself a code.* | Recovery | **TIGHTEN.** The code link is directly under it (rule 8). Propose *That password isn't right.* Pronoun also drifts (*email yourself* against *Email me*). If kept, align to the link |
| *Reset your password* | Chrome title | KEEP |
| Reset body *We sent a 6-digit code to {email}. Enter it, then choose a new password.* | Teaching | **TIGHTEN.** Reuse `joinCopy.codeBody` (`join.ts:26`); the second sentence restates the next screen's title |
| *Back to sign in* | Chrome | KEEP; 4 words, `TIGHTEN` on the cap only |
| *Choose a new password* | Chrome title | KEEP |
| *At least 8 characters.* | Recovery (constraint) | KEEP; the number comes from the instance's setting, not the string |
| *Save and sign in* | Chrome | KEEP; 4 words, and it says the press also signs in |
| *Use the Google account for {email}.* | Teaching | KEEP; it is the only place the Google rule is stated |
| *Signing in…* (M2, from J1) | Chrome | KEEP; reuses the shipped *Confirming…* shape |

Vocabulary: *sign in* (verb) and *sign-in* (noun) match `joinCopy`; no new coinage. The proposed H2 body with an email and the Clerk-message-in-`s7err` slot are not strings yet; each goes to `/copy-review` when written. Hard-coded JSX strings stay out: new copy lives in `src/lib/copy/`.

## Addendum A1b audit (engineering, 2026-11-08, against origin/main)

**Verdict: Yellow.** The five A1 Needs-Design items are drawn as their fallbacks, and none of the four new states asks for work Clerk cannot do. Yellow, not Green, for three reasons: (a) N1 names error codes the spike did not see, (b) N4 draws "Make my account" with no password while Hugh's ruling 2 keeps a password required at sign-up, and (c) A1b is built on K1 and K2, which Hugh's ruling 3 (enumeration protection ON) contradicts; A1b itself adds no leak, but it cannot ship until K1 to K4 are redrawn. Rebased under this PR; the board generator `scratch-gen/b6.py` and the READMEs were read, `*.dc.html` was not opened. The `@clerk` types are not installed in this worktree, so type-level claims below cite the A1 audit's earlier read (`signInFuture.d.ts`) or the spike, as marked.

Evidence key: **spike** is `boards/clerk-spike-2026-11-08.md` (dev instance, enumeration protection OFF at the time). `join.ts` is `src/lib/copy/join.ts`.

| State | Finding | Resolution |
|---|---|---|
| N1 password Clerk refuses | Spike item (b): a pwned password at sign-in returns `form_password_pwned` (not the `__sign_in` variant); a wrong password is `form_password_incorrect`. The caption's "compromised or untrusted" and `needs_new_password` are NOT seen by the spike: those names come from the A1 audit's string search of the package, not from a call. `needs_new_password` the spike saw only inside the forgot flow (after the reset code), never from a password sign-in. Reset path is proven: `reset_password_email_code` is in the factors list and works (spike c). N1 shows only after the password was right, so the line leaks nothing to someone without the password | Map by code prefix, `form_password_pwned*`, `form_password_compromised*`, `form_password_untrusted*`, to N1; every other password code stays K3 or the `s7err` slot. Build treats the compromised and untrusted names as unproven and tests only `form_password_pwned`. Caption needs no redraw. Re-run the pwned case once with enumeration protection ON (see ruling 3 below) |
| N1 copy | See copy verdicts below. The press **Reset password** sends the reset code, which the spike proved, and lands on K4 | Buildable as drawn |
| N2 new-device code | Spike (b) proves it: a correct password on a fresh device returns `needs_second_factor`, supported second factors `[email_code]`, `client_trust_state` "new"; `prepare_second_factor` then `424242` completes. Wrong code is `form_code_incorrect` (spike a), so S3 applies as it does today. S2's six boxes, resend and *Use a different email* all exist. Client Trust is ON on the dev instance by behavior; it is not in the settings payload. The Future API names the step `needs_client_trust` (`:307`) or `needs_second_factor` with `mfa.sendEmailCode`, `mfa.verifyEmailCode` (`:515-521`), per the A1 audit; the build must handle both | Buildable as drawn. One detail: the shipped S2 body is `joinCopy.codeBody` (`join.ts:26`), "We sent a 6-digit code to {email}. It works for 10 minutes." A new-device code also arrives after a password the player just typed; the same body is accurate. *Use a different email* in N2 goes back to K1 and abandons the password sign-in, which is right |
| N3 H2 without the Google email | Spike: the Google email readability is NOT provable headlessly (consent needs a human), and sign_up with `oauth_google` and no ticket is refused at creation with `sign_up_mode_restricted` before Google opens (spike e). So an uninvited Google player may never reach the callback with an address; the shipped body alone is the likely outcome. `inviteOnlyCopy.body` is at `join.ts:55`, the title at `join.ts:54`, the fine line at `join.ts:57`, the page at `src/app/sign-up/page.tsx:26` | Buildable as drawn. Keep N3 as the default and let M1 (with the address) wait on the Google human step. No new string |
| N4 Google, no first name | The shipped U3 name field exists as drawn. Spike (e): ticket-first then `sso` keeps `inviteReservation` in `public_metadata`, so the invitation survives the Google round trip. **Not proven:** the no-first-name Google callback and what `missing_fields` holds after it. Also, spike (d): a ticket sign-up reports `missing_fields ["password"]`; Hugh's ruling 2 keeps the password required, so N4's **Make my account** under a name-only field cannot complete on the ticket path. Whether Clerk waives the password once Google verifies the email is unproven | Needs Design (later, as Hugh ruled): U3 and N4 gain a password field. Until then the build cannot ship N4 as a one-field step. The title *That's your email* is S4's line and S4 returns to Design (ruling 1); N4's title may change with it |
| Housekeeping | The A1b diff changes `Sign-In.dc.html` by two lines and `design_handoff_the99_small_items_7/README.md:148` by one; the latter now points at `Sign-In-Methods.dc.html`. The README line is checked; the `.dc.html` header was not opened | Closed |

### Enumeration protection (ruling 3)

Hugh's ruling: sign-in never reveals whether an email has an account.

**The four A1b states add no leak.** N1 and N2 appear only after the correct password, so they tell the reader nothing they did not already know. N3 and N4 appear only after Google proved the address to the reader. N1's line names no email and no account. N2's body names the email the reader typed, as S2 does for every email today.

**But A1b hangs off states that do contradict ruling 3. None is new in A1b; all must be redrawn before any of it ships:**

1. **K1 Continue (README:85):** "an account with a password goes to K2; one without, or an email Clerk doesn't know, gets the code (S2)." Different screens for known and unknown emails. The spike confirms it today: `supported_first_factors` lists `password` only for a real account, and an unknown identifier returns `form_identifier_not_found` (spike b). N1 is only reachable through K2, so N1 shares this flaw.
2. **K2 (README:86):** a password screen offered only to an email that has one. Same defect.
3. **K3 (README:87):** *That password isn't right.* reads fine only because K2 already told the reader the account exists. With protection ON, Clerk answers `form_password_or_identifier_incorrect` (named in the A1 audit's package read; spike saw only `form_password_incorrect` with protection OFF), and the line has to be neutral: *That email or password isn't right.*
4. **K4 forgot (README:88):** *We sent a 6-digit code to {email}* must show for every email, known or not, and a wrong or unknown address must not change the screen. Same for **Email me a code instead**: S2 for every email.
5. **S4/U4 and the S2 "no code for unknown email" rule** already fail under restricted mode (spike d); ruling 1 returns them to Design.

**Resolution to draw (Design):** one K1 outcome for every email, for example the password screen for all, with *Email me a code instead* beside it; K3's neutral line; K4 for every email. **Engineering step:** turn protection ON in the dev dashboard (Hugh's setting) and re-run spike items (b) and (c) on it: what `create({ identifier })` returns for an unknown email, whether `supported_first_factors` still lists `password`, whether N1's `form_password_pwned` for a wrong-password unknown email is hidden, and whether `reset_password_email_code` accepts an unknown email silently. The sign-up restricted refusals (`sign_up_mode_restricted`) are a sign-UP surface and stay out of sign-in.

### Copy review, propose mode (A1b strings; no files touched)

Voice is Kitchen Table; this is Recovery copy, so it stays straight. Rule 4: no em dashes in any A1b string. US spelling holds. Curly apostrophes match `join.ts`.

| String | Class | Verdict |
|---|---|---|
| *This password can't be used anymore. Reset it to sign in.* | Recovery | **TIGHTEN.** "Anymore" claims it once worked, which is false for a breach flag and for `needs_new_password`; and two sentences where the cause and the fix are one thought. Propose *This password can't be used. Reset it to sign in.* Both sentences stay: the second tells the reader the press does it |
| **Reset password** | Chrome | KEEP; 2 words. Matches K4's *Reset your password* title |
| *Email me a code instead* (N1 link) | Chrome | KEEP as Hugh's words, under the A1 waiver |
| N2 title, body, resend, *Use a different email* | Chrome and Teaching | KEEP; the shipped `codeTitle`, `codeBody`, `resend`, `otherEmail` (`join.ts:24` to `join.ts:35`), nothing new |
| N3 body | Teaching | KEEP; shipped `inviteOnlyCopy.body` verbatim |
| N4 title *That's your email* | Teaching | KEEP for now, but it is S4's line (ruling 1 returns S4 to Design), so it follows S4's redraw |
| N4 body *{email} has an invitation.*, label *Your first name*, hint, *Make my account* | Chrome and Teaching | KEEP; U3 strings as already reviewed |
| N4 title/body with "That's your email" after Google | Teaching | Not a defect, a note: Google proved the email, no code was typed; the S4 line still reads true |

Vocabulary: *sign in*, *reset*, *code* match `joinCopy`. No new coinage. Hard-coded JSX strings stay out; new copy lives in `src/lib/copy/` with its `.test.ts`. The N1 error line, if it varies by code, must stay one string.

### A1 Needs-Design items

- **Closed by A1b:** 1 (refused password, as N1, with the copy tightening above), 2 (new-device code, N2, verified by the spike), 3 (H2 without the email, N3, which is the likely outcome), 5 (housekeeping).
- **Closed with a condition:** 4 (no first name, N4): the field is right, but it cannot complete without a password under ruling 2.
- **Remain open for Design, from Hugh's rulings:** K1 to K4 redrawn for ruling 3; S4 and U4 and the invitation-only states for ruling 1; the password field on U3 and N4 for ruling 2.

### Needs Hugh

1. Turn enumeration protection ON in the dev instance (and later production) so engineering can re-run spike items (b) and (c); you change dashboard settings yourself.
2. The Google human steps from the spike (uninvited Google error code, Google email readability, account linking, no-first-name account, cancel at Google). N3 and N4 and M1 to M3 stay unproven without them.
3. Client Trust on or off, as in A1; N2 is drawn for on.

### Needs Design

1. K1, K2, K3, K4 redrawn so every email gets the same screens and copy (ruling 3).
2. S4, U4 and the invitation-only states (ruling 1).
3. A password field on U3 and N4 (ruling 2), and what N4's title becomes once S4 changes.
4. Accept the N1 copy tightening, or keep the drawn line.

## Addendum A2: invite-only on Clerk (Design gap notes, 2026-11-11)

**Verdict for item 4: Yellow.** Design is complete for Hugh's three rulings (2026-11-11): every Needs Design item from the A1b audit is drawn on `Sign-In-Invite-Only` (P, Q, R, G), at 390 and desktop, with the six themes in section T. No new component: every screen is the shipped `/sign-up` column, field, press, `s7err` slot and link row; the only new pieces are a second field on U3 (Q1) and the foot pointer (P1, P4). No migration, no new switch. Yellow, not Green, only because three behaviours the screens rely on are unproven with account-guessing protection ON; each has a drawn answer either way, so none sends the item back to Design.

### For engineering

- **P1 → P2 for every email.** With protection on, build P2 from the typed email alone; never branch on `supported_first_factors` or on an `identifier_not_found` code. Every password failure that is not N1 maps to P3's one line.
- **P4 and P6 for every email.** *Email me a code instead* and *Forgot password?* always land on their screen, whatever Clerk answers to `prepare`; a wrong code is the shipped `codeWrong` (P5).
- **Retire** S4/H1, H2 after a sign-in code, U4, J1 and J4, and `joinCopy.haveAccountTitle` / `haveAccountBody` on `/join` (/join always continues to Q1). `inviteOnlyCopy` stays as R1, unchanged.
- **Q1** adds the password field to U3; Make my account wakes when both fields have text. Q2 is checked client-side (under 8) before Clerk is called; Q3 and Q4 map Clerk's codes; any other refusal is J3's shipped `joinCopy.failed`. K5 uses the same three lines.
- **R3** serves every ticket failure (used, revoked, expired, or `form_identifier_exists` for an invited email that already has an account).
- **R2 and G1:** the invitation landing starts the sign-up with the ticket before redirecting to Google; a refusal there shows R3 and Google never opens. On sign-in, a Google return that Clerk can't complete (no account, sign-up restricted) shows G1's line on P1 and makes no account.
- **Copy:** all new strings are DRAFT and go in `src/lib/copy/join.ts` (or a sibling) with tests, through `/copy-review` before the PR merges.

### Spike re-run with protection ON (before the screens are built)

1. Unknown email at sign-in: does Clerk accept a password attempt and answer `form_password_or_identifier_incorrect` (P3), and accept `prepare` for an email code and for the reset code silently (P4, P6)?
2. N1 for an unknown email: confirm `form_password_pwned` is never returned for an email with no account (it must stay P3).
3. Google ticket sign-up: does Clerk still list `password` in `missing_fields` after Google verifies the email? Decides whether Q6 ever shows a password field.
4. Google on sign-in with no account: the error Clerk returns on the way back (G1), and that no user is created.

### Needs Hugh

1. Turn account-guessing (enumeration) protection ON in the dev instance, then production, and run the Google human steps (items 3 and 4 above).
2. Review the A2 board and the DRAFT copy.

### Needs Design

None.
