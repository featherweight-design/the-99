# Collection (#6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship The 99's Collection surface (`/collection`) — a read-only browse experience over the user's ~1,400 unique / ~2,900 total cards with search / filter / sort, dual view (dense rows, art grid), card-detail modal with prev/next + deep link, distinct no-results state, and the three-step Replace flow (upload → single-scroll review → type-to-confirm). Includes the eng-side clarifications the READINESS audit called out: broadened CSV parser, line numbers on unmatched rows, sort option list, missing-art gradient placeholder, modal a11y (focus trap + Escape + labeled input), and windowed pagination (no virtualization dependency).

**Architecture:** Server-first App Router. `/collection` (RSC) loads the aggregated browse dataset once via a single drizzle query and hands it to a **client** `<CollectionBrowser>` for filter/sort/window/modal state — every control mirrors to URL query params (`?q=&c=&t=&s=&sort=&view=&card=`) via `router.replace({ scroll: false })` so chips, view toggle, and card detail deep-link. Pure filter/sort/aggregate logic lives in `src/lib/collection/browse.ts` (vitest). Replace lives at `/collection/replace` as a **client** flow (three internal steps: entry → review → confirm modal) reusing the existing `previewUpload` / `previewPaste` / `confirmUpload` server actions after the parser broadening in Tasks 1–2.

**Tech Stack:** Next.js 16.2.10 (App Router, `src/proxy.ts` middleware entrypoint), React 19.2.4, Tailwind v4 (`@theme` in `globals.css`), `@clerk/nextjs` ^7, drizzle-orm 0.45, Vitest 4 (node environment — UI verified by design-review gate + browser, logic by unit tests). Read `node_modules/next/dist/docs/` before writing Next.js APIs — this project's Next.js differs from training data.

## Global Constraints

- Every styling value comes from `docs/superpowers/design-tables/collection.md`. Steps cite table sections (e.g. "per §Filter bar" / "per §Row Container"); code blocks restate exact px / hex / radius values so the design-review gate can check row-by-row without cross-referencing.
- Tokens: use CSS custom properties from `src/app/globals.css` (`--bg`, `--surface`, `--surface-sunken`, `--surface-inset`, `--surface-raised`, `--elevated`, `--border`, `--border-strong`, `--border-dashed`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--fg-locked`, `--brass`, `--brass-hover`, `--success`, `--warning`, `--danger`, `--w`, `--u`, `--b`, `--r`, `--g`). NEVER put hover-dependent styles in inline `style` — hover variants MUST be Tailwind classes (known repo bug: inline `style` doesn't participate in Tailwind's hover variant).
- Mobile + desktop parity in every task. Breakpoint: `md:` (768px). Rows are the default view on mobile; grid is the default on desktop; view toggle overrides and persists to URL param.
- Focus-visible treatment already ships globally (`:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }` — see globals.css lines 100–103). New interactive controls inherit it unless a component overrides. READINESS item 5 covers filter controls + modal.
- TDD for pure logic (parse, match preview threading, browse filter/sort/aggregate). UI components verified via `pnpm typecheck` + `pnpm lint` + `pnpm build` and the design-review gate; no React testing libraries.
- Build command needs `DATABASE_URL="postgres://stub:stub@localhost/stub"` set (the drizzle client throws otherwise; connection isn't opened at build time).
- React 19 / Next.js 16 conventions: server components by default. `"use client"` only where interactive (filter bar, view toggle, modal, replace flow, upload entry). Server actions live in `src/app/collection/actions.ts` and stay `"use server"`.
- The parser rename is a **contract change** across `parse.ts`, `paste.ts`, `match.ts`, `actions.ts`, `upload-entry.tsx`, and the two test files. Tasks 1 → 2 → 3 must land before Task 7's new upload UI touches those symbols.
- Row type after Task 1 is `CollectionRow` (renamed from `ManaBoxRow`) with an added `line: number`. All consumers switch in Task 2.
- Commit style: conventional commits (`feat:` / `chore:` / `docs:` / `refactor:`).

---

### Task 1: Broaden CSV parser + rename to `parseCollectionCsv` (TDD)

**Files:**
- Modify: `src/lib/manabox/parse.ts`
- Modify: `src/lib/manabox/parse.test.ts`
- Create: `src/lib/manabox/__fixtures__/moxfield.csv`
- Create: `src/lib/manabox/__fixtures__/archidekt.csv`
- Create: `src/lib/manabox/__fixtures__/plain.csv`

**Interfaces:**
- Produces: `export type CollectionRow = { name: string; setCode: string; quantity: number; scryfallId: string | null; foil: boolean; condition: string | null; line: number }` — replaces `ManaBoxRow`. `line` is the 1-based line number in the source CSV (matches the header being line 1, so first data row is line 2).
- Produces: `export type ParseError = { line: number; raw: string; reason: string }` — unchanged.
- Produces: `export function parseCollectionCsv(csvText: string): { rows: CollectionRow[]; errors: ParseError[] }` — replaces `parseManaBoxCsv`. Flexible headers (case-insensitive): Name accepts `Name` / `Card Name` / `Card`. Quantity accepts `Quantity` / `Count` / `Qty`. Optional: Set code accepts `Set code` / `Set` / `Edition`; Foil accepts `Foil` / `Finish` (row.foil = true when trimmed value is not empty AND not one of `"normal"`, `"false"`, `"nonfoil"`); Condition accepts `Condition`; Scryfall ID accepts `Scryfall ID`.
- Consumes: `csvText: string`.

Steps:

- [ ] Add three fixture files. `src/lib/manabox/__fixtures__/moxfield.csv`:

```csv
"Count","Name","Edition","Condition","Language","Foil"
"2","Sol Ring","c21","Near Mint","English",""
"1","Fell the Mighty","c14","Good","English",""
"1","Lightning Bolt","2xm","Near Mint","English","Foil"
```

- [ ] Create `src/lib/manabox/__fixtures__/archidekt.csv`:

```csv
Quantity,Name,Edition,Finish
2,Sol Ring,C21,Normal
1,Lightning Bolt,2XM,Foil
```

- [ ] Create `src/lib/manabox/__fixtures__/plain.csv`:

```csv
Card Name,Qty
Sol Ring,2
Lightning Bolt,1
```

- [ ] Rewrite `src/lib/manabox/parse.test.ts` to cover the broadened parser (fails until Task 1 code lands):

```ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCollectionCsv } from "./parse";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const manabox = readFileSync(join(fixturesDir, "sample.csv"), "utf8");
const moxfield = readFileSync(join(fixturesDir, "moxfield.csv"), "utf8");
const archidekt = readFileSync(join(fixturesDir, "archidekt.csv"), "utf8");
const plain = readFileSync(join(fixturesDir, "plain.csv"), "utf8");

describe("parseCollectionCsv", () => {
  it("parses the ManaBox export shape (all six columns present)", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows[0]).toEqual({
      name: "Sol Ring", setCode: "C21", quantity: 2,
      scryfallId: "83f43730-1c1f-4150-8771-d901c54bedd4",
      foil: false, condition: "near_mint",
      line: 2,
    });
  });

  it("carries the source line number on each row (header is line 1)", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows.map((r) => r.line)).toEqual([2, 3, 4]);
  });

  it("treats foil=`foil` as foil:true and foil=`normal` as foil:false", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows[2].foil).toBe(true);   // Lightning Bolt row is "foil"
    expect(rows[0].foil).toBe(false);  // Sol Ring row is "normal"
  });

  it("parses Moxfield-style headers (Count/Name/Edition/Foil, quoted fields)", () => {
    const { rows, errors } = parseCollectionCsv(moxfield);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2, setCode: "c21", foil: false });
    expect(rows[2]).toMatchObject({ name: "Lightning Bolt", foil: true });
  });

  it("parses Archidekt-style headers (Quantity/Name/Edition/Finish)", () => {
    const { rows } = parseCollectionCsv(archidekt);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2, setCode: "C21", foil: false });
    expect(rows[1]).toMatchObject({ name: "Lightning Bolt", foil: true });
  });

  it("parses a minimal plain CSV (Card Name + Qty only)", () => {
    const { rows, errors } = parseCollectionCsv(plain);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: "Sol Ring", setCode: "", quantity: 2,
      scryfallId: null, foil: false, condition: null, line: 2,
    });
  });

  it("matches headers case-insensitively", () => {
    const { rows } = parseCollectionCsv("name,qty\nSol Ring,3\n");
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 3 });
  });

  it("rejects a CSV missing a Name column", () => {
    const { rows, errors } = parseCollectionCsv("Foo,Quantity\nBar,1\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/name/i);
    expect(errors[0].line).toBe(1);
  });

  it("rejects a CSV missing a Quantity column", () => {
    const { rows, errors } = parseCollectionCsv("Name,Foo\nSol Ring,x\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/quantity/i);
    expect(errors[0].line).toBe(1);
  });

  it("reports rows with invalid quantity as errors with line numbers", () => {
    const { rows, errors } = parseCollectionCsv(manabox);
    expect(rows).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(5);
    expect(errors[0].reason).toMatch(/quantity/i);
  });

  it("reports empty file as a parse error on line 1", () => {
    const { rows, errors } = parseCollectionCsv("");
    expect(rows).toHaveLength(0);
    expect(errors[0].line).toBe(1);
    expect(errors[0].reason).toMatch(/empty/i);
  });
});
```

- [ ] Run the tests and confirm they fail (`pnpm test src/lib/manabox/parse.test.ts` — expected: import error / missing export).
- [ ] Rewrite `src/lib/manabox/parse.ts`:

```ts
/**
 * Flexible CSV parser (READINESS #1).
 * Covers ManaBox, Moxfield, Archidekt, Deckbox, and plain "Name,Qty" exports.
 * Header match is case-insensitive; only Name + Quantity are required.
 *
 * Row.line is the 1-based line number in the source CSV (header is line 1),
 * so errors and unmatched rows can point the user back at the file (READINESS #2).
 */
export type CollectionRow = {
  name: string;
  setCode: string;
  quantity: number;
  scryfallId: string | null;
  foil: boolean;
  condition: string | null;
  line: number;
};
export type ParseError = { line: number; raw: string; reason: string };

const NAME_HEADERS = ["name", "card name", "card"];
const QUANTITY_HEADERS = ["quantity", "count", "qty"];
const SET_HEADERS = ["set code", "set", "edition"];
const FOIL_HEADERS = ["foil", "finish"];
const CONDITION_HEADERS = ["condition"];
const SCRYFALL_HEADERS = ["scryfall id"];

// Foil column values that mean "not foil". Empty string also means not foil.
const NON_FOIL_VALUES = new Set(["", "normal", "false", "nonfoil"]);

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function findHeaderIndex(header: string[], candidates: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i !== -1) return i;
  }
  return -1;
}

export function parseCollectionCsv(csvText: string): { rows: CollectionRow[]; errors: ParseError[] } {
  const lines = csvText.split(/\r?\n/);
  if (lines.every((l) => l.trim() === "")) {
    return { rows: [], errors: [{ line: 1, raw: "", reason: "empty file" }] };
  }

  const header = splitCsvLine(lines[0]);
  const nameIdx = findHeaderIndex(header, NAME_HEADERS);
  const qtyIdx = findHeaderIndex(header, QUANTITY_HEADERS);
  if (nameIdx === -1) {
    return { rows: [], errors: [{ line: 1, raw: lines[0], reason: "header missing Name column" }] };
  }
  if (qtyIdx === -1) {
    return { rows: [], errors: [{ line: 1, raw: lines[0], reason: "header missing Quantity column" }] };
  }
  const setIdx = findHeaderIndex(header, SET_HEADERS);
  const foilIdx = findHeaderIndex(header, FOIL_HEADERS);
  const conditionIdx = findHeaderIndex(header, CONDITION_HEADERS);
  const scryfallIdx = findHeaderIndex(header, SCRYFALL_HEADERS);

  const rows: CollectionRow[] = [];
  const errors: ParseError[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const cols = splitCsvLine(lines[i]);
    // A row is only fatal if it can't reach the required columns.
    const requiredMax = Math.max(nameIdx, qtyIdx);
    if (cols.length <= requiredMax) {
      errors.push({ line: i + 1, raw: lines[i], reason: `expected at least ${requiredMax + 1} columns, got ${cols.length}` });
      continue;
    }
    const quantity = Number(cols[qtyIdx]);
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.push({ line: i + 1, raw: lines[i], reason: `invalid quantity "${cols[qtyIdx]}"` });
      continue;
    }
    const name = cols[nameIdx].trim();
    if (name === "") {
      errors.push({ line: i + 1, raw: lines[i], reason: "missing card name" });
      continue;
    }
    const foilRaw = foilIdx !== -1 ? (cols[foilIdx] ?? "").trim().toLowerCase() : "";
    rows.push({
      name,
      setCode: setIdx !== -1 ? (cols[setIdx] ?? "").trim() : "",
      quantity,
      scryfallId: scryfallIdx !== -1 ? ((cols[scryfallIdx] ?? "").trim() || null) : null,
      foil: !NON_FOIL_VALUES.has(foilRaw),
      condition: conditionIdx !== -1 ? ((cols[conditionIdx] ?? "").trim() || null) : null,
      line: i + 1,
    });
  }
  return { rows, errors };
}
```

- [ ] Run `pnpm test src/lib/manabox/parse.test.ts` — expected: all tests pass.
- [ ] Commit:

```bash
git add src/lib/manabox/parse.ts src/lib/manabox/parse.test.ts src/lib/manabox/__fixtures__/moxfield.csv src/lib/manabox/__fixtures__/archidekt.csv src/lib/manabox/__fixtures__/plain.csv
git commit -m "feat(collection): broaden CSV parser to Moxfield/Archidekt/plain, add line numbers"
```

---

### Task 2: Thread `line` through paste + match + preview (TDD)

**Files:**
- Modify: `src/lib/manabox/paste.ts`
- Modify: `src/lib/manabox/paste.test.ts`
- Modify: `src/lib/collection/match.ts`
- Modify: `src/lib/collection/match.test.ts`
- Modify: `src/app/collection/actions.ts`
- Modify: `src/components/collection/upload-entry.tsx`

**Interfaces:**
- Produces (paste.ts): `export function parsePasteList(text: string): { rows: CollectionRow[]; errors: ParseError[] }` — rows now carry `line: number` (1-based source line).
- Produces (match.ts): `matchRows(rows: CollectionRow[], catalog: CatalogCard[]): { matched: { row: CollectionRow; oracleId: string }[]; unmatched: CollectionRow[] }` — unchanged behavior, `CollectionRow` replaces `ManaBoxRow`; `line` passes through unchanged.
- Produces (actions.ts): `UploadPreview.unmatchedRows: { name: string; setCode: string; line: number }[]` — adds `line`. `UploadPreview.parseErrors: { line: number; reason: string }[]` — unchanged shape.
- Consumes: `parseCollectionCsv` (Task 1) and the `CollectionRow` type.

Steps:

- [ ] Update `src/lib/manabox/paste.test.ts` — all existing shapes gain `line`:

```ts
import { describe, expect, it } from "vitest";
import { parsePasteList } from "./paste";

describe("parsePasteList", () => {
  it("parses `N Name` lines", () => {
    const { rows, errors } = parsePasteList("3 Sol Ring\n1 Cultivate\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 3, scryfallId: null, foil: false, condition: null, line: 1 },
      { name: "Cultivate", setCode: "", quantity: 1, scryfallId: null, foil: false, condition: null, line: 2 },
    ]);
  });

  it("parses `Nx Name` and `NX Name`", () => {
    const { rows } = parsePasteList("2x Sol Ring\n4X Cultivate\n");
    expect(rows.map((r) => [r.quantity, r.name, r.line])).toEqual([
      [2, "Sol Ring", 1],
      [4, "Cultivate", 2],
    ]);
  });

  it("treats a bare name as quantity 1", () => {
    const { rows } = parsePasteList("Sol Ring\n");
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 1, scryfallId: null, foil: false, condition: null, line: 1 },
    ]);
  });

  it("carries the original 1-based source line even when blank lines precede it", () => {
    const { rows } = parsePasteList("\n\n3 Sol Ring\n\n1 Cultivate\n");
    expect(rows.map((r) => [r.name, r.line])).toEqual([
      ["Sol Ring", 3],
      ["Cultivate", 5],
    ]);
  });

  it("reports quantity <= 0 as an error with the source line number", () => {
    const { rows, errors } = parsePasteList("1 Sol Ring\n0 Cultivate\n");
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      { line: 2, raw: "0 Cultivate", reason: expect.stringMatching(/quantity/i) },
    ]);
  });

  it("reports a lone number with no name as an error", () => {
    const { rows, errors } = parsePasteList("3\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/name/i);
    expect(errors[0].line).toBe(1);
  });

  it("reports an oversized quantity as an error", () => {
    const { rows, errors } = parsePasteList("9999999999 Sol Ring\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/quantity/i);
  });

  it("reports a negative quantity as an error instead of treating it as a name", () => {
    const { rows, errors } = parsePasteList("-1 Sol Ring\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/quantity/i);
    expect(errors[0].line).toBe(1);
  });

  it("produces rows compatible with matchRows: scryfallId is null (not empty string)", () => {
    const { rows } = parsePasteList("1 Sol Ring\n");
    expect(rows[0].scryfallId).toBeNull();
  });
});
```

- [ ] Run tests (expected: fail — `line` missing on paste rows).
- [ ] Rewrite `src/lib/manabox/paste.ts` — swap `ManaBoxRow` for `CollectionRow`, attach `line`:

```ts
import type { CollectionRow, ParseError } from "./parse";

/**
 * Parse a plain-text paste list.
 * Supported line shapes (all trimmed, blank lines ignored):
 *   "3 Sol Ring"
 *   "3x Sol Ring"
 *   "Sol Ring"          → quantity 1
 * A leading integer <= 0, a quantity above MAX_QUANTITY, or an empty name
 * after quantity strip → ParseError. Row.line is the 1-based input line
 * (blank lines still count toward the index so the number matches the paste).
 */
const MAX_QUANTITY = 10_000;

export function parsePasteList(text: string): { rows: CollectionRow[]; errors: ParseError[] } {
  const lines = text.split(/\r?\n/);
  const rows: CollectionRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    const m = /^([+-]?\d+)\s*[xX]?\s+(.+)$/.exec(trimmed);
    let quantity: number;
    let name: string;
    if (m) {
      quantity = Number(m[1]);
      name = m[2].trim();
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
        errors.push({ line: i + 1, raw, reason: `invalid quantity "${m[1]}"` });
        continue;
      }
    } else if (/^[+-]?\d+[xX]?$/.test(trimmed)) {
      errors.push({ line: i + 1, raw, reason: "missing card name" });
      continue;
    } else {
      quantity = 1;
      name = trimmed;
    }

    if (name === "") {
      errors.push({ line: i + 1, raw, reason: "missing card name" });
      continue;
    }

    rows.push({
      name,
      setCode: "",
      quantity,
      scryfallId: null,
      foil: false,
      condition: null,
      line: i + 1,
    });
  }

  return { rows, errors };
}
```

- [ ] Run `pnpm test src/lib/manabox/paste.test.ts` — expected: pass.
- [ ] Update `src/lib/collection/match.test.ts` to construct rows with `line`:

```ts
import { describe, expect, it } from "vitest";
import { matchRows } from "./match";

const catalog = [
  { oracleId: "o-1", scryfallId: "s-1", name: "Sol Ring" },
  { oracleId: "o-2", scryfallId: "s-2", name: "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki" },
];
const row = (name: string, scryfallId: string | null = null, line = 2) =>
  ({ name, setCode: "X", quantity: 1, scryfallId, foil: false, condition: null, line });

describe("matchRows", () => {
  it("uses scryfall id when it matches the seeded printing (opportunistic fast path)", () => {
    const { matched } = matchRows([row("Wrong Name", "s-1")], catalog);
    expect(matched[0].oracleId).toBe("o-1");
  });
  it("falls back to case-insensitive exact name", () => {
    const { matched } = matchRows([row("sol ring")], catalog);
    expect(matched[0].oracleId).toBe("o-1");
  });
  it("matches a front-face name against a double-faced catalog name", () => {
    const { matched } = matchRows([row("Fable of the Mirror-Breaker")], catalog);
    expect(matched[0].oracleId).toBe("o-2");
  });
  it("reports unmatched rows with their original line number", () => {
    const { matched, unmatched } = matchRows([row("Not A Card", null, 7)], catalog);
    expect(matched).toHaveLength(0);
    expect(unmatched[0].line).toBe(7);
  });
});
```

- [ ] Run tests (expected: fail — match.ts imports `ManaBoxRow`).
- [ ] Rewrite `src/lib/collection/match.ts` to consume `CollectionRow`:

```ts
import type { CollectionRow } from "../manabox/parse";

export type CatalogCard = { oracleId: string; scryfallId: string; name: string };
export type MatchResult = {
  matched: { row: CollectionRow; oracleId: string }[];
  unmatched: CollectionRow[];
};

export function matchRows(rows: CollectionRow[], catalog: CatalogCard[]): MatchResult {
  // Name matching is the primary path for v1: the catalog is seeded from
  // Scryfall oracle-cards (one arbitrary printing per oracle id), while
  // export "Scryfall ID" values are printing-level ids — the id map only
  // hits when the collection happens to contain that exact printing.
  const byScryfallId = new Map(catalog.map((c) => [c.scryfallId, c.oracleId]));
  const byName = new Map<string, string>();
  for (const c of catalog) {
    const lower = c.name.toLowerCase();
    byName.set(lower, c.oracleId);
    const front = lower.split(" // ")[0];
    if (!byName.has(front)) byName.set(front, c.oracleId);
  }

  const matched: MatchResult["matched"] = [];
  const unmatched: CollectionRow[] = [];
  for (const row of rows) {
    const oracleId =
      (row.scryfallId && byScryfallId.get(row.scryfallId)) ??
      byName.get(row.name.toLowerCase());
    if (oracleId) matched.push({ row, oracleId });
    else unmatched.push(row);
  }
  return { matched, unmatched };
}
```

- [ ] Run `pnpm test src/lib/collection/match.test.ts` — expected: pass.
- [ ] Update `src/app/collection/actions.ts` — swap symbol names + thread `line` through `unmatchedRows`:

```ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { cards, collectionItems, csvUploads } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { parseCollectionCsv, type CollectionRow, type ParseError } from "../../lib/manabox/parse";
import { parsePasteList } from "../../lib/manabox/paste";
import { matchRows } from "../../lib/collection/match";

export type UploadPreview = {
  uploadId: string;
  matchedCardCount: number;
  unmatchedRows: { name: string; setCode: string; line: number }[];
  parseErrors: { line: number; reason: string }[];
  currentCollectionCount: number;
  filename: string;
  rowCount: number;
};

type PendingItem = { oracleId: string; setCode: string; foil: boolean; condition: string | null; quantity: number };

/**
 * Shared post-parse pipeline for previewUpload / previewPaste.
 * Guards the zero-row case, matches against the catalog, aggregates matched
 * rows to compact (oracleId,setCode,foil) totals, records currentCollectionCount,
 * and writes the csv_uploads row that confirmUpload reads back.
 */
async function buildPreview(args: {
  userId: string;
  filename: string;
  rows: CollectionRow[];
  errors: ParseError[];
}): Promise<UploadPreview> {
  const { userId, filename, rows, errors } = args;

  if (rows.length === 0) {
    throw new Error(errors[0] ? `Parse failed: ${errors[0].reason}` : "No card rows to import");
  }

  const catalog = await db
    .select({ oracleId: cards.oracleId, scryfallId: cards.scryfallId, name: cards.name })
    .from(cards);
  const { matched, unmatched } = matchRows(rows, catalog);

  const agg = new Map<string, PendingItem>();
  for (const { row, oracleId } of matched) {
    const key = `${oracleId}|${row.setCode}|${row.foil}`;
    const existing = agg.get(key);
    if (existing) {
      existing.quantity += row.quantity;
      if (existing.condition !== row.condition) existing.condition = null;
    } else {
      agg.set(key, { oracleId, setCode: row.setCode, foil: row.foil, condition: row.condition, quantity: row.quantity });
    }
  }
  const pendingItems = [...agg.values()];
  const matchedCardCount = pendingItems.reduce((n, i) => n + i.quantity, 0);

  const [{ count: currentCollectionCount }] = await db
    .select({ count: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId));

  const unmatchedPayload = unmatched.map((r) => ({ name: r.name, setCode: r.setCode, line: r.line }));

  const [upload] = await db.insert(csvUploads).values({
    userId,
    filename,
    rowCount: rows.length,
    unmatchedCount: unmatched.length,
    previewPayload: {
      unmatched: unmatchedPayload,
      parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
      pendingItems,
    },
  }).returning({ id: csvUploads.id });

  return {
    uploadId: upload.id,
    matchedCardCount,
    unmatchedRows: unmatchedPayload,
    parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
    currentCollectionCount,
    filename,
    rowCount: rows.length,
  };
}

export async function previewUpload(formData: FormData): Promise<UploadPreview> {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No CSV file provided");
  if (file.size > 5 * 1024 * 1024) throw new Error("File too large (max 5 MB)");
  const { rows, errors } = parseCollectionCsv(await file.text());
  return buildPreview({ userId, filename: file.name, rows, errors });
}

export async function previewPaste(text: string): Promise<UploadPreview> {
  const userId = await requireUserId();
  // Byte-accurate cap — text.length counts UTF-16 code units, which lets
  // multi-byte input exceed the intended size guard.
  if (Buffer.byteLength(text, "utf8") > 100_000) throw new Error("Paste too large (max 100 KB)");
  const { rows, errors } = parsePasteList(text);
  return buildPreview({ userId, filename: "paste.txt", rows, errors });
}

export async function confirmUpload(uploadId: string): Promise<void> {
  const userId = await requireUserId();
  const [upload] = await db.select().from(csvUploads)
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  if (!upload) throw new Error("upload not found");

  const { pendingItems } = upload.previewPayload as { pendingItems: PendingItem[] };
  if (pendingItems.length === 0) throw new Error("Upload has no matched cards; refusing to replace collection");
  const values = pendingItems.map((v) => ({ userId, ...v }));
  await db.transaction(async (tx) => {
    await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(collectionItems).values(values.slice(i, i + 500));
    }
  });
  revalidatePath("/collection");
  revalidatePath("/");
}
```

- [ ] Temporarily update `src/components/collection/upload-entry.tsx` — the interim UI stays alive during Task 3–6 development; the only change is that `preview.unmatchedRows` now carries `line` (the existing UI ignores it, so no visible change). Grep-verify nothing else imports `ManaBoxRow` / `parseManaBoxCsv`:

```bash
pnpm typecheck
```

Expected: no errors. (If any file still imports the old names, rename inline.)

- [ ] Commit:

```bash
git add src/lib/manabox/paste.ts src/lib/manabox/paste.test.ts src/lib/collection/match.ts src/lib/collection/match.test.ts src/app/collection/actions.ts
git commit -m "refactor(collection): rename ManaBoxRow → CollectionRow, thread line number through preview"
```

---

### Task 3: Browse data layer — aggregation, filter, sort (TDD)

**Files:**
- Create: `src/lib/collection/browse.ts`
- Create: `src/lib/collection/browse.test.ts`

**Interfaces:**
- Produces: `export type BrowseCard = { oracleId: string; name: string; typeLine: string; manaCost: string | null; oracleText: string | null; rarity: "common" | "uncommon" | "rare" | "mythic"; colorIdentity: string[]; imageUri: string | null; quantity: number; setCodes: string[]; primarySetCode: string }`.
- Produces: `export type BrowseFilters = { search: string; colors: string[]; type: string | null; setCode: string | null }` — `colors` is a subset of `["W","U","B","R","G"]`; type is a coarse card type match (e.g. `"creature"`, matched case-insensitively against `typeLine`); setCode is one specific set filter.
- Produces: `export type SortKey = "name" | "quantity" | "set" | "rarity" | "color"` (READINESS #3).
- Produces: `export function aggregateCollection(rows: Array<{ oracleId: string; quantity: number; setCode: string; name: string; typeLine: string; manaCost: string | null; oracleText: string | null; rarity: string; colorIdentity: string[]; imageUri: string | null }>): BrowseCard[]` — groups by oracleId, sums quantity, collects distinct setCodes, picks `primarySetCode = min(setCodes)` lexicographic.
- Produces: `export function filterCards(cards: BrowseCard[], filters: BrowseFilters): BrowseCard[]` — search is case-insensitive substring on `name`; colors match if every filter color is in `colorIdentity` (AND semantics); type matches when `typeLine.toLowerCase().includes(filters.type.toLowerCase())`; setCode matches when ANY of `card.setCodes` (case-insensitive) equals `filters.setCode`.
- Produces: `export function sortCards(cards: BrowseCard[], sort: SortKey): BrowseCard[]` — returns a new array. Order per key: `name` = A→Z; `quantity` = desc (high first); `set` = primarySetCode A→Z then name A→Z; `rarity` = common < uncommon < rare < mythic then name A→Z; `color` = WUBRG position then multicolor (identity.length ≥ 2) then colorless, then name A→Z.
- Produces: `export async function loadBrowseCards(userId: string): Promise<BrowseCard[]>` — server query that joins `collection_items` × `cards` for the user and hands the raw rows to `aggregateCollection`. Marked `cache()` per the untested-query pattern.
- Produces: `export const AVAILABLE_TYPES = ["Creature","Instant","Sorcery","Artifact","Enchantment","Planeswalker","Land"] as const` — the coarse filter option list rendered in the Type dropdown.

Steps:

- [ ] Create `src/lib/collection/browse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  aggregateCollection,
  filterCards,
  sortCards,
  type BrowseCard,
} from "./browse";

const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o-1",
  name: "Sol Ring",
  typeLine: "Artifact",
  manaCost: "{1}",
  oracleText: "Tap: Add {C}{C}.",
  rarity: "uncommon",
  colorIdentity: [],
  imageUri: null,
  quantity: 1,
  setCodes: ["C21"],
  primarySetCode: "C21",
  ...over,
});

describe("aggregateCollection", () => {
  it("sums quantities across variants of the same oracle id", () => {
    const rows = [
      { oracleId: "o-1", quantity: 2, setCode: "C21", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: null, rarity: "uncommon", colorIdentity: [], imageUri: null },
      { oracleId: "o-1", quantity: 1, setCode: "LEA", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: null, rarity: "uncommon", colorIdentity: [], imageUri: null },
    ];
    const [agg] = aggregateCollection(rows);
    expect(agg.quantity).toBe(3);
    expect(agg.setCodes.sort()).toEqual(["C21", "LEA"]);
    expect(agg.primarySetCode).toBe("C21"); // min() lexicographic
  });
  it("keeps oracle metadata from the first row seen", () => {
    const rows = [
      { oracleId: "o-1", quantity: 1, setCode: "C21", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: "Tap: Add {C}{C}.", rarity: "uncommon", colorIdentity: [], imageUri: "img.png" },
    ];
    const [agg] = aggregateCollection(rows);
    expect(agg.imageUri).toBe("img.png");
    expect(agg.oracleText).toBe("Tap: Add {C}{C}.");
  });
});

describe("filterCards", () => {
  const list = [
    card({ oracleId: "a", name: "Sol Ring", colorIdentity: [], typeLine: "Artifact", setCodes: ["C21"], primarySetCode: "C21" }),
    card({ oracleId: "b", name: "Lightning Bolt", colorIdentity: ["R"], typeLine: "Instant", setCodes: ["2XM"], primarySetCode: "2XM" }),
    card({ oracleId: "c", name: "Cyclonic Rift", colorIdentity: ["U"], typeLine: "Instant", setCodes: ["RTR"], primarySetCode: "RTR" }),
    card({ oracleId: "d", name: "Shockingly Boring", colorIdentity: ["R", "U"], typeLine: "Sorcery", setCodes: ["MID"], primarySetCode: "MID" }),
  ];

  it("substring search is case-insensitive on name", () => {
    expect(filterCards(list, { search: "cyclonic", colors: [], type: null, setCode: null }).map((c) => c.oracleId)).toEqual(["c"]);
  });
  it("no filters returns everything (identity when empty search + no chips)", () => {
    expect(filterCards(list, { search: "", colors: [], type: null, setCode: null })).toHaveLength(4);
  });
  it("colors filter matches when EVERY selected color is in the card identity", () => {
    // R + U selected → only the R/U card matches
    expect(filterCards(list, { search: "", colors: ["R", "U"], type: null, setCode: null }).map((c) => c.oracleId)).toEqual(["d"]);
    // R alone matches both R and R/U cards
    expect(filterCards(list, { search: "", colors: ["R"], type: null, setCode: null }).map((c) => c.oracleId).sort()).toEqual(["b", "d"]);
  });
  it("type filter is case-insensitive substring on typeLine", () => {
    expect(filterCards(list, { search: "", colors: [], type: "instant", setCode: null }).map((c) => c.oracleId).sort()).toEqual(["b", "c"]);
  });
  it("setCode filter matches ANY of a card's variant sets, case-insensitive", () => {
    expect(filterCards(list, { search: "", colors: [], type: null, setCode: "rtr" }).map((c) => c.oracleId)).toEqual(["c"]);
  });
});

describe("sortCards", () => {
  it("name A→Z", () => {
    const list = [card({ oracleId: "a", name: "Cyclonic Rift" }), card({ oracleId: "b", name: "Ancestral Recall" })];
    expect(sortCards(list, "name").map((c) => c.name)).toEqual(["Ancestral Recall", "Cyclonic Rift"]);
  });
  it("quantity: high first", () => {
    const list = [card({ oracleId: "a", name: "A", quantity: 1 }), card({ oracleId: "b", name: "B", quantity: 4 })];
    expect(sortCards(list, "quantity").map((c) => c.quantity)).toEqual([4, 1]);
  });
  it("set: primarySetCode A→Z then name A→Z", () => {
    const list = [
      card({ oracleId: "a", name: "B", primarySetCode: "C21" }),
      card({ oracleId: "b", name: "A", primarySetCode: "C21" }),
      card({ oracleId: "c", name: "C", primarySetCode: "2XM" }),
    ];
    expect(sortCards(list, "set").map((c) => c.name)).toEqual(["C", "A", "B"]);
  });
  it("rarity: common < uncommon < rare < mythic, then name A→Z", () => {
    const list = [
      card({ oracleId: "a", name: "M", rarity: "mythic" }),
      card({ oracleId: "b", name: "C", rarity: "common" }),
      card({ oracleId: "c", name: "R", rarity: "rare" }),
      card({ oracleId: "d", name: "U", rarity: "uncommon" }),
    ];
    expect(sortCards(list, "rarity").map((c) => c.name)).toEqual(["C", "U", "R", "M"]);
  });
  it("color: WUBRG order, then multicolor, then colorless, then name A→Z", () => {
    const list = [
      card({ oracleId: "a", name: "Multi", colorIdentity: ["W", "U"] }),
      card({ oracleId: "b", name: "Colorless", colorIdentity: [] }),
      card({ oracleId: "c", name: "White", colorIdentity: ["W"] }),
      card({ oracleId: "d", name: "Blue", colorIdentity: ["U"] }),
      card({ oracleId: "e", name: "Red", colorIdentity: ["R"] }),
    ];
    expect(sortCards(list, "color").map((c) => c.name)).toEqual([
      "White", "Blue", "Red", "Multi", "Colorless",
    ]);
  });
  it("returns a new array — does not mutate input", () => {
    const list = [card({ oracleId: "a", name: "B" }), card({ oracleId: "b", name: "A" })];
    const copy = [...list];
    sortCards(list, "name");
    expect(list).toEqual(copy);
  });
});
```

- [ ] Run tests (expected: fail — no module).
- [ ] Create `src/lib/collection/browse.ts`:

```ts
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems } from "../../db/schema";

/** Rarity ordering for the "rarity" sort key. */
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

export type BrowseCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  rarity: "common" | "uncommon" | "rare" | "mythic";
  colorIdentity: string[];
  imageUri: string | null;
  quantity: number;
  setCodes: string[];
  primarySetCode: string;
};

export type BrowseFilters = {
  search: string;
  colors: string[];       // subset of ["W","U","B","R","G"]
  type: string | null;    // substring match against typeLine
  setCode: string | null; // matches any variant setCode, case-insensitive
};

export type SortKey = "name" | "quantity" | "set" | "rarity" | "color";

/** Coarse card-type options shown in the Type ▾ dropdown (property table §Filter Button). */
export const AVAILABLE_TYPES = [
  "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Land",
] as const;

type RawCollectionRow = {
  oracleId: string;
  quantity: number;
  setCode: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  rarity: string;
  colorIdentity: string[];
  imageUri: string | null;
};

/**
 * Aggregate collection_items × cards rows into one BrowseCard per oracleId.
 * Quantities sum across setCode/foil variants; setCodes collect distinct values;
 * primarySetCode = min(setCodes) lexicographic so the row/tile caption stays stable.
 */
export function aggregateCollection(rows: RawCollectionRow[]): BrowseCard[] {
  const byOracle = new Map<string, BrowseCard>();
  for (const r of rows) {
    const existing = byOracle.get(r.oracleId);
    if (existing) {
      existing.quantity += r.quantity;
      if (!existing.setCodes.includes(r.setCode)) existing.setCodes.push(r.setCode);
      if (r.setCode < existing.primarySetCode) existing.primarySetCode = r.setCode;
    } else {
      byOracle.set(r.oracleId, {
        oracleId: r.oracleId,
        name: r.name,
        typeLine: r.typeLine,
        manaCost: r.manaCost,
        oracleText: r.oracleText,
        rarity: (RARITY_ORDER[r.rarity] !== undefined ? r.rarity : "common") as BrowseCard["rarity"],
        colorIdentity: r.colorIdentity,
        imageUri: r.imageUri,
        quantity: r.quantity,
        setCodes: [r.setCode],
        primarySetCode: r.setCode,
      });
    }
  }
  return [...byOracle.values()];
}

export function filterCards(list: BrowseCard[], f: BrowseFilters): BrowseCard[] {
  const search = f.search.trim().toLowerCase();
  const type = f.type?.toLowerCase() ?? null;
  const setCode = f.setCode?.toLowerCase() ?? null;
  return list.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search)) return false;
    if (f.colors.length > 0) {
      const id = new Set(c.colorIdentity);
      for (const col of f.colors) if (!id.has(col)) return false;
    }
    if (type && !c.typeLine.toLowerCase().includes(type)) return false;
    if (setCode && !c.setCodes.some((s) => s.toLowerCase() === setCode)) return false;
    return true;
  });
}

function colorSortKey(identity: string[]): number {
  if (identity.length === 0) return 100;         // colorless last
  if (identity.length >= 2) return 50;           // multicolor after monocolor
  return WUBRG_ORDER[identity[0]] ?? 40;         // mono: WUBRG position (0–4)
}

export function sortCards(list: BrowseCard[], sort: SortKey): BrowseCard[] {
  const copy = [...list];
  switch (sort) {
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      return copy;
    case "quantity":
      copy.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
      return copy;
    case "set":
      copy.sort((a, b) => a.primarySetCode.localeCompare(b.primarySetCode) || a.name.localeCompare(b.name));
      return copy;
    case "rarity":
      copy.sort((a, b) => (RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]) || a.name.localeCompare(b.name));
      return copy;
    case "color":
      copy.sort((a, b) => (colorSortKey(a.colorIdentity) - colorSortKey(b.colorIdentity)) || a.name.localeCompare(b.name));
      return copy;
  }
}

/**
 * Server query — joins collection_items × cards for the user and aggregates.
 * Untested-query pattern (see recommend.ts / summary.ts): thin, logic-free SQL,
 * pure aggregation covered by tests above.
 */
export const loadBrowseCards = cache(async function loadBrowseCards(
  userId: string,
): Promise<BrowseCard[]> {
  const rows = await db
    .select({
      oracleId: collectionItems.oracleId,
      quantity: collectionItems.quantity,
      setCode: collectionItems.setCode,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      oracleText: cards.oracleText,
      rarity: cards.rarity,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(eq(collectionItems.userId, userId));
  return aggregateCollection(rows);
});
```

- [ ] Run `pnpm test src/lib/collection/browse.test.ts` — expected: all pass.
- [ ] Commit:

```bash
git add src/lib/collection/browse.ts src/lib/collection/browse.test.ts
git commit -m "feat(collection): browse aggregation, filter, sort primitives + server query"
```

---

### Task 4: Filter bar + chip row + view toggle (client, URL-synced)

**Files:**
- Create: `src/components/collection/browser.tsx`
- Create: `src/components/collection/filter-bar.tsx`
- Create: `src/components/collection/chip-row.tsx`
- Create: `src/components/collection/color-pip.tsx`

**Interfaces:**
- Produces: `<CollectionBrowser cards={BrowseCard[]} />` — top-level client component. Reads URL query params on mount (via `useSearchParams()`), holds derived filter/sort state, mirrors mutations to `router.replace(url, { scroll: false })` (shallow). Runs `filterCards` + `sortCards` inside `useMemo` keyed on `[cards, filters, sort]`. Renders `<FilterBar>` + `<ChipRow>` + slot for view (Task 5) + slot for modal (Task 6). Owns windowed pagination state (`shown: number`, initial 200, `+200` per "Show more") — reset to 200 whenever filters/sort change.
- Produces: `<FilterBar filters, sort, view, onChange />` — sticky bar per §Filter Bar. Search input, WUBRG pip selector (desktop) / `Color` button (mobile), Type ▾ / Set ▾ / Sort ▾ dropdowns, view toggle segmented.
- Produces: `<ChipRow filters, sort, resultCount, uniqueCount, totalQuantity, onClearAll, onRemove />` — chips per §Filter Chip Row; result count label right-aligned (mobile "N results", desktop variants incl. no-filters "No filters active · Showing X unique · Y total"); turns `#E0913C` when `resultCount === 0`.
- Produces: `<ColorPip color, selected, onToggle />` — the WUBRG pip primitive used both inside the filter bar and inside chips (`color` is one of `W|U|B|R|G`).
- Consumes: `BrowseCard[]` from Task 3, URL param names (`q`, `c`, `t`, `s`, `sort`, `view`, `card`).

Steps:

- [ ] Create `src/components/collection/color-pip.tsx`:

```tsx
"use client";
// WUBRG pip primitive — per property table §WUBRG Color Pip / §WUBRG Pip Colors.
// Design table uses raw hexes (not brand tokens) for these five swatches.
const COLOR_HEX: Record<string, string> = {
  W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63",
};

export function ColorPip({
  color,
  selected,
  onToggle,
  size = 15,
}: {
  color: "W" | "U" | "B" | "R" | "G";
  selected: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      aria-label={`Filter by ${color}`}
      onClick={onToggle}
      className={[
        "rounded-full transition-opacity",
        // selected uses brand focus-visible outline treatment inherited from globals.css
        selected ? "opacity-100" : "opacity-40",
      ].join(" ")}
      style={{
        width: size,
        height: size,
        background: COLOR_HEX[color],
        boxShadow: selected
          ? "0 0 0 2px var(--brass)"                  // selected ring
          : "inset 0 0 0 1px rgba(0,0,0,0.3)",        // inactive shadow
      }}
    />
  );
}
```

- [ ] Create `src/components/collection/chip-row.tsx`:

```tsx
"use client";
// Filter chips per property table §Filter Chip Row.
// The row + chip pills are wrapped in table-exact px/hex values below.

import type { BrowseFilters, SortKey } from "../../lib/collection/browse";

const COLOR_DOT_HEX: Record<string, string> = {
  W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63",
};

const SORT_LABEL: Record<SortKey, string> = {
  name: "Sort: Name", quantity: "Sort: Quantity", set: "Sort: Set",
  rarity: "Sort: Rarity", color: "Sort: Color",
};

export function ChipRow({
  filters,
  sort,
  resultCount,
  uniqueCount,
  totalQuantity,
  onClearAll,
  onRemoveColor,
  onClearType,
  onClearSet,
  onClearSearch,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  resultCount: number;
  uniqueCount: number;
  totalQuantity: number;
  onClearAll: () => void;
  onRemoveColor: (c: string) => void;
  onClearType: () => void;
  onClearSet: () => void;
  onClearSearch: () => void;
}) {
  const anyActive =
    filters.search.trim() !== "" ||
    filters.colors.length > 0 ||
    filters.type !== null ||
    filters.setCode !== null;

  // Result count copy per §Result Count Label / §Copy (result count variants).
  // uniqueCount = distinct cards in the whole collection; totalQuantity = sum of
  // quantities across the whole collection (the "2,933" in the design copy).
  const desktopCopy = anyActive
    ? `Showing ${resultCount.toLocaleString()} of ${totalQuantity.toLocaleString()}`
    : `No filters active · Showing ${uniqueCount.toLocaleString()} unique · ${totalQuantity.toLocaleString()} total`;
  const mobileCopy = `${resultCount.toLocaleString()} results`;

  return (
    // Container: display flex, gap 6px mobile / 8px desktop, margin-top 10px mobile / 12px desktop, flex-wrap wrap on mobile.
    <div className="mt-[10px] md:mt-[12px] flex flex-wrap md:flex-nowrap items-center gap-[6px] md:gap-[8px]">
      {/* Desktop-only "FILTERS:" label per §"FILTERS:" Label */}
      {anyActive && (
        <span className="hidden md:inline font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
          FILTERS:
        </span>
      )}

      {/* Search chip */}
      {filters.search.trim() !== "" && (
        <Chip label={`"${filters.search.trim()}"`} onRemove={onClearSearch} />
      )}
      {/* Color chips — leading colored dot */}
      {filters.colors.map((c) => (
        <Chip
          key={c}
          label={c}
          leadingDot={COLOR_DOT_HEX[c]}
          onRemove={() => onRemoveColor(c)}
        />
      ))}
      {/* Type chip */}
      {filters.type && <Chip label={filters.type} onRemove={onClearType} />}
      {/* Set chip */}
      {filters.setCode && <Chip label={filters.setCode} onRemove={onClearSet} />}

      {/* Sort chip — non-removable, shows current sort */}
      {sort !== "name" && (
        <span
          className="inline-flex items-center rounded-full font-sans text-[12px] md:text-[12.5px] px-[9px] py-[5px] md:pr-[8px] md:pl-[11px]"
          style={{
            color: "var(--fg)",
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {SORT_LABEL[sort]}
        </span>
      )}

      {/* "Clear all" link */}
      {anyActive && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-[2px] text-[12px]"
          style={{ color: "var(--brass)" }}
        >
          Clear all
        </button>
      )}

      {/* Result count — right-aligned, turns amber when zero. Mobile shows the
          short "N results" variant; desktop shows the full variants per
          §Copy (result count variants). */}
      <span
        className="md:hidden font-mono text-[11px]"
        style={{ color: resultCount === 0 ? "var(--warning)" : "var(--fg-faint)" }}
      >
        {mobileCopy}
      </span>
      <span
        className="hidden md:inline md:ml-auto font-mono text-[11px]"
        style={{ color: resultCount === 0 ? "var(--warning)" : "var(--fg-faint)" }}
      >
        {desktopCopy}
      </span>
    </div>
  );
}

function Chip({
  label,
  leadingDot,
  onRemove,
}: {
  label: string;
  leadingDot?: string;
  onRemove: () => void;
}) {
  return (
    // Chip per §Filter Chip: inline-flex, gap 6/7px, font 12/12.5px, radius 999px,
    // bg #2A241D (--elevated), border 1px #3A3229 (--border-strong)
    <span
      className="inline-flex items-center rounded-full font-sans text-[12px] md:text-[12.5px] gap-[6px] md:gap-[7px] px-[9px] py-[5px] md:pl-[11px] md:pr-[8px]"
      style={{
        color: "var(--fg)",
        background: "var(--elevated)",
        border: "1px solid var(--border-strong)",
      }}
    >
      {leadingDot && (
        // §Filter Chip WUBRG Dot: 9×9 rounded 999px
        <span
          aria-hidden
          className="rounded-full"
          style={{ width: 9, height: 9, background: leadingDot }}
        />
      )}
      {label}
      {/* Dismiss "✕" — §Filter Chip Dismiss, color #8E8269 (--fg-faint) */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="cursor-pointer"
        style={{ color: "var(--fg-faint)" }}
      >
        ✕
      </button>
    </span>
  );
}
```

- [ ] Create `src/components/collection/filter-bar.tsx`:

```tsx
"use client";
// Filter bar per property table §Filter Bar.
// Sticky top:0 on desktop; horizontal scroll on mobile.
// Position dropdowns are native <select> for a11y + parity; visual chrome
// matches the §Filter Button spec (radius 999px mobile / 8px desktop).

import { useEffect, useState } from "react";
import { AVAILABLE_TYPES, type BrowseFilters, type SortKey } from "../../lib/collection/browse";
import { ColorPip } from "./color-pip";

const WUBRG = ["W", "U", "B", "R", "G"] as const;

export type ViewMode = "rows" | "grid";

// Placeholder copy differs by breakpoint (§Copy (placeholders)) and the
// placeholder attribute can't vary via CSS, so track the md breakpoint.
// SSR/first paint uses the mobile copy; the effect corrects it post-hydration.
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

export function FilterBar({
  filters,
  sort,
  view,
  availableSetCodes,
  onFiltersChange,
  onSortChange,
  onViewChange,
}: {
  filters: BrowseFilters;
  sort: SortKey;
  view: ViewMode;
  availableSetCodes: string[];
  onFiltersChange: (f: BrowseFilters) => void;
  onSortChange: (s: SortKey) => void;
  onViewChange: (v: ViewMode) => void;
}) {
  const isDesktop = useIsDesktop();

  function toggleColor(c: string) {
    const has = filters.colors.includes(c);
    onFiltersChange({
      ...filters,
      colors: has ? filters.colors.filter((x) => x !== c) : [...filters.colors, c],
    });
  }

  return (
    // §Filter Bar Container: sticky top:0 desktop, bg #14110E (--bg), padding 18px 34px 14px desktop, border-bottom 1px #2A241D (--border), z-index 2
    <div
      className="md:sticky md:top-0 md:z-[2] px-[16px] md:px-[34px] py-[14px] md:py-[18px]"
      style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
    >
      {/* §Filter Row: display flex, align center, gap 8px mobile / 12px desktop, horizontal-scroll on mobile */}
      <div className="flex items-center gap-[8px] md:gap-[12px] overflow-x-auto md:overflow-visible">
        {/* Search input — §Search Input: bg #181410 (--surface-sunken), border 1px #3A3229 (--border-strong), radius 8px, padding 9px 12px mobile / 10px 14px desktop */}
        <label
          className="flex items-center gap-[8px] md:gap-[10px] md:flex-1 rounded-lg px-[12px] md:px-[14px] py-[9px] md:py-[10px]"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {/* §Search Icon: #8E8269 (--fg-faint), 14/15px */}
          <span aria-hidden style={{ color: "var(--fg-faint)", fontSize: 15 }}>⌕</span>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder={isDesktop ? "Search by card name…" : "Search your cards…"}
            aria-label="Search your cards"
            className="min-w-0 flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: "var(--fg)" }}
          />
        </label>

        {/* WUBRG pip selector (desktop) — §Color Filter */}
        <div
          className="hidden md:flex items-center gap-[6px] rounded-lg px-[10px] py-[7px]"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {/* §Color Filter Label "COLOR" — mono 10px, #8E8269 (--fg-faint), letter-spacing 0.1em, margin-right 2px */}
          <span className="font-mono text-[10px] mr-[2px] tracking-[0.1em]" style={{ color: "var(--fg-faint)" }}>
            COLOR
          </span>
          {WUBRG.map((c) => (
            <ColorPip
              key={c}
              color={c}
              selected={filters.colors.includes(c)}
              onToggle={() => toggleColor(c)}
            />
          ))}
        </div>

        {/* Mobile "Color" pill — opens a stacked color chooser. Uses the same
            filter-button styling as Type/Set/Sort. Cycles through WUBRG one tap at a time. */}
        <details className="md:hidden">
          <summary
            className="cursor-pointer list-none whitespace-nowrap rounded-full px-[12px] py-[6px] font-sans text-[12.5px] font-medium"
            style={{
              color: "var(--fg)",
              background: "var(--elevated)",
              border: "1px solid var(--border-strong)",
            }}
          >
            Color
          </summary>
          <div className="mt-2 flex gap-2 p-2 rounded-lg" style={{ background: "var(--surface-sunken)", border: "1px solid var(--border-strong)" }}>
            {WUBRG.map((c) => (
              <ColorPip
                key={c}
                color={c}
                selected={filters.colors.includes(c)}
                onToggle={() => toggleColor(c)}
              />
            ))}
          </div>
        </details>

        {/* Type ▾ */}
        <select
          value={filters.type ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || null })}
          aria-label="Filter by type"
          className="whitespace-nowrap rounded-full md:rounded-lg font-sans text-[12.5px] md:text-[13px] font-medium px-[12px] md:px-[14px] py-[6px] md:py-[9px] cursor-pointer"
          style={{
            color: "var(--fg)",
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <option value="">Type ▾</option>
          {AVAILABLE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Set ▾ */}
        <select
          value={filters.setCode ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, setCode: e.target.value || null })}
          aria-label="Filter by set"
          className="whitespace-nowrap rounded-full md:rounded-lg font-sans text-[12.5px] md:text-[13px] font-medium px-[12px] md:px-[14px] py-[6px] md:py-[9px] cursor-pointer"
          style={{
            color: "var(--fg)",
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <option value="">Set ▾</option>
          {availableSetCodes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Sort ▾ — mobile shows "A–Z ▾", desktop shows "Sort: Name ▾" */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          aria-label="Sort cards"
          className="whitespace-nowrap rounded-full md:rounded-lg font-sans text-[12.5px] md:text-[13px] font-medium px-[12px] md:px-[14px] py-[6px] md:py-[9px] cursor-pointer"
          style={{
            color: "var(--fg)",
            background: "var(--elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <option value="name">Sort: Name</option>
          <option value="quantity">Sort: Quantity</option>
          <option value="set">Sort: Set</option>
          <option value="rarity">Sort: Rarity</option>
          <option value="color">Sort: Color</option>
        </select>

        {/* View toggle — §View Toggle Container: bg #181410 (--surface-sunken), border 1px #3A3229 (--border-strong), radius 8px, padding 2px, gap 2px */}
        <div
          className="flex gap-[2px] md:ml-[2px] rounded-lg p-[2px]"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {(["rows", "grid"] as const).map((v) => {
            const active = v === view;
            return (
              <button
                key={v}
                type="button"
                aria-label={`${v === "rows" ? "Rows" : "Grid"} view`}
                aria-pressed={active}
                onClick={() => onViewChange(v)}
                // §View Toggle Segment: 28×24 mobile / 30×28 desktop, radius 6px, font 12/13px
                className="flex items-center justify-center rounded-md text-[12px] md:text-[13px] w-[28px] h-[24px] md:w-[30px] md:h-[28px]"
                style={{
                  background: active ? "var(--brass)" : "transparent",
                  color: active ? "var(--bg)" : "var(--fg-faint)",
                }}
              >
                {v === "rows" ? "≣" : "▦"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] Create `src/components/collection/browser.tsx`:

```tsx
"use client";
// Top-level collection browse client component.
// Owns filter/sort/view/window/modal state, mirrors to URL query params
// (?q= &c= &t= &s= &sort= &view= &card=) via router.replace shallow so
// chips + view + open card deep-link (READINESS #6).

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  filterCards,
  sortCards,
  type BrowseCard,
  type BrowseFilters,
  type SortKey,
} from "../../lib/collection/browse";
import { FilterBar, type ViewMode } from "./filter-bar";
import { ChipRow } from "./chip-row";
import { RowsView } from "./rows-view";
import { GridView } from "./grid-view";
import { NoResults } from "./no-results";
import { CardModal } from "./card-modal";

const PAGE_SIZE = 200;
const SORT_KEYS = ["name", "quantity", "set", "rarity", "color"] as const satisfies readonly SortKey[];

function parseColors(param: string | null): string[] {
  if (!param) return [];
  return param.split("").filter((c) => "WUBRG".includes(c));
}

function serializeParams(filters: BrowseFilters, sort: SortKey, view: ViewMode, card: string | null): string {
  const p = new URLSearchParams();
  if (filters.search.trim()) p.set("q", filters.search.trim());
  if (filters.colors.length > 0) p.set("c", filters.colors.join(""));
  if (filters.type) p.set("t", filters.type);
  if (filters.setCode) p.set("s", filters.setCode);
  if (sort !== "name") p.set("sort", sort);
  if (view !== "grid") p.set("view", view);  // grid is the default → omit
  if (card) p.set("card", card);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function CollectionBrowser({
  cards,
  defaultView,
}: {
  cards: BrowseCard[];
  defaultView: ViewMode;
}) {
  const router = useRouter();
  const search = useSearchParams();

  const [filters, setFilters] = useState<BrowseFilters>(() => ({
    search: search.get("q") ?? "",
    colors: parseColors(search.get("c")),
    type: search.get("t"),
    setCode: search.get("s"),
  }));
  // Guard query params — shared URLs can carry unknown values; fall back to defaults.
  const [sort, setSort] = useState<SortKey>(() => {
    const s = search.get("sort");
    return s !== null && (SORT_KEYS as readonly string[]).includes(s) ? (s as SortKey) : "name";
  });
  const [view, setView] = useState<ViewMode>(() => {
    const v = search.get("view");
    return v === "rows" || v === "grid" ? v : defaultView;
  });
  const [openCardId, setOpenCardId] = useState<string | null>(() => search.get("card"));
  const [shown, setShown] = useState(PAGE_SIZE);

  // Push state → URL. Shallow via router.replace so it doesn't refetch the RSC.
  useEffect(() => {
    const qs = serializeParams(filters, sort, view, openCardId);
    router.replace(`/collection${qs}`, { scroll: false });
  }, [filters, sort, view, openCardId, router]);

  // Any filter/sort change resets the window.
  useEffect(() => { setShown(PAGE_SIZE); }, [filters, sort]);

  const availableSetCodes = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) for (const sc of c.setCodes) s.add(sc);
    return [...s].sort();
  }, [cards]);

  const totalQuantity = useMemo(() => cards.reduce((sum, c) => sum + c.quantity, 0), [cards]);

  const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const sorted = useMemo(() => sortCards(filtered, sort), [filtered, sort]);
  const windowed = useMemo(() => sorted.slice(0, shown), [sorted, shown]);

  const openCard = useMemo(
    () => (openCardId ? sorted.find((c) => c.oracleId === openCardId) ?? null : null),
    [openCardId, sorted],
  );
  const openIndex = useMemo(
    () => (openCard ? sorted.findIndex((c) => c.oracleId === openCard.oracleId) : -1),
    [openCard, sorted],
  );

  const onOpen = useCallback((id: string) => setOpenCardId(id), []);
  const onClose = useCallback(() => setOpenCardId(null), []);
  const onPrev = useCallback(() => {
    if (openIndex > 0) setOpenCardId(sorted[openIndex - 1].oracleId);
  }, [openIndex, sorted]);
  const onNext = useCallback(() => {
    if (openIndex >= 0 && openIndex < sorted.length - 1) setOpenCardId(sorted[openIndex + 1].oracleId);
  }, [openIndex, sorted]);

  return (
    <>
      <FilterBar
        filters={filters}
        sort={sort}
        view={view}
        availableSetCodes={availableSetCodes}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        onViewChange={setView}
      />
      <div className="px-[16px] md:px-[34px]">
        <ChipRow
          filters={filters}
          sort={sort}
          resultCount={sorted.length}
          uniqueCount={cards.length}
          totalQuantity={totalQuantity}
          onClearAll={() => {
            setFilters({ search: "", colors: [], type: null, setCode: null });
            setSort("name");
          }}
          onRemoveColor={(c) => setFilters({ ...filters, colors: filters.colors.filter((x) => x !== c) })}
          onClearType={() => setFilters({ ...filters, type: null })}
          onClearSet={() => setFilters({ ...filters, setCode: null })}
          onClearSearch={() => setFilters({ ...filters, search: "" })}
        />
      </div>

      {sorted.length === 0 ? (
        <NoResults
          query={filters.search}
          totalCount={totalQuantity}
          onClearAll={() => {
            setFilters({ search: "", colors: [], type: null, setCode: null });
            setSort("name");
          }}
          onKeepSearch={() => setFilters({ search: filters.search, colors: [], type: null, setCode: null })}
        />
      ) : view === "rows" ? (
        <RowsView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown(shown + PAGE_SIZE)} onOpen={onOpen} />
      ) : (
        <GridView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown(shown + PAGE_SIZE)} onOpen={onOpen} />
      )}

      {openCard && (
        <CardModal
          card={openCard}
          position={openIndex + 1}
          total={sorted.length}
          onClose={onClose}
          onPrev={openIndex > 0 ? onPrev : null}
          onNext={openIndex < sorted.length - 1 ? onNext : null}
        />
      )}
    </>
  );
}
```

- [ ] Verify: `pnpm typecheck` — expected to fail because `rows-view`, `grid-view`, `no-results`, `card-modal` do not exist yet. That's fine: this task commits the filter/chip/toggle machinery; Tasks 5–6 add the missing children.
- [ ] Skip typecheck until Task 6; stub the four missing files as empty exports to unblock typecheck if you want a clean commit here:

```bash
# Optional stubs so pnpm typecheck passes at this task boundary
mkdir -p src/components/collection
for f in rows-view grid-view no-results card-modal; do
  cat > src/components/collection/$f.tsx <<'TSX'
"use client";
// Stub — implemented in Task 5/6.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RowsView(_props: any) { return null; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GridView(_props: any) { return null; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function NoResults(_props: any) { return null; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CardModal(_props: any) { return null; }
TSX
done
```

Only the matching named export in each stub file is imported by browser.tsx; delete the extras before running typecheck. (Simplest path: create four files, each exporting its own single named component.) Rewrite each stub to export exactly the symbol imported by `browser.tsx` (`RowsView` in rows-view.tsx, etc.).

- [ ] Run `pnpm typecheck` — expected: pass.
- [ ] Commit:

```bash
git add src/components/collection/color-pip.tsx src/components/collection/chip-row.tsx src/components/collection/filter-bar.tsx src/components/collection/browser.tsx src/components/collection/rows-view.tsx src/components/collection/grid-view.tsx src/components/collection/no-results.tsx src/components/collection/card-modal.tsx
git commit -m "feat(collection): filter bar, chip row, view toggle + browser shell (URL-synced)"
```

---

### Task 5: Rows view + Grid view + No-results state

**Files:**
- Rewrite: `src/components/collection/rows-view.tsx`
- Rewrite: `src/components/collection/grid-view.tsx`
- Rewrite: `src/components/collection/no-results.tsx`
- Create: `src/lib/collection/gradients.ts`

**Interfaces:**
- Produces (gradients.ts): `export function identityGradient(identity: string[]): string` — returns a CSS `linear-gradient(...)` string per §Art Placeholder Gradients (per identity: W/U/B/R/G/C, plus a 125° blend for 2-color; ≥3 color returns the multi 2-color blend of the first two identities).
- Produces (rows-view.tsx): `<RowsView cards, totalCards, onShowMore, onOpen />` — dense-row list per §Collection Row (State 1a). Row grid `52 / 54 / 1fr / 150 / 92 / 18` desktop, `38 / 40 / 1fr / auto` mobile. Trailing "Show more" button when `cards.length < totalCards`.
- Produces (grid-view.tsx): `<GridView cards, totalCards, onShowMore, onOpen />` — art tile grid per §Grid Tile (State 1b). 2-up mobile / 5-up desktop; art region gets `identityGradient` when `imageUri` is null (READINESS #4). Trailing "Show more" button.
- Produces (no-results.tsx): `<NoResults query, totalCount, onClearAll, onKeepSearch />` — full §No Results State (CardFan mark from marks.tsx, heading, body copy per query, CTAs).

Steps:

- [ ] Create `src/lib/collection/gradients.ts`:

```ts
// Color-identity gradient placeholders — property table §Art Placeholder Gradients.
// Used by the grid tile art region and the modal's mobile art header when
// imageUri is null (READINESS #4).

const MONO: Record<string, string> = {
  W: "linear-gradient(150deg, #efe9d8, #cbbf9c 58%, #9d8f6b)",
  U: "linear-gradient(150deg, #6a9bcb, #305c88 58%, #1c3a57)",
  B: "linear-gradient(150deg, #5a5464, #2c2833 58%, #17151d)",
  R: "linear-gradient(150deg, #cf7157, #8c3627 58%, #571f16)",
  G: "linear-gradient(150deg, #84b277, #406f3b 58%, #264823)",
};
const COLORLESS = "linear-gradient(150deg, #b3a488, #726755 58%, #453e31)";

// 2-color blend palette — light + mid for each identity, used by the multi blend.
const LIGHT: Record<string, string> = { W: "#efe9d8", U: "#6a9bcb", B: "#5a5464", R: "#cf7157", G: "#84b277" };
const MID: Record<string, string>   = { W: "#cbbf9c", U: "#305c88", B: "#2c2833", R: "#8c3627", G: "#406f3b" };

export function identityGradient(identity: string[]): string {
  if (identity.length === 0) return COLORLESS;
  if (identity.length === 1) return MONO[identity[0]] ?? COLORLESS;
  // 2+ colors: use the first two per §Art Placeholder Gradients "Multi (2-color)"
  const [a, b] = identity;
  return `linear-gradient(125deg, ${MID[a]}, ${LIGHT[a]} 40%, ${LIGHT[b]} 60%, ${MID[b]})`;
}
```

- [ ] Rewrite `src/components/collection/rows-view.tsx`:

```tsx
"use client";
// Dense rows view per property table §Collection Row (State 1a).
// Grid columns:
//   mobile:  38px 40px 1fr auto              (qty · pips · name+type · set)
//   desktop: 52px 54px 1fr 150px 92px 18px   (qty · pips · name · type · set/rarity · chevron)
// Rarity dot colors per §Rarity Dot Colors.

import type { BrowseCard } from "../../lib/collection/browse";

const RARITY_DOT: Record<BrowseCard["rarity"], string> = {
  common: "#A89B84", uncommon: "#B7C4CE", rare: "#C9A24B", mythic: "#E0913C",
};

const COLOR_HEX: Record<string, string> = {
  W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63",
};

export function RowsView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
}: {
  cards: BrowseCard[];
  totalCards: number;
  onShowMore: () => void;
  onOpen: (oracleId: string) => void;
}) {
  return (
    // §Rows Scroll Container: flex-1, padding 2px 12px 12px mobile / 12px 34px 34px desktop, flex column, gap 6/7px
    <div className="flex-1 flex flex-col gap-[6px] md:gap-[7px] px-[12px] md:px-[34px] pt-[2px] md:pt-[12px] pb-[12px] md:pb-[34px]">
      {cards.map((c) => (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          // §Row Container: grid template columns, gap 10/16px, padding 10px 12px / 12px 18px, radius 8px, bg #1E1A15 (--surface), border 1px #2A241D (--border)
          className="grid items-center text-left rounded-lg gap-[10px] md:gap-[16px] py-[10px] md:py-[12px] px-[12px] md:px-[18px] md:cursor-pointer hover:bg-[color:var(--surface-raised)] hover:[border:1px_solid_var(--border-strong)]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            gridTemplateColumns: "38px 40px 1fr auto",
          }}
        >
          {/* Force desktop grid via inline media query fallback: use a data attribute + tailwind class */}
          {/* Quantity — §Row: Quantity Column: mono 13px mobile / 14px desktop, #C9A24B (--brass), font-weight 500 */}
          <span className="font-mono text-[13px] md:text-[14px] font-medium" style={{ color: "var(--brass)" }}>
            ×{c.quantity}
          </span>

          {/* Color pips — §Row: Color Pip Container: gap 3/4px; pips 11×11 mobile / 13×13 desktop */}
          <span className="flex gap-[3px] md:gap-[4px]">
            {c.colorIdentity.length === 0 ? (
              <span
                aria-hidden
                className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-full"
                style={{ background: "#8E8269", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
              />
            ) : c.colorIdentity.map((col) => (
              <span
                key={col}
                aria-hidden
                className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-full"
                style={{ background: COLOR_HEX[col] ?? "#8E8269", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
              />
            ))}
          </span>

          {/* Name column — §Row: Name Column Container: min-width 0 */}
          <span className="min-w-0">
            {/* §Row: Card Name — 14/15px 600, #EDE6D8 (--fg), ellipsis */}
            <span className="block truncate text-[14px] md:text-[15px] font-semibold" style={{ color: "var(--fg)" }}>
              {c.name}
            </span>
            {/* Mobile type line — §Row: Type Line (mobile): 11.5px, #8E8269 (--fg-faint), truncate */}
            <span className="block md:hidden truncate text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
              {c.typeLine}
            </span>
          </span>

          {/* Desktop-only extra columns — the fourth column onward is emulated
              via a hidden desktop grid layer. Simpler approach: two nested spans
              rendered as separate row items rather than reshuffling grid on md.
              We render mobile's "set code" and desktop's "type / set-rarity / chevron"
              inline; CSS grid auto-flow places them in the trailing "auto" column
              on mobile (single set code) and the four desktop columns above. */}
          <SetRarityColumn card={c} />
        </button>
      ))}

      {cards.length < totalCards && (
        <button
          type="button"
          onClick={onShowMore}
          className="mt-[6px] mx-auto rounded-lg font-sans text-[13px] font-semibold px-[16px] py-[9px]"
          style={{
            color: "var(--brass)",
            background: "transparent",
            border: "1px solid var(--border-strong)",
          }}
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </button>
      )}
    </div>
  );
}

function SetRarityColumn({ card }: { card: BrowseCard }) {
  return (
    <>
      {/* Mobile: single trailing set code — §Row: Set Code (mobile): mono 10.5px, #8E8269 (--fg-faint), letter-spacing 0.04em */}
      <span
        className="md:hidden font-mono text-[10.5px] tracking-[0.04em] text-right"
        style={{ color: "var(--fg-faint)" }}
      >
        {card.primarySetCode}
      </span>

      {/* Desktop desktop-only trailing spans — displayed only ≥md */}
      <span
        className="hidden md:block truncate font-sans text-[12.5px]"
        style={{ color: "var(--fg-muted)" }}
      >
        {card.typeLine}
      </span>
      <span className="hidden md:flex items-center gap-[8px]">
        <span
          aria-hidden
          className="w-[7px] h-[7px] rounded-full block"
          style={{ background: RARITY_DOT[card.rarity] }}
        />
        <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {card.primarySetCode}
        </span>
      </span>
      <span className="hidden md:block text-[14px]" style={{ color: "#6A6152" }}>
        ›
      </span>
    </>
  );
}
```

> Note on the row grid: the mobile template is `38px 40px 1fr auto`; the desktop template is `52px 54px 1fr 150px 92px 18px`. Because we can't switch grid-template-columns via Tailwind arbitrary values reliably without a second layer, add the desktop grid template via a `md:` arbitrary variant on the button (append `md:[grid-template-columns:52px_54px_1fr_150px_92px_18px]` to the button `className`) and switch gap/padding accordingly. The mobile-only trailing `<span>` above ends up in column 4; the three desktop-only trailing `<span>`s land in columns 4/5/6 at ≥md (mobile's `md:hidden` guard hides the mobile one on desktop so the auto column is skipped, and desktop's `hidden md:block` guards keep them out of the mobile row entirely).

- [ ] Edit rows-view.tsx to append `md:[grid-template-columns:52px_54px_1fr_150px_92px_18px]` inside the button's `className` (comma-joined in the same className string). Also append `md:gap-[16px]` and `md:py-[12px] md:px-[18px]` if the base classes already include mobile paddings; verify by tracing the compiled Tailwind output in `pnpm build`.

- [ ] Rewrite `src/components/collection/grid-view.tsx`:

```tsx
"use client";
// Card-art gallery per property table §Grid Tile (State 1b).
// Grid: 2-up mobile / 5-up desktop.
// Missing art → color-identity gradient (READINESS #4).

import type { BrowseCard } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";

export function GridView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
}: {
  cards: BrowseCard[];
  totalCards: number;
  onShowMore: () => void;
  onOpen: (oracleId: string) => void;
}) {
  return (
    // §Grid Container: grid, 1fr 1fr mobile / repeat(5,1fr) desktop, gap 12/16px, padding 4px 14px 14px mobile / 20px 34px 34px desktop
    <div className="grid grid-cols-2 md:grid-cols-5 gap-[12px] md:gap-[16px] px-[14px] md:px-[34px] pt-[4px] md:pt-[20px] pb-[14px] md:pb-[34px]">
      {cards.map((c) => (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          // §Grid Tile Container: radius 9/10px, overflow hidden, bg #1E1A15 (--surface), border 1px #2A241D (--border)
          className="text-left overflow-hidden rounded-[9px] md:rounded-[10px] md:cursor-pointer hover:[border:1px_solid_var(--brass)]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Art region — §Grid Tile: Art Region */}
          <div
            className="relative"
            style={{
              aspectRatio: "63/88",
              background: c.imageUri ? undefined : identityGradient(c.colorIdentity),
              backgroundImage: c.imageUri ? `url(${c.imageUri})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              // Inset shadows per §Grid Tile: Art Region
              boxShadow: "inset 0 -50px 50px -34px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.25)",
            }}
          >
            {/* §Grid Tile: Quantity Badge — mono 11/12px 600, #14110E (--bg) on #C9A24B (--brass), radius 6px */}
            <span
              className="absolute font-mono font-semibold text-[11px] md:text-[12px] rounded-md top-[6px] md:top-[8px] right-[6px] md:right-[8px] px-[6px] md:px-[7px] py-[2px]"
              style={{ background: "var(--brass)", color: "var(--bg)" }}
            >
              ×{c.quantity}
            </span>
          </div>

          {/* Caption — §Grid Tile: Caption Area */}
          <div className="px-[9px] md:px-[11px] py-[7px] md:py-[9px] pb-[9px] md:pb-[11px]">
            {/* Name — 12/13px 600, ellipsis */}
            <div className="truncate text-[12px] md:text-[13px] font-semibold" style={{ color: "var(--fg)" }}>
              {c.name}
            </div>
            {/* Set/rarity caption — mono 9.5/10px, #8E8269 (--fg-faint) */}
            <div className="font-mono text-[9.5px] md:text-[10px] mt-[2px] md:mt-[3px]" style={{ color: "var(--fg-faint)" }}>
              <span className="md:hidden">{c.primarySetCode}</span>
              <span className="hidden md:inline">{c.primarySetCode} · {c.rarity}</span>
            </div>
          </div>
        </button>
      ))}

      {cards.length < totalCards && (
        <button
          type="button"
          onClick={onShowMore}
          className="col-span-2 md:col-span-5 mx-auto rounded-lg font-sans text-[13px] font-semibold px-[16px] py-[9px] mt-[6px]"
          style={{
            color: "var(--brass)",
            background: "transparent",
            border: "1px solid var(--border-strong)",
          }}
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </button>
      )}
    </div>
  );
}
```

- [ ] Rewrite `src/components/collection/no-results.tsx`:

```tsx
"use client";
// No results state per property table §No Results State.
// Distinct from empty-collection (shell owns that). CardFan mark from marks.tsx.

import { CardFan } from "../marks";

export function NoResults({
  query,
  totalCount,
  onClearAll,
  onKeepSearch,
}: {
  query: string;
  totalCount: number;
  onClearAll: () => void;
  onKeepSearch: () => void;
}) {
  const q = query.trim();
  return (
    // §No Results Container: flex-1, column, centered, padding 36px mobile / 48px desktop
    <div className="flex-1 flex flex-col items-center justify-center text-center p-[36px] md:p-[48px]">
      {/* CardFan mark — 96×104 mobile / 112×120 desktop, opacity 0.9 */}
      <div className="opacity-90 mb-[22px] md:mb-[24px]">
        <CardFan variant="mobile" className="md:hidden" />
        <CardFan variant="desktop" className="hidden md:block" />
      </div>

      {/* Heading — §No Results Heading: Cinzel 700, 21/26px, #EDE6D8 (--fg) */}
      <h2
        className="font-display font-bold text-[21px] md:text-[26px] m-0"
        style={{ color: "var(--fg)" }}
      >
        Nothing matches that
      </h2>

      {/* Body — §No Results Body Copy: 13.5/15px, #C6B79A (--fg-body), line-height 1.55/1.6, max-w 440px desktop */}
      <p
        className="mt-[10px] md:mt-[12px] text-[13.5px] md:text-[15px] md:max-w-[440px]"
        style={{ color: "var(--fg-body)", lineHeight: 1.6 }}
      >
        <span className="md:hidden">
          {q
            ? `No cards named "${q}" in your collection. Loosen a filter, or check the spelling.`
            : "No cards match those filters. Loosen a filter, or clear all."}
        </span>
        <span className="hidden md:inline">
          {q
            ? `No cards named "${q}" in your collection. Loosen a filter or check the spelling — you own ${totalCount.toLocaleString()} cards, just not this one.`
            : `No cards match those filters — you own ${totalCount.toLocaleString()} cards. Loosen a filter or clear all.`}
        </span>
      </p>

      {/* CTAs — §No Results CTA Container / §"Clear all filters" Button / §"Keep only search" Button */}
      <div className="mt-[22px] md:mt-[26px] flex flex-col md:flex-row gap-[12px]">
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-lg font-sans font-semibold text-[13px] md:text-[14px] px-[20px] md:px-[22px] py-[11px] md:py-[12px] cursor-pointer hover:bg-[color:var(--brass-hover)]"
          style={{ color: "var(--bg)", background: "var(--brass)", border: "none" }}
        >
          Clear all filters
        </button>
        {q && (
          <button
            type="button"
            onClick={onKeepSearch}
            className="hidden md:inline-block rounded-lg font-sans font-semibold text-[14px] px-[22px] py-[12px] cursor-pointer hover:[border:1px_solid_var(--brass)]"
            style={{ color: "var(--fg)", background: "transparent", border: "1px solid var(--border-strong)" }}
          >
            Keep only search
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] Verify: `pnpm typecheck` — expected: pass.
- [ ] Verify: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build` — expected: pass.
- [ ] Commit:

```bash
git add src/lib/collection/gradients.ts src/components/collection/rows-view.tsx src/components/collection/grid-view.tsx src/components/collection/no-results.tsx
git commit -m "feat(collection): rows view, grid view, no-results state with identity gradient"
```

---

### Task 6: Card detail modal — deep link, prev/next, focus trap (READINESS #5)

**Files:**
- Rewrite: `src/components/collection/card-modal.tsx`
- Create: `src/components/collection/mana-pips.tsx`

**Interfaces:**
- Produces (mana-pips.tsx): `<ManaCost cost, size />` — renders a mana-cost string like `{2}{U}{U}` as a row of pips per §Mana Pip. Generic `{n}` = `--elevated` bg with `--fg` glyph; WUBRG pips use the identity swatch tokens (`--w`/`--u`/`--b`/`--r`/`--g`) with `--bg` glyph. Empty string / null renders nothing.
- Produces (card-modal.tsx): `<CardModal card, position, total, onClose, onPrev, onNext />` — full-screen sheet on mobile, 820px centered overlay on desktop. Focus trap (queries focusable descendants; wraps Tab/Shift+Tab). Escape closes. Focus returns to the previously-focused trigger on close. Mobile art header uses `identityGradient` when `imageUri` is null. Desktop shows Prev/Next nav with the position counter.
- Consumes: `BrowseCard` (Task 3), `identityGradient` (Task 5), `<CardFan>` is not needed here.

Steps:

- [ ] Create `src/components/collection/mana-pips.tsx`:

```tsx
"use client";
// Mana-cost pips per property table §Mana Pip (generic {n}) / §Mana Pip (WUBRG colored).
// Size: 22px mobile / 26px desktop; font 12/13px.
// Generic {n}: --elevated bg + --fg glyph.
// WUBRG:      identity token bg + --bg glyph (§Mana Pip WUBRG colored).

const COLOR_TOKEN: Record<string, string> = {
  W: "var(--w)", U: "var(--u)", B: "var(--b)", R: "var(--r)", G: "var(--g)",
};

function parseManaCost(cost: string): string[] {
  // Matches "{2}", "{U}", "{U/B}" (returns "U/B" as glyph). We only style
  // WUBRG-only symbols as colored; hybrid renders as generic.
  return [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

export function ManaCost({ cost }: { cost: string | null }) {
  if (!cost) return null;
  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;
  return (
    // §Mana Cost Pip Container: display flex, gap 4/5px, flex none, padding-top 4px mobile
    <span className="flex gap-[4px] md:gap-[5px] flex-none pt-[4px] md:pt-0">
      {symbols.map((sym, i) => {
        const wubrg = /^[WUBRG]$/.test(sym);
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-full font-mono text-[12px] md:text-[13px] w-[22px] h-[22px] md:w-[26px] md:h-[26px]"
            style={{
              background: wubrg ? COLOR_TOKEN[sym] : "var(--elevated)",
              color: wubrg ? "var(--bg)" : "var(--fg)",
              fontWeight: wubrg ? 600 : 400,
            }}
          >
            {sym}
          </span>
        );
      })}
    </span>
  );
}
```

- [ ] Rewrite `src/components/collection/card-modal.tsx`:

```tsx
"use client";
// Card detail modal per property table §Card Detail Modal.
// - Mobile: full-screen sheet, art up top with color-identity gradient fallback
// - Desktop: 820px centered overlay, two-column (320px art + content), Prev/Next
// - Focus trap (READINESS #5): queries focusable children, wraps Tab/Shift+Tab
// - Escape closes; focus returns to the previously-focused element on close

import { useEffect, useRef } from "react";
import type { BrowseCard } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { ManaCost } from "./mana-pips";

const RARITY_LABEL: Record<BrowseCard["rarity"], string> = {
  common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic",
};

const IDENTITY_NAME: Record<string, string> = {
  "": "Colorless",
  W: "White", U: "Blue", B: "Black", R: "Red", G: "Green",
};

function identityName(id: string[]): string {
  if (id.length === 0) return "Colorless";
  if (id.length === 1) return IDENTITY_NAME[id[0]];
  return id.join("/");
}

export function CardModal({
  card,
  position,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  card: BrowseCard;
  position: number;
  total: number;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus before the modal opened so we can return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Focus first focusable child on mount.
  useEffect(() => {
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();
  }, []);

  // Escape closes; Tab wraps.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const artStyle: React.CSSProperties = card.imageUri
    ? { backgroundImage: `url(${card.imageUri})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };

  return (
    // Fixed backdrop wrapper — §Backdrop: rgba(8,6,4,0.72) desktop; blurred collection behind is decorative and out-of-scope
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onClick={onClose}
      style={{ background: "rgba(8,6,4,0.72)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: full-screen sheet (§Mobile: Full-Screen Sheet Container: bg #181410)
        // Desktop: 820px centered, bg #1A160F (--surface-rail), border 1px #3A3229 (--border-strong), radius 16px, shadow 0 40px 100px rgba(0,0,0,0.7)
        className="flex flex-col overflow-hidden w-full h-full md:h-auto md:w-[820px] md:flex-row md:rounded-2xl"
        style={{
          background: "var(--surface-sunken)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        {/* MOBILE art header — §Mobile: Art Header */}
        <div
          className="relative md:hidden"
          style={{
            padding: "44px 20px 20px",
            ...artStyle,
            boxShadow: "inset 0 -60px 60px -40px rgba(0,0,0,0.55)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card details"
            // §Mobile: Art Close Button
            className="absolute rounded-full flex items-center justify-center"
            style={{
              top: 22, right: 18, width: 32, height: 32,
              background: "rgba(10,8,6,0.55)", color: "var(--fg)", fontSize: 16,
            }}
          >
            ✕
          </button>
          {/* §Mobile: Art Image — 180px, aspect 63/88, radius 10px */}
          <div
            className="mx-auto rounded-[10px]"
            style={{
              width: 180, aspectRatio: "63/88", marginTop: 6,
              ...artStyle,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* DESKTOP art column — §Desktop: Art Column: 320px, padding 28px, bg #14110E (--bg) */}
        <div
          className="hidden md:flex items-center justify-center flex-none"
          style={{ width: 320, padding: 28, background: "var(--bg)" }}
        >
          <div
            className="w-full rounded-[12px]"
            style={{
              aspectRatio: "63/88",
              ...artStyle,
              boxShadow: "0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* Content column — mobile: flex-1 padding 20px; desktop: padding 30px 32px */}
        <div className="flex-1 relative overflow-auto p-[20px] md:p-[30px_32px]">
          {/* Desktop close button — §Desktop: Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card details"
            className="hidden md:flex absolute items-center justify-center rounded-full"
            style={{
              top: 22, right: 24, width: 34, height: 34,
              background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
              color: "var(--fg-muted)", fontSize: 15,
            }}
          >
            ✕
          </button>

          {/* Name + type + mana pips — §Mobile: Name + Type Header */}
          <div className="flex items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <h3
                id="card-modal-title"
                className="font-display font-bold text-[22px] md:text-[29px] m-0"
                style={{ color: "var(--fg)", lineHeight: 1.1 }}
              >
                {card.name}
              </h3>
              {/* Type line — §Card Type Line: 13/14px, #A89B84 (--fg-muted), margin-top 4/6px */}
              <p
                className="text-[13px] md:text-[14px] mt-[4px] md:mt-[6px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {card.typeLine}
              </p>
            </div>
            <ManaCost cost={card.manaCost} />
          </div>

          {/* Oracle text block — §Oracle Text Block: bg #14110E (--bg), border 1px #2A241D (--border), radius 10px, padding 14px 16px / 18px 20px, margin-top 16/22px, 13.5/15px, #C6B79A (--fg-body), line-height 1.6/1.65 */}
          {card.oracleText && (
            <div
              className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px] text-[13.5px] md:text-[15px] whitespace-pre-line"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--fg-body)",
                lineHeight: 1.65,
              }}
            >
              {card.oracleText}
            </div>
          )}

          {/* MOBILE meta 2×2 grid — §Mobile: Meta 2×2 Grid */}
          <div
            className="md:hidden mt-[16px] grid grid-cols-2 rounded-[10px] overflow-hidden"
            style={{ background: "var(--border)", gap: 1, border: "1px solid var(--border)" }}
          >
            <MetaCell label="Set" value={card.primarySetCode} />
            <MetaCell label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
            <MetaCell label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
            <MetaCell label="You own" value={`×${card.quantity}`} quantity />
          </div>

          {/* DESKTOP meta flex row — §Desktop: Meta Fields */}
          <div className="hidden md:flex flex-wrap gap-[26px] mt-[24px]">
            <MetaField label="Set" value={`${card.primarySetCode}`} />
            <MetaField label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
            <MetaField label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
            <MetaField label="You own" value={`×${card.quantity} copy`} quantity />
          </div>

          {/* DESKTOP Prev/Next — §Desktop: Prev/Next Navigation */}
          <div
            className="hidden md:flex items-center gap-[10px] mt-[28px] pt-[20px]"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={onPrev ?? undefined}
              disabled={!onPrev}
              aria-label="Previous card"
              className="cursor-pointer text-[15px] disabled:opacity-40"
              style={{ color: "var(--fg-faint)" }}
            >
              ‹ Prev
            </button>
            <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {position.toLocaleString()} of {total.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onNext ?? undefined}
              disabled={!onNext}
              aria-label="Next card"
              className="ml-auto cursor-pointer text-[15px] disabled:opacity-40"
              style={{ color: "var(--brass)" }}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCell({
  label, value, identity, quantity, rarity,
}: { label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean }) {
  return (
    // §Mobile: Meta Cell: bg #1E1A15 (--surface), padding 11px 14px
    <div className="p-[11px_14px]" style={{ background: "var(--surface)" }}>
      <div
        className="font-mono uppercase text-[9.5px] tracking-[0.12em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-[6px] mt-[3px]">
        {identity && identity.length > 0 && (
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: 12, height: 12,
              background: identity.length === 1
                ? { W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63" }[identity[0]] ?? "#8E8269"
                : "#8E8269",
            }}
          />
        )}
        <span
          className={quantity || rarity ? "font-mono" : ""}
          style={{
            color: quantity || rarity ? "var(--brass)" : "var(--fg)",
            fontSize: 13,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function MetaField({
  label, value, identity, quantity, rarity,
}: { label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean }) {
  return (
    <div>
      {/* §Meta Label desktop: mono 10px, letter-spacing 0.14em, uppercase, #8E8269 (--fg-faint) */}
      <div
        className="font-mono uppercase text-[10px] tracking-[0.14em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-[6px] mt-[5px]">
        {identity && identity.length > 0 && (
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: 13, height: 13,
              background: identity.length === 1
                ? { W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63" }[identity[0]] ?? "#8E8269"
                : "#8E8269",
            }}
          />
        )}
        <span
          className={quantity || rarity ? "font-mono text-[14px]" : "text-[14px]"}
          style={{ color: quantity || rarity ? "var(--brass)" : "var(--fg)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
```

- [ ] Verify: `pnpm typecheck` + `pnpm lint`.
- [ ] Verify: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- [ ] Commit:

```bash
git add src/components/collection/mana-pips.tsx src/components/collection/card-modal.tsx
git commit -m "feat(collection): card detail modal (deep link, prev/next, focus trap)"
```

---

### Task 7: Replace Step 1 — upload entry redesign

**Files:**
- Rewrite: `src/components/collection/upload-entry.tsx`
- Create: `src/app/collection/replace/page.tsx`

**Interfaces:**
- Produces: `<UploadEntry currentCardCount, onPreview />` — the redesigned step 1 per §Replace Flow — Step 1 (Upload). Amber warning banner uses the concrete `currentCardCount`. Drop zone / browse button / paste toggle wire to the existing `previewUpload` / `previewPaste` server actions. On successful preview, call `onPreview(preview)` — the parent (`ReplacePage`) advances to step 2.
- Produces: `/collection/replace` server component — loads `currentCollectionCount` via `getCollectionStats` and renders the client `<ReplaceFlow>` with it.
- Consumes: `previewUpload` / `previewPaste` / `confirmUpload` from actions.ts.

Steps:

- [ ] Rewrite `src/components/collection/upload-entry.tsx` — the step-1 designed layout:

```tsx
"use client";
// Replace Flow — Step 1 (Upload) per property table §Replace Flow — Step 1.
// The interim inline preview UI from earlier is gone; the parent ReplaceFlow
// component now owns steps 2 (review) and 3 (type-to-confirm).

import { useRef, useState, useTransition } from "react";
import { previewUpload, previewPaste, type UploadPreview } from "../../app/collection/actions";
import { parsePasteList } from "../../lib/manabox/paste";

type Mode = "dropzone" | "paste";

export function UploadEntry({
  currentCardCount,
  onPreview,
}: {
  currentCardCount: number;
  onPreview: (preview: UploadPreview) => void;
}) {
  const [mode, setMode] = useState<Mode>("dropzone");
  const [dragOver, setDragOver] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (pending) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const p = await previewUpload(fd);
        onPreview(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  function handlePasteSubmit() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const p = await previewPaste(pasteText);
        onPreview(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Parse failed");
      }
    });
  }

  const pasteCount = pasteText.trim()
    ? parsePasteList(pasteText).rows.reduce((n, r) => n + r.quantity, 0)
    : 0;

  return (
    // Desktop content area — §Desktop Content Area: padding 44px 48px, max-width 760px
    <div className="md:max-w-[760px] md:p-[44px_48px]">
      {/* Warning banner — §Warning Banner (Replace Warning): bg #211C15 (--elevated-hover), border 1px #3A3229 (--border-strong), border-left 3px #E0913C (--warning), radius 8/10px, padding 12/16px, gap 10/12px, margin-top 20px desktop */}
      <div
        className="flex items-start gap-[10px] md:gap-[12px] rounded-lg md:rounded-[10px] p-[12px_14px] md:p-[16px_18px] md:mt-[20px]"
        style={{
          background: "var(--elevated-hover)",
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--warning)",
        }}
      >
        {/* Warning icon — §Warning Banner Icon: #E0913C (--warning), 15/17px */}
        <span
          aria-hidden
          className="text-[15px] md:text-[17px]"
          style={{ color: "var(--warning)", lineHeight: 1.3 }}
        >
          ⚠
        </span>
        {/* Body — §Warning Banner Body: 12.5/14px, #C6B79A (--fg-body), line-height 1.55/1.6 */}
        <p
          className="text-[12.5px] md:text-[14px]"
          style={{ color: "var(--fg-body)", lineHeight: 1.6 }}
        >
          <span className="md:hidden">
            Uploading a new file replaces your current {currentCardCount.toLocaleString()} cards. There&apos;s no merge — the new export becomes your whole collection.
          </span>
          <span className="hidden md:inline">
            Uploading replaces your entire collection. Your current {currentCardCount.toLocaleString()} cards will be swapped for whatever&apos;s in the new file — no merge, no append. You&apos;ll see exactly what matched before anything is committed.
          </span>
        </p>
      </div>

      {mode === "dropzone" ? (
        // Upload Drop Zone — §Upload Drop Zone: border 1.5px dashed #4A4033 (--border-dashed), radius 12px, bg #181410 (--surface-sunken), padding 30px 18px mobile / 40px desktop, mobile centered / desktop flex row (icon left)
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={[
            "block cursor-pointer text-center rounded-[12px] mt-[16px] md:mt-[18px]",
            "p-[30px_18px] md:p-[40px]",
            "md:flex md:items-center md:gap-[28px] md:text-left",
            dragOver
              ? "bg-[color:var(--surface-inset)] [border:1.5px_dashed_var(--brass)]"
              : "bg-[color:var(--surface-sunken)] [border:1.5px_dashed_var(--border-dashed)] hover:bg-[color:var(--surface-inset)] hover:[border:1.5px_dashed_var(--brass)]",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            aria-label="Upload collection CSV"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) handleFile(f);
            }}
          />

          {/* Icon circle — §Upload Icon Circle: 48×48 mobile / 58×58 desktop, radius 999px, border 1px #C9A24B (--brass), color --brass, font 20/26px, margin auto mobile */}
          <div
            className="mx-auto mb-[14px] md:mx-0 md:mb-0 md:flex-none rounded-full flex items-center justify-center text-[20px] md:text-[26px] w-[48px] h-[48px] md:w-[58px] md:h-[58px]"
            style={{ border: "1px solid var(--brass)", color: "var(--brass)" }}
            aria-hidden
          >
            ↑
          </div>

          <div>
            {/* Upload title — §Upload Title: 15/17px 600 --fg */}
            <div className="text-[15px] md:text-[17px] font-semibold" style={{ color: "var(--fg)" }}>
              <span className="md:hidden">Drop your new CSV</span>
              <span className="hidden md:inline">Drop your new collection CSV here</span>
            </div>
            {/* Formats — §Upload Subtitle: mono 10/11px --fg-faint, letter-spacing 0.06em, margin-top 6px */}
            <div
              className="mt-[6px] font-mono text-[10px] md:text-[11px] tracking-[0.06em]"
              style={{ color: "var(--fg-faint)" }}
            >
              <span className="md:hidden">Moxfield · Archidekt · Deckbox · ManaBox · CSV</span>
              <span className="hidden md:inline">Moxfield · Archidekt · Deckbox · ManaBox · plain CSV</span>
            </div>
            {/* Browse files button — §"Browse files" Button: font 13/14px 600, bg #C9A24B (--brass) color --bg, radius 8px, padding 11px 20px / 11px 22px, margin-top 16px mobile */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
              className="rounded-lg font-semibold text-[13px] md:text-[14px] mt-[16px] md:mt-0 px-[20px] md:px-[22px] py-[11px] md:whitespace-nowrap hover:bg-[color:var(--brass-hover)]"
              style={{ color: "var(--bg)", background: "var(--brass)", border: "none" }}
            >
              Browse files
            </button>
            {/* Helper — §Helper Text: 12/13px --fg-faint, margin-top 14px mobile */}
            <p
              className="mt-[14px] md:mt-0 text-[12px] md:text-[13px]"
              style={{ color: "var(--fg-faint)", lineHeight: 1.55 }}
            >
              <span className="md:hidden">
                Only a Name and Quantity column are required.{" "}
                <button type="button" onClick={(e) => { e.preventDefault(); setMode("paste"); }} className="text-[color:var(--brass)]">
                  Paste a list instead
                </button>
              </span>
              <span className="hidden md:inline">
                We only need a Name and Quantity column — most exports already include them.
              </span>
            </p>
          </div>
        </label>
      ) : (
        <div className="mt-[16px]">
          <label htmlFor="paste-list" className="block text-[13px] font-semibold mb-[8px]" style={{ color: "var(--fg)" }}>
            Paste your list
          </label>
          <textarea
            id="paste-list"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            aria-label="Paste your card list"
            maxLength={100_000}
            placeholder={"3 Sol Ring\n1 Cultivate\nRhystic Study"}
            className="h-[300px] w-full rounded-lg p-[14px_16px] font-mono text-[13px] resize-none"
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--border-strong)",
              color: "var(--fg-body)",
              caretColor: "var(--fg-locked)",
            }}
          />
          <div className="mt-[10px] flex items-center justify-between">
            <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {pasteCount > 0 ? `${pasteCount} cards recognized` : ""}
            </span>
            <div className="flex gap-[8px]">
              <button
                type="button"
                onClick={() => setMode("dropzone")}
                className="rounded-lg text-[13px] px-[16px] py-[10px]"
                style={{ color: "var(--fg)", background: "transparent", border: "1px solid var(--border-strong)" }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={pending || pasteCount === 0}
                className="rounded-lg font-semibold text-[13px] px-[16px] py-[10px] hover:bg-[color:var(--brass-hover)] disabled:opacity-50"
                style={{ color: "var(--bg)", background: "var(--brass)", border: "none" }}
              >
                {pending ? "Previewing…" : `Preview ${pasteCount > 0 ? `${pasteCount} cards` : "list"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop-only "Paste a list instead" link — mobile has it inline in helper text */}
      {mode === "dropzone" && (
        <button
          type="button"
          onClick={() => setMode("paste")}
          className="hidden md:inline-block mt-[14px] text-[13px] whitespace-nowrap"
          style={{ color: "var(--brass)" }}
        >
          Paste a list instead →
        </button>
      )}

      {error && (
        <p className="mt-[12px] text-[13px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] Create `src/app/collection/replace/page.tsx`:

```tsx
// /collection/replace — three-step Replace flow.
// Step 1 (UploadEntry, this task), step 2 (Task 8 ReviewScreen), step 3
// (Task 9 ConfirmModal) are owned by the ReplaceFlow client component.

import { requireUserId } from "../../../lib/auth";
import { getCollectionStats } from "../../../lib/home/summary";
import { ReplaceFlow } from "../../../components/collection/replace-flow";

export default async function ReplacePage() {
  const userId = await requireUserId();
  const stats = await getCollectionStats(userId);
  return (
    // Page header — §Page Title "Replace collection" desktop / mobile back-chevron header
    <section>
      <div className="md:hidden flex items-center gap-[12px] p-[20px_18px_14px]" style={{ borderBottom: "1px solid var(--border)" }}>
        <a href="/collection" aria-label="Back to Collection" className="text-[20px]" style={{ color: "var(--brass)" }}>‹</a>
        <h1 className="font-display font-semibold text-[19px]" style={{ color: "var(--fg)" }}>Replace collection</h1>
      </div>
      <div className="hidden md:block md:p-[28px_34px_0]">
        <a href="/collection" className="font-mono text-[11px] tracking-[0.06em]" style={{ color: "var(--fg-faint)" }}>‹ Collection</a>
        <h1 className="font-display font-bold text-[30px] mt-[8px]" style={{ color: "var(--fg)" }}>Replace collection</h1>
      </div>
      <ReplaceFlow currentCardCount={stats.totalCards} />
    </section>
  );
}
```

- [ ] Create the minimum `src/components/collection/replace-flow.tsx` shell (Tasks 8–9 flesh out steps 2–3):

```tsx
"use client";
// ReplaceFlow — steps 1 → 2 → 3 for the destructive replace path.
// Step 1: UploadEntry (Task 7). On success advances to step 2.
// Step 2: ReviewScreen (Task 8). Continue → step 3.
// Step 3: ConfirmModal (Task 9). Confirm → confirmUpload() → /collection.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUpload, type UploadPreview } from "../../app/collection/actions";
import { UploadEntry } from "./upload-entry";
import { ReviewScreen } from "./review-screen";
import { ConfirmModal } from "./confirm-modal";

export function ReplaceFlow({ currentCardCount }: { currentCardCount: number }) {
  const router = useRouter();
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    if (!preview || pending) return;
    setPending(true);
    setConfirmError(null);
    try {
      await confirmUpload(preview.uploadId);
      router.push("/collection");
      router.refresh();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setPending(false);
    }
  }

  if (!preview) {
    return <UploadEntry currentCardCount={currentCardCount} onPreview={setPreview} />;
  }

  return (
    <>
      <ReviewScreen
        preview={preview}
        onCancel={() => setPreview(null)}
        onContinue={() => setConfirming(true)}
      />
      {confirming && (
        <ConfirmModal
          preview={preview}
          pending={pending}
          error={confirmError}
          onClose={() => setConfirming(false)}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
}
```

- [ ] Create empty stubs for `review-screen.tsx` and `confirm-modal.tsx` so typecheck passes at the Task 7 boundary:

```tsx
// src/components/collection/review-screen.tsx
"use client";
import type { UploadPreview } from "../../app/collection/actions";
export function ReviewScreen(_: { preview: UploadPreview; onCancel: () => void; onContinue: () => void }) {
  return null; // implemented in Task 8
}
```

```tsx
// src/components/collection/confirm-modal.tsx
"use client";
import type { UploadPreview } from "../../app/collection/actions";
export function ConfirmModal(_: {
  preview: UploadPreview; pending: boolean; error: string | null;
  onClose: () => void; onConfirm: () => Promise<void> | void;
}) {
  return null; // implemented in Task 9
}
```

- [ ] Verify: `pnpm typecheck` — expected: pass.
- [ ] Commit:

```bash
git add src/components/collection/upload-entry.tsx src/app/collection/replace/page.tsx src/components/collection/replace-flow.tsx src/components/collection/review-screen.tsx src/components/collection/confirm-modal.tsx
git commit -m "feat(collection): replace step 1 upload entry + flow shell"
```

---

### Task 8: Replace Step 2 — single-scroll review screen

**Files:**
- Rewrite: `src/components/collection/review-screen.tsx`

**Interfaces:**
- Produces: `<ReviewScreen preview, onCancel, onContinue />` — full §Replace Flow — Step 2 (Review, 2a). Summary banner (matched count as hero, issue tallies), issue sections (unmatched amber rows with `line`, parse errors red rows with `line`), sticky confirm bar at bottom. `line` on unmatched came in Task 2.
- Consumes: `UploadPreview` from actions.ts.

Steps:

- [ ] Rewrite `src/components/collection/review-screen.tsx`:

```tsx
"use client";
// Replace Flow — Step 2 (Review, 2a — Single Scroll) per property table.
// Single scrollable screen; sticky confirm bar at the bottom.
// unmatched rows carry {name, setCode, line}; parse errors carry {line, reason}.

import { useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";

const INITIAL_LIMIT = 8; // Show first N per section; "Show all" reveals the rest.

export function ReviewScreen({
  preview,
  onCancel,
  onContinue,
}: {
  preview: UploadPreview;
  onCancel: () => void;
  onContinue: () => void;
}) {
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

  return (
    // Wrapping section splits into scrollable content + sticky confirm bar
    <section className="flex flex-col min-h-[calc(100vh-140px)]">
      {/* Mobile page header (Cinzel title + filename) — §Page Header (mobile) / §Mobile Page Title */}
      <div
        className="md:hidden flex items-center gap-[12px] p-[20px_18px_14px]"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <button type="button" onClick={onCancel} aria-label="Back to upload" className="text-[20px]" style={{ color: "var(--brass)" }}>‹</button>
        <span className="font-display font-semibold text-[18px]" style={{ color: "var(--fg)" }}>Review import</span>
        <span className="ml-auto font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>{preview.filename}</span>
      </div>

      {/* Desktop content area — §Desktop Content Area: padding 36px 56px 20px, max-width 940px */}
      <div className="flex-1 md:max-w-[940px] md:mx-auto md:p-[36px_56px_20px] p-[16px_18px]">
        {/* Desktop step indicator — §Desktop Step Indicator */}
        <p
          className="hidden md:block font-mono text-[11px] tracking-[0.06em]"
          style={{ color: "var(--fg-faint)" }}
        >
          STEP 2 OF 3 · {preview.filename} · {preview.rowCount.toLocaleString()} rows
        </p>
        <h1
          className="hidden md:block font-display font-bold text-[29px] mt-[12px]"
          style={{ color: "var(--fg)" }}
        >
          Review before you replace
        </h1>

        {/* Summary section — flex row on desktop */}
        <div className="mt-[16px] md:mt-[24px] flex flex-col md:flex-row gap-[16px]">
          {/* Matched banner — §Review Summary Banner: Matched Card */}
          <div
            className="rounded-[12px] p-[16px] md:p-[20px_22px] flex items-center gap-[10px] md:gap-[16px] md:flex-[1.4]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--success)",
            }}
          >
            {/* §Matched Count: Success Icon — 30/44px circle rgba(111,163,104,0.15) with #6FA368 (--success) checkmark */}
            <span
              aria-hidden
              className="rounded-full flex items-center justify-center flex-none text-[15px] md:text-[20px] w-[30px] h-[30px] md:w-[44px] md:h-[44px]"
              style={{ background: "rgba(111,163,104,0.15)", color: "var(--success)" }}
            >
              ✓
            </span>
            <div>
              {/* §Matched Count: Number — mono 22/30px 600 --fg */}
              <div className="font-mono font-semibold text-[22px] md:text-[30px] leading-none" style={{ color: "var(--fg)" }}>
                {importCount.toLocaleString()}
              </div>
              {/* §Matched Count: Label */}
              <div className="text-[11.5px] md:text-[13px] mt-[2px] md:mt-[4px]" style={{ color: "var(--fg-muted)" }}>
                <span className="md:hidden">cards matched & ready</span>
                <span className="hidden md:inline">cards matched to the Oracle database — ready to import</span>
              </div>
            </div>
          </div>

          {/* Desktop issue tally panel — §Desktop Summary: Issue Tally Panel */}
          <div
            className="hidden md:flex flex-1 flex-col justify-center gap-[10px] rounded-[12px] p-[16px_18px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-[10px]">
              <span aria-hidden className="rounded-full flex-none" style={{ width: 9, height: 9, background: "var(--warning)" }} />
              <span className="font-mono text-[16px]" style={{ color: "var(--warning)" }}>
                {preview.unmatchedRows.length.toLocaleString()}
              </span>
              <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>unmatched names</span>
            </div>
            <div className="flex items-center gap-[10px]">
              <span aria-hidden className="rounded-full flex-none" style={{ width: 9, height: 9, background: "var(--danger)" }} />
              <span className="font-mono text-[16px]" style={{ color: "var(--danger)" }}>
                {preview.parseErrors.length.toLocaleString()}
              </span>
              <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>parse errors</span>
            </div>
            <div
              className="text-[11.5px] pt-[9px]"
              style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
            >
              {skipped.toLocaleString()} rows will be skipped
            </div>
          </div>

          {/* Mobile mini stats — §Issue Summary Mini Stats */}
          <div className="md:hidden flex gap-[8px] mt-[14px]">
            <MiniStat number={preview.unmatchedRows.length} numberColor="var(--warning)" label="unmatched" />
            <MiniStat number={preview.parseErrors.length} numberColor="var(--danger)" label="parse errors" />
            <MiniStat number={preview.rowCount} numberColor="var(--fg)" label="rows read" />
          </div>
        </div>

        {/* Desktop 2-column issues layout — §Desktop Issues Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px] mt-[16px] md:mt-[24px]">
          {/* Unmatched section */}
          {preview.unmatchedRows.length > 0 && (
            <div>
              {/* §Issue Section Headers — mono uppercase 10px, letter-spacing 0.14em, color #E0913C (--warning) */}
              <h2
                className="font-mono uppercase text-[10px] tracking-[0.14em] mb-[8px] md:mb-[10px]"
                style={{ color: "var(--warning)" }}
              >
                <span className="md:hidden">Unmatched — {preview.unmatchedRows.length} skipped</span>
                <span className="hidden md:inline">Unmatched names — {preview.unmatchedRows.length}</span>
              </h2>
              <ul className="flex flex-col gap-[6px]">
                {unmatchedShown.map((r, i) => (
                  <li
                    key={`${r.line}-${i}`}
                    // §Issue Row — Unmatched Name: bg #1E1A15, border 1px #2A241D, border-left 3px #E0913C, radius 8px, padding 9px 12px / 11px 14px
                    className="flex items-center justify-between gap-[10px] md:gap-[12px] rounded-lg p-[9px_12px] md:p-[11px_14px]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid var(--warning)",
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] md:text-[14px]" style={{ color: "var(--fg)" }}>{r.name}</span>
                      <span
                        className="font-mono text-[10px] md:text-[10.5px] mt-0 md:mt-[2px]"
                        style={{ color: "var(--fg-faint)" }}
                      >
                        Line {r.line}{r.setCode ? ` · ${r.setCode}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
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
            </div>
          )}

          {/* Parse errors section */}
          {preview.parseErrors.length > 0 && (
            <div>
              <h2
                className="font-mono uppercase text-[10px] tracking-[0.14em] mb-[8px] md:mb-[10px]"
                style={{ color: "var(--danger)" }}
              >
                Parse errors — {preview.parseErrors.length}
              </h2>
              <ul className="flex flex-col gap-[6px]">
                {errorsShown.map((e, i) => (
                  <li
                    key={`${e.line}-${i}`}
                    className="flex items-start gap-[10px] md:gap-[12px] rounded-lg p-[9px_12px] md:p-[11px_14px]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid var(--danger)",
                    }}
                  >
                    <span
                      className="font-mono text-[10px] md:text-[11px] flex-none pt-[1px]"
                      style={{ color: "var(--danger)" }}
                    >
                      L{e.line}
                    </span>
                    <span className="text-[13px]" style={{ color: "var(--fg-body)", lineHeight: 1.45 }}>
                      {e.reason}
                    </span>
                  </li>
                ))}
              </ul>
              {preview.parseErrors.length > INITIAL_LIMIT && !errorsExpanded && (
                <button
                  type="button"
                  onClick={() => setErrorsExpanded(true)}
                  className="mt-[8px] text-[12.5px] p-[4px_2px]"
                  style={{ color: "var(--brass)" }}
                >
                  Show all {preview.parseErrors.length} errors →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky confirm bar — §Sticky Confirm Bar: border-top 1px #3A3229 (--border-strong), bg #1A160F (--surface-rail), padding 14px 18px 22px mobile / 16px 56px desktop */}
      <div
        className="md:sticky bottom-0 z-10 p-[14px_18px_22px] md:p-[16px_56px] md:flex md:items-center md:gap-[20px]"
        style={{ background: "var(--surface-rail)", borderTop: "1px solid var(--border-strong)" }}
      >
        {/* Summary sentence — §Sticky Confirm Bar: Summary Sentence */}
        <p
          className="text-[11.5px] md:text-[13.5px] text-center md:text-left mb-[10px] md:mb-0"
          style={{ color: "var(--fg-body)" }}
        >
          <span className="md:hidden">
            Skips {skipped} rows · replaces your {preview.currentCollectionCount.toLocaleString()} cards with {importCount.toLocaleString()}
          </span>
          <span className="hidden md:inline">
            Importing {importCount.toLocaleString()} cards and skipping {skipped}. This replaces your current {preview.currentCollectionCount.toLocaleString()} cards.
          </span>
        </p>

        {/* Buttons — mobile: full-width continue only, desktop: cancel + continue right-aligned */}
        <div className="md:ml-auto flex gap-[12px]">
          <button
            type="button"
            onClick={onCancel}
            className="hidden md:inline-block rounded-lg font-sans font-semibold text-[14px] px-[20px] py-[12px] cursor-pointer hover:[border:1px_solid_var(--brass)]"
            style={{ color: "var(--fg)", background: "transparent", border: "1px solid var(--border-strong)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg font-sans font-semibold text-[15px] md:text-[14px] w-full md:w-auto py-[13px] md:py-[12px] px-0 md:px-[24px] cursor-pointer hover:bg-[color:var(--brass-hover)]"
            style={{ color: "var(--bg)", background: "var(--brass)", border: "none" }}
          >
            Continue to replace →
          </button>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ number, numberColor, label }: { number: number; numberColor: string; label: string }) {
  return (
    // §Mini Stat Cell: flex 1, bg #181410 (--surface-sunken), border 1px #2A241D (--border), radius 8px, padding 9px 11px
    <div
      className="flex-1 rounded-lg p-[9px_11px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <div className="font-mono text-[15px]" style={{ color: numberColor }}>{number.toLocaleString()}</div>
      <div className="text-[10.5px] mt-[1px]" style={{ color: "var(--fg-faint)" }}>{label}</div>
    </div>
  );
}
```

- [ ] Verify: `pnpm typecheck` + `pnpm lint` + `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- [ ] Commit:

```bash
git add src/components/collection/review-screen.tsx
git commit -m "feat(collection): replace step 2 single-scroll review with unmatched/error rows"
```

---

### Task 9: Replace Step 3 — type-to-confirm modal (READINESS #5 accessible input)

**Files:**
- Rewrite: `src/components/collection/confirm-modal.tsx`

**Interfaces:**
- Produces: `<ConfirmModal preview, pending, error, onClose, onConfirm />` — full §Replace Flow — Step 3 (Type-to-Confirm Modal). Confirm button disabled (opacity 0.6) until input is exactly `REPLACE`. Button label uses concrete count: `"Replace {currentCollectionCount} cards"`. Input has an accessible `<label>`. Focus trap + Escape close (share the same helpers as the card modal via inline implementation — no cross-modal dependency yet).
- Consumes: `UploadPreview` (for filename + counts).

Steps:

- [ ] Rewrite `src/components/collection/confirm-modal.tsx`:

```tsx
"use client";
// Replace Flow — Step 3 (Type-to-Confirm Modal) per property table.
// Danger dialog; button disabled at opacity 0.6 until input === "REPLACE".
// READINESS #5: focus trap + Escape + labelled input.

import { useEffect, useRef, useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";

const CONFIRM_TOKEN = "REPLACE";

export function ConfirmModal({
  preview,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  preview: UploadPreview;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [value, setValue] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const armed = value === CONFIRM_TOKEN;

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => { triggerRef.current?.focus(); };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); if (!pending) onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    // §Backdrop: rgba(8,6,4,0.74) desktop
    <div
      className="fixed inset-0 z-50 flex items-center md:items-center justify-center"
      role="presentation"
      onClick={() => { if (!pending) onClose(); }}
      style={{ background: "rgba(8,6,4,0.74)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: bottom sheet (§Mobile: Bottom Sheet: bg #1A160F (--surface-rail), radius 22px 22px 34px 34px, padding 26px 22px 30px)
        // Desktop: §Desktop: Modal Container: 520px, bg #1A160F, border 1px #3A3229, radius 16px, padding 32px 34px 30px, shadow 0 40px 100px rgba(0,0,0,0.7)
        className="w-full md:w-[520px] rounded-t-[22px] md:rounded-2xl p-[26px_22px_30px] md:p-[32px_34px_30px] mt-auto md:mt-0"
        style={{
          background: "var(--surface-rail)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        {/* Mobile drag handle — §Mobile: Sheet Drag Handle: 40×4, radius 999px, bg #3A3229 (--border-strong), margin 0 auto 20px */}
        <div className="md:hidden mx-auto mb-[20px] rounded-full" style={{ width: 40, height: 4, background: "var(--border-strong)" }} />

        {/* Warning icon header — §Warning Icon Header + §Warning Icon */}
        <div className="flex items-center gap-[12px] md:gap-[14px]">
          <span
            aria-hidden
            className="flex-none rounded-full flex items-center justify-center text-[18px] md:text-[22px] w-[40px] h-[40px] md:w-[48px] md:h-[48px]"
            style={{
              background: "rgba(198,83,63,0.14)",
              border: "1px solid #4A2F28",
              color: "var(--danger)",
            }}
          >
            ⚠
          </span>
          <h2
            id="confirm-title"
            className="font-display font-bold text-[20px] md:text-[25px] m-0"
            style={{ color: "var(--fg)", lineHeight: 1.15 }}
          >
            Replace your collection?
          </h2>
        </div>

        {/* Body — §Modal Body Copy: 13.5/15px --fg-body */}
        <p
          className="text-[13.5px] md:text-[15px] mt-[16px] md:mt-[18px]"
          style={{ color: "var(--fg-body)", lineHeight: 1.65 }}
        >
          <span className="md:hidden">
            This permanently swaps your {preview.currentCollectionCount.toLocaleString()} cards for the {preview.matchedCardCount.toLocaleString()} in {preview.filename}. It can&apos;t be undone.
          </span>
          <span className="hidden md:inline">
            This permanently swaps your {preview.currentCollectionCount.toLocaleString()} cards for the {preview.matchedCardCount.toLocaleString()} cards in {preview.filename}. Decks and commander recommendations rebuild from the new collection. This can&apos;t be undone.
          </span>
        </p>

        {/* Type-to-confirm section — §Type-to-Confirm Section: margin-top 18/22px */}
        <div className="mt-[18px] md:mt-[22px]">
          <label
            htmlFor="confirm-input"
            className="block font-mono uppercase text-[10px] md:text-[10.5px] tracking-[0.1em] mb-[8px] md:mb-[9px]"
            style={{ color: "var(--fg-faint)" }}
          >
            Type <span style={{ color: "var(--danger)" }}>REPLACE</span> to confirm
          </label>
          <input
            id="confirm-input"
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="confirm-hint"
            // §Confirm Input Field: bg #181410 (--surface-sunken), border 1px #C6533F (--danger), radius 8px, padding 12/13px 14/16px, mono 15/16px, --fg, letter-spacing 0.1/0.12em
            className="w-full rounded-lg font-mono text-[15px] md:text-[16px] tracking-[0.1em] md:tracking-[0.12em] p-[12px_14px] md:p-[13px_16px]"
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--danger)",
              color: "var(--fg)",
            }}
          />
        </div>

        {error && (
          <p className="mt-[10px] text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {/* Button row — §Button Row: desktop flex gap 12px margin-top 22px; mobile stacks */}
        <div className="mt-[22px] flex flex-col md:flex-row gap-[12px]">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!armed || pending}
            // §Confirm Button — Disabled: bg #3A2019, border 1px #C6533F (--danger), color --fg, radius 8px, opacity 0.6; armed → opacity 1
            className="rounded-lg font-sans font-semibold text-[15px] md:text-[14px] w-full md:flex-1 py-[14px] md:py-[13px] cursor-pointer"
            style={{
              color: "var(--fg)",
              background: "#3A2019",
              border: "1px solid var(--danger)",
              opacity: armed && !pending ? 1 : 0.6,
            }}
          >
            {pending ? "Replacing…" : `Replace ${preview.currentCollectionCount.toLocaleString()} cards`}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            // §Cancel / Keep Button — mobile text-only #8E8269 (--fg-faint), desktop outlined
            className="w-full md:flex-none font-sans font-semibold text-[14px] py-[12px] md:py-[13px] md:px-[22px] md:rounded-lg"
            style={{
              color: "var(--fg-faint)",
              background: "transparent",
              border: "none",
            }}
          >
            <span className="md:hidden">Keep my current collection</span>
            <span className="hidden md:inline" style={{ color: "var(--fg)" }}>Keep current</span>
          </button>
        </div>

        {/* Hint — §Hint Text: mono 10.5px --fg-locked, letter-spacing 0.04em, text-center, margin-top 14px */}
        <p
          id="confirm-hint"
          className="hidden md:block font-mono text-[10.5px] text-center mt-[14px] tracking-[0.04em]"
          style={{ color: "var(--fg-locked)" }}
        >
          Button unlocks once REPLACE is typed in full
        </p>
      </div>
    </div>
  );
}
```

- [ ] Verify: `pnpm typecheck` + `pnpm lint` + `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- [ ] Commit:

```bash
git add src/components/collection/confirm-modal.tsx
git commit -m "feat(collection): replace step 3 type-to-confirm modal (a11y-labeled)"
```

---

### Task 10: Wire /collection page + final verify

**Files:**
- Rewrite: `src/app/collection/page.tsx`

**Interfaces:**
- Produces: `/collection` server component. Loads `getCollectionStats` + `loadBrowseCards`; when `uniqueCards === 0` renders the existing empty state (kept as-is per §State Coverage: empty state is the shell's — this surface's no-results is the filtered-empty case). Otherwise renders the designed header (title + subtitle "N cards · N unique" mobile / "N cards · N unique · last updated …" desktop + Replace button) plus `<CollectionBrowser>` with the appropriate `defaultView` (rows mobile via the URL `view=rows`, grid desktop via the default).
- Consumes: Tasks 3 (`loadBrowseCards`), 4 (`CollectionBrowser`), and the existing `getCollectionStats`.

Steps:

- [ ] Rewrite `src/app/collection/page.tsx`:

```tsx
// /collection — designed browse surface (#6).
// Server component: loads full aggregated collection once and hands it to
// the client browser for filter/sort/window/modal state.
//
// Empty-collection state remains the shell's design; this surface's own
// "no results" case is triggered when filters return zero (Task 5).

import { requireUserId } from "../../lib/auth";
import { getCollectionStats } from "../../lib/home/summary";
import { loadBrowseCards } from "../../lib/collection/browse";
import { CardFan } from "../../components/marks";
import { CollectionBrowser } from "../../components/collection/browser";

export default async function CollectionPage() {
  const userId = await requireUserId();
  const [stats, cards] = await Promise.all([
    getCollectionStats(userId),
    loadBrowseCards(userId),
  ]);

  // Empty collection — shell's state, kept intact.
  if (stats.uniqueCards === 0) {
    return (
      <section className="flex flex-col items-center justify-center text-center p-8 md:p-[48px]">
        <CardFan variant="mobile" className="mb-[22px] md:hidden" />
        <CardFan variant="desktop" className="mb-[26px] hidden md:block" />
        <h1
          className="font-display font-bold text-[28px]"
          style={{ color: "var(--fg)", margin: 0 }}
        >
          Your collection is empty
        </h1>
        <p
          className="mt-3 max-w-[420px] text-[16px]"
          style={{ color: "var(--fg-body)", lineHeight: 1.6 }}
        >
          A pile of possibilities waiting for a general. Upload a CSV and the
          table fills — commanders and decks follow.
        </p>
        <div className="mt-[26px]">
          <a
            href="/collection/replace"
            className="rounded-lg font-semibold text-[13px] md:text-[14px] px-[20px] md:px-[22px] py-[11px] hover:bg-[color:var(--brass-hover)]"
            style={{ color: "var(--bg)", background: "var(--brass)" }}
          >
            Upload your CSV
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-80px)] md:min-h-screen">
      {/* Header — §Collection Page Header */}
      <div
        className="flex items-center md:items-end justify-between gap-[20px] p-[20px_18px_12px] md:p-[28px_34px_0]"
        style={{ background: "var(--bg)" }}
      >
        <div>
          {/* Title — §Page Title "Collection": Cinzel 700, 22/30px, #EDE6D8 (--fg) */}
          <h1 className="font-display font-bold text-[22px] md:text-[30px] m-0" style={{ color: "var(--fg)" }}>
            Collection
          </h1>
          {/* Subtitle — §Subtitle / Stats Line: mono 11/12px, #8E8269 (--fg-faint), margin-top 2/4px */}
          <p
            className="font-mono text-[11px] md:text-[12px] mt-[2px] md:mt-[4px]"
            style={{ color: "var(--fg-faint)" }}
          >
            <span className="md:hidden">
              {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique
            </span>
            <span className="hidden md:inline">
              {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique · last updated today
            </span>
          </p>
        </div>
        {/* Replace button — §Replace Collection Button (desktop-only per table) */}
        <a
          href="/collection/replace"
          className="hidden md:inline-block rounded-lg font-sans font-semibold text-[13px] px-[16px] py-[9px] cursor-pointer hover:[border:1px_solid_var(--brass)] hover:text-[color:var(--brass-hover)]"
          style={{
            color: "var(--fg)",
            background: "transparent",
            border: "1px solid var(--border-strong)",
          }}
        >
          ↻ Replace collection
        </a>
      </div>

      <CollectionBrowser cards={cards} defaultView="grid" />
    </section>
  );
}
```

> Note on the mobile Replace entry: the mobile design table lists no header Replace button — mobile users reach the replace flow by tapping "Replace collection" inside the account overflow menu (owned by the shell). Until that menu ships, add a mobile-only text link inside the header to keep the flow reachable: append `<a href="/collection/replace" className="md:hidden text-[13px]" style={{ color: "var(--brass)" }}>↻ Replace</a>` in the header's right-hand slot.

- [ ] Add the mobile Replace text link per the note above by inserting `<a>` alongside the desktop button (swap `hidden md:inline-block` → `hidden md:inline-block` desktop and add a sibling `<a className="md:hidden text-[13px]" style={{ color: 'var(--brass)' }}>↻ Replace</a>`).

- [ ] Verify (self-review pass):
  - Every task's Files list resolves against the current repo.
  - Every code block uses tokens (`var(--*)`) — no raw hexes except where the design table explicitly uses raw hexes (WUBRG pip swatches, gradient stops, rarity dot colors).
  - Every hover class is Tailwind, no inline `style` hover.
  - Row/tile interactive elements are `<button>` (not `<div onClick>`) so :focus-visible + keyboard just work.
  - `CollectionRow` symbol name matches everywhere; no stale `ManaBoxRow` reference remains.
  - `unmatchedRows` items include `line` throughout Tasks 2 → 8.
  - Sort keys match Task 3 → Task 4 dropdown → Task 3 tests.
  - Property table sections cited in every task exist in `docs/superpowers/design-tables/collection.md`.

- [ ] Final verify:

```bash
pnpm test
pnpm typecheck
pnpm lint
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

Expected: all four pass.

- [ ] Commit:

```bash
git add src/app/collection/page.tsx
git commit -m "feat(collection): wire /collection page with browse + designed header"
```

---

## Verification checklist (post-plan self-review)

- [x] READINESS #1 covered by Task 1 (broadened parser, case-insensitive headers).
- [x] READINESS #2 covered by Task 1 (`line` on rows) + Task 2 (thread through paste + preview + `UploadPreview.unmatchedRows`).
- [x] READINESS #3 covered by Task 3 (`SortKey = "name" | "quantity" | "set" | "rarity" | "color"`) + Task 4 dropdown options.
- [x] READINESS #4 covered by Task 5 gradient helper + Task 6 modal art fallback.
- [x] READINESS #5 covered by global focus-visible (already shipping), Task 6 modal focus trap + Escape, Task 9 labeled input.
- [x] READINESS #6 covered by Task 3 (single server load) + Task 4 windowing (200-page slice + "Show more") + URL sync — no virtualization dep.
- [x] Empty-collection state deferred to shell design (Task 10 keeps it intact).
- [x] "Replace is the only write path" preserved — read-only browse, no inline mutation controls in Tasks 4–6.

## Follow-ups (out of scope for #6)

- Cursor animation on the type-to-confirm input (`§Input Cursor` — a 1.5–2px brass caret next to the last typed character). Left off because native `<input>` doesn't expose a custom cursor position element; the accessible input takes priority over the mockup flourish.
- Blurred backdrop behind the card modal (`filter: blur(2px); opacity: 0.4` on the collection layer). Out of scope because the collection layer is a sibling scroller, not a snapshot; blurring it interactively requires a portal + overlay refactor that shouldn't block the surface.
- "Last updated" date in the header subtitle currently reads "today" as a placeholder — no schema field for the last successful `confirmUpload` exists yet. Add a `csv_uploads.createdAt` lookup after this ships.
