# Gap report: Rule 0 read (T1–T10, D1–D10, L4, H3)

Table: `docs/superpowers/design-tables/rule-zero-read.md`. Worktree `rule-zero-pr3` at `fc81ee754`.
Excluded by instruction: copy wording, `Seats` (PR 5), `Change deck` (PR 7), the changed dot / Since you looked (PR 4),
the `updated` line until the poll (PR 4), Split ink as `var(--avg-fewer)`.
Token check: the design's `:root` values are the second theme block in `src/app/globals.css` (L124 on: `--bg #0E0F14`,
`--surface-rail #12141B`, `--surface-sunken #101219`, `--elevated #20222A`, `--border-dashed #343843`, `--fg-locked
#606476`, `--warning #E0913C`, `--fact #8FA6BE`, `--bracket-1..5` = the five mark inks). Every `var()` the code reads
for a design literal maps to the matching token.

## PASS 1: visual properties

### Page head
| Row | Result |
|-----|--------|
| Back link (phone `.back`, desktop `.bk`) | ❌ MISMATCH — design: `‹ Friends` row (phone 44px, 14px fg-muted, 20px glyph; desktop 13px, mb 6px) / implementation: no back link rendered anywhere in `table-body.tsx` or `page.tsx` (friend-page.tsx:56 draws its own; this page does not) |
| Head container, phone | ✅ MATCH (`header` flex-col, table-body.tsx:41) |
| Head container, desktop `.dph` | ❌ MISMATCH — design: full-width band, padding 22px 34px 16px, border-bottom 1px var(--border), then `.dbody` padding-top 22px / implementation: no border, page.tsx:23 `md:pt-[28px]`, head→body gap `md:gap-[22px]` (table-body.tsx:40) |
| h1 | ✅ MATCH (table-body.tsx:42: display 700, 24/30px, lh 1.2, m-0) |
| Meta line font/size/color/margin | ✅ MATCH (table-body.tsx:43) |
| Meta pod name `<b>` | ❌ MISMATCH — design: `<b>` color var(--fg-body), weight 500 / implementation: one plain string from `copy.meta(...)` (table-body.tsx:44) |
| Meta structure (phone forced `<br>` before `open until`) | ❌ MISMATCH — design: two lines on phone, one on desktop / implementation: one run at both widths |
| Meta setter wording "set by you" | see State gap 1 (wrong argument) |
| Seats control | excluded (PR 5) |

### Page layout
| Row | Result |
|-----|--------|
| Phone `.pg` padding 0 16px 22px | ❌ MISMATCH — implementation: `px-[14px] pt-[18px] pb-[34px]` (page.tsx:23) |
| Phone gap 14px, order read → seats → log | ✅ MATCH (table-body.tsx:47–62) |
| Desktop grid `minmax(0,1fr) 392px`, gap 28, align start | ✅ MATCH (table-body.tsx:47) |
| Desktop `.dbody` padding 22px 34px 28px | ❌ MISMATCH — implementation: sides 34 ✓, bottom `pb-[34px]` (page.tsx:23), top see head row |
| `.dside` read → log, gap 14 | ✅ MATCH (row gap 14, log at col 2 row 2) |
| Seat list gap 10 | ✅ MATCH (table-body.tsx:51) |

### Read card
| Row | Result |
|-----|--------|
| Card (radius 14, border-strong, surface, padding, gap 12, overflow hidden) | ✅ MATCH (read-card.tsx:30) |
| Kicker row / kicker | ✅ MATCH (read-card.tsx:32–35) |
| `updated` | excluded (PR 4) |
| Headline font/margin/wrap | ✅ MATCH (read-card.tsx:38) |
| Inked phrase high/low/split | ✅ MATCH (var(--warning)/var(--fact) = literals; split excluded) |
| Body p | ✅ MATCH (read-card.tsx:41) |
| Body `<b>` around bracket names | ❌ MISMATCH — design: `<b>` color var(--fg), 600 / implementation: body is a plain string, no emphasis (read-card.tsx:41) |
| Rail container | ✅ MATCH (read-card.tsx:171) |
| Rail role/label | ❌ MISMATCH — design: `role="img"` aria-label "Each seat placed on the five brackets" / implementation: `aria-hidden` (read-card.tsx:169) |
| Rail conditional (absent T10) | ✅ MATCH (read-card.tsx:42) |
| Rail column | ✅ MATCH (read-card.tsx:197) |
| Face stack | ✅ MATCH (read-card.tsx:198) |
| Rail face size/radius/border 1.5 var(--bg)/img | ✅ MATCH (read-card.tsx:219–223 overrides) |
| Rail face rings default/you/flag | ✅ MATCH individually (read-card.tsx:215) |
| Rail face you + flagged (T5) | ❌ MISMATCH — design: flag ring wins (`.face.flag` after `.you`) / implementation: `seat.you ?` checked first, accent ring wins (read-card.tsx:215) |
| Rail face background | ❌ MISMATCH — design: var(--elevated) / implementation: Face size 30 → `bg-[color:var(--surface-raised)]` (face.tsx:41) |
| Rail face fallback text | ❌ MISMATCH — design: 600 10px mono, var(--fg-muted) / implementation: 500 10px mono, var(--fg-body) (face.tsx:21,41) |
| Bracket label | ✅ MATCH (read-card.tsx:203–205) |
| Bracket marks / inks | ✅ MATCH (BracketMark, `--bracket-N` = literals) |
| TABLE band | ✅ MATCH (read-card.tsx:176–181; `left: calc((middle-1)*20% + 6px)` = `calc(40% + 6px)` at 3) |
| Band conditional (absent split, T10) | ✅ MATCH (`band` false on split; no rail on notEnough) |
| Range span | ✅ MATCH (read-card.tsx:191–192: lo 1 → `calc(4% + 4px)` 32%; lo 4 → `calc(64% + 4px)` 32%) |
| Span conditional (T6 Peter, T7 Colin) | ✅ MATCH (answered null and >1 permits) |
| Counts key layout, font, item, order | ✅ MATCH (read-card.tsx:233–239) |
| Counts key icon 12px var(--fact) | ✅ MATCH (`[&_svg]` 12px; FindingMark inline var(--fact)) |
| Counts key aria-label | ❌ MISMATCH — design: aria-label "What the counts on each seat are" / implementation: none (read-card.tsx:233) |
| Honesty block | ✅ MATCH (read-card.tsx:44) |
| Provenance opener | ❌ MISMATCH — design: 500 12.5px IBM Plex Sans, underline (color rgba(255,77,154,.5), offset 4px), min-height 36px, gap 6px / implementation: `ProvenanceOpener tone="accent"` = font-mono 11px, dotted border-bottom, min-h 44px, gap 8px (provenance-panel.tsx:58–66; read-card.tsx:46) |

### Seat
| Row | Result |
|-----|--------|
| Container radius/border/bg/overflow | ✅ MATCH (table-seat.tsx:47–55) |
| `.you`, `.flag`, `.you.flag`, desktop tint | ✅ MATCH |
| aria-label | ✅ MATCH (key `copy.label`) |
| Wash | ✅ MATCH (table-seat.tsx:57–65; absent with no art) |
| Top/main grid, desktop columns, gap 18, padding, flagged padding | ✅ MATCH (table-seat.tsx:67–72) |
| Phone row spacing: chip row → counts row | ❌ MISMATCH — design: `.ln` padding-bottom 12px / implementation: `gap-y-[10px]` (table-seat.tsx:69) |
| Phone sub line spacing (chip → sub) | ❌ MISMATCH — design: own row, margin-top -4px under a 12px row gap = 8px / implementation: wraps inside the chip span, `gap-y-[4px]` = 4px (table-seat.tsx:110,119) |
| Art phone | ✅ MATCH (table-seat.tsx:76) |
| Art desktop size/radius | ✅ MATCH |
| Art desktop box-shadow | ❌ MISMATCH — design: 0 10px 22px rgba(0,0,0,.5) / implementation: phone's 0 8px 18px rgba(0,0,0,.45) at all widths (table-seat.tsx:76) |
| Initials art `.art.ini` font | ✅ MATCH (table-seat.tsx:81) |
| Initials art background | ❌ MISMATCH — design: radial-gradient(120px 80px at 50% 40%, #262A35, var(--surface)) / implementation: var(--surface-sunken) (table-seat.tsx:76) |
| Who column | ✅ MATCH (table-seat.tsx:89) |
| Name line / YOU tag / small tag / which tag | ✅ MATCH (table-seat.tsx:93–157) |
| Deck name, waiting muted | ✅ MATCH (table-seat.tsx:99,103) |
| Commander line | ✅ MATCH for seats with a deck (table-seat.tsx:100); waiting seat: see State gap 3 |
| Desktop `.br` spacing (cm → chip) | ❌ MISMATCH — design: `.who` gap 4 + `.br` margin-top 4 = 8px / implementation: `md:gap-y-[4px]` = 4px (table-seat.tsx:70) |
| Bracket chip size/padding/radius/plate/border/name | ✅ MATCH (bracket-chip.tsx:43–57) |
| Range chip two marks, lower ink, "A or B" | ✅ MATCH (upper mark dimmed .65 by the shared chip, not in the frame; shared-component ruling, not counted) |
| Answered range one mark | ✅ MATCH |
| Chip conditional | ⚠️ see State gap 2 (T10 own seat) |
| Sub line font/color | ✅ MATCH (table-seat.tsx:119: 10.5 phone / 10 desktop, fg-faint) |
| Stale mark style | ✅ MATCH (table-seat.tsx:113–115) |
| Stale mark placement, phone | ❌ MISMATCH — design: its own row between chip row and counts / implementation: inline beside the chip in the same flex row (no `basis-full`) (table-seat.tsx:113) |
| Flag tag | ✅ MATCH (flag-tag.tsx:37–43; `var(--bg)` = #0E0F14) |
| Flag tag placement phone/desktop | ✅ MATCH (table-seat.tsx:127) |
| Desktop `.rt` gap tag → counts | ❌ MISMATCH — design: 8px / implementation: grid `md:gap-y-[4px]` (table-seat.tsx:70,127,136) |
| `.rt` conditional | ✅ MATCH |
| `.fx` box (h26, px7, r7, bg, border, color, 600 12px mono) | ✅ MATCH (table-seat.tsx:239–244) |
| `.fx` icon size | ❌ MISMATCH — design: 13px / implementation: FindingMark at CARD_FACT_MARK_PX 16px (card-fact-mark.tsx:72; table-seat.tsx:248) |
| `.fx` icon color (zero) | ❌ MISMATCH — design: currentColor = var(--fg-locked) / implementation: FindingMark's inline `color: var(--fact)` at opacity .5 (card-fact-mark.tsx:148; table-seat.tsx:247) |
| `.fx.drv` icon color | ❌ MISMATCH — design: var(--flag) / implementation: inline var(--fact) cannot be overridden (combo-glyph/tutor-glyph `style.color`) |
| `.fx` icon glow | ❌ MISMATCH — design: none / implementation: drop-shadow glow on every FindingMark |
| zero / lifted box styles | ✅ MATCH |
| Count order, aria-label | ✅ MATCH |
| Lifted where | ✅ MATCH (`drivingOf` + split-low suppression, table-view.ts:68–69,100–104) |
| Count icons paths | ✅ MATCH |
| Desktop `.more` padding 0 16 14 162 | ✅ MATCH (`MORE`, table-seat.tsx:160) |
| Why box | ✅ MATCH (table-seat.tsx:214–216; 9%/10% tint, 35% border) |
| Why conditional (not on split You) | ✅ MATCH |
| Wait box / short / over / reading / waiting | ✅ MATCH (table-seat.tsx:161–209) |
| Short bar | ✅ MATCH (table-seat.tsx:173–174) |
| Spinner | ✅ MATCH (animated; design static, motion-reduce honoured) |
| Change deck | excluded (PR 7) |
| Changed mark | excluded (PR 4) |

### Log this game
| Row | Result |
|-----|--------|
| Placement, width, min-h 44, padding 0 18, radius 10, 600 14.5 sans, ghost colors | ✅ MATCH (table-body.tsx:58; button.tsx:23,42) |
| white-space nowrap | ❌ MISMATCH — design: nowrap / implementation: not set (table-body.tsx:58) |
| Conditional | ✅ MATCH (present T1–T10; absent only on games off / viewer waiting, both undrawn) |

### Expired page
| Row | Result |
|-----|--------|
| L4 back row kept | ❌ MISMATCH — design: `‹ Friends` row above `.closed` on phone / implementation: none (page.tsx:30–33) |
| H3 no head / no back | ✅ MATCH |
| Container max-w, flex, gap, padding, text-align | ✅ MATCH (table-closed.tsx:27) |
| Container margin auto (vertical centering) | ❌ MISMATCH — design: margin auto in a flex column, centered in the page body / implementation: `mx-auto` only inside a non-flex wrapper (page.tsx:31), so it sits at the top |
| Oval box, `.tb` | ✅ MATCH (table-closed.tsx:28–29) |
| Face positions | ✅ MATCH (four seats → 83/0, 166/44, 83/88, 0/44) |
| Face size 34, opacity .55, grayscale .6, radius 50% | ✅ MATCH (table-closed.tsx:35,38) |
| Face border / ring / background | ❌ MISMATCH — design: border 1.5px solid var(--bg), ring 0 0 0 1px rgba(255,255,255,.12), bg var(--elevated) / implementation: Face's 1px solid var(--border-strong), no ring, var(--surface-raised) (face.tsx:41) |
| Title | ✅ MATCH (22px display 700, m-0; rendered as h1, which is right with no page head) |
| Body p | ✅ MATCH (table-closed.tsx:44) |
| Back to Friends button | ✅ MATCH (table-closed.tsx:47) |

## PASS 2: state reachability

| Frame | Result |
|-------|--------|
| T1/D1 Balanced | ✅ REACHABLE — `headlineOf` → balanced; band; faces; no tags |
| T2/D2 High | ✅ REACHABLE — one/high, `.hiw` ink, `assembled` drivers lift combos + tutors, why |
| T3/D3 Low | ✅ REACHABLE — one/low, `drivers.kind low` → no lift, `whyLow` |
| T4/D4 Two-way | ✅ REACHABLE — `two`, no ink, both flagged |
| T5/D5 Split | ⚠️ PARTIALLY — band false, both `split` flags, lower seat's drivers suppressed (table-view.ts:68) ✅; but meta reads "set by <viewer's name>", not "set by you" (State gap 1), and your rail face takes the accent ring instead of the split ring (visual gap) |
| T6/D6 Range seats | ✅ REACHABLE — answered → one chip + `declared` line; undeclared → two marks + `undeclared` line + span + `whyLowRange` |
| T7/D7 Drifted | ✅ REACHABLE — `ask.kind drifted` → range chip, `drifted` line, span, `driftNote` |
| T8/D8 Not ready | ✅ REACHABLE — `illegal` short/over wait boxes + bar; Colin `stale` keeps chip/counts with stale mark; `leftOut` headline |
| T9/D9 Reading | ✅ REACHABLE — `unread` (no row or rebuildable) → spinner wait box, `reading` headline |
| T10/D10 Nothing to compare | ⚠️ PARTIALLY — `notEnough` → `nothing` headline, no rail/band, key + honesty kept, Peter short box, Max initials/no wash/muted deck line/wait sentence ✅; but (a) "set by you" fails (gap 1), (b) your own read seat draws NO chip and NO counts (gap 2), (c) Max's commander line is missing (gap 3) |
| L4 Expired phone | ⚠️ PARTIALLY — `loadClosedTable` + `TableClosed` reachable; back row absent and not vertically centered (visual gaps) |
| H3 Expired desktop | ✅ REACHABLE (vertical centering visual gap only) |

## Visual gaps
1. src/app/friends/table/[id]/page.tsx:23 / src/components/rule-zero/table-body.tsx:41 — Back link — presence — design: `‹ Friends` (phone 44px row, 14px fg-muted, 20px `‹`, 0 8px padding; desktop 13px, gap 6, mb 6) → implementation: absent at both widths
2. src/components/rule-zero/table-body.tsx:41 + page.tsx:23 — Desktop head band — border/padding — design: border-bottom 1px var(--border), padding 22px 34px 16px, body padding-top 22px → implementation: no border, page pt 28px, 22px gap
3. src/components/rule-zero/table-body.tsx:44 — Meta pod name — emphasis — design: `<b>` var(--fg-body) 500 → implementation: plain text
4. src/components/rule-zero/table-body.tsx:44 — Meta line — phone structure — design: forced break before `open until …` on phone → implementation: one run at both widths
5. src/app/friends/table/[id]/page.tsx:23 — Page padding — design: phone 0 16px 22px; desktop bottom 28px → implementation: phone 14px sides / 18 top / 34 bottom; desktop bottom 34px
6. src/components/rule-zero/read-card.tsx:41 — Body sentence — bracket names — design: `<b>` var(--fg) 600 → implementation: no emphasis
7. src/components/rule-zero/read-card.tsx:169 — Rail — a11y — design: role img, aria-label "Each seat placed on the five brackets" → implementation: aria-hidden
8. src/components/rule-zero/read-card.tsx:215 — Rail face, you + flagged (T5) — ring precedence — design: flag ring (2px var(--flag)) wins → implementation: accent ring wins
9. src/components/social/face.tsx:41 (via read-card.tsx:219) — Rail face — background / fallback text — design: var(--elevated); 600 10px var(--fg-muted) → implementation: var(--surface-raised); 500 10px var(--fg-body)
10. src/components/rule-zero/read-card.tsx:233 — Counts key — a11y — design: aria-label "What the counts on each seat are" → implementation: none
11. src/components/decks/provenance-panel.tsx:58–66 (read-card.tsx:46) — Provenance opener — font/decoration/height/gap — design: 500 12.5px IBM Plex Sans, underline rgba(255,77,154,.5) offset 4px, min-h 36px, gap 6px → implementation: mono 11px, dotted border-bottom, min-h 44px, gap 8px
12. src/components/rule-zero/table-seat.tsx:69 — Phone seat row spacing — chip → counts — design: 12px → implementation: 10px
13. src/components/rule-zero/table-seat.tsx:110,119 — Phone sub line — spacing under chip — design: own row, 8px below the chip row → implementation: wrapped in the chip span, 4px
14. src/components/rule-zero/table-seat.tsx:113 — Stale mark (T8 Colin) — phone placement — design: own row between chip row and counts → implementation: inline beside the chip
15. src/components/rule-zero/table-seat.tsx:70 — Desktop who column — cm → chip spacing — design: 8px (gap 4 + `.br` mt 4) → implementation: 4px
16. src/components/rule-zero/table-seat.tsx:70,127,136 — Desktop `.rt` — tag → counts gap — design: 8px → implementation: 4px
17. src/components/rule-zero/table-seat.tsx:76 — Commander art, desktop — box-shadow — design: 0 10px 22px rgba(0,0,0,.5) → implementation: 0 8px 18px rgba(0,0,0,.45)
18. src/components/rule-zero/table-seat.tsx:76 — Initials art (T10 Max) — background — design: radial-gradient(120px 80px at 50% 40%, #262A35, var(--surface)) → implementation: var(--surface-sunken)
19. src/components/cards/card-fact-mark.tsx:72 (table-seat.tsx:248) — Count chip icon — size — design: 13px → implementation: 16px
20. src/components/cards/card-fact-mark.tsx:148, combo-glyph.tsx, tutor-glyph.tsx (table-seat.tsx:247) — Count chip icon — color — design: currentColor (zero → var(--fg-locked); lifted → var(--flag)) and no glow → implementation: always inline var(--fact) with a drop-shadow glow (zero only dimmed to .5 opacity)
21. src/components/rule-zero/table-body.tsx:58 — Log this game — white-space — design: nowrap → implementation: not set
22. src/app/friends/table/[id]/page.tsx:30–33 — Expired page, phone (L4) — back row — design: `‹ Friends` row kept above `.closed` → implementation: absent
23. src/app/friends/table/[id]/page.tsx:31 — Expired `.closed` — vertical centering — design: margin auto in a flex column (centered in the page) → implementation: horizontal centering only, sits at the top
24. src/components/social/face.tsx:41 (table-closed.tsx:38) — Expired faces — border/ring/bg — design: 1.5px solid var(--bg), ring 0 0 0 1px rgba(255,255,255,.12), var(--elevated) → implementation: 1px solid var(--border-strong), no ring, var(--surface-raised)

Not counted: the shared BracketChip dims a range's upper mark to .65 (bracket-mark.tsx `DIM_OPACITY`, an earlier contrast ruling); the frame draws both at full ink.

## State reachability gaps
1. src/components/rule-zero/table-body.tsx:44 — T5/D5, T10/D10 "set by you" — `copy.meta` takes `null` for "you", but the body passes `view.setBy`, which `loadTable` fills with the setter's display name even when the setter is the viewer (rule-zero-table.ts:236; `setByYou` at :235 is never read by any component). The setter sees "set by <own name>"; a setter with no profile (null) reads "set by you" to everyone. Fixtures mask it (`table-fixtures.ts:159` sets `setBy: null` for the viewer). Fix: `copy.meta(podName, view.setByYou ? null : view.setBy, …)` and decide the null-profile wording.
2. src/lib/rule-zero/table-view.ts:64 — T10/D10 own read seat's chip and five counts — `drawTable` takes the reading only when `seat.read` is set, and under `read.kind === "notEnough"` no seat is placed (rule-zero-table.ts:224–227), so a fresh/stale seat at a table with fewer than two read seats draws no chip and no counts. The board draws `You`'s Upgraded chip and counts on T10. The data exists (`deck.reading` is built whenever `inRead(state)`); gate on `inRead(seat.state)` / `seat.deck?.reading` instead of `seat.read` for `chip` and `counts` (keep `rangeLine` needing a face).
3. src/components/rule-zero/table-seat.tsx:102–106 — T10/D10 waiting seat's commander line — the board draws `<span class="cm">their seat joins the read when they do</span>` under `Picking their deck`; there is no copy key for it in `src/lib/copy/rule-zero.ts` and no branch renders a `.cm` line for a seat without a deck.

VERDICT: 24 visual gaps, 3 state gaps

## Confirm pass (Agent 3)
Checked at HEAD 9ca396daf, against the Visual gaps and State reachability gaps above only.

Visual gaps
1. Back link: FIXED (back-link.tsx:11; table-body.tsx:43 phone 44px/14px/px-8/20px glyph, :46 desktop 13px gap 6 mb 6)
2. Desktop head band: FIXED (table-body.tsx:45 border-b var(--border), 22/34/16; :58 md:pt-[22px])
3. Meta pod name: FIXED (table-body.tsx:49 `<b>` 500 var(--fg-body))
4. Meta line phone break: FIXED (table-body.tsx:51-52 `<br className="md:hidden">`)
5. Page padding: FIXED (table-body.tsx:44 phone px-16 pb-22, no top; :58 md:pb-[28px])
6. Body sentence bracket names: FIXED (read-card.tsx:84 `<b>` 600 var(--fg); em() at :109-162)
7. Rail a11y: FIXED (read-card.tsx:192-193 role img + railLabel)
8. Rail face ring precedence: FIXED (read-card.tsx:239 flag ring wins over accent)
9. Rail face bg / fallback text: FIXED (read-card.tsx:247 elevated, 600, fg-muted)
10. Counts key a11y: FIXED (read-card.tsx:258 aria-label keyLabel)
11. Provenance opener styling: SETTLED (shipped opener reused as-is, per README)
12. Phone chip to counts: FIXED (table-seat.tsx:142 mt-[12px] row 4)
13. Phone sub line: FIXED (table-seat.tsx:121 own row 3, mt-[8px])
14. Stale mark placement: FIXED (table-seat.tsx:121-127 row 3 between chip and counts)
15. Desktop cm to chip: FIXED (table-seat.tsx:73 gap-y 4 + :116 md:mt-[4px] = 8px)
16. Desktop tag to counts: FIXED (table-seat.tsx:73 gap-y 4 + :143 md:mt-[4px] = 8px)
17. Desktop art shadow: FIXED (table-seat.tsx:80 md:shadow-[0_10px_22px_rgba(0,0,0,.5)])
18. Initials art background: FIXED (table-seat.tsx:81 radial-gradient as background-image when no art)
19. Count chip icon size: FIXED (table-seat.tsx:249 13px wrapper)
20. Count chip icon color: SETTLED (shipped findings marks keep their own ink, per README)
21. Log this game nowrap: FIXED (table-body.tsx:82)
22. Expired phone back row: FIXED (table-closed.tsx:30)
23. Expired vertical centering: FIXED (table-closed.tsx:29 flex column min-h, :31 m-auto)
24. Expired faces: FIXED (table-closed.tsx:39 ring, :42 1.5px var(--bg) border, elevated)
Also SETTLED: BracketChip upper-mark .65 dim (shipped contrast ruling); expired title as h1 (table-closed.tsx:47, only heading, style matches).

State reachability gaps
1. "set by you": FIXED (table-body.tsx:50 `view.setByYou ? null : view.setBy`). Residual edge only if a setter has no social_profiles row (leftJoin, rule-zero-table.ts:107/236), not a drawn state of the boards.
2. Lone read seat's chip and counts: FIXED (table-view.ts:66-80 chip/counts from `seat.deck?.reading`; rangeLine's measured kinds still need a face)
3. Waiting seat's commander line: FIXED (table-seat.tsx:108-110; copy rule-zero.ts:136-137 pickingSub/pickingSubOwn)

VERDICT: 0 gaps remain
