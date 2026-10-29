# Addendum R4: About after the build

`design/design_handoff_the99_about_visual/addendum-r4/` · 2026-10-29 · account 1

**Status: approved (Hugh, 2026-10-29: "Alright, this LGTM. Let's open a PR with the design handoff.").** Hugh walked the shipped About pages and sent seven notes. This addendum answers them. Where it and the R3 handoff or Addendum A1 disagree, this addendum wins. Everything else stays as drawn.

Open `R4-Main.html` in a browser; it needs only `art/` beside it. It is drawn over real Low Sun captures from `public/about/shots/amonkhet` (Decks › Your decks and Your deck). `build.py` and `canvas.css` regenerate it. There are no new tokens, motion or dependencies.

| Board | Hugh's note | Decision |
|---|---|---|
| 1 · Pins | The numbered circles cover what they describe | Pins move off the capture into a gutter, and each target gets corner brackets |
| 2 · Highlight | Some highlight boxes are cut off | The lit box is held 8px inside the frame |
| 3 · Phone tap | Tapping a number seems to do nothing on a phone | The tap docks that label above the tab bar |
| 4 · Sections | Good to know and Try it blend together; the Try it heading looks like a button; "X more below" is too subtle | Each section is a panel, Try it gets a square mark, and "more" becomes a button |
| 5 · Tool cards | It's unclear what to click; the picture looks clickable and bleeds into the text | One button per card, and the picture is framed and inert |

## 1 · Pins sit beside the capture, never on it

1. The picture gets a 30px gutter on its left, and the capture is drawn 30px narrower to make room. Each 24px pin sits in the gutter, level with its region (the region's top plus half its height, capped at 28px), and clamped 12px inside the picture's height.
2. Each region is marked on the capture with **accent corner brackets** just outside it: 4px of padding, grown to at least 20 × 20px around its centre so a tiny target (a row's 4px dot) still gets a visible mark. Arms are up to 10px long and 2px thick, at `--accent` 85%, with a 1px `--bg` edge (drop shadow) so they read on light and dark parts of a capture.
3. **No line ever crosses the capture.** If two pins would sit closer than 28px, the later one slides down the gutter, and a 1.5px stub *inside the gutter* joins it back to its region's row.
4. Lit (tapped, hovered or focused), the region's brackets go full `--accent`, the pin gets its existing ring, and the halo (§2) draws.
5. Numbers, reading order and the five-pin cap are unchanged. The same rule holds on desktop (board 1's 1300 frames).

## 2 · A lit region keeps its whole ring

The lit box is clamped 8px inside the picture frame on every side before the halo draws (`HALO_REACH = 8`). This keeps the 2px ring and its 6px glow inside the frame's rounded, clipped edge, so a region touching an edge (Recommended mix) still gets a closed ring.

## 3 · Phone: a tapped pin docks its label

1. Below the desktop breakpoint, tapping a pin lights its region **and** docks that label in a card above the tab bar (12px gutters, `--elevated`, a 1px accent-tinted border, 12px radius), with the label's number, its text and a bare ✕.
2. The page does not scroll, so the lit region stays in view.
3. Tapping another pin swaps the card. Tapping the same pin again, or the ✕, closes it and puts the region out.
4. The full label list under the capture is unchanged. Desktop has no dock: its labels sit beside the capture.
5. Rejected alternative: scrolling to the label line. On a tall capture it pushes the lit region off the top of the screen.

## 4 · Each part of a screen reads as its own block

1. **Good to know** sits on a `--surface-sunken` panel with a 1px `--border-strong`. **Try it** sits on a panel faintly lit with the accent: `--accent` at 7% over `--bg`, with a border of `--accent` at 34% over `--border`. Both have a 16px radius and 14px padding (16px at the foot).
2. Between one screen and the next there's a band: 10px of the page ground, ruled above and below with `--border-strong`, then 30px before the next screen. The screen's kicker gives its place on the page: **Decks · screen 2 of 4**.
3. The **Try it heading** drops the round arrow ring, which was the same shape as each card's press. Its mark is a square plate in Good to know's family holding a small four-point spark.
4. **"N more below"** becomes a full-width secondary button, **Show 1 more tool ▾**, under the first card. The next cards peek out under the first as two stacked edges, so it's clear there are more.

## 5 · Tool cards: one way in

1. The card has **one** press: a solid accent button with the shipped press label and →. Only the button opens the tool. The card body and the picture are no longer hit areas.
2. The picture sits in its own frame (3:2, 9px radius, 1px `--border-strong`), apart from the words.
3. **Show me** becomes a plain line under the description: **Where it is on the screen above ↑**. Pressing it lights the tool's control on the capture above, as Show me did.
4. On desktop the buttons sit on one baseline across the row.

## Copy for /copy-review

These are new strings and drafts. Everything else is already in `src/lib/copy/about-pages.ts`.

| String | Where |
|---|---|
| `Decks · screen {n} of {total}` | A screen section's kicker (board 4) |
| `Show {n} more tool` / `Show {n} more tools` | Try it's more button, in place of "{n} more below" (board 4) |
| `Where it is on the screen above ↑` | A tool card's Show me line (board 5) |
| `Close` | The docked label's ✕ accessible name (board 3) |
