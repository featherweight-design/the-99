# Gap report — Recommendations Part 1 (#131 · Role Coverage)

Verified against `docs/superpowers/design-tables/recommendations.md` sections 1–11 and
State Coverage rows 1–7 + A1. Part 2 (§12–28) out of scope.

Files read in full: `coverage-section.tsx`, `coverage-chip.tsx`, `role-chips.tsx`,
`card-detail-provider.tsx`, `coverage-action.ts`, `page.tsx`, `recommendations.ts`,
`score.ts`, `synergy-state.ts`, `globals.css`, plus the relevant regions of
`detail.tsx`, `ui/button.tsx`, `collection/card-modal.tsx`.

---

## PASS 1 — Visual properties

### §1 Role Coverage section header

| Row | Verdict |
|---|---|
| Title typography (Cinzel 600 / 20px / #EDE6D8) | ✅ MATCH — `coverage-section.tsx:275` `font-display font-[600]`, `fontSize: 20`, `color: "#EDE6D8"` |
| Sub-caption typography (mono 12px #8E8269, `margin-top: 2px`) | ❌ MISMATCH — `coverage-section.tsx:278` is `className="m-0 font-mono"` with `fontSize: 12, color: "#8E8269"`. Font/size/colour match; `margin-top: 2px` is explicitly zeroed by `m-0`. In practice the spacing is far larger — see the structural finding below. |
| Sub-caption copy (figures present) | ✅ MATCH — `coverage-section.tsx:240-242` selects `recommendationsCopy.coverage.subcaption` when `showFigures` |
| Sub-caption copy (no figures) | ✅ MATCH — `subcaptionNoFigures` on the other branch |
| Conditional rendering (states 5 and A1 both use `subcaptionNoFigures`) | ✅ MATCH — `showFigures = effectiveSynergyState === "ok"` (`:237`), so both `absent` and `degraded` fall to the no-figures string |
| Landmark `section[aria-labelledby=…]` | ❌ MISMATCH — no `<section>` and no `aria-labelledby` anywhere in `src/components/commanders/` except `commanders-view.tsx:111`. `CoverageSection` returns a bare fragment inside `CardDetailProvider` (`coverage-section.tsx:272-411`); the heading, sub-caption, note and panel list are siblings with no landmark. |
| REPLACES — hardcoded `'Your owned cards by role'` lifted into a copy module | ✅ MATCH — the literal is gone from `detail.tsx` (it was at `origin/main:detail.tsx:622` and `:917`); both call sites now render `CoverageSection` (`detail.tsx:532`, `:811`) |

**Structural finding (§1, both widths).** `CoverageSection` no longer wraps its output in a
container. On `origin/main` the coverage block was a single `<div>` child of the column. Today
`CardDetailProvider` renders `{children}` directly (`card-detail-provider.tsx:132-137`), so the
`<h2>`, the `<p>` sub-caption, the note, and the panel list become **four separate flex children**
of the surrounding stack — `detail.tsx:776` `flex flex-col gap-[32px]` on desktop and
`detail.tsx:493` `flex flex-col gap-[16px]` on mobile. The design draws the sub-caption 2px under
the title; the implementation puts 32px (desktop) / 16px (mobile) there, and the same gap between
the sub-caption and the panels in place of `mt-[16px]` (`coverage-section.tsx:383`). This is the
single largest visual deviation in Part 1.

### §2 Role panel (container)

| Row | Verdict |
|---|---|
| Background `#1A160F` | ✅ MATCH — `coverage-section.tsx:56` (desktop), `:146` (phone) |
| Border `1px solid #2A241D` | ✅ MATCH — `:57`, `:147` |
| Border radius `10px` | ✅ MATCH — `rounded-[10px]` at `:53`, `:144` |
| Padding desktop `15px 18px` | ✅ MATCH — `:57` |
| Padding mobile `13px 14px` | ✅ MATCH — `:148` |
| Header row desktop: `align-items:baseline; gap:12px; margin-bottom:10px` | ❌ MISMATCH — `coverage-section.tsx:61` is `flex items-center gap-[12px]` with `marginBottom: 10`. Design: `align-items: baseline` / implementation: `align-items: center`. |
| Header row mobile: stacks — name+count on line 1, gap clause on its own line, `margin-bottom:9px` | ❌ MISMATCH — `coverage-section.tsx:152-166` is a single-line flex row (`flex items-center gap-[10px]`) with the gap clause pushed right by `marginLeft: "auto"` (`:159`), i.e. the desktop layout at smaller type. No stacking, and `marginBottom: 10` not 9. |
| Role name 15px / 600 / #EDE6D8 (both widths) | ❌ MISMATCH (mobile only) — desktop `:62-63` `fontSize: 15` ✅; phone `:153-154` `fontSize: 14`. Design: 15px / implementation: 14px. |
| Owned count desktop mono 12px #6FA368 | ✅ MATCH — `:65-67` |
| Owned count mobile mono 11.5px #6FA368 | ✅ MATCH — `:156-158` |
| Gap clause position desktop `margin-left:auto` | ✅ MATCH — `:68` |
| Gap clause typography desktop mono 12px #8E8269 | ✅ MATCH — `:68` |
| Gap clause typography mobile mono 10.5px #8E8269 | ❌ MISMATCH — `:159` `fontSize: 11`. Design: 10.5px / implementation: 11px. |
| Gap clause copy — shipped strings untouched | ✅ MATCH — `:69-73` and `:160-164` reproduce `Well past the {n}-source baseline` / `At the {n}-source baseline` / `{n} short of baseline` verbatim (identical to `origin/main:detail.tsx:312-316`) |
| Empty-pool copy `No {role} cards in your pool`, mono 11px #6E6353 | ✅ MATCH — `:83-86`, `:174-177`; string byte-identical to `origin/main:detail.tsx:330` |
| Empty pool: no list, no disclosure | ✅ MATCH — the `cards.length === 0` branch returns the string alone |
| Chip container desktop: flex wrap of pills | ✅ MATCH — `:80` `flex flex-wrap gap-[7px]` (gap unspecified in the table) |
| Chip container mobile: `flex-direction: column` | ✅ MATCH — `:171` `flex flex-col gap-[8px]` |

### §3 Coverage chip — desktop

| Row | Verdict |
|---|---|
| Element `<button>` inside `ul > li` | ❌ MISMATCH — `CardDetailTrigger` renders a `<button>` (`card-detail-provider.tsx:65`) ✅, but the chips are mapped straight into a `<div>` (`coverage-section.tsx:78-91`). No `<ul>`, no `<li>`. |
| `display: inline-flex; align-items:center` | ✅ MATCH — `coverage-chip.tsx:54` `inline-flex items-center` |
| Gap `8px` | ✅ MATCH — `:55` `gap: 8` |
| Height `28px` | ✅ MATCH — `:54` `h-[28px]` |
| Border radius `999px` | ✅ MATCH — `rounded-full` |
| Background `#221D16` | ✅ MATCH — `bg-[#221D16]` |
| Border `1px solid #33402F` | ✅ MATCH — `border border-[#33402F]` |
| Padding with figure `0 4px 0 10px` | ✅ MATCH — `:55` |
| Padding no figure `0 10px` | ⚠️ PARTIAL / ❌ MISMATCH for state 4 — `:55` branches on `showFigures`, not on `hasFigure`. In state 5/A1 (`showFigures === false`) padding is `0 10px` ✅. But in **state 4** (`showFigures === true`, `inclusionPct === null`) the chip keeps `0 4px 0 10px` while rendering a bare em dash and no plate. §7 / State-Coverage row 4 both specify `0 10px` for that chip. |
| Name mono 11.5px #C6B79A | ✅ MATCH — `:63` `font-mono text-[11.5px] text-fg-body` (`--fg-body` = `#C6B79A`, `globals.css:25`) |
| Dot 6×6 radius 999px `#6FA368` | ✅ MATCH — `:58-61` `w-[6px] h-[6px] rounded-full bg-success`; `--success` = `#6FA368` (`globals.css:46`) |
| Figure plate background `--elevated` | ✅ MATCH — `:70` `bg-elevated` = `#2A241D` |
| Figure plate radius 999px / padding `3px 7px` | ✅ MATCH — `:70-71` |
| Figure plate type mono 10.5px `--fg` tabular-nums | ✅ MATCH — `:70-71` |
| Figure copy `{pct}%` | ✅ MATCH — `chipFigure` at `recommendations.ts:30` |
| Absent figure: `—` mono 10.5px `--fg-locked`, plate removed, `aria-hidden` | ✅ MATCH — `:75-83` (`text-fg-locked` = `#6A6152`, no `bg-elevated`, no padding, `aria-hidden`) |
| Hover: border → `--brass`; name → `--fg` | ✅ MATCH — `:54` `hover:border-brass`, `:63` `group-hover:text-fg`, `group` on the trigger |
| Focus: global `:focus-visible` 2px brass @ +2px | ✅ MATCH — `globals.css:158-162`; nothing bespoke on the chip |
| Active / pressed | *(unspecified)* — nothing added ✅ |
| Never disabled | ✅ MATCH — `card-detail-provider.tsx:64-76` never sets `disabled`; it uses `aria-busy` + `opacity: 0.55` |
| Transition: none | ✅ MATCH — no `transition-*` class on the chip |
| Transform: none | ✅ MATCH |
| Accessible name | ✅ MATCH — `coverage-chip.tsx:42-46` → `chipAria` / `chipAriaNoFigure` (`recommendations.ts:26-29`), exact strings |
| Tap target 28px pointer-only | ✅ MATCH (and named as open gap 2 in the handoff) |
| Ordering `inclusionPct` desc, absent last | ✅ MATCH — `score.ts:90-97` `byInclusionThenName`, applied at `:133` |
| Per-chip bar: none | ✅ MATCH |
| Per-chip add control: none | ✅ MATCH |

### §4 Coverage row — phone

| Row | Verdict |
|---|---|
| Element `<button>` inside `ul > li` | ❌ MISMATCH — same as §3: rows are mapped into a `<div>` (`coverage-section.tsx:169-181`), no `ul`/`li` |
| `flex; align-items:center` | ✅ MATCH — `coverage-chip.tsx:116` |
| Gap `9px` | ✅ MATCH — `:117` |
| Min-height `44px` | ✅ MATCH — `:117` |
| Background `#1E1A15` | ✅ MATCH — `bg-surface`, `--surface: #1E1A15` (`globals.css:10`) |
| Border `1px solid #2A241D` | ✅ MATCH — `border border-border`, `--border: #2A241D` |
| Border radius `8px` | ✅ MATCH — `rounded-[8px]` |
| Padding `0 12px` | ✅ MATCH — `:117` |
| Dot 7×7 radius 999px `#6FA368` | ✅ MATCH — `:120-123` |
| Name `flex:auto; min-width:0`, 13.5px #EDE6D8, nowrap/ellipsis | ⚠️ NEAR-MISS — `:125` is `flex-1 truncate text-[13.5px] text-fg text-left`. Size/colour/ellipsis ✅. Design says `flex: auto` (`1 1 auto`); `flex-1` is `1 1 0%`. §19 of the same table calls this distinction out explicitly for deck rows, so recording it. `min-width: 0` is not declared but `overflow: hidden` from `truncate` supplies the equivalent automatic-minimum-size behaviour. |
| Figure `flex:none`, mono 11.5px #EDE6D8, tabular, hard right | ✅ MATCH — `:129-136` |
| Absent figure `—` mono **11.5px** #6A6152 | ❌ MISMATCH — `:137-143` renders `font-mono text-[10.5px] text-fg-locked`. Design: 11.5px / implementation: 10.5px. (Colour ✅.) |
| Figure plate: none | ✅ MATCH |
| Tap target: whole 44px row | ✅ MATCH |
| Accessible name: same two strings as the chip | ✅ MATCH — `:104-108` |

### §5 Disclosure control

| Row | Verdict |
|---|---|
| Desktop shape: pill, `inline-flex` | ✅ MATCH — `coverage-chip.tsx:207` |
| Desktop gap `6px` | UNVERIFIABLE — the desktop button has a single `<span>` child (`:210`), so no gap is declared and none is observable. Not a defect I can assert either way. |
| Desktop height `28px` | ✅ MATCH — `:208` `height: 28` |
| Background transparent (both widths) | ✅ MATCH — no background declared on either button |
| Border `1px dashed #3A3229` | ✅ MATCH — `border border-dashed border-border-strong` (`:183`, `:207`); `--border-strong: #3A3229` |
| Desktop radius `999px` | ✅ MATCH — `rounded-full` `:207` |
| Phone radius `8px` | ✅ MATCH — `rounded-[8px]` `:183` |
| Phone min-height `44px` | ✅ MATCH — `:184` |
| Desktop padding `0 12px` | ❌ MISMATCH — `:208` `padding: "0 10px"`. Design: `0 12px` / implementation: `0 10px`. |
| Desktop typography mono 11px **#8E8269** | ❌ MISMATCH — `:210` `font-mono text-[11px]` with colour `expanded ? "text-fg-faint" : "text-brass"`. At rest the label is `--brass` `#C9A24B`; design specifies `--fg-faint` `#8E8269` at rest. (`text-fg-faint` is used for the *expanded* state, which the table does not colour.) |
| Phone typography mono 12px `--brass` | ✅ MATCH — `:186` |
| Resting copy desktop `+{n} more` | ✅ MATCH — `moreChips` `:213`; `total` is `cards.length - cap` (`coverage-section.tsx:102`), so 34 ramp → `+22 more` as drawn |
| Resting copy phone `Show all {n}` | ✅ MATCH — `showAll` `:189`; `total` is `cards.length` (`coverage-section.tsx:190`), so 34 → `Show all 34` as drawn |
| Expanded copy `Show fewer` (both) | ✅ MATCH — `:180`, `:188`, `:204`, `:212` |
| Long-role variant (state 6) desktop: solid `#2A241D` bg + `1px solid #3A3229` + brass label | ❌ MISMATCH — there is no state-6 variant. `coverage-chip.tsx:196-215` renders one treatment: transparent + dashed border. The brass label happens to match, but the solid fill and the solid (non-dashed) border are absent. *(Note: §5's typography row and its long-role row disagree with each other on the resting label colour; the implementation satisfies neither combination cleanly.)* |
| Long-role variant phone: dashed 44px row, `Show all 34` | ✅ MATCH |
| Beyond-cap copy `+{n} more not shown`, inert, no hit box | ✅ MATCH — `coverage-section.tsx:93-97` (desktop) and `:183-187` (phone) render `beyondCap` in a `<span>`, not a control |
| ARIA `aria-expanded`, `aria-controls` | ✅ MATCH — `coverage-chip.tsx:176-177`, `:200-201`; `aria-controls` targets the list `id` set at `coverage-section.tsx:79` / `:170` |
| Accessible name `Show all {n} {role} cards` | ❌ MISMATCH (desktop only) — phone uses `showAllAria(n, role)` (`:181`) ✅. Desktop's `aria-label` is `moreChips(n)` = `+22 more` (`coverage-chip.tsx:205`); the `role` prop is passed in (`coverage-section.tsx:103`) but never used on that branch. Design: `Show all {n} {role} cards` for both widths. |
| Focus behaviour on expand: no focus stealing | ✅ MATCH — `onToggle` only mutates `expandedRoles` (`coverage-section.tsx:247-257`); nothing calls `.focus()` |
| Collapse: scroll position discarded | ✅ MATCH — the `maxHeight/overflowY` style is applied only while `expanded` (`:81`, `:172`), so the scroller is torn down on collapse |

### §6 Render caps and the expanded container

| Row | Verdict |
|---|---|
| Resting render 12 chips + 1 disclosure (desktop) | ✅ MATCH — `COVERAGE_CAP.desktop = 12` (`coverage-chip.tsx:24`), `cards.slice(0, cap)` (`coverage-section.tsx:45`) |
| Resting render 6 rows (phone) | ✅ MATCH — `COVERAGE_CAP.phone = 6`, `:136` |
| Expanded render up to 40 | ✅ MATCH — `COVERAGE_EXPANDED_CAP = 40` (`coverage-chip.tsx:25`), used at `coverage-section.tsx:45` and `:136` |
| Expanded container `max-height:320px; overflow-y:auto` | ✅ MATCH — `:81` and `:172` `{ maxHeight: 320, overflowY: "auto" }` (the spec value, not the drawn `overflow:hidden`) |
| Beyond 40: `+N more` as inert count | ✅ MATCH — `:47-49` / `:138-140` compute `beyondExpanded`; rendered as a span only while `expanded` |
| Virtualisation: none | ✅ MATCH — plain map |
| Cap source: media query, not a measured width | ⚠️ MATCH IN KIND, WRONG BREAKPOINT — the cap follows the `width` prop, which is decided by which of the two `CoverageSection` instances CSS reveals. But `detail.tsx` splits on **`sm:`** (`:640` `sm:hidden`, `:669` `hidden sm:grid`), and `globals.css` declares no `--breakpoint-sm` override, so the split is at Tailwind's default **640px**, not the table's stated 768px `md:` boundary. Between 640 and 768px the desktop chip layout and the 12-chip cap render on a phone-width viewport. This is inherited from `detail.tsx`'s shipped column layout, not introduced by `CoverageSection`. |
| Edge counts 0 / 1–6 / 7–12 / 13–40 / 41+ | ✅ MATCH — `hiddenCount = cards.length - cap` (`:46`, `:137`); disclosure renders only when `> 0`, so 1–12 desktop and 1–6 phone show all with no disclosure, 13+/7+ cap and disclose, and 41+ expands to 40 plus the inert count |

### §7 Absent-figure legend (state 4)

| Row | Verdict |
|---|---|
| Typography mono 10px #6A6152, `margin-top: 10px` | ❌ MISMATCH — **not implemented.** `coverage.chipNoFigureLegend` exists at `recommendations.ts:33` but has no consumer anywhere in `src/` (grep for `chipNoFigureLegend` returns only the copy module). |
| Copy `— = no EDHREC figure for this card` / phone `— = no EDHREC figure` | ❌ MISMATCH — the desktop string exists unused; the **phone variant string does not exist in the copy module at all** (`recommendations.ts:15-56` has one legend key). |
| Conditional rendering — only where neighbouring chips carry figures, never in state 5 or A1 | ❌ MISMATCH — no such branch exists |

### §8 Panel-level EDHREC note — absent (state 5)

Implementation: `coverage-section.tsx:283-307`.

| Row | Verdict |
|---|---|
| Background `#211C15` | ✅ MATCH — `:289` |
| Border `1px solid #3A3229` | ✅ MATCH — `:290` |
| Left rule `2px solid --fg-faint` | ❌ MISMATCH — `:291` `borderLeft: "3px solid var(--fg-faint)"`. Colour ✅, width design 2px / implementation 3px. The 2px-vs-3px delta is one of the four signals the handoff names for absent-vs-degraded (§28 "shape rule"), and the implementation draws both at 3px. |
| Border radius `8px` | ✅ MATCH — `rounded-[8px]` `:287` |
| Padding `9px 13px` desktop / `9px 12px` mobile | ❌ MISMATCH — `:292` `padding: "10px 13px"` for both widths |
| Margin: desktop `margin-top: 14px`, mobile `margin-bottom: 14px` | ❌ MISMATCH — `:287` `mt-[12px]` for both widths; no mobile `margin-bottom` |
| Max width `640px` (desktop) | ❌ MISMATCH — no `maxWidth` on the note (`:287-293`) |
| Icon `⚠` #8E8269 13px / 12px | ❌ MISMATCH — no icon rendered. `:287` declares `flex items-start gap-[10px]` but the flex container holds a single `<div>` (`:295`); the icon slot the gap was reserved for is empty. |
| Body typography 12.5px #A89B84, bold lead #C6B79A | ✅ MATCH desktop — `:296-299` (`strong` 13px/600 `#C6B79A`, body 12.5px `#A89B84`) |
| Body typography mobile 12px | ❌ MISMATCH — `:299` is `fontSize: 12.5` unconditionally; only the *string* branches on width (`:301-303`), not the size |
| Heading copy `absentHeading` | ✅ MATCH — `:297` |
| Body copy `absentBody` / `absentBodyMobile` | ✅ MATCH — `:301-303`, branching on `isDesktop` |
| Retry control: none | ✅ MATCH — the `absent` branch renders no button |
| Chip treatment below: figure slot removed entirely, padding back to `0 10px` | ✅ MATCH — `showFigures === false` ⇒ `coverage-chip.tsx:55` padding `0 10px` and `:83` renders `null` (no plate, no dash) |
| Count: one note per section | ✅ MATCH — rendered once above the four panels |

### §9 Panel-level EDHREC note — degraded (addendum A1)

Implementation: `coverage-section.tsx:309-380`.

| Row | Verdict |
|---|---|
| Background `#181410` | ❌ MISMATCH — `:315` `background: "#211C15"` (the *absent* note's background) |
| Border `1px solid #2A241D` | ❌ MISMATCH — `:316` `border: "1px solid #3A3229"` (again the absent note's border) |
| Left rule `3px solid --warning` | ✅ MATCH — `:317` `borderLeft: "3px solid var(--warning)"`; `--warning: #E0913C` (`globals.css:47`) |
| Border radius `9px` desktop / `8px` mobile | ❌ MISMATCH — `rounded-[8px]` at `:313` for both widths |
| Padding `11px 15px` desktop / `10px 12px` mobile | ❌ MISMATCH — `:318` `padding: "10px 13px"` for both widths |
| Margin-top `14px` desktop | ❌ MISMATCH — `:313` `mt-[12px]` |
| Max width `700px` desktop | ❌ MISMATCH — no `maxWidth` declared |
| Heading copy `degradedHeading` | ✅ MATCH — `:326`, `:354` |
| Body copy `degradedBody` | ✅ MATCH — `:330`, `:358` |
| Retry placement desktop: inline, right of the sentence, `flex:none` | ✅ MATCH — `:323` `flex items-center gap-[12px]`, body `flex: 1` (`:324`), button `shrink-0` (`:339`) |
| Retry placement phone: own 44px line, `min-height:44px; margin-top:2px; padding-left:20px` | ⚠️ PARTIAL — `:367-373` gives a full-width `flex` line with `minHeight: 44` ✅, but centres it (`justify-center`) and declares neither `margin-top: 2px` nor `padding-left: 20px`. Design: left-indented 20px / implementation: centred, no indent. |
| Retry typography desktop 12.5px / 600, `--brass`, `border-bottom: 1px solid #6E5B33` | ❌ MISMATCH — `:339-344`: `font-mono text-brass`, `fontSize: 12`, no `fontWeight`, no `borderBottom` (`border-0` is set explicitly). Design: sans-body 12.5px/600 with a brass-shadow underline / implementation: mono 12px/400, no underline. |
| Retry typography phone 13px / 600 + same underline | ❌ MISMATCH — `:367-373` `font-mono`, `fontSize: 12`, no weight, no underline |
| Retry copy `Try again` | ✅ MATCH — `degradedRetry`, `:346`, `:375` |
| Retry accessible name `Try loading EDHREC figures again` | ✅ MATCH — `degradedRetryAria`, `:338`, `:366` |
| Retry count: one for the whole section | ✅ MATCH — one button per rendered width; `retryCoverageFigures` returns one payload for all four panels (`coverage-action.ts:11-33`) |
| Retry in-flight: `opacity: 0.55`, `aria-busy`, label unchanged | ✅ MATCH — `:336-337`/`:343` and `:364-365`/`:371`; the label text is a constant |
| Retry second failure: no escalating copy | ✅ MATCH — `handleRetry` (`:259-268`) leaves the note untouched on `null` |
| Chip treatment below: figure slot removed (not dashed), padding `0 10px`, chips stay live | ✅ MATCH — same `showFigures === false` path as §8; `CardDetailTrigger` is never disabled |
| Phone: six rows and **no disclosure** | ❌ MISMATCH — `RolePanelPhone` renders the disclosure purely on `hiddenCount > 0` (`coverage-section.tsx:188`); `showFigures` / `synergyState` never gate it. Flagging with a caveat: this row may be describing the drawn frame rather than a rule, since a degraded panel still has more than six cards worth showing. |
| Ordering fallback: pool order | ✅ MATCH — `score.ts:132-134` sorts only when `inclusionByName` is non-null, which is exactly the non-degraded case |

### §10 Card detail modal opened from a chip (state 7)

The table's own framing is "shipped … nothing overridden", and the implementation does not override
anything: `CoverageSection` mounts `CardDetailProvider` (`coverage-section.tsx:273`) and each chip
is a `CardDetailTrigger`. Recording where the drawn frame and the shipped modal disagree.

| Row | Verdict |
|---|---|
| Siblings = the role's ordered oracle ids | ✅ MATCH — `coverage-section.tsx:44` / `:135` build `siblings` from the **full** `cards` array, not the visible slice, and pass it to every chip (`:90`, `:181`); `card-detail-provider.tsx:128-129` pages across it |
| Focus trap, Escape, focus returned to the originating chip | ✅ MATCH — shipped `CardModal`, unmodified |
| **Add control: none on this route** | ✅ MATCH — no add affordance in `card-modal.tsx` |
| Effect on `auto`: none | ✅ MATCH — the modal performs a read only (`getCardDetail`) |
| Prev/Next `‹ Prev` / `Next ›` | ✅ MATCH — `card-modal.tsx:505`, `:518` |
| `Owned` meta row | ✅ MATCH in substance — `card-modal.tsx:483` `MetaField label="You own" value={\`×${card.quantity} …\`}`; the drawn label is `Owned` → `1 copy · MM3` and the shipped one is `You own` → `×1 copy`. Copy delta only. |
| `Role` meta row | ❌ MISMATCH — no `Role` field in `card-modal.tsx` (grep for `Role` returns only unrelated matches). The chip does not pass its role to the provider, so the modal has no way to render it. |
| EDHREC bar track + fill, figure, delta line | ❌ MISMATCH — no EDHREC bar, figure or delta anywhere in `card-modal.tsx` |
| Dialog width `620px`, radius `14px`, backdrop `rgba(10,7,4,0.82)`, body grid `200px 1fr` | ❌ MISMATCH vs. the drawn frame — `card-modal.tsx:299` is `md:h-[620px] md:w-[820px] md:rounded-2xl` with a `320px` art column (per its own file header). **Design-side conflict, not an implementation defect:** §10 simultaneously says the modal is shipped and untouched, and draws a different modal. Raising for Design rather than fixing. |

### §11 "Build this deck" — the promise

| Row | Verdict |
|---|---|
| Mobile sticky bar `border-top: 1px solid #3A3229; background:#1A160F; padding: 12px 16px 24px; gap: 12px` | ✅ MATCH — `detail.tsx:640-645` |
| Label line `READY TO BUILD`, mono 10px #8E8269 | ✅ MATCH — `detail.tsx:648-653`, `recommendationsCopy.build.stickyLabel` |
| Mobile promise line `We’ll fill {n} of the 99`, 12px #C6B79A | ✅ MATCH on treatment — `detail.tsx:654-656` |
| Desktop promise line `build.seedNote` | ✅ MATCH on treatment — `detail.tsx:771` |
| Mobile button `background:#C9A24B; color:#14110E; 14px/600; radius 8px; padding 12px 20px; nowrap` | ✅ MATCH — `PrimaryButton` supplies `bg-[color:var(--brass)] text-[color:var(--bg)]` + `font-semibold rounded-lg` (`ui/button.tsx:21-30`); the call site adds `text-[14px] p-[12px_20px] whitespace-nowrap` (`detail.tsx:661`). `--brass` `#C9A24B`, `--bg` `#14110E`, `rounded-lg` = 8px. |
| REPLACES — desktop seed note replaces `'Your owned pool will seed the deck builder'` | ✅ MATCH — the literal is gone; it was at `origin/main:detail.tsx:866` |
| REPLACES — sticky sub-line replaces `'{n} cards in your pool'` | ✅ MATCH — was `origin/main:detail.tsx:750` |
| Drawn value of `{n}` = `68` | ❌ MISMATCH (data, not drawing) — both call sites pass the **string literal** `"68"`: `detail.tsx:655` `stickyPromise("68")` and `detail.tsx:771` `seedNote("68")`. The copy module parameterises `{n}` (`recommendations.ts:63`, `:66-67`) precisely so the real fill size can be substituted; the page hardcodes the mock figure, so every commander promises 68 regardless of pool. |

---

## PASS 2 — State reachability

**State 1 — role at/above baseline.** ✅ REACHABLE.
`RoleCard` carries `oracleId`, `name`, `inclusionPct` (`score.ts:16`) and `CommanderScore` carries
`roleCards` / `roleCounts` (`score.ts:28`, `:30`). `scoreCommander` populates them from the pool
(`score.ts:119-128`) with real EDHREC figures — `inclusionByName` is threaded from the fetch
(`recommend.ts:182`, `:216`) and parsed at `edhrec/parse.ts:79-98`; nothing is stubbed null.
`page.tsx:42` calls `scoreOneCommander` and passes the whole commander to `CommanderDetail`, which
forwards `roleCards`/`roleCounts` to both `CoverageSection` instances (`detail.tsx:536-537`,
`:815-816`). The at/above-baseline clause branches at `coverage-section.tsx:69-73`.
*(Handoff blocker §0 declared per-card inclusion unavailable; it has since landed — `inclusionByName`
is populated and consumed. The blocker is stale, not open.)*

**State 2 — role below baseline.** ✅ REACHABLE. Same data; the `count < target` clause is the
final ternary arm at `coverage-section.tsx:73` / `:164`. The *phone header stacking* the state
describes is not implemented (§2 above), but the state itself renders.

**State 3 — empty pool.** ✅ REACHABLE. `cards.length === 0` branch at `coverage-section.tsx:83-86`
(desktop) and `:174-177` (phone); no list and no disclosure are rendered in that branch.

**State 4 — a chip whose figure is absent.** ⚠️ PARTIALLY REACHABLE — *the legend is missing and
the chip padding does not switch.* `inclusionPct` is nullable (`score.ts:16`) and null survives the
pipeline (`inclusionOf` returns null on a miss, `score.ts:111-117`). `coverage-chip.tsx:39` splits
`hasFigure` from `showFigures`, so the em-dash branch at `:75-83` is reachable and absent chips sort
last (`score.ts:90-97`). Missing: (a) the `— = no EDHREC figure for this card` legend has no render
site and no phone variant string (§7); (b) the chip keeps `0 4px 0 10px` instead of `0 10px`
(`coverage-chip.tsx:55` branches on the wrong flag).

**State 5 — EDHREC absent for the commander.** ✅ REACHABLE.
`SynergyState` distinguishes `absent` from `degraded` (`synergy-state.ts:9-18`, keyed on
`r.unreachable`). `recommend.ts:219` assigns it; `detail.tsx:538` / `:817` pass it; the branch is
`coverage-section.tsx:283`. `showFigures` goes false, so the sub-caption reverts and every figure
slot is removed. Props into the panels are correct (`showFigures={showFigures}`, `:391`, `:403`).
Container geometry deviates (§8) but the state renders.

**State 6 — long role.** ✅ REACHABLE. `expandedRoles` is per-role state
(`coverage-section.tsx:229`, `:247-257`); caps and the 320px scroller are wired
(`:45-49`, `:81`, `:136-140`, `:172`). Disclosure props (`width`, `total`, `role`, `expanded`,
`controls`, `onToggle`) are all supplied (`:100-107`, `:189-196`). The desktop *solid* long-role
treatment is not a separate branch (§5) and `role` is passed but unused on the desktop aria-label.

**State 7 — modal opened from a chip.** ⚠️ PARTIALLY REACHABLE — *the payload the state names is
incomplete.* `CardDetailProvider` now mounts on `/commanders/[slug]` (`coverage-section.tsx:273`),
resolving handoff item 5. Siblings are the full role-ordered list. But the state requires "EDHREC
bar + figure" and an `Owned`/**`Role`** row: the trigger passes only `oracleId`, `name`, `siblings`
(`coverage-chip.tsx:49-53`), and `card-modal.tsx` renders neither a role field nor any EDHREC
figure. The role a card was opened from is not carried into the modal at all.
*Secondary:* both `CoverageSection` instances are in the DOM simultaneously (`detail.tsx:532`,
`:811`), so two `CardDetailProvider`s and two live regions mount per page; CSS hides one branch but
the second provider's `aria-live` node is not hidden from assistive tech.

**State A1 — degraded EDHREC.** ✅ REACHABLE. `degraded` is produced by
`synergyStateFrom` when `r.unreachable` (`synergy-state.ts:17`), branch at
`coverage-section.tsx:309`. The retry is a real server action (`coverage-action.ts:11-33`) injected
as a prop (`detail.tsx:539`, `:818`) and correctly refuses to flip the section to `ok` on an
`absent` re-resolve (`coverage-action.ts:30`). In-flight treatment and pool-order fallback are
both correct. Deviations are geometric/typographic (§9) plus the disclosure-suppression question.

---

## Already named as a design-side open call

- Desktop chip tap target (28px, pointer-first) — handoff open call 8; not an implementation defect.
- §10's modal geometry (620px / radius 14px / `200px 1fr`) contradicts the same section's
  "shipped … nothing overridden" ruling. Design conflict, raise rather than patch.
- §5's resting label colour: the typography row says `--fg-faint`, the long-role row says
  `--brass`. Needs a Design ruling before the implementation can satisfy both.
- Handoff blocker §0 (per-card EDHREC inclusion unavailable) is **stale** — `inclusionByName` now
  ships end to end.

---

## Adjudication

Each finding above is either fixed on this branch or parked with a reason. Nothing is
left undecided.

### Fixed

- **Gap 21 — the commander page's "68 cards" promise was a magic literal.** The reviewer
  framed this as a fabricated figure. It is not: 68 is the fill's exact ceiling — the four
  role targets (10 ramp + 10 draw + 8 removal + 3 wipes) plus the 37-card land target — and
  `planFill` stops at each target without exceeding it. The literal was the defect, not the
  number. `FILL_BASELINE_TOTAL` now derives it in `src/lib/decks/fill.ts`, so a target that
  moves moves the promise with it.

- **The Role Coverage disclosure announced a different number per width.** Not in the
  original gap list; found while fixing it. `coverage-section.tsx` passed the *overflow*
  count to the desktop disclosure and the *whole* count to the phone one, while both widths
  share `showAllAria`. A 20-card ramp role therefore announced "Show all 8 ramp cards" on
  desktop and "Show all 20 ramp cards" on phone. `total` now means the role's whole count at
  both widths; the desktop chip derives its visible `+N more` label as
  `total - COVERAGE_CAP.desktop`.

### Not gaps

- **Gap 10 — the resting disclosure label's colour.** The design row asks for `#8E8269`;
  `--fg-faint` is literally `#8E8269`, so `text-fg-faint` already satisfied it.

- **State 7, secondary — "two `aria-live` nodes mount per page".** Both `CoverageSection`
  instances are indeed in the DOM, but each sits inside a container the other width sets
  `display: none` on (`detail.tsx:494` `sm:hidden`, `:670` `hidden sm:grid`). `display: none`
  removes a subtree from the accessibility tree, so only the active width's live region is
  ever exposed. The `sr-only` class on the region itself is a clip, not a hide — that is what
  the finding reacted to — but its hidden ancestor settles it.

### Parked, with reasons

- **Gap 20 / State 7, primary — the modal carries no `Role` row and no EDHREC bar.**
  Satisfying this means threading a role name and an inclusion figure through
  `CardDetailProvider` into `CardModal`, which the collection browser also renders. The
  handoff's §10 already contradicts itself here: it specifies new modal geometry and these
  two new rows while the same section rules that the modal "ships as-is, nothing overridden".
  This report's own open-call list names that contradiction. Changing a modal shared with a
  shipped surface on the strength of a self-contradicting section is the wrong trade; it
  needs a Design ruling first.
  **Cost if wrong:** a card opened from a coverage chip does not say which role it was opened
  from. The chip's accessible name already carries the figure, so the figure is not lost —
  only its placement inside the modal.

- **Gap 22 — `detail.tsx` splits on `sm:` (640px) where the deck builder uses `md:` (768px).**
  This is a route-level convention, not a file-level slip: every component under
  `src/components/commanders/` uses `sm:`, and every one under `src/components/decks/` uses
  `md:`. Each route is internally consistent, and no surface renders both. Moving `detail.tsx`
  alone would break the convention *within* `commanders/`, which is worse than the
  cross-route difference it would fix.
  **Cost if wrong:** between 640px and 768px the commander page shows its desktop layout while
  the deck builder shows its phone one. Nothing overlaps, because they are different routes.
  A deliberate app-wide breakpoint unification is its own change.

- **Gap 12 and Gap 18 — geometry on constructs shipped by #158, #184 and #246.** Same standard
  applied throughout this gate: a table row is not worth regressing a design that already
  shipped and passed its own review. Recorded in the branch ledger with the other parked
  rulings.
