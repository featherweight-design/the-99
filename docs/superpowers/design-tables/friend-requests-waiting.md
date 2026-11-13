# Design property table · Friend requests in Waiting on you (Friend links R1)

Source: `design/design_handoff_the99_friends_link/` — `README.md` calls 1, 2, 3, 8, 10; `STATES-friends-link-r1.md`
(/friends F0–F5, S3); `scratch-gen/friend-links.diff` (the `waiting-on-you.tsx` hunk and the `social.ts` copy hunk:
the proposal's own code, **authoritative** for values); `scratch-gen/render.tsx` (Friends frames F0, F1, F3, F4, F5, S3
and their fixtures); `friends-link · copy strings.ts` (string keys); frames `art/F{0,1,3,4,5}-{phone,desk}.png`,
`art/S3-{phone,desk}.png` (drawn at 2x: phone 390 → 780px PNG, desktop 1300 → 2600px PNG), and the
`Friends-Phone` / `Friends-Desktop` board captions.

Breakpoint: Tailwind `md` (768px). Mobile = 390, Desktop = 1300. A blank Desktop cell = same as Mobile. `—` = absent.

**Inherited (shipped) names.** The diff reuses `waiting-on-you.tsx`'s own constants and helpers, which the handoff does not
restate: `ASK_ROW`, `KIND`, `TITLE`, `DETAIL`, `ACTIONS`, `Unseen`, `ago()`, `KICKER_AGE`, `ShowAllFooter`/`FEED_SHOWN`,
the section head, the bar badge, the empty card and the accepted receipt band. Where a row says "shipped `X`", the build
uses that constant unchanged; the value is not respecified here and must not be re-derived. Values observed in the PNGs
for those are marked "(frame)" and are only a check, never a spec.

Copy is structure only: the String column names the key in `friends-link · copy strings.ts` (`friendLinkCopy.*`) or the
shipped `socialCopy.*` key the diff calls. Wording belongs to /copy-review (README: required before implementing).

---

## 1 · Friend request row, unanswered (F1–F3) — `<li>` in Waiting on you

### 1a · Row `<li>`

| Category | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Element | tag / attrs | `<li data-testid="waiting-row" data-kind="friend-request" data-unseen="">` (`data-unseen` only when `row.unseen`) | |
| Layout | class | shipped `ASK_ROW` (the spare request row's grid), nothing added | |
| Layout | grid shape | face column + text column; presses (`ACTIONS`) wrap under the text in the text column (frame) | face · text · presses: three columns, one line, presses at the row's end (board caption "presses are the row's third column") |
| Background | background | shipped `ASK_ROW` (none added) | |
| Border | row dividers / list card | shipped (frame: rows share one rounded bordered card, hairline between rows) | |
| Conditional | renders when | `row.kind === "friend-request"` and `!row.answered` | |
| Order | position in list | before every spare request and trade match; requests newest first (`createdAt` desc) | |
| Dismiss | ✕ | — (no `DismissButton`: Decline is the only way to clear one; README call 1) | |
| Days left | — | — (no expiry line, unlike a spare request) | |

### 1b · Face

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Element | wrapper | `<span aria-hidden>` | |
| Layout | grid placement | `row-span-2 self-start` | `md:row-span-1 md:self-center` |
| Component | | `<Face name={displayName} commander={from.commander} size={40}>` | |
| Dimensions | width × height | `46px × 46px` (`!h-[46px] !w-[46px]`, overrides size 40) | |
| Border | border-radius | `11px` (`!rounded-[11px]`) | |
| Content | art present | signature card art crop (`commander.artCropUri`) | |
| Content | no signature card | display name's initials in the shipped Face box (F3 Chris: `CH`) | |

### 1c · Text column `<div>`

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | class | `flex min-w-0 flex-col` | |
| Spacing | gap | `3px` | |

### 1d · Kicker line `<p>`

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | class | `m-0 flex min-w-0 items-center` | |
| Spacing | gap | `7px` | |
| Child 1 | unseen diamond | shipped `<Unseen />`, only when `row.unseen` (frame: accent diamond) | |
| Child 2 | kind `<span>` | shipped `KIND` + `text-[color:var(--accent-text)]` | |
| Child 2 | string | `friendLinkCopy.request.kind` (drawn uppercase by `KIND`) | |
| Child 3 | age `<small>` | shipped `KICKER_AGE` + `text-[color:var(--fg-faint)]` | |
| Child 3 | string | `ago(row.createdAt, now)` (fixtures: just now / 3h ago / yesterday) | |
| Conditional | seen request | diamond absent; row still counts in head and badge (F3 Max) | |

### 1e · Title `<p>`

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Typography / colour | class | shipped `TITLE` | |
| String | | shipped `socialCopy.landing.openTitle(name)` via `<PersonText>` | |
| Privacy | name | `ThirdPartyName` through `PersonText` (ph-no-capture) | |

### 1f · Detail `<p>`

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Typography / colour | class | shipped `DETAIL` | |
| String part 1 | `via === "link"` | `friendLinkCopy.request.viaLink` | |
| String part 1 | `via === "code"` | `friendLinkCopy.request.viaCode` | |
| String part 2 | always | `" "` + `friendLinkCopy.request.nothingShared` (one paragraph, same line) | |
| Wrap | | wraps to 2 lines at 390 (frame) | 1 line (frame) |

### 1g · Presses container

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Wrapper | class | shipped `ACTIONS` | |
| Inner `<span>` | class | `flex min-w-0 flex-wrap items-center` | `md:justify-end` |
| Inner `<span>` | gap | `8px` | |
| Order | | Accept, then Decline | |

### 1h · Accept / Decline `<button type="button">`

Shared `press` class (both buttons):

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | display | `inline-flex flex-none items-center justify-center` | |
| Behaviour | cursor / wrap | `cursor-pointer whitespace-nowrap` | |
| Typography | family | `font-sans` | |
| Typography | size / weight | `13px` / `500` (`font-medium`) | |
| Dimensions | height | `36px` | |
| Spacing | padding-x | `16px` | |
| Border | radius | `8px` | |

| Button | Property | Mobile | Desktop |
|---|---|---|---|
| Accept | border | `1px solid var(--fg)` | |
| Accept | background | `var(--fg)` | |
| Accept | colour | `var(--bg)` | |
| Accept | string | `friendLinkCopy.request.accept` | |
| Decline | border | `1px solid var(--border-strong)` | |
| Decline | background | `transparent` | |
| Decline | colour | `var(--fg)` | |
| Decline | string | `friendLinkCopy.request.decline` | |

---

## 2 · Answered receipt (F4) — `<li>` in the request row's place, for the visit

### 2a · Row

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Element | tag / attrs | `<li data-kind="friend-request" data-receipt="">` (no `data-testid="waiting-row"`, no `data-unseen`) | |
| Layout | class | shipped `ASK_ROW` | |
| Background | background | `color-mix(in oklab, var(--success) 6%, var(--surface-inset))` — **on both Accept and Decline receipts** (the diff applies it unconditionally; README call 3 names the wash only for Friends) | |
| Conditional | renders when | `row.answered` is `"accept"` or `"decline"` | |
| Presses | | — (no ACTIONS column) | |
| Face | | identical to 1b | |
| Text column | | identical to 1c | |
| Lifetime | | this visit only; then the row leaves (README call 3) | |

### 2b · Kicker line

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | class | `m-0 flex min-w-0 items-center`, gap `7px` | |
| Diamond | | — | |
| Kind `<span>` | class | shipped `KIND` | |
| Kind colour | accept | `var(--success)` | |
| Kind colour | decline | `var(--fg-faint)` | |
| Kind string | accept | `friendLinkCopy.request.acceptedKind` | |
| Kind string | decline | `friendLinkCopy.request.declinedKind` | |
| Age `<small>` | class | shipped `KICKER_AGE` + `text-[color:var(--fg-faint)]` | |
| Age string | | shipped `refreshCopy.home.elapsed.justNow` (fixed, not `ago()`) | |

### 2c · Title and detail

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Title `<p>` | class | shipped `TITLE` | |
| Title | accept string | shipped `socialCopy.page.accepted(name)` | |
| Title | decline string | `friendLinkCopy.request.declinedTitle(name)` | |
| Detail `<p>` | class | shipped `DETAIL` | |
| Detail | accept string | `friendLinkCopy.request.acceptedDetail(name)` | |
| Detail | decline string | `friendLinkCopy.request.declinedDetail(name)` | |
| Both | names | via `<PersonText>` | |

### 2d · Side effects drawn in F4

| Effect | Mobile | Desktop |
|---|---|---|
| Accepted friend joins the Friends list at once (F4 fixture: Colin `since today`, list `Friends · 3`) | yes | |
| Bar badge drops by each answered request (F4: 3 → 1) | tab bar | rail |

---

## 3 · Section head and list

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Section | position | first section under the page head / Add a friend (README call 1) | |
| Section | renders when | `rows.length > 0` (`waiting` prop undefined otherwise: F0, F5, S3) | |
| Head | class / style | shipped Waiting on you head, unchanged (frame: mono, uppercase, accent, rule under) | |
| Head | string | shipped `socialCopy.waiting.head(n)` | |
| Head | `n` | shipped count of rows shown in the section, receipts included (F4 frame reads `· 3` with two receipts and one waiting) | |
| Show all | | shipped `ShowAllFooter` past `FEED_SHOWN` (five), unchanged | |
| Row order | | friend requests (newest first) → spare requests → trade matches | |
| Receipts in list | | keep the answered row's position | |

---

## 4 · Bar badge (Friends)

| Property | Mobile | Desktop |
|---|---|---|
| Host | `TabBar` Friends slot | `NavRail` Friends slot |
| Style | shipped badge, unchanged (frame: accent filled circle, dark numeral, top-right of icon) | |
| Source | shipped `badges.friendsWaiting`; waiting (unanswered) friend requests added to `waitingAsksCount` (G8) | |
| Counts | every unanswered request, seen or unseen; receipts do not count | |
| Renders when | count > 0 (F0, F5, S3: none) | |
| Fixture values | F1 1 · F3 3 · F4 1 | |

---

## 5 · Empty card body (F5)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Card | everything except the body string | shipped empty card, unchanged (frame: dashed border, rounded, Cinzel small-caps title) | |
| Title | string | shipped `socialCopy.friends.emptyTitle` (unchanged) | |
| Body | string | `socialCopy.friends.emptyBody` changed to `friendLinkCopy.friends.emptyBody` (copy hunk) | |
| Body | wrap | 3 lines (frame) | 2 lines (frame) |
| Section | Waiting on you | — | |
| Badge | | — | |

---

## 6 · Newcomer band (S3)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Band | component | shipped accepted receipt band (`FriendsView accepted` prop), unchanged; only its text changes | |
| Band | position | top of main, above the page head, full width under the mobile header (frame) | top of main, right of the rail (frame) |
| Band | glyph | shipped success tick (frame) | |
| Band | close | shipped ✕ at the end (frame) | |
| Band | string | `friendLinkCopy.request.newcomerBand(ownerName)` replaces the shipped `page.accepted` text (render.tsx swaps the text only) | |
| Page under it | | newcomer's own Friends: `Friends · 0`, F5 empty card, no Waiting on you, no badge | |

---

## 7 · State coverage

| State | Frame | Trigger | Waiting on you | Head | Badge | Rows / other |
|---|---|---|---|---|---|---|
| F0 · no requests | F0 | `rows.length === 0`, friends > 0 | absent | — | none | Add a friend with no line under it (count line retired) |
| F1 · one request | F1 | 1 unanswered request, `unseen` | present | `· 1` | 1 | §1, diamond on, via link |
| F3 · several | F3 | 3 unanswered (1 seen) | present | `· 3` | 3 | newest first; seen row no diamond; via link and via code; Face initials fallback |
| Past five | — (shipped) | > `FEED_SHOWN` rows | present | `· N` | N | shipped Show all |
| F4 · accepted | F4 | `answered === "accept"` | present | counts receipt | −1 | §2 success kind; friend joins list now |
| F4 · declined | F4 | `answered === "decline"` | present | counts receipt | −1 | §2 faint kind; requester not told |
| F5 · no friends | F5 | friends = 0, rows = 0 | absent | — | none | §5 new body |
| S3 · newcomer lands | S3 | account made through a friend link (Q1: a request, not friends) | absent | — | none | §6 band + F5 card |
| Request plus spare asks | — | friend requests and spare requests both waiting | present | all rows | all unanswered | friend requests first (newest first), then spare requests, then trade matches |
| Seen, unanswered | F3 (Max) | `unseen === false` | present | counts | counts | diamond off only |

## 8 · Notes for the build

- The receipt wash applies to the Declined receipt too in the authoritative diff; README call 3 only names it for Friends.
  The diff wins (and the F4 frame shows it); flag if the build differs.
- Accept/Decline are hardcoded classes in the diff (`press`), not an import of `AnswerPresses`; README call 1 calls them
  "the spare row's `row` presses". Match the diff's values (36px, 16px x-padding, 13px medium, radius 8).
- The empty-card change is the string only (`social.ts` hunk); no class changes on /friends besides §1–§2.
