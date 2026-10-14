# READINESS — about page (R3)

**Self-assessed: 🟢 green.** Every finding in the audit is answered in the artifact. What remains
is one process change that is Product's to make, and three things I could not verify from source.

## The audit, line by line

| Finding | Status |
|---|---|
| 2.1 Impossible denominator `41/65` | Fixed — `27/40`, and the lane caption now states the 40/100 rule |
| 2.2 Status plate draws a JSDoc column | Fixed — badge, bar, one figure; the sentences moved into four key lines and the caption says whose words they are |
| 2.3 Availability missing `soft` | Fixed — four numbered states, `1 in a brew` second, desktop and phone |
| 2.4 Two tokens wrong | Fixed — `--avail-hard-fg` and the over pair applied at every diamond, legend included |
| 2.5 Wrong four roles | Fixed — Ramp / Card draw / Removal / Board wipes at 10 / 10 / 8 / 3 |
| 3 · Eight missing entries | All eight drawn. 32 entries, 16 inset / 16 plate, chapters 7 / 6 / 10 / 9 |
| 3 · Proxies and reservations deferred | Overrule taken — both `since: 1`; the §4 artboard now marks an illustrative entry and labels it |
| 4 · Copy file contradicts the canvas | Regenerated to the canvas entry set with `caption`, `keys[]`, `width`, `chapter`, `since` |
| 5 · No add-one-entry path | §8 — blank template plus a worked example |
| 6 · The rule the page needs | **Not mine to close.** Named on the artboard as Product's, in all three places |

## Corrected again after screenshots (R3.1)

You sent eight screenshots of the shipped UI and **nine figures were wrong**. All nine are re-cut
from the screenshots rather than from the copy files:

- **Collection** — real toolbar (name search, five orbs, Type / Set / Availability / Sort), removable
  chips, `Showing 34 of 2,805`, the **By set** grouping toggle and the icon view switch. My version
  invented a Grid/Rows text toggle and a set-count footer.
- **Set completion** — the real header stack (`162 / 208 · 78%`, base run vs extras), the
  **cost-to-complete panel** with `Send 46 to ManaPool` and the never-stocked exclusion, and
  `321 cells · 171 yours, 150 missing`. `FOIL` / `BY NAME` badges are gone; they were not on screen.
- **Discover** — the real row: rank, art band, `104 / OF TOP 313 OWNED`, role chips
  `RAMP 97/10 · DRAW 270/10 · REMOVAL 180/8 · WIPES 23/3`, `52,507 decks tracked`,
  `9 of its top cards new to you`. My order-menu figure was replaced entirely.
- **The deck page** — **no curve, colours or cost**; I invented those. It now draws the real header
  (art, `Card details`, title, commander · guild, status, bar, `Update from a list`, `Export`,
  `v1 · committed`) and **four tabs: Your deck 99 · Consider 80 · Games · Versions 1**.
- **Role grouping** — replaced with the real **Recommended mix**: five cards, `rec N`, `consider →`,
  and `Why these numbers?`. LAND is back here at `35 / 37 · rec ~37`, because the deck page does
  carry it even though it is not one of the four scored roles.
- **Decklist marks → rows.** The tile plate is gone. Four real rows: ownership dot, name, circled
  copies, one availability mark (`1 in a brew`, `short 1`, `$`), remove. Annotated **by column**
  rather than by corner — which also future-proofs the entry while the markers are being revised.
- **Log a game** — promoted from inset to plate and drawn as the real form: Result, Pod size 2–8,
  the eight axes **with their sub-labels on both sides**, the note field and its
  "quoted, never paraphrased" promise.
- **Themes** — the names are **Low Sun, Neon Rain, Canopy, Oil Haze, Witching Hour, First Frost**,
  with the plane as subtitle. I had used plane names as the labels, which is not what a reader picks.
- **Ready to build** — `68 or better`, matching the screenshot.

The phone plate in §5 follows the rows change, and the copy file was updated for all nine.

## Unverified

**The per-theme avail hexes.** The audit gave one block: `--avail-hard-fg: #D9975C`,
`--avail-over-fg: #C46857`, `--avail-over-border: #752619`. **I applied those three to all six
themes**, because I do not have the other five blocks. Structure is right everywhere; five themes
are carrying Amonkhet's hues. One paste from `globals.css:66-70` fixes it, and nothing else moves.

**Card markers are mid-revision.** You said so, and the rows figure is drawn from the two row
screenshots. **Whatever the marker set becomes, the entry's structure should survive it** — the key
is by column, so a changed glyph changes one cell rather than the figure. Worth a second look at
that entry specifically once the revision lands.

**Three figures still have no screenshot.** Deck import, Put back and the export dialog are drawn
from their handoff copy files, not from the running app. Given nine of nine were wrong this round,
assume these are wrong too until someone checks them — they are the obvious next screenshots.

## What I would still cut

Unchanged from R2: **the sticky index.** It is the only behaviour in the design and the only thing
on the page a pointer can touch. The in-flow contents list is complete without it, and at 32
entries the phone read is about fourteen screens either way.

## One note on length

The audit said no entry should be cut to shorten the page, and then added eight. Both are right,
and the result is a page that is now **five and a half screens at desktop**. I have not tried to
compensate — compressing captions to claw back height would trade the thing that works for the
thing that measures. If length becomes a real complaint, the honest lever is splitting chapter 03,
not tightening prose.
