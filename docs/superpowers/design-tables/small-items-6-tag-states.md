# Design Property Table — Small items 6, item 5 (TaggedBox states)

Source: `design/design_handoff_the99_small_items_6/Tag-States.dc.html` (changed cells marked `new`) and README §5. Same at 390 and 1300 except the field's 16px words on a phone.

| State | Element | Property | Mobile | Desktop |
|---|---|---|---|---|
| a · over the cap, focused | frame | edge | 2px `--danger` (1px border + 1px inset ring, same red) | same |
| a | frame | outer focus ring | none | none |
| b · dashed header description, focused | frame | border-style / color | solid `--accent` | same |
| b · at rest | frame | border-style | dashed (shipped) | same |
| c · describing in place (Tuning) | frame | edge at rest | `--border-strong` | same |
| c · focused | frame | edge | `--accent` (focus-within); no outer ring | same |
| d · label + ⓘ | label row | ⓘ gap / align / min height | 8px / centered / 24 | same (shipped, unmarked) |
| d | column | label row to frame, frame to help line | 6px / 6px | same (shipped) |
| e · Help me choose locked | foot | key / words / counter | drawn; key disabled (f) | same |
| e | frame | edge | muted with the form (shipped `[data-lock-edge]`) | same |
| f · key focus-visible | key | outline | 2px `--accent`, offset 2px, key radius (app `:focus-visible`) | same |
| f · key disabled | key | border / ink / cursor | `--border` / `--fg-locked` / not-allowed, no hover | same |

Ruling (d9, 2026-10-30): (e) follows the board, the key draws disabled. README/READINESS's "keep today's key-only hide" was stale.
