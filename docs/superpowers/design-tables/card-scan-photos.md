# Design Property Table — Card scan W4 (photos)

Source: `design/design_handoff_the99_card_scan/R1 - Desktop.dc.html`, artboard **W4 · Photos: the fallback** (lines 324-327),
its stylesheet, `README.md` §9, `STATES-card-scan.md` row W4, `READINESS.md`, `card-scan · copy strings.ts` (`cardScanCopy`).
Colors are recorded as drawn; the app maps them to tokens.

**Mobile:** there is no phone board for W4. The phone draws the same rows inside D6's full screen (Start-Phone), which is
outside this table; every Mobile cell below is —.

Scope: the photo panel (`.dscan` inside the desktop Add cards sheet `.dsh`, 480px wide) and the sheet chrome it sits in only
where W4 draws it differently (the list head and footer while empty).

---

## Component: PhotoPanel (container)

### Panel shell (`.dscan.new`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| flex-direction | — | column |
| margin | — | 0 22px |
| border | — | 1px solid #262A35 |
| border-radius | — | 12px |
| overflow | — | hidden |
| background | — | #101219 |
| outline (`.new`) | — | 1.5px dashed rgba(255,77,154,.6), outline-offset 4px — canvas "new" annotation, not shipped (see Ambiguity 1) |
| Box-sizing | — | border-box (global `*`) |

### Panel head (`.dsh-h`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| align-items | — | center |
| gap | — | 8px |
| padding | — | 8px 8px 8px 14px |
| border-bottom | — | 1px solid #181C26 |
| Children, in order | — | count label · Auto/Normal segment · Stop |

### Count label (`.dsh-h .k`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | — | `photos.read(n)` (drawn with n = 4) |
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10.5px |
| font-weight | — | 500 |
| letter-spacing | — | .14em |
| text-transform | — | uppercase |
| color | — | #6F7486 |
| flex | — | 1 (pushes the segment and Stop right) |

### Printing segment (`.dsh-h .seg`, `role="group"`, `aria-label` = `mode.label`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | inline-flex |
| gap | — | 2px |
| padding | — | 3px |
| margin | — | 0 |
| border-radius | — | 12px |
| background | — | #0E0F14 (head override of rgba(14,15,20,.78)) |
| border | — | 1px solid rgba(38,42,53,.9) |

### Segment button (`.dsh-h .seg button`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy keys | — | `mode.fast`, `mode.normal` |
| height | — | 30px |
| min-width | — | 64px |
| padding | — | 0 14px |
| border-radius | — | 9px |
| border | — | 0 |
| background | — | transparent |
| color | — | #B1B6C7 |
| font | — | 500 13px 'IBM Plex Sans', sans-serif |
| cursor | — | pointer |
| aria-pressed | — | true on the selected, false on the other |
| Selected (`.on`) background | — | #20222A |
| Selected color | — | #E6E8F0 |
| Selected box-shadow | — | inset 0 -2px 0 #FF4D9A |
| Drawn state | — | Auto selected |
| Hover / focus | — | not drawn |

### Stop (`.gb`, inline padding)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | — | `camera.stop` |
| display | — | inline-flex |
| align-items | — | center |
| gap | — | 6px |
| font-size | — | 13px |
| font-family | — | 'IBM Plex Sans', sans-serif |
| padding | — | 7px 12px (inline, overrides 9px 16px) |
| border-radius | — | 8px |
| border | — | 1px solid #262A35 |
| background | — | transparent |
| color | — | #E6E8F0 |
| Hover / focus | — | not drawn |

### Results body (`.dres`, inline `border-top:0`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| flex-direction | — | column |
| gap | — | 12px (between rows, the top three and the action row) |
| padding | — | 12px 14px |
| border-top | — | 0 (inline; the class's 1px solid #181C26 is removed because the head draws its own bottom rule) |
| Children, in order | — | photo rows (every photo, in photo order) · top three for the Not sure photo · action row |

---

## Component: PhotoRow

### Row (`.ph-row`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| align-items | — | center |
| gap | — | 10px |
| padding | — | 8px 10px |
| border-radius | — | 9px |
| border | — | 1px solid #181C26 |
| background | — | #0E0F14 |
| Hover / press | — | not drawn; the row is not a button |
| Sure row children | — | photo · arrow · guess art · name block · tag |
| Not sure row children | — | photo · arrow · name block · tag (no guess art) |

### Player's photo (`.ph-row .photo`)
| Property | Mobile | Desktop |
|---|---|---|
| width | — | 36px (row override of 44px) |
| height | — | 50px (row override of 62px) |
| border-radius | — | 5px |
| overflow | — | hidden |
| flex | — | none |
| position | — | relative |
| background | — | #2A241C |
| img alt | — | "Your photo" (no key in the copy file; see Ambiguity 7) |

### Photo image (`.photo img`) — the canvas's stand-in treatment for a real photo
| Property | Mobile | Desktop |
|---|---|---|
| position | — | absolute |
| width | — | 120% |
| height | — | 120% |
| left | — | -6% |
| top | — | -4% |
| object-fit | — | cover |
| transform | — | rotate(-4deg) |
| filter | — | blur(.6px) brightness(.8) saturate(.8) |

### Arrow (`.ph-row .arrow`)
| Property | Mobile | Desktop |
|---|---|---|
| Content | — | → (glyph, not copy) |
| aria-hidden | — | true |
| color | — | #6F7486 |
| font-size | — | 12px |

### Guess art (`.ph-row .gc`) — Sure rows only
| Property | Mobile | Desktop |
|---|---|---|
| width | — | 36px (row override of 64px) |
| height | — | 50px (row override of 89px) |
| border-radius | — | 4px (row override of 6px) |
| overflow | — | hidden |
| flex | — | none |
| box-shadow | — | 0 6px 14px rgba(0,0,0,.4) |
| img | — | width 100%, height 100%, object-fit cover, display block, alt "" |
| Not sure row | — | absent |

### Name block (`.gt`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| flex-direction | — | column |
| gap | — | 4px |
| min-width | — | 0 |
| flex | — | 1 |

### Name (`.ph-row .gt b`)
| Property | Mobile | Desktop |
|---|---|---|
| Sure row content | — | the card's name (catalog data) |
| Not sure row content | — | copy key `photos.pick` |
| font-family | — | 'IBM Plex Sans', sans-serif |
| font-weight | — | 600 |
| font-size | — | 13.5px (row override of 16px) |
| color, Sure | — | #E6E8F0 |
| color, Not sure | — | #E0913C (inline) |
| Truncation | — | not set (see Ambiguity 6) |

### Sub-line (`.ph-row .gt span`)
| Property | Mobile | Desktop |
|---|---|---|
| Sure row content | — | set code · collector number, e.g. `SOC · #4` (no key; see Ambiguity 8) |
| Not sure row content | — | copy key `photos.photoOf(i, t)` (drawn as 4 of 4) |
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10.5px (row override of 11px) |
| font-weight | — | 400 (font shorthand) |
| color | — | #6F7486 |

### Tag wrapper (inline span)
| Property | Mobile | Desktop |
|---|---|---|
| margin-left | — | auto (pins the tag to the row's right edge) |

### Tag (`.tag`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key, Sure (`.tag.ok`) | — | `photos.sure` |
| Copy key, Not sure (`.tag.w`) | — | `photos.notSure` |
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| font-weight | — | 400 |
| letter-spacing | — | .12em |
| text-transform | — | uppercase |
| padding | — | 2px 6px |
| border-radius | — | 4px |
| border | — | — |
| color, Sure | — | #6FA368 |
| background, Sure | — | rgba(111,163,104,.12) |
| color, Not sure | — | #E0913C |
| background, Not sure | — | rgba(224,145,60,.12) |

---

## Component: TopThree (`.pick3`, under the rows, for the Not sure photo)

### Grid (`.pick3`, inline `width:300px`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | grid |
| grid-template-columns | — | repeat(3, minmax(0, 1fr)) |
| gap | — | 10px |
| width | — | 300px (inline; W3 draws 270px) |
| Position | — | after the last row, before the action row |
| "None of these" | — | not drawn in W4 (see Ambiguity 4) |

### Choice button (`.pick3 button`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| flex-direction | — | column |
| gap | — | 6px |
| min-width | — | 0 |
| border | — | 0 |
| background | — | transparent |
| padding | — | 0 |
| text-align | — | left |
| color | — | #E6E8F0 |
| font-family | — | 'IBM Plex Sans', sans-serif |
| cursor | — | pointer |
| Hover / focus / selected | — | not drawn |

### Choice art (`.pick3 .a`)
| Property | Mobile | Desktop |
|---|---|---|
| width | — | 100% (about 93px at 300px wide) |
| aspect-ratio | — | 63/88 |
| border-radius | — | 9px |
| overflow | — | hidden |
| box-shadow | — | inset 0 0 0 1px rgba(0,0,0,.35) |
| img | — | width 100%, height 100%, object-fit cover, display block, alt "" |

### Choice name (`.dres .pick3 span`)
| Property | Mobile | Desktop |
|---|---|---|
| Content | — | the candidate's name (catalog data) |
| font-size | — | 11.5px (`.dres` override of 12px) |
| line-height | — | 1.3 |
| Clamp | — | display -webkit-box; -webkit-line-clamp 2; -webkit-box-orient vertical; overflow hidden |
| Note | — | the `.pick3 span` rule also matches `.a` (a span); its clamp/size apply there too but the img fills it |

---

## Component: ActionRow (inline flex)

### Row
| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| align-items | — | center |
| gap | — | 14px |

### Bulk press (`.bigd`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | — | `photos.addSure(n)`, n = the count of Sure rows (drawn 3) |
| height | — | 40px |
| padding | — | 0 18px |
| border-radius | — | 8px |
| border | — | 0 |
| background | — | #FF4D9A |
| color | — | #0E0F14 |
| font | — | 600 14px 'IBM Plex Sans', sans-serif |
| white-space | — | nowrap |
| flex | — | none |
| Hover / focus / disabled | — | not drawn (n = 0 not drawn; see Ambiguity 3) |

### Choose more photos (`.tx`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | — | `photos.more` |
| border | — | 0 |
| background | — | transparent |
| color | — | #FF4D9A |
| font-size | — | 13.5px |
| font-family | — | 'IBM Plex Sans', sans-serif |
| padding | — | 0 |
| min-height | — | 44px |
| text-align | — | left |
| Hover / focus | — | not drawn |

---

## Component: Sheet around the panel (as W4 draws it, list empty)

### List head (`.dsh .sb`, inline `padding-top:10px`; `.lh span`)
| Property | Mobile | Desktop |
|---|---|---|
| Content | — | "On the list · 0" (shipped `collectionEditCopy.add`, not a scan key) |
| `.sb` padding | — | 10px 22px 12px |
| `.lh` | — | display flex, align-items baseline, gap 10px, padding 6px 0 0 |
| `.lh span` font | — | 10px 'IBM Plex Mono', monospace |
| `.lh span` letter-spacing | — | .14em |
| `.lh span` text-transform | — | uppercase |
| `.lh span` color | — | #6F7486 |
| List lines | — | none (nothing added yet) |

### Footer (`.dsh .sf`)
| Property | Mobile | Desktop |
|---|---|---|
| Status | — | "Nothing on the list yet" (shipped add copy), font-size 12px, color #959AAD, flex 1 |
| Save | — | `.sv.off`: height 40px, border-radius 8px, font 600 14px Plex Sans, background #FF4D9A, color #0E0F14, padding 0 22px, opacity .4 |
| padding | — | 14px 22px 18px |
| border-top | — | 1px solid #262A35 |
| background | — | #12141B |

---

## State Coverage

| State | Trigger | What renders | Copy keys |
|---|---|---|---|
| Photos read | `Choose photos` (W6 / D6) picks several files, one card each; each photo is read once | Panel head label replaces `Webcam`; one `.ph-row` per photo, in order; no webcam view | `photos.read`, `mode.*`, `camera.stop` |
| Sure | the photo's read clears the margin gate | Row with photo → guess art, name, set · number, green tag | `photos.sure` |
| Not sure (top three) | the read is below the gate | Row with photo → no art, `Pick below` in amber, `photo i of t`, amber tag; a 3-up `.pick3` of the closest cards below the rows | `photos.notSure`, `photos.pick`, `photos.photoOf` |
| Sure ones waiting | at least one Sure row | Bulk press with the Sure count; Sure rows are NOT on the list until pressed (Sync review's pattern) | `photos.addSure` |
| Nothing unpressed | always | List head reads 0 and Save is off until the bulk press or a pick | (shipped add copy) |
| More photos | any time on W4 | `Choose more photos` beside the bulk press | `photos.more` |
| Bad path (STATES) | — | Adding a photo to the list without a press | — |

Not drawn in the handoff: zero Sure rows, every row Sure (no pick3), more than one Not sure photo, the state after the bulk
press, after a pick, an unreadable file, and any hover/focus state.
