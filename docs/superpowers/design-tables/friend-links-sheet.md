# Design Property Table — Friend links Add a friend sheet

Source: `design/design_handoff_the99_friends_link/` (README, STATES-friends-link-r1, INDEX, `scratch-gen/friend-link-body.tsx`, `scratch-gen/render.tsx`, Add-Phone / Add-Desktop / Reset boards). `friend-link-body.tsx` is authoritative for classes and values. Mobile = 390 (below `md`, 768px); Desktop = 1300 (`md` and up). `pointer:fine` noted where it drives a value. Font family: `font-sans` unless the row says `font-mono`. Copy strings are recorded as STRUCTURE only (which string slot each element shows); final wording is set by /copy-review.

Frame composition (render.tsx): each A/R frame is the shipped Friends page (F0 data) with the shipped `SocialModal` open over it (`title = socialCopy.dialog.title`, `sub` = how-to-use line, `closeLabel` = Close), its body = `FriendLinkBody`. Phone frames pass `share = true` (a phone with a share sheet); desktop frames pass `share = false`. The desktop dialog is the shipped 440px dialog (Add-Desktop board); the phone sheet scrolls as shipped. Fixtures: url `https://the99.app/f/wren-k7q4xm`, code `K7Q4XM`; after reset `.../wren-r2m8tv`, `R2M8TV`.

## Component: Shared tokens

### BTN (base press class)
| Property | Mobile | Desktop |
|---|---|---|
| display | inline-flex | inline-flex |
| flex | none | none |
| cursor | pointer | pointer |
| align-items | center | center |
| justify-content | center | center |
| border-radius | 8px | 8px |
| font family | font-sans | font-sans |

### KICK (kicker class)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| font family | font-mono | font-mono |
| font-size | 10.5px | 10.5px |
| font-weight | 500 (medium) | 500 (medium) |
| text-transform | uppercase | uppercase |
| letter-spacing | .14em | .14em |
| color | var(--fg-faint) | var(--fg-faint) |

## Component: SocialModal wrapper (shipped, unchanged)

### Dialog / sheet
| Property | Mobile | Desktop |
|---|---|---|
| component | shipped `SocialModal` (bottom sheet, scrolls as shipped) | shipped `SocialModal` (440px dialog) |
| title | `socialCopy.dialog.title` (Add a friend) | same |
| sub | how-to-use line slot (QR at the table / send link or code / request on use) | same |
| close label | Close | Close |
| body | `FriendLinkBody` | `FriendLinkBody` |
| frame height (render) | vh 1500 (drawn tall enough to show the whole sheet) | vh 1340 |
| underlying page | Friends, 0 requests, 2 friends, badge 0 | same |

## Component: FriendLinkBody — link block (dimmable wrapper)

### Link block wrapper
| Property | Mobile | Desktop |
|---|---|---|
| opacity | 1; .38 when reset = confirm or busy (R1, R2) | same |
| transition | opacity (only when confirming) | same |
| aria-hidden | true when confirming | same |
| contains | QR figure, Share, link row, code row, two mono lines, success line | same |

### QR figure (`figure`)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0; margin-top 4px | 0; margin-top 4px |
| display | flex column | flex column |
| align-items | center | center |
| gap | 8px | 8px |

### QR plate (div)
| Property | Mobile | Desktop |
|---|---|---|
| border-radius | 10px | 10px |
| background | #F4F5F8 (literal light plate) | #F4F5F8 |
| padding | 16px | 16px |

### QR SVG
| Property | Mobile | Desktop |
|---|---|---|
| role / aria-label | img / "QR code for your friend link" slot | same |
| viewBox | `0 0 {qr.size} {qr.size}` from `qrPath(url, 0)` | same |
| shape-rendering | crispEdges | crispEdges |
| display | block | block |
| width × height | 203px × 203px | 174px × 174px |
| path fill | var(--bg) | var(--bg) |

### QR caption (`figcaption`)
| Property | Mobile | Desktop |
|---|---|---|
| display | hidden (`max-md:hidden`) | shown |
| font family | — | font-mono |
| font-size | — | 10.5px |
| color | — | var(--fg-faint) |
| copy | — | scan-with-phone-camera slot |

### Share link button (rendered only when `share` true)
| Property | Mobile | Desktop |
|---|---|---|
| conditional | shown when share = true (phone with a share sheet) | never (`md:hidden` wrapper; desktop frames share = false) |
| wrapper | margin-top 18px; flex column; gap 8px | hidden |
| display | flex | — |
| height | 48px | — |
| width | 100% | — |
| align / justify | center / center | — |
| gap | 8px | — |
| border-radius | 8px | — |
| border | 0 | — |
| background | var(--accent) | — |
| font | font-sans 15px, weight 600 | — |
| color | var(--bg) | — |
| cursor | pointer | — |
| icon | SVG 18×18, viewBox 0 0 24 24, fill none, stroke currentColor, stroke-width 1.8, paths `M12 15V4M8 8l4-4 4 4` + `M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7` (share-up arrow into tray), aria-hidden | — |
| copy | share-link slot | — |

### Link row (div)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| gap | 8px | 8px |
| margin-top | 8px when share; 16px when no share | 18px |

### Link field (`input readOnly`)
| Property | Mobile | Desktop |
|---|---|---|
| conditional | hidden when share = true (`max-md:hidden`); shown when share = false | shown |
| aria-label | friend-link slot | same |
| value | the url | the url |
| height | 44px | 40px |
| min-width | 0 | 0 |
| flex | 1 | 1 |
| border-radius | 8px | 6px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| padding-x | 12px | 12px |
| font family | font-mono | font-mono |
| font-size | 16px; 12.5px under `pointer:fine` | 12.5px (pointer:fine); 16px on coarse pointer |
| color | var(--fg-body) | var(--fg-body) |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| copy-failed fallback | shipped: field selected for a long press | same |

### Copy link button — share = true variant (phone frames)
| Property | Mobile | Desktop (md+ if share were true) |
|---|---|---|
| flex | none | none |
| cursor | pointer | pointer |
| height | 44px | 40px |
| width | 100% | auto |
| border-radius | 8px | 6px |
| background | transparent | var(--accent) |
| border | 1px solid var(--border-strong) | 0 |
| padding-x | 0 (none set) | 16px |
| font | font-sans 14px, weight 500 | font-sans 13px, weight 600 |
| color | var(--fg) | var(--bg) |
| role | secondary under Share link | leading press |
| copy | copy-link slot | copy-link slot |

### Copy link button — share = false variant (desktop frames; phone without share sheet)
| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| cursor | pointer | pointer |
| height | 44px | 40px |
| border-radius | 8px | 6px |
| border | 0 | 0 |
| background | var(--accent) | var(--accent) |
| padding-x | 14px | 16px |
| font | font-sans 13px, weight 600 | font-sans 13px, weight 600 |
| color | var(--bg) | var(--bg) |
| placement | beside the field, leading | beside the field, leading |

### Your code row (div)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 14px | 14px |
| display | flex | flex |
| align-items | center | center |
| justify-content | space-between | space-between |
| gap | 12px | 12px |
| border-radius | 10px | 10px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| padding | 10px 14px | 10px 14px |
| border | 1px solid var(--border) | 1px solid var(--border) |

### Your code row — label stack (span)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex column | flex column |
| min-width | 0 | 0 |
| gap | 2px | 2px |
| kicker | KICK class; your-code kicker slot | same |
| sub line | font-mono 11px, var(--fg-muted); type-it-in-Add-a-friend slot | same |

### Your code value (span)
| Property | Mobile | Desktop |
|---|---|---|
| aria-label | your-code slot + code characters spaced | same |
| font family | font-mono | font-mono |
| font-size | 22px | 22px |
| font-weight | 600 | 600 |
| letter-spacing | .16em | .16em |
| color | var(--fg) | var(--fg) |
| structure | first 3 chars + separator `·` + last 3 chars | same |
| separator | `·`, aria-hidden, color var(--fg-faint) | same |

### Works-for-anyone line (p)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0; margin-top 12px | 0; margin-top 10px |
| font family | font-mono | font-mono |
| font-size | 11px | 11px |
| line-height | 1.55 | 1.55 |
| color | var(--fg-muted) | var(--fg-muted) |
| text-align | center when share; else start | start |
| copy | reusable-until-reset slot | same |

### Invites line (p)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0; margin-top 4px | 0; margin-top 4px |
| font family | font-mono | font-mono |
| font-size | 11px | 11px |
| line-height | 1.55 | 1.55 |
| color | left > 0: var(--fg-muted); left = 0: var(--fg-faint) | same |
| text-align | center when share; else start | start |
| copy, left > 0 | someone-new-uses-an-invite slot + ` · ` + count (`1 invite left` singular / `N invites left` plural) | same |
| copy, left = 0 | out-of-invites slot (players can still add you; newcomers can't join yet) | same |

### New link success line (p, rendered only when `newCode`)
| Property | Mobile | Desktop |
|---|---|---|
| conditional | R3 only | R3 only |
| role | status | status |
| margin | 0; margin-top 8px | 0; margin-top 8px |
| font-size | 12.5px | 12.5px |
| line-height | 1.5 | 1.5 |
| color | var(--success) | var(--success) |
| text-align | center when share; else start | start |
| copy | `✓` + new-link-and-code slot | same |

## Component: FriendLinkBody — Reset

### Reset link and code (quiet press; rendered when reset = idle or done)
| Property | Mobile | Desktop |
|---|---|---|
| wrapper | margin-top 6px; flex; justify-content center when share | margin-top 6px; flex; start |
| min-height | 44px | 32px |
| cursor | pointer | pointer |
| border | 0 | 0 |
| background | transparent | transparent |
| padding-x | 0 | 0 |
| font | font-sans 13px, weight 500 | font-sans 13px, weight 500 |
| color | var(--fg-muted) | var(--fg-muted) |
| text-decoration | underline, color var(--border-dashed), offset 3px | same |
| copy | reset-link-and-code slot | same |
| conditional | replaced by the confirm box when reset = confirm/busy | same |

### Reset confirm box (div, rendered when reset = confirm or busy)
| Property | Mobile | Desktop |
|---|---|---|
| role | alertdialog, aria-labelledby reset-title | same |
| margin-top | 14px | 14px |
| display | flex column | flex column |
| gap | 6px | 6px |
| border-radius | 12px | 12px |
| background | var(--surface-inset) | var(--surface-inset) |
| padding | 14px | 14px |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| placement | under the dimmed (.38) link block | same |

### Reset confirm title (p#reset-title)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| font-size | 14px | 14px |
| font-weight | 600 | 600 |
| color | var(--fg) | var(--fg) |
| copy | reset-question slot | same |

### Reset confirm body (p)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| font-size | 12.5px | 12.5px |
| line-height | 1.5 | 1.5 |
| color | var(--fg-body) | var(--fg-body) |
| copy | what-stops / what-stays slot | same |

### Reset confirm actions row
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 8px | 8px |
| display | flex | flex |
| flex-direction | column (stacked) | row (side by side) |
| gap | 8px | 8px |

### Reset (danger) button
| Property | Mobile | Desktop |
|---|---|---|
| base | BTN | BTN |
| height | 44px | 36px |
| border | 0 | 0 |
| background | var(--danger) | var(--danger) |
| padding-x | 16px | 16px |
| font-size | 14px | 13px |
| font-weight | 600 | 600 |
| color | var(--fg) | var(--fg) |
| width | stretches (column flex) | auto |
| busy (R2) | opacity .6; aria-busy; copy resetting-ellipsis slot | same |
| copy, idle | reset-link-and-code slot | same |

### Keep them button
| Property | Mobile | Desktop |
|---|---|---|
| base | BTN | BTN |
| height | 44px | 36px |
| background | transparent | transparent |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| padding-x | 16px | 16px |
| font-size | 14px | 13px |
| font-weight | 400 (unset) | 400 (unset) |
| color | var(--fg) | var(--fg) |
| copy | keep-them slot | same |
| action | returns to the quiet Reset press | same |

## Component: CodeSection (a friend's code)

### Section (both variants)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 18px | 18px |
| padding-top | 16px | 16px |
| border-top | 1px solid var(--border) | 1px solid var(--border) |

### Section heading (p)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| font-size | 13px | 13px |
| font-weight | 600 | 600 |
| color | var(--fg) | var(--fg) |
| copy | have-a-friend's-code slot | same |

### Section sub (p)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0; margin-top 2px | 0; margin-top 2px |
| font-size | 12.5px | 12.5px |
| line-height | 1.5 | 1.5 |
| color | var(--fg-muted) | var(--fg-muted) |
| copy | type-it-to-send-a-request slot | same |

### Entry row (boxes + Send request)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 12px | 12px |
| display | flex | flex |
| flex-direction | column | row |
| align-items | stretch | center |
| gap | 10px | 12px |

### Boxes group
| Property | Mobile | Desktop |
|---|---|---|
| role / aria-label | group / friend's-code slot | same |
| position | relative (`group`) | same |
| inner row | aria-hidden; flex; gap 6px; justify-content center | flex; gap 6px; justify-content start |
| count | 6 boxes; gap after the 3rd (box index 3 gets margin-left 10px) | same |

### Code box (span ×6)
| Property | Mobile | Desktop |
|---|---|---|
| box-sizing | border-box | border-box |
| display | flex; center/center | flex; center/center |
| height | 50px | 44px |
| width | 42px | 38px |
| border-radius | 8px | 8px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| font family | font-mono | font-mono |
| font-size | 20px | 18px |
| font-weight | 600 | 600 |
| color, filled | var(--fg) | var(--fg) |
| color, empty | var(--fg-disabled) | var(--fg-disabled) |
| content, empty | `·` placeholder | same |
| border, empty | 1px solid var(--border-strong) | same |
| border, filled | 1px solid var(--accent) | same |
| border, wrong/own (A6, A7) | 1px solid var(--danger) on all six | same |
| focus ring | box-shadow 0 0 0 2px var(--accent) on box index min(len, 5) when len < 6, not busy, not wrong | same |
| box index 3 | margin-left 10px | margin-left 10px |

### Send request button
| Property | Mobile | Desktop |
|---|---|---|
| base | BTN | BTN |
| height | 48px | 44px |
| width | 100% | auto |
| padding-x | 18px | 18px |
| font-size | 15px | 13.5px |
| font-weight | 600 | 600 |
| disabled | when not ready (len < 6 or wrong/own) | same |
| ready (A4) | border 0; bg var(--accent); color var(--bg) | same |
| off (A1–A3, A6, A7) | bg transparent; color var(--fg-locked); border 1px solid var(--border) | same |
| busy (Sending) | aria-busy; bg !var(--accent-strong); copy sending-ellipsis slot | same |
| copy | send-request slot | same |

### Wrong-code alert (p, entry = wrong)
| Property | Mobile | Desktop |
|---|---|---|
| role | alert | alert |
| margin | 0; margin-top 8px | 0; margin-top 8px |
| font-size | 12.5px | 12.5px |
| line-height | 1.45 | 1.45 |
| color | var(--danger) | var(--danger) |
| text-align | center | start |
| copy | no-player-has-that-code slot (never says whether it once existed) | same |

### Own-code alert (p, entry = own)
| Property | Mobile | Desktop |
|---|---|---|
| role | alert | alert |
| margin | 0; margin-top 8px | 0; margin-top 8px |
| font-size | 12.5px | 12.5px |
| line-height | 1.45 | 1.45 |
| color | var(--danger) | var(--danger) |
| text-align | center | start |
| copy | that's-your-own-code slot | same |

### Result card (entry = sent / friends / accepted; replaces boxes)
| Property | Mobile | Desktop |
|---|---|---|
| role | status | status |
| margin-top | 10px | 10px |
| display | flex | flex |
| align-items | center | center |
| gap | 12px | 12px |
| border-radius | 10px | 10px |
| padding | 12px | 12px |
| background, sent / friends | var(--surface-inset) | same |
| background, accepted (A9) | color-mix(in oklab, var(--success) 6%, var(--surface-inset)) | same |
| border | 1px solid var(--border) | 1px solid var(--border) |

### Result card — Face
| Property | Mobile | Desktop |
|---|---|---|
| component | shipped `Face` (signature art, else initials) | same |
| size | 40 | 40 |

### Result card — text stack
| Property | Mobile | Desktop |
|---|---|---|
| display | flex column | flex column |
| min-width | 0 | 0 |
| flex | 1 | 1 |
| gap | 2px | 2px |

### Result card — title
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 14px | 14px |
| font-weight | 600 | 600 |
| color | var(--fg) | var(--fg) |
| check mark | `✓`, aria-hidden, margin-right 6px, color var(--success); shown for sent and accepted, not for friends | same |
| name rendering | `PersonText` (ThirdPartyName) | same |
| copy, sent | request-sent-to {name} slot | same |
| copy, accepted | you-and-{name}-are-friends slot | same |
| copy, friends | you-and-{name}-are-already-friends slot | same |

### Result card — detail
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12.5px | 12.5px |
| line-height | 1.45 | 1.45 |
| color | var(--fg-body) | var(--fg-body) |
| name rendering | `PersonText` | same |
| copy, sent | {name}-sees-it-on-Friends slot | same |
| copy, accepted | {name}-had-already-sent-a-request slot | same |
| copy, friends | nothing-to-send slot | same |

### Enter another code (press under the result card)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 4px | 4px |
| min-height | 44px | 32px |
| cursor | pointer | pointer |
| border | 0 | 0 |
| background | transparent | transparent |
| padding-x | 0 | 0 |
| font | font-sans 13px, weight 500 | font-sans 13px, weight 500 |
| color | var(--accent-text) | var(--accent-text) |
| action | brings the boxes back (entry = empty) | same |
| copy | enter-another-code slot | same |

## Component: Invite by email row (sheet foot)

### Row (`a`)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 14px | 14px |
| display | flex | flex |
| min-height | 48px | 44px |
| align-items | center | center |
| justify-content | space-between | space-between |
| gap | 12px | 12px |
| border-radius | 10px | 10px |
| padding-x | 14px | 14px |
| font-size | 13.5px | 13.5px |
| font-weight | 500 | 500 |
| color | var(--fg) | var(--fg) |
| text-decoration | none | none |
| border | 1px solid var(--border) | 1px solid var(--border) |
| action | opens the shipped email path | same |

### Row label stack
| Property | Mobile | Desktop |
|---|---|---|
| display | flex column | flex column |
| min-width | 0 | 0 |
| line 1 copy | invite-someone-new-by-email slot | same |
| line 2 font | font-mono 10.5px, weight 400 | same |
| line 2 color | var(--fg-faint) | var(--fg-faint) |
| line 2 copy, left > 0 | uses-an-invite + ` · ` + `{N} left` slot | same |
| line 2 copy, left = 0 | out-of-invites slot | same |

### Row chevron
| Property | Mobile | Desktop |
|---|---|---|
| glyph | `›`, aria-hidden | same |
| font-size | 16px | 16px |
| color | var(--fg-muted) | var(--fg-muted) |

## Element order (top to bottom)

| # | Mobile (share = true) | Desktop (share = false) |
|---|---|---|
| 1 | QR plate (203) | QR plate (174) + caption |
| 2 | Share link (accent, full width) | Link field + Copy link (accent) in a row |
| 3 | Copy link (outlined, full width; field hidden) | — |
| 4 | Your code row | Your code row |
| 5 | Works-for-anyone line (centered) | Works-for-anyone line |
| 6 | Invites line (centered) | Invites line |
| 7 | Success line (R3 only, centered) | Success line (R3 only) |
| 8 | Reset press (centered) or confirm box | Reset press or confirm box |
| 9 | Code section: head, sub, boxes (centered) stacked over full-width Send request | Code section: head, sub, boxes + Send request in a row |
| 10 | Email row | Email row |

## State Coverage

| State | Trigger (props) | What renders |
|---|---|---|
| A1 | left = 3, entry empty, reset idle | Full sheet; invites line muted with `3 left (after /copy-review)`; boxes all empty `·`, focus ring on box 1; Send request off; email row `3 left` |
| A2 | left = 0, entry empty | As A1; invites line switches to out-of-invites slot in var(--fg-faint); email row line 2 out-of-invites; nothing else held or greyed |
| A3 | entry typing, 3 chars | Boxes 1–3 filled (accent border, var(--fg)); ring on box 4; Send request off |
| A4 | entry typing, 6 chars | All six accent-bordered; no ring; Send request on (accent) |
| Sending (undrawn) | entry busy, 6 chars | No ring; Send request aria-busy, bg var(--accent-strong), sending-ellipsis copy; boxes and press held |
| A5 | entry sent | Boxes + press replaced by result card (surface-inset), Face 40, ✓ + request-sent title, sees-it-on-Friends detail; Enter another code |
| A6 | entry wrong, 6 chars | All boxes danger-bordered; no ring; Send request off; danger alert no-player-has-that-code |
| A7 | entry own, own code typed | All boxes danger-bordered; Send request off; danger alert own-code |
| A8 | entry friends | Result card (surface-inset), no ✓, already-friends title, nothing-to-send detail; Enter another code |
| A9 | entry accepted | Result card on success wash (6% success mix), ✓ + are-friends title, had-already-sent detail; Enter another code; their row leaves Waiting on you |
| R1 | reset confirm | Link block opacity .38 + aria-hidden; reset press replaced by alertdialog box (title, body, danger Reset + Keep them; stacked mobile, row desktop) |
| R2 | reset busy | As R1; danger press opacity .6, aria-busy, resetting-ellipsis copy |
| R3 | reset idle, newCode true | New QR, url and code (`R2M·8TV`); success status line `✓ …` under invites line; quiet Reset press back |
| Reset failed (undrawn) | reset request fails | Shared toast with Try again; old link and code stay |
| Copy failed (undrawn) | clipboard fails | Shipped: field selected for a long press |
| share = false on a phone | phone without a share sheet | No Share link; link field shown (44px) + accent Copy link (44px, px14); lines and reset press left-aligned |
