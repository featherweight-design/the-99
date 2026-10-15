# Design property table: Social R1 PR D, the friend request card (`/friend/[token]`)

Source: `design/design_handoff_the99_social_r1/` R2 (overrides R1): `R2 - Landing-Desktop.dc.html`,
`R2 - Landing-Phone.dc.html` (frames L1 to L8, L2b; the flip strip at the foot of each), README decisions 19 to 25
(and R1 decisions 7 to 9, 18 where R2 does not override), `STATES-social-r1.md`, `READINESS-r1-audit.md`
(D1, E6, E8, E10, E12, E15, E16, C2), `social-r1 · copy strings.ts` (`landing.*`).

Values are the boards' inline/stylesheet values. The boards are drawn in the Kamigawa theme and use **literal hex
values, not CSS variables**; the literal is recorded and the token mapping is the implementer's (Agent 2) to confirm
against `globals.css`. Copy is recorded as its key only. `—` = explicitly absent. Unspecified properties are omitted.
Phone (390) and Desktop (1300) columns; "=" means same as Desktop.

Fonts: `Chakra Petch` = display face, `IBM Plex Sans` = body face, `IBM Plex Mono` = mono face (map to the app's
font variables, e.g. `--font-plex-mono`).

---

## 1. Page frame / stage

| Element | Property | Phone (390) | Desktop (1300) |
|---|---|---|---|
| Shell (signed in) | chrome | shipped mobile header (`mh`) + scroll area + tab bar (5 slots, none current) | shipped rail (62px), no slot current |
| Shell (signed out, L1) | chrome | — (no header, no tab bar): full-screen `pout` | — (no rail): full-screen `out` |
| Signed-in content area | background | `radial-gradient(420px 300px at 50% 28%, rgba(255,77,154,.07), transparent 70%)` on the scroll area | `radial-gradient(700px 420px at 50% 30%, rgba(255,77,154,.06), transparent 70%)` on `main` |
| Signed-in content area | layout | flex column, `align-items:center`, `gap:16px` | `main`: flex, `justify-content:center`, `position:relative` |
| Signed-in content area | padding | `22px 16px` | — |
| Signed-in content area | overflow | `hidden` on the board (no scroll needed: question + buttons fit above the tab bar at 390×844) | — |
| Stage (card + column) | layout | stacked: card above column (column direction from scroll area) | flex row, `align-items:center`, `align-self:flex-start` |
| Stage | gap | 16px (scroll area gap) | 56px |
| Stage | margin-top | — (scroll padding-top 22px) | 110px |
| Stage order | | card, then column | card left, column right |
| Signed-out ground (L1) | background | `radial-gradient(600px 360px at 50% 22%, rgba(255,77,154,.12), transparent 70%), #0E0F14` | `radial-gradient(1000px 520px at 50% 8%, rgba(255,77,154,.10), transparent 70%), #0E0F14` |
| Signed-out ground | layout | flex column, `align-items:center`, `justify-content:center`, `gap:16px`, `text-align:center` | flex row, `align-items:center`, `justify-content:center`, `gap:56px` |
| Signed-out ground | padding | `0 24px` | — |
| Signed-out ground | element | `<section aria-labelledby>` on the h1 | `<section aria-labelledby>` on the h1 |
| Signed-out ground | provenance | "the signed-out landing's ground and mark" (R1 dec. 8; `src/app/page.tsx`) | same |

## 2. The card box (both faces)

| Element | Property | Phone | Desktop |
|---|---|---|---|
| Card box (front `cw`, back `back`, flip wrapper) | width × height | 300 × 419 drawn, scaled `transform:scale(.74)` → 222 × 310 visual | 300px × 419px |
| | aspect | 63:88 | 63:88 |
| | transform-origin | `top center` | — |
| | margin-bottom | `-109px` (reclaims the scale's lost height) | — |
| | flex | `none` | `none` |
| | rule | both faces are the same box, so nothing moves on the turn | = |

## 3. Card front (face up)

| Element | Property | Phone | Desktop |
|---|---|---|---|
| Frame (`cw`) | border-radius | = | 17px |
| | padding | = | 3px (the frame "sliver") |
| | box-sizing | = | border-box |
| | background (commander) | = | `center / cover no-repeat url(<commander art crop>), #262A35` |
| | background (no commander, L2b) | = | `linear-gradient(160deg, #4A4E5C, #262A35)` (grey) |
| | box-shadow | = | `0 34px 70px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.6)` |
| | role / label | = | `role="img"`, `aria-label` = `landing.cardAria(name, commander \| null, type)` |
| Inner face (`mtg`) | size | = | 100% × 100% |
| | border-radius | = | 14px |
| | background | = | `#14151B` |
| | padding | = | 9px |
| | layout | = | flex column, `gap:6px`, `overflow:hidden`, border-box |
| Name bar (`nb`) | height | = | 32px, `flex:none` |
| | border-radius | = | 8px |
| | background | = | `#20222A` |
| | box-shadow | = | `inset 0 0 0 1px rgba(255,255,255,.05)` |
| | layout | = | flex, `align-items:center`, `gap:8px` |
| | padding | = | `0 10px` |
| Name bar name (`b`) | content | = | sender display name (own name on L5) |
| | font | = | Chakra Petch 700 16px |
| | color | = | `#E6E8F0` |
| | overflow | = | `flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis` |
| Name bar pips | | = | — (a pips slot exists in markup, 11px discs gap 3px, but every frame passes an empty list; no pips render) |
| Art box (`art`) | height | = | 178px, `flex:none` |
| | border-radius | = | 6px |
| | overflow | = | hidden |
| | background | = | `#20222A` |
| | box-shadow | = | `inset 0 0 0 1px rgba(0,0,0,.6)` |
| Art img | | = | `display:block; width:100%; height:100%; object-fit:cover`; `alt=""` (decorative; the card's label carries it). Source: catalog representative printing's art crop (G12) |
| Art box, no commander (`art ini`, L2b) | layout | = | flex, centered both axes |
| | background | = | `radial-gradient(220px 160px at 50% 40%, #2A2C36, #16181F)` |
| | text | = | initials: board computes `name.slice(0,2).toUpperCase()` ("JO") |
| | font | = | Chakra Petch 700 64px |
| | color | = | `#959AAD` |
| | letter-spacing | = | .04em |
| Type line (`tyl`) | height | = | 26px, `flex:none` |
| | border-radius | = | 6px |
| | background | = | `#20222A` |
| | box-shadow | = | `inset 0 0 0 1px rgba(255,255,255,.05)` |
| | layout | = | flex, `align-items:center`, `justify-content:space-between` |
| | padding | = | `0 10px` |
| | font | = | Chakra Petch 600 12.5px |
| | color | = | `#E6E8F0` |
| | left text | = | `landing.typeRequest` (L2, L2b, L8) / `landing.typeOwn` (L5) / `landing.typeFriend(since)` (L6) |
| Type line glyph (`i`) | content | = | `◆` (literal, no key) |
| | color | = | `#FF4D9A` (accent) |
| | font-size | = | 11px; `font-style:normal` |
| Text box (`tx`) | flex | = | `flex:1; min-height:0; overflow:hidden` |
| | border-radius | = | 6px |
| | background | = | `#101219` |
| | padding | = | `9px 11px` |
| | font | = | IBM Plex Sans 12px, line-height 1.45 |
| | color | = | `#B1B6C7` |
| | content | = | `landing.openRules(name)` (L2, L2b, L8) / `landing.ownRules` (L5) / `landing.friendRules(name)` (L6) |
| Credit footer (`ft`) | layout | = | flex, `justify-content:space-between`, `flex:none` |
| | padding | = | `0 4px` |
| | font | = | IBM Plex Mono 400 9.5px |
| | color | = | `#6F7486` |
| | letter-spacing | = | .04em |
| | left | = | `landing.credit(commander)` uppercase (copy file says "drawn uppercase by CSS"; board uppercases in JS, `.ft` has no `text-transform`) / `landing.noCommander` uppercase (L2b) |
| | right | = | `THE 99` (literal, no key) |

## 4. Card back (face down)

| Element | Property | Phone | Desktop |
|---|---|---|---|
| Back (`back`) | border-radius | = | 17px |
| | padding | = | 12px, border-box |
| | background | = | `#14151B` |
| | box-shadow | = | `0 34px 70px rgba(0,0,0,.6), inset 0 0 0 1px #262A35` |
| | a11y | = | `aria-hidden="true"` |
| Back inner (`in`) | size | = | 100% × 100% |
| | border-radius | = | 10px |
| | border | = | 1px solid `#343843` |
| | background | = | `radial-gradient(240px 260px at 50% 46%, rgba(255,77,154,.22), transparent 72%), repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 6px, transparent 6px 12px), #101219` |
| | layout | = | flex column, centered both axes, `gap:10px` |
| Hero mark (`hero`) | layout | = | flex column, `align-items:center` |
| | content | = | `99` |
| | font | = | Chakra Petch 700 58px, line-height 1 |
| | color | = | `#E6E8F0` |
| Hero diamonds (`hero i`) | content | = | `◆ ◆ ◆` |
| | color | = | `#FF4D9A` |
| | font-size | = | 13px; letter-spacing 4px; margin-bottom 6px; `font-style:normal` |
| Word (`wd`) | content | = | `FRIEND REQUEST` (literal on the boards; no copy key — could reuse `landing.kicker` uppercased) |
| | font | = | IBM Plex Mono 400 10px |
| | letter-spacing | = | .4em |
| | color | = | `#FF4D9A` |
| Dimmed back (`back dim`, L3 only) | opacity | = | .42 |
| | filter | = | `grayscale(1)` |

## 5. The column

| Element | Property | Phone | Desktop |
|---|---|---|---|
| Column | element | `<section aria-labelledby="lh">` (signed in) | = |
| | width | 100% | 380px |
| | layout | flex column, `gap:8px` | flex column, `gap:10px` |
| | text-align | center | left (default) |
| Kicker (signed in) | content | — (phone draws no kicker) | `landing.kicker` |
| | font | | IBM Plex Mono 500 10.5px |
| | letter-spacing | | .14em |
| | text-transform | | uppercase |
| | color | | `#6F7486` |
| Kicker (signed out, L1) | content | — | literal `The Ninety-Nine` (no copy key) |
| | color | | `#FF4D9A` (else same as kicker) |
| h1 | element | `<h1 id>` | = |
| | font | Chakra Petch 700 **21px** | Chakra Petch 700 28px |
| | line-height | 1.15 | 1.15 |
| | color | `#E6E8F0` | = |
| | margin | 0 | 0 |
| Body (`bd`) | font | IBM Plex Sans 400 **14px** | IBM Plex Sans 400 14.5px |
| | line-height | 1.55 | 1.55 |
| | color | `#B1B6C7` | = |
| | margin | 0 | 0 |
| | rendered | only when the state has a body | = |
| Actions row | layout | flex **column**, `gap:8px` | flex row, `gap:10px` |
| | margin-top | 6px | 12px |
| Primary (`b1`) | height | **48px** | 44px |
| | width | full (stretch) | content |
| | padding | `0 26px` | `0 26px` |
| | border-radius | 8px | 8px |
| | border | 0 | 0 |
| | background | `#FF4D9A` | = |
| | color | `#0E0F14` | = |
| | font | IBM Plex Sans 600 **15px** | IBM Plex Sans 600 14px |
| | layout | flex, `align-items:center`, `justify-content:center`, border-box | flex, `align-items:center` |
| | text-decoration | none | none |
| | element | `<button type="button">` (Accept, Copy link); `<a>` for Sign in | = |
| Secondary (`b2`) | height | **48px** | 44px |
| | padding | `0 20px` | `0 20px` |
| | border-radius | 8px | 8px |
| | border | 1px solid `#262A35` | = |
| | background | transparent | = |
| | color | `#E6E8F0` | = |
| | font | IBM Plex Sans 500 **15px** | IBM Plex Sans 500 14px |
| | layout | flex, centered, border-box | flex, `align-items:center` |
| | element | `<a href>` on the board in every state (incl. Decline — see ambiguities) | = |
| Fine print (`fine`) | font | IBM Plex Mono 400 11px | = |
| | color | `#6F7486` | = |
| | margin | `6px 0 0` | = |
| | rendered | only when the state has one | = |
| Hover / focus on buttons | | not drawn (use the shipped primary/secondary button states) | = |

## 6. Toast (L8, and decline failure per E15)

| Element | Property | Phone | Desktop |
|---|---|---|---|
| Toast | component | shared `ToastFrame`, `role="alert"` | = |
| | position | absolute, `left:16px; right:16px; bottom:90px` (above the 74px tab bar) | absolute, `left:50%; bottom:24px; transform:translateX(-50%)`, positioned in the whole shell frame (rail included) |
| | width | stretch | 420px |
| | z-index | 6 | 6 |
| | layout | flex, `align-items:center`, `gap:12px` | flex, `align-items:center`, `gap:14px` |
| | border | 1px solid `#262A35`, radius 10px | = |
| | background | `#20222A` | = |
| | padding | `4px 6px 4px 16px` | = |
| | box-shadow | `0 12px 40px rgba(0,0,0,.5)` | = |
| Toast text | content | `landing.acceptFailed` (L8); `landing.declineFailed` (decline, not drawn) | = |
| | font | 13.5px, `#E6E8F0`, padding `8px 0`, `flex:1`, `text-align:left` | 13.5px, `#E6E8F0`, padding `8px 0`, `flex:1` |
| Toast button | content | `Try again` (no `landing.*` key; `invites.retry` exists) | = |
| | height | **44px** | 36px |
| | padding | `0 12px` | = |
| | font | IBM Plex Sans 600 13px, `#FF4D9A`, transparent, no border | = |

## 7. The flip (transitions / transforms)

| Property | Phone | Desktop |
|---|---|---|
| Who flips on arrival | open (L2, L2b), already friends (L6), own link (L5) per the board's flip caption; see contradiction 1 | = |
| Who never flips | signed out (L1), expired (L3), ended (L4): arrive face down and stay | = |
| Arrival | drawn face down, waits **200ms**, turns face up over **520ms** | = |
| Axis | vertical (`rotateY`) | = |
| Perspective | `1400px` on the wrapper (`flip`, 300×419, `flex:none`) | = |
| Inner (`fi`) | `position:relative; 100%×100%; transform-style:preserve-3d` | = |
| Faces | each `position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden` | = |
| Face order | back first; front (`cw`) pre-rotated `rotateY(180deg)`; face up = inner at `rotateY(180deg)` | = |
| Easing | `cubic-bezier(.45,.05,.25,1)` (board keyframes; README: "starts slow and lands softly") | = |
| Column during arrival | heading and buttons appear as the card lands (mechanism unspecified) | = |
| Iteration | once in the app (boards loop 5s for viewing only) | = |
| Scale | the turn runs on the card at 74% | 100% |
| Decline | face up → face down (reverse turn) **before** the column changes to L7 | = |
| Accept | no flip; leaves for `/friends` | = |
| Sign in from L1 | lands on this URL, so the face-down card turns over (arrival flip) | = |
| Reduced motion | no turn; faces swap with a **120ms cross-fade** (board CSS just shows the end state `rotateY(180deg)`, `animation:none`) | = |
| Layout shift | none: both faces one box | = |
| Flip strip a11y | demo wrapper `aria-hidden="true"` (board only) | = |

## 8. Conditional rendering per state (summary)

| State | Card | Kicker (D) | h1 key | Body key | Primary | Secondary | Fine | Toast |
|---|---|---|---|---|---|---|---|---|
| L1 | back | `The Ninety-Nine` literal, accent (desktop only) | `signedOutTitle` | `signedOutBody` | `signIn` (link) | — | `signedOutFine` | — |
| L2 | front, Dave | `kicker` | `openTitle(name)` | — | `accept` | `decline` | `openFine(name)` | — |
| L2b | front, initials, grey frame | `kicker` | `openTitle(name)` | — | `accept` | `decline` | `openFine(name)` | — |
| L3 | back **dim** | `kicker` | `expiredTitle` | `expiredBody` | — | `toFriends` | — | — |
| L4 | back | `kicker` | `endedTitle` | `endedBody` | — | `toFriends` | — | — |
| L5 | front, own | `kicker` | `selfTitle` | `selfBody` | `copy link` (no `landing.*` key; `dialog.copy`) | `toFriends` | — | — |
| L6 | front, friend | `kicker` | `alreadyTitle(name)` | `alreadyBody` | — | `toFriends` | — | — |
| L7 | back (after reverse turn) | `kicker` | `declinedTitle` | `declinedBody(name)` | — | `toHome` | — | — |
| L8 | front, Dave | `kicker` | `openTitle(name)` | — | `accept` | `decline` | `openFine(name)` | `acceptFailed` + Try again |

---

## State coverage

| State | Trigger | Renders | Buttons / targets | Accessibility |
|---|---|---|---|---|
| **L1 signed out** | no session. Route public in `src/proxy.ts` (G2/G14/E8); reads nothing; drawn regardless of the switch (E8) | signed-out ground, no shell; card face down (not dimmed), names nobody. Keys: `signedOutTitle`, `signedOutBody`, `signedOutFine`; desktop literal kicker `The Ninety-Nine` | primary `signIn` → Clerk sign-in, redirect back to this URL. No Create an account (G3) | `section aria-labelledby` h1; back `aria-hidden` |
| **L2 open** | signed in, switch on for reader, `readInvite` state open, not self, not already friends | face up: name, commander art + art-tinted frame, `typeRequest`, `openRules(name)`, `credit(commander)`; `openTitle`, `openFine`. Arrives down, flips up | primary `accept` → `redeemInvite`, then `/friends` with a receipt carrying `publicId` (E10, dec. 9). secondary `decline` → `declineInvite`, reverse flip, L7 | card `role="img"` labelled `cardAria(name, commander, typeRequest)`; heading carries the question; column `section aria-labelledby` |
| **L2b no commander** | as L2, sender has no commander | face up, art box = initials on neutral wash, frame `linear-gradient(160deg,#4A4E5C,#262A35)`, credit `noCommander` | as L2 | `cardAria(name, null, typeRequest)` |
| **L3 expired** | state expired | back, **dimmed** (opacity .42, grayscale). No name; name stripped server-side (E6). No flip | secondary `toFriends` → `/friends` | back `aria-hidden` |
| **L4 ended** | redeemed, declined, revoked, or `readInvite` null (not found): one card | back, not dimmed, no name, no flip | secondary `toFriends` → `/friends` | back `aria-hidden` |
| **L5 own link** | `self` | face up, own name + own commander, `typeOwn`, `ownRules`; `selfTitle`, `selfBody` (C2: wording `for the first person who opens it` is inaccurate — copy-review). Link stays open | primary Copy link → clipboard (feedback not drawn on landing); secondary `toFriends` | `cardAria(own name, commander, typeOwn)` |
| **L6 already friends** | open link + `alreadyFriends` (check `state` before `alreadyFriends`, E6); page calls `redeemInvite` once, from an action / guarded step, never a repeatable render (G4, E6) | face up, `typeFriend(since)` (needs `friendsSince`, E6), `friendRules(name)`; `alreadyTitle`, `alreadyBody` | secondary `toFriends` only | `cardAria(name, commander, typeFriend(since))` |
| **L7 declined** | after Decline succeeds in this session | card turned face down in place (not dimmed); `declinedTitle`, `declinedBody(name)` | secondary `toHome` → `/` | back `aria-hidden` |
| **L8 failure** | `redeemInvite` throws (accept) / `declineInvite` throws (decline, E15, not drawn) | L2 unchanged, face up, + `ToastFrame` `acceptFailed` / `declineFailed`. A redeem answering `ended` is not an error: redraw as L4. `declineInvite` `false` (ended or own) → redraw from a fresh read, not "done" (E12) | toast Try again → retries the action | toast `role="alert"` |
| Loading (E16) | route loading | shipped `LoadingScreen` (card would arrive face down anyway) | — | — |
| Page read fails (E16) | `readInvite` throws | app error boundary | — | — |
| Switch off | `SOCIAL_FRIENDS_ENABLED` off for the signed-in reader | `/friend/*` not found (Placement D; E8 gates signed-in by reader's switch) | — | — |

Data rules carried (D1, E6): commander and name only for open, self and already-friends; strip `inviterName` and
commander server-side for every other state before anything reaches the client.

---

## Contradictions and ambiguities

1. **Does the own link (L5) flip?** Board flip caption: yes ("open, already friends, your own link"). README 23 and the
   R2 summary board say face up / flip "when the page may name the sender (open, already friends)", then separately
   "Your own link shows your own card"; STATES R2 lists L5 among face-up states without saying it flips. Board is the
   most explicit: build L5 as flipping.
2. **Flip timing on the board vs prose.** Board keyframes turn over 22%→31% of 5s = 450ms; README/board caption say
   520ms with 200ms wait. Prose wins (520ms, 200ms).
3. **Reduced motion:** board CSS shows a static face-up card; prose says a 120ms cross-fade. Prose wins.
4. **Stale R1 rows in STATES "join landing" table:** route `/invite/[token]`, Open "name line" (R2 dec. 20 removed it),
   After Decline `Invite declined` (copy: `declinedTitle` "Request declined"). README R1 dec. 7/8/9 use "invite"
   wording overridden by R2 dec. 19.
5. **Kicker on phone:** desktop renders `landing.kicker` (and `The Ninety-Nine` on L1); phone renders no kicker in any
   frame. `The Ninety-Nine` has no copy key.
6. **Credit uppercase:** copy says "drawn uppercase by CSS"; the board's `.ft` has no `text-transform` and uppercases
   in JS. Use CSS `text-transform:uppercase`.
7. **Pips:** the name bar has a pips slot and the board defines a colour-identity map, but every frame passes no pips;
   README 23 does not mention pips. Treat as absent. A colour-identity `frame()` gradient is also defined and unused
   (frame is the art).
8. **Initials:** board takes the first two letters (`Jo` → `JO`), not first-plus-last initials; README says
   "initials". Should match the face's initials rule elsewhere in R2 (Friends board).
9. **Decline is an `<a href>` on the board** (all `b2` are anchors); it is an action and should be a `<button>`.
10. **Literal strings without keys:** back word `FRIEND REQUEST`, footer `THE 99`, `◆` glyphs, toast `Try again`
    (`invites.retry` exists), L5 `Copy link` (`dialog.copy` exists), Copied feedback on L5 (not drawn).
11. **Not drawn:** Accept/Decline pending state, button hover/focus, decline-failure toast (E15), loading/error (E16),
    how the column "appears as it lands" (fade? instant?).
12. **C2:** `selfBody` says the link works "for the first person who opens it"; opening does not spend it (accepting or
    declining does, or a friend opening it, G4). Copy-review's call.
13. **Desktop toast centre:** positioned in the whole shell frame (rail included), so it centres on 1300, not on `main`.
