# Gap report — Mana Pool link-out (#330)

Checked against `docs/superpowers/design-tables/manapool-linkout.md` (Agent 1's property
table, committed before implementation) at mobile (390px) and desktop widths.

**Verdict: 0 gaps attributable to this ticket. 0 state-reachability gaps.**

Agent 3 was not run: Agent 2 flagged nothing to fix.

## What was verified

- `src/components/ui/external-link.tsx` — every row of the StoreLink table: rest ink, the
  `color-mix` underline, the nbsp-bound `↗`, and all five states (hover, focus-visible,
  active, visited, rest).
- `src/lib/manapool/links.ts` — both href shapes; the card link is keyed by the oracle
  card name at both call sites, never the printing on screen.
- `src/components/decks/export-dialog.tsx` — the Shopping-tab link row at both
  breakpoints. The dialog renders one `DialogContent` twice with an `isMobile` prop, so
  each responsive value was checked as a ternary rather than accepted twice from a
  duplicated subtree.
- `src/components/cards/card-modal.tsx` — the desktop pinned row (link first in DOM, nav
  cluster pushed right) and the mobile in-flow row under its hairline.
- The "where the link never renders" table: a repo-wide search for `ExternalLink` and
  `manapool*Url` returns only the three intended call sites. The buy tag, the
  shopping-list rows, the Decklist tab and the Mana Pool wordmark all stay linkless.

## Authorised deviations (recorded, not gaps)

1. **Row spacing follows the shipped containers, not the canvas** (ENG-AUDIT 7). The
   export footer's button row keeps `14px 18px` / `16px 24px` and the card modal's nav row
   keeps `mx-[32px] mb-[30px] pt-[20px]`, where the table records the canvas's redrawn
   `12px 18px 0` / `18px 24px 14px` and `padding: 0 28px; min-height: 56px`. The link rows
   themselves take the table's values exactly.
2. **The primitive is `ExternalLink` in `external-link.tsx`**, not `StoreLink` — the file
   name comes from the spec's ship list.
3. **The sr-only new-tab suffix lives in the component**, not a copy file: every instance
   renders it and no call site may vary it. Same reasoning as the nbsp binding
   (ENG-AUDIT 4).

## Noted, out of scope

- The desktop nav row's `Prev` / counter / `Next` typography ships at `15px` /
  `var(--fg-faint)` and `font-mono 11px`, where the table records `13.5px` /
  `var(--fg-dim)` and `12px` / `#6E6353`. This predates the ticket; the table records the
  row for adjacency and the diff re-wrapped those nodes without touching their type.
- The export footer's hairline is a full-bleed `border-top` where the table records inset
  margins, and it survives the empty-shopping-list state. It cannot vanish with the link:
  it is also the button row's top border, and the button row always renders. The second
  divider the canvas drew was withdrawn by ENG-AUDIT 1 and was never built, so nothing
  this ticket added is left behind when the list empties.

## Still owed

`/copy-review` on `Buy these at Mana Pool` and `Buy any printing at Mana Pool`, which now
exist in `src/lib/copy/`. Copy wording is out of scope for a design review by policy.
