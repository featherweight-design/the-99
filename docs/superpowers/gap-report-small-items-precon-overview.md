# Gap report: small items item 5, a precon's Overview carried into the deck

Branch `small-items/precon-overview` (rebased on main). Handoff `design/design_handoff_the99_small_items/`
README §5, board `Precon-Overview.dc.html`, READINESS item 5. Property table:
`docs/superpowers/design-tables/small-items-precon-overview.md` (enumerated from the handoff before the
implementation was read, then verified row by row).

Walked 2026-10-28 on the Neon scratch branch `br-restless-sea-a6xihgrv`, migrated to 0185. The walk ran at
390x844 (touch, DPR 2) and 1300x900. It seeded two staging rows from `precon_synopses`
(`WretchedRanks_FDC`, `WorldShaper_EOC`, contract 12, `labels`) and filled their readings with
`db:build:precon-overviews --readings-only`. No page had horizontal scroll at either width.

Files reviewed (from `git diff --stat origin/main...HEAD`):
- `precon-overview.tsx`
- `open-precon-view.tsx`
- `synopsis-body.tsx` (`PreconSynopsisModal`)
- `synopsis-overview.tsx` (`carriedAside`)
- `verdict-block.tsx` (`analyzedLine`)
- `src/lib/copy/{precons,synopsis,deck-analysis}.ts`
- `src/lib/precons/{arrival-carry,stored-carry,carry-over,overview-read}.ts`
- `src/app/decks/[id]/page.tsx`
- `src/app/decks/precons/[fileName]/page.tsx`

## Result

All 37 rows are ✅. One row is ⚠️ and is shipped behavior (E8). The four walkable states were reached at both
widths. The two states the walk did not reach (started deck with no Overview, after Re-analyze) were verified
in code.

## Gaps

| # | Gap | Mark | Disposition |
|---|---|---|---|
| G1 | The Analysis tab's Overview label is drawn at 9.5px and .14em on mobile, and 10px and .16em on desktop. The board's `.lbl` is 10.5px and .16em. | SHIPPED | No change. This is `synopsis-overview.tsx` as shipped, and README §5 does not restyle it. The precon page's new label is 10.5px and .16em, as drawn. |
| G2 | On the Analysis tab, `View full overview →` keeps the shipped link: 11px Mono, underlined. The board's `.ovx .lk` draws it at 500 13px Plex Sans. | SHIPPED | No change. The README lists nothing for that link, and the board's "Unchanged" note covers the tab. The precon page's new link is 13px Sans, as drawn. If Design meant the restyle, it comes back as its own item. |
| G3 | The stale banner's sub-line reads `Also writes the overview, using a credit. 5 of 5 left.` The board's stand-in reads `1 credit · 11 left`. | SHIPPED | No change. README §5 says Re-analyze "costs what it costs today", and the board's figures are stand-ins. |
| G4 | After Re-analyze, the board shows `This overview was written before your latest changes.` with Write a new overview. When a credit is free, the shipped Re-analyze also writes the overview, so that line appears only when Re-analyze runs without the overview write. | SHIPPED | No change. This is the shipped Re-analyze-with-overview behavior. The board's state is the no-write branch, and the aside rule (`carriedAside`) handles both branches. |
| G5 | A deck edited down to 98 of 99 shows the shipped "Analysis needs a full deck: 98 of 99." banner in place of the stale banner. | SHIPPED | No change. Ruling 1 gates analysis on a whole deck. With the deck back at 99, the shipped stale banner leads, as drawn. |
| G6 | On a phone, the precon modal's aside sits in the body. On desktop it sits in the header. | SHIPPED | No change. This is the draft modal's own pattern. The board draws only the phone, with the aside in the body. |

No NEW gaps: this branch introduced no deviation from the board or README §5.

## Recorded decisions (d9 rulings, 2026-10-28)

1. **The date line uses the precon read's date when an Overview was carried, and the deck's own otherwise.**
   - Code: `stored-carry.ts` sets `computedAt` to the carried Overview's `createdAt` only when the Overview is carried.
   - Walk: both seeded rows carried, and both read `Analysis from the precon list · 28 Oct`.
2. **"from the precon list" after Analyze on an unchanged list is accepted.**
   - `analyzedLine` keys the precon wording on a reading pinned to version 0.
   - A press on the precon's own unchanged list is still v0, so it keeps the wording.
3. **A stored reading that is not fresh falls back to `after()`, with no chip and no pending state.**
   - Code: `arrival-carry.ts` returns `fallback` and schedules `carryOverAfterStart`. The page draws what any unread deck draws.
   - Walk: not reached, because both seeded readings were fresh.

## Walk evidence (screenshots in the session scratchpad, `walk-pr6/`)

**Precon page:**
- Block placement: under "You own" and above the list-note line.
- Label: 10.5px, 500 weight, 1.68px tracking, uppercase, `--fg-faint`.
- Aside: `written for this precon’s list`, 10px after the label.
- Paragraph: 14px with 23.8px line height, `--fg-body`. Max width is none at 390 (358px wide) and 760px at 1300.
- Link: 13px Sans, `--accent-text`. Height is 44px at 390 and 32px at 1300.
- The link opens the modal. Its aside reads `Wretched Ranks · written for the precon list`, followed by Overview, Primer, Key cards and Weaknesses.
- A precon with no row shows no block.
- Screenshots: `a1-precon-*`, `a1-block-*`, `a2-modal-*`, `a3-no-overview-*`.

**Arrival:**
- The bracket chip appeared in the same animation frame as the deck page's tabs, at both widths. Timings at 390: URL at 1484ms, tabs and chip at 3100ms. At 1300: URL at 1495ms, tabs and chip at 3912ms.
- The verdict date line reads `Analysis from the precon list · 28 Oct`.
- The Overview aside reads `from the precon list`. It is 10.5px, `--fg-faint`, 10px after the label.
- The only Overview press is `View full overview →`.
- Screenshots: `b1-arrival-*`, `b2-arrival-analysis-*`, `b2-carried-*`.

**First edit:**
- Edit made: remove Braids, Arisen Nightmare, then add Mountain.
- The shipped banner reads "Your deck has changes since it was analyzed, so this bracket might not be accurate." It has the Re-analyze button.
- The date line reads `Analysis from the precon list · 28 Oct, before your changes`.
- The aside reads `from the precon list, before your changes`.
- No write control appears.
- Screenshots: `c1-stale-*` (98 of 99, G5) and `c2-stale-whole-*`.
