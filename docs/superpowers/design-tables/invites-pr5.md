# Design Property Table — Invites PR 5 (the newcomer's side)

Source: `design/design_handoff_the99_invites/` (R1, approved by Hugh 2026-10-16): `R1 - Newcomer.dc.html` (N1 to N12),
`R1 - Invite-Only.dc.html` (I1, I2; W1 to W3 are Option W, ruled out), `R1 - Friend-Link.dc.html` (L1), plus `README.md`,
`STATES-invites-r1.md` and `invites · copy strings.ts` (copy keys are named as structure only; wording is `/copy-review`'s).
Sender-side and admin boards are out of scope (see `invites-pr4.md`).

Boards are drawn in the kamigawa theme; hex values map to the same token block as `invites-pr4.md`:
`#0E0F14` `--bg` · `#12141B` `--surface-rail` · `#101219` `--surface-sunken` · `#20222A` `--elevated` · `#181C26` `--border` ·
`#262A35` `--border-strong` · `#343843` `--border-dashed` · `#E6E8F0` `--fg` · `#B1B6C7` `--fg-body` · `#959AAD` `--fg-muted` ·
`#6F7486` `--fg-faint` · `#606476` `--fg-locked` · `#3D404E` `--fg-disabled` · `#FF4D9A` `--accent` · `#D33E7E` `--accent-strong` ·
`#6FA368` `--success` · `#C6533F` `--danger` · `#E0913C` `--warning`. No token: `#E07A66` (error line text; nearest `--danger`),
`#14151B` (card-back outer face). Fonts: IBM Plex Sans `--font-sans`, IBM Plex Mono `--font-mono`, Chakra Petch `--font-display`.

Viewport note: the newcomer page (`/join/[token]`) is drawn at PHONE (390x844) only. README: "Phone and desktop carry every state; where a
desktop board omits a frame, the phone frame's rule holds unchanged." So in the /join tables the Desktop column equals Mobile (no
desktop-specific values exist; nothing is inferred). I1/L1 have true desktop (1300x820) and phone (390x844) frames.

Shared ground (`.ph` phone frame, signed out, no shell): background `radial-gradient(600px 360px at 50% 18%, rgba(255,77,154,.12), transparent 70%)` over `--bg`
(Invite-Only 18%; Friend-Link phone 22%; Newcomer 18%); desktop frame `radial-gradient(1000px 520px at 50% 8%, rgba(255,77,154,.10), transparent 70%)` over `--bg`.
Frame chrome (border 1px `--border-strong`, radius 28px phone / 12px desktop, overflow hidden) is the artboard's, not the page's.

---

## Component: Newcomer page `/join/[token]` (N1 to N12)

### Page column (`.land`)
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | same |
| align-items | center | same |
| padding | 44px 24px 24px (top right bottom left: 44/24/24/24) | same |
| box-sizing | border-box | same |
| text-align | center | same |
| flex | 1 | same |
| shell | none (no header, no tab bar) | same |

### Sender's card, face up (`.cw`, shown N1 to N6; `up` frames)
| Property | Mobile | Desktop |
|---|---|---|
| width x height | 150px x 210px | same |
| border-radius | 9px | same |
| padding | 4px | same |
| background | commander art as `center / cover no-repeat url(...)` over `--border-strong` (#262A35) | same |
| box-shadow | `0 20px 44px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.6)` | same |
| transform | `rotate(-3deg)` | same |
| flex | none | same |
| role / aria-label | `role="img"`, label = sender name, commander, "Invitation" (sender-derived) | same |
| wrapper | `position: relative` div (anchors the check badge) | same |

#### Inner face (`.mtg`)
| Property | Mobile | Desktop |
|---|---|---|
| width / height | 100% / 100% | same |
| border-radius | 7px | same |
| background | `#14151B` | same |
| padding | 5px | same |
| display / direction / gap | flex / column / 3px | same |
| overflow | hidden | same |

#### Name bar (`.nb`) — renders the sender's display name
| Property | Mobile | Desktop |
|---|---|---|
| height | 17px | same |
| border-radius | 4px | same |
| background | `--elevated` | same |
| display / align / justify | flex / center / space-between | same |
| padding | 0 6px | same |
| font | 600 9px `var(--font-sans)` | same |
| color | `--fg` | same |

#### Art (`.art`)
| Property | Mobile | Desktop |
|---|---|---|
| height | 88px | same |
| border-radius | 3px | same |
| overflow | hidden | same |
| img | display block, 100% x 100%, object-fit cover, alt "" | same |
| source | the sender's commander art | same |

#### Type line (`.tyl`) — renders `join.cardType`
| Property | Mobile | Desktop |
|---|---|---|
| height | 14px | same |
| border-radius | 3px | same |
| background | `--elevated` | same |
| display / align / justify | flex / center / space-between | same |
| padding | 0 6px | same |
| font | 600 7.5px `var(--font-display)` | same |
| color | `--fg` | same |
| trailing glyph | `◆` in `--accent`, right end | same |

#### Rules text box (`.tx`) — renders `join.cardRules(name)`
| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | same |
| border-radius | 3px | same |
| background | `--surface-sunken` | same |
| padding | 5px 6px | same |
| font-size / line-height | 7px / 1.4 | same |
| color | `--fg-body` | same |
| text-align | left | same |

#### Footer (`.ft`)
| Property | Mobile | Desktop |
|---|---|---|
| font | 6px `var(--font-mono)` | same |
| letter-spacing | .15em | same |
| color | `--fg-faint` | same |
| display / justify | flex / space-between | same |
| padding | 0 2px | same |
| left / right text | "ART · THE MASTER" (art credit) / "THE 99" (literal in board; art credit is the sender's commander) | same |

#### Check badge (`.ok`, N6 only)
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute; right -8px; bottom -8px (of the card wrapper) | same |
| width x height | 30px x 30px | same |
| border-radius | 50% | same |
| background / color | `--success` / `--bg` | same |
| glyph | `✓`, 700 15px `var(--font-sans)` | same |
| display / align / justify | flex / center / center | same |
| box-shadow | `0 4px 10px rgba(0,0,0,.5)` | same |
| a11y | aria-hidden | same |

### Card back (`.back`, face down; N9, N10, N11, N12)
| Property | Mobile | Desktop |
|---|---|---|
| width x height | 150px x 210px | same |
| border-radius | 9px | same |
| padding | 6px | same |
| box-sizing | border-box | same |
| background | `#14151B` | same |
| box-shadow | `0 20px 44px rgba(0,0,0,.6), inset 0 0 0 1px #262A35` (`--border-strong`) | same |
| a11y | aria-hidden | same |
| N11 variant `.dim` | `opacity: .42; filter: grayscale(1)` | same |
| transform | — (not tilted, unlike the face-up card) | same |

#### Back inner (`.in`)
| Property | Mobile | Desktop |
|---|---|---|
| width / height | 100% / 100% | same |
| border-radius | 6px | same |
| border | 1px solid `--border-dashed` (#343843) | same |
| background | `radial-gradient(120px 130px at 50% 46%, rgba(255,77,154,.22), transparent 72%), repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 6px, transparent 6px 12px), --surface-sunken` | same |
| display / direction / align / justify | flex / column / center / center | same |
| gap | 6px | same |

#### Back hero ("99" with diamonds) and word
| Property | Mobile | Desktop |
|---|---|---|
| hero font | 700 34px `var(--font-display)`, line-height 1 | same |
| hero color | `--fg` | same |
| hero layout | flex column, align center | same |
| diamonds `i` | `◆ ◆ ◆`, normal style, `--accent`, 8px, letter-spacing 3px, margin-bottom 4px | same |
| word (`.wd`) | renders `join.cardType` uppercase ("INVITATION"); 7.5px `var(--font-mono)`, letter-spacing .35em, `--accent` | same |

### Heading (`h1.h`)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 28px 0 0 | same |
| font | 700 22px/1.25 `var(--font-display)` | same |
| color | `--fg` | same |
| copy key | N1/N2 `join.title(name)`; N3/N4/N5 `join.codeTitle`; N6 `join.okTitle`; N9 `join.haveAccountTitle`; N10 `path.sent`; N11 `join.expiredTitle`; N12 `join.endedTitle` | same |

### Body (`p.b`)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 8px 0 0 | same |
| font-size / line-height | 14px / 1.55 | same |
| color | `--fg-body` | same |
| `b` (emphasis, the email) | color `--fg`, weight 500 | same |
| copy key | N1/N2 `join.body`; N3/N4/N5 `join.codeBody(email)` (email in `b`); N6 `join.okBody(name)`; N9 `join.haveAccountBody(email, name)` (email in `b`); N10 "Check {email}." (email in `b`, reuses `path.sent` as heading); N11 `join.expiredBody`; N12 `join.endedBody` | same |

### Form wrapper (`.form`)
| Property | Mobile | Desktop |
|---|---|---|
| width | 100% | same |
| margin-top | 22px | same |
| text-align | left | same |
| display / direction | flex / column | same |

### Email label (`.lab`) — renders `join.emailLabel`
| Property | Mobile | Desktop |
|---|---|---|
| font-size / weight | 13px / 600 | same |
| color | `--fg` | same |
| margin-bottom | 6px | same |
| association | `<label for>` the field | same |

### Email field (`.fld`)
| Property | Mobile | Desktop |
|---|---|---|
| height | 48px | same |
| border-radius | 8px | same |
| padding | 0 12px | same |
| display / align | flex / center | same |
| background | `--surface-sunken` | same |
| border | 1px solid `--border-strong` | same |
| font-size | 16px | same |
| color (placeholder/empty) | `--fg-faint` | same |
| color (typed, `.on`) | `--fg`; border-color `--accent` | same |
| N2 locked (`.lock`) | color `--fg-muted`; field not editable while sending | same |
| placeholder in board | `name@example.com` | same |

### Send code press (`.b1`, N1/N2)
| Property | Mobile | Desktop |
|---|---|---|
| width / height | 100% / 48px | same |
| margin-top | 14px | same |
| border-radius | 8px | same |
| border | 0 | same |
| background | `--accent` | same |
| color | `--bg` | same |
| font | 600 15px `var(--font-sans)` | same |
| display / align / justify | flex / center / center | same |
| copy key | N1 `join.sendCode`; N2 `join.sendingCode` | same |
| N2 variant `.wait` | background `--accent-strong` (#D33E7E); field locked | same |

### Fine print under the form (`.fine`) — renders `join.fine(name)` (N1, N2)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 14px 0 0 | same |
| font | 11px/1.55 `var(--font-mono)` | same |
| color | `--fg-faint` | same |
| text-align | center | same |

### Code boxes (`.code`, `.cb`; N3, N4, N5)
| Property | Mobile | Desktop |
|---|---|---|
| group | `role="group"`, aria-label `join.codeAria` | same |
| group layout | flex; gap 8px; justify center | same |
| box count | 6 | same |
| box width x height | 44px x 54px | same |
| box border-radius | 8px | same |
| box background | `--surface-sunken` | same |
| box border | 1px solid `--border-strong`; box-sizing border-box | same |
| box display / align / justify | flex / center / center | same |
| box font | 600 22px `var(--font-mono)` | same |
| box color | `--fg` | same |
| `.on` (filled/active, N3) | border-color `--accent` | same |
| `.bad` (N4) | border-color `--danger` | same |
| `.mt` (empty slot) | digit placeholder `·`, color `--fg-disabled` | same |
| N5 all empty | six `.cb mt`-style slots, neutral border | same |
| input behavior | one-time-code autofill on, numeric keypad (note on N3) | same |

### Code error line (`.err`) — N4 `join.codeWrong`, N5 `join.codeExpired`
| Property | Mobile | Desktop |
|---|---|---|
| role | `alert` | same |
| margin | 10px 0 0 | same |
| font-size / line-height | 12.5px / 1.45 | same |
| color | `#E07A66` (no token; nearest `--danger`) | same |
| text-align | center | same |

### Confirm press (`.b1` / `.b2`; N3 to N5) — renders `join.confirm`
| Property | Mobile | Desktop |
|---|---|---|
| N3, N4 | `.b1` filled (same values as Send code press: 100% x 48px, margin-top 14px, radius 8px, `--accent`, `--bg` text, 600 15px) | same |
| N5 (boxes empty) | `.b2` outlined: width 100%, height 48px, margin-top 8px, radius 8px, border 1px solid `--border-strong`, background transparent, color `--fg`, font 500 15px | same |

### Resend / different email links (`.links`, `.tl`)
| Property | Mobile | Desktop |
|---|---|---|
| row layout | flex; justify center; gap 4px; margin-top 6px; flex-wrap wrap | same |
| link min-height | 44px | same |
| link padding | 0 8px | same |
| link border / background | 0 / transparent | same |
| link font | 500 13.5px `var(--font-sans)` | same |
| link color | `--accent` | same |
| resend, cooling down (`.off`, N3) | color `--fg-locked`; copy `join.resendIn(mmss)` ("0:38" in board) | same |
| resend, ready (N4, N5) | `--accent`; copy `join.resend` | same |
| second link | `join.otherEmail`, always `--accent` | same |

### Go press (`a.b1` inside `.form`; N6, N9)
| Property | Mobile | Desktop |
|---|---|---|
| element | anchor styled as `.b1` (text-decoration none) | same |
| size / spacing / color | 100% x 48px; margin-top 14px; radius 8px; `--accent` bg; `--bg` text; 600 15px | same |
| copy key | N6 `join.toSignUp`; N9 `join.signIn` | same |

### Quiet sign-in line (N11, N12) — renders `join.haveOne` + `join.signIn` link
| Property | Mobile | Desktop |
|---|---|---|
| class | `.fine` with inline `margin-top: 22px` | same |
| font | 11px/1.55 `var(--font-mono)` | same |
| color | `--fg-faint`; link `--accent` (global `a`), no underline | same |
| text-align | center | same |

### Clerk sign-up stand-in (N7)
Clerk draws it, not the app; the dashed panel is the board's placeholder and is NOT shipped. Recorded for the handoff only.
| Property | Mobile | Desktop |
|---|---|---|
| shipped by app | — (Clerk's own sign-up, on the invitation ticket, email filled and locked) | — |
| placeholder panel | margin 22px 16px; border 1.5px dashed `--fg-faint`; radius 18px; background `rgba(32,34,42,.6)` | — |
| locked-email row (illustrative) | height 44px, radius 8px, border 1px solid `--border-dashed`, padding 0 12px, 14px, `--fg-body`; "locked" tag 10.5px `--fg-faint` mono | — |

### Landed on /friends (N8) — shipped surface, not new UI
| Property | Mobile | Desktop |
|---|---|---|
| route | `/friends` | same |
| receipt band | the shipped band, `role="status"`, copy = shipped `socialCopy.page.accepted(name)` (no new string); dismiss 44x44 `✕` | same |
| band drawn values | min-height 52px; padding-left 16 / right 6; background `--surface-rail`; border-bottom 1px `--border`; 13px `--fg`; leading `✓` 14px `--success`; gap 10px | same |
| count line under Add a friend | renders `count.out` ("Out of invites"): 11px `var(--font-mono)`, `--fg-faint`, margin 8px 0 0 | same |
| friends row | Hugh listed with "since today" (11px mono, `--success`, right) | same |
| new account's invite count | 0 (starting count is Hugh's to set) | same |

### Interactive states (newcomer page)
The board is static: hover, focus and active styles are NOT specified for any /join control. Only these are drawn:
| Control | Drawn state | Mobile | Desktop |
|---|---|---|---|
| email field | filled | border `--accent`, text `--fg` | same |
| email field | locked while sending | text `--fg-muted` | same |
| Send code | sending | background `--accent-strong`, label swap | same |
| code box | active/filled | border `--accent` | same |
| code box | wrong | border `--danger` | same |
| resend link | cooling down | `--fg-locked`, label shows mm:ss | same |
| Confirm | boxes empty | demoted to outline | same |
| hover / focus-visible / active / transitions | — (unspecified; do not infer) | — | — |

### Conditional rendering (newcomer page)
| Condition | Renders |
|---|---|
| sender known and token live (N1 to N6) | face-up card |
| QR ended or code-proven account exists (N9 to N12) | card back, no sender name anywhere |
| QR expired (N11) | back at `.dim`, quiet sign-in line |
| used / revoked / not found / too many tries (N12) | normal back, quiet sign-in line |
| N1, N2 | email form |
| N3, N4, N5 | code group, optional error line, Confirm, links row |
| N6 | go press + check badge on card |
| N9 | back + go press "Sign in" (Option A, ruled) |
| N10 | Option B, NOT built (drawn for comparison; ruled out) |
| error line | N4, N5 only |
| quiet sign-in line | N11, N12 only |

---

## Component: Invite-only page (I1 desktop, I2 phone)

Route: the app's sign-up route. Signed in: redirects Home (I3). Not shown for the friend-link card or the invite QR page. Option W (waitlist, W1 to W3) is
ruled out and NOT built; omitted below.

### Page frame
| Property | Mobile | Desktop |
|---|---|---|
| layout | flex column, align-items center, text-align center; padding 56px 24px 24px | flex row, align-items center, justify-content center, gap 64px |
| frame size (artboard) | 390 x 844 | 1300 x 820 |
| shell | none | none |

### Card-back fan (`.fan` desktop / `.pfan` phone), aria-hidden, three backs
| Property | Mobile | Desktop |
|---|---|---|
| container | `.pfan`: position relative; 240px x 240px; flex none | `.fan`: position relative; 360px x 440px; flex none |
| back size | 300 x 419 base, then `scale(.48)` (about 144 x 201) | 300 x 419 |
| back position | absolute; left -30px; top 6px; transform-origin top center | absolute; left 30px; top 10px |
| back border-radius / padding | 17px / 12px | same |
| back background | `#14151B` | same |
| back box-shadow | `0 34px 70px rgba(0,0,0,.6), inset 0 0 0 1px #262A35` | same |
| left back (`.l`) | `scale(.48) rotate(-9deg) translate(-40px, 14px)`; opacity .55 | `rotate(-9deg) translate(-26px, 8px)`; opacity .55 |
| right back (`.r`) | `scale(.48) rotate(8deg) translate(40px, 16px)`; opacity .75 | `rotate(8deg) translate(26px, 10px)`; opacity .75 |
| front back | no rotation; opacity 1; stacked last (on top) | same |
| `.in` border-radius / border | 10px / 1px solid `--border-dashed` | same |
| `.in` background | `radial-gradient(240px 260px at 50% 46%, rgba(255,77,154,.22), transparent 72%), repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 6px, transparent 6px 12px), --surface-sunken` | same |
| `.in` layout | flex column, center/center, gap 10px | same |
| hero "99" | 700 58px `var(--font-display)`, line-height 1, `--fg` | same |
| diamonds `i` | `◆ ◆ ◆`, 13px, letter-spacing 4px, `--accent`, margin-bottom 6px | same |
| word on the front back only | `inviteOnly.backWord` ("BY INVITATION"): 10px `var(--font-mono)`, letter-spacing .4em, `--accent` | same |
| side backs | hero only, no word | same |
| gap fan to column | (column stacks under fan; no flex gap) | 64px |
| a11y | aria-hidden | aria-hidden |

### Column (`.col`)
| Property | Mobile | Desktop |
|---|---|---|
| width | (full content width; 342px at 390) | 380px |
| display / direction | block flow (centered text) | flex / column, gap 10px |
| landmark | `<section aria-labelledby>` pointing at the h1 (I1); phone board has no section wrapper | `<section aria-labelledby="t1">` |

### Kicker — renders `inviteOnly.kicker` (reuses `socialCopy.landing.brand`)
| Property | Mobile | Desktop |
|---|---|---|
| shown | — (no kicker at phone, as shipped) | yes |
| font | — | 500 11px `var(--font-mono)` |
| letter-spacing / transform | — | .2em / uppercase |
| color | — | `--accent` |

### Heading (`h1`) — renders `inviteOnly.title`
| Property | Mobile | Desktop |
|---|---|---|
| font | 700 24px/1.2 `var(--font-display)` | 700 30px/1.2 `var(--font-display)` |
| margin | 6px 0 0 | 0 |
| color | `--fg` | `--fg` |

### Body (`p.bdy`) — renders `inviteOnly.body`
| Property | Mobile | Desktop |
|---|---|---|
| font-size / line-height | 14px / 1.6 | 15px / 1.6 |
| margin | 8px 0 0 | 0 |
| color | `--fg-body` | `--fg-body` |
| bold phrase ("Invite someone new") | `b`: `--fg`, weight 500 | same |

### Sign in press (`.b1`) — renders `inviteOnly.signIn`
| Property | Mobile | Desktop |
|---|---|---|
| width | 100% (align-self stretch) | auto, align-self flex-start |
| height | 48px | 44px |
| padding | 0 (full width) | 0 26px |
| margin-top | 22px | 10px |
| border / radius | 0 / 8px | 0 / 8px |
| background / color | `--accent` / `--bg` | same |
| font | 600 15px `var(--font-sans)` | 600 14px `var(--font-sans)` |
| hover / focus | — (unspecified) | — |

### Fine line (`.fine`) — renders `inviteOnly.fine`
| Property | Mobile | Desktop |
|---|---|---|
| font | 11px/1.6 `var(--font-mono)` | same |
| color | `--fg-faint` | same |
| margin | 16px 0 0 | 6px 0 0 |

### Conditional rendering (invite-only page)
| Condition | Renders |
|---|---|
| signed out, reaches the sign-up route | this page instead of Clerk's open form |
| signed in | redirect Home; page never seen |
| waitlist (W1 to W3) | NOT built (ruled none at launch) |
| phone | kicker omitted; fan at ~half size above the column; Sign in full width 48px |
| desktop | fan beside the column; kicker shown; Sign in content-width 44px |

---

## Component: Friend link, signed out (L1; `/friend/[token]`)

Copy change only. Every value below is unchanged from shipped except the fine-line key's wording. Included so the PR can pin the key.

### Frame
| Property | Mobile | Desktop |
|---|---|---|
| layout | flex column, align center, justify center, gap 16px, padding 0 24px, text-align center | flex row, align center, justify center, gap 56px |
| artboard size | 390 x 844 | 1300 x 820 |

### Card back (`.back`, aria-hidden)
| Property | Mobile | Desktop |
|---|---|---|
| size | 300 x 419 then `transform: scale(.74)`, `transform-origin: top center`, `margin-bottom: -109px` | 300 x 419 |
| radius / padding / background / shadow | 17px / 12px / `#14151B` / `0 34px 70px rgba(0,0,0,.6), inset 0 0 0 1px #262A35` | same |
| `.in` | as the invite-only back (10px radius, 1px `--border-dashed`, same gradients) | same |
| hero | 700 58px `var(--font-display)`; diamonds 13px / 4px / `--accent` / margin-bottom 6px | same |
| word | "FRIEND REQUEST": 10px `var(--font-mono)`, letter-spacing .4em, `--accent` | same |

### Column
| Property | Mobile | Desktop |
|---|---|---|
| width / gap | 100% / 8px | 380px / 10px |
| kicker | — (none at phone) | 500 11px `var(--font-mono)`, .2em, uppercase, `--accent`; copy `socialCopy.landing.brand` |
| heading | 700 22px/1.25 `var(--font-display)`, `--fg`, margin 0 | 700 26px/1.25 same face, `--fg`, margin 0 |
| body | 14px/1.6 `--fg-body`, margin 0 | 15px/1.6 `--fg-body`, margin 0 |
| press (Sign in) | width 100%, height 48px, 15px, align-self stretch, margin-top 10px, radius 8px, `--accent`/`--bg`, 600 | height 44px, padding 0 26px, 14px, align-self flex-start, margin-top 10px, radius 8px, same colors, 600 |
| fine line | 11px/1.6 `var(--font-mono)`, **`--fg-muted` (#959AAD)**, margin 4px 0 0 | same |
| fine-line copy key | `socialCopy.landing.signedOutFine` (CHANGED; the only change) | same |

Note: L1's fine line is `--fg-muted`, whereas the invite-only page's fine line is `--fg-faint`. Both as drawn.

---

## State Coverage — Newcomer page `/join/[token]`

| State | Triggering condition | Component rendered | Key props / copy keys |
|---|---|---|---|
| N1 scanned, email screen | token live (unclaimed, unexpired, unrevoked); no claim bound to this session | face-up card, email form, fine print | sender name + commander art; `join.title`, `join.body`, `join.emailLabel`, `join.sendCode`, `join.fine` |
| N2 Send code pressed | Send code submitted; request in flight (claims the QR; fixed server floor so the wait is equal for every address) | same, field locked, press `.wait` | `join.sendingCode`; field readonly |
| N3 code sent | claim bound to session, code mailed, no digits wrong yet | face-up card, 6 boxes, Confirm, links | `join.codeTitle`, `join.codeBody(email)`, `join.codeAria`, `join.confirm`, `join.resendIn(mmss)` during cooldown, `join.otherEmail` |
| N4 wrong code | submitted code does not match and tries remain below the cap | boxes `.bad`, alert line, ready resend | `join.codeWrong`, `join.resend` |
| N5 code expired | code older than ~10 min when submitted or on return | boxes cleared, alert line, Confirm outlined, resend leads | `join.codeExpired`, `join.resend` |
| N6 right code | code matches; server then creates the Clerk invitation (notify off) for a new email | face-up card with check, go press | `join.okTitle`, `join.okBody(name)`, `join.toSignUp` |
| N7 Clerk sign-up | Continue to sign-up pressed | Clerk's sign-up on the invitation ticket, email locked | none of ours |
| N8 landed | Clerk returns; `user.created` forms the friendship and spends the sender's invite | `/friends` with shipped receipt band | `socialCopy.page.accepted(name)`; `count.out` |
| N9 already has an account (Option A, ruled) | right code, and the proven email already belongs to an account | card back, go press | `join.haveAccountTitle`, `join.haveAccountBody(email, name)`, `join.signIn` |
| N10 Option B | same trigger as N9 | NOT built (ruled out) | `path.sent` |
| N11 QR ran out | token past 15 min, unclaimed | dimmed back, quiet sign-in line | `join.expiredTitle`, `join.expiredBody`, `join.haveOne`, `join.signIn` |
| N12 ended | token used by someone else, revoked in /admin, never existed, or too many wrong codes on the claim | back, quiet sign-in line | `join.endedTitle`, `join.endedBody`, `join.haveOne`, `join.signIn` |

Names nobody: N9, N11, N12 never read or draw the sender.

## State Coverage — Invite-only page and signed-out friend link

| State | Triggering condition | Component rendered | Key props / copy keys |
|---|---|---|---|
| I1 desktop | signed out, requests the sign-up route (or a link to it) at desktop width | fan beside column | `inviteOnly.kicker`, `.title`, `.body`, `.signIn`, `.fine`, `.backWord` |
| I2 phone | same at phone width | fan above column, no kicker | same keys minus kicker |
| I3 triggers | sign-up route typed or linked; Clerk "Sign up" link (if Clerk allows the URL; else Clerk's message stands); signed in redirects Home; not the friend-link card or `/join` | route behavior | — |
| W1 to W3 waitlist | Option W | NOT built (ruled none) | — |
| L1 friend link, signed out, no account | signed out at `/friend/[token]` | existing card back + column; only the fine-line key changed | `socialCopy.landing.signedOutFine` (CHANGED) |

## Gaps the design leaves open (record only; not inferred)
- No hover, focus-visible, active, disabled-cursor or transition values for any control on N1 to N12, I1, I2, L1.
- No desktop artboard for `/join/[token]`; phone values stand per README.
- Code-box entry behavior (auto-advance, paste, backspace) is not drawn beyond "one-time-code autofill on, numeric keypad".
- Error-line colour `#E07A66` has no kamigawa token.
- G1 (equal wait), G2 (code length, expiry, cooldown, try cap), G5 (route names) are engineering's.
