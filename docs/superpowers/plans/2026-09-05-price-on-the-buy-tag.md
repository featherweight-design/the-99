# Price on the Buy Tag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the prices already sitting in `printing_prices` on screen, in the one place the player is already told a card must be bought. `printing_prices` shipped on PR #291 and has zero readers in `src/` — every price in the database is currently invisible.

**Architecture:** One server read joins `printing_prices` to `printings` and picks **one printing per oracle card** — live before stale, non-foil stock before foil-only, then cheapest — leaving the live-versus-stale call to a pure derivation, where "live" is `as_of === max(as_of)` over the table. Those facts are attached to the card lists during the existing `/decks/[id]` page load and ride into `BuilderShell` and down to the decklist rows and suggestion tiles, where the shipped `BuyTag` grows a tail. A second, filter-scoped construct — the price strip — sums what the Shopping filter is showing and discloses the table's own freshness once. Every derivation is pure and lives in `src/lib/decks/price.ts`; the only database code is one query.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-05-price-on-the-buy-tag-design.md`, which consolidates the handoff at `design/design_handoff_the99_decks/` — `ADDENDUM-README.md` (R1), `R2-README.md`, `R3-README.md`, and the three `Price Addendum` canvases. **R3 governs.** Where R1 or R2 disagrees with it, `R3-README.md` §6 records the stale drawing; those five entries are not to be re-implemented from the older canvases.

**Design property table:** none exists yet. Task 9 builds it from the R3 canvas as the design-review skill's enumerate step, before the PR opens.

## Global Constraints

- **Zero new marks, hues, tokens, dependencies or motion.** Every colour is an existing `var(--…)` from the table in spec §3. Hexes live only in `src/app/globals.css` and none is added.
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
- `src/components/decks/group-toggle.test.tsx` — nor does the toggle bar; Task 6's pill-versus-denominator assertion needs a home.

**Modified:**

- `src/lib/copy/decks-builder.ts` — `sortCheapest` only.
- `src/lib/decks/grouping.ts` — `DeckDetailCard` gains an optional `price`.
- `src/lib/decks/suggest.ts` — `DeckSuggestion` gains the same optional field.
- `src/app/decks/[id]/page.tsx` — calls `loadPrices`, attaches each card's fact to the lists it already builds, and passes the table's newest `as_of` to `BuilderShell`.
- `src/components/decks/builder-shell.tsx` — threads `newestAsOf` down to `Decklist` and the Consider tiles.
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
- [ ] Implement `formatCents(cents)` — whole cents, never rounded, `$` prefix, two decimal places, thousands separated. `formatCents(12950) === "$129.50"`. **Pin the locale.** A bare `toLocaleString()` — the shipped habit at `src/app/collection/page.tsx:108` — resolves against the runtime's locale, which differs between the server render and the browser and produces a hydration mismatch on any four-figure total. Pass `"en-US"` explicitly, and assert `formatCents(123450) === "$1,234.50"`.
- [ ] Implement `summarisePrices(cards, newestAsOf)` over the Shopping-filtered cards, returning `{ totalCents, pricedCopies, totalCopies }`.
  - **Count copies, not rows.** `src/components/decks/decklist.tsx:124` derives the `Shopping N` pill through `cardCopies`, and the strip's denominator must be the same figure or the two disagree on screen. Multiply each card's price by its `quantity` for the same reason.
  - `priced` and `foilOnly` both contribute; `foilOnly` contributes `foilCents ?? etchedCents`. `soldOut` and `absent` contribute nothing to the total and count against the denominator.
- [ ] Implement `provenanceForm(newestAsOf, now)` returning `{ behind: boolean; when: string }`. Export `PRICE_STALE_AFTER_DAYS = 10` and comment it as the single constant governing **two** effects: past it the line switches from a weekday to a date, *and* it gains the behind clause. One threshold, deliberately, so a player never reads an ambiguous weekday on a table we already know is behind. **Ten, not seven** — the ingest runs 09:00 UTC every Monday, so a healthy table is nearly seven days old by the next Monday morning and a seven-day threshold would fire the warning weekly on a feed that was working. Ten is one missed run plus slack.

**Verification:**
- [ ] Unit tests cover all four states, including the live-row-with-three-nulls case that must land on `absent`.
- [ ] A test asserts the inverted failure mode directly: when every row shares one `as_of`, **no card is `soldOut`**, whatever that timestamp is. This is the property the whole derivation was rewritten for in R2 and it must not regress silently.
- [ ] A test asserts `summarisePrices` multiplies by quantity and that its denominator equals `cardCopies` over the same list.
- [ ] Tests for `provenanceForm` at 9 days (weekday, no clause) and 11 days (date, clause), plus a test at exactly 7 days asserting **no** behind clause — the weekly-healthy case the threshold was moved for.

---

## Task 3: The query

**Files:**
- Create: `src/lib/decks/price-query.ts`

**Interfaces:**
- Consumes: `PriceFact` from Task 2.
- Produces: `loadPrices(oracleIds: string[]): Promise<{ prices: Map<string, PriceFact>; newestAsOf: Date | null }>`.

**Steps:**

- [ ] **Do not filter to live rows.** The query returns one row per oracle id regardless of liveness, and Task 2's state machine decides what it is. Filtering to `as_of = max(as_of)` in SQL would make `soldOut` unreachable — every returned row would be live by construction, the `buy · sold out` tail would never render, and its test would pass vacuously. Liveness is a comparison the caller makes, not a `where` clause.
- [ ] **`distinct on`, not an aggregate.** `min(...) group by oracle_id` cannot hand back the winning row's other columns, and per-column `min()` silently mixes rows from different printings into one fictional price. Shape:
  ```sql
  select distinct on (p.oracle_id)
         p.oracle_id, pp.price_cents, pp.price_cents_foil,
         pp.price_cents_etched, pp.as_of
    from printings p
    join printing_prices pp on pp.scryfall_id = p.scryfall_id
   where p.oracle_id = any(${sql.param(oracleIds)}::uuid[])
   order by p.oracle_id,
            (pp.as_of = ${newest}) desc,          -- live printings first
            (pp.price_cents is null),             -- non-foil stock beats foil-only
            coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
            pp.scryfall_id                        -- deterministic tiebreaker
  ```
- [ ] Every clause in that `order by` is load-bearing, in order: a live printing always beats a stale one, so `soldOut` means *no* live printing exists rather than "the cheapest happened to be stale"; a printing with real non-foil stock beats a foil-only one at any price, so `foilOnly` means the card is genuinely foil-only and a $50 non-foil is never displaced by a $2.10 foil; and `scryfall_id` last keeps the figure from wandering between reads when two printings tie, the same reason `src/lib/decks/availability-query.ts:116-118` carries one.
- [ ] **`newestAsOf` is its own `select max(as_of) from printing_prices`**, not a column of the join. Taken from the join it is null whenever no passed oracle id matched — which is exactly the none-priced deck, the case where spec §4 still wants line 2 to render. Two statements in one `Promise.all`, or one statement with the scalar subquery selected on a `cross join`; either is one round trip.
- [ ] **`sql.param` for the oracle-id array.** A bare `${jsArray}` in a Drizzle template expands to a parenthesised parameter list — `($1, $2)::uuid[]` — which is a syntax error, not an array. This is documented at `src/lib/decks/availability-query.ts:46-50` and has bitten this repo once already.
- [ ] Follow `src/lib/decks/availability-query.ts` for shape and for its header-comment discipline: say in the file what the query deliberately handles.
- [ ] **Header-comment the overlap with `src/lib/discovery/price.ts`.** PR #306 landed a `loadPrices` over the same two tables for the Discovery candidate list. It is deliberately *not* shared: Discovery renders three states and never shows foil, so it aggregates `min(price_cents)` filtered to live rows and needs no winning row; the builder renders four states including foil-only and sold-out, so it needs the winning row and all three of its price columns. Say that in both files, so the next reader finds the divergence documented rather than inferring one of them is a mistake.

**Verification:**
- [ ] `pnpm typecheck` clean.
- [ ] Manual check against staging, which has been priced: run the query for a known deck's oracle ids and confirm the row count and a spot-checked figure. Use the Neon MCP with `branch_id` set explicitly to `br-polished-pond-a6e63y0b` — the default is **production**, which has never been priced.

---

## Task 4: Thread the prices to the surfaces

**Files:**
- Modify: `src/lib/decks/grouping.ts`, `src/lib/decks/suggest.ts`, `src/app/decks/[id]/page.tsx`, `src/components/decks/builder-shell.tsx`

**Steps:**

- [ ] Add `price?: PriceFact | null` to `DeckDetailCard` (`src/lib/decks/grouping.ts:26`) and to `DeckSuggestion`. **Optional, for the reason `availability` is optional** (the comment at `src/lib/decks/grouping.ts:20-25`): six sites build these literals — optimistic reducers, tests, fixtures — and none can reach the database. Absent and null both mean "no price", so a failed read degrades to the bare tag rather than to an error surface.
- [ ] **`loadPrices` runs *after* the existing `Promise.all`, not inside it.** `suggestions` come out of that call (`src/app/decks/[id]/page.tsx:28-38`), so the suggestion oracle ids do not exist until it resolves — there is no way to price them in the same batch. One extra sequential await, over the union of `detail.cards` and `suggestions` oracle ids. Wrap it in `.catch(() => null)`, the same degradation `src/app/decks/[id]/search-action.ts:104` uses. A price read that fails must not take the builder down.
- [ ] **Attach the facts in `src/app/decks/[id]/page.tsx`, and pass only `newestAsOf` down.** The card lists are already being built server-side; attaching each card's `price` there means no component below does a map lookup in render, and `BuilderShell` needs one extra scalar prop rather than a collection. Match the shipped precedent at `src/components/decks/builder-shell.tsx:75` — a plain `Record`, not a `Map` — for anything that must cross the server/client boundary.
- [ ] **Accept that an optimistically-added card shows a bare tag until revalidate.** `src/components/decks/optimistic-deck.tsx:61,75,99` builds cards client-side with no database access, so a just-added unowned card renders `buy` and gains its figure when the server list arrives. This is the same behaviour `availability` already has, it is why the field is optional, and it is not worth a client round trip to avoid.

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
- [ ] The row's figure right-aligns into a 58px slot under Shopping and hugs under `All`. **The 58px slot is new, not shipped** — `58px` appears nowhere in `src/components/decks` today. It is `min-width: 58px; text-align: right` on the *figure span inside the tag*, as the R1 canvas draws it (`The 99 - Decks · Price Addendum.dc.html:70`, and its Phone · Shopping caption at `:125`). Do not go looking for an existing column to fill.
- [ ] **That min-width widens a flex item at phone width — measure it.** The row variant is an inline `flex-none` element (`src/components/decks/buy-tag.tsx:24`, mounted at `src/components/decks/decklist-row.tsx:266`) in a row that already carries the card name, an `AvailabilityMarker` at `shrink-[4]`, an `AutoTag` and a 44px button, so 58px of guaranteed figure comes out of the name's space. Check the worst real row — long name, marker, auto tag, four-figure price — at 320px. The spec's ruling is that a four-figure price *bends the column rather than truncating*; if it does not hold, say so in the PR rather than shortening the name unilaterally.
- [ ] Extend the tile's accessible name with `priceCopy.aria`, once per price, using the behind form when the table is behind. The row passes no label — the word already sits in the row's reading order (`src/components/decks/buy-tag.tsx:30-34`).

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
- [ ] Render the strip **inside the `GroupToggle` container, above its bottom border**, and only when `filter === "shopping"`. `src/components/decks/group-toggle.tsx:38` carries `border-b … md:border-b-0`; a strip after that container would sit below the divider at phone width and read as the list's rather than the filter's. Inside, the divider closes the filter row and its strip together — which is what the strip's filter-scoped argument asks for. This is the one placement call the spec takes eng-side; it is recorded in spec §4 for Design to ratify and nothing waits on it.
- [ ] **The wrap is not free — move three classes, do not just add `flex-col`.** `src/components/decks/group-toggle.tsx:37-39` is one `flex items-center gap-[7px] md:gap-[10px]` row that also carries the padding and the border. Flipping it to `flex-col` would centre the inner row and collapse the `flex-1` spacer at `:69`, so `ClearAutoButton` and the group pills lose their right alignment, and the 7/10px gap would become the vertical gap between the pills and the strip. `items-center` **and both gaps** move to the new inner row; `flex`, the padding and the border stay on the outer element, which becomes `flex flex-col`.
- [ ] Left-aligned, two lines, identical at both widths. No per-width branch.
- [ ] `src/components/decks/decklist.tsx` computes the summary through `summarisePrices` over the same `shoppingCards` it already derives `shoppingCount` from, and passes it to all **three** `GroupToggle` call sites (`:229`, `:286`, `:378`). The empty-shopping branch at `:229` has nothing to price and renders no strip; assert that rather than assuming it.

**Verification:**
- [ ] Tests: both provenance forms; the clause present, dropped at all-priced, and the figure dropped at none-priced; absent under the `All` filter; absent when Shopping is empty.
- [ ] A test asserts the strip's denominator equals the number on the `Shopping N` pill in the same render. These are one fact and must never disagree.
- [ ] Browser check at both widths: the strip reads as belonging to the filter row, and switching to `All` removes it the same way it removes the rows it summed.

---

## Task 7: Rename the sort

**Files:**
- Modify: `src/lib/copy/decks-builder.ts`

**Steps:**

- [ ] `sortCheapest: "Cheapest first"` → `"Cheapest to cast"` at line 68. That is the whole change: one copy key, one call site (`src/components/decks/consider-toolbar.tsx:57`), and the sort itself (`src/components/decks/consider-panel.tsx:109`, on `manaValue`) is not touched.
- [ ] Leave `src/components/decks/builder-tabs.test.tsx:69`'s literal `<option>Cheapest</option>` alone — it is a test fixture, not a rendering of this key.

**Verification:**
- [ ] `pnpm test` — any test asserting the old label is updated to the new one, not deleted.
- [ ] Grep the repo for `Cheapest first` and confirm zero remaining occurrences outside the design handoff, which is a historical record and is not edited.
- [ ] Eyeball the phone toolbar: the label is one word longer in a row carrying three controls. If it wraps, say so in the PR rather than shortening the label unilaterally.

---

## Task 8: The export copy

**Files:**
- Modify: `src/components/decks/export-dialog.tsx`

**Steps:**

- [ ] Replace `src/components/decks/export-dialog.tsx:397` (`Names only. Pricing is a planned add — see release notes.`) with `priceCopy.export.pricingNote`.
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
