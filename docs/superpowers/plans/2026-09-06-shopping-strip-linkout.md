# Plan — Shopping strip link-out (#330, R4)

Design: `design/design_handoff_the99_linkout/` · verdict 🟢 Green in `ENG-AUDIT-R4.md`.
Property table: `docs/superpowers/design-tables/shopping-strip-linkout.md`.

## Why

The buy action for a whole shopping list ships today only inside the Export dialog's Shopping tab.
Nothing on the Shopping filter says the action exists, and nothing on the Export button says the dialog
contains a shopping list. R4 moves the action onto the surface that names it.

Underneath that is a defect the move exposes. There are two shopping lists in the app:

- the filter's, `isShoppingCard` in `decklist.tsx:51` — basics out, spoken-for cards in
- the export dialog's, a plain `!c.owned` composed at `builder-shell.tsx:1052` — unowned basics in,
  spoken-for cards out

The shipped export link therefore buys a basket the player never saw. One link on two surfaces rendering
one string (`these`) is only correct once both resolve to the same list.

## Tasks

### 1 — One shopping-list selector

Move `isShoppingCard` and `isSpokenFor` out of `decklist.tsx` into `src/lib/decks/shopping.ts`, exported,
with their existing doc comments intact. Two predicates, no projection helper — each consumer already
maps to the shape it needs and a third helper would earn nothing.

`decklist.tsx` imports them instead of declaring them. No behaviour change on that surface.

`builder-shell.tsx:1052` swaps its `!c.owned` filter for `isShoppingCard` and **keeps projecting `role`**,
which drives the grouped rendering at `export-dialog.tsx:436`. This is the bug fix: after it, the export
link and the strip link buy the same cards.

Consequence to fix in the same task: `export-dialog.tsx:416` renders a hardcoded `N cards · unowned`,
which becomes false the moment spoken-for cards — which are owned — join the list. The string moves into
`exportLinkOutCopy` and stops claiming ownership. Wording goes to `/copy-review`.

Tests: `src/lib/decks/shopping.test.ts` — basics excluded, unowned included, spoken-for (`over` with
`selfExcluded`) included, owned-and-free excluded, a missing availability read degrading to excluded.

### 2 — The unpriced provenance clause

`src/lib/copy/price.ts`: add `strip.provenanceUnpriced`. It is the **first clause only** — `lastChecked`
and `behind` stay separate functions and the component keeps joining with ` · `. The R4 contract file
writes it as one fused template with `{day}` inside; that shape does not match the shipped composition
and is not adopted. Wording goes to `/copy-review`.

`price-strip.tsx`: the clause condition tightens from `pricedCopies < totalCopies` to
`0 < pricedCopies && pricedCopies < totalCopies`, and the provenance line picks its first clause on
`pricedCopies > 0`.

Net effect in the none-priced state: `0 of 8 priced` disappears, the provenance line swaps string. The
strip already rendered in this state — nothing appears that was not on screen.

### 3 — The link row

`price-strip.tsx` takes a new `shoppingCards: { name: string; quantity: number }[]` prop and renders a
final row inside the strip:

```
<div className="flex min-h-[44px] items-center md:block md:min-h-0 mt-[9px]">
  <ExternalLink href={href} label={exportLinkOutCopy.shopping} />
</div>
```

- `href` is `manapoolAddDeckUrl(shoppingCards)`, computed in render from the current prop. Never
  memoized: the ✕ must move the basket and the total together with no sync step.
- The row is the strip's last child in DOM order at both breakpoints. Desktop's `flex-row-reverse` puts
  the figure at the trailing edge, so the link row must sit **inside the left column** with the
  provenance rather than as a third flex child, or `row-reverse` will move it. Restructure: wrap the
  provenance line and the link row in one `div`, which becomes the strip's second flex child. The
  wrapper is a block container whose first line box is the provenance line, so `md:items-baseline`
  still aligns the figure to the provenance exactly as it does today.
- The wrapper takes `md:mr-auto`. In the none-priced state the figure line no longer renders at all, so
  the wrapper is the only flex child — and under `row-reverse` a lone item at `justify-between` sits at
  main-start, which is the **right** edge. An auto margin on the physical right absorbs the free space
  and holds the wrapper at the leading edge; with two children the result is identical to
  `justify-between`, so it is safe in every state.
- The 9px gap is `mt-[9px]` on the row at both breakpoints — a `gap` on the wrapper would be equivalent,
  but the margin keeps the value where the design names it.
- `min-h-[44px]` and the centring drop above `md:`, where the row is one text line.
- `manapoolAddDeckUrl` returns `null` for an empty list. That cannot happen here (the strip suppresses
  itself at `totalCopies === 0`), but `ExternalLink` requires a string `href`, so the row renders only
  when the URL is non-null. This is a type narrowing, not a second condition.

Mobile bottom padding: `py-[10px]` becomes `pt-[10px] pb-0 md:py-[11px]`.

### 4 — Wire the prop through

`decklist.tsx` already computes `shoppingCards`. Map it to `{ name, quantity }` and pass it to
`GroupToggle`, which passes it to `PriceStrip` alongside `priceSummary` and `provenance`.

There are **three** `GroupToggle` mounts in `decklist.tsx` — 303, 362 and 536. Only the latter two get the
prop. 303 is the empty-Shopping branch and passes no price props today, deliberately: there is no strip
there to link from.

### 5 — Tests

Extend `price-strip.test.tsx`:

- the link renders in all three priced states and carries the `add-deck` href
- the href encodes the passed list, not the deck
- none-priced renders no `0 of N priced` and the unpriced provenance string
- the strip renders nothing when `totalCopies === 0`, so no link either

No test asserts a class string. Spacing and the 44px row are the design-review verify pass's job, and a
test that reads `mt-[9px]` off the DOM only restates the source line above it.

`src/lib/decks/shopping.test.ts` covers the selector directly, which is where the divergence bug lived —
one list, asserted once, rather than the same assertion made twice through two components.

## Out of scope

- Any change to `external-link.tsx`. R3's anatomy ships and R4 adds no code to it.
- `:visited` styling. Not drawn, not built.
- The card modal and the export footer's placement. R3 remains their spec.
- The wording of `provenanceUnpriced`, `Buy these at Mana Pool` and `Buy any printing at Mana Pool` —
  all three are `/copy-review` items, not design or eng ones.

## Verification

`pnpm typecheck && pnpm lint && pnpm test`, the stub-DB build, then the design-review verify pass
against the property table at 320/390px and desktop.

Check **768px specifically**, not only the phone widths and a wide desktop. The strip's left flex item
was a 9.5px provenance line and becomes the wider of that and a 14px link label, so the two items can
compete for width just above the breakpoint where they never did before.
