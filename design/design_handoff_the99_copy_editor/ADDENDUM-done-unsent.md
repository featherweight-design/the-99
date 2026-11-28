# Addendum: unsent edits on Done, R1

Approved by Hugh 2026-11-27 (R1). Boards: `Done-Main.dc.html`, `Done-Phone-W1..W3.dc.html`,
`Done-Desktop-W1..W3.dc.html`. Drawn over the R1 Help me choose page with the mode off (`art/ce-<p|d>-off.webp`) and
three edits in the tray (the R1 tray's rows). Builds on the shipped provider, overlay and tray
(`src/components/copy-editor/provider.tsx`, `overlay.tsx`, `tray.tsx`).

## The gap

In a live test Hugh added edits to the tray, then pressed the bar's Done to leave the mode. Nothing said the edits
were still waiting, unsent; he expected Done to send them. Today Done gives the page back, the edits stay in the tray
in this browser (README Q2), and the page shows today's text again (Q4 previews only show while the mode is on), so
the edits look gone. README C1 to C5 stand. This adds one state the boards don't draw: Done with unsent edits.

## The pick: Done leaves as today, says what's waiting, and keeps the count on the door

| Option | Verdict | Why |
|---|---|---|
| A. Done asks: send, keep or discard | No | Done is also how an admin uses the page mid-batch (Q3: links don't work while the mode is on), including following a link to edit the next page. A question on every hop nags the multi-page batch Q2 exists for, and Discard beside Send is one wrong tap from losing the work. |
| B. Done sends (C5 Submitting at once) | No | Same hop problem, and worse: leaving one page to edit the next would open a pull request with half the batch, and the submit route allows one a minute. Opening a PR is a send; it shouldn't ride on a button that means "give me the page". |
| C. Done leaves; the door shows a count | Half | The count keeps the edits visible later, but it is passive. At the moment Hugh pressed Done he was looking at the page, not the corner. |
| **Pick: C plus a notice at Done** | Yes | Done never asks and never sends. When edits are waiting, a small notice says so where the bar was, with Open pull request one press away, and doesn't block the page. After it closes, the door keeps the count. |

Done with an empty tray stays as it is: no notice, no count.

## States

Art: the boards themselves (`Done-*.dc.html`), phone 390 and desktop 1300, over `art/ce-<p|d>-off.webp`. These sit
after STATES.md row 12.

| # | State | Board | What shows |
|---|---|---|---|
| 13a | Done with edits waiting | `W1` | Mode off, page back. Notice: "3 edits waiting, not sent", "They stay in this browser until you open a pull request or clear them.", `Review`, `Open pull request`, ✕. Desktop: over the bar's corner. Phone: under the header. The door shows the count. |
| 13b | Count on the door | `W2` | Notice closed (or the next page). Desktop pill: `Edit copy` · staging dot · `3 edits waiting`. Phone pencil: count badge `3`, staging dot at its foot. |
| 13c | Sent from the notice | `W3` | `Open pull request` pressed: the tray opens straight in C5 Submitting with the mode still off. Submitted, Failed and Try again follow C5 unchanged. |

## Decisions

### D1. Done with edits waiting
- The mode ends exactly as today: outlines off, the page given back, focus back on the door.
- If the tray holds edits and no submission is in flight, a notice opens.
  - Desktop: 360px panel, radius 14, `--surface-raised`, `--border-strong`, the modal shadow, 84px above the bottom
    and 24px from the right (the tray's spot, over the pill).
  - Phone: full width with 12px gutters, 8px under the header (where the bar was).
- Content: an 8px accent dot and the title `3 edits waiting, not sent` (15px medium), one line in `--fg-muted` 13px,
  then `Review` (outline) and `Open pull request` (primary), right-aligned; ✕ top right.
- `role="status"`, announced politely once. It never takes focus and never blocks or dims the page.
- It closes on ✕, Esc, either button, or the next page view. Clicking the page behind it leaves it up.
- Esc that ends the mode counts as Done.

### D2. The door carries the count
- Desktop pill: pencil, `Edit copy`, the staging dot, then a chip `3 edits waiting`: 24px tall, radius 999, accent
  text 12px medium on 16% accent. The pill grows left; its right and bottom stay at 24px.
- Phone pencil: an accent count badge on the top corner (18px tall, min 18 wide, the number in `--bg` 11px semibold,
  2px `--bg` ring). The staging dot moves to the bottom corner (8px, 2px `--bg` ring), so the button still says staging.
- Accessible name: `Edit copy, 3 edits waiting`.
- Shown whenever this browser holds unsent edits, on every page, before the mode has been turned on in this visit.
- Pressing the door turns the mode on as today; the bar already reads `3 edits ›`.

### D3. Sending and reviewing from the notice
- `Open pull request` opens the tray straight in C5 Submitting, mode still off: no outlines, and on desktop the page
  stays usable beside the panel. Submitted, Failed and Try again are C5 unchanged.
- `Review` opens the tray (C4) the same way, mode off. A row's `Edit` opens the editor without a target box, as
  reopening from the tray does today.
- Closing the tray leaves the mode off. Once the PR opens the tray is empty, so the count goes.

### D4. What stays as it is
- Done with an empty tray.
- Done while Submitting: no notice (the edits are already going). A Failed tray still holds its edits, so they
  count as waiting.
- The bar, the tray, C4 and C5 as the README draws them.

## Strings (in `copy strings.ts`, for `src/lib/copy/copy-editor.ts`)

- `doorWaiting(n)`: "1 edit waiting" / "3 edits waiting"
- `doorLabel(n)`: "Edit copy, 3 edits waiting" (accessible name; plain "Edit copy" at 0)
- `waiting.title(n)`: "1 edit waiting, not sent" / "3 edits waiting, not sent"
- `waiting.body(n)`: "They stay in this browser until you open a pull request or clear them." (1 edit: "It stays in
  this browser until you open a pull request or clear it.")
- `waiting.review`: "Review"
- `waiting.send`: "Open pull request" (same words as `tray.submit`)
- `waiting.close`: "Close"

## For engineering (suggested)
- The count can't wait for the overlay chunk. The provider reads `localStorage["the99.copyEdits"]` itself (length
  only; importing `edits.ts` pulls in the validator) on mount, when the mode stops, and on the `storage` event
  for other tabs.
- `stop()` takes the count at the moment of Done; count > 0 and no submission in flight shows the notice.
- The overlay renders nothing while off, so the notice and the mode-off tray live outside its `on` gate (the
  overlay stays mounted after first load; `useSubmission` already lives there).
- Notice: polite status, no focus move (focus still goes to the door, as today). Esc closes it first.
- `scratch-gen/gen_done.py` builds the boards (`repo <dir>` or `canvas <dir> blobs.json`).
