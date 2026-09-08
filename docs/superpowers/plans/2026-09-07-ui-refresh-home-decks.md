# UI Refresh — Home, Decks, and the chrome · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Home, Decks and the navigation chrome to the refresh handoff — an icon rail and icon tab bar, art-led commander cards, the six shipped deck statuses rendered as pill/bar/keyline, deck actions restored to a single overflow, live filtering with no Apply, and a Commitments roll-up — without redesigning Commander detail, the Commanders list, the Builder or Card detail.

**Architecture:** Four layers, in dependency order. (1) A copy module (`src/lib/copy/refresh.ts`) taken verbatim from the handoff, plus one pure formatting helper for relative dates. (2) Chrome — `src/components/shell/nav.tsx` swaps its diamonds for 19px stroke icons, narrows the rail to 62px, and retires adjudication #1; the tab bar gains the same four glyphs. (3) Data — `listDecksWithStats` gains a last-played join and a per-deck shopping figure, and one new module rolls those per-deck figures into the all-decks total the Commitments card needs; Home gains reads for collection freshness and the ready-to-build slice. (4) Surfaces — Decks (tiles, persistent filter column, phone sheet, sort, zero and filtered-empty states) then Home (greeting, ready-to-build, resume rows, deck rail, Commitments, first run), then a conformance pass that takes the four un-redesigned surfaces down to the 32px hairline button.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest, pnpm.

**Design handoff:** `design/design_handoff_the99_refresh/` — `README.md` (nine decisions, the conformance table, seven gaps), `STATES-deck-statuses.md` (the six values, their tokens, the tile grid), `CHROME-rail-and-tabs.md` (rail, tab bar, targets, filter surfaces, the retired adjudication), `refresh · copy strings.ts` (every string, production-final), `The 99 - Refresh · Home and Decks.dc.html` (the drawn frames — desktop Home, desktop Decks, three phone frames, first run, zero decks), `The 99 - Refresh · Theme Matrix.dc.html`, `READINESS.md` (Design's own self-assessment).

**Issues:** none filed — this is a design-track build off the handoff.

---

## Readiness verdict — 🟡 Yellow, audited 2026-09-07 (R2)

R1 was 🟠 Orange on four Design-owned gaps: no Home first-run frame, no Decks zero-deck state, the Import button homeless, and the phone Ready-to-build carousel undrawn. **R2 closed all four**, and corrected a fifth thing nobody had asked about (Draft tiles were drawn with placeholder art; `decks.commander_oracle_id` is `NOT NULL`, so Design removed the placeholder and the *no commander yet* string).

What remains is Yellow, not Green, and **every remaining finding is eng- or product-resolvable — none needs a Design round-trip.** They are recorded here because this is the document that gets read during the build.

**Finding 1 — Design's blocking item 1 (`nav.tsx` adjudication) is a code change, and this plan makes it.** `src/components/shell/nav.tsx:20` reads `// Adjudication #1: no <Mark> icons inside rail nav items — Diamond + label ONLY.` The refresh puts a 19px stroke glyph in every row, which contradicts it. **Resolution: Task 4 deletes that comment in the same commit that adds the icons, and replaces it with a comment recording that the refresh retired it and why. An icon added while the prohibition still sits above it is a silent contradiction, which is precisely what Design asked us not to ship.**

**Finding 2 — Design's blocking item 3 (the Ready-to-build threshold) has a shipped precedent, and it reproduces the drawn frame exactly.** Design says *"the real rule — top N, or score ≥ X, or both with a floor — is not specified."* The frame draws two cards at 74 and 71 and the line `7 more scored 70 or better`. 2 + 7 = 9, and the pre-refresh Home headline this replaces was literally *"Nine commanders you can build now."* **Resolution: the ready-to-build set is the top 9 by `rankScore` (`READY_COUNT = 9`). Home renders the first 2 and prints `moreAbove(READY_COUNT − 2, floor)` where `floor` is the 9th item's `rankScore` — the lowest score in the set, exactly as `refresh · copy strings.ts:35` requires ("never a rounder number"). See locked ruling 1 for the short-list behaviour.**

**Finding 3 — Design's blocking item 4 ("Update collection" has no state machine) is already built.** `/collection/replace` ships `ReplaceFlow` (`src/components/collection/replace-flow.tsx`), which owns steps 1 → 2 → 3 including the partial-read case, and `src/components/home/first-run.tsx:84` already embeds it. **Resolution: Home's `Update collection` is a `<Link href="/collection/replace">` styled as the 32px hairline pill. No new state machine, no dialog, no button-with-spinner. Zero new code beyond the link.**

**Finding 4 — Design's blocking item 5 (the Commitments card's third row is new data) is correct, and the fix must not be client-side.** `To buy, all decks` (`18 · $94.80`) has no carrier: `listDecksWithStats` returns `toBuyCount` but no price, and `src/lib/decks/price-query.ts` is only ever called per deck. **Resolution: Task 7 builds `loadDeckShopping(userId)` — one query for unowned lines across every deck, one `loadPrices` over their union, `summarisePrices` per deck. The all-decks total is the sum of those per-deck figures, computed server-side in the same function. It must respect the shipped price semantics: a printing absent from `printing_prices` is not free, and `summarisePrices` already counts it against the denominator rather than into the total (`src/lib/decks/price.ts:136`).**

**Finding 5 — the deck tile's last-played figure has no carrier either.** `STATES-deck-statuses.md` §7 puts last played on the right of every tile's detail row, and the frames draw `2 days ago` / `last week` / `never played`. `DeckListItem` (`src/lib/decks/read.ts:211-224`) has no such field, and there is no relative-date helper anywhere in `src/lib`. **Resolution: Task 3 adds a pure `formatWhen` helper with its own tests; Task 6 adds `lastPlayedAt` to `DeckListItem` via a `max(played_at)` join on `deck_games`, which already carries the index for it (`deck_games_deck_played_idx` on `(deckId, playedAt)`).**

**Finding 6 — the header's view toggle is drawn, but only one of its two states is.** `CHROME-rail-and-tabs.md` §Header actions lists *"view toggle, `Sort · …`, Import, New deck"*, and the desktop Decks frame does draw it: a 32px segmented pair, 8px radius, `#2E2822` border, grid glyph active on `#241F18`, list glyph inert — immediately left of `Sort · last played`. What is *not* drawn anywhere is the list state it switches to. No frame renders decks as rows, no copy string names either mode, and the shipped app has no view preference to inherit a row layout from. Building it means inventing the deck row — its height, which of the tile's seven parts survive, what happens to the commander art the whole tile is built on — which is a design decision, not an engineering one.

**Resolution: no view toggle ships in this build.** Shipping the control with one state is worse than shipping neither: a segmented pair whose second half does nothing is a bug on first click. This is the one place the drawn frame is *not* followed, and the reason is that following it is not possible. Recorded in the gap report at close-out and raised in the plan PR body as the second open question. If Design draws the row, it is a self-contained follow-up — the toggle is a `?view=` parameter through the same `filtersFromParams` seam Task 11 builds, and the grid is already a `<ul>` of `<li>`.

**Finding 7 — Design's blocking item 2 (Canopy's `To buy` `#A3C445` beside `Complete` `#6FA368`) is a colour call, not a build blocker.** It is rendered in `Theme Matrix`, Design's own read is that it holds, and nothing in this plan depends on the answer. **Resolution: build to the tokens as they ship. Carried as an open question in the plan PR body; if Hugh rejects it, the fix is a single `--success` value in `src/lib/theme/themes.ts` under `ixalan` and touches no component in this plan.**

**Finding 8 — the hero card's `N in use` clause has no carrier on the type Home reads.** The frame
prints `12 in use` under a Ready-to-build commander, and `refreshCopy.home.inUse` exists for it, but
`CommanderListItem` (`src/lib/recs/recommend.ts:36-57`) has no in-use count and no field it could be
derived from — in-use is a claim against `deck_cards`, not against a score. **Resolution: Home calls
`receiptCountsByCommander` (`src/lib/commanders/in-use.ts:50`), which returns
`Map<oracleId, { inUse, wantedByBrew }>` and is the same path the shipped commanders list already
uses. The count is threaded to the hero as a prop, not bolted onto `CommanderListItem`.** Reusing the
shipped query is the whole point: it is the only way Home and `/commanders` cannot disagree about the
same commander. `wantedByBrew` is read by neither surface here and is discarded at the call site.

---

## Locked rulings — do not re-litigate

A task that appears to contradict one of these has misread the task.

1. **`READY_COUNT = 9`.** Home's Ready-to-build set is the top 9 of `getRankedList(userId).items` by `rankScore`. Two cards render (desktop and phone alike — the carousel is withdrawn, the phone list is stacked). `moreAbove(n, floor)` prints `n = set.length − 2` and `floor = set[set.length − 1].rankScore`. When `set.length <= 2` the whole `moreAbove` line is omitted and only **All commanders** remains. Rendering fewer than 2 is fine; the section unmounts entirely at 0.

2. **The zero-deck line reuses the same set.** `zero.buildableFrom(buildable, cards)` takes `buildable = min(9, items.length)`. This is why the frame reads `9 commanders buildable from 1,284 cards` — same nine. **Do not invent a second "buildable" threshold.** `src/components/home/commander-count.tsx:7-9` records that this app has deliberately had no buildable threshold; ruling 1 is now the only one, and it is a rank cut, not a score cut. Omit the whole line when `buildable === 0`.

3. **The colour label on a deck tile is `colorLabel` from `src/lib/decks/format.ts`.** It already ships on deck cards and already handles the prototype-pollution and duplicate-code cases. The frames' register (`Mono-red`, `4-colour`) is a drawing, not a copy string — `refresh · copy strings.ts` has no colour-label string at all. **Do not add a third colour-naming helper**; `format.ts:colorLabel` and `copy/color-labels.ts:guildLabel` are already two.

4. **`Update collection` is a link to `/collection/replace`.** See finding 3.

5. **One string is added to the copy file beyond the handoff, and one signature is corrected: `decks.detailUnowned(n) => \`${n} unowned\``.** The frames need a price-free unowned clause in two places the handoff's own strings cannot serve — Home's resume rows (`99 / 99 · 3 unowned`) and the phone deck rail. Every other string is verbatim. **No other string is invented, at a call site or anywhere else.** Wording changes go through `/copy-review`, not through this plan.

    The correction: `home.fit` ships in the handoff as `(score: number) => \`${score} /100 fit\``,
    which hardcodes a denominator that is not always 100. `src/components/commanders/rec-card.tsx:83-88`
    is the shipped precedent and its comment states the reason — an unmeasured commander scores 32 of
    40, and printing a rescaled figure would show the same commander as an 80 on one surface and a 32
    on another. The signature becomes `(score: number, outOf: number) => \`${score} /${outOf} fit\``
    and the hero passes `item.measurableTotal`. The wording is untouched; only the denominator stops
    being a constant.

6. **The phone gets a sort control, inside the filter sheet.** The phone frames draw `3 of 6`, a 36px search trigger and `Filter · 2` — no sort. A phone reader losing the ability to order six-plus decks is a real loss and the parity rule is in `AGENTS.md`, so sort ships. It ships as a fourth heading *within* the sheet — `Sort`, above `Status`, rendered as the same 36px pill chips the sheet already uses for status and last-played, single-select with one always on. A third trigger in a header row that is already title + count + search + Filter at 390px is the alternative, and it is worse: the chips reuse a construct the sheet has, cost no header width, and put ordering next to filtering where both are one sheet-open away. Recorded in the gap report as an addition to the drawn frame.

7. **Sort has exactly three options.** `Last played` (default — most recent first, never-played last, `lower(name)` then id as tiebreak), `Name` (`lower(name)` ascending, id tiebreak — today's shipped order), `Newest` (`createdAt` descending, id tiebreak). The handoff draws only the default (`Sort · last played`) and names no others. Serialised as `?sort=name` / `?sort=newest`; the default is an absence.

8. **Filtering is live, and `Clear` is the only commitment control.** No Apply, at either width. Esc dismisses the phone sheet without undoing anything, and the sheet's primary button says `Show N decks` and only closes it — swiping the sheet away loses nothing, which the handoff's own note calls out in bold.

   The Decks sheet is a **new component**, not `FilterPanel`. `FilterPanel` is a searchable list of checkbox rows with counts (`src/components/ui/filter-panel.tsx:1-26`); the drawn Decks sheet is chip groups, a 5-swatch colour grid, and one full-width dismiss. Nothing about it is `FilterPanel` configured differently, and forcing it through that component would mean adding a chip mode, a swatch mode and a dismiss-button mode to a control four collection dropdowns depend on. Its Esc-is-dismiss and live-apply rules are copied *from* `FilterPanel`'s header comment because they are right, not inherited from its code. **`FilterPanel` is still used, once: the desktop `Sort · …` trigger**, with `searchable={false}`, `selectionMode="single"`, `showCounts={false}` — the same three flags the shipped collection Sort ▾ passes.

9. **All six statuses always render as filter rows, with no counts.** A filter list that changes length between players is worse than one with quiet rows. The header carries the only count (`shown of total`), and **it must always equal the number of tiles rendered** — if they disagree, the count is the bug.

10. **A deck tile has no CTA.** The status pill is the message and the whole tile is the target. One `…` in the top-right carrying exactly three items — Update from a list, Rename, Delete (`--danger`, last). Home's resume rows follow the same rule: pill, count, no button.

11. **Commitments' two availability figures come from `loadAvailability(userId)`, not from a new query.** `Cards in use` = the sum of `hard` across the returned map over `getCollectionStats().totalCards`. `Spoken for twice` = the count of entries where `availabilityState(a)` is `"over"`. Both use the whole-user vantage (no `excludeDeckId`), which is what `src/app/collection/page.tsx:55` already does.

12. **`To buy, all decks` double-counts across decks, deliberately.** A card wanted by two decks and owned in zero copies is two copies to buy. The row is a shopping roll-up, not a distinct-card count.

13. **Colour is status, and status only.** Draft `--fg-faint` · Building `--fg-body` · Over `--danger` · Unresolved `--warning` · To buy `--accent` · Complete `--success`. Pill fills are the status colour at `2E` alpha with an `80` alpha border and the status colour as label — one rule, six instances, **no per-theme hex anywhere**. No other element on Home or Decks is tinted.

14. **One filled button per screen, and it is bone (`--fg` on `--bg`), never accent.** Accent means *in use / to buy*, so it is unavailable for actions. Everything else is a 32px hairline pill: `--border-strong`, 12.5px label, 14px side padding. Phone floors every target at 44px.

15. **The rail is icon-only at 62px, so every item carries an `aria-label` and a tooltip.** The label text does not leave the accessible name. There is no `Tooltip` component in this codebase and this plan does not add one — the native `title` attribute is the whole implementation.

16. **The diamond stays once, at the top of the rail.** It is the app mark, not a nav item. It is not repeated per row.

17. **Commander art is not themed.** It is photography. No token filters it, at any size.

---

## Global constraints

- Package manager is **pnpm**. Never npm or yarn.
- Copy lives in `src/lib/copy/refresh.ts`, taken verbatim from `design/design_handoff_the99_refresh/refresh · copy strings.ts`, plus the single addition in locked ruling 5. **No string is invented at a call site.**
- **No percentages, at any N, anywhere in this feature.** Every count carries its denominator in the same string — `99 / 99`, `74 /100 fit`, `312 of 1,284`, `6 of 6`.
- **No per-theme hex.** Status colour reaches the screen as `var(--danger)` etc., with alpha applied by `color-mix` or an `NN` suffix on the token — never as a literal from `tokens.r6.json`.
- Mobile and desktop parity ship in the **same PR**. Every UI task states both sets of figures.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`.
- The schema file is `src/db/schema.ts` — **not** `src/lib/db/schema.ts`. This plan adds **no migration**; every figure it needs already has a table.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.
- Stage files by name. Never `git add -A`.
- This repo merges via **squash**, and ships **no prettier config** — match surrounding style by hand.

---

## PR split

| PR | Tasks | Deliverable |
|---|---|---|
| A | 1–3 | Copy module and the `formatWhen` helper. No UI change. |
| B | 4–5 | Chrome: 62px icon rail, 52px icon tab bar, adjudication retired, locked states named, primary filled with bone app-wide. |
| C | 6–8 | Data: last-played join, `loadDeckShopping`, the Home reads. No UI change. |
| D | 9–13 | Decks: tiles, filter column, phone sheet, sort, header, zero and filtered-empty. |
| E | 14–18 | Home: greeting, Ready to build, resume rows, deck rail, Commitments, first run. |
| F | 19 | Conformance: the 32px hairline button across the four un-redesigned surfaces. |

Each PR runs its own Copilot review loop to the merge bar in `~/.claude/CLAUDE.md`.

---

## Task 1: The copy module

**Files:**
- Create: `src/lib/copy/refresh.ts`
- Test: `src/lib/copy/refresh.test.ts`
- Source: `design/design_handoff_the99_refresh/refresh · copy strings.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `refreshCopy` — a `const` object with sections `home`, `decks`, `zero`, `firstRun`, `filters`, `status`. Every later task imports from here and **no later task writes a literal string into JSX**.

- [ ] **Step 1: Copy the handoff file verbatim**

Copy `design/design_handoff_the99_refresh/refresh · copy strings.ts` to `src/lib/copy/refresh.ts` byte-for-byte, including the header comment block (the VOICE and COUNTS rules are the reason the file exists and must travel with it). Then make exactly one addition — locked ruling 5 — inside the `decks` section, immediately after `detailToBuy`:

```ts
    // Price-free unowned clause. Not in the handoff's copy file: Home's resume
    // rows and the phone deck rail draw `99 / 99 · 3 unowned` with no cost,
    // and detailToBuy always carries one. Added under plan ruling 5.
    detailUnowned: (n: number) => `${n} unowned`,
```

Change nothing else. The file already ends `} as const;`.

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { refreshCopy } from "./refresh";

describe("refreshCopy", () => {
  it("prints every count with its denominator, never a percentage", () => {
    expect(refreshCopy.home.fit(74, 100)).toBe("74 /100 fit");
    expect(refreshCopy.home.fit(32, 40)).toBe("32 /40 fit");
    expect(refreshCopy.home.inUseValue("312", "1,284")).toBe("312 of 1,284");
    expect(refreshCopy.decks.shown(3, 6)).toBe("3 of 6");
    expect(refreshCopy.filters.sheetMatch(3, 6)).toBe("3 of 6 match");
  });

  it("has one label per shipped status and no more", () => {
    expect(Object.values(refreshCopy.status)).toEqual([
      "Draft", "Building", "Over", "Unresolved", "To buy", "Complete",
    ]);
  });

  it("singularises the counted strings at one", () => {
    expect(refreshCopy.decks.detailUnresolved(1)).toBe("1 line unresolved");
    expect(refreshCopy.decks.detailUnresolved(2)).toBe("2 lines unresolved");
    expect(refreshCopy.home.overCommittedValue(1)).toBe("1 card");
    expect(refreshCopy.home.overCommittedValue(3)).toBe("3 cards");
    expect(refreshCopy.filters.someOn(1)).toBe("1 status on");
    expect(refreshCopy.filters.someOn(4)).toBe("4 statuses on");
    expect(refreshCopy.filters.sheetDismiss(1)).toBe("Show 1 deck");
    expect(refreshCopy.filters.sheetDismiss(3)).toBe("Show 3 decks");
  });

  it("carries the price-free unowned clause added under ruling 5", () => {
    expect(refreshCopy.decks.detailUnowned(3)).toBe("3 unowned");
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm test src/lib/copy/refresh.test.ts`
Expected: PASS. If it fails, the copy file was edited rather than copied — restore it from the handoff and re-apply only the ruling-5 addition.

- [ ] **Step 4: Commit**

```bash
git add src/lib/copy/refresh.ts src/lib/copy/refresh.test.ts
git commit -m "feat(copy): add the refresh copy module for Home and Decks"
```

---

## Task 2: The ready-to-build slice

**Files:**
- Create: `src/lib/recs/ready-to-build.ts`
- Test: `src/lib/recs/ready-to-build.test.ts`

**Interfaces:**
- Consumes: nothing. It is generic over `{ rankScore: number }`, which both `CommanderScore`
  (`src/lib/recs/score.ts:59`) and — after this task's step 0 — `CommanderListItem` satisfy.
- Produces:
  - `export const READY_COUNT = 9`
  - `export const READY_SHOWN = 2`
  - `export type ReadySlice<T> = { shown: T[]; moreCount: number; floor: number | null }`
  - `export function readySlice<T extends { rankScore: number }>(items: readonly T[]): ReadySlice<T>`

This is the carrier for locked rulings 1 and 2. It is pure — no database, no React — so it is the one part of the ready-to-build rule that gets real tests. Task 15 (Home) and Task 13 (zero decks) both read it.

**Step 0, before the test: widen `CommanderListItem` by one field.** `readySlice` ranks by
`rankScore`, the 0-100 normalisation of `score / measurableTotal`, and that is the only figure in
the codebase that is comparable across commanders with different denominators — which is exactly
what "top 9" and "scored 70 or better" require. `RankedCommander` has it (`score.ts:59`) and
`commander_scores.rank_score` is already selected by `loadScores` (`store.ts:170`) and already the
`ORDER BY` (`store.ts:187`); it is simply not in the `Pick`. Three one-line edits:

```ts
// src/lib/recs/recommend.ts:36-52 — add to the Pick list, after "score"
  | "rankScore"

// src/lib/recs/recommend.ts, inside toListItem
    rankScore: r.rankScore,

// src/lib/recs/store.ts, inside rowToListItem
    rankScore: row.rankScore,
```

Do **not** derive `rankScore` at the hero from `score / measurableTotal`. It is persisted, it is
what the list is already ordered by, and a second derivation is a second definition.

`readySlice` therefore takes the items in the order `getRankedList` returns them and does not
depend on that order being right — the defensive sort below is cheap over 9 of a few hundred and
means the floor cannot silently be some middle commander's score.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { readySlice, READY_COUNT, READY_SHOWN } from "./ready-to-build";

const list = (...scores: number[]) => scores.map((rankScore, i) => ({ rankScore, id: `c${i}` }));

describe("readySlice", () => {
  it("shows two and counts the rest of the top nine, with the ninth as the floor", () => {
    // 74, 71, then seven more down to 70 — the drawn frame.
    const slice = readySlice(list(74, 71, 71, 70, 70, 70, 70, 70, 70, 68, 41));
    expect(slice.shown.map((c) => c.rankScore)).toEqual([74, 71]);
    expect(slice.moreCount).toBe(READY_COUNT - READY_SHOWN);
    expect(slice.moreCount).toBe(7);
    expect(slice.floor).toBe(70);
  });

  it("never reaches past the top nine, however long the list", () => {
    const slice = readySlice(list(...Array.from({ length: 400 }, (_, i) => 100 - i)));
    expect(slice.moreCount).toBe(7);
    expect(slice.floor).toBe(100 - (READY_COUNT - 1));
  });

  it("truncates the set when fewer than nine commanders are ranked", () => {
    const slice = readySlice(list(80, 60, 50, 40));
    expect(slice.shown).toHaveLength(2);
    expect(slice.moreCount).toBe(2);
    expect(slice.floor).toBe(40);
  });

  it("omits the more-above line when nothing sits behind the two shown", () => {
    const slice = readySlice(list(80, 60));
    expect(slice.moreCount).toBe(0);
    expect(slice.floor).toBe(60);
  });

  it("shows the one it has, and no floor at all, when the list is empty", () => {
    expect(readySlice(list(80)).shown).toHaveLength(1);
    expect(readySlice(list()).shown).toEqual([]);
    expect(readySlice(list()).floor).toBeNull();
    expect(readySlice(list()).moreCount).toBe(0);
  });

  it("orders by rankScore even when the caller does not", () => {
    const slice = readySlice(list(41, 74, 68, 71));
    expect(slice.shown.map((c) => c.rankScore)).toEqual([74, 71]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/recs/ready-to-build.test.ts`
Expected: FAIL — `Failed to resolve import "./ready-to-build"`.

- [ ] **Step 3: Write the implementation**

```ts
// The Ready-to-build set — plan ruling 1.
//
// Design's READINESS blocks a green on "a threshold nobody has set". There is
// one, and it predates the refresh: the headline this section replaces read
// "Nine commanders you can build now". So the set is a RANK cut, not a score
// cut, and the drawn frame falls straight out of it — two cards at 74 and 71,
// then `7 more scored 70 or better`, where 70 is the ninth commander's score.
//
// A score cut would need a threshold, and this app has deliberately never had
// one (see src/components/home/commander-count.tsx). Do not add one here.

/** How many commanders are "ready to build". Nine, since the first Home. */
export const READY_COUNT = 9;

/** How many of them get a card. The rest are the `N more` line. */
export const READY_SHOWN = 2;

export type ReadySlice<T> = {
  shown: T[];
  /** Commanders in the set behind the shown ones. 0 means: print no line. */
  moreCount: number;
  /**
   * The lowest rankScore IN THE SET — never a rounder number, per the copy
   * file. Null only when the set is empty, where there is no line to print.
   */
  floor: number | null;
};

export function readySlice<T extends { rankScore: number }>(
  items: readonly T[],
): ReadySlice<T> {
  // Sorted here rather than trusted from the caller: getRankedList orders by
  // rankScore today, and a floor taken from an unsorted list would be some
  // arbitrary ninth element rather than the smallest of the nine.
  const set = [...items].sort((a, b) => b.rankScore - a.rankScore).slice(0, READY_COUNT);
  return {
    shown: set.slice(0, READY_SHOWN),
    moreCount: Math.max(0, set.length - READY_SHOWN),
    floor: set.length === 0 ? null : set[set.length - 1].rankScore,
  };
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/lib/recs/ready-to-build.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/ready-to-build.ts src/lib/recs/ready-to-build.test.ts
git commit -m "feat(recs): settle the ready-to-build set at the top nine"
```

---

## Task 3: Relative dates

**Files:**
- Create: `src/lib/format/when.ts`
- Test: `src/lib/format/when.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function formatWhen(then: Date, now: Date): string`.

Three surfaces need it and none exists: Home's kicker (`read 2 days ago`), the deck tile's detail row (`2 days ago`, `last week`, `3 weeks ago`) and the Draft tile (`created today`). `now` is a parameter, never `new Date()` inside — a function that reads the clock cannot be tested and drifts between the server render and the client hydration.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { formatWhen } from "./when";

const now = new Date("2026-09-07T12:00:00Z");
const daysBefore = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("formatWhen", () => {
  it("names the day for the first two days", () => {
    expect(formatWhen(daysBefore(0), now)).toBe("today");
    expect(formatWhen(daysBefore(1), now)).toBe("yesterday");
  });

  it("counts days up to the end of the first week", () => {
    expect(formatWhen(daysBefore(2), now)).toBe("2 days ago");
    expect(formatWhen(daysBefore(6), now)).toBe("6 days ago");
  });

  it("says last week rather than 7 days ago", () => {
    expect(formatWhen(daysBefore(7), now)).toBe("last week");
    expect(formatWhen(daysBefore(13), now)).toBe("last week");
  });

  it("counts whole weeks up to two months", () => {
    expect(formatWhen(daysBefore(21), now)).toBe("3 weeks ago");
    expect(formatWhen(daysBefore(56), now)).toBe("8 weeks ago");
  });

  it("counts months beyond that, and years beyond a year", () => {
    expect(formatWhen(daysBefore(70), now)).toBe("2 months ago");
    expect(formatWhen(daysBefore(300), now)).toBe("9 months ago");
    expect(formatWhen(daysBefore(400), now)).toBe("last year");
    expect(formatWhen(daysBefore(900), now)).toBe("2 years ago");
  });

  it("reads a future timestamp as today rather than as a negative count", () => {
    // Clock skew between the database and the renderer is real and small. It
    // must not print "-1 days ago".
    expect(formatWhen(new Date(now.getTime() + 60_000), now)).toBe("today");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/format/when.test.ts`
Expected: FAIL — `Failed to resolve import "./when"`.

- [ ] **Step 3: Write the implementation**

```ts
// Relative dates, in the register the refresh frames draw: `today`,
// `2 days ago`, `last week`, `3 weeks ago`, `2 months ago`.
//
// `now` is a parameter and never `new Date()`. A function that reads the clock
// renders one string on the server and a different one on the client the moment
// a boundary is crossed at midnight, and cannot be tested without faking time.

const DAY_MS = 86_400_000;

/** Whole elapsed days, floored, and never negative — see the clock-skew test. */
function daysBetween(then: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

export function formatWhen(then: Date, now: Date): string {
  const days = daysBetween(then, now);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return plural(Math.floor(days / 7), "week");
  if (days < 365) return plural(Math.floor(days / 30), "month");
  if (days < 730) return "last year";
  return plural(Math.floor(days / 365), "year");
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/lib/format/when.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the gate and open PR A**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add src/lib/format/when.ts src/lib/format/when.test.ts
git commit -m "feat(format): add relative-date formatting for the refresh"
git fetch origin && git rebase origin/main && git push -u origin <branch>
```

Open the PR, request the Copilot review, and run the loop to the merge bar before starting PR B. Tasks 4 onward all import from these three modules.

---

## Task 4: The four nav glyphs

**Files:**
- Create: `src/components/shell/nav-icons.tsx`
- Test: `src/components/shell/nav-icons.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function NavIcon({ href }: { href: NavHref }): ReactElement` and `export type NavHref = "/" | "/collection" | "/commanders" | "/decks"`. One component, one switch — the rail and the tab bar must render the *same* glyph for the same slot (`CHROME-rail-and-tabs.md`: *"Slots must not transpose between the two — this was caught in review once already"*), and one component is the only way to guarantee that.

The handoff specifies the geometry (19px, `currentColor`, 1.5px stroke, round caps) but not the four shapes. **The shapes below are an engineering call** and go into the gap report as one; they are drawn from the same rectilinear-plus-diamond vocabulary as `Crowned99` so they sit with the mark rather than against it.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavIcon } from "./nav-icons";

const HREFS = ["/", "/collection", "/commanders", "/decks"] as const;

describe("NavIcon", () => {
  it("draws every slot at the handoff's geometry", () => {
    for (const href of HREFS) {
      const { container } = render(<NavIcon href={href} />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("width")).toBe("19");
      expect(svg.getAttribute("height")).toBe("19");
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      expect(svg.getAttribute("stroke-width")).toBe("1.5");
      expect(svg.getAttribute("stroke-linecap")).toBe("round");
      // The label lives on the interactive element, not on the glyph.
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("gives each slot a distinct glyph", () => {
    const paths = HREFS.map((href) => {
      const { container } = render(<NavIcon href={href} />);
      return container.querySelector("svg")!.innerHTML;
    });
    expect(new Set(paths).size).toBe(HREFS.length);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/components/shell/nav-icons.test.tsx`
Expected: FAIL — `Failed to resolve import "./nav-icons"`.

- [ ] **Step 3: Write the implementation**

```tsx
// The four rail/tab glyphs — 19px, currentColor, 1.5px, round caps
// (design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md §The rail).
//
// ONE component for both chromes. The handoff calls out that the slots must not
// transpose between the rail and the tab bar, and that was caught in review
// once already; two icon sets is the only way for it to happen again.
//
// The shapes are an engineering call — the handoff fixes the geometry and not
// the drawing. They stay rectilinear with one rotated square, so they read as
// siblings of the app mark rather than as a borrowed icon set.

export type NavHref = "/" | "/collection" | "/commanders" | "/decks";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function NavIcon({ href }: { href: NavHref }) {
  switch (href) {
    // Home — a roof over a threshold.
    case "/":
      return (
        <Svg>
          <path d="M2.75 8.25 9.5 3l6.75 5.25V15a1.25 1.25 0 0 1-1.25 1.25h-11A1.25 1.25 0 0 1 2.75 15Z" />
          <path d="M7.75 16.25v-4.5h3.5v4.5" />
        </Svg>
      );
    // Collection — two cards, one behind the other.
    case "/collection":
      return (
        <Svg>
          <rect x="6.5" y="3.25" width="9.75" height="12.5" rx="1.5" />
          <path d="M12.5 16.75H4.25A1.5 1.5 0 0 1 2.75 15.25V6.5" />
        </Svg>
      );
    // Commanders — the app's rotated square, crowned by the same two ticks the
    // wordmark uses.
    case "/commanders":
      return (
        <Svg>
          <path d="M9.5 6.75 13 10.25 9.5 13.75 6 10.25Z" />
          <path d="M4.75 4.25 6.5 2.5M14.25 4.25 12.5 2.5M4 16.5h11" />
        </Svg>
      );
    // Decks — a stack of three.
    case "/decks":
      return (
        <Svg>
          <rect x="2.75" y="3.25" width="13.5" height="7" rx="1.5" />
          <path d="M4.25 12.75h10.5M5.75 15.75h7" />
        </Svg>
      );
  }
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/components/shell/nav-icons.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/nav-icons.tsx src/components/shell/nav-icons.test.tsx
git commit -m "feat(shell): add the four 19px nav glyphs"
```

---

## Task 5: The 62px icon rail, the 52px tab bar, and the bone primary

**Files:**
- Modify: `src/components/shell/nav.tsx` (whole file — `NavItem`, `ITEMS`, `RailDiamond`, `TabDiamond`, `NavRail`, `TabBar`)
- Modify: `src/components/ui/button.tsx` (the `PRIMARY` constant only)
- Test: `src/components/shell/nav.test.tsx` (create if absent; extend if present)
- Check for callers first: `grep -rn "w-\[236px\]\|NavRail\|TabBar" src/`

**Interfaces:**
- Consumes: `NavIcon`, `NavHref` from Task 4; `refreshCopy.firstRun.lockedItemAria` from Task 1.
- Produces: no signature change — `NavRail({ locked, theme })` and `TabBar({ locked })` keep their props.

This is the whole of PR B's visible change, and it is where **finding 1** is discharged.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavRail, TabBar } from "./nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/decks" }));
vi.mock("./account-menu", () => ({ AccountMenu: () => <div data-testid="account" /> }));

const LABELS = ["Home", "Collection", "Commanders", "Decks"];

describe("NavRail", () => {
  it("is icon-only, so every item carries its label as an accessible name and a tooltip", () => {
    render(<NavRail locked={false} theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of LABELS) {
      const item = within(nav).getByRole("link", { name: label });
      expect(item).toHaveAttribute("title", label);
      // Icon-only: the label must NOT also sit in the row as visible text, or
      // the 62px rail overflows.
      expect(item).not.toHaveTextContent(label);
    }
  });

  it("carries the app mark once, not once per row", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    expect(container.querySelectorAll("[data-nav-diamond]")).toHaveLength(1);
  });

  it("states the reason a locked item is locked, in its accessible name", () => {
    render(<NavRail locked theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).getByRole("link", { name: "Decks — unlocks once a collection is read" }),
    ).toHaveAttribute("aria-disabled", "true");
    // Home is never lockable.
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("TabBar", () => {
  it("keeps its visible labels — the phone bar has room and the rail does not", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of LABELS) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the same four slots in the same order as the rail", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/collection", "/commanders", "/decks"]);
  });

  it("states the unlock reason on locked tabs too", () => {
    render(<TabBar locked />);
    expect(
      screen.getByRole("link", { name: "Collection — unlocks once a collection is read" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/components/shell/nav.test.tsx`
Expected: FAIL — the rail still renders visible labels and no `title`, and there is no `data-nav-diamond`.

- [ ] **Step 3: Retire the adjudication**

Replace the comment at `src/components/shell/nav.tsx:20` — do **not** simply delete it. The record of the reversal is the point.

```ts
// Adjudication #1 (no <Mark> icons in rail nav items — Diamond + label ONLY) was
// RETIRED by the 2026-09-07 refresh, on client instruction. The reason it
// existed still holds where it was made: the Mark inside a nav row was a second
// logo. A 19px stroke glyph is not the Mark, and at 62px the rail has no room
// for labels — so the labels moved into aria-label + title instead of coming
// out. See design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md.
// If the ruling is ever reinstated, the rail widens to hold labels and the
// icons come out. A 62px rail with labels is not a third option.
```

- [ ] **Step 4: Rewrite the rail**

`NavRail`'s `<aside>` goes from `w-[236px]` to `w-[62px]`, and `borderRight` from `--border-strong` to `--border`. Delete `RailDiamond` entirely and render the mark once, above the nav:

```tsx
      {/* The app mark — 26px, rotated 45°, 1.5px --accent. Once, at the top:
          it is the mark, not a nav item (CHROME §The rail). */}
      <div className="flex justify-center pt-4 pb-4">
        <span
          data-nav-diamond
          aria-hidden
          className="block h-[26px] w-[26px] rotate-45"
          style={{ border: "1.5px solid var(--accent)" }}
        />
      </div>
```

Each item becomes a 38px square with a 10px radius and a 4px gap, icon-only:

```tsx
      <nav className="flex flex-col items-center gap-1 px-3" aria-label="Primary">
        {ITEMS.map(({ href, label, lockable }) => {
          const isLocked = locked && lockable;
          const active = !isLocked && isActive(pathname, href);
          const name = isLocked ? refreshCopy.firstRun.lockedItemAria(label) : label;
          return (
            <Link
              key={href}
              href={isLocked ? "#" : href}
              title={name}
              aria-label={name}
              aria-current={active ? "page" : undefined}
              aria-disabled={isLocked ? "true" : undefined}
              onClick={isLocked ? (e) => e.preventDefault() : undefined}
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-[10px] transition-colors ${
                active ? "bg-elevated" : "bg-transparent"
              } ${isLocked ? "cursor-default" : "hover:bg-elevated-hover"}`}
              style={{ color: active ? "var(--fg)" : "var(--fg-faint)" }}
            >
              <NavIcon href={href} />
            </Link>
          );
        })}
      </nav>
```

The `Play` group label goes — a 62px rail has no room for it, and it labelled a group of four that is now the whole nav. The `railLockedCaption` paragraph goes with it; the reason each item is locked now rides in that item's own accessible name, which is strictly better than a caption a screen reader meets after the fact. Under the fourth item, when `locked`, add the divider and the single padlock:

```tsx
        {locked && (
          <>
            <span className="mt-2 block h-px w-[34px]" style={{ background: "var(--border)" }} />
            <LockGlyph />
          </>
        )}
```

`LockGlyph` is a local 14×16 `aria-hidden` SVG at `--fg-faint` — decorative, because every locked item already says why in words.

- [ ] **Step 5: Rewrite the tab bar**

`TabBar` keeps its four items, its `flex-1`, its labels and its `--tabbar-h` container, and changes three things: the diamond becomes `<NavIcon href={href} />`, each item gets `h-[52px] rounded-[12px]` with the active fill at `--surface-inset` (not an accent-coloured label — locked ruling 13 reserves colour for status), and the locked branch becomes a `<Link>` with `aria-disabled` and the same `lockedItemAria` name as the rail. Label stays 9px mono at `0.06em`:

```tsx
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.06em",
                color: active ? "var(--fg)" : "var(--fg-faint)",
              }}
            >
              {label}
            </span>
```

Delete `TabDiamond`.

- [ ] **Step 6: Run the tests**

Run: `pnpm test src/components/shell/nav.test.tsx`
Expected: PASS.

- [ ] **Step 7: Fix the layout the rail width broke**

Run `grep -rn "236" src/app src/components` and correct every place that reserved the old rail width — a page padded to clear a 236px rail will now have a 174px gutter. Then run the whole suite: `pnpm test`.

- [ ] **Step 8: Verify both viewports in a browser**

`pnpm dev`, sign in with the local Clerk fixture, and check: desktop rail at 62px with tooltips on hover and the mark once at the top; phone at 390px with four labelled tabs; the first-run lock state on both (a fixture account with no collection). Confirm the rail and the tab bar show the same glyph in the same slot.

- [ ] **Step 9: Run the gate and open PR B**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add src/components/shell/nav.tsx src/components/shell/nav.test.tsx
git commit -m "feat(shell): give the rail icons and retire adjudication #1"
```

Run the design-review skill before `gh pr create`. The PR body must say, in its own paragraph, that it retires adjudication #1 and why — Design asked specifically that Engineering not discover the reversal as a silent contradiction.

---

### The bone primary — one constant, whole app

Locked ruling 14 says the single filled button on a screen is bone (`--fg` on `--bg`), never
accent, because accent means *in use / to buy*. `src/components/ui/button.tsx:28-30` fills
`PrimaryButton` with `--accent` today, and **every** surface in the app renders through it.

**This lands here, in the chrome PR, not in the conformance PR.** It is app-wide chrome by the same
argument the rail is, and the four un-redesigned surfaces are meant to inherit it — the handoff's
conformance table says Card detail's only change is *"inherited button and field styles"*. Flipping
it in Task 19 instead would mean Tasks 9–18 ship accent-filled primaries for the length of two PRs
and then change again, which is two design reviews of the same button.

- [ ] **Step A: Write the failing test**

Extend `src/components/ui/button.test.tsx` (create it if absent):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrimaryButton, GhostButton } from "./button";

describe("PrimaryButton", () => {
  it("fills with bone, never accent — accent means in use", () => {
    render(<PrimaryButton>Start this deck</PrimaryButton>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("bg-[color:var(--fg)]");
    expect(cls).toContain("text-[color:var(--bg)]");
    expect(cls).not.toContain("var(--accent)");
  });

  it("keeps its hover paired with a disabled override", () => {
    render(<PrimaryButton disabled>Start this deck</PrimaryButton>);
    expect(screen.getByRole("button").className).toContain("disabled:hover:");
  });
});

describe("GhostButton", () => {
  it("still hairlines on border-strong", () => {
    render(<GhostButton>See the pool</GhostButton>);
    expect(screen.getByRole("button").className).toContain("var(--border-strong)");
  });
});
```

- [ ] **Step B: Run it and watch it fail**

Run: `pnpm test src/components/ui/button.test.tsx`
Expected: FAIL on the fill — the class is `bg-[color:var(--accent)]`.

- [ ] **Step C: Flip the constant**

```tsx
const PRIMARY =
  "bg-[color:var(--fg)] text-[color:var(--bg)] hover:bg-[color:var(--fg-body)] " +
  "disabled:hover:bg-[color:var(--fg)]";
```

`--fg-body` is the hover because it is the only token that is a step *off* bone in the same family
across all six themes; `--accent-hover` would put accent back on the button by the side door. Leave
`BASE`, `GHOST`, the style ban and both cursor utilities untouched — the header comment above them
explains why the primitive owns nine properties and no more, and this changes two of those nine,
not the contract.

- [ ] **Step D: Run the button suite and then the whole suite**

Run: `pnpm test src/components/ui/button.test.tsx && pnpm test`
Expected: button PASS. **Some other suite may fail** — anything asserting the accent fill by class
name. Fix each by asserting what that surface actually wants; do not reintroduce the accent fill to
keep an old assertion green. Note every file you touched: they are the surfaces whose screenshots
change, and the design review needs the list.

- [ ] **Step E: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/button.test.tsx
git commit -m "refactor(ui): fill the primary with bone so accent can mean in use"
```

---

## Task 6: Last played, and the three sort orders

**Files:**
- Modify: `src/lib/decks/read.ts` (`DeckListItem`, `listDecksWithStats`)
- Create: `src/lib/decks/sort.ts`
- Test: `src/lib/decks/sort.test.ts`
- Callers to update: `src/app/decks/page.tsx`, plus whatever `grep -rn "listDecksWithStats" src/` returns.

**Interfaces:**
- Consumes: `deckGames` from `src/db/schema.ts`.
- Produces:
  - `DeckListItem` gains `lastPlayedAt: Date | null`.
  - `listDecksWithStats(userId: string, sort?: DeckSort): Promise<DeckListItem[]>`.
  - `src/lib/decks/sort.ts`: `export type DeckSort = "lastPlayed" | "name" | "newest"`, `export const DEFAULT_DECK_SORT: DeckSort = "lastPlayed"`, `export const DECK_SORT_LABELS: Record<DeckSort, string>`, `export function parseDeckSort(raw: string | null | undefined): DeckSort`, `export function serializeDeckSort(sort: DeckSort): string | undefined`.

This closes **finding 5** and implements **locked ruling 7**. The query itself gets no unit test — the repo's untested-query pattern (documented in `src/lib/home/summary.ts`) is that shape-shifting SQL is proved by the type checker and the browser, and pure logic is proved by Vitest. `parseDeckSort` is the pure logic.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  DECK_SORT_LABELS,
  DEFAULT_DECK_SORT,
  parseDeckSort,
  serializeDeckSort,
} from "./sort";

describe("deck sort", () => {
  it("defaults to last played", () => {
    expect(DEFAULT_DECK_SORT).toBe("lastPlayed");
    expect(parseDeckSort(undefined)).toBe("lastPlayed");
  });

  it("reads the two non-default orders off the URL", () => {
    expect(parseDeckSort("name")).toBe("name");
    expect(parseDeckSort("newest")).toBe("newest");
  });

  it("falls back to the default rather than throwing on junk", () => {
    expect(parseDeckSort("")).toBe("lastPlayed");
    expect(parseDeckSort("popularity")).toBe("lastPlayed");
    expect(parseDeckSort("__proto__")).toBe("lastPlayed");
  });

  it("serialises the default as an absence, so the clean URL is the clean state", () => {
    expect(serializeDeckSort("lastPlayed")).toBeUndefined();
    expect(serializeDeckSort("name")).toBe("name");
  });

  it("labels every order in the register the trigger prints", () => {
    // `Sort · last played` — the trigger lowercases nothing itself.
    expect(DECK_SORT_LABELS).toEqual({
      lastPlayed: "last played",
      name: "name",
      newest: "newest",
    });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/decks/sort.test.ts`
Expected: FAIL — `Failed to resolve import "./sort"`.

- [ ] **Step 3: Write `src/lib/decks/sort.ts`**

```ts
// The three deck orders — plan ruling 7. The handoff draws only the default
// (`Sort · last played`) and names no others; these three are the engineering
// call, and the gap report records them as one.

export type DeckSort = "lastPlayed" | "name" | "newest";

export const DEFAULT_DECK_SORT: DeckSort = "lastPlayed";

/** The word the `Sort · …` trigger prints. Lowercase, as drawn. */
export const DECK_SORT_LABELS: Record<DeckSort, string> = {
  lastPlayed: "last played",
  name: "name",
  newest: "newest",
};

/**
 * Own-property lookup against the label map rather than a bare `in`: a raw of
 * `"__proto__"` or `"toString"` reaches the Object prototype and would otherwise
 * be accepted as a sort key.
 */
export function parseDeckSort(raw: string | null | undefined): DeckSort {
  return raw != null && Object.hasOwn(DECK_SORT_LABELS, raw)
    ? (raw as DeckSort)
    : DEFAULT_DECK_SORT;
}

/** The default serialises as an absence, so the clean URL is the clean state. */
export function serializeDeckSort(sort: DeckSort): string | undefined {
  return sort === DEFAULT_DECK_SORT ? undefined : sort;
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/lib/decks/sort.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `lastPlayedAt` to the query**

In `src/lib/decks/read.ts`, add the field to `DeckListItem`:

```ts
  /**
   * The most recent game logged against this deck, or null when none is. Drawn
   * on the right of every tile's detail row; `never played` is the null case,
   * and it is a real state, not a missing figure.
   */
  lastPlayedAt: Date | null;
```

Add the aggregate as a scalar subquery, for the same reason the file already gives for `unresolvedCount` — joining a second child table and grouping would multiply rows against `deck_cards` and inflate `built`:

```ts
  const lastPlayedSql = sql<Date | null>`(
    select max(dg.played_at)
    from ${deckGames} dg
    where dg.deck_id = ${decks.id}
  )`;
```

Select it as `lastPlayedAt: lastPlayedSql`, and carry it through the `rows.map` result object.

- [ ] **Step 6: Add the sort parameter**

Give `listDecksWithStats` a second parameter and replace the fixed `orderBy`:

```ts
export async function listDecksWithStats(
  userId: string,
  sort: DeckSort = DEFAULT_DECK_SORT,
): Promise<DeckListItem[]> {
```

```ts
  // `lower()` rather than the bare column: the ordering a player sees must not
  // depend on the database's collation. The id is the tiebreak in every order,
  // not decoration — deck names are not unique, and two decks sharing one would
  // otherwise swap places between requests.
  const byName = [asc(sql`lower(${decks.name})`), asc(decks.id)];
  const order =
    sort === "name" ? byName
    : sort === "newest" ? [desc(decks.createdAt), asc(decks.id)]
    // NULLS LAST is explicit: Postgres sorts nulls FIRST under DESC, which would
    // put every never-played deck at the top of "last played".
    : [sql`${lastPlayedSql} desc nulls last`, ...byName];
```

…and pass `.orderBy(...order)`. Import `desc` alongside `asc` from `drizzle-orm`, and `deckGames` from the schema.

- [ ] **Step 7: Typecheck and fix the callers**

Run: `pnpm typecheck`
Every `listDecksWithStats` caller still compiles (the parameter is optional), but any object literal building a `DeckListItem` by hand — test fixtures included — now fails on the missing `lastPlayedAt`. Fix each by adding the field explicitly; do not make it optional to dodge the error, because `never played` is a state the tile must render and an absent field would silently render nothing.

- [ ] **Step 8: Commit**

```bash
git add src/lib/decks/read.ts src/lib/decks/sort.ts src/lib/decks/sort.test.ts
git commit -m "feat(decks): carry last played, and give the list three orders"
```

---

## Task 7: The shopping roll-up

**Files:**
- Create: `src/lib/decks/shopping-rollup.ts`
- Test: `src/lib/decks/shopping-rollup.test.ts`

**Name check:** `src/lib/decks/shopping.ts` already exists and is a different thing — the
deck-detail *Shopping filter* predicate over one loaded decklist. This module is the
list-and-Home roll-up over every deck a user owns, and it queries. Do not merge them, do not
import one from the other; the existing file's header comment explains why its predicate is
deliberately narrow.

**Interfaces:**
- Consumes: `loadPrices` (`src/lib/decks/price-query.ts`), `summarisePrices` / `PricedCard` (`src/lib/decks/price.ts`), `db` and the schema.
- Produces:
  - `export type DeckShopping = { copies: number; cents: number; pricedCopies: number }`
  - `export type ShoppingRollup = { byDeck: Map<string, DeckShopping>; total: DeckShopping }`
  - `export function sumShopping(values: Iterable<DeckShopping>): DeckShopping`
  - `export async function loadShoppingRollup(userId: string): Promise<ShoppingRollup>`

This closes **finding 4** and implements **locked ruling 12**. One query, one price read, both figures — the deck tile's `3 unowned · $18.40` and Commitments' `18 · $94.80` are the same computation at two scopes, and computing them twice is how they come to disagree.

- [ ] **Step 1: Write the failing test**

`sumShopping` is the pure half and gets the test; `loadShoppingRollup` is a shape-shifting query and follows the untested-query pattern.

```ts
import { describe, expect, it } from "vitest";
import { sumShopping } from "./shopping";

describe("sumShopping", () => {
  it("adds copies, cost and the priced denominator independently", () => {
    expect(
      sumShopping([
        { copies: 3, cents: 1840, pricedCopies: 3 },
        { copies: 15, cents: 7640, pricedCopies: 12 },
      ]),
    ).toEqual({ copies: 18, cents: 9480, pricedCopies: 15 });
  });

  it("counts a card wanted by two decks twice — this is a shopping list", () => {
    // Plan ruling 12. Two decks each needing one unowned copy of the same card
    // is two copies to buy, not one.
    const oneEach = { copies: 1, cents: 500, pricedCopies: 1 };
    expect(sumShopping([oneEach, oneEach]).copies).toBe(2);
  });

  it("does not treat an unpriced copy as free", () => {
    // A printing absent from printing_prices has never been stocked; it adds
    // nothing to the cost and still counts as a card to buy.
    expect(sumShopping([{ copies: 4, cents: 900, pricedCopies: 2 }])).toEqual({
      copies: 4,
      cents: 900,
      pricedCopies: 2,
    });
  });

  it("is zero over an empty collection of decks", () => {
    expect(sumShopping([])).toEqual({ copies: 0, cents: 0, pricedCopies: 0 });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/decks/shopping-rollup.test.ts`
Expected: FAIL — `Failed to resolve import "./shopping"`.

- [ ] **Step 3: Write the implementation**

```ts
// The all-decks shopping roll-up.
//
// Two surfaces read this and they must agree: a deck tile's detail row
// (`3 unowned · $18.40`) and Home's Commitments row (`18 · $94.80`). They are
// the same computation at two scopes, so they are one function — computing the
// total separately is how the two come to disagree.
//
// COPIES, NOT DISTINCT CARDS, and deliberately double-counted across decks: a
// card wanted by two decks and owned in zero copies is two copies to buy.
//
// An unpriced copy is NOT free. The feed omits out-of-stock cards rather than
// listing them at zero, so summarisePrices counts them against the denominator
// and not into the total — `pricedCopies` is what makes that visible.

import { and, eq, notExists, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { collectionItems, deckCards, decks } from "../../db/schema";
import { summarisePrices, type PricedCard } from "./price";
import { loadPrices } from "./price-query";

export type DeckShopping = { copies: number; cents: number; pricedCopies: number };

export type ShoppingRollup = {
  byDeck: Map<string, DeckShopping>;
  total: DeckShopping;
};

const EMPTY: DeckShopping = { copies: 0, cents: 0, pricedCopies: 0 };

export function sumShopping(values: Iterable<DeckShopping>): DeckShopping {
  let copies = 0;
  let cents = 0;
  let pricedCopies = 0;
  for (const v of values) {
    copies += v.copies;
    cents += v.cents;
    pricedCopies += v.pricedCopies;
  }
  return { copies, cents, pricedCopies };
}

export async function loadShoppingRollup(userId: string): Promise<ShoppingRollup> {
  // Every deck line whose card the player owns no copy of. `notExists` rather
  // than a left join with a null check: the join would need a distinct, and a
  // distinct over quantities is a bug waiting to be written.
  const rows = await db
    .select({
      deckId: deckCards.deckId,
      oracleId: deckCards.oracleId,
      quantity: deckCards.quantity,
    })
    .from(deckCards)
    .innerJoin(decks, eq(decks.id, deckCards.deckId))
    .where(
      and(
        eq(decks.userId, userId),
        notExists(
          db
            .select({ one: sql`1` })
            .from(collectionItems)
            .where(
              and(
                eq(collectionItems.userId, userId),
                eq(collectionItems.oracleId, deckCards.oracleId),
              ),
            ),
        ),
      ),
    );

  if (rows.length === 0) return { byDeck: new Map(), total: EMPTY };

  const { facts, newestAsOf } = await loadPrices([...new Set(rows.map((r) => r.oracleId))]);

  const perDeck = new Map<string, PricedCard[]>();
  for (const row of rows) {
    const list = perDeck.get(row.deckId) ?? [];
    list.push({ quantity: row.quantity, price: facts.get(row.oracleId) ?? null });
    perDeck.set(row.deckId, list);
  }

  const byDeck = new Map<string, DeckShopping>();
  for (const [deckId, cards] of perDeck) {
    const summary = summarisePrices(cards, newestAsOf);
    byDeck.set(deckId, {
      copies: summary.totalCopies,
      cents: summary.totalCents,
      pricedCopies: summary.pricedCopies,
    });
  }

  return { byDeck, total: sumShopping(byDeck.values()) };
}
```

- [ ] **Step 4: Reconcile the implementation with `loadPrices`' real shape**

`loadPrices` returns a `PriceRead` (`src/lib/decks/price-query.ts:22`). **Read that type before writing the call** and adapt the two destructured names above to whatever it actually exposes — the field names here are the intent, not a promise. The same goes for `notExists`' import path and for whether `collectionItems` keys on `oracleId` (it does, per `listDecksWithStats`' own `ownedCountSql`).

- [ ] **Step 5: Run the test**

Run: `pnpm test src/lib/decks/shopping-rollup.test.ts`
Expected: PASS.

- [ ] **Step 6: Prove the query in a browser, not in a test**

`pnpm dev` against the local fixture account, and add a temporary log of `loadShoppingRollup(userId)` on the decks page. Check three things: a deck whose cards are all owned is absent from `byDeck` (not present with zero); `total.copies` equals the sum of the tiles' `toBuyCount`; and a deck holding a card with no price row still counts that card in `copies` while leaving `cents` alone. Remove the log.

- [ ] **Step 7: Commit**

```bash
git add src/lib/decks/shopping-rollup.ts src/lib/decks/shopping-rollup.test.ts
git commit -m "feat(decks): roll up unowned copies and their cost across all decks"
```

---

## Task 8: Home's reads

**Files:**
- Modify: `src/lib/home/summary.ts`
- Test: `src/lib/home/commitments.test.ts`
- Create: `src/lib/home/commitments.ts`

**Interfaces:**
- Consumes: `loadAvailability` (`src/lib/decks/availability-query.ts`), `availabilityState` / `Availability` (`src/lib/decks/availability.ts`).
- Produces: `export type Commitments = { inUse: number; overCommitted: number }` and `export function commitmentFigures(availability: Iterable<Availability>): Commitments`.

This is **locked ruling 11**. Both figures come from the one whole-user `loadAvailability` call that `src/app/collection/page.tsx:55` already demonstrates — no new query.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { commitmentFigures } from "./commitments";
import type { Availability } from "../decks/availability";

const card = (a: Partial<Availability>): Availability => ({
  owned: 1, hard: 0, soft: 0, free: 1, claims: [], ...a,
});

describe("commitmentFigures", () => {
  it("counts copies claimed by finished decks, not cards", () => {
    // Two cards, one holding four hard copies — `Cards in use` is a copy count,
    // because its denominator is the collection's total copies.
    expect(
      commitmentFigures([card({ owned: 4, hard: 4, free: 0 }), card({ owned: 2, hard: 1, free: 1 })])
        .inUse,
    ).toBe(5);
  });

  it("ignores soft claims — a brew has not spoken for anything yet", () => {
    expect(commitmentFigures([card({ owned: 3, hard: 0, soft: 3, free: 3 })]).inUse).toBe(0);
  });

  it("counts every card whose finished decks want more copies than exist", () => {
    expect(
      commitmentFigures([
        card({ owned: 1, hard: 2, free: -1 }),
        card({ owned: 4, hard: 4, free: 0 }),
        card({ owned: 2, hard: 3, free: -1 }),
      ]).overCommitted,
    ).toBe(2);
  });

  it("counts cards, not copies, for the over-committed figure", () => {
    // The copy reads `3 cards`, so one card short by five copies is still one.
    expect(commitmentFigures([card({ owned: 1, hard: 6, free: -5 })]).overCommitted).toBe(1);
  });

  it("is zero over an empty collection", () => {
    expect(commitmentFigures([])).toEqual({ inUse: 0, overCommitted: 0 });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/home/commitments.test.ts`
Expected: FAIL — `Failed to resolve import "./commitments"`.

- [ ] **Step 3: Write the implementation**

```ts
// Home's Commitments card — plan ruling 11.
//
// Both figures come from one whole-user loadAvailability, with no
// `excludeDeckId`: this is the collection's vantage, not a deck's. Nothing here
// runs a query of its own, so the numbers cannot drift from the ones the
// collection page and card detail already print.

import { availabilityState, type Availability } from "../decks/availability";

export type Commitments = {
  /** Copies claimed by finished decks. A COPY count — its denominator is the
      collection's total copies (`312 of 1,284`). */
  inUse: number;
  /** Cards whose finished decks want more copies than exist. A CARD count — the
      copy reads `3 cards`, and one card short by five copies is still one. */
  overCommitted: number;
};

export function commitmentFigures(availability: Iterable<Availability>): Commitments {
  let inUse = 0;
  let overCommitted = 0;
  for (const a of availability) {
    // Capped at what the player actually holds: `hard` is what finished decks
    // asked for, and `inUseValue` prints it as `n of <total owned copies>`.
    inUse += Math.min(a.hard, a.owned);
    if (availabilityState(a) === "over") overCommitted += 1;
  }
  return { inUse, overCommitted };
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/lib/home/commitments.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm `getCollectionLastUpdated` is fit for the kicker**

`src/lib/home/summary.ts:25` already exports `getCollectionLastUpdated(userId): Promise<Date | null>` and nothing calls it. Read it, confirm it returns the timestamp of the most recent collection read, and leave it alone — Task 14 wires it to `refreshCopy.home.kicker` through `formatWhen`. If it returns something else (a row's `createdAt` rather than the read's), fix it here with a note, not in the UI task.

- [ ] **Step 6: Run the gate and open PR C**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add src/lib/home/commitments.ts src/lib/home/commitments.test.ts src/lib/home/summary.ts
git commit -m "feat(home): derive the commitments figures from availability"
git fetch origin && git rebase origin/main && git push
```

PR C changes no pixels, so it needs no design review — but it does need the Copilot loop, because it is the layer every figure on both surfaces is read from.

---

## Task 9: One status, six ways

**Files:**
- Create: `src/lib/decks/status-style.ts`
- Create: `src/components/decks/status-pill.tsx`
- Test: `src/lib/decks/status-style.test.ts`, `src/components/decks/status-pill.test.tsx`

**Interfaces:**
- Consumes: `StatusPill` (the type) from `src/lib/decks/status.ts`.
- Produces:
  - `export const STATUS_TOKEN: Record<StatusPill, string>` — the CSS variable name per value.
  - `export function statusPillStyle(status: StatusPill): CSSProperties`
  - `export function statusBarStyle(status: StatusPill, built: number): CSSProperties`
  - `export function statusKeylineStyle(status: StatusPill): CSSProperties`
  - `<StatusPillBadge status={...} />` — the 22px pill.

**Locked ruling 13 lives here and nowhere else.** Six values, one rule: pill fill is the status colour at `2E` alpha, border at `80` alpha, label at full. Every surface in this feature imports these three functions; **no component writes a status colour itself**, and no hex from `tokens.r6.json` appears anywhere.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { STATUS_TOKEN, statusBarStyle, statusPillStyle } from "./status-style";
import type { StatusPill } from "./status";

const ALL: StatusPill[] = ["Draft", "Building", "Over", "Unresolved", "To buy", "Complete"];

describe("status style", () => {
  it("maps every shipped status to a token, and no status to a hex", () => {
    expect(Object.keys(STATUS_TOKEN).sort()).toEqual([...ALL].sort());
    for (const token of Object.values(STATUS_TOKEN)) {
      expect(token).toMatch(/^--[a-z-]+$/);
    }
    expect(STATUS_TOKEN).toEqual({
      Draft: "--fg-faint",
      Building: "--fg-body",
      Over: "--danger",
      Unresolved: "--warning",
      "To buy": "--accent",
      Complete: "--success",
    });
  });

  it("builds every pill from one rule — 2E fill, 80 border, full-strength label", () => {
    for (const status of ALL) {
      const style = statusPillStyle(status);
      const token = STATUS_TOKEN[status];
      expect(JSON.stringify(style)).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(style.color).toBe(`var(${token})`);
      expect(String(style.background)).toContain(token);
      expect(String(style.border)).toContain(token);
    }
  });

  it("fills the bar proportionally while building and completely at or past 99", () => {
    expect(statusBarStyle("Draft", 0).width).toBe("0%");
    expect(statusBarStyle("Building", 87).width).toBe(`${(87 / 99) * 100}%`);
    expect(statusBarStyle("Complete", 99).width).toBe("100%");
    expect(statusBarStyle("To buy", 99).width).toBe("100%");
    expect(statusBarStyle("Unresolved", 99).width).toBe("100%");
    // Over is full, not 105% — the track cannot overflow its own container.
    expect(statusBarStyle("Over", 104).width).toBe("100%");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/decks/status-style.test.ts`
Expected: FAIL — `Failed to resolve import "./status-style"`.

- [ ] **Step 3: Write `src/lib/decks/status-style.ts`**

```ts
// Colour is status, and status only (refresh README decision 3). Six values,
// one rule — the pill is the status colour at 2E alpha on an 80 alpha border
// with the colour as its label. Written once, here, so a theme change is a
// token change and never a component change.
//
// NO HEX. Not from tokens.r6.json, not "just for Canopy". The alpha rides as a
// hex suffix on the token through color-mix, which every supported browser has.

import type { CSSProperties } from "react";
import { MATURE_DECK_SIZE } from "./availability";
import type { StatusPill } from "./status";

export const STATUS_TOKEN: Record<StatusPill, string> = {
  Draft: "--fg-faint",
  Building: "--fg-body",
  Over: "--danger",
  Unresolved: "--warning",
  "To buy": "--accent",
  Complete: "--success",
};

/** `2E` and `80` of 255 — the handoff's two alphas, as percentages. */
const FILL_ALPHA = "18%";
const BORDER_ALPHA = "50%";

function mix(token: string, alpha: string): string {
  return `color-mix(in srgb, var(${token}) ${alpha}, transparent)`;
}

export function statusPillStyle(status: StatusPill): CSSProperties {
  const token = STATUS_TOKEN[status];
  return {
    color: `var(${token})`,
    background: mix(token, FILL_ALPHA),
    border: `1px solid ${mix(token, BORDER_ALPHA)}`,
  };
}

/**
 * The 3px progress track's fill. Clamped at 100%: an Over deck is full, not
 * 105% — a bar cannot overflow the track that measures it, and the `5 over`
 * figure in the detail row is where the excess is stated.
 */
export function statusBarStyle(status: StatusPill, built: number): CSSProperties {
  const pct = Math.min(100, Math.max(0, (built / MATURE_DECK_SIZE) * 100));
  return { width: `${pct}%`, background: `var(${STATUS_TOKEN[status]})` };
}

/** The 3px left keyline on Home's list rows. */
export function statusKeylineStyle(status: StatusPill): CSSProperties {
  return { background: `var(${STATUS_TOKEN[status]})` };
}
```

Note: `statusBarStyle("Draft", 0)` yields `0%` from the arithmetic, so Draft needs no special case — the "empty track" in `STATES-deck-statuses.md` is what 0 built already produces.

- [ ] **Step 4: Write the pill component and its test**

```tsx
// src/components/decks/status-pill.tsx
import { statusPillStyle } from "../../lib/decks/status-style";
import type { StatusPill } from "../../lib/decks/status";

/** 22px on a tile, per STATES-deck-statuses.md §2. Mono, 10px, 0.06em. */
export function StatusPillBadge({ status }: { status: StatusPill }) {
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-full px-[9px]"
      style={{
        ...statusPillStyle(status),
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.06em",
      }}
    >
      {status}
    </span>
  );
}
```

```tsx
// src/components/decks/status-pill.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPillBadge } from "./status-pill";

describe("StatusPillBadge", () => {
  it("prints the shipped status word, so the pill and the filter row agree", () => {
    render(<StatusPillBadge status="To buy" />);
    expect(screen.getByText("To buy")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run both tests**

Run: `pnpm test src/lib/decks/status-style.test.ts src/components/decks/status-pill.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/status-style.ts src/lib/decks/status-style.test.ts \
        src/components/decks/status-pill.tsx src/components/decks/status-pill.test.tsx
git commit -m "feat(decks): give the six statuses one token rule"
```

---

## Task 10: The deck tile

**Files:**
- Modify: `src/components/decks/deck-card.tsx` (rewrite)
- Modify: `src/components/decks/deck-card-overflow.tsx` (label and geometry only)
- Test: `src/components/decks/deck-card.test.tsx`

**Interfaces:**
- Consumes: `DeckListItem` + `lastPlayedAt` (Task 6), `DeckShopping` (Task 7), `statusBarStyle` / `StatusPillBadge` (Task 9), `refreshCopy.decks` (Task 1), `formatWhen` (Task 3), `colorLabel` (`src/lib/decks/format.ts`, locked ruling 3).
- Produces: `<DeckCard deck={DeckListItem} shopping={DeckShopping | undefined} now={Date} />`.

`now` is a prop for the same reason `formatWhen` takes it: the page is a server component, it knows the time once, and every tile must agree.

The composition is `STATES-deck-statuses.md` §Card composition, in order: 118px art header · 22px pill top-left · 26px `…` top-right · name over the scrim (display face, 15px, one line, ellipsis) · meta row (9px pips with a `--border-strong` hairline · colour label · count with denominator, right-aligned, tabular) · 3px progress · detail row (the one figure that explains the status · last played, right-aligned).

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckCard } from "./deck-card";
import type { DeckListItem } from "../../lib/decks/read";

vi.mock("./deck-card-overflow", () => ({
  DeckCardOverflow: () => <button type="button">Actions</button>,
}));

const now = new Date("2026-09-07T12:00:00Z");
const daysBefore = (n: number) => new Date(now.getTime() - n * 86_400_000);

const deck = (over: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa, Praetors' Voice",
  createdAt: daysBefore(30),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: "https://example.test/atraxa.jpg",
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  statusPill: "To buy",
  lastPlayedAt: daysBefore(2),
  ...over,
});

describe("DeckCard", () => {
  it("shows the status, the count with its denominator, and the explaining figure", () => {
    render(<DeckCard deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />);
    expect(screen.getByText("To buy")).toBeInTheDocument();
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(screen.getByText("3 unowned · $18.40")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  it("has no call to action — the pill is the message and the tile is the target", () => {
    render(<DeckCard deck={deck()} shopping={undefined} now={now} />);
    // One link (the whole tile) and one button (the overflow). Nothing else.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /open|build|edit/i })).toBeNull();
  });

  it("draws commander art on a Draft tile, because every deck has a commander", () => {
    const { container } = render(
      <DeckCard
        deck={deck({ statusPill: "Draft", built: 0, ownedCount: 0, toBuyCount: 0, lastPlayedAt: null, createdAt: now })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(container.querySelector("[data-deck-art]")).toHaveAttribute(
      "style",
      expect.stringContaining("atraxa.jpg"),
    );
    expect(screen.getByText("0 / 99")).toBeInTheDocument();
    expect(screen.getByText("created today")).toBeInTheDocument();
    expect(screen.queryByText(/no commander/i)).toBeNull();
  });

  it("prints never played rather than leaving the corner blank", () => {
    render(<DeckCard deck={deck({ lastPlayedAt: null })} shopping={undefined} now={now} />);
    expect(screen.getByText("never played")).toBeInTheDocument();
  });

  it("gives each status its own explaining figure", () => {
    const cases: Array<[Partial<DeckListItem>, string]> = [
      [{ statusPill: "Complete", toBuyCount: 0, ownedCount: 99 }, "all owned"],
      [{ statusPill: "Unresolved", unresolvedCount: 2 }, "2 lines unresolved"],
      [{ statusPill: "Unresolved", unresolvedCount: 1 }, "1 line unresolved"],
      [{ statusPill: "Over", built: 104 }, "5 over"],
      [{ statusPill: "Building", built: 87 }, "87 / 99"],
    ];
    for (const [over, text] of cases) {
      const { unmount } = render(<DeckCard deck={deck(over)} shopping={undefined} now={now} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it("names the whole tile for a screen reader, in the order the tile reads", () => {
    render(<DeckCard deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />);
    expect(
      screen.getByRole("link", {
        name: "Atraxa, Praetors' Voice, To buy, 99 / 99, 3 unowned · $18.40",
      }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/components/decks/deck-card.test.tsx`
Expected: FAIL — the shipped card has a 42×59 thumbnail, no art header, no progress bar and no detail row.

- [ ] **Step 3: Write the detail-row rule as a named function**

Inside `deck-card.tsx`, above the component. It is a total function over the six statuses so a new status cannot silently render nothing:

```tsx
/**
 * The one figure that explains the status (STATES-deck-statuses.md §7). Total
 * over the six values: a status with no branch here would render an empty row,
 * which reads as a bug rather than as an absence.
 *
 * Building has no separate figure — its count IS the explanation — so it
 * repeats the count rather than inventing a second one.
 */
function detailFor(deck: DeckListItem, shopping: DeckShopping | undefined): string {
  const c = refreshCopy.decks;
  switch (deck.statusPill) {
    case "Draft":
      return c.detailDraft;
    case "Building":
      return `${deck.built} / ${MATURE_DECK_SIZE}`;
    case "Over":
      return c.detailOver(deck.built - MATURE_DECK_SIZE);
    case "Unresolved":
      return c.detailUnresolved(deck.unresolvedCount);
    case "To buy":
      // No price row is not "free" — the copies still print, the cost does not.
      return shopping && shopping.cents > 0
        ? c.detailToBuy(deck.toBuyCount, formatCents(shopping.cents))
        : c.detailUnowned(deck.toBuyCount);
    case "Complete":
      return c.detailComplete;
  }
}
```

`detailDraft` is the literal string `created today`, which is only true on the day of creation. Render it as `formatWhen(deck.createdAt, now) === "today" ? c.detailDraft : \`created ${formatWhen(deck.createdAt, now)}\`` — **no**: that invents a string. Instead use `c.detailDraft` when the deck was created today and fall through to the count (`0 / 99`) otherwise, and record the gap. A Draft deck older than a day is a real state the copy file does not cover.

- [ ] **Step 4: Write the tile**

Structure, both viewports (the tile is one element with responsive classes — never two subtrees, one hidden; see the responsive-split rule):

```tsx
<article className="relative overflow-hidden rounded-[14px]"
         style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
  {/* 1 · art header, 118px, scrim --bg 10% → --surface-inset 96% */}
  <div data-deck-art className="relative h-[118px]" style={{ background: `${cssUrl(deck.commanderImageUri)} center/cover` }}>
    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 10%, transparent), color-mix(in srgb, var(--surface-inset) 96%, transparent))" }} />
    <div className="absolute left-3 top-3"><StatusPillBadge status={deck.statusPill} /></div>
    <div className="absolute right-2 top-2"><DeckCardOverflow ... /></div>
    {/* 4 · name over the scrim */}
    <h3 className="absolute inset-x-3 bottom-2 truncate" style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>{deck.name}</h3>
  </div>
  {/* 5 · meta row */}
  {/* 6 · 3px progress */}
  {/* 7 · detail row */}
  <Link href={`/decks/${deck.id}`} className="absolute inset-0" aria-label={ariaLabel} />
</article>
```

Keep the shipped card's absolute-overlay `<Link>` technique — it is what makes the whole tile the target while leaving the `…` clickable — but give the overflow `relative z-10` so it sits above the overlay. The `aria-label` comes from `refreshCopy.decks.cardAria(name, status, count, detail)` and must carry the same four things in the same order the tile shows them.

The art fallback when `commanderImageUri` is null: reuse `ART_STRIPES` from `src/components/home/hero-commander.tsx` — extract it to `src/lib/collection/browse.ts` beside `cssUrl` rather than copying it, so the two surfaces cannot drift.

- [ ] **Step 5: Bring the overflow to spec**

In `deck-card-overflow.tsx`: the trigger becomes 26px square (desktop) / 44px (phone) and its `aria-label` becomes `refreshCopy.decks.menu.trigger(deckName)` — `Actions for Atraxa, Praetors' Voice` — instead of the shipped generic `Deck options`, which says the same thing for every tile on the page. The three item labels come from `refreshCopy.decks.menu`. Delete is `--danger` and last. **Add nothing to this menu.**

- [ ] **Step 6: Run the tests**

Run: `pnpm test src/components/decks/deck-card.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/decks/deck-card.tsx src/components/decks/deck-card.test.tsx \
        src/components/decks/deck-card-overflow.tsx src/lib/collection/browse.ts \
        src/components/home/hero-commander.tsx
git commit -m "feat(decks): rebuild the deck tile around commander art"
```

---
## Task 11: The Decks filter model

Pure. No React, no query, no `window`. Everything the filter column and the phone sheet
disagree about lives in the component; everything they must agree about lives here.

**Files:**
- Create: `src/lib/decks/filter.ts`
- Test: `src/lib/decks/filter.test.ts`

**Interfaces:**
- Consumes: `StatusPill` (`src/lib/decks/status.ts:33`), `DeckSort` / `parseDeckSort` /
  `serializeDeckSort` (Task 6), `DeckListItem` (`src/lib/decks/read.ts`).
- Produces:
  - `export const STATUS_ORDER: readonly StatusPill[]`
  - `export const COLOUR_ORDER: readonly ColourCode[]` where
    `export type ColourCode = "W" | "U" | "B" | "R" | "G"`
  - `export type PlayedWindow = "thisMonth" | "never"`
  - `export type DeckFilters = { statuses: StatusPill[]; colours: ColourCode[]; played: PlayedWindow | null; search: string }`
  - `export const EMPTY_FILTERS: DeckFilters`
  - `export function activeFilterCount(f: DeckFilters): number`
  - `export function filterDecks<T extends FilterableDeck>(decks: T[], f: DeckFilters, now: Date): T[]`
  - `export function filtersToParams(f: DeckFilters, sort: DeckSort): URLSearchParams`
  - `export function filtersFromParams(params: URLSearchParams): { filters: DeckFilters; sort: DeckSort }`

**Three rulings this task settles, because the drawing does not:**

1. **Colour identity is contains-all, not exactly-equals.** Ticking `R` shows every deck whose
   commander identity contains red — mono-red and Mardu alike. Ticking `R` and `G` shows decks
   containing both. Exactly-equals would make the five pips a way to ask five questions with
   thirty-one possible answers, and "show me my red decks" — the only question a player with
   nine decks actually asks — would be unanswerable. Nothing ticked means no colour constraint.
2. **`This month` is the current calendar month**, matched on `now`'s year and month in local
   time. Not "the last 30 days": the label says *this month*, and a rolling window that silently
   drops a deck at midnight on the 31st is a figure that changes while you look at it.
3. **Within a heading, values OR; across headings, they AND.** Draft + Over shows decks that are
   either. Draft + red shows Draft decks that are red. This is how every filter the app already
   ships behaves (`filter-panel.tsx`), and the column offers no control that could say otherwise.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/decks/filter.test.ts
import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterDecks,
  filtersFromParams,
  filtersToParams,
} from "./filter";

const NOW = new Date("2026-09-07T12:00:00Z");

function deck(over: Partial<Parameters<typeof filterDecks<never>>[0][number]> = {}) {
  return {
    id: "d1",
    name: "Atraxa, Praetors' Voice",
    commanderName: "Atraxa, Praetors' Voice",
    commanderColorIdentity: ["W", "U", "B", "G"],
    status: "Complete" as const,
    lastPlayedAt: new Date("2026-09-02T00:00:00Z"),
    ...over,
  };
}

describe("filterDecks", () => {
  it("returns everything when nothing is set", () => {
    const decks = [deck(), deck({ id: "d2", status: "Draft" })];
    expect(filterDecks(decks, EMPTY_FILTERS, NOW)).toHaveLength(2);
  });

  it("ORs within status", () => {
    const decks = [
      deck({ id: "a", status: "Draft" }),
      deck({ id: "b", status: "Over" }),
      deck({ id: "c", status: "Complete" }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, statuses: ["Draft", "Over"] }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("ANDs across headings", () => {
    const decks = [
      deck({ id: "a", status: "Draft", commanderColorIdentity: ["R"] }),
      deck({ id: "b", status: "Draft", commanderColorIdentity: ["G"] }),
    ];
    const kept = filterDecks(
      decks,
      { ...EMPTY_FILTERS, statuses: ["Draft"], colours: ["R"] },
      NOW,
    );
    expect(kept.map((d) => d.id)).toEqual(["a"]);
  });

  it("matches colour identity by containment, not equality", () => {
    const decks = [
      deck({ id: "mono", commanderColorIdentity: ["R"] }),
      deck({ id: "mardu", commanderColorIdentity: ["W", "B", "R"] }),
      deck({ id: "simic", commanderColorIdentity: ["G", "U"] }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, colours: ["R"] }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["mono", "mardu"]);
  });

  it("requires every ticked colour", () => {
    const decks = [
      deck({ id: "mono", commanderColorIdentity: ["R"] }),
      deck({ id: "mardu", commanderColorIdentity: ["W", "B", "R"] }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, colours: ["R", "W"] }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["mardu"]);
  });

  it("reads This month as the calendar month, not thirty days", () => {
    const decks = [
      deck({ id: "sept", lastPlayedAt: new Date("2026-09-01T00:00:00Z") }),
      deck({ id: "aug", lastPlayedAt: new Date("2026-08-30T00:00:00Z") }),
      deck({ id: "never", lastPlayedAt: null }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, played: "thisMonth" }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["sept"]);
  });

  it("reads Never as no play at all", () => {
    const decks = [
      deck({ id: "sept", lastPlayedAt: new Date("2026-09-01T00:00:00Z") }),
      deck({ id: "never", lastPlayedAt: null }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, played: "never" }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["never"]);
  });

  it("searches deck name and commander name, case-insensitively", () => {
    const decks = [
      deck({ id: "a", name: "Weekend brew", commanderName: "Krenko, Mob Boss" }),
      deck({ id: "b", name: "Krenko goblins", commanderName: "Krenko, Mob Boss" }),
      deck({ id: "c", name: "Slug", commanderName: "Torbran" }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, search: "  kRenKo " }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["a", "b"]);
  });
});

describe("activeFilterCount", () => {
  it("counts values, not headings", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        statuses: ["Draft", "Over"],
        colours: ["R"],
        played: "never",
        search: "krenko",
      }),
    ).toBe(5);
  });

  it("ignores whitespace-only search", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, search: "   " })).toBe(0);
  });
});

describe("URL round trip", () => {
  it("serialises defaults as absences", () => {
    expect(filtersToParams(EMPTY_FILTERS, "lastPlayed").toString()).toBe("");
  });

  it("round trips a full state", () => {
    const filters = {
      statuses: ["Draft", "To buy"] as const,
      colours: ["R", "G"] as const,
      played: "never" as const,
      search: "krenko",
    };
    const params = filtersToParams({ ...filters, statuses: [...filters.statuses], colours: [...filters.colours] }, "name");
    const back = filtersFromParams(new URLSearchParams(params.toString()));
    expect(back.filters.statuses).toEqual(["Draft", "To buy"]);
    expect(back.filters.colours).toEqual(["R", "G"]);
    expect(back.filters.played).toBe("never");
    expect(back.filters.search).toBe("krenko");
    expect(back.sort).toBe("name");
  });

  it("drops values it does not recognise instead of throwing", () => {
    const back = filtersFromParams(
      new URLSearchParams("status=Draft,Nonsense&colour=R,X&played=someday&sort=whenever"),
    );
    expect(back.filters.statuses).toEqual(["Draft"]);
    expect(back.filters.colours).toEqual(["R"]);
    expect(back.filters.played).toBeNull();
    expect(back.sort).toBe("lastPlayed");
  });

  it("keeps canonical order regardless of the order given", () => {
    const back = filtersFromParams(new URLSearchParams("status=Complete,Draft&colour=G,W"));
    expect(back.filters.statuses).toEqual(["Draft", "Complete"]);
    expect(back.filters.colours).toEqual(["W", "G"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/lib/decks/filter.test.ts`
Expected: FAIL — `Failed to resolve import "./filter"`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/decks/filter.ts
//
// The Decks filter, as a value. The desktop column and the phone sheet are two
// renderings of this one object, so a filter that behaves differently in the
// sheet than in the column is not possible by construction.

import type { StatusPill } from "./status";
import { DEFAULT_DECK_SORT, parseDeckSort, serializeDeckSort, type DeckSort } from "./sort";

export type ColourCode = "W" | "U" | "B" | "R" | "G";
export type PlayedWindow = "thisMonth" | "never";

/** Build order, and the order the column renders. Never re-sorted at the call site. */
export const STATUS_ORDER: readonly StatusPill[] = [
  "Draft",
  "Building",
  "Over",
  "Unresolved",
  "To buy",
  "Complete",
];

/** WUBRG. The pips render in this order and nothing else. */
export const COLOUR_ORDER: readonly ColourCode[] = ["W", "U", "B", "R", "G"];

const PLAYED_WINDOWS: readonly PlayedWindow[] = ["thisMonth", "never"];

export type DeckFilters = {
  statuses: StatusPill[];
  colours: ColourCode[];
  played: PlayedWindow | null;
  search: string;
};

export const EMPTY_FILTERS: DeckFilters = {
  statuses: [],
  colours: [],
  played: null,
  search: "",
};

export type FilterableDeck = {
  name: string;
  commanderName: string;
  commanderColorIdentity: string[];
  status: StatusPill;
  lastPlayedAt: Date | null;
};

/**
 * What the phone trigger badge shows. Values, not headings: two statuses and a
 * colour is three things switched on, which is what a reader counting the chips
 * above the grid would also say.
 */
export function activeFilterCount(f: DeckFilters): number {
  return (
    f.statuses.length +
    f.colours.length +
    (f.played ? 1 : 0) +
    (f.search.trim() ? 1 : 0)
  );
}

function inCurrentMonth(then: Date, now: Date): boolean {
  return then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth();
}

export function filterDecks<T extends FilterableDeck>(
  decks: T[],
  f: DeckFilters,
  now: Date,
): T[] {
  const needle = f.search.trim().toLowerCase();
  return decks.filter((d) => {
    if (f.statuses.length && !f.statuses.includes(d.status)) return false;
    if (f.colours.length && !f.colours.every((c) => d.commanderColorIdentity.includes(c))) {
      return false;
    }
    if (f.played === "never" && d.lastPlayedAt) return false;
    if (f.played === "thisMonth" && (!d.lastPlayedAt || !inCurrentMonth(d.lastPlayedAt, now))) {
      return false;
    }
    if (
      needle &&
      !d.name.toLowerCase().includes(needle) &&
      !d.commanderName.toLowerCase().includes(needle)
    ) {
      return false;
    }
    return true;
  });
}

export function filtersToParams(f: DeckFilters, sort: DeckSort): URLSearchParams {
  const params = new URLSearchParams();
  if (f.statuses.length) params.set("status", f.statuses.join(","));
  if (f.colours.length) params.set("colour", f.colours.join(","));
  if (f.played) params.set("played", f.played);
  const search = f.search.trim();
  if (search) params.set("q", search);
  const serialised = serializeDeckSort(sort);
  if (serialised) params.set("sort", serialised);
  return params;
}

function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  order: readonly T[],
): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  const given = new Set(raw.split(","));
  return order.filter((value) => given.has(value));
}

export function filtersFromParams(params: URLSearchParams): {
  filters: DeckFilters;
  sort: DeckSort;
} {
  const played = params.get("played");
  return {
    filters: {
      statuses: readList(params, "status", STATUS_ORDER),
      colours: readList(params, "colour", COLOUR_ORDER),
      played: PLAYED_WINDOWS.find((w) => w === played) ?? null,
      search: params.get("q")?.trim() ?? "",
    },
    sort: parseDeckSort(params.get("sort")) ?? DEFAULT_DECK_SORT,
  };
}
```

`readList` filtering `order` by a `Set` of what was given, rather than mapping the given
values, is what makes the last test pass and also what makes an unknown value harmless — a
hand-edited URL cannot inject a status the column has no row for.

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/lib/decks/filter.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/filter.ts src/lib/decks/filter.test.ts
git commit -m "feat(decks): model the deck filters as one value"
```

---
## Task 12: The filter column and the filter sheet

Two presentational components over one value. Neither owns state: both take `filters` and call
`onChange` with a whole new `DeckFilters`. That is what makes them impossible to disagree.

**Files:**
- Modify: `src/lib/decks/status-style.ts` (add `COLOUR_SWATCH`)
- Create: `src/components/decks/deck-filter-column.tsx`
- Create: `src/components/decks/deck-filter-sheet.tsx`
- Test: `src/components/decks/deck-filters.test.tsx`

**Interfaces:**
- Consumes: everything from Task 11, `STATUS_TOKEN` (Task 9), `refreshCopy.filters` (Task 1),
  `DECK_SORT_LABELS` / `DeckSort` (Task 6).
- Produces:
  - `export const COLOUR_SWATCH: Record<ColourCode, string>` (in `status-style.ts`)
  - `export function DeckFilterColumn(props: FilterChromeProps)`
  - `export function DeckFilterSheet(props: FilterChromeProps & { open: boolean; onDismiss: () => void; autoFocusSearch: boolean })`
  - `export type FilterChromeProps = { filters: DeckFilters; onChange: (next: DeckFilters) => void; sort: DeckSort; onSortChange: (next: DeckSort) => void; shown: number; total: number }`

  `FilterChromeProps` is exported from `deck-filter-column.tsx`; the sheet imports it.

- [ ] **Step 1: Add the swatch colours**

Append to `src/lib/decks/status-style.ts`:

```ts
import type { ColourCode } from "./filter";

/**
 * WUBRG pigment. Fixed hex, not theme tokens, for the same reason commander art
 * is never themed (ruling 17): a blue mana symbol that turns amber under a theme
 * is not a blue mana symbol. These are the five values the handoff draws.
 */
export const COLOUR_SWATCH: Record<ColourCode, string> = {
  W: "#E8E4D6",
  U: "#4A7FB5",
  B: "#5B5566",
  R: "#C05A48",
  G: "#6B9E63",
};
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/decks/deck-filters.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { EMPTY_FILTERS } from "../../lib/decks/filter";
import { DeckFilterColumn } from "./deck-filter-column";
import { DeckFilterSheet } from "./deck-filter-sheet";

function props(over = {}) {
  return {
    filters: EMPTY_FILTERS,
    onChange: vi.fn(),
    sort: "lastPlayed" as const,
    onSortChange: vi.fn(),
    shown: 6,
    total: 6,
    ...over,
  };
}

describe("DeckFilterColumn", () => {
  it("renders all six statuses whether or not any deck has them", () => {
    render(<DeckFilterColumn {...props()} />);
    for (const label of ["Draft", "Building", "Over", "Unresolved", "To buy", "Complete"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
  });

  it("shows no per-row counts", () => {
    render(<DeckFilterColumn {...props()} />);
    const row = screen.getByRole("checkbox", { name: "Draft" });
    expect(row.textContent).toBe("Draft");
  });

  it("toggles a status on without disturbing the others", () => {
    const onChange = vi.fn();
    render(
      <DeckFilterColumn
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Over"] }, onChange })}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ["Draft", "Over"] }),
    );
  });

  it("toggles a status back off", () => {
    const onChange = vi.fn();
    render(
      <DeckFilterColumn
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Draft"] }, onChange })}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: [] }));
  });

  it("summarises what is on, and hides Clear when nothing is", () => {
    const { rerender } = render(<DeckFilterColumn {...props()} />);
    expect(screen.getByText("all statuses on")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();

    rerender(
      <DeckFilterColumn {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Draft"] } })} />,
    );
    expect(screen.getByText("1 status on")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("gives every colour swatch an accessible name", () => {
    render(<DeckFilterColumn {...props()} />);
    expect(screen.getByRole("checkbox", { name: "White" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Green" })).toBeInTheDocument();
  });
});

describe("DeckFilterSheet", () => {
  it("mounts nothing when closed", () => {
    const { container } = render(
      <DeckFilterSheet {...props()} open={false} onDismiss={vi.fn()} autoFocusSearch={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("carries the live match count and a dismiss-only button", () => {
    const onDismiss = vi.fn();
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        {...props({ shown: 3, onChange })}
        open
        onDismiss={onDismiss}
        autoFocusSearch={false}
      />,
    );
    expect(screen.getByText("3 of 6 match")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 3 decks" }));
    expect(onDismiss).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("dismisses on Escape without undoing anything", () => {
    const onDismiss = vi.fn();
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Draft"] }, onChange })}
        open
        onDismiss={onDismiss}
        autoFocusSearch={false}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("offers the three sort orders, one of them pressed", () => {
    render(
      <DeckFilterSheet {...props()} open onDismiss={vi.fn()} autoFocusSearch={false} />,
    );
    const group = screen.getByRole("group", { name: "Sort" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(within(group).getByRole("radio", { checked: true })).toHaveAccessibleName(
      "last played",
    );
  });

  it("singularises its dismiss button", () => {
    render(
      <DeckFilterSheet {...props({ shown: 1 })} open onDismiss={vi.fn()} autoFocusSearch={false} />,
    );
    expect(screen.getByRole("button", { name: "Show 1 deck" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm test src/components/decks/deck-filters.test.tsx`
Expected: FAIL — both imports unresolved.

- [ ] **Step 4: Write the column**

`src/components/decks/deck-filter-column.tsx`, `"use client"`.

Geometry, from the desktop frame:

- Column: `w-[262px] flex-none border-r border-[color:var(--border)] bg-[color:var(--surface-rail)] flex flex-col`.
- Search block: `p-[14px_16px_12px] border-b border-[color:var(--border)]`, holding a 34px
  `SearchField` (`src/components/ui/text-field.tsx`) with `refreshCopy.filters.searchPlaceholder`,
  8px radius, `--surface-sunken` fill, `--border-strong` hairline, 14px leading glyph.
- Heading: `p-[13px_16px_7px]` (first) / `p-[14px_16px_7px] border-t border-[color:var(--border)] mt-[12px]`
  (subsequent), mono 10px, `0.14em`, uppercase, `--fg-faint`.
- Status row: a `<button role="checkbox" aria-checked>` — 32px tall, `px-[16px]`, 13px, a **3px
  left border in that status's token** (`STATUS_TOKEN[status]`), `--surface-raised` when on and
  transparent when off, `--fg` when on and `--fg-body` when off. Label only. **No count**
  (ruling 9).
- Colour pips: `px-[16px] flex gap-[6px]`, each a 28px square, 7px radius, `1px` border —
  `--border-strong` when off, `--fg` when on — filled `COLOUR_SWATCH[code]`. Also
  `role="checkbox"`, `aria-checked`, and `aria-label={colorNames([code])[0]}` — `colorNames`
  (`src/lib/copy/color-labels.ts:77`) is the exported reader over that module's private
  `MONO_NAMES` and already returns `White` / `Blue` / `Black` / `Red` / `Green`. Do not retype
  the names, and do not export `MONO_NAMES` to get at them.
- Last played: two rows in the status-row shape, without the 3px keyline, single-select —
  clicking the on one turns it off.
- Footer: `p-[12px_16px] border-t border-[color:var(--border)] flex items-center gap-[10px]`,
  mono 11px `--fg-faint` summary on the left, `Clear` as a 32px hairline button pushed right with
  `ml-auto`. The summary is `allOn` when `filters.statuses` is empty and `someOn(n)` otherwise —
  it reports **statuses only**, exactly as the copy string reads; the chip row above the grid is
  where the other headings show. `Clear` renders only when `activeFilterCount(filters) > 0`, and
  resets to `EMPTY_FILTERS` — never the sort.

One shared toggle helper, defined once in this file and imported by the sheet, keeps canonical
order on the way out so the URL is stable:

```ts
export function toggleIn<T extends string>(
  order: readonly T[],
  current: T[],
  value: T,
): T[] {
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return order.filter((v) => next.includes(v));
}
```

- [ ] **Step 5: Write the sheet**

`src/components/decks/deck-filter-sheet.tsx`, `"use client"`. Returns `null` when `!open` —
mounted or absent, never hidden with CSS, for the reason `filter-panel.tsx:11-15` gives.

- Scrim: `fixed inset-0 z-40` at `rgba(16,13,10,0.74)`; clicking it calls `onDismiss`.
- Panel: `fixed inset-x-0 bottom-0 z-50 rounded-t-[22px] border-t border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-[12px_16px_16px] flex flex-col gap-[14px]`,
  `role="dialog"`, `aria-modal="true"`, labelled by the title.
- Grab handle: a 38 × 4 `--border-strong` bar, 2px radius, `self-center`, `aria-hidden`.
- Title row: `refreshCopy.filters.sheetTitle` in display 18px, and
  `refreshCopy.filters.sheetMatch(shown, total)` in mono 11px `--fg-faint`, `ml-auto`.
- Search: 44px, 10px radius, same `SearchField`, `autoFocus={autoFocusSearch}`.
- Four groups, each `<fieldset role="group" aria-label={heading}>` with the mono 10px heading:
  **Sort** (ruling 6) then Status, Colour identity, Last played.
  - Sort renders `role="radio"` chips over `DECK_SORT_LABELS` in the order
    `["lastPlayed", "name", "newest"]`, inside `role="radiogroup"`; exactly one `aria-checked`.
  - Status and Last played render `role="checkbox"` chips: 36px tall, `px-[12px]`, `rounded-full`,
    13px. Off is a `--border-strong` hairline on `--fg-body`; **on is that status's own token** —
    `border-[STATUS_TOKEN[s]]`, fill `color-mix(in srgb, TOKEN 15%, transparent)`, `--fg` text —
    so the chip and the tile's pill agree without a second colour table.
  - Colour identity renders the same swatches at **44px, 11px radius** — the phone target rule.
- Footer row: `Show N decks` (`sheetDismiss(shown)`) as the full-width 44px bone-filled
  `PrimaryButton`, `flex-auto`, calling **only** `onDismiss`; then `Clear` as a 44px borderless
  text button at `--fg-body`, rendered whenever `activeFilterCount > 0`.
- `Escape` on `document` calls `onDismiss`. Body scroll locks while open.

**One filter, two renderings.** Every `onChange` in both files goes through `toggleIn`, and
neither file ever reads or writes a URL — Task 13 owns that.

- [ ] **Step 6: Run the tests**

Run: `pnpm test src/components/decks/deck-filters.test.tsx`
Expected: PASS, 11 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/decks/status-style.ts src/components/decks/deck-filter-column.tsx \
        src/components/decks/deck-filter-sheet.tsx src/components/decks/deck-filters.test.tsx
git commit -m "feat(decks): draw the filter column and the phone filter sheet"
```

---
## Task 13: The Decks view, and its two empties

The page stays a server component: it authenticates, loads, and hands a plain array to one
client component that owns filters, sort and the URL. Nothing in this task queries.

**Files:**
- Modify: `src/app/decks/page.tsx`
- Create: `src/components/decks/decks-view.tsx`
- Create: `src/components/decks/decks-zero.tsx`
- Test: `src/components/decks/decks-view.test.tsx`

**Interfaces:**
- Consumes: `listDecksWithStats` + `DeckListItem` (Task 6), `loadShoppingRollup` (Task 7),
  `filterDecks` / `filtersFromParams` / `filtersToParams` / `activeFilterCount` / `EMPTY_FILTERS`
  (Task 11), `DeckFilterColumn` / `DeckFilterSheet` (Task 12), `DeckCard` (Task 10),
  `readySlice` (Task 2), `refreshCopy` (Task 1), `FilterPanel`, `NewDeckButton`,
  `ImportDeckButton`, `CardFan` (`src/components/marks.tsx`).
- Produces:
  - `export type DecksViewProps = { decks: DeckListItem[]; shopping: ShoppingRollup; buildable: number; cards: number; now: string }`
  - `export function DecksView(props: DecksViewProps)`
  - `export function DecksZero(props: { buildable: number; cards: number })`

  `cards` is the collection's owned-card total — the second half of
  `zero.buildableFrom(buildable, cards)`, formatted with the same thousands separator the mock
  draws (`1,284`). It comes from the same reader Home's kicker uses (Task 14). At zero decks
  those two numbers are the entire argument for `Browse commanders` being the primary, so
  neither is optional. The test's `SHOPPING` fixture calls therefore pass `buildable={9}
  cards={1284}`; add them to `deckOf`'s render calls when you write the file.

  `now` crosses the boundary as an ISO string and is re-hydrated with `new Date(now)` inside —
  a `Date` prop through a server/client boundary is a serialisation trap, and every consumer
  (`formatWhen`, the `This month` predicate) wants the *server's* clock, not the browser's.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/decks/decks-view.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DecksView } from "./decks-view";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const NOW = "2026-09-07T12:00:00.000Z";

function deckOf(over = {}) {
  return {
    id: "d1",
    name: "Atraxa, Praetors' Voice",
    commanderName: "Atraxa, Praetors' Voice",
    commanderColorIdentity: ["W", "U", "B", "G"],
    commanderImageUri: null,
    status: "Complete" as const,
    built: 99,
    ownedCount: 99,
    unresolvedCount: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastPlayedAt: new Date("2026-09-02T00:00:00Z"),
    ...over,
  };
}

const SHOPPING = { byDeck: new Map(), total: { copies: 0, cents: 0, pricedCopies: 0 } };

beforeEach(() => {
  window.history.replaceState(null, "", "/decks");
});

describe("DecksView", () => {
  it("counts what it renders", () => {
    const decks = [deckOf(), deckOf({ id: "d2", status: "Draft", built: 0 })];
    render(<DecksView decks={decks} shopping={SHOPPING} now={NOW} />);
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps the count and the grid in step while filtering", () => {
    const decks = [
      deckOf({ id: "a", status: "Draft", built: 0 }),
      deckOf({ id: "b", status: "Complete" }),
    ];
    render(<DecksView decks={decks} shopping={SHOPPING} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("writes the filter to the URL without navigating", () => {
    render(<DecksView decks={[deckOf()]} shopping={SHOPPING} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(window.location.search).toBe("?status=Draft");
  });

  it("writes the default sort as an absence", () => {
    render(<DecksView decks={[deckOf()]} shopping={SHOPPING} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(window.location.search).not.toContain("sort=");
  });

  it("shows a removable chip per active value, and Clear", () => {
    render(<DecksView decks={[deckOf()]} shopping={SHOPPING} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    const remove = screen.getByRole("button", { name: "Remove filter: draft" });
    fireEvent.click(remove);
    expect(window.location.search).toBe("");
  });

  it("offers the filtered empty, not the zero state, when filters exclude everything", () => {
    render(<DecksView decks={[deckOf()]} shopping={SHOPPING} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(screen.getByText("No decks match")).toBeInTheDocument();
    expect(screen.queryByText("No decks yet")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("Clear filters restores every deck and empties the URL", () => {
    render(<DecksView decks={[deckOf()]} shopping={SHOPPING} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("keeps New deck and Import in the header at every state", () => {
    render(<DecksView decks={[deckOf()]} shopping={SHOPPING} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(screen.getByRole("link", { name: "New deck" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/decks/decks-view.test.tsx`
Expected: FAIL — `Failed to resolve import "./decks-view"`.

- [ ] **Step 3: Write `decks-view.tsx`**

`"use client"`. One `useState<{ filters: DeckFilters; sort: DeckSort }>` seeded from
`filtersFromParams(new URLSearchParams(window.location.search))` via a lazy initialiser, so the
first paint already reflects a shared URL.

The single mutator, which is also the whole URL story:

```tsx
const apply = useCallback(
  (next: { filters: DeckFilters; sort: DeckSort }) => {
    setState(next);
    const params = filtersToParams(next.filters, next.sort);
    // Every parameter this view does not own is read back off the live URL and
    // preserved — `?select=` rides in from the synergy picks and must survive a
    // filter click. AGENTS.md, "Caching a list a reader flips between".
    const live = new URLSearchParams(window.location.search);
    for (const key of ["status", "colour", "played", "q", "sort"]) live.delete(key);
    for (const [key, value] of params) live.set(key, value);
    const query = live.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  },
  [],
);
```

`history.replaceState`, never `router.replace` — filtering is client-side over an array the
server already sent, so a navigation would refetch a list that has not changed.

Derived, in render, never in an effect:

```tsx
const now = useMemo(() => new Date(nowIso), [nowIso]);
const sorted = useMemo(() => sortDecks(decks, state.sort), [decks, state.sort]);
const shown = useMemo(() => filterDecks(sorted, state.filters, now), [sorted, state.filters, now]);
```

`sortDecks` is the client-side twin of Task 6's SQL ordering, and it is the reason sort does not
navigate either. **Put it in `src/lib/decks/sort.ts` beside the labels, and give it the same
three orders and the same tiebreak** — `lower(name)` then id — so a re-sort in the browser and a
fresh load from the server produce the same sequence. Add two tests for it in
`src/lib/decks/sort.test.ts`: last-played puts nulls last, and equal names break on id.

**Header** — `flex items-center gap-[12px] p-[16px_22px] border-b border-[color:var(--border)]`:

- `Decks` in display 700 at 20px desktop / 22px phone.
- `refreshCopy.decks.shown(shown.length, decks.length)` in mono 11px `--fg-faint`. **Renders only
  when `decks.length > 0`** — the drawn zero header has no count.
- `flex-auto` spacer.
- Desktop: the `Sort · …` trigger — `FilterPanel`, `searchable={false}`,
  `selectionMode="single"`, `showCounts={false}`, options from `DECK_SORT_LABELS`, trigger label
  `refreshCopy.decks.sort(DECK_SORT_LABELS[state.sort])`, 32px, 8px radius, hairline.
- Phone: a 36px hairline search button (10px radius, `aria-label` = the search placeholder) that
  opens the sheet with `autoFocusSearch`, then `Filter` — 36px, hairline, going `--accent` border
  with an `--accent`-filled `triggerBadge(activeFilterCount)` when anything is on.
- `ImportDeckButton` then `NewDeckButton`, in that order, always, at every state.
- Phone puts both buttons full-width **below** the header instead, `New deck` first, 44px, in a
  `p-[12px_16px_0] flex gap-[8px]` row.

**Chip row**, phone and desktop, only when `activeFilterCount > 0`: `p-[12px_16px_0] flex gap-[7px] flex-wrap`,
each chip 28px, `rounded-full`, `--surface-raised`, mono 11px, label + `×`, whole chip a button
with `refreshCopy.filters.chipRemoveAria(label)`. Then `Clear` as a borderless 28px mono button.
Search renders as a chip too, labelled with the term itself.

**Body** — `flex` with the 262px `DeckFilterColumn` at `hidden md:flex`, and the grid
`flex-auto min-w-0 p-[18px_22px] grid gap-[14px] align-content-start`,
`grid-template-columns: repeat(3, 1fr)` desktop and one column with `p-[14px_16px_0] gap-[12px]`
on phone. Each cell is an `<li>` holding `<DeckCard deck={d} shopping={shopping.byDeck.get(d.id)} now={now} />`.

**Filtered empty** — when `decks.length > 0 && shown.length === 0`. It replaces the grid and
nothing else: the column, the header, the chips and both buttons stay. Centred,
`p-[40px_22px] gap-[14px]`, `refreshCopy.filters.emptyHeading` in display 700 at 20px, then
`refreshCopy.filters.emptyAction` as a 32px / 44px hairline button that applies
`{ filters: EMPTY_FILTERS, sort: state.sort }`. **No mark, no body copy, and no second route
out** — the handoff's own note says this state offers `Clear filters` and the zero state offers
two routes in, and conflating them is what makes an empty grid feel like a broken app.

Sort is never cleared by `Clear` or `Clear filters`. It is an ordering, not a filter; clearing it
would silently reorder a grid the reader was looking at.

- [ ] **Step 4: Write `decks-zero.tsx`**

Rendered by the page when `decks.length === 0`, inside the same header shell — the toolbar does
not change shape between empty and populated, so `DecksView` renders it in place of the body and
keeps its own header. Centred column, `p-[26px_40px] gap-[16px]` desktop / `p-[24px_22px] gap-[15px]` phone:

- The card fan: three cards, the third bearing `99` in display 700 `--accent`. Desktop
  130 × 110 with 62 × 84 cards at `-16°` / `0°` / `+15°`; phone 118 × 100 with 56 × 76 at
  `-14°` / `0°` / `+14°`. `src/components/marks.tsx` already ships `CardFan` with `mobile` and
  `decks-desktop` variants at exactly these dimensions — **reuse it, restyle only if the angles
  disagree**, and delete nothing from it.
- `refreshCopy.zero.decksHeading` in display 700, 25px desktop / 22px phone.
- `refreshCopy.zero.decksBody` at 14px desktop, `max-w-[430px]`; `decksBodyShort` at 13.5px on
  phone. One `<p>` per breakpoint is the exception to the single-element rule, because the two
  strings differ.
- `browseCommanders` as the one bone-filled button (32px desktop / 44px full-width phone) linking
  `/commanders`, then `importDeck` as a hairline peer. Side by side on desktop, stacked on phone.
- `refreshCopy.zero.buildableFrom(buildable, cards)` in mono 11px `--fg-faint`, **omitted
  entirely when `buildable === 0`**.

`buildable` is `READY_COUNT` clamped by what actually scored — the same nine Home's *Ready to
build* uses (ruling 2). The page computes it as `readySlice(ranked).set.length`; do not invent a
second threshold.

The `Crown` mark and the old `EmptyState` / `EmptyStateTitle` / `EmptyStateBody` trio are **not**
used here — the refresh draws no crown on this screen. Leave those components in place for the
surfaces that still use them; grep before assuming they are now dead.

- [ ] **Step 5: Rewrite `src/app/decks/page.tsx`**

Keep the `?commander=` redirect exactly as it is, including `selectParamSuffix` — it runs before
auth today and must keep doing so. Then:

```tsx
const userId = await requireUserId();
const [decks, shopping, ranked, stats] = await Promise.all([
  listDecksWithStats(userId),
  loadShoppingRollup(userId),
  getRankedList(userId),
  getCollectionStats(userId),
]);
return (
  <DecksView
    decks={decks}
    shopping={shopping}
    buildable={readySlice(ranked.items).set.length}
    cards={stats.totalCards}
    now={new Date().toISOString()}
  />
);
```

`listDecksWithStats` is called with no sort argument — the server's order is
`DEFAULT_DECK_SORT`, and the client re-sorts from there.

`getRankedList` (`src/lib/recs/ranked-list.ts:26`) returns `{ items, degraded, uniqueCardsRead,
candidateCount }`; `readySlice` takes the `items`. `getCollectionStats`
(`src/lib/home/summary.ts:12`) returns `{ totalCards, uniqueCards }` and **`totalCards` is the
one to print** — `1,284 cards` is copies owned, not distinct names. Both are wrapped in React's
`cache`, so Home asking for the same two costs no second query.

Both are read **only** by the zero branch. `getRankedList` recomputes the whole score set on a
cache miss, which is real work to do on a page that will throw the answer away nine times out of
ten — so guard it: load `decks` and `shopping` first, and only fetch `ranked` and `stats` when
`decks.length === 0`. The `Promise.all` above is the shape at zero, not the shape always.

Delete the old inline empty state and the aggregate `totalBuilt` subtitle. `Crown`,
`EmptyState`, `PrimaryButton` and `CardFan` imports go with them if nothing else on this page
uses them; let `pnpm lint` tell you which.

- [ ] **Step 6: Run the tests**

Run: `pnpm test src/components/decks/ src/lib/decks/sort.test.ts`
Expected: PASS.

- [ ] **Step 7: See it**

Run `pnpm dev`, sign in as the local fixture account, and open `/decks` at 1280 and at 390.
Check, in this order: the count matches the tiles; ticking two statuses ORs them; a status and a
colour AND; the URL fills and empties; a reload of the filled URL paints filtered on first frame;
the phone sheet filters live and its button only dismisses; `Esc` and the scrim both dismiss
without undoing; every filter cleared leaves no `?` on the URL. Then delete every deck on a
scratch account and confirm the zero state, its buildable line, and that the header still holds
`New deck` and `Import`.

- [ ] **Step 8: Commit**

```bash
git add src/app/decks/page.tsx src/components/decks/decks-view.tsx \
        src/components/decks/decks-zero.tsx src/components/decks/decks-view.test.tsx \
        src/lib/decks/sort.ts src/lib/decks/sort.test.ts
git commit -m "feat(decks): filter, sort and count the deck list"
```

---
## Task 14: The Home header, and what the page loads

**Files:**
- Modify: `src/app/page.tsx`
- Rewrite: `src/components/home/dashboard.tsx`
- Test: `src/components/home/dashboard.test.tsx`

**Interfaces:**
- Consumes: `getCollectionStats` / `getCollectionLastUpdated` (`src/lib/home/summary.ts`),
  `getRankedList` (`src/lib/recs/ranked-list.ts:26`), `loadCollectionPool`
  (`src/lib/recs/recommend.ts:137`), `loadAvailability`
  (`src/lib/decks/availability-query.ts:40`), `receiptCountsByCommander`
  (`src/lib/commanders/in-use.ts:50`), `listDecksWithStats` (Task 6),
  `loadShoppingRollup` (Task 7), `commitmentFigures` (Task 8), `readySlice` (Task 2),
  `formatWhen` (Task 3), `refreshCopy` (Task 1).
- Produces:
  - `export type DashboardProps = { stats: { totalCards: number; uniqueCards: number }; lastUpdated: Date | null; ready: ReadySlice<CommanderListItem>; inUse: Map<string, ReceiptCounts>; decks: DeckListItem[]; commitments: Commitments | null; shopping: ShoppingRollup; now: string }`
  - `export function Dashboard(props: DashboardProps)`

**The greeting loses the name.** `refreshCopy.home.greeting` is the flat string `Welcome back`,
and `firstRun.heading` is `Welcome to The 99` — neither interpolates a name. So `Dashboard`'s
`name` prop goes, `FirstRunChecklist`'s goes with it (Task 18), and with them the `currentUser()`
call in `src/app/page.tsx`. Delete it rather than leaving it unread: a Clerk round trip whose
result nothing renders is a request paid for nothing.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/dashboard.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./dashboard";

const BASE = {
  stats: { totalCards: 1284, uniqueCards: 900 },
  lastUpdated: new Date("2026-09-05T00:00:00Z"),
  ready: { set: [], shown: [], moreCount: 0, floor: null },
  recent: [],
  decks: [],
  commitments: { inUse: 312, overCommitted: 3 },
  shopping: { byDeck: new Map(), total: { copies: 18, cents: 9480, pricedCopies: 18 } },
  now: "2026-09-07T12:00:00.000Z",
};

describe("Dashboard header", () => {
  it("greets without a name and prints both kicker figures", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByText("1,284 cards · read 2 days ago")).toBeInTheDocument();
  });

  it("still prints a kicker when the collection has never been dated", () => {
    render(<Dashboard {...BASE} lastUpdated={null} />);
    expect(screen.getByText(/1,284 cards/)).toBeInTheDocument();
  });

  it("sends Update collection to the replace flow", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("link", { name: "Update collection" })).toHaveAttribute(
      "href",
      "/collection/replace",
    );
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/home/dashboard.test.tsx`
Expected: FAIL — the current `Dashboard` demands `userId`, `decks` and `name`.

- [ ] **Step 3: Build the header**

Header row, from the frame: `p-[22px_26px_0] flex items-end gap-[16px]` desktop.

- Kicker first, *above* the greeting: mono 10px, `0.18em`, uppercase, `--fg-faint`, `mb-[7px]`.
  `refreshCopy.home.kicker(cards, when)` where `cards = stats.totalCards.toLocaleString("en-US")`
  and `when = lastUpdated ? formatWhen(lastUpdated, new Date(now)) : "never"`. The copy module
  formats no numbers by contract (its own header says so), so both arrive pre-formatted.
  `never` is not a new string — `formatWhen`'s vocabulary already has to answer this, and
  `decks.lastPlayedNever` is a different sentence for a different subject. **Add `never` as
  `formatWhen`'s null branch in Task 3 if it is not there**; do not invent a Home-only string.
- `Welcome back` as the `<h1>`: display 700, 28px desktop / 24px phone, `leading-[1]`.
- `flex-auto` spacer, then `Update collection` — a 32px hairline `<Link href="/collection/replace">`
  with a 14px refresh glyph, then `New deck` as the bone-filled 32px primary. **These two are the
  page's one filled button and its hairline peer** (ruling 14); nothing else on Home is filled.

Finding 3 stands: `Update collection` is a link, not a flow. `ReplaceFlow`
(`src/components/collection/replace-flow.tsx`) already owns steps 1 → 2 → 3 behind that route.

Phone: the same three parts stack — kicker and greeting in a `p-[16px_16px_0]` block, then
`Update collection` and `New deck` as 44px full-width buttons, `New deck` first.

- [ ] **Step 4: Rewrite the loader in `src/app/page.tsx`**

Keep the signed-out branch byte-for-byte — it is not in the refresh. After `auth()`:

```tsx
const stats = await getCollectionStats(userId);
if (stats.uniqueCards === 0) return <FirstRunChecklist />;

const [lastUpdated, ranked, decks, shopping] = await Promise.all([
  getCollectionLastUpdated(userId),
  getRankedList(userId),
  listDecksWithStats(userId),
  loadShoppingRollup(userId),
]);

const ready = readySlice(ranked.items);

// Finding 8 and ruling 11 read one availability map between them. Fail soft, the
// same way src/app/commanders/page.tsx:227-238 does: losing availability must cost
// the `N in use` clause and the Commitments card, never the page.
let inUse = new Map<string, ReceiptCounts>();
let commitments: Commitments | null = null;
try {
  const [{ collection }, availability] = await Promise.all([
    loadCollectionPool(userId),
    loadAvailability(userId),
  ]);
  inUse = receiptCountsByCommander(ready.shown, collection, availability);
  commitments = commitmentFigures(availability.values());
} catch {
  // Both consumers render nothing rather than a zero, which would be a claim.
}
```

`getCollectionStats` is awaited first and alone because the first-run branch renders nothing else
— loading four more things to throw them away is the shape the current file already avoids, and
it stays avoided.

**`listRecentDecks` is not called, and Home stops importing it.** The resume rows draw a status
pill and `99 / 99 · 3 unowned`; `RecentDeck` (`src/lib/home/summary.ts:35-42`) carries none of
those and `DeckListItem` carries all of them. The deck rail needs the same row shape and the same
statuses. One `listDecksWithStats` read serves both sections, and two reads of the same table
returning two different truths about one deck is precisely the class of bug the refresh is fixing.
Task 16 states the ordering. Leave `listRecentDecks` in `summary.ts` — `src/app/commanders/page.tsx:90`
still calls it — and delete nothing.

`loadAvailability(userId)` with no options is the whole-user read (`src/lib/decks/availability-query.ts:40-43`);
`src/app/collection/page.tsx:55` is the shipped precedent. `receiptCountsByCommander` is handed
`ready.shown` — two commanders, not the whole ranked list — because only the rendered heroes print
the clause. `loadCollectionPool` is React-`cache`d (`src/lib/recs/recommend.ts:137`), so on the
branch where `getRankedList` recomputed, this is a cache hit and not a second query.

The `Suspense` boundary around `CommanderCount` goes. Its whole job was to let the greeting paint
before the ranked list resolved, and the refresh's greeting no longer depends on a ranked list —
`Ready to build` does, and it is below the fold of the header either way. Delete
`src/components/home/commander-count.tsx` **only if** nothing else imports it; grep first.

- [ ] **Step 5: Run the tests**

Run: `pnpm test src/components/home/dashboard.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/home/dashboard.tsx \
        src/components/home/dashboard.test.tsx
git commit -m "feat(home): greet with the collection's size and age"
```

---

## Task 15: Ready to build

The two hero cards and the line under them. This is where Design's blocking item 3 is answered,
and the answer is Task 2's `readySlice` — nothing here invents a threshold.

**Files:**
- Rewrite: `src/components/home/hero-commander.tsx`
- Create: `src/components/home/ready-to-build.tsx`
- Test: `src/components/home/ready-to-build.test.tsx`

**Interfaces:**
- Consumes: `ReadySlice<CommanderListItem>` (Task 2), `COLOUR_SWATCH` (Task 12),
  `refreshCopy.home`, `ART_STRIPES` / `cssUrl` (`src/lib/collection/browse.ts`, Task 10).
- Produces:
  - `export function ReadyToBuild(props: { ready: ReadySlice<CommanderListItem>; inUse: Map<string, ReceiptCounts> })`
  - `export function HeroCommander(props: { item: CommanderListItem; inUse: number })`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/ready-to-build.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { ReadyToBuild } from "./ready-to-build";

// Only the fields the hero renders. `CommanderListItem` has fifteen more; a
// fixture that lists them all is a fixture that breaks when any of them moves.
function item(over = {}) {
  return {
    oracleId: "o1",
    slug: "atraxa-praetors-voice",
    name: "Atraxa, Praetors' Voice",
    colorIdentity: ["W", "U", "B", "G"],
    imageUri: null,
    score: 74,
    measurableTotal: 100,
    colorPoolSize: 92,
    ...over,
  } as unknown as CommanderListItem;
}

const READY = {
  set: [item(), item({ oracleId: "o2", score: 71 })],
  shown: [item(), item({ oracleId: "o2", score: 71, colorPoolSize: 88 })],
  moreCount: 7,
  floor: 70,
};

const IN_USE = new Map([["o1", { inUse: 12, wantedByBrew: 0 }]]);

describe("ReadyToBuild", () => {
  it("draws the frame's figures exactly", () => {
    render(<ReadyToBuild ready={READY} inUse={IN_USE} />);
    expect(screen.getByText("74")).toBeInTheDocument();
    expect(screen.getByText("92 of your cards fit")).toBeInTheDocument();
    expect(screen.getByText("12 in use")).toBeInTheDocument();
    expect(screen.getByText("7 more scored 70 or better")).toBeInTheDocument();
  });

  it("omits the in-use clause when nothing is in use", () => {
    render(<ReadyToBuild ready={READY} inUse={IN_USE} />);
    // "o2" has no entry at all, which is the same claim as zero.
    expect(screen.queryByText("0 in use")).toBeNull();
    expect(screen.getAllByText(/in use/)).toHaveLength(1);
  });

  it("prints the real denominator when a commander has no synergy read", () => {
    const partial = {
      ...READY,
      shown: [item({ score: 58, measurableTotal: 80 }), READY.shown[1]],
    };
    render(<ReadyToBuild ready={partial} inUse={IN_USE} />);
    expect(screen.getByText("/80 fit")).toBeInTheDocument();
  });

  it("gives each hero both routes", () => {
    render(<ReadyToBuild ready={READY} inUse={IN_USE} />);
    expect(screen.getAllByRole("link", { name: "Start this deck" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "See the pool" })).toHaveLength(2);
  });

  it("drops the more-above line when nothing is above", () => {
    render(<ReadyToBuild ready={{ ...READY, moreCount: 0, floor: 74 }} inUse={IN_USE} />);
    expect(screen.queryByText(/more scored/)).toBeNull();
    expect(screen.getByRole("link", { name: "All commanders" })).toBeInTheDocument();
  });

  it("renders nothing at all when nothing scored", () => {
    const { container } = render(
      <ReadyToBuild ready={{ set: [], shown: [], moreCount: 0, floor: null }} inUse={IN_USE} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/home/ready-to-build.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the hero card**

250px tall, 14px radius, `--border` hairline, full-bleed commander art cropped to the
illustration. Over it, one scrim: `linear-gradient(180deg, --bg 15%, --bg 72% at 52%, --bg 96%)`
— written as `color-mix` stops against `var(--bg)`, not the frame's literal `rgba(20,17,14,…)`,
so it survives a theme change. Art falls back to `ART_STRIPES` keyed on the oracle id, exactly as
the deck tile does; do not add a second placeholder.

- Fit badge, `top-[11px] left-[12px]`: 22px tall, `px-[8px]`, 6px radius, `--bg` at 82%, mono
  10.5px. `refreshCopy.home.fit(item.score, item.measurableTotal)` renders as two spans — the score
  at `--fg`, the `/100 fit` remainder at `--fg-faint`. **Split the string for colour, never rebuild
  it**: take `fit(item.score, item.measurableTotal)`, and colour the substring after the first space. If that feels fragile, it is —
  which is why the split lives in this one component and nowhere else.
- Bottom block, `p-[14px]`: the name in display 600 at 18px, single-line with ellipsis; then a
  `gap-[8px]` row of 9px `COLOUR_SWATCH` pips at 2px radius, `fitLine(item.edhrecOwnedCount)` in
  mono 11px `--fg-body` **omitted entirely when `edhrecOwnedCount` is null** (an unindexed commander
  has no such count, and 0 would be a claim), and `inUse(inUse)` in mono 11px `--accent` **only when
  `inUse > 0`** — the copy file's own comment says free says nothing. `inUse` is the prop threaded
  from `receiptCountsByCommander` (finding 8); it is not a field on `CommanderListItem`.
- Two links, `mt-[12px] gap-[8px]`: `Start this deck` bone-filled 32px to
  `/decks/new?commander=<oracleId>`, and `See the pool` 32px on a `--border-strong` hairline over
  `--bg` at 50%, to the commander's detail route. Confirm both hrefs against the shipped
  commander list before writing them — this plan names the destination, the router owns the path.

- **Phone action row.** At `<sm` the two links become a 44px row: `Start this deck` fills the
  remaining width at 14px 600, and the secondary collapses to a 44×44 hairline square holding a
  17px chevron. It is the same link to the same destination — give it
  `aria-label={refreshCopy.home.seePool}` so the accessible name is the desktop label rather than
  nothing. One element with responsive classes, not two subtrees with one hidden.

**The mock's phone shorthand `92 fit` is not adopted.** The desktop card draws
`88 of your cards fit` and phone draws `92 fit`, but there is no short variant in
`refresh · copy strings.ts` and ruling 5 forbids inventing one. The full string measures: at mono
10.5px, `88 of your cards fit` is 20 characters ≈ 126px, and the phone card's content box at 390 is
358 − 26 of padding = 332px, of which the pips take at most 5×8 + 4×3 = 52px plus a 7px gap. It fits
with ~145px spare. Both breakpoints render `fitLine`.

**`rank` is not drawn and must not be.** It is a prop only so the two cards can key and order
without the parent reaching into the array; nothing renders it.

- [ ] **Step 4: Write the section**

`ReadyToBuild` returns `null` when `ready.set.length === 0` — a Home with no scored commanders
shows no empty *Ready to build* heading, because a heading over nothing is worse than silence.

- Heading `refreshCopy.home.readyHeading` in mono 10px, `0.14em`, uppercase, `--fg-faint`.
- `grid grid-cols-2 gap-[14px]` desktop over `ready.shown`; on phone the two stack at **186px**
  tall with the same parts, one column, `gap-[12px]`.
- Footer row, `flex items-center gap-[12px]`: `moreAbove(moreCount, floor)` in mono 11px
  `--fg-faint`, rendered only when `moreCount > 0 && floor !== null`, then `All commanders` as a
  32px hairline link to `/commanders`. **`All commanders` always renders**, even at
  `moreCount === 0` — it is the route to the lane, not a footnote on the count.

- [ ] **Step 5: Run the tests**

Run: `pnpm test src/components/home/ready-to-build.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/ready-to-build.tsx src/components/home/hero-commander.tsx \
        src/components/home/ready-to-build.test.tsx
git commit -m "feat(home): show the two best commanders you can build now"
```

---

## Task 16: Pick up where you left off

Two deck rows under the heroes, desktop only.

**Files:**
- Create: `src/components/home/resume-decks.tsx`
- Create: `src/components/home/resume-decks.test.tsx`

**Interfaces:**
- Consumes: `DeckListItem` + `lastPlayedAt` (Task 6), `StatusPillBadge` / `statusBarStyle`
  (Task 9), `refreshCopy.decks` + `refreshCopy.home` (Task 1), `ART_STRIPES` / `cssUrl`
  (`src/lib/collection/browse.ts`, Task 10).
- Produces:
  - `export const RESUME_COUNT = 2`
  - `export function resumeDecks(decks: readonly DeckListItem[]): DeckListItem[]`
  - `export function ResumeDecks(props: { decks: DeckListItem[] })`

### The ordering, ruled

*Pick up where you left off* means most recently touched, and the only two timestamps a deck
carries are `lastPlayedAt` (Task 6) and `createdAt`. **A played deck outranks an unplayed one; within
each group the newer timestamp wins; ties break on `id` so the order is stable across renders.**

A deck played last week beats a deck created this morning, because the copy says *left off*, not
*made*. This is deliberately not the same order as the deck rail beside it (Task 17 ships the rail
in `listDecksWithStats`'s own order), and the two sections showing the same deck in different
positions is correct — one asks *what were you doing*, the other *what do you have*.

`resumeDecks` is exported separately from the component so the ordering is testable without a DOM.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumeDecks, resumeDecks } from "./resume-decks";
import type { DeckListItem } from "../../lib/decks/read";

const deck = (o: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: null,
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  lastPlayedAt: new Date("2026-09-05T00:00:00Z"),
  statusPill: "To buy",
  ...o,
});

describe("resumeDecks", () => {
  it("puts a played deck above an unplayed one, however new the unplayed is", () => {
    const played = deck({ id: "played", lastPlayedAt: new Date("2026-01-01T00:00:00Z") });
    const fresh = deck({
      id: "fresh",
      lastPlayedAt: null,
      createdAt: new Date("2026-09-07T00:00:00Z"),
    });
    expect(resumeDecks([fresh, played]).map((d) => d.id)).toEqual(["played", "fresh"]);
  });

  it("orders played decks by when they were played", () => {
    const older = deck({ id: "older", lastPlayedAt: new Date("2026-08-01T00:00:00Z") });
    const newer = deck({ id: "newer", lastPlayedAt: new Date("2026-09-05T00:00:00Z") });
    expect(resumeDecks([older, newer]).map((d) => d.id)).toEqual(["newer", "older"]);
  });

  it("orders unplayed decks by when they were created", () => {
    const a = deck({ id: "a", lastPlayedAt: null, createdAt: new Date("2026-08-01T00:00:00Z") });
    const b = deck({ id: "b", lastPlayedAt: null, createdAt: new Date("2026-09-01T00:00:00Z") });
    expect(resumeDecks([a, b]).map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("breaks a tie on id so two renders agree", () => {
    const at = new Date("2026-09-05T00:00:00Z");
    const a = deck({ id: "aaa", lastPlayedAt: at });
    const z = deck({ id: "zzz", lastPlayedAt: at });
    expect(resumeDecks([z, a]).map((d) => d.id)).toEqual(["aaa", "zzz"]);
  });

  it("takes two and no more", () => {
    expect(resumeDecks([deck({ id: "1" }), deck({ id: "2" }), deck({ id: "3" })])).toHaveLength(2);
  });

  it("does not mutate its argument", () => {
    const input = [deck({ id: "b", lastPlayedAt: null }), deck({ id: "a" })];
    resumeDecks(input);
    expect(input.map((d) => d.id)).toEqual(["b", "a"]);
  });
});

describe("ResumeDecks", () => {
  it("prints the built count and the unowned clause together", () => {
    render(<ResumeDecks decks={[deck({ built: 99, toBuyCount: 3 })]} />);
    expect(screen.getByText("99 / 99 · 3 unowned")).toBeInTheDocument();
  });

  it("prints the count alone when nothing is unowned", () => {
    render(<ResumeDecks decks={[deck({ built: 87, toBuyCount: 0, statusPill: "Building" })]} />);
    expect(screen.getByText("87 / 99")).toBeInTheDocument();
    expect(screen.queryByText(/unowned/)).toBeNull();
  });

  it("names each row for the deck it opens", () => {
    render(<ResumeDecks decks={[deck({ name: "Atraxa", id: "d1" })]} />);
    const link = screen.getByRole("link", { name: /Atraxa/ });
    expect(link).toHaveAttribute("href", "/decks/d1");
  });

  it("renders nothing when there are no decks", () => {
    const { container } = render(<ResumeDecks decks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/home/resume-decks.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the ordering**

```tsx
export const RESUME_COUNT = 2;

/** Most recently played first, then most recently created. See the ruling above. */
export function resumeDecks(decks: readonly DeckListItem[]): DeckListItem[] {
  return [...decks]
    .sort((a, b) => {
      const at = a.lastPlayedAt?.getTime() ?? null;
      const bt = b.lastPlayedAt?.getTime() ?? null;
      if (at !== null && bt === null) return -1;
      if (at === null && bt !== null) return 1;
      const diff = at !== null && bt !== null
        ? bt - at
        : b.createdAt.getTime() - a.createdAt.getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    })
    .slice(0, RESUME_COUNT);
}
```

The copy is spread over `[...decks]` because the caller's array is the same one Task 17's rail
renders in its own order; sorting in place would silently reorder the rail.

- [ ] **Step 4: Write the section**

`ResumeDecks` returns `null` when it is handed nothing. It does not call `resumeDecks` itself —
Home slices once and hands both sections their own list, so the component under test is the
markup and the ordering is tested as a function.

- Heading `refreshCopy.home.resumeHeading` in mono 10px, `0.14em`, uppercase, `--fg-faint`,
  `mt-[6px]`.
- `flex gap-[12px]`, each row `flex-1 min-w-0`: a `<Link href={`/decks/${deck.id}`}>` at
  `--surface-raised` on a `--border` hairline, 12px radius, `p-[10px_12px]`, `gap-[11px]`,
  `items-center`.
- Art chip: 30×42, 5px radius, `flex-none`, the commander art cropped to fill, falling back to
  `ART_STRIPES` on the deck's commander oracle id — the same fallback the tile and the hero use,
  for the same reason.
- Text column `flex-auto min-w-0 gap-[4px]`: the **deck name** in display 600 at 14.5px, one line
  with ellipsis; under it a `gap-[8px]` row holding `StatusPillBadge` (19px tall, `px-[7px]`, 5px
  radius, the status's tint at 16% behind its own colour) and the figure line in mono 10.5px
  `--fg-faint`.
- The figure line is `built / 99`, then `refreshCopy.decks.detailUnowned(toBuyCount)` joined by
  ` · ` **only when `toBuyCount > 0`**. `99 / 99 · 3 unowned` and `87 / 99` are the two frames, and
  they are the same rule.

**The row draws the deck name, not the commander name.** The frame prints
`Atraxa, Praetors' Voice` in both rows because the fixture names each deck after its commander,
which is the default a new deck gets. A renamed deck must show the name the user gave it — the
deck rail (Task 17) and the deck tile (Task 9) both already do, and three surfaces disagreeing
about what a deck is called is not a thing to ship.

**Desktop only.** The phone Home frame draws no resume section (mock lines 402–466: kicker,
greeting, *Ready to build*, then straight into *Your decks*). Render the whole section inside a
`hidden sm:block` wrapper. The phone rail's rows carry the same status and count, so nothing is
unreachable — the ordering is what phone gives up, and 186px heroes plus three rail rows is
already a full screen.

- [ ] **Step 5: Run the tests**

Run: `pnpm test src/components/home/resume-decks.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/resume-decks.tsx src/components/home/resume-decks.test.tsx
git commit -m "feat(home): resume the two decks you touched last"
```

---

## Task 17: The deck rail and the Commitments card

Home's 316px right column on desktop, and the rail alone on phone.

**Files:**
- Create: `src/components/home/deck-rail.tsx`
- Create: `src/components/home/commitments-card.tsx`
- Create: `src/components/home/deck-rail.test.tsx`
- Create: `src/components/home/commitments-card.test.tsx`

**Interfaces:**
- Consumes: `DeckListItem` (Task 6), `Commitments` (Task 8), `ShoppingRollup` (Task 7),
  `statusKeylineStyle` / `STATUS_TOKEN` (Task 9), `formatCents` (`src/lib/decks/price.ts:109`),
  `refreshCopy.home` (Task 1), `ART_STRIPES` / `cssUrl` (Task 10), `n` — the thousands
  formatter already used by `src/lib/copy/commander-explained.ts`.
- Produces:
  - `export const RAIL_ROWS = 4`
  - `export const RAIL_ROWS_PHONE = 3`
  - `export function DeckRail(props: { decks: DeckListItem[] })`
  - `export function CommitmentsCard(props: { commitments: Commitments; shopping: ShoppingRollup })`

### Two rulings this task settles

**The rail shows the decks in `listDecksWithStats`'s own order, truncated.** That order is the
shipped default (`src/lib/decks/read.ts` — read the `orderBy` and do not change it in this task).
The rail is a directory, not a ranking; `2 more` and `All decks` are how the rest is reached, and
re-sorting it would make the heading `Your decks · 6` describe a set the reader cannot walk.

**`2 more` is `decks.length − rendered`, computed against the breakpoint that is actually
rendering.** Four rows desktop, three phone, so a six-deck user reads `2 more` on desktop and
`3 more` on phone, and both are true. This is the one figure in the refresh that differs by
breakpoint, and it differs because the thing it counts differs. Do not hardcode 4.

- [ ] **Step 1: Write the failing rail test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckRail } from "./deck-rail";
import type { DeckListItem } from "../../lib/decks/read";

const deck = (o: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: null,
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  lastPlayedAt: null,
  statusPill: "To buy",
  ...o,
});

const six = Array.from({ length: 6 }, (_, i) =>
  deck({ id: `d${i}`, name: `Deck ${i}` }),
);

describe("DeckRail", () => {
  it("heads with the total, not the number shown", () => {
    render(<DeckRail decks={six} />);
    expect(screen.getByText("Your decks · 6")).toBeInTheDocument();
  });

  it("renders four rows on desktop and counts the rest", () => {
    render(<DeckRail decks={six} />);
    expect(screen.getAllByRole("link", { name: /^Deck / })).toHaveLength(4);
    expect(screen.getByText("2 more")).toBeInTheDocument();
  });

  it("counts the phone remainder against three rows", () => {
    render(<DeckRail decks={six} />);
    expect(screen.getByText("3 more")).toBeInTheDocument();
  });

  it("drops the more-count when everything fits", () => {
    render(<DeckRail decks={six.slice(0, 3)} />);
    expect(screen.queryByText(/ more$/)).toBeNull();
    expect(screen.getByRole("link", { name: "All decks" })).toBeInTheDocument();
  });

  it("prints the unowned clause beside the status on phone", () => {
    render(<DeckRail decks={[deck({ statusPill: "To buy", toBuyCount: 3 })]} />);
    expect(screen.getByText("To buy · 3 unowned")).toBeInTheDocument();
  });

  it("prints the unresolved clause beside the status", () => {
    render(<DeckRail decks={[deck({ statusPill: "Unresolved", unresolvedCount: 2 })]} />);
    expect(screen.getByText("Unresolved · 2 lines unresolved")).toBeInTheDocument();
  });

  it("prints the status alone when it has no figure", () => {
    render(<DeckRail decks={[deck({ statusPill: "Complete", toBuyCount: 0 })]} />);
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders nothing at all when there are no decks", () => {
    const { container } = render(<DeckRail decks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

The `2 more` and `3 more` assertions both pass in one render because both footers are in the DOM
at once, one hidden per breakpoint by a class jsdom does not apply. That is the honest reading of
a responsive count and the reason this is the single place in the feature where two elements
carry the same job — a CSS-only answer would need `content:` on a pseudo-element, which is not
text a screen reader can reach.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/home/deck-rail.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the rail**

`DeckRail` returns `null` on an empty list. Home's zero-deck state is Task 18's first run and
Task 13's `/decks` zero; a Home with a collection and no decks shows the heroes and no rail.

- Heading `refreshCopy.home.decksHeading(decks.length)` — the **total**, not the rendered count —
  in mono 10px, `0.14em`, uppercase, `--fg-faint`.
- Card: `--surface-raised`, `--border` hairline, 14px radius, `overflow-hidden`. Rows are the
  card's children with no gap; the separator is each row's own
  `border-b border-[--border-subtle]`, and the last row before the footer keeps it because the
  footer sits under it in the frame.
- **How many rows render is a responsive pair, not a prop.** Both slices are in the DOM at
  once — `decks.slice(0, RAIL_ROWS)` inside a `hidden sm:block` list and
  `decks.slice(0, RAIL_ROWS_PHONE)` inside an `sm:hidden` one — because the footer's count
  differs with them and a single list cannot print two counts. This is the one place in this
  feature where a split subtree is correct: the two lists render different rows, not the
  same row at two sizes.
- Row: `<Link href={`/decks/${deck.id}`}>`, `flex items-center gap-[10px]`,
  `border-l-[3px]` in the status's own colour via `statusKeylineStyle` (Task 9). Not
  `statusBarStyle` — that one takes a `built` count and scales a progress fill; the rail's
  keyline is a flat 3px edge and has no progress to state.
  - **Desktop** (`p-[10px_13px]`): deck name in display 600 at 14px, one line with ellipsis,
    `flex-auto min-w-0`; then the status label alone in mono 10px in the status colour,
    `flex-none`. No art, no count — the column is 316px and the frame draws neither.
  - **Phone** (`p-[12px_13px] min-h-[56px]`): a 26×36 art chip at 4px radius leads, then a
    two-line text column (`gap-[3px]`) of the name at 14.5px over `status · figure` in mono
    10.5px in the status colour, then `built / 99` in mono 12px `--fg` on the right, `flex-none`.
    56px is the touch target and the reason phone earns the art.
- The phone `status · figure` clause takes its figure from the status, using strings that already
  exist: `To buy` → `detailUnowned(toBuyCount)`, `Unresolved` → `detailUnresolved(unresolvedCount)`,
  `Over` → `detailOver(built - 99)`, `Draft` / `Building` / `Complete` → no clause. Reuse Task 9's
  detail-line helper rather than writing a second `switch`; if Task 9 left it inline in the tile,
  lift it to `src/lib/decks/status.ts` in this task and have both call it.
- Footer, `p-[9px_13px] flex items-center justify-between`: `decksMore(n)` in mono 11px
  `--fg-faint` on the left, rendered only when `n > 0`, and `All decks` at 12.5px `--fg-body`
  linking to `/decks` on the right. `n` is `decks.length - RAIL_ROWS` in the desktop subtree
  and `decks.length - RAIL_ROWS_PHONE` in the phone one, floored at zero — each footer lives
  inside its own list's subtree, which is what keeps the two counts honest. **`All decks` always renders** — same rule as `All commanders`.

**The phone frame draws no footer row.** Mock lines 437–465 end the rail after the third row.
Ship the footer on phone anyway: without it, `All decks` is reachable only through the tab bar,
and a reader who has just been told there are six decks and shown three has been given a count
with no route. This is an addition to the drawing, it is one row of already-specified parts, and
it is recorded as a deviation in the PR body.

- [ ] **Step 4: Write the failing commitments test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommitmentsCard } from "./commitments-card";

const shopping = (copies: number, cents: number) => ({
  byDeck: new Map(),
  total: { copies, cents, pricedCopies: copies },
});

describe("CommitmentsCard", () => {
  it("prints cards in use against the collection's total copies", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 312, overCommitted: 3 }}
        shopping={shopping(18, 9480)}
        totalCards={1284}
      />,
    );
    expect(screen.getByText("312 of 1,284")).toBeInTheDocument();
  });

  it("prints the over-committed figure in cards, singular at one", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 1 }}
        shopping={shopping(0, 0)}
        totalCards={10}
      />,
    );
    expect(screen.getByText("1 card")).toBeInTheDocument();
  });

  it("prints the shopping total as copies and money", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 0 }}
        shopping={shopping(18, 9480)}
        totalCards={10}
      />,
    );
    expect(screen.getByText("18 · $94.80")).toBeInTheDocument();
  });

  it("still renders every row at zero — a zero here is a fact, not an absence", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 0 }}
        shopping={shopping(0, 0)}
        totalCards={0}
      />,
    );
    expect(screen.getByText("0 of 0")).toBeInTheDocument();
    expect(screen.getByText("0 cards")).toBeInTheDocument();
    expect(screen.getByText("0 · $0.00")).toBeInTheDocument();
  });

  it("routes to the commitments review", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 0 }}
        shopping={shopping(0, 0)}
        totalCards={0}
      />,
    );
    expect(screen.getByRole("link", { name: "Review commitments" })).toBeInTheDocument();
  });
});
```

The signature in these tests takes `totalCards` — add it to the Produces block above; the
denominator of `Cards in use` is the collection's total copies, which lives on
`getCollectionStats`, not on `Commitments`.

- [ ] **Step 5: Run it and watch it fail**

Run: `pnpm test src/components/home/commitments-card.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 6: Write the card**

- Heading `refreshCopy.home.commitmentsHeading` in mono 10px, `0.14em`, uppercase, `--fg-faint`,
  `mt-[4px]`.
- Card: `--surface-raised`, `--border` hairline, 14px radius, `p-[14px]`, `flex-col gap-[11px]`.
- Three rows, each `flex items-baseline justify-between`: the label at 13px `--fg-body`, the
  figure in mono 13px `tabular-nums`. **The three figures do not share a colour and the difference
  is the content:**

  | Row | Copy | Colour | Why |
  |---|---|---|---|
  | `Cards in use` | `inUseValue(n(inUse), n(totalCards))` | `--accent` | a claim you made on purpose |
  | `Spoken for twice` | `overCommittedValue(overCommitted)` | `--danger` | two decks cannot both have it |
  | `To buy, all decks` | `toBuyValue(total.copies, formatCents(total.cents))` | `--fg` | money owed, not a warning |

  `--danger` is the token; the frame's `#C6533F` is that token's brass value. Never the literal.
  **`Spoken for twice` stays `--danger` at zero.** Recolouring a row when its figure hits zero
  makes the palette a second, quieter status system, and `0 cards` in `--danger` reads as what it
  is — the row that would be red if it were not zero.
- Footer: `Review commitments` as a 32px hairline link, `border-[--border-strong]`, 8px radius,
  centred, 12.5px `--fg`, `mt-[2px]`, full width. Its destination is the collection's availability
  view — confirm the shipped route before writing the href; this plan names the destination, the
  router owns the path.

**Desktop only, both.** The phone Home frame draws neither the Commitments card nor the rail
footer's desktop form; it ends at the rail. Wrap `CommitmentsCard` in `hidden sm:block`. The
commitment figures are not lost on phone — `/collection` renders them at full size, which is
where `Review commitments` goes.

**`CommitmentsCard` renders nothing when `commitments` is null.** Task 14's loader nulls it when
the availability read throws, and a card of three zeroes after a failed query is a lie. Home does
the null check; the component takes a non-null `Commitments`.

- [ ] **Step 7: Run both suites**

Run: `pnpm test src/components/home/deck-rail.test.tsx src/components/home/commitments-card.test.tsx`
Expected: PASS, 13 tests.

- [ ] **Step 8: Commit**

```bash
git add src/components/home/deck-rail.tsx src/components/home/deck-rail.test.tsx \
        src/components/home/commitments-card.tsx src/components/home/commitments-card.test.tsx
git commit -m "feat(home): rail the decks and total the commitments"
```

---

## Task 18: First run

The three-step checklist, restyled. Same three steps, same wiring, new shell.

**Files:**
- Rewrite: `src/components/home/first-run.tsx`
- Modify: `src/components/collection/upload-entry.tsx`
- Create: `src/components/home/first-run.test.tsx`
- Modify: `src/components/shell/nav.tsx` (locked colour only — see the ruling)

**Interfaces:**
- Consumes: `refreshCopy.firstRun` (Task 1), `UploadEntry` / `ReplaceFlow`
  (`src/components/collection/`), `Crown` (`src/components/ui/crown.tsx`).
- Produces:
  - `export function FirstRunChecklist()` — **the `name` prop is removed** (Task 14 removed the
    only `currentUser()` call that fed it).
  - `UploadEntry` gains one optional prop: `entry?: "dropzone" | "buttons"`, default `"dropzone"`.

### Three rulings

**1. The step-1 card gets two buttons, and that is one additive prop on `UploadEntry`.** The frame
draws `Upload a CSV` (bone-filled) and `Paste a list` (hairline) side by side; `UploadEntry` today
draws a dropzone with a *Paste a list instead* link under it (`upload-entry.tsx:98-239`). Both
affordances already exist — the file input and `setMode("paste")` — so this is a second entry
rendering of the same state machine, not a second state machine. Add `entry="buttons"`, used by
first run only. **Do not change the default**, and do not touch `/collection/replace`, which is
not in this refresh and whose dropzone is the right control on a page about files.

**2. The card fan is decorative and gets `aria-hidden`.** Three overlapping rounded rectangles,
the third rotated `13deg` carrying `99` in display 700 — 74×82 desktop, 88×92 phone. It says
nothing the heading does not, and a screen reader walking three empty spans is noise.

**3. Locked nav items are `--fg-disabled`, and the token is what changes, not the components.**
The frame dims the three locked rail and tab items to `#4A4033` and hangs a padlock under the
rail's divider. `nav.tsx` already branches on `isLocked` (`nav.tsx:138`, `nav.tsx:233`) and Tasks
4–5 rewrote both to the 62px rail and 52px tab bar. This task changes only the colour those
branches resolve to and adds the padlock glyph — if `--fg-disabled` does not exist in
`src/lib/theme/themes.ts`, add it to all six themes with each theme's own value; **never the
literal `#4A4033`**, which is brass's.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FirstRunChecklist } from "./first-run";

describe("FirstRunChecklist", () => {
  it("counts the steps in the kicker, not in a sentence", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(/Three steps/)).toBeNull();
  });

  it("greets without a name", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByRole("heading", { name: "Welcome to The 99" })).toBeInTheDocument();
  });

  it("says what each locked step is waiting for", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByText("Unlocks once a collection is read")).toBeInTheDocument();
    expect(screen.getByText("Unlocks with a commander")).toBeInTheDocument();
  });

  it("offers both entries into step 1", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByRole("button", { name: "Upload a CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste a list" })).toBeInTheDocument();
  });

  it("lets a player who already has a decklist out of the checklist", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByText("Already have a deck elsewhere?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import a deck" })).toHaveAttribute(
      "href",
      expect.stringContaining("import"),
    );
  });

  it("hides the card fan from the accessibility tree", () => {
    const { container } = render(<FirstRunChecklist />);
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
    expect(screen.queryByText("99")).toBeNull();
  });
});
```

`queryByText("99")` returning null is the assertion that the fan is hidden: `aria-hidden` removes
the node from the accessibility tree Testing Library queries, so a visible `99` inside it is
invisible to `getByText`. If that assertion fails, the fan is not hidden.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/home/first-run.test.tsx`
Expected: FAIL — `FirstRunChecklist` still requires `name`.

- [ ] **Step 3: Add the buttons entry to `UploadEntry`**

Inside the `mode === "dropzone"` branch, when `entry === "buttons"`, render this instead of the
dropzone — same handlers, same `pending` disabling, same `fileInputRef`:

```tsx
<div className="flex flex-col gap-[8px] sm:flex-row">
  <PrimaryButton
    type="button"
    disabled={pending}
    onClick={() => fileInputRef.current?.click()}
    className="h-[44px] sm:h-[32px]"
  >
    {refreshCopy.firstRun.uploadCsv}
  </PrimaryButton>
  <GhostButton
    type="button"
    disabled={pending}
    onClick={() => setMode("paste")}
    className="h-[44px] sm:h-[32px]"
  >
    {refreshCopy.firstRun.pasteList}
  </GhostButton>
</div>
```

The hidden `<input type="file">` and the paste panel are unchanged and shared by both entries.
The desktop-only *Paste a list instead* link at `upload-entry.tsx:232-239` renders only when
`entry === "dropzone"` — with the buttons entry it is a second control for the same thing.

Read `GhostButton` / `PrimaryButton` before writing this: if either already fixes its height, pass
the size the way that component expects rather than fighting it with a class.

- [ ] **Step 4: Write the checklist**

Container: `p-[26px_28px_0]` for the header, then a `flex-auto flex-col gap-[12px]` body at
`p-[20px_28px_26px]`, over the shipped radial accent wash — keep the existing
`radial-gradient(640px 340px at 40% -40px, …)` background exactly; it is already token-based.

- Kicker `refreshCopy.firstRun.step(1, 3)` in mono 10px, `0.18em`, uppercase, `--fg-faint`,
  `mb-[7px]`. It replaces the shipped `Three steps to your first recommendations.` subhead, which
  is deleted — the kicker says the same thing in four words and the copy file has no string for
  the sentence.
- `<h1>` `refreshCopy.firstRun.heading` in display 700, 27px desktop / 23px phone.
- **The `Crown` goes.** The card fan is the brand moment now, and two brand marks stacked above one
  heading is one too many. Grep for other `Crown tone="page"` users before deleting the import;
  the component itself stays.
- **Step 1 card**: `--surface-raised`, `1px solid var(--accent)`, 14px radius, `p-[18px]` desktop
  as a `gap-[18px]` row (fan left, text right, `items-center`); phone `p-[18px_16px]` as a centred
  column, `gap-[12px]`, `text-center`, with the two buttons full-width and stacked. One element
  with responsive classes, not two subtrees.
  - Title `step1Title` in display 600 19px; body `step1Body` at 13px `--fg-body`, `leading-[1.6]`
    — and `step1BodyShort` on phone, which is the copy file's own phone variant, chosen with a
    `hidden sm:inline` / `sm:hidden` pair on the two strings.
  - Then `<UploadEntry entry="buttons" currentCardCount={0} onPreview={…} />` via `ReplaceFlow`.
    `ReplaceFlow` owns the preview→confirm half and must keep owning it; thread `entry` through it
    as a pass-through prop rather than reaching past it.
- **Steps 2 and 3**: `--surface-rail`, `1px solid var(--border-subtle)`, 14px radius,
  `p-[15px_18px]` desktop / `p-[14px_15px] min-h-[56px]` phone, `flex items-center gap-[14px]`.
  A 22×22 6px-radius numeral chip on a `--border` hairline in mono 11px `--fg-disabled`; a text
  column of the title in display 600 16px `--fg-muted` over `step2Locked` / `step3Locked` at
  12.5px `--fg-disabled`; and a 12×14 padlock outline at `--border-strong`, `flex-none`, right.
  **The opacity-0.55 wrapper the shipped file uses goes** — the frame states the locked colours
  directly, and stacking an opacity over them makes the contrast unpredictable per theme.
- **Import footer**: `mt-auto pt-[12px] border-t border-[--border-subtle]`,
  `flex items-center gap-[10px]`: `importPrompt` in mono 11px `--fg-faint`, then `Import a deck`
  as a 32px hairline link. On phone the prompt is dropped and the link is a full-width 44px
  hairline — mock line 705 draws exactly that, and the prompt is a desktop nicety, not the route.
- Confirm the import destination against the shipped `ImportDeckButton` before writing the href.

- [ ] **Step 5: Dim the locked nav**

In `nav.tsx`, the `isLocked` branches in both `NavRail` and `TabBar` resolve their colour to
`var(--fg-disabled)`. Add the padlock under the rail's divider: a 34×1 `--border-subtle` rule with
`my-[8px]`, then the same 14×16 padlock outline at `--fg-disabled`. Every locked item keeps
`refreshCopy.firstRun.lockedItemAria(label)` as its accessible name — the reason must be reachable,
and a dimmed inert glyph with no name is a dead end for anyone not looking at it.

`shellCopy.firstRun.lockedHint` loses its only caller here. Grep it; if nothing else reads it,
delete the key.

- [ ] **Step 6: Run the tests**

Run: `pnpm test src/components/home/first-run.test.tsx src/components/collection`
Expected: PASS — 6 new tests, and every shipped `UploadEntry` test still green (the default entry
is unchanged, which is the point of the default).

- [ ] **Step 7: Commit**

```bash
git add src/components/home/first-run.tsx src/components/home/first-run.test.tsx \
        src/components/collection/upload-entry.tsx \
        src/components/collection/replace-flow.tsx src/components/shell/nav.tsx
git commit -m "feat(home): restyle first run and say what each locked step waits for"
```

---

## Task 19: Conformance — the four surfaces we are not redesigning

**Files:**
- Modify: `src/components/ui/button.tsx` (add one exported constant)
- Modify: `src/components/commanders/coverage-sort.tsx:136`
- Modify: `src/components/commanders/sort-menu.tsx:142-143`
- Modify: `src/components/commanders/facet-strip.tsx:104`
- Modify: `src/components/commanders/search-field.tsx:39`
- Modify: `src/components/commanders/detail.tsx:223-241`, `:461-472`
- Modify: `src/components/decks/builder-spine.tsx:451-509`
- Test: `src/components/ui/button.test.tsx`, `src/components/decks/builder-spine.test.tsx`,
  and the shipped suites for every file above

**Interfaces:**
- Consumes: `HAIRLINE` (added in step A below), `StatusPillBadge` and `statusPillStyle`
  (Task 9), `statusPill()` (`src/lib/decks/status.ts`, shipped), the bone `PRIMARY`
  (Task 5).
- Produces: `export const HAIRLINE: string` from `src/components/ui/button.tsx` — the
  desktop geometry of the 32px hairline pill, as a class string callers merge.

### What this task is, and what it is not

The handoff's conformance table is four rows (`README.md:71-76`). Three of them are geometry
and one is a status pill:

| Surface | Change |
|---|---|
| Commander detail | Chips and EDHREC Synergy untouched, full sections retained. `Order` and category controls take the 32px hairline pill. Rail replaces the page's back chrome. |
| Commanders list | Every figure stays. Search moves in with the filters, filtering goes live with Clear, no token query. |
| Builder | Unchanged. Tuning withdrawn. Buttons to 32px hairline, one filled primary. Header status pill uses the six values. |
| Card detail | No change beyond inherited button and field styles. |

**Ruling A — "buttons to 32px hairline" means the controls that sit in a surface's own
chrome, not every button the surface can reach.** The builder alone renders buttons from
`import-entry.tsx`, `create-picker.tsx`, `game-log-form.tsx`, `export-dialog.tsx`,
`resolution-expander.tsx` and eight more. None of those is drawn in this handoff; they are
flows and dialogs the builder launches, each with its own shipped design table. Conforming
them on the strength of a one-line table row would be a redesign of thirteen surfaces
nobody reviewed. This task conforms the **persistent page chrome**: the toolbar and header
controls that are on screen when the surface loads. Everything else inherits the bone
`PRIMARY` from Task 5 and nothing more.

**Ruling B — the phone height does not move.** The 32px figure is a desktop figure. Every
control listed below is already `h-[38px]` or `min-h-[44px]` below `sm`/`md`, which is the
touch floor; taking a phone control to 32px would fail the target size the rest of this
feature holds to. Only the desktop branch of each responsive pair changes, 30px → 32px.

**Ruling C — "Tuning withdrawn" is a no-op here.** The Tuning panel was drawn in the *first*
pass and cut before this handoff shipped; it does not exist in `src/`. Grep confirms it
(`grep -ri "tuning" src/components/decks/` returns nothing). The row is a note to the
builder not to look for it, not a deletion to perform. Do not confuse it with deck tuning
(#10), which is a separate, planned, unstarted feature.

**Ruling D — the Commanders-list row is already true, so this task asserts it rather than
building it.** Search already lives in the filter bar (`search-field.tsx`, whose header
says "Narrows the list in place: it does not navigate"), filtering is already live, and
there is no token query. The only change on that surface is the shared 32px height. Verify
with a test rather than a rewrite.

### Step A: The hairline constant

- [ ] **Step A1: Write the failing test**

```tsx
// src/components/ui/button.test.tsx — append to the existing describe block
  it("states the hairline geometry once, for the desktop branch only", () => {
    expect(HAIRLINE).toContain("sm:h-[32px]");
    expect(HAIRLINE).toContain("sm:px-[14px]");
    expect(HAIRLINE).toContain("sm:text-[12.5px]");
    // No unprefixed height: the phone keeps whatever touch height its caller set.
    expect(HAIRLINE).not.toMatch(/(^|\s)h-\[/);
  });
```

Add `HAIRLINE` to the file's existing import from `./button`.

- [ ] **Step A2: Run it to see it fail**

Run: `pnpm test src/components/ui/button.test.tsx`
Expected: FAIL — `HAIRLINE` is not exported.

- [ ] **Step A3: Add the constant**

```tsx
// src/components/ui/button.tsx — after GHOST
// README.md:29-31 of design_handoff_the99_refresh: "a 32px hairline pill
// (--border-strong, 12.5px label, 14px side padding)". Prefixed at sm: because
// the figure is a desktop figure — below it every control here is at its touch
// height, and 32px would put it under the target floor.
export const HAIRLINE = "sm:h-[32px] sm:px-[14px] sm:text-[12.5px]";
```

It is a class string, not a variant: the five callers below are not all
`GhostButton` — two are hand-rolled `<button>`s with a menu contract, and one is a
`SearchField` container. A shared constant they each merge conforms them without pulling
three unrelated components through one primitive.

- [ ] **Step A4: Run it to see it pass**

Run: `pnpm test src/components/ui/button.test.tsx`
Expected: PASS.

### Step B: Commander detail

- [ ] **Step B1: The `Order` trigger**

`coverage-sort.tsx:136` reads `isDesktop ? "h-[30px]" : "h-[38px] w-full"`. The trigger
also sets `px-[12px] text-[12px]` unconditionally at line 133. Replace both:

```tsx
        className={[
          "font-mono inline-flex items-center cursor-pointer rounded-[8px] gap-[8px]",
          "bg-[color:var(--surface-sunken)] border border-[color:var(--border-strong)]",
          "text-[color:var(--fg)]",
          isDesktop ? "h-[32px] px-[14px] text-[12.5px]" : "h-[38px] w-full px-[12px] text-[12px]",
        ].join(" ")}
```

`isDesktop` here is a JS boolean, not a media query, so this file spells the two branches
out rather than using `HAIRLINE`. That is the existing shape of the component; do not
convert it to responsive classes in this task — it renders a menu whose position depends
on the same boolean, and the conversion is a separate change with its own review.

- [ ] **Step B2: The back chrome**

Delete the mobile back chevron (`detail.tsx:223-241`, the `<Link href="/commanders">` with
the absolute 30×30 circle) and the desktop back link (`:461-472`, `‹ Back to rankings`).
Delete the now-unused `Link` import if nothing else in the file uses it — grep before
deleting; the file may link elsewhere.

The rail and the tab bar are the route back, on both breakpoints, and after PR B they are
present on this page. Two ways back to the same list, one of which is a 30px glyph over
card art, is the duplication the refresh's chrome removes.

**This deletes an `aria-label`, so check the a11y story.** `Commanders` in the tab bar
is a link with a visible text label and an active state; the chevron's `aria-label="Back
to rankings"` is not carrying anything the nav does not. No replacement is needed.

- [ ] **Step B3: Run the surface's tests**

Run: `pnpm test src/components/commanders/detail.test.tsx src/components/commanders/coverage-sort.test.tsx`
Expected: FAIL on any test asserting the back link. Delete those assertions — the control
is gone by design, and a test that outlives its subject is the thing that makes the next
deletion look risky. Do not weaken them into `queryBy…` null checks either; just remove
them.

- [ ] **Step B4: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/button.test.tsx \
        src/components/commanders/coverage-sort.tsx \
        src/components/commanders/detail.tsx src/components/commanders/detail.test.tsx \
        src/components/commanders/coverage-sort.test.tsx
git commit -m "refactor(commanders): take detail's controls to the hairline pill and drop its back chrome"
```

### Step C: Commanders list — assert, then conform the height

- [ ] **Step C1: Write the test that pins the shipped behaviour**

The handoff's row for this surface describes what is already true, and the value of a test
here is that the next person to read the row does not go looking for work to do.

```tsx
// src/components/commanders/commanders-view.test.tsx — append
  it("narrows in place: typing in search neither navigates nor writes a query", async () => {
    const push = vi.fn();
    const replace = vi.fn();
    renderView({ push, replace }); // the file's existing harness
    await userEvent.type(screen.getByLabelText(planeCopy.search.inputAria), "kran");
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
```

Use whichever router-mock helper the file already sets up — do not add a second mocking
style. If `renderView` does not take those spies, read the file's existing mock of
`next/navigation` and assert on it directly.

- [ ] **Step C2: Run it**

Run: `pnpm test src/components/commanders/commanders-view.test.tsx`
Expected: PASS on the first run. **This is the one step in this plan whose test is
expected to pass immediately** — it is a characterisation test, not a TDD cycle. If it
fails, the surface does not do what the handoff says it does, and that is a finding to
raise before changing anything.

- [ ] **Step C3: Conform the three control heights**

Three files, desktop branch only, 30 → 32:

```tsx
// src/components/commanders/sort-menu.tsx:142-143
          "gap-[7px] h-[38px] text-[11.5px]",
          "sm:gap-[8px] sm:h-[32px] sm:text-[12.5px] sm:px-[14px]",

// src/components/commanders/facet-strip.tsx:104
            className="shrink-0 md:shrink flex items-center gap-[5px] md:gap-[6px] font-mono cursor-pointer h-8 md:h-[32px]"

// src/components/commanders/search-field.tsx:39
      containerClassName="h-[38px] gap-[7px] px-[10px] flex-1 min-w-0 sm:h-[32px] sm:gap-[8px] sm:flex-none sm:w-[280px]"
```

The search field takes the height and nothing else: its 16px phone font-size is the iOS
zoom floor (#101, stated in that file's own comment) and its `sm:text-[12.5px]` is already
within half a pixel of the hairline label. Do not touch the padding — it holds a leading
caption and a trailing clear button, and 14px sides would push the input under 240px.

`facet-strip.tsx` uses `md:` where the other two use `sm:`. Leave that alone; matching the
breakpoints is a separate change and this task must not move a control at a width nobody
reviewed.

- [ ] **Step C4: Run the surface**

Run: `pnpm test src/components/commanders`
Expected: PASS. Any failure will be a test asserting `h-[30px]`; update the literal.

### Step D: Builder — one filled primary, and the status pill

- [ ] **Step D1: Write the failing test**

```tsx
// src/components/decks/builder-spine.test.tsx — append
  it("names the deck's status with the shared pill", () => {
    renderSpine({ status: "To buy" }); // the file's existing harness, plus the new prop
    expect(screen.getByText("To buy")).toBeInTheDocument();
  });

  it("draws exactly one filled button in the header", () => {
    const { container } = renderSpine({ status: "Building" });
    const filled = container.querySelectorAll("header .bg-\\[color\\:var\\(--fg\\)\\]");
    expect(filled).toHaveLength(1);
  });
```

The second test reads the class the bone `PRIMARY` sets in Task 5. It is deliberately
coupled to that constant: "one filled primary per screen" is the handoff's rule 2, and a
test that cannot see the fill cannot enforce it.

- [ ] **Step D2: Run it to see it fail**

Run: `pnpm test src/components/decks/builder-spine.test.tsx`
Expected: FAIL — `status` is not a prop, and the header renders two filled buttons only if
Export is active; on a `Building` deck it renders one, so the second test may pass by
accident. Read the failure rather than assuming: the first test failing is the signal.

- [ ] **Step D3: Thread the status in, and render it**

`builder-shell.tsx:174` already computes `serverStatus` from the **server** counts, with a
comment explaining why it must not be the optimistic ones. Pass that value down rather than
recomputing it in the spine:

```tsx
// src/components/decks/builder-spine.tsx — in BuilderSpineProps, after `counts`
  /**
   * The server status, computed once in builder-shell. A prop rather than a
   * second `statusPill()` call here: the shell's is keyed off the server counts
   * deliberately, and a spine that recomputed it from its own optimistic
   * `counts` would name a different status than the page it sits on.
   */
  status: StatusPill;

// and in the destructure at :238-246
  status,
```

```tsx
// src/components/decks/builder-shell.tsx — at the <BuilderSpine …> call site
        status={serverStatus}
```

Render it in the meta caption row, after the identity label, so the pill sits with the
other facts about the deck rather than competing with the name:

```tsx
        {/* §Spine — deck meta caption */}
        <div className="flex items-center gap-[8px] mt-[1px] md:mt-[2px]">
          <p className="font-mono text-[10px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
            {commander.name} · {identityLabel}
          </p>
          <StatusPillBadge status={status} />
        </div>
```

Import `StatusPillBadge` from `./status-pill` (Task 9) and `StatusPill` as a **type-only**
import from `../../lib/decks/status`. The type-only form matters: `status.ts` is pure, but
the habit is what keeps `read.ts` and its Drizzle client out of a `"use client"` bundle —
see that file's own opening comment.

- [ ] **Step D4: Take the two header buttons to the hairline**

`Update from a list` becomes hairline; `Export` stays the one filled primary and inherits
bone from Task 5.

```tsx
// builder-spine.tsx — the Update button
          <GhostButton
            href={`/decks/${deck.id}/import`}
            className="flex items-center font-mono text-[11px] px-[9px] py-[6px] min-h-[44px] md:min-h-0 md:font-sans md:h-[32px] md:px-[14px] md:py-0 md:text-[12.5px]"
          >
```

```tsx
// builder-spine.tsx — the disabled Export
          <button
            type="button"
            disabled
            className="hidden md:flex items-center gap-[6px] rounded-[8px] font-sans font-semibold h-[32px] px-[14px] text-[12.5px] text-[color:var(--fg-faint)] bg-transparent border border-[color:var(--border)]"
            style={{ cursor: "not-allowed" }}
          >
```

```tsx
// builder-spine.tsx — the active desktop Export
            <PrimaryButton
              onClick={onExport}
              className="hidden md:flex items-center gap-[6px] h-[32px] px-[14px] text-[12.5px]"
            >
```

The mobile Export link (`md:hidden`, mono 11px) is untouched — it is not a button at that
width, it is a text link with an icon, and the handoff draws no phone builder.

- [ ] **Step D5: Run the builder's suites**

Run: `pnpm test src/components/decks/builder-spine.test.tsx src/components/decks/builder-spine-over.test.tsx`
Expected: PASS. Then `pnpm test src/components/decks` — the shell's own tests render the
spine and will need the new required prop wherever they build props by hand. Add
`status="Building"` to those fixtures rather than making the prop optional: a default would
let a future call site render a status that is not the deck's.

- [ ] **Step D6: Commit**

```bash
git add src/components/commanders/sort-menu.tsx src/components/commanders/facet-strip.tsx \
        src/components/commanders/search-field.tsx \
        src/components/commanders/commanders-view.test.tsx \
        src/components/decks/builder-spine.tsx src/components/decks/builder-spine.test.tsx \
        src/components/decks/builder-shell.tsx
git commit -m "feat(decks): name the builder's status in its header and conform its controls"
```

### Step E: Card detail — verify, change nothing

- [ ] **Step E1: Read `src/components/cards/card-modal.tsx` and confirm the row**

"No change beyond inherited button and field styles." Inherited means Task 5's bone fill
and Task 1's copy module reach it without an edit here. Confirm by reading, not by
assuming: grep the file for `bg-accent`, `bg-[color:var(--accent)]` and any hand-rolled
button that does not go through `PrimaryButton`/`GhostButton`.

- [ ] **Step E2: If the grep finds a hand-rolled accent fill, stop**

Do not convert it in this task. A hand-rolled fill on card detail is a finding: it means a
surface the handoff says needs no change has a primary the handoff's rule 2 forbids, and it
is one line to fix but it is not one line to decide. Record it in the gap report and raise
it. If the grep is clean — which is the expected outcome — say so in the PR body and move
on.

- [ ] **Step E3: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: all green.

- [ ] **Step E4: Design review, then the PR**

Run the design-review skill over the four surfaces at both breakpoints — enumerate the
property table, verify against the rendered page, confirm. The properties in scope are
narrow (height, side padding, label size, border token, fill, and the pill's six colours),
which is what makes this PR reviewable at all: it touches nine files and changes one idea.

---

## Self-review

Run against `design/design_handoff_the99_refresh/` on 2026-09-07, after Task 19 was written.

### 1 · Spec coverage

| Handoff section | Tasks |
|---|---|
| `README.md` §Rulings 1–5 (scope, bone primary, colour-is-status, no tile CTA, one overflow) | Locked rulings block; Tasks 5, 9, 10 |
| `CHROME-rail-and-tabs.md` — 62px rail, 52px tab bar, four glyphs, locked states | 4, 5 |
| `refresh · copy strings.ts` | 1, plus `formatWhen` in 3 |
| Home — greeting and collection line | 14 |
| Home — Ready to build (two heroes, `N more scored X or better`) | 2, 15 |
| Home — Pick up where you left off | 6, 16 |
| Home — deck rail | 17 |
| Home — Commitments | 7, 8, 17 |
| Home — first run | 18 |
| Decks — tiles, statuses, overflow | 9, 10 |
| Decks — filter column, phone sheet, live filtering, Clear | 11, 12 |
| Decks — header, sort, zero and filtered-empty | 13 |
| `STATES-deck-statuses.md` — the six values as pill / bar / keyline | 9 |
| §Conformance — the four surfaces we are not redesigning | 19 |
| §Gaps 1–3 | Findings 5, 7 and the open-questions list in the PR body |

One handoff item is deliberately **not** built, and it is recorded above rather than silently
dropped: the **view toggle** in the Decks header (`CHROME-rail-and-tabs.md:83` — "Desktop, left
to right: view toggle, `Sort · …`, Import, New deck"). It is named in one clause of one line and
drawn nowhere, and its second state — a deck *row* rather than a tile — has no frame at any
breakpoint. A control whose alternate state cannot be reviewed cannot be built to a design
review, so the header ships with sort, Import and New deck, and the toggle is in the PR body as
an open question. Nothing else in the plan depends on it.

### 2 · Placeholder scan

No `TBD`, `TODO`, "implement later", "add appropriate error handling", or "similar to Task N"
appears in this document. Every code step carries the code. The three places that legitimately
say *read the file first* — Task 19 step C1's router mock, step E1's card-detail grep, and
Task 17's detail-line helper, which may be inline in Task 10's tile — each state what to look
for and what to do with either answer, which is the difference between a decision deferred to
the builder and a fact the builder has to fetch.

### 3 · Type consistency

Checked by grep across the whole document:

- `readySlice` / `ReadySlice` / `READY_COUNT` / `READY_SHOWN` — declared in Task 2, consumed
  in 14 and 15 under exactly those names.
- `loadShoppingRollup` returning `ShoppingRollup` — Task 7, consumed in 8, 14 and 17.
- `statusPillStyle` / `statusBarStyle` / `statusKeylineStyle` / `STATUS_TOKEN` /
  `StatusPillBadge` — Task 9. **One drift found and fixed during this review:** Task 17's
  rail consumed `statusBarStyle` for a flat 3px edge, which is the progress-fill helper and
  takes a `built` count the rail does not have. It now consumes `statusKeylineStyle`, which
  existed in Task 9's Produces list with no caller.
- `RAIL_ROWS` / `RAIL_ROWS_PHONE` — declared in Task 17's Produces block but referenced
  nowhere in its body, so the two-subtree split and the footer's per-breakpoint `n` were
  implicit. Both are now spelled out.
- `commitmentFigures` returning `Commitments` — Task 8, consumed in 14 and 17.
- `refreshCopy` — one module, Task 1; `home.fit` is `(score, outOf)` at both its declaration
  and its single call site in Task 15.
- `formatWhen` — Task 3, consumed in 10, 13 and 16.
- `HAIRLINE` — Task 19 only, and deliberately: the four un-redesigned surfaces are the only
  place a 32px desktop control appears, because Home and Decks are drawn control by control.

### 4 · What a reviewer should push back on

Three judgement calls are load-bearing and cheap to reverse if Hugh disagrees, so they are in
the PR body rather than buried here: the phone rail footer (an addition to the drawing), the
phone sort chips inside the filter sheet (locked ruling 6, also an addition), and the
`READY_COUNT = 9` threshold, which is inferred from the drawn frame's arithmetic and the copy
it replaces rather than stated anywhere.
