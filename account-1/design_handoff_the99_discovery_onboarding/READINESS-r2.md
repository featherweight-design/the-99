# Discovery R2 · READINESS

**Verdict: 🟡 R2, for Hugh's audit.** Every lock in the brief for this round is held (`README-r2.md`, "Brief locks, held").
The calls are on `r2/Main.dc.html`. What remains: Hugh's audit, his calls on G11, G13, G18 and G19, `/copy-review` for every
new string, and the engineering items below.

## Drawn

| What the brief asks (R2 deliverables) | Where |
|---|---|
| The showcase page, 390 and desktop | `Showcase` S1 |
| A showcase tool card | `Tool-Card` T1 |
| "Try it" with and without a fitting deck | `Tool-Card` T2 (one, several, none without a door, none with a door), at 354 and 300 |
| The "?" on the deck page | `Help-Deck` H1, at 1280 and 390, closed, open and Show me |
| The "?" on Collection | `Help-Collection` H3 |
| The "?" on Shopping | `Help-Shopping` H2 |
| The reference sheet with search results and with none | H2 (results, 390), H3 (none, 390); `Reference-Search` R2 and R3, at 1280 and 390 |
| The full list | `Reference` R1, at 1280 and 390 |
| How the showcase, the reference and the banner link, with no dead end | `Links` L1, L2 |

Every phone frame and showcase picture is a real capture of staging at 390, taken read-only (G12 and G20 name the
exceptions). Every board was rendered whole before handover: no broken image, no unresolved hole, no clipped board.

## For the audit

1. **Two tabs**, Tools as the default. The letter sits behind a link.
2. **The fourteen tools and the five groups**, and the line drawn between a tool (in Tools) and a mark or state (Reference only).
3. **Try it's deck rule**: the fitting deck opened most recently, plus a menu of the rest.
4. **The ? in the chrome**: rail foot at 1280, header at 390, scrolling away with the header (G15).
5. **Screens replace chapters** in the Reference.
6. **G11.** One theme for the shipped screenshots, or all six.
7. **G18.** The banner's target.
8. **G19.** Whether to bump `ABOUT_VERSION`.

## Engineering (for the plan)

- **E8 · `screen` on every entry.** `AboutEntry` gains `screen` (a closed set: the 21 in `README-r2.md`), and for a deck's tabs `view`.
  - A test fails when an entry has none.
  - The ? reads it against the current path and the deck page's tab and view.
  - `visibleEntries` stays the one filter for switches.
- **E9 · The screenshot set.** A script captures each tool's crop from a fixture account at 390, 2x, in the default theme.
  - It writes the image beside the halo box as fractions of the frame (the fractions in `r2/ToolCard.dc.html` are the drawn ones).
  - A test fails when a tool in the registry has no picture.
  - The fixture needs:
    - a deck under 99;
    - a deck over 99;
    - a full deck with games and opponents;
    - a card over its deck's limit;
    - a friend with a spare;
    - an earlier upload.
- **E10 · Try it's deck.** Each tool has a pure `fits(deck)` over data the decks list already loads:
  - count against 99;
  - full;
  - a row over the limit;
  - a friend spare;
  - games with opponents.
  - Order by last opened; Home's `resume` already reads recently opened decks.
  - Absent switch: no tool, no card.
- **E11 · The landing.** A one-time `?tool=<id>` on the deck page.
  - It scrolls the control into view, haloes it for 2.4s through R1's anchor registry (R1 E3) and spends that tool's moment.
  - The page then strips the parameter through `mirrorUrl`.
  - Credit tools land on the tile, never the run press.
- **E12 · Search.** Over every visible entry's title, caption and keys, client side (71 entries). The ? panel and the Reference share it, which replaces `Search reads entry titles only.` (G17).
- **E13 · The ? panel.**
  - 1280: non-modal, focus moves into it on open and back to the ? on close; Esc closes.
  - 390: a modal sheet with the shell's existing sheet behavior.
  - Show me closes the panel first. A screen with no entries shows the empty line (G21).
- **E14 · The banner's Show me** points at `/about?tab=reference#new` for a returning reader and `/about` (Tools) for a new account. The banner's words are unchanged.
- **E15 · Copy.** `discovery-r2 · copy strings.ts` goes through `/copy-review` before build.

## About

No new entry (README-r2, About). The bump is Hugh's call (G19).
