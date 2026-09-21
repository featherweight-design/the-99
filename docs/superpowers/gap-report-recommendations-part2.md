# Gap report — Recommendations Part 2 (#130 · the filled deck)

Agent 2 of the design-review pass. Source of truth:
`docs/superpowers/design-tables/recommendations.md`, sections **12–28** and the
deck-builder rows of **State Coverage** (8–15, A2, A3, A4). Part 1 (sections
1–11, states 1–7, A1) is out of scope and was not checked.

Verified against the working tree at commit `5989836` (`feat/build-this-deck`).
`pnpm typecheck` is clean. Note: the tree was mid-rebase for part of this pass;
every file cited below was re-read after the tree settled, and every line number
was confirmed against the current content.

---

# PASS 1 — Visual properties

## 12. Deck header

The handoff draws a purpose-built deck header. The implementation ships
`BuilderSpine` (`src/components/decks/builder-spine.tsx`), a pre-existing
construct from the add-panel pass with a different composition: deck **name**
(not commander name) as the display heading, a `built / 99` figure, a progress
bar, and a desktop-only `N owned · N to buy` caption. Rows below are checked
against the spine where an equivalent exists.

| Row | Verdict |
|---|---|
| Padding `16px 30px` / `12px 14px` | ❌ MISMATCH — design: `16px 30px` desktop, `12px 14px` phone / implementation: `px-[16px] pt-[40px] pb-[12px] md:px-[30px] md:py-[20px]` (`builder-spine.tsx:240`) |
| Border-bottom `1px solid #2A241D` | ✅ MATCH (`builder-spine.tsx:241`) |
| Background phone `#14110E` | UNVERIFIABLE — the spine sets no background; it inherits `#100D0A` from the shell (`builder-shell.tsx:436`). The drawn `#14110E` may be the canvas frame rather than a property. |
| Commander name Cinzel 700 22px/17px `#EDE6D8` | ❌ MISMATCH — design: commander name / implementation: the **deck name** in `font-display font-bold text-[16px] md:text-[21px]` (`builder-spine.tsx:316`); the commander name appears in the mono meta caption at 10/11px `#8E8269` (`:325-328`) |
| Sub-line typography mono 11.5/10.5px `#8E8269` | ❌ MISMATCH — implementation splits it: mono 14/20px figure + `/ 99` (`:350-363`) and a desktop-only mono **10px** `#8E8269` owned/to-buy caption (`:388`) |
| Sub-line copy `68 of 99 · 61 owned · 7 to buy` | ❌ MISMATCH — implementation renders `68` `/ 99` on one line and `61 owned · 7 to buy` on another, desktop only (`:391`); phone shows no owned/to-buy split at all |
| Sub-line copy state 13 / state 9 | ❌ MISMATCH — same construct as above |
| Sub-line copy state 14 `Filling {n} of 99…` | ❌ NOT IMPLEMENTED — `recommendationsCopy.fill.filling` has no consumer anywhere in `src/` |
| Status pill — filled (`Building`) | ❌ MISMATCH — design: a `Building` pill, mono 11px `#C9A24B`, `1px solid #6E5B33`, radius 999, padding `4px 11px` / implementation: **no status pill is rendered on `/decks/[id]`**. `statusPill()` is imported at `builder-shell.tsx:9` and called at `:113`, but its result is used only by `shouldCelebrate` and the soft-claim gate (`:119`, `:172`). The pill renders only on the deck **list** card (`deck-card.tsx:113`). |
| Status pill — in-flight (dashed `Draft`) | ❌ NOT IMPLEMENTED — same reason |
| Pill ownership (no copy key; thresholds win) | ✅ MATCH — `recommendations.ts` declares no pill key (`:163-179`); `status.ts` owns the ladder |

## 13. Recommended-mix strip — caption row

| Row | Verdict |
|---|---|
| Strip padding desktop `14px 30px` | ✅ MATCH — `md:px-[30px] md:py-[14px]` (`role-counter-strip.tsx:56`) |
| Strip padding phone `10px 14px` | ❌ MISMATCH — design: `10px 14px` / implementation: `px-[16px] py-[10px]` (`role-counter-strip.tsx:56`) — 16px horizontal, not 14px |
| Border-bottom `1px solid #2A241D` | ✅ MATCH (`:57`) |
| Caption layout phone flex / space-between / `mb 8px` | ✅ MATCH — `flex items-baseline justify-between … mb-[8px]` (`:66`) |
| Caption copy desktop mono 11px, ls `.12em`, uppercase, `#C6B79A` | ✅ MATCH (`:71`) |
| Caption copy phone mono 9px, ls `.1em`, `#8E8269` | ✅ MATCH (`:71`) |
| Gloss desktop `EDHREC averages · a guide, not a gate` mono 10.5px `#8E8269` | ✅ MATCH — `mixSourceLine()` (`mix.ts`, rendered `:85-90`). Since #788 the gloss is derived per deck: `EDHREC averages · a guide, not a gate` only where the commander's targets are measured, and `A common starting point` otherwise |
| Gloss phone `a guide, not a gate` mono 9px `#6E6353` | ✅ MATCH (`:77-82`) |
| Cell gap desktop 8px / phone 4px | ✅ MATCH — `gap-[4px] md:gap-[8px]` (`:94`) |
| Strip decision "untouched" | ✅ MATCH — no layout change was made by this pass; the `StripRationale` disclosure and worked-example callout (`:115-151`) predate it (#184) |
| Copy-module rule | ❌ MISMATCH — `"Recommended mix"` (`:73`), `"a guide, not a gate"` (`:81`) and `aria-label="Recommended mix"` (`:58`) are hardcoded literals, not copy-module keys. (`mixSourceLine()` is explicitly exempted by `recommendations.ts:11`.) |

## 14. Role counter cell — met (state 8)

All rows verified in `src/components/decks/role-counter-cell.tsx`.

| Row | Verdict |
|---|---|
| Flex `flex: 1` | ✅ MATCH (`:68`) |
| Min-height 72/62px | ✅ MATCH — `min-h-[62px] md:min-h-[72px]` (`:68`) |
| Background `#181410` | ✅ MATCH — `bg-surface-sunken` = `#181410` (`globals.css:13`) |
| Border `1px solid #2A241D` | ✅ MATCH — `border-border` (`:66`, `:70`) |
| Border radius 9/7px | ✅ MATCH — `rounded-[7px] md:rounded-[9px]` (`:68`) |
| Padding `11px 14px` / `7px 2px 6px` | ✅ MATCH (`:69`) |
| Text align left / center | ✅ MATCH — `text-center md:text-left` (`:69`) |
| Label mono 10px ls `.1em` uppercase `#8E8269` | ✅ MATCH (`:82-85`) |
| Label phone mono 8.5px `#8E8269` | ✅ MATCH (`:83-84`) |
| Numerator mono 600 16px `#6FA368` mt 3px | ✅ MATCH — `roleCellState` returns `var(--success)` at `have >= target` (`mix.ts:103`) |
| Numerator phone 13px mt 2px | ✅ MATCH (`:96`) |
| Denominator `/ {n}` mono 400 11px `#8E8269`, phone hidden | ✅ MATCH (`:100-103`) |
| Track h5 radius999 `#2A241D` mt8 overflow hidden | ✅ MATCH — `bg-elevated` = `#2A241D` (`globals.css:15`), `:118` |
| Fill met 100% `#6FA368` | ✅ MATCH (`:120-123`) |
| Footer row flex space-between mt 6px | ✅ MATCH (`:129`) |
| `rec {n}` desktop mono 9px `#8E8269` | ✅ MATCH (`:130`) |
| `rec {n}` phone mono 8px `#6A6152` mt 4px | ⚠️ PARTIAL — size and colour match (`text-[8px] text-fg-locked`, `:130`); the design's phone `margin-top:4px` is absent (the `rec` span carries no margin; the 3px sits on the caption below it, `:145`) |
| Caption met `—` mono 10px `#4A4033` | ✅ MATCH — `md:text-border-dashed` = `#4A4033` (`globals.css:21`), `:145` |
| Caption met phone `—` mono 9px `#3A3229` mt 3px | ✅ MATCH — `text-border-strong` = `#3A3229`, `mt-[3px]` (`:145`) |
| Drawn cells (Ramp 10 · Draw 10 · Removal 8 · Wipes 3 · Land ~37) | ✅ MATCH — the baseline cells of `recommendedMix()` (`mix.ts`), order `ramp, draw, removal, wipes, land` (`role-counter-strip.tsx:39`). A commander with measured targets draws its own figures in the same five cells |

## 15. Role counter cell — short (state 13 / A4)

| Row | Verdict |
|---|---|
| Border desktop `1px solid #2A241D` (**unchanged**) | ❌ MISMATCH — design: the `--border-strong` hairline is "the one addendum-only, **phone-only** addition"; desktop keeps `--border` / implementation: `const borderClass = !met && justFilled ? "border-border-strong" : "border-border"` (`role-counter-cell.tsx:66`) is applied to `shell` (`:70`) with **no `md:` branch**, so desktop takes the stronger border too |
| Border phone `1px solid #3A3229` | ✅ MATCH (`:66`) |
| Numerator colour `#C9A24B` | ✅ MATCH — `roleCellState` short branch returns `var(--brass)` (`mix.ts:107`) |
| Denominator phone absent | ✅ MATCH — `hidden md:inline` (`:100`) |
| Track `h5 #2A241D`, phone absent | ✅ MATCH (`:118`, `hidden md:block`) |
| Fill `width 67%; background #A9863E` | ✅ MATCH — `pct = round(2/3*100) = 67`, `barColor = var(--brass-mid)` = `#A9863E` (`mix.ts:101,107`; `globals.css:37`) |
| Caption **copy** `see shelf` | ❌ MISMATCH — design: `see shelf` / implementation: `addPanelCopy.strip.cellLink` = `"consider →"` (`decks-builder.ts:79`, rendered `role-counter-cell.tsx:135`). `recommendationsCopy` declares no `see shelf` key at all. This is plausibly a deliberate carry-over of #184's shipped string; flagging as a copy delta, not asserting which is right. |
| Caption typography mono 10px/9px `#C9A24B` | ✅ MATCH — `text-[9px] md:text-[10px] text-brass` (`:134`) |
| Caption is a live control | ⚠️ PARTIAL — the whole cell is the `<button>` (`:167-174`), which satisfies "a live control"; but the caption is present **only** when `rolesWithShelves` contains the role (`role-counter-strip.tsx:103-109`). A short role Consider built no shelf for renders the inert dash instead. Documented as deliberate at `:138-142`. |
| Tap target — the 62px cell clears 44px | ✅ MATCH (`:68`) |
| Signals carrying "short" | ⚠️ PARTIAL — figure colour ✅, arithmetic ✅, caption-as-control ✅, bar ✅, phone hairline ✅ — but the hairline is not phone-scoped (see the border row) |

## 16. Role counter cell — in-flight (state 14 / A3)

Confirmed deliberate: the `have === null` treatment is built ahead of any caller
and the reason is documented on the prop (`role-counter-cell.tsx:16-24`). No
caller passes `null` (`role-counter-strip.tsx:100` passes `counts[role]`, always
a number). **Not reported as a defect.** The property rows still checked:

| Row | Verdict |
|---|---|
| Label `#6A6152` | ✅ MATCH — `inFlight ? "text-fg-locked"` (`:84`) |
| Numerator `—` mono 600 16px `#3A3229` | ✅ MATCH — `figureColor: "var(--border-strong)"` (`:50`), `{inFlight ? "—" : have}` (`:99`) |
| Zero never rendered | ✅ MATCH (`:48`, `:99`) |
| Denominator **kept** | ✅ MATCH — the `/ {target}` span is outside the `inFlight` branch (`:100-103`) |
| Denominator colour `#4A4033` | ❌ MISMATCH — design: `#4A4033` in flight / implementation: `text-fg-faint` = `#8E8269` unconditionally (`:100`); there is no `inFlight` branch on the denominator's colour |
| Track: no track/fill, `height:0`, `border-top:1px dashed #3A3229` | ✅ MATCH (`:110-115`) |
| Track margins `margin-top:10px; margin-bottom:11px` | ❌ MISMATCH — design: `mt 10px` + `mb 11px` / implementation: `mt-[8px]` only, no bottom margin (`:113`). The code comment at `:107` claims "5px margin-top so the cell height is unchanged", but `mt-[8px]` is the *same* value the live track uses (`:118`), so the in-flight cell is **5px shorter** than the settled one — the exact height change the row exists to prevent. |
| `rec {n}` colour `#4A4033` | ❌ MISMATCH — design: `#4A4033` in flight / implementation: `text-fg-locked md:text-fg-faint` unconditionally (`:130`); no `inFlight` branch |
| Caption `—` `#4A4033` | ✅ MATCH — `md:text-border-dashed` = `#4A4033` (`:145`) |
| Motion none | ✅ MATCH — no animation/transition classes on the cell |

## 17. Provenance line (8/13) and fill-failed banner (15)

All rows in `src/components/decks/provenance-line.tsx`.

| Row | Verdict |
|---|---|
| Background `#181410` | ✅ MATCH (`:80`, `:136`) |
| Border `1px solid #2A241D` | ✅ MATCH — `var(--border)` (`:81`) |
| Left rule provenance `3px solid #C9A24B` | ✅ MATCH (`:82`) |
| Left rule fill-failed `3px solid #E0913C` | ✅ MATCH — `var(--warning)` (`:138`) |
| Border radius 9px desktop / 8px phone | ❌ MISMATCH — design: 9 desktop, 8 phone / implementation: `borderRadius: 9` at both widths (`:83`, `:139`) |
| Padding `11px 15px` desktop / `9px 12px` phone | ❌ MISMATCH — implementation: `padding: "11px 15px"` at both widths (`:84`, `:140`); the phone value is never applied |
| Margin-top 12px desktop / 10px phone | ❌ MISMATCH — implementation: `my-[10px]` at both (`:77`, `:133`); desktop should be 12px |
| Gap 9px (provenance) / 11px (banner) | ❌ MISMATCH — implementation: `gap-[10px]` for both (`:77`, `:133`) |
| Leading badge `i` disc `20×20`, radius 999, **`1.5px solid #C9A24B`**, Cinzel 700 12px, `#C9A24B` | ❌ MISMATCH — implementation: a **filled** brass disc with dark glyph — `background: "var(--brass)", color: "#181410"`, `font-mono text-[11px]`, no border (`:87-99`). Design draws an outlined disc with a brass Cinzel glyph. (The strip's worked-example callout at `role-counter-strip.tsx:132-143` draws the correct outlined form, so the two `i` discs on one page disagree.) |
| Phone **drops** the badge | ❌ MISMATCH — implementation renders the badge unconditionally; `ProvenanceLine` takes a `width` prop (`:40`) that changes only the copy string (`:69-72`), never the badge |
| Banner icon `⚠` `#E0913C` 13px | ❌ MISMATCH — implementation: `⚠` inside a filled 20×20 `var(--warning)` disc with `color:#181410` at 11px (`:143-155`); design draws a bare glyph, no disc |
| Body 12.5px `#C6B79A` `line-height:1.55` | ❌ MISMATCH — implementation: `text-[12.5px] leading-[1.6]` (`:101`); size and colour match, line-height is 1.6 not 1.55 |
| Body phone 12px | ❌ MISMATCH — implementation: 12.5px at both widths (`:101`) |
| Bold clause `#EDE6D8` / 600 | ❌ MISMATCH — the provenance body is a single unstyled string (`:100-105`); no clause is bolded or lifted to `#EDE6D8` |
| Copy — state 8 (`fill.provenance`) | ✅ MATCH (`recommendations.ts:104`, selected `:72`) |
| Copy — all owned (`fill.provenanceAllOwned`) | ✅ MATCH (`:109`, selected `:68`) |
| Copy — state 13 (`fill.provenanceShort`) | ✅ MATCH (`:113`, selected `:66`) |
| Copy — state 15 heading + body | ✅ MATCH (`recommendations.ts:121-123`, rendered `:161`, `:167`) |
| Retry link `Try filling again`, `inline-flex`, `mt 10px`, 12.5px `#C9A24B`, `border-bottom:1px solid #6E5B33` | ❌ MISMATCH — implementation: `mt-[8px] font-mono text-[11px] … underline text-[color:var(--brass)]` (`:174`). Wrong family (mono, not sans), wrong size (11 vs 12.5), `text-decoration: underline` rather than a `1px #6E5B33` bottom rule, `mt 8` not 10. |
| Retry accessible name `Try filling this deck again` | ✅ MATCH (`recommendations.ts:125`, `:173`) |
| Dismissal — not dismissible; leaves with the last `auto` card | ✅ MATCH — gated on `autoCount > 0` (`builder-shell.tsx:467`) plus an internal `cards.some(c => c.auto)` guard (`:51-52`) |
| Banner self-dismisses on retry; absent once non-empty | ✅ MATCH — `if (filled \|\| cardCount > 0) return null` (`:129`) |
| Retry placement rule — a link in the banner | ✅ MATCH (`:169-177`) |
| Rounding rule (state 13 quotes 67) | ✅ MATCH — `filledCount` sums real quantities (`builder-shell.tsx:469`); nothing rounds |

## 18. Decklist toolbar — tabs, filter, sweep

| Row | Verdict |
|---|---|
| Tab row padding `12px 30px` desktop | ✅ MATCH — `md:px-[30px] md:pt-[12px]` (`builder-tabs.tsx:81`) |
| Tab row padding `10px 14px` phone | ❌ MISMATCH — design `10px 14px` / implementation `px-[16px] pt-[10px]` (`builder-tabs.tsx:81`) |
| Tab gap 8px phone | ❌ MISMATCH — design 8px / implementation `gap-[16px] md:gap-[22px]` (`builder-tabs.tsx:85`) |
| Active tab 13.5px/600 `#EDE6D8`, `border-bottom 2px #C9A24B` | ✅ MATCH (`builder-tabs.tsx:51-61`) |
| Active tab `padding-bottom 8px` / phone 7px | ⚠️ PARTIAL — implementation `pb-[8px] md:pb-[10px]` (`:51`): phone is 8px (design 7px), desktop is 10px (design 8px) |
| Active count mono 11px `#C9A24B` | ✅ MATCH — `text-[11px] md:text-[12px]`, brass when selected and non-zero (`:64-68`) |
| Inactive tab `Consider` `#8E8269` | ✅ MATCH (`:57`) |
| Filter row padding `10px 14px`, gap 7px | ⚠️ PARTIAL — gap ✅ (`gap-[7px]`, `group-toggle.tsx:38`); padding is `px-[16px] py-[9px]` — 16/9, not 14/10 |
| **Segmented container** `bg #181410; border 1px #3A3229; radius 8px; padding 2px; gap 2px` | ❌ MISMATCH — design: a segmented control wrapping both filters / implementation: **no container**. Two free-standing `rounded-full` pills sit directly in the toolbar flex row (`group-toggle.tsx:41-66`) |
| Segment — active `color:#14110E; background:#C9A24B; radius 6px; padding 4px 10px` | ⚠️ PARTIAL — colours match (`:47`, `:61`); geometry is `rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px]` (`:44`, `:58`), not radius 6 / padding `4px 10px` |
| Segment — inactive `color:#C6B79A` | ❌ MISMATCH — implementation: `All` inactive is `#8E8269` with a `1px solid #3A3229` border (`:48`); `Shopping` inactive is `#E0913C` with a `1px solid #4A3A24` border (`:62`). Neither is `#C6B79A`, and neither carries a border in the design. |
| Segment typography mono 11px | ❌ MISMATCH — implementation: `font-sans … text-[12px] md:text-[13px]` (`:44`, `:58`) |
| Segment labels `All 68` / `Shopping 7` | ✅ MATCH (`:51`, `:65`) — though both are hardcoded literals, not copy-module keys |
| Sweep button is a `GhostButton`, not a danger button | ⚠️ PARTIAL — it is a plain `<button>`, not the `GhostButton` component, but it is correctly not styled as a danger control (`clear-auto.tsx:34-45`) |
| Sweep geometry mono 12px `#C6B79A`, transparent bg, `1px solid #3A3229`, radius 8px, padding `6px 12px` | ❌ MISMATCH — implementation: `font-mono text-[11px] md:text-[12px] text-fg-locked` and **nothing else** (`clear-auto.tsx:39`). Size ✅ at both widths; colour is `#6A6152` not `#C6B79A`; no border, no radius, no padding — it renders as bare text, not as a bordered ghost button. |
| Sweep copy `Clear all auto · {n}` / `Clear auto · {n}` | ✅ MATCH — both spans, width-branched (`clear-auto.tsx:43-44`; `recommendations.ts:80-81`) |
| Sweep accessible name `Clear all {n} untouched auto cards` | ✅ MATCH (`recommendations.ts:82`, `clear-auto.tsx:38`) |
| Sweep position — right-aligned beside the filter | ✅ MATCH — after the `flex-1` spacer, before the `Group` label (`group-toggle.tsx:69-79`) |
| **Never rendered disabled** | ❌ MISMATCH — design: never rendered disabled / implementation: `disabled={pending}` with `disabled:opacity-50 disabled:cursor-default` (`clear-auto.tsx:37,39`). Absence at `0 auto` is correct (`:25`, and the `autoCount > 0` gate at `group-toggle.tsx:72`); the in-flight disable is the delta. |
| Confirmation dialog — none | ✅ MATCH — `handleClearAuto` fires directly (`builder-shell.tsx:301-323`) |
| Kept-note `{n} cards are yours now`, mono 10.5px `#6A6152`, desktop only | ⚠️ PARTIAL — copy ✅ (`recommendations.ts:84`), colour ✅ (`text-fg-locked`), desktop-only ✅ (`hidden md:inline`); size is **11px**, design says 10.5px (`clear-auto.tsx:30`) |

## 19. Deck row and the `auto` marker

All rows in `src/components/decks/decklist-row.tsx` unless noted.

| Row | Verdict |
|---|---|
| Display `flex; align-items:center` | ✅ MATCH (`:32`) |
| Gap 10px / 9px | ✅ MATCH — `gap-[9px] md:gap-[10px]` (`:32`) |
| Min-height 34px / 44px | ✅ MATCH — `min-h-[44px] md:min-h-[34px]` (`:33`) |
| Background `#1A160F` | ✅ MATCH (`:151`) |
| Border radius 7px / 6px | ✅ MATCH — `rounded-[6px] md:rounded-[7px]` (`:33`) |
| Padding `7px 9px` / `0 4px 0 8px` | ✅ MATCH — `pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]` (`:32`) |
| Owned dot `8×8` desktop, `7×7` phone, `#6FA368` | ✅ MATCH — `w-[7px] h-[7px] md:w-[8px] md:h-[8px]` (`:159`), fill `var(--success)` (`ownership-dot.tsx:17`) |
| Unowned dot `7×7` at **both** widths, `1px solid #6E6353` | ❌ MISMATCH — design: `7 × 7` at both / implementation: the same responsive class is used for owned and unowned, so the desktop unowned dot is **8×8** (`:159`). Border style also differs: design says `1px solid`, implementation uses `1px dashed #6E6353` (`ownership-dot.tsx:18`). |
| Name `flex:auto`, 13.5px / 12.5px, `#EDE6D8` | ✅ MATCH (`:82`, `:203`) |
| Name overflow nowrap/hidden/ellipsis, `flex-auto` not `flex-1` | ✅ MATCH (`:82`, with the reasoning at `:74-80`) |
| Copy-count `×7` mono 10px `#C9A24B` `flex:none` | ❌ NOT IMPLEMENTED — no `×N` element exists in `decklist-row.tsx` or `decklist-group.tsx`. Stacks are represented only by the `+N more` meta row for basics (`decklist-group.tsx:58-67`). |
| `buy` tag mono 9.5px `#E0913C` on `rgba(224,145,60,0.13)`, radius 4, padding `1px 5px` | ✅ MATCH (`buy-tag.tsx:12,20,34-35`) |
| `buy` tag phone mono 9px | ✅ MATCH — `text-[9px] md:text-[9.5px]` (`buy-tag.tsx:20`) |
| `auto` tag rest mono 9.5px `#6A6152` on `#2A241D`, radius 4, padding `1px 5px` | ✅ MATCH at desktop (`auto-tag.tsx:43-51`) |
| `auto` tag phone — **same face** (9.5px) in a `44×44` box | ❌ MISMATCH — design: same 9.5px face at phone / implementation: `text-[9px] md:text-[9.5px]` (`auto-tag.tsx:44`), so the phone face is 9px. The box is also not 44×44: `min-h-[44px] md:min-h-0` gives 44px of height only, with intrinsic width (`:47`). |
| `auto` tag copy `auto` | ✅ MATCH (`recommendations.ts:72`, `auto-tag.tsx:57`) |
| Hover/focus: row `#1A160F → #211C15` | ✅ MATCH — `md:hover:bg-[#211C15]` (`decklist-row.tsx:151`) |
| Hover/focus: tag → `keep ✓`, `#C9A24B`, bg `#2A241D`, `1px solid #6E5B33`, radius 4 | ✅ MATCH — `active` state driven by `onMouseEnter`/`onFocus` (`auto-tag.tsx:34-37`, `:50`); copy `keep ✓` (`recommendations.ts:74`) |
| Hover padding `0 5px` | ⚠️ PARTIAL — implementation keeps `py-[1px]` in both states (`auto-tag.tsx:43`); the design's hover-only padding change is not made. Given the box is a fixed geometry this reads as intentional stability, not a defect. |
| `auto` tag — active removes the tag for good | ✅ MATCH — `keepAutoCard` clears the flag (`actions.ts:442`); the row's `card.auto &&` guard then unmounts it (`decklist-row.tsx:239`) |
| **No `aria-pressed`** | ✅ MATCH — `auto-tag.tsx` sets `aria-label` and `aria-busy` only (`:40-41`) |
| `auto` accessible name `Keep {name} in this deck` | ✅ MATCH (`recommendations.ts:76`) |
| `✕` rest 13px `#4A4033` | ✅ MATCH (`:251`) |
| `✕` hover → `#C6B79A` | ✅ MATCH — `md:group-hover:text-[#C6B79A]` (`:253`) |
| `✕` phone `44×44` box | ✅ MATCH — `w-[44px] h-[44px] md:w-auto md:h-auto` (`:250`) |
| Reading order dot → name → `×N` → `buy` → `auto` → `✕` | ⚠️ PARTIAL — implementation is dot → name → **AvailabilityMarker** → `buy` → `auto` → `✕` (`:156-262`). `×N` is absent; the availability marker is #43's and outside this table. |
| Slot added between `BuyTag` and `✕` | ✅ MATCH (`:236-241`) |
| Shrink order — name yields last | ✅ MATCH — `shrink-[4]` on the marker (`:231`), `flex-auto min-w-0` on the name |
| Basics: one `auto` per stack, meta row takes no marker and no `✕` | ✅ MATCH — `!isMeta && card.auto` (`:239`), `!isMeta &&` on the `✕` (`:245`) |
| Meta row `+6 more`, 13.5px `#8E8269`, 8px dot spacer | ✅ MATCH (`:164`, `:193-195`; label built at `decklist-group.tsx:65`) |
| A11y skeleton `li.deck-row > (button.name + button.auto + button.remove)` | ❌ MISMATCH — implementation renders `div > div` (`:144`, `:151`) inside a plain `div` grid (`decklist-group.tsx:43`). There is no `ul`/`li`, so the decklist exposes no list semantics or item count to assistive tech. |
| Modal from the name touches nothing | ✅ MATCH — `CardDetailTrigger` only (`:198-206`) |

## 20. Decklist body and group headings

| Row | Verdict |
|---|---|
| Layout desktop `padding: 14px 30px 22px` | ❌ MISMATCH — implementation `md:px-[26px] md:py-[14px]` (`decklist.tsx:323`): 26px horizontal not 30, and 14px bottom not 22 |
| Grid `1fr 1fr`, `gap: 10px 26px` | ❌ MISMATCH — implementation `md:gap-y-[4px] md:gap-x-[20px]` with `gridTemplateColumns: "1fr 1fr"` (`decklist-group.tsx:44-45`): column gap 20 not 26 |
| Row gap within a group 4px desktop | ✅ MATCH — `md:gap-y-[4px]` (`decklist-group.tsx:44`) |
| Layout phone `padding: 4px 14px; flex column gap 5px` | ❌ MISMATCH — implementation `px-[16px] py-[12px]` (`decklist.tsx:323`) and `gap-[3px]` (`decklist-group.tsx:44`) |
| Heading row `flex; align-items:baseline; gap:8px; margin-bottom:7px` | ⚠️ PARTIAL — `flex items-baseline … mb-[6px] md:mb-[8px]` with inner `gap-[6px] md:gap-[10px]` (`decklist-group-header.tsx:40-41`). Additionally the implementation adds `md:pb-[7px] md:border-b md:border-[#2A241D]` — a bottom rule under every group heading that the design does not draw. |
| Heading typography mono 10px, ls `.14em`, uppercase, `#C9A24B` | ❌ MISMATCH — design: mono 10px brass uppercase / implementation for All-view groups: `font-sans md:font-display font-semibold text-[12.5px] md:text-[15px]`, `#EDE6D8` (`decklist-group-header.tsx:36-37`). The mono/brass treatment is applied **only** when a `gapClause` is passed, i.e. only in the Shopping view (`:35`). |
| Count clause mono 10px `#8E8269` | ✅ MATCH — `font-mono text-[10px] md:text-[11px]`, `#8E8269` default (`decklist-group-header.tsx:25`, `:70`) |
| **Count clause copy `{n} · {n} auto`** | ❌ NOT IMPLEMENTED — the header renders the bare count (`decklist-group-header.tsx:74`). `DecklistGroup` passes no auto tally (`decklist-group.tsx:40`), and `recommendationsCopy.auto.groupCount` (`recommendations.ts:78`) **has no consumer anywhere in `src/`**. |
| Lands note — basics carry `auto`, never in Shopping | ✅ MATCH — `shoppingCards` filters `!isBasicLand(c.typeLine)` (`decklist.tsx:97`) |

## 21. Spent slot (shipped, PR #204 — unchanged)

| Row | Verdict |
|---|---|
| Background `#181410` | ✅ MATCH — `bg-surface-sunken` (`decklist-row.tsx:297`) |
| Border `1px dashed #3A3229` | ✅ MATCH — `border border-dashed border-border-strong` (`:297`) |
| Border radius 7px | ✅ MATCH — `ROW_SHELL` `md:rounded-[7px]` (`:33`) |
| Min-height / padding `34px` / `7px 9px` | ✅ MATCH (`:32-33`) |
| Leading spacer `flex:none; width:8px`, no dot | ✅ MATCH (`:300`) |
| Label `flex:1; min-width:0`, mono 12px `#6A6152`, ellipsised | ✅ MATCH (`:301`) |
| Undo 12.5px/600 `#C9A24B`, `border-bottom:1px solid #6E5B33` | ✅ MATCH — `md:text-[12.5px] font-semibold md:border-b md:border-brass-shadow text-brass` (`:311-314`) |
| Scope row-level, unchanged | ✅ MATCH — one slot, held in shell state (`builder-shell.tsx:182`) |

## 22. Sweep receipt (list-level, state 10)

All rows in `src/components/decks/clear-auto.tsx`.

| Row | Verdict |
|---|---|
| Display `flex; align-items:center; gap:10px` | ❌ MISMATCH — implementation `flex items-center justify-between gap-[12px]` (`:61`): gap 12 not 10, plus a `justify-between` the design does not draw (it uses `flex:1` on the label instead) |
| Background `#181410` | ✅ MATCH — `bg-surface-sunken` (`:61`) |
| Border `1px dashed #3A3229` | ✅ MATCH — `border border-dashed border-border-strong` (`:61`) |
| Border radius 8px | ✅ MATCH — `rounded-[8px]` (`:61`) |
| Padding `10px 13px` | ❌ MISMATCH — implementation `px-[12px] py-[8px]` (`:61`) |
| Margin-bottom 16px | ❌ MISMATCH — implementation `mb-[12px] md:mb-[14px]` (`:61`) |
| Label `flex:1`, mono 12px `#6A6152` | ⚠️ PARTIAL — size/colour ✅ at desktop (`text-[11px] md:text-[12px] text-fg-locked`, `:62`); no `flex-1` (see the display row) |
| Label copy `{n} auto cards removed` | ✅ MATCH (`recommendations.ts:87`, `:63`) |
| Undo 12.5px/600 `#C9A24B`, `border-bottom:1px solid #6E5B33` | ❌ MISMATCH — implementation `font-mono text-[11px] md:text-[12px] text-brass-shadow underline` (`:69`). The colour is `--brass-shadow` `#6E5B33` — the design's *underline* colour applied to the *label* — where the design's label colour is `--brass` `#C9A24B`. Also mono not sans, 12px not 12.5, no `font-semibold`, `text-decoration: underline` rather than a border-bottom. |
| Undo copy `Undo` | ✅ MATCH (`recommendations.ts:88`, `:71`) |
| Undo accessible name `Put all {n} auto cards back` | ✅ MATCH (`recommendations.ts:89`, `:68`) |
| One strip, not N rows | ✅ MATCH — rendered once above the groups (`decklist.tsx:334-339`) |
| Lifetime: survives a tab switch | ✅ MATCH — held in shell state (`builder-shell.tsx:187`), which outlives the view swap |
| Lifetime: clears on Undo | ✅ MATCH (`builder-shell.tsx:336`) |
| Lifetime: clears **on the next mutation** | ❌ MISMATCH — the only clear path besides Undo requires *every* swept row to be back in the server list (`builder-shell.tsx:352-354`). An unrelated add or removal revalidates `deck.cards` but leaves the receipt standing, so a stale sweep receipt can sit above a list the player has since edited. |
| Lifetime: clears on leaving the route | ✅ MATCH — component state, unmounted with the route |
| Live region announced once, `{removed} auto cards removed. {total} of 99.` | ✅ MATCH (`recommendations.ts:91-92`; `builder-shell.tsx:314-316`) |
| Failure copy `We couldn’t clear those. The deck is unchanged.` | ✅ MATCH (`recommendations.ts:97`; rendered `role="alert"` at `decklist.tsx:325-332`) |
| One server action, one optimistic update, one message | ✅ MATCH (`builder-shell.tsx:303-322`) |

## 23. Swept-empty block (state 10) and fill-failed empty (state 15)

| Row | Verdict |
|---|---|
| Container `text-align:center; padding 26px 18px 30px` | ❌ MISMATCH — implementation `px-[16px] py-[40px] md:py-[60px]` plus a radial-gradient background (`builder-shell.tsx:592`) |
| Glyph row `flex; justify-content:center; gap:10px; margin-bottom:18px` | ❌ NOT IMPLEMENTED — the block draws the shipped card-fan mark and `Crown` instead (`builder-shell.tsx:594-663`) |
| Glyph `12×12`, `#3A3229`, `rotate(45deg)` | ❌ NOT IMPLEMENTED — same reason |
| Glyph count 3 in state 10 | ❌ NOT IMPLEMENTED — same reason |
| Heading Cinzel 600 18px `#EDE6D8` | ❌ MISMATCH — implementation `font-display font-bold text-[21px] md:text-[24px]` (`builder-shell.tsx:672-676`); colour ✅ |
| Heading copy `Back to just the commander` | ✅ MATCH (`recommendations.ts:156`, `builder-shell.tsx:678`) |
| Body 13.5px `#C6B79A` `lh 1.6`, `margin: 8px auto 0`, `max-width 330px` | ❌ MISMATCH — implementation `text-[13.5px] leading-[1.6] mt-[10px] md:text-[14px] md:leading-[1.65] md:mt-[12px] md:max-w-[440px]` (`builder-shell.tsx:681-685`) |
| Body copy `sweptEmpty.body` | ✅ MATCH (`recommendations.ts:157`, `builder-shell.tsx:686`) |
| CTA `See what we suggested`, `inline-flex; mt 18px`, 13px `#C6B79A`, `1px solid #3A3229`, radius 8, padding `9px 15px` | ❌ MISMATCH — implementation `font-mono text-[11px] mt-[20px] … text-brass` (`builder-shell.tsx:690-696`): mono 11px brass with no border, no radius and no padding, where the design draws a bordered 13px `#C6B79A` button |
| CTA copy | ✅ MATCH (`recommendations.ts:159`) |
| Heading (state 15) Cinzel 600 17px — `99 empty slots` | ❌ NOT IMPLEMENTED — no such string in `recommendations.ts` and no branch renders it |
| Body (state 15) — `Consider is stocked either way — the suggestions don’t depend on the fill landing.` | ❌ NOT IMPLEMENTED — same; a failed-fill deck has `filled === false`, so the empty state falls into the **first-run** branch and shows `addPanelCopy.builderEmpty.*` (`builder-shell.tsx:698-726`) |
| Quick-add strip | ⚠️ PARTIAL — the shipped `QuickAddBar` is pinned under the panel at both widths (`builder-shell.tsx:770-783`), so the entrance exists; it is not the drawn inline strip (`⚲` + `Add a card by name…` inside the empty block) |
| Branch — one "was this deck ever filled" flag | ✅ MATCH — `deck.filled` (`builder-shell.tsx:670`; column at `read.ts:78,109,203`) |
| Entrances (quick add, Consider) unchanged | ✅ MATCH |

## 24. Shopping view — intro, groups, footer

| Row | Verdict |
|---|---|
| Panel `bg #100D0A; border 1px #2A241D; radius 16px; padding 16px 18px` | ❌ NOT IMPLEMENTED — there is no panel wrapper; the Shopping body is a bare `div` with `px-[16px] py-[12px] md:px-[26px] md:py-[14px]` (`decklist.tsx:215`) |
| Intro 13.5px `#C6B79A` `lh 1.6` `mb 14px` | ❌ MISMATCH — implementation `font-mono text-[10.5px] leading-[1.6] mb-[14px]` with `color: var(--fg-faint)` `#8E8269` (`decklist.tsx:234-239`). Family, size and colour all differ; margin ✅. |
| Intro phone 12.5px | ❌ MISMATCH — no width branch; 10.5px at both |
| Intro copy, `{n}` as a numeral | ✅ MATCH (`recommendations.ts:130`, called with `String(n)` at `decklist.tsx:238`) |
| Group heading mono 10px, ls `.14em`, uppercase, `#C9A24B` | ✅ MATCH — the `gapClause` branch (`decklist-group-header.tsx:35-37`) |
| Group heading phone mono 9.5px | ❌ MISMATCH — no width branch; `text-[10px]` at both (`decklist-group-header.tsx:35`) |
| Gap clause mono 10px `#8E8269` | ✅ MATCH (`decklist-group-header.tsx:62-64`) |
| Gap clause phone 9.5px | ❌ MISMATCH — no width branch |
| Gap clause copy `{n} · closes {from}→{to}` | ✅ MATCH (`recommendations.ts:133`, composed at `decklist.tsx:142-146`) |
| `from` counts owned only, so `from + n = to` | ✅ MATCH — `computeRoleCounts(cards.filter(c => c.owned))` (`decklist.tsx:134`) |
| Drawn groups Ramp / Removal / Wipes in order | ✅ MATCH — `SHOPPING_ROLE_ORDER` is `ramp, draw, removal, wipes` (`decklist.tsx:21-23`) |
| Group spacing: first `mb 7px`; later `14px 0 7px`; row column `gap 4px`, `mb 14px` | ❌ MISMATCH — every group takes the same `mb-[16px] md:mb-[20px]` (`decklist.tsx:243`); header margin is `mb-[6px] md:mb-[8px]` |
| Footer mono 10.5px `#8E8269`, `mt 14px`, `border-top 1px #2A241D`, `pt 10px` | ⚠️ PARTIAL — family/size/colour/border/padding-top all ✅ (`decklist.tsx:293-296`); `margin-top` is **4px**, design says 14px |
| Footer phone mono 10px, `mt 12px`, `pt 9px` | ❌ MISMATCH — no width branch |
| Footer copy `{n} cards to buy · all {n} auto` / `…· {n} auto` | ✅ MATCH — `footer` / `footerMixed` selected on `allAuto` (`decklist.tsx:297-299`; `recommendations.ts:142-144`) |
| No prices / vendor links anywhere | ✅ MATCH |

## 25. Shopping row

| Row | Verdict |
|---|---|
| Min-height 34px desktop | ✅ MATCH — `md:min-h-[34px]` (`decklist-row.tsx:37`) |
| Min-height **52px** phone | ✅ MATCH — `ROW_SHELL_SHOPPING` `min-h-[52px]` (`:37`), selected when `hasShoppingMeta` (`:89-90`) |
| Background `#1A160F` | ✅ MATCH (`:151`) |
| Border radius 7 / 6 | ✅ MATCH (`:37`) |
| Padding `7px 9px` / `0 4px 0 8px` | ✅ MATCH (`:36`) |
| Gap 10 / 9 | ✅ MATCH (`:36`) |
| Layout desktop — **single line** | ❌ MISMATCH — design: desktop keeps one line with the figure inline and `flex:none` / implementation: the name and the figure are wrapped in a `flex flex-col` at **both** widths (`:171-192`), so the desktop Shopping row renders the phone's two-line treatment |
| Layout phone — two lines, name + `buy` on line 1 (`gap:6px`), meta on line 2 | ⚠️ PARTIAL — the meta line is on line 2 ✅, but `buy` is not inside the name's line-1 flex; it sits in the outer row flex beside the name column (`:236`), so the `gap:6px` pairing is not reproduced |
| Dot `7×7`, `1px solid #6E6353` unowned | ⚠️ PARTIAL — 7px at phone, 8px at desktop (`:159`), and the border is dashed (`ownership-dot.tsx:18`) |
| Name `flex:auto`, 13.5 / 12.5px, `#EDE6D8`, ellipsised | ✅ MATCH (`:176-177`) |
| Figure desktop inline, `flex:none`, mono 10px `#8E8269`, tabular, `24%` | ❌ MISMATCH — implementation prints `edhrec 24%` (`recommendations.ts:138`) on the meta line at both widths, mono `text-[10px] md:text-[10.5px]` `var(--fg-faint)` (`:181-190`). Design reserves the `edhrec` prefix for phone, where the figure left the pill. |
| Figure `font-variant-numeric: tabular-nums` | ❌ NOT IMPLEMENTED — no `tabular-nums` on the figure span (`:181-189`) |
| Figure phone meta line `edhrec {pct}%` | ✅ MATCH (`recommendations.ts:138`, `:92`) |
| Absent figure desktop `—` mono 10px `#6A6152` | ❌ MISMATCH — implementation prints the phone sentence `no EDHREC figure` at both widths (`recommendations.ts:141`, `:93`) |
| Absent figure phone — a sentence, `no EDHREC figure` | ✅ MATCH |
| Meta-line overflow nowrap/hidden/ellipsis (handoff blocker 7) | ✅ MATCH — all three set inline (`:184-187`). **This closes handoff blocker 7.** |
| `buy` tag mono 9.5 / 9px | ✅ MATCH (`buy-tag.tsx:20`) |
| `auto` tag mono 9.5px `#6A6152` on `#2A241D`, `44×44` at phone | ⚠️ PARTIAL — see §19: phone face is 9px and the box is 44px tall with intrinsic width |
| `✕` 13px `#4A4033`, `44×44` at phone | ✅ MATCH (`:250-251`) |
| Shrink order 1 meta · 2 name · 3 nothing else · 4 absence stays a sentence | ✅ MATCH — both the name and the meta carry `min-w-0` + ellipsis inside a `flex-auto` column; `buy`, `auto`, `✕` are all `flex-none`; absence is `rowNoFigure` |
| All-view parity — no figure, 34/44px row | ✅ MATCH — `shoppingFigure === undefined` in the All view (`decklist-group.tsx:49-55`) makes `hasShoppingMeta` false (`:89`) |

## 26. Shopping empty because the collection covered it (state 12)

| Row | Verdict |
|---|---|
| Container `text-align:center; padding 24px 14px 28px` | ❌ MISMATCH — implementation `px-[16px] py-[12px] md:px-[26px] md:py-[14px]`, **left-aligned** (`decklist.tsx:179`) |
| Two `12×12` `#3A3229` `rotate(45deg)` glyphs, `gap 10px`, `mb 18px` | ❌ NOT IMPLEMENTED — no glyphs are rendered in this branch (`decklist.tsx:179-192`) |
| Heading Cinzel 600 18px `#EDE6D8` | ❌ MISMATCH — implementation `font-mono text-[12px] font-semibold` with `color: var(--brass)` (`decklist.tsx:180-183`) |
| Heading copy `Nothing to buy. Your shelf covered it.` | ✅ MATCH (`recommendations.ts:146`, `decklist.tsx:184`) |
| Body 13.5px `#C6B79A` `lh 1.6`, `margin 8px auto 0`, `max-width 300px` | ❌ MISMATCH — implementation `font-mono text-[11px] leading-[1.6]` with `color: var(--fg-faint)`, no margin, no max-width (`decklist.tsx:186-189`) |
| Body copy `emptyCoveredBody({open})` | ✅ MATCH (`recommendations.ts:147`, `decklist.tsx:190`) |
| `open` = the slots left open | ✅ MATCH — `99 - built` (`decklist.tsx:161`) |
| Segmented state `Shopping 0` active | ✅ MATCH — `GroupToggle` still renders with `shoppingCount={toBuyCount}` (`decklist.tsx:167-178`) |
| **Branch** — an unfilled deck keeps its shipped string | ❌ MISMATCH — the `n === 0` branch (`decklist.tsx:164`) renders the compliment unconditionally. `Decklist` receives no `filled` prop at all (`DecklistProps`, `decklist.tsx:33-69`), so a deck that was never filled and simply owns everything in it is congratulated on a fill that never ran. |

## 27. In-flight skeleton decklist (state 14 / A3)

**Not implemented.** Reported factually per the brief rather than as a verdict.

- No skeleton component exists. A grep across `src/` for `fillingRows`, `fill.filling`, `filledAnnounce` and `Sleeving` returns hits **only** in `src/lib/copy/recommendations.ts` itself (`:116`, `:117`, `:118`). All three strings are authored and unused.
- There is no plate container, no plate count (8 / 5), no plate fills, no caption, and no settle announcement.
- The reason is structural and matches the design's own stated preference ("Design prefers this frame **never renders** — the fill belongs in the create transaction"): `createDeck` builds the plan and inserts every row **inside one transaction** before redirecting (`actions.ts:157-185`). There is no streaming window for the frame to occupy.
- Consequence: the copy keys `fill.filling`, `fill.fillingRows` and `fill.filledAnnounce` are dead code in the copy module.

## 28. Cross-cutting contract

| Row | Verdict |
|---|---|
| New tokens / hexes — none | ✅ MATCH — every hex used by the new components resolves to an existing token value (`#181410` = `--surface-sunken`, `#2A241D` = `--elevated`/`--border`, `#3A3229` = `--border-strong`, `#4A4033` = `--border-dashed`, `#1A160F` = `--surface-rail`). No new `--` custom property was added to `globals.css`. |
| No new empty-state construct / no new modal | ✅ MATCH |
| Motion — none added | ⚠️ PARTIAL — no arrival animation, no stagger, and nothing was added to the `prefers-reduced-motion` block. The `transition-[filter] hover:brightness-125` on the filter pills (`group-toggle.tsx:44,58`) predates this pass. |
| Transitions — colour only, on the `auto → keep ✓` swap | ⚠️ PARTIAL — the swap is instant: `AutoTag` has no `transition` class at all (`auto-tag.tsx:42-53`). The design asks for a colour transition; the implementation has none rather than too much. |
| Transforms — only the `rotate(45deg)` glyphs | ⚠️ PARTIAL — the glyphs are not implemented (§23, §26); the transforms present are the shipped empty-state card mark's `rotate(±15deg)` (`builder-shell.tsx:614`, `:640`) |
| Focus ring — inherited global `2px --brass` at `+2px` | ✅ MATCH — `globals.css:169`; no bespoke ring on any Part 2 control |
| SVG icons — none | ✅ MATCH within Part 2's surfaces: `⚠` (`provenance-line.tsx:154`), `✕` (`addPanelCopy.row.remove`), `✓` (`recommendations.ts:74`), `→` (`decks-builder.ts:79`), `—` (`role-counter-cell.tsx:147`), `i` (`provenance-line.tsx:98`) are all text characters. (`builder-spine.tsx:428` has an inline SVG, but the spine is §12's shipped construct, not a surface this pass drew.) |
| Colour-alone — `auto` is a word | ✅ MATCH (`recommendations.ts:72`) |
| Null rule — a dash in three places, `0%` nowhere | ✅ MATCH — `shoppingFigures` omits non-finite values rather than storing `0` (`actions.ts:310-312`), the row treats only `Number.isFinite` as a figure (`decklist-row.tsx:91`), and the in-flight cell draws `—` not `0` (`role-counter-cell.tsx:99`) |
| Celebration — no new collision | ✅ MATCH — `shouldCelebrate` still keys off the **server** status (`builder-shell.tsx:113-123`) |
| Arithmetic 10+10+8+3+37 = 68 | ✅ MATCH (`mix.ts:52-77`) |

---

# PASS 2 — State reachability

## State 8 — freshly filled deck

⚠️ **PARTIALLY REACHABLE — the group heading's `{n} auto` clause never renders.**

1. **Type**: ✅ `auto: boolean` on the deck-card row (`read.ts:149`, `:183`; `grouping.ts:19`); `filled: boolean` on the deck (`read.ts:78`).
2. **Server**: ✅ `createDeck` inserts every planned row with `auto: true` and sets `filled: true` in one transaction (`actions.ts:162-172`).
3. **Branches**: provenance line ✅ (`builder-shell.tsx:467-501`), five met mix cells ✅, sweep control ✅ (`group-toggle.tsx:72-79`), per-row `auto` tag ✅ (`decklist-row.tsx:239-241`), `All`/`Shopping` filter ✅.
4. **Props**: `justFilled={deck.filled && autoCount > 0}` is passed correctly (`builder-shell.tsx:543`); `autoCount`/`keptCount` are computed off the optimistic list (`:298-299`) and threaded through `Decklist` → `GroupToggle` → `ClearAutoButton` ✅.

Missing: the `68 of 99 · 61 owned · 7 to buy` sub-line and the `Building` pill (§12), and the group clause `9 · 9 auto` (§20) — `auto.groupCount` has no consumer.

## State 9 — partly pruned

⚠️ **PARTIALLY REACHABLE — same group-clause gap.**

1. **Type**: ✅ per-row `auto`.
2. **Server**: ✅ `keepAutoCard` flips one row's `auto` to false (`actions.ts:442`); `removeCardFromDeck` handles the removals.
3. **Branches**: kept and hand-added rows are visually identical ✅ (nothing keys on "was auto"); the row-level spent slot with `Undo` renders ✅ (`decklist-row.tsx:140`, `:284-324`); the kept-note renders at `keptCount >= 1` ✅ (`clear-auto.tsx:29`).
4. **Props**: `keptCount` correct (`builder-shell.tsx:299`); the sweep's own count is the untouched-auto count, not the total ✅ (`:298`).

Missing: the group clause `7 · 5 auto`.

## State 10 — all auto cleared

⚠️ **PARTIALLY REACHABLE — the swept-empty block does not render in the frame the sweep produces.**

1. **Type**: ✅ `SweptRow[]` (`actions.ts`, re-exported); `deck.filled` is the "was ever filled" bit.
2. **Server**: ✅ `clearAutoCards` returns the removed rows (`actions.ts:466`); `restoreAutoCards` puts them back (`:480`).
3. **Branch**: the swept-empty copy is gated on `isEmpty && deck.filled` (`builder-shell.tsx:588`, `:670`), but `isEmpty` is explicitly **false while `sweptRows` is non-empty**: `built === 0 && … && !sweptRows?.length` (`builder-shell.tsx:201-202`). So immediately after a sweep the player sees the receipt plus the hardcoded fallback `"No cards in this deck."` (`decklist.tsx:340-347`) — a literal that is not in any copy module — rather than `Back to just the commander`. The designed block appears only after a reload or a return to the route, once `sweptRows` is null.
   The comment at `:198-200` says this is deliberate (the empty state would take the receipt down with it), so the two requirements genuinely conflict; recording it as a reachability gap for the state-10 copy rather than as a careless bug.
4. **Props**: receipt count, undo handler and announcement are all wired ✅ (`builder-shell.tsx:746-751`; `decklist.tsx:334-339`).

## State 11 — Shopping populated by the fill

✅ **REACHABLE.**

1. **Type**: ✅ `shoppingFigures?: Record<string, number>` (`builder-shell.tsx:69-71`; `decklist.tsx:63-68`).
2. **Server**: ✅ genuinely computed, not stubbed — `getDeckSuggestions` queries the deck's unowned rows and maps EDHREC inclusion by lowercased name with a DFC front-face fallback, **omitting** anything non-finite (`actions.ts:287-313`).
3. **Branch**: ✅ role groups with per-role gap clauses (`decklist.tsx:137-148`), an `Other` group for un-targeted roles (`:268-290`), intro and footer.
4. **Props**: ✅ `shoppingFigures` threads `page.tsx:37` → `builder-shell.tsx:752` → `decklist.tsx:250-252` → `DecklistRow`, with `null` (absent) distinguished from a number.

Note on handoff **blocker 2**: it says the flat `slice(0, 5)` in `getDeckSuggestions` makes state 11 unreachable. That is now stale — the fill runs through `buildFillPlan`/`planFill` (`actions.ts:128-141`), which is role-driven, and the Shopping tab reads the deck's own unowned rows rather than the suggestion slice. The `slice(0, 5)` at `actions.ts:244` now bounds only the Consider tab's unowned staples.

## State 12 — Shopping empty, collection covered it

⚠️ **PARTIALLY REACHABLE — the was-filled bit is not consulted.**

1. **Type**: `filled` exists on `DeckDetail` (`read.ts:78`) but is **not** on `DecklistProps` (`decklist.tsx:33-69`).
2. **Server**: ✅ set correctly at create time.
3. **Branch**: `if (n === 0)` (`decklist.tsx:164`) renders `emptyCoveredHeading` + `emptyCoveredBody` for **every** deck with nothing to buy, filled or not.
4. **Props**: `filled` is never passed down. The design's rule — "Shopping empty on a deck that was never filled keeps its shipped string" — cannot be honoured without threading it.

## State 13 — a baseline the fill could not reach

✅ **REACHABLE** (with the §15 desktop-hairline visual gap).

1. **Type**: ✅ `shortRole?: string` on `ProvenanceLineProps` (`provenance-line.tsx:38`).
2. **Server/derivation**: ✅ computed, not stubbed — the shell tallies the auto rows' roles and finds the first below `ROLE_TARGETS` (`builder-shell.tsx:472-476`).
3. **Branch**: ✅ `provenanceShort` outranks the width branch so the phone still names the role (`provenance-line.tsx:58-66`); the short cell takes brass + a 67% `--brass-mid` bar from `roleCellState` (`mix.ts:107`).
4. **Props**: ✅ `shortRole` passed at both widths (`builder-shell.tsx:485`, `:495`); `justFilled` passed to the strip (`:543`) and through to every cell (`role-counter-strip.tsx:102`).

## State 14 — optimistic / in-flight first frame

❌ **NOT REACHABLE — by construction, and consistent with the design's own preference.**

1. **Type**: `RoleCounterCell.have` accepts `null` ✅ (`role-counter-cell.tsx:25`), and `cellLinkAria`/`cellStaticAria` both handle it (`decks-builder.ts:86-95`).
2. **Server**: there is no streaming fill. `createDeck` inserts the rows inside the create transaction and only then redirects (`actions.ts:162-185`), so no render ever observes a deck mid-fill.
3. **Branch**: the in-flight cell treatment exists (`role-counter-cell.tsx:48-125`); the `Filling {n} of 99…` header, the dashed `Draft` pill and the 8/5-plate skeleton do **not** exist anywhere.
4. **Props**: `role-counter-strip.tsx:100` always passes `counts[role]`, a number. No caller passes `null`.

**Confirmed as the authorised A3 case for the cell** (documented at `role-counter-cell.tsx:16-24`) and **not** reported as a defect. The absence of the header/pill/skeleton is reported factually above.

## State 15 — deck created, fill failed

⚠️ **PARTIALLY REACHABLE — the banner lands, the empty-state copy does not.**

1. **Type**: ✅ `filled: boolean` distinguishes "created but unfilled".
2. **Server**: ✅ genuinely reachable — `createDeck` catches a `buildFillPlan` failure and inserts the deck with `filled: false` (`actions.ts:173-182`), and `fillDeck` is re-runnable (`actions.ts:412-436`, setting `filled: true` on success at `:435`).
3. **Branch**: ✅ the banner renders on `!filled && cardCount === 0` (`provenance-line.tsx:129`), gated on `!firstRun` (`builder-shell.tsx:506`). ❌ the state-15 empty copy (`99 empty slots` / `Consider is stocked either way…`) does not exist; with `filled === false` the empty state takes the first-run branch instead (`builder-shell.tsx:698`).
4. **Props**: ✅ `deckId`, `filled`, `cardCount` all passed (`builder-shell.tsx:507-511`); retry wired to `fillDeck` (`provenance-line.tsx:199-203`).

One interaction worth naming: the `!firstRun` gate means a player whose **only** deck is a failed fill sees no banner at all, because `firstRun = allDecks.length === 1 && detail.built === 0` (`page.tsx:30`) is exactly true for that deck. The retry is then unreachable until a second deck exists.

## A2 — Shopping row at 390px

✅ **REACHABLE** — 52px row, meta line, ellipsis properties all present (see §25). The width branch is the gap: the desktop row takes the phone treatment rather than the inline `24%`, and the All view's suppression is correct (`shoppingFigure === undefined`).

## A3 — in-flight at desktop

✅ **CONFIRMED DELIBERATE, no defect reported.** Built ahead of its caller by written ruling; the reason is on the prop (`role-counter-cell.tsx:16-24`). The visual property gaps inside it (denominator colour, `rec` colour, rule margins) are recorded in §16 as drawing gaps in the pre-built treatment, not as reachability defects.

## A4 — short role cell at phone

⚠️ **PARTIALLY REACHABLE — reachable, but not scoped to phone.** `justFilled` is computed (`builder-shell.tsx:543`) and threaded to every cell (`role-counter-strip.tsx:102`), and the hairline swaps in for short cells only (`role-counter-cell.tsx:66`). The gap is that `borderClass` carries no `md:` branch, so the "only phone-only addition in the handoff" also fires at desktop, where the design keeps `--border`.

---

# Cross-references to the handoff's own open calls

Findings above that the handoff already names, and which should **not** be read
as fresh implementation defects:

- **Blocker 1 (§0, Yellow verdict)** — per-card EDHREC inclusion served offline. The Shopping figures now come from the cached EDHREC payload (`actions.ts:204`, `:306-313`), so the surface draws; the blocker's underlying data question is unchanged by anything here.
- **Blocker 2** — declared state 11 unreachable. Now stale; see the state-11 note.
- **Blocker 6** — "a new deck-card flag records arrived-from-the-fill, untouched, cleared by the keep control and nothing else". Satisfied: `deck_cards.auto`, cleared only by `keepAutoCard` (`actions.ts:442`) and by removal.
- **Blocker 7** — A2's meta-line ellipsis properties "do not exist yet". **Closed** by `decklist-row.tsx:184-187`.
- **Blocker 9** — "the swept-empty branch needs a *was filled* bit; if it is expensive, the shipped first-run string ships in both places and reads slightly wrong in one of them." The bit exists and is used for the swept-empty branch. It is **not** used for §26's Shopping-empty branch or for state 15's empty copy, which is where the shipped string is still doing double duty.
- **Blocker 10** — `suggestDeck` unmodified. Holds: `getDeckSuggestions` still calls it unchanged (`actions.ts:215`); the fill uses the separate `planFill` path.

Design-side open questions, not implementation defects:

- §15's `see shelf` vs the shipped `consider →` is a copy collision between this handoff and #184's shipped strip caption. Flagging for a design ruling rather than asserting either is wrong.
- §12's whole deck-header block describes a construct that the shipped `BuilderSpine` does not match. Whether §12 is a redraw of the spine or a transcription of a canvas that assumed a different header is a design-side question; the one unambiguous omission is the status pill, which has no equivalent anywhere on the route.
