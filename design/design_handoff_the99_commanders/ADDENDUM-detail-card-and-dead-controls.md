# Addendum — Commander detail card overlays, and two controls that did nothing

**Filed by:** Eng, alongside PR for `fix/bug-batch-1` (commit `153c4bd` — *fix: shared text-field primitives, outside focus ring, dead controls*).
**Date:** 2026-07-25
**Status:** Design call — three items, **all three are removals**. None is a styling adjustment. Design's decision on each is *ratify the removal* or *commission a handoff for the replacement*; there is no third option where Eng picks a value.
**Scope:** The desktop left column of `/commanders/[slug]` and the desktop filter row of `/commanders`. `docs/superpowers/design-tables/commanders.md` is LOCKED and untouched by this addendum.

---

## Item 1 — Card-art overlays removed; name and type line move below the frame — **REMOVAL, user-requested**

### Current state

`commanders.md:1062-1078` §*Detail — Left Column Card (desktop)* specifies a card frame that is a **flex container with 16px padding** whose children are painted on top of the commander art:

| Property | Mobile | Desktop (shipped) |
|---|---|---|
| position | — | `sticky`, `top: 20px` (column-level) |
| display / flex-direction | — | `flex` / `column` |
| aspect-ratio | — | `63/88` |
| border-radius | — | `14px` |
| background | — | commander art, `cover` / `center`; identity gradient as fallback |
| padding | — | `16px` |
| box-shadow | — | `inset 0 -70px 70px -40px rgba(10,7,4,0.85)`, `inset 0 0 0 1px rgba(0,0,0,0.3)`, `0 20px 50px rgba(0,0,0,0.5)` |

Two overlay groups sat inside it.

**Overlay A — name + mana-cost pips, top of the frame** (`commanders.md:1080-1122`):

| Property | Mobile | Desktop (shipped) |
|---|---|---|
| row | — | `flex`, `items-start`, `justify-between`, `gap: 8px` |
| name font-family | — | Cinzel, serif |
| name font-weight | — | `700` |
| name font-size | — | `19px` |
| name colour | — | `#F4EEE0` |
| name text-shadow | — | `0 1px 6px rgba(0,0,0,0.6)` |
| name line-height | — | `1.1` |
| pip row | — | `flex`, `gap: 4px`, `flex: none` |
| pip size | `22px` | `24px` |
| pip font | — | IBM Plex Mono, `600`, `13px` |
| pip box-shadow | — | `0 1px 3px rgba(0,0,0,0.4)` |
| pip colours | generic `#3A322A`/`#C6B79A`; B `#5B5566`/`#0E0C10`; R `#C05A48`/`#1a0b08`; G `#6B9E63`/`#0c1608` | same |

**Overlay B — oracle glass panel, bottom of the frame** (`commanders.md:1124-1147`), separated from Overlay A by a `flex: 1` spacer:

| Property | Mobile | Desktop (shipped) |
|---|---|---|
| background | `rgba(10,7,4,0.5)` | `rgba(10,7,4,0.5)` |
| backdrop-filter | `blur(3px)` | `blur(3px)` |
| border-radius | `9px` | `8px` |
| padding | `11px 13px` | `10px 12px` |
| type line font-size / weight / colour | `12px` / `500` / `#EDE6D8` | same |
| type line text-shadow | `0 1px 4px rgba(0,0,0,0.6)` | same |
| oracle font-size / colour | `11px` / `#E4DCCB` | same |
| oracle line-height | `1.45` | `1.4` |
| oracle margin-top | `6px` | `5px` |
| oracle text-shadow | `0 1px 3px rgba(0,0,0,0.7)` | same |
| P/T line | `15px` mono `600` `#F4EEE0`, right-aligned | `14px`, same |

**Correction to the record:** the P/T line at `commanders.md:1137` **never shipped**. The glass panel rendered the type line and oracle text only. It is listed above for completeness of the locked spec, and its removal is vacuous — there was nothing there to remove.

**Second correction:** the overlay removed from the top of the frame carried **mana-cost pips** (`{2}{B}{G}` and friends, from `c.manaCost`), not colour-identity pips. The colour-identity pip row is a separate component that sits **below** the card (`commanders.md:1149-1163`), and it is **untouched** — still `16px` pips, `5px` gap, `12px` mono `#8E8269` identity label, `4px` margin-left. Nothing about identity display changed.

### Why removal, not restyling

The user's report is that the overlays obscured the art. That reading holds up against the mechanics:

1. **The card scan already prints all four strings.** A Magic card image *is* a rendering of its name, mana cost, type line and oracle text — laid out by the card frame, in the game's own typography, at the printed positions players recognise. The overlays reprinted the same four values in Cinzel and Plex Mono, in different positions, on top of the printed versions. It read as double-vision, not as a caption.
2. **The scrim was doing the damage.** To make the overlaid text legible, the frame carried `inset 0 -70px 70px -40px rgba(10,7,4,0.85)` — a near-opaque 70px black wash over the bottom of the art, exactly where a Magic card prints its own type line, oracle box and art credit. Roughly the bottom third of every scan was blacked out to support text that duplicated what was underneath it.
3. **`backdrop-filter: blur(3px)` on the glass panel** blurred whatever remained visible under it, on top of the scrim.
4. **The overlay was designed against a placeholder.** The frame's background was the identity **gradient** when this table was written; art had not landed. Text over a flat two-stop gradient is a different problem from text over a photograph, and the treatment that solved the first one created the second.

### Target

| Property | Mobile | Desktop |
|---|---|---|
| **card frame** | n/a — mobile uses its own art header (`commanders.md:985-1060`), untouched | |
| display | — | *(no longer a flex container — the frame has no children)* |
| padding | — | **removed** (was `16px`) |
| aspect-ratio | — | `63/88` — unchanged |
| border-radius | — | `14px` — unchanged |
| background | — | art `cover`/`center`, gradient fallback — unchanged |
| box-shadow | — | `inset 0 0 0 1px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.5)` — the `inset 0 -70px 70px -40px rgba(10,7,4,0.85)` scrim is **removed**; the hairline and the drop shadow are unchanged |
| overlay A (name + mana pips) | — | **not rendered** |
| overlay B (oracle glass panel) | — | **not rendered** |
| **name + type block, below the frame** | | |
| position | — | next child of the sticky column, picking up its existing `gap: 16px` |
| wrapper | — | `flex`, `column`, `gap: 2px` |
| name font-family | — | Cinzel (`font-display`) |
| name font-weight | — | `700` |
| name font-size | — | `21px` |
| name colour | — | `#EDE6D8` (`--fg`) |
| name line-height | — | `1.15` |
| name text-shadow | — | **none** (nothing behind it to fight) |
| name element | — | `<h1>` — the desktop column's page heading |
| type line font-size | — | `12.5px` |
| type line colour | — | `#C6B79A` (`--fg-body`) |
| type line text-shadow | — | **none** |
| **identity pip row** | — | unchanged, still directly below |
| **oracle text** | — | **not rendered anywhere in the left column** — the card scan is the only rendering |

The card is now a clean framed image: 344px wide, `63/88`, hairline and drop shadow, nothing on top of it.

Sizes on the relocated text moved deliberately. `19px → 21px` and `#F4EEE0 → #EDE6D8`: the old values were tuned to sit legibly over art at the top of the frame — smaller so it wouldn't crowd the pips, brighter than `--fg` so it would carry through the shadow. Off the art, `--fg` is the app's heading colour and `21px` matches the visual weight the name had in context. The type line goes `12px #EDE6D8` → `12.5px #C6B79A`: over art it needed near-white; below it, `--fg-body` is what every other secondary line in the app uses. **If Design wants different numbers, these are three values and Eng will take whatever is specified.**

### What Design has to decide

- **Ratify:** `commanders.md:1062-1147` — the `padding`, `display`, `flex-direction` and scrim rows of §*Card frame*; all of §*Card name (desktop card frame)*, §*Mana cost pips (desktop card, top-right)*, §*Mana pip*, §*Oracle text glass panel*, §*Type line (oracle panel)*, §*Oracle text lines* and §*P/T line (oracle panel)* — become stale for the desktop left column. The mana-pip colour map is still used by the **mobile** art header, so §*Mana pip* survives at the mobile breakpoint.
- **Commission:** if Design wants the mana cost or oracle text present in the left column, they need a placement that does not sit on the art — e.g. a row beneath the type line for the pips, or an oracle block below the identity row. That is a new component and needs a handoff. Eng will not reinstate the overlay.

Eng's recommendation is **ratify**, with an optional follow-up handoff for a below-card mana-cost row if Design considers the cost worth restating outside the scan.

---

## Item 2 — "Compare with another general" CTA removed — **REMOVAL of an inert control**

### Current state

`commanders.md:1205-1215` specifies the button in full:

| Property | Mobile | Desktop (shipped) |
|---|---|---|
| font-family | — | IBM Plex Sans, sans-serif |
| font-weight | — | `600` |
| font-size | — | `13px` |
| color | — | `#EDE6D8` |
| background | — | `transparent` |
| border | — | `1px solid #3A3229` |
| border-radius | — | `8px` |
| padding | — | `11px 0` |
| width | — | `100%` |
| **onClick** | — | **none** |
| **href** | — | **none** |
| **destination** | — | **none** |

It shipped as a `<GhostButton>` with a className and a label and no other props. Clicking it did nothing — no navigation, no state change, no console error. It was a fully-styled button that had never been wired, because there is no compare surface in the app to wire it to.

### Why removal rather than leaving it

A control that looks live and isn't is worse than an absent one. It is keyboard-focusable, announced as a button by screen readers, and carries the app's full secondary-CTA treatment — every affordance says "this works." A user who clicks it and gets nothing reasonably concludes the app is broken, not that the feature is unbuilt.

Leaving it with a `disabled` attribute was considered and rejected: a permanently-disabled control communicates "not available *right now*," which implies a condition that could change. Nothing can change; the destination does not exist.

### Target

| Property | Mobile | Desktop |
|---|---|---|
| rendered | not rendered (was desktop-only) — unchanged | **not rendered** |

The left column's sticky stack is now: back link → card frame → name/type block → identity pip row → `Build this deck →` → seed note. The seed note (`commanders.md:1217`, described in the table as *"Seed note (below Compare button)"*) is unchanged in every property — `10.5px` mono, `#6E6353`, centred, `1.5` line-height — and simply follows the primary CTA directly. The column's `gap: 16px` handles the spacing; no margin was added or removed.

### What Design has to decide

- **Ratify:** `commanders.md:1205-1215` becomes stale, and `commanders.md:1217`'s section title ("below Compare button") needs re-anchoring to the `Build this deck →` button.
- **Commission:** commander comparison is a real product idea — side-by-side fit scores, overlapping owned pools, role-coverage diffs. If it is still wanted, it needs a handoff covering the compare surface itself, how a second commander is chosen, and what the comparison shows. The button cannot come back before the page it points at exists.

Eng has no view on whether the feature is wanted. Eng's view is only that a styled control with no destination should not be in the build while that question is open.

---

## Item 3 — "Includes ▾" filter dropdown removed — **REMOVAL of an inert control**

### Current state

`commanders.md:300-310` specifies it as a desktop-only control in the `/commanders` filter row:

| Property | Mobile | Desktop (shipped) |
|---|---|---|
| font-family | — | IBM Plex Sans, sans-serif |
| font-size | — | `13px` |
| font-weight | — | `500` |
| color | — | `#8E8269` |
| background | — | `#181410` |
| border | — | `1px solid #3A3229` |
| border-radius | — | `8px` |
| padding | — | `9px 14px` |
| label | — | `Includes ▾` |
| **disabled** | — | **`true`** (hard-coded) |
| **cursor** | — | `default` |
| **menu** | — | **none — no dropdown was ever built** |

It shipped `disabled` with `cursor: default` and a source comment marking it *"(desktop, styled-only)"*. There is no menu behind it, no filter state it writes to, and no condition under which it enables.

### Why removal rather than leaving it

Same argument as Item 2, one degree worse: this control sits in a **filter row** where every sibling works. Colour pips toggle, the `Clear` link clears, the count updates live. A permanently-dead control in that row implies the filter set is broken or that some precondition the user hasn't met would light it up. `▾` is an explicit promise of a menu.

### Target

| Property | Mobile | Desktop |
|---|---|---|
| rendered | not rendered (was desktop-only) — unchanged | **not rendered** |

The desktop filter row is now: colour chips → `Clear` (conditional) → `Order: Fit ↓ · fixed` (which carries `margin-left: auto`) → `Showing N of M`. Because the order label was already right-pushed by `auto` margin, removing the button changes no other element's position: the gap it occupied was already flexible space. Every remaining control keeps its locked properties. `commanders-view.tsx`, formerly lines 214-231.

### What Design has to decide

- **Ratify:** `commanders.md:300-310` becomes stale.
- **Commission:** if a second filter axis on `/commanders` is wanted, the handoff needs to say what it filters on — the label `Includes` suggests "commanders whose deck includes card X," which would be a card-search filter and a substantially different control from the colour pips beside it — plus the open/selected/multi-select states and the mobile equivalent (the current spec is desktop-only, which leaves mobile with no path to the same filtering).

Eng's recommendation is **ratify**, and treat the filter axis as a fresh product question if it comes back.

---

## Contrast — WCAG AA

Only Item 1 moves text. Ratios below are against the surface the text now sits on, `var(--bg)` `#14110E` (the detail page canvas behind the sticky column).

| Element | Colour | On | Ratio | Verdict |
|---|---|---|---|---|
| Commander name (after) | `#EDE6D8` (`--fg`) | `--bg` | **15.3:1** | AA / AAA ✅ |
| Type line (after) | `#C6B79A` (`--fg-body`) | `--bg` | **9.9:1** | AA / AAA ✅ |
| Commander name (before) | `#F4EEE0` | commander art + `rgba(10,7,4,0.85)` scrim | **indeterminate** | see below |
| Type line (before) | `#EDE6D8` | art + scrim + `rgba(10,7,4,0.5)` glass | **indeterminate** | see below |
| Oracle text (before) | `#E4DCCB` | art + scrim + glass | **indeterminate** | see below |

**This item is a contrast *improvement*, and the outgoing values were unmeasurable.** WCAG 1.4.3 requires a determinate background. Text over a photograph has none — the ratio changes per card, per pixel, and the app renders whatever Scryfall returns for ~2,000 possible commanders. The `0.85` scrim and `0.5` glass panel were mitigations for exactly that, and mitigations of that kind can only ever be argued as "probably fine on most art," never measured. Three text-shadows in the removed treatment (`0 1px 6px`, `0 1px 4px`, `0 1px 3px`, all near-black) are the tell: shadowed text over an unknown backdrop is the standard signature of an unmeasurable contrast situation.

Moving both strings to `--bg` replaces three indeterminate pairings with two measured ones at **15.3:1** and **9.9:1**. Nothing regresses; two AAA passes replace three unknowns.

Items 2 and 3 remove text (`#EDE6D8` at 15.3:1 and `#8E8269` at 4.7:1 respectively). Nothing takes their place, so there is nothing to measure. Both removals also delete a focusable element, which slightly shortens the desktop tab order — an improvement, since both were focus stops that led nowhere.

## New tokens

**None required.** All three items are removals. Item 1's relocated text uses `--fg` and `--fg-body`, both already in `src/app/globals.css`; it deletes the raw hex `#F4EEE0` and `#E4DCCB`, neither of which is a token. Items 2 and 3 delete raw hex only.

---

## READINESS

**🟠 ORANGE.** All three items are removals of specified components. None can be ratified by Eng.

| Item | Verdict |
|---|---|
| 1 — card-art overlays removed, name/type moved below | 🟠 **User-requested removal of a specified treatment.** Eng's argument — the card scan already prints all four strings, and the 70px black scrim needed to make the overlay legible was blanking the bottom third of the art — is strong, and the change turns three unmeasurable contrast pairings into two AAA passes. But `commanders.md:1062-1147` specifies the overlay in eight sections and Design must ratify their retirement. The three relocated values (`21px`, `--fg`, `12.5px / --fg-body`) are Eng's and are Design's to overrule. If mana cost or oracle text should survive off the art, that is a new component and needs a handoff. |
| 2 — "Compare with another general" removed | 🟠 **A fully-specified CTA with no handler and no destination.** Removing it is not a styling call: Design must either ratify that comparison is out of scope for now, or commission the compare surface. The button cannot return before the page it points at exists. |
| 3 — "Includes ▾" removed | 🟠 **Same shape.** A permanently-`disabled` stub in a filter row where every sibling works. Ratify, or commission a real second filter axis — including what it filters on and a mobile equivalent, which the current desktop-only spec does not have. |

No new tokens. No design-table edits made by Eng. `commanders.md:300-310`, `:1062-1147`, `:1205-1215` and the section title at `:1217` all go stale on ratification; §*Mana pip* (`:1102-1122`) survives at the mobile breakpoint, which still renders an art header with pips.
