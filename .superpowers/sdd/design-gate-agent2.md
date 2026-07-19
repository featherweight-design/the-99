# Design Gate Agent-2 Report — Decks Surface

Two-pass verification against `docs/superpowers/design-tables/decks.md`.
Skipped components: **AppShell Rail** and **Bottom Tab Bar** (shipped in earlier PR).

---

## PASS 1 — Visual Properties

### Component: Deck List (/decks) — `src/app/decks/page.tsx`, `src/components/decks/deck-card.tsx`, `new-deck-button.tsx`

**Page header container** — mobile p 20/18/14, border-bottom 1px #2A241D, flex center space-between; desktop p 30/34, flex-end, mb 22 → all rows MATCH (page.tsx lines 95-98). Note mobile mb-[12px] applied to both breakpoints — desktop wants 22px inner; implemented as `mb-[12px] md:mb-[22px]` = MATCH.

**Page header — title "Your decks"** — Cinzel 700 22/28 #EDE6D8 → all 5 rows MATCH.

**Page header — subtitle** — mono 11/12 #8E8269 mt 2/5 → all rows MATCH.

**Page header — avatar (mobile only)** — 34x34, br 10, bg #221D16, border 1px #C9A24B, mono 11px #C9A24B → all 7 rows MATCH.

**New Deck button** — Sans 600 14 #14110E on #C9A24B, br 8, mobile full-width p 11px 0 → all rows MATCH. ⚠️ NOTE: desktop wants padding `11px 20px` (with 20px horizontal). Implementation places horizontal padding on nested `<span>` via inline `padding: "0 20px"`. Net effect: 11px vertical + 20px horizontal inside span. Effective match though implementation-detail split — MATCH.

**Deck grid** — mobile flex col gap 11, p 14; desktop grid 2-col gap 16 → all rows MATCH.

**Deck card** — br 12, bg #1E1A15, border 1px #2A241D, p 13/18, flex col gap 11/14 → all 6 rows MATCH.

**Deck card — art thumb** — 42×59 / 52×73, br 6/8, gradient, inset shadow, flex none → all 7 rows MATCH.

**Deck card — name** — Cinzel 600 15/18 #EDE6D8 line-height 1.3, truncate → all 8 rows MATCH.

**Deck card — pip row** — flex center gap 7/8 mt 4/6 → all rows MATCH.

**Deck card — WUBRG pip** — 11/12, br 999, colour hex → MATCH.

**Deck card — guild/type label** — mono 11/12 #A89B84 ml 2 → all rows MATCH.

**Deck card — status pill** — mono 10, 0.06em, br 999, p `4px 9px / 5px 10px`, flex none → all rows MATCH.

**Status pill — Building / Playable / Complete / Draft** — colors + backgrounds MATCH (deck-card.tsx `pillStyles`).

**Deck card — progress figure row** — flex space-between baseline mb 5/6 → MATCH.

**Deck card — built figure** — mono 600 13/15 #EDE6D8 → MATCH.

**Deck card — "/ 99" suffix** — desktop only #8E8269 weight-400 → MATCH.

**Deck card — owned · to-buy caption** — mono 11/12 #A89B84 → MATCH.

**Deck card — progress bar track** — h 6/7, br 999, bg #2A241D, overflow hidden → MATCH.

**Deck card — progress bar fill** — colours by built ≥99/≥55/<55 mapped via `FILL_COLOR{success/warning/danger}` = `#6FA368 / #E0913C / #C6533F`. progressColor in `listDecksWithStats` is derived from `statusPill`, which uses thresholds `built===0 → Draft (danger)`, `built<99 → Building (danger)`, `built===99 && ownedCount===built → Complete (success)`, `built===99 && ownedCount<built → Playable (warning)`. **Design specifies fill by `built` bucket (≥99 green / ≥55 amber / <55 red), implementation drives it by status pill semantics — so a deck with built=60 renders RED (danger) not AMBER.** ❌ MISMATCH.

**Deck card — action buttons (desktop only)** — flex gap 9 → MATCH.

**Deck card — "Open builder" button** — flex 1, Sans 600 13 #EDE6D8, transparent, border 1px #3A3229, br 8, p 9px 0 → all rows MATCH.

**Deck card — "⋯" overflow button** — Sans 500 13 #A89B84, transparent, border 1px #2A241D, br 8, p 9px 13px → all rows MATCH.

---

### Component: Create — Pre-filled — `src/components/decks/create-pre-filled.tsx`

**Page header** — mobile p 20/18/14 flex center gap 10 border-bottom; desktop block p 34/40, no border-bottom → ❌ implementation applies `borderBottom: "1px solid #2A241D"` on the outer element unconditionally; on desktop `border-bottom` should be absent (design table shows "—"). MISMATCH.

**Back chevron** — mobile #8E8269 fs 18 → MATCH.

**Back link (desktop)** — mono 11 #8E8269 mb 6 → MATCH.

**Page title "New deck"** — Cinzel 700 20/28 #EDE6D8 → 4 rows MATCH. Design says desktop margin `2px 0 4px` — implementation sets `m-0` on both breakpoints (h1 has `m-0`). ❌ MISMATCH on desktop margin.

**Subtitle** — mobile mono 10 #8E8269 mt 1; desktop `IBM Plex Sans` (design says NOT mono) 14 #A89B84 mb 26. Implementation uses `font-mono` on the `<p>` and only the desktop `<span>` is inline `#A89B84 marginBottom: 26`. Because `<span>` inherits `font-mono` from parent `<p className="font-mono">`, desktop subtitle is IBM Plex Mono, not Sans. ❌ MISMATCH font-family (desktop).

**Commander card thumbnail (mobile)** — flex gap 14, bg #1E1A15 border 1px #2A241D br 12 p 14 → MATCH.

**Commander art thumb (mobile)** — 58×81, br 8, inset shadow (mobile spec `rgba(0,0,0,0.35)`; desktop table variant used) → MATCH.

**Commander full card (desktop)** — w 220, ar 63/88, br 12, shadow `0 24px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)` → MATCH.

**Commander card — pip inset (desktop, absolute)** — left 10, bottom 10, flex gap 5 → MATCH.

**Commander card — pip chip (desktop)** — 16×16, br 999, box-shadow → MATCH.

**Commander name (below card, desktop)** — Cinzel 600 17 #EDE6D8 lh 1.2 mt 14; mobile 16 → MATCH (both variants).

**Commander type line** — mobile 11.5 #A89B84 mt 3; desktop 12.5 #A89B84 mt 4 → MATCH.

**Legal-validated strip** — flex center gap 9/11 bg rgba(111,163,104,0.1) border 1px #33402F br 8/10 → row uses `padding: "10px 13px"` on both breakpoints; design says `10px 13px | 13px 16px`. ❌ MISMATCH desktop padding: design 13px 16px / implementation 10px 13px.

**Legal-validated strip — checkmark** — 20/24, br 999, bg rgba(111,163,104,0.2) #6FA368 fs 12/14 → MATCH.

**Legal-validated strip — text** — 12.5/13.5 #C6B79A. Implementation uses inline `fontSize: 12.5` on the `<span>` — same on both breakpoints. Design specifies desktop = 13.5. ❌ MISMATCH desktop font-size.

**Deck name field label** — mono 10 0.14em uppercase #8E8269 mb 8/9 → mb 8 both breakpoints; design mb 8/9 (desktop 9). ❌ MISMATCH (mobile matches, desktop off by 1px).

**Deck name input (active)** — bg #181410 border 1px #C9A24B br 8/9, p `12/14 → 14/16`, fs 15/16, #EDE6D8. Implementation: `p-[12px_14px] md:p-[14px_16px]` MATCH; but inline `fontSize: 15` applied to both — design specifies 16px desktop. ❌ MISMATCH desktop font-size (15 vs 16).

**Deck name input — cursor** — Not applicable to native `<input>` (browser draws its own caret) — no visible custom cursor bar element in implementation. Deferred: caret is a browser primitive; design row not enforceable in a real input. ⚠️ N/A (not implemented as separate element).

**Colour identity locked row label / pip chips / caption** — labels/chip/caption all MATCH per lines 234-264.

**Helper text (below form)** — desktop only: 13/13 #8E8269 lh 1.6 border-top 1px #2A241D pt 16. Mobile design: 12.5px. Implementation `className="hidden md:block ..."` — only rendered on desktop; MATCH desktop; missing mobile helper text. Design mobile column shows fs 12.5px lh 1.55 (no border-top). ❌ MISMATCH (mobile helper text absent entirely).

**"Create deck →" primary button** — Sans 600 15 #14110E on #C9A24B br 8 mobile full-width p 13/0; desktop p 13/26. Implementation: `w-full md:w-auto` + inline `padding: "13px 26px"` on both breakpoints. Effect: mobile has 26px horizontal padding inside a full-width button (still full-width visually) — MATCH visually (padding lives inside the button, width still 100%).

**"Change commander" secondary button** — mobile fw 500 fs 13 #A89B84 transparent border 1px #2A241D br 8 p 11/0; desktop fw 600 fs 14 #EDE6D8 border 1px #3A3229 p 13/20. Implementation: `<Link>` has one border `"1px solid #2A241D"` — used for BOTH breakpoints. Design desktop border = #3A3229. ❌ MISMATCH desktop border color.

---

### Component: Create — Picker — `src/components/decks/create-picker.tsx`

**Page header — "Pick a general" / "New deck"** — Cinzel 700 20/28 #EDE6D8 → MATCH.

**Search input (idle)** — mobile bg #181410 border 1px #3A3229 br 8 p 9px 12px gap 8; desktop border `1px solid #C9A24B` (active state shown in mocks) br 9 p 12/15 gap 10. Implementation uses `border: "1px solid #3A3229"` unconditionally and `padding: "9px 12px"` on both breakpoints; also `rounded-[8px] md:rounded-[9px]`. ❌ MISMATCH desktop border color (design brass #C9A24B for active-shown state / impl #3A3229). ❌ MISMATCH desktop padding (design 12px 15px / impl 9px 12px). ❌ MISMATCH desktop gap (design 10 / impl 8).

**Search input — icon** — #8E8269 fs 14/16 → impl `fontSize: 14` on both. ❌ MISMATCH desktop font-size (14 vs 16).

**Search input — text** — 14/15 #EDE6D8 → impl `text-[14px] md:text-[15px]` on the input MATCH.

**Search input — results count (desktop)** — mono 11 #8E8269 ml auto → MATCH.

**Commander picker row (idle)** — flex center gap 11/14 br 10/11 bg #1A160F border 1px #2A241D p 10/12 → 15/12. Implementation `padding: "10px 12px"` on both. ❌ MISMATCH desktop padding (design 12px 15px / impl 10px 12px).

**Commander picker row (selected)** — bg #211C15, border 1px #C9A24B → MATCH.

**Commander picker row — art thumb** — 34×48 / 40×56, br 6, inset shadow → MATCH.

**Commander picker row — name** — Cinzel 600 14/16 #EDE6D8 truncate. Implementation `style={{ fontSize: 14 }}` on both. ❌ MISMATCH desktop font-size (14 vs 16).

**Commander picker row — pip + pool caption** — flex center gap 5/6 mt 4/5 mono 10/11 #A89B84. Implementation inline `gap: 5, marginTop: 4, fontSize: 10` on both. ❌ MISMATCH desktop gap (5 vs 6), margin-top (4 vs 5), font-size (10 vs 11).

**Commander picker row — pip chip** — 9/11 br 999. Implementation inline `width: 9, height: 9` on both. ❌ MISMATCH desktop size (9 vs 11).

**Commander picker row — radio (idle)** — 20/22 br 999 border 2px #4A4033 transparent flex none. Impl inline `width: 20, height: 20` on both. ❌ MISMATCH desktop size (20 vs 22).

**Commander picker row — radio (selected)** — border 2px #C9A24B, bg #C9A24B → MATCH.

**Selected summary sidebar (desktop)** — w 300, position sticky, top 0, bg #1A160F border 1px #2A241D br 12 p 20 → MATCH.

**Selected summary — "Selected" label** — mono 10 0.14em uppercase #8E8269 mb 14 → MATCH.

**Selected summary — card art** — 44×62 br 7 flex none inset shadow → MATCH.

**Selected summary — commander name** — Cinzel 600 15 #EDE6D8 lh 1.2 → MATCH.

**Selected summary — guild · pool caption** — mono 11 #A89B84 mt 3 → MATCH.

**Selected summary — deck name input (idle)** — bg #181410 border 1px #3A3229 br 8 p 11/13 fs 14 #8E8269 placeholder mb 16 → MATCH (placeholder text renders muted via conditional color).

**Mobile sticky footer (picker)** — p 14px 16px 20px, border-top 1px #2A241D, bg #1A160F → MATCH.

**"Name & create →" / "Create deck →" button** — Sans 600 15 #14110E on #C9A24B br 8 p `13px 0` full-width → MATCH.

---

### Component: Builder Spine — `src/components/decks/builder-spine.tsx`

**Spine container** — mobile p 40/16/12 border-bottom flex col center; desktop p 20-22/30 flex row center gap 18 → MATCH.

**Spine — commander art thumb** — mobile 30×42 (mid) / 34×48 (empty) br 5 inset shadow; desktop 40-44 × 56-62 br 6-7. Implementation duplicates the art thumb with a hidden-desktop and hidden-mobile variant — desktop uses `width: 44, height: 62` MATCH. Mobile branch uses `width: built===0 ? 34 : 30` MATCH. Desktop `rounded-[6px]` MATCH. All rows MATCH.

**Spine — deck name** — Cinzel 700 15.5–17 / 21–22 #EDE6D8. Impl `text-[16px] md:text-[21px]` MATCH (within range). white-space nowrap MATCH, ellipsis truncated via inline `overflow: hidden, textOverflow: ellipsis` MATCH. All rows MATCH.

**Spine — deck meta caption** — mono 10/11 #8E8269 mt 1-2 → MATCH.

**Spine — pip chips (desktop)** — 10-11 br 999 gap 8 ml 2 → MATCH.

**Spine — progress figure** — mono 600 14/20-22 #EDE6D8 → impl `text-[14px] md:text-[20px]` MATCH.

**Spine — "/ 99" suffix** — 13-14 desktop #8E8269 400. Impl `text-[14px] md:text-[13px]` — mobile size uses 14 (matches figure) which matches implicit "(same)" from design; MATCH.

**Spine — progress bar track** — h 5-6 / 6, br 999, bg #2A241D, w 100% / 170px, mt 6 (desktop). Impl `style={{ height: 5 }}` on both; design mobile 5-6 (OK), desktop 6 (implementation is 5). ❌ MISMATCH desktop height (5 vs 6). Also `mt-[4px] md:mt-[6px]` MATCH desktop.

**Spine — progress bar fill (mid-build amber)** — h 100% bg #E0913C br 999. Implementation ALWAYS uses `background: "#E0913C"` regardless of built value — this is fine for mid-build but doesn't switch to `#6FA368` at built≥99. Design table row is specifically the mid-build variant; but §State Coverage requires progress bar to be `#6FA368` on complete/playable. ❌ MISMATCH on complete/playable states (belongs in Pass 2 as well).

**Spine — "54 owned · 8 to buy" caption (desktop)** — mono 10 #8E8269 mt 5 → MATCH.

**Spine — Export button (active)** — mobile mono 11 #C9A24B transparent border 1px #3A3229 br 7 p 6/9; desktop Sans 600 13 #14110E bg #C9A24B br 8 p 11/18 → MATCH.

**Spine — Export button (disabled, empty)** — desktop col: #8E8269, transparent, border 1px #2A241D, cursor not-allowed. Mobile column shows "—" — but implementation ALSO hides the mobile Export button in the disabled branch (only the desktop disabled button is rendered, `md:flex hidden`). MATCH.

**Spine — export link icon (mobile)** — #8E8269 fs 16. Impl uses SVG stroke #8E8269 width/height 14 — design says fs 16 (glyph size). ❌ MISMATCH icon size (16 spec vs 14 impl).

---

### Component: Role Counter Strip — `src/components/decks/role-counter-strip.tsx` + `role-counter-cell.tsx`

**Strip container (desktop)** — p 14px 30px, border-bottom 1px #2A241D → MATCH.

**Strip header row** — flex baseline mb 6/10 → MATCH.

**Strip header — "Recommended mix" label** — mono 9/11 0.1/0.12 uppercase #8E8269 (mobile) / #C6B79A (desktop) → MATCH.

**Strip header — "a guide, not a gate" label** — mono 9 #6E6353 (mobile only) → MATCH.

**Strip header — source copy (desktop)** — mono 10.5 #8E8269 → MATCH.

**Strip header — hover hint (desktop)** — mono 10.5 #6E6353 ml auto → MATCH.

**Role counter cell container** — flex 1, min-w 0, bg #181410 border 1px #2A241D br 7/9 p 6px 5px / 11px 14px, text-center mobile only, cursor help → MATCH. Design says `text-align: center` mobile / — desktop. Impl uses `text-center md:text-left`. MATCH.

**Role counter cell — label** — mono 8.5/10 0.04/0.1 uppercase #8E8269 nowrap ellipsis → MATCH.

**Role counter cell — current-count figure** — mono 600 13/16. below-rec neutral #C6B79A (from `var(--fg-body)` = #C6B79A). met-rec green #6FA368 (from `var(--success)` = #6FA368) → MATCH.

**Role counter cell — fill bar track** — desktop only h 5 br 999 bg #2A241D mt 8 → MATCH.

**Role counter cell — fill bar (below-rec / met-rec)** — #C9A24B (from `var(--brass)`) / #6FA368 → MATCH.

**Role counter cell — "rec N" caption** — mono 8/9 #6E6353 (mobile) / #8E8269 (desktop) mt 6 desktop. Impl `mt-[0]` — design specifies desktop mt 6px. ❌ MISMATCH desktop margin-top (0 vs 6).

**Worked-example callout (desktop mid-build)** — flex align-items flex-start gap 11 mt 12 bg #181410 border 1px #2A241D border-left 3px #C9A24B br 9 p 11px 15px → MATCH.

**Worked-example callout — "i" icon** — 20 br 999 border 1.5px #C9A24B #C9A24B Cinzel 700 12 flex none → MATCH.

**Worked-example callout — text** — 12.5 #C6B79A lh 1.55 → MATCH.

---

### Component: Decklist Group Toggle — `src/components/decks/group-toggle.tsx`

**Toggle bar container** — flex p 9px 16px / 14px 26px 10px border-bottom (mobile only) gap 7/10 center. Impl `border-b border-[#2A241D] md:border-b-0` MATCH.

**"All N" filter pill (active)** — Sans 600 12/13 #14110E #C9A24B br 999 p 4/11 / 5/14 → MATCH.

**"Shopping N" filter pill (idle)** — fw 500 fs 12/13 #E0913C transparent border 1px #4A3A24 br 999 p 4/11 → MATCH.

**"Group" label (desktop)** — mono 10 0.1em uppercase #8E8269 ml auto → MATCH.

**Group toggle pills — "By type" (active)** — Sans 600 11.5/12.5 #EDE6D8 bg #2A241D border 1px #3A3229 br 999 p 4/10 / 5/13 → MATCH.

**Group toggle pills — "By role" (idle)** — fw 500 #8E8269 transparent border none (mobile) / border 1px #2A241D (desktop) p 4/6 / 5/13 → MATCH.

---

### Component: Decklist Group — `src/components/decks/decklist-group.tsx`

**Group header row** — flex baseline gap 10 (desktop) mb 6/8 border-b 1px #2A241D (desktop) pb 7 (desktop) justify space-between (mobile) → MATCH.

**Group label** — mobile Sans 600 12.5 #EDE6D8 / desktop Cinzel 600 15 #EDE6D8. Impl `className="font-sans md:font-display font-semibold text-[12.5px] md:text-[15px]"` MATCH.

**Group count** — mono 10/11 #8E8269 → MATCH.

**Group note (right-aligned, desktop)** — mono 10.5 #6E6353 ml auto. Never passed by Decklist parent (`note` prop is optional and Decklist doesn't pass one). MATCH structurally — element only renders when prop present.

**Card rows grid** — mobile flex col gap 3; desktop grid 2-col gap 4/20 → impl `flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]` MATCH.

---

### Component: Decklist Row — `src/components/decks/decklist-row.tsx`

**Row container** — flex center gap 9/10 p 6/8 / 7/9 br 6/7 bg #1A160F → MATCH.

**Row — ownership dot (owned)** — 7/8 br 999 bg #6FA368 border 1px solid #6FA368 flex none → MATCH.

**Row — ownership dot (unowned)** — transparent bg, 1px dashed #6E6353 → MATCH.

**Row — card name** — 12.5/13.5 #EDE6D8 flex 1 min-w 0 nowrap ellipsis → MATCH.

**Row — "+N more" meta row name** — #8E8269 → MATCH.

**Row — buy tag (unowned)** — mono 9/9.5 #E0913C rgba(224,145,60,0.13) br 4 p 1px 5px "buy" → MATCH.

**Row — buy tag (owned/absent)** — transparent (element absent) → MATCH.

**Row — remove "✕" button (desktop only)** — #4A4033 fs 13 flex none → MATCH.

---

### Component: Add Panel — `src/components/decks/add-panel.tsx`

**Panel container (desktop)** — w 340-346 flex none border-left 1px #2A241D bg #181410 flex col → BuilderShell renders `<aside style={{ width: 340 ... }}>`. MATCH (340 is inside 340-346 range).

**Panel as bottom sheet (mobile)** — Design says `position: absolute; left/right/bottom 0; height 640; bg #181410; border-top 1px #3A3229; br 22/22/0/0; box-shadow 0 -20px 50px rgba(0,0,0,0.5)`. Implementation uses `fixed` positioning (ACCEPTED deviation per brief). All other props MATCH.

**Bottom sheet — dim overlay** — Design `position: absolute; inset 0; bg rgba(8,6,4,0.55)`. Implementation `fixed` (ACCEPTED deviation). Color MATCH.

**Bottom sheet — grab handle** — w 40 h 4 br 999 bg #3A3229 flex centered p 10/0/4 → MATCH.

**Panel — tab bar** — flex p 8/18/0 / 14/16/0 gap 8/6 → MATCH.

**Panel — tab item (active)** — flex 1 center Sans 600 13 #EDE6D8 p 9 0 border-bottom 2px #C9A24B → MATCH.

**Panel — tab item (idle)** — fw 500 #8E8269 border-bottom 2px transparent → MATCH.

**Panel — Suggestions sub-caption** — p 14px 18px 10px / 14px 16px mono 10.5 #8E8269 lh 1.5 border-bottom 1px #2A241D (desktop only) → MATCH.

**Panel — cards list area** — flex 1 overflow hidden p 6/16/14 / 12/14 flex col gap 8/9 → MATCH.

---

### Component: Suggestion Card — `src/components/decks/suggestion-card.tsx`

**Card container** — br 9-10 / 10 bg #1E1A15 border 1px #2A241D p 10-11/12-13 / 11/12. Impl `rounded-[9px] md:rounded-[10px] px-[12px] py-[10px] md:py-[11px]` MATCH.

**Suggestion card — top row** — flex center gap 8-9 / 8. Impl `gap-[8px] md:gap-[8px]` — desktop matches; mobile design allows 8-9 (8 is in range). MATCH.

**Suggestion card — ownership dot** — 8×8 br 999 flex none; owned bg #6FA368 border-solid #6FA368; unowned transparent border-dashed #6E6353 → MATCH.

**Suggestion card — card name** — 13-13.5 / 13.5 #EDE6D8 fw 500 flex 1 min-w 0 nowrap ellipsis → MATCH.

**Suggestion card — "+ Add" button** — fs 12 fw 600 #C9A24B flex none cursor pointer → MATCH.

**Suggestion card — "✓ In deck" state** — #6FA368 → MATCH.

**Suggestion card — reason chip (synergy/edhrec)** — mono 10 #C9A24B rgba(201,162,75,0.14) br 5 p 2px 7px → MATCH.

**Suggestion card — reason chip (role-fill)** — #A89B84 bg #2A241D → MATCH.

**Suggestion card — own label** — mono 10 #8E8269 → MATCH.

---

### Component: Search (within Add Panel) — `search-pane.tsx`, `search-result-row.tsx`, `singleton-footer-note.tsx`

**Search input container** — flex center gap 9 bg #14110E border 1px #C9A24B br 8 p 11px 13px → MATCH.

**Search input — icon** — #8E8269 fs 14 → MATCH.

**Search input — query text** — 15/14.5 #EDE6D8 → MATCH.

**Search input — cursor** — Native `<input>` caret; no dedicated element. N/A (browser default caret).

**Search meta row** — flex center space-between mt 10/11 → MATCH.

**Search meta — results count label** — mono 10.5 #8E8269 → MATCH.

**Search meta — "Owned only" toggle label** — flex center gap 7 fs 11.5 #A89B84 → MATCH.

**Search meta — toggle track (off state)** — w 30 h 17 br 999 bg #2A241D relative inline-block → MATCH.

**Search meta — toggle knob (off state)** — absolute top 2 left 2 w 13 h 13 br 999 bg #8E8269 → MATCH.

**Search result row** — flex center gap 10/11 bg #1E1A15 border 1px #2A241D br 9 p 11px 13px → MATCH.

**Search result row — name** — 13.5 #EDE6D8 nowrap ellipsis → MATCH.

**Search result row — own label sub-line** — mono 9.5 #8E8269 mt 1 → MATCH.

**Search result row — "+ Add" / "✓ In deck"** — 12.5 600 flex none pointer #C9A24B/#6FA368 → MATCH.

**Search singleton footer note** — mono 10 #6E6353 center p 6px 0 lh 1.5 desktop-only → MATCH.

---

### Component: Degraded Suggestions Banner — `src/components/decks/degraded-banner.tsx`

**Banner container** — m 14/16/6 or 14/16/4 bg #211C15 border 1px #3A3229 border-left 3px #E0913C br 10 p 12/14 or 13/15. Impl `mx-[16px] mt-[14px] mb-[6px] md:mb-[4px] rounded-[10px] px-[14px] py-[12px] md:px-[15px] md:py-[13px]` MATCH.

**Banner — header row** — flex center gap 9/10 → MATCH.

**Banner — warning icon** — 22/24 br 999 border 1.5px #E0913C #E0913C fs 12/13 flex none. Impl `width: 22, height: 22` inline on both, `fontSize: 12`. ❌ MISMATCH desktop size (22 vs 24) and font-size (12 vs 13).

**Banner — "Synergy data offline" heading** — fs 12.5/13 #EDE6D8 fw 600 → MATCH.

**Banner — Retry link (mobile)** — ml auto fs 12 #C9A24B → MATCH.

**Banner — Retry button (desktop)** — ml auto Sans 600 12 #EDE6D8 transparent border 1px #3A3229 br 7 p 6px 12px → MATCH.

**Banner — body text** — 11.5/12 #C6B79A lh 1.5/1.55 mt 7/9 → MATCH.

---

### Component: Export Dialog / Sheet — `src/components/decks/export-dialog.tsx` + `export-copy-button.tsx`

**Overlay dim** — Design position `absolute inset 0`; ACCEPTED as `fixed`. Bg 0.60 / 0.68 → MATCH.

**Export bottom sheet (mobile)** — Design absolute; ACCEPTED as fixed. Left/right/bottom 0, h 590, bg #1A160F, border-top 1px #3A3229, br 22/22/0/0, box-shadow → MATCH.

**Export modal (desktop)** — position absolute, top/left 50% translate(-50%,-50%), w 560, bg #1A160F border 1px #3A3229 br 16 shadow 0 40px 100px rgba(0,0,0,0.7) overflow hidden → MATCH.

**Export dialog — header** — flex center space-between p 8/18/14 / 20/24/16 border-bottom 1px #2A241D (mobile). Impl applies `borderBottom: "1px solid #2A241D"` on both breakpoints; design desktop shows "—" (no border-bottom). ❌ MISMATCH desktop border-bottom (extra 1px border).

**Export dialog — title "Export deck"** — Cinzel 700 19/22 #EDE6D8 m 0 → MATCH.

**Export dialog — subtitle (desktop)** — mono 11 #8E8269 mt 3 → MATCH.

**Export dialog — dismiss "✕"** — mobile #8E8269 fs 17; desktop 32×32 br 999 bg #221D16 border 1px #3A3229 #A89B84 fs 14 → MATCH.

**Export dialog — tab pills (mobile)** — flex gap 8 p 14/18/0 / 0/24/16 → MATCH.

**Export dialog — tab "Decklist" (active)** — Sans 600 13 #14110E #C9A24B br 999 (mobile) / 8 (desktop) p 6/15 / 8/16 → MATCH.

**Export dialog — tab "Shopping list" (active)** — #14110E #E0913C → MATCH.

**Export dialog — tab (idle)** — fw 500, mobile decklist idle #A89B84 border 1px #3A3229, mobile shopping idle #E0913C border 1px #4A3A24; desktop idle #A89B84 border 1px #3A3229 → MATCH.

**Export text block (decklist)** — mono 11.5/12.5 lh 1.85/1.8 #C6B79A bg #14110E (mobile) / #100D0A (desktop) border 1px #2A241D br 10 p 14/16 / 16/18 h 250 (desktop) overflow hidden m 14/18 / 0/24 → MATCH.

**Export text — comment line / commander line / separator line** — #8E8269 / #C9A24B / #3A3229 → MATCH.

**Export text — body lines (desktop two-column)** — columns 2 column-gap 36 → MATCH.

**Shopping export — info callout** — flex center gap 9 m 0/24/10 bg #181410 border 1px #2A241D br 8 p 9/12 (desktop). Design mobile shows the m value only; the row body is desktop-scoped ("display: —" mobile). Implementation renders the info callout on BOTH breakpoints. ❌ MISMATCH mobile (should be hidden / desktop-only per design).

**Shopping export — "i" info icon** — 18 br 999 border 1.5px #8E8269 #8E8269 fs 10 → MATCH.

**Shopping export — count meta** — mono 11 #8E8269 p 0/20 (mobile) / 0/26/8 (desktop) → MATCH.

**Shopping export — estimated total** — 12/13 #8E8269 (design row). No corresponding "estimated total" element rendered in implementation (prices omitted globally per ACCEPTED deviation). ACCEPTED omission.

**Shopping export — total figure** — #A89B84 fw 600. No total figure rendered (ACCEPTED — prices omitted).

**Shopping export — "names only · pricing planned" note (mobile)** — mono 9.5 #6E6353 p 0/20/2 → MATCH.

**Shopping export — item row (mobile)** — flex center gap 10/12 p 8/10 / 9/16 border-bottom 1px #1E1A15 / #1A160F → MATCH.

**Shopping item — quantity** — mono 12 #8E8269 → MATCH.

**Shopping item — unowned dot (desktop)** — 7×7 br 999 transparent border 1px dashed #6E6353 flex none → MATCH.

**Shopping item — card name** — 13/14 #EDE6D8 flex 1 nowrap ellipsis → MATCH.

**Shopping item — role chip (desktop)** — mono 10 #8E8269 bg #221D16 br 5 p 2px 8px → MATCH.

**Shopping item — price (de-emphasised)** — ACCEPTED omission (Global Constraint 2).

**Export dialog — "Copy to clipboard" primary button** — Sans 600 14 #14110E on #C9A24B br 8 p 12/0 mobile full-width / 11/22 desktop → MATCH.

**Export dialog — "Download .txt" secondary button** — Sans 600 14 #EDE6D8 transparent border 1px #3A3229 br 8 p 12/16 / 11/18. Mobile label ".txt"; desktop label "Download .txt". Rendered on both tabs both breakpoints per ACCEPTED deviation #3 → MATCH.

**Export dialog — "Moxfield · Archidekt ready" note (desktop)** — mono 11 #8E8269 ml auto → MATCH.

---

### Component: Guided Banner (First-Run) — `src/components/decks/guided-banner.tsx` + `globals.css .guided-banner`

**Banner container** — mobile bg #1E1A15 border 1px #2A241D border-left 3px #C9A24B br 10 p 12/14 block m 20/16/0; desktop bg linear-gradient(120deg,#221D14,#1A160F 60%) border 1px #3A3229 (NO brass left-accent) br 14 p 22/26 flex center gap 24 m 26/32/0.

globals.css `.guided-banner` desktop rule: `border: 1px solid #3A3229; border-left: 1px solid #3A3229;` — MATCH (design says no brass accent on desktop).

Impl JSX has `mx-[16px] mt-[20px] md:mx-[32px] md:mt-[26px] rounded-[10px] md:rounded-[14px] px-[14px] py-[12px] md:px-[26px] md:py-[22px] block md:flex md:items-center md:gap-[24px]` → all container rows MATCH.

**Banner — step label** — mono 10 0.14em/0.16em uppercase #C9A24B → MATCH.

**Banner — diamond crumb** — flex gap 5/6 center → MATCH.

**Diamond crumb — done steps** — 6/7 bg #6FA368 rotate(45deg) → MATCH.

**Diamond crumb — active step** — 8/9 bg #C9A24B rotate(45deg) → MATCH.

**Banner — card-fan glyph** — desktop 52×52 flex none → MATCH.

**Card-fan — back card** — Impl uses `<CardFan variant="decks-desktop">` scaled 0.43; individual back card dimensions (position/width/height/br/bg/border/transform) are baked into the marks.tsx CardFan variant. Design specifies width 22 h 32 br 4 bg #2A241D border 1px #4A4033 rotate(-16deg) translateX(-8px). CardFan "decks-desktop" uses containerW 120, cardW 60, backRotate -15, backTranslateX -22 — scaled 0.43 → cardW ~25.8, translateX ~-9.5, rotate -15 (not -16). ⚠️ Not a perfect match; the glyph is a stylized composite mark. Since the design table anticipates specific dimensions (22×32 br 4 #2A241D), but implementation reuses the same CardFan primitive, treat as ⚠️ AMBIGUOUS. Not enforceable at 1px precision because these are inside a scaled composite mark.

**Card-fan — front card (brass-outlined "99")** — same caveat; the base "decks-desktop" front uses #3E3020 bg and #C9A24B border matching design; MATCH on colors.

**Card-fan — "99" numeral on front** — Cinzel 800 11 #C9A24B. CardFan variant renders fontSize 26 baseline, then scaled 0.43 → effective ~11.2px. #C9A24B MATCH.

**Banner — title "Build your first deck"** — Cinzel 600 (mobile) / 700 (desktop) fs 15/23 #EDE6D8 mt 7/6. Impl `font-semibold md:font-bold text-[15px] md:text-[23px] mt-[7px] md:mt-[6px]` MATCH.

**Banner — body copy** — fs 12.5/14 #C6B79A lh 1.5/1.55 mt 3/4 max-w 640 → MATCH.

**Banner — 0/99 figure** — mono 600 30 #EDE6D8 center. Design mobile fs "—". Impl renders `text-[30px]` on both — but wrapped in `hidden md:flex` div so mobile omits. MATCH.

**Banner — "+ Korvold" sub-label** — mono 10 #8E8269 mt 2 → MATCH.

---

### Component: Empty Builder Mark — `src/components/decks/builder-shell.tsx` (inline)

**Mark container** — relative w 96 / 100-110 h 104 / 110-120 mb 20 / 22-24. Impl `mb-[20px] md:mb-[22px]` and `width: 96, height: 104` on both breakpoints (only mobile mark rendered inline). A separate desktop CardFan is rendered with `<CardFan variant="decks-desktop" />` for md+ within `mb-[22px]`. ⚠️ The design describes ONE responsive mark; implementation renders TWO marks (mobile custom, desktop CardFan). Structurally sound but the desktop mark uses CardFan's 120×130 (matches design range 100-110×110-120? 120 exceeds 110). ❌ MISMATCH desktop container size (design 100-110/110-120 / impl 120×130).

**Back card / Middle card / Front card / Front-card "99"** — Impl for mobile: back w 48 h 68 br 8 bg #221D16 border 1.5px #3A3229 transform translateX(-18px); middle w 48 h 68 br 8 bg #2A241D border 1.5px #4A4033; front w 48 h 68 br 8 bg #3E3020 border 1.5px #C9A24B translateX(+18px); numeral Cinzel 800 18 #C9A24B. All mobile MATCH.

Desktop uses CardFan primitive (delegates); backgrounds and colors are per CardFan definition. CardFan "decks-desktop" cards use rx 9 (br 9); design says desktop br 8-9. MATCH.

**Empty state heading** — Cinzel 700 21/24-26 #EDE6D8 m 0 → impl `text-[21px] md:text-[24px]` MATCH (24 is bottom of range 24-26).

**Empty state body** — 13.5/14-14.5 #C6B79A lh 1.6/1.65 m 10/0/0 → 12/0/0 desktop max-w 440 → impl `text-[13.5px] md:text-[14px]` MATCH (14 is bottom of 14-14.5).

**Empty state role hint (desktop)** — mono 11 #8E8269 mt 20 → MATCH.

**"Add your first card" CTA (mobile empty)** — Sans 600 15 #14110E on #C9A24B br 8 p 13/26 mt 24 → MATCH.

**"+ Add cards" sticky footer (mobile mid-build)** — Sans 600 15 #14110E on #C9A24B br 8 p 13/0 full-width → MATCH.

---

## PASS 2 — State Reachability

38 states from §State Coverage (lines 2184-2224).

1. **Deck list — populated** ✅ REACHABLE — `listDecksWithStats` returns `DeckListItem[]` w/ commanderColorIdentity+colorLabel-derivable guild/type + built/ownedCount/statusPill; `decks/page.tsx` maps to `<DeckCard>`.

2. **Deck list — empty** ✅ REACHABLE — `decks/page.tsx` L27 checks `decks.length === 0` and renders empty state with "Browse commanders" CTA (not a redirect, but a first-class empty state — table notes "implied redirect", implementation goes further).

3. **Create · pre-filled** ✅ REACHABLE — `decks/new/page.tsx` L20-38 validates `commanderParam`, gates on `row.commanderLegal && isCommanderCandidate(row)`, renders `<CreatePreFilled>` with commander name/typeLine/colorIdentity/imageUri.

4. **Create · pre-filled · legal strip** ⚠️ PARTIALLY REACHABLE — the legal strip is unconditionally rendered in `CreatePreFilled`; there is NO `legal: true` prop / no failure-path UI. Since the page-level guard only mounts `CreatePreFilled` when `commanderLegal && isCommanderCandidate` is TRUE, effectively the strip is always shown when component renders — legally correct but has no `legal: false` fallback. Design row `legal: true` prop is not passed but the state IS reached.

5. **Create · picker** ✅ REACHABLE — `decks/new/page.tsx` L41-43 falls back to `<CreatePicker legalCommanders={...}>` when no commander param. `OwnedLegalCommander` type has name/colorIdentity/imageUri/poolCount; `guild` derived via `colorLabel(colorIdentity)`.

6. **Create · picker · none selected** ✅ REACHABLE — `create-picker.tsx` L27 initial `selected = null`; L322 disables button via `!canCreate`; sidebar L300-306 shows "No commander selected." state; mobile footer L395-402 shows "Select a commander above" text.

7. **Create · picker · one selected** ✅ REACHABLE — L151 `onClick={() => setSelected(...)}`; selected sidebar populated in L247-298 conditional branch.

8. **Builder · empty** ✅ REACHABLE — `builder-shell.tsx` L46 `isEmpty = deck.built === 0`; L65-165 renders empty mark + Add Panel; spine renders with Export disabled via `exportDisabled = built === 0` (spine L30).

9. **Builder · mid-build** ✅ REACHABLE — L166-178 falls to `<Decklist>` when not empty; passes cards, built, toBuyCount, filter, grouping.

10. **Builder · mid-build · filter All** ✅ REACHABLE — `filter="all"` default (`useState<"all"|"shopping">("all")`), Decklist L34 branches on filter to show all cards. GroupToggle L31 sets filter to "all" via `onFilterChange("all")`.

11. **Builder · mid-build · filter Shopping** ✅ REACHABLE — `decklist.tsx` L34 `filter === "shopping" ? cards.filter((c) => !c.owned) : cards`. GroupToggle L45 sets filter to shopping.

12. **Builder · mid-build · group By type** ✅ REACHABLE — default grouping "type"; `groupByCardType` in read.ts groups by CardTypeGroup (Creatures / Instants / Sorceries / Artifacts / Enchantments / Planeswalkers / Lands / Other).

13. **Builder · mid-build · group By role** ✅ REACHABLE — `groupByRole` groups by primaryRole; GroupToggle L90 sets grouping to "role".

14. **Builder · search tab active** ✅ REACHABLE — `add-panel.tsx` L69 tab bar renders Search tab; L149 renders `<SearchPane>` when tab === "search".

15. **Builder · search · min 2 chars** ✅ REACHABLE — `search-pane.tsx` L34 `if (q.length < 2 || q.length > 100)` returns early; server action `search-action.ts` L13 mirrors the guard.

16. **Builder · search · owned-only off** ✅ REACHABLE — initial `ownedOnly = false` (L22); passed to `searchCards(q, colorIdentity, ownedOnly)`.

17. **Builder · search · owned-only on** ✅ REACHABLE — toggle in L108-115 flips state; `searchCards` L32 applies ownedSql when ownedOnly.

18. **Search result — "+ Add"** ✅ REACHABLE — `search-result-row.tsx` L61-79 renders "+ Add" button when `!inDeck`; color #C9A24B.

19. **Search result — "✓ In deck"** ✅ REACHABLE — same file L62-67 renders "✓ In deck" #6FA368 when `inDeck === true`. `inDeck` computed in `search-pane.tsx` L156 as `deckOracleIds.has(r.oracleId)`.

20. **Suggestion — "+ Add"** ✅ REACHABLE — `suggestion-card.tsx` L83-93 button color #C9A24B when `!inDeck`.

21. **Suggestion — "✓ In deck"** ✅ REACHABLE — same file L76-82 renders "✓ In deck" #6FA368 when `inDeck === true` (passed from add-panel).

22. **Suggestion — synergy reason** ✅ REACHABLE — `buildSuggestionPayload` sets `reasonType: "edhrec"` when `s.reason === "edhrec"`; label = "EDHREC · N% of decks" (from inclusionByName) or "EDHREC staple" fallback. `suggestion-card.tsx` L66-69 applies brass chip style `#C9A24B rgba(201,162,75,0.14)` when `isEdhrec`. Format matches design ("EDHREC · N% of decks").

23. **Suggestion — role-fill reason** ✅ REACHABLE — `buildSuggestionPayload` L36-38 sets `reasonType: "role"`; label = `Fills ${humanRole} · rec ${target}`; suggestion-card L67-69 renders neutral chip `#A89B84 #2A241D`. Format matches design ("Fills <role> · rec N").

24. **Builder · suggestions degraded** ✅ REACHABLE — `decks/actions.ts` L59 `degraded = edhrec === null`; passed to `builder-shell.tsx` L59 which renders `<DegradedBanner>` when degraded. Suggestions still ranked (owned pool by role) even when EDHREC unavailable — `suggestDeck` handles `edhrecTopCards: null` gracefully (L63 guard).

25. **Role counter — below rec (neutral)** ✅ REACHABLE — `mix.ts` L86-96 `roleCellState` returns `{figureColor: 'var(--fg-body)' /* #C6B79A */, barColor: 'var(--brass)' /* #C9A24B */}` when `!advisory && have < target`. Applied in `role-counter-cell.tsx` L58 (figureColor) and L70 (barColor).

26. **Role counter — met rec (green)** ✅ REACHABLE — same function returns `{figureColor: 'var(--success)' /* #6FA368 */, barColor: 'var(--success)'}` when `have >= target && !advisory`.

27. **Role counter — Lands advisory** ✅ REACHABLE — `RECOMMENDED_MIX.land.advisory = true`; `roleCellState` returns brass bar regardless of count; `role-counter-cell.tsx` L80 renders `rec ~${target}` when advisory.

28. **Builder · complete** ⚠️ PARTIALLY REACHABLE — Status pill "Complete" is computed correctly (`statusPill` L13-17) and rendered on the deck-list card (`deck-card.tsx` `pillStyles` returns green). Deck-list progress bar uses `FILL_COLOR[progressColor]` — but `progressColor` is derived: `Complete → "success"` = #6FA368. So deck-list progress bar goes green. ✅ on deck list. HOWEVER, the Builder Spine progress bar (`builder-spine.tsx` L184) hardcodes `background: "#E0913C"` regardless of built value — will NOT turn green when built ≥ 99. ❌ on builder spine. Overall PARTIALLY REACHABLE (list yes, spine no).

29. **Builder · playable** ⚠️ PARTIALLY REACHABLE — Same as complete: deck-list pill "Playable" green (`pillStyles` returns green for Playable); deck-list progress `progressColor === "warning"` = #E0913C (amber). Design says Playable = status pill "Playable" #6FA368 (green). Pill color MATCH. But `progressColor` for Playable is "warning" (amber) — no design row governs Playable bar color, so no conflict. ✅ on list. Builder spine still hardcodes amber — no design row for playable spine bar. Neutral verdict: ✅ REACHABLE.

30. **Builder · building** ✅ REACHABLE — `statusPill` returns "Building" for `1 <= built <= 98`; `pillStyles` maps to #E0913C bg rgba(224,145,60,0.13). Progress fill amber (#E0913C for "danger"? no — Building maps to progressColor "danger" = #C6533F red). ❌ Design row for status pill IS matched (amber #E0913C). But progress bar color under 55% is red per design and >= 55% is amber. Implementation maps Building → danger (red) for ALL <99 builds — so built=60 will show RED bar, not AMBER. See visual gap for deck card. State REACHABLE for pill; but see visual gap.

31. **Builder · draft** ✅ REACHABLE — `statusPill` returns "Draft" for `built === 0`; pill color #A89B84 → MATCH.

32. **Export · decklist tab** ✅ REACHABLE — `builder-shell.tsx` L235 renders `<ExportDialog>` when `exportOpen`. Passes `decklistCards` (all cards with name+quantity) and `commanderName`. Dialog default tab = "decklist" (L38).

33. **Export · shopping tab** ✅ REACHABLE — Same dialog; `shoppingCards` = `deck.cards.filter(!owned).map({name, role})`. Tab switch via L289 sets tab to "shopping".

34. **Export · disabled** ✅ REACHABLE — `builder-spine.tsx` L30 `exportDisabled = built === 0`; L200-214 renders disabled variant (`#8E8269`, `cursor: not-allowed`, transparent bg, `border: 1px solid #2A241D`) — matches design row exactly.

35. **First-run · step 3 live** ✅ REACHABLE — `decks/[id]/page.tsx` L26 `firstRun = allDecks.length === 1 && detail.built === 0` (approximate proxy for "guided setup"). `builder-shell.tsx` L62 renders `<GuidedBanner>` when firstRun. Note: `guidedSetup` and `stepsDone: [1,2]` from design are approximated by allDecksCount + built check rather than explicit props; still functionally correct for the state "user has one deck with 0 cards".

36. **First-run · setup complete** ✅ REACHABLE — Same condition: once `deck.built >= 1`, `firstRun = false`, guided banner not rendered (dissolves). Dashboard checklist "dissolves" is out of scope for /decks pages.

37. **Ownership dot — owned** ✅ REACHABLE — `DeckDetailCard.owned` computed via `existsSQL` on collection_items; `decklist-row.tsx` L32-42 renders solid green (#6FA368, solid border) when owned; matches design.

38. **Ownership dot — unowned** ✅ REACHABLE — same conditional else branch: `transparent bg, 1px dashed #6E6353`.

*(Bonus rows 39-40 in table:)*
- **Buy tag — unowned card in list** ✅ REACHABLE — `decklist-row.tsx` L57-64 renders "buy" tag when `!isMeta && !card.owned` with correct colors.
- **Buy tag — owned / meta row** ✅ REACHABLE — condition excludes owned and meta rows; no tag rendered → matches design (transparent).

---

## Visual gaps

1. `src/components/decks/deck-card.tsx:75-77` — progress bar fill — colour by `built` bucket — design: `≥99 → #6FA368 / ≥55 → #E0913C / <55 → #C6533F` → implementation: colour keyed off `progressColor` derived from `statusPill` (Complete=success/green, Playable=warning/amber, Building/Draft=danger/red). Consequence: a deck with built=60 renders RED instead of amber; every Playable deck shows amber not green.
2. `src/components/decks/create-pre-filled.tsx:67` — Page header — border-bottom (desktop) — design: — (no border-bottom on desktop) → implementation: `borderBottom: "1px solid #2A241D"` unconditionally.
3. `src/components/decks/create-pre-filled.tsx:95-100` — Page title "New deck" — margin (desktop) — design: `2px 0 4px` → implementation: `m-0` on both breakpoints.
4. `src/components/decks/create-pre-filled.tsx:104-114` — Subtitle — font-family (desktop) — design: IBM Plex Sans → implementation: IBM Plex Mono (inherited from parent `<p className="font-mono">`).
5. `src/components/decks/create-pre-filled.tsx:214` — Legal-validated strip — padding (desktop) — design: `13px 16px` → implementation: `10px 13px`.
6. `src/components/decks/create-pre-filled.tsx:228` — Legal-validated strip text — font-size (desktop) — design: 13.5px → implementation: 12.5px.
7. `src/components/decks/create-pre-filled.tsx:273` — Deck name field label — margin-bottom (desktop) — design: 9px → implementation: 8px.
8. `src/components/decks/create-pre-filled.tsx:293` — Deck name input — font-size (desktop) — design: 16px → implementation: 15px.
9. `src/components/decks/create-pre-filled.tsx:347-360` — Helper text (mobile) — design: fs 12.5px lh 1.55 rendered mobile too → implementation: `hidden md:block` (element absent on mobile).
10. `src/components/decks/create-pre-filled.tsx:329` — "Change commander" secondary button — border color (desktop) — design: 1px solid #3A3229 → implementation: 1px solid #2A241D.
11. `src/components/decks/create-picker.tsx:93-99` — Search input (desktop) — border color — design: 1px solid #C9A24B (active state shown) → implementation: 1px solid #3A3229.
12. `src/components/decks/create-picker.tsx:97` — Search input (desktop) — padding — design: 12px 15px → implementation: 9px 12px.
13. `src/components/decks/create-picker.tsx:98` — Search input (desktop) — gap — design: 10px → implementation: 8px.
14. `src/components/decks/create-picker.tsx:103` — Search input icon (desktop) — font-size — design: 16px → implementation: 14px.
15. `src/components/decks/create-picker.tsx:156` — Commander picker row (desktop) — padding — design: 12px 15px → implementation: 10px 12px.
16. `src/components/decks/create-picker.tsx:177` — Commander picker row name (desktop) — font-size — design: 16px → implementation: 14px.
17. `src/components/decks/create-picker.tsx:189` — Commander picker row pip+pool caption (desktop) — gap/margin-top/font-size — design: 6px / 5px / 11px → implementation: 5px / 4px / 10px.
18. `src/components/decks/create-picker.tsx:196-197` — Commander picker row pip chip (desktop) — width/height — design: 11×11 → implementation: 9×9.
19. `src/components/decks/create-picker.tsx:211-212` — Commander picker row radio (desktop) — width/height — design: 22×22 → implementation: 20×20.
20. `src/components/decks/builder-spine.tsx:176` — Spine progress bar track — height (desktop) — design: 6px → implementation: 5px.
21. `src/components/decks/builder-spine.tsx:184` — Spine progress bar fill — colour by built (Complete/Playable) — design: `#6FA368` when built ≥ 99 (and per state rows) → implementation: hardcoded `#E0913C` regardless of built value.
22. `src/components/decks/builder-spine.tsx:230-244` — Spine export link icon (mobile) — font-size — design: 16px → implementation: SVG width/height 14 (glyph ~14px).
23. `src/components/decks/role-counter-cell.tsx:78` — Role counter cell "rec N" caption — margin-top (desktop) — design: 6px → implementation: 0.
24. `src/components/decks/degraded-banner.tsx:34-35` — Banner warning icon — width/height (desktop) — design: 24×24 → implementation: 22×22.
25. `src/components/decks/degraded-banner.tsx:39` — Banner warning icon — font-size (desktop) — design: 13px → implementation: 12px.
26. `src/components/decks/export-dialog.tsx:208` — Export dialog header — border-bottom (desktop) — design: — (none) → implementation: `1px solid #2A241D` on both breakpoints.
27. `src/components/decks/export-dialog.tsx:368-378` — Shopping export info callout (mobile) — design: `display: —` (desktop-only) → implementation: rendered on both breakpoints.
28. `src/components/decks/builder-shell.tsx:70-121, 124-126` — Empty Builder Mark (desktop) container size — design: 100-110 × 110-120 → implementation renders desktop CardFan variant with containerW 120 × containerH 130 (exceeds upper bound).

## State reachability gaps

1. **Builder · complete (state 28) — spine progress bar** — `src/components/decks/builder-spine.tsx:184` hardcodes `background: "#E0913C"` (amber). The state's spec says `built >= 99 && all owned → Progress bar #6FA368`. The status pill on the deck-list card turns green correctly, but the spine progress bar on the builder page never switches. PARTIALLY REACHABLE.
2. **Create · pre-filled · legal strip (state 4)** — no explicit `legal: true` prop is threaded; the legal strip is unconditionally rendered whenever `<CreatePreFilled>` mounts. Reachable in practice because the page-level guard only mounts the component when `commanderLegal && isCommanderCandidate` are true, but the underlying data shape has no `legal: boolean` field and no failure fallback UI exists (crafted `?commander=` with an invalid card silently falls through to the picker). PARTIALLY REACHABLE.

## VERDICT

VERDICT: 28 visual gaps, 2 state gaps

---

## Fix round 1

Commit: `79c50d6` — `fix(decks): design-gate round 1 — 28 visual gaps (fill-color buckets, px splits, conditional rendering)`

- Gap 1 (`deck-card.tsx`) — replaced `FILL_COLOR[progressColor]` lookup with `progressFillColor(built)` bucket function (`≥99 → #6FA368 / ≥55 → #E0913C / else #C6533F`); removed `progressColor` field from `DeckListItem` type and `listDecksWithStats` in `read.ts`.
- Gap 2 (`create-pre-filled.tsx:67`) — changed unconditional `borderBottom` inline style to `border-b border-[#2A241D] md:border-b-0` Tailwind class.
- Gap 3 (`create-pre-filled.tsx:96`) — changed `m-0` to `m-0 md:m-[2px_0_4px]` on the page title h1.
- Gap 4 (`create-pre-filled.tsx:104-113`) — split single `<p className="font-mono">` with hidden spans into two separate `<p>` elements: mobile uses `font-mono` (hidden md:hidden), desktop uses `font-sans hidden md:block`.
- Gap 5 (`create-pre-filled.tsx:214`) — moved padding from inline style `"10px 13px"` to Tailwind `p-[10px_13px] md:p-[13px_16px]`.
- Gap 6 (`create-pre-filled.tsx:228`) — changed inline `fontSize: 12.5` to `className="text-[12.5px] md:text-[13.5px]"`.
- Gap 7 (`create-pre-filled.tsx:273`) — moved `marginBottom: 8` to `mb-[8px] md:mb-[9px]` Tailwind.
- Gap 8 (`create-pre-filled.tsx:293`) — moved `fontSize: 15` to `text-[15px] md:text-[16px]` Tailwind, removed inline fontSize.
- Gap 9 (`create-pre-filled.tsx:347-360`) — removed `hidden md:block`; changed to `text-[12.5px] md:text-[13px] leading-[1.55] md:leading-[1.6] md:border-t md:border-[#2A241D] md:pt-[16px]` (renders on mobile too, border-top desktop only).
- Gap 10 (`create-pre-filled.tsx:329`) — changed Link border from inline `"1px solid #2A241D"` to `border border-[#2A241D] md:border-[#3A3229]` Tailwind.
- Gap 11 (`create-picker.tsx:93`) — changed search input border to `border border-[#3A3229] md:border-[#C9A24B]` Tailwind.
- Gap 12 (`create-picker.tsx:97`) — moved padding from inline `"9px 12px"` to `p-[9px_12px] md:p-[12px_15px]` Tailwind.
- Gap 13 (`create-picker.tsx:98`) — moved gap from inline `8` to `gap-[8px] md:gap-[10px]` Tailwind.
- Gap 14 (`create-picker.tsx:103`) — changed search icon to `className="text-[14px] md:text-[16px] shrink-0"`.
- Gap 15 (`create-picker.tsx:156`) — moved padding from inline `"10px 12px"` to `p-[10px_12px] md:p-[12px_15px]` Tailwind.
- Gap 16 (`create-picker.tsx:177`) — changed name from inline `fontSize: 14` to `text-[14px] md:text-[16px]` Tailwind.
- Gap 17 (`create-picker.tsx:189`) — moved gap/marginTop/fontSize from inline to `gap-[5px] md:gap-[6px] mt-[4px] md:mt-[5px] text-[10px] md:text-[11px]` Tailwind.
- Gap 18 (`create-picker.tsx:196-197`) — changed pip chips from inline `width/height: 9` to `w-[9px] h-[9px] md:w-[11px] md:h-[11px]` Tailwind.
- Gap 19 (`create-picker.tsx:211-212`) — changed radio from inline `width/height: 20` to `w-[20px] h-[20px] md:w-[22px] md:h-[22px]` Tailwind.
- Gap 20 (`builder-spine.tsx:176`) — changed `height: 5` inline to `h-[5px] md:h-[6px]` Tailwind on the track.
- Gap 21 (`builder-spine.tsx:184`) — replaced hardcoded `background: "#E0913C"` with ternary `built >= 99 ? "#6FA368" : built >= 55 ? "#E0913C" : "#C6533F"`.
- Gap 22 (`builder-spine.tsx:230-244`) — changed SVG `width="14" height="14"` to `width="16" height="16"`.
- Gap 23 (`role-counter-cell.tsx:78`) — changed `style={{ marginTop: 0 }}` to `mt-0 md:mt-[6px]` Tailwind.
- Gap 24 (`degraded-banner.tsx:34-35`) — changed icon from inline `width/height: 22` to `w-[22px] h-[22px] md:w-[24px] md:h-[24px]` Tailwind.
- Gap 25 (`degraded-banner.tsx:39`) — changed `fontSize: 12` to `text-[12px] md:text-[13px]` Tailwind.
- Gap 26 (`export-dialog.tsx:208`) — changed unconditional `borderBottom: "1px solid #2A241D"` to `isMobile ? "1px solid #2A241D" : undefined` (uses isMobile prop branch).
- Gap 27 (`export-dialog.tsx:368-378`) — wrapped info callout in `{!isMobile && <div>...</div>}` to hide on mobile.
- Gap 28 (`builder-shell.tsx:124-126`) — wrapped `<CardFan variant="decks-desktop">` in a `104×112px` clipping div with `scale-[0.867] origin-top-left` on the CardFan to bring visual size within 100-110×110-120 design range without changing the shared variant.

**State gap 2 (legal strip prop):** ACCEPTED as-is per orchestrator adjudication — no changes made.

Test results: `npx tsc --noEmit` — clean. `npx eslint src` — clean. `npx vitest run` — 195 tests, 20 files, all passed. `npm run build` — compiled successfully, all 10 routes generated.
