# UI Button Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `PrimaryButton` and `GhostButton` primitives that own the brass/ghost visual contract, and migrate every CTA site onto them — eliminating the inline-`style` class of bug that silently kills hover states.

**Architecture:** One new file, `src/components/ui/button.tsx`, exporting two components. Each owns background, text colour, border, font-weight, border-radius and hover — always via Tailwind classes, never inline `style`. Padding and font-size stay per-surface and arrive through `className`, because the design tables specify them differently for nearly every surface. Migration proceeds surface-by-surface so each task is independently reviewable.

**On the site count:** roughly 30 CTAs migrate and roughly 13 are deliberately excluded, but treat those as estimates, not requirements. Two independent hand-audits of this codebase disagreed with each other, and each found real sites the other missed. Task 2 therefore generates the authoritative list mechanically before any migration begins; Tasks 3–6 migrate against *that* list, not against any number quoted here.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Vitest.

## Global Constraints

- **Never deliver background, border, or text colour via inline `style`.** Inline styles outrank Tailwind `hover:` utilities, which is the root cause this plan exists to fix. Colour goes in `className` or nowhere.
- **Use CSS variables, never raw hex.** `var(--brass)`, `var(--brass-hover)`, `var(--bg)`, `var(--fg)`, `var(--border-strong)`. Several current sites hardcode `#C9A24B` / `#3A3229` / `#EDE6D8`; those become variables on migration.
- **Preserve every spec'd pixel exactly.** Padding and font-size values must not change during migration. If a site's current padding disagrees with its design table, keep the current value and record the discrepancy in the task report — do not silently "fix" it. One known disagreement is listed in Task 4.
- **Several sites set padding via inline `style`, which makes an existing `className` padding dead.** When migrating those, the inline value is the one currently rendering and therefore the one to preserve. Where a dead `className` padding disagrees with the live inline value, keep the inline value and flag the discrepancy — do not assume the dead class was the intent.
- Primary contract (appshell.md §404: Primary CTA): background `var(--brass)`, colour `var(--bg)`, font-weight `600`, border-radius `8px`; hover background `var(--brass-hover)`.
- Ghost contract (appshell.md §404: Secondary CTA): background transparent, colour `var(--fg)`, border `1px solid var(--border-strong)`, font-weight `600`, border-radius `8px`; hover border-colour `var(--brass)`, colour `var(--brass-hover)`.
- `src/app/not-found.tsx` is the reference implementation — it already expresses both contracts correctly in classes.
- Pre-push gate every push: `pnpm typecheck && pnpm lint && pnpm test` plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- Stage files by name; never `git add -A`.

---

## File Structure

- **Create:** `src/components/ui/button.tsx` — `PrimaryButton`, `GhostButton`
- **Create:** `src/components/ui/button.test.tsx` — contract tests
- **Create:** `docs/superpowers/plans/2026-07-25-ui-button-inventory.md` — the generated site list (Task 2)
- **Modify:** `vitest.config.ts`, `package.json`, `eslint.config.mjs` — test and lint infrastructure
- **Modify:** ~18 component files across `src/app/`, `src/components/home/`, `src/components/collection/`, `src/components/decks/`, `src/components/commanders/`
- **Modify:** `docs/superpowers/design-tables/appshell.md` — add a shared-primitive section

---

### Task 0: Component-test infrastructure

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json` (dev dependencies)
- Test: `src/components/ui/smoke.test.tsx` (temporary — deleted in Task 1)

**Why this task exists:** `vitest.config.ts` currently sets `include: ["src/**/*.test.ts"]` — no `.tsx` — and `environment: "node"`. There is no `@testing-library/react` and no `jsdom`; every existing test is a pure-function test under `src/lib/`. A `.tsx` test file is therefore invisible to the runner, and because `pnpm test` passes `--passWithNoTests`, the suite would go green having executed nothing. Task 1's tests cannot run until this is fixed, and without this task we would ship an untested primitive believing it was tested.

**Interfaces:**
- Consumes: nothing
- Produces: a Vitest setup that executes `.tsx` tests in a DOM environment.

- [ ] **Step 1: Install the dependencies**

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Widen the Vitest include and switch to a DOM environment**

`src/lib/**` tests are pure-function and run fine under jsdom, so a single environment keeps the config simple.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
```

- [ ] **Step 3: Prove the runner actually picks up a .tsx file**

This step is the whole point of the task — it must fail before it passes, or we have not proven anything. Create `src/components/ui/smoke.test.tsx` with a deliberately wrong assertion:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

it("executes tsx tests in a DOM environment", () => {
  render(<button>hello</button>);
  expect(screen.getByRole("button").textContent).toBe("WRONG");
});
```

Run: `pnpm test`
Expected: **FAIL** with `expected 'hello' to be 'WRONG'`. A "no test files found" or a pass means the config change did not take effect — stop and fix it before continuing.

- [ ] **Step 4: Correct the assertion and confirm the whole suite still passes**

Change `"WRONG"` to `"hello"`.

Run: `pnpm test`
Expected: PASS, and the pre-existing `src/lib/**` tests still pass under jsdom (272 tests at time of writing). If any `src/lib` test breaks under jsdom, report it rather than working around it.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/components/ui/smoke.test.tsx
git commit -m "test: run tsx component tests in a jsdom environment"
```

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

- [ ] **Step 0: Add the class-merge dependency and drop the smoke test**

```bash
pnpm add tailwind-merge
rm src/components/ui/smoke.test.tsx
```

`tailwind-merge` is a runtime dependency, not a dev dependency — it executes on every render.

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

  it("lets a caller class override a base utility", () => {
    render(<PrimaryButton className="rounded-none">Go</PrimaryButton>);
    const cls = screen.getByRole("button", { name: "Go" }).className;
    expect(cls).toContain("rounded-none");
    expect(cls).not.toContain("rounded-lg");
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

import { twMerge } from "tailwind-merge";

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
  // twMerge, not string concatenation: Tailwind resolves conflicting utilities
  // by generated-stylesheet order, not class-string order, so a caller's
  // `rounded-[7px]` would not reliably beat BASE's `rounded-lg`.
  const classes = twMerge(BASE, variant, className);
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

### Task 2: Add the ESLint rule and derive the authoritative offender list

**Files:**
- Modify: `eslint.config.mjs`
- Create: `docs/superpowers/plans/2026-07-25-ui-button-inventory.md` (generated offender list)

**Why this task comes before the migrations:** two independent hand-audits of this codebase produced two different inventories. Each found real sites the other missed. A hand-audited list is not a trustworthy basis for a 30-site refactor, so this task replaces it with a mechanically generated one. The lint rule is both the discovery mechanism and the permanent regression guard.

A source-grepping Vitest test was considered and rejected: a regex over `style={{...}}` breaks on any nested `}` (e.g. `detail.tsx` has a `${...}` template literal inside a style object, which would hide a real offender), and a hardcoded palette list silently misses hex values nobody remembered to add. An ESLint rule works on the JSX AST instead, already runs in the pre-push gate, and gives future authors a legible escape hatch via `eslint-disable-next-line` with a stated reason — where a grep test would simply get deleted.

**Interfaces:**
- Consumes: nothing
- Produces: `docs/superpowers/plans/2026-07-25-ui-button-inventory.md` — the definitive site list that Tasks 3–6 migrate against.

- [ ] **Step 1: Add the rule**

```js
{
  files: ["src/**/*.tsx"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "JSXAttribute[name.name='style'] Property[key.name=/^(background|backgroundColor|border|borderColor|color)$/]",
        message:
          "Deliver colour and border through Tailwind classes, not inline style — an inline style outranks hover: utilities and silently kills the hover state. Use PrimaryButton/GhostButton from src/components/ui/button.tsx, or disable this rule with a reason if the value is genuinely dynamic.",
      },
    ],
  },
}
```

- [ ] **Step 2: Generate the offender list**

Run: `pnpm lint 2>&1 | tee /tmp/offenders.txt`

Expected: a large number of errors. This is the point — do not fix them yet.

- [ ] **Step 3: Classify every violation into the inventory document**

For each violation, record a row: `file:line`, the element's visible label, and one of four classifications.

| Classification | Meaning | Action |
|---|---|---|
| `PRIMARY` | Brass-filled CTA | Migrate to `PrimaryButton` |
| `GHOST` | Bordered/transparent CTA | Migrate to `GhostButton` |
| `EXEMPT-DYNAMIC` | Value is computed at runtime (progress width, synergy meter, animation delay) | `eslint-disable-next-line` with a reason |
| `EXEMPT-PATTERN` | Interactive, but belongs to a different shared pattern: a two-state toggle pill, a selectable card row, or a plain text action whose text is brass rather than `var(--fg)` | `eslint-disable-next-line` with a reason |

**Uniqueness, not deviation, is the scope line.** An earlier draft of this plan
drew it at "overrides 3 or more of the properties a primitive owns" and called
the bucket `EXEMPT-BESPOKE`. That test has been dropped, because it measures
deviation from `PrimaryButton` rather than uniqueness: it flags a two-state
toggle as bespoke even though every toggle in the app is identical to every
other one. Such a site is not exempt — it is evidence of a *second* primitive
waiting to be extracted, and should be recorded as `EXEMPT-PATTERN` so the
pattern stays visible.

`docs/superpowers/plans/2026-07-25-ui-button-inventory.md` is authoritative for
the classification of individual sites; this plan defers to it wherever the two
disagree. Known `EXEMPT-PATTERN` sites, all verified: the destructive
Import/Replace button (`confirm-modal.tsx:188` — dark-red fill, danger border,
`--fg` text); the disabled Export (`builder-spine.tsx:191` — muted colour,
muted border, `not-allowed` cursor); the mobile Export
(`builder-spine.tsx:209` — mono font, brass text, 7px radius, no fill); the two
toggle-pill groups (`group-toggle.tsx`, `export-dialog.tsx:249`); the tab
underline (`add-panel.tsx:78`); and the text-only Retry links in both
`degraded-banner.tsx` files.

**Also sweep for correctly-implemented CTAs the rule cannot see.** Sites that already use classes throughout are invisible to this lint rule but should still adopt the primitive for consistency. Grep for `bg-[color:var(--brass)]` and `[border:1px_solid_var(--border-strong)]` and add those rows too — `src/app/not-found.tsx`, `src/app/decks/page.tsx`, `src/app/commanders/page.tsx:39` and `src/components/collection/upload-entry.tsx:164` are known members of this set.

- [ ] **Step 4: Commit the rule as a warning, not an error, until migration completes**

Set the severity to `"warn"` for now so the pre-push gate stays green through Tasks 3–6. Task 7 flips it to `"error"`.

```bash
git add eslint.config.mjs docs/superpowers/plans/2026-07-25-ui-button-inventory.md
git commit -m "chore(lint): flag inline colour styles and inventory every CTA site"
```

- [ ] **Step 5: Report the counts**

Report how many sites fall into each of the four classifications, and explicitly name any site found here that neither prior audit caught. Tasks 3–6 below are grouped by surface; if the inventory reveals sites in a surface those tasks do not list, add them to the matching task and say so.

---

### Task 3: Migrate the app-shell and home surfaces

**Files:**
- Modify: `src/app/page.tsx:52` (Sign in — primary; already correct, `py-[14px] px-0 md:px-[40px]`, full-width to 260px on mobile). Note the coupling: this is a child of Clerk's `<SignInButton mode="modal">`, which `cloneElement`s an injected `onClick`. The primitive forwards unknown props, so this keeps working — but verify the sign-in modal still opens after migrating.
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

### Task 4: Migrate the collection surface

**Files:**
- Modify: `src/components/collection/upload-entry.tsx:164-171` (Browse files — primary), `:214-220` (Back — ghost), `:222-230` (Preview list — primary)
- Modify: `src/components/collection/review-screen.tsx:224-235` (View issues — ghost), `:272-278` (Cancel — ghost), `:280-287` (Continue — primary)
- Modify: `src/components/collection/no-results.tsx:108-115` (Clear all filters — primary), `:117-124` (Keep only search — ghost)
- Modify: `src/components/collection/confirm-modal.tsx:164-186` (Go back — ghost)

**Interfaces:**
- Consumes: `PrimaryButton`, `GhostButton` (Task 1)
- Produces: nothing

**Known design-table discrepancy — do not "fix":** `upload-entry.tsx:164` Browse files currently renders `11px 20px` on mobile and `11px 22px` on desktop (`md:px-[22px]`); `appshell.md:611` specifies `10px 18px`. Preserve the current values exactly and note the discrepancy in your report. Changing it is a design decision outside this refactor.

**`confirm-modal.tsx:164-186` needs a text-colour override:** it is `var(--fg-faint)` on mobile and `var(--fg)` on desktop, which collides with `GhostButton`'s own `text-[color:var(--fg)]`. `twMerge` resolves this correctly, but pass both explicitly (`text-[color:var(--fg-faint)] md:text-[color:var(--fg)]`) rather than relying on the primitive's default for the desktop half.

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

### Task 5: Migrate the decks surface

**Files:**
- Modify: `src/components/decks/new-deck-button.tsx:10-26` (New Deck — primary)
- Modify: `src/components/decks/create-pre-filled.tsx:302-315` (Create deck — primary), `:318-337` (Change commander — ghost)
- Modify: `src/components/decks/create-picker.tsx:310-324` (Create deck — primary)
- Modify: `src/components/decks/builder-spine.tsx:191-203` (Export disabled — ghost), `:208-235` (Export mobile — ghost), `:238-249` (Export desktop — primary)
- Modify: `src/components/decks/export-copy-button.tsx:67-78` (Copy to clipboard — primary)
- Modify: `src/components/decks/export-dialog.tsx:488-508` (Download .txt — ghost)
- Modify: `src/components/decks/create-picker.tsx:405` (Name & create / Create deck, mobile footer — primary; a second site in this file beyond the one listed above)
- Modify: `src/components/decks/builder-shell.tsx:161` (Add your first card — primary), `:197` (+ Add cards, sticky footer — primary)

**Interfaces:**
- Consumes: `PrimaryButton`, `GhostButton` (Task 1)
- Produces: nothing

**Out of scope:**
- `export-dialog.tsx:249-264` and `:266-285` are tab pills with an active/inactive toggle, not CTAs. Leave them and note it.
- `builder-spine.tsx:208-235` (mobile Export) is **not** a ghost button despite appearances: it is `font-mono text-[11px] rounded-[7px]` with brass text, a combination no other button in the app shares. It is exempt because it is one of a kind, not merely because it deviates. Leave it hand-rolled and note it. Task 4 therefore migrates two of the three `builder-spine` buttons, not all three.

**Three traps here:**
1. `new-deck-button.tsx` splits padding across two elements — `11px 0` on the `<Link>` plus `0 20px` on an inner desktop `<span>`. Collapse this into responsive `className` padding on the primitive (`py-[11px] w-full text-center md:w-auto md:px-[20px]`) and drop the inner span's style. It also uses `hover:opacity-90` rather than the spec'd `var(--brass-hover)`; the primitive supplies the correct hover, so remove `hover:opacity-90`.
2. `builder-spine.tsx:191-203` is the **disabled** Export state, and it overrides three things the primitive supplies: `color: "#8E8269"`, `border: "1px solid #2A241D"`, and `cursor: "not-allowed"` against `BASE`'s `cursor-pointer`. Preserve all three via `className` as `disabled:` variants — `disabled:[border-color:#2A241D] disabled:text-[#8E8269] disabled:cursor-not-allowed` — and keep the `disabled` attribute on the element.
3. `export-dialog.tsx:488-508` sets padding through a JavaScript conditional (`isMobile ? "12px 16px" : "11px 18px"`) rather than a responsive class. Converting it to `className` responsive padding is correct and is the point of the migration, but it moves the breakpoint decision from a JS media hook to CSS — so the rendered output before hydration changes. Call this out explicitly in your report so the reviewer expects it.

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

### Task 6: Migrate commanders

**Files:**
- Modify: `src/components/commanders/filtered-empty.tsx:131-150` (Clear color filter — ghost, `11px 20px` mobile / `10px 20px` desktop, 13px)
- Modify: `src/app/commanders/page.tsx:39` (Upload collection — primary, already class-correct), `:144` (Add more cards — primary, inline brass), `:158` (View collection — ghost, inline)
- Modify: `src/components/commanders/detail.tsx:739` (Build this deck, mobile sticky — primary), `:920` (Build this deck, desktop — primary), `:939` (Compare with another general — ghost)

All three `detail.tsx` sites set padding via inline `style` and hardcode `#C9A24B` / `#14110E` / `#3A3229` / `#EDE6D8`. Convert the hex values to their CSS variables and move padding into `className`. None of the three has any hover state today — the primitive supplies the spec'd one, which is a visible improvement, so call it out in your report rather than letting the reviewer wonder whether it was intended.

**Interfaces:**
- Consumes: `PrimaryButton`, `GhostButton` (Task 1)
- Produces: nothing

`filtered-empty.tsx` is the worst site in the codebase: it hardcodes `#EDE6D8` and `#3A3229`, has no hover state at all, and its `sm:p-[10px_20px]` class is dead because inline `padding` overrides it. Migrating it fixes all three. Preserve `marginTop: 20` as `mt-[20px]`.

**Decide the breakpoint deliberately:** the dead class uses `sm:` (640px), but every other file in this repo uses `md:` (768px). Reviving it verbatim would shift the padding change 128px earlier than any sibling surface. Use `md:` for consistency with the rest of the codebase, and state in your report that you changed `sm:` to `md:` and why — this is a real, if small, behaviour change and the reviewer must see it rather than discover it.

- [ ] **Step 1:** Migrate the site.

- [ ] **Step 2: Confirm the ESLint rule from Task 2 now reports zero CTA offenders**

Every remaining violation must be a documented non-CTA exemption. Report the final exemption list.

- [ ] **Step 3: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test` then `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/filtered-empty.tsx eslint.config.mjs
git commit -m "refactor(ui): migrate commanders CTA and lint against inline colour styles"
```

---

### Task 7: Document the primitives and enforce the rule

**Files:**
- Modify: `docs/superpowers/design-tables/appshell.md`

- [ ] **Step 1:** Add a `## Component: Shared CTA primitives` section recording: the primary and ghost contracts as property tables; that padding and font-size are per-surface and owned by the caller; the uniqueness test that decides what stays hand-rolled; and the inline-`style` prohibition with its cause (inline styles outrank `hover:` utilities). Cross-reference `src/components/ui/button.tsx`.

- [x] **Step 2: Flip the ESLint rule from `warn` to `error`** — done ahead of the rest of Task 7.

Done not by migrating every CTA to the primitives, but by moving colour and border out of inline `style` at each site. That clears what the rule exists to prevent — an inline style outranking a `hover:` utility — without changing radius, padding or font-weight, which a swap to `PrimaryButton` would. Three sites keep an inline `background` under a documented `eslint-disable`: the fill is a mana colour looked up per render, so no class can name it. Adopting the primitives at the remaining hand-rolled sites is still open.

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test` then `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/design-tables/appshell.md eslint.config.mjs
git commit -m "docs(design-table): record the shared CTA primitive contracts and enforce the lint rule"
```

---

## Notes for the executor

- The line numbers throughout were captured against `04511e8` and will drift as earlier tasks edit the same files. Re-locate by content, never by line number.
- Task 2's generated inventory outranks every site list in Tasks 3–6. Where they disagree, the generated list is right and the plan text is stale — migrate the site and note the discrepancy.
- Do not add a `size` or `variant` prop for padding. That was considered and rejected: desktop padding across real sites runs `9×16, 11×18, 11×20, 11×22, 12×20, 12×22, 12×24, 12×26, 13×22, 13×26, 14×40`, each spec'd per surface. Tiers would either change pixels or need ten values. `src/components/marks.tsx` documents the same reasoning for its own variants.
- The scope line is **uniqueness, not deviation**: a site stays hand-rolled only when it is genuinely one of a kind. A site that deviates heavily from `PrimaryButton` but is identical to a dozen siblings is not exempt — it is a second primitive waiting to be extracted, and is recorded as `EXEMPT-PATTERN`. See the classification section of `2026-07-25-ui-button-inventory.md`, which is authoritative.
