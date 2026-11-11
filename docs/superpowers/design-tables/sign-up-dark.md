# Design Property Table — Sign-up by invitation (dark)

Sources (read only these):
- `design/design_handoff_the99_small_items_11/Sign-In-Invite-Only.dc.html`: board A2 (line 1558), frames Q1–Q8, R2, R3, R5; the `/* /join */` sheet (lines ~1133–1180), the `si7` rules (~1442–1447) and the A2 `<style>` blocks (1500–1557).
- `design/design_handoff_the99_small_items_11/README.md` §4 Addendum A2, Ruling 1 and Ruling 3.

Conventions:
- Dark `.board` tokens. Font families are literal in the source: `'Cinzel', serif` (display; section T swaps it for `var(--face)`), `'IBM Plex Sans'` (inherited), `'IBM Plex Mono'`.
- Mobile = 390 frames (`.ph`); desktop = Q7 (Q1 at 1300), Q8 (Q4 at 1300), R5 (R3 at 1300). `.dk` changes only `.jn`'s wash and top padding.
- Annotation only, never built: `.new9` dashed outline, `.draft8` DRAFT chip. Copy is listed by slot only.
- No hover, focus or transition rule touches any element on this surface.

---

## Stage and column

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Stage `.jn` | layout | flex column, align center, text center | same |
| | padding | 44px 24px 24px | 72px top, 24px sides and bottom |
| | background | `radial-gradient(600px 360px at 50% 18%, accent 12%, transparent 70%)`, `var(--bg)` | `radial-gradient(1000px 520px at 50% 8%, accent 10%, transparent 70%)`, `var(--bg)` |
| | children | card, column, legal row (Q only) | same |
| Column `.jcol` | width / max-width | 100% / 380px | same |
| | layout | flex column, align center | same |
| App chrome | header / rail | none | none |

## Card `.cc`

| Property | Q1–Q8, R2 | R3, R5 |
|---|---|---|
| size | 150 × 210, flex none | same |
| side | face up (`.fc`) | back (`.bk`) |
| tilt | rotate(-3deg) (`.tilt`) | none |
| face slots | name bar, art (◆◆◆ over 99), type line (card type + ◆), rules box, footer (two mono items) | — |
| back slots | — | ◆◆◆ (8px, accent-text), 99 (Cinzel 700 34px, fg), word (mono 7.5px, .35em, uppercase, accent-text) |
| shadow | `0 20px 44px rgba(0,0,0,.6)` | same plus inset 1px `--border-strong` |

## Heading and body

| Element | Property | Value (both widths) |
|---|---|---|
| Title `h1` | font | Cinzel 700 22px / 1.25 |
| | color | var(--fg) |
| | margin | 28px 0 0 |
| Body `.bd` | font | 14px / 1.55 Plex Sans |
| | color | var(--fg-body) |
| | margin-top | 8px |
| | email `em` | not italic, var(--fg), weight 500 |
| | slot | Q1–Q5, Q7, Q8, R2: email-led invitation body; Q6: Google-confirmed body; R3/R5: refusal body |

## Form `.jform`

| Element | Property | Value (both widths) |
|---|---|---|
| Form | margin-top / width / layout | 22px / 100% / flex column, text-align left |
| Label | font / color / margin-bottom | Plex Sans 600 13px / var(--fg) / 6px |
| Second label (Password) | margin-top | 14px |
| Field `.jfld` | height / radius / padding | 48px / 8px / 0 12px |
| | background | var(--surface-sunken) |
| | border | 1px var(--border-strong) |
| | font-size / color | 16px / var(--fg-locked) |
| Field `.on` (has text) | border / color | var(--accent) / var(--fg) |
| Field `.s7bad` (refused) | border / color | var(--danger) / var(--fg) |
| Hint `.s7hint` | margin-top / font / color / align | 6px / 12.5px / 1.45 / var(--fg-muted) / left |
| Error `.s7err` | margin-top / font / color / align | 8px / 13px / 1.45 / var(--danger) / left; role alert; takes the password hint's slot |
| Press `.jbtn` | margin-top / height / radius | 14px / 48px / 8px |
| | background / color / font | var(--accent) / var(--bg) / Plex Sans 600 15px |
| | width | 100% |
| Press dimmed (Q6 empty, R2) | opacity | .6 |
| Press `.jbtn.q` (R3 Sign in) | background / border / color / weight | transparent / 1px var(--border-strong) / var(--fg) / 500; other `.jbtn` values stand |
| Rule `.or9` | margin-top | 18px |
| | font / color | Plex Mono 11px / var(--fg-faint) |
| | lines | 1px var(--border), flex 1 either side, gap 12px |
| Google `.gbtn` | margin-top / height / radius | 22px / 48px / 8px |
| | background / border / color | transparent / 1px var(--border-strong) / var(--fg) |
| | font / gap | Plex Sans 500 15px / 10px; 18px Google mark first |
| Google busy `.gbtn.busy` (R2) | opacity / label slot | .6 / checking-invitation label |
| Google hint `.ghint` | margin-top / font / color / align / width | 6px / 12.5px / 1.45 / var(--fg-muted) / **left** / 100% |

## Legal row `.s7legal`

| Property | Value |
|---|---|
| position | sibling after `.jcol` in `.jn` (Q1–Q8, R2); absent on R3/R5 |
| margin-top | 14px |
| layout | flex, centered, gap 16px |
| font / color | Plex Mono 11.5px / var(--fg-muted) |
| links | underline, offset 3px, var(--fg-muted) |

## Conditional rendering by frame

| Frame | Fields | Password slot | Press | or + Google + hint | Legal |
|---|---|---|---|---|---|
| Q1 / Q7 | name `.on`, password `.on` | hint | ready | shown | shown |
| Q2 | name `.on`, password `.s7bad` | error (too short) | ready | shown | shown |
| Q3 | as Q2 | error (too weak) | ready | shown | shown |
| Q4 / Q8 | as Q2 | error (breached) | ready | shown | shown |
| Q5 | both plain `.jfld` (locked: strong edge, locked ink) | **none** | busy, making label | **none** | shown |
| Q6 | only those Clerk asks for, empty | hint | dimmed .6 | **none** | shown |
| R2 | both `.on` | hint | dimmed .6 | or, Google busy; **no Google hint** | shown |
| R3 / R5 | none | — | Sign in, outline `.jbtn.q` | none | none |

(R2 markup: `.or9` then the busy `.gbtn`; no `.ghint` follows it.)

---

## State Coverage

| State | Trigger | Drawn |
|---|---|---|
| Q1 | landing with a good ticket; Clerk's sign-up is `missing_requirements` for name and password | Q1, Q7 |
| Q2 | Make my account with a password under 8 characters, checked before Clerk | Q2 |
| Q3 | Clerk refuses `form_password_not_strong_enough` | Q3 |
| Q4 | Clerk refuses `form_password_pwned` | Q4, Q8 |
| Q5 | Make my account pressed, Clerk not yet answered | Q5 |
| Q6 | back from Google with Clerk still missing a name, a password or both | Q6 |
| R2 | Google pressed on Q1: the ticket is sent again first | R2 |
| R3 | ticket used, revoked, expired, or the invited email already has an account; from the landing, Make my account or R2 | R3, R5 |
