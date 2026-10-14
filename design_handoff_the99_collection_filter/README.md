# The 99 — Collection · Set filter panel (design handoff addendum)

Branch **`feat/printings-and-sets`**. A light addendum to the **shipped** Collection surface: the
`Set ▾` control in the filter bar stops being a native `<select>` of 254 raw lowercase set codes and
becomes a searchable, multi-select panel. One control, its states, and the keyboard/screen-reader
model that replacing a native widget obliges us to specify. Nothing else on the surface is
redesigned.

File: `The 99 - Collection · Filter Panel.dc.html` (canvas — pan/zoom). Each state leads with the
phone, desktop beside it. Read `design_handoff_the99_collection/README.md` first — this document
only records what **changes**.

**Locked decisions honoured** (spec §locked): set **names** over codes · **searchable** ·
**owned sets only** · **per-set card counts** · **release-date default order**.

## States delivered
- **The trigger** — rest / hover / focus-visible / open / one selected / many selected / disabled,
  plus where the selection actually lives (the shipped chip row).
- **The panel** — desktop popover anatomy and mobile sheet anatomy, with the four row states
  (hover, selected, keyboard-active, zero-count disabled) and the full roles + announcements spec.
- **1 · Closed** — the shipped bar, one button relabelled.
- **2 · Open, empty search** — 254 sets, newest first.
- **3 · Open, with query** — `bloom`, 2 of 254 matching.
- **4 · No results** — `eldraen`, empty state at final copy.
- **5 · One selected** — Bloomburrow; trigger, chip and result count together.
- **6 · Many selected** — 3 sets **plus** an active `Type: Instant`, showing the pinned Selected
  group, filter-aware counts, and a zero-count disabled row.
- **7 · Keyboard focus walk** — four ordered frames, trigger → open → toggle → dismiss.
- **Siblings** — what Type ▾ and Sort ▾ become, and why Color ▾ doesn't change.

Mobile (<768px) and desktop (≥768px) frames exist for states 1–6; the keyboard walk and the
sibling frames are drawn once at the size where the distinction is legible, with the mobile
difference stated in the panel-anatomy card (48px rows, 18px boxes, two-line wrap, focus trap).

---

## Decisions log

### 1. Form factor → **anchored popover on desktop, bottom sheet under 768px**
Not a modal on desktop: the whole point of live-applied filters is watching the list behind you get
shorter, and a dimmed backdrop hides exactly that. The popover is `340px`, anchored to the trigger's
left edge, `6px` below, list capped at `384px` (≈9.5 rows — the half row is the scroll cue). It
closes on outside click, Esc, and scroll of the underlying page.

On phone a popover is unusable here: the filter row scrolls horizontally, so an anchored panel
would hang off-screen or cover its own trigger, and a 340px popover is 87% of the viewport anyway —
a sheet with the honesty of a sheet. `role="dialog" aria-modal="true"`, focus trapped, dismissed by
handle-drag, backdrop tap, ✕, Esc, or **Done**. The backdrop is `rgba(8,6,4,.72)`, the same scrim the
shipped card modal uses.

### 2. Selection → **multi-select, applied live, no Apply button**
"Do I own anything from Bloomburrow *or* Modern Horizons 3" is the real question; a single-select
set filter answers half of it and forces a re-open per set. Multi-select also costs nothing new
downstream — the chip row already renders N dismissable chips and `Clear all`, and the query API
already takes a list.

**No Apply/Cancel.** Every other control in this bar applies on click; a staged panel in the middle
of a live bar would be the only place in the app where a filter has to be committed. Esc therefore
means dismiss, never undo — stated explicitly because a `<select>`'s Esc *did* revert.
`Done` on mobile is a dismiss button, nothing more; it is brass because it is the sheet's way out,
not because it commits anything.

### 3. Trigger label → **name at one, count pip past one**
`Set ▾` → `Set: Bloomburrow ▾` (truncated at 230px) → `Set` + brass `3` pip. Concatenating names
past one blows the bar's width budget and duplicates the chip row badly; a bare count is honest and
the names are one row below. The border turns brass whenever the filter is active, matching the
active treatment already used by the colour pips.

### 4. Order → **release date desc; ties A→Z; selected pinned on open only**
Release-date default is locked. The tiebreak (same-day releases — a main set and its Commander
decks) is alphabetical by name, so `Bloomburrow` sits above `Bloomburrow Commander` deterministically
rather than in query order.

Selected sets are lifted into a `Selected · N` group at the top **when the panel opens**, and the
grouping is **not** recomputed while it is open. Re-sorting on every toggle would move rows under
the pointer mid-interaction — the classic multi-select trap. Under a query the grouping is dropped
entirely; matches sort prefix-first, then substring, release order inside each group.

### 5. Counts → **owned cards, respecting the *other* active filters**
A count that ignores the rest of the bar promises results the list won't show. So the figure is
"cards you own from this set **that would survive your other filters**" — with `Type: Instant`
active, Bloomburrow reads `12`, not `142` (state 6). A set that reaches **0** is **not removed**: it
stays listed at `opacity .42` with `aria-disabled="true"` and does not toggle. Removing it would
make sets appear and vanish as you adjust other filters; dimming says *you own it, just not like
this*. Counts are formatted with thousands separators in Plex Mono, tabular figures, right-aligned.

### 6. Search → **substring on name *and* code, no highlighting**
Case-insensitive substring, matched against the set name and its code, so a player who thinks in
`blb` still lands. Prefix matches rank above substring matches. Matched characters are **not**
highlighted: at 40px rows a brass fragment in every row reads as noise, and the query is visible in
the field two inches above. Debounced 300ms for the live-region announcement only — filtering itself
is synchronous over a 254-item array.

### 7. Empty state → **one state, and it says why**
Because the list is owned-sets-only, "no match" most often means *you don't own that set*, not *you
typed it wrong* — so the copy says both: **"Nothing in the pile by that name"** (Cinzel, the one
flavour beat this control is allowed) over `No owned set matches "eldraen". Only sets you own are
listed here.` plus a secondary **Clear search**. The footer is dropped in this state; a
`254 sets owned` bar under "no matches" contradicts itself. Three brand diamonds stand in for the
card-fan mark (rebuild as SVG).

There is no *no sets at all* state: an empty collection is the App Shell's empty state, and the
whole filter bar is disabled there. The disabled trigger is drawn for completeness only.

### 8. Long names → **ellipsis in the popover, two-line wrap in the sheet**
Longest real names run to 43 characters (`Commander Legends: Battle for Baldur's Gate`). In the
340px popover the name column gets `min-width:0` + `text-overflow: ellipsis` with the count column
fixed at the right so it never gets pushed off; the **full** name is the option's accessible name,
so nothing is lost to a screen reader, and `title` carries it for the pointer. In the sheet there is
width to spare, so names wrap to a second line and rows grow — a `48px` min-height, not a fixed one.
Truncating on mobile purely for symmetry would be a worse experience for no gain.

### 9. Siblings → **Type converts, Sort becomes a menu, Color stays**
Design's call per the spec's open section. **Type ▾** is the same component with `searchable=false`
(~14 options, multi-select, counts). **Sort ▾** is *not* this panel — five mutually exclusive
options, no counts, no search, and picking one **closes** the menu. Making Sort a checkbox listbox
would imply multiple sorts. **Color ▾** is untouched: the WUBRG pips are already custom and already
right. Type and Sort are **follow-up work** — shipping Set alone leaves two native selects in the
row for one release, which is acceptable.

### 10. Accessibility model
Replacing a native `<select>` means the widget owes the full pattern:

```
button[aria-haspopup=dialog][aria-expanded]
  div[role=dialog][aria-label="Filter by set"]        (aria-modal only on mobile)
    input[role=combobox][aria-controls=set-list][aria-expanded][aria-activedescendant]
    ul#set-list[role=listbox][aria-multiselectable=true]
      li[role=option][aria-selected] / [aria-disabled]
```

- **DOM focus never leaves the search input** while the panel is open; `↑ ↓` move
  `aria-activedescendant` and scroll the active row into view (no wrap at the ends).
- `␣` / `↵` toggle the active option; panel stays open, **query is kept**.
- `Esc` closes and returns focus to the trigger. `Tab` closes on desktop; on mobile focus is trapped
  and cycles search → rows → Clear → Done.
- **Two different brass rings, deliberately distinct:** DOM focus is `2px #C9A24B` at `+2px` offset
  (outside the element); the keyboard-active option is the same ring at `-2px` offset (inside the
  row). Pointer hover is a fill (`#221D16`) and never a ring.
- The toggle announcement writes to the **filter bar's existing live region**, not a new one, so two
  filters changed in quick succession read in order instead of on top of each other.
- Contrast: option name `#EDE6D8` on `#1A160F` ≈ 12.9:1; count `#8E8269` ≈ 4.6:1 at 11.5px, AA and
  supplementary — the name alone carries the meaning. Disabled rows at `opacity .42` fail AA by
  design and are marked `aria-disabled`, per the WCAG exemption for inactive controls.
- Tap targets: whole row, `48px` min-height on mobile.
- Nothing animates except the sheet's translate-in; that is behind `prefers-reduced-motion`.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Trigger** | Unchanged geometry: `bg #2A241D`, `1px #3A3229`, radius `8px`, padding `9×14`, Plex Sans 500/13 `#EDE6D8`. Hover `bg #332C23 / border #4A4033`. Open `bg #3A3229 / border #C9A24B`, caret `▴`. Active (has selection) `border #C9A24B`. Disabled `bg #221D16 / text #6E6353`. |
| **Trigger count pip** | Plex Mono 11/600 `#14110E` on `#C9A24B`, radius `999px`, padding `1×7`. Shown at ≥2 selections. |
| **Popover** | `340px`, `bg #1A160F`, `1px #3A3229`, radius `12px`, shadow `0 24px 60px rgba(0,0,0,.6)`. List `max-height 384px`, `overflow-y auto`, bottom fade to `#1A160F`. |
| **Sheet** | Full width, radius `16px 16px 0 0`, `1px #3A3229` top, shadow `0 -20px 50px rgba(0,0,0,.5)`, `max-height 78vh`. Handle `36×4` `#3A3229`. Backdrop `rgba(8,6,4,.72)`. Bottom padding clears the tab bar. |
| **Panel search field** | Reuses `SearchField` from `text-field.tsx`: `bg #181410`, `1px #3A3229` → `1px #C9A24B` on focus, radius `8px`. `⌕` leading `#8E8269`; trailing clear `✕` in a `#2A241D` circle once a query exists. Mobile `12px` padding / 14px text (iOS zoom floor is 16px — see gap 3). |
| **Group label** | Plex Mono 10px, `letter-spacing .16em`, uppercase, `#8E8269`. `Newest first` · `Selected · N` · `N matches`. |
| **Option row** | `display:flex`, gap `11px`, padding `9×14`, `min-height 40px` (mobile `12×16` / `48px`). Name Plex Sans 13.5 `#EDE6D8` (mobile 14.5). Count Plex Mono 11.5 `#8E8269`, tabular, `#C6B79A` when selected. |
| **— hover** | `bg #221D16`. |
| **— selected** | Box `bg/border #C9A24B` with `#14110E` check. No row fill — a brass band per selection would outweigh the surface's primary action. |
| **— keyboard-active** | `outline 2px #C9A24B`, `outline-offset -2px`, radius `6px`. No hover fill. |
| **— disabled (0 under other filters)** | `opacity .42`, name `#A89B84`, box border `#3A3229`, `aria-disabled`, no pointer events. |
| **Checkbox** | `16px` (mobile `18px`), radius `4px`, `bg #14110E`, `1px #4A4033`; checked `#C9A24B` fill, `✓` `#14110E` 11px. Presentational — `aria-selected` on the option is the truth. |
| **Panel footer** | `1px #2A241D` top, padding `9×14`. Left Plex Mono 11 `#8E8269` (`254 sets owned` / `3 of 254 selected`); right `Clear` in brass, `#4A4033` and inert when nothing is selected. Mobile: `Clear` + primary `Done`. Omitted entirely in the no-results state. |
| **Empty state** | Three `#3A3229` diamonds (card-fan mark stand-in), Cinzel 600/17 `#EDE6D8` heading, Plex Sans 13.5 `#A89B84` body with the query in `#C6B79A`, secondary `Clear search` button (`1px #3A3229`). |
| **Chip (reused)** | `chip-row.tsx` unchanged — `#2A241D` pill, `1px #3A3229`, radius `999px`, 12.5px, trailing `✕` `#8E8269`. One per selected set, after the colour and type chips, in selection order. |
| **Sort menu** | `220px`, same shell as the popover, `role="menu"`, `38px` rows, leading `✓` in brass on the current option, no counts, closes on select. |

## Notes for engineering
- **New component:** `src/components/ui/filter-panel.tsx` — props `options[] {id,label,count,disabled}`,
  `selected[]`, `onToggle`, `onClear`, `searchable`, `label`. Renders popover ≥768px and sheet below
  via one `matchMedia('(min-width: 768px)')` hook; **do not** render both and hide one — the sheet is
  `aria-modal` and a hidden duplicate listbox breaks the accessibility tree.
- **`filter-bar.tsx`** swaps the `Set` `<select>` for `<FilterPanel searchable>`; `setFilter` state
  goes from `string` to `string[]`, and the query param from `&s=blb` to `&s=blb,mh3` (comma-joined,
  OR'd). Sets **AND** with every other filter.
- **`chip-row.tsx` is untouched.** It gains chips because it is handed more active filters.
- **Data need:** the collection query must return, per owned set, `{code, name, releasedAt, count}`
  where `count` is computed **under the other active filters**. Set names and release dates are not
  in the CSV — they come from the Scryfall set data the printings work on this branch is already
  landing. If names aren't available for a code, fall back to the uppercased code with the count
  still shown; never render a lowercase raw code.
- **No new dependencies.** The panel is ~150 lines of `useState` + key handling; a headless-UI
  library would be a larger change than the feature. 254 options need no virtualisation.
- **Theme-aware values** (`base`, `surface`, `elevated`, `line`, text ramp, `accent`) come from
  `src/app/globals.css` `var(--*)`; the hexes above are Palette A values for theme-independent
  reference only. No new token is introduced.
- **Copy** lives in `src/lib/copy/collection.ts` — see `collection-filter · copy strings.ts` in this
  folder for the exact strings, keyed and ready to paste, following `shell.ts`'s shape.
- Mock data: set names, codes and release dates are real; owned counts and the 254 / 2,933 figures
  mirror `data/the-vault.csv`'s shape and are fabricated.

## Gap report
Things this addendum deliberately does **not** answer, for the audit:
1. **The spec and the current `src/` are not in this design project.** I built against the shipped
   Collection handoff, the locked brand sheet, and the eight decisions as stated in the brief. The
   locked five are honoured; anything in
   `docs/superpowers/specs/2026-07-27-collection-filter-panel-design.md` beyond them — and the exact
   markup of `filter-bar.tsx` / `chip-row.tsx` / `text-field.tsx` — is **unverified**. Please diff
   decisions 3, 5 and 9 against the spec first; they are the ones most likely to collide.
2. **The property table.** `docs/superpowers/design-tables/collection.md:389-406` is not in this
   project either, so I could not confirm the new panel sits in that row without breaking it. The
   row's *external* geometry is unchanged (same button, same size, same position, same tab order),
   which should be the sufficient condition — but that is an assumption, not a check.
3. **iOS 16px zoom floor.** The sheet's search field is specced at 14px, which triggers Safari's
   focus zoom. Either bump to 16px (and re-check the sheet's vertical budget) or set
   `maximum-scale=1` on the viewport — a global decision I'm not making inside one control.
4. **Set counts under a name search.** If the player has typed in the *collection* search box, do the
   panel's per-set counts respect that too? Decision 5 says "other active filters"; a free-text query
   is arguably one. Drawn as *filters only, not text search* — cheap to compute, and the count stays
   stable while typing. Worth a second opinion.
5. **Ordering when release dates are missing.** Promos, Secret Lair drops and Alchemy sets have messy
   or absent release dates. Unspecified fallback: undated sets sort last, A→Z. Confirm against the
   real Scryfall payload.
6. **Persistence.** Set selections are plain state in the URL, like every other filter, so they
   survive a reload and back-navigation from `?card=`. No new persistence is introduced.

## Files
- `The 99 - Collection · Filter Panel.dc.html` — the canvas (this addendum's deliverable).
- `collection-filter · copy strings.ts` — the copy block for `src/lib/copy/collection.ts`.
- `READINESS.md` — readiness rating and what is blocking a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
