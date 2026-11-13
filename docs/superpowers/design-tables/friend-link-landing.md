# Design property table: friend link landing (reusable link)

Route `/friend/[token]` for a reusable friend link. Signed in L1 to L7, signed out S1, S2 (and Join, L7 signed out).
Phone 390, desktop 1300; breakpoint Tailwind `md`.

Sources (handoff only, `design/design_handoff_the99_friends_link/`): `README.md` (calls 7, 8; Q2; G2 to G6),
`STATES-friends-link-r1.md` (Landing, Signed-Out), `scratch-gen/render.tsx` (L and S frames),
`friends-link · copy strings.ts` (key names), `Landing.dc.html` / `Signed-Out.dc.html` (captions, grepped).
`scratch-gen/friend-links.diff` has **no landing hunks** (its only `landing.*` use is `socialCopy.landing.openTitle`
in the Waiting on you request row, out of scope here).

Key notation: `fl.landing.*` = `friendLinkCopy.landing.*` (new, from the copy-strings file);
`social.landing.*` = shipped `socialCopy.landing.*` (reused as shipped). Copy is listed by key only; every string
goes through /copy-review before shipping (README). "Literal" = rendered as a literal in render.tsx with no key named
in the handoff.

Components drawn: `FriendCard` (props `face`, `up`, `signature`), `LandingColumn` (props `kicker`, `title`, `body`,
`actions`, `fine`, `signedOut`), button classes `PRIMARY_BUTTON` / `SECONDARY_BUTTON` from `friend-landing-buttons`,
and a local quiet-link class (below).

## Layout and stage

| # | Property | Value | Source |
|---|---|---|---|
| 1 | Signed-in shell | Full app shell: NavRail (desktop), MobileHeader + TabBar (phone); content in `<main>`; active path `/friend` | render.tsx `app(..., {path:"/friend"})` |
| 2 | Signed-in header avatar | The viewer's own face (signature-card art, else initials), not the owner's | Landing.dc caption; render `av: colinAv` |
| 3 | Signed-in stage wrapper | `flex min-h-full flex-1 justify-center` | render.tsx `landing()` |
| 4 | Signed-in stage background, phone | `radial-gradient(420px 300px at 50% 28%, color-mix(in oklab, var(--accent) 7%, transparent), transparent 70%)` | render.tsx |
| 5 | Signed-in stage background, md+ | `radial-gradient(700px 420px at 50% 30%, color-mix(in oklab, var(--accent) 6%, transparent), transparent 70%)` | render.tsx |
| 6 | Signed-in stage padding | phone `px 16px`, `py 22px`; md+ `p-0` | render.tsx |
| 7 | Signed-in pair container, phone | `flex w-full flex-col items-center gap-16px` (card above column) | render.tsx |
| 8 | Signed-in pair container, md+ | `md:mt-[110px] md:w-auto md:flex-row md:items-center md:gap-[56px] md:self-start` (card left, column right) | render.tsx |
| 9 | Order in pair | FriendCard first, LandingColumn second (both breakpoints) | render.tsx |
| 10 | L6 stage | Identical wrapper, background, padding and pair container to rows 3 to 8 | render.tsx L6 block |
| 11 | Signed-out shell | No app shell (public page, `bare` frame) | render.tsx `bare`; Signed-Out.dc ("no shell") |
| 12 | Signed-out `<main>` | `flex min-h-screen flex-col items-center justify-center gap-16px bg var(--bg)` | render.tsx `signedOut` |
| 13 | Signed-out background, phone | `radial-gradient(600px 360px at 50% 22%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%)` | render.tsx |
| 14 | Signed-out background, md+ | `radial-gradient(1000px 520px at 50% 8%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%)` | render.tsx |
| 15 | Signed-out padding | phone `px 24px`, `py 28px`; md+ `px 0` (py 28px kept) | render.tsx |
| 16 | Signed-out direction | phone column, `md:flex-row md:gap-[56px]` | render.tsx |
| 17 | Signed-out `LandingColumn` | `signedOut` prop set | render.tsx |
| 18 | Card arrival motion | Card turns face up once on arrival (shipped landing behavior) | Landing.dc caption |
| 19 | Frame viewport heights | phone frames rendered at 1000px tall; signed-out desktop 860px (render sizing, not a layout rule) | render.tsx |

## Quiet action (Withdraw request)

| # | Property | Value | Source |
|---|---|---|---|
| 20 | Element | `<button type="button">` | render.tsx L1/L2 |
| 21 | Height | `min-h 44px`, md+ `min-h 32px` | render.tsx `quiet` |
| 22 | Box | `border 0`, `bg transparent`, `px 4px`, `cursor pointer` | render.tsx `quiet` |
| 23 | Type | `font-sans`, `13.5px`, weight 500, color `var(--fg-muted)` | render.tsx `quiet` |
| 24 | Underline | underline, decoration `var(--border-dashed)`, offset 3px | render.tsx `quiet` |

## Card per state (FriendCard)

| # | State | face | up | signature | Type line key | Rules key | Name |
|---|---|---|---|---|---|---|---|
| 25 | L1 Request sent | owner | true (face up) | yes | `fl.landing.typeSent` | `fl.landing.sentRules(name)` | owner (ThirdPartyName) + owner's commander art |
| 26 | L2 Opened again / declined earlier | owner | true | yes | `fl.landing.typeSent` | `fl.landing.sentRules(name)` | owner |
| 27 | L3 Withdrawn | owner | **false (face down)** | yes | `fl.landing.typeWithdrawn` | `fl.landing.sentRules(name)` (on the hidden face) | owner |
| 28 | L4 Owner had asked you | owner | true | yes | Literal "Friend · since {date}" (date = today); shipped friend type line, key not named | `social.landing.friendRules(name)` | owner |
| 29 | L5 Already friends | owner | true | yes | Literal "Friend · since {date}" (friendship date); key not named | `social.landing.friendRules(name)` | owner |
| 30 | L6 Your own link | self | true | yes | `social.landing.typeOwn` | `fl.landing.ownRules` | viewer's own name + own commander |
| 31 | L7 Reset or not found | `null` (names nobody) | false (face down) | no | none | none | none |
| 32 | S1 Signed out, owner has invites | owner | true (Q2: named) | yes | Literal "Friend request" (key not named; matches `fl.request.kind`) | `fl.landing.signedOutRules(name)` | owner |
| 33 | S2 Signed out, owner out of invites | owner | true | yes | Literal "Friend request" | Literal variant "Sign in and your request goes to {name}. ..." (no key in copy file; S1 key minus "Join, or") | owner |
| 34 | Signed out, reset or not found | as L7 (null, face down) | false | no | none | none | none |

## Column per state (LandingColumn)

Actions listed in render order (left to right on desktop, top to bottom when wrapping on phone).

| # | State | kicker | title key | body key | fine key | actions (order: kind) |
|---|---|---|---|---|---|---|
| 35 | L1 | Literal "Friend request" (shipped landing kicker) | `fl.landing.sentTitle(name)` | `fl.landing.sentBody(name)` | none | 1 `social.landing.toFriends` link, SECONDARY; 2 `fl.landing.withdraw` button, quiet (rows 20 to 24). **No primary.** |
| 36 | L2 | "Friend request" | `fl.landing.sentTitle(name)` | `fl.landing.sentBody(name)` | `fl.landing.sentAgain(date)` | same as L1 |
| 37 | L3 | "Friend request" | `fl.landing.withdrawnTitle` | `fl.landing.withdrawnBody(name)` | none | 1 `fl.landing.sendAgain` button, PRIMARY; 2 `social.landing.toHome` link, SECONDARY |
| 38 | L4 | "Friend request" | `fl.landing.bothTitle(name)` | `fl.landing.bothBody(name)` | none | 1 `social.landing.toFriends` link, SECONDARY (only action) |
| 39 | L5 | "Friend request" | `social.landing.alreadyTitle(name)` | `fl.landing.alreadyBody` | none | 1 `social.landing.toFriends` link, SECONDARY (only action) |
| 40 | L6 | "Friend request" | `social.landing.selfTitle` | `fl.landing.selfBody` | none | 1 `social.landing.copyLink` button, PRIMARY (only action) |
| 41 | L7 | "Friend request" | `social.landing.endedTitle` | `fl.landing.endedBody` | none | 1 `social.landing.toFriends` link, SECONDARY (only action) |
| 42 | S1 | Literal "The Ninety-Nine" (the landing's own mark, as shipped) | `fl.landing.signedOutTitle(name)` | `fl.landing.signedOutBody(name)` | `fl.landing.joinFine(name)` | 1 `fl.landing.join` link, PRIMARY; 2 `social.landing.signIn` button, SECONDARY |
| 43 | S2 | "The Ninety-Nine" | `fl.landing.signedOutTitle(name)` | `fl.landing.signedOutBodyNone(name)` | `fl.landing.noneFine(name)` | 1 `social.landing.signIn` button, **PRIMARY** (only action; Join absent) |
| 44 | Signed out, reset or not found | as L7 (ended title/body) | `social.landing.endedTitle` | `fl.landing.endedBody` | none | `social.landing.signIn` (STATES: "Ended card, no shell, Sign in"; class not drawn) |
| 45 | Join (from S1) | n/a | n/a | n/a | n/a | Runs the shipped `/join` newcomer flow unchanged, on the owner's invite (G6: one invite held from Join's Send code, spent when the account is made) |

## Name and element rules

| # | Property | Value | Source |
|---|---|---|---|
| 46 | Owner name in title/body/fine/rules | `named()` ThirdPartyName, interpolated as an array segment (drawn by PersonText), never a string | render.tsx `P.wren.name` |
| 47 | Go to Friends / Go to Home / Join The 99 | `<a>` | render.tsx |
| 48 | Withdraw / Send it again / Copy link / Sign in | `<button type="button">` | render.tsx |
| 49 | Title shapes | L1/L2/L4 title arrays with the name segment; L3 plain string; L5/L6/L7 shipped keys | render.tsx |
| 50 | Desktop coverage | L1, L3, L4, L7 drawn at 1300; L2, L5, L6 at desktop follow the phone's words in the desktop layout | Landing.dc caption |
| 51 | Signed-out desktop | S1, S2 drawn at 1300 | Signed-Out.dc |

## State coverage

| # | State | Trigger | Side effect | Drawn |
|---|---|---|---|---|
| 52 | L1 Request sent | Signed-in viewer opens another player's live link; no request between the pair yet | Opening sends the request (ruling 2). Only a signed-in page view sends; previews, prefetches, unfurl bots must not (G2) | phone + desk |
| 53 | L2 Opened again | Viewer opens the link with a waiting request already sent; also a request the owner declined (G3, silent) | Nothing new sent; fine shows sent date. One waiting request per pair (G2) | phone |
| 54 | L3 Withdrawn | Viewer selects Withdraw request on L1/L2 | Waiting request deleted; owner never told (G4). Send it again re-sends (back to L1) | phone + desk |
| 55 | L4 Owner had asked you | Owner had a waiting request to the viewer; viewer opens owner's link | Opening answers it: the pair become friends; type line "since today" | phone + desk |
| 56 | L5 Already friends | Viewer and owner already friends | Nothing sent; link not spent (reusable) | phone |
| 57 | L6 Own link | Owner opens their own link | Nothing sent; Copy link | phone |
| 58 | L7 Reset or not found | Token unknown, or retired by the owner's Reset (G5: old token reads as ended) | Nothing sent; names nobody | phone + desk |
| 59 | S1 Signed out, invites left | Signed-out viewer, live link, owner has at least one invite | None on view. Join → shipped `/join` on owner's invite (G6); Sign in → returns signed in → L1 path (sends) | phone + desk |
| 60 | S2 Signed out, out of invites | Signed-out viewer, live link, owner has 0 invites | Join hidden; Sign in alone (primary); fine explains | phone + desk |
| 61 | Signed out, reset or not found | Signed-out viewer, unknown or reset token | Ended card, no shell, Sign in | not drawn (L7 layout) |
| 62 | Newcomer lands (S3, after Join) | Account made through the link | Lands on /friends with receipt band `fl.request.newcomerBand(name)`; a request (Q1), invite spent | out of this route's scope (Friends page) |
| 63 | Withdraw / Send again pending | Press in flight | Not drawn in the handoff (no busy copy key for withdraw or send again) | gap |

Open points read from the handoff (not resolved here):
- Kicker "Friend request" (signed in) and "The Ninety-Nine" (signed out), the L4/L5 type line "Friend · since {date}",
  and the S2 rules string are literals in render.tsx with no key in the copy-strings file; the S2 card rules have no
  key at all.
- Signed-out Sign in from S1 is SECONDARY, from S2 PRIMARY.
