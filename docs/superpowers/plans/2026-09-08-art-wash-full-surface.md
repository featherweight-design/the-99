# Art Wash — full surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the parts of the art wash amendment that were never built — the band/divider
split, top-anchored labels, band-derived portrait geometry, ink over art, and the missing
subtitle elements — so the four surfaces match the handoff rather than only the wash's gradient
layers matching it.

**Architecture:** Each surface stops rendering `<ArtWash>` across its whole root and instead
wraps it in a band element of exactly the handoff's height. Below that band sits a `1px` divider
and a footer on flat ground. The `left-portrait` wash also states the band height on its own
root, so the sharp portrait's `background-size: auto 100%` resolves to the band by construction
rather than by a call site remembering to constrain it — README decision 8, and what the current
`absolute inset-0` breaks.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Vitest + Testing Library (jsdom).

**Spec:** `design/design_handoff_the99_art_wash/README.md` (updated 2026-09-08 with the
Ratifications table), with `The 99 - Art Wash Readability v2.dc.html` as the canvas.
Property table: `docs/superpowers/design-tables/art-wash.md`.

## Global Constraints

- **No hex in `.ts`/`.tsx`.** `src/lib/theme/no-hex.test.ts` scans every source file for a
  6-digit hex and for brand `rgba()` triples. Colour is `var(--token)` or `color-mix(...)`.
  The CSS keyword `black` is not a hex and passes.
- **The handoff's hexes are Palette A reference values, not values to ship.** The mapping used
  throughout: L1 `#0E0C09` → one step below `var(--bg)`; divider `#2A241D` → `var(--border)`;
  ground `#1A160F` → `var(--surface-inset)`; chip-on-art `#14110E` + `1px #3A3229` →
  `var(--bg)` + `var(--border-strong)`; title `#F4EFE3` → `var(--fg)`; subtitle `#C6B79A` →
  `var(--fg-body)`.
- **One shared `<ArtWash>`.** README: "Divergent per-surface scrims are exactly how this drifts
  back to the reported bug." No task adds a scrim at a call site.
- **HELD FOR DESIGN — do not touch:** type scale, font weights, font families, pip sizing and
  rings, the synergy fill colour, the Build button's fill, Home's section headings, the rec
  row's lack of a card frame, and the deck grid's columns. The v2 canvas draws all of these
  differently from what shipped in #437/#438, and the README's opening line still says "Nothing
  else on Decks, Commanders or Home is redesigned." That conflict is open with Design. **Move
  elements; do not restyle them.** Keep existing padding values when an element moves, unless a
  step below states a new one.
- **Decision 3 (Ink) IS in scope**, because it is the readability amendment itself: ink over art
  gets `text-shadow: 0 1px 3px rgba(0,0,0,.6)`, and chips over art get an opaque plate plus a
  `1px var(--border-strong)` hairline. The resume row is the stated exception — no text-shadow,
  because its type starts clear of the portrait at the 116px inset.
- **jsdom cannot resolve `var()`.** `toHaveStyle({ borderTop: "1px solid var(--border)" })`
  **fails** — jest-dom resolves through `getComputedStyle`, which returns empty for an
  unresolved custom property. Assert `el.style.borderTop` directly. For the same reason, a test
  that reads `.style.X` only passes if the component sets that property via the inline `style`
  prop; a Tailwind arbitrary-value class returns `""`.
- **Mobile and desktop ship together.** The canvas draws no mobile frame at all, so mobile keeps
  its current arrangement and inherits only the structural rules: same px band, a divider, and
  nothing that belongs below the divider rendering over art.
- Every task ends green on `pnpm typecheck && pnpm lint && pnpm test`.

---

## File Structure

**Modified**

- `src/lib/recs/recommend.ts` + `src/lib/recs/store.ts` — project the already-queried `typeLine`
  onto `CommanderListItem` through **both** projections.
- `src/components/ui/art-wash.tsx` — the `cover` plate derives a ground darker than `var(--bg)`;
  the `left-portrait` root states its band height. Exports `INK_SHADOW`.
- `src/components/decks/deck-card.tsx` — labels to the top of the band, status chip to
  bottom-left, commander name as the band subtitle, divider on the footer.
- `src/components/home/hero-commander.tsx` — band/divider/footer split; boxed fit chip at
  bottom-right; pool label and both buttons below the divider.
- `src/components/commanders/rec-card.tsx` — 148px band holds rank, name, pips, type line and
  the fit chip; everything else moves below a divider onto flat ground.
- `src/components/commanders/discovery-row.tsx` — the same split, so it stops inheriting the
  over-scale. Its own chrome is untouched.
- `src/components/home/resume-decks.tsx` — the commander name as the row's subtitle.

**Created**

- `src/components/ui/art-wash-band.test.tsx` — the band-geometry regression test.

---

### Task 1: `typeLine` reaches the commander list item

The rec row's subtitle is a type line the handoff draws and the payload does not carry. The
column is already selected and dropped at the projection — **twice**. `RankedCommander` already
carries it (`src/lib/recs/score.ts:32`), so the ranking path is a one-liner; the stored-scores
path in `store.ts` needs the column added.

**Files:**
- Modify: `src/lib/recs/recommend.ts`, `src/lib/recs/store.ts`
- Test: `src/lib/recs/recommend.test.ts`
- Also modify (exhaustive literals that will fail typecheck or `toEqual`):
  `src/lib/recs/recommend.test.ts:143`, `src/components/commanders/rec-card.test.tsx:14`,
  `src/lib/recs/free-ranking.test.ts:92`, `src/lib/recs/free-ranking-wiring.test.ts:57`,
  `src/lib/recs/free-delta.test.ts:5`

**Interfaces:**
- Produces: `CommanderListItem.typeLine: string` — consumed by Tasks 5 and 6.

- [ ] **Step 1: Write the failing test**

`recommend.test.ts:141` already builds a list item through `finalizeRecommendations`; follow
that path rather than calling the projection directly, and use the file's own `stubScore`
helper (`recommend.test.ts:16`), which is what supplies `slug`.

```ts
it("carries the type line through to the list item", () => {
  const [item] = finalizeRecommendations(
    [{ ...stubScore("Atraxa, Praetors' Voice", 74), typeLine: "Legendary Creature — Phyrexian Angel Horror" }],
    0,
    0,
  ).results;
  expect(item.typeLine).toBe("Legendary Creature — Phyrexian Angel Horror");
});
```

Match the real `finalizeRecommendations` argument list at `recommend.ts:119` — copy it from the
existing call at `recommend.test.ts:141` rather than from this snippet.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm vitest run src/lib/recs/recommend.test.ts
```

Expected: fail — `typeLine` is `undefined` on the projected item.

- [ ] **Step 3: Add the field to both projections**

1. `recommend.ts` — add `typeLine: string;` to the `CommanderListItem` interface beside `name`,
   and `typeLine: r.typeLine,` to the projection at `:67` beside `name: r.name`.
2. `store.ts` — add `typeLine: string` to `ScoreRowWithCard` (`:22-40`), add
   `typeLine: cards.typeLine,` to the select at `:184-187`, and add `typeLine: row.typeLine,`
   to `rowToListItem` (`:62`).

- [ ] **Step 4: Fix the exhaustive literals, then green**

`recommend.test.ts:143` is a `toEqual` listing every field — add `typeLine` to it. Four more
files build `CommanderListItem` literals that will now fail typecheck; add the field to each.

```bash
pnpm vitest run src/lib/recs/ src/components/commanders/ && pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/ src/components/commanders/rec-card.test.tsx
git commit -m "feat(recs): carry the commander type line onto the list item"
```

---

### Task 2: The cover wash's base plate sits below `--bg`

README decision 2 fixes L1 at `#0E0C09`. The `cover` root uses `bg-[color:var(--bg)]`
(`art-wash.tsx:118`), which in Low Sun is `#14110E` — the handoff's *chip-on-art* colour, one
step lighter than the plate. No token in `globals.css` is darker than `--bg`, and the README
forbids introducing one, so the plate derives from it.

**This applies to `cover` only.** The `left-portrait` root's `var(${p.ground})`
(`art-wash.tsx:76`) is deliberate and stays: gap 3 of the earlier report established that the
canvas resolves those rows' plate and scrim terminus to the row's *own* ground, so the art fades
into the row rather than into a darker patch of its own. Note that in the step's comment so the
asymmetry reads as a decision rather than an oversight.

**Files:**
- Modify: `src/components/ui/art-wash.tsx`
- Test: `src/components/ui/art-wash.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("plates the cover wash below the page ground, not at it", () => {
  const { container } = render(
    <ArtWash strategy="cover" artCropUri="https://example.test/a.jpg" colorIdentity={["R"]} />,
  );
  const plate = container.firstElementChild as HTMLElement;
  expect(plate.style.background).toContain("color-mix");
  expect(plate.style.background).toContain("black");
});
```

`art-wash.test.tsx:28-32` compares the two roots' `className` strings; converting the plate from
a class to an inline style changes that string, so re-read that test and update it if it asserts
on `bg-[color:var(--bg)]`.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm vitest run src/components/ui/art-wash.test.tsx
```

Expected: fail — `.style.background` is `""`, because the plate is a Tailwind class.

- [ ] **Step 3: Derive the plate**

Add a module constant and move the `cover` plate off its class onto an inline style:

```tsx
// README decision 2 fixes L1 at #0E0C09, one step below the page ground so a
// slow or missing image never flashes light. No token is darker than --bg —
// the README forbids adding one — so the plate derives from it and each theme
// gets its own value of the same rule. `left-portrait` is deliberately not
// this: those rows plate to the row's own ground so the art fades into the
// row rather than into a darker patch of its own.
const PLATE = "color-mix(in srgb, var(--bg) 86%, black)";
```

Drop `bg-[color:var(--bg)]` from the root at `:118` and add `style={{ background: PLATE }}`.
Leave every gradient, stop, alpha, mask and opacity untouched — all of them verified as matching
and must stay matching.

- [ ] **Step 4: Green, including the contrast proof**

```bash
pnpm vitest run src/components/ui/art-wash.test.tsx src/lib/theme/wash-contrast.test.ts src/lib/theme/no-hex.test.ts
```

`wash-contrast.test.ts` composites the brightest pixel art can contain against each theme; a
darker plate can only help it, but it must still be run.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/art-wash.tsx src/components/ui/art-wash.test.tsx
git commit -m "fix(art-wash): plate the cover wash one step below the page ground"
```

---

### Task 3: The `left-portrait` root states its band height

This is the fix for the visible bug. The wash is rendered `absolute inset-0` of a row root whose
only height constraint is `min-h-[148px]`, and the sharp layer inside is `absolute inset-y-0
left-0` with `background-size: auto 100%` (`art-wash.tsx:91-97`). `100%` therefore resolves to
the *rendered row height* — on a desktop rec row that runs past 300px, so the 626×457 crop
scales to ~411px wide and is then clipped by the fixed `width: 203px`. Only the left half of the
art survives, and the mask's 58% edge and the scrim's 118/203/264px stops no longer land on
anything in the image.

The wash's root is the sharp layer's containing block, so stating the band height there fixes
the derivation at the component rather than at five call sites. Tasks 6 and 7 also wrap the wash
in a band element — that wrapper is what holds the data zone apart from the art, and it sets the
same value, so the two are consistent rather than double-constraining.

**Files:**
- Create: `src/components/ui/art-wash-band.test.tsx`
- Modify: `src/components/ui/art-wash.tsx`

**Interfaces:**
- Produces: `<ArtWash strategy="left-portrait" band={148}>` renders a root of height `148px`
  regardless of its parent's height. Tasks 6–8 rely on this.

- [ ] **Step 1: Write the failing test**

```tsx
// jsdom computes no layout, so this asserts the declaration rather than the
// rendered box: the root must state the band height itself, which is exactly
// what stops `auto 100%` on the sharp layer resolving against a taller row.
it.each([148, 72] as const)("states its own %ipx band, not its parent's height", (band) => {
  const { container } = render(
    <div style={{ height: 400 }}>
      <ArtWash strategy="left-portrait" band={band} artCropUri="https://example.test/a.jpg" colorIdentity={["G"]} />
    </div>,
  );
  const root = container.firstElementChild!.firstElementChild as HTMLElement;
  expect(root.style.height).toBe(`${band}px`);
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm vitest run src/components/ui/art-wash-band.test.tsx
```

Expected: fail — the root is `absolute inset-0` with no height.

- [ ] **Step 3: Give the root its band**

At `art-wash.tsx:74-77`, change:

```tsx
className="pointer-events-none absolute inset-0 overflow-hidden"
style={{ background: `var(${p.ground})` }}
```

to:

```tsx
// README decision 8: the portrait's extent derives from band height in px.
// The root therefore declares the band rather than stretching to the row —
// the sharp layer's `auto 100%` resolves against this box, so a taller row
// can no longer over-scale the crop and clip it at the fixed portrait width.
className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
style={{ background: `var(${p.ground})`, height: `${props.band}px` }}
```

`props.band`, not a bare `band` — the destructure at `:67` takes only `artCropUri` and
`colorIdentity`. Leave the `cover` strategy alone: its parent is an `aspect-[2.2/1]` box, so
`inset-0` already resolves to the band.

- [ ] **Step 4: Green**

```bash
pnpm vitest run src/components/ui/ && pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/art-wash.tsx src/components/ui/art-wash-band.test.tsx
git commit -m "fix(art-wash): derive the portrait from band height, not row height"
```

---

### Task 4: The deck tile splits into band, divider and footer

README decision 4: "The wash owns exactly one band. Below a `1px #2A241D` divider, everything
sits on `#1A160F`." In the wash: deck name, subtitle, status chip, overflow. Below: card count,
completion bar, last-played. The surfaces table adds "labels top, status chip bottom-left" —
today the name is at `bottom-0` (`deck-card.tsx:155`) and the chip is top-left, both inverted,
and that inversion is why the `center top` focal puts the face behind the title.

**Files:**
- Modify: `src/components/decks/deck-card.tsx`, `src/components/ui/art-wash.tsx`
- Test: `src/components/decks/deck-card.test.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1–3.
- Produces: `INK_SHADOW`, exported from `art-wash.tsx`, consumed by Tasks 5–7.

- [ ] **Step 1: Write the failing tests**

The file's fixture helper is `deck(over)` (`deck-card.test.tsx:13`) and already carries
`commanderName`. Every existing render passes `shopping` and `now`; match them.

```tsx
it("prints the commander name under the deck name, in the band", () => {
  render(
    <DeckCard
      deck={deck({ name: "Blink and you'll miss it", commanderName: "Yuriko, the Tiger's Shadow" })}
      shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }}
      now={now}
    />,
  );
  expect(screen.getByText("Yuriko, the Tiger's Shadow")).toBeInTheDocument();
});

it("separates the band from the data with a divider", () => {
  const { container } = render(
    <DeckCard deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
  );
  const footer = container.querySelector(".deck-card-footer") as HTMLElement;
  expect(footer.style.borderTop).toBe("1px solid var(--border)");
});
```

The first test overrides `name` because the fixture's deck name and commander name are the same
string, and `getByText` would then match two nodes.

- [ ] **Step 2: Run and watch both fail**

```bash
pnpm vitest run src/components/decks/deck-card.test.tsx
```

- [ ] **Step 3: Export the ink rule, then restructure the tile**

In `art-wash.tsx`, beside `PLATE`:

```tsx
/** Decision 3 — ink over art. The resume row is the stated exception: its type
 *  starts at the 116px inset, clear of the portrait, and carries no shadow. */
export const INK_SHADOW = "0 1px 3px rgba(0,0,0,.6)";
```

In `deck-card.tsx`, inside the `aspect-[2.2/1]` band, replace the `absolute inset-x-0 bottom-0`
name block with a top-anchored label row, and move the chip to the bottom:

```tsx
{/* §4 — in the wash: name, subtitle, status chip, overflow. The label block is
    top-anchored, which is what decision 6's `center top` focal is derived from:
    the recognisable features land at 43–71% of the band, below it. */}
<div className="absolute inset-x-0 top-0 flex items-start justify-between gap-[12px] px-[13px] pt-[10px]">
  <div className="min-w-0">
    <h3
      className="m-0 truncate font-display text-[17px] font-semibold text-[color:var(--fg)] sm:text-[15px]"
      style={{ textShadow: INK_SHADOW }}
    >
      {deck.name}
    </h3>
    <p
      className="m-0 mt-[3px] truncate font-mono text-[10.5px] text-[color:var(--fg-body)]"
      style={{ textShadow: INK_SHADOW }}
    >
      {deck.commanderName}
    </p>
  </div>
  <DeckCardOverflow … />
</div>

{/* §4 — status chip bottom-left. The scrim's fourth stop (.86 at 100%) is what
    lets it sit here without a plate of its own. */}
<StatusPillBadge
  status={deck.statusPill}
  className="absolute bottom-[13px] left-[13px] flex h-[24px] items-center rounded-[6px] px-[9px] font-mono text-[11px] sm:h-[22px] sm:px-[8px] sm:text-[10.5px]"
/>
```

`StatusPillBadge`'s default `className` (`status-pill.tsx:31`) is itself `absolute top-[10px]
left-[11px] …`, so the geometry must be passed through that prop — wrapping it in a positioned
div would offset it by a further 10/11px. The class above is `TILE_CLASS` with only the two
position utilities swapped; keep every other utility identical, since sizing is held for Design.

The name's existing utilities carry over unchanged; only its position and the `textShadow` are
new. Then add `className="deck-card-footer"` and
`style={{ borderTop: "1px solid var(--border)" }}` to the body grid at `:166`, keeping its
existing padding.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/decks/ && pnpm typecheck && pnpm lint
```

`pnpm dev`, load `/decks`: the name at the top of the art, the chip bottom-left, a hairline
between art and the count row.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/deck-card.tsx src/components/decks/deck-card.test.tsx src/components/ui/art-wash.tsx
git commit -m "feat(decks): top-anchor the tile's labels and put its data on flat ground"
```

---

### Task 5: Ready to build gets the same split and a boxed fit chip

The surfaces table says this card "inherits the deck card exactly". Today its name block is at
`bottom-0` (`hero-commander.tsx:59`), its fit figure is an unboxed translucent badge at top-left
(`:51`), and the pool label and both action buttons render over the art.

**Files:**
- Modify: `src/components/home/hero-commander.tsx`
- Test: `src/components/home/hero-commander.test.tsx`

**Interfaces:**
- Consumes: `CommanderListItem.typeLine` (Task 1), `INK_SHADOW` (Task 4).

- [ ] **Step 1: Rewrite the existing band test, then write the failing ones**

`hero-commander.test.tsx:26-31` asserts that `container.firstElementChild` carries
`aspect-[2.2/1]` and `min-h-[104px]`. This task adds a card root above the band, so that
assertion must move to the band element — give the band `className="hero-band"` and query it.
The fixture helper is `item(over)` (`:9`), a `as unknown as CommanderListItem` cast; add
`typeLine` to it.

```tsx
it("boxes the fit chip on an opaque plate behind a hairline", () => {
  const { container } = render(<HeroCommander item={item()} inUse={0} />);
  const chip = container.querySelector(".hero-fit-chip") as HTMLElement;
  expect(chip.style.background).toBe("var(--bg)");
  expect(chip.style.border).toBe("1px solid var(--border-strong)");
});

it("puts the actions below the divider, not on the art", () => {
  const { container } = render(<HeroCommander item={item()} inUse={0} />);
  const footer = container.querySelector(".hero-footer") as HTMLElement;
  expect(footer.style.borderTop).toBe("1px solid var(--border)");
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm vitest run src/components/home/hero-commander.test.tsx
```

- [ ] **Step 3: Restructure**

- Add a card root above the band. **Move `rounded-[14px]`, `border` and `overflow-hidden` from
  the band to that root**, or the footer will sit outside the rounded corner. The root also
  takes `background: "var(--surface-inset)"`, since the band no longer fills the card. The band
  keeps `relative aspect-[2.2/1] min-h-[104px] overflow-hidden` and gains `hero-band`.
- Move the name block from `absolute inset-x-0 bottom-0` to `absolute inset-x-0 top-0`, keeping
  its existing `p-[13px] sm:p-[14px]`, and add `style={{ textShadow: INK_SHADOW }}` to the name.
- Below the name, add the type line — `item.typeLine`, `font-mono text-[10.5px]`,
  `text-[color:var(--fg-body)]`, truncating, with `INK_SHADOW`.
- Move the fit badge from `top-[10px] left-[11px]` to `absolute right-[11px] bottom-[10px]
  sm:right-[12px] sm:bottom-[11px]`, add `className="hero-fit-chip"`, and replace the
  translucent `color-mix(in_srgb,var(--bg)_82%,transparent)` class with inline
  `background: "var(--bg)"` and `border: "1px solid var(--border-strong)"` — decision 3's
  opaque chip-on-art rule, the same one the status pill follows. Keep its height, radius,
  padding and type size.
- Move the pips to `absolute left-[11px] bottom-[10px] sm:left-[12px] sm:bottom-[11px]`, at
  their current size — pip sizing is held.
- Take the pool label, the in-use clause and the actions row out of the band into a footer
  sibling with `className="hero-footer"` and `style={{ borderTop: "1px solid var(--border)" }}`.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/home/ && pnpm typecheck && pnpm lint
```

`pnpm dev`, load `/` signed in: name at the top of the art, pips bottom-left, a boxed fit chip
bottom-right, both buttons on flat ground under a hairline. The card grows by roughly the
actions row's height; `ready-to-build.tsx:37` is an auto-row grid, so nothing below it breaks —
confirm that on the page rather than assuming it.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/hero-commander.tsx src/components/home/hero-commander.test.tsx
git commit -m "feat(home): split the ready-to-build card into band, divider and footer"
```

---

### Task 6: The commander row gets a 148px band and a data zone

The largest of the five, and the one with the most existing structure to respect. Today
`<ArtWash>` spans the whole row, so the role chips, synergy bar, ownership line and receipts all
sit on art, and the portrait over-scales as Task 3 describes. **Both responsive subtrees change**
— the phone stack at `:136` and the desktop grid at `:270`.

**Files:**
- Modify: `src/components/commanders/rec-card.tsx`
- Test: `src/components/commanders/rec-card.test.tsx`

**Interfaces:**
- Consumes: `CommanderListItem.typeLine` (Task 1), `INK_SHADOW` (Task 4), the band-stating root
  (Task 3).

- [ ] **Step 1: Write the failing tests**

The helper is `card({ commander })` (`rec-card.test.tsx:44`), which wraps `item()`; the owned
arm requires `commander`, `avail`, `counts` and `delta` (`rec-card.tsx:44-65`). Use the existing
helper rather than constructing props by hand.

```tsx
it("confines the wash to a 148px band", () => {
  const { container } = render(card({ commander: item() }));
  const band = container.querySelector(".rec-band") as HTMLElement;
  expect(band.style.height).toBe("148px");
});

it("keeps the data zone off the art", () => {
  const { container } = render(card({ commander: item() }));
  const zone = container.querySelector(".rec-data-zone") as HTMLElement;
  expect(zone.style.borderTop).toBe("1px solid var(--border)");
  expect(zone.querySelector(".rec-band")).toBeNull();
});

it("prints the type line as the band's subtitle", () => {
  render(card({ commander: item({ typeLine: "Legendary Creature — Human Wizard" }) }));
  expect(screen.getAllByText("Legendary Creature — Human Wizard").length).toBeGreaterThan(0);
});
```

`getAllByText`, not `getByText`: both responsive subtrees render, so every string appears twice
in jsdom. Check how the file's existing tests handle that and follow the same convention.

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm vitest run src/components/commanders/rec-card.test.tsx
```

- [ ] **Step 3: Restructure both subtrees**

Each subtree becomes a band plus a data zone:

```tsx
{/* §4 — the wash owns exactly one band. 148px stated here rather than as a row
    floor, so the portrait's `auto 100%` has a box to resolve against. */}
<div className="rec-band relative overflow-hidden" style={{ height: 148 }}>
  <ArtWash strategy="left-portrait" band={148} artCropUri={c.artCropUri} colorIdentity={c.colorIdentity} />
  {/* rank · name + pips + type line · fit chip */}
</div>

{/* §4 — below the divider: stat pills, synergy bar, ownership, receipts. */}
<div
  className="rec-data-zone relative"
  style={{ borderTop: "1px solid var(--border)", background: "var(--surface-inset)" }}
>
  …
</div>
```

Four things the split has to place explicitly:

1. **The row separator stays.** The `borderBottom: "1px solid var(--border)"` at `:137` and
   `:276` separates one row from the next; it is not §4's divider and both exist. Keep it on
   the outer element, which is now the parent of band + zone.
2. **The row root loses `min-h-[148px]`** (`:117`) — the band states the height instead.
3. **The desktop grid `24px 1fr 206px 32px`** (`:270-277`) splits: columns 1–3 are band content,
   and the trailing 32px hover-reveal "Details" link (`:468-476`) stays with the band, pinned to
   its right edge, since it is an affordance for the row's identity rather than data. Keep its
   hover behaviour exactly as it is.
4. **The mobile subtree gains a band it does not have today.** Its first row — rank, name, pips,
   fit — becomes the 148px band; the chips, synergy and receipts below it become the data zone.
   That is a real mobile change and is intended: the handoff's band is a px figure at every
   width, and mobile currently has no band at all.

Also:

- Add `style={{ textShadow: INK_SHADOW }}` to the rank, the name and the type line in both
  subtrees, since all three now sit on art.
- Add the type line under the name: `font-mono`, `var(--fg-body)`, truncating, at the size the
  subtree's other secondary text already uses.
- Box the fit figure: wrap the existing numeral and unit in a plate with
  `background: "var(--bg)"`, `border: "1px solid var(--border-strong)"` and the status pill's
  radius. Drop the `borderLeft: "1px solid var(--border)"` on the desktop fit column — the
  column is dissolved by the split, and a boxed chip plus a column rule are two answers to one
  question.

Held, and unchanged: the rank's size and font, the name's weight and size, pip sizing, the
synergy fill colour, and the row's lack of a card frame.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/commanders/ && pnpm typecheck && pnpm lint
```

`pnpm dev`, load `/commanders` at a phone width and a wide desktop width. The portrait must show
the same crop framing at both — widen the window and confirm the face neither slides nor clips.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/rec-card.tsx src/components/commanders/rec-card.test.tsx
git commit -m "feat(commanders): give the rec row a 148px band and a flat data zone"
```

---

### Task 7: The discovery row stops inheriting the over-scale

`/discover` is not drawn in the canvas — zero occurrences of the word, and the token panel lists
four surfaces — so its chrome is an open question with Design. Its art treatment is not: it
renders the identical `<ArtWash strategy="left-portrait" band={148}>` on a `min-h-[148px]` root
(`discovery-row.tsx:322`, `:331-336`), so it carries Task 3's bug verbatim.

**Files:**
- Modify: `src/components/commanders/discovery-row.tsx`
- Test: `src/components/commanders/discovery-row.test.tsx`

- [ ] **Step 1: Write the failing test**

The helper is `item(over)` (`discovery-row.test.tsx:13`), and `DiscoveryRow` also requires
`sort`. Copy an existing render call from that file.

```tsx
it("confines the wash to a 148px band", () => {
  const { container } = render(<DiscoveryRow discovery={item()} sort="fit" rank={1} />);
  expect((container.querySelector(".discovery-band") as HTMLElement).style.height).toBe("148px");
});
```

Take the prop names from `rec-card.tsx:66-72`'s discover arm, not from this snippet.

- [ ] **Step 2: Run and watch it fail**

```bash
pnpm vitest run src/components/commanders/discovery-row.test.tsx
```

- [ ] **Step 3: Wrap the wash in a band**

Apply Task 6's split with `.discovery-band` and the same data zone. Its third column — the
counts and the ratio bar — is data and goes below the divider. Add `INK_SHADOW` to the rank and
the name.

Do not touch its type scale, its 246px column, or anything else that differs from the rec row.
Whether the two lanes should converge is Design's call, and #435 split them deliberately.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/commanders/ && pnpm typecheck && pnpm lint
```

`pnpm dev`, load `/discover`.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/discovery-row.tsx src/components/commanders/discovery-row.test.tsx
git commit -m "fix(discover): confine the row's wash to its 148px band"
```

---

### Task 8: The resume row names its commander

The 72px row is the closest to the handoff already — the 116px inset and the deliberate absence
of a text-shadow both landed. One element is missing: the commander name as the subtitle. Today
a `87 / 99 · N unowned` count occupies that slot (`resume-decks.tsx:106-110`).

Two things the canvas draws are **not** built here, and go to Design instead:

- The **identity pips**. The canvas draws pips in the slot the shipped row gives to
  `StatusPillBadge` (`:99-105`). Both are load-bearing and only one fits; that is a design call.
- The **right-hand meta block** (`COMMANDER` tag plus a relative timestamp). It is chrome the
  canvas adds that the README's prose never names.

**Files:**
- Modify: `src/components/home/resume-decks.tsx`
- Test: `src/components/home/resume-decks.test.tsx`

- [ ] **Step 1: Write the failing test**

The helper is `deck(over)` (`resume-decks.test.tsx:7`), and `ResumeDecks` also requires
`shopping: ShoppingRollup` — the file has a `rollup()` helper for it. Copy an existing render
call.

```tsx
it("names the commander under the deck name", () => {
  render(
    <ResumeDecks
      decks={[deck({ name: "Four colours, one plan", commanderName: "Atraxa, Praetors' Voice" })]}
      shopping={rollup()}
    />,
  );
  expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and watch it fail**

```bash
pnpm vitest run src/components/home/resume-decks.test.tsx
```

- [ ] **Step 3: Add the subtitle**

Add the commander name as a second line under the deck name, `font-mono` at the size the row's
existing secondary text uses, `var(--fg-body)`, truncating, and with **no** text-shadow —
decision 9's tell, and the reason that inset exists. The count string is not replaced: it moves
to sit beside the commander name and truncates first when the row is narrow.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/home/ && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/home/resume-decks.tsx src/components/home/resume-decks.test.tsx
git commit -m "feat(home): name the commander on the resume row"
```

---

### Task 9: Re-verify, report, ship

**Files:**
- Modify: `docs/superpowers/gap-report-art-wash.md`, `docs/superpowers/design-pipeline-status.md`

- [ ] **Step 1: Full gate**

```bash
pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

- [ ] **Step 2: Walk all five surfaces in a browser**

`/decks`, `/` signed in, `/commanders`, `/discover`. At each: labels top on the two `cover`
surfaces, a hairline between art and data everywhere, and the portrait framed identically at a
narrow and a wide window. A ruling is not a walk — load the routes.

- [ ] **Step 3: Rewrite the gap report**

Replace its Scope section, which currently rules the whole surface out of scope and is the reason
the first pass reported eight gaps against an incomplete table. Record what this plan fixed and
what stayed held for Design, with the reason. Correct the `PR #450` reference at
`design-pipeline-status.md:306` to `#452`.

- [ ] **Step 4: Run the confirm agent**

Agent 3 of the design-review skill, against the gap list only — not an open-ended re-sweep.

- [ ] **Step 5: Commit and open the PR**

The PR body carries the held list as open questions for Design.

```bash
git add docs/superpowers/gap-report-art-wash.md docs/superpowers/design-pipeline-status.md
git commit -m "docs: gap report for the art wash full-surface build"
```
