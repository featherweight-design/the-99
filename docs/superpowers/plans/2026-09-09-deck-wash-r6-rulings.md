# Deck Details Wash — R6 Rulings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the four rulings R6 makes against the deck-header bands that shipped in PR #473.

**Architecture:** Four independent changes, no shared state. One touches the `ArtWash` primitive's `cover` branch and is inherited by all four of its consumers; two touch the deck spines symmetrically at both breakpoints; one touches a copy key and its two call sites. Nothing here changes geometry — R6 states that explicitly.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Vitest + Testing Library (jsdom).

**Spec:** `design/design_handoff_the99_deck_details_wash/README.md` — the `## R6 — rulings against the shipped bands` section, plus the R6 `states` array in `The 99 - Deck Details Art Wash.dc.html`.

## Global Constraints

- **No geometry changes.** R6 says so in its opening line. `168 × 1.37 = 230px`, the flat-by-240px scrim and the zero-reflow rename ring all stand as built.
- **No hex literals in components.** Colour is `var(--*)`, or a token derived through `color-mix`. `src/lib/decks/status-style.ts` is the only place a status colour is chosen.
- **Copy lives in `src/lib/copy/`.** No user-facing or `aria-label` string is written inline in a component.
- **Mobile and desktop ship together.** Every spine change lands in both `spine-desktop.tsx` and `spine-mobile.tsx` in the same commit.
- **jsdom applies no CSS and ignores media queries** — both spines render simultaneously in tests. Query with `getAllBy*` where a duplicate is expected, or render one spine directly.
- Gate before every push: `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.

---

### Task 1: The cover band's ground is `var(--bg)` when there is no art

R6 ruling 1. `COVER_PLATE` is a loading device, not a ground — it exists so a slow image never flashes light ground behind itself, which is why it is darker than `--bg`. With no art there is nothing to load, and the cover scrim's final stop is literally `var(--bg)`, so a plate ground leaves the flat region darker than the card ground below the divider: a visible band edge exactly where the design says there is none.

The change is at the primitive, so all four `cover` consumers inherit it — `hero-commander.tsx`, `spine-mobile.tsx`, `deck-card.tsx`, `detail.tsx`. That is intended: the ruling is about the strategy, not about one surface.

**Files:**
- Modify: `src/components/ui/art-wash.tsx:226-231`
- Test: `src/components/ui/art-wash.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Write the failing test**

Add to `src/components/ui/art-wash.test.tsx`:

```tsx
// R6 ruling 1. The plate is a loading device: it is darker than `--bg` so a
// slow image never flashes light ground. With no art there is nothing to load,
// and the scrim's own final stop is `var(--bg)` — so a plate ground would leave
// the flat region darker than the card below the divider.
it("plates a pending crop but grounds an absent one in --bg", () => {
  const withArt = render(
    <ArtWash strategy="cover" labelEdge="top" artCropUri="/a.jpg" colorIdentity={["G"]} />,
  );
  // The inline style is read directly rather than through `toHaveStyle`: jsdom
  // parses declarations before the matcher sees them, and a `color-mix()` value
  // does not survive that round trip.
  expect((withArt.container.firstElementChild as HTMLElement).style.background).toBe(
    "color-mix(in srgb, var(--bg) 86%, black)",
  );

  const withoutArt = render(
    <ArtWash strategy="cover" labelEdge="top" artCropUri={null} colorIdentity={["G"]} />,
  );
  expect((withoutArt.container.firstElementChild as HTMLElement).style.background).toBe(
    "var(--bg)",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/ui/art-wash.test.tsx -t "plates a pending crop"`
Expected: FAIL — the absent-art case still reports the `color-mix` plate.

- [ ] **Step 3: Write the implementation**

In `src/components/ui/art-wash.tsx`, the `cover` return at line 226:

```tsx
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      // R6 ruling 1: the plate is a loading device, not a ground. With no art
      // there is nothing to load, and the scrim's final stop is `var(--bg)` —
      // plating an artless band would seam it against the card below.
      style={{ background: artCropUri ? COVER_PLATE : "var(--bg)" }}
    >
```

Then extend `COVER_PLATE`'s doc comment, which currently reads as though the plate is unconditional:

```ts
/** L1, the base plate: one step below the page ground, so a slow or missing
    image never flashes light. No token is darker than `--bg` and the handoff
    forbids adding one, so the plate derives from it and each theme gets its own
    value of the same rule. Applied only while there is a crop to load — an
    artless band grounds in `var(--bg)`, the scrim's own final stop, per R6
    ruling 1. `left-portrait` deliberately does not use this — those rows plate
    to the row's own ground, so the art fades into the row rather than into a
    darker patch of its own. */
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/components/ui/art-wash.test.tsx`
Expected: PASS, whole file.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/art-wash.tsx src/components/ui/art-wash.test.tsx
git commit -m "fix(ui): an artless cover band grounds in --bg, not the loading plate"
```

---

### Task 2: The over-99 inks take the status token

R6 ruling 3. Past 99 the deck's status is `Over`, whose bar is `var(--danger)` via `statusBarStyle`. The shipped header pairs that bar with a `var(--warning)` figure, so one state is painted in two different alarm colours. The figure takes the status token, derived rather than hardcoded.

Three spots per spine carry `var(--warning)`: the built figure, the `+N` delta, and the bold lead of the trim paragraph. R6's prose names the figure; its canvas draws the figure and the delta from one `builtInk` value and draws the trim paragraph flat. All three render only when the deck is over, so all three are the same one-state-two-colours defect and all three take the status token. Flag the trim lead in the PR body for Design to ratify — it is the one spot the canvas does not draw explicitly.

**Files:**
- Modify: `src/components/decks/spine-desktop.tsx:187`, `:197`, `:243`
- Modify: `src/components/decks/spine-mobile.tsx:205`, `:215`, `:242`
- Test: `src/components/decks/spine-desktop.test.tsx`, `src/components/decks/spine-mobile.test.tsx`

**Interfaces:**
- Consumes: `STATUS_TOKEN` from `src/lib/decks/status-style.ts` — `Record<StatusPill, string>`, values are token names including the leading dashes (`"--danger"`), so a call site writes `` `var(${STATUS_TOKEN[status]})` ``.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/decks/spine-desktop.test.tsx`:

```tsx
// R6 ruling 3. Past 99 the status is `Over`, whose bar is --danger. A --warning
// figure beside a --danger bar paints one state in two alarm colours, so every
// ink in the state reads the token the bar reads.
it("paints the over-99 inks in the status colour, not a second alarm colour", () => {
  const { container } = renderSpine(
    <SpineDesktop
      {...props}
      counts={{ built: 104, ownedCount: 100, toBuyCount: 4 }}
      status="Over"
    />,
  );
  const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
  expect(fill?.style.background).toBe("var(--danger)");
  // innerHTML, not textContent: an inline style is an attribute, so the rendered
  // text can never carry the token a surviving --warning would be written as.
  expect(container.innerHTML).not.toContain("var(--warning)");
  expect(screen.getByText("104")).toHaveStyle({ color: "var(--danger)" });
  expect(screen.getByText("+5")).toHaveStyle({ color: "var(--danger)" });
});
```

Add the same test to `src/components/decks/spine-mobile.test.tsx`, with `SpineMobile` in place of `SpineDesktop`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/decks/spine-desktop.test.tsx src/components/decks/spine-mobile.test.tsx -t "over-99 inks"`
Expected: FAIL — the figure reports `var(--warning)`.

- [ ] **Step 3: Write the implementation**

In both spines, import the token map beside the existing `statusBarStyle` import:

```ts
import { STATUS_TOKEN, statusBarStyle } from "../../lib/decks/status-style";
```

Then, near the top of each component's body, next to the existing `over` boolean:

```ts
// R6 ruling 3: one state, one colour. Past 99 the status is `Over`, so the
// figure, the delta and the trim lead each read the same token `statusBarStyle`
// gives the bar rather than a second alarm colour of their own.
const overInk = `var(${STATUS_TOKEN[status]})`;
```

Replace all three `var(--warning)` occurrences in each file with `overInk`. In `spine-desktop.tsx`:

```tsx
style={{ fontSize: 20, color: over ? overInk : "var(--fg)" }}
```
```tsx
style={{ fontSize: 13, marginLeft: 6, color: overInk }}
```
```tsx
<b className="font-semibold" style={{ color: overInk }}>
```

And in `spine-mobile.tsx`:

```tsx
style={{ fontSize: 14, color: over ? overInk : "var(--fg)" }}
```
```tsx
style={{ fontSize: 12, marginLeft: 4, color: overInk }}
```
```tsx
<b className="font-semibold" style={{ color: overInk }}>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/decks/spine-desktop.test.tsx src/components/decks/spine-mobile.test.tsx`
Expected: PASS, both files whole.

- [ ] **Step 5: Verify no `--warning` survives in either spine**

Run: `grep -n "var(--warning)" src/components/decks/spine-desktop.tsx src/components/decks/spine-mobile.tsx`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/decks/spine-desktop.tsx src/components/decks/spine-mobile.tsx \
        src/components/decks/spine-desktop.test.tsx src/components/decks/spine-mobile.test.tsx
git commit -m "fix(decks): the over-99 inks read the status token the bar reads"
```

---

### Task 3: A blur on an empty name reverts rather than sitting open

R6 ruling 2. Design closes its own open item 1 as *no undo affordance* — a rename is reversible in one tap, the pencil sits at the title, and no data is lost. The guard attached to that closure is that blur must not commit an invalid value, and that empty or unchanged **reverts**.

Unchanged already reverts. Empty already cannot commit — `commit` early-returns on `!canSave`, and `canSave` requires `trimmed.length > 0` — but it leaves the field open with an empty box, which is neither of the two states R6 names. Blur on empty should take the same path unchanged takes.

**Files:**
- Modify: `src/components/decks/use-deck-rename.ts:89-96`
- Test: `src/components/decks/use-deck-rename.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks rely on. `onBlur`'s signature is unchanged — `() => void`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/decks/use-deck-rename.test.tsx`:

```tsx
// R6 ruling 2. Blur must not commit an invalid value, and empty reverts rather
// than leaving an empty box open — the same exit `unchanged` already takes.
it("a blur on an empty name reverts and closes", async () => {
  const onDone = vi.fn();
  const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
  act(() => result.current.setValue("   "));
  await act(async () => result.current.onBlur());
  expect(renameDeck).not.toHaveBeenCalled();
  expect(result.current.value).toBe("Atraxa");
  expect(onDone).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/decks/use-deck-rename.test.tsx -t "empty name reverts"`
Expected: FAIL — `onDone` was not called and `value` is still `"   "`.

- [ ] **Step 3: Write the implementation**

In `src/components/decks/use-deck-rename.ts`, replace the `onBlur` callback:

```ts
  // A blur while the error is showing must not re-fire the request that failed:
  // the reader is looking at the message, and re-submitting on the way out would
  // replace it with a second identical failure they never asked for.
  //
  // Empty reverts rather than sitting open (R6 ruling 2). `commit` would refuse
  // it anyway — `canSave` requires a non-empty name — but refusing leaves an
  // empty box on screen, and the ruling names reverting as the exit for both
  // empty and unchanged.
  const onBlur = useCallback(() => {
    if (isPending || error) return;
    if (!changed || trimmed.length === 0) {
      cancel();
      return;
    }
    commit();
  }, [cancel, changed, commit, error, isPending, trimmed]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/decks/use-deck-rename.test.tsx`
Expected: PASS, whole file — including the existing `"a blur with no change closes without calling the action"`.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/use-deck-rename.ts src/components/decks/use-deck-rename.test.tsx
git commit -m "fix(decks): a blur on an empty deck name reverts instead of sitting open"
```

---

### Task 4: The rename trigger names the deck it renames

R6 ruling 4. PR #473 narrowed the accessible name from `Rename deck: ${deck.name}` to a bare `Rename deck`. The deck header is reachable from list contexts, so a screen-reader user tabbing to it cannot tell which deck they are about to rename. The name is already in the DOM beside it.

`renameCopy.triggerAria` becomes a function, matching `cardDetailCopy.triggerAria(name)` in `src/components/cards/card-detail-provider.tsx:18`, which is the established shape for this in the codebase.

**Files:**
- Modify: `src/lib/copy/decks-builder.ts:466`
- Modify: `src/components/decks/spine-desktop.tsx:150`
- Modify: `src/components/decks/spine-mobile.tsx:180`
- Test: `src/components/decks/spine-desktop.test.tsx`, `src/components/decks/spine-mobile.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `renameCopy.triggerAria: (name: string) => string`. Every existing reference to it as a bare string breaks at typecheck, which is how the call sites are found.

- [ ] **Step 1: Write the failing tests**

In `src/components/decks/spine-desktop.test.tsx` and `src/components/decks/spine-mobile.test.tsx`, replace every `{ name: "Rename deck" }` query with the interpolated form, and add one assertion. The fixture deck's name is `props.deck.name` from `src/components/decks/spine-fixtures.ts` — read it rather than retyping the string.

```tsx
// R6 ruling 4. The header is reachable from list contexts, so the label has to
// say which deck is about to be renamed.
it("names the deck in the rename trigger's accessible name", () => {
  renderSpine(<SpineDesktop {...props} />);
  expect(
    screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) }),
  ).toBeTruthy();
});
```

Import the copy at the top of each test file:

```tsx
import { renameCopy } from "../../lib/copy/decks-builder";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/decks/spine-desktop.test.tsx src/components/decks/spine-mobile.test.tsx`
Expected: FAIL — `renameCopy.triggerAria` is not callable.

- [ ] **Step 3: Write the implementation**

In `src/lib/copy/decks-builder.ts`:

```ts
export const renameCopy = {
  // Named, not bare: the deck header is reachable from list contexts, so a
  // screen-reader user tabbing to this needs to know which deck it renames.
  triggerAria: (name: string) => `Rename deck: ${name}`,
  fieldAria: "Deck name",
```

In `src/components/decks/spine-desktop.tsx:150` and `src/components/decks/spine-mobile.tsx:180`:

```tsx
aria-label={renameCopy.triggerAria(deck.name)}
```

- [ ] **Step 4: Run the tests and typecheck to verify they pass**

Run: `pnpm typecheck && pnpm test -- src/components/decks/`
Expected: PASS. Typecheck catches any call site still treating `triggerAria` as a string.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy/decks-builder.ts src/components/decks/spine-desktop.tsx \
        src/components/decks/spine-mobile.tsx src/components/decks/spine-desktop.test.tsx \
        src/components/decks/spine-mobile.test.tsx
git commit -m "fix(decks): the rename trigger names the deck it renames"
```

---

### Task 5: Full gate and the browser walk

**Files:**
- Run: `scripts/probe-deck-header.mjs`

**Interfaces:**
- Consumes: every change from Tasks 1–4.
- Produces: the evidence the PR body cites.

- [ ] **Step 1: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 2: Run the stub-DB build**

Run: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: green.

- [ ] **Step 3: Walk the real surface**

Run: `pnpm dev`, then `node scripts/probe-deck-header.mjs`

The probe signs in against the local Clerk dev instance and walks 390×844 and 1280×800. Confirm it reports 0 failures. The over-99 state is the one this plan changes and no fixture account owns a deck past 99 — walk it the way PR #473 did, by temporarily raising one row on a junk probe deck and restoring it immediately after, recording both edits in the commit message.

- [ ] **Step 4: Commit any probe changes and push**

```bash
git fetch origin && git rebase origin/main
git push -u origin feat/deck-wash-r6-rulings
```

---

## Self-Review

**Spec coverage.** R6 makes four rulings and ratifies two divergences. Ruling 1 is Task 1, ruling 2 is Task 3, ruling 3 is Task 2, ruling 4 is Task 4. Both ratified divergences (`min-height: 168`, the ambient-only identity gradient) describe what already ships — no task, by design. The dropped no-commander state removes a frame from the handoff and no code was ever written for it.

**Placeholder scan.** No TBDs. Every code step carries the literal code. Every test step carries the test body.

**Type consistency.** `STATUS_TOKEN` values carry their leading dashes, so Task 2 wraps them in `var(...)` — matching `statusBarStyle` in the same file and `deck-rail.tsx:66`. Task 4 changes `renameCopy.triggerAria` from `string` to `(name: string) => string`; the two call sites and the five test queries are the complete set, and typecheck proves it.
