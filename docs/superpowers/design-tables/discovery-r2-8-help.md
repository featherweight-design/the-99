# Discovery R2·8 · the ? · property table

**About visual PR 6a (2026-10-28): the panel and sheet (HelpSheet) retired.** The ? keeps its look, its label and both
places; pressed, it opens its screen's About page (handoff `design/design_handoff_the99_about_visual/`, call 5 and
Addendum A1, `question-landing.ts`). The panel's rows (§3 to §14 and their states) were deleted with it; §1 and §2 stay,
with the open state gone.

Enumerated from the design files only (no `src/`):

- `design/design_handoff_the99_discovery_onboarding/design-tables/discovery-r2.md` (§The ? in the chrome, §The ? panel and sheet (`HelpSheet`); §A tool card's Halo, for comparison)
- `.../design-tables/discovery.md` (R1's halo, row "Halo on the control")
- `.../README-r2.md` (C4, C6, E8 screens table, G15, G16, G17, G21)
- `.../STATES-showcase-reference.md` (§Try it, §The ? panel (1280) and sheet (390))
- `.../READINESS-r2.md` (E8, E12, E13)
- `.../r2/HelpSheet.dc.html` (the part, `mode` desk / phone), `.../r2/Rail.dc.html` (`help` none / shown / open), `.../r2/MobileHeader.dc.html` (`help` none / shown / open), `.../r2/PhoneShot.dc.html` (scrim, sheet placement, Show me halo), `.../r2/Help-Deck.dc.html` (H1), `.../r2/Help-Shopping.dc.html` (H2), `.../r2/Help-Collection.dc.html` (H3), `.../r2/Links.dc.html` (L1 the ?'s ends, L2 dead ends)
- `.../discovery-r2 · copy strings.ts` (`helpPanelCopy` key names only)
- Binding readiness resolutions: `docs/superpowers/readiness/discovery-r2.md` gap 6 (the panel fetches the reader's `visibleEntries` on first open, and on intent at 1280; search runs over that payload; a caption line hidden by `captionLineSwitches` never matches), gap 7 (Show me only for an entry whose control is registered in R1's anchor registry and in view), gap 15 (the ? sits ABOVE `OfflinePill`; drawn 6px gap and box unchanged; from `md` up to 1279 the rail and panel behave as at 1280), gap 17 (states described but not drawn are built from STATES/L2 words), and "R2 reuses R1's halo".

Out of scope: card details stacking and the ? over card details (R2·9, readiness gap 5), About's `helpHint` line beside the tabs (`aboutShapeCopy.helpHint`, the About page), the Reference itself (R2·6a), copy wording. Each copy row names the `helpPanelCopy` key that renders, not its text.

Token map: `#14110E` `--bg`, `#18140F` `--surface-sunken`, `#1A1611` `--surface-rail`, `#1E1A15` `--surface`, `#29241F` `--elevated`, `#2B241B` `--border`, `#3A3229` `--border-strong`, `#494037` `--border-dashed`, `#EDE6D8` `--fg`, `#C0B8A6` `--fg-body`, `#A59C89` `--fg-muted`, `#8B8270` `--fg-faint`, `#CF8745` `--accent`, `#6B482A` `--accent-dim`. Scrim `rgba(10,8,6,.62)`. Cinzel = `font-display`, IBM Plex Mono = `font-mono`, IBM Plex Sans = body.

**Conflicts settled in this table** (source wins in brackets):

- Show me's halo: `PhoneShot` draws `0 0 0 2px accent/75%, 0 0 0 6px accent/20%`, radius 9, no dim (the tool card picture's ring). README C4, STATES, H1's note and readiness all name **R1's halo**: `0 0 0 2px accent/60%, 0 0 0 6px accent/16%` on the control itself, no dim, no bubble (`discovery.md`, readiness "R2 reuses R1's halo").
- Section head's right slot: H1's board renders `moreHere(6)` (`+ 6 more on this tab`) because its frame is clipped at 758; H2 and H3 render `count(n)`. **`count(n)` always**; the list holds every entry and scrolls in the body (H1 note: the rest "scrolls into view in the same list"). `moreHere` is not rendered.
- The body's overflow: the part sets `overflow:hidden` (a static board). **The body scrolls** (`overflow-y:auto`) for the reason above.
- Elsewhere outside the deck: README C4 names Elsewhere only on the deck page; the part's Collection data draws `ELSEWHERE IN COLLECTION` chips, and readiness gap 5 relies on `Elsewhere in Collection` (copy key `elsewhere.collection`). **Collection carries Elsewhere chips too** (its other tabs, card details and Upload a file); the deck page carries `elsewhere.deck`.
- Chip pressed (not drawn): STATES says "the eyebrow names it", but the eyebrow is a fixed key (`eyebrow`). **The section head's label names the chosen tab (`here(view)`) and its count is that tab's**; the eyebrow and the title stay; the tab swapped out becomes a chip in its place.
- A tab whose visible entries are zero: not drawn. **Its chip is omitted** (L2: an entry behind an off switch is absent everywhere; a group left empty is not drawn).
- Collection · Cards rows: the part lists `card-detail` under Cards; E8 puts it under Card details (one screen per entry, G16). **E8 governs** which rows a screen lists; the board's rows are illustrative.
- A search result's destination: not stated. **The entry in the Reference**, as `Read the whole entry ›` (C6: "the ? leads to ... the entry"); results are `<a>` in the part.
- `See every entry →`: H3's note says it "opens the Reference with the search cleared"; L2 says it "clears the search". **It opens the Reference at the top with no query** (L1: "Reference, at the top · `All of About ›`, and `See every entry →`").
- The empty screen (G21, not drawn): the line sits **above the search**, with the search and the footer kept; no section head, rows or Elsewhere. No type values are drawn, so the table records placement and key only.
- Sheet shadow: the property table names none; the part draws `0 -20px 60px rgba(0,0,0,.55)` and a 1px `--border-strong` border with no bottom. **The part's values** are recorded.

---

## 1. The ? at 1280 (rail item)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 1 | Rail ? | Rendered | — (header press, §2) | yes, in the rail's column, `HELP_PANEL_ENABLED` on |
| 2 | Rail ? | Place | — | rail foot: `margin-top:auto`, above `OfflinePill` (gap 15), above the account button |
| 3 | Rail ? | Margin bottom | — | 6 |
| 4 | Rail ? | Element | — | `<button type="button">` |
| 5 | Rail ? | Box | — | 38 × 38, `border-radius:10px`, `border:0`, `padding:0` |
| 6 | Rail ? | Layout | — | flex, `align-items:center`, `justify-content:center` |
| 7 | Rail ? | Glyph | — | `?`, `font-mono` 16 / 500 |
| 8 | Rail ? | Rest | — | `background:transparent`, color `--fg-faint` |
| 9 | Rail ? | Open | — | retired with the panel (PR 6a): a press navigates |
| 10 | Rail ? | `aria-label` | — | `helpPanelCopy.button` |
| 11 | Rail ? | `aria-expanded` | — | none: the ? opens nothing (PR 6a) |
| 12 | Rail ? | Hover / focus | — | not drawn |
| 13 | Account button | Margin top | — | `0` with the ? present; `auto` with the ? absent |
| 14 | Rail ? | Widths `md`–1279 | — | as 1280 (gap 15) |

## 2. The ? at 390 (header press)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 15 | Header ? | Place | header right, in a flex row `align-items:center; gap:6px`, left of the account button | — |
| 16 | Header ? | Element | `<button type="button">` | — |
| 17 | Header ? | Box | 44 × 44, `border-radius:12px`, `border:0`, `padding:0` | — |
| 18 | Header ? | Layout | flex, `align-items:center`, `justify-content:center` | — |
| 19 | Header ? | Glyph | `?`, `font-mono` 17 / 500 | — |
| 20 | Header ? | Rest | `background:transparent`, color `--fg-muted` | — |
| 21 | Header ? | Open | retired with the panel (PR 6a): a press navigates | — |
| 22 | Header ? | `aria-label` / `aria-expanded` | `helpPanelCopy.button`; no `aria-expanded` (PR 6a) | — |
| 23 | Header ? | Scroll | not sticky; scrolls away with the header, as the account button does (G15) | — |
| 24 | Header ? | Hover / focus | not drawn | — |

## State Coverage — the ?

| State | Triggering condition | Rendered | Key props required |
|---|---|---|---|
| Switch off | `HELP_PANEL_ENABLED` resolves off for the reader | no ? in the rail or header; account button `margin-top:auto` at 1280 | the resolved switch on the layout |
| ? at rest | switch on | rail item `--fg-faint` (1280) / header press `--fg-muted` (390) | — |
| ? pressed | press | navigates to `questionLanding`'s page, section and lit unit, with `from` (PR 6a) | the live address and the builder's deck view |

Row count: 24.
