# Design table: Small items 6, item 3 (Suggested changes v2 About errata)

Sources, read as text: `design/design_handoff_the99_small_items_6/About-Errata.dc.html` (frames A · Phone 390 and B · Desktop 1300, calls a to c), README.md §3, READINESS.md.

Conventions:
- Mobile = the 390 frame. Desktop = the 1300 frame. "same" = the board draws no desktop difference.
- The board's `.new` dashed orange outline marks what is new; it is a board annotation, not a shipped property.
- Board classes map to the shipped diagram parts: `.q-cap` caption, `.q-dr` row, `.q-cp` compact, `.q-ed` edge, `.q-dm` dim (dashed), `.q-btw` between.

## T1. The pick card (rule `pick`, call a)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| card | place in Good to know | first card of the swipe row | first card of the grid of three (from `xl`) |
| diagram | columns | one column | same |
| diagram column | width | 250px | same |
| diagram column | gap | 5px | same |
| caption 1 | text | `Ghalta · add 2 of 3` (mono 10, uppercase, `--fg-faint`) | same |
| rows 1 and 2 | names | `Beast Within`, `Heroic Intervention` | same |
| rows 1 and 2 | height / padding / size | 22px / 0 8px / 11.5px (compact) | same |
| rows 1 and 2 | edge | inset 2px `--accent` | same |
| rows 1 and 2 | tag | `picked`, `--accent-text` | same |
| row 3 | name | `Return of the Wildspeaker` | same |
| row 3 | border | dashed `--border-dashed` | same |
| row 3 | tag | `pick`, `--fg-body` | same |
| caption 2 | text | `cut 2 of 3` | same |
| rows 4 and 5 | names | `Rampant Growth`, `Kodama’s Reach`; edge and `picked` as rows 1 and 2 | same |
| row 6 | name | `Elvish Mystic`; dashed and `pick` as row 3 | same |
| foot | glyph | `↓`, 16px, `--fg-faint` | same |
| foot | label | `apply 4 changes · stays at 99`, mono 10, `--fg-faint` | same |
| any part | opacity | none translucent | same |
| text | words | `Suggested changes keeps the deck at 99. Ask for two and you get three to add and three to cut; pick two of each. The counts have to match before Apply, and one Undo takes the whole set back.` | same |

## T2. The credits card (rule `credits`, call b)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| diagram column | width / gap | 250px / 7px | same |
| rows 1 to 3 | as shipped | `Read the bracket` free, `Suggested changes run` 1 credit, `Look deeper` 1 credit | same |
| row 4 (v2 on) | name / tag | `Came back short or empty` / `credit back`, `--success` | same |
| row 4 (v2 on) | border | dashed | same |
| row 5 (v2 on) | name / tag | `Short by your price cap` / `1 credit`, `--accent-text` | same |
| row 5 (v2 on) | border | dashed | same |
| any part | opacity | none translucent | same |

## T3. Try it, the Suggested changes card (call c)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| tool card | line (v2 on) | `Say what to change. Pick from more cards to add and to cut than you need.` | same |
| tool card | everything else | as shipped | same |

## States: `SUGGESTED_CHANGES_V2_ENABLED`

| Surface | Switch off | Switch on |
|---|---|---|
| Pick card | not drawn; Good to know opens on the intent card | drawn first, announced as new |
| Credits row 4 | `Came back empty-handed` · credit back, dashed (shipped) | `Came back short or empty` · credit back, dashed |
| Credits row 5 | not drawn | `Short by your price cap` · 1 credit, dashed |
| Try it line | `Up to five swaps, read from your games, your notes and the list.` | `Say what to change. Pick from more cards to add and to cut than you need.` |
| Tuning tile purpose | shipped v1 purpose | v2 purpose (already shipped, `tuning-hub.tsx`) |
