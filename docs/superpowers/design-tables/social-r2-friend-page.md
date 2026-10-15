# Design Property Table — Social R2 friend page (P1–P3, PP1–PP3)

Source: `design/design_handoff_the99_social_r2/R3 - Friend-Desktop.dc.html` and `R3 - Friend-Phone.dc.html` (round 3,
approved 2026-10-15), README "Round 3 changes" and decision 9/10, STATES "A friend's wishlist". Copy wording is
`/copy-review`'s; only keys are enumerated here.

## Component: FriendsList row (P1, PP1)

| Property | Mobile (390) | Desktop |
|---|---|---|
| row height | 60–62px | 62px |
| row gap | 12px | 12px |
| row border-bottom | 1px var(--border) | 1px var(--border) |
| face | 40px | 40px |
| name | 15px/500 var(--fg) | 14.5px/500 var(--fg) |
| commander under name | 12px var(--fg-muted) | 12px var(--fg-muted) |
| since date | hidden | mono 11px var(--fg-faint), margin-left auto |
| › | 18px var(--fg-muted), padding 0 4px, before … | same |
| … | 40–44px slot, svg 18px var(--fg-muted), at right edge | same |
| whole row | a link to /friends/[publicId] | same |
| conditional | › and link only with the wishlist switch on (G9); off = Round 1 row | same |

## Component: FriendPage head (P2, PP2)

| Property | Mobile | Desktop |
|---|---|---|
| main padding | 18px 14px 0 | 28px 34px 0 |
| back link `‹ Friends` | 14px var(--fg-muted), no underline, to /friends | same |
| head row | margin-top 14px, gap 16px, align center | same |
| face | 56px radius 14 | 64px radius 14 |
| h1 name | Chakra Petch (font-display) 700 24px | 700 28px |
| since line | 13px var(--fg-muted), `Friend since {date} · {commander}`, gap 3px under h1 | 14px |
| … menu | 44×44, margin-left auto, svg 18px var(--fg-muted); the row's Remove friend menu | same |
| banner | none | none |

## Component: Wishlist head line (.gh)

| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 22px | 28px |
| padding-bottom | 10px | 10px |
| border-bottom | 1px var(--border) | 1px var(--border) |
| layout | baseline, gap 10px | same |
| `{name}'s wishlist` | IBM Plex Sans 600 16px var(--fg) | 600 19px |
| count | mono 13px var(--fg-faint) | same |
| `view only` | mono 13px var(--fg-faint), margin-left auto | same |

## Component: Grid and tile (P2, PP2)

| Property | Mobile | Desktop |
|---|---|---|
| grid | repeat(3,1fr), gap 8px, padding-top 12px | 178px tracks (auto-fill), gap 20px, padding-top 16px |
| tile | radius 9, var(--surface), 1px var(--border) | radius 10 |
| art | 63/88 | 63/88 |
| caption name | 600 12px, one line, ellipsis | 600 13px |
| caption sub | mono 9px var(--fg-faint), `wants <b>N</b>` number 600 var(--fg-body) | mono 9.5px |
| collected / owned | never drawn (collected leaves the list) | same |

## Component: Empty (P3, PP3)

| Property | Mobile | Desktop |
|---|---|---|
| box | margin-top 16px, padding 22px 20px, 1px dashed var(--border-dashed), radius 12 | margin-top 18px, padding 30px 32px, gap 28px |
| ghost cards | none | two 74×103, radius 7, dashed, second rotated 4deg |
| title | Chakra Petch 700 18px var(--fg) | 19px |
| body | 14px, line-height 1.6, var(--fg-muted), max-width 600px | same |

## State Coverage — friend page

| State | Triggering condition | Rendered | Key props |
|---|---|---|---|
| Reaching it | wishlist + friends switches on | FriendsList rows linked | linkable |
| Lines | loadFriendWishlist returns ≥1 | grid of tiles | name, imageUri, quantity |
| Empty | loadFriendWishlist returns [] | empty box | displayName |
| Not a friend / switch off | loadFriend null or either switch off | app not-found | — |
