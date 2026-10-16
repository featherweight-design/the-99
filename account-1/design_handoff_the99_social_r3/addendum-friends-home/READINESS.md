# READINESS — Friends on Home (Social R3 addendum)

**🟡 R1, awaiting audit.** Not approved. Nothing here is built until Hugh has reviewed the canvas.

## Locks held

| Lock | How R1 holds it |
|---|---|
| Permanent, no ✕ | No ✕ at either width; nothing records a dismissal. |
| No friends: invites you to add one | H1, P1: your seat, three empty seats, one line, Add a friend. |
| Friends: faces, Add a friend, a link to /friends | H2, H3, P2, P3: up to four slots, Add a friend, `All friends ›` on the label's line. |
| On the first-run checklist (G25) | C1–C3, CP1–CP3: an unnumbered row under step 3. |
| Not a moment, not a bubble | No surface, halo or motion. It renders with the page and never waits for the banner. |
| Quiet: no stacked inline cards | A section without a card, in the right column; nothing joins the left column. |
| Six themes, phone and desktop | Every state at both widths; the `Themes-*` boards draw each in all six. |

## Open questions, called

1 Under Commitments in the right column at 1280; last, after Commitments, at 390; below the banner always · 2 four
slots at both widths: up to four faces, else three and `+N`, a count, not a press · 3 last on the checklist,
unnumbered; done at one friend, and it stays.

## Engineering needs

- `Dashboard` takes `friends` (the viewer's `listFriends`, capped for the row, with the total) and `openLinks`
  (`listOpenInvites`), both null with the switch off; the right column renders when Commitments or Friends does (G7).
- Home's cache key gains `friendGeneration(viewer)` (G3).
- `FirstRunChecklist` takes the same two and draws the row after step 3.
- Add a friend and Show reuse `AddFriendDialog` and the /friends head's link-making (`invitePending`, the ten-link
  hold, `useInviteWatch` while a dialog is open).
- `Face` at 40, and at 26 for the done row; nothing new in `face.tsx`.

## For the audit

Call 1 (the section, not a card, in the right column) and call 3's done state are the ones most worth checking. G1 and
G2 need a word from Hugh.
