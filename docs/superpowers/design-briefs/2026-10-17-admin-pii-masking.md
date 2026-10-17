# Admin: masking personal data

Design brief, 2026-10-17. Asks for a Design round on the existing admin
(`design/design_handoff_the99_admin/`, R1 and R2) so that `/admin` stops showing people's full names
and email addresses by default, while Hugh can still assign groups, overrides and invites. Hugh's
request: "The Admin dashboard shows full names and emails. This is PII. Right now it's just my
friends, so this is okay, but we need to address this. At the same time, I need visibility to assign
overrides, groups, etc."

## Rulings 2026-10-17 (orchestrator, as Hugh's proxy), closed

Do not reopen these in the drawings; what is open is under *What Design owns*.

1. **Masked by default, everywhere in `/admin`.** A person reads as a display name (or first name
   plus last initial) and a masked email such as `h•••@f•••.design`.
2. **A per-account Show** reveals that one account's full name and email for the current view only.
   Every reveal writes an `admin_events` row: who revealed, whose data, when. There is no bulk reveal.
3. **Exact-email search** finds an account without revealing any other. A partial email never
   matches.
4. **Masking happens on the server.** Unmasked values reach the client only in answer to an explicit
   reveal, never in the page payload. (Today the whole universe's names and emails ship with every
   page so the client can filter; that ends.)
5. **The privacy page gains a line** saying admins can see account emails for support and access, and
   that each view is logged. Its copy goes through `/copy-review` later; it is not Design's.
6. **Every assignment works from masked rows**: moving an account between groups, adding or clearing
   an account override, setting or topping up invites, revoking a waiting invite.

## Where `/admin` shows personal data today

`accountName` (`src/lib/admin/names.ts:5`) is the one naming rule: Clerk full name, else username,
else email, else the Clerk id. Clerk supplies them in `src/lib/admin/accounts.ts:105`.

| Surface | File | Fields |
|---|---|---|
| Accounts list, each row | `src/components/admin/accounts-list.tsx:47-51` | initials avatar, full name, email, Clerk id |
| Accounts list, search (A2) | `accounts-list.tsx:107`, `src/lib/admin/account-page-rule.ts:18-22` | substring match on name and email, prefix on id, client side |
| Accounts list, phone meta | `accounts-list.tsx:40-58`, `src/lib/admin/invites-rule.ts:66-70` | "by <inviter name>" |
| Account page head | `src/components/admin/account-page.tsx:343-349` | large initials avatar, full name (h1), email, Clerk id |
| Account page, Invites section | `src/components/admin/invites-section.tsx:186-233` | inviter's name and initials, invitees' names and initials, waiting invite recipient emails |
| Account page, set-invites confirm | `invites-section.tsx:175` | account name in the pending sentence |
| Account page, invites history | `invites-section.tsx:249`, `invites-rule.ts:124-131` | actor names and the account's name in "set", "revoked", "sent" and "joined" lines |
| Account URL | `src/app/admin/accounts/[clerkId]/page.tsx` | Clerk id in the path |
| Invites tree (M4) | `src/components/admin/invite-tree.tsx:53-57, 74, 111-115`, `src/lib/admin/invite-tree-rule.ts:64-86, 109` | initials, full name, aria-label with name, waiting recipient email; search on name and email |
| Groups list, group cards | `src/components/admin/groups-list.tsx:49`, `groups-rule.ts:195` | every member's name in each card's member line |
| Group editor, member rows | `src/components/admin/group-editor.tsx:105-107, 157`, `src/lib/admin/groups-rule.ts:237-246` | full name, email, search on name, email, id |
| Group editor, pending lines | `groups-rule.ts:312-322` | member names in "adds / moves / removes" sentences |
| Group history | `groups-rule.ts:340-369` | actor name, added or removed member's name |
| Group top-up (M3) | `invites-section.tsx` `GroupTopUp`, `invites-rule.ts:174-177` | member names in the pending sentence |
| Switch page, account overrides | `src/lib/admin/switch-page-rule.ts:207`, `switch-page.tsx:183` | account name as title, Clerk id as sub |
| Switch page, add account override (F8) | `switch-page.tsx:119`, `override-picker.tsx:59, 131` | name, email (or id) per choice, search on name and email |
| Switch page, check an account (F1) | `check-account.tsx:39-40`, `switch-page-rule.ts:218-221`; `?account=<clerkId>` | account name per option, Clerk id in the URL |
| Switch page, resolved result | `switch-page.tsx:53`, `switch-page-rule.ts:171-174` | names of the accounts a switch is on for, when it is on for some |
| Switch page, meta and history | `switch-page-rule.ts:156, 185, 200, 210-212` | actor names, account names in scope and source lines |
| Model confirm (F3) | `model-confirm.tsx:52`, `src/lib/admin/rise-confirm.ts:72` | names (else email, else id) of every account a change raises |
| Costs, per account | `src/components/admin/costs-detail.tsx:286-288` | Clerk user id per row |
| Costs, cap "set by" | `costs-view.tsx:315` | Clerk id of who set an elsewhere figure (or "You") |

No Stripe email is shown anywhere in `/admin`. Groups, switches and models pages carry no personal
data beyond what the rows above reach.

## What Design owns

- **The masked row**, desktop and phone: what replaces name, email and the Clerk id in the accounts
  list, the account head, picker choices and history lines. Whether the Clerk id stays visible
  (it identifies no one outside Clerk, but it does join to Clerk).
- **The Show control and its revealed state**: where it sits, how a revealed row reads, and whether
  it re-masks on navigation, on a timeout, or only when the view ends.
- **The reveal log**: whether it is visible in `/admin` at all, and if so where (the account page's
  history, a section of its own).
- **Masked people in the invites tree and group member lists**, including the waiting-invite
  recipient email, which belongs to someone with no account yet.
- **Exact-email search**: the field, its hit, its miss and its error, given that a miss must not
  hint at near matches.
- **Avatars**: initials leak a name's letters. Hidden, kept, or replaced by a neutral mark.
- **Copy** goes through `/copy-review`.

## States

Each at 390 and desktop, in the six themes as standard.

| State | Where |
|---|---|
| Masked list | Accounts list, invites tree, group members, override picker |
| Revealed row | One account revealed among masked neighbors; the account page head revealed |
| Search hit | Exact email finds one account, shown masked until Show |
| Search miss | No account holds that email |
| Reveal failed | The reveal or its log write refused; nothing is revealed |

## Out of scope

The engineering (the reveal endpoint, the `admin_events` kind, server-side masking, how search
queries Clerk) and the privacy page itself.

## The About entry

None. The admin is visible to Hugh alone and teaches a player nothing.

## Deliverable

An R3 addition to `design/design_handoff_the99_admin/`: frames for the states above, `STATES` rows
and design-table entries for each touched surface, and answers to every item under *What Design
owns*.
