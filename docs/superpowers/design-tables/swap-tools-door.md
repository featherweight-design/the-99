# Design table: the card-modal door, card → sheet → card, and the key line (swap tools PR 4c)

**Sources.** All paths are relative to `design/design_handoff_the99_swap_tools/`.
The governing text is `addendum_staples_door_stacking/ADDENDUM-README.md:18-38` (§2 the door, §3 card → sheet → card)
and `:43-48` (the copy owed). The door, the stacked card and the swapped state come from
`addendum_staples_door_stacking/Card Details.dc.html:34-61` (desktop art column and phone art header and strip),
`:122-140` (stacked footer and the desktop close and back controls) and `:165-196` (`renderVals`: door text, ink,
styles, aria). The sheet's way back comes from `addendum_staples_door_stacking/Stand-ins Sheet.dc.html:34-39` (the
head) and `:237-258` (`from="card"`: `backWide`, `closeX`, `closeAria`, `sheetStyle`, `headStyle`), with the taken row
at `:88-94`. The frames, offsets and scrims come from `addendum_staples_door_stacking/Swap Tools Addendum.dc.html:48-87`
(1b, the door at 1300 and 390, over and under) and `:89-169` (1c: the Escape table at `:99-105`, step 2 at `:106-124`,
step 3 at `:126-148`, after Take at `:150-167`). The key line is `Shopping View.dc.html:65-82` (the limit block, key at
`:81`) with its styles at `:215-216`. The addendum folder's `Shopping View.dc.html` is byte-identical to the parent's.
The audit is `READINESS-audit.md:207-263`, and its findings F16 (`:242`), F17 (`:243`), F20 (`:246`) and F22 (`:248`)
override the drawing where they speak. Font families are recorded as the design spells them. The design writes
`'IBM Plex Mono',monospace` and `'IBM Plex Sans',sans-serif` literally; `var(--display)` is the only family token it uses.

Where a cell says **(audit)**, a finding overrides the drawing, and the finding wins.

## 1 · The door, desktop (art column)

| # | Element | Property | Mobile (390) | Desktop (1300, 824 modal) |
|---|---|---|---|---|
| 1 | Art column (host, shipped) | Layout | n/a | `flex:none; width:322px; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:24px 28px; background:var(--bg)` (Card Details:35). The door is its last child, after art, `Click to zoom`, flip and the price row |
| 2 | Door block | Position | n/a | Directly under the price row (price tag + optional `from $x`), inside the art column. Card Details:39-45 |
| 3 | Door block | Layout | n/a | `display:flex; flex-direction:column; align-items:center; gap:8px; margin-top:2px` (so 14px under the price row, with the column's 12px gap) |
| 4 | Limit line | Typography | n/a | `'IBM Plex Mono',monospace`; 10.5px; weight inherited (400); no letter-spacing, no transform; line-height inherited; `white-space:nowrap` (`doorLimitStyle`, :175) |
| 5 | Limit line | Color, over | n/a | `var(--warning)` |
| 6 | Limit line | Color, under | n/a | `var(--fg-faint)` |
| 7 | Limit line | Copy structure | n/a | over: `over your {limit} limit`; under: `under your {limit} limit`. Drawn as `$10` (:167) |
| 8 | Link (control) | Element | n/a | Drawn as `<span role="button">` (:43). **(audit F22)** a native `<button type="button">` |
| 9 | Link | Layout | n/a | `display:inline-flex; align-items:center; gap:7px; white-space:nowrap`. No padding, no min-height drawn |
| 10 | Link | Typography | n/a | Family inherited from the modal root, `'IBM Plex Sans',sans-serif`; 13px; weight 600; color `var(--accent)` |
| 11 | Link glyph | Glyph | n/a | `⇄`, `aria-hidden="true"`, `'IBM Plex Mono',monospace`, inherits 13px / 600 / `--accent` |
| 12 | Link label | Text + underline | n/a | `See cheaper stand-ins →` in one span with `border-bottom:1px solid var(--accent-shadow)` (the arrow sits inside the underline) |
| 13 | Link | Hover / focus | n/a | Not drawn. The file's only hover rule is `a:hover { color: var(--accent-hover) }` (:29), which does not reach a span or button. No focus ring drawn |
| 14 | Link | Condition | n/a | Rendered only for `door` = over or under (`doorLink`, :174). Absent in the swapped state |
| 15 | Price tag (neighbour) | Recolor | n/a | Drawn `--warning` text and `--warning` 1px border on every card (:39). **(audit F20)** the reason given is wrong; the shipped tag is `--accent` on an `--accent-dim` edge (dashed `--fg-locked` unpriced). Leave the tag alone; the limit line alone carries over/under |

## 2 · The door, phone (44px strip)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| 16 | Strip | Position | Directly under the 180px art header (which holds the price tag), before the scrolling content (Card Details:49-60). The content column and fixed footer are unchanged (canvas :53) | n/a |
| 17 | Strip | Layout | `display:flex; align-items:center; gap:10px; min-height:44px; padding:0 6px 0 16px` (top 0, right 6, bottom 0, left 16) | n/a |
| 18 | Strip | Background / border | `background:var(--bg)`; `border-bottom:1px solid var(--border)`; no radius, no top border | n/a |
| 19 | Limit line (left) | Layout | `flex:1; min-width:0; white-space:nowrap` (`doorLimitStylePhone`, :176) | n/a |
| 20 | Limit line | Typography | `'IBM Plex Mono',monospace`; 10.5px; weight 400 inherited; no letter-spacing or transform | n/a |
| 21 | Limit line | Color | over `var(--warning)`; under `var(--fg-faint)`; swapped `var(--success)` | n/a |
| 22 | Link (right) | Element | Drawn as `<span role="button">` (:58). **(audit F22)** a native `<button type="button">` | n/a |
| 23 | Link | Layout / target | `flex:none; display:inline-flex; align-items:center; gap:7px; min-height:44px; padding:0 10px; white-space:nowrap`. 44px target | n/a |
| 24 | Link | Typography | inherited `'IBM Plex Sans'`; 13px; 600; `var(--accent)` | n/a |
| 25 | Link glyph + label | Glyph / underline | `⇄` aria-hidden, mono; label `See cheaper stand-ins →` with `border-bottom:1px solid var(--accent-shadow)` | n/a |
| 26 | Link | Hover / focus | Not drawn | n/a |
| 27 | Phone art-header close (neighbour) | Control | `×`, 44×44, `position:absolute; top:6px; right:6px`, mono 14px, `var(--fg)`; aria `Close` (unstacked) or `Back to cheaper stand-ins` (stacked) (:53, :180) | n/a (desktop close is row 49) |

## 3 · Door visibility and the swapped state

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| 28 | Door | When it renders | Only when the modal was opened from a Shopping row (README :23; canvas :56). Opened from the collection, search or a set page, the art column is as shipped. **(audit F17)** a deck/deckName alone does not identify Shopping; the Shopping row's opener passes the limit or an explicit flag, and the door renders only when that is present | same |
| 29 | Door | Paging | Prev/Next page through the Shopping list, and the door follows each card's own limit state (over/under) (canvas :56) | same |
| 30 | Door | On a stacked stand-in card | Not rendered (the canvas's stacked `canyon` import passes no `door`, :146) | Not rendered (:135) |
| 31 | Swapped line | Replaces | The whole strip's content: the limit line slot shows the swapped sentence, the link is not rendered (`doorLink` false). Strip keeps its 44px min-height, `--bg`, bottom border | The door block keeps its layout (column, gap 8, margin-top 2) with the line alone, no link |
| 32 | Swapped line | Typography / color | mono 10.5px, nowrap, `flex:1; min-width:0`, `var(--success)` | mono 10.5px, nowrap, `var(--success)` |
| 33 | Swapped line | Copy structure | `swapped out · {stand-in name} is in` (drawn `Sunbaked Canyon`, :167) | same |
| 34 | Swapped line | Interactivity | Not a control (README :38; canvas :104). No Undo on the card; Undo swap lives in the sheet row and on the receipt only | same |

## 4 · Card → sheet → card: frames, depths and dimming

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| 35 | Frame | Canvas size | 390×844, radius 18, 1px `--border` (canvas :61, :117, :140) | 1300×760 (1b, after Take) / 1300×820 (steps 2 and 3), radius 12 (:53, :108, :129) |
| 36 | Scrim under the card | Color | `color-mix(in oklab, var(--bg) 72%, transparent)`, `inset:0` | same (:55, :110) |
| 37 | Scrim under each further layer | Color | `color-mix(in oklab, var(--bg) 60%, transparent)`, `inset:0`, one per layer (sheet, stand-in) (:120, :144, :146) | same (:112, :133, :135) |
| 38 | Card (depth 1) | Offset / box | `top:52px; left:0; right:0; bottom:0; overflow:hidden; border-radius:14px 14px 0 0; border-top:1px solid var(--border-strong)`; no shadow (:64, :119) | 824×625 at `left:238px; top:68px` (centred) (:56, :111) |
| 39 | Card (depth 1) | Modal box | 390 wide, `--surface-rail`, column (:191) | `width:824px; height:625px; background:var(--surface-rail); border:1px solid var(--border-strong); border-radius:16px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.45)` (:192) |
| 40 | Card under the sheet | State | Stays mounted, dimmed by the 60% scrim, scroll kept (README :26; canvas :97) | same; its 824px edges show around the 640px sheet (canvas :97) |
| 41 | Sheet (depth 2) | Offset / box | wrapper `top:96px; left:0; right:0; bottom:0; overflow:hidden; border-radius:14px 14px 0 0`; `box-shadow:0 -12px 30px rgba(0,0,0,0.45)` when it is the top layer (step 2, :121), none when covered (step 3, :145). Sheet itself: 390, `--surface-raised`, `border-top:1px solid var(--border-strong)`, radius `14px 14px 0 0` (Stand-ins :254) | 640 wide at `left:330px; top:108px` (centred, 40 below the card) (:113). Sheet: `--surface-raised`, 1px `--border-strong`, radius 14, `box-shadow:0 24px 60px rgba(0,0,0,0.45)` (Stand-ins :255) |
| 42 | Stand-in card (depth 3) | Offset / box | `top:140px; left:0; right:0; bottom:0; overflow:hidden; border-radius:14px 14px 0 0; border-top:1px solid var(--border-strong); box-shadow:0 -12px 30px rgba(0,0,0,0.45)` (:147) | 824×625 at `left:238px; top:148px` (80 below the card) (:136) |
| 43 | Depth rule | Offsets | 52 + 44 per level: 52 / 96 / 140. Each layer's header stays visible above the one on top as the tap-back target (canvas :98). **(audit F16)** today only one stacked depth exists; give both `ModalChrome` and the card modal a depth drawn as 52 + 44n, and keep today's full-height card for every other opener | Centred; the design steps each layer 40px down (68 / 108 / 148) |
| 44 | Stack cap | Layers | `page · card · sheet · card`. The stacked card's footer replaces Buy and Find a deck with Take, so there is no fourth door (README :29; canvas :98) | same |

## 5 · The sheet's way back (`from="card"`)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| 45 | Sheet head | Layout | `height:43px; display:flex; align-items:center; gap:9px; padding:0 6px 0 16px; border-bottom:1px solid var(--border)` (Stand-ins :257) | `display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid var(--border)` (:258) |
| 46 | Sheet title | Typography | `Cheaper stand-ins`, `var(--display)`, 700, 16px, line-height 1.2, `var(--fg)`, `flex:1`, nowrap (:36) | same |
| 47 | Way back | Which control | The `×` stays (`closeX` true) (:241) | The `×` is not rendered; a back pill replaces it (`backWide` true, `closeX` false) (:240-241) |
| 48 | Way back | Element | Drawn `<span aria-label>` (:38). **(audit F22)** a native `<button type="button">` | Drawn `<span>` (:37). **(audit F22)** a native `<button type="button">` |
| 49 | Way back | Box | `flex:none; width:44px; height:44px; margin-right:-10px`; centred; no border, no background | `flex:none; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 12px; border-radius:999px; border:1px solid var(--border-strong); background:var(--elevated)` |
| 50 | Way back | Typography | `×`, `'IBM Plex Mono',monospace`, 14px, `var(--fg-faint)` | inherited `'IBM Plex Sans'`, 12.5px, 600, `var(--fg)`, nowrap |
| 51 | Way back | Content / label | Glyph only; aria-label `Back to {card name}` (default path: `Close cheaper stand-ins`) (:242) | `←` (aria-hidden) then `{card name}` (drawn `Plateau`) |
| 52 | Way back | Hover / focus | Not drawn | Not drawn |
| 53 | Rest of the sheet | Difference from default | None: body, groups, rows and footer are identical to the Shopping path; only the head's control changes | same |

## 6 · The stacked stand-in card (unchanged from the Shopping path, one layer deeper)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| 54 | Back control | Box / type | The art header's `×` (44×44, top 6 right 6, mono 14, `--fg`), aria `Back to cheaper stand-ins` (Card Details :53, :180) | Pill `position:absolute; top:22px; right:22px; display:inline-flex; gap:6px; height:36px; padding:0 13px; border-radius:999px; border:1px solid var(--border-strong); background:var(--elevated)`; 12.5px, 600, `--fg`, nowrap; `←` aria-hidden + `Cheaper stand-ins` (:139) |
| 55 | Footer | Layout | column, `align-items:stretch; gap:8px; padding:10px 16px 12px; border-top:1px solid var(--border); background:var(--surface-sunken)` (:184) | row, `flex:none; align-items:center; gap:12px; padding:10px 30px; border-top:1px solid var(--border); background:var(--surface-sunken)` (:185) |
| 56 | Footer context | Copy structure | mono 11px `--fg-muted`: `in place of {original} · {i} of {n}`; buy chip mono 9.5px, radius 4, padding 1px 5px, `--warning` on `color-mix(in oklab, var(--warning) 13%, transparent)`, `buy · {price}` with `·` in `--border-strong`, price in `--fg-body` (:124, :181) | `in place of {original}, in {deck}` + the same chip |
| 57 | Take | Box / type | native button, full width, height 44, radius 8, 13px 600, `--accent` text and 1px `--accent` border, transparent, line-height 1; label `Take {stand-in}` (:187, :182) | native button, flex none, height 32, radius 7, padding 0 14px, 12.5px 600, `--accent` border and text; label `Take` (:188) |
| 58 | Pager | Layout | min-height 44, 14px, gap 12, `justify-content:space-between`; `‹` and `›` in `--accent`, `{i} of {n}` mono 11.5 `--fg-faint` (:126, :178) | min-height 32, gap 12 |

## 7 · The key line (Shopping limit block)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| 59 | Key line | Position | Last child of the limit block, under the `Marking cards over {limit} · {n} over` row (Shopping View :65-82) | same |
| 60 | Limit block (parent) | Layout | `margin-top:4px; display:flex; flex-direction:column; gap:0; padding:0 2px 2px` (:215) | `margin-top:10px; gap:4px; padding:0 4px` |
| 61 | Key line | Typography | `'IBM Plex Mono',monospace`; 10px; line-height 1.5; weight 400; no letter-spacing, no transform; `var(--fg-faint)`; wraps (no nowrap) | same |
| 62 | Key glyph | Glyph / color | `⇄` in its own span, `var(--warning)` (the row's swap glyph ink) | same |
| 63 | Key line | Copy structure | `⇄` + one fixed string: marked-row sentence, then the "also in its details" sentence. No interpolation | same |
| 64 | Key line | Condition | Rendered with the limit bar (`showBar`, :46, :197), in every limit state | same |

## State coverage

| State | Trigger | What renders | Focus target |
|---|---|---|---|
| Door, over | Card opened from a Shopping row, card price over the deck's limit | Desktop: limit line `over your {limit} limit` in `--warning`, link under it. Phone: 44px strip, line left, link right | Not named on open |
| Door, under | Same opener, price at or under the limit | As above with the line in `--fg-faint`; link identical (accent in both) | Not named |
| No door | Card opened from any other opener (collection, search, set page, Consider, decklist) | Shipped art column / art header, no strip. **(F17)** decided by the explicit Shopping flag or limit, not by deck presence | n/a |
| Prev/Next on the Shopping path | Pager in the card footer | Door recomputed for each card's own over/under state | n/a |
| Step 2: sheet over card | Press the door's link | Card stays mounted, scroll kept, dimmed by a 60% `--bg` scrim; sheet at 96 (phone) / centred 640 (desktop); sheet's way back is `← {card}` pill (desktop) or `×` labelled `Back to {card}` (phone) | Not named on open |
| Step 3: stand-in over sheet | Press a stand-in's name in the sheet | Stacked CardModal at 140 (phone) / 80 below the card (desktop), `← Cheaper stand-ins`, Take footer, pager through the stand-ins; a further 60% scrim | Not named on open |
| Escape / scrim on step 3 | Escape, or a tap on the scrim | Stand-in closes; sheet shows with its scroll kept | The stand-in's name in the sheet |
| Escape / scrim on step 2 | Escape, the way-back control, or scrim | Sheet closes; card with its door | The door's link (`See cheaper stand-ins`) |
| Escape / scrim on step 1 | Escape or scrim | Card closes; Shopping list | The card's Shopping row |
| Take | Press Take on the stacked stand-in | Stand-in closes; the sheet shows the taken row (`✓ taken`, `{original} → {stand-in}`, Undo swap; `--success` 1px border on `--surface`, Stand-ins :88-94) | Not named |
| Escape after Take | Escape from the sheet | Original card, door replaced by `swapped out · {stand-in} is in` in `--success`, not a control | Not named (the door's control is gone) |
| Escape again | Escape from the swapped card | Shopping, take's receipt (Undo swap lives there); the original's row is gone if that was its last copy | The take's receipt |
| Swapped, paged or reopened | n/a | The design draws the swapped state only on the Escape path; no other trigger is drawn | n/a |

## Overrides from the audit, collected

- **F16** (row 43): the phone stack needs a third depth, 52 + 44 per level, on both the sheet and the card modal; every other opener keeps today's full-height card.
- **F17** (rows 28, state "No door"): the door renders only when the Shopping row's opener passes the limit or an explicit flag.
- **F20** (row 15): the drawing's reason for putting the color on the limit line is wrong (the shipped tag is `--accent` on `--accent-dim`, not `--warning`), and its answer stands: the limit line carries over/under and the tag is not touched.
- **F22** (rows 8, 22, 48): the door link on both widths and the sheet's way back on both widths are native `<button type="button">`, not spans.
- **F21**: `swapped out · {card} is in` and `Back to {card}` are owed to `/copy-review`; this table records structure only.
