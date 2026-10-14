## Upcoming precons and the Home banner (R1, 2026-10-14)

Handoff: `design/design_handoff_the99_upcoming_precons/`.

| Element | Phone (390) | Desktop (900 / Home 1280) |
|---|---|---|
| Announced group | Above the newest year, Newest order only. `<h2>` in the year head's anatomy: display 17, mono 11 `--fg-faint` count, 1px `--border` rule. Gap 10 to the blocks. | Same. |
| Set block (`AnnouncedSet`) | 1px dashed `--border-dashed`, radius 10, no fill, padding 11 12 12. Name `<h3>` display 15 `--fg`. Meta two lines, mono 11 `--fg-faint`. Gap 10 to the strip. | Padding 12 14 14. Name 16. Meta one line. |
| Revealed card | 76 × 106 small art, radius 4, 1px inner edge. Name 10.5/1.3 `--fg-body`, two lines max. Dots 7px. Gap 5. | 84 × 117. Name 11. Dots 8px. |
| Strip | One row, `overflow-x: auto`, gap 8, bleeds to the block's right edge. | Wraps, gap 12 × 8, nine to a row at 900. |
| None plate | One card's size, `--surface-sunken`, 1px `--border`, mono 9 `--fg-locked` `none revealed yet`. | Same, 84 × 117. |
| `new` tag | Mono 10 `--accent`, 1px border `--accent` 45%, radius 4, 0 5px, line 16. Beside the name. | Same. |
| Jump (`N decklists listed ↓`) | Mono 11 `--fg`, underline `--accent` 55%, 3px offset. To the year group. | Same. |
| Set row (rows view) | Dashed shell, radius 10, padding 10 12 11. Line 1: name display 14.5 + `when` mono 11 `--fg-body` right. Line 2: names mono 11 `--fg-muted`. Line 3: mono 10.5 `--fg-faint`. | Radius 11, padding 11 15 12. Name 16, `when` 12. |
| Precon tile `new` | `new · ` in `--accent` before `you own` on the meta line, for 14 days. | Same. |
| Banner (`ArrivalsBanner`) | In flow after the header, margin 14 16 0. `--surface-rail`, 1px `--border-strong`, radius 10, padding 10 4 10 14. Mark 22 (the sheet's mark at 22/7). Text 14/1.45 `--fg-body`, the name `--fg`. Link on its own line. ✕ 44 × 44, `--fg-faint`. | Margin 18 26 0, spans both columns. One line, min-height 46, padding 7 8 7 14. Link 13.5 inline after the sentence, 14px gap. ✕ 32 × 32. |
| Banner, several | Heading 14.5/600 `--fg` beside the mark. Lines 14, 1px `--border` top, padding 8 0, indented 32. Link last, 44px. | Heading line holds the link and ✕. Lines 13.5, two columns, gap 28. |
| Focus | 2px `--accent` outline, 2px offset, on the link and ✕. | Same. |
| Motion | None in. Close: height collapse 160ms; instant under reduced motion. Focus then moves to the page's `<h1>`. | Same. |
| Hidden when | Switch off, read failed, empty, first-run checklist, all seen, or past 30 days. | Same. |
