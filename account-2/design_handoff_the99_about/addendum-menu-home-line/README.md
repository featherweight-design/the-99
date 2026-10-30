# About · the menu and Home line, and calls on what shipped (addendum)

Account 2, 2026-10-22. Status: **approved by Hugh, 2026-10-22** (R1), handoff PR #2196. Addendum to `design/design_handoff_the99_menu_home/`
(#2174) and `design/design_handoff_the99_deck_messages/` (#2170). Source of truth: the plans on main
(`2026-10-22-menu-home.md`, `2026-10-21-deck-messages.md`) and the PR bodies of #2186, #2183, #2188, #2190 and #2191.
Checked against main at `653499e`. Canvas (account 2): https://claude.ai/artifact/X32ArXv2R5NssZfiX9fFp1

## Boards

| File | What |
|---|---|
| `Main.dc.html` | The seven calls with their verdicts, the entry's picture call, locator, stale entries, gaps |
| `E1-Whats-new.dc.html` | The entry opened in the shipped Reference at 1300 and 390 (Neon Rain), its picture in six themes, its line switches |
| `Friend-Page.dc.html` | Call 2: the privacy line, the four empty states, a spare's press opening card details (Low Sun) |
| `Deck-Calls.dc.html` | Calls 3 to 6: over the 99 as the next step, the seed's pass sheet, A10, A11 (Low Sun) |

`about · menu and home line.ts` holds the entry object, the edits to shipped entries and the locator.

## The calls

1. **About entry: drawn.** One entry, `whats-new`, *Home's news, and the new bar*, on Home, chapter 04, following
   `HOME_FEED_ENABLED` and **replacing `ready-to-build`** while it is on (Ready to build leaves Home). Commanders' tabs,
   Friends in the bar and Settings' spares are caption lines under their own switches. The halo is the **lead story**:
   always on the first screen, the top of What's new. Not picked: the What's new head (on a phone it lands at the bar's
   edge) and the bar. Words are placeholders for `/copy-review`.
2. **Friend page: ratified as built.** The privacy line sits under /friends' name line in 11px mono `--fg-faint` and
   leaves while the name is edited. Empty states use the app's dashed box (Spares has two: not shared with you, and
   none to show; Wishlist; Decks). A spare is a press that opens the shipped card details, sheet at 390, modal at 1300,
   with the friend's spares as its siblings.
3. **Over the 99 as the next step: ratified.** Title in `--fg` as the next step (`--avail-over-fg` measures 4.24 to 4.49
   on the 7% tint; re-measured here from `globals.css`), red off it. The `+N` tile keeps the red.
4. **The seed's pass sheet: ratified, plus one line.** Done only. The foot adds the ledger's own *Clear all auto
   reverses it* (`ledger.seedReversal`) in mono `--fg-faint`: centred above Done at 390, in Undo's place at 1300. Not a
   press. This is the one change engineering follows.
5. **A10: ratified.** History only when the start added cards (it links that ledger entry). Otherwise *You own N of its
   99.* with no link.
6. **A11: ratified, no mark.** STATES was right; the board's **?** was a Design slip.
7. **Credits erratum: ratified.** "Running a deck's Analysis" is not a spender; `buying-credits` already leaves it out.
   This addendum supersedes that line in the bracket-reach `aboutCredits` string.

Also seen and left as built (not in Hugh's list): the pass sheet's desktop modal is centred (#2188); a friend's deck
status uses `friendPillStyle` over the shipped `statusPillStyle` (#2193).

## Gaps

- G1 · Three caption lines need two switches at once; `AboutLineSwitch` takes one. Let it take a list (all on).
- G2 · The entry follows `HOME_FEED_ENABLED`; with the place on and the feed off there is no entry for the tabs.
  Accepted: the line turns on together.
- G3 · Recapture every screen at PR 8: the bar changes on every frame. `home` needs the feed on, an unseen item to lead,
  and no welcome strip. The boards' picture is Home B rendered per theme from the handoff's own pieces, standing in.
- G4 · `about-rebuilt` names Home as a Help me choose door at zero decks: confirm with the feed on.
- G5 · The spare-request kind is not named; it ships with its own round.
- G6 · `since: 17`, one `ABOUT_VERSION` bump at PR 8.

## Reading the boards

Exports are committed unchanged. Images are canvas assets (`/_blob/…`), so they show on the canvas and not from disk.
`scratch-gen/` holds this round's generators; they import the kits in the launch-end batch's, menu-home's and deck
messages' `scratch-gen/` folders (account-2), and `frames.py` renders the six Home frames from menu-home's pieces.
