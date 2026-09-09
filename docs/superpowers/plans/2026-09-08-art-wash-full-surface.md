# Art Wash — full surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the parts of the art wash amendment that were never built — the band/divider
split, top-anchored labels, band-derived portrait geometry, ink over art, and the four missing
subtitle/meta blocks — so the four surfaces match the handoff rather than only the wash's
gradient layers matching it.

**Architecture:** Each surface stops rendering `<ArtWash>` across its whole root and instead
wraps it in a band element of exactly the handoff's height. Below that band sits a `1px` divider
and a footer on flat ground. Because the band element is the wash's containing block, the sharp
portrait's `background-size: auto 100%` resolves to the band height by construction rather than
by a call site remembering to constrain it — which is what README decision 8 asks for and what
the current `absolute inset-0` breaks.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Vitest + Testing Library (jsdom).

**Spec:** `design/design_handoff_the99_art_wash/README.md` (updated 2026-09-08 with the
Ratifications table), with `The 99 - Art Wash Readability v2.dc.html` as the canvas.
Verified against `docs/superpowers/design-tables/art-wash.md` and the gap list in this plan's
companion audit.

## Global Constraints

- **No hex in `.ts`/`.tsx`.** `src/lib/theme/no-hex.test.ts` scans every source file for a
  6-digit hex and for brand `rgba()` triples. Colour is `var(--token)` or `color-mix(...)`.
  The CSS keyword `black` is not a hex and passes.
- **The handoff's hexes are Palette A reference values, not values to ship.** README "Notes for
  engineering": theme-aware values come from `globals.css` tokens. The mapping used throughout
  this plan: L1 `#0E0C09` → one step below `var(--bg)`; divider `#2A241D` → `var(--border)`;
  ground `#1A160F` → `var(--surface-inset)`; chip-on-art `#14110E` + `1px #3A3229` →
  `var(--bg)` + `var(--border-strong)`; title `#F4EFE3` → `var(--fg)`; subtitle `#C6B79A` →
  `var(--fg-body)`.
- **One shared `<ArtWash>`.** README: "Divergent per-surface scrims are exactly how this drifts
  back to the reported bug." No task adds a scrim at a call site.
- **Type scale, weights, pip sizing, synergy fill colour, the Build button's fill, section
  headings, the rec row's card frame and the deck grid's columns are OUT OF SCOPE.** The v2
  canvas draws them differently from what shipped in #437/#438, and the README's opening line
  still says "Nothing else on Decks, Commanders or Home is redesigned." That conflict is open
  with Design. Keep every existing type size, weight, font family and colour token exactly as
  it is today; move elements, do not restyle them, except where decision 3 (Ink) rules.
- **Decision 3 IS in scope**, because it is the readability amendment itself: ink over art gets
  `text-shadow: 0 1px 3px rgba(0,0,0,.6)` and chips over art get an opaque plate plus a `1px`
  `var(--border-strong)` hairline. The resume row is the stated exception — it carries no
  text-shadow, because its type starts clear of the art at the 116px inset.
- **Mobile and desktop ship together.** The canvas draws no mobile frame at all, so mobile
  keeps its current arrangement and inherits only the structural rules: the band is the same
  px height, the divider exists, and nothing that belongs below the divider renders over art.
- Every task ends green on `pnpm typecheck && pnpm lint && pnpm test`.

---

## File Structure

**Modified**

- `src/components/ui/art-wash.tsx` — L1 plate derives a darker ground than `var(--bg)`; the
  `left-portrait` root stops assuming it owns the row. No change to any gradient, stop, alpha,
  mask or opacity: those all verified as matching and must stay matching.
- `src/components/decks/deck-card.tsx` — band/divider/footer split; labels to the top of the
  band; status chip to bottom-left; commander name as the band subtitle.
- `src/components/home/hero-commander.tsx` — same split; fit chip becomes a boxed plate at
  bottom-right; the pool label and both buttons move below the divider.
- `src/components/commanders/rec-card.tsx` — 148px band holds rank, name, pips and the fit
  chip; role chips, synergy, ownership and receipts move below a divider onto flat ground.
- `src/components/commanders/discovery-row.tsx` — the same band/divider split, so it stops
  inheriting the over-scale bug. Its own chrome is untouched.
- `src/components/home/resume-decks.tsx` — identity pips and the commander-name subtitle.
- `src/lib/recs/recommend.ts` — project the already-queried `typeLine` onto `CommanderListItem`.

**Created**

- `src/components/ui/art-wash-band.test.tsx` — the band-geometry regression test.

---

### Task 1: `typeLine` reaches the commander list item

The rec row's subtitle is a type line the handoff draws and the payload does not carry. The
column is already selected (`recommend.ts:148`, `:171`) and dropped at the projection.

**Files:**
- Modify: `src/lib/recs/recommend.ts`
- Test: `src/lib/recs/recommend.test.ts`

**Interfaces:**
- Produces: `CommanderListItem.typeLine: string` — consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/recs/recommend.test.ts`, inside whichever describe block already builds a
`RankedCommander` fixture and calls the list-item projection (search for `toListItem` or the
existing projection helper name and reuse it — do not invent a second one):

```ts
it("carries the type line through to the list item", () => {
  const item = toListItem({ ...rankedFixture(), typeLine: "Legendary Creature — Dragon Noble" });
  expect(item.typeLine).toBe("Legendary Creature — Dragon Noble");
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm vitest run src/lib/recs/recommend.test.ts
```

Expected: fail — `typeLine` is `undefined` on the projected item.

- [ ] **Step 3: Add the field**

In `src/lib/recs/recommend.ts`, add `typeLine: string;` to the `CommanderListItem` interface
beside `name`, and `typeLine: r.typeLine,` to the projection at line ~67 beside `name: r.name`.
`RankedCommander` already carries it from the two selects; if TypeScript says otherwise, add it
to that type too rather than re-querying.

- [ ] **Step 4: Green**

```bash
pnpm vitest run src/lib/recs/recommend.test.ts && pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/recommend.ts src/lib/recs/recommend.test.ts
git commit -m "feat(recs): carry the commander type line onto the list item"
```

---

### Task 2: The wash's base plate sits below `--bg`

README decision 2 fixes L1 at `#0E0C09`. The component uses `var(--bg)`, which in Low Sun is
`#14110E` — the handoff's *chip-on-art* colour, one step lighter than the plate. No token in
`globals.css` is darker than `--bg`, and the README forbids introducing one, so the plate
derives from `--bg`.

**Files:**
- Modify: `src/components/ui/art-wash.tsx`
- Test: `src/components/ui/art-wash.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("plates the wash below the page ground, not at it", () => {
  const { container } = render(<ArtWash strategy="cover" artCropUri="https://x/a.jpg" colorIdentity={["R"]} />);
  const plate = container.querySelector(".art-wash-plate") as HTMLElement;
  expect(plate.style.background).toContain("color-mix");
  expect(plate.style.background).toContain("black");
});
```

If the plate layer has no stable class today, add `className="art-wash-plate"` to it as part of
Step 3 — the test needs a handle and a class is cheaper than a test id.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm vitest run src/components/ui/art-wash.test.tsx
```

Expected: fail — the background is `var(--bg)`.

- [ ] **Step 3: Derive the plate**

In `art-wash.tsx`, replace the plate's `var(--bg)` with a module constant used by both
strategies:

```tsx
// README decision 2 fixes L1 at #0E0C09, one step below the page ground so a
// slow image never flashes light. No token is darker than --bg — the README
// forbids adding one — so the plate derives from it, and each theme gets its
// own value of the same rule.
const PLATE = "color-mix(in srgb, var(--bg) 86%, black)";
```

Leave every gradient, stop, alpha, mask and opacity untouched. Note that the horizontal scrim's
final stop and the `left-portrait` ground stay on `--surface-inset` / `--bg` as they are: those
are the *row's* ground, not the plate, and gap 3 of the previous report settled them.

- [ ] **Step 4: Green, including the contrast proof**

```bash
pnpm vitest run src/components/ui/art-wash.test.tsx src/lib/theme/wash-contrast.test.ts src/lib/theme/no-hex.test.ts
```

`wash-contrast.test.ts` composites the brightest pixel art can contain against each theme; a
darker plate can only help it, but it must still be run.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/art-wash.tsx src/components/ui/art-wash.test.tsx
git commit -m "fix(art-wash): plate the wash one step below the page ground"
```

---

### Task 3: The band owns the wash, and the portrait derives from it

This is the fix for the visible bug. `<ArtWash>` is rendered `absolute inset-0` of a row root
whose only height constraint is `min-h-[148px]`, and the sharp layer inside is `inset-y-0` with
`background-size: auto 100%`. `100%` therefore resolves to the *rendered row height* — on a
desktop rec row that runs past 300px, so the 626×457 crop scales to ~411px wide and is then
clipped by the fixed `width: 203px`. Only the left half of the art survives, and the mask's 58%
edge and the scrim's 118/203/264px stops no longer land on anything in the image.

The fix is structural, not a new prop: each `left-portrait` call site wraps the wash in a band
element of exactly `band` px, so `100%` is the band by construction and no call site can get it
wrong. Tasks 5–7 do the wrapping; this task adds the regression test and the component-side
guard so the wrapping cannot silently regress.

**Files:**
- Create: `src/components/ui/art-wash-band.test.tsx`
- Modify: `src/components/ui/art-wash.tsx`

**Interfaces:**
- Produces: `<ArtWash strategy="left-portrait" band={148}>` renders a root of height `148px`
  regardless of its parent's height. Tasks 5–7 rely on this.

- [ ] **Step 1: Write the failing test**

```tsx
// jsdom computes no layout, so this asserts the declaration rather than the
// rendered box: the root must state the band height itself, which is exactly
// what stops `auto 100%` on the sharp layer resolving to a taller row.
it("states the band height on its own root, not its parent's", () => {
  const { container } = render(
    <div style={{ height: 400 }}>
      <ArtWash strategy="left-portrait" band={148} artCropUri="https://x/a.jpg" colorIdentity={["G"]} />
    </div>,
  );
  const root = container.firstElementChild!.firstElementChild as HTMLElement;
  expect(root.style.height).toBe("148px");
});

it("keys the resume band to 72 the same way", () => {
  const { container } = render(
    <div style={{ height: 400 }}>
      <ArtWash strategy="left-portrait" band={72} artCropUri="https://x/a.jpg" colorIdentity={["U"]} />
    </div>,
  );
  expect((container.firstElementChild!.firstElementChild as HTMLElement).style.height).toBe("72px");
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm vitest run src/components/ui/art-wash-band.test.tsx
```

Expected: fail — the root is `absolute inset-0` with no height.

- [ ] **Step 3: Give the `left-portrait` root its band**

In `art-wash.tsx`, the `left-portrait` wrapper currently reads:

```tsx
className="pointer-events-none absolute inset-0 overflow-hidden"
```

Change it to state its own height and stop stretching to the row:

```tsx
// README decision 8: the portrait's extent derives from band height in px.
// The root therefore declares the band rather than inheriting the row — the
// sharp layer's `auto 100%` resolves against this box, so a taller row can no
// longer over-scale the crop and clip it at the fixed 203px width.
className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
style={{ height: `${band}px` }}
```

Leave the `cover` strategy alone: its parent is an `aspect-[2.2/1]` box, so `inset-0` already
resolves to the band.

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
today the name is at `bottom-0` and the chip is top-left, which is both of them inverted, and
inverting them is why the `center top` focal puts the face behind the title.

**Files:**
- Modify: `src/components/decks/deck-card.tsx`
- Test: `src/components/decks/deck-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("prints the commander name under the deck name, in the band", () => {
  render(<DeckCard deck={deckFixture({ commanderName: "Yuriko, the Tiger's Shadow" })} />);
  expect(screen.getByText("Yuriko, the Tiger's Shadow")).toBeInTheDocument();
});

it("separates the band from the data with a divider", () => {
  const { container } = render(<DeckCard deck={deckFixture()} />);
  expect(container.querySelector(".deck-card-footer")).toHaveStyle({
    borderTop: "1px solid var(--border)",
  });
});
```

Reuse the file's existing fixture helper; if it has no `commanderName`, add it — the field is
already on `DeckListItem` (`read.ts:231`, populated at `:346`).

- [ ] **Step 2: Run and watch both fail**

```bash
pnpm vitest run src/components/decks/deck-card.test.tsx
```

- [ ] **Step 3: Restructure the tile**

Inside the `aspect-[2.2/1]` band, replace the single `absolute inset-x-0 bottom-0` name block
with two absolutely-positioned blocks, and give the body grid the divider:

```tsx
{/* §4 — in the wash: name, subtitle, status chip, overflow. The label block
    is top-anchored, which is what decision 6's `center top` focal is derived
    from: the recognisable features land at 43–71% of the band, below it. */}
<div className="absolute inset-x-0 top-0 flex items-start justify-between gap-[12px] p-[13px] sm:p-[15px_16px]">
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

{/* §4 — status chip bottom-left. The scrim's fourth stop (.86 at 100%) is
    what lets it sit here without a plate of its own. */}
<div className="absolute bottom-[13px] left-[13px] sm:bottom-[13px] sm:left-[16px]">
  <StatusPillBadge status={status} />
</div>
```

`INK_SHADOW` is decision 3's one value. Put it in `src/components/ui/art-wash.tsx` and export
it, so the three surfaces that need it share one declaration and the resume row's deliberate
absence stays visibly deliberate:

```tsx
/** Decision 3 — ink over art. The resume row is the stated exception: its type
 *  starts at the 116px inset, clear of the portrait, and carries no shadow. */
export const INK_SHADOW = "0 1px 3px rgba(0,0,0,.6)";
```

Then move the overflow and status chip out of their current absolute positions, and add
`className="deck-card-footer"` plus `style={{ borderTop: "1px solid var(--border)" }}` to the
body grid at `deck-card.tsx:166`.

Do not change any font size, weight, colour token, padding value or pip size beyond what is
written above — those are held for Design.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/decks/ && pnpm typecheck && pnpm lint
```

Then `pnpm dev` and load `/decks`: the name must be at the top of the art, the chip at the
bottom-left, and a hairline must separate art from the count row.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/deck-card.tsx src/components/decks/deck-card.test.tsx src/components/ui/art-wash.tsx
git commit -m "feat(decks): top-anchor the tile's labels and put its data on flat ground"
```

---

### Task 5: Ready to build gets the same split and a boxed fit chip

The surfaces table says this card "inherits the deck card exactly". Today its name block is at
`bottom-0`, its fit figure is an unboxed translucent badge at top-left, and the pool label and
both action buttons render over the art.

**Files:**
- Modify: `src/components/home/hero-commander.tsx`
- Test: `src/components/home/hero-commander.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("boxes the fit chip on an opaque plate behind a hairline", () => {
  const { container } = render(<HeroCommander item={itemFixture()} inUse={0} />);
  const chip = container.querySelector(".hero-fit-chip") as HTMLElement;
  expect(chip.style.background).not.toContain("transparent");
  expect(chip.style.border).toBe("1px solid var(--border-strong)");
});

it("puts the actions below the divider, not on the art", () => {
  const { container } = render(<HeroCommander item={itemFixture()} inUse={0} />);
  expect(container.querySelector(".hero-footer")).toHaveStyle({
    borderTop: "1px solid var(--border)",
  });
});
```

- [ ] **Step 2: Run and watch it fail**

```bash
pnpm vitest run src/components/home/hero-commander.test.tsx
```

- [ ] **Step 3: Restructure**

- Move the name block from `absolute inset-x-0 bottom-0` to `absolute inset-x-0 top-0`, keeping
  its existing `p-[13px] sm:p-[14px]`, and add `style={{ textShadow: INK_SHADOW }}` to the name.
- Below the name, add the type-line subtitle at the same treatment as the deck tile's
  commander name, reading `item.typeLine` from Task 1.
- Move the fit badge from `top-[10px] left-[11px]` to `absolute right-[11px] bottom-[10px]
  sm:right-[12px] sm:bottom-[11px]`, add `className="hero-fit-chip"`, and replace its
  translucent `color-mix(in_srgb,var(--bg)_82%,transparent)` background with
  `background: "var(--bg)"` plus `border: "1px solid var(--border-strong)"` — decision 3's
  opaque chip-on-art rule, the same one the status pill already follows.
- Move the pips to `absolute left-[11px] bottom-[10px] sm:left-[12px] sm:bottom-[11px]`.
- Take the meta row's pool label and the actions row out of the band and into a new footer
  sibling of the band, with `className="hero-footer"` and
  `style={{ borderTop: "1px solid var(--border)" }}` on a `var(--surface-inset)` ground.
  The card root needs that ground too, since the band no longer fills it.
- The in-use clause travels with the pool label into the footer.

Keep every font size, weight, radius, button height and fill exactly as they are.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/home/ && pnpm typecheck && pnpm lint
```

`pnpm dev`, load `/` signed in: name at the top of the art, pips bottom-left, a boxed fit chip
bottom-right, and both buttons on flat ground under a hairline.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/hero-commander.tsx src/components/home/hero-commander.test.tsx
git commit -m "feat(home): split the ready-to-build card into band, divider and footer"
```

---

### Task 6: The commander row gets a 148px band and a data zone

The largest of the five. Today `<ArtWash>` spans the whole row, so the role chips, synergy bar,
ownership line and receipts all sit on art, and the portrait over-scales exactly as Task 3
describes. Both responsive subtrees need the same treatment.

**Files:**
- Modify: `src/components/commanders/rec-card.tsx`
- Test: `src/components/commanders/rec-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("confines the wash to a 148px band", () => {
  const { container } = render(<RecCard c={commanderFixture()} rank={1} />);
  const band = container.querySelector(".rec-band") as HTMLElement;
  expect(band.style.height).toBe("148px");
});

it("keeps the synergy bar off the art", () => {
  const { container } = render(<RecCard c={commanderFixture()} rank={1} />);
  const zone = container.querySelector(".rec-data-zone") as HTMLElement;
  expect(zone.style.borderTop).toBe("1px solid var(--border)");
  expect(zone.querySelector(".rec-band")).toBeNull();
});

it("prints the type line as the band's subtitle", () => {
  render(<RecCard c={commanderFixture({ typeLine: "Legendary Creature — Human Wizard" })} rank={1} />);
  expect(screen.getByText("Legendary Creature — Human Wizard")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm vitest run src/components/commanders/rec-card.test.tsx
```

- [ ] **Step 3: Restructure both subtrees**

Give the row a band element that holds only what decision 4 puts in the wash — rank, name,
pips, fit chip — and a data zone below a divider that holds everything else:

```tsx
{/* §4 — the wash owns exactly one band. 148px, stated here rather than as a
    row floor, so the portrait's `auto 100%` has a box to resolve against. */}
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

- The row root loses `min-h-[148px]`; the band states the height instead. Keep the existing
  `borderBottom` that separates one row from the next — it is not the §4 divider and both exist.
- Add `style={{ textShadow: INK_SHADOW }}` to the rank, the name and the new type line, since
  all three now sit on art.
- Add the type-line subtitle below the name at `font-mono` `var(--fg-body)`, matching the size
  the row's other secondary text already uses at each width.
- Box the fit figure: wrap the existing numeral and unit in a plate with `background:
  "var(--bg)"`, `border: "1px solid var(--border-strong)"` and the radius the status pill uses.
  Drop the `borderLeft: 1px var(--border)` divider on the desktop fit column — a boxed chip and
  a column rule are two answers to the same question.
- Everything from the role chips down moves inside `.rec-data-zone`, on both subtrees.

Hold: the rank's size and font, the name's weight and size, pip sizing, the synergy fill colour,
and the row's lack of a card frame. All four are open with Design.

- [ ] **Step 4: Green, then look at it**

```bash
pnpm vitest run src/components/commanders/ && pnpm typecheck && pnpm lint
```

`pnpm dev`, load `/commanders`. The portrait must now show the same crop framing at every row
height — widen the window and confirm the face does not slide or clip.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/rec-card.tsx src/components/commanders/rec-card.test.tsx
git commit -m "feat(commanders): give the rec row a 148px band and a flat data zone"
```

---

### Task 7: The discovery row stops inheriting the over-scale

`/discover` is not drawn in the canvas, so its chrome is an open question with Design. Its art
treatment is not: it renders the identical `<ArtWash strategy="left-portrait" band={148}>` on a
`min-h-[148px]` root, so it carries Task 3's bug verbatim. Fix the geometry, change nothing else.

**Files:**
- Modify: `src/components/commanders/discovery-row.tsx`
- Test: `src/components/commanders/discovery-row.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("confines the wash to a 148px band", () => {
  const { container } = render(<DiscoveryRow item={discoveryFixture()} rank={1} />);
  expect((container.querySelector(".discovery-band") as HTMLElement).style.height).toBe("148px");
});
```

- [ ] **Step 2: Run and watch it fail**

```bash
pnpm vitest run src/components/commanders/discovery-row.test.tsx
```

- [ ] **Step 3: Wrap the wash in a band**

Apply the same band/data-zone split as Task 6, with `.discovery-band` and the same
`borderTop: "1px solid var(--border)"` data zone. Its third column (counts and the ratio bar)
is data and goes below the divider. Add `INK_SHADOW` to the rank and name.

Do not touch its type scale, its 246px column, or anything else that differs from the rec row —
whether the two lanes should converge is Design's call, and #435 split them deliberately.

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

### Task 8: The resume row gets its pips and its commander name

The 72px row is the closest to the handoff already — the 116px inset and the deliberate absence
of a text-shadow both landed. Two elements are missing: the identity pips, and the commander
name as the subtitle. Today a `StatusPillBadge` occupies the pip slot and a `87 / 99 · N
unowned` count occupies the subtitle slot.

The right-hand `COMMANDER` tag and relative timestamp the canvas draws are NOT built here: that
block is chrome the canvas adds and the README's prose never names, so it goes to Design with
the rest of the canvas-vs-shipped questions.

**Files:**
- Modify: `src/components/home/resume-decks.tsx`
- Test: `src/components/home/resume-decks.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("names the commander under the deck name", () => {
  render(<ResumeDecks decks={[deckFixture({ commanderName: "Atraxa, Praetors' Voice" })]} />);
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
decision 9's tell. Keep the count string; it moves to sit beside the commander name rather than
replacing it, and truncates first when the row is narrow.

Leave the `StatusPillBadge` where it is. Whether it or the identity pips own that slot is a
Design question, not an eng one — the canvas draws pips, the shipped row draws a status, and
both are load-bearing. Record it in the gap report as open rather than deciding it here.

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

### Task 9: Re-verify and write the gap report

**Files:**
- Modify: `docs/superpowers/gap-report-art-wash.md`
- Modify: `docs/superpowers/design-pipeline-status.md`

- [ ] **Step 1: Full gate**

```bash
pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

- [ ] **Step 2: Walk all five surfaces in a browser**

`/decks`, `/` signed in, `/commanders`, `/discover`. At each: labels top on the two `cover`
surfaces, a hairline between art and data everywhere, and the portrait framed identically at a
narrow and a wide window. A ruling is not a walk — load the routes.

- [ ] **Step 3: Rewrite the gap report**

Replace the report's Scope section, which currently rules the whole surface out of scope and is
the reason the first pass reported eight gaps against an incomplete table. Record what this plan
fixed, what stayed held for Design and why, and correct the `PR #450` reference in
`design-pipeline-status.md:306` to `#452`.

- [ ] **Step 4: Run the confirm agent**

Agent 3 of the design-review skill, against the gap list only — not an open-ended re-sweep.

- [ ] **Step 5: Commit and open the PR**

```bash
git add docs/superpowers/gap-report-art-wash.md docs/superpowers/design-pipeline-status.md
git commit -m "docs: gap report for the art wash full-surface build"
```
