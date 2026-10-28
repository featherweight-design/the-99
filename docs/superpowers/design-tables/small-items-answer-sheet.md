# Design Property Table — Small items 3 (answer sheet)

Source: `design/design_handoff_the99_small_items/README.md` §3, §4 (R1b kicker time, Your requests centring), and `Spare-Answer-Sheet.dc.html` (frames: `Home · 390 · the item`, `390 · Accepted, sheet open`, `390 · Declined`, `390 · after Clear`, `1300 · Accepted, the 560 modal`).

**Rejected, excluded:** the frame "The risk, as engineering saw it" (the shipped row with its own ✕ sitting 30px under the sheet's ✕, time reserved `margin-right:30px`). The board labels it "Not drawn this way."

Board CSS that is board scaffolding (the phone frame `.ph`, desktop frame `.dk`, the dashed `.new` outline, the `.fi.hl` highlight on frame 1, the modal's `top:210px` placement) is not a property of the build. Where the board draws the sheet with its own classes (`.yr-*`), these stand in for `ModalChrome`; README names `ModalChrome` as the component.

## Component: AnswerSheet (ModalChrome)

### Container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Component | `ModalChrome`, `fit` | `ModalChrome`, width 560 |
| Position | bottom sheet: left 0, right 0, bottom 0 | centred horizontally over Home (`left:50%; translateX(-50%)`) |
| Width | full viewport | 560px |
| Height | hugs its row (`fit`) | content height |
| Background | `var(--surface-raised)` | `var(--surface-raised)` |
| Border | top only, 1px `var(--border-strong)` | 1px `var(--border-strong)` all sides |
| Radius | 18px 18px 0 0 | 14px |
| Shadow | `0 -14px 40px rgba(0,0,0,.6)` | `0 24px 60px rgba(0,0,0,.6)` |
| Layout | flex column, overflow hidden | flex column, overflow hidden |
| z-index | above scrim (31 vs 30) | above scrim (31 vs 30) |

### Scrim
| Property | Mobile | Desktop |
|---|---|---|
| Position | absolute, inset 0 over the whole page (tab bar included) | absolute, inset 0 over the whole page (rail included) |
| Background | `color-mix(in oklab, var(--bg) 72%, transparent)` | same |

### Header (title row)
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex row, align-items center, gap 10px | same |
| Min-height | 43px | 43px |
| Padding | 0 4px 0 16px | 0 4px 0 16px |
| Border | bottom 1px `var(--border)` | same |
| DOM order | title, then ✕ | same |

### Title ("Your request")
| Property | Mobile | Desktop |
|---|---|---|
| String | title key: "Your request" (singular) | same |
| Font | 600 15px IBM Plex Sans (sans family var) | 600 **16px** |
| Color | `var(--fg)` | `var(--fg)` |
| Flex | 1 (pushes ✕ right) | same |

### Close ✕ (sheet's)
| Property | Mobile | Desktop |
|---|---|---|
| Box | 44 × 44, flex centred | 44 × 44 |
| Glyph size | 15px | 15px |
| Color | `var(--fg-muted)` | `var(--fg-muted)` |
| Behaviour | closes the sheet only; the only ✕ on screen | same |

### Body
| Property | Mobile | Desktop |
|---|---|---|
| Padding | 14px 16px 16px | 16px 18px 18px |
| Content | exactly one Your requests row (this request) | same |

## Component: Your requests row (in the sheet)

The shipped `your-requests.tsx` row for one request, with its ✕ replaced by Clear.

### Row container
| Property | Mobile | Desktop |
|---|---|---|
| Display | grid, columns `46px minmax(0,1fr)` | same |
| Gap | row 0, column 12px | row 0, column 14px |
| Padding | 12px 14px 6px | 12px 16px 6px |
| Background | `var(--surface-inset)` | same |
| Border | 1px `var(--border)` | same |
| Radius | 14px | 14px |
| DOM order | picture, text column (`bd`), Clear | same |
| ✕ on row | — (absent) | — |
| Ask instead | — (absent on answered rows) | — |

### Picture (card + face)
| Property | Mobile | Desktop |
|---|---|---|
| Grid placement | column 1, `grid-row: 1 / 3` (spans text AND Clear) | same |
| Align | `align-self: center` (centred on text + Clear) | same |
| Box | 46 × 64, position relative | same |
| Card image | 46 × 64, radius 3px, object-fit cover, shadow `0 2px 6px rgba(0,0,0,.45)` | same |
| Owner face | absolute, right −6px, bottom −5px, 24 × 24, radius 7px, overflow hidden, border 1.5px `var(--surface-inset)`, img cover | same |
| Face is | the friend who answered (Colin / Chris in fixture) | same |

### Text column (`bd`)
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex column, gap 3px, min-width 0 | same |
| Right reserve | — (no padding-right for a ✕) | — |
| DOM order | kicker line, title, detail | same |

### Kicker line (state + time, R1b)
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex row, align-items center, gap 7px | same |
| Unread diamond | — (not drawn in the sheet) | — |
| Kind label | state word (Accepted / Declined) | same |
| Kind font | 500 9.5px IBM Plex Mono, letter-spacing .12em, uppercase | same |
| Kind color, accepted | `var(--success)` | same |
| Kind color, declined | `var(--fg-faint)` | same |
| Time | relative time, after the kind, on the kicker line | same |
| Time font | 400 10.5px IBM Plex Mono | same |
| Time color | `var(--fg-locked)` | same |
| Separator | `·` before the time, margin-right 7px (same mono 10.5px) | same |
| Time alignment | inline after kind (no `margin-left:auto`, not pushed right) | same |

### Title
| Property | Mobile | Desktop |
|---|---|---|
| Font | 600 14px / 1.35 IBM Plex Sans | same |
| Color | `var(--fg)` | same |
| String | "{friend} can spare {card}" (accepted) / "{friend} is keeping {card}" (declined), shipped | same |

### Detail line
| Property | Mobile | Desktop |
|---|---|---|
| Font | 12.5px / 1.5 IBM Plex Sans (400) | same |
| Color | `var(--fg-body)` | same |
| Accepted | `acceptedDetail` (R1b new ending, shared with /friends' Your requests) | same |
| Declined | shipped `othersHave` line | same |
| Declined with no other spare | not drawn (unresolved) | — |

### Clear (text button)
| Property | Mobile | Desktop |
|---|---|---|
| Grid placement | column 2, row 2 (under the text column) | same |
| Justify | `justify-self: start` (start of the text column) | same |
| Display | flex, align-items center | same |
| Height | min-height 44px | min-height **32px** |
| Margin | left −2px | left −2px, **top 4px** |
| Padding | 0 2px | 0 2px |
| Font | 500 13px IBM Plex Sans | same |
| Color | `var(--fg-muted)` | same |
| Border / background | — / — | — / — |
| String | "Clear" | same |
| Accessible name | shipped `clearAria` ("Clear your request to {friend} for {card}") | same |

## Component: Sheet foot

### Foot container
| Property | Mobile | Desktop |
|---|---|---|
| Pinned | yes, pinned foot of the sheet | ModalChrome foot |
| Border | top 1px `var(--border)` | same |
| Layout | flex, align-items center | flex, align-items center, `justify-content: flex-end` |
| Min-height | 52px | 46px |
| Padding | 0 16px 8px | 0 18px |
| Link position | left | right |

### "All your requests ›" link
| Property | Mobile | Desktop |
|---|---|---|
| Destination | /friends at Your requests | same |
| Display | flex, align-items center, min-height 44px | same |
| Font | 500 13.5px IBM Plex Sans | same |
| Color | `var(--accent-text)` | same |
| Glyph | trailing `›` in the string | same |

## Component: Home feed item (Your request)

| Property | Mobile | Desktop |
|---|---|---|
| Kind label | "Your request" | same |
| Press label | **"Your request ›"** (was "Your requests ›") | same |
| Press font | 500 13px IBM Plex Sans, min-height 32px, nowrap | same |
| Press color | `var(--accent-text)` | same |
| Press behaviour | opens the answer sheet over Home (no longer navigates to /friends) | same |
| Press position | in the text column, under the detail (`.ac`, margin-top 6px) | right-hand column of the row (`.ac`, grid col 3) |
| Item's own ✕ | hides the item only; request untouched | same |
| ✕ placement | per §4 Dismiss-X (end of action line), not this board | same |
| Detail line (accepted) | `acceptedDetail`, R1b wording | same |

## State Coverage

| State | Trigger | Rendered | Key behaviour |
|---|---|---|---|
| Item, unseen | answered request, not yet opened | Home item with diamond, "· 1 new" in What's new head, press "Your request ›" | press opens the sheet |
| Sheet open, accepted | press "Your request ›" on an accepted answer | phone bottom sheet (`fit`) / desktop 560 modal; kind "Accepted" in `--success`; `acceptedDetail`; Clear; foot link | opening marks the answer seen (diamond goes) |
| Sheet open, declined | press on a declined answer | kind "Declined" in `--fg-faint`; `othersHave` line; Clear; foot link | no Ask instead; asking another friend happens in Shopping |
| Seen | sheet has been opened | Home item without diamond, "· N new" count drops | per-answer (one by one) |
| Close | sheet ✕ (or scrim/Escape per ModalChrome) | sheet gone, item remains | request untouched |
| Clear success | press Clear | sheet closes; the item has left What's new | removes the request for good; focus to the next feed item's ✕ (shipped dismiss) |
| Clear failure | Clear write fails | sheet stays open | shared toast |
| Foot link | press "All your requests ›" | navigates to /friends, Your requests | — |
| Item ✕ | press the Home item's own ✕ | item hidden from Home | request untouched; /friends' Your requests keeps its ✕ rows |
| Answered row | any answered state | — Ask instead | — |
