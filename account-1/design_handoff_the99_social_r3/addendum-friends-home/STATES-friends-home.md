# STATES — Friends on Home (Social R3 addendum)

H = Home at 1280, P = Home at 390, C = checklist at 1280, CP = checklist at 390. Every state is drawn at both widths in
Low Sun (the default theme), and the section and row are drawn in all six themes on the `Themes-*` boards.

## Home's Friends section

| State | Drawn | Rule |
|---|---|---|
| Switch off (`SOCIAL_FRIENDS_ENABLED`) | — | No section, no space kept. Home as shipped. |
| No friends | H1, P1 | `FRIENDS`; your seat and three dashed seats (`aria-hidden`); one line; Add a friend. No /friends link. |
| One friend | H2, P2 | `FRIENDS · 1`, `All friends ›`; one face; Add a friend. |
| Two to four friends | rule (H3's slots) | Every face, in /friends' order (by name). |
| Five or more (overflow) | H3, P3 | Three faces, then `+N` (`aria-hidden`; the heading carries the total). |
| A friend link open, no friends | H4, P4 | `Friend link open · 6 days left · Show` under the line; the next empty seat carries the diamond. |
| A link open, under a day | rule | `Under a day left` in `--warning`. |
| Two or more links open | rule | `3 friend links open · See them ›` to /friends. |
| Friends and a link open | rule | The same line, under the faces. |
| Making a link | rule | Add a friend reads `Making a link…`, `aria-disabled`, as the /friends head. |
| Ten links open | rule | The shipped toast (`invites.tooMany`); the press stays. |
| Link accepted while its dialog is open | rule | Home watches as /friends does; the face lands, toast `You and Colin are friends.` |
| A friend with no commander | rule | The shipped `Face`'s initials. |
| Your own face, with no commander | rule | Your initials in your seat (no-friends state). |
| Banner up | H2, P2 | The banner above both columns, unchanged; Friends below as always. |
| Commitments absent (read failed) | rule | The right column renders for Friends alone (G7). |
| Zero decks / decks and no cards | rule | The section shows; the left column is as shipped. |

## The checklist's Friends row

| State | Drawn | Rule |
|---|---|---|
| Switch off | — | No row. The checklist as shipped. |
| Not done | C1, CP1 | Dashed `+`; `Add your friends`; the row opens Add a friend. |
| Not done, a link open | C2, CP2 | Diamond in the slot; `Friend link open · 6 days left`; the row's press is Show. |
| Done (one friend or more) | C3, CP3 | ✓ in `--success`; `Friends`; `You and Colin are friends.` (one) or `You have 4 friends.` (more); their faces as 26 discs, up to three; opens /friends. |
| The link expires or is revoked | rule | Back to not done. |
| The tour running | rule | The row is under the scrim with the rest of the page, inert (Discovery R3 C4). Step 6 names nothing new (G1). |
| Step 1's review open on the phone (5a) | rule | The row stays where it is, below step 3. |

## Presses

| Press | Does |
|---|---|
| A face | That friend's page, `/friends/[publicId]`. |
| `All friends ›` | /friends. |
| Add a friend (Home), or the not-done row | Makes a link and opens the shipped dialog (1280) or sheet (390) over the page. |
| Show (Home), or the link-open row | Opens the dialog on that open link. |
| The done row | /friends. |
