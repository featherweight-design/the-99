# Design review: Settings push column (push line, PR 4)

Handoff: `design/design_handoff_the99_push/` (Settings, Device-States, The-Ask, iPhone boards; `STATES-push.md`, `README.md`,
`READINESS.md`). Implementation: `src/components/settings/news-section.tsx`, `src/components/settings/push-how-sheet.tsx`,
`src/lib/copy/push-settings.ts`, `src/lib/push/device.ts`, `src/lib/push/device-browser.ts`.

Process: the design-review skill. Agent 1 enumerated the table below from the handoff alone (CSS anchors
`/* ---------- What's new on Home, with the push column` and `/* the guidance sheet`, byte-identical across the four
boards). Each row was then verified against the implementation; the mismatches are listed at the foot with their fixes,
and each fix was re-checked (Agent 3). Copy WORDING is `/copy-review`'s; rows below check that each state has its
key and that the key carries the handoff's placeholder words.

Widths: Mobile is the 390 board, Desktop the 1300 board (`md`). Where one value serves both, it is written once.

## Section and head

| # | Element | Property | Mobile | Desktop | Implementation | Result |
|---|---|---|---|---|---|---|
| 1 | Section | margin-top | 26px | 34px | `mt-[26px] md:mt-[34px]` | MATCH |
| 2 | Head row | display / align / justify | flex / center / space-between | same | `SECTION_HEAD` + `justify-between` while the column stands | MATCH |
| 3 | Head row | min-height | 44px | 32px | `min-h-[44px] md:min-h-[32px]` | MATCH |
| 4 | Head row | padding-bottom | — | 8px | `md:pb-[8px]` | MATCH |
| 5 | Head row | border-bottom | 1px solid var(--border) | same | `[border-bottom:1px_solid_var(--border)]` | MATCH |
| 6 | Head row | font | 500 10.5px Plex Mono, .14em, uppercase | same | `font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase` | MATCH |
| 7 | Head row | color | var(--fg-faint) | same | `text-[color:var(--fg-faint)]` | MATCH |
| 8 | Column head "Push" | width / flex / align | 44px / none / center | same | `w-[44px] flex-none text-center` | MATCH |
| 9 | Column head | conditional | absent in Can't and with push off | same | `column && …` (`column` = push given and state ≠ cant) | MATCH |

## Row list and kind rows

| # | Element | Property | Mobile | Desktop | Implementation | Result |
|---|---|---|---|---|---|---|
| 10 | `ul` | margin / padding / list-style | 4px 0 0 / 0 / none | same | `m-0 mt-[4px] list-none p-0` | MATCH |
| 11 | `li` | display / align-items | flex / flex-start | same | `flex items-start` | MATCH |
| 12 | `li + li` | border-top | 1px solid var(--border) | same | `ROW_SEP` | MATCH |
| 13 | first `li` (device row) | border-top | — | — | none (first child) | MATCH |
| 14 | Press `.hl` | flex / min-width | 1 / 0 | same | `min-w-0 flex-1` with the column | MATCH |
| 15 | Press `.hl` | display / align / gap | flex / flex-start / 12px | same | `flex items-start gap-[12px]` | MATCH |
| 16 | Press `.hl` | min-height / padding | 44px / 8px 0 | same | `min-h-[44px] py-[8px]` | MATCH |
| 17 | Home box | margin-top | 1px | same | `className="mt-[1px]"` | MATCH |
| 18 | Text `.ct` | flex / min-width / direction / gap | 1 / 0 / column / 2px | same | `flex min-w-0 flex-1 flex-col gap-[2px]` | MATCH |
| 19 | Title | font / color | 500 14px Plex Sans / var(--fg) | same | `NAME` | MATCH |
| 20 | Sub-line | size / line-height / color | 12.5px / 1.45 / var(--fg-muted) | same | `LINE` | MATCH |
| 21 | Push cell `.pc` | flex / width / min-height | none / 44px / 44px | same | `PUSH_CELL` | MATCH |
| 22 | Push cell | display / justify | flex / center | same | `flex justify-center` | MATCH |
| 23 | Push cell | padding-top / margin-left | 9px / 8px | same | `pt-[9px] ml-[8px]` | MATCH |
| 24 | Push cell | aria-label | "Push: <kind name>" | same | `kindAria(kind)` | MATCH |
| 25 | Push cell | conditional | absent in Can't and with push off | same | `column ?` branch | MATCH |
| 26 | Pressed highlight `.pc.lit` | — | board press indicator only | — | not built (no hover/focus specified; the shipped Checkbox's own focus ring) | MATCH (n/a) |
| 27 | Default ticks | push box for Friends asking | on (G2 default `spare-request`) | same | `loadPushKinds` (`lib/push/prefs.ts`), by the feed's rule: `spare-request` on until declined | MATCH |

## Checkbox (shipped `ui/checkbox.tsx`, both columns)

| # | Element | Property | Mobile | Desktop | Implementation | Result |
|---|---|---|---|---|---|---|
| 28 | Box | 18×18, radius 4, 1.5px var(--fg-faint), ✓ on var(--accent) | — | same | the shipped `Checkbox` | MATCH |
| 29 | Disabled (Blocked device box) | opacity | .5 | same | `disabled` → `peer-disabled:opacity-50` | MATCH |

## Device row

| # | Element | Property | Mobile | Desktop | Implementation | Result |
|---|---|---|---|---|---|---|
| 30 | Row press | gap / min-height / padding | 12px / 44px / 8px 0 | same | `gap-[12px] min-h-[44px] py-[8px]` | MATCH |
| 31 | Bell slot | 18×18, flex none, mt 1px, centered | — | same | `h-[18px] w-[18px] flex-none mt-[1px] flex items-center justify-center` | MATCH |
| 32 | Bell slot | color | var(--fg-muted) | same | `text-[color:var(--fg-muted)]` | MATCH |
| 33 | Bell SVG | size / viewBox / stroke | 18, 0 0 20 20, 1.5, round, currentColor | same | `Bell()` | MATCH |
| 34 | Bell SVG | path 1, path 2 | `M5.6 8.4a4.4…z`, `M8.3 16.2a1.8…0` | same | identical `d` | MATCH |
| 35 | Bell | shown in | every state, Can't included | same | device `li` drawn whenever push is given | MATCH |
| 36 | Title | device word | "phone" / "iPhone" | "browser" | `deviceWord` | MATCH |
| 37 | Title / line | type | as rows 19, 20 | same | `NAME`, `LINE` | MATCH |
| 38 | Blocked lead | color | var(--fg-body) | same | `text-[color:var(--fg-body)]` | MATCH |
| 39 | How › | font / color / white-space | 500 12.5px Plex Sans / var(--accent-text) / nowrap | n/a | `font-sans text-[12.5px] font-medium text-[color:var(--accent-text)] whitespace-nowrap` | MATCH |
| 40 | Device box | geometry | as row 21–23 | same | `PUSH_CELL` | MATCH |
| 41 | Device box | states | empty / on / disabled (Blocked); absent in Can't | same | `checked={state==="on"}`, `disabled` on blocked, inside `column &&` | MATCH |

## State coverage: the device row

| # | State | Trigger | Renders | Implementation | Result |
|---|---|---|---|---|---|
| 42 | Not on yet | permission `default` | empty live box; "Not on yet. Tick here or beside a kind, and your browser asks first." (installed iPhone: "your iPhone asks first.") | `deviceState` → `not-on`; `notOn(installedIphone ? "iPhone" : "browser")` | REACHABLE (contact sheet, both widths, with `Notification.permission` STAGED as `default`: headless Chromium never reports it) |
| 43 | On | granted + subscribed | ticked box; "On. Sends what you tick under Push. Your other devices have their own switch." | `on`; `p.device.on` | REACHABLE (unit test; a headless browser cannot subscribe) |
| 44 | Off here | granted, not subscribed | empty box; "Off on this device. Your ticks are kept." | `off-here`; `p.device.offHere` | REACHABLE (contact sheet, both widths: new headless Chromium, `notifications` granted) |
| 45 | Blocked | permission `denied` | disabled box; lead + rest (installed iPhone: "Turned off in iPhone Settings › Notifications › The 99.") | `blocked`; `blocked.browser` / `blocked.iPhone` | REACHABLE (contact sheet, both widths: headless Chromium's own `denied`; the iPhone variant by unit test) |
| 46 | Needs Home Screen | iOS ≥ 16.4, not standalone | empty live box; "On iPhone, push works once The 99 is on your Home Screen." + How ›; box, How › and any push tick open the sheet, the tick saved first | `home-screen`; `toggleDevice`/`togglePush` → `setSheet(true)` after `savePushKinds` is sent | REACHABLE (contact sheet, iPhone UA) |
| 47 | Can't | no Push API or no worker, or iOS < 16.4 | no box, no column, no head; "This browser can’t get push notifications. Home still shows everything." (old iOS: "Needs iOS 16.4 or later.") | `cant`; `p.device.cant` / `p.device.oldIos` | REACHABLE (unit test) |
| 48 | Push off (G8) | `PUSH_ENABLED` off or no VAPID keys | section as shipped, today's foot | `push === null` | REACHABLE (unit test) |

## Foot line

| # | Element | Property | Mobile | Desktop | Implementation | Result |
|---|---|---|---|---|---|---|
| 49 | Foot | margin-top / font / color | 10px / 10.5px/1.6 Plex Mono / var(--fg-faint) | same | `mt-[10px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]` | MATCH |
| 50 | Foot `b` | weight / color | 500 / var(--fg-muted) | same | `font-medium text-[color:var(--fg-muted)]` | MATCH |
| 51 | Foot, push possible | words | "Home: in the app, a count on Home and the list. **Push**: only to devices you turn on, and never 9pm to 9am. No email, ever." | same | `p.foot` | MATCH |
| 52 | Foot, Can't | words | "Home: in the app, a count on Home and the list. No email, ever." | same | was `feedCopy.news.foot` ("In the app only: …"); now `p.footCant` | FIXED (gap 1) |

## The iPhone guidance sheet (phone only)

| # | Element | Property | Mobile | Implementation | Result |
|---|---|---|---|---|---|
| 53 | Box, scrim, handle | the shipped sheet box (caption: "The shipped sheet box with a ✕") | `Sheet` (`ui/sheet.tsx`) | MATCH by reference: the board's `.gst` drawing (radius 14px, `--surface-raised`, 40px handle) approximates the shipped box (radius 16px, `--surface-rail`, 36px handle), which the caption names |
| 54 | Header | title + ✕ | the shipped `SheetHeader` | MATCH by reference: the board's `.mh` (600 15px Plex Sans, bare 44px ✕) is the bundle's generic modal drawing; README and READINESS name the shipped box with its ✕, which every app sheet uses |
| 55 | Body `.mb` | display / direction | flex / column | `flex flex-col` | MATCH |
| 56 | Body `.mb` | gap | 12px | was none; now `gap-[12px]` | FIXED (gap 2) |
| 57 | Body `.mb` | padding | 14px 16px 24px | was `px-[16px] pb-[24px]` (no top); now `pt-[14px] px-[16px] pb-[24px]` | FIXED (gap 3) |
| 58 | Lead `p.ln` | size / line-height / color | 13.5px / 1.55 / var(--fg-body) | `text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]` | MATCH |
| 59 | Steps `ol` | margin / padding / list / direction | 4px 0 0 / 0 / none / column | `m-0 mt-[4px] p-0 list-none flex flex-col` | MATCH |
| 60 | Step `li` | display / gap / align / padding | flex / 12px / flex-start / 10px 0 | `flex items-start gap-[12px] py-[10px]` | MATCH |
| 61 | Step `li` | border-top (not first) | 1px solid var(--border) | `[&+&]:[border-top:…]` | MATCH |
| 62 | Number `i` | 22×22, round, 1px var(--border-strong) | — | `h-[22px] w-[22px] rounded-full border border-[color:var(--border-strong)]` | MATCH |
| 63 | Number `i` | font / align / color | 500 11px/20px Plex Mono, normal / center / var(--fg-muted) | `font-mono text-[11px] font-medium leading-[20px] not-italic text-center text-[color:var(--fg-muted)]` | MATCH |
| 64 | Step text | size / line-height / color | 14px / 1.5 / var(--fg) | `text-[14px] leading-[1.5] text-[color:var(--fg)]` | MATCH |
| 65 | Step small | display / size / color | block / 12.5px / var(--fg-muted) | `block text-[12.5px] text-[color:var(--fg-muted)]` | MATCH |
| 66 | "Add to Home Screen" | weight | `<b>`, no rule (browser bold, 700) | was `font-semibold` (600); now `font-bold` | FIXED (gap 4) |
| 67 | Glyph wrapper | display / vertical-align / color | inline-flex / -3px / #0a84ff | `inline-flex align-[-3px] text-[#0a84ff]` | MATCH |
| 68 | Share glyph | 17, 0 0 20 20, 1.6, three paths | — | identical | MATCH |
| 69 | Add glyph | 17, rect 3.5/3.5/13/13 rx 3, `M10 7v6M7 10h6` | — | identical | MATCH |
| 70 | Step order | Tap [share] Share…; Choose **Add to Home Screen** [add].; Open The 99… + small | — | `sheet.steps` | MATCH |
| 71 | Foot `p.foot.m` | font / size / color | Plex Mono / 10.5px / var(--fg-faint) | `font-mono text-[10.5px] text-[color:var(--fg-faint)]` | MATCH |
| 72 | Foot `p.foot.m` | margin | 0 (`p{margin:0}`; spacing is the body's 12px gap) | was `mt-[6px]`; now `m-0` | FIXED (gap 5) |

## Gaps found and fixed

1. `news-section.tsx` foot, Can't state: design "Home: in the app, a count on Home and the list. No email, ever." →
   implementation drew the switch-off foot ("In the app only: …"). New key `pushSettingsCopy.footCant`, drawn when push
   is given and the device reads Can't; the switch-off foot is unchanged. Test updated.
2. `push-how-sheet.tsx` body gap: design 12px → implementation none.
3. `push-how-sheet.tsx` body top padding: design 14px → implementation 0.
4. `push-how-sheet.tsx` "Add to Home Screen" weight: design bold (700) → implementation 600.
5. `push-how-sheet.tsx` foot margin-top: design 0 (inside the 12px gap) → implementation 6px.

Confirm pass (Agent 3, the five items only, re-read in the source after the edit): all five FIXED. 72 rows; 0 gaps remain.

Not checked here: the shipped `Sheet`, `SheetHeader` and `Checkbox` themselves (shared, reviewed where they shipped);
the On state on a real device (Hugh's check; headless Chromium cannot subscribe), and Not on yet under a real `default`
permission (the contact sheet stages it).
