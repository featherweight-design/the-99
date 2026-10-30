# Design Property Table — Small items 6, items 6 and 6b (What's new)

Sources: `design/design_handoff_the99_small_items_6/Every-Kind-Off.dc.html`, `Offer-Stacked.dc.html` (`.ofr.stk`, `.fq.off`), README §6 and §6b.

## The off line (item 6)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| box padding / gap | 14px / 6px (shipped `Quiet`) | same |
| text | 13px / 1.55, `--fg-body`; lead bold `--fg` | same |
| head link | Choose what shows › (shipped link) | same |

## The closed offer, stacked (6b)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| layout | words block, ✕ absolute top right, Pick ▾ absolute bottom right | same |
| min-height | 72px | 64px |
| padding | 12px 64px 12px 14px | 12px 72px 12px 14px |
| ✕ | shipped `DismissButton` 44, top -4px right 0 | 32, top 4px right 4px |
| Pick ▾ | right 12px, bottom 10px, min-height 32px, nowrap, 500 13px sans `--accent-text`, padding 0 6px, gap 5px | same |
| words | 12.5px / 1.5 `--fg-muted`; lead 500 `--fg` | same |
| top rule | 1px `--border` when it follows rows or the quiet line; none alone | same |

## State coverage

| State | Trigger | Rendered |
|---|---|---|
| Never chose, nothing on | `on` empty and `neverChose(prefs)` | the offer line alone (stacked) |
| After the ✕ (this visit) | `offerGone` | off line + head link |
| Chose, every kind off | `on` empty and not `neverChose` | `{chosen:true, items:[], on:[]}`: off line + head link, never the offer |
| Rows | items in the window | rows keep their shipped action line |
