# Gap report: deck notices, the tile's notice mark

Table: `docs/superpowers/design-tables/deck-notices-tile-marker.md`
Implementation: `notice-tag.tsx`, `deck-card.tsx` (chips row 518-565, YIELD 254-263, spoken 311-333),
`decks-mark-key.tsx`, `decks-view.tsx:1054-1055`, `mark-key.tsx`, `cards/fact-tooltip.tsx`,
`lib/copy/notices.ts`, `lib/notices/summary-sql.ts`, `lib/decks/read.ts:995`, `app/decks/page.tsx:58`.

## PASS 1: visual properties

### 1.1 Placement
| Row | Result | Design | Impl |
|---|---|---|---|
| Slot | ✅ MATCH | after BracketChip, else after StatusPill | deck-card.tsx:525-565 pill → chip (if bracket) → mark |
| Container | ✅ MATCH | `data-deck-chips` | deck-card.tsx:522 |
| Gap | ✅ MATCH | 8px | `gap-[8px]` |
| Vertical | ✅ MATCH | centred | `items-center` |
| Row height | ✅ MATCH | 22 / 24 | `h-[22px] md:h-[24px]` |
| Adds to row height | ✅ MATCH | none | 18px mark inside 22/24 row |
| Count per tile | ✅ MATCH | one | single `deck.notice ?` branch, one NoticeMark |
| flex | ✅ MATCH | none | `flex-none` on mark and on wrapper Link |
| Data hook (canvas) | ❌ MISMATCH | `data-notice-marker="notLegal"\|"unread"` | `data-notice-mark="notLegal"\|"unread"` (notice-tag.tsx:20). Values match, attribute name differs |

### 1.2 Box
| Row | Result | Design | Impl |
|---|---|---|---|
| display | ✅ MATCH (equivalent) | flex | `inline-flex`; it is a flex item of the Link, so it is blockified to flex |
| align/justify | ✅ MATCH | center/center | `items-center justify-center` |
| size | ✅ MATCH | 18×18 | `size-[18px]` |
| radius | ✅ MATCH | 50% | `rounded-full` |
| box-sizing | ✅ MATCH | border-box | Tailwind preflight |
| border | ✅ MATCH | 1px ink 70% | inline style, notice-tag.tsx:24 |
| background | ✅ MATCH | ink 14% into `--surface-inset` | notice-tag.tsx:25 |
| color | ✅ MATCH | `var(<ink>)` | notice-tag.tsx:26 |
| outline resting | ✅ MATCH | none | none set |
| outline tooltip-open | ✅ MATCH (n/a) | canvas-only, not shipped | not drawn |

### 1.3 Glyph
| Row | Result | Design | Impl |
|---|---|---|---|
| Content | ✅ MATCH | `!` | notice-tag.tsx:29 |
| font-family | ✅ MATCH | Plex Mono | `font-mono` → `--font-mono: var(--font-plex-mono)` (globals.css:472) |
| weight | ✅ MATCH | 600 | `font-semibold` |
| size | ✅ MATCH | 12px | `text-[12px]` |
| line-height | ✅ MATCH | 1 | `leading-none` |
| Contrast | ✅ MATCH (deferred to test) | 3:1 | F23 lives in status-style.test.ts (not in scope of this pass) |

### 1.4 Ink selection
| Row | Result | Impl |
|---|---|---|
| None | ✅ MATCH | SQL returns null → `deck.notice ?` draws nothing |
| Legality unread | ✅ MATCH | kind `notLegalUnread` → `--danger` |
| Legality read | ✅ MATCH | kind `notLegalRead` → `--danger`, no read look (no dot branch) |
| Data unread only | ✅ MATCH | kind `unread` → `--fact` |
| Data read only | ✅ MATCH | SQL `pending` counts only past `notices_read_seq` → null |
| Both | ✅ MATCH | legality kind wins, one mark `--danger` |
| No chip | ✅ MATCH | mark branch independent of `deck.bracket` |

### 1.5 The mark's link
| Row | Result | Impl |
|---|---|---|
| Stacking | ✅ MATCH | `relative z-10` (deck-card.tsx:558) |
| Element | ✅ MATCH | second `Link`, `href={/decks/${deck.id}}` = cover link's href (line 617) |
| tabIndex | ✅ MATCH | `-1` |
| aria-hidden | ✅ MATCH | `"true"` |
| role | ✅ MATCH | none |
| Click / cmd-click | ✅ MATCH | native Link |
| Hover (mobile none / desktop tooltip) | ✅ MATCH | FactTooltip renders children bare when not `(pointer: fine)` |

### 1.6 Accessibility
| Row | Result | Impl |
|---|---|---|
| Mark aria-hidden | ✅ MATCH | notice-tag.tsx:21; also inside aria-hidden footer (deck-card.tsx:512) |
| Mark role / tabIndex | ✅ MATCH | none; wrapper -1 |
| Words via link name | ✅ MATCH | `noticeSpoken` in `spokenStatus` |

### 2 Tooltip
| Row | Result | Impl (fact-tooltip.tsx) |
|---|---|---|
| Component + prop | ✅ MATCH | `<FactTooltip sentence={noticeSentence(deck.notice)}>` |
| Pointer gate | ✅ MATCH | `useMinWidth("(pointer: fine)")`, line 158/172 |
| Delay | ✅ MATCH | `OPEN_DELAY_MS = 400` |
| Portal | ✅ MATCH | `createPortal(..., document.body)` |
| Placement | ✅ MATCH | above default, `mark.top - 6`, centred, `EDGE_PX = 4` clamp, flip in `placeBubble` |
| aria-hidden | ✅ MATCH | line 263 |
| width / max-width | ✅ MATCH | `w-max`, `MAX_BUBBLE_PX = 220` |
| padding | ✅ MATCH | `px-[9px] py-[6px]` |
| radius | ✅ MATCH | `rounded-[7px]` |
| background / border / color | ✅ MATCH | `--elevated`, `1px solid --border`, `--fg-body` |
| font-family | ✅ MATCH | inherits body (portalled) = Plex Sans |
| size / leading | ✅ MATCH | 11.5px / 1.45 |
| box-shadow | ✅ MATCH | identical string |
| z-index | ✅ MATCH (canvas value) | `z-50` fixed in body; canvas 5 is relative to its frame |
| Test hook (canvas) | ✅ MATCH (shipped component's) | `data-testid="fact-tooltip"`, `data-side`; the table notes every tooltip property is FactTooltip's own |

### 2.1 Tooltip copy
| State | Result | Impl |
|---|---|---|
| Not legal | ✅ MATCH | `mark.tooltip.notLegal(notice.count)` when `dataUnread === 0` |
| Unread | ✅ MATCH | `mark.tooltip.unread(notice.count)` |
| Both | ✅ MATCH | `mark.tooltip.both(notice.count, notice.dataUnread)` |
(Key lives at `deckNoticesCopy.mark.*` rather than `tileMarkerCopy.*`; naming only.)

### 3.1 Key mount
| Row | Result | Impl |
|---|---|---|
| Component | ✅ MATCH | `DecksMarkKey` → `MarkKey` |
| Position | ✅ MATCH | first child of the `<ul>` (decks-view.tsx:1055) |
| Element | ✅ MATCH | `<li>` |
| Span | ✅ MATCH | `col-span-full` (+ `flex-none` in the phone column) |
| Both widths | ✅ MATCH | no width gate |
| List gap | ✅ MATCH | `gap-[12px]` / `sm:gap-[14px]` (existing) |
| Data hook (canvas) | ❌ MISMATCH | `data-mark-key="true"` vs `data-decks-mark-key` (decks-mark-key.tsx:25) |

### 3.2 Key line (mark-key.tsx:49-56)
| Row | Result | Impl |
|---|---|---|
| role / aria-label | ✅ MATCH | `group`, `regionAria = mark.key.regionAria` |
| flex / wrap / center | ✅ MATCH | `flex flex-wrap items-center` |
| gap | ✅ MATCH | `gap-x-[12px] gap-y-[6px]` |
| font | ✅ MATCH | `font-mono text-[10px] md:text-[10.5px]` |
| color | ✅ MATCH | `--fg-faint` |

### 3.3 Key entry
| Row | Result | Impl |
|---|---|---|
| inline-flex, center, gap 5 | ✅ MATCH | `inline-flex items-center gap-[5px]` |
| Order | ✅ MATCH | notLegal pushed first, then unread |

### 3.4 Key sample
| Row | Result | Impl |
|---|---|---|
| Element | ✅ MATCH | the real `NoticeMark`, aria-hidden (wrapper span and the mark itself) |
| Glyph / size / radius / flex / border / color / type | ✅ MATCH | same component as the tile |
| Inks | ✅ MATCH | notLegal sample `kind: "notLegalUnread"` → `--danger`; unread sample → `--fact` |
| background | ❌ MISMATCH (open question) | canvas mixes into `--bg`; impl reuses the tile mark unchanged, so it mixes into `--surface-inset` (notice-tag.tsx:25 via decks-mark-key.tsx:18, 21). The key sits on the PAGE ground (`--bg`), not on a tile footer, so the sample's tint is grounded on a surface it is not drawn over. The table leaves this for the implementer to confirm; the README's "the real mark at 18px" supports the impl |

### 3.5 Key words
| Row | Result | Impl |
|---|---|---|
| Not legal | ✅ MATCH | `mark.key.notLegal` |
| Data | ✅ MATCH | `mark.key.unread` |

### 3.6 Key conditional
| Row | Result | Impl |
|---|---|---|
| Source | ✅ MATCH | `decks={shown}` (decks-view.tsx:1055) |
| Absent | ✅ MATCH | `marks.length === 0` → null (and `<ul>` not mounted at 0 shown) |
| not-legal entry | ✅ MATCH | any `notice.kind !== "unread"` (unread/read legality, alone or with data) |
| notices entry | ✅ MATCH | `notice.kind === "unread"` |
| both | ✅ MATCH | both pushes |
| filter hides | ✅ MATCH | `shown` is a memo over shelf + filters |

### 4 Spoken
| Row | Result | Impl |
|---|---|---|
| Carrier | ✅ MATCH | cover link `aria-label` (cardAria / cardAriaNoDetail) |
| Not legal / Data | ✅ MATCH | `tag.spoken.notLegal(count)` / `tag.spoken.unread(count)` |
| Both | ✅ MATCH | `${notLegal(count)}, ${unread(dataUnread)}` |
| Position | ✅ MATCH | `spokenStatus = "${status}, bracket X, ${notice}"` then `count` (refresh.ts:214) |
| Data dependency | ✅ MATCH | `dataUnread` on legality kinds |

### 5 Footer and yield
| Row | Result | Impl |
|---|---|---|
| Footer rows / gap / padding / border | ✅ MATCH | `gap-[9px] pt-[11px] pr-[13px] pb-[13px] pl-[13px]`, `borderTop 1px --border` |
| Chips row | ✅ MATCH | `flex flex-none flex-nowrap items-center gap-[8px]` (min-width not set; it is a column-flex child with no content that overflows at ≥330) |
| Yield structure | ✅ MATCH | measured widths (332.1 / 321.3) did not both land ≤ 330, so ONE window is kept for both inks (`@min-[330px]:@max-[336px]`), the `face={false}` branch stays, and the yield applies only to a range beside a notice. Upper figure not checked, per instructions |

### 6 / 7 Header and context
Out of this diff's surface; unchanged (HeaderNoticeTag keeps the full face and the dot for unread). ✅

## PASS 2: state reachability

| State | Result | Reason |
|---|---|---|
| None | ✅ REACHABLE | SQL `else null`; `deck.notice ?` branch draws nothing |
| Not legal, unread | ✅ REACHABLE | `off` set non-empty and differs from `notices_legal_seen` → `notLegalUnread`; `--danger` mark; tooltip `notLegal(count)`; spoken `notLegal(count)` |
| Not legal, read | ✅ REACHABLE | set equality → `notLegalRead`; same red mark, no read branch on the tile |
| Data unread | ✅ REACHABLE | `pending > 0` and no `off` → `unread`; `--fact` mark; tooltip / spoken `unread(count)` |
| Data read | ✅ REACHABLE | `pending` only counts `seq > notices_read_seq`, so all-read → null |
| Both | ✅ REACHABLE | legality kind with `dataUnread` from `pending`; one red mark; `both(count, dataUnread)`; spoken joined `", "` |
| No chip | ✅ REACHABLE | mark branch runs when `deck.bracket` is null, right after the pill |
| Widest row | ✅ REACHABLE | yield window 330-336 only; at 340 / 358 the range keeps its face beside the mark |
| Tooltip open | ✅ REACHABLE | Link lifted `z-10` over the cover link, FactTooltip gets pointer events; fine pointer, 400ms |
| Mark pressed | ✅ REACHABLE | second Link to the same href, `tabIndex -1`, `aria-hidden` |
| Key: absent | ✅ REACHABLE | returns null with no marked tile in `shown` |
| Key: not-legal only | ✅ REACHABLE | only legality kinds in `shown` |
| Key: notices only | ✅ REACHABLE | only `unread` kinds in `shown` |
| Key: both | ✅ REACHABLE | both kinds in `shown`, not legal first |
| Key: filter hides | ✅ REACHABLE | recomputed from the `shown` memo |

Data path: `NoticeSummary` type carries `dataUnread` (summary-sql.ts:14); `noticeSummarySql()` is computed, not
stubbed, and is selected when `includeNotice` is set (read.ts:995), which `/decks` sets as
`includeBracket && noticesEnabled()` (app/decks/page.tsx:58). With the flag off every state reads as None; that
is the rollout gate, not a gap.

## Gap list

### Visual gaps
1. `src/components/decks/notice-tag.tsx:20` — hook is `data-notice-mark`; the table's canvas hook is
   `data-notice-marker`. Values match. Low severity (a canvas test hook); align the name or record the rename.
2. `src/components/decks/decks-mark-key.tsx:25` — hook is `data-decks-mark-key`; the table's canvas hook is
   `data-mark-key="true"`. Low severity, same kind.
3. `src/components/decks/decks-mark-key.tsx:18,21` (via `notice-tag.tsx:25`) — the key sample tints into
   `--surface-inset` (it reuses the tile mark unchanged); the canvas tints into `--bg`. The key sits on the page
   ground, not on a tile, so the sample's ground colour differs slightly from the canvas. This is the table's own
   open question; it needs a ruling (keep "the real mark" or re-ground on `--bg`), not necessarily a code change.

### State gaps
None.

VERDICT: 3 visual gaps, 0 state gaps

## Confirm pass

1. SETTLED. `notice-tag.tsx` mark hook: design `data-notice-marker`, implementation `data-notice-mark`. Kept
   deliberately; its readers exist: `scripts/probe-notices-tile.mjs:204,398,408`,
   `decks-mark-key.test.tsx:29`, `deck-card.test.tsx:714,751`.
2. SETTLED. `decks-mark-key.tsx` key hook: design `data-mark-key="true"`, implementation `data-decks-mark-key`.
   Kept deliberately; its readers exist: `scripts/probe-notices-tile.mjs:360,376`.
3. FIXED. Key sample tint: design mixes into `--bg`, implementation mixes into `--bg` (`decks-mark-key.tsx:21,24`
   pass `ground="--bg"`; `notice-tag.tsx:32` mixes into `var(${ground})`). The tile's own mark takes the default
   `ground = "--surface-inset"` (`notice-tag.tsx:18`), so it still mixes into `--surface-inset`.

VERDICT: 0 gaps remain
