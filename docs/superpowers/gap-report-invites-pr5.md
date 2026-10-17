# Gap report: Invites PR 5 (the newcomer's side)

Source of truth: `docs/superpowers/design-tables/invites-pr5.md` and the boards `R1 - Newcomer`, `R1 - Invite-Only`.
Root cause of the first review's gaps: `/join` and `/sign-up` reused the friend landing's `FriendCard` (300x419, .74 on
phone) and `LandingColumn`. They now draw a compact card and their own column; the friend landing is untouched (its
call sites and defaults are unchanged).

## Fixed

### Card (`friend-card.tsx`, props `compact`, `word`, `badge`)
- Gaps 1 to 4, 6, 7: the same 300x419 box scaled to .5 (150x210) at every width, `rotate(-3deg)` while the card has a
  face (a back alone sits straight, per the table), shadow doubled so it reads `0 20px 44px` after the scale. The back
  word is the caller's (`joinCopy.cardType` on `/join`, `inviteOnlyCopy.backWord` on `/sign-up`); the landing keeps its kicker.
- Gap 5 (N6): 30px `--success` circle, `✓` 700 15px, right and bottom -8px of the card, `aria-hidden`.
- State gap 3 (N9): on `account` the card turns face down and names nobody (`setUp(false)`, `named` false), as `end()` does.

### Page and column (`newcomer-column.tsx`, `NEWCOMER_MAIN`)
- Gaps 9 to 14: one centred column at every width (no `md:flex-row`, no `md:gap`); padding 44/24/24/24; gradient 600x360
  at 50% 18% on both pages. `/join` h1 700 22px/1.25, margin 28px 0 0; body 14px/1.55. `/sign-up` h1 24/1.2 phone, 30/1.2
  desktop; body 14/1.6 phone, 15/1.6 desktop. The `/join` kicker is removed (the table draws none); `/sign-up` keeps its
  desktop-only kicker (500 11px mono, .2em, accent).
- Gap 15: `Parts` in `lib/copy/join.ts` (the copy file still owns every word); `Emphasis` draws `em` pieces in `--fg`,
  weight 500: the email in `codeBody` and `haveAccountBody`, "Invite someone new" in `inviteOnly.body`.

### Email form (`join-flow.tsx`)
- Gaps 17 to 21: label 13px/600 sans `--fg`, 6px below; field padding 0 12px, 48px at every width, accent border once it
  has text, `--fg-muted` text while locked; Send code 100% x 48px at every width, margin-top 14px, sending uses
  `--accent-strong`; fine print 11px/1.55 centred, margin 14px 0 0.

### Code step
- Gaps 22 to 26, state gap 1: boxes 44x54, gap 8, centred in a `role="group"` carrying `codeAria`; an empty slot draws
  `·` in `--fg-disabled`; a filled box has the accent border; `--danger` only on N4 (a wrong code). N5 (expired) is
  neutral, clears the boxes, and demotes Confirm to the outlined secondary (500 15px, `--border-strong`, margin-top 8px)
  until a new code is typed. Error line 12.5px/1.45 centred, margin 10px 0 0. Links row: gap 4px, margin-top 6px,
  centred; links 500 13.5px, min-height 44px, padding 0 8px, no underline; the cooling-down resend is `--fg-locked`.
- Gap 27 (N11, N12): the quiet line is 11px/1.55 mono `--fg-faint`, centred, margin-top 22px, link `--accent`, no underline.

## Decisions to check

- The code field is labelled twice: the group and the textbox both carry `codeAria` (the table asks for the group's
  label; an unlabelled input would regress accessibility). Playwright's `getByLabel(joinCopy.codeAria)` therefore
  matches two elements. `scripts/probe-invites-join.mts` lines 124 and 131 (`getByLabel(...).fill(...)`) need
  `getByRole("textbox", { name: joinCopy.codeAria })`. Not edited here (the probe is the lane's).
- N9: the table says "no sender name anywhere", but `joinCopy.haveAccountBody(email, name)` ("ask {name} for a friend
  link") names the sender in the body. Copy left as shipped; the card names nobody. A copy question for /copy-review.
- The sign-up page is a single centred column on desktop too (the fix list overrules the table's I1 row layout, which
  needs the fan). The column sits 16px under the card (unspecified in the table); the Sign in press is centred on
  desktop (auto width, 44px, 10px margin-top).
- The back's word is scaled with the box: in compact it is 15px / .35em in the 300-wide box (7.5px on the board after
  the scale). The "99" hero and diamonds are the landing's sizes halved (29px, not the board's 34px).

## Deferred

- Gap 28: the /sign-up three-card fan (I1, I2). d9 ruled it wanted (2026-10-17); it is the next PR, reusing the friend card back.
- Gap 29 FIXED, not deferred (d9 ruling: the rendered board wins over the table). Measured on the rendered `R1 - Friend-Link.dc.html`: the L1 fine line is mono 11px, `rgb(149, 154, 173)` (`--fg-muted`), line-height 17.6px (1.6), 4px above. The code had `--fg-faint`, 6px, no leading. `LandingColumn` takes `fineMuted`, used only by the signed-out friend link (the signed-in landing's fine line is unchanged).
- Kicker styling details beyond the above (part of gap 16).
- Copy wording items: they go to /copy-review.
- Hover, focus and transition states: the board draws none, so nothing to match.

## Not photographable (go to the staging walk list)
- N7: Clerk's own hosted sign-up. N8: the receipt band on /friends, which needs a real sign-up's edge.
