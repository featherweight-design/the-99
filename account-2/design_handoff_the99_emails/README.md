# The 99 — Branded emails · R1 · for Hugh's audit

Account 2, 2026-11-14. Brief: `docs/superpowers/design-briefs/2026-11-14-branded-emails.md` (branch
`brief/branded-emails`). Sibling handoffs: `design_handoff_the99_invites/` (the invite copy and the newcomer card the
email repeats) and `design_handoff_the99_brand/` (Table Candlelight). Desktop at a 600 column, phone at 375.

**Status: R1, awaiting the readiness audit.**

> **Before implementing: this handoff gets a copy review** (`/copy-review`) on every string in
> `emails · copy strings.ts`. The words here are Design's drafts.

Canvas: “The 99 · Branded Emails R1” (account 2, https://claude.ai/artifact/T4NEeTt1F7fHg3VbpHqCMz). The boards here
are its export with `art/` paths. **Every email frame is a screenshot of this handoff's own `templates/*.html`**, filled
with the fixtures and rendered in Chromium at 600 and 375 (`scratch-gen/`), so a board never shows something the
template doesn't send. Fixtures: Colin sends the invite, with Ghalta, Primal Hunger as his commander.

## The answer in one line

Every email The 99 sends sits on one dark shell (the crowned 99 tile and the THE 99 wordmark, one panel with a Georgia
heading and one brass button or one big code, a footer that says why it came and that replies aren't read), and the
friend invite leads with the sender's invitation card, tilted, as the newcomer page draws it.

## Product calls (Hugh, closed in the prompt)

| Call | Where it holds |
|---|---|
| Clerk's sign-in code and password reset are branded in Clerk's template editor and still sent by Clerk | `templates/clerk-*.html`, board K; “Delivered by Clerk” on |
| Our emails (friend invite, newcomer code, flyer code) go through Resend from `invites@` | `templates/invite-*.html`, `templates/code.html`; boards I, P, C |
| The invite shows the sender's commander art, with a plain version when they have none | Board I (art), board P (plain) |
| No reply-to; the footer says replies aren't read | Every footer: “Replies to this address aren’t read.” |

## Design's calls (the brief's Open list)

1. **The shell.** A fluid table column, `width:100%; max-width:600px`, with an MSO 600 wrapper for Outlook, on the base
   ground `#14110E` (set on `body`, `bgcolor` and inline). One panel: `#1E1A15`, 1px `#3A3229`, 12 radius, 40px sides
   (24 on a phone), centered content. Heading Georgia bold 26/1.25 `#EDE6D8`; body system sans 16/1.6 `#C6B79A`; a
   hairline, then fine print 14/1.55 `#A89B84`; footer 13/1.6 `#A89B84`. **One button style**: `#C9A24B` fill, `#14110E`
   bold 16 label, 14×40 padding, 8 radius, with a VML roundrect for Outlook. Only one `<style>` block, which tightens
   padding on a phone; the layout holds without it. *Why:* tables and inline styles are what Gmail, Apple Mail and
   Outlook all keep; a single panel gives every email the same frame without a header image. Board S has every value.
2. **Header and mark.** The crowned 99 tile (hosted PNG, 36×36, 8 radius, `alt=""`) beside **THE 99 as live text**,
   Georgia bold 18, `.14em`. Both link to the-99.dev. *Why:* with images off the tile drops and the wordmark still
   reads; an `alt="The 99"` in a 36px box clips (tried, board D). No web font is linked: Cinzel won't load in Gmail or
   Outlook, and Georgia everywhere beats Cinzel in one client and Georgia in the rest.
3. **The friend invite.** Subject as today, “Colin invited you to The 99”. Preheader “Join as Colin’s friend. The link
   works for 7 days.” Then the **invitation card**: the shipped compact `FriendCard` face (name bar, commander art,
   type line “Invitation” with the brass diamond, `joinCopy.cardRules`, the art credit, THE 99) as **one hosted PNG,
   360×480 source shown at 180×240, with the −3° tilt and a soft shadow baked in on a transparent ground**. Mail
   clients drop CSS transforms, and one image keeps the card exactly the newcomer page's. Then the heading, one line on
   what The 99 is, **Join The 99**, the raw link under “Or paste this link into your browser:”, a hairline, and the
   7-day and ignore line. *Why:* the newcomer sees the same card in the email and on `/join`, so the page they land on
   already feels known.
   - **No art** (no commander, or the card can't be drawn): no card. Three brass diamonds (the crown's shape) sit over
     the heading; every word stays. A grey “No commander” card is a poor first sight. Board P1, P2.
   - **No name**: “A friend invited you to The 99”, “If you don’t know who sent it”, and the footer says “someone on
     The 99 invited this address”, as `inviteMail` does today. Board P3.
   - The invite never says whether the address already has an account.
4. **Which emails get the shell: all five.** The newcomer code and the flyer code send the same words today, so they
   share `templates/code.html`. The code is **34px mono semibold, `.28em` letter-spacing, live text with no spaces in
   it**, in an elevated box labelled YOUR CODE, so a long-press copy or a phone's one-time-code autofill gets six clean
   digits; the subject keeps the code. Clerk's sign-in and reset codes are the same shell, pasted into Clerk's editor
   in HTML mode, with Clerk's `{{otp_code}}` as the one variable (board K). Clerk's other account emails take the
   same pattern once eng confirms which are on (G4).
5. **Dark mode: a dark shell, declared dark.** `<meta name="color-scheme" content="dark">`, the matching
   `supported-color-schemes` and `:root { color-scheme: dark }`. Apple Mail and iOS Mail honor it and leave the email
   alone. Outlook and Gmail on Android only darken light grounds, and there are none. **Gmail on iOS inverts every
   email, dark ones too**: board D simulates it (CSS `invert(1) hue-rotate(180deg)`), and it reads as a parchment
   version of the brand, every line legible. Images never invert, so the mark tile and the card keep the brand. The
   footer uses the fine-print color, not faint: faint barely moves when flipped and fell to 3.6:1. The code label uses
   the body color for the same reason. Board D lists every color as sent and as inverted. *Why dark and not a light
   shell with brass accents:* a light shell is parchment in most inboxes and dark only where a client flips it, so the
   newcomer's first sight would be off-brand for most people instead of a few.
6. **Plain text.** Every email has a `text` part. The first line is the lead sentence, never the subject again (an
   inbox previews it). The link or the code sits alone on its own line after a short label ending in a colon. Then
   `--` and the footer's three lines, word for word. Straight quotes. `templates/*.txt`, board T.

## Contrast (as sent; Gmail iOS simulated in brackets)

Heading on panel 13.9:1 (13.9) · body 8.8:1 (7.2) · fine print 6.3:1 (4.7) · footer on ground 6.9:1 (5.1) · button
label on brass 7.8:1 (5.4) · code on its box 12.4:1 (12.6) · code label 7.8:1 (6.5).

## For Hugh

- **Q1 · Clerk's From address.** The brief suggested `hello@`. With no reply-to and a footer that says replies aren't
  read, “hello” invites a reply nobody sees. **Recommended: `codes@`** on the app's domain, display name “The 99”, so
  every sender line reads The 99. Clerk defaults to `noreply@` when the local part is empty.

## Gaps for engineering

- **G1 · The card image.** A route on the app's origin draws the invitation card PNG (360×480) from the shipped compact
  face, the way `FriendCard` draws it, with the tilt and shadow baked in on a transparent ground (reference:
  `art/invite-card-colin@2x.png`, made from `scratch-gen/invite-card.html`). Its URL is keyed by the invite's
  reservation, not guessable and not the sender's public id, and works for the invite's 7 days. The commander art is
  fetched server-side; the email never points at Scryfall. The name is drawn as text and cut with an ellipsis like the
  shipped name bar; the credit is the shipped `Art · {commander}` (drawn short here). If the card can't be drawn at
  send time, send the plain version.
- **G2 · The mark PNG.** `/email/mark-96@2x.png` on the app's origin: the app icon (`public/icons/icon-512.png`) with
  brass `#C9A24B` diamonds, 192×192, 8 radius at display size. `design/` is never copied to `public/`, so the build
  makes it; `art/mark-96@2x.png` is the reference.
- **G3 · Clerk's editor.** `{{otp_code}}` is not in Clerk's documented variable table (it lists `action_url`,
  `app.domain_name`, `app.logo_image_url`, `app.name`, `invitation.expires_in_days`, `invitation.public_metadata`,
  `inviter.name`): confirm the code variable with the editor's Variable insert for both templates. Confirm HTML mode
  keeps the tables and inline styles, that the subject takes a variable, and whether a plain-text body can be set.
  Turn Clerk branding off. The “10 minutes” lines must match Clerk's code lifetime.
- **G4 · Clerk's account emails** (verify an added address, password changed, new sign-in if enabled) take the code
  shell's pattern: heading, one line, fine print, footer. Eng confirms which are on; their words go through copy
  review with that list.
- **G5 · A client test pass** before ship: Gmail on iOS, Android and web, Apple Mail on macOS and iOS, Outlook 365 and
  Outlook for Windows, Yahoo. The Gmail iOS frames here are a simulation.
- **G6 · Where the words live.** The strings move to a copy module (`src/lib/copy/emails.ts`) beside `invites.ts`;
  `inviteMail` and the two code mails build their `html` and `text` from the shell. The sender name stays escaped as
  today (`escapeHtml`).

## Placeholders in `templates/`

`[[name]]` is filled by our code before Resend sends. `{{name}}` is a Clerk variable, filled by Clerk.

| Placeholder | Value |
|---|---|
| `[[sender]]` | The sender's display name, HTML-escaped, or “A friend” |
| `[[sender_or_who]]` | The name, or “who sent it” |
| `[[commander]]` | The commander's name, for the card's alt |
| `[[card_image_url]]` | G1's URL |
| `[[invite_url]]` | Clerk's `invitation.url` |
| `[[days]]` | `INVITATION_DAYS` (7) |
| `[[code]]` | The six digits |
| `{{otp_code}}` | Clerk's code (G3) |

With no name, the invite's footer reason is “You’re getting this because someone on The 99 invited this address.”
