# The 99 — account in Settings (design handoff · R1)

Account 2, 2026-11-14. Brief: `docs/superpowers/design-briefs/2026-11-14-account-settings.md` (branch `brief/account-settings`). States: `STATES-account-settings.md`. Copy: `account · copy strings.ts`. Privacy change: `PRIVACY-copy.md`. Readiness: Hugh's audit, to come.
Canvas: https://claude.ai/artifact/7zyuJwuxp9UmYPEKfLLeoh

**Status: R1, awaiting Hugh's readiness audit.** Every new string is DRAFT for `/copy-review`. Extends `design_handoff_the99_menu_home` (Settings' frame and section pattern), `design_handoff_the99_buying_credits` (the paid-credits warning) and `design_handoff_the99_small_items_11` (the in-app sign-in parts). Where a shipped component and a handoff disagree, the component wins.

**How it is drawn.** Every frame is the shipped page rendered server side with the shipped CSS from a scratch copy of main: `SettingsView` with the shipped Notifications, Spares and Your decks sections, `NavRail`, `MobileHeader`, `TabBar`, the account menu's `AccountSheet` and `AccountPopover`, the landing's `TopBar` and `Hero`, and `ToastFrame`. The new pieces are written as code over them, reusing shipped parts (`SECTION_HEAD`, `TextField`, the name field from `friends-head.tsx`, SocialModal's markup, the deletion warning's split, `SupportLink`, `field`, `CodeBoxes`, `link`, `SIGN_ERR`, `CODE_ERR`, `SheetGrabber`). That code and the renderer are on `design-assets` under `account-2/design_handoff_the99_account_settings/scratch-gen/` (`proposal/` holds the section, the modal screens and the copy).

## Product calls (closed by Hugh, 2026-11-14)

In the app a player can change their name, see and sign out their devices, and delete their account. Email, password and Google stay on Clerk's hosted page behind **More account options**. A delete erases everything at once, with no grace period, and friends aren't told. None of Clerk's prebuilt UI is loaded in the app.

## Design calls

1. **Placement: a section, last on Settings.** `/settings` gains **Account** after Your decks, in the shipped section pattern. Last, because Delete account belongs at the foot of the page and the other three sections are visited more. No `/settings/account` page and no sheet: settings stay in one place.
2. **The menu's Manage account row leaves.** Settings, already in the menu, is the one door. The menu goes About, Take the tour, Settings, (Admin), Sign out. The menu's `DeleteWarning` path and its held-credits read leave with the row.
3. **The rows.** *Your name* (the name, the line "Friends see it with your signature card.", Change). *Email and sign-in* (the primary email, "Signs in with Google and email code." naming the account's methods, **More account options ›** to `redirectToUserProfile()`, with a short line after it at md). *Signed in on · N* (one row per session: device glyph, `{browser} on {device}`, "This device" or "Last active …", city and country; Sign out on every row but this device). *Delete account* (its line, and an outline press with `--danger` words: 44px full width on the phone, 36px at md).
4. **One name, two doors.** The name is the one Friends edits (`friends-head.tsx`, "the ONE place a player sets their name"). Account's Change opens that same field (`socialCopy.page.nameField`, Cancel / Save, the same write); Friends keeps its Change. The sign-up's hint already says "Change it any time in Settings".
5. **No sign-out-all.** One control per action: a Sign out per device.
6. **Delete is one SocialModal with two screens.** D1 (`Delete your account?`): what goes in four plain lines, the pods line, the paid-credits split when held (the shipped warning's markup, moved inside), the plan line for a subscriber, **It can't be undone.**, the typed word, then Keep / Delete account (the app's Keep-then-`--danger` pair, 44px on the phone, 40 at md). D2 (`Confirm it's you`): Clerk's step-up as a screen of the same modal, with ‹ back to D1.
7. **The confirm gesture is typing `delete`.** Any case, spaces trimmed; autocapitalize and autocorrect off. Clerk asks to re-verify only outside its window, so a player who signed in minutes ago never sees D2: the word is the gesture that always runs. A hold fails switch and screen-reader users; a second press is one slip.
8. **What a plan subscriber is told.** "Your plan ends now and won't renew." (deleting the Stripe customer cancels the plan). The refund line widens to "Bought a pack or started your plan in the last 14 days?", since a plan's first month is refundable within 14 days. The shipped "Nothing else in Manage account touches them" goes.
9. **Re-verify, by the account's first factor.** Password: the password field, Confirm and delete, "Email me a code instead". Email code: the code is sent as D2 opens; six boxes, the shipped resend countdown. Google: Clerk's reverification has no Google step, so the code goes to the Google email, and the line says why (G3). The press on D2 is `--danger` because it runs the delete.
10. **After: `/` signed out, with the shipped toast** "Your account is deleted." No goodbye page and no banner.

## States

Loading (devices only; the rest draws from the page's data), devices read failed, name editing, device signing out, sign-out failed (toast), one device, password account; D1 empty, typed, credits held (plan + packs, packs only), deleting; D2 password, typed, code, Google, deleting; step-up cancelled, wrong password, wrong or expired code, failed delete, rate limited on D1 and D2. **Removing the last sign-in method is not drawn: it has no trigger in the app** (email and Google stay on Clerk's page, which refuses it there). See `STATES-account-settings.md`.

## Gaps for engineering

- **G1 · Delete runs on the server.** A server action deletes with Clerk's backend (`clerkClient.users.deleteUser`) only after `has({ reverification: … })` passes, and through a new rule in `src/lib/rate/rules.ts`; the client wraps it in `useReverification`, whose `onNeedsReverification` shows D2 in our UI (never Clerk's modal). The webhook and purge are unchanged. Clerk's window (`strict` = 10 minutes) is the spike's call.
- **G2 · One name.** Account's Change writes through the shipped name action. That action also sets Clerk's `firstName` so Clerk's page and its emails agree; spike confirms nothing else reads Clerk's name for display.
- **G3 · Google-only accounts.** Spike confirms Clerk offers `email_code` as the reverification factor for an account with only Google. If it does not, D2 for Google is a blocker for Hugh, not a workaround.
- **G4 · Devices.** `user.getSessions()` on the client after the page draws (the loading line), `session.latestActivity` for browser, device and place. Sign out of a device is a server action (`clerkClient.sessions.revokeSession` after checking the session is the reader's), rate limited, without a step-up (it protects the account; it changes nothing about who can sign in).
- **G5 · Held credits on the page.** Settings reads the held paid credits and whether a plan is live server side (`heldPaidAction`'s read), so D1 opens with them and has no loading state. A failed read draws no split, as the menu does today.
- **G6 · After delete.** On success the client does a full load of `/?deleted=1`; the signed-out landing shows `ToastFrame` (`role=status`) and strips the param with `mirrorUrl`. The landing has no tab bar, so the toast sits 16px off the foot (`--tabbar-h` 0 there).
- **G7 · Copy that changes.** `src/lib/copy/legal/privacy.ts` "Deleting your account" (`PRIVACY-copy.md`); `creditsPageCopy.del.says` and `del.go` retire with the menu's warning; `shellCopy.accountMenu.manageAccount` retires.

## Boards

| File | What |
|---|---|
| `Main.dc.html` | R1 · the calls |
| `Placement.dc.html` | 1–5 · the section at 390 and 1300, the menu before and after |
| `Section-States.dc.html` | The section's states |
| `Delete-Flow.dc.html` | 6–8 · D1, D2, deleting, the landing after |
| `Re-Verify.dc.html` | Step-up · password, code, Google |
| `Delete-States.dc.html` | The delete's states, and why the last sign-in method isn't drawn |
| `Themes.dc.html` | The section and D1 in all six themes |

Open the `.dc.html` files next to `support.js` and `art/`.
