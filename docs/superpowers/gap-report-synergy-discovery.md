# Gap Report — Synergy Discovery (Agent 2, verification pass)

Design table: `docs/superpowers/design-tables/synergy-discovery.md`
Branch: `feat-synergy-discovery` worktree. Row-by-row lookup, no discovery.

---

## PASS 1 — Visual properties

### SynergyPanel — Container

**Panel outer wrapper (surface A)** — `src/components/commanders/synergy-panel.tsx:98`

| Property | Result |
|---|---|
| background `var(--surface)` | ❌ MISMATCH — design: `var(--surface)` / implementation: no background; `SynergyPanel` root is a bare `<div>` |
| border `1px solid var(--border)` | ❌ MISMATCH — design: 1px `--border` / implementation: none |
| border-radius 16px | ❌ MISMATCH — design: 16px / implementation: none |
| padding 16px 14px / 26px 28px | ❌ MISMATCH — design: 16px 14px (mobile), 26px 28px (desktop) / implementation: none |

> The whole panel card is absent. The heading + inner ownership bar sit directly on the page background (`detail.tsx:400`, `:624`).

**Panel heading "EDHREC Synergy"** — `src/components/commanders/detail.tsx:402` (mobile), `:625` (desktop)

| Property | Result |
|---|---|
| font-family `--font-serif` (Cinzel) | ✅ MATCH (`font-display`) |
| font-weight 600 | ✅ MATCH (`font-[600]`) |
| font-size 20px | ✅ MATCH |
| color `var(--fg)` | ✅ MATCH |

**Sub-caption** — `synergy-panel.tsx:195-202`

| Property | Result |
|---|---|
| font-family mono | ✅ MATCH |
| font-size 11.5px mobile / 12px desktop | ❌ MISMATCH — design: 11.5px mobile / implementation: 12px at both widths |
| color `--fg-faint` | ✅ MATCH |
| margin-top 2px | ❌ MISMATCH — design: 2px / implementation: `margin: 10px 0 10px` |
| content mobile `subcaptionMobile(n)` | ✅ MATCH |
| content desktop `subcaption(n)` | ✅ MATCH |

### Ownership headline bar

**Container** — `synergy-panel.tsx:100-107`

| Property | Result |
|---|---|
| background `--surface-raised` | ✅ MATCH |
| border 1px `--border` | ✅ MATCH |
| border-radius 10px / 12px | ✅ MATCH (`rounded-[10px] md:rounded-[12px]`) |
| padding 13px 14px / 18px 20px | ✅ MATCH |
| margin-top 16px (desktop) | ✅ MATCH |

**Headline row** — `:111` (mobile), `:127` (desktop)

| Property | Result |
|---|---|
| display flex | ✅ MATCH |
| align-items center | ✅ MATCH |
| gap 14px (desktop) | ✅ MATCH |
| margin-bottom 9px (mobile) | ❌ MISMATCH — design: 9px / implementation: none on the mobile count row |

**Count figure** — mobile `:113-117`, desktop `:128-133`

| Property | Result |
|---|---|
| mono | ✅ MATCH |
| desktop weight 600 / 30px | ✅ MATCH |
| mobile 12px label style | ✅ MATCH (`62 / 258 owned`) |
| color `--fg` | ✅ MATCH |

**"of top N" label (desktop)** — `:134-139`: mono ✅, 14px ✅, `--fg-faint` ✅.

**Progress bar** — mobile `:171-191`, desktop `:141-159`

| Property | Result |
|---|---|
| height 6px / 10px | ✅ MATCH |
| border-radius 999px | ✅ MATCH |
| track `--border` | ✅ MATCH |
| fill `--accent` | ✅ MATCH |
| overflow hidden | ✅ MATCH |
| margin-bottom 12px (mobile) | ✅ MATCH |
| flex 1 (desktop) | ✅ MATCH |

**Owned percentage label** — mono ✅, 12px ✅, `--success` ✅.

### FacetStrip — `src/components/commanders/facet-strip.tsx`

**Strip container** — `:41-47`

| Property | Result |
|---|---|
| display flex | ✅ MATCH |
| gap 6px | ✅ MATCH |
| mobile horizontal scroller | ✅ MATCH (`overflow-x-auto`) |
| desktop wraps (`flex-wrap: wrap`, overflow visible) | ❌ MISMATCH — design: wraps on desktop / implementation: `overflow-x-auto` with no `md:flex-wrap`; pills stay `shrink-0` on one scrolling line at every width |
| margin block 18px 0 10px | ❌ MISMATCH — design: 18px top / 10px bottom / implementation: no margin on the strip (10px comes from the sub-caption's own bottom margin) |

**Facet pill — unselected** — `:59-98`

| Property | Result |
|---|---|
| display inline-flex / align-items center | ✅ MATCH |
| gap 5px mobile / 6px desktop | ❌ MISMATCH — design: 6px on desktop / implementation: `gap-[5px]` at both widths |
| height 32px / 30px | ✅ MATCH (`h-8 md:h-[30px]`) |
| padding 0 11px | ✅ MATCH |
| border-radius 999px | ✅ MATCH |
| background `--surface-raised` | ✅ MATCH |
| border 1px `--border` | ✅ MATCH |
| font mono 11.5px | ✅ MATCH |
| label `--fg-body` | ✅ MATCH |
| flex none (mobile) | ✅ MATCH (`shrink-0`) |

**Facet pill — selected**: border `--accent` ✅, label `--fg` ✅, background `--surface-raised` ✅, `role="radio"` + `aria-checked` ✅.

**Facet count inside pill** — `:91-97`

| Property | Result |
|---|---|
| font-size 10.5px desktop / 10px mobile | ❌ MISMATCH — design: 10.5/10px / implementation: no size override; inherits the pill's 11.5px |
| color `--fg-locked` / `--accent` selected | ✅ MATCH |

**`All` pill dashed treatment** — `:74-78`

| Property | Result |
|---|---|
| background transparent | ❌ MISMATCH — design: transparent / implementation: `var(--surface-raised)` (same as every other pill) |
| border 1px dashed `--border-strong` | ✅ MATCH |
| label `--fg-body`, mono 11.5px | ✅ MATCH |
| selected → standard treatment | ✅ MATCH |

**Facet strip ARIA**: `role="radiogroup"` ✅, `groupAria` ✅, per-pill `role="radio"` ✅, `itemAria(facet, n)` ✅.

**Facet-empty state** — `synergy-panel.tsx:262-269`: copy ✅, mono ✅, one line / no list / no disclosure ✅. (Reachability: see Pass 2 — the branch is dead.)

### Figure Legend — `synergy-panel.tsx:208-213`

| Property | Result |
|---|---|
| mono | ✅ MATCH |
| font-size 9.5px mobile / 10px desktop | ❌ MISMATCH — design: 9.5px mobile / implementation: 10px both |
| color `--fg-locked` | ✅ MATCH |
| margin-bottom 10px / 12px | ❌ MISMATCH — design: 10/12px / implementation: 8px |
| content mobile / desktop | ✅ MATCH |
| `+pts` in `var(--accent)` | ❌ MISMATCH — design: the `+pts` token is accent / implementation: whole line renders in `--fg-locked`, no accent span |

### Column Header Row — `synergy-panel.tsx:216-259` (desktop only ✅)

| Property | Result |
|---|---|
| display flex / gap 10px | ✅ MATCH |
| padding 0 6px 6px 12px | ❌ MISMATCH — design: 6px bottom padding / implementation: `0 6px 0 12px` plus `marginBottom: 4` |
| mono | ✅ MATCH |
| font-size 9.5px | ❌ MISMATCH — design: 9.5px / implementation: 10px |
| letter-spacing 0.14em | ❌ MISMATCH — design: 0.14em / implementation: not set |
| text-transform uppercase | ✅ MATCH |
| default colour `--fg-locked` | ✅ MATCH |
| dot spacer 7px | ✅ MATCH |
| card flex:auto `--fg-locked` | ✅ MATCH |
| type 150px `--fg-locked` | ✅ MATCH |
| synergy 64px right, `var(--accent)` | ❌ MISMATCH — design: `--accent` / implementation: `--fg-locked` |
| decks 46px right `--fg-locked` | ✅ MATCH |
| toggle spacer 34px | ✅ MATCH |

### SynergyRow — Desktop — `src/components/commanders/synergy-row.tsx:107-265`

**Row container**: flex ✅, align center ✅, gap 10px ✅, min-height 44px ✅, background `--surface` ✅, border 1px `--border` ✅, radius 8px ✅, padding `0 6px 0 12px` ✅.

**List gap** — `synergy-panel.tsx:287`

| Property | Result |
|---|---|
| gap between rows 6px | ❌ MISMATCH — design: 6px / implementation: 4px |
| flex-direction column | ✅ MATCH |

**Slot 1 — Ownership dot** (`:30-45`): 7×7 ✅, radius 999 ✅, owned `--success` ✅, unowned transparent + 1px `--fg-locked` ring ✅, flex none ✅, `aria-hidden` ✅.

**Slot 2 — Card name** (`:128-144`): flex auto ✅, min-width 0 ✅, 13.5px ✅, `--fg` ✅, nowrap/hidden/ellipsis ✅, `CardDetailTrigger` ✅.

**Slot 3 — Type line** (`:180-195`): 150px ✅, flex none ✅, mono ✅, 10px ✅, `--fg-locked` ✅, ellipsis ✅, full type line under a facet ✅, bucket label under `All` ✅ (`FACET_TYPE_LABEL`).

**Slot 4 — Synergy figure** (`:198-218`): 64px ✅, flex none ✅, right ✅, mono ✅, 11.5px ✅, tabular-nums ✅. Positive `--accent` + `+n pts` / `+1 pt` ✅; negative `--fg-locked` + U+2212 ✅; absent `--fg-locked` + `—` with `aria-hidden` ✅.
⚠️ Note: a stored synergy of exactly `0` renders `+0 pts` in `--accent` (`synergy-row.tsx:163`, `:208-212` use `>= 0`). The design table says the absent glyph is never `+0`; `readSynergyCards` does not fold 0 to null the way `suggest.ts` does. Edge case, low severity.

**Slot 5 — Inclusion figure** (`:221-236`): 46px ✅, flex none ✅, right ✅, mono ✅, 11px ✅, tabular-nums ✅, `{n}%` ✅, `—` + `aria-hidden` ✅.

| Property | Result |
|---|---|
| absent-case colour | ❌ MISMATCH — design (Figure null/absent table): `--fg-locked` for the absent em dash / implementation: colour is `--fg-faint` unconditionally |

**Slot 6 — Select toggle** (`:242-264`): 34×34 ✅, flex none ✅, radius 7px ✅, border `--border-strong` ✅, transparent ✅, `--fg-faint` ✅, mono ✅, flex/center ✅, `+` ✅, `aria-pressed=false` ✅, `addAria(name)` ✅.

| Property | Result |
|---|---|
| font-size 15px rest / 13px selected (desktop) | ❌ MISMATCH — design: 15px rest, 13px selected / implementation: fixed 14px |

Selected state: border `--accent` ✅, background `color-mix(… --accent 10% …)` ✅ (oklab vs srgb — negligible), colour `--accent` ✅, glyph `✓` ✅, `aria-pressed=true` ✅, `removeAria` ✅.

**Row selected treatment**: background `--elevated-hover` ✅, border `--accent-shadow` ✅, no transition ✅.
**Row focus**: no override → global `:focus-visible` ✅.
**Row accessible name**: `rowAria(name, owned, synergy, inclusion)` ✅; all four aria strings wired ✅; visual marks `aria-hidden` ✅.

### SynergyRow — Mobile

**Row container (phone)**: flex ✅, align center ✅, min-height 52px ✅, background/border/radius/padding ✅.

| Property | Result |
|---|---|
| gap 9px | ❌ MISMATCH — design: 9px / implementation: 10px (shared with desktop) |

**Phone slot 1 — dot**: ✅ MATCH (same component).

**Phone slot 2 — name + meta column** (`:127-177`): flex auto ✅, min-width 0 ✅.

| Property | Result |
|---|---|
| display flex / flex-direction column / gap 2px | ❌ MISMATCH — design: flex column, gap 2px / implementation: plain block `<div>`; meta line uses `marginTop: 1` |

Name line: 13.5px ✅, `--fg` ✅, ellipsis ✅.
Meta line: mono ✅, 10px ✅, format `{+N pts} · edhrec {N}%` ✅, synergy `--accent` ✅, inclusion `--fg-faint` ✅, absent synergy `—` in `--fg-locked` ✅, absent inclusion `—` ✅ (via `inclusionNone`, rendered in `--fg-faint` — see below).

| Property | Result |
|---|---|
| meta line font-variant-numeric tabular-nums | ❌ MISMATCH — design: tabular-nums / implementation: not set on the phone meta line |
| absent inclusion colour `--fg-locked` | ❌ MISMATCH — design: `--fg-locked` / implementation: `--fg-faint` (`:174`) |

Type line absent on mobile ✅.

**Phone slot 3 — toggle**: 44×44 ✅, flex none ✅, radius 7px ✅, border `--border-strong` ✅, transparent ✅, `--fg-faint` ✅, mono ✅, `+` ✅, `aria-pressed` ✅.

| Property | Result |
|---|---|
| font-size 17px rest / 15px selected | ❌ MISMATCH — design: 17/15px / implementation: fixed 14px |

Selected: border/background/colour/glyph ✅.

### DisclosureControl — `synergy-panel.tsx:306-334`

| Property | Result |
|---|---|
| display flex / align + justify center | ✅ MATCH |
| gap 8px | ❌ MISMATCH — design: 8px / implementation: `gap-[6px]` |
| min-height 44px | ✅ MATCH (`height: 44`) |
| width 100% | ✅ MATCH |
| border `1px dashed var(--border-strong)` (full box) | ❌ MISMATCH — design: full dashed border / implementation: `border-0` plus `border-top: 1px dashed var(--border-strong)` only |
| border-radius 8px | ❌ MISMATCH — design: 8px / implementation: not set |
| mono 12px | ✅ MATCH |
| colour `--accent` | ✅ MATCH |
| background transparent | ✅ MATCH |
| content `showAll(n, facet)` | ✅ MATCH |
| `aria-expanded` / `aria-controls` / `aria-label` | ✅ MATCH |
| desktop `→` glyph, absent on mobile | ✅ MATCH (`!isPhone && <span aria-hidden> →</span>`) |
| expanded copy `showFewer` + `showFewerAria` | ✅ MATCH |
| focus stays on disclosure | ✅ MATCH (no focus move) |

**Expanded scroll container** (`:279-289`): max-height 480px ✅, overflow-y auto ✅, no second cap ✅, collapse discards scroll ✅ (`selectFacet` collapses; the container unmounts its scroll box), facet change collapses + preserves selection ✅.

### SelectionPromiseLine — `src/components/commanders/synergy-selection.tsx:88-134`

| Property | Result |
|---|---|
| mono | ✅ MATCH |
| desktop 10.5px | ✅ MATCH |
| colour `--fg-body` | ✅ MATCH |
| text-align center | ❌ MISMATCH — design: centred / implementation: no alignment set (left), and the clear control is explicitly `text-left` |
| line-height 1.5 | ❌ MISMATCH — design: 1.5 / implementation: not set |
| margin-top 12px | ❌ MISMATCH — design: 12px / implementation: none; spacing comes from the parent column's `gap-[16px]` |
| zero selection → locked `stickyPromise` / `seedNote`, `--fg-locked` | ✅ MATCH (component returns null; `detail.tsx:561-571` / `:450-459` keep the locked copy) |
| non-zero, all owned → `select.promise(...)` | ✅ MATCH |
| `{total}` rendered in `var(--fg)` | ❌ MISMATCH — design: the total is `--fg` / implementation: the whole line is `--fg-body`, no highlighted span |
| unowned clause + `--warning` | ✅ MATCH |
| clamp case `promiseFull(picked)` | ✅ MATCH |
| mobile 12px `--fg-body` in the sticky bar | ✅ MATCH |

**Sticky bar (phone)** — `detail.tsx:442-467`

| Property | Result |
|---|---|
| border-top 1px `--border-strong` | ✅ MATCH |
| background `--surface-raised` | ❌ MISMATCH — design: `--surface-raised` / implementation: `var(--surface-rail)` |
| padding 12px 16px 24px | ✅ MATCH |
| flex / align center / gap 12px | ✅ MATCH |
| "READY TO BUILD" label mono 10px `--fg-faint` | ✅ MATCH |
| build button bg `--accent`, fg `#14110E`, 600, 14px, radius 8, flex none | ✅ MATCH (`--bg` token stands in for `#14110E`) |
| build button padding 12px 18px | ❌ MISMATCH — design: 12px 18px / implementation: `p-[12px_20px]` |

**`Clear selection · N` control** — `synergy-selection.tsx:124-131`

| Property | Result |
|---|---|
| mono 11px `--accent` | ✅ MATCH |
| text-align center | ❌ MISMATCH — design: centred / implementation: `text-left` |
| margin-top 8px | ❌ MISMATCH — design: 8px / implementation: parent `gap-[4px]` |
| content `select.clear(n)` + `clearAria(n)` | ✅ MATCH |
| renders only when selection non-empty | ✅ MATCH |

### LastSlotStrip — `src/components/decks/last-slots-strip.tsx:168-274`

| Property | Result |
|---|---|
| background `--surface-raised` | ❌ MISMATCH — design: `--surface-raised` / implementation: `var(--surface-rail)` |
| border 1px `--border-strong` | ✅ MATCH |
| border-radius 10px | ✅ MATCH |
| padding 13px 14px / 14px 16px | ❌ MISMATCH — design: 13px 14px on mobile / implementation: `px-[16px] py-[14px]` at both widths |
| margin-bottom 16px (desktop) | ❌ MISMATCH — design: 16px / implementation: `mb-[10px]` (and no `md:` variant) |
| unmounts at 0 open slots | ✅ MATCH (`:94`) |

**Strip heading** (`:177-182`): mono ✅, 10.5px ✅, 0.14em ✅, uppercase ✅, `--accent` ✅, content `heading(n)` ✅.

| Property | Result |
|---|---|
| margin-bottom 4px | ❌ MISMATCH — design: 4px / implementation: `mb-[6px]` |

**Strip sub-caption** (`:186-192`): mono ✅, 10.5px ✅, `--fg-faint` ✅, mobile/desktop copy split on one element with responsive spans ✅ (no subtree duplication).

| Property | Result |
|---|---|
| margin-bottom 11px | ❌ MISMATCH — design: 11px / implementation: `mb-[12px]` |

**Fill controls layout** — `:198`, `:253`

| Property | Result |
|---|---|
| single flex container, column mobile / row desktop, gap 8px / 10px, wrap, align center | ❌ MISMATCH — design: A and B share one flex row on desktop / implementation: A + owned-note live in one flex container (`:198`), B is a separate sibling block (`:253`) with `mt-[10px]`, so B always drops below A even at desktop width |
| mobile gap 8px | ❌ MISMATCH — design: 8px / implementation: `gap-[10px]` inside the A row and `mt-[10px]` before B |

### FillControlA — Owned fill — `last-slots-strip.tsx:204-223`

| Property | Result |
|---|---|
| display flex/inline-flex, centred, min-height 44px mobile | ✅ MATCH |
| border 1px `--accent` | ✅ MATCH |
| border-radius 8px | ✅ MATCH |
| background transparent | ✅ MATCH |
| colour `--accent` | ✅ MATCH |
| font-size 14px mobile / 13px desktop | ❌ MISMATCH — design: 14px on mobile / implementation: `text-[13px]` at both widths |
| font-weight 600 | ✅ MATCH |
| padding 10px 16px desktop / full-width mobile | ✅ MATCH |
| width 100% mobile / auto desktop | ✅ MATCH |
| content `fillOwned(n)` where n = what it can place | ✅ MATCH (`ownedPlaces = min(openSlots, ownedCandidates)`) |
| aria-label `fillOwnedAria(n)` | ✅ MATCH |
| in-flight border `--accent-shadow`, colour `--fg-faint`, `fillingRows`, disabled | ✅ MATCH |
| in-flight: B disabled, stays mounted | ✅ MATCH (`busy`) |
| in-flight: C disabled | ❌ MISMATCH — design: Clear-all-auto disabled during A's flight / implementation: `ClearAutoButton`'s `pending` is wired to `sweepPending` only (`builder-shell.tsx:844`); the strip's in-flight state never reaches it |
| absent (not disabled) at states 4/5/6/9 | ✅ MATCH (`ownedCandidates > 0` gate) |
| refusal: control present + enabled, error beneath, other control enabled | ✅ MATCH |

### FillControlB — Buying top-up — `last-slots-strip.tsx:254-270`

| Property | Result |
|---|---|
| display flex/inline-flex, centred, min-height 44px mobile | ✅ MATCH |
| gap 8px | ⚠️ approximate — implementation uses a literal `" "` between label and badge rather than a flex gap |
| border 1px `--border-strong` | ✅ MATCH (GhostButton `GHOST`) |
| border-radius 8px | ✅ MATCH |
| background transparent | ✅ MATCH |
| label colour `--fg` | ✅ MATCH |
| font-size 14px mobile / 13px desktop | ❌ MISMATCH — design: 14px mobile / implementation: `text-[13px]` both |
| padding 10px 16px / full width mobile | ✅ MATCH |
| content `topUp` + `topUpAria(n)` | ✅ MATCH |
| count badge mono 11px `--warning`, open-slot count | ✅ MATCH |
| in-flight `fillingRows`, disabled; A and C disabled | ⚠️ PARTIAL — A ✅ disabled; C ❌ not disabled (same wiring gap as above) |
| absent at state 9 / state 12 | ✅ MATCH (`unownedCandidates > 0` gate + strip unmount) |
| refusal: present + enabled, `topUpFailed` | ✅ MATCH |

### ShortfallLine — `last-slots-strip.tsx:56-86`

| Property | Result |
|---|---|
| flex / align flex-start | ✅ MATCH |
| gap 10px desktop / 9px mobile | ✅ MATCH |
| background `--surface-sunken` | ✅ MATCH |
| border 1px `--border` | ✅ MATCH |
| border-left 3px `--accent` | ✅ MATCH |
| border-radius 9px | ✅ MATCH |
| padding 11px 13px | ✅ MATCH |
| margin-bottom 12px | ✅ MATCH |
| `i` disc 18/20px, radius 999, border `--accent-shadow`, `--accent`, mono 10/11px, flex none | ✅ MATCH |
| text 12.5px `--fg-body` line-height 1.6, `short(total, n)` | ✅ MATCH |
| accent, not warning | ✅ MATCH |

### ConsiderSynergyShelf — `src/components/decks/consider-panel.tsx:125-224`

| Property | Result |
|---|---|
| heading mono | ✅ MATCH |
| heading font-size 11px | ❌ MISMATCH — design: 11px / implementation: `text-[10.5px] md:text-[11px]` (10.5px on mobile) |
| heading letter-spacing 0.14em / uppercase / `--accent` | ✅ MATCH |
| meta mono | ✅ MATCH |
| meta font-size 11px | ❌ MISMATCH — design: 11px / implementation: `text-[10px] md:text-[11px]` (10px on mobile) |
| meta colour `--fg-faint` | ✅ MATCH |
| heading content `shelf.label(commander)` | ✅ MATCH |
| meta content `shelf.meta(n)` | ✅ MATCH |
| `SHELF_CAP` 12 | ✅ MATCH |
| sorted by synergy desc, below coverage shelves, above unowned append | ✅ MATCH (`:65-77`) |
| grid `repeat(6, 1fr)` desktop, gap 14px | ✅ MATCH (`md:grid-cols-6 md:gap-[14px]`) |
| mobile 2-column shipped grid | ✅ MATCH |

**SuggestionTile lift line** — `suggestion-tile.tsx:135-155`

| Property | Result |
|---|---|
| mono 9.5px | ✅ MATCH |
| colour `--accent-shadow` (present case) | ✅ MATCH |
| content `addPanelCopy.tile.lift` | ✅ MATCH |
| absent content `shelf.noSynergy` | ✅ MATCH (gated on `showNoSynergy`, passed only from the synergy shelf) |
| ownership gate removed — prints regardless of `suggestion.owned` | ✅ MATCH (`Evidence` no longer checks `owned`; the no-inclusion sentence renders in place of the bar row, not instead of the component) |
| always rendered when the figure is present | ✅ MATCH (negative figures take their own branch at `:142-147`) |

⚠️ Note: the negative-figure branch paints `--fg-faint`, not `--accent-shadow`. The table lists one colour for the lift line; treating a negative as a dimmer variant looks deliberate but is not in the table.

### ClearAllAuto — `src/components/decks/clear-auto.tsx:27-51`

| Property | Result |
|---|---|
| location: decklist toolbar, right-aligned | ✅ MATCH |
| mono 12px | ✅ MATCH |
| ghost: 1px `--border-strong`, transparent | ✅ MATCH |
| border-radius 8px | ✅ MATCH |
| colour `var(--fg)` | ❌ MISMATCH — design: `--fg` / implementation: `text-fg-body` |
| padding 8px 13px | ❌ MISMATCH — design: 8px 13px / implementation: `px-[12px] py-[6px]` |
| content `auto.clearAll` | ✅ MATCH (with a responsive short form in one button — no duplication) |
| absent at 0 auto cards | ✅ MATCH |
| `keptNote` stays at 0 auto cards | ❌ MISMATCH — `keptNote` is rendered *inside* `ClearAutoButton`, which returns null at `count === 0`, so the note disappears with the control (see Pass 2 state 7) |
| disabled during A or B flight | ❌ MISMATCH — see FillControlA row |

### MutationError — `src/components/decks/mutation-error.tsx`

| Property | Result |
|---|---|
| font-family mono | ❌ MISMATCH — design: `var(--font-mono)` / implementation: no mono class (inherits sans) |
| font-size 11px | ✅ MATCH (11px mobile, 11.5px desktop) |
| colour `var(--danger)` | ❌ MISMATCH — design: `--danger` (`#C6533F`) / implementation: `var(--warning)` |
| position below the clicked control | ✅ MATCH |
| other control stays enabled | ✅ MATCH |

### Responsive-subtree duplication check

- `facet-strip.tsx:84-86` — the "Instants & sorceries" / "Instants" label pair is a `md:hidden` + `hidden md:inline` span **inside a single button**. One interactive control. ✅ acceptable.
- `last-slots-strip.tsx:190-191` — same pattern for the caption, non-interactive. ✅ acceptable.
- `clear-auto.tsx:46-47` — same pattern inside one button. ✅ acceptable.
- ❌ **`detail.tsx` duplicates the entire synergy surface.** `SelectableSynergyPanel` is mounted twice (`:411` inside the `sm:hidden` mobile column, `:633` inside the `hidden sm:grid` desktop grid), `SelectableSynergySelection` twice (`:460`, `:574`), and `SelectableBuildButton` twice (`:462`, `:554`). Every synergy row's select toggle therefore exists twice in the DOM, as do both "Clear selection" buttons and both Build links. Selection state is shared through the provider so behaviour is consistent, and this follows the page's pre-existing mobile/desktop split — but it is exactly the duplication class the brief calls out, and it doubles the interactive-control count on the largest list on the page.

---

## PASS 2 — State reachability

### Fill Controls States

**State 1 — n=31, owned≥31** — ✅ REACHABLE. `openSlots` from `99 - detail.built` (`app/decks/[id]/page.tsx:26`); `ownedCandidates` via `planLastSlots({ownedOnly:true})` (`:48`); `unownedCandidates` via `countLastSlotsUnowned` (`:58`). Both props typed on `LastSlotsStripProps` and threaded through `builder-shell.tsx:574-583`. A, B and C all render.

**State 2 — shallow owned pool (n=31, owned=12)** — ✅ REACHABLE. `ownedPlaces = Math.min(openSlots, ownedCandidates)` (`last-slots-strip.tsx:122`) so A's label states 12, not the gap; B still reads the full open-slot count.

**State 3 — A in flight** — ⚠️ PARTIALLY REACHABLE. A disabled + `fillingRows` ✅; B disabled and still mounted ✅ (`busy`). **C is not disabled**: `ClearAutoButton`'s `pending` prop is `sweepPending` (`builder-shell.tsx:844`), and `LastSlotsStripInner`'s `inflight` never leaves the strip — there is no callback or lifted state connecting them.

**State 4 — A settled at 99** — ✅ REACHABLE. `fillLastSlots` calls `revalidatePath` (`actions.ts:722`); the re-render gives `built = 99`, so `openSlots <= 0` unmounts the strip (`last-slots-strip.tsx:94`) and `ownedCandidates`/`unownedCandidates` recompute to 0. C stays with the new count.

**State 5 — A settled short** — ✅ REACHABLE. `fillLastSlotsOwned` returns `shortfall`; `setSettled` renders `ShortfallLine` (`:242-244`); B remains because `unownedCandidates > 0`; A goes absent on the revalidated render when `ownedCandidates` reaches 0.

**State 6 — 0 owned candidates from start** — ✅ REACHABLE. `ownedCandidates > 0` gate (`:197`) makes A absent rather than disabled; B unaffected.

**State 7 — 0 auto cards, `keptNote` stays** — ⚠️ PARTIALLY REACHABLE. C is correctly absent at `count === 0` (`clear-auto.tsx:28`), but the `keptNote` span lives inside the same component *after* that early return (`:32-36`), so the note vanishes with the control. The design row requires the note to survive. `keptCount` is computed and passed (`builder-shell.tsx:843`), so only the component structure blocks it.

**State 8 — B in flight** — ⚠️ PARTIALLY REACHABLE. B shows `fillingRows` and is disabled ✅; A disabled ✅; **C not disabled** (same wiring gap as state 3).

**State 9 — deck already at 99** — ✅ REACHABLE. `openSlots > 0` short-circuits the synergy read (`page.tsx:37`), both candidate counts are 0, the shell's `(ownedCandidates > 0 || unownedCandidates > 0)` gate (`builder-shell.tsx:574`) and the strip's own guard both unmount it. C present when auto > 0.

**State 10 — either write refused** — ✅ REACHABLE. `fillLastSlotsOwned`/`fillLastSlotsUnowned` return `{ok:false, message}` (`actions.ts:734-766`); per-control error state (`ownedError` / `unownedError`) renders `MutationError` beneath only the clicked control; `busy` is cleared before the error is set, so both controls stay enabled.

**State 11 — EDHREC degraded (synergy null on all rows)** — ✅ REACHABLE. `orderBySynergy` (`synergy-cards.ts:38-52`) falls back to inclusion desc then name when both figures are null; A and B still render because candidacy does not read `synergyPts`.
⚠️ Note on the panel side: `detail.tsx:399` / `:623` gate the panel on `c.fitSynergy !== null && c.edhrecTotal !== null`. If a commander is indexed but every row's synergy is null, whether the panel renders depends on `fitSynergy` staying non-null — not verifiable from this branch's files. Flagged as an assumption, not a gap.
⚠️ Consider-shelf side: the synergy shelf is added only when `synergySorted.some(s => s.synergyFigure != null)` (`consider-panel.tsx:68`), so on a fully degraded commander the shelf is absent rather than degraded. Consistent with "ordering falls back" applying to the panel only, but worth a Design ratification.

**State 12 — 0 unowned candidates** — ✅ REACHABLE. `countLastSlotsUnowned` (`last-slots.ts:36-44`) intersects the top-up plan's ids with the owned set rather than differencing two capped counts — the honest figure — and B's `unownedCandidates > 0` gate makes it absent.

### Edge counts (DENSITY)

**0 rows in facet → `facet.empty(facet)`** — ❌ NOT REACHABLE. `FacetStrip` omits any pill whose count is 0 (`facet-strip.tsx:52`), and both the pill counts and `facetCards` derive from the same post-exclusion `cards` array (`synergy-panel.tsx:59`, `:77`). Every selectable facet therefore has ≥1 row, and the default facet is `creature` only when `counts.creature > 0`, else `all`. The panel itself is gated on `synergyCards.length > 0` (`detail.tsx:399`, `:623`), so `all` cannot be 0 either. The `facetCount === 0` branch at `synergy-panel.tsx:262-269` is dead code and the `facet.empty` string is unreachable — the same defect class as the shelf filter that hid the "no synergy figure" line. Either the strip should render zero-count pills (disabled or not) or the empty line and copy string should be dropped.

**1–6 rows** — ✅ REACHABLE. `canExpand = facetCount > restingCap` is false at both caps; all rows drawn, no disclosure.

**7–10 rows** — ✅ REACHABLE. `RESTING_CAP_DESKTOP = 10` / `RESTING_CAP_PHONE = 6`; desktop shows all, phone shows 6 + disclosure.

**11+ rows** — ✅ REACHABLE. Capped at 10/6, disclosure present, expanded list scrolls (`scrollable` → `maxHeight: 480px`).

**258 (All facet)** — ✅ REACHABLE. Same path; no expanded cap.

### Figure null / absent cases

| Case | Result |
|---|---|
| Synergy absent (`synergy` null in DB) | ✅ REACHABLE — `synergy-read.ts:69` maps null → null; `SynergyCard.synergyPts` is `number \| null`; row branches at `synergy-row.tsx:72-80` and `:158-172`; aria says "no EDHREC figure" |
| Synergy negative | ✅ REACHABLE — preserved through `orderBySynergy` (sorts above nulls) and `synergyNegative` |
| Synergy positive singular (`+1 pt`) | ✅ REACHABLE — `synergyCopy.figure.synergy` branches on `pts === '1'` |
| Synergy positive plural | ✅ REACHABLE |
| Inclusion absent | ✅ REACHABLE — independently nullable field, own branch (visual colour gap noted in Pass 1) |
| Inclusion present | ✅ REACHABLE |
| Per-row null (one figure only) | ✅ REACHABLE — the two branches are independent; neither suppresses the other, and `excludeCoveredRoleCards` filters on ownership only, never on a figure |
| Panel-level absent ("No synergy data") | ✅ REACHABLE — `FitHero` prints it when `c.synergyState === "absent"` (`detail.tsx:183-213`); the panel is not drawn because `fitSynergy`/`edhrecTotal` are null |
| Panel-level degraded ("Synergy data unavailable" + Try again) | ✅ REACHABLE — same `FitHero` branch on `synergyState === "degraded"`; retry lives on `CoverageSection` |

### Consider shelf — "no synergy figure" line

✅ REACHABLE. `buildShelves` sorts `owned` by `synergyFigure ?? -Infinity` and keeps null-figure cards on the shelf (`consider-panel.tsx:65-70`) rather than filtering them out; `showNoSynergy` is passed only for `shelf.key === "synergy"` (`:218`) and `Evidence`'s third branch prints `shelf.noSynergy` (`suggestion-tile.tsx:148-153`). This is the previously-fixed defect; verified fixed.
⚠️ Caveat: null-figure cards sort last, so with more than 12 owned suggestions the line is only visible once the shelf is expanded. Behavioural, not a gap.

### `?select=` selection carry (supporting path)

✅ REACHABLE end-to-end: `SelectableBuildButton` writes `&select=` (`synergy-selection.tsx:169-171`) → `/decks` appends via `selectParamSuffix` → `/decks/new` parses via `parseSelectParam` → `CreatePreFilled` passes `selectedOracleIds` to `createDeck` (`create-pre-filled.tsx:60`). One sanitiser at all three layers.

---

## Resolution (confirm pass, 2026-09-03)

Agent 3 confirmed all three state-reachability gaps and 37 of the 41 visual gaps
as fixed, with mutation proofs on each state gap. The residue was closed or
deferred as follows.

### Closed after the confirm pass

1. **Panel outer wrapper** — `detail.tsx` now gives the synergy section its card
   treatment at both callsites: `background: var(--surface)`,
   `border: 1px solid var(--border)`, `border-radius: 16px`, and the
   width-specific padding the table asks for (`16px 14px` on the phone
   callsite, `26px 28px` on the desktop one). The two callsites are already
   split by width, so no duplicated subtree was introduced.
2. **Figure legend `+pts` accent token** — the legend copy is now split into
   `legendToken` and `legendRest` / `legendRestMobile`, letting the `+pts`
   substring render as its own span in `var(--accent)` while the rest of the
   line stays `var(--fg-locked)`. Locked by a test.

### Deferred with cause

3. **ConsiderSynergyShelf heading font-size (mobile)** — the table asks for 11px
   at both widths; the implementation is `text-[10.5px] md:text-[11px]`. That
   heading element is shared by every Consider shelf, and its 10.5px mobile size
   was specified and shipped by the Consider design (#158, PR #175). Raising it
   here would silently restyle four shelves outside this feature's scope for a
   0.5px difference, and scoping the override to the synergy shelf alone would
   put a conditional font-size on a shared heading. Left for Design to
   reconcile across the two tables.

Also still deferred from the verify pass, unchanged: the four out-of-scope
visual gaps and the `detail.tsx` responsive duplication, all of which predate
this branch (evidence recorded in the verify section above).
