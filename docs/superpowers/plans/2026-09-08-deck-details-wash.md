# Deck Details Wash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the deck detail header and the commander detail mobile hero on the shared `<ArtWash>` treatment, with inline deck rename, so both surfaces obey the art wash amendment.

**Architecture:** `<ArtWash>` gains one new portrait band (168) and a `labelEdge` discriminator on its `cover` arm, so the bottom-labelled ramp the amendment draws lives beside the shipped top-labelled one rather than replacing it. Rename behaviour moves into a `useDeckRename` hook so the builder spine can render the field and its buttons in two different DOM slots per breakpoint while the existing `RenameForm` (used by the decks-list overflow menu) keeps a single owner for the state machine. The spine's status bar and chip drop their local percentage thresholds and defer entirely to `statusBarStyle` / `statusPillStyle`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, TypeScript, Vitest (jsdom), Drizzle ORM.

**Spec:**
- `design/design_handoff_the99_deck_details_wash/` (README + `.dc.html` canvas) — merged as PR #468
- `docs/superpowers/design-tables/deck-details-wash.md` — the property table this plan must satisfy row for row

## Global Constraints

- **No raw hex in `src/`.** `src/lib/theme/no-hex.test.ts` enforces it. Colour comes from CSS custom properties only. The `rgba(0,0,0,…)` shadow and ring values the table specifies are exempt in the same way the shipped code already uses them (they are not hex).
- **Six themes.** Every colour is a token that resolves per theme; never a value chosen for one theme.
- **Breakpoints.** The deck spine splits at **768px (`md:`)**. The commander detail page splits at **640px (`sm:`)**. Do not change either.
- **Art source is `art_crop`** on every surface in this plan. Focal point `center top`.
- **No percentage thresholds** anywhere in the progress bar. `statusBarStyle(status, built)` owns the fill colour; the status owns the colour, the count owns the width.
- **`statusPillStyle` verbatim.** The chip takes the shipped helper's output and adds only geometry (radius, padding, font).
- **Type on a wash carries a shadow; type on flat ground does not.**
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus a stub-DB build.
- Stage files by name. Never `git add -A`.

---

## File Structure

**Create:**
- `src/components/decks/use-deck-rename.ts` — the rename state machine (idle / editing / saving / error / disabled-save), keyboard handling, and the server-action call. Owns behaviour, renders nothing.

**Modify:**
- `src/components/ui/art-wash.tsx` — add band 168 to `left-portrait`; add `labelEdge` to the `cover` arm; export the scrim stop constants.
- `src/components/ui/art-wash.test.tsx` — cover the new band and the new ramp.
- `src/lib/theme/wash-contrast.test.ts` — consume the exported stops instead of hardcoded alphas; add bottom-ramp assertions.
- `src/components/decks/deck-card.tsx` — pass `labelEdge="top"` (the shipped tile is top-labelled).
- `src/components/commanders/full-card-trigger.tsx` — accept a placement so the pill can sit in three different corners; scope the click target to the pill.
- `src/lib/decks/read.ts` — add `artCropUri` to the commander select and to `DeckDetail.commander`.
- `src/components/commanders/detail.tsx` — rebuild the mobile hero (`sm:hidden`) on `<ArtWash>`.
- `src/lib/copy/decks-builder.ts` — add `renameCopy`.
- `src/components/decks/rename-form.tsx` — refactor onto the hook, unchanged externally.
- `src/components/decks/builder-spine.tsx` — becomes a shell: the two bands plus the untouched `RollupBands`.

**Create (Tasks 7–8):**
- `src/components/decks/spine-desktop.tsx` — the `md:` 168px `left-portrait` band.
- `src/components/decks/spine-mobile.tsx` — the sub-`md` 2.2/1 `cover` band.

The two bands are a genuine responsive split, not a duplicated subtree: they differ in wash strategy, in label alignment, and — while renaming — in DOM order, which is why the property table gives them separate sections (§B and §C). Splitting them into two files makes that explicit and stops a verify pass marking one subtree MATCH twice.

---

### Task 0: Install

This worktree has no `node_modules`. Every test step below fails with `vitest: command not found` until this runs.

- [ ] Run: `pnpm install`

---

### Task 1: `<ArtWash>` — band 168 and the bottom-labelled cover ramp

**Files:**
- Modify: `src/components/ui/art-wash.tsx:8-77`
- Modify: `src/components/decks/deck-card.tsx:149`
- Modify: `src/components/home/hero-commander.tsx:55`
- Test: `src/components/ui/art-wash.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `export const COVER_SCRIM_STOPS: Record<"top" | "bottom", readonly (readonly [number, number])[]>` — `[alphaPercent, positionPercent]` pairs, consumed by Task 2.
  - `ArtWashProps` cover arm gains `labelEdge: "top" | "bottom"`.
  - `left-portrait` band widens to `168 | 148 | 72`.

The property table (§B) specifies band 168 as: portrait width 230px (`round(168 × 1.37)`), ambient `.20`, sharp `.80`, mask end 58%, horizontal scrim `30% @0px / 26% @134px / 78% @230px / var(--bg) @240px`, vertical scrim `30% @0 / 10% @46% / 42% @100%`. Neither the second stop (134) nor the flat stop (240) is derivable from the band — 148 uses 118/264 and 72 uses 58/138 — so `portrait()` becomes a lookup table keyed on band rather than a chain of ternaries. Only `width` stays derived, because it is `band × PORTRAIT_RATIO` by definition and is also the third scrim stop.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/ui/art-wash.test.tsx`:

```tsx
describe("left-portrait, band 168", () => {
  it("scales the portrait to 230px and lands the flat stop at 240px", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={168} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe("168px");
    const sharp = container.querySelectorAll<HTMLElement>(".art-wash-art")[1];
    expect(sharp.style.width).toBe("230px");
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim");
    expect(scrim?.style.background).toContain("134px");
    expect(scrim?.style.background).toContain("230px");
    expect(scrim?.style.background).toContain("var(--bg) 240px");
  });

  it("draws a lighter vertical scrim than the 148 row's", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={168} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const vertical = container.querySelectorAll<HTMLElement>(".art-wash-scrim")[1];
    expect(vertical.style.background).toContain("180deg");
    expect(vertical.style.background).toContain("var(--bg) 10%, transparent) 46%");
  });

  it("leaves the 148 row's vertical scrim exactly where it shipped", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const vertical = container.querySelectorAll<HTMLElement>(".art-wash-scrim")[1];
    expect(vertical.style.background).toContain("var(--bg) 16%, transparent) 42%");
  });
});

describe("cover, label edge", () => {
  it("puts the heavy end at the top for labelEdge=top", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="top" artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim-cover");
    expect(scrim?.style.background).toContain("var(--bg) 90%, transparent) 0%");
  });

  it("puts the heavy end at the bottom for labelEdge=bottom", () => {
    const { container } = render(
      <ArtWash strategy="cover" labelEdge="bottom" artCropUri="/a.jpg" colorIdentity={["G"]} />,
    );
    const scrim = container.querySelector<HTMLElement>(".art-wash-scrim-cover");
    expect(scrim?.style.background).toContain("var(--bg) 66%, transparent) 0%");
    expect(scrim?.style.background).toContain("var(--bg) 90%, transparent) 100%");
  });
});
```

The asserted substrings must match the string `tint()` actually emits — `color-mix(in oklab, var(--bg) 90%, transparent) 0%`. An assertion of `"90%) 0%"` looks right and can never match, because the alpha and the position are not adjacent in the output. Reading `style.background` for a gradient is safe in this jsdom; `cost-pips.test.tsx:98` is the precedent.

**Also update the nine existing `strategy="cover"` renders in this file** to pass `labelEdge="top"`. `labelEdge` is deliberately required rather than defaulted: a silent default is exactly the drift this amendment exists to stop.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm test src/components/ui/art-wash.test.tsx`
Expected: FAIL — `band={168}` is a type error and `labelEdge` does not exist.

- [ ] **Step 3: Rewrite `portrait()` as a lookup table**

Replace `art-wash.tsx:43-73` with:

```tsx
type Band = 168 | 148 | 72;

/** Keyed to the band, not to the row: `band` is the only input, so both the mask
    and the scrim travel with it at any row width. Neither the near stop nor the
    flat stop scales with the band — each was drawn against its own surface — so
    they are read from the table rather than derived. Only `width` is derived,
    because it is the crop's own aspect and is also the scrim's third stop. */
const BANDS: Record<
  Band,
  {
    maskEnd: number;
    ground: string;
    ambientOpacity: number;
    sharpOpacity: number;
    nearStop: number;
    nearAlpha: number;
    startAlpha: number;
    sharpAlpha: number;
    flatStop: number;
    /** `[startAlpha, midAlpha, midPosition, endAlpha]`. The mid position is per
        band, not shared: 168 damps later than 148 because its type sits lower. */
    vertical: readonly [number, number, number, number] | null;
  }
> = {
  168: {
    maskEnd: 58,
    ground: "--bg",
    ambientOpacity: 0.2,
    sharpOpacity: 0.8,
    nearStop: 134,
    nearAlpha: 26,
    startAlpha: 30,
    sharpAlpha: 78,
    flatStop: 240,
    vertical: [30, 10, 46, 42],
  },
  148: {
    maskEnd: 58,
    ground: "--bg",
    ambientOpacity: 0.2,
    sharpOpacity: 0.8,
    nearStop: 118,
    nearAlpha: 26,
    startAlpha: 30,
    sharpAlpha: 78,
    flatStop: 264,
    vertical: [62, 16, 42, 74],
  },
  72: {
    maskEnd: 62,
    ground: "--surface-inset",
    ambientOpacity: 0.14,
    sharpOpacity: 0.85,
    nearStop: 58,
    nearAlpha: 18,
    startAlpha: 22,
    sharpAlpha: 80,
    flatStop: 138,
    vertical: null,
  },
};

const portrait = (band: Band) => {
  const b = BANDS[band];
  const width = Math.round(band * PORTRAIT_RATIO); // 230 | 203 | 99
  const stops = `${tint(b.ground, b.startAlpha)} 0px, ${tint(b.ground, b.nearAlpha)} ${b.nearStop}px, ${tint(b.ground, b.sharpAlpha)} ${width}px, var(${b.ground}) ${b.flatStop}px`;
  return {
    width,
    ground: b.ground,
    ambientOpacity: b.ambientOpacity,
    sharpOpacity: b.sharpOpacity,
    // Black is the opaque end of a mask's alpha, not a palette colour.
    mask: `linear-gradient(90deg, #000 0 ${b.maskEnd}%, transparent 100%)`,
    scrim: `linear-gradient(90deg, ${stops})`,
    // Layer D: a band that prints type over the full height of the art needs
    // damping at the top and bottom as well as across. The resume row's type
    // starts clear of the portrait, so a vertical ramp there would darken the
    // row for nothing.
    verticalScrim: b.vertical
      ? `linear-gradient(180deg, ${tint("--bg", b.vertical[0])} 0%, ${tint("--bg", b.vertical[1])} ${b.vertical[2]}%, ${tint("--bg", b.vertical[3])} 100%)`
      : null,
  };
};
```

The midpoint is per band precisely because band 148 must not move: it ships at `42%` and there is currently **no test pinning it**, so a shared constant would silently redraw the commander recommendation row. The regression assertion added in Step 1 is what makes that a test failure rather than a surprise.

- [ ] **Step 4: Replace `SCRIM` with the two-edge table**

Replace `art-wash.tsx:8-10` with:

```tsx
/** L3, as `[alphaPercent, positionPercent]` pairs. Heavy where the labels are,
    thin through the middle. Exported because `wash-contrast.test.ts` derives its
    contrast floors from these alphas — the two files drifting apart is the
    failure that test exists to catch. */
export type LabelEdge = "top" | "bottom";

export const COVER_SCRIM_STOPS: Record<LabelEdge, readonly (readonly [number, number])[]> = {
  top: [
    [90, 0],
    [30, 40],
    [52, 74],
    [86, 100],
  ],
  bottom: [
    [66, 0],
    [22, 26],
    [62, 50],
    [90, 100],
  ],
};

const coverScrim = (edge: LabelEdge) =>
  `linear-gradient(180deg, ${COVER_SCRIM_STOPS[edge]
    .map(([alpha, pos]) => `${tint("--bg", alpha)} ${pos}%`)
    .join(", ")})`;
```

Annotate rather than `as const satisfies`. With `as const`, the indexed access `COVER_SCRIM_STOPS[edge]` is a *union* of two distinct readonly tuple types, and calling `.map` on a union of call signatures is TS2349.

- [ ] **Step 5: Widen the props and thread `labelEdge` through**

```tsx
export type ArtWashProps =
  | {
      strategy: "cover";
      band?: never;
      labelEdge: LabelEdge;
      artCropUri: string | null;
      colorIdentity: string[];
    }
  | {
      strategy: "left-portrait";
      band: Band;
      labelEdge?: never;
      artCropUri: string | null;
      colorIdentity: string[];
    };
```

In the cover return, replace `style={{ background: SCRIM }}` with `style={{ background: coverScrim(props.labelEdge) }}`.

- [ ] **Step 6: Update every shipped `cover` call site**

Add `labelEdge="top"` to `src/components/decks/deck-card.tsx:149` and `src/components/home/hero-commander.tsx:55`. Both label at the top, so this preserves their current rendering exactly. `grep -rn 'strategy="cover"' src/` must return no call site without a `labelEdge` when you are done.

- [ ] **Step 7: Run the full suite**

Run: `pnpm test src/components/ui/art-wash.test.tsx && pnpm typecheck`
Expected: PASS. Every pre-existing assertion still holds — band 72 must still assert `not.toContain("var(--bg)")` (its ground is `--surface-inset`) and the reduced-opacity ceiling must still produce exactly `["0.14", "0.3"]`.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/art-wash.tsx src/components/ui/art-wash.test.tsx src/components/decks/deck-card.tsx src/components/home/hero-commander.tsx
git commit -m "feat(ui): art wash gains a 168 band and a bottom-labelled cover ramp"
```

---

### Task 2: Re-derive the contrast floors from the exported stops

**Files:**
- Modify: `src/lib/theme/wash-contrast.test.ts:15-61`

**Interfaces:**
- Consumes: `COVER_SCRIM_STOPS` from Task 1.
- Produces: nothing.

The shipped test hardcodes `SCRIM_AT_TITLE = 0.9` and `SCRIM_AT_META = 0.86` — the exact numbers Task 1 moved into an exported constant. Its own comment says it exists to catch the two files drifting apart, and hardcoding is how they drift. It also only covers the top ramp; the amendment's bottom-labelled surfaces print their heaviest type where that ramp is thinner.

On the bottom ramp the label block starts at 54% of the band. Interpolating between the 50% stop (62%) and the 100% stop (90%) gives α ≈ 0.643 at that line — the worst ground any bottom-ramp string sits on. Design's own weakest measured figure there is 5.06:1, so a 4.5:1 floor is a floor, not a target.

**If a theme fails, report it — do not lower the floor.** A failure means a theme cannot carry the amendment's type, which is a design finding.

- [ ] **Step 1: Replace the hardcoded alphas**

```ts
import { COVER_SCRIM_STOPS } from "../../components/ui/art-wash";

/** Read off the shipped gradient rather than restated, so a stop moving in
    `art-wash.tsx` moves the floor this test asserts. */
const alphaAt = (edge: "top" | "bottom", position: number): number => {
  const stops = COVER_SCRIM_STOPS[edge];
  for (let i = 1; i < stops.length; i++) {
    const [a1, p1] = stops[i];
    const [a0, p0] = stops[i - 1];
    if (position <= p1) {
      return (a0 + ((a1 - a0) * (position - p0)) / (p1 - p0)) / 100;
    }
  }
  return stops[stops.length - 1][0] / 100;
};

const TOP_AT_TITLE = alphaAt("top", 0); // 0.90 — the label band
const TOP_AT_META = alphaAt("top", 100); // 0.86 — the bottom band, where the chip sits
const BOTTOM_AT_LABEL = alphaAt("bottom", 54); // ≈0.643 — where the label block starts
```

- [ ] **Step 2: Point the existing assertions at the new constants**

Replace `SCRIM_AT_TITLE` with `TOP_AT_TITLE` and `SCRIM_AT_META` with `TOP_AT_META` in the two existing `it` blocks, and rename them to say `top ramp`.

- [ ] **Step 3: Add the bottom-ramp assertions**

Inside the same `for (const theme of THEMES.keys())` loop:

```ts
it(`${theme}: bottom-ramp title ink clears 4.5:1 at the label edge`, () => {
  const ground = washGround(token(theme, "bg"), BOTTOM_AT_LABEL);
  expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(4.5);
});

it(`${theme}: bottom-ramp meta ink clears 4.5:1 at the label edge`, () => {
  const ground = washGround(token(theme, "bg"), BOTTOM_AT_LABEL);
  expect(contrast(token(theme, "fg-body"), ground)).toBeGreaterThanOrEqual(4.5);
});
```

- [ ] **Step 4: Run**

Run: `pnpm test src/lib/theme/wash-contrast.test.ts`
Expected: PASS, 25 tests (1 theme-count + 4 per theme × 6). If any theme fails, stop and record the theme and figure — that is a Design finding, not a number to soften.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/wash-contrast.test.ts
git commit -m "test(theme): derive wash contrast floors from the shipped scrim stops"
```

---

### Task 3: `FullCardTrigger` — three placements, and a tap target that can be withheld

**Files:**
- Modify: `src/components/commanders/full-card-trigger.tsx`
- Test: `src/components/commanders/full-card-trigger.test.tsx` — **it already exists**, with four tests (label, modal open, `aria-busy`, band tap). Append a `describe` block and reuse its existing `renderTrigger` helper. Do not overwrite the file.

**Interfaces:**
- Consumes: nothing.
- Produces: `FullCardTrigger({ oracleId, placement = "hero", bandTapTarget = true })` where `placement: "hero" | "deck-desktop" | "deck-mobile"`.

The property table places this pill in three different corners: `top:56 right:16` on the commander hero (§D), `left:16 bottom:14` on the desktop deck header (§B), `top:13 right:16` on the mobile deck header (§C).

The full-band `absolute inset-0` tap layer must not ship on the deck header. That band also holds the title button and the rename pencil, and a full-band click layer above them would swallow both. It stays on the commander hero, where the state table asks for it and nothing else in the band is interactive.

- [ ] **Step 1: Write the failing test**

Append to `src/components/commanders/full-card-trigger.test.tsx`, calling the file's own `renderTrigger` helper (aliased below as `mount`) rather than mounting a bare `CardDetailProvider` — its `fetchCard` is optional but defaults to a real server action:

```tsx
describe("FullCardTrigger placement", () => {
  it("defaults to the hero corner with a band tap target", () => {
    const { container } = mount(<FullCardTrigger oracleId="o1" />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.top).toBe("56px");
    expect(pill.style.right).toBe("16px");
    expect(container.querySelector('[aria-hidden="true"].inset-0')).not.toBeNull();
  });

  it("sits bottom-left on the desktop deck header and draws no band tap target", () => {
    const { container } = mount(
      <FullCardTrigger oracleId="o1" placement="deck-desktop" bandTapTarget={false} />,
    );
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.left).toBe("16px");
    expect(pill.style.bottom).toBe("14px");
    expect(pill.style.top).toBe("");
    expect(container.querySelector('[aria-hidden="true"].inset-0')).toBeNull();
  });

  it("sits top-right at 13px on the mobile deck header", () => {
    mount(<FullCardTrigger oracleId="o1" placement="deck-mobile" bandTapTarget={false} />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.top).toBe("13px");
    expect(pill.style.right).toBe("16px");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/commanders/full-card-trigger.test.tsx`
Expected: FAIL — `placement` and `bandTapTarget` are not props.

- [ ] **Step 3: Add the placements**

```tsx
/** The three corners the pill sits in. `hero` is the commander page's mobile
    art header; the two `deck-*` values are the deck header at its two widths,
    where the pill moves out of the way of the title and the rename pencil. */
const PLACEMENT = {
  hero: { top: 56, right: 16 },
  "deck-desktop": { left: 16, bottom: 14 },
  "deck-mobile": { top: 13, right: 16 },
} as const;

export function FullCardTrigger({
  oracleId,
  placement = "hero",
  bandTapTarget = true,
}: {
  oracleId: string;
  placement?: keyof typeof PLACEMENT;
  /** The deck header withholds this: that band also carries the title button and
      the rename pencil, and a full-band click layer above them eats both. */
  bandTapTarget?: boolean;
}) {
```

Guard the tap layer with `{bandTapTarget ? (…) : null}` and spread the placement into the button's `style` in place of the literal `top: 56, right: 16`.

- [ ] **Step 4: Run**

Run: `pnpm test src/components/commanders/full-card-trigger.test.tsx && pnpm typecheck`
Expected: PASS. `detail.tsx`'s existing call site needs no change — both new props default to today's behaviour.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/full-card-trigger.tsx src/components/commanders/full-card-trigger.test.tsx
git commit -m "feat(commanders): FullCardTrigger takes a placement and an optional band tap target"
```

---

### Task 4: Carry `artCropUri` on the deck's commander

**Files:**
- Modify: `src/lib/decks/read.ts:85-142`

**Interfaces:**
- Consumes: nothing.
- Produces: `DeckDetail["commander"]` gains `artCropUri: string | null`, consumed by Tasks 7 and 8.

Every wash in this plan sources `art_crop`. `getDeckDetail` currently selects `imageUri` only, so the deck header has no crop to wash with. The column already exists on the cards table — the commander detail page reads it — so this is a select and a type, not a migration.

- [ ] **Step 1: Confirm the column name**

Run: `grep -n "artCropUri" src/db/schema.ts src/components/commanders/detail.tsx | head -20`
Expected: the schema column and at least one existing reader. Use whatever name the schema declares; do not assume.

- [ ] **Step 2: Add it to the type and the select**

In the `DeckDetail` commander type (`read.ts:85-100` region) add `artCropUri: string | null;` beside `imageUri`. In the commander select (`read.ts:129-140`) add the matching column. Both must move together — the type and the select mirroring each other is the file's existing shape.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: PASS. No consumer breaks — this is an addition.

- [ ] **Step 4: Commit**

```bash
git add src/lib/decks/read.ts
git commit -m "feat(decks): carry the commander art crop on the deck detail payload"
```

---

### Task 5: The commander page's mobile hero, on the wash

**Files:**
- Modify: `src/components/commanders/detail.tsx:234-305`

**Interfaces:**
- Consumes: `ArtWash` `labelEdge="bottom"` (Task 1), `FullCardTrigger` defaults (Task 3).
- Produces: nothing.

Property table §D. The band today is a bare `background-image` with an `inset` box-shadow standing in for a scrim, `imageUri` as its source, hand-rolled 16px round pips, and a `var(--accent)` eyebrow. The amendment moves it onto the shared wash: `art_crop`, the bottom ramp, `IdentityPips`, and an eyebrow in `var(--fg-body)` because `var(--accent)` measured below the floor on art.

Measured figures the table records for this band: eyebrow 5.06:1 at the top edge / 5.23:1 at the midline, name 6.7:1, type 6.8:1.

- [ ] **Step 1: Confirm the crop reaches this component**

Run: `grep -n "artCropUri\|imageUri" src/components/commanders/detail.tsx src/lib/recs/score.ts | head`
Expected: `score.ts:8` and `:31` carry `artCropUri`, so the commander object already has it. If `detail.tsx`'s own prop type narrows it away, widen that type — do not fall back to `imageUri`.

- [ ] **Step 2: Replace the band**

```tsx
{/* ── Mobile: art header band ─────────────────────────────────── */}
<div className="sm:hidden relative flex-none" style={{ aspectRatio: "1.6 / 1" }}>
  <ArtWash
    strategy="cover"
    labelEdge="bottom"
    artCropUri={c.artCropUri}
    colorIdentity={c.colorIdentity}
  />

  <div className="absolute" style={{ top: 14, right: 16 }}>
    <IdentityPips colorIdentity={c.colorIdentity} size={12} />
  </div>

  <FullCardTrigger oracleId={c.oracleId} />

  {/* pointer-events-none so taps fall through to the full-band trigger */}
  <div className="absolute pointer-events-none" style={{ left: 16, right: 16, bottom: 15 }}>
    <p
      className="m-0 font-mono uppercase"
      style={{
        fontSize: 11,
        letterSpacing: "0.14em",
        color: "var(--fg-body)",
        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
      }}
    >
      Rank {rank}
      {isBestFit ? " · your best fit" : ""}
    </p>
    <h1
      className="font-display font-[700] m-0"
      style={{
        fontSize: 25,
        color: "var(--fg)",
        lineHeight: 1.15,
        marginTop: 4,
        textShadow: "0 1px 4px rgba(0,0,0,0.85)",
      }}
    >
      {c.name}
    </h1>
    <p
      className="m-0"
      style={{
        fontSize: 12.5,
        color: "var(--fg-body)",
        marginTop: 4,
        textShadow: "0 1px 4px rgba(0,0,0,0.85)",
      }}
    >
      {c.typeLine}
    </p>
  </div>
</div>
```

Import `ArtWash` from `../ui/art-wash` and `IdentityPips` from `./commander-art`.

- [ ] **Step 3: Remove what the wash replaced**

Delete the hand-rolled pip loop. Then check whether `WUBRG_COLOR`, `gradient`, `cssUrl` and `c.imageUri` still have any other consumer in this file — remove each import and local that no longer does. `IdentityPips` returns `null` on an empty identity, so the old `c.colorIdentity.length > 0` guard is redundant; drop it rather than keeping both.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test src/components/commanders`
Expected: PASS. If a snapshot or query in an existing commander test targets the removed pip markup, update it to query `IdentityPips`' wrapper — do not restore the old markup to keep a test green.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/detail.tsx
git commit -m "feat(commanders): move the mobile hero onto the shared art wash"
```

---

### Task 6: Rename — one state machine, two layouts

**Files:**
- Create: `src/components/decks/use-deck-rename.ts`
- Modify: `src/lib/copy/decks-builder.ts`
- Modify: `src/components/decks/rename-form.tsx`
- Test: `src/components/decks/use-deck-rename.test.tsx`

**Interfaces:**
- Consumes: `renameDeck` from `src/app/decks/actions.ts:595`.
- Produces:
  - `useDeckRename(deckId: string, currentName: string, onDone: () => void)` returning `{ value, setValue, error, isPending, canSave, commit, cancel, onKeyDown, onBlur }`.
  - `renameCopy` from `src/lib/copy/decks-builder.ts`.

The builder spine has to render the field and the Save/Cancel pair in **two different DOM slots** — desktop puts the buttons in the actions column beside the band, mobile puts them inside the band under the field — while the decks-list overflow menu keeps `RenameForm`'s stacked layout. One behaviour, three layouts, so the behaviour moves into a hook and every layout consumes it.

Property table §F names five states: idle, editing, saving, error, and save-disabled (empty or unchanged). Enter commits · Esc reverts · **blur commits**.

Blur-commits is why Cancel needs `onMouseDown={(e) => e.preventDefault()}` — without it the blur fires first and commits the very edit the click was cancelling.

- [ ] **Step 1: Write the failing test**

Create `src/components/decks/use-deck-rename.test.tsx`:

```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renameCopy } from "../../lib/copy/decks-builder";
import { useDeckRename } from "./use-deck-rename";

const renameDeck = vi.hoisted(() => vi.fn());
vi.mock("../../app/decks/actions", () => ({ renameDeck }));

describe("useDeckRename", () => {
  beforeEach(() => renameDeck.mockReset().mockResolvedValue(undefined));

  it("cannot save an unchanged or empty name", () => {
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", () => {}));
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setValue("   "));
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setValue("Atraxa Superfriends"));
    expect(result.current.canSave).toBe(true);
  });

  it("Enter on an unchanged name is inert and leaves the field open", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() =>
      result.current.onKeyDown({
        key: "Enter",
        preventDefault: () => {},
      } as React.KeyboardEvent<HTMLInputElement>),
    );
    expect(renameDeck).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("commits the trimmed name and calls onDone", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() => result.current.setValue("  Superfriends  "));
    await act(async () => result.current.commit());
    expect(renameDeck).toHaveBeenCalledWith("d1", "Superfriends");
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("reverts on Escape without calling the action", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() => result.current.setValue("Nope"));
    act(() =>
      result.current.onKeyDown({
        key: "Escape",
        preventDefault: () => {},
      } as React.KeyboardEvent<HTMLInputElement>),
    );
    expect(renameDeck).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("surfaces an error and stays open when the action rejects", async () => {
    renameDeck.mockRejectedValue(new Error("nope"));
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() => result.current.setValue("Superfriends"));
    await act(async () => result.current.commit());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("an over-length name takes the error row rather than an inert Save", async () => {
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", () => {}));
    act(() => result.current.setValue("x".repeat(121)));
    expect(result.current.canSave).toBe(true);
    await act(async () => result.current.commit());
    expect(renameDeck).not.toHaveBeenCalled();
    expect(result.current.error).toBe(renameCopy.errorLength);
  });

  it("a blur with no change closes without calling the action", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    await act(async () => result.current.onBlur());
    expect(renameDeck).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/decks/use-deck-rename.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the copy**

Append to `src/lib/copy/decks-builder.ts` (note the file's curly apostrophe style):

```ts
/** Deck rename. The hint is the one string that names both keys, so it is set
    in mono at the same tracking as the rest of the spine's instrument type. */
export const renameCopy = {
  triggerAria: "Rename deck",
  fieldAria: "Deck name",
  hint: "↵ save · esc cancel",
  save: "Save",
  saving: "Saving…",
  retry: "Retry",
  cancel: "Cancel",
  errorLength: "A deck name is 1–120 characters.",
  errorControl: "That name can’t contain control characters.",
  errorFailed: "That didn’t save. Try again.",
} as const;
```

- [ ] **Step 4: Write the hook**

```ts
"use client";

import { useCallback, useState, useTransition } from "react";
import { renameDeck } from "../../app/decks/actions";
import { renameCopy } from "../../lib/copy/decks-builder";

const MAX_NAME = 120;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * The rename state machine, with no layout of its own. The builder spine renders
 * the field and its buttons in two different DOM slots per breakpoint and the
 * decks-list menu renders them stacked; all three share this.
 *
 * Blur commits. That is deliberate — the field is a title in place, not a form,
 * and clicking away from a title you just edited means you meant the edit. It is
 * also why any Cancel control must `preventDefault` on mousedown: otherwise the
 * blur lands first and saves the edit the click was refusing.
 */
export function useDeckRename(deckId: string, currentName: string, onDone: () => void) {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = value.trim();
  const changed = trimmed !== currentName.trim();
  // Length is not part of `canSave`: an over-length name is a name the reader typed
  // and can be told about, so it takes the error row. Empty and unchanged are the
  // only two cases §F draws as an inert Save.
  const canSave = !isPending && trimmed.length > 0 && changed;

  const cancel = useCallback(() => {
    setValue(currentName);
    setError(null);
    onDone();
  }, [currentName, onDone]);

  // Inert rather than an error when there is nothing to save. §F draws the
  // empty and unchanged cases as a disabled Save, not as a validation failure,
  // so Enter on either does nothing at all and the field stays open.
  const commit = useCallback(() => {
    if (!canSave) return;
    if (trimmed.length > MAX_NAME) {
      setError(renameCopy.errorLength);
      return;
    }
    if (CONTROL_CHARS.test(trimmed)) {
      setError(renameCopy.errorControl);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await renameDeck(deckId, trimmed);
        onDone();
      } catch {
        setError(renameCopy.errorFailed);
      }
    });
  }, [canSave, deckId, onDone, trimmed]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [cancel, commit],
  );

  // A blur while the error is showing must not re-fire the request that failed:
  // the reader is looking at the message, and re-submitting on the way out would
  // replace it with a second identical failure they never asked for.
  const onBlur = useCallback(() => {
    if (isPending || error) return;
    if (!changed) {
      cancel();
      return;
    }
    commit();
  }, [cancel, changed, commit, error, isPending]);

  return { value, setValue, error, isPending, canSave, commit, cancel, onKeyDown, onBlur };
}
```

- [ ] **Step 5: Refactor `RenameForm` onto the hook**

Keep the component's props and its stacked layout byte-for-byte where the table does not speak. Replace its local `useState`/`useTransition`/`handleSubmit` with the hook, take error strings from `renameCopy`, and add `onKeyDown` to the `TextField`.

**Do not wire `onBlur` here.** Blur-commit is a §F ruling about the deck header's title-in-place; `RenameForm` is the decks-list overflow menu's form, where it was never asked for. Wiring it would also double-submit: blur fires before the Save button's `click`, and the click handler's `isPending` is a stale closure.

Give Cancel `onMouseDown={(e) => e.preventDefault()}` regardless — it costs nothing and guards the same class of bug.

While saving, the input is **`readOnly`, not `disabled`** (§F). A disabled input blurs, and a blurred field on the header would fire the blur path mid-save.

- [ ] **Step 6: Run**

Run: `pnpm test src/components/decks && pnpm typecheck && pnpm lint`
Expected: PASS, including any existing `rename-form` test.

- [ ] **Step 7: Commit**

```bash
git add src/components/decks/use-deck-rename.ts src/components/decks/use-deck-rename.test.tsx src/components/decks/rename-form.tsx src/lib/copy/decks-builder.ts
git commit -m "refactor(decks): rename behaviour moves into a hook two layouts can share"
```

---

### Task 7: The desktop deck header — a 168px portrait band

**Files:**
- Create: `src/components/decks/spine-desktop.tsx`
- Modify: `src/components/decks/builder-spine.tsx:280-535`
- Test: `src/components/decks/spine-desktop.test.tsx`

**Interfaces:**
- Consumes: `ArtWash` band 168 (Task 1), `FullCardTrigger` `placement="deck-desktop"` (Task 3), `deck.commander.artCropUri` (Task 4), `useDeckRename` + `renameCopy` (Task 6), and the shipped `statusPillStyle` / `statusBarStyle`.
- Produces: `SpineDesktop(props: SpineBandProps)` — the same prop bag `BuilderSpine` already receives, minus the rollup props.

Property table §B. Content sits at a **254px** left inset — past the scrim's 240px flat stop — so every string in this band is on flat ground and **carries no shadow**. That is the shared rule, not an exception.

The 72×100 `CardDetailTrigger` thumbnail is retired: the art is the band now, and `Card details` is the way in.

Three knowing divergences from the drawing, carried forward from the shipped over-99 amendment which the deck-details canvas predates. **Record all three in the gap report; do not silently drop them and do not send them back to Design.**
1. The `+N` over figure stays in the count row.
2. The trim line stays under the owned line.
3. The built figure still recolours to `var(--warning)` when `built > 99`.

What is retired: the percentage tri-state bar fill (`≥99 success / ≥55 warning / else danger`) and the second amber bar segment. `statusBarStyle(status, built)` owns the fill outright, clamped at 100%.

- [ ] **Step 1: Write the failing test**

Create `src/components/decks/spine-desktop.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SpineDesktop } from "./spine-desktop";
import { deck, props } from "./spine-fixtures";
```

…where `spine-fixtures.ts` exports both, so `spine-mobile.test.tsx` cannot drift from it:

```ts
export const deck = {
  id: "d1",
  name: "Atraxa Superfriends",
  commander: {
    oracleId: "o1",
    name: "Atraxa, Praetors’ Voice",
    colorIdentity: ["W", "U", "B", "G"],
    artCropUri: "/crop.jpg",
    imageUri: "/full.jpg",
    typeLine: "Legendary Creature",
    manaCost: "{G}{W}{U}{B}",
    oracleText: "",
  },
};

export const props = {
  deck,
  counts: { built: 62, ownedCount: 54, toBuyCount: 8 },
  status: "Building" as const,
  onExport: () => {},
};
```

Then the suite itself:

```tsx
describe("SpineDesktop", () => {
  it("washes the band at 168 with the commander's art crop", () => {
    const { container } = render(<SpineDesktop {...props} />);
    const wash = container.querySelector<HTMLElement>('[aria-hidden="true"].absolute');
    expect(wash?.style.height).toBe("168px");
  });

  it("colours the bar by status, not by percentage", () => {
    const { container } = render(<SpineDesktop {...props} status="To buy" />);
    const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
    expect(fill?.style.background).toBe("var(--accent)");
    expect(fill?.style.width).toBe(`${(62 / 99) * 100}%`);
  });

  it("clamps the bar at 100% past 99 and keeps the over figure", () => {
    const { container } = render(
      <SpineDesktop {...props} counts={{ built: 104, ownedCount: 100, toBuyCount: 4 }} status="Over" />,
    );
    const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
    expect(fill?.style.width).toBe("100%");
    expect(screen.getByText(/5/)).toBeTruthy();
  });

  it("swaps the actions slot for the rename hint while editing", async () => {
    const user = userEvent.setup();
    render(<SpineDesktop {...props} />);
    await user.click(screen.getByRole("button", { name: "Rename deck" }));
    expect(screen.getByLabelText("Deck name")).toBeTruthy();
    expect(screen.getByText("↵ save · esc cancel")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  it("holds the field's box across every editing state", async () => {
    const user = userEvent.setup();
    render(<SpineDesktop {...props} />);
    await user.click(screen.getByRole("button", { name: "Rename deck" }));
    const field = screen.getByLabelText("Deck name") as HTMLInputElement;
    const box = [field.style.width, field.style.height];
    expect(box).toEqual(["352px", "29px"]);

    // save-disabled: cleared name
    await user.clear(field);
    expect(screen.getByRole("button", { name: /Save/ }).getAttribute("aria-disabled")).toBe("true");
    expect([field.style.width, field.style.height]).toEqual(box);

    // and the hint row is present in every state, so no row is ever added
    expect(screen.getByTestId("spine-rename-hint")).toBeTruthy();
  });

  it("drops the Card details pill when the commander has no crop", () => {
    const bare = { ...deck, commander: { ...deck.commander, artCropUri: null } };
    render(<SpineDesktop {...props} deck={bare} />);
    expect(screen.queryByRole("button", { name: "View card details" })).toBeNull();
  });
});
```

The rename hint row needs `data-testid="spine-rename-hint"` and the field needs explicit `width: 352, height: 29` in its inline style for these assertions to read anything — jsdom computes no layout, so the box has to be declared, which is what §B asks for anyway.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/decks/spine-desktop.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the band**

`src/components/decks/spine-desktop.tsx`, marked `"use client"`. Structure:

```tsx
<header className="hidden md:block relative group" style={{ height: 168 }}>
  <ArtWash
    strategy="left-portrait"
    band={168}
    artCropUri={commander.artCropUri}
    colorIdentity={commander.colorIdentity}
  />
  {/* §G: with no crop there is no printing to open, so the pill is absent —
      and because it is absolutely positioned, its absence shifts nothing. */}
  {commander.artCropUri ? (
    <FullCardTrigger oracleId={commander.oracleId} placement="deck-desktop" bandTapTarget={false} />
  ) : null}

  <div
    className="relative h-full flex items-center"
    style={{ padding: "0 24px 0 254px", gap: 18 }}
  >
    <div className="flex-1 min-w-0 flex flex-col">
      {/* title row */}
      {/* meta row */}
      {/* count row */}
      {/* bar */}
      {/* owned line */}
      {/* trim line, when over */}
    </div>
    <div className="flex-none">{/* actions slot */}</div>
  </div>
</header>
```

Exact figures, all from §B:

- **Title, at rest** — a button, `font-display font-[700]`, `fontSize: 21`, `lineHeight: 1.2`, `color: var(--fg)`, **no text-shadow**, two-line clamp via `display: "-webkit-box"`, `WebkitLineClamp: 2`, `WebkitBoxOrient: "vertical"`, `overflow: "hidden"`. **No `max-height`** (table preamble, blocker 6: the clamp ships as `-webkit-line-clamp`, and the 51px figure is the canvas equivalent, not a second rule) and **no `min-height`** — a one-line name must not reserve two lines of air.
- **Pencil** — 28×28, `border: "1px solid var(--border-strong)"`, `borderRadius: 6`, `color: "var(--fg-muted)"`, `fontSize: 13`, `marginLeft: 6`, `flex-none`, `background: transparent` going to `var(--elevated-hover)` on its own hover (§E). Reveal on row hover with `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity`. `aria-label={renameCopy.triggerAria}`. Focus-visible must reveal it too, or it is keyboard-unreachable.
- **Title, while editing** — an `<input>` at **352×29 in all four editing states** (idle-edit, saving, error, save-disabled): `background: var(--surface-sunken)`, `border: 1px solid var(--accent)`, `borderRadius: 8`, `padding: "1px 10px"`, `margin: "-2px 0 -2px -11px"`, `whiteSpace: "nowrap"`, `overflow: "hidden"`, `font-display font-[700]`, `fontSize: 21`, `lineHeight: 1.2`, `color: var(--fg)`, and `focus-visible:outline-none` — the 1px accent border **is** the focus indicator here (§A, table row 27), which is the one place in the app that overrides the base focus ring. While saving the input is `readOnly`, **never** `disabled` (§F row 322). The negative margin is what makes the field's ink land on the same baseline the title occupied — zero reflow is the point of the fixed 29px height, so **do not** let the field grow with an error message.
- **Meta row** — `display: flex; align-items: center; gap: 10px`, containing `<IdentityPips colorIdentity={commander.colorIdentity} size={10} />`, then a mono 11px `var(--fg-body)` `{commander.name} · {identityLabel}`, then the chip: `style={{ ...statusPillStyle(status), borderRadius: 6, padding: "3px 8px" }}` with `font-mono` at 11px, rendered through `StatusPillBadge` so the copy key stays its owner.
- **Count row** — `font-mono font-semibold` at 20px (`color: over ? "var(--warning)" : "var(--fg)"`), then `font-mono` 13px `var(--fg-faint)` `/ 99`, then the `+N` figure when over.
- **Bar** — track `width: 170, height: 6, borderRadius: 999, background: "var(--elevated)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)", overflow: "hidden"`; fill a single `<div data-testid="spine-bar-fill" style={statusBarStyle(status, built)} className="h-full" />`. One segment. No thresholds.
- **Owned line** — `font-mono` 11px `var(--fg-faint)`, still gated on `built > 0`.
- **Actions slot, at rest** — the `Update from a list` GhostButton (gated on `built > 0`) and the Export `PrimaryButton` / disabled variant, lifted verbatim from `builder-spine.tsx:469-534`'s desktop branches.
- **Actions slot, while editing** — the buttons are **replaced**, not joined, by a `flex flex-col` at `gap: 7`: a row holding Save and Cancel, then a `font-mono` 10px `letterSpacing: "0.08em"` line with `minHeight: 16` carrying the hint. The `minHeight` is what holds the column's height constant across all four states. Per §F rows 322–330, by state:

  | | idle-edit | saving | error | save-disabled |
  |---|---|---|---|---|
  | field | editable | **read-only** | editable | editable |
  | Save label | `renameCopy.save` | `renameCopy.saving` at `opacity: 0.6` | `renameCopy.retry` | `renameCopy.save` |
  | Save ink | `var(--bg)` | `var(--bg)` | `var(--bg)` | `var(--fg-disabled)` |
  | Save ground | filled | filled | filled | `var(--elevated)` |
  | Save a11y | — | — | — | `aria-disabled`, Enter inert |
  | hint text | `renameCopy.hint` | `renameCopy.saving` | the error | `renameCopy.hint` |
  | hint ink | `var(--fg-faint)` | `var(--fg-faint)` | `var(--danger)` | `var(--fg-disabled)` |

  Save is `aria-disabled`, **not** `disabled` — disabling the focused control blurs it, and blur commits. Cancel is live in every state and takes `onMouseDown={(e) => e.preventDefault()}`.

- [ ] **Step 4: Reduce `builder-spine.tsx` to a shell**

Replace `builder-spine.tsx:280-535` with `<SpineDesktop {...bandProps} />` and (after Task 8) `<SpineMobile {...bandProps} />`, keeping the `RollupBands` block and the `<>…</>` wrapper unchanged. Delete `pct`, `over`, `toCut`, `legalPercent`, `thumbGradient`, `renaming`, and every import that goes unused with them — `CardDetailTrigger`, `commanderGradient`, `WUBRG_COLOR`, `RenameForm`. `RollupBands` and its own imports stay.

Until Task 8 lands, leave the existing mobile markup in place inside `builder-spine.tsx` behind `md:hidden` so the surface never ships broken between commits.

- [ ] **Step 5: Verify**

Run: `pnpm test src/components/decks && pnpm typecheck && pnpm lint`
Expected: PASS. Any existing builder-spine test asserting the retired thumbnail or the percentage fill must be **rewritten to the new contract**, not deleted — the behaviour it covered still exists, under new rules.

- [ ] **Step 6: Commit**

```bash
git add src/components/decks/spine-desktop.tsx src/components/decks/spine-desktop.test.tsx src/components/decks/builder-spine.tsx
git commit -m "feat(decks): the desktop deck header becomes a 168px portrait wash"
```

---

### Task 8: The mobile deck header — a 2.2/1 cover band

**Files:**
- Create: `src/components/decks/spine-mobile.tsx`
- Modify: `src/components/decks/builder-spine.tsx`
- Test: `src/components/decks/spine-mobile.test.tsx`

**Interfaces:**
- Consumes: `ArtWash` `labelEdge="bottom"` (Task 1), `FullCardTrigger` `placement="deck-mobile"` (Task 3), `artCropUri` (Task 4), `useDeckRename` + `renameCopy` (Task 6).
- Produces: `SpineMobile(props: SpineBandProps)`.

Property table §C. Everything in this band is centred and **on the wash**, so every string carries a shadow — the exact inverse of Task 7's flat-ground rule.

The one structural difference from desktop: **the meta row moves below the divider while editing.** Zero reflow is a desktop-only claim; here the field needs the band's width and the meta row makes way for it. Do not try to hold the mobile layout still.

The owned line (`54 owned · 8 to buy`) is **not drawn on mobile at any state**.

- [ ] **Step 1: Write the failing test**

Create `src/components/decks/spine-mobile.test.tsx`, importing the shared fixtures:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SpineMobile } from "./spine-mobile";
import { props } from "./spine-fixtures";

it("never draws the owned line", () => {
  render(<SpineMobile {...props} />);
  expect(screen.queryByText(/owned ·/)).toBeNull();
});

it("moves the meta row below the divider while editing", async () => {
  const user = userEvent.setup();
  const { container } = render(<SpineMobile {...props} />);
  const band = container.querySelector("[data-testid='spine-band']")!;
  expect(band.textContent).toContain("Atraxa, Praetors’ Voice");
  await user.click(screen.getByRole("button", { name: "Rename deck" }));
  expect(band.textContent).not.toContain("Atraxa, Praetors’ Voice");
  expect(screen.getByText(/Atraxa, Praetors’ Voice/)).toBeTruthy();
});

it("colours the bar by status", () => {
  const { container } = render(<SpineMobile {...props} status="Complete" />);
  const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
  expect(fill?.style.background).toBe("var(--success)");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/decks/spine-mobile.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the band**

`src/components/decks/spine-mobile.tsx`, `"use client"`. Figures, all from §C:

- **Band** — `<header className="md:hidden">`, band `<div data-testid="spine-band" className="relative" style={{ aspectRatio: "2.2 / 1" }}>` holding `<ArtWash strategy="cover" labelEdge="bottom" artCropUri={commander.artCropUri} colorIdentity={commander.colorIdentity} />`.
- **`Card details`** — `<FullCardTrigger oracleId={commander.oracleId} placement="deck-mobile" bandTapTarget={false} />`, which is what occupies `top:13 right:16` (§C4). Gate it on `commander.artCropUri` exactly as Task 7 does.
- **Chip** — **in the centred meta row, not pinned to the corner** (§C8). `statusPillStyle(status)` plus `borderRadius: 6, padding: "3px 8px"`, `font-mono` 10px, and **no shadow** — it has its own plate. The corner is the pill's.
- **Label block** — `position: absolute, left: 18, right: 18, bottom: 12`, `display: flex; flex-direction: column; align-items: center`, `gap: 6` at rest and **`gap: 8` while editing**.
- **Title** — `font-display font-[700]`, `fontSize: 20`, `lineHeight: 1.25`, `textAlign: "center"`, two-line clamp via `-webkit-line-clamp: 2` with **no `max-height` and no `min-height`**, `textShadow: "0 1px 4px rgba(0,0,0,0.85)"`.
- **Pencil** — **44×44** (a phone target, not the desktop 28), `background: var(--surface-sunken)`, `border: 1px solid var(--border-strong)`, `borderRadius: 8`, `color: var(--fg)`, `fontSize: 15`, and **always visible** — there is no hover on a phone.
- **Meta row (at rest, inside the band)** — centred, `<IdentityPips size={10} />`, then `font-mono` 10px subtitle **with** `textShadow: "0 1px 4px rgba(0,0,0,0.85)"`.
- **Editing** — the field is full width inside the band, with a 44px-tall Save and Cancel pair beneath it. Same hook, same copy keys, same `onMouseDown` guard on Cancel.
- **Below the divider** — `<div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px 12px" }}>`, children in order **count → bar** at rest and **meta → count → bar** while editing. Built figure `font-mono font-semibold` 14px; `/ 99` `font-mono` 14px `var(--fg-faint)`; the track full width at 6px with the same radius, ground and inset ring as desktop; fill `statusBarStyle(status, built)` on a `data-testid="spine-bar-fill"`.
- **Actions row** — `padding: "4px 16px 14px", gap: 8, justifyContent: "center"`, holding the mobile Export link and the `Update from a list` GhostButton lifted verbatim from `builder-spine.tsx`'s `md:hidden` branches.
- **Trim line** — keep it, centred, under the bar, exactly as the shipped mobile spine draws it. Same knowing divergence as Task 7.

- [ ] **Step 4: Finish the shell**

`builder-spine.tsx` now renders only:

```tsx
<>
  <SpineDesktop {...band} />
  <SpineMobile {...band} />
  {(overCommitted > 0 || softClaimed > 0) && <RollupBands … />}
</>
```

Delete every remaining piece of the old header and every import it alone used.

- [ ] **Step 5: Verify the whole gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: all PASS.

- [ ] **Step 6: Walk the real surface**

Start `pnpm dev`, open a deck detail page, and check at **both** widths (a 390px viewport and a 1280px one):
1. The band renders art, not a flat gradient, and the title is legible against it.
2. Rename: pencil → field → Enter saves, Esc reverts, clicking away saves, clicking Cancel does **not** save.
3. On desktop, the actions slot swaps for the hint column and the band does not change height between the four editing states.
4. On mobile, the meta row moves below the divider while editing and back after.
5. A deck at 0, a deck mid-build, and a deck over 99 each colour the bar by status alone.

This step is not optional and not satisfiable by reading the code.

- [ ] **Step 7: Commit**

```bash
git add src/components/decks/spine-mobile.tsx src/components/decks/spine-mobile.test.tsx src/components/decks/spine-fixtures.ts src/components/decks/builder-spine.tsx
git commit -m "feat(decks): the mobile deck header becomes a cover wash with an in-band rename"
```

---

## Open items to surface, never to drop

These go in the PR body and the gap report. None of them blocks the build.

1. **The no-commander state is unreachable.** Property table §G. `src/db/schema.ts:185` makes the column NOT NULL and `src/lib/decks/read.ts:142` returns null when the commander is absent, so the page never renders. `commanderGradient([])` returns a colourless gradient, so an empty colour identity is not the same case. No code is written for it.
2. **`COVER_PLATE` versus `var(--bg)` as the band ground.** The cover plate (`--bg` at 86% over black) is a ratified parent-handoff decision that stops a light flash on a slow image, so it stays. Whether the deck header wants that darker plate or the page's own `--bg` is a Design question this plan does not answer.
3. **The three over-99 divergences** from Task 7 — the `+N` figure, the trim line, and the amber built figure. All three post-date the deck-details drawing.
4. **Design's open item 1, rename undo.** Blur commits, so an accidental commit has no undo. Out of scope here; worth a decision.
5. **The rename trigger's accessible name narrows.** The shipped button reads `Rename deck: ${deck.name}` (`builder-spine.tsx:337`); `renameCopy.triggerAria` is a bare `Rename deck`. There is one deck on the page, so the disambiguation buys nothing, but it is a deliberate string being dropped.
6. **The merged `.worktrees/audit-art-wash-full` worktree** is still on disk and unruled.
