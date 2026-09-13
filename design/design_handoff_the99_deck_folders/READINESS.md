# READINESS — deck folders (R1)

**Self-assessed: 🟢 green, with one Product call I would like made and one sequencing note that
matters this week rather than next.**

Everything §3 asks Design to call is called and drawn, and §5 is answered with arithmetic against
the shipped component rather than against the drawing the brief was verified on. Nothing here is
blocked on a decision I cannot make.

## The one thing the chassis build needs, and it needs it now

**Branch (b). The chassis needs no slot, no panel, no chip, no clear scope and no density pass.**
The single amendment is at the call site: `resultLine` takes the selected shelf's deck count as its
denominator instead of `decks.length`. `filter-chassis.tsx` is untouched.

This can reach the chassis team as one sentence, and it should, because the alternative reading —
a sixth control in a row audited at five — fails by 108px with search already on its floor, and
that is the kind of thing discovered in a build review rather than in a brief.

## What is green

- **§5, with its arithmetic shown.** 894px of row, 797 occupied, 97 spare, a folder trigger at rest
  costing exactly 97 and costing ~205 the moment a folder is chosen. Every padding, gap, pip size
  and span cap in that table is a literal from the shipped files.
- **The (a)-is-wrong argument that does not depend on pixels at all:** `listFolders` returns empty
  folders at `deckCount: 0` and this route disables zero-count rows, so under (a) a new folder is
  born unclickable and the first deck can never be filed into it.
- **§3.1** — its own pattern, a parameter rather than a route, with the reason the route was
  rejected (an identical refetch and the loss of filter state) read from `page.tsx` and
  `decks-view.tsx` rather than assumed.
- **§3.2** — five kinds of nothing, one occupant, a strict ladder, and the finding that the brief's
  (i) is not an empty state. S2 and S3 drawn.
- **§3.3, §3.4, §3.5** — every act inside a panel the app already ships, each with its reachable
  refusals named. Rename drawn, so it becomes one function on a merged, probed layer.
- **Copy.** Every string, with reuse from `refresh.ts` and `filter-chassis.ts` marked as reuse.
- **Both widths**, switching at 1000 with everything else.

## The Product call I want made

**§3.6 — the folder is not on the tile face.** I have ruled it off and named where the fact lives
instead (the Move row, and that control's accessible name). The counter-argument is real: on
**All decks** the grid is unscoped, so a reader looking at twelve tiles cannot see which of them are
filed. I rejected drawing it there because the only row with space is the one carrying commander
and colour, and card-surfaces already ruled that row must not give — but "add a fourth line to the
tile" is a Product trade about tile height, not a design impossibility. If Product wants it, the
cheapest honest form is a mono clause on the detail row *on the All decks shelf only*, and it costs
that row's existing figure whenever both would print. I would ship without it and watch.

## Sequencing

**This lands after the chassis's `/decks` slice, and it must not land inside it.** The amendment to
the denominator is one line; the shelf line, the sheet, the move mode, create, rename and delete are
a separate PR against a frame that has already been reviewed. Mixing them makes the chassis slice's
review about folders.

**`renameFolder` is the only new query** and it has no dependency: same validator, same unique
index, same user scoping as `createFolder`.

## Still open, not blocking

### Many folders is drawn to two lines and then stops
Segments wrap to a second line and past that the line scrolls horizontally. A player with fifteen
shelves gets a scroller at the wide form, which is honest but not designed — I have not drawn it,
because a dozen decks is the brief's reader and fifteen shelves is not that player. Worth watching
in the first build rather than designing now.

### The counts can disagree with the grid for one frame after a move
Named shelves count from `listFolders` (a server read) and the grid re-filters the loaded list
client-side, so a move updates the tile immediately and the segment's figure on the next read.
`moveDeck`'s own contract makes the write authoritative, so this is a refresh question rather than a
correctness one — but if it shows, the fix is to adjust the two affected counts optimistically, not
to re-read.

### Multi-select is a real gap, filed rather than drawn
A player filing eleven decks does it eleven times. The pattern exists (`top-off-list.tsx`'
selection head), it changes no decision in this handoff, and it is the obvious slice B.

### `Unfiled` is a label, not a folder, and one string has to carry that
It appears as a segment, as a sheet row and as a move destination, and in all three it means
`folder_id IS NULL`. One shared string, stated in the copy file. If it ever gains an id it stops
being the residue and the ordering ruling goes with it.

## What I would cut to ship sooner

**Rename.** It is the only item requiring a new query, it is the one act with no consequence for
anything else in the round, and a folder created with a typo can be deleted and remade without
losing a deck — which is precisely what decision 2 of the brief guarantees. Cutting it leaves the
level, both directions of move, create, delete and all five states entirely intact.

I would **not** cut the shelf counts. They are what makes the level legible without opening
anything, they are what the result line's new denominator is audited against, and they come free
from a query the round has to add anyway.
