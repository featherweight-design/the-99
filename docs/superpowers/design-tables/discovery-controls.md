# Design Property Table — Discovery Controls (Phase 9)

**Sources:** `CONTROLS-four-above-one-list.md` (primary), `README.md` component-notes rows 297–301 + engineering notes, `The 99 - Commander Discovery.dc.html` frames B1/B2/D1/E2, `commander-discovery · copy strings.ts` (key structure only).

**Token ↔ hex map** as drawn on the canvas (the canvas is hex-only; the README names the tokens). Implementation must use the variable, never the hex.

| Token | Canvas hex |
|---|---|
| `--bg` | `#100D0A` (page) / `#14110E` (base, used as selected-segment label colour) |
| `--surface` | `#1E1A15` |
| `--surface-rail` | `#1A1611` |
| `--surface-sunken` | `#18140F` |
| `--elevated-hover` | `#201C17` |
| `--border` | `#2B241B` |
| `--border-strong` | `#3A3229` |
| `--accent` | `#CF8745` |
| `--fg` | `#EDE6D8` |
| `--fg-body` | `#C0B8A6` |
| `--fg-muted` | `#A59C89` |
| `--fg-faint` | `#8B8270` |
| `--fg-locked` | `#6E6654` |

**Fonts:** `var(--font-mono)` = IBM Plex Mono; `var(--font-sans)` = IBM Plex Sans (body default, no explicit `font-family` on sans elements); `var(--font-display)` = Cinzel (headings only).

---

## Component: Scope control (§7.2 tier 1)

Lives in the page header. Desktop: right-aligned on the same flex row as title+subtitle. Mobile: full-width row directly beneath the subtitle.

### Header row wrapper (desktop only — the flex row holding title block and scope)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (title, subtitle, scope stack as block flow) | flex |
| align-items | — | flex-end |
| justify-content | — | space-between |
| gap | — | 24px |
| flex-wrap | — | wrap |
| padding (header block) | 14px all sides (phone frame padding) | 22px top / 34px right / 18px bottom / 34px left |

### Scope group (label + segmented control)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (no label wrapper; segmented control is the direct child) | flex |
| align-items | — | center |
| gap | — | 10px |

### `Show` label
| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | no — the label is absent at 390px | yes |
| font-family | — | var(--font-mono) |
| font-size | — | 10px |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | var(--fg-faint) |
| font-weight | — | 400 (unset) |
| copy key | — | `discoveryCopy.scope.label` |

### Segmented container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 3px | 3px |
| padding | 3px (all sides) | 3px (all sides) |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border-width | 1px | 1px |
| border-style | solid | solid |
| border-color | var(--border-strong) | var(--border-strong) |
| border-radius | 8px | 8px |
| width | full width of the header column | shrink-to-fit |
| margin-top | 0 (subtitle carries `margin-bottom: 12px`) | 0 |
| role | radiogroup | radiogroup |

### Segment — unselected
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex | 1 | none (auto) |
| align-items | center | center |
| justify-content | center | flex-start (unset) |
| height | 38px | 32px |
| padding-left / padding-right | 0 | 14px / 14px |
| padding-top / padding-bottom | 0 | 0 |
| border-radius | 6px | 6px |
| font-family | var(--font-sans) | var(--font-sans) |
| font-size | 13px | 13px |
| font-weight | 400 (unset on canvas) | 500 |
| color | var(--fg-body) | var(--fg-body) |
| background | — (transparent) | — (transparent) |
| border | — | — |
| label copy key | `discoveryCopy.scope.ownedShort` / `playShort` | `discoveryCopy.scope.owned` / `play` |
| aria-label key | `scope.ownedAria` / `scope.playAria` | `scope.ownedAria` / `scope.playAria` |
| aria-checked | false | false |

### Segment — selected
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex | 1 | none (auto) |
| align-items | center | center |
| justify-content | center | flex-start (unset) |
| height | 38px | 32px |
| padding-left / padding-right | 0 | 14px / 14px |
| border-radius | 6px | 6px |
| font-size | 13px | 13px |
| font-weight | 600 | 600 |
| color | var(--bg) `#14110E` | var(--bg) `#14110E` |
| background | var(--accent) | var(--accent) |
| aria-checked | true | true |

### Keyboard / focus / motion (scope)
| Property | Mobile | Desktop |
|----------|--------|---------|
| tab stop | roving (one stop for the group) | roving (one stop for the group) |
| arrow keys | move within the group | move within the group |
| selection model | selection follows focus | selection follows focus |
| focus ring | global `:focus-visible`, 2px `--accent`, offset +2px, unoverridden | same |
| transition | none | none |
| transform | none | none |
| hover state | none specified | none specified |

---

## Component: Header subtitle

### Title (context — the subtitle's sibling)
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | h2 | h2 |
| font-family | var(--font-display) | var(--font-display) |
| font-weight | 700 | 700 |
| font-size | 19px | 26px |
| color | var(--fg) | var(--fg) |
| margin | 0 0 4px | 0 0 6px |

### Subtitle line
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | p | p |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 10.5px | 12px |
| font-weight | 400 | 400 |
| line-height | 1.5 | normal (unset) |
| letter-spacing | normal | normal |
| text-transform | none | none |
| color | var(--fg-faint) | var(--fg-faint) |
| margin | 0 0 12px 0 | 0 |
| copy key (owned scope) | `discoveryCopy.scope.subtitleOwned(candidates, cards)` | same |
| copy key (play scope) | `discoveryCopy.scope.subtitlePlay(candidates, cards, sort)` | same |
| rewrite trigger | every scope flip **and** every sort flip | every scope flip **and** every sort flip |
| content contract | population · ordering · collection size | population · ordering · collection size |

### Live-region announcement (same data, separate node)
| Property | Mobile | Desktop |
|----------|--------|---------|
| region | the page's existing live region — one region, three messages | same |
| scope message key | `discoveryCopy.scope.announce(scope, count, sort)` | same |
| sort message key | `discoveryCopy.sort.announce(sort, count)` | same |
| debounce | one message per settle | one message per settle |

---

## Component: Sort trigger (§7.2 tier 2)

Desktop: filter bar, immediately right of `Build from` (renamed from `Score against`, 2026-09-14), in the slot the inert `Order: Fit ↓ · fixed` label holds. On discover that control is absent altogether, so the trigger leads the cluster there. Mobile: right-hand child of the count row (row 4 of the stack).

### Trigger group wrapper
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex (the shared count row) | flex |
| align-items | center | center |
| justify-content | space-between | flex-start |
| gap | 10px | 8px |
| margin-top | 10px | 0 |

### `Sort` label
| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | no — trigger sits unlabelled beside the window count | yes |
| font-family | — | var(--font-mono) |
| font-size | — | 10px |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | var(--fg-faint) |
| copy key | — | `discoveryCopy.sort.label` |

### Trigger button
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 7px | 8px |
| height | 38px | 30px |
| padding-left / padding-right | 12px / 12px | 12px / 12px |
| padding-top / padding-bottom | 0 / 0 | 0 / 0 |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border-width | 1px | 1px |
| border-style | solid | solid |
| border-color | var(--border-strong) | var(--border-strong) |
| border-radius | 8px | 8px |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 11.5px | 12px |
| font-weight | 400 | 400 |
| color | var(--fg) | var(--fg) |
| label copy key | `discoveryCopy.sort.fit` / `.new` (current value) | same |
| aria-label key | `discoveryCopy.sort.triggerAria(current)` | same |
| transition | none | none |
| hover state | none specified | none specified |
| focus ring | global `:focus-visible`, 2px `--accent`, offset +2px | same |

### Trigger caret
| Property | Mobile | Desktop |
|----------|--------|---------|
| glyph | `▾` U+25BE (text, **not** SVG) | `▾` U+25BE (text, **not** SVG) |
| color | var(--accent) | var(--accent) |
| font-size | inherits 11.5px | inherits 12px |
| element | inline span inside the trigger, separated by the flex `gap` | same |

### Window-count sibling on the mobile row (left child)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | n/a (desktop count sits at `margin-left:auto` in the filter bar) |
| font-size | 10.5px | 11px |
| color | var(--fg-faint), emphasised figures var(--fg-body) 600 | var(--fg-faint), figures var(--fg-body) 600 |
| letter-spacing | normal | 0.12em, uppercase |

### `Something new — unavailable` note (no-decks state only, beside the trigger)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 11px | 11px |
| color | var(--fg-locked) | var(--fg-locked) |
| gap from trigger | 10px | 10px |

### Owned-scope reversion
| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered element | inert label, **not** a button | inert label, **not** a button |
| text | shipped `Order: Fit ↓ · fixed`, verbatim | shipped `Order: Fit ↓ · fixed`, verbatim |
| styling | shipped label's, unchanged | shipped label's, unchanged |

---

## Component: Sort menu (popover)

Same menu at both widths — README states-delivered marks B2 as "✓ / — (same menu)".

### Menu container
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 300px | 300px |
| background | var(--surface-rail) | var(--surface-rail) |
| border-width | 1px | 1px |
| border-style | solid | solid |
| border-color | var(--border-strong) | var(--border-strong) |
| border-radius | 10px | 10px |
| padding | 6px (all sides) | 6px (all sides) |
| role | menu | menu |
| transition | none | none |

### Option row — base
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10px | 10px |
| padding-top / padding-bottom | 11px / 11px | 11px / 11px |
| padding-left / padding-right | 12px / 12px | 12px / 12px |
| border-radius | 7px | 7px |
| background | — (transparent) | — (transparent) |
| hover state | none specified | none specified |

### Option row — selected
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | var(--elevated-hover) | var(--elevated-hover) |
| aria-checked / aria-selected | true | true |
| all other properties | as base | as base |

### Option diamond — selected
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 6px | 6px |
| height | 6px | 6px |
| transform | rotate(45deg) | rotate(45deg) |
| background | var(--accent) | var(--accent) |
| border | — (none) | — (none) |
| flex | none | none |
| element | span (**not** SVG, no path, no viewBox) | span |

### Option diamond — unselected / disabled
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 6px | 6px |
| height | 6px | 6px |
| transform | rotate(45deg) | rotate(45deg) |
| background | — (transparent) | — (transparent) |
| border-width | 1.5px | 1.5px |
| border-style | solid | solid |
| border-color | var(--border-strong) | var(--border-strong) |
| flex | none | none |

### Option text column
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | 1 |
| min-width | 0 | 0 |

### Option label — enabled
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-sans) | var(--font-sans) |
| font-size | 13.5px | 13.5px |
| font-weight | 600 | 600 |
| color | var(--fg) | var(--fg) |
| text-decoration | none | none |
| copy keys | `discoveryCopy.sort.fit` / `.new` | same |
| aria-label keys | `sort.fitAria` / `sort.newAria` | same |

### Option sub-line (sort-key naming)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 10.5px | 10.5px |
| font-weight | 400 | 400 |
| color | var(--fg-faint) | var(--fg-faint) |
| margin-top | 2px | 2px |
| line-height | normal (single-line case) | normal |
| copy keys | `discoveryCopy.sort.fitKey` / `.newKey` | same |

---

## Component: Sort menu — disabled option state

Applies to the `Something new` option when the player has built no deck. Three signals: strikethrough + `--fg-locked` + the sentence.

### Row
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — (transparent; never gets the selected fill) | — |
| aria-disabled | true | true |
| `disabled` attribute | **must not** be set | **must not** be set |
| focusable / reachable | yes — stays reachable and readable | yes |
| padding, radius, gap, align-items | as base option row | as base option row |

### Diamond
| Property | Mobile | Desktop |
|----------|--------|---------|
| width / height | 6px / 6px | 6px / 6px |
| transform | rotate(45deg) | rotate(45deg) |
| border | 1.5px solid var(--border-strong) | 1.5px solid var(--border-strong) |
| background | — (transparent) | — |
| retained | yes — the option "keeps its place, its glyph and its explanation" | yes |

### Label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5px | 13.5px |
| font-weight | 600 | 600 |
| color | var(--fg-locked) | var(--fg-locked) |
| text-decoration | line-through | line-through |

### Sub-line (carries the reason)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 10.5px | 10.5px |
| color | var(--fg-faint) — **full** faint, not dimmed further | var(--fg-faint) |
| margin-top | 2px | 2px |
| line-height | 1.5 (it wraps) | 1.5 |
| copy key | `discoveryCopy.sort.newDisabled` | same |
| aria-label key | `discoveryCopy.sort.newDisabledAria` | same |

---

## State Coverage

| State | Triggering condition | What renders | Key props required |
|---|---|---|---|
| scope = owned | `?scope` absent (default) | Header segmented control with `Commanders I own` selected; subtitle from `subtitleOwned`; the sort slot reverts to the inert shipped `Order: Fit ↓ · fixed` label — **no trigger, no menu** | `scope`, `candidates`, `cards` |
| scope = play | `?scope=play` | `Something to play` selected; subtitle from `subtitlePlay(candidates, cards, sort)`; sort trigger renders in the `Order` slot | `scope`, `sort`, `candidates`, `cards` |
| sort = fit | `?sort` absent (default), scope = play | Trigger label `Best fit`; menu row 1 selected (filled accent diamond, `--elevated-hover` background); subtitle ordering clause reads `ranked by best fit` | `sort="fit"` |
| sort = new | `?sort=new`, scope = play | Trigger label `Something new`; menu row 2 selected; subtitle ordering clause reads `ranked by what is new to you` | `sort="new"`, requires `hasDecks` |
| hasDecks = false | player has built zero decks (`decks` table empty; `filled` is irrelevant — any deck of any kind counts) | `Something new` menu option is `aria-disabled`, `--fg-locked` + line-through, sub-line = `sort.newDisabled`; a mono 11px `--fg-locked` `Something new — unavailable` note sits right of the trigger; a first-run `GuidedBanner` carries the long form; **the list underneath is full** | `hasDecks=false`, `cards` for the banner body |
| hasDecks = true | ≥1 deck of any kind | `Something new` option fully enabled: `--fg` 600, no strikethrough, no aria-disabled; the unavailable note does not render | `hasDecks=true` |
| menu closed | default | Trigger only | `sort` |
| menu open | trigger activated | 300px popover, two option rows | `sort`, `hasDecks` |
| mobile (<640px) | viewport < 640px | Scope label hidden, short segment labels, 38px full-width halves; `Sort` label hidden, 38px trigger on the count row | — |
| desktop (≥640px) | viewport ≥ 640px | `Show` label, long segment labels, 32px auto-width segments; `Sort` label, 30px trigger | — |

---

## Numbered Rules

Verbatim normative statements governing these four surfaces.

> **Rulings 15, 18 and 30 are SUPERSEDED, and were before this table was written.**
> They govern a `Score against` control under discovery — one that keeps its place,
> shows a disabled `What's free` segment, and re-ranks on a fetch. Discover mounts
> no such control: it is the owned lane's alone under locked decision 3, and
> `availability-control.tsx` says so in its own header. Nothing here reinstates it.
> The rulings are left as written because they are quotations of what Design said,
> not a spec anyone should now implement; what changed on 2026-09-14 is only that
> the control is named `Build from`, and that the row above states the absence
> plainly instead of leaving it to be inferred.

1. > "**Tier 1 — scope, in the page header, beside the title.** It changes which commanders exist on this page, which is the same class of change as the title. Label `Show`, two segments, the shipped segmented geometry at 32px."
2. > "The subtitle beneath the title restates the population in words on every flip"
3. > "That line is how the player knows the list changed without counting rows, and it is the reason scope needs no count of its own."
4. > "**Tier 2 — sort, in the filter bar, in the `Order` label's slot.** A label that always announced the order becomes the control that sets it. The filter bar gains a control without gaining a row, and the two shipped controls keep their positions, their geometry and their pixels. Under the owned scope the slot reverts to the shipped label verbatim."
5. > "**Reading order, left to right, is unchanged and now means something:** narrow (colours) → score against (which cards count) → order (which sort). Scope is above all three because it precedes all three."
6. > "A segment cannot carry a sentence."
7. > "Each option also carries a one-line naming of its sort key (`most of the cards popular with it already owned` / `farthest from the themes you have built`), because ruling 3 forbids a blend and two unexplained words would imply one."
8. > "**Title + subtitle**, then scope: 38px full-width halves, shipped mobile `ScoreAgainst` geometry. Labels shorten to `I own` / `To play` — the subtitle carries the long form, so the segments only need to be distinguishable, not self-explanatory."
9. > "**Count row**: window count left, **sort trigger right** — 38px, mono 11.5px, `▾` in accent. This is the row that already read `Fit ↓ · fixed`."
10. > "**Nothing new becomes sticky.** Four stacked controls pinned at 390px leaves roughly a third of the viewport for the list, and the list is the surface. Scrolling puts all four away together, which is also what keeps the tiering legible: they are one block, in one order, in one place."
11. > "**Scope must not gain a third option.** "Everything" (all 3,342, built included) is a fourth question, and ruling 2 already answered it: the built ones are excluded because they are done."
12. > "**Sort must not gain a "relevance" default.** That is a blend with a friendlier name."
13. > "**Neither control may animate the list.** Both flips re-render in place. A dimmed or sliding list at 3,334 rows makes a state change look like a fetch even when it is one."
14. > "**The subtitle must never be the only statement of the sort.** The sort control says it too. A player who arrives from a shared URL reads the control; a player who flips reads the subtitle."
15. > "**Colours and `Score against` do not move**, and nothing about their appearance changes."
16. > "The disabled option keeps its place, its glyph and its explanation — ruling 8 asks for a stated reason, and this is a **first-run state, not an edge case**, so it is the very first thing a new player reads about novelty."
17. > "`aria-disabled`, not `disabled` — it stays reachable and readable."
18. > "Three signals, matching the shipped disabled `What's free` segment."
19. > "**`CommandersView` gains two pieces of state, both URL-mirrored** through the existing `history.replaceState` effect: `?scope=play` and `?sort=new`. Only non-defaults are written, so today's URL is unchanged for a player who touches neither — the same rule `?avail=all` follows."
20. > "**A scope or sort flip resets `shown` to `REVEAL_STEP`**, exactly as `setAvail` does today. Both reasons apply: different commanders occupy the revealed range, and the window belongs to the result set rather than the session."
21. > "the discovery list is fetched for the active sort only, and a sort flip is allowed to be a fetch — which is why the sort control is a menu, and why neither flip animates."
22. > "**One live region, three messages**, on the region the page already owns: scope announces the new population and ordering, sort announces the re-rank, the reveal keeps its shipped range message. Debounced to one per settle."
23. > "**Scope is a radiogroup**, on the shipped `ScoreAgainst` pattern — roving tab stop, selection follows focus, arrows within. It swaps data, not panels, so it is not a tablist. **Sort is a menu** because one option can be unavailable with a reason."
24. > "**Motion: none.** Both flips are state changes over data already on the client — no transition, no dimmed list, no skeleton. The list re-renders in place, as the shipped toggle does."
25. > "**Focus.** Global `:focus-visible`, 2px brass at +2px, unoverridden."
26. > "`--fg-locked` is used only for the disabled sort option and the dimmer of the two reveal lines, both of which repeat information available elsewhere."
27. > "**No new token, no new hex, no new motion class, no new empty state, no new modal, no new component.**"
28. > "Hexes live only in `globals.css`."
29. > "There is no "finished" deck. `decks` carries `filled`, not a completion flag … the novelty sort unlocks on the first one of any kind."
30. > "**`Score against` re-ranks under discovery** rather than switching off, so the flip is a fetch exactly as the sort flip is."
31. > "the menu option carries the short reason, the banner carries the long one, and neither invents a third sentence." (two signals, one fact — the no-decks state)
32. > "NUMBERS ARE LOCALE-FORMATTED HERE, unlike availability.ts." — every count rendered by the subtitle and the announcements passes through `toLocaleString("en-US")`.

---

### Notes on conflicts and implicit values resolved from the canvas

- **Mobile sort-trigger font-size:** README says "mono 12px" without a phone override; `CONTROLS-four-above-one-list.md` and the canvas both say **11.5px** at 390px. Take 11.5px.
- **Trigger internal gap:** not in the README. Canvas: **8px desktop, 7px mobile**.
- **`Show` and `Sort` labels are desktop-only.** The README implies a `Show` label unconditionally; the 390px frame draws neither label. The mobile scope segments sit directly under the subtitle and the mobile trigger sits unlabelled on the count row.
- **Unselected segment weight:** desktop canvas sets `font-weight:500`; the mobile frame sets none (400). The README only specifies the selected weight (600).
- **Menu diamond hollow colour is `--border-strong`** (`#3A3229`) — deliberately *not* the row-pip's hollow `--fg-locked`.
- **No SVG anywhere in these four surfaces.** The caret is the text glyph `▾` (U+25BE) and the option marker is a 6px `<span>` with `transform: rotate(45deg)`. There is no viewBox, path, stroke-width or stroke-linecap to match.
- **No hover states are specified** for any of the four surfaces; the only interactive-state style the design names is the global `:focus-visible` ring.

---

# Amendments — R6 (`design_handoff_the99_commanders_plane`)

The R6 handoff supersedes two rows of the tables above and adds two controls to the
filter bar. Everything not named here stands as written.

## Superseded: the header row wrapper (§7.2 tier 1)

The scope control used to share a flex row with the title and its subtitle, so the
subtitle's length set the control's x-position and a scope flip moved the control out
from under the click that moved it (#335). The header is now two rows at both widths.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex, `flex-wrap: wrap` | flex, `flex-wrap: wrap` |
| align-items | center | center |
| justify-content | — (children are full-width) | space-between |
| column-gap | — | 24px |
| padding | 18px left/right, 20px top, 12px bottom | 34px left/right, 28px top, 0 bottom |
| border-bottom | 1px solid var(--border) | — (the sticky filter bar carries it) |
| title (h1) | order 1, `width: 100%`, 22px | order 1, `width: auto`, 30px |
| subtitle (p) | order 2, `width: 100%`, 11px, margin-top 2px | order 3, `width: 100%`, 12px, margin-top 4px |
| scope group | order 3, `width: 100%`, margin-top 12px | order 2, `width: auto`, margin-top 0 |

Wrapping is what makes the rows: each full-width child claims a line of its own, and
`order` puts the subtitle under the control on desktop and over it on mobile. The scope
control's x-position is now a function of the header's padding alone.

## Added: search field (§4.3) — the filter row's leading edge

Discovery only. The owned scope passes no `query`, and the slot then renders **nothing**
— not an empty wrapper, which would still contribute the row's gap and shift the owned
bar sideways. One subtree with responsive classes, never a mobile copy and a desktop
copy, so the input appears in the accessibility tree once.

| Property | Mobile | Desktop |
|----------|--------|---------|
| position in the row | left child of the count/order row (row 4 of the stack) | first child of the filter row, ahead of the pip wrapper |
| container height | 38px | 30px |
| container width | `flex: 1`, `min-width: 0` | 280px, `flex: none` |
| container padding-left / right | 10px / 10px | 10px / 10px |
| container gap | 7px | 8px |
| container background / border / radius | shared `SearchField` chrome, unchanged | same |
| leading element | mono 10px, `0.12em`, var(--fg-faint), `aria-hidden` | same |
| leading copy key | `planeCopy.search.caption` | same |
| input font-size | **16px** (iOS zoom floor, #101 — the drawing says 13px) | 12.5px |
| placeholder colour | var(--fg-faint) (one token for every search field, 2026-10-13: `--fg-locked` reads 2.5 to 3.4:1 on the six themes' fields, `--fg-faint` 3.4 to 5.2:1) | same |
| placeholder copy key | `planeCopy.search.placeholder` | same |
| input aria-label key | `planeCopy.search.inputAria` | same |
| clear glyph | `✕`, 12px in a 24px circle on var(--border), var(--fg-faint), `SearchField`'s own `onClear`: always mounted, `visibility:hidden` while the value is empty, one tap clears and keeps focus (2026-10-13) | same |
| clear aria-label key | `planeCopy.search.clearAria` | same |
| URL mirroring | `?q=`, non-default only, through the existing `replaceState` effect | same |
| announcement key | `planeCopy.search.announce(matched, total)`, one per settle; a cleared query announces nothing | same |

**The mobile count it displaces is not lost.** Search takes the count row's left child
rather than adding a fifth row to a stack the handoff already measures at +173px;
`RevealControl` still prints `N shown · M more below` inside the list.

## Added: colour match mode (§7) — a modifier of the pip row

A radiogroup on the `ScoreAgainst` pattern (roving tab stop, selection follows focus),
rendered **only while a pip is lit**: with no selection there is nothing to be exact
about, so it is absent rather than disabled. Discovery only.

| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | a peer row directly under the pip row it modifies | **inside** the pip wrapper, behind a 1px × 16px `--border-strong` hairline with 2px side margins |
| visible label | mono 9px, `0.16em`, uppercase, var(--fg-faint), margin-bottom 6px | none — `COLORS` already captions the wrapper |
| label copy key | `planeCopy.join.label` | — |
| group accessible name | `aria-labelledby` the mobile label | `aria-label` = `planeCopy.join.groupAria` |
| container background | var(--surface-sunken) | var(--bg) — a step down, so it reads as nested |
| container border / radius / padding / gap | 1px `--border-strong` / 8px / 3px / 3px | 1px `--border-strong` / 6px / 2px / 2px |
| segment height | 38px | 20px |
| segment font | sans 13px | mono 10px, `0.08em`, uppercase |
| segment padding-left / right | 10px / 10px, `flex: 1` | 8px / 8px |
| segment radius | 6px | 4px |
| segment — selected | 600, var(--bg) on var(--accent) | same |
| segment — unselected | 500, var(--fg-body) on transparent | 500, **var(--fg-locked)** on transparent |
| segment copy keys | `planeCopy.join.contains` / `.exactly` | same |
| segment aria-label keys | `planeCopy.join.containsAria` / `.exactlyAria` | same |
| URL mirroring | `?join=exact`, non-default only | same |

### The exact note (rendered under the control while the mode is `exactly`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font | mono 10.5px, line-height 1.5 | mono 11px |
| color | var(--fg-faint); the two figures lift to var(--fg-body) at 600 | same |
| margin-top | 7px | 8px |
| copy key | `planeCopy.join.exactNoteShort(matched, total, colors)` | `planeCopy.join.exactNote(matched, total, colors)` |
| suppression | **suppressed** whenever an excluded-match report already names the mode (the one-report rule, §4) | never suppressed — desktop has the width, and the two sit far apart |
