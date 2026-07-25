# UI Button Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `PrimaryButton` and `GhostButton` primitives that own the brass/ghost visual contract, and migrate all 28 CTA sites onto them — eliminating the inline-`style` class of bug that silently kills hover states.

**Architecture:** One new file, `src/components/ui/button.tsx`, exporting two components. Each owns background, text colour, border, font-weight, border-radius and hover — always via Tailwind classes, never inline `style`. Padding and font-size stay per-surface and arrive through `className`, because the design tables specify them differently for nearly every surface. Migration proceeds surface-by-surface so each task is independently reviewable.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Vitest.

## Global Constraints

- **Never deliver background, border, or text colour via inline `style`.** Inline styles outrank Tailwind `hover:` utilities, which is the root cause this plan exists to fix. Colour goes in `className` or nowhere.
- **Use CSS variables, never raw hex.** `var(--brass)`, `var(--brass-hover)`, `var(--bg)`, `var(--fg)`, `var(--border-strong)`. Several current sites hardcode `#C9A24B` / `#3A3229` / `#EDE6D8`; those become variables on migration.
- **Preserve every spec'd pixel exactly.** Padding and font-size values must not change during migration. If a site's current padding disagrees with its design table, keep the current value and record the discrepancy in the task report — do not silently "fix" it. The one known disagreement is listed in Task 3.
- Primary contract (appshell.md §404: Primary CTA): background `var(--brass)`, colour `var(--bg)`, font-weight `600`, border-radius `8px`; hover background `var(--brass-hover)`.
- Ghost contract (appshell.md §404: Secondary CTA): background transparent, colour `var(--fg)`, border `1px solid var(--border-strong)`, font-weight `600`, border-radius `8px`; hover border-colour `var(--brass)`, colour `var(--brass-hover)`.
- `src/app/not-found.tsx` is the reference implementation — it already expresses both contracts correctly in classes.
- Pre-push gate every push: `pnpm typecheck && pnpm lint && pnpm test` plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- Stage files by name; never `git add -A`.

---

## File Structure

- **Create:** `src/components/ui/button.tsx` — `PrimaryButton`, `GhostButton`
- **Create:** `src/components/ui/button.test.tsx` — contract tests
- **Modify:** 15 files across `src/app/`, `src/components/home/`, `src/components/collection/`, `src/components/decks/`, `src/components/commanders/`
- **Modify:** `docs/superpowers/design-tables/appshell.md` — add a shared-primitive section

---

### Task 1: The primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Test: `src/components/ui/button.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  type ButtonProps = {
    className?: string;
    children: React.ReactNode;
  } & (
    | ({ href: string } & React.ComponentPropsWithoutRef<typeof Link>)
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  );
  export function PrimaryButton(props: ButtonProps): React.JSX.Element;
  export function GhostButton(props: ButtonProps): React.JSX.Element;
  ```
  Both render a Next `<Link>` when `href` is present and a `<button>` otherwise, so `<Link>`-styled CTAs and real buttons share one primitive.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GhostButton, PrimaryButton } from "./button";

describe("PrimaryButton", () => {
  it("renders a button element when href is absent", () => {
    render(<PrimaryButton>Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" })).toBeTruthy();
  });

  it("renders a link when href is present", () => {
    render(<PrimaryButton href="/decks">Go</PrimaryButton>);
    expect(screen.getByRole("link", { name: "Go" }).getAttribute("href")).toBe("/decks");
  });

  it("carries the brass fill and hover in classes, not inline style", () => {
    render(<PrimaryButton>Go</PrimaryButton>);
    const el = screen.getByRole("button", { name: "Go" });
    expect(el.className).toContain("bg-[color:var(--brass)]");
    expect(el.className).toContain("hover:bg-[color:var(--brass-hover)]");
    expect(el.getAttribute("style")).toBeNull();
  });

  it("appends caller classes so per-surface padding wins", () => {
    render(<PrimaryButton className="px-[26px] py-[13px]">Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain("px-[26px] py-[13px]");
  });

  it("forwards button attributes", () => {
    render(<PrimaryButton disabled>Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveProperty("disabled", true);
  });
});

describe("GhostButton", () => {
  it("carries the border and hover in classes, not inline style", () => {
    render(<GhostButton>Go</GhostButton>);
    const el = screen.getByRole("button", { name: "Go" });
    expect(el.className).toContain("var(--border-strong)");
    expect(el.className).toContain("hover:[border-color:var(--brass)]");
    expect(el.className).toContain("hover:[color:var(--brass-hover)]");
    expect(el.getAttribute("style")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/button.test.tsx`
Expected: FAIL — cannot resolve `./button`.

- [ ] **Step 3: Write the implementation**

```tsx
import Link from "next/link";

// Shared CTA primitives per docs/superpowers/design-tables/appshell.md
// §404: Primary CTA and §404: Secondary CTA — the canonical statement of the
// brass and ghost contracts.
//
// These components own fill, text colour, border, font-weight, border-radius
// and hover ONLY. Padding and font-size are deliberately left to the caller:
// the design tables specify them differently for nearly every surface, so a
// primitive that fixed them would be overridden everywhere and hide drift
// rather than prevent it.
//
// Everything the primitive owns is expressed as a Tailwind class. An inline
// `style` background silently outranks `hover:` utilities — the bug this
// primitive exists to make unrepresentable.

const BASE = "font-sans font-semibold rounded-lg transition-colors cursor-pointer";

const PRIMARY =
  "bg-[color:var(--brass)] text-[color:var(--bg)] hover:bg-[color:var(--brass-hover)]";

const GHOST =
  "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] " +
  "hover:[border-color:var(--brass)] hover:[color:var(--brass-hover)]";

type SharedProps = {
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = SharedProps &
  (
    | ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "className">)
    | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">)
  );

function renderButton(variant: string, { className, children, ...rest }: ButtonProps) {
  const classes = className ? `${BASE} ${variant} ${className}` : `${BASE} ${variant}`;
  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }
  const { href: _omit, ...buttonProps } = rest;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return renderButton(PRIMARY, props);
}

export function GhostButton(props: ButtonProps) {
  return renderButton(GHOST, props);
}
```

Note: `<button>` needs an explicit `type`. Callers that omit it get the HTML default `submit`; preserve each call site's existing `type` during migration and add `type="button"` where the original had it.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/button.test.tsx`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/button.test.tsx
git commit -m "feat(ui): add PrimaryButton and GhostButton primitives"
```

---

### Task 2: Migrate the app-shell and home surfaces

**Files:**
- Modify: `src/app/page.tsx:52` (Sign in — primary, `14px 40px`, 15px)
- Modify: `src/app/not-found.tsx:28-39` (both CTAs — already correct, swap to primitives)
- Modify: `src/app/decks/page.tsx:65-75` (Browse commanders — primary, `13px 26px` mobile / `12px 26px` desktop, 14px)
- Modify: `src/components/home/dashboard.tsx:77-87` and `:253-262` (Update collection — ghost, `9px 16px`, 13px)

**Interfaces:**
- Consumes: `PrimaryButton`, `GhostButton` from `src/components/ui/button.tsx` (Task 1)
- Produces: nothing

- [ ] **Step 1:** For each site, replace the element with the matching primitive. Move padding and font-size into `className` as Tailwind arbitrary utilities. Delete any inline `style` that set background, border, colour, font-family, or font-weight — the primitive supplies all of them.

  `dashboard.tsx:77-87` sets font/weight via inline `style` while the border is already a class. Remove the whole `style` prop; the primitive covers it.

- [ ] **Step 2: Verify nothing changed visually except the now-live hovers**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. Then confirm by reading the diff that every padding and font-size value is byte-identical to the original.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/not-found.tsx src/app/decks/page.tsx src/components/home/dashboard.tsx
git commit -m "refactor(ui): migrate app-shell and home CTAs to button primitives"
```

---

### Task 3: Migrate the collection surface

**Files:**
- Modify: `src/components/collection/upload-entry.tsx:164-171` (Browse files — primary), `:214-220` (Back — ghost), `:222-230` (Preview list — primary)
- Modify: `src/components/collection/review-screen.tsx:224-235` (View issues — ghost), `:272-278` (Cancel — ghost), `:280-287` (Continue — primary)
- Modify: `src/components/collection/no-results.tsx:108-115` (Clear all filters — primary), `:117-124` (Keep only search — ghost)
- Modify: `src/components/collection/confirm-modal.tsx:164-186` (Go back — ghost)

**Interfaces:**
- Consumes: `PrimaryButton`, `GhostButton` (Task 1)
- Produces: nothing

**Known design-table discrepancy — do not "fix":** `upload-entry.tsx:164` Browse files currently renders `11px 20px`; `appshell.md:611` specifies `10px 18px`. Preserve the current `11px 20px` and note the discrepancy in your report. Changing it is a design decision outside this refactor.

**Out of scope:** `confirm-modal.tsx:188-208` (Replace N cards) is a destructive variant with an amber border and dark fill that neither primitive expresses. Leave it hand-rolled and note it.

- [ ] **Step 1:** Migrate each site as in Task 2. Several here hardcode `var(--brass)` or `var(--border-strong)` in inline `style`; those become the primitive's own classes. `confirm-modal.tsx:164-186` is text-only on mobile and bordered on desktop — preserve that responsive difference through `className`.

- [ ] **Step 2: Run the gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. Collection has the largest existing test suite — confirm no test asserted on an inline style attribute.

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/upload-entry.tsx src/components/collection/review-screen.tsx src/components/collection/no-results.tsx src/components/collection/confirm-modal.tsx
git commit -m "refactor(ui): migrate collection CTAs to button primitives"
```

---

### Task 4: Migrate the decks surface

**Files:**
- Modify: `src/components/decks/new-deck-button.tsx:10-26` (New Deck — primary)
- Modify: `src/components/decks/create-pre-filled.tsx:302-315` (Create deck — primary), `:318-337` (Change commander — ghost)
- Modify: `src/components/decks/create-picker.tsx:310-324` (Create deck — primary)
- Modify: `src/components/decks/builder-spine.tsx:191-203` (Export disabled — ghost), `:208-235` (Export mobile — ghost), `:238-249` (Export desktop — primary)
- Modify: `src/components/decks/export-copy-button.tsx:67-78` (Copy to clipboard — primary)
- Modify: `src/components/decks/export-dialog.tsx:488-508` (Download .txt — ghost)

**Interfaces:**
- Consumes: `PrimaryButton`, `GhostButton` (Task 1)
- Produces: nothing

**Out of scope:** `export-dialog.tsx:249-264` and `:266-285` are tab pills with an active/inactive toggle, not CTAs. Leave them and note it.

**Two traps here:**
1. `new-deck-button.tsx` splits padding across two elements — `11px 0` on the `<Link>` plus `0 20px` on an inner desktop `<span>`. Collapse this into responsive `className` padding on the primitive (`py-[11px] w-full text-center md:w-auto md:px-[20px]`) and drop the inner span's style. It also uses `hover:opacity-90` rather than the spec'd `var(--brass-hover)`; the primitive supplies the correct hover, so remove `hover:opacity-90`.
2. `builder-spine.tsx:191-203` is the **disabled** Export state. `GhostButton` renders the idle border; a disabled control needs its muted treatment preserved. Keep the existing disabled colours via `className` (e.g. `disabled:[border-color:#2A241D]`), and keep `disabled` on the element.

- [ ] **Step 1:** Migrate each site. Every primary here currently hardcodes `#C9A24B` in inline `style` — that becomes `var(--brass)` via the primitive.

- [ ] **Step 2: Run the gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/decks/new-deck-button.tsx src/components/decks/create-pre-filled.tsx src/components/decks/create-picker.tsx src/components/decks/builder-spine.tsx src/components/decks/export-copy-button.tsx src/components/decks/export-dialog.tsx
git commit -m "refactor(ui): migrate decks CTAs to button primitives"
```

---

### Task 5: Migrate commanders, then prove the class is gone

**Files:**
- Modify: `src/components/commanders/filtered-empty.tsx:131-150` (Clear color filter — ghost, `11px 20px` mobile / `10px 20px` desktop, 13px)
- Test: `src/components/ui/button.test.tsx`

**Interfaces:**
- Consumes: `PrimaryButton`, `GhostButton` (Task 1)
- Produces: nothing

`filtered-empty.tsx` is the worst site in the codebase: it hardcodes `#EDE6D8` and `#3A3229`, has no hover state at all, and its `sm:p-[10px_20px]` class is dead because inline `padding` overrides it. Migrating it fixes all three. Preserve `marginTop: 20` as `mt-[20px]`.

- [ ] **Step 1:** Migrate the site.

- [ ] **Step 2: Add the regression guard**

Append to `src/components/ui/button.test.tsx` a test that walks the CTA source files and asserts none of them sets a background or border through inline `style`:

```tsx
import { globSync, readFileSync } from "node:fs";

it("no CTA site delivers background or border via inline style", () => {
  const files = globSync("src/{app,components}/**/*.tsx");
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    // Only flag style objects that set background/border — layout styles are fine.
    for (const m of src.matchAll(/style=\{\{[^}]*\}\}/g)) {
      if (/\b(background|border)\s*:/.test(m[0]) && /var\(--brass|#C9A24B|#3A3229/.test(m[0])) {
        offenders.push(`${f}: ${m[0].slice(0, 60)}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});
```

If this test finds sites the plan's inventory missed, fix them if they are CTAs, or add a narrow documented exemption if they genuinely are not. Report either way.

- [ ] **Step 3: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test` then `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/commanders/filtered-empty.tsx src/components/ui/button.test.tsx
git commit -m "refactor(ui): migrate commanders CTA and guard against inline-style regressions"
```

---

### Task 6: Document the primitives in the design table

**Files:**
- Modify: `docs/superpowers/design-tables/appshell.md`

- [ ] **Step 1:** Add a `## Component: Shared CTA primitives` section recording: the primary and ghost contracts as property tables; that padding and font-size are per-surface and owned by the caller; and the inline-`style` prohibition with its cause (inline styles outrank `hover:` utilities). Cross-reference `src/components/ui/button.tsx`.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/design-tables/appshell.md
git commit -m "docs(design-table): record the shared CTA primitive contracts"
```

---

## Notes for the executor

- The inventory line numbers were captured against `04511e8`. Re-locate by content, not by line number, if they have drifted.
- Do not add a `size` or `variant` prop for padding. That was considered and rejected: desktop padding across real sites runs `9×16, 11×18, 11×20, 11×22, 12×20, 12×22, 12×24, 12×26, 13×22, 13×26, 14×40`, each spec'd per surface. Tiers would either change pixels or need ten values. `src/components/marks.tsx` documents the same reasoning for its own variants.
- 28 CTA sites were inventoried; 25 migrate. The 3 deliberate exclusions are the destructive Replace button and the two export tab pills.
