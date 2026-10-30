# Gap report: Announcements UI PR 2, Settings › Notifications (R1b-1)

Property table: `docs/superpowers/design-tables/announcements-settings-notifications.md` (boards `R1b-Settings.dc.html`
layout A and `Settings.dc.html`, 390 and 1300). Verified against `src/components/settings/news-section.tsx`.

**Section: 0 gaps.** Head, device band, column heads, rows, cells and foot match at both widths, including two
drawn quirks kept as drawn: the band's box cell sits 1px left of the Push column (the band's border, no right
padding) and 10px below the band's first line (the cell keeps `padding-top:10px` inside the padded band).

Not fixed here, by scope:

1. **Rows 3 to 5 and their "On from the start."** Secret Lair drops, Commander decklists, Other Wizards news are not
   in `FEED_KINDS` / `DEFAULT_ON_KINDS`; the announcement kinds lane adds them. The row draws any `FEED_KINDS` entry
   from `feedCopy.news.kinds` (pinned by `news-section.test.tsx`, "draws every FEED_KINDS entry"). This also
   accounts for the four partly reachable states (2.1 to 2.4), whose example rows are those kinds.
2. **The failed-save toast** (2.4): the board's toast differs from the shared `ToastFrame` (danger dot, ✕, radius 12
   vs 10, gap 10 vs 14, left padding 14 vs 16, shadow, z-index). STATES 2.4 names "the shared toast", and changing
   `ToastFrame` changes every centre toast in the app: a scope call for the orchestrator, not this PR.
3. **`.pcb` line-height 1**: the board's box is the shared `Checkbox`, whose glyph is flex-centred; changing the
   shared component's leading app-wide is out of this rework.
4. **`.cc` position relative**: serves only the board's `.cc.lit` annotation, which is not built.
