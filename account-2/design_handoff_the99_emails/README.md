# The 99 — Branded emails · R2 · for Hugh's review

Account 2, 2026-11-14. Brief: `docs/superpowers/design-briefs/2026-11-14-branded-emails.md` (branch
`brief/branded-emails`). Sibling handoffs: `design_handoff_the99_invites/` (the invite copy and the newcomer card) and
`design_handoff_the99_brand/` (Table Candlelight). Desktop at a 600 column, phone at 375.

**Status: R2, awaiting Hugh's review.** R1 feedback (Hugh, 2026-11-14): logo only on top; the branding felt flat, so
add life without going over the top; a copy review / prose pass on everything before shipping. Q1 answered: every
email comes from `invites@mail.the-99.dev`.

> **Before implementing: a copy review** (`/copy-review`) on every string in `emails · copy strings.ts`. R2 includes
> Design's prose pass; the review is still owed before the build (Hugh, 2026-11-14).

Canvas: “The 99 · Branded Emails R2” (account 2, https://claude.ai/artifact/T4NEeTt1F7fHg3VbpHqCMz). The boards here
are its export with `art/` paths. **Every email frame is a screenshot of this handoff's own `templates/*.html`**,
filled with the fixtures and rendered in Chromium at 600 and 375 (`scratch-gen/`). Fixture: Colin sends the invite,
with Ghalta, Primal Hunger.

## The answer in one line

Every email The 99 sends sits on one dark shell (the crowned 99 tile alone on top, a panel with a brass top rule, a
brass kicker over a Georgia heading, one brass button or one big code, and a footer that closes on a flavor line),
and the friend invite opens with a hand of cards: the sender's card face up, fanned over The 99's card backs.

## Product calls (closed)

| Call | Where it holds |
|---|---|
| Clerk's sign-in code and password reset are branded in Clerk's editor and still sent by Clerk | `templates/clerk-*.html`, board K |
| Every email, ours and Clerk's, comes from `The 99 <invites@mail.the-99.dev>` (Hugh, Q1) | Boards I, P, C, K; G3 for Clerk |
| The invite shows the sender's commander art, with a plain version when they have none | Board I, board P |
| No reply-to; the footer says replies aren't read | Every footer: “Replies to this email aren’t read.” |
| Logo only on top (Hugh, R1 review) | Every email |

## Design's calls

1. **The shell.** A fluid table column, `width:100%; max-width:600px`, with an MSO 600 wrapper, on `#14110E`. One
   panel: `#1E1A15`, 1px `#3A3229`, a **3px brass top rule**, 12 radius, 40px sides (24 on a phone). Every message
   opens with a **brass kicker** (◆ label ◆, sans semibold 12, `.22em`, caps), then a Georgia bold 30 heading, body
   in system sans 16/1.6, fine print under a hairline. **One button style**: brass fill, dark bold 17 label, 52 tall,
   VML for Outlook. The **footer** is three brass diamonds, the flavor line *“Search your library for a commander.”*
   (Georgia italic, the flyer's pitch), then why it came, “Replies to this email aren’t read.”, and the-99.dev.
   *Why:* Hugh asked for more life without going over the top. The brass rule, kicker and flavor line are the brand's
   own moves (flavor in headings, data stays quiet), so each email has a little Magic in it and no new decoration.
2. **Header: logo only.** The crowned 99 tile, a hosted PNG at 56px, centered, linking to the-99.dev. `alt="The 99"`
   is styled brass Georgia bold 13 so it reads inside the tile's box when images are off. No web fonts.
3. **The invite.** Subject as today, “Colin invited you to The 99”. Preheader “Join as Colin’s friend. Your invite
   works for 7 days.” It opens with **a hand of cards**, one hosted PNG (560×540 source, 280×270 shown) with
   transparency: the shipped compact `FriendCard` face (name, commander art, “Invitation”, the rules line, the art
   credit) tilted −5°, fanned over two of The 99's card backs (the shipped back: crowned 99, INVITATION), in a soft
   brass glow. Then the kicker **◆ You’re invited ◆**, the heading **“Colin saved you a seat at The 99”**, one line
   on what The 99 is, **three things waiting inside** (the flyer's three points, in an elevated box with brass
   diamonds), **Join The 99**, the raw link, and the 7-day line. *Why:* the newcomer sees the same card in the email
   and on `/join`, and the fan says “come play” before any word does.
   - **No art** (no commander, or the hand can't be drawn): the same hand with The 99's own card back on top, one
     static PNG. Every word stays. Board P1, P2.
   - **No name**: “A friend saved you a seat at The 99”, “Don’t know who sent it?”, and the footer says “someone on
     The 99 invited this address”. The subject stays “A friend invited you to The 99”, as today. Board P3.
   - The invite never says whether the address already has an account.
4. **All five emails get the shell.** The newcomer and flyer codes share `templates/code.html`: kicker **◆ One-time
   code ◆**, heading “Here’s your code”, the code in a **brass-bordered box**, 38px mono, `.28em`, live text with no
   spaces (copy and autofill get six clean digits); the subject keeps the code. Clerk's sign-in code (“Welcome back”)
   and reset code are the same shell for Clerk's editor in HTML mode, with Clerk's `{{otp_code}}` (board K).
5. **Dark mode: a dark shell, declared dark** (`color-scheme: dark` metas and `:root`). Apple Mail and iOS Mail leave
   it alone; Outlook and Gmail on Android only darken light grounds and there are none. Gmail on iOS inverts it to a
   parchment version, simulated on board D, every line legible; images (tile, hand) never invert. The footer and
   fine print use `#A89B84`, not faint, which fails when flipped.
6. **Plain text.** First line is the heading as a sentence. The link or the code sits alone after a short label; the
   invite's three points are a dash list; then `--`, the reason, the flavor line, the replies line and the site.
   Straight quotes. `templates/*.txt`, board T.

## Design's prose pass (R2)

Every string was rewritten for short, warm, plain prose: “Enter” over “Type”; “It expires in 10 minutes” over “It works
for 10 minutes”; the ignore line as a question (“Don’t know Colin? You can ignore this email.”, “Didn’t ask for a code?
You can ignore this email.”); “Replies to this email aren’t read.”; “Button not working? Paste this link into your
browser:”; “No one can get in without this code.”; “Your password won’t change.” No em dashes; nothing says “Press”.

## Contrast (as sent; Gmail iOS simulated in brackets)

Heading 13.9:1 (13.9) · body 8.8:1 (7.2) · kicker brass on the panel 7.2:1 (5.5) · points on their box 12.4:1 ·
fine print 6.3:1 (4.7) · footer on the ground 6.9:1 (5.1) · flavor line 9.5:1 · button label on brass 7.8:1 (5.4).

## Gaps for engineering

- **G1 · The hand image.** A route on the app's origin draws the sender's hand PNG (560×540, transparent): the shipped
  compact `FriendCard` face tilted −5° over two 99 card backs at +4° and +11°, in the brass glow (reference
  `art/invite-hero-colin@2x.png`, made from `scratch-gen/invite-hero.html`). Its URL is keyed by the invite's
  reservation (unguessable, not the sender's public id) and works for the invite's 7 days. Art is fetched
  server-side; the email never points at Scryfall. The name is drawn as text and ellipsized like the shipped name
  bar; the credit is the shipped `Art · {commander}`, ellipsized. If it can't be drawn at send time, send the plain
  hand (`/email/invite-hero-plain@2x.png`, one static file; reference `art/invite-hero-plain@2x.png`).
- **G2 · The mark PNG.** `/email/mark-112@2x.png` on the app's origin: `public/icons/icon-512.png` with brass `#C9A24B`
  diamonds, 224×224. `design/` is never copied to `public/`, so the build makes both static PNGs; `art/` holds the
  references.
- **G3 · Clerk.** Clerk sends from its configured email domain: confirm `invites@mail.the-99.dev` can be Clerk's
  sender (the `mail.` subdomain may need its own setup in Clerk), with display name “The 99” and no Reply-To.
  `{{otp_code}}` is not in Clerk's documented variable table (it lists `action_url`, `app.domain_name`,
  `app.logo_image_url`, `app.name`, `invitation.expires_in_days`, `invitation.public_metadata`, `inviter.name`):
  confirm it with the editor's Variable insert. Confirm HTML mode keeps tables and inline styles, the subject takes a
  variable, and a plain-text body can be set. Turn Clerk branding off. The “10 minutes” lines must match Clerk's code
  lifetime.
- **G4 · Clerk's account emails** (verify an added address, password changed, new sign-in if enabled) take the code
  shell's pattern. Eng lists which are on; their words go through the same copy review.
- **G5 · A client test pass** before ship: Gmail on iOS, Android and web, Apple Mail on macOS and iOS, Outlook 365 and
  Outlook for Windows, Yahoo, with images on and off. The Gmail iOS frames here are simulated.
- **G6 · Where the words live.** A copy module (`src/lib/copy/emails.ts`) beside `invites.ts`; `inviteMail` and the
  code mails build `html` and `text` from one shell. The sender name stays escaped as today (`escapeHtml`).

## Placeholders in `templates/`

`[[name]]` is filled by our code before Resend sends. `{{name}}` is a Clerk variable, filled by Clerk.

| Placeholder | Value |
|---|---|
| `[[sender]]` | The sender's display name, HTML-escaped, or “A friend” |
| `[[sender_or_who]]` | The name, or “who sent it” |
| `[[commander]]` | The commander's name, for the hand's alt |
| `[[card_image_url]]` | G1's URL (the plain hand's URL is fixed in `invite-plain.html`) |
| `[[invite_url]]` | Clerk's `invitation.url` |
| `[[days]]` | `INVITATION_DAYS` (7) |
| `[[code]]` | The six digits |
| `{{otp_code}}` | Clerk's code (G3) |

With no name, the invite's footer reason is “You’re getting this because someone on The 99 invited this address.”
