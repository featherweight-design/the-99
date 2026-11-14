# STATES — Branded emails R2

An email has no interactive states; these are the variants a send can produce and the ways a client can show it.
Every email is drawn at 600 (desktop) and 375 (phone) unless a row says otherwise.

## Friend invite (`templates/invite-art.html`, `templates/invite-plain.html`, `templates/invite.txt`)

| Variant | Drawn | Rule |
|---|---|---|
| Sender with a commander | I1, I2, I3 | The hand of cards PNG (the sender's card over two 99 backs) over the kicker (G1). |
| Sender with no commander | P1, P2 | The plain hand: The 99's card back on top. Same words. |
| The card can't be drawn at send time | P1 | Send the plain version; never a broken image. |
| Sender with no display name | P3 | “A friend saved you a seat”, “Don’t know who sent it?”, footer “someone on The 99”. Phone only; desktop follows P1. |
| Long sender name | — | Heading and body wrap; the name bar on the hand ends in an ellipsis like the shipped one. |
| Address already has an account | — | Nothing different. The email never says so. |

## Code emails (`templates/code.html`, `templates/code.txt`)

| Variant | Drawn | Rule |
|---|---|---|
| Newcomer from a QR | C1, C2 | Code in the subject and the box. Names nobody. |
| Newcomer from a flyer | C3 | The same template and words. |
| A second code (resend) | — | A new email with the new code; nothing says “new”. Which codes still work is unchanged by this round. |

## Clerk's emails (`templates/clerk-*.html`, `templates/clerk-*.txt`)

| Variant | Drawn | Rule |
|---|---|---|
| Sign-in code, template | K1 | `{{otp_code}}` marked with a dashed outline on the board only. |
| Reset code, template | K2 | Same. |
| As received | K3, K4 | Filled by Clerk. |
| Clerk's account emails | — | Same pattern once eng confirms which are on (G4). |

## Clients

| Client behavior | Drawn | Result |
|---|---|---|
| Light client (any) | I1, I2, P1, P3, C1, C2, K3 | Dark email in a light inbox: unchanged. |
| Dark client, no inversion (Apple Mail, iOS Mail) | I3, C3, K4 | Unchanged: the email declares itself dark. |
| Partial invert (Outlook, Gmail Android) | I3 | Unchanged in practice: no light ground to flip. |
| Full invert (Gmail iOS) | D2, D3 | Parchment ground, dark ink, deep brass rule, kicker and button; images untouched. Simulated. |
| Images off | D4, `art/invite-art-648-noimg.png` | The tile's box shows “The 99” in brass; the hand's box shows its alt. Every word and the button stay. |
| Plain text only | T1 to T4 | `text` part. |
| Outlook for Windows | — | VML button and MSO 600 wrapper; Georgia falls back to Arial inside `mso` (the shell's conditional style). Test in G5. |
