# The 99 — Launch email · R1 (addendum to branded emails R2)

Account 2, 2026-11-18. Canvas “The 99 · Launch Email R1” (https://claude.ai/artifact/Ch1DmEvG37AAuc59gr37Vw); `canvas.json`
is its layout, the boards here are its export with `art/` paths. **Status: R1, awaiting Hugh’s audit.** Every string is
DRAFT for `/copy-review` (`launch · copy strings.ts`).

Decided before Design (Hugh, 2026-11-15): one email to everyone on `launch_list` on launch day, sent once through Resend
from `invites@mail.the-99.dev`, HTML plus a plain-text twin, with an unsubscribe link.

| Board | For |
|---|---|
| `Main.dc.html` | Start here: what it says and shows, codes, subject options, unsubscribe, open questions, gaps |
| `Launch.dc.html` | L1 desktop, L2 phone (landing source), L3 phone (flyer source) |
| `Dark-Mode.dc.html` | D1–D2 Gmail iOS inversion (light), D3–D4 images off |
| `Plain-Text.dc.html` | T1 the text twin, T2 flyer reason, T3 headers |
| `Unsubscribe.dc.html` | U1 done and U2 broken link, at 390 and 1300 |
| `templates/` | The build reference: `launch.html`/`.txt` (landing), `launch-flyer.*` (flyer reason) |
| `scratch-gen/` | `launch.py` builds the templates on `shellkit.py` (the R2 `build.py` shell, verbatim); `frames.cjs`, `page.cjs`, `shoot-hand.cjs` render the frames |

## Design’s calls

1. **The shipped shell, unchanged.** Kicker **◆ Now open ◆**, heading “The 99 is open to everyone”, one lead, then the
   shipped points box with numerals (Georgia bold, brass) in place of the diamonds, because the three items are steps.
2. **One call to action:** **Sign up free** → `/sign-up` (the landing’s open-state button), fine print “Free to join.
   No card details.”, the shipped raw-link line.
3. **The launch hand:** the plain invite hand with the top back’s word **NOW OPEN** (one static PNG,
   `/email/launch-hand@2x.png`, 560×540, made by `gen:email-images` from `InviteHand`; reference `art/launch-hand@2x.png`).
4. **Codes don’t matter:** sign-up is open and flyer codes retire, so the fine line says “You don’t need an invite or a
   flyer code. Anyone can join now.” The source (`launch_list.code_id` null or not) changes only the footer’s reason line.
   The flyer’s label is never shown.
5. **Unsubscribe:** the footer line “This is the only email the launch list sends. Unsubscribe and we’ll delete this
   address now.” plus `List-Unsubscribe` and one-click POST headers. The page `/unsubscribe?t=` is the shipped offline
   page’s body (eyebrow, display title, one sentence, `PrimaryButton`), signed out, no app shell, default theme. One press
   deletes, no confirm: a scanner hit can only cancel an email that never comes again. **Visit The 99** is the way back.

## States

- Email: landing source (L1, L2), flyer source (L3), Gmail iOS inverted (D1, D2), images off (D3, D4).
- Page: U1 done (also an address already gone or purged: never says whether it was listed); U2 token fails its check,
  nothing deleted; one-click POST draws nothing.

## Open for Hugh

- Q1 subject: “The 99 is open” (rec) / “You asked us to tell you: The 99 is open” / “Your binder has a deck in it”.
- Q2 hero: NOW OPEN hand (rec) or the shipped plain hand unchanged.
- Q3 skip addresses that already have an account at send time (rec).

## Gaps for engineering

- **G1** `List-Unsubscribe: <https://the-99.dev/unsubscribe?t=…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- **G2** `t` = HMAC of the case-folded address; no account, no expiry. Valid → delete row, U1. Invalid → U2.
- **G3** Send once: a per-address send log so a retried job never mails twice; batch under Resend’s rate limit.
- **G4** `InviteHand` takes a back word; the build writes `public/email/launch-hand@2x.png` (never copied from `design/`).
- **G5** The client test pass of branded emails G5 covers this email too.

## Placeholders

`[[signup_url]]` = `${origin}/sign-up` · `[[unsubscribe_url]]` = `${origin}/unsubscribe?t=${token}`. The hand and mark
URLs are fixed in the templates.
