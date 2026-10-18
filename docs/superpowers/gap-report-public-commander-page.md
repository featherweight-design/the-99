# Gap report: the public commander page (F3 PR 3)

Design: `design/design_handoff_the99_public_pages/` (R1), boards B1 to B4 and C4's commander fragments. Table:
`docs/superpowers/design-tables/public-commander-page.md` (B-01 to B-22, State Coverage). Contact sheet:
`docs/superpowers/inventories/f3-commander-page.json`, signed out, at 390, 768, 1024 and 1300, on a scratch branch of
local-dev with each state set on a real commander (Zimone B1, Sai B2, Ashling B3, Dina B4, Krenko rank blank, Kozilek both
blank, Esika two-faced).

**Verify (Agent 2): 0 visual gaps, 0 state gaps.** 22 of 22 row groups match and all six states are reachable.

Found by comparing the build's shots to the boards rendered from disk, and fixed before the verify:

- Text the boards leave at `line-height: normal` (kicker, type line, identity label, EDHREC head row and labels) inherited
  1.5, which pushed the left column and the sections about 4px down. Each is now `leading-[normal]`.
- The boards' boxes are content-box: most-played rows sat 46px apart against 47, similar tiles were 46px tall against 48,
  and the two notes were 36px narrower than drawn. The rows are `min-h-[47px]`, the tiles `min-h-[48px]`, the notes
  `box-content`.

Decided where the boards are silent (not gaps):

- Lists the loader returns empty unmount, heading included: themes (103 of 3,467 `ok` commanders on staging have none),
  brackets (27), most played, similar (1).
- Themes are capped at 8 by count (staging median 37, at most 244); most played and similar at 6, as drawn.
- All five bracket rows are drawn whenever any count is non-zero, scaled to the largest.
- A colorless commander's identity line is the word `Colorless` with no pips; a commander with no image washes its phone
  band in its identity gradient at 18%, as the card page does.
- The absent note's em dash is a sentence break (READINESS audit finding 9, copy review).
