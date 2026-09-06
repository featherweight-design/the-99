# Price on the Buy Tag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the prices already sitting in `printing_prices` on screen, in the one place the player is already told a card must be bought. `printing_prices` shipped on PR #291 and has zero readers in `src/` — every price in the database is currently invisible.

**Architecture:** One server read joins `printing_prices` to `printings` and rolls each oracle card up to its cheapest **live** printing, where "live" is `as_of === max(as_of)` over the table. That map rides the existing `/decks/[id]` page load into `BuilderShell` and down to the decklist rows and suggestion tiles, where the shipped `BuyTag` grows a tail. A second, filter-scoped construct — the price strip — sums what the Shopping filter is showing and discloses the table's own freshness once. Every derivation is pure and lives in `src/lib/decks/price.ts`; the only database code is one query.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-05-price-on-the-buy-tag-design.md`, which consolidates the handoff at `design/design_handoff_the99_decks/` — `ADDENDUM-README.md` (R1), `R2-README.md`, `R3-README.md`, and the three `Price Addendum` canvases. **R3 governs.** Where R1 or R2 disagrees with it, `R3-README.md` §6 records the stale drawing; those five entries are not to be re-implemented from the older canvases.

**Design property table:** none exists yet. Task 9 builds it from the R3 canvas as the design-review skill's enumerate step, before the PR opens.

## Global Constraints

- **Zero new marks, hues, tokens, dependencies or motion.** Every colour is an existing `var(--…)` from the table in spec §3. Hexes live only in `globals.css` and none is added.
- **`src/components/decks/builder-spine.tsx` is not edited.** Line 391 (`54 owned · 8 to buy`) and its desktop-only condition stay byte for byte. The whole point of the strip is that it does not borrow that line.
- **State 4 stays byte-identical.** A card with no price renders today's bare `buy` — no dash, no zero, no placeholder — and its accessible name gains nothing.
- **The tag is never a target at either density.** No `onClick`, no `href`, no `role="button"`. `pointer-events: none` on the tile stays.
- **Missing data is omitted, never zeroed.** A sold-out row drops its figure entirely; an unpriced deck drops the total entirely.
- **Nothing ranks, filters or sorts on price.** This is load-bearing — it is why there is no banner. Task 7 exists to keep it true verbatim.
- **All new copy lives in `src/lib/copy/price.ts`.** Copy is never inlined in a component. Apostrophes are curly (`don’t`), matching shipped.
- **Mobile and desktop parity ships in the same task.** This codebase's deck surfaces use `md:` for the desktop branch — follow the file you are editing.
- **`pnpm` only.** Pre-push gate every push: `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- **Lint stays at 0 problems and no test may be deleted or skipped.** Record the entering test count in Task 1 and never let it fall.
- **Exports are untouched.** Names only, both tabs. Task 8 is a copy correction, not a feature.

---

## File Structure

**Created:**

- `src/lib/copy/price.ts` — the `priceCopy` block: the four tails, the strip's two lines, both provenance forms, the accessible-name builder, and `export.pricingNote`.
- `src/lib/copy/price.test.ts`
- `src/lib/decks/price.ts` — the pure half: the `PriceFact` type, `priceState()`, `formatCents()`, `summarisePrices()`, `provenanceForm()`. No db import; client components import these as values.
- `src/lib/decks/price.test.ts`
- `src/lib/decks/price-query.ts` — `loadPrices(oracleIds)`, the one Drizzle read.
- `src/components/decks/price-strip.tsx` — the two-line strip.
- `src/components/decks/price-strip.test.tsx`
- `src/components/decks/buy-tag.test.tsx` — the tag has no test today; the tails need one.

**Modified:**

- `src/lib/copy/decks-builder.ts` — `sortCheapest` only.
- `src/lib/decks/grouping.ts` — `DeckDetailCard` gains an optional `price`.
- `src/lib/decks/suggest.ts` — `DeckSuggestion` gains the same optional field.
- `src/app/decks/[id]/page.tsx` — calls `loadPrices` and passes the map plus the table's newest `as_of` to `BuilderShell`.
- `src/components/decks/builder-shell.tsx` — threads both down to `Decklist` and the Consider tiles.
- `src/components/decks/decklist.tsx` — computes the strip's summary from its own shopping cards and hands it to `GroupToggle`.
- `src/components/decks/group-toggle.tsx` — renders the strip inside its container, above the bottom border.
- `src/components/decks/buy-tag.tsx` — the tail, and the scrim at 92%.
- `src/components/decks/decklist-row.tsx` — passes the row's price into the tag.
- `src/components/decks/suggestion-tile.tsx` — passes the tile's price into the tag.
- `src/components/decks/export-dialog.tsx` — both copies of the pricing claim.

---

## Task 1: The copy block and the price vocabulary

**Files:**
- Create: `src/lib/copy/price.ts`, `src/lib/copy/price.test.ts`

**Steps:**

- [ ] Record the entering baseline: run `pnpm test` and write the passing count and file count into the PR description later. Run `pnpm lint` and confirm 0 problems.
- [ ] Create `priceCopy` as a `const … as const` object with these sections:
  - `tag`: `soldOut: "sold out"`, `foil: "foil"`, `etched: "etched"`, and the separator is the component's, not copy.
  - `strip`: `pricedClause: (priced: number, total: number) => \`${priced} of ${total} priced\``, and `provenance: "prices from ManaPool"`, `lastChecked: (when: string) => \`last checked ${when}\``, `behind: "these are behind"`.
  - `aria`: `priced: (figure: string, when: string) => \`${figure} at ManaPool, last checked ${when}\``, and a second form appending `, these prices are behind`.
  - `export`: `pricingNote: "Prices show in the app · exports copy names only"`.
- [ ] Test that every string with a curly apostrophe uses `’` and not `'`. (None does today; the assertion is a guard for whoever adds the next one.)

**Verification:**
- [ ] `pnpm test src/lib/copy/price.test.ts` passes.
- [ ] `pnpm typecheck` clean.

---

## Task 2: The pure derivation

**Files:**
- Create: `src/lib/decks/price.ts`, `src/lib/decks/price.test.ts`

**Interfaces:**
- Consumes: `priceCopy` from Task 1.
- Produces: `PriceFact`, `PriceState`, `priceState()`, `formatCents()`, `summarisePrices()`, `provenanceForm()`, `PRICE_STALE_AFTER_DAYS`.

**Steps:**

- [ ] Define the row shape the query will hand back, keyed by oracle id:
  ```ts
  export type PriceFact = {
    cents: number | null;
    foilCents: number | null;
    etchedCents: number | null;
    asOf: Date;
  };
  ```
- [ ] Implement `priceState(fact, newestAsOf)` returning `"priced" | "foilOnly" | "soldOut" | "absent"`, exactly as spec §2 derives it. **`absent` is the default branch**, reached by a null fact *and* by a live row whose three price columns are all null. Order the branches so the default is the final `return`, not a condition — a future column cannot fall through it.
- [ ] Implement `formatCents(cents)` — whole cents, never rounded, `$` prefix, two decimal places, thousands separated. `formatCents(12950) === "$129.50"`.
- [ ] Implement `summarisePrices(cards, newestAsOf)` over the Shopping-filtered cards, returning `{ totalCents, pricedCopies, totalCopies }`.
  - **Count copies, not rows.** `decklist.tsx:124` derives the `Shopping N` pill through `cardCopies`, and the strip's denominator must be the same figure or the two disagree on screen. Multiply each card's price by its `quantity` for the same reason.
  - `priced` and `foilOnly` both contribute; `foilOnly` contributes `foilCents ?? etchedCents`. `soldOut` and `absent` contribute nothing to the total and count against the denominator.
- [ ] Implement `provenanceForm(newestAsOf, now)` returning `{ behind: boolean; when: string }`. Export `PRICE_STALE_AFTER_DAYS = 7` and comment it as the single constant governing **two** effects: past it the line switches from a weekday to a date, *and* it gains the behind clause. One threshold, deliberately, so a player never reads an ambiguous weekday on a table we already know is behind.

**Verification:**
- [ ] Unit tests cover all four states, including the live-row-with-three-nulls case that must land on `absent`.
- [ ] A test asserts the inverted failure mode directly: when every row shares one `as_of`, **no card is `soldOut`**, whatever that timestamp is. This is the property the whole derivation was rewritten for in R2 and it must not regress silently.
- [ ] A test asserts `summarisePrices` multiplies by quantity and that its denominator equals `cardCopies` over the same list.
- [ ] Tests for `provenanceForm` at 6 days (weekday, no clause) and 8 days (date, clause).

---

## Task 3: The query

**Files:**
- Create: `src/lib/decks/price-query.ts`

**Interfaces:**
- Consumes: `PriceFact` from Task 2.
- Produces: `loadPrices(oracleIds: string[]): Promise<{ prices: Map<string, PriceFact>; newestAsOf: Date | null }>`.

**Steps:**

- [ ] Write one `db.execute` that joins `printing_prices` to `printings` on `scryfall_id`, filters to the passed oracle ids, and picks each oracle's **cheapest live printing**. Live is `as_of = (select max(as_of) from printing_prices)` — a scalar subquery, computed once, not per row.
- [ ] Cheapest is over `coalesce(price_cents, price_cents_foil, price_cents_etched)`, so a foil-only printing can win when it is the only stock. Return that printing's three price columns separately; the state machine in Task 2 decides what to call it.
- [ ] Return `newestAsOf` from the same query so the caller never issues a second round trip for it. It is null only when the table is empty.
- [ ] **`sql.param` for the oracle-id array.** A bare `${jsArray}` in a Drizzle template expands to a parenthesised parameter list — `($1, $2)::uuid[]` — which is a syntax error, not an array. This is documented at `availability-query.ts:44-50` and has bitten this repo once already.
- [ ] Follow `availability-query.ts` for shape and for its header-comment discipline: say in the file what the query deliberately handles.

**Verification:**
- [ ] `pnpm typecheck` clean.
- [ ] Manual check against staging, which has been priced: run the query for a known deck's oracle ids and confirm the row count and a spot-checked figure. Use the Neon MCP with `branch_id` set explicitly to `br-polished-pond-a6e63y0b` — the default is **production**, which has never been priced.

---

## Task 4: Thread the prices to the surfaces

**Files:**
- Modify: `src/lib/decks/grouping.ts`, `src/lib/decks/suggest.ts`, `src/app/decks/[id]/page.tsx`, `src/components/decks/builder-shell.tsx`

**Steps:**

- [ ] Add `price?: PriceFact | null` to `DeckDetailCard` and to `DeckSuggestion`. **Optional, for the reason `availability` is optional** (`grouping.ts:19-25`): six sites build these literals — optimistic reducers, tests, fixtures — and none can reach the database. Absent and null both mean "no price", so a failed read degrades to the bare tag rather than to an error surface.
- [ ] In `page.tsx`, call `loadPrices` inside the existing `Promise.all` at line 28 over the deck's oracle ids plus the suggestions'. Wrap it in `.catch(() => null)` — the same degradation `search-action.ts:104` uses. A price read that fails must not take the builder down.
- [ ] Pass the map and `newestAsOf` into `BuilderShell`; thread both to `Decklist` and to the Consider tiles. Attach each card's fact at the point the card list is built, so no component below does a map lookup in render.

**Verification:**
- [ ] `pnpm typecheck` clean — the optional field must not break any of the six literal-building sites.
- [ ] `pnpm test` — no existing test changes behaviour, because absent means bare tag.
- [ ] `pnpm dev` against staging: a deck with unowned cards still renders exactly as it does today, since no component reads the field yet.

---

## Task 5: The tag grows a tail, and the scrim rises

**Files:**
- Modify: `src/components/decks/buy-tag.tsx`, `src/components/decks/decklist-row.tsx`, `src/components/decks/suggestion-tile.tsx`
- Create: `src/components/decks/buy-tag.test.tsx`

**Steps:**

- [ ] `BuyTag` takes an optional `price` and renders the four tails from spec §3. Separator in `--border-strong`; the figure takes `--fg-body` on the row variant and `--fg` on the tile; `foil` / `etched` take `--fg-faint`.
- [ ] `sold out` takes **`--fg-body`** — the figure's own ink, because it sits in the figure's slot and is the same class of fact. Do not reach for a dimmer token; `--fg-body-dim` does not exist, and R2 withdrew the request for one.
- [ ] Raise the tile scrim: `color-mix(in oklab, var(--bg) 82%, transparent)` → `92%`. **Unconditionally** — not gated on whether a figure renders. A scrim that changes with what is written on it is a primitive deciding how to look from its own content. The `--warning` inset stays at 50%.
- [ ] The row's figure right-aligns into the shipped 58px slot under Shopping and hugs under `All`.
- [ ] Extend the tile's accessible name with `priceCopy.aria`, once per price, using the behind form when the table is behind. The row passes no label — the word already sits in the row's reading order (`buy-tag.tsx:30-34`).

**Verification:**
- [ ] Tests for all four tails at both variants, plus the labelled/unlabelled accessible-name split.
- [ ] A test asserts the bare tag's rendered output is unchanged from today — state 4 is byte-identical.
- [ ] A test asserts the tag renders no `onClick`, no `href` and no button role at either variant.
- [ ] Confirm in a browser at both widths that the 92% scrim reads as a label on the art, not a chip glued to it.

---

## Task 6: The price strip

**Files:**
- Create: `src/components/decks/price-strip.tsx`, `src/components/decks/price-strip.test.tsx`
- Modify: `src/components/decks/group-toggle.tsx`, `src/components/decks/decklist.tsx`

**Steps:**

- [ ] Build the two-line strip from spec §4. Line 1: the total, then `· N of M priced`. Line 2: `prices from ManaPool · last checked <when>`, plus `· these are behind` when `provenanceForm` says so. Line 2 is `--fg-locked` in both forms — **not a warning colour**. Old prices are not an error and the player did not cause one.
- [ ] **The clause drops entirely when every copy is priced** — the strip renders the figure and nothing else. When nothing is priced, the figure drops instead and only line 2 renders.
- [ ] Render the strip **inside the `GroupToggle` container, above its bottom border**, and only when `filter === "shopping"`. `group-toggle.tsx:38` carries `border-b … md:border-b-0`; a strip after that container would sit below the divider at phone width and read as the list's rather than the filter's. Inside, the divider closes the filter row and its strip together — which is what the strip's filter-scoped argument asks for. This is the one placement call the spec takes eng-side; it is recorded in spec §4 for Design to ratify and nothing waits on it.
- [ ] The container is currently a single `flex items-center` row. Wrap its existing children in an inner row and let the strip be the second child of a column, so the pills' geometry is untouched at both widths.
- [ ] Left-aligned, two lines, identical at both widths. No per-width branch.
- [ ] `decklist.tsx` computes the summary through `summarisePrices` over the same `shoppingCards` it already derives `shoppingCount` from, and passes it to all **three** `GroupToggle` call sites (`:229`, `:286`, `:378`). The empty-shopping branch at `:229` has nothing to price and renders no strip; assert that rather than assuming it.

**Verification:**
- [ ] Tests: both provenance forms; the clause present, dropped at all-priced, and the figure dropped at none-priced; absent under the `All` filter; absent when Shopping is empty.
- [ ] A test asserts the strip's denominator equals the number on the `Shopping N` pill in the same render. These are one fact and must never disagree.
- [ ] Browser check at both widths: the strip reads as belonging to the filter row, and switching to `All` removes it the same way it removes the rows it summed.

---

## Task 7: Rename the sort

**Files:**
- Modify: `src/lib/copy/decks-builder.ts`

**Steps:**

- [ ] `sortCheapest: "Cheapest first"` → `"Cheapest to cast"` at line 68. That is the whole change: one copy key, one call site (`consider-toolbar.tsx:57`), and the sort itself (`consider-panel.tsx:109`, on `manaValue`) is not touched.
- [ ] Leave `builder-tabs.test.tsx:69`'s literal `<option>Cheapest</option>` alone — it is a test fixture, not a rendering of this key.

**Verification:**
- [ ] `pnpm test` — any test asserting the old label is updated to the new one, not deleted.
- [ ] Grep the repo for `Cheapest first` and confirm zero remaining occurrences outside the design handoff, which is a historical record and is not edited.
- [ ] Eyeball the phone toolbar: the label is one word longer in a row carrying three controls. If it wraps, say so in the PR rather than shortening the label unilaterally.

---

## Task 8: The export copy

**Files:**
- Modify: `src/components/decks/export-dialog.tsx`

**Steps:**

- [ ] Replace `export-dialog.tsx:397` (`Names only. Pricing is a planned add — see release notes.`) with `priceCopy.export.pricingNote`.
- [ ] Replace the mobile note at `:425` (`names only · pricing planned`) with **the same key**. Two call sites, one live value — do not leave the mobile one behind. Both are hardcoded copies of one claim that this pass makes false.
- [ ] Change no export behaviour. Names only, both tabs.

**Verification:**
- [ ] `pnpm test` passes.
- [ ] Grep for `pricing planned` and `planned add` and confirm zero occurrences remain in `src/`.
- [ ] Open the dialog at both widths and confirm both notes now read the same sentence.

---

## Task 9: Design review, then the PR

**Steps:**

- [ ] Build the design property table from `The 99 - Decks · Price Addendum (R3).dc.html` into `docs/superpowers/design-tables/price-on-the-buy-tag.md` — every property of the tag, the strip and the scrim at both densities.
- [ ] Run the design-review skill: enumerate → verify → confirm, at both widths. Mobile and desktop parity is in this PR, not a follow-up.
- [ ] **Check the responsive split for subtree duplication.** Prefer one element with responsive classes over two branches; a doubled subtree passes verification on both columns while being wrong.
- [ ] Update `docs/superpowers/design-pipeline-status.md`: #288 moves from 🟢 Ready to 🔨 in flight, then to ✅ Shipped when the PR merges.
- [ ] Pre-push gate, then open the PR. Request Copilot per the policy in `~/.claude/CLAUDE.md`, verifying the request actually attached rather than trusting the 200.

**Verification:**
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all clean, lint at 0 problems, test count at or above the Task 1 baseline.
- [ ] `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build` succeeds.
- [ ] Every property-table row confirmed at both widths.

---

## What this plan deliberately does not build

- **The store link-out.** Ruled out of the tag; named as the export dialog's if Product ever wants it. Separate ticket, separate copy pass.
- **The last known price on a sold-out card.** The strongest road not taken. Two decisions if it returns, not one.
- **Any price on `/decks`, on the `All` filter, or in the Consider panel's sort order.** Price ranks nothing, and Task 7 exists to keep that sentence true.
