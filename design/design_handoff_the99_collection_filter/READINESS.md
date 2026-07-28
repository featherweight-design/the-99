# READINESS — Collection · Set filter panel

**Rating: 🟡 Yellow** — buildable now; two references I could not read, and three product
questions that want an answer before the panel is generalised to Type ▾.

Date: 2026-07-27 · Branch: `feat/printings-and-sets` · R1

## What Green would need
1. The spec (`docs/superpowers/specs/2026-07-27-collection-filter-panel-design.md`) and the
   property table (`docs/superpowers/design-tables/collection.md:389-406`) diffed against decisions
   **3** (trigger label), **5** (filter-aware counts) and **9** (Type/Sort conversion). Neither file
   is present in this design project, so those three are reasoned, not reconciled.
2. The iOS 16px zoom-floor call on the sheet's search field (gap 3) — a global viewport decision.
3. Confirmation that the collection query can return `{code, name, releasedAt, count}` per owned set
   with `count` computed under the other active filters. Everything visual depends on that payload;
   the fallback (uppercased code, count still shown) is drawn but is a degradation, not a plan.

## Ready to build
- Panel geometry, both mounts, all row states, tokens — final. No open pixel questions.
- Keyboard and screen-reader model — final, and the reason this is a custom widget at all.
- Copy — final and externalised (`collection-filter · copy strings.ts`).
- Chip row, search field, filter bar geometry — reused unchanged; no upstream edits requested.
- Empty state, truncation behaviour, ordering and tiebreak — decided.

## Not in this ticket
- **Type ▾** and **Sort ▾** conversion (drawn, specced, explicitly follow-up).
- **Color ▾** — never converts.
- Empty-collection screen — App Shell owns it.
- Any change to the list, the card modal, or the replace flow.

## Risk notes
- **Ordering fallback for undated sets** (promos, Secret Lair, Alchemy) is an assumption: last, A→Z.
- **Counts vs. the free-text collection search** is drawn one way (filters only) and flagged; getting
  it wrong is a correctness bug in a visible number, not a layout issue.
- **Disabled zero-count rows** fail AA contrast by design (`opacity .42`, `aria-disabled`). Intended
  and permitted, but call it out in review so it isn't logged as a defect later.
- Shipping Set alone leaves two native `<select>`s in the row for a release. Accepted.
