# Design table: Admin R3, masking personal data

Rows follow the brief's surface inventory. "Masked" means D1 (name) and D2 (email) from README-R3. R2's design table stands for every property not listed.

| Surface | File | Today | R3 | Frame |
|---|---|---|---|---|
| Accounts list, row | `accounts-list.tsx:47-51` | initials, full name, email, Clerk id | masked initials (D4), masked name, masked email; no Clerk id; `Show` button beside the link (32px desktop, 44px phone) | A1 |
| Accounts list, revealed row | `accounts-list.tsx` | — | full name, email, Clerk id, `adminMaskCopy.reveal.shown(time)` in `--accent` mono 10.5px; row `--surface-raised` with a 1px inset `--accent` ring; button `Hide` in accent | A2 |
| Accounts list, phone row | `accounts-list.tsx:40-58` | spend top right; meta `group · credits · invites · by` | Show at top right; meta gains spend at its end; `by ‹masked inviter›` | A1 |
| Accounts list, column head | `accounts-list.tsx` | `1.5fr 1fr 110 120 1fr 90` | `2.1fr 0.6fr 78 104 0.7fr 52`, for the Show button and a revealed email | A1, A2 |
| Accounts list, search | `accounts-list.tsx:107`, `account-page-rule.ts:18-22` | substring on name and email, prefix on id, client | one field; masked-name filter without `@`; exact email on Enter, server (D10 to D12); id prefix dropped | A3, A4 |
| Accounts list, failures | — | — | `ToastFrame` centre, `role="alert"`, action `Try again` | A5, A6 |
| Account page head | `account-page.tsx:343-349` | large initials, full name h1, email, Clerk id | masked; no Clerk id; Show/Hide at the head's right (desktop) or under it (phone, 44px); revealed adds the id and the shown line | B1, B2 |
| Account page, Invites | `invites-section.tsx:186-233` | inviter and invitee names, waiting emails | masked; waiting emails masked always (D9) | B1 |
| Account page, set-invites confirm | `invites-section.tsx:175` | account name | masked; the field help names the full name only while revealed | B1, B2 |
| Account page, History | `invites-section.tsx:246-249` | invite events | gains reveal lines (D8) with a 6px accent diamond before the text | B1, B2 |
| Invites tree | `invite-tree.tsx:53-57, 74, 111-115`, `invite-tree-rule.ts` | initials, full name, aria-label, waiting email; search on name and email | masked; diamond for no-name and owner; aria-label `Open ‹masked name›`; search on masked name | C1 |
| Group editor, members | `group-editor.tsx:105-107, 157`, `groups-rule.ts:237-246` | full name, email, Clerk id; search on all three | masked name, masked email; no id; search on masked name | C2 |
| Group editor, pending | `groups-rule.ts:312-322` | member names | masked | C2 |
| Group history, top-up | `groups-rule.ts:340-369`, `invites-rule.ts:174-177` | names | masked | — |
| Switch page, account overrides | `switch-page-rule.ts:207`, `switch-page.tsx:183` | name title, Clerk id sub | masked name, masked email as the sub | C3 |
| Override picker (F8) | `override-picker.tsx:59, 131` | name, email or id; search on name and email | masked name, masked email; search on masked name | C3 |
| Check an account (F1) | `check-account.tsx:39-40` | account names | masked | C3 |
| Switch meta and history | `switch-page-rule.ts:156-212` | actor and account names | masked; `You` for the viewer | C3 |
| Model confirm (F3) | `model-confirm.tsx:52`, `rise-confirm.ts:72` | names, else email, else id | masked | — |
| Costs, per account | `costs-detail.tsx:286-288` | Clerk id | masked name | — |
| Costs, cap "set by" | `costs-view.tsx:315` | Clerk id or `You` | masked name or `You` | — |
