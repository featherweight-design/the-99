# Design Property Table: Card scan, the viewfinder (PR 3)

Source: `design/design_handoff_the99_card_scan/` (R1, READINESS 🟢 2026-10-16). Values are from the JSX/CSS inside
`R1 - Viewfinder-Phone.dc.html` (V1–V9), `R1 - Start-Phone.dc.html` (D6, D7), `R1 - Review-Phone.dc.html` (R1, R2:
the again / second-copy panel, which is a viewfinder state) and `R1 - Desktop.dc.html` (W2, W3, W6 webcam panel only).
Where the handoff's own `design-tables/card-scan.md` disagrees with the JSX, the JSX wins and the row says so.

Scope: D6, D7, V1–V9, R1–R2, Fast/Normal, ✕, light toggle, the tray. Out: D1–D5 (index download, dropped under
server matching), L1–L4, R3–R4 (list folding), W1, W4, W5, E1.

Mobile = phone 390×844, scanner full screen. Desktop = 1300, the webcam panel inside the 480px Add cards side sheet.

## Colour legend (hex as drawn → Kamigawa token)

The boards are drawn in raw hex. The names on the right are the handoff table's names where it gives one; the rest
are the likely token and confirmed against the Kamigawa block in `globals.css` by the verify pass (`#1B1D25` has no token; back card 2 uses `--surface-raised`).

| Hex | Token |
|---|---|
| `#FF4D9A` | `var(--accent)` |
| `#D33E7E` | `var(--accent-strong)` |
| `#6FA368` | `var(--success)` |
| `#E0913C` | `var(--warning)` |
| `#E6E8F0` | `var(--fg)` |
| `#B1B6C7` | fg secondary (likely `--fg-muted` tier) — confirm |
| `#959AAD` | `--fg-muted` — confirm |
| `#6F7486` | `var(--fg-faint)` |
| `#0E0F14` | `var(--bg)` (accent button text, tray, pre-camera screen) |
| `#12141B` / rgba(18,20,27,.9x) | `var(--surface-rail)` (panel, dark line) |
| `#16181F` | `var(--surface)` (sheet) |
| `#101219` | `var(--surface-sunken)` (webcam panel) |
| `#20222A` | `var(--surface-elevated)` / `--elevated` |
| `#262A35` | `var(--border-strong)` |
| `#343843` | `var(--border-dashed)` |
| `#181C26` | `var(--border)` (hairline divider) |

---

## Component: ScannerShell (phone full screen / desktop webcam panel)

### Container

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, inset 0 over the sheet (full screen) | in sheet flow, under the sheet head, replaces the search row |
| margin | — | 0 22px |
| background | `#0E0F14` (camera feed fills) | `#101219` |
| border | — | 1px solid `#262A35` |
| border-radius | — (phone shell 34 is the device) | 12px |
| overflow | hidden | hidden |
| display | — | flex, column |

### Camera feed area

| Property | Mobile | Desktop |
|---|---|---|
| size | inset 0 (whole screen) | height 250px, full panel width |
| placeholder bg (stands in for `<video>`) | radial-gradient warm brown | radial-gradient grey `#3C3A42→#151418` |
| dark variant (V7/V8) | `.cam.dark` darker gradient (illustrative; real feed is just dark) | not drawn |
| aria | `aria-hidden="true"` | `aria-hidden="true"` |
| V4 held card | feed frozen; illustrative `brightness(.8)` on the card | not drawn (caption: same Held on mousedown) |

### The card's outline (Hugh, 2026-10-16: the card can be anywhere in the frame; it supersedes the guide corners below)

The four fixed corners are gone. The detector already finds the card over the whole frame, so the viewfinder draws what it found, and a player never lines a card up with anything. Engineering's decisions, not a drawing: no handoff exists for this change.

| Property | Mobile | Desktop |
|---|---|---|
| shape | a closed polygon through the detector's four corners, mapped from the camera picture to the feed box as `object-fit: cover` draws it | same |
| stroke | 3px, round joins | 2.5px, round joins |
| no card in view | nothing is drawn | nothing is drawn |
| a missed frame | the outline stays 1s (`OUTLINE_HOLD_MS`, two phone reads of about 400ms), then goes; a read that fails hides it the same way | same |
| looking (`dash`): a card is seen, no answer yet | dashed `9 7`, `--fg` at 55% | same |
| lit (`lit`): answers agree, or the frame is dark | solid `--accent` | same |
| read (`ok`): a sure answer, or the light on | solid `--success` | same |
| a chosen photo | no outline (a photo has no viewfinder) | same |
| hint with no card | `view.looking`, one line, naming no frame | same |
| a card seen under 12% of the picture (`CLOSER_BELOW`, where a match stops holding) | the unsure panel's head reads `view.closer` in place of `view.unsure`; the dots and body stay | same |

The rows below that say "guide" mean this outline in the same state; their box, corner and border figures no longer apply.

### Guide corners (`.guide`), retired

| Property | Mobile | Desktop |
|---|---|---|
| box | left 66, top 108, 258×350 | left 150, top 10, 174×229 |
| corner size | 34×34 (handoff table says 28; JSX wins) | 24×24 (handoff table says 22; JSX wins) |
| border-width | 3px on the two outer sides | 3px |
| outer corner radius | 14px | 14px |
| pointer-events | none | none |
| colour, looking (`dash`) | `rgba(230,232,240,.35)`, border-style dashed | not drawn |
| colour, default | `rgba(230,232,240,.55)` solid | — |
| colour, reading/unsure/not sure/dark (`lit`) | `#FF4D9A` solid | `#FF4D9A` (W3) |
| colour, sure/held/again/light on (`ok`) | `#6FA368` solid | `#6FA368` (W2) |

## Component: TopBar (mobile) / PanelHead (desktop)

### Bar

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, top 0, left/right 0, z-index 3 | static row, border-bottom 1px `#181C26` |
| height | 68px | — (content: 34–30px controls) |
| display | flex, align-items center, gap 10 | flex, align-items center, gap 8 |
| padding | 12px 12px 0 | 8px 8px 8px 14px |
| left | ✕ close | kicker `Webcam` (`camera.webcam`), `.k`: Plex Mono 10.5px/500, .14em, uppercase, `#6F7486`, flex 1 |
| centre | Fast/Normal segment (margin 0 auto) | segment (margin 0) |
| right | light toggle | `Stop` (`camera.stop`) |

### Close ✕ (mobile)

| Property | Mobile | Desktop |
|---|---|---|
| size | 44×44 | — (sheet's own ✕ 34×34 closes the sheet; Stop ends the webcam) |
| border-radius | 50% | — |
| background | `rgba(14,15,20,.72)`; on D6 `#20222A` | — |
| color | `#E6E8F0` | — |
| font-size | 15px | — |
| border | 0 | — |
| aria-label | `close` ("Close the scanner") | — |

### Stop (desktop, `.gb`)

| Property | Mobile | Desktop |
|---|---|---|
| font-size | — | 13px |
| padding | — | 7px 12px |
| border | — | 1px solid `#262A35` |
| border-radius | — | 8px |
| background / color | — | transparent / `#E6E8F0` |
| behavior | — | turns the panel back into the search |

### Fast/Normal segment

| Property | Mobile | Desktop |
|---|---|---|
| role / label | `role="group"`, `aria-label` = `mode.label` ("Printing") | same |
| display | inline-flex, gap 2 | same |
| padding | 3px | 3px |
| border-radius | 12px | 12px |
| background | `rgba(14,15,20,.78)` | `#0E0F14` |
| border | 1px solid `rgba(38,42,53,.9)` | same |
| button height | 38px | 30px |
| button min-width | 76px | 64px |
| button padding | 0 14px | 0 14px |
| button radius | 9px | 9px |
| button font | IBM Plex Sans 500 14px | 500 13px |
| button color (off) | `#B1B6C7`, transparent bg | same |
| button on | bg `#20222A`, color `#E6E8F0`, `box-shadow: inset 0 -2px 0 #FF4D9A` | same |
| aria | each button `aria-pressed` true/false | same |
| labels | `mode.fast`, `mode.normal` | same |
| default / memory | Fast; remembered per device (localStorage) | same |
| mid-batch change | affects only cards added after | same |

### Light toggle (mobile only)

| Property | Mobile | Desktop |
|---|---|---|
| size | 44×44, radius 50% | not drawn (no light control on desktop) |
| background / color (off) | `rgba(14,15,20,.72)` / `#E6E8F0` | — |
| ring (V7 dark, torch offered) | `box-shadow: 0 0 0 2px #FF4D9A`, color `#FF4D9A` (handoff table says `warning` ring; JSX is accent) | — |
| lit (V9 on) | bg `#E6E8F0`, color `#0E0F14`, `aria-pressed="true"` | — |
| no torch (V8) | `visibility:hidden` in the drawing (keeps the segment centred); the brief: "absent, never greyed", not a disabled control | — |
| aria | `aria-label` = `view.light` ("Light"), `aria-pressed` | — |
| icon | svg 20×20, viewBox 0 0 24 24, fill none, stroke currentColor, stroke-width 1.8, paths `M9 18h6M10 21h4` and `M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z`, aria-hidden | — |
| press | toggles torch via `applyConstraints({advanced:[{torch:true}]})`; again turns it off | — |

## Component: DarkLine (V7, V8)

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, left 12, right 12, top 72, z-index 3 | not drawn (handoff table says "Same"; no frame shows it) |
| display | flex, gap 10, align-items flex-start | — |
| padding | 11px 14px | — |
| border-radius | 12px | — |
| background | `rgba(18,20,27,.92)` | — |
| border | 1px solid `#262A35` | — |
| font | 13.5px / 1.5, `#E6E8F0` | — |
| icon | moon svg 16×16, viewBox 0 0 24 24, stroke 1.8, color `#E0913C`, margin-top 2, path `M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z`, aria-hidden | — |
| role | `status` | — |
| copy | `view.darkTorch` (torch offered) / `view.darkNoTorch` (none) | — |
| trigger | mean brightness < ~90/255 for ~1s; leaves once bright enough; reading continues | — |

## Component: ResultPanel

### Panel

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, left 8, right 8, bottom 92, z-index 3 | in flow under the feed (`.dres`) |
| border-radius | 18px | — |
| background | `rgba(18,20,27,.94)` | — (panel bg `#101219`) |
| border | 1px solid `#262A35` | border-top 1px `#181C26` |
| padding | 16px | 12px 14px |
| display | flex, column | flex, column |
| gap | 14px (V5 6px, V6 12px) | 12px |
| box-shadow | `0 -10px 40px rgba(0,0,0,.35)` | — |
| heading `.h` | margin 0, Plex Sans 600 16px, `#E6E8F0` | margin 0, 600 (size unset in source: inherits) |
| body `.m` | margin 0, 14px / 1.55, `#B1B6C7` | `.cap`: 13px/1.55 `#959AAD` (sleeve line 12.5px) |
| aria | `role="status"` on V2 and V5 panels; README: the guess is `aria-live="polite"` (V3 panel carries no role in the drawing) | — |

### Looking (V1, V1n, D7)

| Property | Mobile | Desktop |
|---|---|---|
| heading | `view.looking` | not drawn |
| mode line | `<b>` "Fast:" / "Normal:" (`#E6E8F0` 600) + `mode.fastLine` / `mode.normalLine` | — |
| guide | dashed | — |

### Unsure (V2, also V7/V8 body)

| Property | Mobile | Desktop |
|---|---|---|
| head row | flex, align-items center, justify-content space-between | not drawn |
| heading | `view.unsure` | — |
| dots | flex, gap 6; three `i` 8×8, radius 50%, off `#343843`, on `#FF4D9A`; `aria-hidden`; count of agreeing frames (V2 2 on, V7/V8 1 on) | — |
| body | "The name shows once the card stays the same for a moment." — NOT in the copy file | — |
| no guess shown | a name never appears before 3 agreeing frames | — |

### Sure guess (V3, V9, R1, R2, W2)

| Property | Mobile | Desktop |
|---|---|---|
| guess row | flex, gap 14, align-items center | flex, gap 14 (row also holds the press, align center) |
| card thumb `.gc` | 64×89, radius 6, shadow `0 6px 14px rgba(0,0,0,.4)`, img cover | 50×70 |
| name | `<b>` Plex Sans 600 16px `#E6E8F0` | same |
| type line | Plex Mono 11px `#6F7486` | same |
| text column | flex column, gap 4, min-width 0, flex 1 | same |
| press | `.big`: full width, h 52, radius 12, bg `#FF4D9A`, color `#0E0F14`, Plex Sans 600 16px, border 0 | `.bigd`: h 40, radius 8, padding 0 18, 600 14px, nowrap, flex none, same colours |
| label | `view.add` | `view.add` |

### Held (V4)

| Property | Mobile | Desktop |
|---|---|---|
| trigger | pointerdown on the press | mousedown (caption only) |
| press | `.big.down`: bg `#D33E7E`, `transform: scale(.985)` | not drawn |
| badge | `view.held`; absolute top 14 right 14; Plex Mono 10px .14em uppercase `#E0913C`; border 1px `#E0913C`; radius 4; padding 2px 6px | not drawn |
| behavior | panel and frame stop updating; lift on button adds; slide off cancels and reading restarts | same rule |

### Added (V5)

| Property | Mobile | Desktop |
|---|---|---|
| panel | `role="status"`, gap 6 | not drawn (line lands in the list below) |
| heading | `✓` in `#6FA368` + "{name} is on the list" — NOT in the copy file | — |
| body | "Next card." — NOT in the copy file | — |
| then | back to Looking | — |
| toast | none | — |

### Again: duplicate (R1) and second copy (R2)

| Property | Mobile | Desktop |
|---|---|---|
| R1 status line | third span in text column, `.okk`: Plex Mono 12px `#6FA368`, `again.stillOn(x)` | not drawn |
| R1 press | `.big2`: full width h 52, radius 12, border 1px `#343843`, transparent, `#E6E8F0`, Plex Sans 500 15px; `again.addAnother` | — |
| R1 trigger | added card never left the frame; never offered as new | — |
| R2 status line | type-line style span (mono 11 `#6F7486`), `again.already(x)` | — |
| R2 press | `.big` (accent fill), `again.addSecond` | — |
| R2 trigger | same card after the frame was empty | — |
| guide | ok (green) | — |

### Not sure (V6, W3)

| Property | Mobile | Desktop |
|---|---|---|
| heading | `view.notSure` | `view.notSure` (margin 0, 600) |
| top three `.pick3` | grid, 3 × `minmax(0,1fr)`, gap 10 (≈106px each in 390) | width 270, flex none (≈83px each; handoff table says 86) |
| tile button | border 0, transparent, padding 0, column, gap 6, min-width 0, left aligned | same |
| tile art `.a` | width 100%, aspect 63/88, radius 9, `inset 0 0 0 1px rgba(0,0,0,.35)`, img cover | same |
| tile name | 12px / 1.3, clamp 2 lines | 11.5px |
| tile press | one tap adds that card | same |
| sleeve line | `.m` at 13px; `view.sleeves`; shown only when sheen detected | in a side column (flex column gap 8) with None of these, 12.5px |
| None of these `.tx` | border 0, transparent, `#FF4D9A` 13.5px, padding 0, text-align left, min-height 40 (inline override of 44) | min-height 44 |
| None of these behavior | adds nothing, keeps reading (plan: opens search by name in PR 4) | same |
| guide | lit (pink) | lit |
| list lines | — | fold while a pick is open |

## Component: Tray (mobile only)

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, left/right/bottom 0, z-index 4 | none (the sheet's list is below the panel) |
| height | 84px | — |
| display | flex, align-items center, gap 12 | — |
| padding | 0 14px 8px | — |
| background | `#0E0F14` | — |
| border-top | 1px solid `#181C26` | — |
| count text `.c` | flex 1, 14px `#B1B6C7`; count in `<b>` `#E6E8F0` 600; `view.onList(n)` | — |
| empty (D7) | no count card; `.c` colour `#6F7486`, "Nothing on the list yet" — NOT in the scan copy (shipped add copy?) | — |
| Review press `.rv` | h 48, padding 0 20, radius 10, border 0, bg `#FF4D9A`, `#0E0F14`, Plex Sans 600 15px; `view.review(n)` | — |
| Review held (0) | opacity .4, `aria-disabled="true"`, label "Review" with no count — not a key | — |

### Count card `.cnt` (aria-hidden)

| Property | Mobile | Desktop |
|---|---|---|
| box | 62×52, flex none | — |
| cards | three spans 32×45, top 4, radius 4, `box-shadow 0 2px 6px rgba(0,0,0,.5)` | — |
| back card 1 | left 2, bg `#20222A`, border 1px `#262A35`, rotate(-8deg) | — |
| back card 2 | left 13, bg `#1B1D25`, border 1px `#343843`, rotate(-1deg) | — |
| front card 3 | left 24, bg `color-mix(in srgb, #FF4D9A 14%, #16181F)`, border 1px `#FF4D9A`, rotate(7deg), centred count Chakra Petch 700 17px `#FF4D9A`, overflow hidden | — |
| flip (V5) | front `rotate(7deg) perspective(200px) rotateY(18deg)`, shows the added card's image (cover) ~0.8s, flips back as the count ticks up | — |

## Component: AddedFlight (V5, mobile only, aria-hidden)

| Property | Mobile | Desktop |
|---|---|---|
| fly card | absolute z 5, left 150 top 470, 110×154, radius 8, overflow hidden, `rotate(-14deg) perspective(400px) rotateY(24deg)`, shadow `0 14px 30px rgba(0,0,0,.6)`, opacity .95 (a mid-flight still: card tips and flies to the count card) | — |
| tray pulse | absolute z 5, left 10 bottom 16, 72×60, radius 12, `box-shadow 0 0 0 2px rgba(255,77,154,.6)` | — |

## Component: CameraBlocked (D6 mobile, W6 desktop)

| Property | Mobile | Desktop |
|---|---|---|
| container | absolute inset 0, bg `#0E0F14`, flex column | inside the webcam panel; head shows `Webcam` + `Stop` only (no segment) |
| top | relative, h 60, padding 12 12 0, ✕ with bg `#20222A` | — |
| body | flex 1, column, gap 16, padding 24px 22px | padding 22px 16px, column, gap 12, align-items flex-start |
| icon tile | 56×56, radius 14, bg `#20222A`, color `#E0913C`, margin-top 30 | 44×44, radius 12 |
| icon | camera svg 18×18, viewBox 0 0 24 24, stroke 1.8, path `M4 8h3l2-3h6l2 3h3v11H4z`, circle cx 12 cy 13 r 3.5 | same |
| title | h3, Chakra Petch 700 24px, margin 0; `camera.blockedTitle` | `<b>` Chakra Petch 700 18px; `camera.noWebcamTitle` |
| body | 15px / 1.6 `#B1B6C7`; `camera.blockedBody` | `.cap` 13px/1.55 `#959AAD`; `camera.noWebcamBody` |
| photos line | `.n` 13px `#959AAD`; `camera.photosLine` | — |
| footer | padding 14px 22px 22px, column, gap 10 | — |
| press | `.big2` (outline, h 52, full width); `camera.choosePhotos` | `.bigd` (accent fill, h 40); `camera.choosePhotos` |
| behavior | opens file picker (several, one card each); never re-asks the camera in a loop | same; one message for no webcam and blocked |

## Animation and reduced motion

| Item | Spec | Reduced motion |
|---|---|---|
| Tray count-card flip | front rotateY flip to the added card ~0.8s, back to count | drops (READINESS: both animations drop) |
| Card flight to tray (V5) | card tips and flies into the count card; drawn as a still only, no duration/easing given | not specified; assume none (the count simply ticks) |
| Segment / torch / press states | no transitions specified | — |
| Held press | `scale(.985)` while pointer is down (state, not animation) | keep |

## State Coverage — Scanner

Display-state names are the scanner's (PR 2 hook / `steady.ts`) as described by the handoff; Agent 2 maps them.

| State | Triggering condition (scanner display state) | Component rendered | Copy keys (`collectionEditCopy.scan.*`) |
|---|---|---|---|
| D6 Camera blocked (phone) | `getUserMedia` rejected (permission denied) | CameraBlocked | `close`, `camera.blockedTitle`, `camera.blockedBody`, `camera.photosLine`, `camera.choosePhotos` |
| W6 No webcam / blocked (desktop) | no video device, or denied | CameraBlocked in panel | `camera.webcam`, `camera.stop`, `camera.noWebcamTitle`, `camera.noWebcamBody`, `camera.choosePhotos` |
| D7 Looking, empty batch | camera on, no card, list count 0 | TopBar + Looking panel + Tray (no count card, Review held) | `close`, `mode.label/fast/normal`, `view.light`, `view.looking`, `mode.fastLine`, "Nothing on the list yet" (no key), "Review" (no key) |
| V1 Looking, Fast | no card in frame, count > 0, mode fast | Looking panel, guide dashed | `view.looking`, `mode.fastLine`, `view.onList(n)`, `view.review(n)` |
| V1n Looking, Normal | as V1, mode normal | Looking panel | `view.looking`, `mode.normalLine` |
| V2 Unsure | card in frame, fewer than 3 agreeing frames | Unsure panel + dots, guide lit | `view.unsure` (+ unkeyed body line) |
| V3 Sure | 3 agreeing frames, margin above gate | Sure guess + `.big`, guide ok | `view.add` |
| V4 Held | pointerdown on Add press while V3 | Sure guess frozen + Held badge + `.big.down` | `view.held`, `view.add` |
| V5 Added | press released on button | Added panel (role status) + flight + count-card flip; count n+1 | unkeyed "{name} is on the list", "Next card.", `view.onList(n)`, `view.review(n)` |
| V6 Not sure | 3 agreeing frames, margin below gate | Not-sure panel: pick3 + sleeve line (if sheen) + None of these, guide lit | `view.notSure`, `view.sleeves`, `view.noneOfThese` |
| V7 Dark, torch | mean brightness < ~90 for ~1s, torch capability present, torch off | DarkLine + ringed light toggle; panel continues (e.g. Unsure) | `view.darkTorch`, `view.light` |
| V8 Dark, no torch | dark as V7, no torch capability | DarkLine, no light control | `view.darkNoTorch` |
| V9 Light on | torch on | light toggle filled, `aria-pressed=true`; DarkLine gone once bright | `view.light` |
| R1 Duplicate | sure guess equals last added card, frame never empty since | Sure guess + `.okk` line + `.big2` | `again.stillOn(x)`, `again.addAnother` |
| R2 Second copy | sure guess equals a listed card, frame was empty in between | Sure guess + count line + `.big` | `again.already(x)`, `again.addSecond` |
| W2 Webcam sure (desktop) | as V3 | panel head + feed + guess row with `.bigd` | `camera.webcam`, `mode.*`, `camera.stop`, `view.add` |
| W3 Webcam not sure (desktop) | as V6 | pick3 (270 wide) + side column | `view.notSure`, `view.sleeves`, `view.noneOfThese` |

**Fast adds with no press, and Normal picks the printing in the camera** (Hugh, 2026-10-16, overriding the handoff's call 1,
"nothing without a press"; no design round, the panels reuse shipped parts):

| State | Triggering condition | Component rendered | Copy keys |
|---|---|---|---|
| V3f Sure, Fast | as V3, mode fast, not R1 | Sure guess, no press: a status line while the add lands, then V5 | `view.adding` |
| R1f Duplicate, Fast | as R1, mode fast | Sure guess + `.okk` line, no press | `again.stillOn(x)`, `view.takeOut` |
| R2f Second copy, Fast | as R2, mode fast | added by itself, as V3f | `view.adding` |
| N1 Printing step, Normal | as V3 or R2 in mode normal, a Not sure pick, or Add another copy (R1) | card name + the shipped `PrintingRegion` (`role="choose"`, `row` on the phone, `grid` on the desktop) + Not this card; a pick goes to V5 at that printing | `view.loadingPrintings` while they load, `add.choose.intro(k)` / `introPhone(k)`, `view.notThis` |

## Ambiguities found

1. Copy not in the copy file: V2 body "The name shows once the card stays the same for a moment.", V5 "{name} is on the list" / "Next card.", D7 "Nothing on the list yet" (may reuse shipped add copy) and the bare "Review" at 0. Need keys via /copy-review.
2. Mode line bolds "Fast:"/"Normal:" but `mode.fastLine`/`normalLine` carry no prefix; `view.onList(n)` returns one string but the tray bolds the count.
3. Light ring is accent pink in the JSX, `warning` in the handoff table; corner sizes 34/24 in JSX vs 28/22 in the table; desktop top-three 83 vs 86; desktop feed 250px tall vs "16:10".
4. V8 "no control": drawn as `visibility:hidden` (space kept) vs the brief's "absent"; either satisfies "never greyed".
5. V6 None of these drawn at min-height 40, below READINESS's ≥44 hit target.
6. Desktop draws no looking/unsure/held/added/again/dark states and no light control; only W2, W3, W6 plus "same rules" captions.
7. aria-live: README says the guess is `aria-live="polite"`, but only V2 and V5 panels carry `role="status"` in the drawing; V3/V6 carry none.
8. Fly-to-tray has no duration/easing and no reduced-motion rule; only the flip (~0.8s) and "both animations drop" are stated.
9. D6/W6 Choose photos is PR 5's photo path (plan); what PR 3's press does before PR 5 is not drawn.
10. D7 lost its "index ready" precondition under server matching (plan); it is simply camera-on, count 0.
