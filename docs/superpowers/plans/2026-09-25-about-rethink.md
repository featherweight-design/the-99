# About rethink (R6): the one-time sheet, the what's-new index, contents search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Approved by Hugh in advance, 2026-09-25; reviewed by the orchestrator.

**Goal:** Replace the About redirect with a one-time non-modal sheet. `/about` opens on a what's-new index, and its contents list every entry with a title search. All of it ships behind a release switch, before the analysis line's `ABOUT_VERSION` bump.

**Architecture:** The proxy keeps its one database read per browser per version. With the switch on, it no longer redirects. On a *document* load it strips any incoming `x-about-sheet` header, sets it from the reader's `seen`, and writes a NEW cookie, `about_sheet`, meaning "sheet shown for N". The root `Shell` reads that request header and mounts a client `AboutSheet` as its last child. `/about` builds its index from the pre-visit `seen`, then records the visit from a client effect after mount. With the switch off, nothing changes. A cleanup PR removes the redirect path once production has flipped.

**Tech stack:** Next.js 16 App Router (proxy.ts middleware, server components, server actions), React 19, Tailwind 4, Vitest with Testing Library, Playwright probes (`scripts/probe-*.mjs`).

**Spec:**
- `docs/superpowers/design-briefs/2026-09-25-about-rethink.md` (merged #957): the rulings in §3, the readings in §4.0, and the engineering notes in §7.
- The design is `design/design_handoff_the99_about/STATES-about-r6.md`, `READINESS-r6.md` and `The 99 - About Page (R6).dc.html`.
- The audit is `READINESS-r6-audit.md` (PR #965; Hugh answered Q1 and Q2 on 2026-09-25). Its findings **E1–E9 are corrections to the design and override it.**

## Global Constraints

- **The switch:** `ABOUT_SHEET_ENABLED === "true"`, following the `src/lib/decks/analysis-flag.ts` pattern. It is ON in the-99-staging and OFF in production until Hugh walks it (playbook: Releases).
- **No redirect with the switch on,** ever (brief ruling 1). With it off, today's behavior stays byte-for-byte.
- **The cookie is new: `about_sheet`**, with the value `<userId>.<version>`. The legacy `about_v` is never read as "sheet shown" (E1).
- **`seen` is written only on an actual open of `/about`:** a client effect calls a server action after mount. It is never written at render, and a prefetch never writes it (E2).
- **Search filters the contents list only, never the page.** No page chapter is hidden, collapsed or reordered (ruling 4).
- **Nothing is added to the menu, the nav rail, the tab bar or Home** (H1). The sheet is the notice.
- **The sheet is non-modal:** no scrim, no focus grab, no scroll lock, no `aria-modal`. It must not reuse `ui/sheet.tsx`, which is modal (`sheet.tsx:212-216`).
- **Sheet placement follows the shell's `md` breakpoint (768px), not the About page's 1000px** (E8).
  - At `md` and up: `left: calc(62px + 20px)`, `bottom: 20px`, 340px wide.
  - Below `md`: `left/right: 12px`, `bottom: calc(var(--tabbar-h) + 10px)`.
- **The new-entry emphasis is approved as drawn** (Q1): the NEW pill goes before the title, plus a 2px `--accent` top rule on new entries only.
- **No new About entry** (Q2). The edit to the existing copy is Task 5.3.
- **Copy is US English with no em dashes**, and goes through `/copy-review` with pictures, via the orchestrator.
- **`ABOUT_VERSION` stays 9 in this plan.** The analysis launch bumps it to 10 (E3), and this plan gates that bump.
- **PRs of about 20 files or fewer**, with the boundaries below. No stacked PRs; each one branches off `origin/main` once the previous one has merged.

## Review Focus

These are the failure modes most likely to bite a real reader. Each has a pinning test in the task that owns the code.

1. **A soft navigation with a stale cookie** (a tab left open across the deploy). A client transition does not re-render the root layout, so a sheet decided there could never draw, yet its cookie would mark it shown. The proxy therefore acts on **document loads only** and leaves RSC requests alone (Task 1.2).
2. **A reader who opens `/about` directly, never having seen the sheet.** The index shows and the visit is recorded. On the next document load the proxy reads `seen >= version`, so no sheet appears (Task 1.2 and Task 3.2).
3. **The account menu prefetches `/about`.** No write may happen, because the index would be gone on the real visit (Task 3.2).
4. **A shared browser, two accounts.** The cookie is bound to the userId, so the second account still gets its sheet (Task 1.1).
5. **A forged `x-about-sheet` header from the client.** The proxy strips it on every request it sees, so a reader cannot summon or suppress the sheet (Task 1.2).
6. **A failed `seen` read.** No sheet and no redirect, and the app works (Task 1.2).
7. **A search query with regex characters** (`+`, `(`, `?`). The match is a plain case-insensitive `includes`, so nothing throws (Task 4.2).

## PR boundaries

| PR | Scope | Files (approx.) | Shared, ask the-99-d9 first |
|---|---|---|---|
| 1 | Plumbing: switch, cookie, proxy branch, header read. No visible change | 8 | none |
| 2 | The sheet, mounted in the shell, plus its copy | 6 | `src/components/shell/shell.tsx` (one import and one line) |
| 3 | The page: index, new-entry emphasis, jump mark, visit on open, dismiss retired under the switch | 8 | none |
| 4 | Contents at entry level, plus search (rail and phone) | 5 | none |
| 5 | Probes: shared clear helper, the 12 probes, the new `probe:about`, copy sites, the Q2 edit, AGENTS.md | ~18 | the 12 other lanes' probes, `account-menu.tsx` (comment only) |
| 6 | Cleanup **after** production flips: remove the redirect, `about_v`, `dismissAbout`, `safeNext`, the switch | ~10 | none |

The fence is the lane brief's fence (`boards/lanes/about-rethink.md`). This plan needs nothing outside it except the shared rows above.

---

## PR 1: Plumbing

### Task 1.1: The switch and the sheet decision (pure)

**Files:**
- Create: `src/lib/about/flag.ts`
- Create: `src/lib/about/flag.test.ts`
- Modify: `src/lib/about/gate.ts` (add below `gateDecision`, `:147`)
- Test: `src/lib/about/gate.test.ts` (append)

**Interfaces:**
- Produces `aboutSheetEnabled(env?: NodeJS.ProcessEnv): boolean`.
- Produces `SHEET_COOKIE = "about_sheet"`.
- Produces `SHEET_HEADER = "x-about-sheet"`.
- Produces `sheetDecision(args: { userId: string; seen: number; version?: number }): { show: false; cookie: string } | { show: true; seen: number; cookie: string }`.
- Produces `sheetCookieIsCurrent(raw: string | undefined, userId: string, version?: number): boolean`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/about/flag.test.ts
import { describe, expect, it } from "vitest";
import { aboutSheetEnabled } from "./flag";

describe("aboutSheetEnabled", () => {
  it("is on only for the exact string true", () => {
    expect(aboutSheetEnabled({ ABOUT_SHEET_ENABLED: "true" } as NodeJS.ProcessEnv)).toBe(true);
    expect(aboutSheetEnabled({ ABOUT_SHEET_ENABLED: "1" } as NodeJS.ProcessEnv)).toBe(false);
    expect(aboutSheetEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });
});
```

```ts
// appended to src/lib/about/gate.test.ts
import { SHEET_COOKIE, sheetCookieIsCurrent, sheetDecision, ABOUT_COOKIE } from "./gate";

describe("sheetDecision", () => {
  it("shows the sheet to a reader who is behind, carrying their pre-visit seen", () => {
    expect(sheetDecision({ userId: "u", seen: 8, version: 9 })).toEqual({ show: true, seen: 8, cookie: "u.9" });
  });
  it("shows the first-run variant at seen 0", () => {
    expect(sheetDecision({ userId: "u", seen: 0, version: 9 })).toEqual({ show: true, seen: 0, cookie: "u.9" });
  });
  it("does not show it to a current reader, but still marks the browser", () => {
    expect(sheetDecision({ userId: "u", seen: 9, version: 9 })).toEqual({ show: false, cookie: "u.9" });
  });
});

describe("the sheet cookie is not the gate cookie (E1)", () => {
  it("uses a new name", () => {
    expect(SHEET_COOKIE).toBe("about_sheet");
    expect(SHEET_COOKIE).not.toBe(ABOUT_COOKIE);
  });
  it("is bound to the reader", () => {
    expect(sheetCookieIsCurrent("u.9", "u", 9)).toBe(true);
    expect(sheetCookieIsCurrent("u.9", "other", 9)).toBe(false);
    expect(sheetCookieIsCurrent("u.8", "u", 9)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/lib/about/flag.test.ts src/lib/about/gate.test.ts`
Expected: FAIL, because `./flag` and the new `gate.ts` exports do not exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/about/flag.ts
// The About sheet's release switch (Hugh, 2026-09-24 Releases ruling): ON in the-99-staging,
// OFF in production until he walks it. Off keeps today's redirect exactly. Server-only; a change
// needs a redeploy, like `analysis-flag.ts`.
export function aboutSheetEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ABOUT_SHEET_ENABLED === "true";
}
```

```ts
// appended to src/lib/about/gate.ts

/**
 * The sheet's cookie: "this browser has shown the sheet for version N, as this account". A NEW
 * name on purpose (R6 audit E1). `about_v` means "sent to N", and browsers redirected but never
 * acknowledged still hold `<userId>.9`; reading that as "shown" would hide the sheet from exactly
 * the readers who are behind.
 */
export const SHEET_COOKIE = "about_sheet";

/** Set by the proxy on a document load that should draw the sheet; carries the pre-visit `seen`. */
export const SHEET_HEADER = "x-about-sheet";

export function sheetCookieIsCurrent(
  raw: string | undefined,
  userId: string,
  version: number = ABOUT_VERSION,
): boolean {
  return raw === cookieValue(userId, version);
}

export type SheetDecision =
  | { show: false; cookie: string }
  | { show: true; seen: number; cookie: string };

/** Pure: whether this document load draws the sheet. Both answers mark the browser, so it shows once. */
export function sheetDecision(args: { userId: string; seen: number; version?: number }): SheetDecision {
  const version = args.version ?? ABOUT_VERSION;
  const cookie = cookieValue(args.userId, version);
  if (args.seen >= version) return { show: false, cookie };
  return { show: true, seen: args.seen, cookie };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/lib/about/flag.test.ts src/lib/about/gate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/about/flag.ts src/lib/about/flag.test.ts src/lib/about/gate.ts src/lib/about/gate.test.ts
git commit -m "About sheet: switch, new cookie and pure sheet decision"
```

### Task 1.2: The proxy branch

**Files:**
- Modify: `src/proxy.ts:25-65`
- Modify: `src/lib/about/gate.ts`, adding `isDocumentLoad(method, headers)` beside `gateHandles` (`:106`)
- Test: `src/proxy.test.ts` (append a `describe("with the sheet switch on")` block)

**Interfaces:**
- Consumes everything from Task 1.1.
- Produces the request header `x-about-sheet: <seen>` on `NextResponse.next({ request: { headers } })`, and the `about_sheet` cookie.

- [ ] **Step 1: Write the failing tests** (in `src/proxy.test.ts`; the helpers `request`, `auth` and `aboutVersionSeen` already exist at `:10-44`)

```ts
describe("with the sheet switch on", () => {
  beforeEach(() => { process.env.ABOUT_SHEET_ENABLED = "true"; });
  afterEach(() => { delete process.env.ABOUT_SHEET_ENABLED; });

  it("never redirects a reader who is behind", async () => {
    aboutVersionSeen.mockResolvedValue(8);
    const res = await proxy(auth, request("/decks"));
    expect(res?.status).not.toBe(307);
    expect(res?.headers.get("x-middleware-request-x-about-sheet")).toBe("8");
    expect(res?.cookies.get("about_sheet")?.value).toBe("user_1.9");
  });

  it("does not act on a client transition, so no unseen sheet is marked shown (Review Focus 1)", async () => {
    aboutVersionSeen.mockResolvedValue(8);
    const res = await proxy(auth, request("/decks", { RSC: "1", accept: "*/*" }));
    expect(res?.cookies.get("about_sheet")).toBeUndefined();
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });

  it("ignores a legacy about_v cookie (E1)", async () => {
    aboutVersionSeen.mockResolvedValue(8);
    const res = await proxy(auth, request("/decks", {}, "user_1.9")); // sets about_v
    expect(res?.headers.get("x-middleware-request-x-about-sheet")).toBe("8");
  });

  it("strips a forged header even when nothing is shown (Review Focus 5)", async () => {
    aboutVersionSeen.mockResolvedValue(9);
    const res = await proxy(auth, request("/decks", { "x-about-sheet": "0" }));
    expect(res?.headers.get("x-middleware-request-x-about-sheet")).toBeNull();
  });

  it("does not read the database once this browser has shown the sheet", async () => {
    const req = request("/decks");
    req.cookies.set("about_sheet", "user_1.9");
    await proxy(auth, req);
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });

  it("lets the reader through when the read fails (Review Focus 6)", async () => {
    aboutVersionSeen.mockRejectedValue(new Error("down"));
    const res = await proxy(auth, request("/decks"));
    expect(res?.status ?? 200).not.toBe(307);
    expect(res?.headers.get("x-middleware-request-x-about-sheet") ?? null).toBeNull();
  });
});
```

(`x-middleware-request-<name>` is how `NextResponse.next({ request: { headers } })` exposes an overridden request header to a test. Confirm it against `node_modules/next/dist/server/web/spec-extension/response.js` before relying on it, and assert through `x-middleware-override-headers` if the name differs.)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/proxy.test.ts`
Expected: FAIL, because the proxy still redirects.

- [ ] **Step 3: Implement**

In `gate.ts`, beside `gateHandles`:

```ts
/** A full document load, the only request that renders the root layout and so the only one that
 *  can draw the sheet. An RSC transition keeps the layout mounted, so a sheet decided there
 *  would be marked shown without ever being drawn. */
export function isDocumentLoad(method: string, headers: Headers): boolean {
  if (method !== "GET") return false;
  if (headers.get("Next-Router-Prefetch") === "1" || headers.get("purpose") === "prefetch") return false;
  if (headers.get("RSC") === "1") return false;
  return (headers.get("accept") ?? "").includes("text/html");
}
```

In `proxy.ts`, after `if (!userId) return;` and **before** the existing `gateApplies`/`gateHandles` line:

```ts
  if (aboutSheetEnabled()) {
    // Never trust the client with the sheet's header, on any request.
    const headers = new Headers(req.headers);
    headers.delete(SHEET_HEADER);
    const pass = () => NextResponse.next({ request: { headers } });

    const path = req.nextUrl.pathname;
    if (!gateApplies(path) || !isDocumentLoad(req.method, req.headers)) return pass();
    if (sheetCookieIsCurrent(req.cookies.get(SHEET_COOKIE)?.value, userId)) return pass();

    let seen: number;
    try {
      seen = await aboutVersionSeen(userId);
    } catch {
      return pass();
    }
    const decision = sheetDecision({ userId, seen });
    if (decision.show) headers.set(SHEET_HEADER, String(decision.seen));
    const response = pass();
    response.cookies.set(SHEET_COOKIE, decision.cookie, {
      path: "/", httpOnly: true, sameSite: "lax",
      secure: req.nextUrl.protocol === "https:", maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }
```

- [ ] **Step 4: Run the whole about and proxy suite, both switch states**

Run: `pnpm vitest run src/proxy.test.ts src/lib/about`
Expected: PASS. The existing redirect tests still pass with the switch off.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/proxy.test.ts src/lib/about/gate.ts src/lib/about/gate.test.ts
git commit -m "About sheet: proxy decides on document loads, never redirects with the switch on"
```

### Task 1.3: Reading the decision in a server component

**Files:**
- Create: `src/lib/about/sheet-state.ts`
- Create: `src/lib/about/sheet-state.test.ts`

**Interfaces:**
- Produces `readSheetState(h: Headers): { kind: "none" } | { kind: "firstRun" } | { kind: "behind"; entries: { id: string; title: string }[] }`. It is called from `Shell` with `await headers()`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { readSheetState } from "./sheet-state";
import { aboutEntries, ABOUT_VERSION } from "../copy/about";

const h = (v?: string) => new Headers(v === undefined ? {} : { "x-about-sheet": v });

describe("readSheetState", () => {
  it("is none without the header", () => expect(readSheetState(h())).toEqual({ kind: "none" }));
  it("is firstRun at seen 0", () => expect(readSheetState(h("0"))).toEqual({ kind: "firstRun" }));
  it("lists the entries newer than seen, in page order", () => {
    const s = readSheetState(h(String(ABOUT_VERSION - 1)));
    expect(s.kind).toBe("behind");
    const want = aboutEntries.filter((e) => e.since > ABOUT_VERSION - 1).map((e) => ({ id: e.id, title: e.title }));
    expect(s.kind === "behind" && s.entries).toEqual(want);
  });
  it("treats a malformed value as none", () => {
    expect(readSheetState(h("x"))).toEqual({ kind: "none" });
    expect(readSheetState(h("-1"))).toEqual({ kind: "none" });
  });
  it("is none when a stale header names nothing new", () => {
    expect(readSheetState(h(String(ABOUT_VERSION)))).toEqual({ kind: "none" });
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Run `pnpm vitest run src/lib/about/sheet-state.test.ts`. Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/about/sheet-state.ts
import { aboutEntries } from "../copy/about";
import { SHEET_HEADER } from "./gate";

export type SheetState =
  | { kind: "none" }
  | { kind: "firstRun" }
  | { kind: "behind"; entries: { id: string; title: string }[] };

/** The proxy's decision, read back in the root layout. Page order is `aboutEntries` order. */
export function readSheetState(h: Headers): SheetState {
  const raw = h.get(SHEET_HEADER);
  if (raw === null || !/^\d+$/.test(raw)) return { kind: "none" };
  const seen = Number(raw);
  if (seen === 0) return { kind: "firstRun" };
  const entries = aboutEntries.filter((e) => e.since > seen).map((e) => ({ id: e.id, title: e.title }));
  return entries.length === 0 ? { kind: "none" } : { kind: "behind", entries };
}
```

- [ ] **Step 4: Run to verify it passes, then the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`, then `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.

- [ ] **Step 5: Commit, then open PR 1.** Follow the pr-review skill: the pre-open pass, one PR, Copilot rounds, and the fence check before merge.

```bash
git add src/lib/about/sheet-state.ts src/lib/about/sheet-state.test.ts
git commit -m "About sheet: read the proxy's decision in a server component"
```

---

## PR 2: The sheet

### Task 2.1: The sheet's copy

**Files:**
- Modify: `src/lib/copy/about.ts`, adding `aboutSheetCopy` after `aboutMenuCopy` (`:745`)
- Modify: `src/lib/copy/about.version.json` (re-pin the hash, **not** the version)
- Test: `src/lib/copy/about.test.ts`

These are the strings from STATES-r6 §R8, verbatim:

```ts
export const aboutSheetCopy = {
  heading: (n: number) => `${n} new in About`,
  more: (n: number) => `and ${n} more`, // n >= 2 (N2)
  firstRunHeading: aboutCopy.pageTitle, // 'What The 99 does'
  firstRunLine: 'One page that explains every mark, figure and status in the app, and where each one lives.',
  show: 'Show me',
  later: 'Later',
  where: 'Always in your account menu, under About The 99.',
  regionLabel: 'New in About',
  regionLabelFirstRun: 'About The 99',
} as const;
```

- [ ] **Step 1:** Add `aboutSheetCopy` to the object that `contentHash()` in `about.test.ts:61` hashes, and add a test that `more` is never used with 1 (it asserts `sheetTitles(4)` lists four; see Task 2.2).
- [ ] **Step 2:** Run `pnpm vitest run src/lib/copy/about.test.ts`. Expected: FAIL on the hash.
- [ ] **Step 3:** Re-pin the hash in `about.version.json` deliberately. Keep `"version": 9`, since a copy edit is not a bump (AGENTS.md).
- [ ] **Step 4:** Run it again. Expected: PASS.
- [ ] **Step 5:** Commit: `git commit -m "About sheet: copy (R6 §R8)"`.

### Task 2.2: `AboutSheet`

**Files:**
- Create: `src/components/shell/about-sheet.tsx` (`"use client"`)
- Create: `src/components/shell/about-sheet.test.tsx`

**Interfaces:**
- Consumes `SheetState` (Task 1.3) and `aboutSheetCopy` (Task 2.1).
- Produces `AboutSheet({ state }: { state: Exclude<SheetState, { kind: "none" }> })` and the pure `sheetTitles(n: number): { shown: number; more: number }`.

Behavior, from STATES-r6 §N and corrected by E8:
- N1 lists up to four titles. N2: at five or more, it lists three and then `and N more`.
- N4 and N5 place the card; the breakpoint is **`md`**, not 1000 (E8).
- N6: Show me calls `router.push("/about")` with no hash.
- N7: Later, or Escape while focus is inside, closes the card and writes nothing.
- N8: it stays mounted through client navigation. It lives in the root layout's `Shell`, which does not unmount on a transition.
- N10: it is a `role="region"` with the label from copy, a polite live region announcing the heading once, placed last in DOM order, and it does not move focus.
- N11: `anim-sheet-in`, with no animation under reduced motion (`globals.css:747`).
- N5: while it is open on a phone, the page reserves its height at the foot, by setting `--about-sheet-h` on `document.documentElement` and reading it in `main`'s bottom padding. **That touches `shell.tsx`; see Task 2.3.**

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import { AboutSheet, sheetTitles } from "./about-sheet";

const entries = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, title: `Entry ${i}` }));

describe("sheetTitles (N1, N2)", () => {
  it("lists all up to four, never 'and 1 more'", () => {
    expect(sheetTitles(4)).toEqual({ shown: 4, more: 0 });
    expect(sheetTitles(5)).toEqual({ shown: 3, more: 2 });
  });
});

describe("AboutSheet", () => {
  it("names the count and the titles, with no links in the list", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(2) }} />);
    expect(screen.getByRole("region", { name: "New in About" })).toBeTruthy();
    expect(screen.getByText("2 new in About")).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
  it("Show me goes to /about with no hash (N6)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(push).toHaveBeenCalledWith("/about");
  });
  it("Later closes it and calls nothing on the server (N7)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("region")).toBeNull();
  });
  it("Escape inside closes it (N7)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Later" }), { key: "Escape" });
    expect(screen.queryByRole("region")).toBeNull();
  });
  it("first run introduces the page and lists nothing (N3)", () => {
    render(<AboutSheet state={{ kind: "firstRun" }} />);
    expect(screen.getByRole("region", { name: "About The 99" })).toBeTruthy();
    expect(screen.getByText("What The 99 does")).toBeTruthy();
    expect(screen.queryByText(/new in About/)).toBeNull();
  });
  it("is not modal (no aria-modal, no dialog role)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    expect(document.querySelector("[aria-modal]")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

- [ ] **Step 2:** Run `pnpm vitest run src/components/shell/about-sheet.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** to READINESS-r6 "Sheet, wide/phone" measurements, with `md:` in place of the 1000px breakpoint.
  - The head row is a 28px tile (radius 8; `--accent` at 16% fill and 45% hairline) holding a 9px `--accent` diamond, then `h2` Cinzel 17/700.
  - The titles are 13.5 (14 on a phone), with a `--border` hairline above each.
  - The buttons are `PrimaryButton` and `GhostButton` (36px; 44px and splitting the row on a phone).
  - The foot is mono 10.5, `--fg-faint`.
  - Component shape:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SheetState } from "../../lib/about/sheet-state";
import { aboutSheetCopy as copy } from "../../lib/copy/about";

export function sheetTitles(n: number): { shown: number; more: number } {
  return n <= 4 ? { shown: n, more: 0 } : { shown: 3, more: n - 3 };
}

export function AboutSheet({ state }: { state: Exclude<SheetState, { kind: "none" }> }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  // N5: reserve the card's height at the page foot on a phone while open.
  // A ResizeObserver on the card sets --about-sheet-h on <html>; cleared on close.
  useEffect(() => { /* observe card height → document.documentElement.style.setProperty(...) */ }, [open]);
  if (!open) return null;
  const firstRun = state.kind === "firstRun";
  // ...region, heading, list (sheetTitles), buttons, foot, per the measurements above
}
```

  Write the effect body in full, with a cleanup that removes the property. The comment above is a pointer to the rule, not code to ship.
- [ ] **Step 4:** Run the test. Expected: PASS. Then run `pnpm check:tokens`.
- [ ] **Step 5:** Commit: `git commit -m "About sheet: the non-modal card (R6 §N, E8 breakpoint)"`.

### Task 2.3: Mount in the shell (shared file: ask the-99-d9 first)

**Files:**
- Modify: `src/components/shell/shell.tsx:30-48`

- [ ] **Step 1: Implement.** After `const locked = …`:

```tsx
  const sheet = aboutSheetEnabled() ? readSheetState(await headers()) : { kind: "none" as const };
```

  Add `{sheet.kind !== "none" && <AboutSheet state={sheet} />}` as the root `div`'s last child, after `<TabBar />` (N10: last in tab order). Change `main`'s class to `pb-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:pb-0`. The fallback keeps `check:tokens` quiet, since a read with a fallback is a parameter (AGENTS.md).
- [ ] **Step 2: Verify** with `pnpm typecheck && pnpm lint && pnpm test && pnpm check:tokens`, then the stub build.
- [ ] **Step 3: Walk it in a browser** at 390, 800 and 1300 on local-dev, with `ABOUT_SHEET_ENABLED=true` and the probe account set behind. The sheet draws on the first document load, survives a client navigation, and is gone after a reload. At 800 it sits beside the nav rail, not over it (E8).
- [ ] **Step 4:** Commit, then open PR 2 (pre-open pass, pr-review, the design-review property table for §N, and a contact sheet at 390 and 1300).

---

## PR 3: The page

### Task 3.1: The index, the new-entry emphasis, and the eyebrow retired

**Files:**
- Modify: `src/components/about/about-page.tsx:38-52` (`NewMark`), `:54-83` (`Entry`), `:137-202` (props, eyebrow, index)
- Modify: `src/app/about/page.tsx:21-29` (pass `sheetMode = aboutSheetEnabled()`)
- Test: `src/components/about/about-page.test.tsx` (append; the file is 1,640 lines, so read only the helpers at its top)

**Interfaces:**
- `AboutPage` props become `{ seen: number; next?: string; sheetMode: boolean }`. With `sheetMode` false, the render is today's exactly.

With `sheetMode` true:
- **O1: the index** renders after the lede, and on a phone before the contents list. It is a `nav` labelled by its `h2` (`aboutCopy.newSinceEyebrow(n)`, moved rather than rewritten). It has one row per new entry, in page order. Each row is one link to `#${entry.id}`, holding the title (14.5/500) and the route (mono 11.5 accent, as plain text, never a nested link).
- **O3:** it renders nothing at `seen` 0 or when nothing is new.
- **The eyebrow** (`:198-202`) is not rendered.
- **§P0 (Q1 approved):** `NewMark` moves before the title (mono 10/600, padding 2px 7px, 8px gap). In the DOM, the sr-only text still follows the title. A new entry's top rule becomes 2px `--accent`; on a phone it is drawn only on new entries.
- **Got it:** neither the rail's dismiss form nor the phone's pinned bar (`:249`, `:260-275`) renders, because there is no `next` to continue to.

- [ ] **Step 1: Write the failing tests** (in the file's existing render helper style):
  - `sheetMode` with `seen` 8 renders `nav[aria-label]` with exactly the entries whose `since > 8`, each row an `a[href="#id"]` with no nested `a`;
  - it does not render the eyebrow `<p>`;
  - it renders no "Got it" button, even with `next` set;
  - the NEW pill precedes the title text in visual order: the pill is `h3`'s first child and the sr-only text is last;
  - a new entry has the `border-t-2` accent class and an old entry does not;
  - `sheetMode` false with `seen` 8 is unchanged: the existing eyebrow and dismiss tests still pass.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `pnpm vitest run src/components/about`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3.2: Record the visit on an actual open (E2)

**Files:**
- Modify: `src/app/about/actions.ts` (add `recordAboutVisit`)
- Create: `src/components/about/record-visit.tsx` (`"use client"`)
- Test: `src/app/about/actions.test.ts` (append) and `src/components/about/record-visit.test.tsx`

**Interfaces:**
- Produces `recordAboutVisit(): Promise<void>` (a server action: `requireUserId`, then `markAboutSeen(userId, ABOUT_VERSION)`, with **no** redirect and **no** revalidate, so the index stays on screen).
- Produces `RecordVisit({ behind }: { behind: boolean })`, which calls `recordAboutVisit()` once in `useEffect` when `behind` and renders nothing.

- [ ] **Step 1: Write the failing tests**
  - The action writes `ABOUT_VERSION` for the signed-in user and does not call `redirect`. Mock `next/navigation` and assert `redirect` is not called.
  - `RecordVisit` calls the action once after mount when `behind`, never when not behind, and not twice under StrictMode's double effect. Guard with a ref.
  - **Review Focus 3:** rendering `AboutPage` to a string (`renderToString`) calls the action zero times. A render, which is what a prefetch produces, never writes.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Mount `<RecordVisit behind={seen > 0 && newCount > 0} />` in `AboutPage` when `sheetMode`. A first-run reader at `seen` 0 also records, so their sheet stops. Use `behind = seen < ABOUT_VERSION`, which covers both.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3.3: The jump mark (§P)

**Files:**
- Create: `src/components/about/jump-mark.tsx` (`"use client"`)
- Modify: `src/components/about/contents-rail.tsx`, exporting the band options as `CURRENT_BAND = { rootMargin: "0px 0px -70% 0px", threshold: 0 }` (`:66`) so the jump and the rail share one band
- Test: `src/components/about/jump-mark.test.tsx`

Behavior:
- **P1:** on `hashchange` (or on mount with a hash), it adds `data-jumped` to the target entry's title line and focuses its `h3` (`tabindex=-1`). The CSS gives `[data-jumped]` an `--elevated` fill, radius 6, bleeding 10px into the gutter (8px on a phone). There is no accent edge.
- **P4:** it clears when an IntersectionObserver with `CURRENT_BAND` reports the entry leaving the band, or on the next jump.
- **P5:** it is never persisted, and does not use `:target`.
- **P6:** it uses the default hash navigation (push), so Back returns to the index or the contents.

- [ ] **Step 1:** Write failing tests. A `hashchange` to `#combo-awareness` sets `data-jumped` on that entry and focuses its `h3`. A second jump moves the mark. Mock `IntersectionObserver` as `about-page.test.tsx:921` does, and have an exit callback clear the mark.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit. Then run the full gate and the stub build, walk it at 390 and 1300, and open PR 3 (pre-open pass, design-review for §O and §P, contact sheet).

---

## PR 4: Contents and search

### Task 4.1: Measure the rail first (E4)

- [ ] **Step 1:** On local-dev at 1300×820, temporarily render all 39 entry rows in the rail with the R6 metrics (12.5/1.35, wrapping, padding 4/10/4/30). Measure the share of the list visible in the scroll box: `clientHeight / scrollHeight`.
- [ ] **Step 2:** Record the figure in the PR 4 body. **If it is under 0.6**, apply R9.1's fallback: the rail opens only the current chapter. That collapses the list, never the page, so ruling 4 holds. Write the chosen branch into Task 4.2's tests.

### Task 4.2: Entry-level contents and search

**Files:**
- Modify: `src/components/about/contents-rail.tsx` (`ContentsRail`, `ContentsList`, `RailChapter` → add `entries: { id; title; isNew }[]`)
- Modify: `src/components/about/about-page.tsx` (build `entries` per chapter, and pass `sheetMode` to both)
- Create: `src/lib/about/search.ts` and `src/lib/about/search.test.ts`
- Create: `src/components/about/contents-rail.test.tsx` (none exists today)

**Interfaces:**
- Produces `matchTitle(title: string, query: string): { matched: boolean; before: string; hit: string; after: string }`. It is a case-insensitive `indexOf`, with no RegExp (Review Focus 7).
- Produces `filterChapters(chapters, query): { chapters: RailChapter[]; count: number; total: number }`.

Behavior, with `sheetMode` true (STATES-r6 §Q, §R):
- **Wide (Q1–Q3):** a `SearchField` (34px) that never scrolls, under the `Contents` label. The list scrolls inside the sticky rail with every chapter open (or only the current one, if Task 4.1 chose the fallback). Entry rows wrap. `aria-current` and the `--elevated` fill move to the entry row once an entry is in the band.
- **Phone (Q4–Q7):** a 44px field. Chapter rows are links, with a trailing 44px disclosure `button` (`aria-expanded`). They start collapsed, including for a reader who is behind, and opening one never closes another.
- **Q6:** new entries carry a trailing mono `new` in accent.
- **Search (R1–R6):** the placeholder is `Find an entry`, labelled `Find an entry by title`.
  - Matches filter the rows. Chapters with no match drop **from the list only**. The matched run is `--fg`/600 and the rest `--fg-faint`. The trailing slot shows `m of 39` plus a clear ✕ (32px on a phone), in a polite live region.
  - On a phone, every chapter with a match opens.
  - No match shows `Nothing titled “q”.`, then the note, then `Clear search`.
  - Pressing a match jumps (Task 3.3) and keeps the query.
  - Enter jumps to the first match, ↓ moves into the list, and Escape clears.
  - Clearing restores the phone's previously open chapters.
- **Ruling 4:** no page element changes on search.

- [ ] **Step 1: Write the failing tests**
  - `matchTitle("The other half of a combo", "HALF")` gives `{ matched: true, before: "The other ", hit: "half", after: " of a combo" }`.
  - `matchTitle("Deck (v2)", "(v")` matches and does not throw.
  - `filterChapters` drops empty chapters and counts the matches.
  - Typing `mulligan` shows the empty state, and **the page's `#chapter-01…04` sections are all still in the document and unhidden.** That assertion pins ruling 4.
  - Enter moves the hash to the first match, and Escape clears the query.
  - On a phone, the disclosures start `aria-expanded="false"` for a reader who is behind (Q7).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Put the copy strings from §R8 (`contents.*`) into `aboutCopy`, and re-pin the hash, keeping version 9.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit. Then run the full gate, walk it, and open PR 4 (pre-open pass, design-review §Q/§R, contact sheet).

---

## PR 5: Probes, copy sites and the Q2 edit

### Task 5.1: One helper to clear About for a probe (E5)

**Files:**
- Create: `scripts/lib/about-clear.mjs`, and a test at `scripts/lib/about-clear.test.mts`
- Modify: the 12 probes. Each one replaces its inline `insert into user_prefs … about_version_seen` block (for example `probe-verdict-block.mjs:125-130`) with a call to the helper, and updates its header comment. Where a comment says "the redirect", it now says "the About sheet (or, with the switch off, the redirect)". The probes are:
  - `probe-bracket-chip`, `probe-brackets-sheet`, `probe-card-captions`, `probe-card-mark`;
  - `probe-declaration-ask`, `probe-swap-shopping`, `probe-synopsis-ui`, `probe-upgrade-path`;
  - `probe-verdict-block`, `probe-verdict-findings`, `probe-verdict-lean`, `probe-version-comparison`.

  **These belong to other lanes: ask the-99-d9 first.**

**Interfaces:**
- Produces `clearAbout({ sql, page, context, baseUrl })`. It writes `about_version_seen = greatest(…, version)` for the signed-in user, as today, **and** sets the `about_sheet` cookie to `<userId>.<version>` on the browser context. A probe never meets the sheet, whether or not it navigated before the write.

- [ ] **Step 1: Write the failing test.** Given a fake `context.addCookies`, `clearAbout` adds a cookie named `about_sheet` with the value `${userId}.${version}`, read from `about.version.json`.
- [ ] **Step 2:** Run `pnpm vitest run scripts/lib/about-clear.test.mts`. Expected: FAIL.
- [ ] **Step 3:** Implement, then swap all 12 call sites. Grep afterwards: `grep -ln "about_version_seen" scripts/probe-*.mjs` must list only files that import `clearAbout`.
- [ ] **Step 4:** Run the whole suite, including `scripts/lib/surface.test.mts`, which sweeps probe string literals.
- [ ] **Step 5:** Commit.

### Task 5.2: `probe:about`

**Files:**
- Create: `scripts/probe-about.mjs`
- Modify: `package.json` (add `"probe:about"`)

It walks 390×844, 800×900 and 1300×820 on local-dev with `ABOUT_SHEET_ENABLED=true`. It captures the account's `about_version_seen` first and restores it in a `finally`, holding it on disk as `scripts/lib/profile-hold.mjs` does, so a crash cannot leave the account behind. It **presses** every control; it never counts one. Each check:
1. **The sheet draws.** Set `seen = ABOUT_VERSION - 1`, clear the `about_sheet` cookie, and load `/decks`. The region `New in About` is visible, and the card's rect does not overlap the nav rail at 800 (E8) or the tab bar at 390 (N5).
2. **Later.** Press it, and the card is gone. The database still reads `seen = version - 1`. A reload shows no card, because the cookie is set.
3. **Show me.** Reset. Pressing it lands on `/about` (no hash) with the index present. After the effect, the database reads `seen = version`. **A reload of `/about` shows no index** (ruling 3).
4. **A prefetch does not write.** Reset. Hover the account menu's About link, wait 1s, and read the database: still behind (E2).
5. **The index row.** Reset, then open `/about` and press an index row. The hash changes, the entry's title line carries the `--elevated` fill, and focus sits on its `h3`. Back returns to the index.
6. **Search.** Type `combo`. The contents rows filter and the count reads `n of 39`. **Every `#chapter-NN` section is still visible** (ruling 4). Press a match: it jumps and the query stays. Type `mulligan`: the empty state shows. Escape clears.
7. **The legacy cookie.** Set `about_v=<userId>.9` and `seen = 8`, clear `about_sheet`, and load: the sheet draws (E1).

A run where any subject is missing fails. For example, if there are no new entries at `version - 1`, the run says so rather than passing.

**Mutations to run before believing it, each of which must fail:**
- read `about_v` in `sheetCookieIsCurrent`;
- call `recordAboutVisit` during render instead of the effect;
- hide `#chapter-NN` sections on search;
- use the 1000px breakpoint for the sheet;
- drop the header strip in the proxy.

Record the counts in the probe's header.

- [ ] Steps: write the probe, run it green, run each mutation (by pattern, never by line number), restore, and commit.

### Task 5.3: Copy sites and the Q2 edit

**Files:**
- `src/lib/copy/about.ts`:
  - the `aboutMenuCopy` comment (`:743-744`) becomes "the sheet is the notification" (E6);
  - **the Q2 edit, pending Hugh's pick below**.
- `src/components/shell/account-menu.tsx:24-26`: comment only (shared, so ask).
- `AGENTS.md`: the `probe:verdict-block` note about "Since #658 `proxy.ts` redirects…" gets "or, with `ABOUT_SHEET_ENABLED`, shows the sheet; probes clear both through `scripts/lib/about-clear.mjs`". Also a short `probe:about` entry.
- `about.version.json`: re-pin the hash, version 9.

**Q2 has no obvious target. No entry covers `/about`.** Checked: no `aboutEntries` item has `route: '/about'`. The one account-menu entry is `themes` (`about.ts:724-736`), which is about themes. This plan's reading: the "entry that covers the About page" is the page's own lede, `aboutCopy.pageIntro` (`about.ts:55-56`). Add one sentence to it: "When something new lands, a short note tells you once, and this page opens on it." It must pass `/copy-review`. **Hugh confirms or picks another target before Task 5.3 runs** (see "Questions for Hugh").

- [ ] Steps: edit, re-pin, send the copy to `/copy-review` with pictures through the orchestrator, run the full gate, commit, and open PR 5 (pre-open pass).

---

## Launch sequence

1. PRs 1–5 merge with the switch OFF in production. On staging it is ON, set in the-99-staging's env.
2. The orchestrator builds Hugh's staging walk checklist from `probe:about`'s seven checks.
3. Hugh walks staging, then flips `ABOUT_SHEET_ENABLED=true` in production and walks production.
4. **Only then** may the analysis line bump `ABOUT_VERSION` to 10. That bump is the first real announcement through the sheet.
5. PR 6.

## PR 6: Cleanup, after production flips

**Files:**
- `src/lib/about/gate.ts`: remove `gateDecision`'s redirect branch, `gateHandles` if it is unused, `ABOUT_COOKIE`, and `safeNext` (and its tests).
- `src/proxy.ts`: remove the switch branch, so the sheet path is the only path. Expire the legacy cookie once with `response.cookies.delete("about_v")` on the next document load.
- `src/lib/about/flag.ts`: delete it, together with its imports.
- `src/app/about/actions.ts`: remove `dismissAbout`.
- `src/app/about/page.tsx`: remove the `next`/`soleNext` handling.
- `about-page.tsx`: remove the `sheetMode` false branch, the dismiss copy (`dismiss`, `dismissDestination`, `dismissDestinationHome`, and desktop `entriesInChapter`; §R8 "retire"), and the eyebrow's standalone use.
- The matching tests; `AGENTS.md` (remove "until it ships" in the two About-rule paragraphs); `about.version.json` (re-pin).

- [ ] Steps: delete, run the full gate plus `probe:about` and one other-lane probe, and open PR 6.

## Questions for Hugh (through the-99-d9)

1. **Q2's target.** No About entry covers `/about`. Should the edit go into the page's own lede (`pageIntro`), which is this plan's reading, or somewhere else?
2. **Nothing else is open.** E1–E9 are all resolved in the tasks above: E1 in 1.1/1.2, E2 in 3.2, E3 by the version staying at 9 here, E4 in 4.1, E5 in 5.1, E6 in 5.3, E7 by reusing `anim-sheet-in`, E8 in the Global Constraints and 2.2, and E9 by the live search and jump in PR 3 and PR 4, which supersede `STATES-about.md:13`.
