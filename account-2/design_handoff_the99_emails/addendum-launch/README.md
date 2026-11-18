# The 99 — Launch email · R2c (addendum to branded emails R2)

Account 2, 2026-11-18. Canvas “The 99 · Launch Email R2” (https://claude.ai/artifact/Ch1DmEvG37AAuc59gr37Vw); `canvas.json`
is its layout, the boards here are its export with `art/` paths. **Status: R2c, awaiting Hugh’s review.** Design’s copy pass is in (R2b, plainer, no slogans); every string is still
DRAFT for `/copy-review` (`launch · copy strings.ts`).

Decided before Design (Hugh, 2026-11-15): one email to everyone on `launch_list` on launch day, sent once through Resend
from `invites@mail.the-99.dev`, HTML plus a plain-text twin, with an unsubscribe link.

R1 feedback (Hugh, 2026-11-18): drop “You don’t need an invite or a flyer code. Anyone can join now.” (redundant); more
imagery and the features, more sizzle; the tagline everywhere is “99 problems, but your commander ain’t one.”, not
“Search your library for a commander.”

R2 feedback (Hugh, 2026-11-18): two sign-up buttons (top and bottom); a copy pass (“Written for real” too cringe);
each image below its section heading, grouped. R2b feedback: drop the credits image’s “That’s enough…” paragraph and
the What credits cost link (a landing-only sheet); sweep for repeated copy (R2c, Main board lists every cut).

| Board | For |
|---|---|
| `Main.dc.html` | Start here: what changed, subject options, open questions, gaps |
| `Launch.dc.html` | L1 desktop, L2 phone (landing source), L3 phone (flyer source) |
| `Dark-Mode.dc.html` | D1–D2 Gmail iOS inversion (light), D3–D4 images off |
| `Plain-Text.dc.html` | T1 the text twin, T2 flyer reason, T3 headers |
| `Unsubscribe.dc.html` | U1 done and U2 broken link, at 390 and 1300 |
| `templates/` | The build reference: `launch.html`/`.txt` (landing), `launch-flyer.*` (flyer reason) |
| `scratch-gen/` | `launch.py` builds the templates on `shellkit.py` (the R2 `build.py` shell, verbatim); `fan.html` + `shoot-fan.cjs` the hero; `frames.cjs`, `page.cjs` the frames |

## Design’s calls

1. **The shipped shell.** Footer flavor line is now the tagline, **“99 problems, but your commander ain’t one.”**: one
   string, `emailShellCopy.flavor`, so every email changes with it.
2. **Hero: a card fan** (`/email/launch-fan@2x.png`, 1040×560 transparent, shown 520×280): Giada, Jace, Y’shtola and Tam
   full cards fanned ±12° and ±24° around The 99’s card back reading NOW OPEN, in the brass glow (cards at card shape).
3. **Heading** is the landing’s headline, “Your next commander is already in your binder”, kicker **◆ Now open ◆**,
   lead “The 99 is open to everyone, starting today.”
4. **Four feature boxes** under the landing’s “From your binder to a finished deck”: one elevated box each, one column
   at every width: brass ◆ 0n label, Georgia 22 title, one sentence, then the capture of the shipped landing it describes
   (320 wide, fluid; 18 sides on a phone). Captures, cropped so no picture repeats the words beside it: two commander tiles (art,
   rank, fit only), Suggested changes’ example only, Tam’s read without its link, the landing’s value card redrawn with
   only the 15 and +1 rows and room around them (`scratch-gen/credits.cjs`; its own border, no second frame) (`art/feature-*@2x.png`, 480 wide).
5. **Two Sign up free buttons, one action**: under the lead for readers who already know, and after the features with
   “Free to join. No card details.” and the raw link. Same words, same link. The text twin carries the link at both
   places too. No codes line.
6. **Unsubscribe** (unchanged from R1): footer line “This is the only email the launch list sends. Unsubscribe and
   we’ll delete this address now.” plus one-click headers; the page `/unsubscribe?t=` is the shipped offline page’s body,
   signed out, no shell; one press deletes; **Visit The 99** is the way back.

## States

- Email: landing source (L1, L2), flyer source (L3), Gmail iOS inverted (D1, D2), images off (D3, D4).
- Page: U1 done (also an address already gone or purged); U2 token fails, nothing deleted; one-click POST draws nothing.

## Open for Hugh

- Q1 subject: “The 99 is open” (rec) / “You asked us to tell you: The 99 is open” / “Your binder has a deck in it”.
- Q2 skip addresses that already have an account at send time (rec).
- Q3 does the printed flyer’s headline (`flyerCopy.pitch`, “Search your library for a commander.”) also become the tagline?

## Gaps for engineering

- **G1** `List-Unsubscribe: <https://the-99.dev/unsubscribe?t=…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- **G2** `t` = HMAC of the case-folded address; no account, no expiry. Valid → delete row, U1. Invalid → U2.
- **G3** Send once: a per-address send record so a retried job never mails twice; batch under Resend’s rate limit.
- **G4** Five static images in `public/email/` made by the build (never copied from `design/`): the fan (card images
  fetched once at build time, never Scryfall from the email) and four feature captures shot from the shipped landing at
  2x, 480 wide. References in `art/`.
- **G5** The tagline change in `emailShellCopy.flavor` reaches the invite, code and Clerk templates (paste Clerk’s again).
- **G6** The client test pass of branded emails G5 covers this email, with the feature rows checked in Outlook for Windows.

## Placeholders

`[[signup_url]]` = `${origin}/sign-up` · `[[unsubscribe_url]]` = `${origin}/unsubscribe?t=${token}`. Image and mark URLs
are fixed in the templates.
