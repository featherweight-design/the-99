# Issue Inspector (#36) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the review page's inline "Show all N …" expanders with a modal (desktop) / full-screen sheet (mobile) that shows the full unmatched-names and parse-errors lists, without pushing the sticky confirm bar off-screen.

**Architecture:** New client component `<IssueInspector>` opens over `/collection/replace/review` from a single `View all N issues →` CTA. Reads directly from the already-loaded `UploadPreview` payload — no fetch, no route. Pure filter/highlight logic lives in `src/lib/collection/issue-filter.ts` (unit-tested per repo convention). Copy strings ported verbatim from Design's `Issue Inspector - copy strings.js` to `src/lib/copy/issue-inspector.ts`. Virtualization via `react-window` when a tab has > 150 rows.

**Tech Stack:** React 19 client components, Tailwind 4, brand tokens via CSS variables (`--brass`, `--warning`, `--danger`, `--success`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--surface`, `--surface-rail`, `--surface-sunken`, `--border`, `--border-strong`), existing `useDialogA11y` hook (`src/lib/a11y/dialog.ts`), `react-window` for virtualization, Vitest for unit tests.

## Global Constraints

- **Design handoff source of truth:** `design/design_handoff_the99_issue_inspector/` — `README.md` (decisions log + component tokens), `Issue Inspector - copy strings.js` (verbatim strings), `Issue Inspector - Claude Code brief.md` (eng brief), `The 99 - Issue Inspector.dc.html` (hi-fi states).
- **Copy is verbatim.** Every string comes from `Issue Inspector - copy strings.js`. No paraphrasing.
- **View-only.** No per-row actions in v1 (no re-match / edit / remove). No footer, no "Done" CTA — Esc / ✕ / backdrop-click are the only dismiss.
- **Non-blocking.** The review page's "Continue to replace" stays available underneath.
- **Data contract unchanged.** Reads `UploadPreview.unmatchedRows` and `UploadPreview.parseErrors` from `src/app/collection/actions.ts` — no schema change, no new fetch.
- **Tokens, not hex.** Colors/radii/spacing resolve to existing brand tokens (see the `Component notes` table in the handoff README). Raw hex only where the mock uses `rgba(...)` variants of a token color for tinted backgrounds.
- **Virtualization:** `react-window` above 150 rows; plain `overflow-y:auto` at or below 150. **Pinned to `react-window@^1.8.11`** (v2's API renamed `FixedSizeList → List`, `ListChildComponentProps → RowComponentProps`; v1 is still supported and matches this plan's code). Types: `@types/react-window@^1`. (Yellow item #1 — locked here.)
- **Match-highlight:** wrap **all** matched runs, not just the first. (Yellow item #3 — locked here.)
- **Parse-error `reason` copy:** render backend text as-is per the copy file note (`// reason comes straight from UploadPreview.parseErrors[].reason — render as-is, do not rephrase.`). Backend/mock delta captured in an addendum (Task 6), out of scope for v1. (Yellow item #2 — closed here.)
- **Filter debounce:** ~120ms on the input (per brief.md §2). Implemented with a `rawQuery`/`query` state pair + `setTimeout` in a `useEffect`.
- **A11y baseline:** focus trap while open, Escape closes, backdrop-click closes (desktop), **first focus = filter input** (via an `initialFocusRef` parameter added to `useDialogA11y` — no visible focus flash on the close button), `role=tablist`/`role=tab`/`aria-selected` + roving arrow-key focus between enabled tabs, `aria-disabled` on the zero-count tab, `role=tabpanel` + `aria-labelledby` on panels, focus restore to trigger on close (owned by `useDialogA11y`'s cleanup — no callsite `queueMicrotask` needed), backdrop uses `backdropFilter: blur(3px)` (per handoff Dialog spec), `prefers-reduced-motion` respected (no animations added). Filter-count `aria-live` fires only on the zero-match state (avoids per-keystroke SR noise).
- **Pre-push gate:** `pnpm typecheck && pnpm lint && pnpm test` plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main` (per AGENTS.md).
- **Stage files by name.** Never `git add -A`.

## File Structure

**Create:**
- `src/lib/copy/issue-inspector.ts` — Copy strings from Design's export, with template helpers for interpolation slots (`{n}`, `{total}`, `{file}`, `{query}`, `{line}`, `{setCode}`, `{skipped}`, `{quantity}`).
- `src/lib/collection/issue-filter.ts` — Pure functions: `filterUnmatched`, `filterParseErrors`, `findMatchRanges`, `escapeRegex`. No React, no DOM.
- `src/lib/collection/issue-filter.test.ts` — Vitest unit tests for the above.
- `src/components/collection/issue-inspector.tsx` — Modal shell: dialog, backdrop, header, subtitle + help-line (or hoisted zero-note), tabs, filter input, panels, empty-filter state. Owns filter state, active tab state.
- `src/components/collection/issue-inspector-list.tsx` — Renders the row list for the active tab; switches between plain `overflow-y:auto` and `react-window`'s `FixedSizeList` above 150 rows. Owns row rendering (`<UnmatchedRow>`, `<ParseErrorRow>`, `<HighlightedText>`).
- `src/components/collection/card-fan-mark.tsx` — Inline SVG card-fan mark for the empty-filter state (Design's mock uses CSS boxes; brand sheet says "rebuild as inline SVG in production").
- `design/design_handoff_the99_issue_inspector/ADDENDUM-parse-error-copy.md` — Notes the backend/mock reason-string delta so a follow-up backend copy pass can close it.

**Modify:**
- `src/components/collection/review-screen.tsx` — Remove `unmatchedExpanded`/`errorsExpanded` state and the two per-column `Show all N …` buttons; add a single `View all N issues →` CTA below both preview columns (desktop) / one button (mobile); mount `<IssueInspector>`; wire open/close + which-tab-to-open-on.
- `src/lib/a11y/dialog.ts` — Extend `useDialogA11y` signature with an optional `initialFocusRef?: RefObject<HTMLElement | null>` parameter. When provided, focuses that element on mount instead of the first visible focusable. Backward-compatible: existing callers (`CardModal`, `AddPanel` sheet, `ExportDialog`) are unaffected.

**Add dependency (Task 2):**
- `react-window@^1.8.11` (runtime) and `@types/react-window@^1` (dev). **Do not** install `react-window@latest` — v2 is a breaking API rewrite (`FixedSizeList` renamed to `List`).

---

### Task 1: Copy file + filter/highlight library (with tests)

**Files:**
- Create: `src/lib/copy/issue-inspector.ts`
- Create: `src/lib/collection/issue-filter.ts`
- Test: `src/lib/collection/issue-filter.test.ts`

**Interfaces:**
- Consumes: `UploadPreview.unmatchedRows` type and `UploadPreview.parseErrors` type from `src/app/collection/actions.ts` (`{ name, setCode, line, quantity }[]` and `{ line, reason }[]`).
- Produces (used by Tasks 3 and 4):
  - `issueInspectorCopy` object mirroring the design export, with `format` helpers per interpolation slot.
  - `filterUnmatched(rows, query): UnmatchedRow[]` — case-insensitive substring on `name`.
  - `filterParseErrors(rows, query): ParseErrorRow[]` — case-insensitive substring on `reason` OR the stringified `line` (typing `2210` matches L2210).
  - `findMatchRanges(text, query): [number, number][]` — sorted, non-overlapping `[start, end]` ranges over `text` for every case-insensitive occurrence of `query`. Empty query → `[]`.
  - `escapeRegex(input): string` — escapes regex metacharacters so the query is treated literally.

- [ ] **Step 1: Create the copy file**

Create `src/lib/copy/issue-inspector.ts`:

```ts
// Issue Inspector copy — ported verbatim from
// design/design_handoff_the99_issue_inspector/Issue Inspector - copy strings.js
// Voice: terse; mono for structured data; no reassurance fluff; no exclamation marks.

export const issueInspectorCopy = {
  header: {
    title: "Import issues",
    subtitle: (file: string, skipped: number, total: number) =>
      `${file} · ${skipped.toLocaleString()} of ${total.toLocaleString()} rows skipped`,
    help: "Skipped rows are left out of the import — every other row still replaces your collection.",
    closeAriaLabel: "Close",
  },
  tabs: {
    unmatched: "Unmatched",
    parseErrors: "Parse errors",
    ariaLabel: "Issue type",
  },
  filter: {
    placeholderUnmatched: (n: number) => `Filter ${n.toLocaleString()} unmatched names…`,
    placeholderErrors: (n: number) => `Filter ${n.toLocaleString()} errors by line or reason…`,
    clearAriaLabel: "Clear filter",
    count: (n: number, total: number) =>
      `Showing ${n.toLocaleString()} of ${total.toLocaleString()}`,
  },
  unmatchedRow: {
    metaLong: (line: number, setCode: string) =>
      setCode
        ? `line ${line} · set ${setCode} · no Oracle match`
        : `line ${line} · no Oracle match`,
    metaCompact: (line: number, setCode: string) =>
      setCode ? `L${line} · ${setCode} · no match` : `L${line} · no match`,
    quantity: (quantity: number) => `×${quantity}`,
  },
  parseErrorRow: {
    lineBadge: (line: number) => `L${line}`,
    // reason comes straight from UploadPreview.parseErrors[].reason — render as-is, do not rephrase.
  },
  emptyFilter: {
    title: (query: string) => `No names match “${query}”`,
    body: (total: number) =>
      `None of the ${total.toLocaleString()} unmatched names contain that text. Check the spelling, or clear the filter to see the full list.`,
    action: "Clear filter",
  },
  emptyFilterErrors: {
    body: (total: number) =>
      `None of the ${total.toLocaleString()} errors match that text. Check the spelling, or clear the filter to see the full list.`,
  },
  zeroState: {
    noParseErrors:
      "No parse errors — every row parsed cleanly. The Parse errors tab is disabled.",
    noUnmatched:
      "No unmatched names — every card matched the Oracle database. The Unmatched tab is disabled.",
  },
  entry: {
    cta: (total: number) => `View all ${total.toLocaleString()} issues →`,
  },
};
```

- [ ] **Step 2: Write the failing tests for the filter/highlight lib**

Create `src/lib/collection/issue-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  escapeRegex,
  filterParseErrors,
  filterUnmatched,
  findMatchRanges,
} from "./issue-filter";

describe("filterUnmatched", () => {
  const rows = [
    { name: "Sol Ring", setCode: "C21", line: 2, quantity: 1 },
    { name: "Lightning Bolt", setCode: "LEA", line: 3, quantity: 4 },
    { name: "sol land", setCode: "", line: 4, quantity: 1 },
  ];

  it("returns all rows for empty query", () => {
    expect(filterUnmatched(rows, "")).toHaveLength(3);
  });

  it("matches case-insensitively on name", () => {
    expect(filterUnmatched(rows, "SOL").map((r) => r.name)).toEqual([
      "Sol Ring",
      "sol land",
    ]);
  });

  it("does not match on setCode or line", () => {
    expect(filterUnmatched(rows, "C21")).toEqual([]);
    expect(filterUnmatched(rows, "3")).toEqual([]);
  });

  it("trims whitespace-only query to empty (returns all)", () => {
    expect(filterUnmatched(rows, "   ")).toHaveLength(3);
  });
});

describe("filterParseErrors", () => {
  const rows = [
    { line: 1902, reason: "missing card name" },
    { line: 2210, reason: `invalid quantity "two"` },
    { line: 2554, reason: `expected at least 2 columns, got 1` },
  ];

  it("matches case-insensitively on reason", () => {
    expect(filterParseErrors(rows, "QUANTITY").map((r) => r.line)).toEqual([2210]);
  });

  it("matches on stringified line number", () => {
    expect(filterParseErrors(rows, "2210").map((r) => r.line)).toEqual([2210]);
  });

  it("matches partial line number", () => {
    expect(filterParseErrors(rows, "22").map((r) => r.line)).toEqual([2210]);
  });

  it("returns all rows for empty query", () => {
    expect(filterParseErrors(rows, "")).toHaveLength(3);
  });
});

describe("findMatchRanges", () => {
  it("returns all case-insensitive runs, not just the first", () => {
    expect(findMatchRanges("Sol Ring sol ring", "sol")).toEqual([
      [0, 3],
      [9, 12],
    ]);
  });

  it("returns [] for empty query", () => {
    expect(findMatchRanges("Sol Ring", "")).toEqual([]);
  });

  it("returns [] for whitespace-only query", () => {
    expect(findMatchRanges("Sol Ring", "   ")).toEqual([]);
  });

  it("returns [] when text has no matches", () => {
    expect(findMatchRanges("Sol Ring", "bolt")).toEqual([]);
  });

  it("escapes regex metacharacters in the query", () => {
    expect(findMatchRanges(`quantity "two"`, `"two"`)).toEqual([[9, 14]]);
    expect(findMatchRanges("a.b.c", "a.b")).toEqual([[0, 3]]);
    // ".b" is a literal 2-char match at positions 1..3 and 3..5; overlaps
    // suppressed by advancing past each match.
    expect(findMatchRanges("a.b.c", ".b")).toEqual([[1, 3]]);
  });

  it("handles overlapping potential matches by advancing past each match", () => {
    expect(findMatchRanges("aaaa", "aa")).toEqual([
      [0, 2],
      [2, 4],
    ]);
  });
});

describe("escapeRegex", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegex(`.*+?^${"$"}{}()|[]\\`)).toBe(
      `\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\`,
    );
  });

  it("leaves plain text alone", () => {
    expect(escapeRegex("Sol Ring")).toBe("Sol Ring");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test src/lib/collection/issue-filter.test.ts`

Expected: FAIL — module not found (`Cannot find module './issue-filter'`).

- [ ] **Step 4: Implement the library**

Create `src/lib/collection/issue-filter.ts`:

```ts
// Pure client-side filter + highlight helpers for the Issue Inspector modal.
// No React, no DOM — kept testable under vitest's node environment.

export type UnmatchedRow = {
  name: string;
  setCode: string;
  line: number;
  quantity: number;
};

export type ParseErrorRow = { line: number; reason: string };

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterUnmatched(
  rows: readonly UnmatchedRow[],
  query: string,
): UnmatchedRow[] {
  const q = normalizedQuery(query);
  if (q === "") return [...rows];
  return rows.filter((r) => r.name.toLowerCase().includes(q));
}

export function filterParseErrors(
  rows: readonly ParseErrorRow[],
  query: string,
): ParseErrorRow[] {
  const q = normalizedQuery(query);
  if (q === "") return [...rows];
  return rows.filter(
    (r) =>
      r.reason.toLowerCase().includes(q) || String(r.line).includes(q),
  );
}

// Returns sorted, non-overlapping [start, end] ranges over `text` for every
// case-insensitive occurrence of `query`. Empty/whitespace query → [].
// Overlapping potential matches (e.g. "aa" in "aaaa") advance past each
// match so ranges never overlap.
export function findMatchRanges(
  text: string,
  query: string,
): [number, number][] {
  const q = query.trim();
  if (q === "") return [];
  const re = new RegExp(escapeRegex(q), "gi");
  const ranges: [number, number][] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    ranges.push([start, end]);
    if (match[0].length === 0) re.lastIndex++;
    else re.lastIndex = end;
  }
  return ranges;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/lib/collection/issue-filter.test.ts`

Expected: PASS — all tests green.

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/copy/issue-inspector.ts src/lib/collection/issue-filter.ts src/lib/collection/issue-filter.test.ts
git commit -m "feat(collection): issue inspector — copy strings + filter/highlight lib (#36)"
```

---

### Task 2: Add react-window dependency + card-fan mark SVG

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Modify: `pnpm-lock.yaml` (regenerated)
- Create: `src/components/collection/card-fan-mark.tsx`

**Interfaces:**
- Produces (used by Task 3): `<CardFanMark size?: number />` — inline SVG, uses `currentColor` for the fill so callers can theme it.
- Produces (used by Task 3): `react-window`'s `FixedSizeList` API from `react-window`.

- [ ] **Step 1: Install react-window (pinned to v1)**

Run: `pnpm add react-window@^1.8.11 && pnpm add -D @types/react-window@^1`

Expected: `react-window` appears in `dependencies` (satisfying `^1.8.11` — NOT v2.x) and `@types/react-window` in `devDependencies` (satisfying `^1`) of `package.json`; `pnpm-lock.yaml` updated.

Sanity check: `pnpm list react-window` should print a `1.x` version, not `2.x`. If v2 landed, downgrade explicitly.

- [ ] **Step 2: Verify install with typecheck**

Run: `pnpm typecheck`

Expected: no errors (nothing imports react-window yet — this just confirms types resolve).

- [ ] **Step 3: Create the card-fan mark component**

Create `src/components/collection/card-fan-mark.tsx`:

```tsx
// Card-fan brand mark for the Issue Inspector's empty-filter state.
// Three fanned card silhouettes. Uses currentColor so the parent controls tint.

export function CardFanMark({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      role="img"
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="14"
        width="16"
        height="24"
        rx="2"
        transform="rotate(-14 18 26)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="20"
        y="12"
        width="16"
        height="24"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="30"
        y="14"
        width="16"
        height="24"
        rx="2"
        transform="rotate(14 38 26)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/collection/card-fan-mark.tsx
git commit -m "chore(collection): add react-window + card-fan mark for issue inspector (#36)"
```

---

### Task 3: Row rendering + virtualization boundary

**Files:**
- Create: `src/components/collection/issue-inspector-list.tsx`

**Interfaces:**
- Consumes:
  - `UnmatchedRow`, `ParseErrorRow` from `src/lib/collection/issue-filter.ts`.
  - `issueInspectorCopy` from `src/lib/copy/issue-inspector.ts`.
  - `findMatchRanges` from `src/lib/collection/issue-filter.ts`.
  - `FixedSizeList` from `react-window`.
- Produces (used by Task 4):
  - `<IssueInspectorList variant="unmatched" rows={UnmatchedRow[]} query={string} />` — renders the filtered rows; virtualizes above 150 rows.
  - `<IssueInspectorList variant="errors" rows={ParseErrorRow[]} query={string} />` — same, for parse errors.

- [ ] **Step 1: Create the list component**

Create `src/components/collection/issue-inspector-list.tsx`:

```tsx
"use client";
// Row list for the Issue Inspector. Plain overflow at ≤150 rows; react-window
// FixedSizeList above (Design's target — locked in the plan PR). Row height
// includes the 6px flex gap so virtualized rows stay flush with the plain
// list's rhythm.

import { FixedSizeList, type ListChildComponentProps } from "react-window";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  findMatchRanges,
  type ParseErrorRow,
  type UnmatchedRow,
} from "../../lib/collection/issue-filter";

const ROW_HEIGHT = 46; // 40px row + 6px gap
const VIRTUALIZE_THRESHOLD = 150;
const LIST_HEIGHT = 420; // matches the fixed-height scroll body in the mock

type Props =
  | { variant: "unmatched"; rows: UnmatchedRow[]; query: string }
  | { variant: "errors"; rows: ParseErrorRow[]; query: string };

export function IssueInspectorList(props: Props) {
  if (props.rows.length > VIRTUALIZE_THRESHOLD) {
    return (
      <FixedSizeList
        height={LIST_HEIGHT}
        itemCount={props.rows.length}
        itemSize={ROW_HEIGHT}
        width="100%"
        overscanCount={8}
      >
        {({ index, style }: ListChildComponentProps) => (
          <div style={style}>
            {props.variant === "unmatched" ? (
              <UnmatchedRowView row={props.rows[index]} query={props.query} />
            ) : (
              <ParseErrorRowView row={props.rows[index]} query={props.query} />
            )}
          </div>
        )}
      </FixedSizeList>
    );
  }

  return (
    <ul
      className="flex flex-col gap-[6px] overflow-y-auto"
      style={{ maxHeight: LIST_HEIGHT }}
    >
      {props.variant === "unmatched"
        ? props.rows.map((r) => (
            <li key={`${r.line}-${r.name}`}>
              <UnmatchedRowView row={r} query={props.query} />
            </li>
          ))
        : props.rows.map((r) => (
            <li key={`${r.line}-${r.reason}`}>
              <ParseErrorRowView row={r} query={props.query} />
            </li>
          ))}
    </ul>
  );
}

function UnmatchedRowView({ row, query }: { row: UnmatchedRow; query: string }) {
  return (
    <div
      // §Unmatched row: bg #1E1A15 (--surface), 1px #2A241D (--border),
      // 3px left border --warning, radius 8px, ~40px tall.
      className="flex items-center justify-between gap-[12px] rounded-lg p-[9px_12px] md:p-[10px_14px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--warning)",
        minHeight: 40,
      }}
    >
      <span className="min-w-0">
        <span
          className="block truncate text-[13px] md:text-[14px]"
          style={{ color: "var(--fg)" }}
        >
          <HighlightedText text={row.name} query={query} />
        </span>
        <span
          className="font-mono text-[10px] md:text-[10.5px]"
          style={{ color: "var(--fg-faint)" }}
        >
          <span className="md:hidden">
            {issueInspectorCopy.unmatchedRow.metaCompact(row.line, row.setCode)}
          </span>
          <span className="hidden md:inline">
            {issueInspectorCopy.unmatchedRow.metaLong(row.line, row.setCode)}
          </span>
        </span>
      </span>
      <span
        className="font-mono text-[11px] md:text-[12px] flex-none"
        style={{ color: "var(--fg-faint)" }}
      >
        {issueInspectorCopy.unmatchedRow.quantity(row.quantity)}
      </span>
    </div>
  );
}

function ParseErrorRowView({ row, query }: { row: ParseErrorRow; query: string }) {
  return (
    <div
      // §Parse-error row: same shell, 3px left border --danger. Leading L####
      // in mono --danger, 46px fixed col; reason in --fg-body 1.45.
      className="flex items-start gap-[12px] rounded-lg p-[10px_12px] md:p-[11px_14px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--danger)",
        minHeight: 40,
      }}
    >
      <span
        className="font-mono text-[10.5px] md:text-[11px] flex-none pt-[1px]"
        style={{ color: "var(--danger)", width: 46 }}
      >
        <HighlightedText
          text={issueInspectorCopy.parseErrorRow.lineBadge(row.line)}
          query={query}
        />
      </span>
      <span
        className="text-[12.5px] md:text-[13px]"
        style={{ color: "var(--fg-body)", lineHeight: 1.45 }}
      >
        <HighlightedText text={row.reason} query={query} />
      </span>
    </div>
  );
}

// Wraps every match run in <mark> (all runs, not just the first — Yellow #3).
function HighlightedText({ text, query }: { text: string; query: string }) {
  const ranges = findMatchRanges(text, query);
  if (ranges.length === 0) return <>{text}</>;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end]) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      // §Match highlight: rgba(201,162,75,.28) bg, --fg color, radius 2px.
      // Key uses range positions (stable across re-renders as query changes) —
      // avoids React reusing stale <mark> nodes for a shifted match set.
      <mark
        key={`${start}-${end}`}
        style={{
          background: "rgba(201,162,75,0.28)",
          color: "var(--fg)",
          borderRadius: 2,
          padding: "0 1px",
        }}
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/issue-inspector-list.tsx
git commit -m "feat(collection): issue inspector — row list with virtualization boundary (#36)"
```

---

### Task 4: Modal shell — dialog, header, tabs, filter input, panels

**Files:**
- Modify: `src/lib/a11y/dialog.ts` — add optional `initialFocusRef` parameter.
- Create: `src/components/collection/issue-inspector.tsx`

**Interfaces:**
- Consumes:
  - `UploadPreview` from `src/app/collection/actions.ts`.
  - `useDialogA11y` from `src/lib/a11y/dialog.ts` (extended in Step 1).
  - `issueInspectorCopy` from `src/lib/copy/issue-inspector.ts`.
  - `filterUnmatched`, `filterParseErrors` from `src/lib/collection/issue-filter.ts`.
  - `<IssueInspectorList>` from `src/components/collection/issue-inspector-list.tsx`.
  - `<CardFanMark>` from `src/components/collection/card-fan-mark.tsx`.
- Produces (used by Task 5):
  - `<IssueInspector preview={UploadPreview} initialTab="unmatched" | "errors" onClose={() => void} />`.
- Extends (backward-compatible):
  - `useDialogA11y(dialogRef, onClose, options?: { initialFocusRef?: RefObject<HTMLElement | null> })` — when `initialFocusRef` is provided, focuses that element on mount instead of the first visible focusable.

- [ ] **Step 1: Extend `useDialogA11y` with an optional initial-focus ref**

Edit `src/lib/a11y/dialog.ts`. Replace the current signature and the initial-focus effect so callers can explicitly nominate the first-focused element. Existing callers (CardModal, AddPanel sheet, ExportDialog) pass no options and keep their current behavior.

Replace:

```ts
export function useDialogA11y(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus before the dialog opened; return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Auto-focus first visible focusable child on mount.
  useEffect(() => {
    if (!dialogRef.current) return;
    visibleFocusables(dialogRef.current)[0]?.focus();
  }, [dialogRef]);
```

With:

```ts
export function useDialogA11y(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: { initialFocusRef?: RefObject<HTMLElement | null> },
) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = options?.initialFocusRef;

  // Remember what had focus before the dialog opened; return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Focus initialFocusRef when provided (avoids a visible focus flash on the
  // first DOM-order focusable); otherwise fall back to the first visible child.
  useEffect(() => {
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }
    if (!dialogRef.current) return;
    visibleFocusables(dialogRef.current)[0]?.focus();
  }, [dialogRef, initialFocusRef]);
```

- [ ] **Step 2: Create the modal component**

Create `src/components/collection/issue-inspector.tsx`:

```tsx
"use client";
// Issue Inspector — full-list modal (desktop) / full-screen sheet (mobile) for
// the review page's unmatched-names and parse-errors lists. Opens against the
// already-loaded UploadPreview payload; no fetch, no route.
//
// A11y (READINESS #5 baseline + Yellow-item locks):
// - Focus trap via useDialogA11y; Esc closes; backdrop click closes (desktop).
// - First focus = filter input, via useDialogA11y's initialFocusRef option
//   (no focus flash on the close button).
// - role=tablist/role=tab/aria-selected + roving arrow-key focus between enabled tabs.
// - Disabled tab: aria-disabled + native disabled + tabindex=-1.
// - role=tabpanel + aria-labelledby on each panel.
// - Filter count span is visual-only; a sibling sr-only live region announces
//   only the zero-match state (no per-keystroke SR noise).
// - Filter debounced 120ms per brief.md §2; input value stays responsive.

import { useEffect, useRef, useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  filterParseErrors,
  filterUnmatched,
} from "../../lib/collection/issue-filter";
import { IssueInspectorList } from "./issue-inspector-list";
import { CardFanMark } from "./card-fan-mark";

type Tab = "unmatched" | "errors";

export function IssueInspector({
  preview,
  initialTab,
  onClose,
}: {
  preview: UploadPreview;
  initialTab: Tab;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  // Two-state debounce: rawQuery drives the input; query drives filtering/
  // counts/highlights. 120ms per brief.md §2 — small enough to feel live at
  // ≤200 rows, large enough to avoid re-render churn on rapid typing.
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 120);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Focus trap + Esc + focus-return + first-focus = filter input.
  useDialogA11y(dialogRef, onClose, { initialFocusRef: filterInputRef });

  // Filter resets on tab switch (per handoff decision #7).
  function switchTab(next: Tab) {
    setTab(next);
    setRawQuery("");
    setQuery("");
    // Re-focus filter after switch so keyboard flow continues there.
    queueMicrotask(() => filterInputRef.current?.focus());
  }

  const unmatchedTotal = preview.unmatchedRows.length;
  const errorsTotal = preview.parseErrors.length;
  const isUnmatchedDisabled = unmatchedTotal === 0;
  const isErrorsDisabled = errorsTotal === 0;
  const skipped = unmatchedTotal + errorsTotal;

  const filteredUnmatched = filterUnmatched(preview.unmatchedRows, query);
  const filteredErrors = filterParseErrors(preview.parseErrors, query);
  const activeTotal = tab === "unmatched" ? unmatchedTotal : errorsTotal;
  const activeShown =
    tab === "unmatched" ? filteredUnmatched.length : filteredErrors.length;
  const isFiltering = query.trim() !== "";
  const showEmptyFilter = isFiltering && activeShown === 0;

  // Count color: --fg-faint idle; --fg-body when filtering with hits;
  // --warning at 0 (per handoff Result count spec).
  const countColor =
    activeShown === 0 && isFiltering
      ? "var(--warning)"
      : isFiltering
        ? "var(--fg-body)"
        : "var(--fg-faint)";

  return (
    <div
      // §Backdrop: rgba(8,6,4,0.72) over the blurred (blur(3px)) review page.
      className="fixed inset-0 z-50 flex md:items-center md:justify-center"
      role="presentation"
      onClick={onClose}
      style={{
        background: "rgba(8,6,4,0.72)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-inspector-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: full-screen sheet on --surface-sunken.
        // Desktop: 660px × ~600–640px, --surface-rail, 1px --border-strong,
        // radius 16px, shadow 0 40px 100px rgba(0,0,0,0.7).
        className="flex flex-col w-full h-full md:h-auto md:w-[660px] md:max-h-[640px] md:rounded-2xl bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)] overflow-hidden"
        style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}
      >
        {/* Header — title, subtitle, close */}
        <div className="flex items-start gap-[12px] p-[18px_20px_10px] md:p-[22px_26px_12px]">
          <div className="min-w-0 flex-1">
            <h2
              id="issue-inspector-title"
              className="font-display font-bold text-[19px] md:text-[22px]"
              style={{ color: "var(--fg)" }}
            >
              {issueInspectorCopy.header.title}
            </h2>
            <p
              className="font-mono text-[11.5px] mt-[4px]"
              style={{ color: "var(--fg-faint)" }}
            >
              {issueInspectorCopy.header.subtitle(
                preview.filename,
                skipped,
                preview.rowCount,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={issueInspectorCopy.header.closeAriaLabel}
            // §Close: --surface-raised circle, 1px --border-strong, hover brass.
            className="flex-none rounded-full flex items-center justify-center hover:[color:var(--brass)]"
            style={{
              width: 32,
              height: 32,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
              color: "var(--fg-muted)",
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        {/* Header help line — or hoisted zero-note when a tab is empty. */}
        {isUnmatchedDisabled || isErrorsDisabled ? (
          <div
            className="mx-[20px] md:mx-[26px] mb-[10px] rounded-lg p-[10px_12px] flex items-start gap-[10px]"
            style={{
              background: "var(--surface-sunken)",
              borderLeft: "3px solid var(--success)",
            }}
          >
            <span
              aria-hidden
              className="rounded-full flex-none mt-[6px]"
              style={{ width: 8, height: 8, background: "var(--success)" }}
            />
            <p className="text-[12.5px]" style={{ color: "var(--fg-muted)" }}>
              {isErrorsDisabled
                ? issueInspectorCopy.zeroState.noParseErrors
                : issueInspectorCopy.zeroState.noUnmatched}
            </p>
          </div>
        ) : (
          <p
            className="mx-[20px] md:mx-[26px] mb-[10px] text-[12px]"
            style={{ color: "var(--fg-muted)" }}
          >
            {issueInspectorCopy.header.help}
          </p>
        )}

        {/* Tabs + filter row */}
        <div className="px-[20px] md:px-[26px]">
          <TabList
            tab={tab}
            unmatchedTotal={unmatchedTotal}
            errorsTotal={errorsTotal}
            onSwitch={switchTab}
          />

          <div className="mt-[12px] flex items-center gap-[10px]">
            {/* §Filter input: --surface-sunken, 1px --border-strong, radius 8, 40px (44 mobile). */}
            <div
              className="flex-1 flex items-center gap-[10px] rounded-lg px-[12px] h-[44px] md:h-[40px]"
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <span
                aria-hidden
                className="font-mono text-[15px]"
                style={{ color: "var(--fg-faint)" }}
              >
                ⌕
              </span>
              <input
                ref={filterInputRef}
                type="text"
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder={
                  tab === "unmatched"
                    ? issueInspectorCopy.filter.placeholderUnmatched(unmatchedTotal)
                    : issueInspectorCopy.filter.placeholderErrors(errorsTotal)
                }
                aria-label={
                  tab === "unmatched"
                    ? issueInspectorCopy.filter.placeholderUnmatched(unmatchedTotal)
                    : issueInspectorCopy.filter.placeholderErrors(errorsTotal)
                }
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: "var(--fg)" }}
              />
              {rawQuery !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    setRawQuery("");
                    setQuery("");
                    filterInputRef.current?.focus();
                  }}
                  aria-label={issueInspectorCopy.filter.clearAriaLabel}
                  className="flex-none rounded-full flex items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    background: "var(--surface-raised)",
                    color: "var(--fg-muted)",
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {/* Visual count — no aria-live (would announce every keystroke). */}
            <span
              className="font-mono text-[11px] flex-none whitespace-nowrap"
              style={{ color: countColor }}
            >
              {issueInspectorCopy.filter.count(activeShown, activeTotal)}
            </span>
            {/* SR-only live region — announces only the zero-match state. */}
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {showEmptyFilter
                ? `No matches for ${query}. ${activeTotal.toLocaleString()} total in this tab.`
                : ""}
            </span>
          </div>
        </div>

        {/* Panels */}
        <div className="flex-1 min-h-0 p-[14px_20px_20px] md:p-[16px_26px_22px]">
          <div
            role="tabpanel"
            id={`issue-inspector-panel-${tab}`}
            aria-labelledby={`issue-inspector-tab-${tab}`}
          >
            {showEmptyFilter ? (
              <EmptyFilter
                query={query}
                total={activeTotal}
                onClear={() => {
                  setRawQuery("");
                  setQuery("");
                  filterInputRef.current?.focus();
                }}
                bodyText={
                  tab === "unmatched"
                    ? issueInspectorCopy.emptyFilter.body(unmatchedTotal)
                    : issueInspectorCopy.emptyFilterErrors.body(errorsTotal)
                }
              />
            ) : tab === "unmatched" ? (
              <IssueInspectorList
                variant="unmatched"
                rows={filteredUnmatched}
                query={query}
              />
            ) : (
              <IssueInspectorList
                variant="errors"
                rows={filteredErrors}
                query={query}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabList({
  tab,
  unmatchedTotal,
  errorsTotal,
  onSwitch,
}: {
  tab: Tab;
  unmatchedTotal: number;
  errorsTotal: number;
  onSwitch: (t: Tab) => void;
}) {
  const enabled: Tab[] = [
    ...(unmatchedTotal > 0 ? (["unmatched"] as const) : []),
    ...(errorsTotal > 0 ? (["errors"] as const) : []),
  ];

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (enabled.length < 2) return;
    if (
      e.key !== "ArrowRight" &&
      e.key !== "ArrowLeft" &&
      e.key !== "Home" &&
      e.key !== "End"
    )
      return;
    e.preventDefault();
    const currentIdx = enabled.indexOf(tab);
    let next = currentIdx;
    if (e.key === "ArrowRight") next = (currentIdx + 1) % enabled.length;
    else if (e.key === "ArrowLeft")
      next = (currentIdx - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    onSwitch(enabled[next]);
  }

  return (
    <div
      role="tablist"
      aria-label={issueInspectorCopy.tabs.ariaLabel}
      onKeyDown={onKeyDown}
      className="flex items-center gap-[18px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <TabButton
        id="issue-inspector-tab-unmatched"
        panelId="issue-inspector-panel-unmatched"
        label={issueInspectorCopy.tabs.unmatched}
        count={unmatchedTotal}
        selected={tab === "unmatched"}
        disabled={unmatchedTotal === 0}
        onSelect={() => onSwitch("unmatched")}
        pillTint={
          unmatchedTotal === 0
            ? { color: "var(--success)", bg: "rgba(111,163,104,0.14)" }
            : { color: "var(--warning)", bg: "rgba(224,145,60,0.14)" }
        }
      />
      <TabButton
        id="issue-inspector-tab-errors"
        panelId="issue-inspector-panel-errors"
        label={issueInspectorCopy.tabs.parseErrors}
        count={errorsTotal}
        selected={tab === "errors"}
        disabled={errorsTotal === 0}
        onSelect={() => onSwitch("errors")}
        pillTint={
          errorsTotal === 0
            ? { color: "var(--success)", bg: "rgba(111,163,104,0.14)" }
            : { color: "var(--danger)", bg: "rgba(198,83,63,0.16)" }
        }
      />
    </div>
  );
}

function TabButton({
  id,
  panelId,
  label,
  count,
  selected,
  disabled,
  onSelect,
  pillTint,
}: {
  id: string;
  panelId: string;
  label: string;
  count: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  pillTint: { color: string; bg: string };
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={selected}
      aria-controls={panelId}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      // §Tab: Plex Sans 600 14px; active --fg + inset -2px --brass; idle --fg-faint.
      // Disabled: --fg-locked adjacent, opacity .7, cursor not-allowed.
      // Padding matches the mock's 10px 4px 13px (pt/px/pb) — split classes to
      // avoid a Tailwind class-order conflict (py-[10px] + pt-[4px] loses to pt-[4px]).
      className="flex items-center gap-[8px] pt-[10px] px-[4px] pb-[13px] font-sans font-semibold text-[14px] cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: "none",
        border: "none",
        color: disabled
          ? "var(--fg-locked)"
          : selected
            ? "var(--fg)"
            : "var(--fg-faint)",
        opacity: disabled ? 0.7 : 1,
        boxShadow: selected ? "inset 0 -2px 0 var(--brass)" : "none",
      }}
    >
      {label}
      <span
        className="font-mono text-[11px] rounded-full px-[8px] py-[2px]"
        style={{ color: pillTint.color, background: pillTint.bg }}
      >
        {count.toLocaleString()}
      </span>
    </button>
  );
}

function EmptyFilter({
  query,
  total,
  onClear,
  bodyText,
}: {
  query: string;
  total: number;
  onClear: () => void;
  bodyText: string;
}) {
  return (
    <div
      className="flex flex-col items-center text-center gap-[10px] py-[36px]"
      style={{ color: "var(--fg-muted)" }}
    >
      <div style={{ color: "var(--brass-mid)" }}>
        <CardFanMark size={56} />
      </div>
      <p
        className="font-display font-semibold text-[16px]"
        style={{ color: "var(--fg)" }}
      >
        {issueInspectorCopy.emptyFilter.title(query)}
      </p>
      <p className="text-[13px] max-w-[380px]">{bodyText}</p>
      <p className="sr-only">Total available: {total.toLocaleString()}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-[8px] rounded-lg font-sans font-semibold text-[13px] px-[16px] py-[9px] cursor-pointer"
        style={{
          background: "var(--brass)",
          color: "var(--bg)",
          border: "none",
        }}
      >
        {issueInspectorCopy.emptyFilter.action}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`

Expected: no errors.

- [ ] **Step 4: Lint**

Run: `pnpm lint`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/a11y/dialog.ts src/components/collection/issue-inspector.tsx
git commit -m "feat(collection): issue inspector — modal shell with tabs, filter, a11y (#36)"
```

---

### Task 5: Review-page integration — single CTA + mount inspector

**Files:**
- Modify: `src/components/collection/review-screen.tsx`

**Interfaces:**
- Consumes: `<IssueInspector>` from `src/components/collection/issue-inspector.tsx`, `issueInspectorCopy` from `src/lib/copy/issue-inspector.ts`.

- [ ] **Step 1: Replace inline expanders with the combined CTA + inspector mount**

Edit `src/components/collection/review-screen.tsx`:

Remove the `INITIAL_LIMIT` slice/expanded pattern for the *"Show all"* interactions and add the combined CTA + inspector. The per-column preview list still shows the first `INITIAL_LIMIT` rows.

Change 1 — imports and state:

Replace:

```tsx
import { useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";

const INITIAL_LIMIT = 8; // Show first N per section; "Show all" reveals the rest.
```

With:

```tsx
import { useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";
import { IssueInspector } from "./issue-inspector";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";

const INITIAL_LIMIT = 8; // Per-section preview cap; full list lives in the Issue Inspector.
```

Change 2 — remove expand state, add inspector state:

Replace:

```tsx
  const [unmatchedExpanded, setUnmatchedExpanded] = useState(false);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const importCount = preview.matchedCardCount;
  const skipped = preview.unmatchedRows.length + preview.parseErrors.length;
  const unmatchedShown = unmatchedExpanded
    ? preview.unmatchedRows
    : preview.unmatchedRows.slice(0, INITIAL_LIMIT);
  const errorsShown = errorsExpanded
    ? preview.parseErrors
    : preview.parseErrors.slice(0, INITIAL_LIMIT);
```

With:

```tsx
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const importCount = preview.matchedCardCount;
  const skipped = preview.unmatchedRows.length + preview.parseErrors.length;
  const unmatchedShown = preview.unmatchedRows.slice(0, INITIAL_LIMIT);
  const errorsShown = preview.parseErrors.slice(0, INITIAL_LIMIT);
  // Inspector opens on the populated tab; Unmatched by default, Parse errors
  // when Unmatched is empty (handoff decision #4).
  const initialInspectorTab: "unmatched" | "errors" =
    preview.unmatchedRows.length === 0 ? "errors" : "unmatched";
```

(No `useRef` needed — `useDialogA11y` captures `document.activeElement` at mount and restores focus to it on unmount, so the CTA gets focus back automatically without the callsite holding a ref.)

Change 3 — remove the two per-section "Show all …" buttons.

Delete the block starting at:

```tsx
              {preview.unmatchedRows.length > INITIAL_LIMIT && !unmatchedExpanded && (
                <button
                  type="button"
                  onClick={() => setUnmatchedExpanded(true)}
                  className="mt-[8px] text-[12.5px] p-[4px_2px]"
                  style={{ color: "var(--brass)" }}
                >
                  Show all {preview.unmatchedRows.length} unmatched →
                </button>
              )}
```

and the parallel block for `errorsExpanded` / `preview.parseErrors.length > INITIAL_LIMIT`.

Change 4 — add the combined CTA below both preview columns (inside the same `grid` container that holds the two sections but as a full-width sibling after the grid). Insert immediately after the closing `</div>` of the desktop 2-column layout (`<div className={\`grid grid-cols-1 …\`}> … </div>`) and before the sticky confirm bar:

```tsx
        {skipped > 0 && (
          <div className="mt-[16px] md:mt-[20px] flex md:justify-center">
            <button
              type="button"
              onClick={() => setInspectorOpen(true)}
              className="w-full md:w-auto rounded-lg font-sans font-semibold text-[13.5px] px-[18px] py-[11px] cursor-pointer"
              style={{
                background: "transparent",
                color: "var(--brass)",
                border: "1px solid var(--border-strong)",
              }}
            >
              {issueInspectorCopy.entry.cta(skipped)}
            </button>
          </div>
        )}
```

Change 5 — mount the inspector inside the wrapping `<section>` (at the very end, right before `</section>`). No focus-return callback — `useDialogA11y`'s cleanup effect restores focus to the button that had focus when the inspector mounted (the CTA).

```tsx
      {inspectorOpen && (
        <IssueInspector
          preview={preview}
          initialTab={initialInspectorTab}
          onClose={() => setInspectorOpen(false)}
        />
      )}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`

Expected: no errors.

- [ ] **Step 4: Run existing tests to confirm no regression**

Run: `pnpm test`

Expected: PASS — all existing suites + the Task 1 filter tests.

- [ ] **Step 5: Manual browser smoke — golden path + edge cases**

Start the dev server in a worktree with a real `DATABASE_URL`. Walk:

1. Upload a CSV with 50 unmatched + 8 parse errors → review page shows previews, `View all 58 issues →` CTA appears below both columns. Click → inspector opens on Unmatched.
2. Type in the filter → `Showing N of M` updates live, matches highlighted in brass wash on **every** run (not just first).
3. Type a query with no matches → count turns amber, empty-filter card-fan mark + `Clear filter` shows.
4. Switch to Parse errors tab → filter clears, focus returns to filter input, placeholder swaps.
5. Type a line number (e.g. `2210`) in the parse-errors filter → row with `L2210` shows.
6. Esc closes → focus returns to the `View all …` CTA on the review page. Sticky confirm bar never moved.
7. Backdrop click (desktop only) closes.
8. Upload a CSV with 0 parse errors → inspector's Parse errors tab shows disabled with `0` in green; success-styled callout at top: `No parse errors …`.
9. Upload a CSV with 0 unmatched but > 0 errors → inspector opens on Parse errors tab; Unmatched tab disabled at 0 with success pill and hoisted zero-note.
10. Mobile viewport (375px) → full-screen sheet, single CTA below the mini-stats, close ✕ top-right, filter input auto-focused.
11. Keyboard only: Tab flows filter → clear → active tab → close; Arrow keys move between enabled tabs, skip disabled ones; Home/End jump to first/last enabled.
12. Upload a CSV that produces > 150 unmatched (e.g. 200) → list virtualizes (verify smooth scroll, no jank).

If any step fails, fix and re-verify before continuing to Step 6.

- [ ] **Step 6: Commit**

```bash
git add src/components/collection/review-screen.tsx
git commit -m "feat(collection): wire issue inspector into review page, remove inline expanders (#36)"
```

---

### Task 6: Parse-error `reason` cross-check + addendum

**Files:**
- Create: `design/design_handoff_the99_issue_inspector/ADDENDUM-parse-error-copy.md`

**Interfaces:**
- No code interface — this is a documentation task that closes Yellow item #2.

Design's mock uses richer parse-error `reason` strings (e.g. `Missing quantity — no value in the Count column`, `Quantity "two" is not a number`, `Unterminated quote — row spans a line break`) than the backend emits today from `src/lib/manabox/parse.ts` and `src/lib/manabox/paste.ts` (`missing card name`, `invalid quantity "X"`, `expected at least N columns, got M`, `empty file`, `header missing Name column`, `header missing Quantity column`). The copy file explicitly says `reason` renders as-is; the mock's samples were illustrative. Capturing the delta so a follow-up backend copy pass can close it.

- [ ] **Step 1: Write the addendum**

Create `design/design_handoff_the99_issue_inspector/ADDENDUM-parse-error-copy.md`:

```markdown
# Addendum — Parse-error `reason` copy delta

**Filed by:** plan PR for #36 (Issue Inspector implementation).
**Date:** 2026-07-20
**Status:** Informational — no design change required.

## Yellow item closed

`READINESS.md` § *Eng-side clarifications*, item 2:

> **Parse-error `reason` copy cross-check.** … Cross-check the mock's reason
> wording against `previewUpload` / `previewPaste`'s actual `parseErrors[].reason`
> output, and either mirror the backend text or adjust the mock language in an
> addendum note.

## Decision

Ship the backend's current `reason` strings verbatim, per the explicit note in
`Issue Inspector - copy strings.js`:

```
parseErrorRow: {
  lineBadge: "L{line}",
  // reason comes straight from UploadPreview.parseErrors[].reason — render as-is, do not rephrase.
}
```

The mock's reason wording (e.g. `Missing quantity — no value in the Count column`)
is illustrative only. The inspector will render whatever backend produces.

## Backend vs mock — current delta

| Source | Current backend text | Mock sample |
|---|---|---|
| `parse.ts` (empty file) | `empty file` | not shown |
| `parse.ts` (missing Name header) | `header missing Name column` | not shown |
| `parse.ts` (missing Quantity header) | `header missing Quantity column` | not shown |
| `parse.ts` (too few columns) | `expected at least N columns, got M` | (no mock sample — mock shows "Too many columns — 9 fields, expected 6", but backend does NOT detect too-many-columns as fatal; extras are ignored. Do not mirror the mock text — it names a failure mode backend never emits.) |
| `parse.ts` / `paste.ts` (bad qty) | `invalid quantity "X"` | `Quantity "two" is not a number` / `Quantity "-3" is out of range` |
| `parse.ts` / `paste.ts` (missing name) | `missing card name` | `Empty name field` |

## Follow-up (out of scope for #36)

A separate backend copy pass could adopt the mock's more descriptive tone. That
work would live against `src/lib/manabox/parse.ts` and `src/lib/manabox/paste.ts`
and does not affect the Issue Inspector's rendering.
```

- [ ] **Step 2: Commit**

```bash
git add design/design_handoff_the99_issue_inspector/ADDENDUM-parse-error-copy.md
git commit -m "docs(design): #36 parse-error reason copy addendum — ship backend as-is"
```

---

### Task 7: Design review + verification-before-completion + PR

**Files:**
- No file changes in this task — verification only. If the design review surfaces gaps, they land in the same PR before it opens.

**Interfaces:**
- Consumes the built implementation from Tasks 1–5 and the addendum from Task 6.
- Produces: the merge-ready PR.

- [ ] **Step 1: Run the design-review skill**

Invoke the `design-review` skill against the built inspector using the property table in
`design/design_handoff_the99_issue_inspector/README.md` (§Component notes). Enumerate every
property (Dialog, Sheet, Header, Tab, Filter input, Result count, Unmatched row, Parse-error row,
Match highlight, Empty-filter state, Empty-tab zero-note, Header help line), verify each against
the shipped screens on mobile + desktop, and log any deltas.

Fix each delta inline (in Task 4's `issue-inspector.tsx` or Task 3's `issue-inspector-list.tsx`),
recommit with `fix(collection): design review — <property>` messages, then re-run design review
until every property passes.

- [ ] **Step 2: Full pre-push gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`

Expected: all green.

Run: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`

Expected: successful build.

- [ ] **Step 3: Rebase on origin/main**

Run: `git fetch origin && git rebase origin/main`

Expected: fast-forward or clean rebase. If conflicts, resolve carefully — do not use destructive shortcuts.

- [ ] **Step 4: Push and open PR**

Run:

```bash
git push -u origin <branch-name>
gh pr create --title "feat(collection): Issue Inspector modal (#36)" --body "$(cat <<'EOF'
## Summary

- New `<IssueInspector>` modal/sheet replacing the review page's inline "Show all …" expanders (fixed the sticky-confirm-bar shove-off-screen bug).
- Single `View all N issues →` CTA below the review-page preview columns opens the inspector on the populated tab (Unmatched default, Parse errors when Unmatched is empty).
- Tabs, client-side substring filter (all-runs highlight), disabled empty tab with hoisted success zero-note, full a11y baseline (focus trap, Esc, first-focus = filter, roving arrow-key focus on tabs).
- Virtualized above 150 rows via `react-window`.
- Ports Design's copy strings verbatim to `src/lib/copy/issue-inspector.ts`.
- Backend/mock parse-error reason delta captured in `design/design_handoff_the99_issue_inspector/ADDENDUM-parse-error-copy.md` — ships backend text as-is per the copy file's explicit note.

Closes #36.

## Test plan

- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] Stub-DB build green
- [ ] Manual walk-through (Task 5 step 5) — golden path and all edge cases pass
- [ ] Design-review skill (Task 7 step 1) — every property in the handoff §Component notes table verified
EOF
)"
```

- [ ] **Step 5: Request Copilot review + follow the user-level policy**

Follow `~/.claude/CLAUDE.md` § *Copilot PR review — canonical policy*: request review via `--input -` on `/repos/{owner}/{repo}/pulls/<n>/requested_reviewers`, verify the response lists `Copilot`, poll `/pulls/<n>/reviews` at ~240–270s intervals, triage every valid comment (including nits), re-request after each fix push. Merge only when the review bar is met (Low/Nit only remaining across 2 successful rounds, or 1 with diminishing returns) — this repo squashes on merge.

---

## Self-review

**1. Spec coverage.** Every requirement in the handoff README, brief.md, and READINESS.md maps to a task:

| Requirement | Task |
|---|---|
| Modal (desktop) / full-screen sheet (mobile) | 4 |
| Reads UploadPreview from memory, no fetch | 4 |
| Single `View all N issues →` CTA on review page | 5 |
| Header title + subtitle + close ✕ | 4 |
| Header help line OR hoisted zero-note | 4 |
| Tabs w/ counts, disabled at 0, roving arrow-key focus | 4 |
| Client-side substring filter w/ 120ms debounce (per brief.md §2) | 4 (`rawQuery`/`query` state pair + `setTimeout` in `useEffect`) |
| Filter matches name (Unmatched) / reason + line (Errors) | 1 |
| All-runs `<mark>` highlight | 1, 3 |
| `Showing N of M`; turns amber at 0 | 4 |
| Filter count NOT announced per keystroke; zero-match state announced via sr-only live region | 4 |
| Empty-filter state — card-fan + Clear filter | 4 |
| Row spec: unmatched (left-border warning) / parse-error (left-border danger) | 3 |
| Virtualization above 150 rows via react-window v1 (`FixedSizeList`) | 2 (pinned `^1.8.11`), 3 |
| Focus trap, Esc close, backdrop close (desktop) | 4 (via useDialogA11y) |
| Backdrop `blur(3px)` per handoff Dialog spec | 4 |
| First focus = filter input | 4 (`useDialogA11y` extended with `initialFocusRef` option — no focus flash) |
| Focus restore to trigger on close | 4 (owned by useDialogA11y cleanup — no callsite fallback needed) |
| role=tablist/tab/tabpanel + aria-selected + aria-labelledby | 4 |
| aria-disabled on zero-count tab | 4 |
| prefers-reduced-motion respected | 4 (no animations added; existing tokens don't animate) |
| Copy verbatim from `Issue Inspector - copy strings.js` | 1 |
| Yellow #1 virtualization library + threshold locked (`react-window@^1`, 150 rows) | 2 (pin), 3 (threshold) |
| Yellow #2 parse-error reason cross-check | 6 |
| Yellow #3 match-highlight all runs | 1 (`findMatchRanges`), 3 (`<HighlightedText>`) |
| Non-blocking parent (sticky bar untouched) | 5 (inspector layers over review page; review-screen not restructured) |
| CTA `total` = unmatched + errors count | 5 |
| Design-review skill on completed UI | 7 |

**2. Placeholder scan.** No `TBD`, no `implement later`, no `add appropriate error handling`, no `write tests for the above`. Every code step contains the actual code; every command has its expected output. The one exception is `<branch-name>` in Task 7 Step 4 — filled in at execution time when the worktree branch is known.

**3. Type consistency.** `UnmatchedRow` and `ParseErrorRow` defined in Task 1 (`src/lib/collection/issue-filter.ts`) match the shapes consumed by Task 3 (`<IssueInspectorList>`) and Task 4 (`<IssueInspector>`). `Tab` type is `"unmatched" | "errors"` throughout. `issueInspectorCopy.entry.cta(total)` in Task 1 is called by Task 5 with `skipped` (the combined count). `filterUnmatched` / `filterParseErrors` return arrays of the same shape as their inputs — consumed by Task 3 as-is. `IssueInspector` prop `initialTab` is `Tab` — set in Task 5 based on which list is populated. `findMatchRanges` returns `[number, number][]` — consumed by `<HighlightedText>` in Task 3.
