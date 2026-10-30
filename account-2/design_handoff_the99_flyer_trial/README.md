# The 99 — Flyer trial · R1 · account 2, 2026-10-29

Canvas (account 2): https://claude.ai/artifact/68NYTSE6Uoued9mtkWs29F (12 boards). Status: **R1b (Hugh's notes, 2026-10-30), awaiting Hugh's review.**
On approval this folder becomes `design/design_handoff_the99_flyer_trial/` on main, mirroring `design_handoff_the99_invites/`.

A card-store flyer trial before going public: the printed flyer, the `/join` landing for a flyer code, admin controls
for codes, and two feedback avenues (a problem report and a check-in), plus the admin list that reads both.

## R1b (Hugh's notes, 2026-10-30)

- The flyer names the game: kicker "Magic: The Gathering · Commander", plus the locked Fan Content passage one in small print at the foot.
- No "invite only": a try-before-launch line under the pitch; foot "Free to try"; /join titled "Try The 99 before it launches".
- Launch list: used-up and ended flyers take an email ("Tell me at launch" → "You're on the list"); admin shows the count and a CSV.
- No single word alone on a last line anywhere (headings balanced, copy wraps pretty; render.js reports `lone`).
- Quieter warnings: error screen drops "Your decks and collection are fine" (changes shipped `shellCopy.errorBoundary.body`); report form drops "Nothing else."
- Report sent: "We'll be in touch if we need any more insight."
- Check-in pills one size (3-column grid): Collection, Commanders, Decks, Shopping, Friends, Precons; Yes, Maybe, Already have.

## Locked (Hugh, 2026-10-29)

Personal invites unchanged. A flyer code is long-lived and revocable, sits on Hugh's account and draws his invites, never
befriends Hugh, and stops at public launch. One label per store, max 50 sign-ups. Sign-ups land in the store's group (3 free
runs a day, 15 welcome credits) with 3 invites of their own; their invitees join the group and befriend them. Feedback is
in-app only, read in /admin.

## Boards

| Board | What |
|---|---|
| Main | Locks, Design's calls, questions for Hugh, engineering gaps. |
| 1 Flyer | A (recommended) and B (tear-off tabs) at letter size, one ink; five paper stocks; three pitch lines for /copy-review. |
| 2 Join-Phone | V1 valid, V2 code, V3 proven, E1 used up, E2 revoked, E3 expired (after launch). |
| 3 Join-Desktop | V1 and E1 at 1300. |
| 4 Admin-Desktop | Flyer codes section on the Invites tab, the tree's flyer node, New flyer code, Revoke. |
| 5 Admin-Phone | The same at 390. |
| 6 Print | The print page: the flyer with a screen-only bar (Print, Download QR). |
| 7 Report-Phone / 8 Report-Desktop | Error screen link, About index row, the form (empty, sending, sent, failed). |
| 9 Survey-Phone / 10 Survey-Desktop | The check-in over Home (empty, answered, sent, failed). |
| 11 Admin-Feedback | The Feedback tab, desktop and phone. |

## Design's calls

1. The flyer is the brand's card fan in one ink: crowned 99 + THE, kicker, Cinzel pitch, QR on the front card, URL with
   the code underlined, three facts. Black on goldenrod; any light stock.
2. A code is six readable characters (no 0/O, 1/I) on the invite route: `the-99.dev/join/MOX4QK`.
3. `/join` keeps the shipped newcomer column. No sender: the compact card is face up as an Invitation from The 99 itself
   (crowned 99 in the art box, "From a flyer" credit). Email/code steps unchanged; only sender lines change. Ended codes
   show the back and name nobody; after launch the press goes to sign-up.
4. The store label never reaches a player.
5. Flyer codes is a section at the top of /admin Invites (Store, Code, Sign-ups n of 50, Group, Made, Print/Revoke).
   New flyer code opens in place (group defaults to a new one named from the store, daily credits 3). Revoke confirms in
   ModalChrome / sheet. The tree gains a flyer node under Hugh.
6. Report a problem: one row on About's index (menu › About The 99) and "Tell us what happened" on the error screen;
   one form (sheet on phone, ModalChrome on desktop): what happened, what you were doing (optional), an attach line.
7. The check-in opens on Home only, after it settles: 1–5 rating, uses (pick any), tell your pod, free text. Not now
   snoozes; ✕ ends this check-in. Send needs the rating.
8. /admin gains an eighth tab, Feedback: both kinds, filter pills, unread dot, the store's group chip.
9. Failures are the shared toast with Try again; text and answers kept.

## For Hugh

1. Report a problem placement: About index (recommended) or the foot of Settings.
2. Check-in: sheet/modal on Home (recommended) or an inline Home card; ✕ vs Not now as above.
3. Pitch: "Build Commander decks from the cards you already own." (recommended) or the two on board 1.
4. Tear-off tabs: recommend A (no tabs).

## Gaps for engineering

Route (6-char code vs 43-char token, case-insensitive, rate-limited); the claim holds one of the 50 for 10 minutes;
each sign-up spends one of Hugh's invites (0 reads All taken); one switch retires codes at launch; Make code creates or
joins a group; feedback store (kind, account, answers, page, device, digest, read_at; names not emails); check-in timing
in code; `global-error.tsx` opens the form as a page.

## Copy

Every new string is a placeholder for /copy-review (boards carry them verbatim).

## Files

`*.dc.html` + `canvas.json` are the canvas (art by `/_blob` url); `art/` holds the shipped About captures used;
`scratch-gen/` rebuilds the boards (`python3 build.py local out` then `node render.js $PWD/out <names>` checks broken
images and clipping; `python3 build.py blob <dir>` for the canvas).
