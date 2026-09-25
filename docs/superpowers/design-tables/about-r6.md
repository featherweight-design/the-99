# Design Property Table — About R6 (the sheet, the index, the jump)

The design column is transcribed from `design/design_handoff_the99_about/READINESS-r6.md`
§Measurements and `STATES-about-r6.md` §N, §O, §P, never from the code. The shipped column says
how each value was read:
- **measured**: read off a real render on local-dev by the PR's browser walk (switch on, the
  account set one or two versions behind);
- **class**: read from the component's class list and not yet measured. `probe:about` (PR 5)
  measures these.

`about.md` still governs everything R6 did not redraw. Where the two disagree, R6 wins (§R7).

## The sheet (PR 2, `shell/about-sheet.tsx`)

| Property | Design | Shipped | How |
|---|---|---|---|
| Width, from `md` | 340px | 340px | measured, 800 and 1300 |
| Left, from `md` | rail 62 + 20 = 82px | 82px | measured, 800 and 1300 |
| Bottom, from `md` | 20px | 20px | measured, 800 and 1300 |
| Breakpoint for the wide placement | 1000px as drawn; **`md` (768px) per audit E8** | `md` | measured: at 800 it sits clear of the rail |
| Phone inset | 12px each side | 12px, 366px wide at 390 | measured |
| Phone bottom | `--tabbar-h` + 10px | 10px above the tab bar's top | measured |
| Phone foot reserve | the page reserves the card's height | `--about-sheet-h` set (196px at 390) | measured |
| Ground, edge, radius | `--surface-rail`, 1px `--border-strong`, 14px | same | class |
| Shadow | `0 20px 50px rgba(0,0,0,.5)` | same | class |
| Padding | 16 / 18 / 14 | same | class |
| Mark tile | 28px, radius 8, accent 16% fill, 45% hairline, 9px accent diamond, 10px gap | same | class |
| Heading | Cinzel 17/700 `--fg` | display face 17/700 | class |
| Titles | 13.5/1.4 `--fg-body` (14 on a phone), 8px 0, 1px `--border` above each | same | class |
| Buttons | Primary and Ghost, 36px, 18px sides, 13px, 8px gap; 44px splitting the row on a phone | same | class; the 44px split is visible in the 390 render |
| Foot | Plex Mono 10.5 `--fg-faint`, 10px above | same | class |
| "The 99" in the foot and first-run heading | (copy review) bound with U+00A0 | bound | tested |
| Motion | `anim-sheet-in`, none under reduced motion | `anim-sheet-in` | class |
| Modality | none: no scrim, focus grab, scroll lock or `aria-modal` | none | tested |

## The what's-new index (PR 3, `about-page.tsx` `WhatsNewIndex`)

| Property | Design | Shipped | How |
|---|---|---|---|
| Rows | one per new entry, in page order | 2 rows at `seen = version − 2` | measured |
| Row height, desktop | 40px | 40px | measured, 1300 |
| Row height, phone | 48px or more, stacked | 53px, stacked | measured, 390 |
| Row | one link; title then route | one link; route is text | tested |
| Box | `--surface`, 1px `--border-strong`, radius 10, 14/16/4 (12/14/2 phone), 22px under the lede | same | class |
| Heading | mono 11/500, .08em, `--accent` | same | class |
| Title | 14.5/500 `--fg` | same | class |
| Route | mono 11.5 `--accent`, 12px from the title | same | class |
| After the visit | nothing | nothing after a reload | measured |
| The eyebrow | retired | not drawn | tested |

## The new-entry marks (PR 3, §P0)

| Property | Design | Shipped | How |
|---|---|---|---|
| Top rule on a new entry | 2px `--accent`, both widths | 2px, `--accent` | measured, 390 and 1300 |
| Pill position | before the title, 8px gap | pill ends 8px before the title text | measured, 390 and 1300 |
| Pill type | mono 10/600, .08em, 2px 7px, radius 4, `--accent` on `--bg` | same | class |
| Spoken order | the title, then "New in this version" | same | tested |

## The jump mark (PR 3, §P)

| Property | Design | Shipped | How |
|---|---|---|---|
| Wash | `--elevated` on the title line | computed background equals `--elevated` | measured, 390 and 1300 |
| Landing | the entry's top 20px under the viewport top | 20.2px (390), 19.9px (1300) | measured |
| Focus | on the entry's `h3` | on the `h3` | measured |
| Clears | when the entry leaves the upper 30% band | cleared after a scroll away | measured |
| Back | returns to where the jump started | back to `/about` | measured |
| Gutter spill | 10px (8px on a phone), radius 6 | same | class |

## The contents (PR 4, `contents-r6.tsx`, §Q)

| Property | Design | Shipped | How |
|---|---|---|---|
| Rail | 216px sticky; label, then a 34px field that does not scroll, then a list scrolling inside | 216px; the field sits outside the scroll box | class; tested |
| Chapters open in the rail | every chapter (Q1); **the current chapter only if under 60% is visible (§R9, audit E4)** | the current chapter only; a search opens every chapter with a match | measured: 39 entries, a 1,365px list in 702px, 51.4% visible at 1300×820; the fallback is approved |
| Entry row, wide | 12.5/1.35 `--fg-muted`, 30px left, wraps | same | class |
| Figure slot | `N new` in accent, else empty; a match count while searching | same | tested |
| Tracking | `aria-current` and `--elevated` on the entry row once an entry is in the band, else the chapter row; one row at a time | same; the current entry is the LAST one in the band, which is where a jump puts it | tested; the rail walked at 1300 |
| Phone list | label, 44px field, four 44px chapter rows; the title links, the figure and chevron are a 44px `aria-expanded` disclosure | same | class; tested |
| Phone, opened | entry rows 44px min, 13.5px `--fg-body`, 26px indent; opening one closes none | same | class; tested |
| New entries | mono accent `new`, trailing, at both widths | same | tested |
| Behind reader, phone | chapters start collapsed | same | tested |

## The search (PR 4, `lib/about/search.ts`, §R)

| Property | Design | Shipped | How |
|---|---|---|---|
| Field | `SearchField`, `Find an entry`, named `Find an entry by title` | same | tested |
| What it reads | titles only, ignoring case | titles only, a plain substring (never a RegExp) | tested |
| Matches | chapters with none drop from the LIST; matched run `--fg`/600, rest `--fg-faint`; `m of n` and a clear; a polite live count | same | tested; the live region is class |
| Page | nothing hidden, dimmed, collapsed or reordered (ruling 4) | the page's sections untouched | tested; `probe:about` (PR 5) compares them before and after at 390 and 1300 |
| None | `Nothing titled “q”.`, the note, `Clear search` (44px on a phone) | same | tested |
| Enter | jumps to the first match; the query stays | presses the first row's link, so a second Enter on the same query lands again | tested; the address is read in a browser by `probe:about` |
| ↓ / Escape | into the list / clears | same | tested |
| Cleared, phone | restores whichever chapters were open | same | tested |
