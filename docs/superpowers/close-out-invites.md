# Close-out: Invites

**Walked:** 2026-10-18, on `main` with all six plan PRs and their follow-ups merged (#1986, #1990, #1994, #1996,
#1998, #1999), then again after the close-out's own fixes (#2078).

**Where.** A scratch branch made from local-dev (`scratch-9b-invites-closeout`, deleted once this was recorded),
migrated to `main`'s schema. `next start` ran against it with these switches on: `SOCIAL_FRIENDS_ENABLED`,
`SOCIAL_INVITES_ENABLED`, `ADMIN_USER_IDS` naming the audit account, and `ADMIN_ENV_LABEL`. Chromium ran at 390×844
and 1300×900.

**Fixtures,** for the audit account:
- 4 invites held;
- one waiting email invite;
- an invite tree with the account invited by the other local-dev account, and inviting a deleted account;
- one flag group with the account in it, for the group Top up.

The newcomer probe seeds and deletes its own sender and reservations.

Plan: `docs/superpowers/plans/2026-10-16-invites.md`. Handoff: `design/design_handoff_the99_invites/` (R1, with the
four property tables `docs/superpowers/design-tables/invites-pr4.md`, `pr5`, `pr6a` and `pr6b`).

## Route inventory

| Surface | 390 | 1300 | Seen |
|---|---|---|---|
| Add a friend: chooser (N) | ✓ | ✓ | Two cards; the fan shows three backs and the accent count line |
| Path 2, empty: the QR press and the email form | ✓ | ✓ | The QR press, then "or", then the outlined Send. Stacked on the phone, inline on desktop |
| The invite QR, live (Q1) | ✓ | ✓ | The full ring, `mm:ss left`, and "held by this QR" |
| `/friends`: the count line | ✓ | ✓ | The waiting and held forms. Right-aligned on desktop since #2078 |
| `/join/[token]`: N1, N2, N3, N5, N6, N11, N12, R14 | ✓ | ✓ | `probe:invites-join`, all checks passed. The heading keeps "The 99" together since #2078 |
| `/sign-up`: invite-only (I1, I2) | ✓ | ✓ | The three-back fan and BY INVITATION. Left-aligned on desktop since #2078 |
| `/friend/[token]` signed out (L1) | ✓ | ✓ | The invite-only fine line. Its type and spacing follow the L1 rows since #2078 |
| /admin Invites tab (M4) | ✓ | ✓ | Founders, rails, a deleted node, and a waiting leaf with Revoke |
| /admin accounts list, account Invites section, group Top up (M1 to M3) | ✓ | ✓ | Invites and Invited by last since #2078. The phone's stacked row and the Top up field |

**Photographed by:**
- `scripts/contact-sheet.mjs` over `docs/superpowers/inventories/invites.json` (8 of 8 cells) and `invites-admin.json`
  (9 of 9; one row is phone-only);
- `pnpm probe:invites-join` (32 of 32 checks, photos in `contact-sheets/invites-join/`).

The sheets are not committed.

## Structural checks

`pnpm check:shared docs/superpowers/inventories/invites.json`: all four views import and use `InviteCountLine` from
`src/components/social/invite-count-line.tsx`. `invites-admin.json` declares no shared binding, by design (its note).

## Design review against the whole brief

The four tables were checked row by row against the code and the photographs, about 850 rows. 25 mismatched; none
was a missing string or a wrong slot.

**Fixed in #2078:**
- `/sign-up`'s desktop alignment and wash
- the `/friends` count line's alignment
- the heading's wrap
- the expired QR plate and the claimed card back
- `/join`'s small card back
- the signed-out friend link's type and spacing
- the admin column order and the phone waiting row

**Left as shipped, deliberately:**
- The email fields' placeholder is `--fg-placeholder`, the contrast token. The table names `--fg-faint`.
- The send-failed toast is 2px and 0.5px off its board. The component is shared, so a change reaches every toast.
- The admin Invites field takes 0 to 1000 (`src/lib/invites/rules.ts`). The table says 0 to 100.
- The admin tree uses nested lists instead of `tree` roles, a choice its code comment records.

Copy wording was not reviewed here; that is `/copy-review`'s.

## States not photographed

All are reachable in code; the walk named each branch.

- **Add a friend:** card 2 at 0 invites, a friend link being made, path 1.
- **The email form:** E1 and E3 to E6.
- **QR:** Q2 to Q5.
- **`/friends`:** no invites, and C6's hold.
- **`/join`:** N4 (a wrong code) and N9 (already has an account).
- **For Hugh, on staging:** the real-email newcomer path. That is N7 (the hand-off to Clerk's hosted sign-up with the
  invitation ticket) and N8 (landing on `/friends` with the receipt band). Both need a real invitation email and
  Clerk's hosted pages, so no local fixture reaches them.

## About entry

**Owed, and now scheduled.** The plan deferred it under the About pause (plan, "About"). On 2026-10-18 the
orchestrator added `invites` to the launch-end About batch, reusing the entry and artboard its handoff already carries
(`about · invites.ts`, `The 99 - About · Invites Entry.dc.html`). The brief is `2026-10-18-about-launch-entries.md`.
The entry ships with that batch's single `ABOUT_VERSION` bump, at `since: 16`.
