# The 99 — Friends on Home (Social R3 addendum) · design handoff, R1

`design_handoff_the99_social_r3/addendum-friends-home/` · 2026-10-16 · account 1 · **R2b, approved by Hugh, 2026-10-16.** Build from these files once every line has been through `/copy-review`.

A light addendum. Home gains a permanent Friends section, and the first-run checklist gains a Friends row. Both sit
behind `SOCIAL_FRIENDS_ENABLED`. Phone and desktop, in all six themes.

**Source of truth.** Social R1–R3 (`design_handoff_the99_social_r1/` to `_r3/`); Discovery R3
(`design_handoff_the99_discovery_onboarding/README-r3.md`, its ruling that Friends on Home is a permanent section, and
G25), with `STATES-tour-and-need.md`. Drawn over the shipped surfaces, read on main 2026-10-16:
`src/components/home/dashboard.tsx`, `first-run.tsx`, and `src/components/social/face.tsx`, `add-friend-dialog.tsx`,
`friend-card.tsx`, `open-links.tsx`, `friends-head.tsx`.

**Locked by Hugh.**

- Friends on Home is permanent, with no ✕. With no friends it invites you to add one. With friends it shows their
  faces, an Add a friend press and a link to /friends.
- Friends is on the first-run checklist (Discovery R3 G25).
- It was dropped from moments (Discovery R1 M16 is gone), so it is not a bubble.
- Keep it quiet: Home must not grow noisier, so no stacked inline cards.

## Files

| File | What |
|---|---|
| `Main.dc.html` | The three calls, the locks, the described states, the gaps. Start here. |
| `Home-Desktop.dc.html` | Home at 1280: H1 no friends, H2 one friend with the banner up, H3 seven friends (overflow), H4 a link open. |
| `Home-Phone.dc.html` | Home at 390, full page: P1–P4, the same four states. |
| `Checklist-Desktop.dc.html` | The first-run checklist at 1280: C1 not done, C2 not done with a link open, C3 done. |
| `Checklist-Phone.dc.html` | The same at 390: CP1–CP3. |
| `Themes-Home-Desktop.dc.html`, `Themes-Home-Phone.dc.html` | The Home section, every state, in all six themes, at each width (with Commitments above it, and the tab bar under it at 390). |
| `Themes-Checklist-Desktop.dc.html`, `Themes-Checklist-Phone.dc.html` | The checklist row, every state, in all six themes, under a locked step 3. |
| Parts: `Friends`, `ChecklistRow`, `HomeDesk`, `HomePhone`, `FirstRunDesk`, `FirstRunPhone`, `Rail`, `PhoneChrome` | What the boards mount. Each takes a `theme` tweak (all six), so any board can be flipped. |
| `STATES-friends-home.md` | Every state, where it is drawn, and its rule. |
| `READINESS.md` | Verdict, locks held, engineering needs. |
| `friends-home · copy strings.ts` | Every new string, placeholders for `/copy-review`. |
| `canvas.json`, `art/`, `support.js` | The canvas index, the art the boards upload (the fixture friends' faces and Home's commander crops), the runtime. |

The canvas is live as a Design artifact in account 1: `The 99 - Friends on Home R1`. Open a `.dc.html` with
`support.js` beside it; the boards draw their art from the canvas's uploaded assets.

## The answer in one line

At 1280 Friends sits under Commitments in the right column; at 390 it sits after Ready to build, before Pick up where
you left off.
It is a section, not a card: a mono label, a row of five seats that always spans the width, and one Add a friend. On the checklist it is
an unnumbered row under step 3, live from the first visit, done at one friend.

---

## Decisions log

### R2b (Hugh's picks, 2026-10-16) — approved

- **Phone placement: after Ready to build** (Hugh picked R2's option P5). At 390 Friends sits between Ready to build's
  `All commanders` line and Pick up where you left off. The heroes stay first; Commitments stays last. P1–P4 are
  redrawn there; R2's first-screen frames are retired.
- **Empty seats fill the row** (R2.2 kept), and **the diamond** in the next empty seat while a link is open stays (G2).
- **The tour stays as approved** (G1, Design's call, Hugh delegated it). Step 6 keeps its one light, on the banner.
  The checklist row is on the page the tour runs over, a second light would break the tour's one-control-per-step
  shape, and with the invite-only launch most newcomers reach that step with the row already done.

### R2 (Hugh's notes on R1, 2026-10-16)

- **R2.1 · Phone: Friends moves up.** *Superseded by R2b: after Ready to build.* R1 put it last, after Commitments, about 1,700px down the page. It now sits
  first under the header buttons (and the banner, when it shows), above Ready to build, so it is on the first screen.
  Commitments stays last. Desktop is unchanged: the right column is already on the first screen. The two widths now
  order the blocks differently, which `dashboard.tsx` does today only by one DOM order; engineering draws Friends in
  two places or reorders with CSS `order` at the 1180 split (G8). **P5** draws the alternative for Hugh: after Ready
  to build, before Pick up where you left off.
- **R2.2 · The faces row fills the width (H2, H3, P2, P3).** R1's four slots left the right of the column empty. The
  row is now five slots set flush to both edges (`space-between`; 52 wide at 1280, 56 at 390). Five friends or fewer:
  every face, then empty seats to the end of the row, the same dashed seats as the no-friends table. Six or more: four
  faces, then `+N`. So the row reads as one full table in every state. This supersedes decision 2's cap of four.

### 1. Where the section sits (Open 1) — R1; the phone half is superseded by R2.1

- **1280: the right column, under Commitments.** The column `dashboard.tsx` gives Commitments (316, from 1180) takes
  Friends under it, with the column's own 11px gap and the same mono label. The left column stays the deck work, Ready
  to build then **Pick up where you left off**; Friends joins neither. *Why:* the right column is Home's side matter
  (what your cards are committed to); who you play with belongs beside it, not between your decks.
- **390: last, after Commitments.** `dashboard.tsx` keeps one block order at every width (its comment: "nothing drops
  at either width"), so the phone reads the desktop's order top to bottom, and 640–1179 is the phone's layout too.
- **The arrivals banner** spans both columns above the body, as shipped, and keeps its place. Friends never moves above
  it, and the two show on the same visit (H2, P2). M16's "the banner wins Home" rule is gone with the moment.
- **A section, not a card.** No surface, border, ✕ or shadow: a label, a row, a line, a press. The column's one card
  stays Commitments. This is how Home stays quiet: the only thing a reader sees added is one label and a row of faces.
- **Commitments absent** (its read failed and the card leaves): the column still renders for Friends alone, at the top
  of the column. Today the column exists only when Commitments does.
- **Zero decks and no cards:** the section shows on the dashboard in every one of its shapes (zero decks with
  `HomeDecksZero`, decks and no cards). The checklist is first run's only page, and it carries the row (3).

### 2. How many faces before it overflows (Open 2) — R1; superseded by R2.2

- **Four slots, at both widths.** Four friends or fewer: every face. Five or more: three faces, then `+N` for the rest
  (seven friends: three faces and `+4`). The row never grows, wraps or scrolls, and it is the same at 390 and 1280.
  *Why four:* a Commander table seats four, and four 52px slots fit the 316 column with room to spare. Filling the
  phone's width instead would give the two widths different caps for no gain.
- **The face** is the shipped `Face` at 40 (radius 10, `--border-strong`, `--surface-raised`): the friend's signature
  commander, or their initials while they have none. Their name sits under it at 11.5 (`--fg-body`), cut with an
  ellipsis at the slot's width. **Each face opens that friend's page** (`/friends/[publicId]`, Social R2 P1), named
  `Colin’s page` (`friends.openAria`). 52 × 57 at 1280; 56 × 64 at 390.
- **`+N` is a count, not a press.** Mono `+4` in a 40 square with `more` under it, `aria-hidden`: the heading already
  carries the total (`FRIENDS · 7`) and `All friends ›` is the one way to the rest. A second door to /friends would be
  two controls for one action.
- **Order** is /friends' own (`listFriends`: by name). Home adds no sort and no read beyond the list it shares.

### 3. The checklist row: where it sits and when it's done (Open 3)

- **Last, under step 3, and never numbered.** The kicker stays `Step 1 of 3`. A friend isn't on the path to a first
  recommendation, and the row is live while steps 2 and 3 are locked, so numbering it would claim an order it doesn't
  have. A wider gap (20 at 1280, 18 at 390, against the stack's 12 / 11) sets it apart from the steps.
- **Its box is the shipped `LockedStep`'s box** (radius 14, 56 floor, 15 / 18 padding at sm, 14 / 15 on the phone) so
  it shares the stack's rhythm, but live: `--surface-inset` on `--border-strong` with the title in `--fg`.
- **Not done (C1, CP1).** A dashed `+` in the numeral's 22px slot, `Add your friends`, and
  `Any time, cards or not. A friend joins from a link you send.` The whole row is one press: it opens Add a friend (the
  shipped dialog at 1280, the sheet at 390), through `Making a link…` as the /friends head does.
- **A link open (C2, CP2).** The slot's dashed square carries the accent diamond, the line reads
  `Friend link open · 6 days left` (the shipped `invites.left`), and the row's press is **Show** on that link. A further
  link is made from /friends.
- **Done is one friend (C3, CP3).** A ✓ in `--success` (the slot tinted at 14%), the title `Friends` in `--fg-body`,
  `You and Colin are friends.` (the shipped `page.accepted`), the friend's 26 disc, and the row opens /friends. **It
  stays**: the checklist is gone the moment the collection is read, and until then the row is the page's proof that
  someone is already here. With the invite-only launch forming the friendship at sign-up, a newcomer usually lands
  with this row already done.
- **Spent links don't count.** A link expiring or revoked returns the row to C1.

### 4. The no-friends invite (locked: "it invites you to add one")

- Your seat (your signature commander's face, or your initials, with `You` under it) and four dashed seats at 40 (R2.2: five slots),
  Social R1's table, the empty chairs as "not yet". They are `aria-hidden`: a picture of the table, not controls.
- One line: `Add the people you play with. Seat them when you log a game, and see their spares when you shop.` (Discovery
  R1's M16 line, kept as the placeholder.) Then Add a friend.
- No link to /friends until there is a friend to see. The account menu's Friends row is still there for the head.

### 5. A pending invite (H4, P4)

- A friend link you made and nobody has used: under the line, mono `Friend link open · 6 days left · Show`, where Show
  opens the shipped dialog on that link. Under a day it reads `Under a day left` in `--warning`, as `open-links.tsx`
  does.
- The next empty seat's dashed square turns to the accent at 70% and holds the brand diamond: someone's seat is spoken
  for. The only change to a seat; G2 asks whether to keep it.
- **Two or more links open:** `3 friend links open · See them ›`, to /friends (described, not drawn).
- **With friends and a link open:** the same line under the faces (described).
- **Accepted while the dialog is open on Home:** Home watches the link as /friends does (`useInviteWatch`), the face
  lands in the row, and the shipped toast says `You and Colin are friends.` (described).

### 6. The presses

- **Add a friend** is a ghost press (32 at 1280, left-aligned; 44 and the full width at 390): Home's one fill is New
  deck (ruling 14), and accent means in use or to buy. It makes a link and opens the dialog over Home, exactly as the
  /friends head does (`Making a link…`, the ten-link hold and its toast).
- **All friends ›** sits on the label's line, right-aligned, `--fg-muted` (a 44px hit at 390). Drawn only with friends.

---

## Gaps

| # | Gap | For |
|---|---|---|
| G1 | Closed (R2b, Design's call): the tour stays as approved; step 6 keeps one light, on the banner. | Closed |
| G2 | Closed (Hugh, R2b): the diamond in the next empty seat stays. | Closed |
| G3 | Home reads `listFriends` and the viewer's open links. Both join Home's `cachePageForUser` key: `friendGeneration(viewer)` for friends (AGENTS.md, `check:list-cache`), the viewer's stamp for their own links. `/decks` is untouched. | Engineering |
| G4 | The invite-only round (brief 2026-10-16) may give Add a friend two paths. Home's press opens whatever that dialog becomes; nothing here changes. | Engineering |
| G5 | The no-friends line names seating and spares. With `SOCIAL_GAMES_ENABLED` or spares off for the reader, that clause goes (`Add the people you play with.`). | Copy |
| G6 | Every new string is a placeholder for `/copy-review`. About entries are paused for this line (Discovery R3); Friends already has its social-line entry. | Copy |
| G7 | The commitments column today renders only with Commitments. It now renders when either block does. | Engineering |
| G8 | Friends sits after Ready to build at 390 and in the right column at 1280: one block in two orders. Draw it in two places, or reorder with CSS `order` below 1180. | Engineering |
| G9 | Closed (Hugh, R2b): at 390, after Ready to build. | Closed |

## Not done this round

- No About artboard: entries are paused for the Discovery line, and Hugh decides whether this owes one.
- Nothing in the left column, the header, the banner or the rail changes.
