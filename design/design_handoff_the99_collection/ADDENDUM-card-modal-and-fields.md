# Addendum — Replace mark, shared text-field primitives, and the card-detail modal's height

**Filed by:** Eng, alongside PR for `fix/bug-batch-1` (commits `153c4bd` — *fix: shared text-field primitives, outside focus ring, dead controls* — and `e7e3252` — *fix(collection): stabilise card-detail modal layout*).
**Date:** 2026-07-25
**Status:** Design call — three items. Items 1 and 3 are corrections Eng believes are unambiguous. Item 2 contains one sub-item (2c, search-icon and focus unification) that **changes shipped values on three surfaces** and needs Design to ratify.
**Scope:** `docs/superpowers/design-tables/collection.md` and `decks.md` are LOCKED and untouched. Every table below cites the locked row it departs from.

---

## Item 1 — Replace-collection mark: `↻` glyph → inline 14×14 SVG

### Current state

`collection.md:295` specifies the desktop button copy as the literal string `↻ Replace collection`; `collection.md:1938` and `:1963` repeat it. The mobile link carries the same mark at `13px`.

| Property | Mobile (`md:hidden` text link) | Desktop (`GhostButton`) |
|---|---|---|
| mark | `↻` (U+21BB, inline glyph) | `↻` (U+21BB, inline glyph) |
| mark size | inherits `13px` | inherits `13px` |
| mark colour | inherits `var(--brass)` | inherits `var(--fg)` |
| label | `Replace` | `Replace collection` |
| label font-size | `13px` | `13px` |
| gap between mark and label | one space character | one space character |

### Why it's drift, not intent

`↻` is a **symbol**, not an icon, and its metrics are set by whichever font in the stack has the glyph — not by IBM Plex Sans, which does not. In practice the fallback resolves to a system symbol face whose `↻` renders at roughly 9–10px optical height against a 13px cap-height label, sitting on a baseline the label doesn't share. The result is a visibly undersized, vertically misaligned mark that changes size between macOS, Windows and Android because each has a different first font with the glyph.

No amount of `font-size` tuning fixes it, because the discrepancy is a per-font metric, not a size setting. The handoff asked for a mark of a particular *shape*; the glyph was the only way to spell that shape in a copy table.

### Target

Same mark, drawn explicitly. `ReplaceIcon` in `src/app/collection/page.tsx:16-35`.

| Property | Mobile | Desktop |
|---|---|---|
| element | inline `<svg>`, `aria-hidden` | inline `<svg>`, `aria-hidden` |
| width × height | `14px × 14px` | `14px × 14px` |
| viewBox | `0 0 16 16` | `0 0 16 16` |
| stroke | `currentColor` | `currentColor` |
| stroke-width | `1.6` | `1.6` |
| stroke-linecap / linejoin | `round` / `round` | same |
| fill | `none` | `none` |
| vertical alignment | `align-[-2px]` | `align-[-2px]` |
| margin-right | `6px` | `6px` |
| colour | `var(--brass)` (inherited, unchanged) | `var(--fg)` (inherited, unchanged) |
| label | `Replace` — unchanged | `Replace collection` — unchanged |
| button chrome | unchanged | unchanged (`GhostButton`, `13px`, `px-[16px] py-[9px]`) |

The path is the same circular-arrow-with-arrowhead the glyph denotes. `currentColor` means the mark still inherits whatever colour the surrounding control has, so nothing in the hover contract changes.

**Stale rows if ratified:** `collection.md:295`, `:1938`, `:1963` — the copy strings should read `Replace collection` / `Replace` with the mark specified as an icon rather than embedded in the string. No property in the §*Replace Collection Button* table (`collection.md:275-293`) changes.

---

## Item 2 — Shared text-entry primitives, and the focus indicator that drew inside the border

### 2a — The defect

Every text input and most interactive controls in the app hand-rolled the brass focus indicator as:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]
```

Tailwind's `ring` utility renders as a `box-shadow` with **no offset by default**. On a control that has its own `1px solid var(--border-strong)` boundary, a 2px ring with zero offset draws *on top of and inside* that border — the brass indicator was consumed by the field's own edge instead of surrounding it. Worse, `focus-visible:outline-none` in the same class list actively **suppressed** the correct indicator, which `src/app/globals.css:133-136` already ships app-wide:

```css
:focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 2px;
}
```

That rule is correct, is offset outside the box, and needed nothing but for 47 call sites to stop turning it off.

### 2b — What was removed

| | Count |
|---|---|
| Class lists carrying the hand-rolled ring | **47** |
| Files containing them | **18** (all under `src/components/decks/`) |
| Individual utility tokens deleted | **141** — 47 × `focus-visible:outline-none`, 46 × `focus-visible:ring-2`, 46 × `focus-visible:ring-[#C9A24B]`, 1 × `focus-within:ring-2`, 1 × `focus-within:ring-[#C9A24B]` |

Nothing replaces them. The global `:focus-visible` rule takes over on every one.

| Property | Mobile | Desktop |
|---|---|---|
| focus indicator (before) | `box-shadow` ring, `2px`, `#C9A24B`, **offset 0** — drawn inside the control's border | same |
| focus indicator (after) | `outline: 2px solid var(--brass)`, `outline-offset: 2px` — drawn outside | same |
| colour | `#C9A24B` → `var(--brass)` (`#C9A24B`) — unchanged value, now a token | same |
| thickness | `2px` → `2px` — unchanged | same |

Colour and thickness are what the tables asked for and are unchanged. Only the *position* moves, from inside the border to 2px outside it. Eng reads this as a bug fix, not a design change: no table specifies a focus indicator that hides under its own border.

**One deliberate holdout.** `src/components/decks/search-pane.tsx:112` keeps `peer-focus-visible:ring-2 peer-focus-visible:ring-[#C9A24B]`. That call site is structurally different: the focusable element is an `sr-only` checkbox, and the indicator is proxied via `peer-` onto a *visible* toggle track that is a sibling, not the focused element. The global outline would render on the invisible input, where nobody can see it. `ring` is correct there precisely because it can be relocated. This is the only survivor and is not a precedent for anything with a visible focusable box.

### 2c — The primitives, and three surfaces whose values changed — **NEEDS RATIFICATION**

`src/components/ui/text-field.tsx` adds `TextField` and `SearchField`, siblings to the existing button primitives, so the focus contract stops being re-implemented. Seven call sites adopt them:

| Call site | Primitive |
|---|---|
| `src/components/collection/filter-bar.tsx:71` | `SearchField` |
| `src/components/collection/issue-inspector.tsx:199` | `SearchField` (with `trailing` clear button) |
| `src/components/collection/confirm-modal.tsx:140` | `TextField` |
| `src/components/decks/create-picker.tsx:94` | `SearchField` (with `trailing` result count) |
| `src/components/decks/create-picker.tsx:259, :338` | `TextField` ×2 (deck name) |
| `src/components/decks/create-pre-filled.tsx:274` | `TextField` |
| `src/components/decks/rename-form.tsx:44` | `TextField` |
| `src/components/decks/search-pane.tsx:77` | `SearchField` |

As with the button primitives, **padding and font-size stay with the caller** — the design tables specify them differently per surface, and every caller passes its table's values through `className` / `containerClassName`. The primitive owns only chrome:

| Chrome property (`FIELD_CHROME`) | Mobile | Desktop |
|---|---|---|
| border-radius | `8px` (`rounded-lg`) | `8px` |
| background | `var(--surface-sunken)` `#181410` | same |
| border | `1px solid var(--border-strong)` `#3A3229` | same |
| color | `var(--fg)` `#EDE6D8` | same |
| placeholder colour | `var(--fg-faint)` `#8E8269` | same |
| caret colour | `var(--brass)` `#C9A24B` | same |

Those match `collection.md:319` §*Search Input* and `collection.md:341` §*Search Placeholder Text* exactly. Callers that need something else override it — `search-pane.tsx` passes `bg-[#14110E] [border-color:var(--brass)]` per `decks.md:1455`; `create-picker.tsx` passes `md:[border-color:var(--brass)]` per `decks.md:650`; `confirm-modal.tsx` passes `[border-color:var(--danger)]`.

#### The three values Design must ratify

**(i) Search icon — unified.** Four surfaces specified four treatments of the same `⌕` mark. `SearchField` renders one.

| Surface | Locked table | Before (shipped) | After |
|---|---|---|---|
| Collection filter bar | `collection.md:331` — `14px` / `15px`, `#8E8269` | inherited sans, `14px` mobile / `15px` desktop, `var(--fg-faint)` | `font-mono`, `15px`, `var(--fg-faint)` |
| Issue inspector filter | not separately tabled | `font-mono`, `15px`, `var(--fg-faint)` | **unchanged** — this was already the target |
| Deck create picker | `decks.md:657` — `14px` / `16px`, `#8E8269` | inherited sans, `14px` mobile / `16px` desktop, `#8E8269` | `font-mono`, `15px`, `var(--fg-faint)` |
| Deck builder search pane | `decks.md:1465` — `14px` / `14px`, `#8E8269` | inherited sans, `14px` both, `#8E8269` | `font-mono`, `15px`, `var(--fg-faint)` |

| Property | Mobile | Desktop |
|---|---|---|
| glyph | `⌕` (U+2315) — unchanged | `⌕` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `15px` | `15px` |
| colour | `var(--fg-faint)` `#8E8269` — unchanged everywhere | same |
| `aria-hidden` | `true` — unchanged | same |

The colour never differed. The *sizes* did — 14/15, 14/16 and 14/14 across three tables, a 2px spread that reads as three transcriptions of one intent rather than three decisions. `font-mono` is the addition: `⌕` has the same font-metric problem as `↻` in Item 1, and pinning it to the mono face (which the app loads and which has the glyph) makes it render identically across platforms instead of falling through to whatever the OS supplies.

**Design must ratify or specify.** If any of the three sizes was deliberate — e.g. the picker's desktop `16px` to match a larger field — say so and Eng will pass it through `containerClassName` per caller, which the primitive already supports.

**(ii) Focus-within treatment — now on all four search fields.** `collection.md`'s issue-inspector filter is the only surface whose table specifies *"Focus: border → `--brass` + 3px ring `rgba(201,162,75,.16)` via focus-within."* `SearchField` applies it to all four, because the reason it exists there applies everywhere: the input is only part of the box that looks focused, so the indicator has to belong to the container.

| Property (focus-within) | Mobile | Desktop |
|---|---|---|
| border-color | `var(--brass)` `#C9A24B` | same |
| box-shadow | `0 0 0 3px rgba(201,162,75,0.16)` | same |
| inner input outline | suppressed (`focus:outline-none focus-visible:outline-none`) — otherwise two indicators stack | same |

Note this is the one place `focus-visible:outline-none` is legitimate and survives: the visible indicator has moved to the parent, not vanished. On the two deck search fields whose resting border is already `var(--brass)`, the focus-within border-color is a no-op and the 3px halo is the whole signal.

**(iii) Placeholder colour on the builder search pane.** `search-pane.tsx` shipped `placeholder:text-[#6E6353]`, a value that appears in no design table. It now takes the primitive's `var(--fg-faint)` `#8E8269`, matching `collection.md:341`. Eng reads the old value as a stray hex; if it was deliberate, it needs a table row.

| Property | Mobile | Desktop |
|---|---|---|
| placeholder colour (before) | `#6E6353` | `#6E6353` |
| placeholder colour (after) | `var(--fg-faint)` `#8E8269` | same |

Related: `create-picker.tsx`'s deck-name inputs previously faked a placeholder with `color: deckName ? "#EDE6D8" : "#8E8269"` on the input itself — the *typed value* went grey until you typed. They now use a real `::placeholder`, so typed text is `var(--fg)` from the first keystroke. Strictly a defect fix; recorded for completeness.

---

## Item 3 — Card detail modal: fixed desktop height, scrolling content, pinned Prev/Next

### Current state

`collection.md:808` §*Desktop: Modal Container* specifies `width: 820px` and no height — the dialog sized to content. `collection.md:838` §*Desktop: Content Column* specifies `padding: 30px 32px`. `collection.md:1023` §*Desktop: Prev/Next Navigation* specifies `margin-top: 28px`, `border-top: 1px solid #2A241D`, `padding-top: 20px`.

| Property | Mobile | Desktop (shipped) |
|---|---|---|
| dialog height | `h-full` (full-screen sheet) | `h-auto` — driven by content |
| content column | `flex-1`, `overflow-auto`, `p-[20px]` | `flex-1`, `overflow-auto`, `p-[30px_32px]` |
| Prev/Next row | not rendered | in normal flow after the meta row, `margin-top: 28px`, `padding-top: 20px`, `border-top 1px var(--border)` |
| header row right padding | none | none |

### Why it's drift, not intent

**The dialog resized under the cursor.** Oracle text in Magic runs from zero lines (a vanilla creature) to twelve or more (a planeswalker with three abilities and reminder text). With `h-auto`, the 820px-wide dialog's *height* was a function of the card being viewed. `‹ Prev` and `Next ›` are fixed at the bottom of that column — so clicking Next re-laid-out the dialog, and the button you just clicked moved out from under the pointer. Two clicks in a row on the same button was unreliable; three was luck. This is a Fitts's-law failure, not a taste question, and it is the bug the user reported.

**The close button sat on the mana pips.** `collection.md:846` positions the close button `absolute; top: 22px; right: 24px; width: 34px`. It is a sibling of the header row, not part of it, so the header row's content extends underneath it. The header row's right-hand child is the mana-cost pip cluster (`26px` pips, `5px` gap on desktop) — for any card with two or more pips, the rightmost pip rendered beneath the 34px close button. Nothing in the table gave the header a right inset to clear it; the collision was an omission, not a decision.

### Target

| Property | Mobile | Desktop |
|---|---|---|
| dialog height | `h-full` — **unchanged** | `620px`, capped `max-height: 85vh` |
| dialog width | `w-full` — unchanged | `820px` — unchanged |
| content column | `flex-1`, flex column, `overflow-hidden` | same |
| — scrolling body | `flex-1`, `overflow-auto`, `p-[20px]` — unchanged | `flex-1`, `overflow-auto`, `p-[30px_32px]` — same padding as the locked column |
| — header row right inset | none — unchanged | `padding-right: 46px` |
| Prev/Next row | not rendered — unchanged | `flex-none`, pinned below the scroll body; `margin: 0 32px 30px`; `padding-top: 20px`; `border-top: 1px solid var(--border)` |
| Prev/Next `margin-top` | — | **removed** (was `28px`); superseded by bottom-pinning |
| art column | not rendered (mobile has its own art header) | `320px`, `padding: 28px` — unchanged |
| everything else | unchanged | unchanged |

**Mobile is untouched.** The full-screen sheet already had a fixed height (`h-full`) and never rendered Prev/Next, so neither defect existed there and neither fix applies. The mobile column is listed above only because the property table requires both columns.

#### Why 620px

The height has a hard floor and a soft ceiling, and 620 is the round number between them.

**Floor — the art column.** `collection.md:828` specifies the desktop art column at `width: 320px`, `padding: 28px`, containing an image at `width: 100%` and `aspect-ratio: 63/88` (the Magic card ratio).

```
inner width   = 320 − 28 − 28            = 264px
image height  = 264 × 88 / 63            ≈ 369px
column height = 369 + 28 + 28            ≈ 425px
```

Below ~425px the art either crops or the column's specified padding collapses. 425px is therefore the minimum any fixed height can be.

**Ceiling — the viewport.** `max-h-[85vh]` keeps the dialog off the edges on a 13" laptop (typically ~700–780px of viewport height), and the flex column degrades gracefully: the scroll body absorbs the reduction, the art column and the pinned nav row do not move.

**Between them — how much oracle text fits without scrolling.** At 620px the content column's fixed chrome is roughly: 30px top padding + ~58px header (29px name at 1.1, 6px gap, 14px type line) + 22px oracle margin-top + 36px oracle block padding + 24px meta margin-top + ~40px meta row + ~72px pinned nav (20px padding-top, 30px bottom margin, border, button) ≈ 282px, leaving ~338px of oracle area. At the locked `15px / 1.65`, that is **about a dozen lines** — which covers the overwhelming majority of cards with no scrollbar at all, while the handful that exceed it scroll the body instead of resizing the dialog.

425px would clear the art but scroll almost every card. 700px+ would waste vertical space on the common one-line-of-oracle case and start fighting `85vh` on small laptops. 620px is the value where the art is comfortable, most cards don't scroll, and the dialog never moves.

#### Why 46px on the header row

`46px = 34px` close button `+ 12px` clearance. The button is positioned `right: 24px`, and the content column's own right padding is `32px` — so the button's left edge sits 8px *inside* the padding box. `padding-right: 46px` on the header row pushes the mana pips clear of the button plus a 12px gap, and applies only to that row, so the oracle block and meta row keep the full locked `32px` measure.

#### What did not change

The Prev/Next row keeps its `border-top`, its `20px` padding-top, its `10px` gap, and all three children (`‹ Prev`, position counter, `Next ›`) at their locked values. Its `mx-[32px] mb-[30px]` reproduces exactly the horizontal and bottom inset it had when it was inside the padded column — the only real change is that `margin-top: 28px` is gone, because "28px after the meta row" and "pinned to the bottom" are different instructions and the second one is what fixes the bug.

**Stale rows if ratified:** `collection.md:808` (§*Desktop: Modal Container* gains a `height` row), `collection.md:838` (§*Desktop: Content Column* — padding moves to an inner scroll body; the column itself becomes a flex stack), `collection.md:1023` (§*Desktop: Prev/Next Navigation* — `margin-top: 28px` → bottom-pinned with `margin: 0 32px 30px`). The header row needs a new `padding-right: 46px` row on desktop.

---

## Contrast — WCAG AA

Against the surfaces these controls sit on. `var(--surface-sunken)` is `#181410`; `var(--bg)` is `#14110E`.

| Value | On | Ratio | Verdict |
|---|---|---|---|
| `var(--fg)` `#EDE6D8` (input text) | `--surface-sunken` | **14.6:1** | AA / AAA ✅ |
| `var(--fg-faint)` `#8E8269` (placeholder, search icon) | `--surface-sunken` | **4.7:1** | AA ✅ (AAA ✗) |
| `#6E6353` (outgoing placeholder, search pane) | `#14110E` | **2.9:1** | **AA ✗** — the change in 2c(iii) *fixes* a failure |
| `var(--brass)` `#C9A24B` (Replace mark, mobile) | `--bg` | **7.9:1** | AA / AAA ✅ — unchanged by Item 1 |
| `var(--fg)` `#EDE6D8` (Replace label, desktop) | `--bg` | **15.3:1** | AA / AAA ✅ — unchanged |

**Non-text contrast, 1.4.11 — the item that actually improves.** The focus indicator is the one non-text element WCAG requires at 3:1 against *both* the control and the page. `var(--brass)` `#C9A24B` is **7.9:1** against `--bg` and **7.5:1** against `--surface-sunken` — comfortably passing in isolation. But at `offset: 0` it was painted on top of `var(--border-strong)` `#3A3229`, against which it is only **4.4:1**, and on a 2px band half-covered by the border it was not reliably perceivable as a separate indicator. Moving it to `outline-offset: 2px` puts the full 2px band on the page background at 7.9:1, cleanly outside the control. **This is a 2.4.11 / 1.4.11 improvement across 47 controls**, not merely a cosmetic one.

Item 1's SVG mark is `aria-hidden` and sits beside a text label that carries the accessible name, so it is decorative under 1.4.11 and no ratio is required — though at `currentColor` it inherits the label's 7.9:1 / 15.3:1 anyway.

Item 3 changes no colour. The new scroll container is keyboard-reachable and receives the global brass outline like anything else.

## New tokens

**None required.** Every value above already exists in `src/app/globals.css`. Items 1 and 2 are net *removals* of raw hex (`#C9A24B` ×46, `#8E8269` ×3, `#6E6353` ×1, `#EDE6D8` and `#181410` and `#3A3229` inline styles across seven call sites). Item 3 adds two layout numbers — `620px` and `46px` — both derived above from values already in the locked tables.

---

## READINESS

**🟠 ORANGE** — Items 1 and 3 are clean; Item 2 contains a genuine Design decision.

| Item | Verdict |
|---|---|
| 1 — `↻` → 14×14 SVG | 🟢 Same mark, drawn at a size the platform can't renegotiate. Copy strings in `collection.md` need the mark lifted out of the string; no property row changes. Ship. |
| 2a/2b — focus ring moved outside the border | 🟢 The ring had zero offset and the same class list suppressed the correct global outline. No table specifies a hidden focus indicator. Colour and thickness unchanged; only position moves, and it moves from failing to passing. Ship. |
| 2c — primitives' unified search icon, focus-within, placeholder | 🟠 **`SearchField` standardises three surfaces onto `font-mono / 15px / var(--fg-faint)` where `collection.md:331`, `decks.md:657` and `decks.md:1465` each specify a different size, and extends the issue-inspector's focus-within treatment to all four search fields.** Eng's reading is that the 14/15/16 spread is transcription noise and the focus-within treatment was under-specified rather than scoped. Both are plausible as intent. Design ratifies the unification, or names the per-surface values and Eng passes them through `containerClassName` — the primitive already supports it. |
| 3 — modal height, scroll, pinned nav, header inset | 🟢 `h-auto` made the dialog resize under the cursor while paging, and the close button overlapped the mana pips with no inset specified. Both are defects against the tables' own intent. `620px` and `46px` are derived from locked values, not chosen. Mobile untouched. Ship. |

No new tokens. No design-table edits made by Eng. The stale rows listed under Items 1, 2c and 3 are Design's to update once ratified.
