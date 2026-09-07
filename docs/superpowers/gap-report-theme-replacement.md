# Gap report — Theme Replacement (R6)

Design source: `design/design_handoff_the99_theme_replacement/` (R6, 2026-09-06) — consumed and
removed from the repo once the build merged, as design assets are. This report and the property
table beside it are what survive it.
Property table: `docs/superpowers/design-tables/theme-replacement.md`
Method: design-review skill — enumerate (design-only) → verify (table vs. implementation).

## Verdict

**0 token gaps · 0 font gaps · 0 state gaps.** One deliberate divergence, recorded below.

## Verified clean

- **Tokens.** All 36 contract rows for `ixalan` and all 36 for `eldraine` match the table
  character for character, including the two aliases (`--avail-soft`, `--avail-hard`) declared as
  aliases rather than literals.
- **The `--b` refit** lands in all six blocks; no `#1E1B1A` survives anywhere.
- **Retired blocks gone.** No `[data-theme="innistrad"]` or `[data-theme="duskmourn"]`, and no
  dangling `@font-face` for a face only those blocks used. The rejected `tarkir` candidate was not
  added.
- **Fonts.** Trirong at 600/700 and Cormorant Garamond at 600/700 — 400 deliberately not loaded,
  per READINESS, so a 400 request resolves to the real 600 rather than a synthesised light.
  `--font-display-face` uses the `var()` form the contract test enforces, matching the four
  themes already shipped.
- **All nine states reachable.** `themeFor` maps both retired ids to their nearest survivor, never
  to the default; the notice names both the retired theme and where the user landed; dismissal and
  a theme choice both persist through the same cookie write, so the two cannot disagree.
- **Migration order of operations** is satisfiable: the fallback ships in the same commit as the
  block deletions, so no build exists in which a retired `data-theme` reaches a missing block.

## Deliberate divergence

**Picker order.** The handoff's copy file lists `amonkhet · kamigawa · phyrexia · kaldheim ·
ixalan · eldraine`; the registry ships `amonkhet · kamigawa · ixalan · phyrexia · eldraine ·
kaldheim`. The handoff's order groups its own annotations (the four renamed, then the two new)
rather than specifying a layout, and adopting it would move all four survivors out of the grid
slots they shipped in. The new themes take the vacated slots instead. Flagged for Design to ratify;
it is one line to reverse if they would rather have the new pair together.

## Not gaps

- **Notice visuals are unspecified by the handoff**, which describes it only as "a single
  dismissible line in the theme picker, not a modal, not a toast". The eng treatment is internally
  consistent with the picker around it: `mx-1` aligns to the section label's `px-1`, 11.5px sits
  between the desktop and mobile chip names, and the dismiss control is 44×44 in the sheet against
  26×26 in the popover, negative-margined so the hit area grows without the line getting taller.
- **Copy wording** is out of scope here and belongs to `/copy-review`. Structurally every key the
  design names exists and is called with the right arguments, including the notice — which the
  handoff left as prose with no key at all.

## Found by browser probe, not by the table

Two defects the property table could not have caught, both fixed and covered by tests:

1. The dismiss control measured 21×24 — below the 44px touch minimum in the mobile sheet.
2. The panel focused the notice's ✕ on open, because `useDialogA11y` falls back to the first
   focusable in DOM order. That opened the account menu one Enter away from dismissing a notice the
   user had not read, and dismissing it dropped focus on the body, outside the panel's focus trap.
   Both panels now name the checked chip as their initial focus, and dismissal hands focus back to
   it.
