# READINESS — Friends on Home (Social R3 addendum)

**🟢 Approved (R2b, Hugh, 2026-10-16).** At 390 Friends sits after Ready to build; the faces row spans the width with empty seats; the diamond stays; the tour is unchanged. Build once every string has been through `/copy-review`. G3–G8 are engineering's and copy's, confirmed in the plan.

## Locks held

| Lock | How R2 holds it |
|---|---|
| Permanent, no ✕ | No ✕ at either width; nothing records a dismissal. |
| No friends: invites you to add one | H1, P1: your seat, four empty seats, one line, Add a friend. |
| Friends: faces, Add a friend, a link to /friends | H2, H3, P2, P3: five slots across the width, Add a friend, `All friends ›` on the label's line. |
| On the first-run checklist (G25) | C1–C3, CP1–CP3: an unnumbered row under step 3. |
| Not a moment, not a bubble | No surface, halo or motion. It renders with the page and never waits for the banner. |
| Quiet: no stacked inline cards | A section without a card: the right column at 1280, after Ready to build at 390. No card joins either column. |
| Six themes, phone and desktop | Every state at both widths; the `Themes-*` boards draw each in all six. |

## Open questions, called

1 Under Commitments in the right column at 1280; after Ready to build at 390 (R2b); below the banner always ·
2 five slots flush edge to edge: up to five faces then empty seats, else four and `+N`, a count, not a press (R2) · 3 last on the checklist,
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

Approved. Engineering confirms G3, G7 and G8 in the plan; copy takes G5 and G6.
