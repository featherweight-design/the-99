# The 99 · Small items 11 (account 2, 2026-11-08)

Canvas: https://claude.ai/artifact/J3EZP4aoSEKgYYVZWwHoU1
Status: **R1 APPROVED by Hugh 2026-11-08**: every call below stands, and the four open questions are settled as drawn. Hugh's rule for item 3: Settings are only for notifications, so the archive shows everything.
Addendum A1 (sign-in methods, Hugh 2026-11-08): drawn 2026-11-08 on `Sign-In-Methods.dc.html`, **APPROVED by Hugh 2026-11-08**, with sign-up offering no password (L2 not taken). It withdraws item 4's *email code only*.

Addendum A2 (invite-only on Clerk, Hugh's rulings 2026-11-11): drawn 2026-11-11 on `Sign-In-Invite-Only.dc.html`, **APPROVED by Hugh 2026-11-11**. It supersedes parts of item 4 and A1 (header notes on `Sign-In` and `Sign-In-Methods` name which).

Four small stateful additions from the brief `docs/superpowers/design-briefs/2026-11-08-small-items-11.md`: role counts that open their cards, the Consider shelf when a role is over target, an archive of past Wizards announcements, and sign-in on Clerk (Small items 7, item 5). Each state is drawn at 390 and at desktop over the shipped pieces it extends. New pieces carry a dashed copper outline. Strings marked DRAFT go through `/copy-review`.

To view a board, open its `.dc.html` with `support.js` and `art/` beside it. `scratch-gen/` holds the generator: `lib10.py` (board chrome, from Small items 10), `lib11.py`, and one `b*.py` per board. Each board takes the helmet of one shipped handoff board, so every piece is that board's drawing. Run `python3 build.py out b0:Main b1:Role-Cards b2:Consider-Over b3:Archive b4:Sign-In b5:Errata b6:Sign-In-Methods b7:Sign-In-Invite-Only`, then `node render.js <abs out> Main …` to size each board and report broken images, overflow and clipped frames. `canvas11.py <out> <root>` swaps `art/` for the canvas's `/_blob/` urls.

Sources: main @ffc1795. Helmets: `deck_messages/Pass Sheet` (items 1, 2), `announcements/Home-Rows` (item 3), `small_items_7/Sign-In` (item 4). Shipped components read: `role-counter-strip.tsx`, `role-counter-cell.tsx`, `cuts-free-count.tsx`, `deck-stats-view.tsx` (Jobs), `pass-sheet.tsx`, `consider-panel.tsx`, `feed-item.tsx`, `lib/copy/{deck-cuts,feed,join}.ts`, `app/sign-up/page.tsx`.

| Board | Item |
|---|---|
| `Main.dc.html` | Every call and the open questions |
| `Role-Cards.dc.html` | 1 · Role counts open their cards |
| `Consider-Over.dc.html` | 2 · Consider with a role at or over target |
| `Archive.dc.html` | 3 · Past Wizards announcements |
| `Sign-In.dc.html` | 4 · Sign-in and sign-up on Clerk |
| `Sign-In-Methods.dc.html` | 4 · Addendum A1: Google, password and the emailed code |
| `Sign-In-Invite-Only.dc.html` | 4 · Addendum A2: invite-only on Clerk, a password at sign-up, no account status shown |
| `Errata.dc.html` | 5 · Errata |

Fixture: Quandrix Lab (Zimone, Simic), 99 cards. Strip: Ramp 10/10, Draw 7/10, Removal 9/8, Wipes 5/3, Land 35/37. Cyclonic Rift counts as both removal and a wipe.

## 1 · Role counts open their cards (`Role-Cards`)

The count rule from the brief holds everywhere: the list matches the figure that was pressed, and a card that fills two roles shows in both lists.

- **Surface (open call 1):** the shipped sheet at 390 and modal from `md`: the pass sheet's `SheetFrame` (eyebrow, title, lead, rows, Done).
  - Not the Jobs disclosure: 9 or 21 comma-joined names give no card press and no remove.
  - Not a jump to the deck list's *By role*: that view groups by the single `card.role`, so its group can disagree with the label tally that was pressed.
- **One component (open call 2)** for the strip and What we counted. Eyebrow *{Role} · rec N*, title *N cards*, lead (DRAFT) *The N cards we count as {role}, A to Z. A card that does two jobs is in both lists.* Rows A to Z.
- **Rows** are the shipped `DecklistRow`: owned dot, name, mana, ✕. The name opens the shipped card detail (back reads *← {Role}*). The ✕ is the deck list's own remove, with the shipped undo row (*{name} removed · Undo*) at the list's head; the title and the tile recount at once.
- **Tiles:** at or over target with cards, the caption reads **cards →** and opens the list. Under target keeps *consider →* / *suggest →*. The land tile keeps its press. A role with zero cards draws the static *—* and no press (A3).
- **Tuning hub re-ruled (open call 3):** the free pass still ranks and recommends no card. Each role-overage row in *What we counted* gains the row press (›) and opens the same list, A to Z. No cut order, no Cut press, no Suggestion tag, no reason line. Every other row in What we counted stays unpressable. Errata E1.
- **Alternative not taken:** every tile opens the list, with Consider or Suggest inside it. It adds a step to the job a short tile does today.
- States: A1 strip 390, A2 strip desktop, A3 zero cards, B1 Wipes (5, Cyclonic Rift ringed), B2 Removal (9, Cyclonic Rift ringed), B3 row pressed, B4 card detail, B5 after ✕ with undo, B6 desktop modal, C1 Proposed cuts at 102 with pressable role rows, C2 its list, C3 desktop.

## 2 · Consider with a role over target (`Consider-Over`)

- **Collapse (open call 1):** shelves short of target first (shipped order), then *Synergy · Zimone*, then roles at target, then roles over. Met and over shelves start folded with the shipped shelf fold (`use-folded-shelves`); opening one shows its suggestions as shipped.
- **Clause:** at target keeps the shipped *you have 10 of 10*. Over reads (DRAFT) *you have 9 · 1 over · 6 to consider*.
- **Cut entry (open call 2):** a met or over shelf's head carries **your N →** (N = the role's count), opening item 1's list. One list for one job.
- **Every role met:** synergy leads, every role shelf folded below it (D3). The land tile shows *balance →* as shipped.
- States: D1 390, D2 *your 9 →* pressed (item 1's sheet), D3 every role met, D4 desktop.

## 3 · Past Wizards announcements (`Archive`)

- **Route (open call 1):** `/announcements`, its own page. Entry: *Past announcements ›* in What's new's foot on Home (E1); Home rows keep their diamond and ✕. A sheet cannot hold ~608 posts or a month jump. No Settings entry, no new switch, no push.
- **Row (open call 2):** `FeedItemRow` as drawn, in its seen ink, with the date and no ✕. A post with no hero takes the post-glyph plate. A decklists post keeps *N of M lists* and both presses.
- **Kinds (open call 3):** switched-off kinds show; the archive is a library, not a feed. Dismissed posts show too. F7 (Wizards news off) is the same page as E2.
- **Navigation:** title *Announcements*, sub (DRAFT) *608 posts from Wizards since Jan 2023*; segment All / Secret Lair / Decklists / News; sticky month heads with counts; a month jump (*Nov 2026 ▾*) opening a sheet of years and months with counts (empty months dashed under a kind). Pages of 30: *30 of 608 · Show older*.
- **States:** E2 390, E3 desktop, F1 decklists kind, F2 jump sheet, F3 jump under a kind, F4 empty kind in a month (DRAFT *No Commander decklists in March 2025.* + *Go to February 2025 ›*), F5 loading skeletons, F6 failed (DRAFT *We couldn't load older posts.* + *Try again*), F7 news off.

## 4 · Sign-in and sign-up on Clerk (`Sign-In`)

Small items 7's S1 to S5 and U1 to U5 stand. This board draws only what the transfer and invitation-only sign-up add.

- **S4 invited (H1):** as drawn, with the button *Use this email* (Small items 7 READINESS cap fix), then U3 for the first name; the transfer makes the account with no second code.
- **S4, sign-up closed, not invited (H2, H4 desktop):** the shipped `inviteOnlyCopy` title, body (with the proven email) and fine line, after the code; one press, *Use a different email*, back to S1. No sign-up offered, no dead button. The S1 foot *New to The 99? Make an account* stays hidden until sign-up opens.
- **Invitation link (H3):** the Clerk ticket proves the email, so it skips the code and lands on U3, with (DRAFT) *{email} has an invitation.* in the body. A `/join` invite that reaches sign-up lands here too.
- **Between the code and the account (J1, J2):** no interstitial. The press dims and reads *Signing in…* / *Making your account…* (DRAFT, after the shipped *Confirming…*), name field locked.
- **Failures:** J3 Clerk refuses or the line drops: shipped `joinCopy.failed` under the press, which stays and retries; the name keeps its text. J4 the code expired mid-transfer: shipped `codeExpired`, the press becomes *Send a new code* (to the same email, back to S2).
- **Methods:** ~~email code only~~. Withdrawn by Hugh 2026-11-08: see addendum A1 below.
- If the dev-instance spike fails either transfer, this item returns to Design.

## 5 · Errata (`Errata`)

- E1 `tuning_hub/README.md:90` and `READINESS-audit.md:176`: the role-list exception.
- E2 `small_items_7`: S4 *Use this email* on the board and README:93; §5 points at H2/H3; READINESS:8,16 point here.
- E3 `add_panel/README.md:14`: met and over shelves follow synergy, folded, with *your N →*.
- E4 `announcements/README.md`: the *Past announcements ›* foot entry.

## Decided (Hugh, 2026-11-08)

1. Item 1: tiles at or over target open the list; under target keeps consider / suggest.
2. Item 2: met and over shelves fold below synergy, with *your N →*.
3. Item 3: switched-off kinds show. Settings are only for notifications.
4. Item 4: ~~email code only~~. Reversed by Hugh 2026-11-08: sign-in keeps every method players have today (addendum A1).

## 4 · Addendum A1: sign-in methods (`Sign-In-Methods`, Hugh's ruling 2026-11-08)

Sign-in keeps every method players have on Clerk's hosted page today: **Continue with Google**, **email and password**, and the **emailed code**. Sign-up stays invitation-only until launch. Nothing else on the drawn screens changes. Dashed copper marks the additions; new wording is DRAFT.

- **K1 sign in (390, K6 desktop):** *Continue with Google* first (the outlined `.jbtn.q` press with Google's mark), then *or*, then S1's email. Body (DRAFT) *Use Google, or type your email.* The email press becomes **Continue**: an account with a password goes to K2; one without, or an email Clerk doesn't know, gets the code (S2) as today. The foot *Make an account* stays hidden while invitation-only.
- **K2 password (390, K7 desktop):** *Enter your password*, *For {email}.*, one field, **Sign in**, then S2's link row: **Forgot password?** and **Email me a code instead** (sends the code, goes to S2).
- **K3 wrong password:** the field takes S3's danger edge; (DRAFT) *That password isn't right. Try again, or email yourself a code.* in the `codeWrong` slot. Press and links stay.
- **K4 forgot, the code:** *Reset your password*, S2's six boxes and cooling resend, **Back to sign in**. A wrong or expired code reads as S3.
- **K5 forgot, the new password:** *Choose a new password*, one field, *At least 8 characters.*, **Save and sign in** (sets it and signs in). Clerk's weak or breached refusal shows in the `s7err` slot.
- **L1 sign-up by invitation, with Google (390, L3 desktop):** H3 as drawn, plus *or* and **Continue with Google** under *Make my account*, with (DRAFT) *Use the Google account for {invited email}.* Google signs up with the ticket and takes the first name from Google. S4 → U3 takes the same two lines.
- **L2, not recommended:** an optional password field on U3. **Recommended: sign-up offers no password.** A player who wants one sets it in Manage account (Clerk's page, account menu); K2 offers it from then on.
- **M1 Google, no invitation (390, M3 desktop):** H2 naming the Google email; **Use a different email** returns to K1. No account is made. The same page follows L1 when the Google email isn't the invited one.
- **M2 Google email matches a code or password account:** it signs in to that account. The Google press reads *Signing in…* on the way back; no message.

- **A1b, from engineering's audit (section N):** N1 a password Clerk refuses (breached, compromised, `needs_new_password`): K2 with (DRAFT) *This password can't be used anymore. Reset it to sign in.* and **Reset password** → K4. N2 a new-device or MFA code: S2 unchanged. N3 H2 without the Google email, only if the spike can't read it: the shipped `inviteOnlyCopy.body` alone. N4 no Google first name: the shipped U3 field.

Decided (Hugh, 2026-11-08): sign-up offers no password; L2 is not built. A1b awaits Hugh's look.


## 4 · Addendum A2: invite-only on Clerk (`Sign-In-Invite-Only`, Hugh's rulings 2026-11-11)

A Clerk dev-instance test (2026-11-08) and three rulings from Hugh (2026-11-11) change three moments. Everything else in Small items 7, item 4, A1 and A1b stands as drawn. Each state is drawn at 390 and desktop; section T shows P3 and Q4 at 390 and Q1 at desktop in all six themes (Amonkhet, Kamigawa, Ixalan, Phyrexia, Eldraine, Kaldheim; display face per theme). Dashed copper marks what A2 changes; new wording is DRAFT for `/copy-review`.

**Ruling 2: never reveal whether an email has an account (P, R, G).**
- **P1 sign in (K1 redrawn; P7 desktop):** as K1, but **Continue goes to P2 for every email**. The foot gains the pointer to the other page: (DRAFT) *New to The 99? It's invite-only for now.* **How to join** → `/sign-up` (R1).
- **P2 password (K2 redrawn):** the K2 screen for every email, with *Forgot password?* and *Email me a code instead*.
- **P3 it didn't work (K3 redrawn):** (DRAFT) *That email or password isn't right. Try again, or email yourself a code.* One line for a wrong password, an unknown email and a code-only account (Clerk's `form_password_or_identifier_incorrect` with protection on).
- **P4 Email me a code instead (S2 redrawn; P8 desktop):** S2 for every email with the body (DRAFT) *If {email} has an account, we sent it a 6-digit code. It works for 10 minutes.* and the How to join foot. **P5** a wrong code is the shipped `codeWrong`.
- **P6 forgot (K4 redrawn):** (DRAFT) *If {email} has an account, we sent it a 6-digit code. Enter it, then choose a new password.* K5 stands.
- **Retired:** S4 (*No account for that email*, H1), H2 after a sign-in code, U4 (*You already have an account*) and J1, J4 which hung off U4. A sign-in code only completes for an account, so nothing follows a code but sign-in.
- **R1 `/sign-up` without an invitation (R4 desktop):** the shipped invite-only page (`inviteOnlyCopy`, every string shipped), with no form, so it explains the rule and never an email's status. **Sign in** is the pointer back. U1, U2 and U4 are not reached while invite-only.
- **R3 the invitation link doesn't work (R5 desktop):** one page for a used, revoked or expired ticket and for an invited email that already has an account: (DRAFT) title *This invitation link doesn't work*, body *It may have been used already, or it may have run out. If you made your account with it, sign in. If not, ask the friend who invited you to send a new one.*, press **Sign in**.
- **/join:** the shipped *You already have an account* after a /join code (`joinCopy.haveAccountTitle`, `haveAccountBody`) goes too; /join always continues to sign-up (Q1), and a taken email gets R3.

**Ruling 1: sign-up keeps a password (Q).**
- **Q1 arriving on an invitation (H3, L1 redrawn; Q7 desktop):** the ticket proves the email, no code. One screen: *Your first name* (shipped U3 field and hint), then **Password** with (DRAFT) *At least 8 characters.*, **Make my account**, then *or* and Continue with Google (L1). Title (DRAFT) **Make your account** (S4's *That's your email* retires); body (DRAFT) *{email} has an invitation, and its link proved the email is yours. Add your first name and a password.*
- **Q2 too short** (checked on the press, before Clerk): *Use at least 8 characters.* **Q3 too weak** (`form_password_not_strong_enough`): *That password is too easy to guess. Try a longer one, or a few words together.* **Q4 breached** (`form_password_pwned`; Q8 desktop): *That password has appeared in a data breach, so it can't be used. Choose a different one.* All DRAFT, in the `s7err` slot with S3's danger edge; the name and the typed password stay. K5's new password takes the same three lines.
- **Q5** Make my account pressed: J2 with both fields locked. **Q6** back from Google with something missing (N4 redrawn): only the fields Clerk asks for (name, password, or both), body (DRAFT) *Google confirmed {email}. Add what Google didn't send.* No stop if Clerk waives the password after Google and Google sent a name.

**Ruling 3: an uninvited Google sign-up is refused before Google's consent screen (R2, G1).**
- **R2:** on the invitation landing the Google press first starts the sign-up with the ticket; it dims and reads (DRAFT) *Checking your invitation…*. A good ticket opens Google; a bad one is refused before Google opens and the page becomes R3.
- **G1 Google on sign-in, nothing to sign in to:** back from Google, Clerk refuses the sign-up it would start; P1 returns with (DRAFT) *That Google account can't sign in here. Use your email, or open your invitation link if you're new.* under the Google press. Replaces M1 and N3. M2 (a matching account signs in) stands.
- **N1** stands, with the A1b audit's tightening accepted: *This password can't be used. Reset it to sign in.*

Open for Hugh: none. Each moment takes the brief's example direction.
