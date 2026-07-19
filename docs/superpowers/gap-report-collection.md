# Design Gap Report — Collection Browse + Replace Flow (#6)

Source of truth: `docs/superpowers/design-tables/collection.md`
Process: design-review skill — Agent 2 dual-pass verify (visual + state reachability) → fixes (commit `b2125c3`) → Agent 3 confirm.

## Result

- Agent 2 found 25 visual gaps + 1 state-reachability gap across 11 components.
- All fixable gaps resolved in `b2125c3` (responsive line-heights/shadows/colors moved to static Tailwind classes, WUBRG pip palette consolidated to shared `WUBRG_HEX`, generic mana pip bg `#2A241D`→`#4A4033` per table, oracle-text keyword bold + reminder italic rendering, unmatched-row quantity column, mobile-default-rows view auto-resolution).
- Agent 3 confirm: all items FIXED; its one residual finding (mobile sort label `A–Z ▾`) was a false positive — the table (§Copy, filter button labels) specifies the ▾.

**Final verdict: 0 gaps.**

## Intentional deviations (adjudicated)

1. **Desktop meta "Set" value renders set code only** (design: `Return to Ravnica · RTR`). Full set names do not exist anywhere in the data model (cards/collection_items carry `set_code` only). Follow-up tracked in a GitHub issue; blocked on adding a set-name source to the catalog.
2. **No custom input-caret overlay in the confirm modal** (design §Input Cursor: 1.5–2px brass bar). A fake caret beside the native one would render doubled; the native caret is styled `caret-color: var(--brass)` to honor the intent.
3. **First-run zero-count copy branch** — when `currentCollectionCount === 0` (first import, nothing to replace) the upload banner and confirm modal render import copy instead of the table's replace copy, and `ReviewScreen` runs in `embedded` mode (no min-height/sticky) inside the first-run checklist card. The table's values govern the `/collection/replace` (count > 0) path, which is unchanged.
4. **Card-modal blurred-collection backdrop flourish** — the design parenthetically notes a blurred grid behind the desktop modal; the dimmed `rgba(8,6,4,0.72)` backdrop ships without the blur (decorative, flagged as optional in the design).
