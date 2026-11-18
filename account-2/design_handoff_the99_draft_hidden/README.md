# Draft deck hidden row · R1 (issue #2988)

Account 2, drawn 2026-11-18. Canvas: https://claude.ai/artifact/ACC2HdhGJAYZyW6qc1kXCQ (Main = phone deck header, Desktop = /decks tile + /settings landing).
Status: **awaiting Hugh's review**. No handoff PR until approved.

Principle (Hugh, 2026-11-18): don't give the player something they can't do; if they can't, tell them why.

## The change

In `DeckCardOverflow` (`src/components/decks/deck-card-overflow.tsx`), when `hideLocked` is true (Settings' rules hide the deck, its own flag is off), the ticked + locked "Hidden from friends" `<Link href="/settings">` row goes. In its place, at the same spot above Delete:

1. **Why block**: not a press. `Hidden from friends` (row type, `--fg`) over one line in 12.5px phone / 12px desktop `--fg-muted`, wrapping in the 186px panel. Padding 10px 13px 11px, hairline above like every row.
2. **One row per way out the player really has**, each a normal menu row (38px desktop, 44px coarse):
   - `Commit as v1 ›` in `--accent-text`, weight 500, to `/decks/{id}/changes?commit=1`. Drawn **only** when the deck can commit now: the same test as `offerFirstCommit` in `builder-shell.tsx` (no version, built === body size, nothing unresolved).
   - The Settings row: label + mono sub-line `In Settings ›` (the shipped locked row's two-line shape), to `/settings#settings-decks`.

| Deck (why Settings hides it) | Line (DRAFT copy) | Rows |
| --- | --- | --- |
| Draft, full and resolved | It’s a draft. Friends see it once you commit it. | Commit as v1 · Show drafts to friends |
| Draft, short or unresolved | It’s a draft with {n} of {size} cards. Friends see it once it’s full and committed. | Show drafts to friends |
| New (no cards) | It has no cards yet. Friends see it once it’s full and committed. | Show drafts to friends |
| Building | It’s short, {n} of {size} cards. Friends see it once it’s full again. | Show decks I’m building |
| "Friends can see my decks" off | Friends can’t see any of your decks. | Show my decks to friends |
| Hidden on its own (flag) | unchanged: shipped checkbox row, clearable | — |

`seeDecks` off is tested first (it hides every deck whatever its status). `{size}` is the body size (99, or 98 with a partner).

## Settings landing

`/settings#settings-decks` scrolls Your decks into view and washes the toggle the row named (`--elevated` fill, `--border-strong` inset ring, radius 8) for 2s, then fades. Draft/New/Building rows name **Include drafts and decks I’m building**; the all-off row names **Friends can see my decks**. Pass which with a query or hash (e.g. `#settings-decks-unfinished`). Nothing flips from the deck menu: Settings stays the one place for account rules (Hugh's rule).

## Header mark and /decks glyph

Unchanged. The glyph and header chip mark only a deck hidden on its own (friend decks R2), so they don't imply the locked state this issue is about.

## Gaps / calls for Hugh

- **G1** Show drafts: link to the Settings toggle (drawn, recommended) vs flip it in place from the menu with an undo toast. Flipping from a deck menu changes every deck, so it is drawn as a link.
- **G2** Keep it hidden later: should the why block also offer the per-deck flag ("Keep hidden after it’s committed")? Not drawn; today a Settings-hidden deck can't take the flag.
- **G3** Copy is DRAFT for /copy-review (`socialCopy.hideDeck`: retire `locked`/`lockedAria`, add `why.*` and the action labels).
- **G4** a11y: the why block is plain text inside the panel (the panel is not role=menu); the rows' accessible names should carry the reason, e.g. "Show drafts to friends, in Settings".

## Files

`Main.dc.html`, `Desktop.dc.html`, `canvas.json`, `art/`, `shot-*.png` (renders), `scratch-gen/` (`dh.py` boards on the friend decks kit; `python3 dh.py out`, then `prev.py` + `node render.js` to preview).
