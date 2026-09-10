# Printed Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the name printed on the printing the player actually owns — *Battle of Olympus*, not *World at War* — on every surface where they are looking at their own copy, plus the decklist export.

**Architecture:** `printings.flavor_name` already exists and is populated (#467, migration `0023`). One new derived field, `printedName`, is computed once in `aggregateCollection()` from the same `primaryPrinting()` the art already resolves through, so name and art can never disagree. Every surface reads that field. The deck route is the one place with real query work: `lib/decks/read.ts` is oracle-only and needs the collection's resolved printing, which it gets by reusing `selectCollectionRows` + `aggregateCollection` rather than reimplementing the precedence in SQL.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM on Neon Postgres, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-printed-name-design.md`

**Design handoff:** `design/design_handoff_the99_printed_name/` — READINESS **Green** (R2)

## Global Constraints

- **No migration.** `printings.flavorName` exists in the Drizzle schema and is populated on staging and production. Adding a column to a `select` is not a migration.
- **The control state is the regression risk.** A card whose printing prints no name of its own must render byte-identically to today on every surface, including no reserved height in the modal header. This is every card but a handful.
- **Comparison is exact string equality** against the oracle name. The printed name is used **verbatim** — no case folding, no suffix stripping, no normalisation.
- **Name and art come from the same printing.** The standing invariant is stated in `src/lib/collection/browse.ts:350-352`, the closing loop that sets `primarySetCode` and `imageUri` from one `primaryPrinting()` call. `printedName` is derived there too, from that same call.
- **A card the player does not own keeps its oracle name.** Locked decision 2. There is no printing in hand to print a name.
- **Rows and tiles: single line, end ellipsis, never a wrap and never a clamp.** Locked decision 3.
- **The full untruncated name is the accessible name, and it reaches a real `<button>`.** On every
  surface here that button is the `CardDetailTrigger`, whose `name` prop the provider composes the
  label from (`card-detail-provider.tsx:90`), so the full string goes there. **Never an
  `aria-label` on a caption `<span>`** — it satisfies a testing-library query and reaches no
  assistive technology, which is worse than not doing it. **Never a `title`** either: pointer-only
  recovery on a phone-first surface. The handoff's call 4 says "the row's `aria-label`"; the spec
  supersedes it and this is the wording to implement.
- **Keep `flex-auto` on the decklist row's name block.** Do not swap it for `flex:1`. `decklist-row.tsx:103-110` explains why in a committed comment, and every sibling has been `flex-none` since #354, which already delivers the design's stated outcome. No shrink-order work is needed on that row.
- **Copy externalises** to `src/lib/copy/card-surfaces.ts`. No user-visible string inline in a component.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/lib/collection/browse.ts` | `flavorName` on `BrowsePrinting` and `RawCollectionRow`; `printedName` on `BrowseCard`; `selectCollectionRows` widened to take many oracle ids | 1, 2 |
| `src/lib/collection/card-detail.ts` | `flavorName` on the unowned-card printing select; `printedName: null` on a catalog card | 2 |
| `src/lib/copy/card-surfaces.ts` | The one new string — the modal's `oracle` label | 3 |
| `src/components/cards/card-modal.tsx` | Printed name as title; the oracle line between title and type line | 3 |
| `src/components/collection/grid-view.tsx`, `rows-view.tsx` | String swap; the row's `title` removed | 4 |
| `src/lib/decks/grouping.ts` | `printedName` on `DeckDetailCard` (the type lives here, **not** in a `types.ts` — there is none) | 5 |
| `src/lib/decks/read.ts` | Resolve each deck card's printed name from the player's collection | 5 |
| `src/components/decks/decklist-row.tsx` | Printed name as the visible name and as the trigger's accessible name, at **both** render sites | 6 |
| `src/components/decks/deck-card-tile.tsx` | Printed name in the caption and on the trigger; `title` removed | 7 |
| `src/lib/decks/export-helpers.ts` | `N Name (SET) CN` on the decklist export; shopping list unchanged | 8 |
| `src/components/decks/export-dialog.tsx` | Pass set code and collector number through; preview matches | 8 |
| `src/components/decks/builder-shell.tsx:1085-1089` | Feed the export dialog the printed name and the printing fields | 8 |
| `scripts/probe-printed-name.mjs` | Browser proof at 320 / 390 / desktop, list and grid | 9 |

---

### Task 1: `flavorName` reaches `BrowsePrinting`

The column exists and no reader selects it. This task carries it from the database to the object every surface already holds, and changes no behaviour.

**Files:**
- Modify: `src/lib/collection/browse.ts` (type `BrowsePrinting` ~:15-31, type `RawCollectionRow` ~:171-209, `aggregateCollection` ~:264-280, `selectCollectionRows` ~:470-507)
- Modify: `src/lib/collection/card-detail.ts:169-181`
- Test: `src/lib/collection/browse.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `BrowsePrinting.flavorName: string | null`, `RawCollectionRow.flavorName: string | null`. Task 2 reads both.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/collection/browse.test.ts`. Find the existing `aggregateCollection` describe block and the row factory it already uses; if the factory does not take `flavorName`, add it there with a `null` default so every existing call site is unaffected.

```ts
it("carries a printing's flavor name onto the printing it belongs to", () => {
  const [card] = aggregateCollection([
    row({
      oracleId: "o1",
      name: "World at War",
      setCode: "sld",
      collectorNumber: "2208",
      flavorName: "Battle of Olympus",
    }),
  ]);
  expect(card.printings[0].flavorName).toBe("Battle of Olympus");
});

it("leaves flavorName null on an ordinary printing", () => {
  const [card] = aggregateCollection([
    row({ oracleId: "o1", name: "Cultivate", setCode: "m21", collectorNumber: "177" }),
  ]);
  expect(card.printings[0].flavorName).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/collection/browse.test.ts`
Expected: FAIL — `flavorName` is not a property of `BrowsePrinting`, so this is a type error before it is an assertion failure.

- [ ] **Step 3: Add the field to both types**

In `src/lib/collection/browse.ts`, add to `BrowsePrinting` immediately after `imageUri`:

```ts
  imageUri: string | null;
  /**
   * The name printed on THIS printing when it differs from the oracle card's —
   * `printings.flavor_name`, populated for Secret Lair and similar renames
   * (#467). Null on the overwhelming majority of printings, which print the
   * oracle name.
   */
  flavorName: string | null;
```

And to `RawCollectionRow`, after `cardImageUri`:

```ts
  /** From the exact printing owned — `printings.flavor_name`, or null. */
  flavorName: string | null;
```

- [ ] **Step 4: Select the column and carry it through the aggregate**

In `selectCollectionRows`, add to the `.select({...})` object beside `exactImageUri`:

```ts
      exactImageUri: exact.imageUri,
      flavorName: exact.flavorName,
```

The `exact` alias is the printing joined on `collection_items.scryfall_id` — the printing the player physically owns — which is the only one whose printed name is theirs to show.

In `aggregateCollection`, add to the `printing` literal:

```ts
    const printing: BrowsePrinting = {
      setCode,
      setName: r.setName,
      collectorNumber: r.collectorNumber,
      releasedAt: r.releasedAt,
      quantity: r.quantity,
      finishes: { [r.finish]: r.quantity },
      imageUri: resolveImageUri(r),
      flavorName: r.flavorName,
    };
```

In the same function, the branch that merges two finishes of one printing must not drop it. Beside the existing `seen.imageUri ??= printing.imageUri;` add:

```ts
      seen.flavorName ??= printing.flavorName;
```

Both finishes of one printing are the same printing, so this is a belt-and-braces coalesce identical in spirit to the image one already there.

- [ ] **Step 5: Select the column on the unowned-card path**

Three edits in `src/lib/collection/card-detail.ts`, all required — the first alone will not typecheck.

First, the `printingRows` select (~:170-176):

```ts
      imageUri: printings.imageUri,
      flavorName: printings.flavorName,
```

Second, `CatalogPrintingRow` (:34-41), the type that select flows into. Add after `imageUri`:

```ts
  imageUri: string | null;
  flavorName: string | null;
```

Third, `catalogCard`'s printing literal (:56-70), which carries a `satisfies BrowsePrinting` and so fails the moment the interface grows a field:

```ts
        imageUri: resolveImageUri({ ... }),
        flavorName: p.flavorName,
      } satisfies BrowsePrinting,
```

A card the player does not own still keeps its oracle name (locked decision 2), so this changes nothing visible — Task 2 Step 5 pins `printedName: null` on the card itself. It is here so `catalogCard()` builds a well-formed `BrowsePrinting` rather than one missing a field, and so the printing picker in the modal has the same shape on both paths.

- [ ] **Step 6: Fix every other place that constructs a `BrowsePrinting`**

Run: `pnpm typecheck`
Expected: errors in test fixtures and any other constructor of `BrowsePrinting` — notably `src/components/cards/card-modal.test.tsx:284` (`catalogPrinting`) and `src/components/cards/card-detail-provider.test.tsx`. Add `flavorName: null` to each. Do not add it as an optional field to dodge this — the compiler finding every construction site is the point.

- [ ] **Step 7: Run the suite**

Run: `pnpm test src/lib/collection/ src/components/cards/ && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/collection/browse.ts src/lib/collection/card-detail.ts src/lib/collection/browse.test.ts src/components/cards/card-modal.test.tsx src/components/cards/card-detail-provider.test.tsx
git commit -m "feat(printed name): carry flavor_name onto the printing it belongs to"
```

---

### Task 2: `printedName` on `BrowseCard`

One derived field, computed in the same loop that already picks the card's primary printing, so the name cannot disagree with the art.

**Files:**
- Modify: `src/lib/collection/browse.ts` (type `BrowseCard` ~:38-76, `aggregateCollection`'s closing loop ~:346-356, `catalogCard` in `card-detail.ts:49-111`)
- Test: `src/lib/collection/browse.test.ts`

**Interfaces:**
- Consumes: `BrowsePrinting.flavorName` from Task 1.
- Produces, all from `src/lib/collection/browse.ts`:
  - `BrowseCard.printedName: string | null` — the printing's own name when it differs from the oracle name, already compared. Tasks 3–8 read it.
  - `printedNameOf(card: Pick<BrowseCard, "name" | "printedName">): string` — the **whole** name string. The modal title and the export use this.
  - `printedFaceName(card: Pick<BrowseCard, "name" | "printedName">): string` — the **front face** of the printed name, or `card.name` untouched when there is no printed name. Rows and tiles use this. Tasks 4, 6, 7.

- [ ] **Step 1: Write the failing test**

```ts
describe("printedName", () => {
  it("is the resolved printing's flavor name when it differs from the oracle name", () => {
    const [card] = aggregateCollection([
      row({ oracleId: "o1", name: "World at War", setCode: "sld",
            collectorNumber: "2208", flavorName: "Battle of Olympus" }),
    ]);
    expect(card.printedName).toBe("Battle of Olympus");
    expect(printedNameOf(card)).toBe("Battle of Olympus");
  });

  it("is null when the printing prints the oracle name", () => {
    const [card] = aggregateCollection([
      row({ oracleId: "o1", name: "Cultivate", setCode: "m21", collectorNumber: "177" }),
    ]);
    expect(card.printedName).toBeNull();
    expect(printedNameOf(card)).toBe("Cultivate");
  });

  it("is null when the flavor name equals the oracle name exactly", () => {
    const [card] = aggregateCollection([
      row({ oracleId: "o1", name: "Cultivate", setCode: "m21",
            collectorNumber: "177", flavorName: "Cultivate" }),
    ]);
    expect(card.printedName).toBeNull();
  });

  it("compares exactly — a case difference is a different name", () => {
    const [card] = aggregateCollection([
      row({ oracleId: "o1", name: "Cultivate", setCode: "m21",
            collectorNumber: "177", flavorName: "CULTIVATE" }),
    ]);
    expect(card.printedName).toBe("CULTIVATE");
  });

  it("follows the art preference, not the first printing owned", () => {
    const [card] = aggregateCollection([
      row({ oracleId: "o1", name: "World at War", setCode: "m21",
            collectorNumber: "177", flavorName: null }),
      row({ oracleId: "o1", name: "World at War", setCode: "sld",
            collectorNumber: "2208", flavorName: "Battle of Olympus",
            preferredSetCode: "sld", preferredCollectorNumber: "2208" }),
    ]);
    expect(card.printedName).toBe("Battle of Olympus");
  });
});
```

The last test is the one that matters most: it proves the name rides the same tier-0 preference the art does. Note the row factory must apply `preferredSetCode` / `preferredCollectorNumber` to **every** row of an oracle, as the real query does — the preference is oracle-level. If the existing factory does not, set it on both rows.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/collection/browse.test.ts -t printedName`
Expected: FAIL — `printedName` is not a property of `BrowseCard`, and `printedNameOf` is not exported.

- [ ] **Step 3: Add the field and the accessor**

In `src/lib/collection/browse.ts`, add to `BrowseCard` immediately after `imageUri`:

```ts
  /**
   * The name printed on the resolved printing, when it differs from the oracle
   * name — otherwise null. Derived from the SAME `primaryPrinting()` call that
   * resolves `imageUri`, because a name that disagrees with the art on screen
   * is the failure this field exists to prevent.
   *
   * Null is the overwhelmingly common case and means "call this card by its
   * oracle name". Use `printedNameOf()` rather than testing this at each site.
   */
  printedName: string | null;
```

Beside `resolvedPrinting`, add:

```ts
/**
 * The name to show a player looking at their own copy: the printing's own name
 * where it has one, the oracle name otherwise. One place, so no surface has to
 * remember which way round the fallback goes.
 */
export function printedNameOf(card: Pick<BrowseCard, "name" | "printedName">): string {
  return card.printedName ?? card.name;
}

/**
 * The same name, cut to its front face — what a row or a tile shows.
 *
 * Scryfall's `flavor_name` is one string per printing and joins a two-faced
 * card's halves with ` // `, exactly as `cards.name` does, so a renamed modal
 * card arrives here as `Battle of Olympus // Aftermath`. A 93px tile caption
 * cannot hold that and locked decision 3 forbids the second line, so rows and
 * tiles take the front half and the modal keeps the whole string.
 *
 * The split is applied ONLY to a printed name. A card with none is returned
 * byte-identically, `//` and all: today's rows print the full oracle string and
 * the control state must not move.
 */
export function printedFaceName(card: Pick<BrowseCard, "name" | "printedName">): string {
  return card.printedName ? faceNames(card.printedName).front : card.name;
}
```

Import `faceNames` from `../cards/faces` — it already splits on ` // ` and returns the whole string as `front` when there is no separator, so a single-faced printed name passes through untouched.

The `Pick` is deliberate: Task 5's `DeckDetailCard` is not a `BrowseCard` and must be able to call both.

- [ ] **Step 3b: Test the face split**

```ts
it("shows a renamed two-faced card's front face on a row, and the whole string in full", () => {
  const card = { name: "Delver of Secrets // Insectile Aberration",
                 printedName: "Battle of Olympus // Aftermath" };
  expect(printedFaceName(card)).toBe("Battle of Olympus");
  expect(printedNameOf(card)).toBe("Battle of Olympus // Aftermath");
});

it("leaves an unrenamed two-faced card's row string exactly as it is today", () => {
  const card = { name: "Delver of Secrets // Insectile Aberration", printedName: null };
  expect(printedFaceName(card)).toBe("Delver of Secrets // Insectile Aberration");
});
```

The second is the control-state assertion for two-faced cards and is the one that must not be dropped.

- [ ] **Step 4: Compute it where the primary printing is already resolved**

In `aggregateCollection`'s closing `for (const card of byOracle.values())` loop, extend the existing `if (primary)` arm:

```ts
    const primary = primaryPrinting(card.printings, card.preferredPrinting);
    if (primary) {
      card.primarySetCode = primary.setCode;
      card.imageUri = primary.imageUri;
      // Exact equality, verbatim, per spec: a printing whose flavor name IS the
      // oracle name has not renamed anything, and normalising would silently
      // change which cards count as renamed.
      card.printedName =
        primary.flavorName !== null && primary.flavorName !== card.name
          ? primary.flavorName
          : null;
    }
```

Initialise it to `null` in the `byOracle.set(...)` literal beside `imageUri: null,`:

```ts
        imageUri: null,
        printedName: null,
```

- [ ] **Step 5: Hold the unowned card at its oracle name**

In `src/lib/collection/card-detail.ts`, in `catalogCard()`, set `printedName: null` on the returned card, beside the other card-level fields. Add the reason:

```ts
    // Locked decision 2: a card the player does not own keeps its oracle name.
    // There is no printing in hand to print one, and choosing among the
    // catalog's printings would assert a copy they do not have.
    printedName: null,
```

- [ ] **Step 6: Run the tests and the typechecker**

Run: `pnpm test src/lib/collection/ && pnpm typecheck`
Expected: PASS. `pnpm typecheck` will flag any other `BrowseCard` literal in test fixtures — add `printedName: null` to each.

- [ ] **Step 7: Commit**

```bash
git add src/lib/collection/browse.ts src/lib/collection/card-detail.ts src/lib/collection/browse.test.ts
git commit -m "feat(printed name): derive printedName from the printing the art comes from"
```

---

### Task 3: The modal header — printed name as title, oracle name beneath

**Files:**
- Modify: `src/lib/copy/card-surfaces.ts`
- Modify: `src/components/cards/card-modal.tsx:528-543`
- Test: `src/components/cards/card-modal.test.tsx`

**Interfaces:**
- Consumes: `BrowseCard.printedName`, `printedNameOf()` from Task 2.
- Produces: `printedNameCopy.oracleLabel` in `src/lib/copy/card-surfaces.ts`. Nothing else consumes it — rows and tiles carry no new string, because their accessible name comes from `CardDetailTrigger`'s existing `name` prop rather than a new label.

- [ ] **Step 1: Write the failing test**

Add to `src/components/cards/card-modal.test.tsx`. The file already has a `card()` factory — extend it to accept `printedName`, defaulting to `null`.

```ts
describe("the oracle-name line", () => {
  it("titles the modal with the printed name and glosses it with the oracle name", () => {
    render(<CardModal card={card({ name: "World at War", printedName: "Battle of Olympus" })} {...handlers} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Battle of Olympus");
    expect(screen.getByText("oracle")).toBeInTheDocument();
    expect(screen.getByText("World at War")).toBeInTheDocument();
  });

  it("renders no oracle line at all on an ordinary card", () => {
    render(<CardModal card={card({ name: "Cultivate", printedName: null })} {...handlers} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Cultivate");
    // Absent, not blank: no label, no placeholder, no reserved height.
    expect(screen.queryByText("oracle")).not.toBeInTheDocument();
  });

  it("keeps the title as the dialog's accessible name", () => {
    render(<CardModal card={card({ name: "World at War", printedName: "Battle of Olympus" })} {...handlers} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Battle of Olympus");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/cards/card-modal.test.tsx -t "oracle-name line"`
Expected: FAIL — the heading still reads "World at War" and no `oracle` label exists.

- [ ] **Step 3: Add the copy**

Append to `src/lib/copy/card-surfaces.ts`:

```ts
/**
 * The printed name (#467 follow-on). Two strings — everything else this feature
 * shows is an existing string re-sourced from the resolved printing.
 */
export const printedNameCopy = {
  /**
   * The modal header's oracle-name label. Mono, lowercase, 10.5px, --fg-faint.
   *
   * One word on purpose: the modal's meta grid already carries a `Set` field
   * naming the set and collector number, so the line does not have to explain
   * itself. Lowercase mono is the shipped field-label register (`no number ·
   * ×1`, `SLD · 2208`) — not the uppercase letterspaced register, which is
   * reserved for section labels.
   *
   * Never rendered when the printing prints the oracle name: the whole line is
   * absent in that case, label included.
   */
  oracleLabel: "oracle",
} as const;
```

- [ ] **Step 4: Render the title and the line**

In `src/components/cards/card-modal.tsx`, import `printedNameOf` from `../../lib/collection/browse` (the file already imports `resolvedPrinting` from there) and `printedNameCopy` from the copy module. Replace the header block at :528-543:

```tsx
              <div className={compactArt ? "min-w-0 hidden md:block" : "min-w-0"}>
                <h3
                  id="card-modal-title"
                  className="font-display font-bold text-[22px] md:text-[29px] m-0 leading-[1.15] md:leading-[1.1]"
                  style={{ color: "var(--fg)" }}
                >
                  {printedNameOf(card)}
                </h3>
                {/* The oracle name — absent, not blank, when the printing prints
                    its own name. A reserved empty line would spend 23px on every
                    ordinary card to make the ordinary case look incomplete. The
                    tighter gap above binds the two names into one unit; the
                    looser one below keeps the type line a separate fact. */}
                {card.printedName && (
                  <p
                    className="flex items-baseline gap-[6px] text-[13px] md:text-[13.5px] mt-[5px] md:mt-[6px] mb-0"
                    style={{ color: "var(--fg-body)" }}
                  >
                    <span
                      className="font-mono text-[10.5px]"
                      style={{ color: "var(--fg-faint)" }}
                    >
                      {printedNameCopy.oracleLabel}
                    </span>
                    {card.name}
                  </p>
                )}
                {/* Type line — §Card Type Line: 13/14px, --fg-muted, margin-top 4/6px.
                    10px above when the oracle line is present: the wider gap is
                    what keeps the type line from joining the name pair. */}
                <p
                  className={`text-[13px] md:text-[14px] ${
                    card.printedName ? "mt-[10px]" : "mt-[4px] md:mt-[6px]"
                  }`}
                  style={{ color: "var(--fg-muted)" }}
                >
                  {card.typeLine}
                </p>
              </div>
```

`aria-labelledby` is untouched — the printed name is the title and the title is the label.

- [ ] **Step 4b: The flip control names the printed faces too**

`card-modal.tsx:365` computes `const faces = faceNames(card.name);` and `onFlip` announces `twoFacedCopy.flippedAria(next ? faces.back : faces.front)`. A modal whose title reads *Battle of Olympus // Aftermath* and whose flip control announces *World at War* is the disagreement this whole feature exists to remove. Change the one line:

```ts
  // The faces of the name on screen, which is the printed one when the copy in
  // hand carries a printed name. The title above and this announcement must
  // name the same card.
  const faces = faceNames(printedNameOf(card));
```

Nothing else in the flip path changes: `isTwoFaced(card.layout)` still gates the control, so a `//` in a printed name cannot conjure a flip that the layout column does not sanction.

Add the assertion:

```ts
it("announces the printed face names when flipping a renamed two-faced card", () => {
  render(<CardModal card={card({
    name: "Delver of Secrets // Insectile Aberration",
    printedName: "Battle of Olympus // Aftermath",
    layout: "transform",
    backImageUri: "https://example.test/back.jpg",
  })} {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: /flip/i }));
  expect(screen.getByRole("status")).toHaveTextContent("Aftermath");
});
```

Match the existing flip test's selector for the control and the live region rather than the placeholders above if the file already has one — `twoFacedCopy` owns both strings.

- [ ] **Step 5: Run the tests**

Run: `pnpm test src/components/cards/card-modal.test.tsx`
Expected: PASS, including every pre-existing test — the control state must be unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/lib/copy/card-surfaces.ts src/components/cards/card-modal.tsx src/components/cards/card-modal.test.tsx
git commit -m "feat(printed name): the modal titles the card by its printing and glosses the oracle name"
```

---

### Task 4: The collection surfaces

The easy half. Both views already print the set code beside the name, so the printed name arrives next to the one fact that explains it.

**Files:**
- Modify: `src/components/collection/grid-view.tsx:88`
- Modify: `src/components/collection/rows-view.tsx` — `c.name` occurs at exactly **three** places, `:59`, `:91` and `:95`, and each is handled differently. `:95` is the displayed name and takes the printed one. `:91` is a `title` attribute and is **deleted outright** — the spec forbids a `title` on any of these surfaces, and left in place it would hover a stale oracle name over a printed one. `:59` is the trigger's `name` prop, which is the row's accessible name, and takes the printed name.
- Test: `src/components/collection/grid-view.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `printedFaceName()` from Task 2.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

```tsx
it("captions a tile with the name printed on the copy the player owns", () => {
  render(<GridView cards={[browseCard({ name: "World at War", printedName: "Battle of Olympus" })]} {...handlers} />);
  expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
  expect(screen.queryByText("World at War")).not.toBeInTheDocument();
});
```

Mirror it in the rows-view test file, and add there the assertion that the `title` is gone:

```tsx
it("carries no title attribute on a row", () => {
  const { container } = render(
    <RowsView cards={[browseCard({ name: "World at War", printedName: "Battle of Olympus" })]} {...handlers} />,
  );
  expect(container.querySelector("[title]")).toBeNull();
  expect(screen.getByRole("button", { name: /Battle of Olympus/ })).toBeInTheDocument();
});
```

Match each file's existing render harness and fixture factory rather than inventing one.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/collection/`
Expected: FAIL — the caption still reads "World at War".

- [ ] **Step 3: Swap the string**

In both files, import `printedFaceName` from `../../lib/collection/browse` and replace the displayed `{c.name}` with `{printedFaceName(c)}` — `grid-view.tsx:88` and `rows-view.tsx:95`, plus the `name={c.name}` trigger prop at `rows-view.tsx:59`. Delete `title={c.name}` at `rows-view.tsx:91`.

`/collection` lists only what the player owns, so locked decision 2's unowned case cannot occur on either surface by construction. Both captions stay single-line `truncate` — **no clamp is added**; see the spec's display rules.

Note for the reviewer: `collection/grid-view.tsx` carries no `TwoFacedMark`, so a front-face-only printed name is unsignposted there. Accepted in the spec's errata 3 — the set code beside it is the fact that explains the name.

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/components/collection/ && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/collection/grid-view.tsx src/components/collection/rows-view.tsx src/components/collection/grid-view.test.tsx src/components/collection/rows-view.test.tsx
git commit -m "feat(printed name): the collection names a card by the copy in the binder"
```

---

### Task 5: The deck route learns which printing the player owns

The one piece of real query work. `src/lib/decks/read.ts:196-220` selects oracle columns only — `resolvedPrinting()` has nothing to resolve on this route. Rather than reimplement the tier-0 preference in SQL, this task reuses the collection reader that already implements it.

**Files:**
- Modify: `src/lib/collection/browse.ts` — widen `selectCollectionRows`'s second parameter
- Modify: `src/lib/decks/read.ts:196-254`
- Modify: `src/lib/decks/grouping.ts` — where `DeckDetailCard` is declared. **There is no `src/lib/decks/types.ts`**; `read.ts:23-25` imports the type from `grouping.ts`.
- Test: `src/lib/collection/browse.test.ts`

**Interfaces:**
- Consumes: `printedNameOf()`, `BrowseCard.printedName` from Task 2.
- Produces: `DeckDetailCard.printedName: string | null`. Tasks 6, 7 and 8 read it.

- [ ] **Step 1: Widen `selectCollectionRows` to take many oracle ids**

It takes `oracleId?: string` today and is called with one or none. The deck page needs ~99.

```ts
export async function selectCollectionRows(
  userId: string,
  oracleId?: string | string[],
): Promise<RawCollectionRow[]> {
```

and in the `.where(...)`, replace the single-id arm:

```ts
    .where(and(
      eq(collectionItems.userId, userId),
      oracleId === undefined
        ? undefined
        : Array.isArray(oracleId)
          ? inArray(collectionItems.oracleId, oracleId)
          : eq(collectionItems.oracleId, oracleId),
    ));
```

Import `inArray` from `drizzle-orm` alongside the existing `and` / `eq` / `sql`. An empty array must not reach this — `inArray` with no values is a SQL error in some drivers and a full scan in others; Step 3 guards the call site.

The widening is caller-safe: the sole existing caller is `src/lib/collection/card-detail.ts:133`, which passes a single string, and the test that covers it mocks the function. `string | string[]` is a superset, so nothing else moves.

- [ ] **Step 2: Add the field to `DeckDetailCard`**

In `src/lib/decks/grouping.ts`, add to `DeckDetailCard` beside `imageUri`:

```ts
  /**
   * The name printed on the copy this player owns, when it differs from the
   * oracle name — otherwise null. Resolved through the collection's own
   * `primaryPrinting()`, so the deck row calls a card what the player's copy
   * calls it. Always null on a card they do not own: there is no printing in
   * hand to print a name.
   */
  printedName: string | null;
```

- [ ] **Step 3: Resolve the names in `getDeckDetail`**

`ownedIds` is already computed for the availability rollup at `read.ts:233`. Reuse it — an unowned card takes the oracle name by locked decision 2, so it needs no lookup at all.

Insert immediately after the `availability` await:

```ts
  // The printed name comes from the player's own copy, which this route does not
  // otherwise read: the deck query is oracle-level. Reusing the collection reader
  // rather than joining `printings` here is deliberate — the name must follow the
  // SAME printing the art preference picks, and `aggregateCollection` is where
  // that precedence lives. One extra query for the whole decklist.
  //
  // Swallowed like the availability rollup above, and for the same reason: the
  // decklist is the deck. A failed lookup leaves every row on its oracle name,
  // which is exactly today's rendering.
  const resolved = new Map<
    string,
    { printedName: string | null; setCode: string; collectorNumber: string }
  >();
  if (ownedIds.length > 0) {
    const owned = await selectCollectionRows(userId, ownedIds)
      .then(aggregateCollection)
      .catch(() => []);
    for (const c of owned) {
      const p = resolvedPrinting(c);
      if (p) {
        resolved.set(c.oracleId, {
          printedName: c.printedName,
          setCode: p.setCode,
          collectorNumber: p.collectorNumber,
        });
      }
    }
  }
```

Import `selectCollectionRows`, `aggregateCollection` and `resolvedPrinting` from `../collection/browse` at the top of `read.ts`.

The set code and collector number ride along because Task 8's export needs the printing named, and `resolvedPrinting()` is the only place the tier-0 preference is applied — resolving it twice, once for the name and once for the printing, is how the two come to disagree.

Then in the `detailCards` map, beside `imageUri: row.imageUri,`:

```ts
    printedName: row.owned ? (resolved.get(row.oracleId)?.printedName ?? null) : null,
    printedSetCode: row.owned ? (resolved.get(row.oracleId)?.setCode ?? null) : null,
    printedCollectorNumber:
      row.owned ? (resolved.get(row.oracleId)?.collectorNumber ?? null) : null,
```

Add the two printing fields to `DeckDetailCard` in Step 2 alongside `printedName`, both `string | null`, documented as "the printing this player's copy is, resolved through the same preference the art follows; null on a card they do not own."

The `row.owned` guard is belt-and-braces — an unowned card has no collection row and so cannot be in the map — but it states locked decision 2 in the code rather than leaving it to a coincidence of the query.

**Cost, stated rather than discovered later:** `selectCollectionRows` is not `cache()`d, carries three joins, and selects `oracleText` and `keywords` this route throws away. For ~99 oracle ids that is one extra collection-shaped query per deck load. Accepted for correctness — it is the only implementation of the art preference, and a second one would be the bug. If it measures badly on a real deck, the fix is a narrower select on this path, **not** a second precedence in SQL.

- [ ] **Step 4: Write the test for the widened reader**

`getDeckDetail` is raw SQL no unit test in this repository reaches (same pattern as `loadAvailability`), so the unit test covers the widened selector's shape, and Task 9's browser probe covers the route.

```ts
it("aggregates a printed name for each of several oracle ids", () => {
  const cards = aggregateCollection([
    row({ oracleId: "o1", name: "World at War", setCode: "sld",
          collectorNumber: "2208", flavorName: "Battle of Olympus" }),
    row({ oracleId: "o2", name: "Cultivate", setCode: "m21", collectorNumber: "177" }),
  ]);
  const byOracle = new Map(cards.map((c) => [c.oracleId, c.printedName]));
  expect(byOracle.get("o1")).toBe("Battle of Olympus");
  expect(byOracle.get("o2")).toBeNull();
});
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test src/lib/ && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/collection/browse.ts src/lib/decks/read.ts src/lib/decks/grouping.ts src/lib/collection/browse.test.ts
git commit -m "feat(printed name): the deck route resolves the printing the player holds"
```

---

### Task 6: The decklist row

No shrink-order work. `flex-auto` plus `flex-none` siblings has been the row's shape since #354 and already delivers the design's call 2. #467 has no truncation branch on this file to delete.

**The row has no `aria-label` and is not getting one.** Comments at `decklist-row.tsx:356` and `:423` say so explicitly, and they are load-bearing: the row's accessible name is the `CardDetailTrigger`'s, composed from its `name` prop. That prop is where the full untruncated printed name goes. **There are two render sites** — `:268-277` (the desktop/phone name-and-count block) and `:316-325` (the other branch) — and both set `name={card.name}` and render `{card.name}`. Change all four.

**Files:**
- Modify: `src/components/decks/decklist-row.tsx:268-277` and `:316-325`
- Test: `src/components/decks/decklist-row.test.tsx`

**Interfaces:**
- Consumes: `DeckDetailCard.printedName` (Task 5), `printedNameOf()` and `printedFaceName()` (Task 2).
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

```tsx
it("names the card by the printing the player owns", () => {
  render(<DecklistRow card={deckCard({ name: "World at War", printedName: "Battle of Olympus" })} {...handlers} />);
  expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
});

it("carries the full printed name in the accessible name, and never a title", () => {
  const { container } = render(
    <DecklistRow card={deckCard({ name: "World at War", printedName: "Battle of Olympus" })} {...handlers} />,
  );
  expect(screen.getByRole("button", { name: /Battle of Olympus/ })).toBeInTheDocument();
  expect(container.querySelector("[title]")).toBeNull();
});

it("leaves an ordinary card on its oracle name", () => {
  render(<DecklistRow card={deckCard({ name: "Cultivate", printedName: null })} {...handlers} />);
  expect(screen.getByText("Cultivate")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/decks/decklist-row.test.tsx`
Expected: FAIL — the row renders "World at War".

- [ ] **Step 3: Swap the displayed name at both render sites**

Import `printedNameOf` and `printedFaceName` from `../../lib/collection/browse`. Compute both once near the top of the component:

```ts
  // Two strings, because they answer different questions. The visible one is a
  // front face and may clip; the accessible one is whole and never does. The
  // modal — one tap away on this very name — is the recovery path for the clip.
  const displayName = printedFaceName(card);
  const fullName = printedNameOf(card);
```

At **both** `CardDetailTrigger` sites, `:268-277` and `:316-325`:

```tsx
              <CardDetailTrigger
                oracleId={card.oracleId}
                name={fullName}
                siblings={siblings}
                className={nameTextClass}
                describedBy={describedBy}
                style={{ ... }}
              >
                {displayName}
              </CardDetailTrigger>
```

`name` is the trigger's accessible name (see `card-detail-provider.tsx:90`, which composes `cardDetailCopy.triggerAria(name)`), so the full printed name lands there without a single new string. Leave the `TwoFacedMark` beside it untouched: it is driven by `card.layout`, not by a `//` in the name, which is precisely why a front-face-only caption is still signposted.

`AutoTag`'s `name={card.name}` at `:420` and the undo control's `aria-label` at `:504` stay on the oracle name — they are prose about an action, not a naming of the copy.

Leave `nameBlockClass` exactly as it is. Leave `usePreviewRow(card.imageUri)` exactly as it is: the hover preview's art is out of scope for this feature, and changing it here would be an unreviewed visual change.

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/components/decks/ && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/decklist-row.tsx src/components/decks/decklist-row.test.tsx
git commit -m "feat(printed name): the decklist row calls a card what the copy in the deck calls it"
```

---

### Task 7: The deck card tile — printed name, `title` removed, the full name onto the trigger

The tile caption is the tightest block on the feature at 93–94px. It stays single-line, and the `✕` stays on the caption line: the design's preferred corner is occupied (spec errata 1), and moving it is a card-surfaces amendment outside this feature.

**Files:**
- Modify: `src/components/decks/deck-card-tile.tsx:133-141` (the trigger) and `:184-191` (the caption)
- Test: `src/components/decks/deck-card-tile.test.tsx`

**Interfaces:**
- Consumes: `DeckDetailCard.printedName`, `printedNameOf()`, `printedFaceName()`.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

```tsx
it("captions the tile with the printed name and drops the tooltip", () => {
  const { container } = render(
    <DeckCardTile card={deckCard({ name: "World at War", printedName: "Battle of Olympus" })} {...handlers} />,
  );
  expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
  // A `title` is pointer-only recovery on a phone-first surface, and the
  // trigger's accessible name already carries the full string properly.
  expect(container.querySelector("[title]")).toBeNull();
});

it("carries the full printed name on the trigger at one copy", () => {
  render(
    <DeckCardTile card={deckCard({ name: "World at War", printedName: "Battle of Olympus", quantity: 1 })} {...handlers} />,
  );
  expect(screen.getByRole("button", { name: /Battle of Olympus/ })).toBeInTheDocument();
});

it("carries it at more than one copy too, where the label is composed", () => {
  render(
    <DeckCardTile card={deckCard({ name: "World at War", printedName: "Battle of Olympus", quantity: 2 })} {...handlers} />,
  );
  expect(screen.getByRole("button", { name: /Battle of Olympus/ })).toBeInTheDocument();
});
```

Both quantities are asserted deliberately: the tile's `ariaLabel` prop is set **only** when `quantity > 1` (`:136-141`), and at one copy `card-detail-provider.tsx:90` falls back to composing from the `name` prop. Fixing the ternary alone would leave every single-copy tile on the oracle name — the common case.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/decks/deck-card-tile.test.tsx`
Expected: FAIL — the caption reads "World at War" and still carries `title`.

- [ ] **Step 3: Change the caption**

Import `printedNameOf` and `printedFaceName`, and compute both at the top of the component exactly as Task 6 does:

```ts
  const displayName = printedFaceName(card);
  const fullName = printedNameOf(card);
```

Replace the caption span at :184-191:

```tsx
          <span
            className="flex-auto min-w-0 truncate text-[12px] md:text-[13px] font-semibold"
            style={{ color: "var(--fg)" }}
          >
            {displayName}
          </span>
```

`title` goes and **nothing replaces it on this element**. An `aria-label` on a plain `<span>` is not exposed to assistive technology — testing-library would still find it and give a false pass. The full name's home is the trigger, which is a `<button>` and is the tile's largest target.

The caption stays `truncate` — **no clamp.** Two lines makes caption height depend on the data, and a grid whose captions are sometimes one line and sometimes two is either ragged or padded to the worst case on every tile; equal-height tiles are what makes a grid scannable. `suggestion-tile.tsx:296` has a two-line clamp and is not a precedent to copy — it is a different surface.

Then the `CardDetailTrigger` at `:133-141`. Both the `name` prop and the composed `ariaLabel` must move, or single-copy tiles keep the oracle name:

```tsx
          <CardDetailTrigger
            oracleId={card.oracleId}
            name={fullName}
            siblings={siblings}
            ariaLabel={
              card.quantity > 1
                ? `${cardDetailCopy.triggerAria(fullName)}, ${cardTileCopy.copiesAria(card.quantity)}`
                : undefined
            }
```

The `undefined` branch stays `undefined` on purpose — it is what makes the provider compose the label from `name`, which now carries the printed name.

The `✕` stays on the caption line (spec errata 1) and the `TwoFacedMark` at `:191` is untouched.

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/components/decks/ && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/deck-card-tile.tsx src/components/decks/deck-card-tile.test.tsx
git commit -m "feat(printed name): the deck tile names the copy, and drops its tooltip"
```

---

### Task 8: The decklist export names the printing

`1 Battle of Olympus (SLD) 2208` — the Moxfield/Archidekt line format, which is what the player's own Moxfield export already shows. **The shopping list is deliberately not changed:** #330 ruled that we recommend an oracle card and let the player pick the printing on Mana Pool's grid, and pinning `(SLD) 2208` on a list of cards they are about to buy would force the most expensive printing of every card.

**Files:**
- Modify: `src/lib/decks/export-helpers.ts:15-31`
- Modify: `src/components/decks/export-dialog.tsx:31, 58, 69`
- Modify: `src/components/decks/builder-shell.tsx:1085-1089` — the **only** place `ExportDialog` is rendered. `src/app/decks/[id]/page.tsx` does not mention it and is not touched by this task.
- Test: `src/lib/decks/export-helpers.test.ts`

**Interfaces:**
- Consumes: `DeckDetailCard.printedName`, `.printedSetCode`, `.printedCollectorNumber` (all built in Task 5).
- Produces: `buildDecklistText` accepts `cards: { name: string; quantity: number; setCode?: string; collectorNumber?: string }[]`, and `bodyLine(c)` exported from the same module.

- [ ] **Step 1: Write the failing test**

```ts
it("names the printing on each body line", () => {
  const text = buildDecklistText({
    commanderName: "Atraxa, Praetors' Voice",
    partnerName: null,
    cards: [{ name: "Battle of Olympus", quantity: 1, setCode: "SLD", collectorNumber: "2208" }],
  });
  expect(text).toContain("1 Battle of Olympus (SLD) 2208");
});

it("falls back to a bare line when the printing is unknown", () => {
  const text = buildDecklistText({
    commanderName: "Atraxa, Praetors' Voice",
    partnerName: null,
    cards: [{ name: "Cultivate", quantity: 2 }],
  });
  expect(text).toContain("2 Cultivate");
  expect(text).not.toContain("()");
});

it("leaves the shopping list on bare names", () => {
  expect(buildShoppingText([{ name: "Cultivate" }])).toBe("Cultivate");
});
```

Keep the existing round-trip test through `buildDeckImport` green — if it does not already cover the new line shape, extend it to.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/decks/export-helpers.test.ts`
Expected: FAIL — the line reads `1 Battle of Olympus`.

- [ ] **Step 3: Emit the printing**

```ts
export function buildDecklistText(args: {
  commanderName: string;
  /** The second commander, or null for the single-commander deck most decks are. */
  partnerName: string | null;
  /**
   * Body cards — both commanders excluded. `setCode` and `collectorNumber` name
   * the printing the player owns and are omitted on a card they do not: the
   * export describes the cards in the deck, and there is no printing to name
   * for one that is not in the binder.
   */
  cards: { name: string; quantity: number; setCode?: string; collectorNumber?: string }[];
}): string {
  const { commanderName, partnerName, cards } = args;
  const commanders = [commanderName, ...(partnerName ? [partnerName] : [])];
  return [
    "Commander",
    ...commanders.map((n) => `1 ${n}`),
    "",
    "Deck",
    ...cards.map((c) => {
      const printing = c.setCode && c.collectorNumber ? ` (${c.setCode}) ${c.collectorNumber}` : "";
      return `${c.quantity} ${c.name}${printing}`;
    }),
  ].join("\n");
}
```

Leave `buildShoppingText` untouched, and add the reason above it:

```ts
/**
 * Assemble the shopping list text: names only, one per line.
 *
 * Deliberately NOT the decklist's `Name (SET) CN` form. #330 ruled that we
 * recommend an oracle card and let the player choose the printing on Mana
 * Pool's all-printings grid — `manapoolCardUrl` is keyed on the oracle name for
 * the same reason. Pinning a printing on a list of cards the player is about to
 * buy would quote them the priciest one.
 */
```

- [ ] **Step 4: Feed the dialog the printing**

Widen `ExportDialogProps.decklistCards` to `{ name: string; quantity: number; setCode?: string; collectorNumber?: string }[]`. The preview at :69 composes its own lines and must match the exported text, so give it the same composition — export the `bodyLine(c)` helper from `export-helpers.ts` and use it in both places rather than writing the format twice.

```ts
/** One body line: `2 Cultivate`, or `1 Battle of Olympus (SLD) 2208` when the printing is known. */
export function bodyLine(c: {
  name: string;
  quantity: number;
  setCode?: string;
  collectorNumber?: string;
}): string {
  const printing = c.setCode && c.collectorNumber ? ` (${c.setCode}) ${c.collectorNumber}` : "";
  return `${c.quantity} ${c.name}${printing}`;
}
```

`buildDecklistText`'s map from Step 3 becomes `...cards.map(bodyLine)`.

At `src/components/decks/builder-shell.tsx:1089`, the `decklistCards` map currently reads `cards.map((c) => ({ name: c.name, quantity: c.quantity }))`. **Swapping the name is the point of this task and is easy to miss** — threading the printing through while still exporting the oracle name would print `1 World at War (SLD) 2208`, a line naming a printing whose face reads something else. Import `printedNameOf` and replace it with:

```tsx
              decklistCards={cards.map((c) => ({
                // The whole printed string, not the front face: an export is
                // read by another deckbuilder, which wants the full name, and
                // has no width to run out of.
                name: printedNameOf(c),
                quantity: c.quantity,
                setCode: c.printedSetCode ?? undefined,
                collectorNumber: c.printedCollectorNumber ?? undefined,
              }))}
```

The `?? undefined` is what makes an unowned card fall back to a bare `N Name` line — there is no printing in hand to name.

**Shopping export unchanged.** Do not touch `shoppingCards` or `manapoolDeckText` — the block immediately below carries a committed comment explaining why that list is built from the Shopping filter's own predicate, and this task must not disturb it.

- [ ] **Step 5: Run the tests**

Run: `pnpm test src/lib/decks/ src/components/decks/ && pnpm typecheck`
Expected: PASS, including the `buildDeckImport` round-trip.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/export-helpers.ts src/lib/decks/export-helpers.test.ts src/components/decks/export-dialog.tsx src/components/decks/builder-shell.tsx
git commit -m "feat(printed name): the decklist export names the printing it exports"
```

---

### Task 9: Prove it in a browser

A probe script is the only proof a visual ruling shipped. Follow the shape of the existing `scripts/probe-*.mjs` files and the local Clerk sign-in they use.

**Files:**
- Create: `scripts/probe-printed-name.mjs`
- Modify: `package.json` (a `probe:printed-name` script, matching the existing probe entries)

**Interfaces:**
- Consumes: the running app.
- Produces: a pass/fail report.

- [ ] **Step 1: Read `scripts/probe-flavor-name.mjs` first — the fixture already exists**

#467 shipped that probe, and its header comment carries the exact local-dev setup this one needs: `flavor_name` is null on a fresh local database, and the SQL to plant one is

```sql
update printings set flavor_name = 'Freya, Queen of the Valkyries' where ...
```

Use that card and that statement rather than inventing a Secret Lair fixture — the two probes then prove matching and display against one row. Read the file end to end and reuse its Clerk sign-in helper verbatim: localhost runs Clerk's dev instance and only `window.Clerk` plus a `+clerk_test` code will sign in.

Substitute `Freya, Queen of the Valkyries` for `Battle of Olympus` throughout Step 2's assertions, and the printing's real set code and collector number for `(SLD) 2208`.

- [ ] **Step 2: Write the probe**

It must assert, on a `local-dev` deck containing a Secret Lair printing:

1. At 320, 390 and desktop width, in **list** view: the row shows the printed name, and its accessible name contains the full printed name.
2. In **grid** view: the tile caption shows the printed name, the tile has **no** `title` attribute anywhere, and the caption is one line high.
3. Opening the modal from that row: the heading is the printed name and an `oracle` label plus the oracle name follow it.
4. **The control state:** a card with no printed name renders no `oracle` label in its modal and no extra header height — measure the header's bounding box against a printed-name card and assert the 23px difference lands only on the renamed one.
5. The export dialog's decklist tab contains `(SLD) 2208` on the renamed line, and the shopping tab contains no parentheses at all.

Anchor every assertion to structure — a role, a label, a `data-testid` — never to a pixel coordinate. Expect the probe to be wrong before the code is: when it fails, check the probe first.

- [ ] **Step 3: Run it**

Run: `pnpm dev` in one shell, then `pnpm probe:printed-name`
Expected: every check passes. Note the fixture constraint — the local-dev fixture owns everything, so build the deck by import if no Secret Lair printing is already in one.

- [ ] **Step 4: Commit**

```bash
git add scripts/probe-printed-name.mjs package.json
git commit -m "test(printed name): probe the printed name on every surface it reaches"
```

---

### Task 10: Full gate and PR

- [ ] **Step 1: Run the whole gate**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git fetch origin && git rebase origin/main
```

Expected: all green. If the rebase pulls in changes to any surface this plan touched, re-run the probe before pushing.

- [ ] **Step 2: Walk the surface yourself**

Load `/decks/[id]` in a browser at phone and desktop width, in both views, and open the modal. A passing probe is necessary, not sufficient — this feature is a visual claim about names, and the walk is what confirms the claim reads.

- [ ] **Step 3: Push and open the PR**

Body names the four locked decisions, the R2 Green verdict, and the two things this plan deliberately did not do: the `✕` did not move off the deck tile's caption line (its corner is occupied — spec errata 1), and the shopping list was not given printings (#330's ruling).

- [ ] **Step 4: Request Copilot review**

Per the policy in `~/.claude/CLAUDE.md` — request after opening and after every fix push, verify the request registered rather than trusting the 200, and merge only on the stated bar.

---

## Self-Review

**Spec coverage.** Locked 1 → Task 2 (derived from the one `primaryPrinting()` call the art comes from). Locked 2 → Tasks 2, 5. Locked 3 → Tasks 4, 6, 7 (single line, no clamp). Locked 4 → Task 3. Rows and tiles → 6, 7. Modal → 3. Collection → 4. **Two-faced cards → Task 2's `printedFaceName()` plus Task 3's Step 4b:** Scryfall's `flavor_name` is one string per printing and joins the halves with ` // ` exactly as `cards.name` does, so `faceNames` splits it; rows and tiles take the front half, the modal title and the export take the whole string, and the flip announcement is moved onto the printed faces so it cannot name a different card than the title above it. Exports → 8. Data and plumbing → 1, 2, 5. Errata 1 → Task 7 takes call 3's fallback and leaves the `✕` on the caption line. Errata 2, 3 → noted in Tasks 7 and 4. Errata 4 → stated in Task 6's preamble. Errata 5 → the copy comment in Task 3. Testing → 9, plus the control-state assertions in Tasks 2, 3, 4, 6.

**Placeholder scan.** No TBDs. Every file reference names a line range that was read in the tree at the time of writing, including the three the first draft got wrong: `DeckDetailCard` is in `grouping.ts` and there is no `src/lib/decks/types.ts`; `ExportDialog` is rendered from `builder-shell.tsx:1085`, not from the route; and the decklist row has no `aria-label` to extend, by a decision its own comments record.

**Type consistency.** `flavorName: string | null` on `BrowsePrinting`, `RawCollectionRow` and `CatalogPrintingRow` (Task 1). `printedName: string | null` on `BrowseCard` (Task 2) and `DeckDetailCard` (Task 5), which also gains `printedSetCode` and `printedCollectorNumber`, both `string | null`. `printedNameOf()` and `printedFaceName()` both take `Pick<BrowseCard, "name" | "printedName">`, so a `DeckDetailCard` satisfies each without a cast — and both are exported from `src/lib/collection/browse.ts`, the single import site for every consumer. `bodyLine()` is exported from `export-helpers.ts` and used by both `buildDecklistText` and the dialog's preview, so the format exists once.

**The one rule the surfaces share:** the *visible* string is `printedFaceName()` and the *accessible* string is `printedNameOf()`, and the accessible one always reaches a real `<button>` — the `CardDetailTrigger`'s `name` prop — never an `aria-label` on a `<span>`.
