# States: First-run onboarding (R1)

This is brief §4's list: every state at 390 and 1300 where the brief asks for both. The frame ids are the
canvas badges.

## §A Home checklist

| State | Condition | Frames | Step 1 | Step 2 | Step 3 | Foot |
|---|---|---|---|---|---|---|
| A1 Unread | `uniqueCards === 0` | 1a · 1b | live: fan and two buttons | locked: "Pick a commander or import a deck" / "Unlocks once a collection is read" | locked: "Unlocks with a commander" | none |
| A2 Reviewing | A1 plus a preview in hand | 5a (390) | live: review embedded, fan hidden | locked | locked | none |
| A3 Read, no deck | `uniqueCards > 0 && decks === 0` | 1c · 1d | done row plus Replace | live: primary and secondary, `buildableFrom` | locked: "Unlocks with a commander. An imported deck arrives built." | none |
| A4 Has a deck | `decks > 0` | — | the checklist unmounts and Home renders normally | | | |

Kicker: A1 and A2 show `step(1, 3)`, and A3 shows `step(2, 3)`.

## §B Chrome while locked (A1, A2)

| Element | 1300 | 390 |
|---|---|---|
| Visible reason | page line under the H1, plus `LOCKED` at the well's foot | bracket over tabs 2–5, `ADD A COLLECTION TO UNLOCK` |
| Grouping | sunken well around slots 2–5 | the bracket |
| Before reaching | dim slots in `--fg-locked` | dim slots in `--fg-locked` |
| Hover / focus | the note opens (2a) | — |
| Tap / click | the note opens (2a) | the slot is outlined and the note rises (2b) |
| Note dismiss | Escape, blur, pointer-out | tap outside, the slot again, Go to step 1 |
| Go to step 1 | focuses Upload a CSV | scrolls to and focuses Upload a CSV |
| Bar height | — | 88px (`--tabbar-h`, first run only) |

When the lock lifts (A3): the well, the bracket, the page line and the notes unmount; there is no
transition, and `--tabbar-h` returns to 74.

## §C Issues sheet (phone)

| State | Frame | Height | Notes |
|---|---|---|---|
| C1 Short list | 3a | measured from the longer tab's content (488 in the frame) | held for the visit |
| C2 200+ rows | 3b | 86vh cap (726 at 844) | virtualised above 150, about 11 rows visible |
| C3 Filtering | — | held | the count uses `--fg-body`, or `--warning` at 0, as desktop |
| C4 One tab empty | — | held | the zero-note is hoisted, as desktop E/E2 |
| C5 Drag | 3b dashed line | — | the handle and title block only; 80px dismisses |

## §D Replace confirm (replace only)

| State | 1300 (4a) | 390 (4b) |
|---|---|---|
| Idle | modal 520 with the figure pair; focus on Keep current | sheet with the figure pair; primary on top |
| Pending | primary reads "Replacing…"; both buttons disabled; Escape and backdrop refused | same |
| Error | 13px `--danger` line under the body, the one place red appears | same |
| First import | **no dialog**: Continue commits (engineering, §5) | same |

Replace page note (4c): shown only when `currentCardCount > 0`.

## §E Phone review

| State | Frame | Header | Bar | Cancel |
|---|---|---|---|---|
| E1 Embedded (first run) | 5a | none; the card shows the title plus a `REVIEWING` line | the card's foot, in flow | back to step 1's buttons |
| E2 `/collection/replace` | 5b | "Review import" plus the filename, no ‹ | sticky at `bottom: var(--tabbar-h)` | back to the upload entry |

## Tokens used

These are existing tokens only: `--surface-sunken`, `--surface-inset`, `--surface-rail`,
`--surface-raised`, `--border`, `--border-strong`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`,
`--fg-locked`, `--fg-disabled` (the numeral boxes only), `--accent`, `--success`, `--warning` and
`--danger` (the issue data and the error line only). No new tokens.
