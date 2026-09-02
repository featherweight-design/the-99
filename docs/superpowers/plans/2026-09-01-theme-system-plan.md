# Six-Theme Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give The 99 six user-selectable dark themes — colour and display typeface — with the chrome desaturation, contrast floors, and token contract enforced by CI rather than by taste.

**Architecture:** Every theme is a chrome skeleton (16 near-neutral tokens) plus a flavor layer (6 accent tokens), with 13 more tokens for semantics, WUBRG pips and card availability — 35 keys, identical in all six. Amonkhet lives in `:root` so an unrecognised `data-theme` degrades to a complete theme; the other five are `[data-theme="…"]` blocks. The `@theme inline` block is written once and is theme-agnostic because it only ever references `var(--token)`. A Vitest suite parses `globals.css`, extracts the six blocks, and asserts key-set equality, chroma budgets, contrast floors and ΔE separation. Selection persists in a cookie read during SSR, so there is no flash of the default theme.

**Tech Stack:** Next.js 16 (App Router, server components, `next/font/google`), React 19, Tailwind 4 (`@theme inline`), Vitest + Testing Library, ESLint flat config, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-31-theme-system-design.md`

**Design handoff:** `design/design_handoff_the99_themes/` — in particular `TOKEN-TABLE.md` (the artifact to implement from), `tokens.json` (its machine-readable twin), `themes · copy strings.ts`, and `READINESS.md` (🟢 Green).

**Design brief:** `docs/superpowers/design-briefs/2026-09-01-six-theme-visual-system.md`

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Package manager is pnpm.** Never npm or yarn. `pnpm-lock.yaml` is the only lockfile.
- **This is not the Next.js you know.** Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.
- **All work happens in this worktree** (`.worktrees/feat/theme-system`). The main checkout stays clean on `main`.
- **Token values are copied verbatim from `design/design_handoff_the99_themes/TOKEN-TABLE.md`.** Do not re-derive, re-round, or "improve" a hex. If a value looks wrong, stop and flag it — every one of them was solved for a floor and audited.
- **`--avail-soft` and `--avail-hard` are `var()` aliases in every theme block** — `var(--fg-muted)` and `var(--accent)` respectively. Flattening them to hexes is a silent bug.
- **Theme keys** are exactly: `amonkhet` (`:root`), `kamigawa`, `innistrad`, `phyrexia`, `duskmourn`, `kaldheim`.
- **User-facing theme names** are: Gilded Stone, Neon Rain, Moonlit, Oil and Iron, Screen Glow, Rune Frost. Copy comes from `design/design_handoff_the99_themes/themes · copy strings.ts`; do not paraphrase it.
- **No light mode, no per-theme layout/spacing/radius, no custom themes, no DB table.** These are spec non-goals.
- **UI PRs pass the design-review skill** (property-table enumerate → verify → confirm) before `gh pr create`, and mobile + desktop parity ships in the same PR.
- **One PR per phase**, squash-merged, each passing the Copilot review bar in `~/.claude/CLAUDE.md`.

---

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `src/lib/theme/color.ts` | Pure colour maths: hex parsing, sRGB relative luminance, WCAG contrast, sRGB→OKLab, OKLCH chroma, ΔE OKLab. No I/O. |
| `src/lib/theme/color.test.ts` | Colour maths verified against published reference values. |
| `src/lib/theme/parse-css.ts` | Extracts theme blocks and their token declarations from `globals.css` text. No I/O beyond a string in. |
| `src/lib/theme/parse-css.test.ts` | Parser tests against inline CSS strings. |
| `src/lib/theme/themes.ts` | The theme registry: keys, display names, planes, cookie name, `isThemeKey` guard. Shared by picker, layout and tests. |
| `src/lib/theme/themes.test.ts` | Registry tests. |
| `src/lib/theme/server.ts` | `resolveTheme()` — the request's theme, read from the cookie. Server-only; the single source both the root layout and the shell read. |
| `src/lib/theme/contract.test.ts` | The CI gate: reads `globals.css` from disk and asserts parse, contract, chroma, contrast, separation across all themes. |
| `src/lib/copy/theme.ts` | Picker copy, transcribed from the handoff's copy-strings file. |
| `src/components/ui/crown.tsx` | The three-diamond crown mark that replaces the character layer. Static and pulsing variants. |
| `src/components/ui/crown.test.tsx` | Crown tests. |
| `src/components/shell/theme-picker.tsx` | The radiogroup inside the account menu; writes the cookie and flips `data-theme` for an instant swap. |
| `src/components/shell/theme-picker.test.tsx` | Picker tests. |
| `src/lib/theme/no-hex.test.ts` | The guard that keeps the sweep swept: no hex literal and no brand-tinted `rgba()` anywhere in `src/`, with a reasoned allowlist. |
| `scripts/snap-hex.mjs` | Phase-2 helper: reports, for each hex literal in `src/`, the nearest `:root` token and its ΔE. Read-only. |

**Modified files**

| File | Change |
|---|---|
| `src/app/globals.css` | `:root` replaced with the Gilded Stone column; five `[data-theme]` blocks added; `--brass*` renamed `--accent*`; character tokens deleted; `--font-display-face` indirection; `.guided-banner` de-hexed; Kaldheim `font-synthesis-weight` rule. |
| `src/app/layout.tsx` | Six display faces loaded; `data-theme` written during SSR from the cookie. |
| `src/components/shell/account-menu.tsx` | Hosts the theme picker section; takes the current theme as a prop. |
| `src/components/shell/shell.tsx`, `src/components/shell/nav.tsx` | Thread the server-resolved theme down to the account menu, so the picker's first render already knows which row is ticked. |
| 10 character call sites | Illustration removed, crown substituted. |
| ~74 component files | Hex literals replaced with tokens, and 51 brand-tinted `rgba()` values replaced with `color-mix()` (Phase 2). |

---

## Phase 0 — Retire the character layer

**PR 1.** Ten surfaces render illustration-free, the crown becomes the mark, `LoaderDots` retires into it, and the three character tokens are deleted. This lands first because the character SVGs carry brand hexes of their own, and retiring them shrinks the Phase 2 sweep.

**Design ruling carried into this phase (revised during implementation):** the crown is three
diamonds rotated 45°, in two geometries — **8 / 12 / 8 px with a 6px gap** for the quiet and
page tones, and **13 / 19 / 13 px with a 9px gap** for the loud tone, which only the 99/99
reveal is allowed to use.

This supersedes the 9/13/9-at-7px-gap figure the plan originally carried. Two sources in the
handoff disagree. README decision 6 describes the mark `completion-reveal.tsx` "already
draws in brass at 9/13/9px" and calls the loud tone "`--accent` at 2×"; the canvas §G mobile
rules state normatively that *"The crown does not resize. 8/12px quiet and 13/19px loud at both
widths,"* and the canvas's own renderer constants (`crownSm`, `crownLg`, `crownGap`) match its
prose exactly. The README figure is a citation of the hand-rolled crown this phase *replaces*,
offered as evidence the mark already existed — not a specification of the new one, and its
"at 2×" is a loose adjective beside a drawn ratio of ~1.6×. Two agreeing sources, one of them
machine-checkable, beat one descriptive aside. Recorded in
`docs/superpowers/gap-report-themes-phase-0.md`.

### Task 1: The crown mark

**Files:**
- Create: `src/components/ui/crown.tsx`
- Create: `src/components/ui/crown.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `Crown({ tone?: "quiet" | "page" | "loud", pulse?: boolean, className?: string }): JSX.Element`. Decorative — always `aria-hidden`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/crown.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Crown } from "./crown";

describe("Crown", () => {
  it("is decorative — hidden from the accessibility tree", () => {
    const { container } = render(<Crown />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("draws three diamonds at the canvas's quiet/page geometry", () => {
    const { container } = render(<Crown />);
    const diamonds = Array.from(container.querySelectorAll("span"));
    expect(diamonds).toHaveLength(3);
    expect(diamonds.map((d) => d.className)).toEqual([
      expect.stringContaining("w-[8px]"),
      expect.stringContaining("w-[12px]"),
      expect.stringContaining("w-[8px]"),
    ]);
  });

  it("draws the loud tone larger, and only the loud tone", () => {
    const { container } = render(<Crown tone="loud" />);
    const diamonds = Array.from(container.querySelectorAll("span"));
    expect(diamonds.map((d) => d.className)).toEqual([
      expect.stringContaining("w-[13px]"),
      expect.stringContaining("w-[19px]"),
      expect.stringContaining("w-[13px]"),
    ]);
  });

  it("carries no animation class at rest", () => {
    const { container } = render(<Crown />);
    for (const d of container.querySelectorAll("span")) {
      expect(d.className).not.toContain("anim-dots");
    }
  });

  it("inherits the retired dots' 1.2s stagger when pulsing", () => {
    const { container } = render(<Crown pulse />);
    const diamonds = Array.from(container.querySelectorAll("span"));
    for (const d of diamonds) expect(d.className).toContain("anim-dots");
    expect(diamonds.map((d) => (d as HTMLElement).style.animationDelay)).toEqual([
      "0s",
      "0.2s",
      "0.4s",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/crown.test.tsx`
Expected: FAIL — `Failed to resolve import "./crown"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/crown.tsx`:

```tsx
// The identity crown, promoted from decoration to the app's empty/loading mark.
// It was already beside the kaiju in completion-reveal.tsx; retiring the
// character layer removes the thing standing in front of it rather than
// leaving a hole. `pulse` carries the retired LoaderDots' 1.2s stagger, so the
// loading state keeps its animation and loses a component.
//
// Three intensities, per the handoff's decision 6. Quiet is for a mark that
// sits inside content — an empty state, a panel, an inline row — which is most
// of them. Page is for a mark that stands for the route itself rather than for
// something missing from it: a page's own heading mark, or the loading screen.
// Loud is reserved for the 99/99 reveal. Only the colour separates quiet from
// page; loud is also the larger geometry, per the canvas §G rule quoted in the
// phase heading above.

type Tone = "quiet" | "page" | "loud";

const TONES: Record<Tone, { small: string; large: string; gap: string; color: string }> = {
  quiet: { small: "w-[8px] h-[8px]", large: "w-[12px] h-[12px]", gap: "gap-[6px]", color: "var(--border-strong)" },
  page: { small: "w-[8px] h-[8px]", large: "w-[12px] h-[12px]", gap: "gap-[6px]", color: "var(--brass-strong)" },
  loud: { small: "w-[13px] h-[13px]", large: "w-[19px] h-[19px]", gap: "gap-[9px]", color: "var(--brass)" },
};

const DELAYS = [0, 0.2, 0.4];

export function Crown({ tone = "page", pulse, className }: { tone?: Tone; pulse?: boolean; className?: string }) {
  const { small, large, gap, color } = TONES[tone];
  const sizes = [small, large, small];
  return (
    <div aria-hidden className={["inline-flex items-center", gap, className].filter(Boolean).join(" ")}>
      {sizes.map((size, i) => (
        <span
          key={i}
          className={["block rotate-45", size, pulse ? "anim-dots" : ""].filter(Boolean).join(" ")}
          style={{ background: color, ...(pulse ? { animationDelay: `${DELAYS[i]}s` } : {}) }}
        />
      ))}
    </div>
  );
}
```

> `var(--brass)` is deliberate here and becomes `var(--accent)` in Task 7's mechanical rename. Writing `--accent` now would reference a token that does not exist yet.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/crown.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/crown.tsx src/components/ui/crown.test.tsx
git commit -m "feat(themes): the crown becomes the mark, and takes the dots' stagger with it"
```

### Task 2: The four rewritten copy strings

Four of the ten empty states leaned on the creature for their personality. The other six ship verbatim — this task must not touch them.

**Files:**
- Modify: `src/lib/copy/shell.ts` (`notFound.caption`)
- Modify: `src/lib/copy/decks-builder.ts` (`completion.heading`, `completion.caption`)
- Modify: `src/lib/copy/collection-browse.ts` (`noResults.caption`)
- Modify: `src/lib/copy/commanders.ts` (`filteredEmpty.caption`)
- Test: the existing `*.test.ts` beside each, plus component tests that assert on the old strings.

**Interfaces:**
- Produces: the same exported symbols with new values. `decksBuilderCopy.completion.caption` and `commandersCopy.filteredEmpty.caption` keep their existing signatures.

- [ ] **Step 1: Find every assertion on the four old strings**

Run:

```bash
rg -n "I checked. Twice|nothing to fetch|Ninety-nine|is fed" src
```

Note each file. These are the tests that must be updated in lockstep in Step 3 — a copy change with a stale assertion is a red suite, not a caught regression.

- [ ] **Step 2: Update the copy modules**

`src/lib/copy/shell.ts` — `notFound.caption`:

```ts
caption: "I checked. Twice. Probably a typo in the URL.",
```

`src/lib/copy/decks-builder.ts` — `completion`:

```ts
heading: "Ninety-nine.",
caption: (commander: string) =>
  `${commander} has a full deck. Sleeve it up before you change your mind.`,
```

`src/lib/copy/collection-browse.ts` — `noResults.caption`:

```ts
caption: "Nothing matches that search and that colour filter together. Drop one of them.",
```

`src/lib/copy/commanders.ts` — `filteredEmpty.caption`:

```ts
caption: (colorWords: string, total: number) =>
  `You own ${total} legal commander${total === 1 ? "" : "s"}, but none of them are ${colorWords}.`,
```

- [ ] **Step 3: Update every assertion found in Step 1 to the new strings**

Change the expected string, never the assertion's shape. If a test asserted on a clause that no longer exists (for example the `notFound` trailing "happens to the best of us"), assert on the surviving sentence instead of deleting the test.

- [ ] **Step 4: Run the suite**

Run: `pnpm test`
Expected: PASS, no failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy src/components src/app
git commit -m "feat(themes): four empty states stop leaning on a creature that is leaving"
```

### Task 3: Ten surfaces lose their illustration

**Files:**
- Modify: `src/app/decks/page.tsx`, `src/app/not-found.tsx`, `src/components/collection/no-results.tsx`, `src/components/collection/review-screen.tsx`, `src/components/commanders/filtered-empty.tsx`, `src/components/commanders/guided-banner.tsx`, `src/components/decks/builder-shell.tsx`, `src/components/decks/completion-reveal.tsx`, `src/components/home/first-run.tsx`, `src/components/shell/loading-screen.tsx`
- Modify: `src/app/globals.css` (delete three character tokens and their `@theme inline` aliases)
- Keep, untouched: `src/components/character/crab.tsx`, `kaiju.tsx`, `loader-dots.tsx` — they stay in git so a per-theme creature can return without re-plumbing every surface.

**Interfaces:**
- Consumes: `Crown` from Task 1; the rewritten copy from Task 2.

- [ ] **Step 1: Write the failing test**

Add to `src/components/shell/loading-screen.test.tsx` (create the file if absent):

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingScreen } from "./loading-screen";

const copy = { heading: "Loading decks", status: "fetching", caption: "One moment." };

describe("LoadingScreen", () => {
  it("ships no illustration — the crown is the whole mark", () => {
    const { container } = render(<LoadingScreen copy={copy} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll(".anim-dots")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/shell/loading-screen.test.tsx`
Expected: FAIL — the crab's `<svg>` is still in the tree.

- [ ] **Step 3: Replace the illustration on all ten surfaces**

For `loading-screen.tsx`, the whole `<div className="relative inline-flex">` block becomes:

```tsx
<Crown tone="page" pulse />
```

and the two character imports are removed in favour of `import { Crown } from "../ui/crown";`.

For the eight empty-state surfaces, delete the `<Crab … />` element and its wrapper if the wrapper existed only to position the crab, then place `<Crown tone="quiet" className="mb-[14px]" />` immediately above the heading. Update the import the same way. Two of the eight carry the page's own mark rather than an empty state's — `app/decks/page.tsx` and `home/first-run.tsx` take `tone="page"` at the same 14px — and `collection/review-screen.tsx` sits inline in a row, so it takes no bottom margin at all.

`commanders/guided-banner.tsx` is the exception: **it loses its mark entirely and gains nothing.** It is an inline directive banner with copy beside it, not an empty state; its mark is the 3px accent left border `.guided-banner` already carries. Delete the `<Crab>` and the import, add no `Crown`.

`decks/completion-reveal.tsx` needs four edits: delete the `<Kaiju>` block and both `<Crab>` instances with their imports; replace the hand-rolled three-span crown with `<Crown tone="loud" className="mb-[14px]" />` — this is the one surface the loud tone is for; and swap the celebration band's background from the deleted gradient to `bg-[color:var(--surface-sunken)]`.

- [ ] **Step 4: Delete the three character tokens**

In `src/app/globals.css`, delete the `--kaiju-body` / `--celebrate-top` / `--celebrate-bottom` declarations and their comment block (lines 39–43), and the three matching `--color-*` aliases in `@theme inline` (lines 102–104).

- [ ] **Step 5: Verify nothing still references them**

Run:

```bash
rg -n "kaiju-body|celebrate-top|celebrate-bottom|character/(crab|kaiju|loader-dots)" src
```

Expected: no matches outside `src/components/character/` itself.

- [ ] **Step 6: Run the full suite and the build**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: all green.

- [ ] **Step 7: Commit and open the phase PR**

```bash
git add src/app src/components
git commit -m "feat(themes): retire the character layer, promote the crown"
```

Run the design-review skill against the ten surfaces at 390px and desktop, then `gh pr create` for Phase 0 and run the Copilot review cycle to the merge bar.

---

## Phase 1 — Token contract and test harness

**PR 2.** The `:root` block becomes the Gilded Stone column verbatim, `--brass*` becomes `--accent*`, and a Vitest suite that will eventually police six themes goes green against the one that exists.

Two things change value here, not just name. `--fg-locked` (`#6A6152`) computes to **2.77:1** on `--surface` today, under the 3:1 floor — a real accessibility defect in the shipped app, not an artifact of the new rules. And `--warning` moves from `#E0913C` to `#DEAA29`, because §8's accent is more orange than brass was and amber-orange is now the collision. Both land as part of adopting the audited column wholesale; taking the column piecemeal would leave the suite red for reasons that are hard to attribute.

### Task 4: Colour maths

**Files:**
- Create: `src/lib/theme/color.ts`
- Create: `src/lib/theme/color.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseHex(hex: string): [number, number, number]` — 0–255 triple, throws on malformed input.
  - `relativeLuminance(hex: string): number`
  - `contrast(a: string, b: string): number` — order-independent, ≥ 1.
  - `oklab(hex: string): { L: number; a: number; b: number }`
  - `chroma(hex: string): number` — OKLCH C.
  - `deltaEOk(a: string, b: string): number`

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme/color.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { chroma, contrast, deltaEOk, parseHex, relativeLuminance } from "./color";

describe("parseHex", () => {
  it("reads a six-digit hex, case-insensitively", () => {
    expect(parseHex("#1E1A15")).toEqual([30, 26, 21]);
    expect(parseHex("#1e1a15")).toEqual([30, 26, 21]);
  });

  it("throws on anything else", () => {
    expect(() => parseHex("#FFF")).toThrow();
    expect(() => parseHex("var(--accent)")).toThrow();
  });
});

describe("relativeLuminance", () => {
  it("anchors at the sRGB extremes", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
  });
});

describe("contrast", () => {
  it("is 21:1 for black on white, in either order", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 4);
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 4);
  });

  it("is 1:1 for a colour against itself", () => {
    expect(contrast("#CF8745", "#CF8745")).toBeCloseTo(1, 6);
  });

  it("reproduces the audited Gilded Stone fg-on-bg figure", () => {
    expect(contrast("#EDE6D8", "#14110E")).toBeCloseTo(15.15, 1);
  });
});

describe("chroma", () => {
  it("is zero for neutrals", () => {
    expect(chroma("#FFFFFF")).toBeCloseTo(0, 6);
    expect(chroma("#808080")).toBeCloseTo(0, 6);
  });

  it("reproduces the audited Gilded Stone accent chroma", () => {
    expect(chroma("#CF8745")).toBeCloseTo(0.1203, 3);
  });
});

describe("deltaEOk", () => {
  it("is zero for a colour against itself", () => {
    expect(deltaEOk("#6FA368", "#6FA368")).toBeCloseTo(0, 6);
  });

  // The value the audit reports for the pair that came closest to colliding.
  // Task 8's snap-hex.mjs carries its own inline copy of this maths; if these
  // two ever disagree, the helper is lying about which token is nearest.
  it("reproduces the audited accent-to-warning distance", () => {
    expect(deltaEOk("#E0913C", "#CF8745")).toBeCloseTo(0.1009, 3);
  });

  it("separates the Gilded Stone warning from its accent", () => {
    expect(deltaEOk("#DEAA29", "#CF8745")).toBeGreaterThanOrEqual(0.05);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/theme/color.test.ts`
Expected: FAIL — `Failed to resolve import "./color"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/theme/color.ts`:

```ts
// Colour maths for the theme contract suite. Pure functions, no I/O — the
// suite that reads globals.css does the reading.
//
// OKLab coefficients are Björn Ottosson's published sRGB matrix. Chroma is
// deliberately measured on the quantised 8-bit hex rather than a pre-rounding
// OKLCH value: clamping in OKLCH and rounding afterwards re-introduces chroma,
// and five values in this system bust the budget that way.

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function parseHex(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`Not a six-digit hex colour: ${hex}`);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function oklab(hex: string): { L: number; a: number; b: number } {
  const [r, g, b] = parseHex(hex).map(toLinear);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function chroma(hex: string): number {
  const { a, b } = oklab(hex);
  return Math.hypot(a, b);
}

export function deltaEOk(a: string, b: string): number {
  const x = oklab(a);
  const y = oklab(b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/theme/color.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/color.ts src/lib/theme/color.test.ts
git commit -m "feat(themes): contrast, chroma and delta-E, measured not asserted"
```

### Task 5: The stylesheet parser

**Files:**
- Create: `src/lib/theme/parse-css.ts`
- Create: `src/lib/theme/parse-css.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseThemeBlocks(css: string): Map<string, Map<string, string>>` — theme key → token name (without the leading `--`) → declared value, trimmed. `:root` maps to the key `amonkhet`. Only top-level `:root` and `[data-theme="…"]` selectors are collected; `@theme inline`, `@layer` and media blocks are ignored.

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme/parse-css.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "./parse-css";

const CSS = `
:root {
  /* a comment */
  --bg: #14110E;
  --avail-hard: var(--accent);
}
[data-theme="kamigawa"] {
  --bg: #0E0F14;
  --avail-hard: var(--accent);
}
@theme inline {
  --color-bg: var(--bg);
}
@layer base {
  :focus-visible { outline: 2px solid var(--accent); }
}
`;

describe("parseThemeBlocks", () => {
  it("names the :root block amonkhet", () => {
    expect([...parseThemeBlocks(CSS).keys()]).toEqual(["amonkhet", "kamigawa"]);
  });

  it("keeps var() aliases as written rather than resolving them", () => {
    expect(parseThemeBlocks(CSS).get("amonkhet")?.get("avail-hard")).toBe("var(--accent)");
  });

  it("strips the leading -- from token names", () => {
    expect(parseThemeBlocks(CSS).get("kamigawa")?.get("bg")).toBe("#0E0F14");
  });

  it("ignores @theme inline, so --color-* never enters the contract", () => {
    for (const tokens of parseThemeBlocks(CSS).values()) {
      for (const name of tokens.keys()) expect(name.startsWith("color-")).toBe(false);
    }
  });
});

// The fixture above starts with `:root` at index 0 and has no @import, which is
// exactly the shape a broken anchor still parses. Everything the contract suite
// asserts is downstream of this one test, so it reads the real file.
describe("parseThemeBlocks, against the shipped stylesheet", () => {
  const REAL = readFileSync(
    fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
    "utf8",
  );

  it("finds the default theme past the @import line", () => {
    expect(parseThemeBlocks(REAL).has("amonkhet")).toBe(true);
  });

  it("reads a plausible number of tokens out of it", () => {
    expect(parseThemeBlocks(REAL).get("amonkhet")!.size).toBeGreaterThan(20);
  });
});
```

Add the two imports this needs at the top of the file:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/theme/parse-css.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/theme/parse-css.ts`:

```ts
// A deliberately small reader for globals.css: find the theme blocks, return
// their custom-property declarations verbatim. It does not resolve var(), on
// purpose — --avail-soft and --avail-hard are aliases, and the contract test
// has to be able to see that they still are.

const BLOCK = /(?:^|[};])\s*(:root|\[data-theme="([a-z]+)"\])\s*\{([^}]*)\}/gm;
const DECL = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;

export function parseThemeBlocks(css: string): Map<string, Map<string, string>> {
  const source = css.replace(COMMENT, "");
  const themes = new Map<string, Map<string, string>>();

  for (const [, selector, named, body] of source.matchAll(BLOCK)) {
    const key = selector === ":root" ? "amonkhet" : named;
    const tokens = themes.get(key) ?? new Map<string, string>();
    for (const [, name, value] of body.matchAll(DECL)) tokens.set(name, value.trim());
    themes.set(key, tokens);
  }

  return themes;
}
```

> The `(?:^|[};])` prefix is what keeps `@theme inline { … }` out: its declarations sit inside a block whose selector is not `:root`, and the regex only matches a theme selector at the start of a line, or immediately after a closing brace or a semicolon at nesting depth zero. `@layer base` is excluded for the same reason — its `:focus-visible` rule is nested one level deeper.
>
> **The `;` and the `m` flag are both load-bearing, and both are easy to lose.** In the shipped `globals.css` the first thing above `:root` is `@import "tailwindcss";` — a semicolon, not a brace — and `:root` is not at index 0, so a prefix of `(?:^|\})` without `m` matches *nothing at all* in the real file. It still matches the inline test CSS above, because that string happens to begin with `:root`. That is precisely the failure this task must not ship: a parser that returns an empty map, a contract suite that iterates zero themes, and a green CI run that has checked nothing. Step 4 below therefore runs the parser against the real stylesheet, not only the fixture.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/theme/parse-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/parse-css.ts src/lib/theme/parse-css.test.ts
git commit -m "feat(themes): read the theme blocks out of globals.css"
```

### Task 6: The contract suite

This is the CI gate. It is written table-driven from the start so Phase 3 adds five rows and no logic.

**Files:**
- Create: `src/lib/theme/contract.test.ts`

**Interfaces:**
- Consumes: `parseThemeBlocks` (Task 5); `contrast`, `chroma`, `deltaEOk` (Task 4).
- Produces: nothing importable — it is a test.

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme/contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chroma, contrast, deltaEOk } from "./color";
import { parseThemeBlocks } from "./parse-css";

const CSS = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8",
);
const THEMES = parseThemeBlocks(CSS);

// The 35 keys, spelled out rather than derived from :root. Derived, a token
// dropped from every theme at once would still pass.
const CONTRACT = [
  "bg", "surface", "surface-raised", "surface-rail", "surface-sunken",
  "surface-inset", "elevated", "elevated-hover", "border", "border-strong",
  "border-dashed", "fg", "fg-body", "fg-muted", "fg-faint", "fg-locked",
  "accent", "accent-hover", "accent-strong", "accent-shadow", "accent-dim",
  "accent-mid", "success", "warning", "danger", "avail-soft", "avail-hard",
  "avail-hard-fg", "avail-over-fg", "avail-over-border", "w", "u", "b", "r", "g",
];

const ALIASES: Record<string, string> = {
  "avail-soft": "var(--fg-muted)",
  "avail-hard": "var(--accent)",
};

const SURFACES = [
  "bg", "surface", "surface-raised", "surface-rail", "surface-sunken",
  "surface-inset", "elevated", "elevated-hover",
];
const BORDERS = ["border", "border-strong", "border-dashed"];
const TEXT = ["fg", "fg-body", "fg-muted", "fg-faint", "fg-locked"];
const PIPS = ["w", "u", "b", "r", "g"];
const SEMANTICS = ["success", "warning", "danger"];

const entries = [...THEMES.entries()];

describe("theme contract", () => {
  it("finds at least the default theme", () => {
    expect(THEMES.has("amonkhet")).toBe(true);
  });

  describe.each(entries)("%s", (name, tokens) => {
    const hex = (key: string) => {
      const value = tokens.get(key);
      if (!value) throw new Error(`${name} is missing --${key}`);
      return value;
    };

    it("declares exactly the 35 contract keys", () => {
      expect([...tokens.keys()].sort()).toEqual([...CONTRACT].sort());
    });

    it("writes every value as a hex, except the two aliases", () => {
      for (const key of CONTRACT) {
        if (key in ALIASES) expect(hex(key)).toBe(ALIASES[key]);
        else expect(hex(key)).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });

    it("keeps surfaces under 0.02 chroma", () => {
      for (const key of SURFACES) expect(chroma(hex(key))).toBeLessThanOrEqual(0.02);
    });

    it("keeps borders under 0.04 chroma", () => {
      for (const key of BORDERS) expect(chroma(hex(key))).toBeLessThanOrEqual(0.04);
    });

    it("keeps the text ramp under 0.03 chroma", () => {
      for (const key of TEXT) expect(chroma(hex(key))).toBeLessThanOrEqual(0.03);
    });

    it("clears every contrast floor", () => {
      expect(contrast(hex("fg"), hex("bg"))).toBeGreaterThanOrEqual(7);
      expect(contrast(hex("fg-body"), hex("surface"))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex("fg-muted"), hex("surface"))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex("fg-faint"), hex("surface"))).toBeGreaterThanOrEqual(3);
      expect(contrast(hex("fg-locked"), hex("surface"))).toBeGreaterThanOrEqual(3);
      // The accent button's label is --bg in all six themes.
      expect(contrast(hex("bg"), hex("accent"))).toBeGreaterThanOrEqual(4.5);
      // The focus ring is the accent, drawn on the canvas.
      expect(contrast(hex("accent"), hex("bg"))).toBeGreaterThanOrEqual(3);
    });

    it("separates every pip and semantic from the accent by 0.10 delta-E", () => {
      for (const key of [...PIPS, ...SEMANTICS]) {
        expect(deltaEOk(hex(key), hex("accent"))).toBeGreaterThanOrEqual(0.1);
      }
    });

    it("separates every pip from every other pip by 0.10 delta-E", () => {
      for (let i = 0; i < PIPS.length; i++) {
        for (let j = i + 1; j < PIPS.length; j++) {
          expect(deltaEOk(hex(PIPS[i]), hex(PIPS[j]))).toBeGreaterThanOrEqual(0.1);
        }
      }
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/theme/contract.test.ts`
Expected: FAIL on the contract-key test (`:root` still declares `--brass*`) and on the `fg-locked` contrast floor (2.77:1 against a 3:1 requirement). Both failures are the point — they are what Task 7 fixes.

**Check the shape of the failure, not just its colour.** If instead the run fails on "finds at least the default theme" and reports *no* `describe.each` suites, the parser is returning an empty map and the whole gate is inert — go back to Task 5 and its anchor. A red suite that is red for the wrong reason turns green in Task 7 while asserting nothing, and nothing downstream would ever catch it.

- [ ] **Step 3: Commit the red test**

```bash
git add src/lib/theme/contract.test.ts
git commit -m "test(themes): the contract suite, red against today's :root"
```

### Task 7: `:root` becomes Gilded Stone

**Files:**
- Modify: `src/app/globals.css`
- Modify: every file matching `rg -l 'brass' src` — a mechanical rename.

**Interfaces:**
- Consumes: the contract suite from Task 6.
- Produces: `--accent`, `--accent-hover`, `--accent-strong`, `--accent-shadow`, `--accent-dim`, `--accent-mid` and the Tailwind utilities `text-accent`, `bg-accent`, `border-accent-strong` and friends. `--brass*` and `--color-brass*` cease to exist.

- [ ] **Step 1: Replace the `:root` token block**

In `src/app/globals.css`, the token block becomes exactly this — values transcribed from the Gilded Stone column of `design/design_handoff_the99_themes/TOKEN-TABLE.md`:

```css
:root {
  /* Theme: amonkhet — "Gilded Stone". The default, and the fallback for an
     unrecognised data-theme: a complete theme rather than unstyled tokens. */

  /* Chrome (16) */
  --bg: #14110E;
  --surface: #1E1A15;
  --surface-raised: #211D18;
  --surface-rail: #1A1611;
  --surface-sunken: #18140F;
  --surface-inset: #1B1712;
  --elevated: #29241F;
  --elevated-hover: #201C17;
  --border: #2B241B;
  --border-strong: #3A3229;
  --border-dashed: #494037;
  --fg: #EDE6D8;
  --fg-body: #C0B8A6;
  --fg-muted: #A59C89;
  --fg-faint: #8B8270;
  --fg-locked: #6E6654;

  /* Flavor (6) — the only family permitted real chroma. */
  --accent: #CF8745;
  --accent-hover: #DE9757;
  --accent-strong: #AB6E37;
  --accent-shadow: #6B482A;
  --accent-dim: #6B482A;
  --accent-mid: #AB6E37;

  /* Semantic (3) */
  --success: #6FA368;
  --warning: #DEAA29;
  --danger: #C6533F;

  /* Card availability (5). The first two are aliases and must stay aliases —
     flattened to hexes they stop re-resolving per theme. */
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #D9975C;
  --avail-over-fg: #C46857;
  --avail-over-border: #752619;

  /* WUBRG identity swatches (5) */
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #1E1B1A;
  --r: #C05A3E;
  --g: #4B7A46;
}
```

Two values move rather than merely being renamed. `--fg-locked` lifts from `#6A6152` to `#6E6654` because the shipped value computes to 2.77:1 on `--surface`, under the 3:1 floor — a real defect in the shipped app. `--warning` moves from `#E0913C` to `#DEAA29` because the new accent is warmer and more orange than brass was, so amber-orange is now the collision.

- [ ] **Step 2: Rename the `@theme inline` accent aliases**

```css
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-strong: var(--accent-strong);
  --color-accent-shadow: var(--accent-shadow);
  --color-accent-dim: var(--accent-dim);
  --color-accent-mid: var(--accent-mid);
```

- [ ] **Step 3: Rename the focus ring, leaving it in `@layer base`**

```css
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
```

The `@layer base` wrapper is load-bearing — the comment above it explains that unlayered rules beat every layered one regardless of specificity, which is what makes "unless a component overrides" true. Do not move this rule out of the layer while editing it.

- [ ] **Step 4: Sweep the rename across `src/`**

Run:

```bash
rg -l 'brass' src | xargs perl -pi -e '
  s/--brass-hover/--accent-hover/g;
  s/--brass-strong/--accent-strong/g;
  s/--brass-shadow/--accent-shadow/g;
  s/--brass-dim/--accent-dim/g;
  s/--brass-mid/--accent-mid/g;
  s/--brass/--accent/g;
  s/\bbrass-hover\b/accent-hover/g;
  s/\bbrass-strong\b/accent-strong/g;
  s/\bbrass-shadow\b/accent-shadow/g;
  s/\bbrass-dim\b/accent-dim/g;
  s/\bbrass-mid\b/accent-mid/g;
  s/\bbrass\b/accent/g;
'
```

The longest-first ordering matters: `--brass` before `--brass-hover` would turn the latter into `--accent-hover` by accident on some inputs and `--accenthover` on others.

**`perl -pi -e`, not `sed -i ''`.** This is macOS, so `sed` is BSD, and BSD `sed` does not implement `\b`. It exits 0 and changes nothing, so the six word-boundary patterns — the ones that catch the Tailwind class names `text-brass`, `bg-brass-hover` — would be silent no-ops, and Step 5's verification would be the first sign. Verified on this machine: `s/\bbrass\b/accent/g` under BSD `sed` leaves `text-brass bg-brass-hover` untouched; under `perl` it produces `text-accent bg-accent-hover`. `perl` is present on macOS by default.

- [ ] **Step 5: Verify the rename is total**

Run: `rg -in 'brass' src docs/superpowers/design-tables`
Expected: no matches in `src/`. Matches in `docs/superpowers/design-tables/` are historical property tables and stay — they describe what shipped at the time.

Read the diff for prose damage: the word appears in comments ("Three brass dots", "brass horizon", "Brass accent") where the replacement should read naturally. Fix any comment the sweep left ungrammatical.

- [ ] **Step 6: Run the contract suite**

Run: `pnpm vitest run src/lib/theme/contract.test.ts`
Expected: PASS — one theme, all gates.

- [ ] **Step 7: Run everything**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`

The wider suite will fail where a test asserts on a renamed class or a moved hex — for example `src/components/ui/button.test.tsx` and `src/lib/shell/clerk-appearance.test.ts`. Update those assertions to the new names and values; do not weaken an assertion to make it pass.

- [ ] **Step 8: Commit and open the phase PR**

```bash
git add src/app/globals.css src/components src/lib
git commit -m "feat(themes): the token contract, and an accent that is not called brass"
```

Open the Phase 1 PR and run the Copilot review cycle to the merge bar.

---

## Phase 2 — The tokenization sweep

**PR 3.** The largest phase and the least interesting. `globals.css` defines the tokens, but components largely ignore them and paste brand hexes inline — roughly 700 hex literals across 67 `.tsx` files plus 49 more in non-test `.ts`. Until those resolve through tokens, no theme can change anything.

It cannot be parallelised ahead of Phase 1, because the sweep needs a token contract to sweep *toward*. It is split by directory so review stays tractable, and the existing suite is the regression net: this is token-for-hex with no behavioural change.

**Note that values shift slightly.** A component carrying `#8E8269` becomes `var(--fg-faint)`, which Phase 1 moved to `#8B8270`. That is the point — the sweep is what makes the audited column actually take effect. Do not "preserve" an old value by leaving the literal.

### The map

Every literal below is a shipped `:root` value and rewrites to its token. In Tailwind classes use the utility (`bg-surface`, `text-fg-muted`, `border-border-strong`); where the utility does not exist or the property is unusual, use the arbitrary form `[color:var(--token)]` / `bg-[color:var(--token)]`.

| Literal | Token |
|---|---|
| `#14110E` | `--bg` |
| `#1E1A15` | `--surface` |
| `#221D16` | `--surface-raised` |
| `#1A160F` | `--surface-rail` |
| `#181410` | `--surface-sunken` |
| `#1C1712` | `--surface-inset` |
| `#2A241D` | `--elevated` **or** `--border` — see the ruling below |
| `#211C15` | `--elevated-hover` |
| `#3A3229` | `--border-strong` |
| `#4A4033` | `--border-dashed` |
| `#EDE6D8` | `--fg` |
| `#C6B79A` | `--fg-body` |
| `#A89B84` | `--fg-muted` |
| `#8E8269` | `--fg-faint` |
| `#6A6152` | `--fg-locked` |
| `#C9A24B` | `--accent` |
| `#D8B25E` | `--accent-hover` |
| `#A9863E` | `--accent-strong`, or `--accent-mid` inside the fit-bar ramp |
| `#6E5B33` | `--accent-shadow`, or `--accent-dim` inside the fit-bar ramp |
| `#6FA368` | `--success` |
| `#E0913C` | `--warning` |
| `#C6533F` | `--danger` |
| `#E8CE93` | `--avail-hard-fg` |
| `#E9917A` | `--avail-over-fg` |
| `#6B3226` | `--avail-over-border` |
| `#F4E9C4` | `--w` |
| `#3A6AA5` | `--u` |
| `#1E1B1A` | `--b` |
| `#C05A3E` | `--r` |
| `#4B7A46` | `--g` |

**The `#2A241D` ruling.** The shipped stylesheet gives `--elevated` and `--border` the same hex, so the literal is genuinely ambiguous and cannot be resolved mechanically. Resolve it by the CSS property it sits on: a `background`, `fill`, or `bg-*` becomes `--elevated`; a `border`, `outline`, `stroke`, or `divide-*` becomes `--border`. Phase 3 separates the two values (`#29241F` and `#2B241B` in Gilded Stone), so guessing here produces a visible defect later, on one theme, on one surface.

**The fit-bar ramp.** `--accent-dim` and `--accent-mid` exist for the commander fit bar's gradient (`src/components/commanders/fit-bar.tsx`). Inside that file, `#6E5B33` is `--accent-dim` and `#A9863E` is `--accent-mid`. Everywhere else they are `--accent-shadow` and `--accent-strong`.

### Task 8: The nearest-token report

Of the 74 distinct literals in `src/`, the map in the previous section covers the common ones; the rest are a long tail, most a shade or two off a token. This task builds the tool that decides each one, so the sweep tasks are transcription rather than judgement.

**Files:**
- Create: `scripts/snap-hex.mjs`

**Interfaces:**
- Consumes: nothing importable. It re-implements the OKLab transform inline because a `.mjs` script cannot import the `.ts` module; the two must agree, and Step 2 checks that they do.
- Produces: a CLI report. Read-only — it never edits a file.

- [ ] **Step 1: Write the script**

Create `scripts/snap-hex.mjs`:

```js
// Read-only report: for every hex literal under src/, name the closest :root
// token and the OKLab distance to it. Written for the Phase 2 sweep, where the
// map covers the common cases and this covers the tail.
//
// Usage: node scripts/snap-hex.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SNAP = 0.03; // the audit's own "imperceptible" band

const css = readFileSync("src/app/globals.css", "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("@theme"));
const tokens = [...root.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6});/g)].map(
  ([, name, hex]) => ({ name, hex }),
);

function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const dist = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));

// Walked with fs rather than shelled out to rg: `execSync` runs under /bin/sh,
// where rg is not necessarily on PATH even when it works fine in the terminal.
function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (/\.tsx?$/.test(entry.name)) yield path;
  }
}

const hits = [...sources("src")].flatMap(
  (file) => readFileSync(file, "utf8").match(/#[0-9A-Fa-f]{6}\b/g) ?? [],
);

const counts = new Map();
for (const hex of hits) {
  const key = hex.toUpperCase();
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

const rows = [...counts.entries()]
  .map(([hex, count]) => {
    const best = tokens
      .map((t) => ({ ...t, d: dist(hex, t.hex) }))
      .sort((a, b) => a.d - b.d)[0];
    return { hex, count, token: best.name, d: best.d, exact: best.hex === hex };
  })
  .sort((a, b) => a.d - b.d || b.count - a.count);

for (const r of rows) {
  const verdict = r.exact ? "EXACT" : r.d <= SNAP ? "snap " : "REVIEW";
  console.log(
    `${verdict}  ${r.hex}  x${String(r.count).padStart(3)}  --${r.token}  ΔE ${r.d.toFixed(4)}`,
  );
}
```

- [ ] **Step 2: Run it, and check its maths against `color.ts`**

Run: `node scripts/snap-hex.mjs`
Expected: one line per distinct literal, sorted nearest-first, tagged `EXACT`, `snap` or `REVIEW`. On the tree as it stands there are 74 distinct literals across 901 occurrences, about 22 of them `REVIEW`.

The script's `oklab` is a hand copy of the one in `src/lib/theme/color.ts`, so confirm the copy is faithful before trusting a single ΔE:

Run: `node -e 'import("./scripts/snap-hex.mjs")' ` is not enough — the script has no export. Instead check one value by hand against the test suite: `deltaEOk("#E0913C", "#CF8745")` is asserted as `0.1009` in `color.test.ts`, and the report's row for `#E0913C` against `--accent` must show the same figure to four places. If it does not, the transcription is wrong and every `snap` verdict below it is untrustworthy.

- [ ] **Step 3: Record the rulings**

`EXACT` and `snap` rows are decided: rewrite them to the named token. `REVIEW` rows are not — for each, decide one of:

1. It is a **gradient stop or scrim** derived from a token. Rewrite as `color-mix(in oklab, var(--token) N%, transparent)` or an `rgb(… / α)` over a token, so it moves with the theme.
2. It is **card-art or Scryfall-sourced colour data**, which is not chrome and is not themed. Leave it, and add its file to the Task 13 allowlist with a one-line reason.
3. It is a **genuine third value** the token set does not cover. Do not invent a token — the contract is 35 keys in six themes and a 36th is a design decision. Snap it to the nearest token and note the change in the PR body for Design to ratify.

Write the decisions into the PR description as a table. There is no separate debt document: a list of literals nobody has decided is how the 901 accumulated in the first place.

- [ ] **Step 4: Commit**

```bash
git add scripts/snap-hex.mjs
git commit -m "chore(themes): report the nearest token for every hex literal in src"
```

### Tasks 9–12: The sweep, by directory

Four tasks, identical in shape, differing only in scope. Do them in this order — `ui/` and `shell/` first, because a token error there shows up on every page and is caught immediately.

Counts below are occurrences of `#RRGGBB`, measured on `main` at 2026-09-02 with
`rg -o '#[0-9A-Fa-f]{6}\b' -g '*.ts' -g '*.tsx' <scope> | wc -l`. They total 898 — the three
in `src/components/character/` are already gone by Phase 0, and 93 of the 898 are in the two
allowlisted `src/lib/` files and their tests, so the real sweep is a little over 800.

| Task | Scope | Literals |
|---|---|---|
| 9 | `src/components/ui/`, `src/components/shell/`, `src/components/home/`, `src/components/marks.tsx` | 65 |
| 10 | `src/components/commanders/` | 271 |
| 11 | `src/components/decks/` | 382 |
| 12 | `src/components/collection/`, `src/app/`, `src/lib/` | 180 |

Task 11 is the biggest single scope by a wide margin. Commit per file rather than per task
there, so a bad translation is a one-file revert.

Each task runs this loop:

- [ ] **Step 1: Establish the baseline**

Run: `pnpm test`
Expected: PASS. A red baseline makes every later failure ambiguous.

- [ ] **Step 2: List the work**

Run, substituting the task's scope:

```bash
rg -n '#[0-9A-Fa-f]{6}\b' <scope> --stats
```

- [ ] **Step 3: Rewrite, file by file**

For each file, replace every literal with its token per the map, the `#2A241D` ruling, and the Task 8 report. Prefer the Tailwind utility over the arbitrary value where one exists — `bg-surface` reads better than `bg-[color:var(--surface)]` and compiles to the same thing.

Inline `style={{ … }}` colour on a `button`, `a` or `Link` is already flagged by the repo's `no-restricted-syntax` rule. Where the sweep touches one, move the colour to a Tailwind class rather than swapping one inline value for another — an inline style outranks `hover:` utilities and silently kills the hover state.

Delete any comment that names a hex now that the hex is gone. A comment reading "brand `#3A3229`" beside `border-border-strong` is a future contradiction.

- [ ] **Step 4: Verify the scope is clean**

Run: `rg -n '#[0-9A-Fa-f]{6}\b' <scope>`
Expected: no matches, except files the Task 8 report placed in category 2 (art or Scryfall data).

- [ ] **Step 5: Run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`

Tests asserting on a literal fail here. Update the assertion to the token — `expect(el).toHaveClass("bg-surface")` — rather than to the hex; asserting on a hex is how the debt re-accumulates.

- [ ] **Step 6: Look at it**

Run `pnpm dev`, open the affected routes at 390px and desktop, and compare against `main`. Nothing should move. Small colour shifts are expected wherever Phase 1 adjusted a value; a *layout* change means a class was dropped, not translated.

- [ ] **Step 7: Commit**

```bash
git add <scope>
git commit -m "refactor(themes): <scope> resolves colour through tokens"
```

### Task 13: `.guided-banner` and the guard

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/theme/no-hex.test.ts`

**Interfaces:**
- Consumes: the swept tree from Tasks 9–12.
- Produces: a build that fails on a new hex literal in `src/`.

- [ ] **Step 1: De-hex `.guided-banner`**

`globals.css` hardcodes six values plus a two-stop gradient outside the token block. Replace them:

```css
.guided-banner {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
}
@media (min-width: 768px) {
  .guided-banner {
    background: linear-gradient(120deg, var(--surface-raised), var(--surface-rail) 60%);
    border: 1px solid var(--border-strong);
    border-left: 1px solid var(--border-strong);
  }
}
```

The desktop gradient's stops were `#221D14` and `#1A160F`, which are `--surface-raised` and `--surface-rail` to within the snap band.

- [ ] **Step 2: Confirm no literals remain in the stylesheet outside `:root`**

Run: `rg -n '#[0-9A-Fa-f]{6}' src/app/globals.css`
Expected: matches inside the `:root` block only.

- [ ] **Step 3: Close the door with a test, not a lint rule**

The obvious move is an ESLint `no-restricted-syntax` block banning hex literals. Don't. The
repo already has a `no-restricted-syntax` entry on `src/**/*.tsx` for inline colour styles on
interactive elements, and flat config does not concatenate options across blocks: for any file
both blocks match — every `.tsx` file in `src/` — the later block's entry **replaces** the
earlier one, and the inline-style rule silently stops running. Merging the selectors into one
block forces one severity on all three, and the inline-style rule has 117 outstanding warnings
that turning to `error` would break the build for reasons unrelated to this phase.

So the gate goes where it belongs — in the suite that already reads files for exactly this
kind of repo invariant.

Create `src/lib/theme/no-hex.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../..", import.meta.url));

// Every exemption is a decision, and every decision states its reason here.
const ALLOWED = new Set([
  // Clerk's appearance API derives hover and disabled shades from these, so it
  // needs real colours and rejects custom properties. Driven from the token
  // values by hand; see the follow-up note in the plan.
  "lib/shell/clerk-appearance.ts",
  "lib/shell/clerk-appearance.test.ts",
  // Card-art placeholder gradients, sampled from card art rather than chrome.
  // These are art, not theme surface, and do not move between themes.
  "lib/collection/gradients.ts",
  "lib/collection/gradients.test.ts",
  // The theme library's own tests are about hex values, so they contain them.
  "lib/theme/color.test.ts",
  "lib/theme/parse-css.test.ts",
  "lib/theme/contract.test.ts",
  "lib/theme/no-hex.test.ts",
]);

// Dead by design — kept so a per-theme creature can return without re-plumbing
// ten surfaces. Not swept, because nothing renders it.
const ALLOWED_DIRS = ["components/character/"];

// The brand hexes, as RGB triples. A theme-aware colour written as rgba() is
// invisible to a hex scan and stays Gilded Stone in all six themes, so the
// scan looks for both spellings.
const HEX = /#[0-9A-Fa-f]{6}\b/;
const BRAND_RGBA =
  /rgba\(\s*(201,\s*162,\s*75|111,\s*163,\s*104|198,\s*83,\s*63|224,\s*145,\s*60|237,\s*230,\s*216)/;

function* sources(dir: string, prefix = ""): Generator<string> {
  for (const entry of readdirSync(join(SRC, dir), { withFileTypes: true })) {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) yield* sources(join(dir, entry.name), rel + "/");
    else if (/\.tsx?$/.test(entry.name)) yield rel;
  }
}

const files = [...sources(".")].filter(
  (f) => !ALLOWED.has(f) && !ALLOWED_DIRS.some((d) => f.startsWith(d)),
);

describe("colour comes from tokens", () => {
  it("scans a plausible number of files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(files)("%s has no hex literal", (file) => {
    const line = readFileSync(join(SRC, file), "utf8")
      .split("\n")
      .find((l) => HEX.test(l));
    expect(
      line,
      `${file} still names a colour by hex. Use a Tailwind token utility (bg-surface, text-fg-muted) or var(--token). If the value is genuinely not chrome, add the file to ALLOWED above with a reason.`,
    ).toBeUndefined();
  });

  it.each(files)("%s has no brand-tinted rgba()", (file) => {
    const line = readFileSync(join(SRC, file), "utf8")
      .split("\n")
      .find((l) => BRAND_RGBA.test(l));
    expect(
      line,
      `${file} tints with a brand rgba(), which no theme can override. Use color-mix(in oklab, var(--accent) 8%, transparent).`,
    ).toBeUndefined();
  });
});
```

Neutral `rgba(0,0,0,…)` and `rgba(255,255,255,…)` are deliberately not caught: shadows and
scrims are black and white in all six themes, and rewriting them as tokens would add 35 keys
to express nothing.

- [ ] **Step 4: Run it and fix what it finds**

Run: `pnpm vitest run src/lib/theme/no-hex.test.ts`

Two classes of failure are expected the first time. A hex literal means Tasks 9–12 missed a
file — sweep it. A brand-tinted `rgba()` means a translation the hex map could not see; there
are 51 of these across `src/`, and each becomes a `color-mix()`:

```
rgba(201,162,75,0.08)  →  color-mix(in oklab, var(--accent) 8%, transparent)
rgba(111,163,104,0.15) →  color-mix(in oklab, var(--success) 15%, transparent)
rgba(224,145,60,0.13)  →  color-mix(in oklab, var(--warning) 13%, transparent)
rgba(198,83,63,0.14)   →  color-mix(in oklab, var(--danger) 14%, transparent)
rgba(237,230,216,0.06) →  color-mix(in oklab, var(--fg) 6%, transparent)
```

The percentage is the alpha, and `color-mix` against `transparent` is alpha compositing, so
the two are the same colour on any background. Note `resolution-expander.tsx` writes
`rgba(201,162,75,.16)` with no leading zero — the regex catches it, the eye does not.

Do not widen `ALLOWED` to make a file pass. Two files in it already carry a reason each; a
third needs one too.

- [ ] **Step 5: Run everything and open the phase PR**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`

```bash
git add src/app/globals.css src/lib/theme/no-hex.test.ts
git commit -m "feat(themes): the banner joins the token block, and the door closes behind it"
```

Open the Phase 2 PR. Its description carries the Task 8 ruling table. Run the Copilot review cycle to the merge bar — this is a wide diff, so expect more rounds than usual.

---

## Phase 3 — The five remaining theme blocks

**PR 4.** Five `[data-theme]` blocks are added below `:root`, and the contract suite — already written table-driven — starts policing six themes instead of one, with no change to its logic.

Every value below is transcribed from `design/design_handoff_the99_themes/TOKEN-TABLE.md`. They were generated by solving for the floors rather than picked and then checked, and `tokens.json` is their machine-readable twin. Transcribe; do not derive.

### Task 14: Five blocks

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/lib/theme/contract.test.ts` (no edit — it iterates whatever it parses)

**Interfaces:**
- Consumes: the contract suite from Task 6.
- Produces: the selectors `[data-theme="kamigawa"]`, `[data-theme="innistrad"]`, `[data-theme="phyrexia"]`, `[data-theme="duskmourn"]`, `[data-theme="kaldheim"]`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/theme/contract.test.ts`, above the `describe.each`:

```ts
const EXPECTED_THEMES = [
  "amonkhet", "kamigawa", "innistrad", "phyrexia", "duskmourn", "kaldheim",
];

it("declares all six themes", () => {
  expect([...THEMES.keys()].sort()).toEqual([...EXPECTED_THEMES].sort());
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/theme/contract.test.ts`
Expected: FAIL — only `amonkhet` is present.

- [ ] **Step 3: Add the five blocks**

Append to `src/app/globals.css`, immediately after the `:root` block and before `@theme inline`:

```css
/* Theme: kamigawa — "Neon Rain". Cyberpunk; the one high-chroma accent. */
[data-theme="kamigawa"] {
  --bg: #0E0F14;
  --surface: #16181F;
  --surface-raised: #191B22;
  --surface-rail: #12141B;
  --surface-sunken: #101219;
  --surface-inset: #13151C;
  --elevated: #20222A;
  --elevated-hover: #181A21;
  --border: #181C26;
  --border-strong: #262A35;
  --border-dashed: #343843;
  --fg: #E6E8F0;
  --fg-body: #B1B6C7;
  --fg-muted: #959AAD;
  --fg-faint: #6F7486;
  --fg-locked: #606476;
  --accent: #FF4D9A;
  --accent-hover: #FF62A9;
  --accent-strong: #D33E7E;
  --accent-shadow: #843052;
  --accent-dim: #843052;
  --accent-mid: #D33E7E;
  --success: #6FA368;
  --warning: #E0913C;
  --danger: #C6533F;
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #DF8AA7;
  --avail-over-fg: #C26755;
  --avail-over-border: #752619;
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #1E1B1A;
  --r: #C05A3E;
  --g: #4B7A46;
}

/* Theme: innistrad — "Moonlit". Gothic horror; near-achromatic by design, and
   the only theme whose --avail-hard-fg equals its --accent. That is correct,
   not a copy-paste: this accent already clears 7:1 on --surface. */
[data-theme="innistrad"] {
  --bg: #101314;
  --surface: #191D1E;
  --surface-raised: #1C2021;
  --surface-rail: #15191A;
  --surface-sunken: #131718;
  --surface-inset: #161A1B;
  --elevated: #242829;
  --elevated-hover: #1B1F20;
  --border: #1C2224;
  --border-strong: #2B3133;
  --border-dashed: #3A4042;
  --fg: #DDE3E1;
  --fg-body: #B3BDBB;
  --fg-muted: #96A19E;
  --fg-faint: #737D7B;
  --fg-locked: #606A68;
  --accent: #8AAFA1;
  --accent-hover: #9ABEB0;
  --accent-strong: #729186;
  --accent-shadow: #4E6059;
  --accent-dim: #4E6059;
  --accent-mid: #729186;
  /* Deepened from the shared #6FA368: the accent was floored to chroma 0.045
     per the brief's §9.5 ruling, which pulled success inside the 0.10 ΔE
     separation floor. */
  --success: #679F5F;
  --warning: #E0913C;
  --danger: #C6533F;
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #8AAFA1;
  --avail-over-fg: #C56A58;
  --avail-over-border: #752619;
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #1E1B1A;
  --r: #C05A3E;
  --g: #4B7A46;
}

/* Theme: phyrexia — "Oil and Iron". Biomechanical; the only theme in which a
   WUBRG pip moves, because the oil-teal accent sat ΔE 0.09 from green. */
[data-theme="phyrexia"] {
  --bg: #0D0B0E;
  --surface: #151317;
  --surface-raised: #18161A;
  --surface-rail: #110F13;
  --surface-sunken: #100E12;
  --surface-inset: #131115;
  --elevated: #1E1C20;
  --elevated-hover: #171519;
  --border: #19161C;
  --border-strong: #262329;
  --border-dashed: #332F36;
  --fg: #E4E2E6;
  --fg-body: #B5B2BB;
  --fg-muted: #9A96A0;
  --fg-faint: #78747E;
  --fg-locked: #64616A;
  --accent: #52827A;
  --accent-hover: #629189;
  --accent-strong: #3E665F;
  --accent-shadow: #213834;
  --accent-dim: #213834;
  --accent-mid: #3E665F;
  --success: #6FA368;
  --warning: #E0913C;
  --danger: #C6533F;
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #77A9A0;
  --avail-over-fg: #BE6453;
  --avail-over-border: #752619;
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #1E1B1A;
  --r: #C05A3E;
  /* Deepened and pushed toward yellow-green, away from the oil-teal accent. */
  --g: #527030;
}

/* Theme: duskmourn — "Screen Glow". Analog horror; the bright one. */
[data-theme="duskmourn"] {
  --bg: #100E15;
  --surface: #1A1822;
  --surface-raised: #1E1C26;
  --surface-rail: #15131C;
  --surface-sunken: #13111A;
  --surface-inset: #17151F;
  --elevated: #26242E;
  --elevated-hover: #1C1A24;
  --border: #1F2933;
  --border-strong: #2F3A44;
  --border-dashed: #3F4B55;
  --fg: #D8DBE0;
  --fg-body: #AFB8C8;
  --fg-muted: #929CAE;
  --fg-faint: #646D7E;
  --fg-locked: #5D6676;
  --accent: #49A9DC;
  --accent-hover: #5DB9EB;
  --accent-strong: #3B8BB6;
  --accent-shadow: #2F5A73;
  --accent-dim: #2F5A73;
  --accent-mid: #3B8BB6;
  --success: #6FA368;
  --warning: #E0913C;
  --danger: #C6533F;
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #54ADDD;
  --avail-over-fg: #C36756;
  --avail-over-border: #752619;
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #1E1B1A;
  --r: #C05A3E;
  --g: #4B7A46;
}

/* Theme: kaldheim — "Rune Frost". Norse; the lightest chrome of the six. */
[data-theme="kaldheim"] {
  --bg: #121217;
  --surface: #1E1F26;
  --surface-raised: #22232B;
  --surface-rail: #181920;
  --surface-sunken: #16171D;
  --surface-inset: #1A1B22;
  --elevated: #2D2E35;
  --elevated-hover: #212229;
  --border: #1A1F2B;
  --border-strong: #2E3340;
  --border-dashed: #424755;
  --fg: #C6D2D3;
  --fg-body: #B3C0C2;
  --fg-muted: #95A4A6;
  --fg-faint: #7C8A8C;
  --fg-locked: #5F6D6E;
  --accent: #5C86C9;
  --accent-hover: #6C95D8;
  --accent-strong: #486BA3;
  --accent-shadow: #2C405F;
  --accent-dim: #2C405F;
  --accent-mid: #486BA3;
  --success: #6FA368;
  --warning: #E0913C;
  --danger: #C6533F;
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #80ABEF;
  --avail-over-fg: #C86D5B;
  --avail-over-border: #752619;
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #1E1B1A;
  --r: #C05A3E;
  --g: #4B7A46;
}
```

- [ ] **Step 4: Run the contract suite**

Run: `pnpm vitest run src/lib/theme/contract.test.ts`
Expected: PASS — six themes, all seven contrast gates, all three chroma budgets, all separation floors.

A failure here means a transcription error, not a design error. Cross-check the failing token against `tokens.json` before touching a value.

`tokens.json`'s `audit` block is trustworthy for this purpose: all 48 of its figures — seven contrast gates and one chroma reading across six themes — were recomputed from the theme blocks and reproduce exactly, after one stale Innistrad row was corrected in review. If the suite disagrees with it, suspect the transcription in `globals.css` first.

- [ ] **Step 5: Look at all six**

There is no picker yet. Set the attribute by hand in devtools — `document.documentElement.dataset.theme = "kaldheim"` — and walk the app at 390px and desktop under each of the six. Compare against `design/design_handoff_the99_themes/The 99 - Six-Theme Visual System.dc.html` §G, which draws the shell at rest at both widths.

- [ ] **Step 6: Commit and open the phase PR**

```bash
git add src/app/globals.css src/lib/theme/contract.test.ts
git commit -m "feat(themes): five more planes, measured against the same floors"
```

---

## Phase 4 — The font layer

**PR 5.** The display face changes per theme; body stays IBM Plex Sans and mono stays IBM Plex Mono in all six. Varying all three faces would mean 18 families, a CLS risk on every paragraph, and six readability regressions to chase.

### The `@theme inline` trap

`globals.css` currently has `--font-display: var(--font-cinzel)` inside `@theme inline`. `inline` means Tailwind substitutes the value directly, so the `font-display` utility compiles to `font-family: var(--font-cinzel)` — Cinzel, permanently. **Redefining `--font-display` in a `[data-theme]` block does nothing**, because no compiled rule ever reads it. One level of indirection fixes it. Colour tokens are unaffected, which is exactly why this is easy to miss.

### Task 15: Six faces, one indirection

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: the six theme blocks from Task 14.
- Produces: `--font-display-face` in every theme block; the CSS variables `--font-cinzel`, `--font-chakra-petch`, `--font-spectral`, `--font-syncopate`, `--font-big-shoulders`, `--font-metamorphous` on `<html>`.

- [ ] **Step 1: Widen the contract, then write the failing test**

`parseThemeBlocks` merges every rule that shares a selector, so the six one-line
`--font-display-face` rules added in Step 5 land in the same token map as that theme's colour
tokens. That means the key is part of the contract whether or not it is a colour, and the
36-key assertion and the hex assertion both have to know about it.

In `src/lib/theme/contract.test.ts`, append the key to `CONTRACT` — the 35 colour keys stay
exactly as Task 6 wrote them, in the same order — and add the exclusion set beneath it:

```ts
const CONTRACT = [
  "bg", "surface", "surface-raised", "surface-rail", "surface-sunken",
  "surface-inset", "elevated", "elevated-hover", "border", "border-strong",
  "border-dashed", "fg", "fg-body", "fg-muted", "fg-faint", "fg-locked",
  "accent", "accent-hover", "accent-strong", "accent-shadow", "accent-dim",
  "accent-mid", "success", "warning", "danger", "avail-soft", "avail-hard",
  "avail-hard-fg", "avail-over-fg", "avail-over-border", "w", "u", "b", "r", "g",
  "font-display-face",
];

// Not a colour. Excluded from the hex assertion; the chroma, contrast and ΔE
// gates need no change, because each iterates SURFACES, BORDERS, TEXT, PIPS or
// SEMANTICS rather than CONTRACT, and the font key is in none of them.
const FONTS = new Set(["font-display-face"]);
```

Retitle Task 6's key-count test, which now counts 36:

```ts
it("declares exactly the 36 contract keys", () => {
  expect([...tokens.keys()].sort()).toEqual([...CONTRACT].sort());
});
```

and teach the hex assertion the exclusion:

```ts
it("writes every value as a hex, except the aliases and the face", () => {
  for (const key of CONTRACT) {
    if (FONTS.has(key)) expect(hex(key)).toMatch(/^var\(--font-[a-z-]+\)$/);
    else if (key in ALIASES) expect(hex(key)).toBe(ALIASES[key]);
    else expect(hex(key)).toMatch(/^#[0-9A-F]{6}$/i);
  }
});
```

Then add the two tests this task exists to satisfy:

```ts
describe("the display face", () => {
  it("reaches the utility through one level of indirection", () => {
    expect(CSS).toContain("--font-display: var(--font-display-face)");
  });

  it("gives each theme a different face", () => {
    // Read from the parsed map, not by slicing the raw CSS: a slice that runs
    // from a theme's selector to end-of-file will happily match the *next*
    // theme's declaration and report a missing face as present.
    const faces = [...THEMES.values()].map((t) => t.get("font-display-face"));
    expect(faces).toHaveLength(6);
    expect(new Set(faces).size).toBe(6);
  });

  it("never redefines --font-display inside a theme block", () => {
    for (const tokens of THEMES.values()) {
      expect(tokens.has("font-display")).toBe(false);
    }
  });
});
```


- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/theme/contract.test.ts`
Expected: FAIL — `--font-display-face` appears nowhere.

- [ ] **Step 3: Load the six display faces**

In `src/app/layout.tsx`, replace the `next/font/google` import and the Cinzel call:

```tsx
import {
  Big_Shoulders,
  Chakra_Petch,
  Cinzel,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Metamorphous,
  Spectral,
  Syncopate,
} from "next/font/google";

// The six display faces. `preload: false` on every one of them is load-bearing:
// Next emits all six @font-face blocks unconditionally, and the browser only
// fetches a family when it first renders an element matched by a rule using it.
// Since only the active theme's --font-display-face is ever resolved, only that
// family is fetched — unless a <link rel="preload"> drags all six down on every
// page, which is exactly what preload: true does.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const syncopate = Syncopate({
  variable: "--font-syncopate",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// The handoff names this face "Big Shoulders Display". Google merged that
// family into "Big Shoulders" in 2024, and this Next version exports only
// `Big_Shoulders` — `Big_Shoulders_Display` does not typecheck. It is a
// variable font, so omitting `weight` is correct and gives the full axis.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Metamorphous ships exactly one static weight, 400. See the Rune Frost rule in
// globals.css for what that means for `font-bold`.
const metamorphous = Metamorphous({
  variable: "--font-metamorphous",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
```

Plex Sans and Plex Mono keep their existing declarations and keep preloading — they are used unconditionally.

If a weight list is wrong, `next/font` fails the build and names the available weights. Take the build's list over the list above.

- [ ] **Step 4: Put the variables on `<html>`**

```tsx
className={`${cinzel.variable} ${chakraPetch.variable} ${spectral.variable} ${syncopate.variable} ${bigShoulders.variable} ${metamorphous.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
```

- [ ] **Step 5: Add the indirection and the per-theme face**

In `@theme inline`, change one line:

```css
  --font-display: var(--font-display-face);
```

Then add one declaration to each theme block:

```css
:root                    { --font-display-face: var(--font-cinzel); }
[data-theme="kamigawa"]  { --font-display-face: var(--font-chakra-petch); }
[data-theme="innistrad"] { --font-display-face: var(--font-spectral); }
[data-theme="phyrexia"]  { --font-display-face: var(--font-syncopate); }
[data-theme="duskmourn"] { --font-display-face: var(--font-big-shoulders); }
[data-theme="kaldheim"]  { --font-display-face: var(--font-metamorphous); }
```

Write each into its existing block rather than adding six new rules — a second `:root` block competing with the first is how a token ends up with two homes.

- [ ] **Step 6: The Rune Frost weight rule**

Add inside the existing `@layer base`:

```css
  /* Metamorphous ships a single static weight. `font-synthesis-weight` defaults
     to `auto`, so the 32 `font-bold` display sites do not fall back to 400 —
     the browser fakes bold by dilating every stroke uniformly, which is
     precisely wrong for a high-contrast decorative face and does its worst work
     at the 15–18px where most of those sites sit. Pinned to the real 400.
     The visible consequence is that Rune Frost headings sit a little lighter
     than the other five themes'; that is the trade, and it was taken
     deliberately. Delete this rule to reverse it — nothing else moves. */
  [data-theme="kaldheim"] .font-display {
    font-synthesis-weight: none;
  }
```

- [ ] **Step 7: Run the suite and the build**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`

- [ ] **Step 8: Check the metrics under all six faces**

A heading that fits in Cinzel may wrap in Metamorphous. With `pnpm dev` running and the attribute set by hand, check the app's longest headings — the card modal's card name, the commander detail header, and the builder tabs — under all six, at 390px and desktop.

Two known consequences from the specimen, both stated but not measured on device: **Syncopate needs the card-modal heading capped at 26px** or Oil and Iron grows a line on long card names, and **Big Shoulders probably wants +1px under 24px**. Apply both if the browser confirms them; note in the PR body if it does not.

Rune Frost is the one to check on real hardware — synthetic-bold behaviour and hinting differ enough between macOS and Windows that the 15px row is worth one look on each.

- [ ] **Step 9: Commit and open the phase PR**

```bash
git add src/app/layout.tsx src/app/globals.css src/lib/theme/contract.test.ts
git commit -m "feat(themes): six display faces, one level of indirection"
```

---

## Phase 5 — Picker and persistence

**PR 6.** The theme is stored in a cookie, read in the root layout during SSR, and written to `<html data-theme="…">`. `localStorage` cannot be read before hydration and produces a visible flash of the default theme on every navigation; a blocking inline script avoids the flash but adds render-blocking JS to every page.

### Task 16: The theme registry

**Files:**
- Create: `src/lib/theme/themes.ts`
- Create: `src/lib/theme/themes.test.ts`
- Create: `src/lib/copy/theme.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ThemeKey = "amonkhet" | "kamigawa" | "innistrad" | "phyrexia" | "duskmourn" | "kaldheim"`
  - `THEMES: readonly { key: ThemeKey; name: string; plane: string }[]` — in picker order.
  - `DEFAULT_THEME: ThemeKey`
  - `THEME_COOKIE: "the99_theme"`
  - `isThemeKey(value: string | undefined): value is ThemeKey`
  - `themeCopy` from `src/lib/copy/theme.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme/themes.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, isThemeKey, THEME_COOKIE, THEMES } from "./themes";

describe("theme registry", () => {
  it("lists six themes in picker order, default first", () => {
    expect(THEMES.map((t) => t.key)).toEqual([
      "amonkhet", "kamigawa", "innistrad", "phyrexia", "duskmourn", "kaldheim",
    ]);
    expect(DEFAULT_THEME).toBe("amonkhet");
  });

  it("carries the handoff's names verbatim", () => {
    expect(THEMES.map((t) => t.name)).toEqual([
      "Gilded Stone", "Neon Rain", "Moonlit", "Oil and Iron", "Screen Glow", "Rune Frost",
    ]);
  });

  it("matches every key to a block in globals.css", () => {
    const css = readFileSync(
      fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
      "utf8",
    );
    for (const { key } of THEMES) {
      if (key === DEFAULT_THEME) expect(css).toContain(":root");
      else expect(css).toContain(`[data-theme="${key}"]`);
    }
  });

  it("guards against anything else", () => {
    expect(isThemeKey("kaldheim")).toBe(true);
    expect(isThemeKey("ravnica")).toBe(false);
    expect(isThemeKey(undefined)).toBe(false);
    expect(isThemeKey("")).toBe(false);
  });

  it("names the cookie", () => {
    expect(THEME_COOKIE).toBe("the99_theme");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/theme/themes.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the registry**

Create `src/lib/theme/themes.ts`:

```ts
// The theme registry. One list, shared by the picker, the root layout and the
// tests, so a seventh theme is one row here and one block in globals.css.

export const THEME_COOKIE = "the99_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = [
  { key: "amonkhet", name: "Gilded Stone", plane: "Amonkhet" },
  { key: "kamigawa", name: "Neon Rain", plane: "Kamigawa: Neon Dynasty" },
  { key: "innistrad", name: "Moonlit", plane: "Innistrad" },
  { key: "phyrexia", name: "Oil and Iron", plane: "New Phyrexia" },
  { key: "duskmourn", name: "Screen Glow", plane: "Duskmourn" },
  { key: "kaldheim", name: "Rune Frost", plane: "Kaldheim" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

// Amonkhet lives in :root rather than its own attribute block, so an
// unrecognised value degrades to a complete theme rather than to bare tokens.
export const DEFAULT_THEME: ThemeKey = "amonkhet";

export function isThemeKey(value: string | undefined): value is ThemeKey {
  return !!value && THEMES.some((t) => t.key === value);
}
```

- [ ] **Step 4: Write the copy**

Create `src/lib/copy/theme.ts`, transcribed from `design/design_handoff_the99_themes/themes · copy strings.ts`:

```ts
// Theme picker copy. Voice: Kitchen Table, per the richness handoff.
// Names and plane subtitles come from the theme registry so the two cannot drift.

export const themeCopy = {
  // Section label in the account menu. Plex Mono 11px uppercase, per the brand label style.
  label: "Theme",
  // Announced to screen readers on the radiogroup.
  groupLabel: "Colour theme",
  // aria-label per option. The plane is included because it is visible text.
  optionLabel: (name: string, plane: string) => `${name} — ${plane}`,
  // Live-region announcement after a selection. There is no Save, so this is the receipt.
  applied: (name: string) => `${name} applied.`,
} as const;
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm vitest run src/lib/theme/themes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme/themes.ts src/lib/theme/themes.test.ts src/lib/copy/theme.ts
git commit -m "feat(themes): the registry, and the names the picker says out loud"
```

### Task 17: SSR read

**Files:**
- Create: `src/lib/theme/server.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `THEME_COOKIE`, `DEFAULT_THEME`, `isThemeKey`, `ThemeKey` (Task 16).
- Produces: `resolveTheme(): Promise<ThemeKey>`; `data-theme` on `<html>`, resolved server-side.

- [ ] **Step 1: Write the server-side resolver**

Two server components need the resolved theme — the root layout, which writes `data-theme`, and the shell, which threads it to the picker in Task 18. One function, so they can never disagree.

Create `src/lib/theme/server.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_THEME, isThemeKey, THEME_COOKIE, type ThemeKey } from "./themes";

/**
 * The theme in force for this request. Reading a cookie opts the caller into
 * dynamic rendering; see the note in the Phase 5 PR body for why that costs
 * nothing here.
 */
export async function resolveTheme(): Promise<ThemeKey> {
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemeKey(stored) ? stored : DEFAULT_THEME;
}
```

- [ ] **Step 2: Read it in the root layout**

`cookies()` is async in this version of Next — read the guide in `node_modules/next/dist/docs/` before writing this. The root layout becomes `async`:

```tsx
import { resolveTheme } from "../lib/theme/server";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await resolveTheme();

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" data-theme={theme} className={/* … */}>
```

`data-theme="amonkhet"` matches no block and falls through to `:root`, which is the intended default. Writing the attribute unconditionally is deliberate: the picker sets the attribute on selection, and an attribute that is sometimes absent would mean two ways to say the same thing.

- [ ] **Step 3: Note the rendering consequence in the PR body**

Reading a cookie in the root layout opts every route into dynamic rendering. Measured on `main` at 2026-09-02, the cost here is zero: `pnpm build` already marks every route `ƒ (Dynamic)`, because Clerk's middleware runs on all of them. Say so in the PR description anyway — a reviewer who knows the general rule will look for the regression, and the answer should not require them to run a build.

- [ ] **Step 4: Verify**

Run `pnpm dev`. In devtools, set `document.cookie = "the99_theme=kaldheim; path=/"`, hard-reload, and confirm the page paints Rune Frost with **no flash of Gilded Stone**. Then set a junk value and confirm it degrades to Gilded Stone.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/lib/theme/server.ts
git commit -m "feat(themes): the theme is decided before the first paint"
```

### Task 18: The picker

**Files:**
- Create: `src/components/shell/theme-picker.tsx`
- Create: `src/components/shell/theme-picker.test.tsx`
- Modify: `src/components/shell/shell.tsx`
- Modify: `src/components/shell/nav.tsx`
- Modify: `src/components/shell/account-menu.tsx`
- Modify: `src/components/shell/account-menu.test.tsx`

**Interfaces:**
- Consumes: `THEMES`, `THEME_COOKIE`, `THEME_COOKIE_MAX_AGE`, `ThemeKey` (Task 16); `themeCopy` (Task 16); `resolveTheme` (Task 17).
- Produces: `ThemePicker({ current: ThemeKey }): JSX.Element`.

Design constraints from `design/design_handoff_the99_themes/` §G and READINESS: the picker's mobile sheet is drawn at 390px with a **44px minimum touch target** per row, and the **selected state is a ring and a tick — never colour alone**, because a theme picker that signals selection with the theme's own colour is unreadable to anyone who cannot see it.

- [ ] **Step 1: Write the failing test**

Create `src/components/shell/theme-picker.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemePicker } from "./theme-picker";

describe("ThemePicker", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "amonkhet";
    document.cookie = "the99_theme=; path=/; max-age=0";
  });

  it("is a labelled radiogroup with six options", () => {
    render(<ThemePicker current="amonkhet" />);
    expect(screen.getByRole("radiogroup", { name: "Colour theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("names each option by theme and plane", () => {
    render(<ThemePicker current="amonkhet" />);
    expect(screen.getByRole("radio", { name: "Rune Frost — Kaldheim" })).toBeInTheDocument();
  });

  it("marks the current theme checked, and only that one", () => {
    render(<ThemePicker current="duskmourn" />);
    const checked = screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName("Screen Glow — Duskmourn");
  });

  it("does not carry selection by colour alone — the checked row draws a tick", () => {
    render(<ThemePicker current="duskmourn" />);
    const checked = screen.getByRole("radio", { name: "Screen Glow — Duskmourn" });
    expect(checked.querySelector("[data-selected-tick]")).not.toBeNull();
    const other = screen.getByRole("radio", { name: "Moonlit — Innistrad" });
    expect(other.querySelector("[data-selected-tick]")).toBeNull();
  });

  it("swaps the document attribute immediately on selection", async () => {
    render(<ThemePicker current="amonkhet" />);
    await userEvent.click(screen.getByRole("radio", { name: "Rune Frost — Kaldheim" }));
    expect(document.documentElement.dataset.theme).toBe("kaldheim");
  });

  it("persists the selection to the cookie", async () => {
    render(<ThemePicker current="amonkhet" />);
    await userEvent.click(screen.getByRole("radio", { name: "Neon Rain — Kamigawa: Neon Dynasty" }));
    expect(document.cookie).toContain("the99_theme=kamigawa");
  });

  it("announces the change, because there is no Save button to confirm it", async () => {
    render(<ThemePicker current="amonkhet" />);
    await userEvent.click(screen.getByRole("radio", { name: "Moonlit — Innistrad" }));
    expect(screen.getByRole("status")).toHaveTextContent("Moonlit applied.");
  });

  it("moves focus between options with the arrow keys, wrapping", async () => {
    render(<ThemePicker current="amonkhet" />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(radios[5]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(radios[0]).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/shell/theme-picker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the picker**

Create `src/components/shell/theme-picker.tsx`:

```tsx
"use client";

// The theme picker, hosted in the account menu. Six rows, roving focus, no
// Save — the swap is instant and the live region is the receipt.
//
// Selection is a ring and a tick, never the theme's own colour: a picker that
// says "this one is selected" in a colour is unreadable to exactly the people
// most likely to be choosing a theme deliberately.

import { useState } from "react";
import { themeCopy } from "../../lib/copy/theme";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEMES,
  type ThemeKey,
} from "../../lib/theme/themes";

export function ThemePicker({ current }: { current: ThemeKey }) {
  const [selected, setSelected] = useState<ThemeKey>(current);
  const [announcement, setAnnouncement] = useState("");

  function choose(key: ThemeKey, name: string) {
    setSelected(key);
    document.documentElement.dataset.theme = key;
    document.cookie = `${THEME_COOKIE}=${key}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
    setAnnouncement(themeCopy.applied(name));
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + THEMES.length) % THEMES.length;
    const rows = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
    rows?.[next]?.focus();
  }

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint px-[14px] pt-[10px] pb-[6px] m-0">
        {themeCopy.label}
      </p>
      <div role="radiogroup" aria-label={themeCopy.groupLabel}>
        {THEMES.map(({ key, name, plane }, i) => {
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={themeCopy.optionLabel(name, plane)}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => choose(key, name)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="flex w-full min-h-[44px] items-center gap-[10px] px-[14px] text-left hover:bg-elevated-hover"
            >
              <span
                aria-hidden
                className={[
                  "block h-[10px] w-[10px] shrink-0 rotate-45",
                  isSelected
                    ? "bg-accent ring-1 ring-fg ring-offset-2 ring-offset-surface"
                    : "bg-border-dashed",
                ].join(" ")}
              />
              <span className="flex-1">
                <span className="block text-[13px] text-fg">{name}</span>
                <span className="block font-mono text-[11px] text-fg-faint">{plane}</span>
              </span>
              {isSelected && (
                <svg
                  data-selected-tick
                  aria-hidden
                  viewBox="0 0 14 14"
                  width="14"
                  height="14"
                  className="shrink-0"
                >
                  <path
                    d="M2 7.5 L5.5 11 L12 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-fg"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/components/shell/theme-picker.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Thread the current theme down from the server**

The picker's `selected` state is seeded once, by `useState`, so `current` has to be correct on the **first** render. Reading `document.documentElement.dataset.theme` inside an effect would arrive a render too late and leave Gilded Stone ticked under every other theme; reading it during render breaks SSR. So the value comes from the server, down the same path the shell already uses for `locked`.

`src/components/shell/shell.tsx` is a server component. Add the resolver alongside the auth call:

```tsx
import { resolveTheme } from "../../lib/theme/server";
// …
const [stats, theme] = await Promise.all([getCollectionStats(userId), resolveTheme()]);
const locked = stats.uniqueCards === 0;
```

and pass `theme` to the two components that host an account menu:

```tsx
<NavRail locked={locked} theme={theme} />
<MobileHeader theme={theme} />
```

`TabBar` does not host one — the mobile menu lives in `MobileHeader` — so it keeps its current props. In `src/components/shell/nav.tsx`, widen both signatures with `theme: ThemeKey` and forward it: `<AccountMenu panel="popover" theme={theme} />` and `<AccountMenu panel="sheet" theme={theme} />`. `nav.tsx` is a client component, so import the type from `../../lib/theme/themes` — never from `server.ts`, which carries `import "server-only"`.

- [ ] **Step 6: Mount it in the account menu**

In `src/components/shell/account-menu.tsx`, widen the signature to `AccountMenu({ panel, theme }: { panel: PanelKind; theme: ThemeKey })` and render `<ThemePicker current={theme} />` above the two existing menu items, separated by the menu's existing divider treatment, in **both** panel kinds (`popover` and `sheet`).

The picker's rows are `role="radio"`, not `role="menuitem"`, so they sit outside the existing roving-focus pair and must not be added to its `refs` array. The existing `move()` helper hardcodes a modulus of 2; leave it alone.

`account-menu.test.tsx` renders `<AccountMenu …/>` in 24 places and will stop typechecking. Add `theme="amonkhet"` to every one of them — the existing assertions are about the trigger, the panel, and the two items, none of which the picker touches.

- [ ] **Step 7: Run everything**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`

- [ ] **Step 8: Use it**

Run `pnpm dev`. Open the account menu at 390px and at desktop. Select each of the six in turn and confirm: the swap is instant, every row is at least 44px tall on mobile, the selection survives a hard reload with no flash, and a keyboard user can reach and change the theme without a mouse. Compare against §G of the design HTML, which draws the sheet at 390px.

- [ ] **Step 9: Commit and open the phase PR**

```bash
git add src/components/shell src/lib
git commit -m "feat(themes): six themes, one menu, no Save button"
```

Run the design-review skill against the picker at both widths, then open the Phase 5 PR and run the Copilot review cycle to the merge bar.

---

## Follow-ups, not tasks

Recorded so they are decisions rather than omissions. None blocks this plan.

- **`--fg-locked` lands at 3.02–3.05:1 in all six.** Legal, zero headroom. Any future darkening of a `--surface` breaks all six at once.
- **The contract carries 30 WUBRG keys to express one decision** — only Oil and Iron's green moves. Correct as specced, but somebody should know that before defending it in review.
- **Rune Frost wants one look on Windows** as well as macOS. Synthetic-bold behaviour and hinting differ enough that the 15px row is worth checking on both before the theme system is called done.
- **Clerk's own modal does not follow the theme.** `clerk-appearance.ts` splits into an
  `elements` map, which already resolves through `var()` and therefore themes for free, and a
  `variables` map, which cannot: Clerk derives hover and disabled shades from those values, so
  it needs real colours and rejects custom properties. After this plan the `<UserProfile/>`
  modal stays Gilded Stone under all six themes. Fixing it means reading the resolved token
  values on the client and rebuilding the appearance object per theme — a client-side
  `getComputedStyle` pass, which is a different shape of change from anything here. Left as a
  visible seam rather than solved badly. Phase 1's `--brass*` rename and Phase 4's
  `--font-cinzel` reference in `headerTitle` both still have to reach this file.
- **`src/components/character/` stays in git.** It is dead code by design, so a per-theme creature can return without re-plumbing ten surfaces. If it is still dead in six months, that is the point at which deleting it costs nothing.
