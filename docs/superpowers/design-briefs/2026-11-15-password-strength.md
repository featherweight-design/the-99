# Brief: Live password strength

**For:** Claude Design. **Approved:** Hugh, 2026-11-15.
**Existing handoffs to extend:** `design/design_handoff_the99_small_items_11/` (A2, the custom sign-in and sign-up,
boards `Sign-In.dc.html` and `Sign-In-Methods.dc.html`) and `design/design_handoff_the99_small_items_7/` (item 4, the
screens A2 redrew). Where the shipped code and a handoff disagree, the code wins.

## The problem, in Hugh's words

A player choosing a password only learns it is too weak after pressing the button. Hugh wants live strength feedback
while they type, on our own sign-up and sign-in screens, so they fix it before Clerk refuses it.

## What exists today

- **Two fields choose a password**, and both are in scope:
  - Sign-up by invitation (Q1, *Make your account*): `src/components/sign-up/sign-up-flow.tsx`, the **Password** field with
    the hint *At least 8 characters.* under it.
  - Sign-in's reset (K5, *Choose a new password*): `src/components/sign-in/sign-in-flow.tsx`, the `newPassword` screen,
    same hint, **Save and sign in**.
- **Shared parts** in `src/components/sign-in/auth-parts.tsx`: `MIN_PASSWORD = 8`, the labelled `Field` (danger edge on a
  refusal), `HINT` (12.5px muted line under the field), `SIGN_ERR` (13px danger line in the same slot), and
  `passwordLine`, which maps Clerk's refusals to copy. The field's look is `field()` in `src/components/join/join-parts.tsx`.
- **Copy** in `src/lib/copy/join.ts` (`signInCopy`): `newPasswordHint`, `tooShort`, `tooWeak`, `breached`.
- **Today's refusals (Q2 to Q4)** show only after the press: too short (checked before Clerk), too weak
  (`form_password_not_strong_enough`), breached (`form_password_pwned`). Each replaces the hint with a danger line and a
  danger edge; the typed password stays.

## Locked facts

- Clerk's own strength check is on at level 2 and breached passwords are rejected. Clerk stays the judge: the live
  feedback is guidance, and Clerk's answer on the press still wins.
- The app requires 8 characters (`MIN_PASSWORD`).
- A breach can only be known after the press (Clerk checks it on the server). Live feedback never claims a password is
  safe from breaches.
- The feedback must never read as good for a password Clerk would refuse as too weak. Engineering picks an estimator that
  agrees with Clerk's level 2.
- Q2 to Q4 stay as the refusals after a press, in the same slot.
- Mobile and desktop ship together; all six themes.

## Open calls for Design

1. **The form:** a meter, a word, a line of text that changes, or a mix. How many steps?
2. **Placement:** in the hint slot under the field, replacing *At least 8 characters.*, or beside it?
3. **States to draw:** empty, under 8, 8 or more but weak, acceptable, strong, and each of Q2 to Q4 after a press. What
   the live line becomes once a refusal shows, and when it returns.
4. **Color:** whether weak uses `--danger` before any press, or a quieter ink, so typing never reads as an error.
5. **Accessibility:** what a screen reader hears as strength changes (and how often).
6. **Copy:** any new string is DRAFT for `/copy-review`.

## Out of scope

- The sign-in password field (K2, *Enter your password*): it checks an existing password, so no strength.
- Clerk's hosted Manage account page, Clerk's settings, and the minimum length.
- Show/hide password, password rules lists, and any change to the code screens.
