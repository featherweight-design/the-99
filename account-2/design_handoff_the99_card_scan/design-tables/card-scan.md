# Property table — card scanning R1

Tokens are Kamigawa (`brand/`). Phone 390 / desktop 1300 with the 480 side sheet.

| Element | Phone (390) | Desktop (1300) |
|---|---|---|
| Scan press | 48px square beside the search, `surface-elevated`, camera icon + label | Same, in the 480 sheet |
| Camera | Full screen over the sheet, `bg` behind the feed | Webcam panel replaces the search, 16:10, `surface-sunken` |
| Guide corners | 4 × 28px L, 3px; dashed `border-dashed` looking, `accent` reading, `success` sure | Same, 22px |
| Top bar | ✕ 44px left; Fast / Normal segment centre; torch 44px right | Kicker `Webcam`, segment, `Stop` |
| Result panel | Bottom sheet `surface`, radius 16 top, padding 16; card 63:88 at 56px wide | Under the feed, card 50px wide |
| Primary press | 52px, `accent` fill, `bg` text, Chakra Petch 16 | 44px, nowrap |
| Top three | Three cards 63:88 in a row, 100px each, name under | 3 × 86px |
| Tray | 64px, stacked thumbs (3 visible, 6° fan), `N on the list`, `Review N` press | — (the list is under the panel) |
| Dark line | `warning` text in the panel, torch ring 2px `warning` | Same |
| Index bar | 8px, `elevated` track, `accent` fill; paused `warning` | Same, in the panel |
| Name press (scanned line) | Name underlined dotted `fg-faint`, 44px tall | Same |
| Fix region | Photo 44×60 + question; tiles 96px 63:88; ticked tile `accent` border + ✓ | Same |
| Toast | Shared ToastFrame | Shared ToastFrame |
