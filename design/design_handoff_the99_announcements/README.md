# The 99 · Wizards announcements (account 2, 2026-10-29)

Three surfaces, all stateful: an announcement row on Home, a per-kind control in Settings, and an early, view-only
decklist on Precons (Announced). R1b adds Hugh's three notes, two of which reach past this feature: Settings' boxes,
the Announced `new` mark and the link-out icon.

Source of truth: `docs/superpowers/design-briefs/2026-10-29-wizards-announcements.md` (#2373). Its "Hugh's rulings"
are held on every board; "Not in scope" stays closed.
Canvas: https://claude.ai/artifact/P6BAUrJjGasgDh9cTYKYxu
Status: **APPROVED by Hugh 2026-10-29** ("This all LGTM"), with every recommended option (A) taken. READINESS: Green.

## Start here

| Board | For |
|---|---|
| **`Main.dc.html`** | The flow, R1b's notes, the seven calls, call 1's three shapes, gaps, the board index. Start here. |
| `Home-Rows.dc.html` | 1 · The three kinds among shipped rows, seen and unseen, 390 and 1300. |
| `Row-States.dc.html` | 2 · Long title and summary, missing or failed hero, 3 of 5 lists then all lists, dismissed. |
| `Lead-Story.dc.html` | 3 · A decklists post and a Secret Lair post leading Home; their pushes. |
| `Offer.dc.html` | 4 · The "Pick what else" line, closed and opened; a kind switched off and the quiet line. |
| `Settings.dc.html` | 5 · All on, one off, push unavailable, a failed save, 390 and 1300; kind names. |
| `Announced.dc.html` | 6 · Early lists as precon tiles in the set's block; tiles and rows; 390 and 1300. |
| `Early-List.dc.html` | 7 · The view-only page; released but waiting; unmatched lines; no collection; loading. |
| `Release-Arrival.dc.html` | 8 · The release list replaces the early one. |
| `R1b-Settings.dc.html` | 9 · Settings' Notifications: In app and Push columns (A, built); B and C for reference. |
| `R1b-New-Mark.dc.html` | 10 · `new` in the meta line (A, built); B for reference; today's tag. |
| `R1b-Link-Icon.dc.html` | 11 · The box-and-arrow link-out icon, app-wide. |
| `STATES-announcements.md` | The state matrix per surface. |
| `READINESS.md` | Green, with the build list. |

Orange dashed outlines on the boards mark what is new against the shipped page; the app draws nothing there.
Frames labelled B, C or "Today" are for comparison only.

## Calls (all approved)

1. **Hero shape.** The hero is cropped to the shipped 46x64 slot: radius 4, centre crop, no card shadow (it must not
   read as a card). Missing or failed hero: a plate in the same box with a post glyph in `--fact`; never a broken
   image. The title never clamps; the summary clamps at two lines.
2. **Lead story.** Secret Lair and Commander decklists can lead; Wizards news never does. `LEAD_PRIORITY` becomes
   spare-request, trade-match, combo, price-drop, **commander-decklists**, new-precon, new-set, **secret-lair**. In the
   lead the hero goes landscape: on a phone 164px tall across the top of the band at −1.5°; from `md` 272×153 at −3°.
3. **The offer.** While the reader has never chosen, What's new ends with one line: "Pick what else you want to hear
   about. New sets, price drops, trade matches and more." with **Pick ▾** and a ✕. Pick opens the shipped boxes in
   place with Show these; ✕ saves an empty choice and the line is gone for good.
4. **The decklists row's presses.** Both: "See the lists ›" (in-app, to the set's block in Announced) first, "Read the
   post ↗" muted. On a phone they share the action line; **from `md` they stack** in the row's right column,
   right-aligned, in-app on top (Hugh, R1b). A push of the post opens the post.
5. **The early mark.** The words "early list" in `--fact` ink on the tile's sub-line (and the row's line 2), **no box**
   (R1b). The tile keeps its solid edge (dashed in this group means "nothing to open"). The page says it in a dashed
   `--fact` band and the eyebrow "Early decklist · view-only".
6. **A kind switched off.** Precons is unaffected. The switch governs Home rows and pushes only.
7. **Kind names** (drafts for `/copy-review`):

   | Kind | Settings name | Settings line | Row kicker |
   |---|---|---|---|
   | `secret-lair` | Secret Lair drops | When Wizards announces a Secret Lair drop. On from the start. | Secret Lair |
   | `commander-decklists` | Commander decklists | When Wizards posts a Commander set's decklists. On from the start. | Commander decklists |
   | `wizards-other` | Other Wizards news | Everything else Wizards announces. On from the start. | Wizards news |

   The three rows sit after New precons in Settings.

## R1b · Hugh's notes (approved)

- **R1b-1 Settings, In app and Push columns.** Hugh: the boxes bookending each row don't say what they are, the
  in-app one least of all. The section head becomes **Notifications**. Each kind's name and line run full width on
  the left; its two boxes sit side by side on the right under mono column heads **In app** and **Push** (52px each,
  the shared 18px `Checkbox`, each cell its own 44px press with an `ariaLabel` such as "In app: Secret Lair drops").
  The row's text no longer toggles a box. The device row ("Push on this phone") leaves the list for its own sunken
  band above the column heads, its box at the band's right. Push unavailable: the Push column and its head leave; In
  app keeps its head. Foot: "In app: a count on Home and the list. Push: only to devices you turn on, never 9pm to
  9am. No email, ever." This reworks the shipped `news-section.tsx` for every kind, not only the new three.
- **R1b-2 The `new` mark on Announced.** Hugh: the boxed `new` floats beside the set's name and "in 15 days". No box:
  "new" in `--accent-text` leads the set's mono meta line ("new · Nov 13, 2026 · in 15 days" on a phone; "new · FDC ·
  Nov 13, 2026 · in 15 days · 3 of 5 lists so far" from `md`), the rows view's third line, and the group head ("1 set
  · new"), as the precon tiles already say "new · you own…". Replaces `NEW_TAG` in `announced-group.tsx`,
  `announced-parts.tsx` and `announced-row.tsx`.
- **R1b-3 The link-out icon.** Hugh: the ↗ glyph is too large; the box-and-arrow is standard. One icon (24 grid,
  round caps and joins, stroke 2.4, 0.72em square, on the baseline, 0.3em after the word and bound to it) replaces
  every ↗ in the app, in the glyph's current colour. About 30 places, some inside copy strings.

## Gaps for engineering

- **G1 Quiet line casing.** `Quiet` lowercases kind names, which would print "secret lair". Each kind needs its own
  inline form ("Secret Lair drops", "Commander decklists", "Wizards news").
- **G2 Early seen key.** Early lists use `early:<code>`, apart from `lists:<code>`, so seeing them never hides the
  release news. The block's and head's "new" light again when a further list lands (3 → 5).
- **G3 Unmatched lines.** Lines the catalog can't match are kept, by the post's words, in a last group "Not in our
  catalog yet": dashed rows with no dot, pips or press. They count toward M, never toward owned. When the card
  reaches the catalog the row moves to its type group. The own band keeps today's line ("2 cards in this precon
  aren't in our catalog yet, so 66 are listed").
- **G4 Early list address.** Its own route (e.g. `/decks/precons/early/<code>/<slug>`); once the release list lands it
  redirects to the release list's page.
- **G5 Fixtures.** "Foundations Commander" (FDC, Nov 13, 2026) and its five lists are stand-ins drawn from the precon
  grid, not a real announcement.
