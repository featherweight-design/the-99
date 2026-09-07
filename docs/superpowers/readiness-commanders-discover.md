# Readiness verdict — /commanders and /discover (two lanes)

**Handoff:** `design/design_handoff_the99_commanders_discover/` (R4)
**Spec:** `docs/superpowers/specs/2026-09-07-commanders-two-lanes-design.md`
**Date:** 2026-09-07

## Verdict — 🟢 Green, sequenced behind the UI refresh

Every Design-owned gap raised across R1–R4 is closed. What remains is a sequencing constraint and a
short list of engineering corrections, both recorded below. Design's own `READINESS.md` self-assesses
Amber on three items; all three dissolve against the repo, and the reasons are in the table.

## Design's own blockers, resolved

| Design's item | Resolution |
|---|---|
| Red 1 — the spec is not in the design project | Provenance artifact. The brief stated the nine locked decisions correctly and the handoff honours them as stated. Diffed against the spec here: no conflict. |
| Red 2 — `filter-bar.tsx`, `facet-strip.tsx`, `discovery-row.tsx` unreadable | Same artifact. Row anatomy traced from the handoff canvases is sufficient; the spec already replaces `FilterBar` outright. |
| Red 3 — the owned-and-built commander is on neither lane | Already ruled: a commander drops off `/commanders` once you build it, and the deck page is the way back. Engineering item, not a design gap. |
| Amber 2 — does `N decks tracked` exist? | Yes. `commander_support.deck_count` (`src/db/schema.ts:356`), populated at `src/lib/edhrec/index-build.ts:81`. |
| Amber 3 — discover's third order option | Decided below. `released_at` (`src/db/schema.ts:18`) confirms *Recently released* is buildable. |
| Amber 0 / gap 3 — greying reverses `commanders_plane`'s absent-modifier ruling | Correct as drawn. Locked decision 4 says every control renders, greyed rather than absent. The reversal is intended. |

## Decisions taken at readiness

1. **Sequencing — the refresh lands first.** `design/design_handoff_the99_refresh/` and this package
   share exactly one `nav.tsx` edit. The refresh ships its four-item icon rail and retires
   adjudication #1; `/discover` then adds one entry to the already-refreshed `ITEMS` array and the
   `NavItem['href']` union. No throwaway fifth-diamond frame is drawn or needed. **This package is
   Green but blocked on that merge for its chrome work only** — the racks, rows, sheet and states
   depend on nothing the refresh owns.
2. **Reading order — leading edge (`D2`).** Search, then colours with the match modifier, then score
   against, then order. `I1` (trailing) is not built.
3. **Discover's third order option — `Recently released`.** Backed by `released_at`. The `colour`
   key is deleted from the copy file rather than shipped dark.
4. **Defect 2 is swept up by the rebuild, not patched separately.** The exact-identity note currently
   prints a figure with the name search folded into it (`filter-bar.tsx:514`, `:602`, composed at
   `discovery-view.tsx:96-101`). A standalone fix would edit a file the rebuild deletes. The spec
   already pins the regression test — *notes count only their own control*.

## Corrections carried into the build

These are engineering findings against the handoff's prose. The frames are right; the notes are not.

1. **The engineering note names the wrong files.** README says "`facet-strip.tsx` and
   `discovery-row.tsx` are read, not edited." Both lanes render `RecCard`
   (`commanders-view.tsx:345`, `discovery-view.tsx:702`), and `rec-card.tsx:69` delegates the
   discovery arm to `DiscoveryRow`. The row redraw therefore edits **`rec-card.tsx` and
   `discovery-row.tsx`**; `facet-strip.tsx` is the only genuinely read-only file, and
   `rec-card.tsx` is never named in the handoff at all.
2. **The `Row — phone` component note is stale.** R4's READINESS claims the note was split into one
   entry per lane; it was not. The single shared entry still specifies a `32×45 thumb`, retired by
   the R3 thumbnail rule, and a `fit / FIT / delta` right column, retired for discover by R3's
   decision 5. **Build from frame `E6` and decision 5b**, not from that table row.
3. **`discovery-row.tsx:358` stays.** Its comment — *"No `/100`, no FIT stack: discovery does not
   blend"* — now agrees with the design rather than contradicting it, after R3 replaced the discover
   fit block with the three real counts.
4. **Gap report numbering.** Two items are numbered `5`.

## Accepted as drawn

- Both racks, desktop and phone, in all six states (`STATES-filter-rack.md`).
- The row: art bleeding from the leading edge, every shipped figure retained on the owned lane, the
  synergy and fit graphs in the theme accent ramp, header CTAs removed from both lanes.
- The discover row's figure column: support over EDHREC total with a single-fill ratio bar, deck
  count, novelty count. No blended score and no delta — recommendation 5a is accepted, and `Best fit`
  ranks on the support ratio as a sort key rather than a displayed score.
- The thumbnail rule: no lane shows a thumbnail at rest at any breakpoint; `I3` is the contingency
  frame if a printing is ever named on the row, in which case the thumb is mandatory.
- The four calls: greyed colour match that remembers its segment, chip overflow on one line with a
  dashed `+N`, the sheet winning to 1024px, and the brass count badge over controls-off-default.
- The five-item nav, measured at 390 / 375 / 360 / 320 (`CHROME-five-item-nav.md`).

## Copy

`commanders-discover · copy strings.ts` is production-final and goes to `/copy-review` as a separate
pass. No copy item contributed to this verdict.

## Not covered by the handoff

Carried as known gaps, none blocking:

- Real mana symbols instead of colour squares. Scoped by Design at about a day, with a recommended
  size split (flat squares below 16px, true symbols above). Not drawn, no assets in the project.
- The transition when a discover commander becomes owned. The row should leave the lane on the next
  collection read; no receipt or explanation is drawn.
- Loading and skeleton states for either lane. Both inherit the shipped list skeleton, neither
  re-rendered against the new rack.
- Keyboard walk frames. The a11y model is stated but no ordered focus frames are drawn; the rack is
  ordinary tab order and `collection_filter` covers the sheet.
- Theme rendering. Drawn in the refresh's brass palette only; the six R6 themes are not re-rendered.
- The 320px tier is drawn by measurement, not seen on a device.
