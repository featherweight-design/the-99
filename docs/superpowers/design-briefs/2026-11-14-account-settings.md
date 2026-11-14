# Brief: Account settings and deleting an account in the app

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Source:** Hugh, 2026-11-14: "A custom delete account mechanism or account management section in Settings".
**Existing handoffs to extend:** `design/design_handoff_the99_menu_home/` (`Settings.dc.html`, the page frame and section pattern; READINESS Green), `design/design_handoff_the99_buying_credits/` (`R1 - Menu-and-Delete.dc.html`, the paid-credits warning), `design/design_handoff_the99_small_items_11/` (the custom sign-in boards, the precedent for drawing Clerk steps in our own UI; READINESS Green). Where a shipped component and a handoff disagree, the component wins.

## Problem

Manage account in the account menu leaves the app for Clerk's hosted account page. It looks like someone else's product, and deleting an account there leaves a signed-in shell behind (a separate fix is in flight). Hugh wants deletion, and possibly the rest of account management, inside Settings.

## What exists today

- **Settings** (`src/app/settings/page.tsx`, frame `src/components/settings/settings-view.tsx`): one 720px column with three sections, Notifications (`news-section.tsx`), Spares (`spares-section.tsx`) and Your decks (`friend-decks-section.tsx`). No account section.
- **Account menu** (`src/components/shell/account-menu.tsx`): Settings, Manage account, Sign out. Manage account calls Clerk's `redirectToUserProfile()`, the hosted page, by Hugh's 2026-10-12 ruling that the app loads none of Clerk's prebuilt UI.
- **On Clerk's page today** a player can change their name, add or remove emails, set or change a password, connect or remove Google, see and sign out other devices, and delete the account.
- **The paid-credits warning** (`src/components/credits/delete-warning.tsx`, copy `creditsPageCopy.del`): when paid credits are held, Manage account first opens a modal naming what deleting forfeits, then continues to Clerk.
- **Custom sign-in and sign-up** (`src/components/sign-in/sign-in-flow.tsx`, `src/components/sign-up/sign-up-flow.tsx`) already replace Clerk's prebuilt screens with Clerk's hooks.
- **Privacy page** (`src/lib/copy/legal/privacy.ts`, "Deleting your account") tells players to delete from Manage account; it changes with this work.

## Locked decisions (facts, not calls)

1. **Deletion semantics stay as they are** (`docs/agents/account-purge.md`). Clerk's `user.deleted` webhook records a tombstone, deletes the Stripe customer (which cancels a plan), then erases everything the app holds: Collection, decks, games, notes, wishlist, friendships, invites, pods (an owned pod passes to its longest-standing member), tool results, credits and preferences. A sweep repeats it every 30 minutes for a day. **There is no grace period and no undo.** Only an admin's own audit trail is kept.
2. **Unspent paid credits are forfeited.** The paid-credits warning must still be shown before any delete when credits are held. Packs bought in the last 14 days and unused can be refunded by email first.
3. **Any destructive or identity-changing step re-verifies.** Clerk's reverification (`useReverification` on the client, `has({ reverification })` on the server) asks for a password, an email code, or Google again before the action runs. Docs: https://clerk.com/docs/guides/secure/reverification
4. **Clerk does the work.** Every action maps to Clerk's user object: `user.update` (name), `createEmailAddress` and verify (email), `updatePassword`, `createExternalAccount` and `destroy` (Google), `getSessions` and `revoke` (devices), `user.delete` (delete). Docs: https://clerk.com/docs/reference/javascript/user. A delete made either way fires the same webhook, so purge needs no change.
5. **Every server-side account action is rate limited** through `src/lib/rate/rules.ts` and never reveals whether another email has an account (ruling 2 of the sign-in work).
6. Mobile and desktop parity in the same PR; all six themes; US English.

## Open for Design to call

1. **Placement.** A new Account section in Settings (first or last), a separate `/settings/account` page, or a sheet from the menu. What happens to the Manage account menu row.
2. **Which actions come in-app.** For each of name, email, password, Google, devices and delete: drawn in the app, or left on Clerk's page behind a link. Delete alone in-app is a valid answer.
3. **The delete flow and its copy beats.** What it erases (in plain words), that it cannot be undone, the paid-credits split when held, the refund line, and the confirm gesture (type a word, hold, or a second press). Whether a plan subscriber sees "your plan ends now".
4. **Re-verify step.** How the step-up prompt looks for a password account, an email-code account and a Google account, and where it sits in the delete flow.
5. **After delete.** The signed-out landing: the public landing page, a one-line "Your account is deleted" notice, or a dedicated goodbye page.
6. **States.** Loading, saving, success, field errors, a failed delete (nothing was deleted, try again), re-verify cancelled, re-verify failed, rate limited, and the last sign-in method (cannot remove the only way in).

## Open product questions for Hugh

1. **Delete only, or full account management in-app?** Recommendation: delete plus name and devices in-app first; email, password and Google stay on Clerk's page behind a link until a second round.
2. **Keep Clerk's hosted page reachable at all?** Recommendation: yes, as a quiet "More account options" link, so nothing a player can do today is lost.
3. **Add a grace period (for example 7 days to change your mind)?** Recommendation: no. The purge is built to erase at once, and a grace period means a pending-deletion state across every surface.
4. **Tell friends?** Recommendation: no notice; the friendship simply disappears, as it does today.

## Out of scope

The ghost signed-in shell after a Clerk-side delete (its own lane). Changes to `purgeAccount`, the sweep or the webhook. Two-factor setup, passkeys, data export, and the admin's own deletion tools.
