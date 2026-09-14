# Commanders · list windowing (#52) — pre-implementation property table

Source of truth: `design/design_handoff_the99_commanders_windowing/`.
Citations: `RM:<line>` = addendum `README.md`; `CV:<line>` = `The 99 - Commanders · Windowing.dc.html`;
`RD:<section>` = `READINESS.md`; `PA:<line>` = parent handoff `design_handoff_the99_commanders/README.md`.

No implementation exists. This table is the deterministic checklist the implementer builds against
and the verifier checks the built UI against.

Canvas constants (fabricated mock data, not production values): `batch = 25`, `total = 214`,
`shortTotal = 24`, `filtTotal = 96`, `shown1 = 25`, `shown2 = 50`, `firstNew = 26`,
`remaining1 = 189`, `remaining2 = 164`, `filtRemaining = 71` (CV:611-613, CV:655-670).

---

## 1 · Element property table

Token column convention: every theme-aware hex must ship as the named `var(--*)` from
`src/app/globals.css`; raw hexes live only in that file. `✅` = token exists and matches exactly.
`❌ NO TOKEN` = finding, see §5.

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| **E1** | Reveal control container — **desktop**. `<button>`, full width of the list column, sits in the card stack's own gap so it reads as the list's last row. | n/a (container); `font-family: 'IBM Plex Sans'` set on the button → `var(--font-sans)` | bg `#1E1A15` ✅ `--surface`; border `1px solid #3A3229` ✅ `--border-strong` | `padding: 15px 20px`; `12px` gap above (the stack's own `gap`, not extra margin) | `width: 100%` of list column; `border-radius: 8px`; height = content (label 14px + 15px padding ×2) | rest / hover (E1a) / focus-visible (E1b) / working (E1c); removed entirely when exhausted | RM:129, RM:50-58, CV:57 |
| **E1a** | — desktop **hover** | unchanged | bg `#211C15` ✅ `--elevated-hover`; border `1px solid #4A4033` ✅ `--border-dashed`; count → `#A89B84` ✅ `--fg-muted`; chevron → `#C9A24B` ✅ `--brass` | unchanged | unchanged | same hover pair as the recommendation card | RM:130, CV:65-70 |
| **E1b** | — desktop **focus-visible** | unchanged | `outline: 2px solid #C9A24B` ✅ `--brass`; `outline-offset: 2px`. **Hover treatment applied alongside** (bg `#211C15`, border `#4A4033`, count `#A89B84`, chevron brass) | unchanged | outline 2px, offset 2px | keyboard only (`:focus-visible`, not `:focus`) | RM:131, RM:113, CV:73-78 |
| **E1c** | — desktop **working** ("Revealing…") | label Plex Sans 600/14px; count Plex Mono 11.5px | bg `#1B1711` ❌ **NO TOKEN**; border stays `#3A3229` ✅ `--border-strong` (CV:81); label `#8E8269` ✅ `--fg-faint`; count `#6E6353` ❌ **NO TOKEN** (nearest is `--fg-locked #6A6152`, not equal) | unchanged | unchanged; **no chevron** in this state (CV:81-85) | `cursor: default`; should never be perceptible client-side (one frame at most) | RM:132, CV:80-85 |
| **E2** | Control **label** (desktop) | Plex Sans, weight **600**, **14px** | `#EDE6D8` ✅ `--fg` | inside E1's flex row, `gap: 12px`, `align-items:center`, `justify-content:center` | — | text swaps to `Revealing…` `#8E8269` in working | RM:129, CV:58-59 |
| **E3** | Control **remaining count** (desktop) | IBM Plex Mono, **11.5px**, no letter-spacing specified | rest `#8E8269` ✅ `--fg-faint`; hover/focus `#A89B84` ✅ `--fg-muted`; working `#6E6353` ❌ NO TOKEN | second item in the `gap:12px` row | — | rest / hover / focus / working | RM:129-132, CV:60,68,76,84 |
| **E4** | Control **chevron** `↓` (desktop) | `font-size: 13px`, `line-height: 1` | rest `#8E8269` ✅ `--fg-faint`; hover & focus `#C9A24B` ✅ `--brass` | third item in the `gap:12px` row | 13px glyph | rest / hover / focus; **absent in working** | RM:129-130, RM:57-58, CV:61,69,77 |
| **E5** | Reveal control container — **mobile**. Full-bleed inside the list's `14px` horizontal padding. | `font-family: 'IBM Plex Sans'` | bg `#1E1A15` ✅ `--surface`; border `1px solid #3A3229` ✅ `--border-strong` | `padding: 14px 16px`; internal `gap: 3px` (column); **`24px` clearance above the bottom tab bar** | `width:100%`; `min-height: 52px`; `border-radius: 8px`; two-line column stack, `align-items:center` | same four states as desktop; never sticky, never floating | RM:133, RM:64-65, CV:102-107 |
| **E6** | Mobile control **label** | Plex Sans 600, **14.5px** (larger than desktop so it holds AA at tap scale) | `#EDE6D8` ✅ `--fg` | line 1 of the stack | — | rest/hover/focus/working as E2 | RM:133, CV:105 |
| **E6a** | Mobile chevron — **inline in the label string**, not a separate node: the label renders `Show 25 more ↓`. | inherits label (14.5px/600) | inherits `#EDE6D8` ✅ `--fg` — note it is **not** independently `#8E8269` on mobile | — | — | see §5 finding 6 (mobile chevron colour/structure differs from desktop) | CV:105, CV:158, CV:303, CV:349 |
| **E7** | Mobile control **count** | Plex Mono, **11px** (desktop is 11.5px) | `#8E8269` ✅ `--fg-faint` | line 2 of the stack, `3px` below the label | — | hover/focus deltas mirror desktop | RM:133, CV:106 |
| **E8** | **End-of-ranking rule** — container (replaces the control when exhausted) | — | — | desktop: `16px` above the last card (RM:134); canvas desktop `padding: 16px 0 0`, mobile `padding: 14px 0 4px`; internal `gap: 14px` desktop / `10px` mobile | full width of the list column; `display:flex; align-items:center` | only state — renders exclusively when `shown >= filtered.length` and the list is non-empty | RM:134, RM:92-96, CV:512-518, CV:452-458 |
| **E9** | End-of-ranking **hairlines** (two, one each side) | — | `#2A241D` ✅ `--border` (also `--elevated`) — note RM:134 names `#2A241D` and the canvas agrees | — | `flex:1; height:1px` each | static | RM:134, CV:513, CV:517 |
| **E10** | End-of-ranking **diamonds** (two, flanking the string) | — | `#3A3229` ✅ `--border-strong` | between hairline and text, in the container `gap` | **desktop `6px × 6px`**, `transform: rotate(45deg)`; **mobile `5px × 5px`** (CV:454) — RM:134 says `6px` unqualified | static | RM:134, CV:514,516 / CV:454,456 |
| **E11** | End-of-ranking **mono string** | IBM Plex Mono, **desktop 10.5px**, **mobile 9.5px** (CV:455); `letter-spacing: 0.16em`; `text-transform: uppercase` | `#8E8269` ✅ `--fg-faint` | centred between the diamonds | — | text is `END OF RANKING · {N} OF {N}` where both N = filtered total | RM:134, RM:94, CV:515, CV:455 |
| **E12** | **Header window count — desktop**, appended to the existing `Ranked for your collection` meta line, **ahead of** `Order: Fit ↓ · fixed` | Plex Mono **11px**, `letter-spacing: 0.12em`, `text-transform: uppercase` | surrounding meta `#8E8269` ✅ `--fg-faint`; **live figures in `#C6B79A`** ✅ `--fg-body` | on its own line under `Ranked for your collection` (RM:135); canvas state 1 renders it inline in one line (CV:187), state 1b on a second line with `margin-top: 7px` (CV:238) | — | three forms: hidden-remainder / exhausted / short-list-omitted (see S6–S8) | RM:135, CV:187, CV:238, CV:365, CV:467, CV:545 |
| **E13** | **Header window count — mobile**, its own row under the color filter, laid out `space-between` with `Fit ↓ · fixed` on the right | Plex Mono **10.5px**, no uppercase transform in canvas | text `#8E8269` ✅ `--fg-faint`; the `{shown}` figure is `<b>` `#C6B79A` ✅ `--fg-body`, `font-weight:600` | `margin-top: 9px` in state 1 (CV:140); own row in 1b (CV:285) | — | same three forms as E12 | RM:135, CV:140, CV:285, CV:331, CV:430 |
| **E14** | **Visually-hidden live region** | n/a (screen-reader only) | n/a | n/a — must be visually hidden without `display:none`/`visibility:hidden` (those suppress announcement) | zero visual footprint | `aria-live="polite"`, `aria-atomic="true"`; text set only after a reveal | RM:137, RM:112, CV:117 |
| **E15** | **Focus target on reveal** — the `<li>` wrapping the first revealed card | inherits card | focus ring `2px solid #C9A24B` ✅ `--brass`, `outline-offset: 2px` | — | — | `tabIndex={-1}`; receives `.focus()` in the click handler; ring visible after keyboard activation | RM:109-111, RD:§Eng note 3, CV:400, CV:673-676 |
| **E16** | **Join seam** (ranks 25 → 26) | — | — | — | — | **Deliberately nothing**: no divider, no batch label, no animation. The new cards simply extend the stack at the existing `12px` (desktop) / `10px` (mobile) gap. | RM:87-90, CV:396-397 |
| **E17** | **Top fade** in every frame | — | `linear-gradient(#14110E, rgba(20,17,14,0))` | — | 34–36px tall | **Mockup device only — do NOT build.** | RM:136, CV:433, CV:546 |

**Row count: 17 elements (20 rows incl. sub-states).**

---

## 2 · Named states

| # | State | Trigger | Visual change | Source |
|---|---|---|---|---|
| **N1** | Control · **rest** | `shown < filtered.length` and `filtered.length > 0` | bg `#1E1A15`, border `#3A3229`, label `#EDE6D8`, count `#8E8269`, chevron `#8E8269` | RM:129, CV:57-61 |
| **N2** | Control · **hover** | pointer over the button | bg `#211C15`, border `#4A4033`, count `#A89B84`, chevron `#C9A24B`; label unchanged | RM:130, CV:65-70 |
| **N3** | Control · **focus-visible** | keyboard focus (`:focus-visible`) | outline `2px #C9A24B` at `2px` offset, **plus** the full N2 hover treatment | RM:131, RM:113, CV:73-78 |
| **N4** | Control · **working** | activation, while the slice recomputes | bg `#1B1711`, label `#8E8269` reading `Revealing…`, count `#6E6353` reading `{next} of {total}`, chevron removed, `cursor:default` | RM:132, CV:80-85 |
| **N5** | Control · **exhausted** | `shown >= filtered.length` | Control is **removed from the DOM** (not disabled) and E8–E11 render in its place | RM:92-96, CV:88-96 |
| **N6** | **1 · Default** | first render; unfiltered; `total = 214`, `shown = 25` | 25 cards, control at the end reading `Show 25 more` / `189 remaining`, header `25 shown · 189 more below` | RM:18, CV:129-160 (mobile), CV:170-225 (desktop) |
| **N7** | **1b · Default, colour filter active** | WUBRG filter applied (`?c=B`, `filtered = 96`), `shown` reset to 25 | Shipped filter count `Showing 96 of 214` **and** window count `25 shown · 71 more below` render together; control reads `71 remaining`; ranks stay global (sequence skips rank 25) | RM:20-21, RM:84, RD:§B1/B2, CV:231-310 |
| **N8** | **2 · Mid-list** | one activation of the control; `shown = 50` | 50 cards; control still present, count now `164 remaining`; header `50 shown · 164 more below`; no seam at the 25→26 join; focus ring on the rank-26 card; live region has spoken | RM:22, CV:321-415 |
| **N9** | **3 · Exhausted** | `shown >= filtered.length` (canvas: all 214 shown) | Control gone; end-of-ranking rule renders; header becomes `all 214 shown` | RM:23, CV:420-520 |
| **N10** | **4 · Short list** | `filtered.length <= REVEAL_STEP` (canvas: 24 generals) | Control **never renders**; **no end-of-ranking rule** either (canvas state 4 ends with a plain `22px` spacer, CV:503); header window count **omitted entirely** — the meta line is exactly the shipped `Ranked for your collection · Order: Fit ↓ · fixed` | RM:24, RM:84-85, CV:503, CV:545 |
| **N11** | **Focus-on-reveal** | control activated by pointer or keyboard | Focus moves to the `<li>` at 0-based index `shownAfter − REVEAL_STEP` (`tabIndex={-1}`); brass `2px` ring at `2px` offset appears on that row. Scroll position is **not** otherwise changed | RM:109-111, RD:§Eng note 3, CV:400 |
| **N12** | **Live-region announcement** | same activation | Visually-hidden `aria-live="polite" aria-atomic="true"` node's text content is replaced with the announcement string (S12) | RM:112, RM:137, CV:409-411 |
| **N13** | **Filter-change reset** | WUBRG filter added, changed or cleared | `shown` returns to `REVEAL_STEP`; all counts recompute against the **new filtered length**; rank numerals unchanged (still global Fit ranks); control reappears if it had been exhausted | RM:145-149, CV:591 |
| **N14** | **Empty / filtered-to-zero** | `filtered.length === 0` | The `<ul>` is replaced by the shipped `FilteredEmpty` / no-candidates branch; **no control, no end-of-ranking rule, no window count** | RM:156, RD:§Verified, CV:599 |

**Row count: 14 named states.**

---

## 3 · Strings

`R` = remaining = `filtered.length − shown`. `F` = `filtered.length` (the colour-filtered length, or the
full length when no filter is active). `T` = the unfiltered total. **Every window figure counts against
`F`, never `T`** (RM:84, RM:147).

| # | String (verbatim, final copy) | Template | Figures computed against | Source |
|---|---|---|---|---|
| **S1** | `Show 25 more` — desktop button label | `Show {REVEAL_STEP} more` | constant `REVEAL_STEP`; **never `min(REVEAL_STEP, R)`** — the handoff shows no clamped variant | RM:77, CV:59 |
| **S2** | `Show 25 more ↓` — mobile button label (chevron is part of the string) | `Show {REVEAL_STEP} more ↓` | as S1 | CV:105, CV:158 |
| **S3** | `189 remaining` — control's secondary count | `{R} remaining` | `F` (state 1b draws `71 remaining` = `96 − 25`) | RM:77, CV:60, CV:274 |
| **S4** | `Show 25 more commanders, 189 remaining` — the button's **accessible name** | `Show {REVEAL_STEP} more commanders, {R} remaining` | `F` | RM:107-108, CV:120 |
| **S5** | `Revealing…` — working-state label (note the single-character ellipsis `…`, not `...`) | literal | — | RM:132, CV:83 |
| **S5a** | `50 of 214` — working-state count | `{shownAfter} of {total}` (canvas `{{ shown2 }} of {{ total }}`) | **canvas uses `total`** — see §5 finding 3; should be `F` for consistency | CV:84 |
| **S6** | `25 shown · 189 more below` — header window count, **hidden-remainder form** | `{shown} shown · {R} more below` | `F` (1b: `25 shown · 71 more below`) | RM:76, RM:135, CV:140, CV:187, CV:238 |
| **S7** | `all 214 shown` — header window count, **exhausted form** | `all {F} shown` | `F` | RM:85, CV:430, CV:467 |
| **S8** | *(omitted)* — header window count, **short-list form**: the element is not rendered at all; the meta line reads exactly the shipped `Ranked for your collection · Order: Fit ↓ · fixed` | — | — | RM:84-85, CV:545 |
| **S9** | `END OF RANKING · 214` — end-of-ranking rule (uppercase via `text-transform`; the canvas's own text node is sentence-case `End of ranking · 214 of 214`). **Restated 2026-09-14:** the rule renders only once a windowed list is fully revealed, so the ratio was always `N of N`; the second figure was dropped as the "fact nobody asked for" the result line refuses at rest | `End of ranking · {F}` + `text-transform: uppercase` | `F` | RM:94, RM:134, CV:515 |
| **S10** | `Showing 96 of 214` — **shipped filter count, desktop. UNCHANGED, do not touch.** | `Showing {filtered} of {total}` | `F` of `T` | RM:75, PA:85, CV:248 |
| **S11** | `96/214` / `N of 24` — **shipped filter count, mobile pip row. UNCHANGED.** | as shipped | — | RM:69, RD:§Verified |
| **S12** | Live-region announcement. Canvas/handoff text: `Showing 50 of 214 commanders. Ranks 26 to 50 added.` **READINESS overrides this** (§Eng note 1): it must not use the filter count's "Showing … of …" shape, and must count against `F`. **Ship:** `50 shown, 164 more below. Ranks 26 to 50 added.` | `{shown} shown, {R} more below. Ranks {from} to {to} added.` where `from = shownBefore + 1`, `to = shown` | `F` | RM:112, RM:137, CV:667, **RD:§Eng note 1 (authoritative)** |
| **S13** | `Order: Fit ↓ · fixed` — shipped order label, verbatim, unchanged; the window count sits **before** it | — | — | RM:135, RD:§Order-label drift, CV:187 |
| **S14** | `Ranked for your collection` — shipped header line, unchanged | — | — | RM:135, CV:187 |

Never-use list, per decision 5: the window figures must **never** render the words *showing … of …*,
never a total, never `page N of M`, never a "results per page" or batch label (RM:67-90, RM:87-90).

**Row count: 16 strings (14 numbered + 2 sub-rows).**

---

## 4 · Behavioural contract

| # | Rule | Source |
|---|---|---|
| **B1** | `REVEAL_STEP = 25`, a module-level constant in `commanders-view.tsx`, named to mirror Collection's `PAGE_SIZE`. Collection's `PAGE_SIZE = 200` is **not** reused. | RM:41-48, RM:140-142 |
| **B2** | One new state value, `shown`, initialised to `REVEAL_STEP`. Render `filtered.slice(0, shown)`. The control renders **after** the `.map()`, inside the list column. | RM:140-142, CV:579 |
| **B3** | Activation does `setShown(s => s + REVEAL_STEP)`. No clamping needed for the slice (`slice` over-length is safe), but `R` must be computed as `filtered.length − shown` and can never render negative. | RM:140-142 |
| **B4** | The reveal is **synchronous**: a client-side slice of an array already in memory. **No request, no fetch, no skeleton, no loading dependency.** The `Revealing…` state is specced only in case a future server-paged API lands; it should never be visible for more than a frame. | RM:98-102, CV:8 |
| **B5** | **Scroll position is untouched.** The page grows beneath the reader; do not scroll-into-view, do not scroll-to-top, do not anchor. (Focus-move per B10 must therefore use `preventScroll` or be verified not to jump — see §5 finding 5.) | RM:101-102, CV:415 |
| **B6** | **Changing the WUBRG colour filter resets `shown` to `REVEAL_STEP`** and recomputes all window figures against the new filtered length. The window is a property of the current result set, not of the session. | RM:145-148, CV:591 |
| **B7** | The shipped filter count `Showing {filtered} of {total}` (desktop) and its mobile pip-row form stay **exactly as shipped**. This ticket does not touch them. | RM:68-70, RM:147 |
| **B8** | **Rank numerals are global Fit ranks and never renumber under a filter.** `rankBySlug` is built from the unfiltered `results`; state 1b legitimately skips rank 25. The window count's denominator is the filtered length while the rank numerals are not — this asymmetry is intended. | RM:150-152, RD:§Verified |
| **B9** | **Sort stays fixed.** Windowing adds no ordering control and must not enable one. `Order: Fit ↓ · fixed` remains literal truth. | RM:153 |
| **B10** | Native `<button>`, the **last tab stop after the final rendered card's *View breakdown* link**. No `role`, no custom key handling — Enter and Space come free. On activation, focus moves to the `<li>` at 0-based index `shown − REVEAL_STEP` (post-update `shown`), which carries `tabIndex={-1}` and a ref. No `rec-card.tsx` change, no nth-child query. | RM:105-111, RD:§Eng note 3 |
| **B11** | An `aria-live="polite" aria-atomic="true"` visually-hidden region carries S12 after each reveal. It must exist in the DOM **before** the reveal (a region inserted at announce-time is often not read). | RM:112, RM:137 |
| **B12** | **The control never renders** when `filtered.length === 0` (no-candidates, filtered-to-zero) or when `shown >= filtered.length` (nothing hidden — includes the short-list case where `filtered.length <= REVEAL_STEP` from first render). | RM:156, RM:24, CV:599 |
| **B13** | The end-of-ranking rule renders **only** when the list was windowed and is now exhausted *or* — per canvas state 3 vs state 4 — is absent on a short list. State 4 (24 generals, never windowed) shows **no** rule. | CV:503 vs CV:512-518; see §5 finding 2 |
| **B14** | **No virtualisation library, no new dependency.** 214 cards at batches of 25 never mounts enough DOM to need it. Revisit only above ~400 generals. | RM:160-161 |
| **B15** | **No new design tokens.** All theme-aware values come from existing `src/app/globals.css` `var(--*)`; the handoff hexes are Palette A reference values. | RM:157-159 |
| **B16** | **No animation.** Decision 8 forbids a fade-in/sweep on new cards; consequently no `prefers-reduced-motion` branch is required. Adding animation would create the requirement. | RM:87-90, RM:180-181, RD:§Remaining gap 2 |
| **B17** | **`rec-card.tsx` is untouched.** Degraded states (global EDHREC banner, per-commander notes) are unaffected — windowing only decides how many cards render. | RM:143-144, RM:154-155 |
| **B18** | **Back-navigation from `/commanders/:slug` resets the window** — `shown` is plain state that resets on remount, exactly as Collection behaves. Restoring it is filed separately and is **not** in scope. | RM:167-171 |
| **B19** | The control is **in flow at the end of the list. Never sticky, never floating, never a page footer.** On mobile it must clear the bottom tab bar by `24px`. | RM:60-65 |

**Row count: 19 contract rules.**

---

## 5 · Ambiguities and risks

Carried from the handoff's own gap report (RM:175-183), with READINESS dispositions, then additional
findings from this enumeration.

**Handoff gap report**

1. **First-run interaction** (RM:177-179). Whether a first upload can produce >25 generals is a data
   question; if it can, confirm the control under the guided-flow banner doesn't read as "finish
   setup". *Disposition:* READINESS (§Remaining gap 1) accepts it — the banner is above the filter bar
   and the control ~200 cards below; they cannot read as one unit. **No action, but do not add any
   visual coupling between banner and control.**
2. **Reduced motion** (RM:180-181). Nothing animates and B16 forbids adding animation, so no branch is
   needed. **Becomes a live requirement the moment anyone adds a transition to the new cards.**
3. **Batch size is a layout guess** (RM:182-183). 25 is calibrated to card height, not to reading
   behaviour; revisit on beta telemetry. **Keep it a single named constant so the revisit is one line.**

**Additional findings**

4. **❌ Two hexes with no token — blocking for the repo's token rule.** The working state's
   `bg #1B1711` (RM:132, CV:81) and its count colour `#6E6353` (RM:132, CV:84) have **no `var(--*)`
   in `src/app/globals.css`**. `#6E6353` is *close to* but not equal to `--fg-locked: #6A6152`, and
   `#1B1711` sits between `--surface #1E1A15` and `--bg #14110E`. RM:159 states "No new token is
   introduced", which is in direct conflict. **Recommended resolution:** since B4 says the working
   state should never be perceptible, either (a) do not implement the working state at all and record
   the omission, or (b) implement it with `--fg-locked` and `--bg`/`--surface` and flag the ~1-value
   drift at design review. Do **not** inline raw hexes in a component. `#6E6353` also appears in the
   canvas as a general "dimmest mono" colour (CV:231, CV:365), so it may be an unlanded token.
5. **Focus-move vs. "scroll position is untouched" (B5 vs B10).** A plain `.focus()` on an element
   ~3,000px below the viewport **will** scroll the browser to it, contradicting RM:101-102. The two
   rules are only compatible if the reveal is triggered at the bottom of the list (where the newly
   focused rank-26 row is roughly at the fold) or if `focus({ preventScroll: true })` is used. The
   handoff never says which. **Assess:** the intent (RM:109-111 — "lands inside the new material
   rather than … a button that has moved down 3,000px") is about *keyboard position*, not scroll, and
   the "untouched scroll" claim (RM:101) is about the reveal not resetting the reader's place. Use
   `preventScroll: true` and let the natural in-viewport position stand; the focus ring is the cue.
   Confirm at design review.
6. **Desktop chevron is a separate node; mobile chevron is inside the label string.** Desktop: a third
   `<span>` at `#8E8269` that turns brass on hover (CV:61). Mobile: `Show 25 more ↓` as one text run at
   `#EDE6D8` (CV:105), so the mobile chevron **cannot** turn brass independently and is a different
   colour at rest. This is a real parity divergence, not a drawing slip — it is consistent across all
   four mobile frames (CV:105, 158, 303, 349). Implement as drawn; note it as intentional.
7. **Diamond size differs by viewport in the canvas but not in the handoff table.** RM:134 says `6px`
   flat; the canvas draws `6px` on desktop (CV:514) and `5px` on mobile (CV:454), with the mono string
   at 10.5px desktop / 9.5px mobile. Ship the per-viewport values; the RM table is the desktop case.
8. **Header window count placement is described two ways.** RM:135 says "on its own line under
   `Ranked for your collection`", but canvas state 1 desktop draws it **inline** on the same line
   (`Ranked for your collection · 25 shown · 189 more below · Order: Fit ↓ · fixed`, CV:187), and only
   state 1b breaks it to a second line (CV:238). States 2 and 3 abbreviate the leading label to
   `Ranked ·` (CV:365, CV:467) purely to fit the mock. **Resolution:** treat the RM prose as the rule
   (own line) or the 1b drawing as the rule — they agree with each other; state 1's inline draw and the
   `Ranked ·` abbreviation are mock-fitting artefacts. Do not ship `Ranked ·`.
9. **The live-region string is stale in three places** (RM:112, RM:137, CV:667) and must be rewritten
   per RD:§Eng note 1 — see S12. Do not copy the handoff text verbatim; it violates decision 5 and
   uses `{total}` where `{filtered}` is meant.
10. **`tabindex` vs `tabIndex`** (RM:106, RM:110) — prose is HTML, implementation is TSX. Trivial, but
    flagged by RD:§Eng note 4 so it is not copied.
11. **"All four states"** (RM:119) is stale — R2 added state 1b, so there are five: 1, 1b, 2, 3, 4.
    Parity is required at **both** viewports for all five (RD:§Verified).
12. **No end-of-ranking rule on the short list (N10/B13).** Canvas state 4 ends the list with a bare
    `22px` spacer (CV:503) — no rule — while state 3 shows the rule. So the rule is **not** "the list
    ended", it is "you revealed everything you asked for". A reasonable implementer could render the
    rule whenever `shown >= filtered.length`, which would make it appear on a 24-general collection
    that was never windowed. **Ship the drawn behaviour:** render the rule only when the list was
    long enough to have been windowed (`filtered.length > REVEAL_STEP`). Worth ratifying with Design.
13. **`Show 25 more` when fewer than 25 remain.** No clamped variant is drawn (e.g. `Show 14 more`).
    Ship the literal `Show {REVEAL_STEP} more` per S1; the `{R} remaining` count already tells the
    truth. Flag at design review — this is the most likely Copilot/QA objection.
14. **The end-of-ranking figure under a filter.** S9 renders `{F} of {F}` — with a filter active that
    is `96 of 96`, not `214 of 214`, and the word "ranking" then means the filtered ranking while the
    rank numerals on screen run to ~200. Not drawn. Ship `F of F` (consistent with every other window
    figure) and flag.
15. **Working state's `{shownAfter} of {total}`** (S5a) uses the very "N of M" shape decision 5
    outlaws elsewhere. If the working state is implemented at all, use the decision-5 form.

**(a) The control is unreachable with today's beta data — verification path.**
Decision 2 makes `25 > 24` deliberate (RM:41-48): the reference 1,418-card collection produces 24
generals, so on real data the control never renders, and neither a human nor an agent can click it.
This is a *feature* of the rollout and a *problem* for verification. RD:§Eng note 2 requires an explicit
path. Concretely, three layers, all of which should be in the PR:
- **Unit tests (mandatory, the primary evidence).** Vitest + Testing Library over `commanders-view.tsx`
  with a fabricated ≥60-result fixture: control renders at `shown = 25`; label/count/accessible-name
  strings exact (S1–S4); click advances the slice to 50 and re-renders 50 `<li>`s; header count
  transitions S6 → S6 → S7; control unmounts and the rule mounts at exhaustion; a 24-result fixture
  renders neither control nor rule (N10); a zero-result fixture renders neither (N14); changing the
  colour filter resets `shown` to 25 and recomputes `R` against the filtered length (B6/N13); ranks do
  not renumber under the filter (B8); the live region contains S12 after a reveal; focus lands on the
  `<li>` at index `shown − REVEAL_STEP` (B10).
- **Visual verification (design review).** Temporarily set `REVEAL_STEP = 5` in a local dev run to
  screenshot all five states × 2 viewports against the canvas, then revert before the pre-push gate.
  The constant must be a single module-level binding precisely so this swap is one line and cannot
  leak (grep for `REVEAL_STEP = 5` in the pre-push checklist).
- **Post-merge sanity.** Nothing on the shipped 24-general surface may change — the strongest real-data
  assertion available is that `/commanders` is byte-identical for the beta user. A snapshot/visual diff
  of the short-list case is worth more here than any long-list check.

**(b) The focus index, unambiguously.**
Let `shownBefore` be `shown` at click time and `shownAfter = shownBefore + REVEAL_STEP`. The first
revealed row is the `(shownBefore + 1)`-th item of the **currently filtered, sorted array** — i.e.
**0-based index `shownBefore`, equivalently `shownAfter − REVEAL_STEP`**, which is what RD:§Eng note 3
means by "index `shown - REVEAL_STEP`" (it is using the post-update `shown`). With the canvas numbers:
`shownBefore = 25`, `shownAfter = 50`, focus index `= 25`, which is the 26th rendered row.
**That is not the same thing as "rank 26."** RM:109 writes "ranks 26" because it is describing the
unfiltered case, where the 26th filtered row happens to carry global Fit rank 26. Under an active
colour filter the ranks are global and skip (B8), so the 26th filtered row may carry rank 31 or rank
104. **The implementation must key off the array index, never off the rank numeral.** In practice:
`itemRefs.current[shownAfter - REVEAL_STEP]?.focus({ preventScroll: true })` inside the click handler,
after the state update has been applied (i.e. via a layout effect keyed on `shown`, since the row does
not exist in the DOM at the moment the handler runs).

**Row count: 15 numbered findings + 2 assessed items (a) and (b).**
