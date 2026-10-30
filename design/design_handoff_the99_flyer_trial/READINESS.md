# Readiness · Flyer trial

**Verdict: Green.** R1 and R1b approved by Hugh 2026-10-30 ("This all LGTM. Let's open a PR"), every recommended
option taken. Nothing below blocks the build; each open item has a drawn default. Checked against main at `ae60ce6`.

## For Hugh

1. **Copy** is placeholder throughout, for `/copy-review` (`flyer-trial · copy strings.ts`), except the Fan Content
   passage on the flyer, which is the locked `fanContentNotice.passageOne` verbatim.
2. **Shipped copy change.** The error screen's body drops "Your decks and collection are fine."
   (`shellCopy.errorBoundary.body` becomes "Something broke on our end. Try again.").
3. **About.** Whether the flyer, Report a problem or the check-in owes an About entry is Hugh's call. None is drawn.

## For engineering

1. **Codes.** A flyer code is six characters from an unambiguous alphabet (no 0/O, 1/I), matched case-insensitively
   on the existing `/join/[token]` route: a 6-character token is a code, a 43-character one is an invite. Rate-limit
   lookups per IP. Each code: label (Hugh's, never shown to a player), group, cap 50, created, revoked_at.
2. **The claim.** Send code on a flyer claims one of the 50 for the code's 10 minutes, as the invite QR's claim holds
   an invite; released if never proven. The email and code steps are the shipped `JoinFlow` steps.
3. **Hugh's count.** Each completed sign-up spends one of Hugh's invites. At 0, every live code reads as used up.
   A code never makes a friend link to Hugh.
4. **The sign-up.** Joins the code's group, gets the usual 15 welcome credits and 3 invites. People they invite join
   the same group and befriend them (the shipped invite path, plus group inheritance).
5. **/join for a code (boards 2, 3).** `JoinStart` gains a sender-less variant: the compact `FriendCard` face up with
   the The 99 face (crowned 99 in the art box, type "Invitation", credit "From a flyer"); title, body and fine print
   per the copy file. Used up (cap or Hugh at 0) and revoked show the card back with the launch-list form; after
   launch every code shows the dimmed back and **Make your account** to sign-up. A signed-in reader goes Home (shipped).
6. **Launch list.** One email per address (case-folded), source code recorded; "You're on the list" on save; a failed
   save is the shared toast with Try again, the field kept. Admin: count in the Flyer codes meta and a launch-list
   card with per-code counts and **Download CSV**. Emailed once at launch, then purged (Hugh to confirm retention).
7. **Admin, Invites tab (boards 4, 5).** Flyer codes section above the tree: Store, Code, Sign-ups (n of 50, bar;
   full = `--warning`), Group, Made, Print / Revoke. **New flyer code** opens a form in place: Store, Group (default a
   new group named from the store, daily credits 3; or an existing group), fixed facts as chips, **Make code**.
   Revoke confirms in `ModalChrome` (sheet on phone); revoked rows stay dimmed with the date, no actions.
   The tree gains a flyer node under Hugh (accent diamond face, code tag, n of 50) with its sign-ups beneath.
8. **Print (board 6).** `/admin/invites/flyers/[code]`: flyer A at letter size, a screen-only bar (‹ Invites, store,
   code, **Download QR** PNG, **Print**); `@media print` hides the bar. One ink (black); the page sets no paper colour.
   The QR encodes `https://the-99.dev/join/<CODE>`.
9. **Report a problem (boards 7, 8).** Two entries: a row on the About index above Terms/Privacy, and "Tell us what
   happened" under the error screen's two buttons (`ErrorNotice`). One form: sheet on phone, `ModalChrome` 520 on
   desktop. "What happened?" required, "What were you doing?" optional; Send dims until the first has text; Sending…
   holds; Sent replaces the form; failure is the shared toast with Try again. Attached: path, device/browser, error
   digest when there was one, and the entry it came from. `global-error.tsx` draws no shell: open the form as a page.
10. **Check-in (boards 9, 10).** Opens only on Home after it settles, once a player qualifies (timing in code, e.g.
    14 days and 5 visits). Rating 1–5 (required), uses (pick any of six), tell your pod (one of three), free text.
    All pills one size: a three-column grid. **Not now** snoozes a few days; **✕** ends this check-in.
11. **Feedback store and admin (board 11).** One table: kind (problem | check-in), account, answers, page, device,
    digest, source, created, read_at. New eighth admin tab **Feedback**: All / Problems / Check-ins pills with counts,
    unread dot until seen, the player's group chip, problems' context chips. Names only, never emails.
12. **Switches.** One switch for the flyer trial (codes, /join variant, admin section, launch list) and one for
    feedback (report + check-in + tab). Launch retires every code (a date or the same switch).
13. **No lone last words.** Headings `text-wrap: balance`, copy `text-wrap: pretty` on the new surfaces.
14. **Mobile and desktop** ship together in each PR.
