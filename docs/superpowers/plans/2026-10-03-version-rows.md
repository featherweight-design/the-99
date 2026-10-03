# Version card rows (H31) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A version's In rows on the Versions tab draw today's ownership (dot, `own N of M`) and a buy tag with today's price. Every row opens the card modal and, on a pointer, the hover preview. A `todayNote` says the figures are today's.

**Architecture:** `loadVersionDiff` gains the reader's `userId` and returns `ownedNow`, `imageUri`, `printedName` and `price` per card, plus one `newestAsOf` per payload, all from readers the app already has. `version-diff.tsx` draws the row anatomy with the shared `OwnershipDot`, `BuyTag`, `CardDetailTrigger` and `HoverPreviewProvider`, and reuses `useRowOpen` / `ROW_PLATE_HOVER` from `update-diff-row.tsx` once they are exported.

**Tech Stack:** Next.js 16 server actions, Drizzle on Neon, React 19, Tailwind 4, Vitest, Playwright probes.

**Spec:** `design/design_handoff_the99_version_rows/` (README, STATES, copy strings, canvas), with its `READINESS.md` (Design's sign-off and the engineering audit). Ruling touched: deck versioning decision 7 (`design/design_handoff_the99_deck_versioning/README.md:384`), half reversed. Dots and prices are now on In rows, and pull offers stay out.

## Global Constraints

- Mobile (390) and desktop (1300) ship in the same PR. 820 is measured too (audit finding 2).
- No transition or animation inside `#panel-versions` (`probe:versions`).
- Out rows: no dot, no tag. Modal and preview only.
- Basics count as owned and are never priced (AGENTS.md, `probe:draft` rules).
- A price row is not proof of stock today. Read prices through `loadPrices`, which returns `newestAsOf` for `BuyTag` to judge.
- Copy lives in `src/lib/copy/deck-versioning.ts`, and its wording goes to `/copy-review`. No em-dashes, US English.
- No About entry and no `ABOUT_VERSION` bump: cosmetic (audit, About section). The optional bullet waits on Hugh.

## Review Focus

1. A partly owned In row at 820px: the name must keep at least 40px beside the dot, the `own N of M` count, the tag and the cost track.
2. Basics (`Plains 6 → 7`): a filled dot, no tag, and no price read, even when the collection holds fewer basics than `to`.
3. A card owned only in a Secret Lair printing: the row's art and `printedName` come from the owned printing, so the row and the modal agree.
4. A cuts-only version and v1: no `todayNote`. On the phone, no note while Out is shown.
5. Modal Next from the last In card lands on the first Out card. Prev from the first Out card goes back.

## PR boundaries

- **PR 1 (this one, docs):** the handoff, the readiness audit and this plan. Merged after Hugh's review.
- **PR 2 (the feature):** Tasks 1–4, about 13 files. Task 1 alone would ship payload fields nothing reads, so the loader and its consumer land together. If PR 2 measures over ~800 lines, Task 2 (the export, which has callers on day one) splits out first.

---

### Task 1: Payload

**Files:**
- Modify: `src/lib/decks/versions.ts` (`loadVersionDiff` at :505, `VersionDiffCard` at ~:482)
- Modify: `src/app/decks/actions.ts` (`getVersionDiff` at :1927, its `loadVersionDiff` call at :1950)
- Modify: `src/app/decks/actions.test.ts` (the `loadVersionDiff` mock at :452 and the assertions near :1863-1886 gain `userId`)
- Modify: `src/components/decks/version-history.tsx` (payload type only)
- Create: `src/lib/decks/version-rows.ts` and `src/lib/decks/version-rows.test.ts`

**Interfaces:**
- Produces: `loadVersionDiff(versionId, previousVersionId, userId)`, the current signature with `userId` appended, so the predecessor contract is unchanged.
  - It returns the existing payload plus `newestAsOf: Date | null`.
  - Each `VersionDiffCard` gains:
    - `ownedNow: number`
    - `imageUri: string | null`
    - `printedName: string | null`
    - `price: PriceFact | null`
- Produces: `assembleVersionRows(cards, owned: Map<string, number>, prices, printings)`, a pure function in `version-rows.ts`.
  - The loader makes the three reads and hands their results to it, so its rules are unit tested without a database. The repo has no db-mocking precedent for a loader.
  - The reads themselves are proved by `probe:versions` (Task 4), the `probe:draft` pattern.

- [ ] Write failing tests for `assembleVersionRows`:
  - an unowned card reads `ownedNow 0` with its price;
  - a card owned in two printings sums both;
  - a basic reads `ownedNow >= to` and `price null`, and the price map is never consulted for it;
  - an owned Secret Lair printing supplies `imageUri` and `printedName`;
  - `newestAsOf` is passed through.
- [ ] Run `pnpm vitest run src/lib/decks/version-rows.test.ts`. Expect FAIL.
- [ ] Implement:
  - **`ownedNow`:** `sum(collection_items.quantity)` grouped by oracle id, `inArray` over the diff's oracle ids, for `userId`.
  - **Basics:** override with `isBasicLand` (`grouping.ts:147`), and leave basics out of the price read.
  - **Price:** `loadPrices(nonBasicOracleIds)` (`price-query.ts:67`).
  - **Art:** `resolveOwnedPrintings` (`owned-printings.ts:31`) for `imageUri` and `printedName`, falling back to `cards.image_uri`.
  - **Call site:** `getVersionDiff` passes the signed-in reader's id, and the `actions.test.ts` mock and assertions are updated to match.
- [ ] Run `pnpm vitest run src/lib/decks/version-rows.test.ts src/app/decks/actions.test.ts`. Expect PASS. Mutation-check: drop the basics override, and the basics case fails.
- [ ] Rewrite the `VersionDiffCard` doc comment so it no longer restates decision 7.

### Task 2: Export the row-open hook

**Files:**
- Modify: `src/components/decks/update-diff-row.tsx` (`useRowOpen` :287, `ROW_PLATE_HOVER` :105)
- Test: `src/components/decks/update-diff-row.test.tsx` (still passes, unchanged)

- [ ] Export both. Generalise `useRowOpen`'s first argument from `DiffRowCard` to the fields it reads, so a `VersionDiffCard` satisfies it. Behaviour does not change.
- [ ] Run `pnpm vitest run src/components/decks/update-diff-row.test.tsx`. Expect PASS.

### Task 3: Row anatomy, modal, preview, note

**Files:**
- Modify: `src/components/decks/version-diff.tsx`
- Modify: `src/lib/copy/deck-versioning.ts`, `src/lib/copy/deck-versioning.test.ts`
- Test: `src/components/decks/version-diff.test.tsx`
- Modify: `docs/superpowers/design-tables/deck-versioning-surface-4-5.md` (`diffNote` at :57, :623)
- Modify: `design/design_handoff_the99_version_rows/README.md` call 2, `STATES-version-rows.md` rows 8–11 and the canvas callouts at `dc.html:94` and `:369`. Each becomes `lg` rather than `md`, with the collapsed tag drawing the live figure and a bare `$` only when there is no live price (audit findings 1 and 2), so every handoff source agrees with what ships.

- [ ] Write failing component tests, each named for its STATES row:
  - an In row with owned 0 and a price draws a dashed dot and `buy · $2.40`;
  - a partly owned row draws a filled dot, `own 1 of 4` with its a11y string, and a tag;
  - a fully owned row and a basic draw a filled dot and no tag;
  - an Out row draws no dot and no tag;
  - siblings run In then Out, so Next from the last In card reaches the first Out card;
  - `todayNote` sits above the columns only when In has rows, is absent on v1, and on the phone is hidden while Out is shown;
  - `diffNote` is gone.
- [ ] Run them. Expect FAIL.
- [ ] Implement:
  - **Row line:** dot (`size={7}`), name (`printedName ?? name`), pair, `own N of M`, then `BuyTag variant="row"` with `density` `"full"` from `lg` and `"collapsed"` below. The tag shows when `ownedNow < to`.
  - **Wrapper:** each row in `CardDetailTrigger` with the In-then-Out `siblings`.
  - **Preview:** columns wrapped in `HoverPreviewProvider`, and `usePreviewRow(imageUri)` on each row.
  - **Hover plate:** `ROW_PLATE_HOVER`, with no transition class.
  - **Header comment:** rewritten to state the half-reversed ruling. Pull offers stay out.
  - **Copy:** add `todayNote`, `partialOwned` and `partialA11y`, and retire `diffNote`. Then run `/copy-review` on the three strings.
- [ ] Run `pnpm vitest run src/components/decks/version-diff.test.tsx src/lib/copy/deck-versioning.test.ts`. Expect PASS. Mutation-check:
  - drop the `ownedNow < to` gate, and the owned-row test fails;
  - reverse the sibling order, and the Next test fails.
- [ ] Sweep `diffNote` from the design table, and make the handoff corrections listed above. Grep the handoff folder for `md+` and for `density="collapsed"`, and read every hit against the two findings.

### Task 4: Probes and acceptance

**Files:**
- Modify: `scripts/probe-version-history.mjs`
- Modify: `scripts/probe-hover-preview.mjs`
- Create: `docs/superpowers/inventories/version-rows.json`

- [ ] **`probe:versions`** gains the following checks at 390, 820 and 1300:
  - which rows draw dots and which draw tags;
  - `own N of M` on a partly owned row;
  - a press opening the modal, and Next from the last In card landing on Out;
  - an 820 name floor of at least 40px on the widest partly owned row, which fails when there is no such row;
  - the existing no-motion count, still 0.
- [ ] **`probe:hover-preview`** adds the Versions surface at 1300 and asserts no preview under `(hover: none)`.
- [ ] **Fixture:** built on `local-dev` (or a `pull:staging` scratch branch), and deleted in a `finally`.
  - The deck carries a version holding an unowned priced card, a partly owned card and a basic step.
  - The fixture writes no collection rows: it adds a card the account does not own rather than lifting owned rows.
- [ ] **Mutation-check:**
  - the tag at `md` instead of `lg` fails the 820 floor;
  - removing the provider fails the preview check.
- [ ] Run `feature-acceptance`: a contact sheet from the inventory at 390, 820 and 1300, then a close-out walk against the README's "what a green looks like".
- [ ] **Pre-push gate:** typecheck, lint, test, stub build, then fetch and rebase. Run the pre-open pass, open PR 2, then pr-review.
