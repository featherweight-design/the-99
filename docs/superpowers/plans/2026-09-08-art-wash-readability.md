# Commander Art Wash — Readability Amendment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the commander art wash readable on all four surfaces by cropping to `art_crop`, layering a three-part scrim, and putting full-opacity ink on it — behind one shared component instead of three inline copies.

**Architecture:** One `<ArtWash>` in `src/components/ui/` owns every constant the handoff calls a constant (focal, layer stack, mask fraction, scrim stops, per-strategy opacities), exposing only `strategy` and `band`. A new `cards.art_crop_uri` column feeds it, threaded through the three existing read paths as a sibling of `imageUri`. The four surfaces then become call sites. Every colour mixes off a theme token rather than the handoff's Palette A literals, and the contrast floor is asserted in a unit test against all six themes rather than eyeballed on one.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Vitest + Testing Library (jsdom).

**Spec:** `design/design_handoff_the99_art_wash/README.md` (the handoff) and `design/design_handoff_the99_art_wash/READINESS.md` (🟡 Yellow, 2026-09-08, whose eight eng-side clarifications this plan implements).

## Global Constraints

- **Package manager is pnpm.** Never npm or yarn.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus a stub-DB build: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`. Then `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.
- **No literal hexes in components.** Every colour is `var(--*)` or a `color-mix(in oklab, var(--*) N%, transparent)`. The handoff's hexes are Palette A reference values only. This is a shipped ruling — see `src/components/commanders/commander-art.tsx:15-21`.
- **Image URLs are stored, never constructed** (`src/db/schema.ts:64`). No `/normal/` → `/art_crop/` string swap.
- **Art is not themed; the scrim over it is** (ruling 17, `src/components/home/hero-commander.tsx:60`).
- **Constants that must not become props:** focal `center top`, the L1/L2/L3 stack, the mask fractions (`58%` / `62%`), the scrim stops, and the per-strategy opacities (`.58` cover art, `.80` / `.85` sharp portrait, `.20` / `.14` ambient).
- **Mobile and desktop ship in the same PR.** One band height at both breakpoints (148px commander row, 72px resume row), applied as `min-height`.
- **Contrast floor:** 7:1 for titles, 4.5:1 for meta, on every one of the six themes.

---

## File structure

**Created**

| File | Responsibility |
|---|---|
| `src/components/ui/art-wash.tsx` | The one component. Both strategies, every constant, the no-art fallback. |
| `src/components/ui/art-wash.test.tsx` | Component behaviour: layer count, aria, fallback, geometry derived from `band`. |
| `src/lib/theme/wash-contrast.test.ts` | The 7:1 / 4.5:1 floor, computed per theme from `globals.css`. |
| `drizzle/0020_*.sql` | `cards.art_crop_uri`. Generated, not hand-written. |

**Modified**

| File | Change |
|---|---|
| `src/db/schema.ts:35` | Add `artCropUri` beside `imageUri` on `cards`. |
| `src/lib/scryfall/transform.ts:20-21` | Read `image_uris.art_crop`, front face on a DFC. |
| `src/lib/scryfall/seed.ts:16-33` | Add `artCropUri` to the `onConflictDoUpdate` set. |
| `src/lib/decks/read.ts:233,347,402` | `commanderArtCropUri` on `DeckListItem`. Feeds the deck card and the resume row. |
| `src/lib/recs/store.ts:38,184` | `artCropUri` on `RankedCommander`, joined from `cards`. Feeds the owned lane and the Home hero. |
| `src/lib/discovery/candidates.ts:19,93`, `src/lib/discovery/list.ts:20,128` | `artCropUri` on the discovery candidate and item. |
| `src/components/decks/deck-card.tsx:144-158` | Becomes an `<ArtWash strategy="cover">` call site. |
| `src/components/home/hero-commander.tsx:20-26,66` | Same. Local `SCRIM` const deleted. |
| `src/components/home/resume-decks.tsx:78-85` | Thumbnail becomes `<ArtWash strategy="left-portrait" band={72}>`. |
| `src/components/commanders/commander-art.tsx` | `CommanderBleed` deleted; `IdentityPips` stays. |
| `src/components/commanders/rec-card.tsx:124`, `discovery-row.tsx:328` | Call `<ArtWash strategy="left-portrait" band={148}>`. |
| `src/lib/decks/status-style.ts:51-61` | On-art chip fill goes opaque. |
| `src/app/globals.css` | `prefers-reduced-transparency` and `forced-colors` rules. |

`commander_scores` needs no column: `store.ts:184` joins `cards`, so the crop arrives the same way the image does.

---

### Task 1: Store `art_crop`

**Files:**
- Modify: `src/db/schema.ts:35`, `src/lib/scryfall/transform.ts:20-21`, `src/lib/scryfall/seed.ts:16-33`
- Create: `drizzle/0020_*.sql` (generated)
- Test: `src/lib/scryfall/transform.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `cards.artCropUri` (nullable `text`), and `CardRow.artCropUri: string | null` from `toCardRow`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/scryfall/transform.test.ts`:

```ts
it("stores the art crop, not the framed card image", () => {
  const row = toCardRow({
    ...baseCard,
    image_uris: {
      normal: "https://cards.scryfall.io/normal/front/a/b/id.jpg",
      art_crop: "https://cards.scryfall.io/art_crop/front/a/b/id.jpg",
    },
  } as ScryfallCard);
  expect(row?.artCropUri).toBe("https://cards.scryfall.io/art_crop/front/a/b/id.jpg");
  expect(row?.imageUri).toBe("https://cards.scryfall.io/normal/front/a/b/id.jpg");
});

it("takes the front face's crop on a modal double-faced card", () => {
  const row = toCardRow({
    ...baseCard,
    image_uris: undefined,
    card_faces: [
      { image_uris: { normal: "front-normal.jpg", art_crop: "front-crop.jpg" } },
      { image_uris: { normal: "back-normal.jpg", art_crop: "back-crop.jpg" } },
    ],
  } as unknown as ScryfallCard);
  expect(row?.artCropUri).toBe("front-crop.jpg");
});

it("leaves the crop null when Scryfall has none", () => {
  const row = toCardRow({ ...baseCard, image_uris: { normal: "n.jpg" } } as ScryfallCard);
  expect(row?.artCropUri).toBeNull();
});
```

Use whatever the file already calls its fixture in place of `baseCard` — read the top of the test file first and match it.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/lib/scryfall/transform.test.ts`
Expected: FAIL — `artCropUri` is `undefined`.

- [ ] **Step 3: Add the column**

`src/db/schema.ts`, immediately after `imageUri` on `cards`:

```ts
  imageUri: text("image_uri"),
  // The frame-free 626×457 crop. `imageUri` carries Magic's own printed name and
  // type line, which collide with our labels wherever art sits behind text.
  artCropUri: text("art_crop_uri"),
```

- [ ] **Step 4: Read it in the transform**

`src/lib/scryfall/transform.ts`, beside the existing `imageUri` derivation:

```ts
  const artCropUri =
    raw.image_uris?.art_crop ??
    faces?.find((f) => f.image_uris?.art_crop)?.image_uris.art_crop ??
    null;
```

`faces.find` takes the first face that has one, which is the front — the same rule the line above it already uses for `normal`. Add `artCropUri` to the returned object next to `imageUri`, and add `art_crop?: string` to the `image_uris` shape on the `ScryfallCard` type in this file.

- [ ] **Step 5: Make the seed carry it**

`src/lib/scryfall/seed.ts`, in the `onConflictDoUpdate` set, after `imageUri`:

```ts
        artCropUri: sql`excluded.art_crop_uri`,
```

A missing line here is silent: new rows would get the crop and every existing row would keep a null forever.

- [ ] **Step 6: Generate the migration**

Run: `pnpm db:generate`
Expected: one new file in `drizzle/`, adding a single nullable column. Open it and confirm it is exactly that — no table rewrite, no `NOT NULL` without a default.

- [ ] **Step 7: Run the tests**

Run: `pnpm test src/lib/scryfall/ && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/db/schema.ts src/lib/scryfall/transform.ts src/lib/scryfall/transform.test.ts src/lib/scryfall/seed.ts drizzle/
git commit -m "feat(catalog): store each card's frame-free art crop"
```

---

### Task 2: Thread the crop to the four surfaces

**Files:**
- Modify: `src/lib/decks/read.ts:233,347,402`; `src/lib/recs/store.ts:38,184`; `src/lib/discovery/candidates.ts:19,93`; `src/lib/discovery/list.ts:20,128`
- Test: typecheck is the test here; see step 4 for why.

**Interfaces:**
- Consumes: `cards.artCropUri` (Task 1).
- Produces: `DeckListItem.commanderArtCropUri: string | null`, `RankedCommander.artCropUri: string | null`, `DiscoveryItem.artCropUri: string | null`.

- [ ] **Step 1: Deck list items**

`src/lib/decks/read.ts` — add to the `DeckListItem` type beside `commanderImageUri:233`, to the select at `:347`, and to the row mapping at `:402`:

```ts
  commanderArtCropUri: string | null;      // type
  commanderArtCropUri: cards.artCropUri,   // select
  commanderArtCropUri: row.commanderArtCropUri, // mapping
```

- [ ] **Step 2: Ranked commanders**

`src/lib/recs/store.ts` — add `artCropUri: string | null;` to `RankedCommander` at `:38`, and `artCropUri: cards.artCropUri,` to the select at `:184`, directly after `imageUri`. No migration: that select already joins `cards`, so nothing is persisted on `commander_scores`.

- [ ] **Step 3: Discovery**

`src/lib/discovery/candidates.ts` — `artCropUri: string | null;` at `:19`, `artCropUri: cards.artCropUri,` at `:93`. `src/lib/discovery/list.ts` — the same field at `:20`, and `artCropUri: c.artCropUri,` in the mapping at `:128`.

- [ ] **Step 4: Let typecheck find the rest**

Run: `pnpm typecheck`
Expected: errors anywhere a fixture or a mapper constructs one of these types without the new field. Fix each by adding the field — `null` in test fixtures, the real column in production mappers. Do not widen a type to optional to silence this; a surface that cannot get a crop should be visibly passing `null`.

There are no unit tests for these query builders and this plan does not add any — they are thin Drizzle selects whose failure mode is a type error, and the repo has consistently declined to mock the query builder to assert its own shape back.

- [ ] **Step 5: Run the gate**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/read.ts src/lib/recs/store.ts src/lib/discovery/candidates.ts src/lib/discovery/list.ts
git commit -m "feat(reads): carry the art crop alongside the card image"
```

---

### Task 3: The contrast floor, asserted

Written before the component, so the constants land already proven rather than measured afterwards.

**Files:**
- Create: `src/lib/theme/wash-contrast.test.ts`

**Interfaces:**
- Consumes: `parseThemeBlocks` from `src/lib/theme/parse-css.ts`, `contrast` and `parseHex` from `src/lib/theme/color.ts` — both already exist and are used by `src/lib/theme/contract.test.ts`.
- Produces: the layer constants the component will use, proven against all six themes.

- [ ] **Step 1: Write the test**

```ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast, parseHex } from "./color";
import { parseThemeBlocks } from "./parse-css";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
  "utf8",
);
const THEMES = parseThemeBlocks(CSS);

// The worst case the scrim has to survive: a pure white pixel in the art.
const BRIGHTEST_ART = "#FFFFFF";

// The layer stack, as fractions. L1 is the opaque base plate (`--bg`); L2 is the
// art; L3 is the gradient scrim, also `--bg`, whose alpha varies down the band.
const ART_ALPHA = 0.58;
const SCRIM_AT_TITLE = 0.9;   // stop 1 — the label band
const SCRIM_AT_META = 0.86;   // stop 4 — the bottom band, where the chip sits

const over = (fg: string, bg: string, alpha: number): string => {
  const [fr, fg_, fb] = parseHex(fg);
  const [br, bg_, bb] = parseHex(bg);
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
  return `#${[mix(fr, br), mix(fg_, bg_), mix(fb, bb)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
};

/** The plate the ink actually sits on, at a given scrim alpha. */
const washGround = (bg: string, scrimAlpha: number): string =>
  over(bg, over(BRIGHTEST_ART, bg, ART_ALPHA), scrimAlpha);

describe("art wash contrast floor", () => {
  it("covers all six themes", () => {
    expect(Object.keys(THEMES)).toHaveLength(6);
  });

  for (const [theme, tokens] of Object.entries(THEMES)) {
    it(`${theme}: a title clears 7:1 over the brightest possible art`, () => {
      expect(contrast(tokens.fg, washGround(tokens.bg, SCRIM_AT_TITLE))).toBeGreaterThanOrEqual(7);
    });

    it(`${theme}: meta clears 4.5:1 in the lower band`, () => {
      expect(contrast(tokens["fg-body"], washGround(tokens.bg, SCRIM_AT_META)))
        .toBeGreaterThanOrEqual(4.5);
    });
  }
});
```

Match `parseThemeBlocks`' actual return shape — read `src/lib/theme/parse-css.ts` and `contract.test.ts:14-15` first, and index tokens the way that suite already does.

- [ ] **Step 2: Run it**

Run: `pnpm test src/lib/theme/wash-contrast.test.ts`

Expected: PASS on all six. **If a theme fails, do not lower the floor.** Raise that layer's alpha — the scrim is the free variable, the floor is not — and carry the raised value into Task 4's constants so the two never disagree. Record any change in the plan's task notes when you commit.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/wash-contrast.test.ts
git commit -m "test(theme): pin the art wash's contrast floor across all six themes"
```

---

### Task 4: `<ArtWash>` — the `cover` strategy

**Files:**
- Create: `src/components/ui/art-wash.tsx`, `src/components/ui/art-wash.test.tsx`

**Interfaces:**
- Consumes: `cssUrl` and `ART_STRIPES` from `src/lib/collection/browse.ts`; `commanderGradient` from `src/lib/collection/gradients.ts`; the alphas proven in Task 3.
- Produces:

```ts
export type ArtWashProps =
  | { strategy: "cover"; band?: never; artCropUri: string | null; colorIdentity: string[] }
  | { strategy: "left-portrait"; band: 148 | 72; artCropUri: string | null; colorIdentity: string[] };

export function ArtWash(props: ArtWashProps): React.JSX.Element;
```

The union is what makes `band` an aspect for `cover` (fixed at `2.2/1`, so not a prop at all) and a px height for `left-portrait`. Task 5 adds the second arm; this task ships the first and types the union in full so the arms never drift apart.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtWash } from "./art-wash";

const layersOf = (c: HTMLElement) => Array.from(c.querySelectorAll("div"));

describe("ArtWash — cover", () => {
  it("is decorative — hidden from the accessibility tree", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("draws the art at the top of the crop, never centred", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const art = layersOf(container).find((d) => d.style.backgroundImage.includes("crop.jpg"));
    expect(art?.style.backgroundPosition).toBe("center top");
    expect(art?.style.backgroundSize).toBe("cover");
  });

  it("keeps the band and its layers when a commander has no art", () => {
    const withArt = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    const without = render(<ArtWash strategy="cover" artCropUri={null} colorIdentity={["G"]} />);
    // No layout shift: the same number of layers, and the band itself unchanged.
    expect(layersOf(without.container)).toHaveLength(layersOf(withArt.container).length);
    expect(without.container.firstElementChild?.className).toBe(
      withArt.container.firstElementChild?.className,
    );
  });

  it("falls back to the colour identity, not to the stripes", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri={null} colorIdentity={["U", "R"]} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("gradient");
    expect(html).not.toContain("repeating-linear-gradient");
  });

  it("mixes every layer off a theme token — no Palette A literals", () => {
    const { container } = render(
      <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
    );
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/ui/art-wash.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Implement the cover arm**

```tsx
import { ART_STRIPES, cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";

const bg = (pct: number) => `color-mix(in oklab, var(--bg) ${pct}%, transparent)`;

/** L3. Heavy where the labels are, thin through the middle third. The fourth
    stop is what lets the status chip sit on art without its own plate. */
const SCRIM = `linear-gradient(180deg, ${bg(90)} 0%, ${bg(30)} 40%, ${bg(52)} 74%, ${bg(86)} 100%)`;

const COVER_ART_OPACITY = 0.58;

export type ArtWashProps =
  | { strategy: "cover"; band?: never; artCropUri: string | null; colorIdentity: string[] }
  | { strategy: "left-portrait"; band: 148 | 72; artCropUri: string | null; colorIdentity: string[] };

export function ArtWash(props: ArtWashProps) {
  const { artCropUri, colorIdentity } = props;
  // L1: the base plate, under the art, so a slow or missing image never flashes
  // light ground.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[color:var(--bg)]"
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: artCropUri ? COVER_ART_OPACITY : 1,
          background: artCropUri ? undefined : commanderGradient(colorIdentity),
          backgroundImage: artCropUri ? cssUrl(artCropUri) : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      <div className="absolute inset-0" style={{ background: SCRIM }} />
    </div>
  );
}
```

`ART_STRIPES` is imported but unused until you delete it — do not import it; it is named here only so you know not to reach for it. Remove that import line before committing.

The component fills its parent. The parent owns the band's height, because the aspect differs per surface only in how the parent sizes itself.

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/components/ui/art-wash.test.tsx && pnpm lint`
Expected: PASS, no unused import.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/art-wash.tsx src/components/ui/art-wash.test.tsx
git commit -m "feat(ui): one art wash component, cover strategy"
```

---

### Task 5: `<ArtWash>` — the `left-portrait` strategy

**Files:**
- Modify: `src/components/ui/art-wash.tsx`, `src/components/ui/art-wash.test.tsx`

**Interfaces:**
- Consumes: the union typed in Task 4.
- Produces: the `left-portrait` arm. Portrait width is `band × 1.37` — **203px** at 148, **99px** at 72 — and every horizontal stop is in px, keyed to that width.

- [ ] **Step 1: Write the failing test**

```tsx
describe("ArtWash — left portrait", () => {
  it("sizes the portrait off the band's height, at the crop's own 1.37:1", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const sharp = Array.from(container.querySelectorAll("div")).find((d) =>
      d.style.maskImage?.includes("90deg"),
    );
    expect(sharp?.style.width).toBe("203px");
    expect(sharp?.style.backgroundSize).toBe("auto 100%");
  });

  it("fades the art itself, as a fraction of the art", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    // A percentage-of-width fade would drift from the portrait at every row width.
    expect(container.innerHTML).toContain("58%");
  });

  it("scales every stop with the band", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={72} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const sharp = Array.from(container.querySelectorAll("div")).find((d) =>
      d.style.maskImage?.includes("90deg"),
    );
    expect(sharp?.style.width).toBe("99px");
    expect(container.innerHTML).toContain("62%");
  });

  it("carries an ambient copy behind the portrait", () => {
    const { container } = render(
      <ArtWash strategy="left-portrait" band={148} artCropUri="crop.jpg" colorIdentity={["B"]} />,
    );
    const ambient = Array.from(container.querySelectorAll("div")).find(
      (d) => d.style.backgroundSize === "cover" && d.style.opacity === "0.2",
    );
    expect(ambient).toBeDefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/ui/art-wash.test.tsx`
Expected: FAIL — the portrait layer is not rendered.

- [ ] **Step 3: Implement it**

Add to `art-wash.tsx`:

```tsx
const PORTRAIT_RATIO = 1.37; // art_crop is 626×457

/** Keyed to the band, not to the row: `band` is the only input, so both the mask
    and the scrim travel with it at any row width. Decision 8 of the handoff —
    the one it says will regress if it is not stated plainly. */
const portrait = (band: 148 | 72) => {
  const width = Math.round(band * PORTRAIT_RATIO);      // 203 | 99
  const maskEnd = band === 148 ? 58 : 62;               // a fraction of the art
  const stops =
    band === 148
      ? `${bg(30)} 0px, ${bg(26)} 118px, ${bg(78)} ${width}px, var(--bg) 264px`
      : `${bg(30)} 0px, ${bg(26)} 58px, ${bg(78)} ${width}px, var(--bg) 138px`;
  return {
    width,
    ambientOpacity: band === 148 ? 0.2 : 0.14,
    sharpOpacity: band === 148 ? 0.8 : 0.85,
    mask: `linear-gradient(90deg, #000 0 ${maskEnd}%, transparent)`,
    scrim: `linear-gradient(90deg, ${stops})`,
  };
};
```

The mask's `#000` is not a palette colour — a mask reads only alpha, and black is the opaque end of it. It is exempt from the no-literals rule, and the Task 4 test asserts on the *rendered* markup, so keep the mask on a layer whose other colours are tokens.

Render, inside the same L1 plate, when `strategy === "left-portrait"`:

1. the ambient layer — full-bleed `cover`, `center top`, at `ambientOpacity`;
2. the sharp layer — `width: ${width}px`, `backgroundSize: "auto 100%"`, `backgroundPosition: "left top"`, `maskImage` + `WebkitMaskImage` set to `mask`, at `sharpOpacity`;
3. the horizontal scrim.

The no-art fallback is the identity gradient on the ambient layer only; the sharp layer does not render without a crop, and the band keeps its height regardless.

- [ ] **Step 4: Run everything**

Run: `pnpm test src/components/ui/ && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/art-wash.tsx src/components/ui/art-wash.test.tsx
git commit -m "feat(ui): art wash left-portrait strategy for rows past 4:1"
```

---

### Task 6: The deck card

**Files:**
- Modify: `src/components/decks/deck-card.tsx:144-158`, `src/lib/decks/status-style.ts:51-61`
- Test: `src/components/decks/deck-card.test.tsx` if it exists; otherwise add the assertions to the nearest existing decks component test.

**Interfaces:**
- Consumes: `ArtWash` (Tasks 4–5), `DeckListItem.commanderArtCropUri` (Task 2).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

```tsx
it("bands the art at 2.2:1 with a floor, not a fixed height", () => {
  const { container } = render(<DeckCard deck={deckFixture} shopping={undefined} now={NOW} />);
  const band = container.querySelector("[data-deck-art]");
  expect(band?.className).toContain("aspect-[2.2/1]");
  expect(band?.className).toContain("min-h-[104px]");
  expect(band?.className).not.toContain("h-[124px]");
});
```

Reuse the file's existing deck fixture and add `commanderArtCropUri` to it.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/decks/`
Expected: FAIL on the class assertions.

- [ ] **Step 3: Swap the band**

Replace `deck-card.tsx:144-158` — the sized `div`, its inline `background`, and the inline scrim `div` — with:

```tsx
      <div data-deck-art className="relative aspect-[2.2/1] min-h-[104px] overflow-hidden">
        <ArtWash
          strategy="cover"
          artCropUri={deck.commanderArtCropUri}
          colorIdentity={deck.commanderColorIdentity}
        />
```

The grid is a fixed 3-up from `sm` inside a shell with no max-width, so a column runs 189px at 640 up to 435px at 1440 and a pure 2.2:1 band would be 86px at the narrow end — under the floor for labels plus a status chip. Hence `min-h`, and no ceiling: a band taller than 2.2:1 never triggers the failure decision 5 describes, only a wider one does.

If `DeckListItem` has no colour identity field, add it in the same shape Task 2 used — it is needed for the no-art fallback.

Delete the stripes comment at `:141-143`; it now asserts the opposite of what the code does.

- [ ] **Step 4: Make the chip opaque**

`src/lib/decks/status-style.ts:51-61` — the on-art fill goes from an 18% (or 14–16%) `color-mix` to a full-strength one, with `var(--border-strong)` as the 1px border. The status-keyed colour does not change; only the fill's strength and the border do.

- [ ] **Step 5: Run and look at it**

Run: `pnpm test src/components/decks/ && pnpm dev`
Open `/decks` and check the golden path at 375px, 640px and 1440px: the art reads as a portrait rather than a texture, the deck name and the status chip both survive on the brightest art in the grid, and no card shows Magic's own printed type line.

- [ ] **Step 6: Commit**

```bash
git add src/components/decks/deck-card.tsx src/lib/decks/status-style.ts src/components/decks/deck-card.test.tsx
git commit -m "feat(decks): deck card art reads as a portrait, chip survives on it"
```

---

### Task 7: The Home hero

**Files:**
- Modify: `src/components/home/hero-commander.tsx:20-26,58-72`
- Create: `src/components/home/hero-commander.test.tsx` — this component has no test file today; `ready-to-build.test.tsx` covers its parent, not the band.

**Interfaces:**
- Consumes: `ArtWash`, `RankedCommander.artCropUri` (Task 2).

- [ ] **Step 1: Write the failing test**

```tsx
it("inherits the deck card's band exactly", () => {
  const { container } = render(<HeroCommander item={rankedFixture} />);
  const band = container.firstElementChild;
  expect(band?.className).toContain("aspect-[2.2/1]");
  expect(band?.className).not.toContain("h-[186px]");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/home/`
Expected: FAIL.

- [ ] **Step 3: Replace the band**

Delete the local `SCRIM` const at `:20-26` entirely. Swap `h-[186px] sm:h-[250px]` for `aspect-[2.2/1] min-h-[104px]`, drop the inline `background`, and render `<ArtWash strategy="cover" artCropUri={item.artCropUri} colorIdentity={item.colorIdentity} />` as the first child. The fit badge and the CTA keep their positions.

The handoff says this surface "inherits the deck card exactly" — so it takes the same floor, not a second number.

- [ ] **Step 4: Run and check**

Run: `pnpm test src/components/home/`
Then `/` at 375px and 1440px: the hero art is a portrait, the fit badge reads, and the CTA is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/hero-commander.tsx src/components/home/hero-commander.test.tsx
git commit -m "feat(home): the ready-to-build hero inherits the deck card's band"
```

---

### Task 8: The commander rows, and the end of `CommanderBleed`

**Files:**
- Modify: `src/components/commanders/commander-art.tsx` (delete `CommanderBleed`, keep `IdentityPips`), `src/components/commanders/rec-card.tsx:124`, `src/components/commanders/discovery-row.tsx:328`
- Test: `src/components/ui/art-wash.test.tsx` already covers the geometry; add a row-level assertion to `src/components/commanders/rec-card.test.tsx` and `src/components/commanders/discovery-row.test.tsx`, the two that render a row directly.

**Interfaces:**
- Consumes: `ArtWash` with `band={148}`, `RankedCommander.artCropUri` and `DiscoveryItem.artCropUri` (Task 2).

- [ ] **Step 1: Write the failing test**

```tsx
it("gives the row a 148px floor so the portrait reaches both edges", () => {
  const { container } = render(<RecCard c={commanderFixture} avail={AVAIL} />);
  expect(container.firstElementChild?.className).toContain("min-h-[148px]");
});
```

Match the real prop names on `RecCard` — read the component's signature first.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/commanders/`
Expected: FAIL.

- [ ] **Step 3: Swap both call sites**

In `rec-card.tsx` and `discovery-row.tsx`, replace `<CommanderBleed …/>` with:

```tsx
      <ArtWash
        strategy="left-portrait"
        band={148}
        artCropUri={/* c.artCropUri | item.artCropUri */ null}
        colorIdentity={/* c.colorIdentity | item.colorIdentity */ []}
      />
```

filling in the real fields. Add `min-h-[148px]` to each row's outer wrapper — as a floor, not a fixed height, so a row whose content runs long still has the portrait flush to both edges.

One height at both breakpoints: `DARKEN_PHONE` and `DARKEN_WIDE` collapse into the component's single px-keyed scrim, which is width-independent by construction. The phone layout keeps its two-band content arrangement; only the art behind it changes.

- [ ] **Step 4: Delete `CommanderBleed`**

Remove the component and its two mask/ramp constants from `commander-art.tsx`. `IdentityPips` stays, as do that file's imports it still needs. Fix both import sites.

- [ ] **Step 5: Run and check**

Run: `pnpm test src/components/commanders/ && pnpm typecheck && pnpm lint`
Then `/commanders`, both lanes, at 375px and 1440px: the commander's face is recognisable at the row's leading edge, the rank and name read, and nothing shows a printed card frame.

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/
git commit -m "refactor(commanders): rows take the shared portrait wash"
```

---

### Task 9: The resume row

The one surface that is a rebuild rather than a retune: it is a 30×42px thumbnail today.

**Files:**
- Modify: `src/components/home/resume-decks.tsx:66-113`
- Test: the existing home test file.

**Interfaces:**
- Consumes: `ArtWash` with `band={72}`, `DeckListItem.commanderArtCropUri` (Task 2).

- [ ] **Step 1: Write the failing test**

```tsx
it("gives the art its own column and starts type clear of it", () => {
  const { container } = render(<ResumeDecks decks={[deckFixture]} shopping={SHOPPING} />);
  const row = container.querySelector("a");
  expect(row?.className).toContain("min-h-[72px]");
  const text = row?.querySelector("[data-resume-text]");
  expect(text?.className).toContain("pl-[116px]");
});

it("needs no text shadow, because type never sits on art", () => {
  const { container } = render(<ResumeDecks decks={[deckFixture]} shopping={SHOPPING} />);
  expect(container.innerHTML).not.toContain("text-shadow");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/home/`
Expected: FAIL.

- [ ] **Step 3: Rebuild the row**

Replace the `30×42` `span` at `:78-85` with a `<ArtWash strategy="left-portrait" band={72} …/>` on the row's `relative` wrapper, give the `Link` `relative min-h-[72px]`, and inset the text block by `pl-[116px]` behind a `data-resume-text` hook. The 99px portrait plus a 17px gap is where 116 comes from.

Everything the row prints stays: the **deck** name (not the commander's), the status pill, and the mono count. Do not add a commander name — `:88-91` records why, and the handoff's open item about subtitle truncation was written against a mock row that carries one. That item is closed as moot in the readiness review.

No `text-shadow` anywhere on this row. If type needs one, it is in the wrong place.

Delete the stripes comment at `:75-77`.

- [ ] **Step 4: Run and check**

Run: `pnpm test src/components/home/`
Then `/` at 375px and 1440px: the portrait is recognisable, the deck name is not truncated harder than before, and the row list does not feel taller than the surface can carry.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/resume-decks.tsx src/components/home/
git commit -m "feat(home): the resume row gets a portrait column instead of a thumbnail"
```

---

### Task 10: Reduced transparency and forced colours

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/components/ui/art-wash.test.tsx` (the hooks are asserted; the media queries themselves are CSS)

**Interfaces:**
- Consumes: stable class hooks on the wash's layers.
- Produces: `.art-wash-art` and `.art-wash-scrim` as the two selectors the media queries target.

- [ ] **Step 1: Write the failing test**

```tsx
it("exposes the hooks the accessibility rules target", () => {
  const { container } = render(
    <ArtWash strategy="cover" artCropUri="crop.jpg" colorIdentity={["G"]} />,
  );
  expect(container.querySelector(".art-wash-art")).toBeTruthy();
  expect(container.querySelector(".art-wash-scrim")).toBeTruthy();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test src/components/ui/art-wash.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the hooks, then the rules**

Add both class names to the art and scrim layers in `art-wash.tsx` (all three art layers on the portrait arm take `.art-wash-art`).

In `globals.css`:

```css
/* The wash trades legibility against drama. A reader who has asked for less
   transparency has already said which way that trade should go. */
@media (prefers-reduced-transparency: reduce) {
  .art-wash-art { opacity: 0.3; }
  .art-wash-scrim {
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--bg) 95%, transparent) 0%,
      color-mix(in oklab, var(--bg) 60%, transparent) 40%,
      color-mix(in oklab, var(--bg) 85%, transparent) 100%);
  }
}

/* Forced colours is a different mechanism: the system takes the palette, so the
   scrim is no longer ours to tune and text lands on whatever the OS chooses.
   A photograph under that is the exact unreadable case this wash exists to fix,
   so the art goes rather than being re-weighted. */
@media (forced-colors: active) {
  .art-wash-art { display: none; }
  .art-wash-scrim { background: Canvas; }
}
```

- [ ] **Step 4: Run and check**

Run: `pnpm test && pnpm lint`
Then, in a Chromium DevTools rendering pane, toggle `prefers-reduced-transparency: reduce` and `forced-colors: active` on `/decks` and confirm the band keeps its height in both — the layout must not shift.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/ui/art-wash.tsx src/components/ui/art-wash.test.tsx
git commit -m "feat(a11y): honour reduced transparency and forced colours on the wash"
```

---

### Task 11: Ship the data

The feature is dark until this runs — every surface falls back to the identity gradient while `art_crop_uri` is null.

**Files:** none. This is an operations task.

- [ ] **Step 1: Full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`, then
`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.

- [ ] **Step 2: Rebase and push**

```bash
git fetch origin && git rebase origin/main
```
Then push and open the PR, following the Copilot review policy in `~/.claude/CLAUDE.md`.

- [ ] **Step 3: Migrate**

The migration applies automatically on the Vercel **production** build. Confirm with `GET /api/health` — 200 means the schema matches the build.

- [ ] **Step 4: Re-seed both catalogs**

Run `pnpm db:seed` against **catalog-staging** and **catalog-production**, using the connection strings recorded in the Vercel/Neon topology. The weekly refresh (09:00 UTC Monday) would backfill it eventually; running it manually is what stops the feature sitting dark until then.

- [ ] **Step 5: Verify the crop actually landed**

```sql
SELECT count(*) FILTER (WHERE art_crop_uri IS NOT NULL) AS with_crop,
       count(*) AS total
FROM cards;
```

Expected: `with_crop` within a rounding error of `total`. A large null count means step 5 of Task 1 was missed and existing rows never took the new column.

- [ ] **Step 6: Walk the four surfaces**

`/decks`, `/commanders` (both lanes), and `/` — at 375px and 1440px, on at least two themes. Confirm: no printed card frame anywhere, every title and chip readable over the brightest art on screen, and no layout shift on a commander with no crop.

---

## Self-review

**Spec coverage.** Handoff decision 1 → Task 1. Decision 2 → Tasks 3–4. Decision 3 → Tasks 4 and 6. Decision 4 → Tasks 6 and 9 (and the readiness review's reading for portrait rows, Task 8). Decision 5 → Task 6. Decision 6 → Task 4. Decisions 7 and 8 → Task 5. Decision 9 → Task 9. Decision 10 → already satisfied by `cssUrl`; no task, per the readiness review. Engineering notes: one component → Tasks 4–5; no-art state → Task 4; reduced transparency → Task 10; no `backdrop-filter` → nothing added; token-derived values → the global constraint. Readiness clarifications 1–8 → Tasks 1, 3–4, 8, 6/9, 9, 6, 10, 4–5 respectively.

**Open items.** Item 1 closes as moot (Task 9). Item 2 (focal on five arts) needs no task — `center top` ships as one value. Item 3 (full-art DFCs, borderless printings) is the spot-check in Task 11 step 6. Item 4 is answered by Task 6's floor.

**Type consistency.** `artCropUri` is the field name everywhere except `DeckListItem`, which uses `commanderArtCropUri` to match its existing `commanderImageUri`. `ArtWash` takes `artCropUri` on both arms; `band` exists only on `left-portrait` and is `148 | 72`.
