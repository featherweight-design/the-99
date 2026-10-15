# Gap report: Social R1 PR D, the friend request card (`/friend/[token]`)

Table: `docs/superpowers/design-tables/social-r1-landing.md`. Branch `social-r1-d-friend-card` (WIP 0b0164ed8).
Token mapping per the Kamigawa block (`--surface-inset` #13151C vs board #14151B = MATCH-NEAR throughout).
Ruled decisions (own link flips, faceInitials, CSS uppercase, no pips, Decline `<button>`, hand-rolled buttons with
hover, Copy link origin, SocialToast/ToastFrame centre placement, brand/kicker/mark keys) are not reported as gaps.

Files: FC = `src/components/social/friend-card.tsx`, FL = `src/components/social/friend-landing.tsx`,
PG = `src/app/friend/[token]/page.tsx`, CSS = `src/app/globals.css` 1474-1508, ST = `src/components/social/social-toast.tsx`,
TF = `src/components/collection/edit-toast.tsx` (ToastFrame).

## Pass 1: visual properties

### 1. Page frame / stage
| Row | Result |
|---|---|
| Shell signed in, phone: header + tab bar, no slot current | ✅ MATCH (shell.tsx; `isActive` is `/friends` + `/`-prefix, `/friend/x` matches none) |
| Shell signed in, desktop: rail, no slot current | ✅ MATCH |
| Shell signed out: no chrome | ✅ MATCH (shell.tsx:43-44 returns children bare) |
| Content bg phone `radial 420x300 at 50% 28%, accent .07` | ✅ MATCH (FL:266, color-mix 7%) |
| Content bg desktop `radial 700x420 at 50% 30%, accent .06` | ✅ MATCH (FL:266 md:) |
| Content layout phone: column, center, gap 16 | ✅ MATCH (FL:267) |
| Content layout desktop: flex, justify-center, relative | ✅ MATCH (FL:266 `flex justify-center`; relative not set, nothing positioned inside needs it) |
| Padding phone 22/16; desktop none | ✅ MATCH (FL:266 `px-[16px] py-[22px] md:p-0`) |
| Overflow hidden on phone board | ✅ MATCH-NEAR: not set; the open state fits above the tab bar at 390x844 (open-phone.png), so nothing scrolls |
| Stage desktop: row, items-center, self-start, gap 56, mt 110 | ✅ MATCH (FL:267) |
| Stage phone gap 16 | ✅ MATCH |
| Stage order card then column | ✅ MATCH (FL:253-254; PG:31-32) |
| Signed-out ground bg phone `radial 600x360 at 50% 22%, .12` + #0E0F14 | ✅ MATCH (PG:30, `--bg`) |
| Signed-out ground bg desktop `radial 1000x520 at 50% 8%, .10` + #0E0F14 | ✅ MATCH (PG:30 md:) |
| Signed-out layout phone: column, center, gap 16, text-center | ✅ MATCH (PG:30; text-center carried by the column, FL:71) |
| Signed-out layout desktop: row, center, gap 56 | ✅ MATCH (PG:30) |
| Signed-out padding phone `0 24px` | ✅ MATCH (PG:30 `px-[24px] md:px-0`) |
| Signed-out ground element `<section aria-labelledby>` | ❌ MISMATCH (minor) — design: the ground is the labelled section / implementation: ground is a `<div>` (PG:30); the labelled `<section aria-labelledby="friend-landing-title">` is the column inside it (FL:71). Landmark and name are equivalent; element placement differs |

### 2. Card box
| Row | Result |
|---|---|
| 300x419 | ✅ MATCH (FC:47) |
| Phone scale .74, origin top center, mb -109 | ✅ MATCH (FC:47 `max-md:scale-[.74] max-md:origin-top max-md:mb-[-109px]`) |
| flex none | ✅ MATCH |
| Both faces one box | ✅ MATCH (CSS `.friend-card-face` absolute inset 0) |

### 3. Card front
| Row | Result |
|---|---|
| Frame radius 17, padding 3, border-box | ✅ MATCH (FC:89) |
| Frame bg commander: cover/center/no-repeat art over #262A35 | ✅ MATCH (FC:89-90, `--border-strong`) |
| Frame bg no commander: `linear-gradient(160deg,#4A4E5C,#262A35)` | ✅ MATCH (FC:89) |
| Frame shadow | ✅ MATCH (FC:27) |
| role img + `cardAria(name, commander\|null, type)` | ✅ MATCH (FC:84-85) |
| Inner: 100%, radius 14, bg #14151B, padding 9, column gap 6, overflow hidden | ✅ MATCH-NEAR (FC:92, `--surface-inset` #13151C) |
| Name bar: 32, flex none, radius 8, #20222A, inset shadow, center, gap 8, px 10 | ✅ MATCH (FC:93) |
| Name: Chakra 700 16 #E6E8F0, ellipsis | ✅ MATCH (FC:94) |
| Pips absent | ✅ MATCH (ruled) |
| Art box: 178, flex none, radius 6, overflow hidden, #20222A, inset shadow | ✅ MATCH (FC:97) |
| Art img: block, 100%, cover, alt "" | ✅ MATCH (FC:98; `FadingImg`) |
| Initials box: centred, radial #2A2C36→#16181F, Chakra 700 64, #959AAD, .04em | ✅ MATCH (FC:103); rule = `faceInitials` (ruled) |
| Type line: 26, radius 6, #20222A, inset shadow, space-between, px 10, Chakra 600 12.5, #E6E8F0 | ✅ MATCH (FC:108) |
| Type text per state (`typeRequest` / `typeOwn` / `typeFriend(since)`) | ✅ MATCH (FL:33-37) |
| Glyph ◆ accent 11px normal | ✅ MATCH (FC:110) |
| Text box: flex 1, min-h 0, overflow hidden, radius 6, #101219, 9/11, Plex Sans 12/1.45, #B1B6C7 | ✅ MATCH (FC:112) |
| Text per state (`openRules(name)` / `ownRules` / `friendRules(name)`) | ✅ MATCH (FL:33-37) |
| Footer: flex between, none, px 4, mono 9.5, #6F7486, .04em | ✅ MATCH (FC:113) |
| Footer left `credit(commander)` / `noCommander`, uppercase | ✅ MATCH (FC:113-114, CSS uppercase ruled) |
| Footer right THE 99 | ✅ MATCH (FC:115, `landing.mark`, ruled) |

### 4. Card back
| Row | Result |
|---|---|
| Back radius 17, padding 12, border-box, #14151B | ✅ MATCH-NEAR (FC:66, `--surface-inset`) |
| Back shadow incl. inset 1px #262A35 | ✅ MATCH (FC:66) |
| aria-hidden | ✅ MATCH (FC:64) |
| Inner: 100%, radius 10, 1px #343843, radial accent .22 + hatch + #101219, column centred gap 10 | ✅ MATCH (FC:68) |
| Hero column centred; diamonds above 99 | ✅ MATCH (FC:69-71) |
| 99: Chakra 700 58 lh 1 #E6E8F0 | ✅ MATCH (FC:71) |
| Diamonds ◆ ◆ ◆ accent 13 tracking 4 mb 6 | ✅ MATCH (FC:70) |
| Word FRIEND REQUEST: mono 10 .4em accent | ✅ MATCH (FC:73, `kicker` uppercased, ruled) |
| Dim (L3): opacity .42, grayscale | ✅ MATCH (FC:66; FL:253 `dim={shown.kind === "expired"}`) |

### 5. Column
| Row | Result |
|---|---|
| `<section aria-labelledby>` | ✅ MATCH (FL:71) |
| Width 100% / 380 | ✅ MATCH (FL:71) |
| Gap 8 / 10 | ✅ MATCH (FL:71) |
| Text center / left | ✅ MATCH (FL:71) |
| Kicker: absent on phone; desktop mono 500 10.5 .14em uppercase #6F7486 | ✅ MATCH (FL:72 `max-md:hidden`) |
| Signed-out kicker: `brand`, accent | ✅ MATCH (PG:33-34, FL:72; ruled) |
| h1: Chakra 700 21 / 28, lh 1.15, #E6E8F0, m 0, id | ✅ MATCH (FL:75) |
| Body: Plex Sans 14 / 14.5, lh 1.55, #B1B6C7, m 0, conditional | ✅ MATCH (FL:78) |
| Actions: column gap 8 mt 6 / row gap 10 mt 12 | ✅ MATCH (FL:79) |
| Primary: 48/44, px 26, radius 8, border 0, accent bg, #0E0F14 text, 600 15/14, centred | ✅ MATCH (FL:44-45) |
| Primary width full / content | ✅ MATCH (FL:44 `w-full md:w-auto`) |
| Primary element: `<button>` for Accept and Copy link | ✅ MATCH (FL:204, 224) |
| Primary element: `<a>` for Sign in | ❌ MISMATCH (minor) — design: `<a>` / implementation: `<button type="button">` wrapped in Clerk `<SignInButton mode="redirect">` (PG:39-41). Navigates as a link would; the element differs |
| Secondary: 48/44, px 20, radius 8, 1px #262A35, transparent, #E6E8F0, 500 15/14, centred | ✅ MATCH (FL:46) |
| Secondary element `<a>` (Go to Friends / Go to Home) | ✅ MATCH (FL:193, 241 `<Link>`); Decline `<button>` ruled (FL:207) |
| Fine: mono 11, #6F7486, mt 6, conditional | ✅ MATCH (FL:80) |
| Hover/focus | ✅ MATCH (ruled: accent-hover / accent border) |

### 6. Toast
| Row | Result |
|---|---|
| Shared ToastFrame, role alert | ✅ MATCH (ST:37-41) |
| Position / width / z-index | ✅ MATCH (ruled centre placement; TF:133 bottom tabbar+16 / 24 from md, max-w 420) |
| Layout gap: phone 12 / desktop 14 | ✅ MATCH-NEAR — phone gap 14 not 12 (TF:133 `gap-[14px]` at every width); shared frame |
| Border 1px #262A35 r10, bg #20222A, padding 4/6/4/16, shadow | ✅ MATCH (TF:133) |
| Text: 13.5 #E6E8F0 py 8 flex 1 | ✅ MATCH (TF:135) |
| Text key `acceptFailed` / `declineFailed` | ✅ MATCH (FL:151, 175, 178) |
| Button label Try again | ✅ MATCH (FL:119 `landing.retry`) |
| Button height phone 44 / desktop 36 | ❌ MISMATCH (minor, shared component) — design: 36px from md / implementation: `min-h-[44px]` at every width (ST:50) |
| Button padding 0 12, Plex Sans 600, accent, transparent, no border | ✅ MATCH (ST:50) |
| Button font size 13 | ❌ MISMATCH (minor, shared component) — design: 13px / implementation: 13.5px (ST:50) |

### 7. The flip
| Row | Result |
|---|---|
| Who flips: open, no commander, friends, own | ✅ MATCH (FL:30-41, 100-113: every named face turns once after mount) |
| Who never flips: signed out, expired, ended | ✅ MATCH (face null → `up && named` false, FL:253; PG:31) |
| Arrival: 200ms wait, 520ms turn | ✅ MATCH (CSS 1486-1488) |
| Axis rotateY | ✅ MATCH |
| Perspective 1400 on wrapper | ✅ MATCH (CSS 1479) |
| Inner relative 100% preserve-3d | ✅ MATCH (CSS 1480-1485) |
| Faces absolute inset 0, backface hidden (both prefixes) | ✅ MATCH (CSS 1489-1494) |
| Face order: back first, front pre-rotated 180, up = inner 180 | ✅ MATCH (FC:54-55; CSS 1487, 1495) |
| Easing cubic-bezier(.45,.05,.25,1) | ✅ MATCH (CSS 1485) |
| Column during arrival: "heading and buttons appear as the card lands" | ❌ MISMATCH — design: heading and buttons land with the card / implementation: only the actions row and fine print carry `.friend-land-in` (FL:79-80); the h1 (FL:75), kicker (FL:72) and body (FL:78) are drawn at once. The CSS comment (globals.css "The column's heading and buttons arrive...") claims the heading |
| Iteration once | ✅ MATCH (FL:100-113, empty deps) |
| Scale 74% / 100% | ✅ MATCH |
| Decline: reverse turn before column changes to L7 | ✅ MATCH (FL:163-168, waits `turnMs()`) |
| Accept: no flip, leaves for /friends | ✅ MATCH (FL:140-143) |
| Sign in from L1 lands on this URL and flips | ✅ MATCH (PG:39 `forceRedirectUrl={invitePath(...)}`) |
| Reduced motion: no turn, 120ms cross-fade | ✅ MATCH (CSS 1496-1504; FL:28) |
| No layout shift | ✅ MATCH |

### 8. Per-state conditional rendering
| State | Result |
|---|---|
| L1 | ✅ MATCH (PG:31-44: back, `brand` kicker desktop, signedOutTitle/Body, signIn, signedOutFine) |
| L2 | ✅ MATCH (FL:196-213) |
| L2b | ✅ MATCH (same column; FC grey frame + initials + `noCommander`) |
| L3 | ✅ MATCH (FL:244-245, dim back) |
| L4 | ✅ MATCH (FL:246-247) |
| L5 | ✅ MATCH (FL:215-231; `copyLink`/`copied` keys) |
| L6 | ✅ MATCH (FL:233-234, toFriends only) |
| L7 | ✅ MATCH (FL:235-243, toHome) |
| L8 | ✅ MATCH (FL:149-152, column unchanged + toast) |

## Pass 2: state reachability

| State | Result |
|---|---|
| L1 signed out | ✅ REACHABLE — `/friend/(.*)` public (proxy.ts:45); PG:27 branches before any switch or read |
| L2 open | ✅ REACHABLE — `landingView` open branch (landing.ts:27); accept → `friendsReceiptPath(publicId)` (FL:142); decline → turn back → L7 |
| L2b no commander | ✅ REACHABLE — commander null → grey frame + initials (FC:89, 100-106) |
| L3 expired | ✅ REACHABLE — landing.ts:22; name stripped server-side (friends.ts:142 `shapeInvite` returns `{state}` only) |
| L4 ended | ✅ REACHABLE — redeemed/declined/revoked/null/bad token (landing.ts:21,23; PG:50); also from an accept/decline that answers ended (FL:148, 174) |
| L5 own link | ✅ REACHABLE — landing.ts:25 (self checked before alreadyFriends); also from a refusal answering `self` (FL:147, 173); Copy link → clipboard + `copied` label + sr-only status |
| L6 already friends | ✅ REACHABLE — landing.ts:26; spent once after mount by `SpendFriendLink` (PG:54) via `spendFriendLinkAction`, a guarded action, not a render (the table names `redeemInvite`; the spend writes no friendship, which matches G4's intent) |
| L7 declined | ✅ REACHABLE — FL:161-168 after `declineInviteAction` ok |
| L8 failure | ✅ REACHABLE — accept throws → toast + retry (FL:149-152); decline throws or `failed` → `declineFailed` + retry (FL:175-178); decline `false` is re-read server-side (actions.ts:149-151) and redrawn as ended/self, never done (E12) |
| Loading (E16) | ✅ REACHABLE — no segment `loading.tsx` by rule (route-loading.test.ts); the shell draws `LoadingScreen` |
| Read fails (E16) | ✅ REACHABLE — `readInvite` throw propagates to `src/app/error.tsx` |
| Switch off | ✅ REACHABLE — PG:48 `notFound()` for a signed-in reader whose switch is off |

## Gaps

Visual:
1. Column arrival animates only actions + fine print, not the heading (FL:75 vs FL:79-80). Design: heading and buttons land with the card.
2. Sign in is a `<button>` inside Clerk `SignInButton` (PG:39-41). Design: `<a>`. Minor; behaviour equivalent.
3. Signed-out ground is a `<div>` (PG:30); the labelled `<section>` is the column (FL:71). Design: the ground is the section. Minor.
4. Toast retry button: 44px at every width and 13.5px (ST:50). Design: 36px from md, 13px. Shared component; likely covered by the toast-reuse ruling.
   (Near: ToastFrame gap 14 at phone vs board 12, TF:133.)

State: none. All 12 rows reachable.

## Resolution (author, after Agent 2)

1. **Column arrival: FIXED.** The heading, the body, the buttons and the fine print all take `.friend-land-in` on a
   card that turns (`LandingColumn`'s `land`), pinned by `friend-landing.test.tsx` ("the column"). The kicker stays
   drawn at once: it says what the page is, and the boards draw it before the card lands.
2. **Sign in as a `<button>`: kept.** Clerk's `SignInButton mode="redirect"` wraps a button, as the shipped
   signed-out Home does (`clerk-hosted.test.ts`); it navigates on press like the board's link.
3. **Signed-out ground as a `<div>`: kept.** The labelled `<section>` is the column inside it, the same landmark the
   signed-in states use, so the one heading labels one region at every state.
4. **Toast Try again at 44px: kept.** The toast is the shared `SocialToast` (E15), whose 44px target is the phone
   floor at every width; a per-surface override would fork the one component the social screens share.

Agent 3 (confirm) is the author's re-check of item 1 alone: FIXED. 0 gaps remain.
