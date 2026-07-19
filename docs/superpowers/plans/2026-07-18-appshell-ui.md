# App Shell (#5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship The 99's app shell — brand tokens & fonts, inline-SVG marks, dashboard/first-run home, signed-out landing, rail-and-tab-bar chrome, and the stub empty states for Collection/Commanders/Decks — plus the eng-side data hooks Design's READINESS audit called out (commander payload + completeness, paste-list server action, un-gated `/`, loading/degraded, focus-visible).

**Architecture:** Next.js App Router server components own the shell (Shell → NavRail/TabBar + main); client components are only reached for interactive bits (upload dropzone / paste toggle, Clerk's `UserButton`). Data fetching happens in RSC via drizzle queries and the existing `recommendCommanders`. The expensive commander recommender is isolated inside `<Suspense>` on Home so the surrounding dashboard streams first. First-run vs. dashboard branching keys off `getCollectionStats().uniqueCards`.

**Tech Stack:** Next.js 16.2.10 (App Router, `src/proxy.ts` middleware entrypoint), React 19.2.4, Tailwind v4 (`@theme` in `globals.css`), `@clerk/nextjs` ^7, drizzle-orm 0.45, Vitest 4 (node environment — no React testing libraries; UI verified by the design-review gate + browser).

## Global Constraints

- Tagline ships EXACTLY: "99 problems, but your commander ain't one."
- Styling values come from `docs/superpowers/design-tables/appshell.md` — implementers satisfy the table's rows for their components; the pre-PR design-review gate verifies row-by-row. Brand hexes become CSS custom properties in `globals.css`; components reference tokens, never raw hexes.
- Fonts: Cinzel, IBM Plex Sans, IBM Plex Mono via `next/font/google` (replacing Geist). CSS vars `--font-display`, `--font-sans`, `--font-mono`.
- Mobile + desktop parity in every task (breakpoint: rail ≥ md, bottom tabs < md).
- Marks (crowned-99, card-fan, XCIX seal) are inline SVG React components — never raster, never CSS-box approximations. Mark usage map: crowned-99 = identity only; card-fan = Collection/Decks; XCIX seal = Commanders.
- Next.js 16.2.10 (App Router; middleware file is `src/proxy.ts`, NOT `middleware.ts`), React 19, Tailwind v4 (`@theme` in `globals.css`), `@clerk/nextjs` ^7, Vitest node environment (no React testing libs — UI verified by the design-review gate + browser, logic by unit tests).
- TDD for all pure logic; thin DB queries follow the existing untested-query pattern (keep them logic-free).
- Commit style: conventional commits (`feat:` / `chore:` / `docs:`).

---

### Task 1: Brand foundation — tokens, fonts, focus, layout scaffold

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties `--bg --surface --surface-raised --border --border-strong --fg --fg-body --fg-muted --fg-faint --brass --brass-hover --brass-strong --brass-shadow --success --warning --danger --w --u --b --r --g` on `:root`; Tailwind theme aliases `--color-*` and `--font-display/--font-sans/--font-mono` wired through `@theme`; global `:focus-visible` treatment (2px brass outline, 2px offset — READINESS item 5).
- Produces: `<html>` receives font variable classes for Cinzel + IBM Plex Sans + IBM Plex Mono. `<body>` uses `font-sans` (IBM Plex Sans) + `bg-[color:var(--bg)] text-[color:var(--fg)]`.
- Consumes: Nothing new — replaces Geist wiring.

Steps:

- [ ] Overwrite `src/app/globals.css` with the full brand token set + Tailwind theme aliases + focus treatment:

```css
@import "tailwindcss";

/* ------------------------------------------------------------------
 * Brand tokens — every hex called out in docs/superpowers/design-tables/appshell.md
 * Semantic names first; raw hexes live only here.
 * ------------------------------------------------------------------ */
:root {
  /* Backgrounds / surfaces */
  --bg: #14110E;            /* base canvas */
  --surface: #1E1A15;       /* card / panel */
  --surface-raised: #221D16;/* account trigger row, deck-row hover */
  --surface-rail: #1A160F;  /* rail + tab-bar background */
  --surface-sunken: #181410;/* dropzone + textarea background */
  --surface-inset: #1C1712; /* dropzone hover background */
  --elevated: #2A241D;      /* active nav item, elevated inner */
  --elevated-hover: #211C15;/* rail idle hover */

  /* Borders / lines */
  --border: #2A241D;        /* soft dividers */
  --border-strong: #3A3229; /* card + rail borders */
  --border-dashed: #4A4033; /* dropzone dashed border */

  /* Text */
  --fg: #EDE6D8;            /* primary text */
  --fg-body: #C6B79A;       /* secondary body copy */
  --fg-muted: #A89B84;      /* muted labels */
  --fg-faint: #8E8269;      /* mono meta / faint captions */
  --fg-locked: #6A6152;     /* locked / disabled */
  --fg-mono-cursor: #6E6353;/* mono cursor tone */

  /* Brass accent */
  --brass: #C9A24B;
  --brass-hover: #D8B25E;
  --brass-strong: #A9863E;
  --brass-shadow: #6E5B33;

  /* Feedback */
  --success: #6FA368;
  --warning: #E0913C;
  --danger: #C6533F;

  /* WUBRG identity swatches */
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #1E1B1A;
  --r: #C05A3E;
  --g: #4B7A46;
}

/* ------------------------------------------------------------------
 * Tailwind v4 theme wiring — Tailwind utility classes read these.
 * `bg-bg`, `text-fg`, `border-border-strong`, `font-display`, etc.
 * ------------------------------------------------------------------ */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-surface-rail: var(--surface-rail);
  --color-surface-sunken: var(--surface-sunken);
  --color-surface-inset: var(--surface-inset);
  --color-elevated: var(--elevated);
  --color-elevated-hover: var(--elevated-hover);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-border-dashed: var(--border-dashed);
  --color-fg: var(--fg);
  --color-fg-body: var(--fg-body);
  --color-fg-muted: var(--fg-muted);
  --color-fg-faint: var(--fg-faint);
  --color-fg-locked: var(--fg-locked);
  --color-brass: var(--brass);
  --color-brass-hover: var(--brass-hover);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-w: var(--w);
  --color-u: var(--u);
  --color-b: var(--b);
  --color-r: var(--r);
  --color-g: var(--g);

  --font-display: var(--font-display);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}

/* ------------------------------------------------------------------
 * Base
 * ------------------------------------------------------------------ */
html, body { background: var(--bg); color: var(--fg); }
body { font-family: var(--font-sans), "IBM Plex Sans", system-ui, sans-serif; }

/* Brand focus treatment — READINESS item 5.
 * Applies globally so every focusable control (rail item, tab, chip, button,
 * link, popover trigger, textarea) picks it up unless a component overrides. */
:focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 2px;
  border-radius: 4px;
}
```

- [ ] Replace `src/app/layout.tsx` — swap Geist for Cinzel/IBM Plex Sans/IBM Plex Mono via `next/font/google`, strip the placeholder header (Task 5's `<Shell>` will re-add nav chrome), keep `ClerkProvider`, expose the three font variables:

```tsx
import type { Metadata } from "next";
import { Cinzel, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-display",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The 99",
  description: "MTG Commander companion",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${cinzel.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {/* Task 5 wraps children in <Shell>; keep passthrough until then. */}
          <main className="flex-1">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] Verify: run `pnpm build` (expected: succeeds; the placeholder `page.tsx` still renders — the new fonts load without errors).
- [ ] Commit:

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(shell): brand tokens, focus treatment, Cinzel/Plex fonts"
```

---

### Task 2: Inline-SVG marks — Crowned99, CardFan, XcixSeal

**Files:**
- Create: `src/components/marks.tsx`

**Interfaces:**
- Produces: `Crowned99({ size, className }: { size?: number; className?: string })` — full crowned-99 mark (three rotated diamond crown + Cinzel "99"). Callers set the height in px via `size` (defaults to 30 — the rail size); mono "THE" wordmark stays a text sibling.
- Produces: `CardFan({ size, className }: { size?: number; className?: string })` — three overlapping rotated card rectangles; front card is brass-outlined with a "99" glyph.
- Produces: `XcixSeal({ size, className }: { size?: number; className?: string })` — square rounded seal with a 2px brass border and centered "XCIX" glyph.
- Consumes: none.

Steps:

- [ ] Create `src/components/marks.tsx`:

```tsx
// Inline-SVG marks per docs/superpowers/design-tables/appshell.md §Marks Summary.
// - Crowned99 = identity mark (wordmark, signed-out hero, home greeting)
// - CardFan   = Collection / Decks (library motif)
// - XcixSeal  = Commanders (leadership regalia)
// Callers control final pixel dimensions with the `size` prop (height in px).
// Colors reference brand tokens via currentColor / raw brass token so the
// caller can theme via className.

type MarkProps = { size?: number; className?: string };

export function Crowned99({ size = 30, className }: MarkProps) {
  // Design: 3 diamonds (small/large/small) above a Cinzel "99".
  // viewBox chosen so 1 unit ≈ 1px at the rail-wordmark size (30px numeral).
  // Scaling via `size` keeps the crown proportions in every context.
  const width = size * 1.35;
  return (
    <svg
      role="img"
      aria-label="The 99"
      viewBox="0 0 54 40"
      width={width}
      height={size}
      className={className}
    >
      {/* Crown row — s / l / s diamonds, rotate 45deg, centered above numeral */}
      <g transform="translate(27 6)" fill="var(--brass)">
        <rect x="-11" y="-3" width="6" height="6" transform="rotate(45 -8 0)" />
        <rect x="-4"  y="-4" width="8" height="8" transform="rotate(45 0 0)" />
        <rect x="5"   y="-3" width="6" height="6" transform="rotate(45 8 0)" />
      </g>
      {/* Numeral */}
      <text
        x="27" y="36"
        textAnchor="middle"
        fontFamily="var(--font-display), 'Cinzel', serif"
        fontWeight={800}
        fontSize="30"
        fill="var(--fg)"
      >
        99
      </text>
    </svg>
  );
}

export function CardFan({ size = 110, className }: MarkProps) {
  // 3 overlapping card rects. Front card is brass-outlined and shows a Cinzel "99".
  // Container is roughly square-ish (100x110 mobile / 120x130 desktop).
  const w = size * (100 / 110);
  return (
    <svg
      role="img"
      aria-label="Card fan"
      viewBox="0 0 100 110"
      width={w}
      height={size}
      className={className}
    >
      {/* Back card */}
      <g transform="translate(50 55) rotate(-15) translate(-20 0)">
        <rect x="-26" y="-37" width="52" height="74" rx="8"
          fill="var(--elevated)" stroke="#4A4033" strokeWidth="1.5" />
      </g>
      {/* Middle card */}
      <g transform="translate(50 55)">
        <rect x="-26" y="-37" width="52" height="74" rx="8"
          fill="#33291F" stroke="#5A4B38" strokeWidth="1.5" />
      </g>
      {/* Front card (brass "99") */}
      <g transform="translate(50 55) rotate(15) translate(20 0)">
        <rect x="-26" y="-37" width="52" height="74" rx="8"
          fill="#3E3020" stroke="var(--brass)" strokeWidth="1.5" />
        <text
          x="0" y="8"
          textAnchor="middle"
          fontFamily="var(--font-display), 'Cinzel', serif"
          fontWeight={800}
          fontSize="22"
          fill="var(--brass)"
        >
          99
        </text>
      </g>
    </svg>
  );
}

export function XcixSeal({ size = 64, className }: MarkProps) {
  // Rounded-square brass-outlined seal, centered "XCIX" glyph.
  return (
    <svg
      role="img"
      aria-label="XCIX"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
    >
      <rect
        x="1" y="1" width="62" height="62"
        rx="14"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="2"
      />
      <text
        x="32" y="41"
        textAnchor="middle"
        fontFamily="var(--font-display), 'Cinzel', serif"
        fontWeight={700}
        fontSize="20"
        letterSpacing="0.04em"
        fill="var(--fg)"
      >
        XCIX
      </text>
    </svg>
  );
}
```

- [ ] No unit tests (SVG visual output — verified by the design-review gate + browser).
- [ ] Verify: `pnpm typecheck` passes.
- [ ] Commit:

```bash
git add src/components/marks.tsx
git commit -m "feat(shell): inline-SVG marks (Crowned99, CardFan, XcixSeal)"
```

---

### Task 3: Recs payload — colorIdentity, imageUri, completeness helper

**Files:**
- Modify: `src/lib/recs/score.ts`
- Modify: `src/lib/recs/recommend.ts`
- Modify: `src/lib/recs/score.test.ts`

**Interfaces:**
- Produces: `PoolCard` gains `imageUri: string | null`. `CommanderScore` gains `colorIdentity: string[]` and `imageUri: string | null` (both passed through from the commander `PoolCard`).
- Produces: `export function completeness(s: Pick<CommanderScore, "edhrecOwnedCount" | "edhrecTotal">): number | null` — returns `Math.round(100 * owned / total)` when both fields are present and total > 0, else `null`.
- Produces: `export const COMPLETENESS_THRESHOLDS = { high: 90, mid: 75 } as const` — UI reads this to pick fill color (≥high → success, ≥mid → warning, else danger; matches the property table Hero card / Card progress bar spec).
- Consumes (recommend.ts): `cards.imageUri` column (already exists in `src/db/schema.ts` line 16 as `image_uri`).

Steps:

- [ ] Modify `src/lib/recs/score.ts`:

```ts
import { classifyRoles, ROLE_TARGETS } from "./roles";

export type PoolCard = {
  oracleId: string; name: string; typeLine: string; oracleText: string | null;
  keywords: string[]; colorIdentity: string[];
  imageUri: string | null;
};

export type CommanderScore = {
  oracleId: string; name: string;
  colorIdentity: string[];
  imageUri: string | null;
  colorPoolSize: number;
  edhrecOwnedCount: number | null;
  edhrecTotal: number | null;
  roleCounts: Record<"ramp" | "draw" | "removal", number>;
  roleGaps: ("ramp" | "draw" | "removal")[];
  score: number;
};

export const COMPLETENESS_THRESHOLDS = { high: 90, mid: 75 } as const;

/**
 * Completeness percentage for the hero-card / commander-card progress bar.
 * Returns null when EDHREC data is missing (degraded mode) or total is 0 —
 * caller renders a "synergy data offline" note instead of a bar.
 */
export function completeness(
  s: Pick<CommanderScore, "edhrecOwnedCount" | "edhrecTotal">,
): number | null {
  if (s.edhrecTotal == null || s.edhrecOwnedCount == null) return null;
  if (s.edhrecTotal <= 0) return null;
  return Math.round((100 * s.edhrecOwnedCount) / s.edhrecTotal);
}

export function isCommanderCandidate(card: Pick<PoolCard, "typeLine" | "oracleText">): boolean {
  if (/legendary/i.test(card.typeLine) && /creature/i.test(card.typeLine)) return true;
  return /can be your commander/i.test(card.oracleText ?? "");
}

function fitsIdentity(card: PoolCard, identity: Set<string>): boolean {
  return card.colorIdentity.every((c) => identity.has(c));
}

export function scoreCommander(args: {
  commander: PoolCard;
  collection: PoolCard[];
  edhrecTopCards: string[] | null;
}): CommanderScore {
  const identity = new Set(args.commander.colorIdentity);
  const pool = args.collection.filter(
    (c) => c.oracleId !== args.commander.oracleId && fitsIdentity(c, identity),
  );

  const roleCounts = { ramp: 0, draw: 0, removal: 0 };
  for (const c of pool) {
    for (const role of classifyRoles(c)) {
      if (role !== "land") roleCounts[role]++;
    }
  }
  const roleGaps = (Object.keys(ROLE_TARGETS) as (keyof typeof ROLE_TARGETS)[])
    .filter((r) => roleCounts[r] < ROLE_TARGETS[r]);

  let edhrecOwnedCount: number | null = null;
  let edhrecTotal: number | null = null;
  if (args.edhrecTopCards) {
    const poolNames = new Set<string>();
    for (const c of pool) {
      const lower = c.name.toLowerCase();
      poolNames.add(lower);
      poolNames.add(lower.split(" // ")[0]);
    }
    edhrecTotal = args.edhrecTopCards.length;
    edhrecOwnedCount = args.edhrecTopCards
      .filter((n) => poolNames.has(n.toLowerCase())).length;
  }

  const overlapRatio = edhrecTotal ? (edhrecOwnedCount! / edhrecTotal) : 0;
  const roleCoverage =
    (Object.keys(ROLE_TARGETS) as (keyof typeof ROLE_TARGETS)[])
      .reduce((sum, r) => sum + Math.min(roleCounts[r], ROLE_TARGETS[r]) / ROLE_TARGETS[r], 0) /
    Object.keys(ROLE_TARGETS).length;
  const poolFactor = Math.min(args.collection.length ? pool.length / 200 : 0, 1);
  const score = Math.round((overlapRatio * 60 + roleCoverage * 25 + poolFactor * 15) * 10) / 10;

  return {
    oracleId: args.commander.oracleId,
    name: args.commander.name,
    colorIdentity: args.commander.colorIdentity,
    imageUri: args.commander.imageUri,
    colorPoolSize: pool.length,
    edhrecOwnedCount, edhrecTotal,
    roleCounts, roleGaps, score,
  };
}
```

- [ ] Modify `src/lib/recs/recommend.ts` — add `imageUri` to the select so the commander PoolCard carries it:

```ts
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems } from "../../db/schema";
import { getEdhrecData } from "../edhrec/client";
import { isCommanderCandidate, scoreCommander, type CommanderScore, type PoolCard } from "./score";

export async function recommendCommanders(
  userId: string,
): Promise<{ results: CommanderScore[]; degraded: boolean }> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
      imageUri: cards.imageUri,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(eq(collectionItems.userId, userId))
    .orderBy(cards.oracleId);

  const collection: PoolCard[] = owned.filter((c) => c.commanderLegal);
  const candidates = collection.filter((c) => isCommanderCandidate(c));

  const CONCURRENCY = 5;
  let degraded = false;
  const results: CommanderScore[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const scored = await Promise.all(
      candidates.slice(i, i + CONCURRENCY).map(async (commander) => {
        const edhrec = await getEdhrecData(commander.oracleId, commander.name);
        if (edhrec === null) degraded = true;
        return scoreCommander({ commander, collection, edhrecTopCards: edhrec?.topCards ?? null });
      }),
    );
    results.push(...scored);
  }
  results.sort((a, b) => b.score - a.score);
  return { results, degraded };
}
```

- [ ] Extend `src/lib/recs/score.test.ts` — keep existing tests, add new ones. Note the `card` factory needs `imageUri`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_THRESHOLDS,
  completeness,
  isCommanderCandidate,
  scoreCommander,
  type PoolCard,
} from "./score";

const card = (over: Partial<PoolCard>): PoolCard => ({
  oracleId: over.oracleId ?? randomUUID(),
  name: "X", typeLine: "Creature", oracleText: "", keywords: [], colorIdentity: [],
  imageUri: null,
  ...over,
});

describe("isCommanderCandidate", () => {
  it("accepts legendary creatures", () => {
    expect(isCommanderCandidate({ typeLine: "Legendary Creature — Elf", oracleText: "" })).toBe(true);
  });
  it("accepts 'can be your commander' cards", () => {
    expect(isCommanderCandidate({
      typeLine: "Legendary Planeswalker — Teferi",
      oracleText: "Teferi, Temporal Archmage can be your commander.",
    })).toBe(true);
  });
  it("rejects ordinary cards", () => {
    expect(isCommanderCandidate({ typeLine: "Instant", oracleText: "Draw a card." })).toBe(false);
  });
});

describe("scoreCommander", () => {
  const commander = card({
    name: "Golgari Guy",
    typeLine: "Legendary Creature",
    colorIdentity: ["B", "G"],
    imageUri: "https://cards.example/golgari.jpg",
  });
  const collection = [
    card({ name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.", colorIdentity: [] }),
    card({ name: "Cultivate", typeLine: "Sorcery", oracleText: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", colorIdentity: ["G"] }),
    card({ name: "Read the Bones", typeLine: "Sorcery", oracleText: "Draw two cards.", colorIdentity: ["B"] }),
    card({ name: "Lightning Bolt", typeLine: "Instant", oracleText: "Deals 3 damage to any target", colorIdentity: ["R"] }),
  ];

  it("counts only color-legal cards in the pool", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Cultivate"] });
    expect(s.colorPoolSize).toBe(3);
  });

  it("counts owned EDHREC top cards (color-legal only)", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Lightning Bolt", "Craterhoof Behemoth"] });
    expect(s.edhrecOwnedCount).toBe(1);
    expect(s.edhrecTotal).toBe(3);
  });

  it("reports role counts and gaps against targets", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.roleCounts).toEqual({ ramp: 2, draw: 1, removal: 0 });
    expect(s.roleGaps).toEqual(["ramp", "draw", "removal"]);
  });

  it("degrades: null edhrec fields but still scores by pool+roles", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.edhrecOwnedCount).toBeNull();
    expect(s.score).toBeGreaterThan(0);
  });

  it("ranks a commander with more EDHREC overlap higher, all else equal", () => {
    const low = scoreCommander({ commander, collection, edhrecTopCards: ["Craterhoof Behemoth"] });
    const high = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Cultivate", "Read the Bones"] });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("passes commander colorIdentity and imageUri through onto the score", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.colorIdentity).toEqual(["B", "G"]);
    expect(s.imageUri).toBe("https://cards.example/golgari.jpg");
  });
});

describe("completeness", () => {
  it("rounds owned/total to a percentage", () => {
    expect(completeness({ edhrecOwnedCount: 96, edhrecTotal: 99 })).toBe(97);
    expect(completeness({ edhrecOwnedCount: 3, edhrecTotal: 4 })).toBe(75);
  });

  it("returns null when EDHREC data is missing", () => {
    expect(completeness({ edhrecOwnedCount: null, edhrecTotal: null })).toBeNull();
    expect(completeness({ edhrecOwnedCount: 5, edhrecTotal: null })).toBeNull();
    expect(completeness({ edhrecOwnedCount: null, edhrecTotal: 10 })).toBeNull();
  });

  it("returns null when total is zero", () => {
    expect(completeness({ edhrecOwnedCount: 0, edhrecTotal: 0 })).toBeNull();
  });

  it("exposes threshold constants matching the property-table progress-bar spec", () => {
    expect(COMPLETENESS_THRESHOLDS.high).toBe(90);
    expect(COMPLETENESS_THRESHOLDS.mid).toBe(75);
  });
});
```

- [ ] Verify: `pnpm vitest run src/lib/recs/score.test.ts` — all tests pass (existing + new).
- [ ] Commit:

```bash
git add src/lib/recs/score.ts src/lib/recs/score.test.ts src/lib/recs/recommend.ts
git commit -m "feat(recs): expose colorIdentity, imageUri, completeness helper"
```

---

### Task 4: Paste-list parser + `previewPaste` server action

**Files:**
- Create: `src/lib/manabox/paste.ts`
- Create: `src/lib/manabox/paste.test.ts`
- Modify: `src/app/collection/actions.ts`

**Interfaces:**
- Produces: `parsePasteList(text: string): { rows: ManaBoxRow[]; errors: ParseError[] }` — accepts `N Card Name`, `Nx Card Name`, or bare `Card Name` (quantity 1); trims each line; skips blank lines; a line whose leading token parses as an integer ≤ 0, or whose remainder after quantity strip is empty, becomes a `ParseError { line, raw, reason }`. Rows are produced with `setCode: ""`, `scryfallId: null`, `foil: false`, `condition: null` — **`scryfallId` must be `null` (not `""`)** because `matchRows` (`src/lib/collection/match.ts` line 27) uses `row.scryfallId && byScryfallId.get(...)` and then `?? byName.get(...)`; an empty string is truthy-falsy for `&&` but not-nullish for `??`, so `""` would short-circuit to `""` and never fall through to name lookup. `ManaBoxRow.scryfallId: string | null` in `src/lib/manabox/parse.ts` line 3 already allows `null`.
- Produces: `previewPaste(text: string): Promise<UploadPreview>` server action — mirrors `previewUpload` exactly (same `UploadPreview` return shape, same zero-row fatal guard, same `csv_uploads` row insert so `confirmUpload` works unchanged). Filename is stored as `"paste.txt"` so audit rows are distinguishable.
- Consumes: `matchRows` (existing), `csvUploads` (existing).

Steps:

- [ ] Create `src/lib/manabox/paste.ts`:

```ts
import type { ManaBoxRow, ParseError } from "./parse";

/**
 * Parse a plain-text paste list.
 * Supported line shapes (all trimmed, blank lines ignored):
 *   "3 Sol Ring"
 *   "3x Sol Ring"
 *   "Sol Ring"          → quantity 1
 * A leading integer <= 0 or an empty name after quantity strip → ParseError.
 *
 * Produces ManaBoxRows compatible with matchRows() by name only:
 *   scryfallId is null (NOT "") so matchRows' `row.scryfallId && ...`
 *   short-circuits cleanly to the name-index lookup.
 */
export function parsePasteList(text: string): { rows: ManaBoxRow[]; errors: ParseError[] } {
  const lines = text.split(/\r?\n/);
  const rows: ManaBoxRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    // "3 name", "3x name", "3X name", or bare "name"
    const m = /^(\d+)\s*[xX]?\s+(.+)$/.exec(trimmed);
    let quantity: number;
    let name: string;
    if (m) {
      quantity = Number(m[1]);
      name = m[2].trim();
      if (!Number.isInteger(quantity) || quantity <= 0) {
        errors.push({ line: i + 1, raw, reason: `invalid quantity "${m[1]}"` });
        continue;
      }
    } else if (/^\d+[xX]?$/.test(trimmed)) {
      // Only a quantity, no name.
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
      scryfallId: null, // matchRows: null lets `?? byName.get(...)` run
      foil: false,
      condition: null,
    });
  }

  return { rows, errors };
}
```

- [ ] Create `src/lib/manabox/paste.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePasteList } from "./paste";

describe("parsePasteList", () => {
  it("parses `N Name` lines", () => {
    const { rows, errors } = parsePasteList("3 Sol Ring\n1 Cultivate\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 3, scryfallId: null, foil: false, condition: null },
      { name: "Cultivate", setCode: "", quantity: 1, scryfallId: null, foil: false, condition: null },
    ]);
  });

  it("parses `Nx Name` and `NX Name`", () => {
    const { rows } = parsePasteList("2x Sol Ring\n4X Cultivate\n");
    expect(rows.map((r) => [r.quantity, r.name])).toEqual([
      [2, "Sol Ring"],
      [4, "Cultivate"],
    ]);
  });

  it("treats a bare name as quantity 1", () => {
    const { rows } = parsePasteList("Sol Ring\n");
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 1, scryfallId: null, foil: false, condition: null },
    ]);
  });

  it("skips blank lines and trims whitespace", () => {
    const { rows, errors } = parsePasteList("\n  3 Sol Ring  \n\n  Cultivate\n\n");
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Sol Ring");
    expect(rows[1].name).toBe("Cultivate");
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

  it("produces rows compatible with matchRows: scryfallId is null (not empty string)", () => {
    // Contract test: matchRows uses `row.scryfallId && ...` then `??` fallback;
    // "" would short-circuit both operators and drop every row into `unmatched`.
    const { rows } = parsePasteList("1 Sol Ring\n");
    expect(rows[0].scryfallId).toBeNull();
  });
});
```

- [ ] Modify `src/app/collection/actions.ts` — factor the shared post-parse pipeline into a private helper, then add `previewPaste`:

```ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { cards, collectionItems, csvUploads } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { parseManaBoxCsv, type ManaBoxRow, type ParseError } from "../../lib/manabox/parse";
import { parsePasteList } from "../../lib/manabox/paste";
import { matchRows } from "../../lib/collection/match";

export type UploadPreview = {
  uploadId: string;
  matchedCardCount: number;
  unmatchedRows: { name: string; setCode: string }[];
  parseErrors: { line: number; reason: string }[];
  currentCollectionCount: number;
};

type PendingItem = { oracleId: string; setCode: string; foil: boolean; condition: string | null; quantity: number };

/**
 * Shared post-parse pipeline for previewUpload / previewPaste.
 * Guards the zero-row case (empty preview would silently wipe on confirm),
 * matches rows against the catalog, aggregates matched rows to compact
 * (oracleId,setCode,foil) totals, records currentCollectionCount, and
 * writes the csv_uploads row that confirmUpload reads back.
 */
async function buildPreview(args: {
  userId: string;
  filename: string;
  rows: ManaBoxRow[];
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

  const [upload] = await db.insert(csvUploads).values({
    userId,
    filename,
    rowCount: rows.length,
    unmatchedCount: unmatched.length,
    previewPayload: { unmatched, parseErrors: errors, pendingItems },
  }).returning({ id: csvUploads.id });

  return {
    uploadId: upload.id,
    matchedCardCount,
    unmatchedRows: unmatched.map((r) => ({ name: r.name, setCode: r.setCode })),
    parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
    currentCollectionCount,
  };
}

export async function previewUpload(formData: FormData): Promise<UploadPreview> {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No CSV file provided");
  const { rows, errors } = parseManaBoxCsv(await file.text());
  return buildPreview({ userId, filename: file.name, rows, errors });
}

export async function previewPaste(text: string): Promise<UploadPreview> {
  const userId = await requireUserId();
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
  revalidatePath("/"); // Task 10: dissolves the first-run checklist.
}
```

- [ ] Verify: `pnpm vitest run src/lib/manabox/paste.test.ts` — 7 tests pass.
- [ ] Verify: `pnpm vitest run src/lib/manabox` — existing `parseManaBoxCsv` tests remain green.
- [ ] Commit:

```bash
git add src/lib/manabox/paste.ts src/lib/manabox/paste.test.ts src/app/collection/actions.ts
git commit -m "feat(collection): paste-list parser + previewPaste server action"
```

---

### Task 5: Shell chrome — NavRail + TabBar + Shell wrapper

**Files:**
- Create: `src/components/shell/nav.tsx`
- Create: `src/components/shell/shell.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `NavRail()` client component (uses `usePathname` for active state) — desktop only (`hidden md:flex`). Items: Home (`/`, Crowned99), Collection (`/collection`, CardFan), Commanders (`/commanders`, XcixSeal), Decks (`/decks`, CardFan). Wordmark + nav + Clerk `<UserButton />` mounted at the foot.
- Produces: `TabBar()` client component — mobile only (`md:hidden`, `fixed bottom-0 inset-x-0`). Same four items, diamond bullet + label.
- Produces: `MobileHeader()` client component — mobile only (`md:hidden`), wordmark + Clerk `<UserButton />`.
- Produces: `Shell({ children })` server component — calls `auth()` from `@clerk/nextjs/server`; signed-out renders `{children}` bare (no chrome); signed-in wraps children with the rail (left), mobile header (top), scrollable main, and bottom tab bar.
- Consumes: `Crowned99`, `CardFan`, `XcixSeal` (Task 2); Clerk `<UserButton />`.

Steps:

- [ ] Create `src/components/shell/nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import type { ComponentType } from "react";
import { Crowned99, CardFan, XcixSeal } from "../marks";

type NavItem = {
  href: "/" | "/collection" | "/commanders" | "/decks";
  label: string;
  Mark: ComponentType<{ size?: number; className?: string }>;
};

// Mark usage map (design decision log #8): crowned-99 = identity/Home,
// card-fan = Collection AND Decks, XCIX seal = Commanders.
const ITEMS: NavItem[] = [
  { href: "/",            label: "Home",       Mark: Crowned99 },
  { href: "/collection",  label: "Collection", Mark: CardFan },
  { href: "/commanders",  label: "Commanders", Mark: XcixSeal },
  { href: "/decks",       label: "Decks",      Mark: CardFan },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Small brass diamond bullet — active state per property table §Rail Nav item Active. */
function Diamond({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block h-[6px] w-[6px] rotate-45"
      style={{ background: active ? "var(--brass)" : "var(--border-strong)" }}
    />
  );
}

export function NavRail() {
  const pathname = usePathname();
  return (
    <aside
      // Style per property table §Rail container + §Rail Wordmark area + §Rail Nav section.
      className="hidden md:flex md:flex-col w-[236px] shrink-0 h-screen sticky top-0"
      style={{
        background: "var(--surface-rail)",
        borderRight: "1px solid var(--border-strong)",
      }}
    >
      {/* Wordmark — style per §Rail Wordmark */}
      <div
        className="flex items-end gap-[7px] px-5 pt-[22px] pb-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="pb-[5px]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.42em",
            color: "var(--brass)",
          }}
        >
          THE
        </span>
        <Crowned99 size={30} />
      </div>

      {/* Nav — style per §Rail Nav section */}
      <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Primary">
        {ITEMS.map(({ href, label, Mark }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              // Style per §Rail Nav item Active/Idle/Hover
              // Background lives in classes (not inline style) so the idle
              // hover state (--elevated-hover, per §Rail Nav item Hover) works.
              className={`flex items-center gap-[11px] rounded-lg px-3 py-[10px] text-sm transition-colors ${
                active ? "bg-elevated" : "bg-transparent hover:bg-elevated-hover"
              }`}
              style={{
                color: active ? "var(--fg)" : "var(--fg-muted)",
                fontWeight: active ? 600 : 500,
              }}
              aria-current={active ? "page" : undefined}
            >
              <Diamond active={active} />
              <Mark size={16} className="opacity-80" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Account block — pinned to bottom. Style per §Rail Account trigger row. */}
      <div className="mt-auto p-3">
        <div
          className="flex items-center gap-3 rounded-[14px] py-[2px] pr-3 pl-[2px]"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {/* Clerk UserButton — we own placement + skin only.
              Wrapper mimics avatar-badge dimensions per §Rail Avatar badge. */}
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "h-[38px] w-[38px] rounded-[12px] border border-[color:var(--brass)]",
              },
            }}
          />
        </div>
      </div>
    </aside>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      // Style per §Tab bar container / §Tab item
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex px-[6px] pt-[10px] pb-[22px]"
      style={{
        background: "var(--surface-rail)",
        borderTop: "1px solid var(--border-strong)",
      }}
      aria-label="Primary"
    >
      {ITEMS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-[5px]"
            aria-current={active ? "page" : undefined}
          >
            <span
              aria-hidden
              className="h-[8px] w-[8px] rotate-45"
              style={{ background: active ? "var(--brass)" : "#4A4033" }}
            />
            <span
              style={{
                fontSize: 10,
                color: active ? "var(--brass)" : "var(--fg-faint)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileHeader() {
  return (
    <header
      // Style per §Mobile Top Header + §Mobile Wordmark
      className="md:hidden flex items-center justify-between px-5 pt-5 pb-[14px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-end gap-[3px]">
        <span
          className="pb-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.4em",
            color: "var(--brass)",
          }}
        >
          THE
        </span>
        <Crowned99 size={24} />
      </div>
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox:
              "h-[38px] w-[38px] rounded-[12px] border border-[color:var(--brass)]",
          },
        }}
      />
    </header>
  );
}
```

- [ ] Create `src/components/shell/shell.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server";
import { NavRail, TabBar, MobileHeader } from "./nav";

/**
 * Server component. Signed-out users get the bare page (Task 7 renders the
 * hero landing at "/"); signed-in users get the full shell with rail (≥ md),
 * mobile header + bottom tabs (< md), and a scrollable main column.
 */
export default async function Shell({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        {/* pb-[80px] on mobile leaves room for the fixed tab bar (48px content + 22px safe-area + gap). */}
        <main className="min-w-0 flex-1 pb-[80px] md:pb-0">{children}</main>
      </div>
      <TabBar />
    </div>
  );
}
```

- [ ] Modify `src/app/layout.tsx` — replace the passthrough `<main>` with `<Shell>`:

```tsx
import type { Metadata } from "next";
import { Cinzel, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Shell from "../components/shell/shell";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-display",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The 99",
  description: "MTG Commander companion",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${cinzel.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      >
        <body className="min-h-full">
          <Shell>{children}</Shell>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] Verify: `pnpm typecheck && pnpm build` succeed.
- [ ] Commit:

```bash
git add src/components/shell/nav.tsx src/components/shell/shell.tsx src/app/layout.tsx
git commit -m "feat(shell): NavRail + TabBar + auth-gated Shell wrapper"
```

---

### Task 6: Un-gate `/` in `src/proxy.ts`

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Produces: `/` and `/api/cron(.*)` become public; every other route stays Clerk-protected via `auth.protect()`.

Steps:

- [ ] Overwrite `src/proxy.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 renamed the middleware entrypoint: `src/proxy.ts` is the
// replacement for `src/middleware.ts` (same functionality, new file convention).
//
// "/" is public so the signed-out landing (Task 7) can render;
// everything else remains Clerk-protected. Sign-in/up still happen on Clerk's
// hosted Account Portal — no in-app auth routes to allowlist.
const isPublic = createRouteMatcher(["/", "/api/cron(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
```

- [ ] Verify: `pnpm typecheck && pnpm build` succeed.
- [ ] Commit:

```bash
git add src/proxy.ts
git commit -m "feat(shell): un-gate / for signed-out landing"
```

---

### Task 7: Signed-out landing at `/`

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `/` (server component) — branches on `auth()`. Signed-out branch renders the hero mark + wordmark + tagline + Clerk `<SignInButton mode="modal">` + invite-only note per property table §Signed-Out Landing. Signed-in branch temporarily renders a placeholder `<div>` — Task 10 replaces it.

Steps:

- [ ] Overwrite `src/app/page.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Crowned99 } from "../components/marks";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <section
        // Style per property table §Signed-Out Landing / Page layout.
        // Radial gradient (signed-out only) applied via inline style so we can
        // set both fallback bg and gradient in one place.
        className="flex min-h-screen flex-col items-center justify-center px-8 md:px-10 text-center"
        style={{
          background:
            "radial-gradient(1000px 520px at 50% 8%, rgba(201,162,75,0.10), transparent 70%), var(--bg)",
        }}
      >
        <Crowned99 size={132} />

        <p
          className="mt-4"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            letterSpacing: "0.44em",
            color: "var(--brass)",
          }}
        >
          THE NINETY-NINE
        </p>

        <p
          className="mt-6 max-w-[280px] italic md:max-w-none"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 21,
            lineHeight: 1.5,
            color: "var(--fg-body)",
          }}
        >
          99 problems, but your commander ain&apos;t one.
        </p>

        <SignInButton mode="modal">
          <button
            type="button"
            // Style per §Sign in button
            // HomePage is a server component — no event handlers allowed.
            // Hover via Tailwind utilities (bg-brass / hover:bg-brass-hover map
            // to Task 1's @theme aliases).
            className="mt-9 w-full max-w-[260px] rounded-lg py-[14px] font-semibold md:w-auto md:px-10 bg-brass hover:bg-brass-hover transition-colors"
            style={{
              color: "var(--bg)",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
            }}
          >
            Sign in
          </button>
        </SignInButton>

        <p
          className="mt-5"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--fg-faint)",
          }}
        >
          Invite-only · access by request · a Commander companion
        </p>
      </section>
    );
  }

  // Signed-in branch — Task 10 renders the dashboard here.
  return <div className="p-6 text-fg" />;
}
```

- [ ] Verify: `pnpm typecheck && pnpm build` succeed.
- [ ] Commit:

```bash
git add src/app/page.tsx
git commit -m "feat(shell): signed-out landing at /"
```

---

### Task 8: Home data layer — `getCollectionStats` + `listRecentDecks`

**Files:**
- Create: `src/lib/home/summary.ts`

**Interfaces:**
- Produces: `getCollectionStats(userId: string): Promise<{ totalCards: number; uniqueCards: number }>` — `totalCards` = SUM(collectionItems.quantity); `uniqueCards` = COUNT(*) of collectionItems rows for the user (each row is one distinct (oracleId, setCode, foil) triple — matches the "Unique" figure in the property table §Stat rows).
- Produces: `listRecentDecks(userId: string, limit?: number): Promise<{ id: string; name: string; commanderName: string; colorIdentity: string[]; cardCount: number; createdAt: Date }[]>` — joins `decks` → `cards` on `commanderOracleId` for `commanderName` + `colorIdentity`; left-joins `deckCards` grouped by deck for `cardCount` (SUM(quantity)); ordered by `createdAt DESC`; default `limit = 3`.
- Consumes: `decks`, `deckCards`, `cards`, `collectionItems` from `src/db/schema.ts`.

Steps:

- [ ] Create `src/lib/home/summary.ts`:

```ts
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards, decks } from "../../db/schema";

/**
 * Thin, logic-free queries for the home dashboard.
 * Follows the untested-query pattern (see recommend.ts) — pure logic gets tests,
 * shape-shifting SQL does not.
 */

export async function getCollectionStats(
  userId: string,
): Promise<{ totalCards: number; uniqueCards: number }> {
  const [row] = await db
    .select({
      totalCards: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int`,
      uniqueCards: sql<number>`count(*)::int`,
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId));
  return { totalCards: row?.totalCards ?? 0, uniqueCards: row?.uniqueCards ?? 0 };
}

export type RecentDeck = {
  id: string;
  name: string;
  commanderName: string;
  colorIdentity: string[];
  cardCount: number;
  createdAt: Date;
};

export async function listRecentDecks(
  userId: string,
  limit = 3,
): Promise<RecentDeck[]> {
  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      commanderName: cards.name,
      colorIdentity: cards.colorIdentity,
      cardCount: sql<number>`coalesce((
        select sum(${deckCards.quantity})::int
        from ${deckCards}
        where ${deckCards.deckId} = ${decks.id}
      ), 0)`,
      createdAt: decks.createdAt,
    })
    .from(decks)
    .innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))
    .where(eq(decks.userId, userId))
    .orderBy(desc(decks.createdAt))
    .limit(limit);
  return rows;
}
```

- [ ] Verify: `pnpm typecheck` passes (no test — thin query per codebase pattern).
- [ ] Commit:

```bash
git add src/lib/home/summary.ts
git commit -m "feat(home): getCollectionStats + listRecentDecks queries"
```

---

### Task 9: Upload entry + interim review + stub empty-state pages

**Files:**
- Create: `src/components/collection/upload-entry.tsx`
- Create: `src/app/collection/page.tsx`
- Create: `src/app/commanders/page.tsx`
- Modify: `src/app/decks/page.tsx` (create if missing; check first)

**Interfaces:**
- Produces: `UploadEntry()` client component — dropzone (`<input type="file">` + drag-over state) + a "Paste a list instead" toggle that reveals a textarea; submits either `previewUpload(formData)` or `previewPaste(text)` and renders an **interim** review (matched count, unmatched count, parse-error count, current-count replace warning, Confirm button → `confirmUpload()`, Cancel). A code comment notes #6's designed 3-step flow supersedes it.
- Produces: `/collection` — server component reads `getCollectionStats(userId)`. Empty → property table §Collection Empty (CardFan mark + copy + `<UploadEntry />`). Non-empty → interim card-count line + `<UploadEntry />`, comment noting #6 replaces.
- Produces: `/commanders` — server component reads `getCollectionStats(userId)` (cheap query — deliberately not `recommendCommanders`, which is the multi-second EDHREC round-trip). Empty collection → §Collection Empty analog (Add cards CTA). Non-empty → §No Candidates shell state per §Empty State — No Commander Candidates (XcixSeal + heading + "N cards scanned · candidates loading with #7" copy) — we intentionally do not fan out to EDHREC here, per the task brief.
- Produces: `/decks` — server component reads `listRecentDecks(userId, 50)`. Empty → §No Decks (CardFan + copy + "Browse commanders" CTA). Non-empty → interim simple list of decks.

Steps:

- [ ] Check whether `/decks/page.tsx` already exists:

```bash
ls src/app/decks
```

  (If it does, Modify; if not, Create. The step below assumes Create; if the file exists, replace its contents.)

- [ ] Create `src/components/collection/upload-entry.tsx`:

```tsx
"use client";

// INTERIM upload UI — the designed 3-step review/replace flow lives in #6.
// This ships a functional dropzone + paste fallback so first-run's Step 1
// can complete end-to-end (parse → preview → confirm → dashboard).
// Style per property table §CSV Dropzone / §Paste-List View (compact).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewUpload, previewPaste, confirmUpload, type UploadPreview } from "../../app/collection/actions";

type Mode = "dropzone" | "paste";

export function UploadEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("dropzone");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const p = await previewUpload(fd);
      setPreview(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function handlePasteSubmit() {
    setError(null);
    try {
      const p = await previewPaste(pasteText);
      setPreview(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    startTransition(async () => {
      try {
        await confirmUpload(preview.uploadId);
        setPreview(null);
        setPasteText("");
        router.refresh(); // Server actions already revalidatePath("/", "/collection").
      } catch (e) {
        setError(e instanceof Error ? e.message : "Confirm failed");
      }
    });
  }

  if (preview) {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-strong)",
        }}
      >
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--fg)" }}>
          Review before importing
        </p>
        <ul className="mt-3 space-y-1" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-body)" }}>
          <li>Matched: <span style={{ color: "var(--success)" }}>{preview.matchedCardCount}</span> cards</li>
          <li>Unmatched: <span style={{ color: "var(--warning)" }}>{preview.unmatchedRows.length}</span> rows</li>
          <li>Parse errors: <span style={{ color: "var(--danger)" }}>{preview.parseErrors.length}</span></li>
          {preview.currentCollectionCount > 0 && (
            <li style={{ color: "var(--warning)" }}>
              Confirming will REPLACE your current {preview.currentCollectionCount.toLocaleString()} cards.
            </li>
          )}
        </ul>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="rounded-lg px-5 py-3 font-semibold"
            style={{ background: "var(--brass)", color: "var(--bg)", fontSize: 14 }}
          >
            {pending ? "Importing…" : "Confirm import"}
          </button>
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="rounded-lg px-5 py-3"
            style={{ border: "1px solid var(--border-strong)", color: "var(--fg)", fontSize: 14 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {mode === "dropzone" ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void handleFile(f);
          }}
          className="block cursor-pointer rounded-xl p-6 text-center md:p-8"
          style={{
            background: dragOver ? "var(--surface-inset)" : "var(--surface-sunken)",
            border: `1.5px dashed ${dragOver ? "var(--brass)" : "var(--border-dashed)"}`,
          }}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ border: "1px solid var(--brass)", color: "var(--brass)", fontSize: 24 }}
            aria-hidden
          >
            ↑
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)" }}>
            Drop your collection CSV here
          </div>
          <div
            className="mt-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-faint)",
              letterSpacing: "0.06em",
            }}
          >
            ManaBox CSV export · more formats arrive with #6
          </div>
        </label>
      ) : (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <p
            className="mb-3"
            style={{ fontSize: 13, color: "var(--fg-body)", lineHeight: 1.55 }}
          >
            One card per line — quantity, then name. We&apos;ll match them against the Oracle database.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="h-[240px] w-full rounded-lg p-4"
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--border-strong)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--fg-body)",
              lineHeight: 1.9,
            }}
            placeholder={"3 Sol Ring\n1 Cultivate\nRhystic Study"}
          />
          <button
            type="button"
            onClick={() => void handlePasteSubmit()}
            disabled={!pasteText.trim()}
            className="mt-4 w-full rounded-lg py-3 font-semibold"
            style={{ background: "var(--brass)", color: "var(--bg)", fontSize: 15 }}
          >
            Import list
          </button>
        </div>
      )}

      {/* Mode toggle */}
      <button
        type="button"
        onClick={() => setMode(mode === "dropzone" ? "paste" : "dropzone")}
        className="mt-4"
        style={{ fontSize: 13, color: "var(--brass)" }}
      >
        {mode === "dropzone" ? "Paste a list instead →" : "← Upload a CSV instead"}
      </button>

      {error && (
        <p className="mt-3" style={{ color: "var(--danger)", fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] Create `src/app/collection/page.tsx`:

```tsx
// INTERIM Collection surface — designed 3-step flow lives in #6.
// Empty state per property table §Empty State — Collection Empty.
import { requireUserId } from "../../lib/auth";
import { getCollectionStats } from "../../lib/home/summary";
import { CardFan } from "../../components/marks";
import { UploadEntry } from "../../components/collection/upload-entry";

export default async function CollectionPage() {
  const userId = await requireUserId();
  const stats = await getCollectionStats(userId);

  if (stats.uniqueCards === 0) {
    return (
      <section className="flex flex-col items-center justify-center p-8 text-center md:p-12">
        <CardFan size={130} className="mb-6" />
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
          }}
        >
          Your collection is empty
        </h1>
        <p
          className="mt-3 max-w-[420px]"
          style={{ fontSize: 16, color: "var(--fg-body)", lineHeight: 1.6 }}
        >
          A pile of possibilities waiting for a general. Upload a CSV and the table fills — commanders and decks follow.
        </p>
        <div className="mt-7 w-full max-w-[480px]">
          <UploadEntry />
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 md:p-10">
      <p
        className="mb-6"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--fg-muted)",
        }}
      >
        {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique
      </p>
      <UploadEntry />
      {/* NOTE: the full grid + filters + review flow ships in #6. */}
    </section>
  );
}
```

- [ ] Create `src/app/commanders/page.tsx`:

```tsx
// INTERIM Commanders surface — full grid + filters + hero ranking ships in #7.
// We deliberately DO NOT call recommendCommanders here (dozens of EDHREC
// fetches, multi-second load). We only need the collection count to decide
// which shell state to render.
import { requireUserId } from "../../lib/auth";
import { getCollectionStats } from "../../lib/home/summary";
import { CardFan, XcixSeal } from "../../components/marks";
import Link from "next/link";

export default async function CommandersPage() {
  const userId = await requireUserId();
  const stats = await getCollectionStats(userId);

  if (stats.uniqueCards === 0) {
    // No cards → the collection-empty analog (send the user to upload).
    return (
      <section className="flex flex-col items-center justify-center p-8 text-center md:p-12">
        <CardFan size={130} className="mb-6" />
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
          }}
        >
          No collection yet
        </h1>
        <p
          className="mt-3 max-w-[420px]"
          style={{ fontSize: 16, color: "var(--fg-body)", lineHeight: 1.6 }}
        >
          Upload your cards and we&apos;ll rank every commander you can build.
        </p>
        <Link
          href="/collection"
          className="mt-6 rounded-lg px-6 py-3 font-semibold"
          style={{ background: "var(--brass)", color: "var(--bg)", fontSize: 14 }}
        >
          Upload collection
        </Link>
      </section>
    );
  }

  // Interim shell: cards exist but the full ranking surface ships in #7.
  // §Empty State — No Commander Candidates gives us the right chrome to
  // stand in ("N cards scanned · full ranking arrives in #7").
  return (
    <section className="flex flex-col items-center justify-center p-8 text-center md:p-12">
      <XcixSeal size={78} className="mb-6" />
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 28,
          color: "var(--brass)",
        }}
      >
        Commanders — coming with #7
      </h1>
      <p
        className="mt-3 max-w-[460px]"
        style={{ fontSize: 16, color: "var(--fg-body)", lineHeight: 1.6 }}
      >
        We&apos;re scanning your collection. The full ranked commander surface arrives with #7 — until then, the home dashboard shows your top pick.
      </p>
      <p
        className="mt-4"
        style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-faint)" }}
      >
        {stats.uniqueCards.toLocaleString()} unique cards scanned
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg px-6 py-3"
        style={{ border: "1px solid var(--border-strong)", color: "var(--fg)", fontSize: 14 }}
      >
        Back to home
      </Link>
    </section>
  );
}
```

- [ ] Create/overwrite `src/app/decks/page.tsx`:

```tsx
// INTERIM Decks surface — full builder ships in #8.
// Empty state per property table §Empty State — No Decks.
import Link from "next/link";
import { requireUserId } from "../../lib/auth";
import { listRecentDecks } from "../../lib/home/summary";
import { CardFan } from "../../components/marks";

export default async function DecksPage() {
  const userId = await requireUserId();
  const decks = await listRecentDecks(userId, 50);

  if (decks.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center p-8 text-center md:p-12">
        <CardFan size={130} className="mb-6" />
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
          }}
        >
          No decks yet
        </h1>
        <p
          className="mt-3 max-w-[420px]"
          style={{ fontSize: 16, color: "var(--fg-body)", lineHeight: 1.6 }}
        >
          Pick a commander and we&apos;ll assemble the 99 from cards you already own — then track what&apos;s missing.
        </p>
        <Link
          href="/commanders"
          className="mt-6 rounded-lg px-6 py-3 font-semibold"
          style={{ background: "var(--brass)", color: "var(--bg)", fontSize: 14 }}
        >
          Browse commanders
        </Link>
      </section>
    );
  }

  // Non-empty interim list — full builder + editor arrive with #8.
  return (
    <section className="p-6 md:p-10">
      <h1
        className="mb-6"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 28,
          color: "var(--fg)",
        }}
      >
        Your decks
      </h1>
      <ul className="flex flex-col gap-3">
        {decks.map((d) => (
          <li key={d.id}>
            <Link
              href={`/decks/${d.id}`}
              className="flex items-center gap-4 rounded-lg p-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <div className="min-w-0 flex-1">
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 16,
                    color: "var(--fg)",
                  }}
                >
                  {d.name}
                </div>
                <div
                  className="mt-1"
                  style={{ fontSize: 12, color: "var(--fg-muted)" }}
                >
                  {d.commanderName}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--fg)",
                }}
              >
                {d.cardCount}/99
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] Verify: `pnpm typecheck && pnpm build` succeed.
- [ ] Commit:

```bash
git add src/components/collection/upload-entry.tsx src/app/collection/page.tsx src/app/commanders/page.tsx src/app/decks/page.tsx
git commit -m "feat(shell): upload entry + interim empty-state pages for /collection /commanders /decks"
```

---

### Task 10: Home dashboard + first-run checklist

**Files:**
- Create: `src/components/home/first-run.tsx`
- Create: `src/components/home/dashboard.tsx`
- Create: `src/components/home/hero-commander.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `FirstRunChecklist()` server component — page heading + subhead + step 1 (active, contains `<UploadEntry />` from Task 9) + steps 2 & 3 (dimmed/locked). Style per property table §First-Run.
- Produces: `HeroCommander({ userId })` async server component — awaits `recommendCommanders(userId)`; renders the hero card (results[0]) with completeness bar (via `completeness()` + `COMPLETENESS_THRESHOLDS`), WUBRG pips from `colorIdentity`, plus a `degraded` banner when `results[]` reports it. Wrapped in `<Suspense>` by the dashboard so the rest streams first (READINESS item 4).
- Produces: `HeroCommanderSkeleton()` sync component — striped-placeholder card + loading dots, same silhouette as the real hero. Renders as the Suspense fallback.
- Produces: `Dashboard({ userId, stats, decks })` server component — composes greeting header, `<Suspense fallback={<HeroCommanderSkeleton />}><HeroCommander userId={userId} /></Suspense>`, "All N →" link (rendered but the count comes from the streaming client — for the interim we show a link without the count and note "→ /commanders"), recent decks list, collection stat tiles, "Update collection" link.
- Consumes: `getCollectionStats`, `listRecentDecks` (Task 8), `recommendCommanders`, `completeness`, `COMPLETENESS_THRESHOLDS`, `UploadEntry` (Task 9).

Steps:

- [ ] Create `src/components/home/hero-commander.tsx`:

```tsx
import { recommendCommanders } from "../../lib/recs/recommend";
import { completeness, COMPLETENESS_THRESHOLDS } from "../../lib/recs/score";

/** WUBRG identity pip. Colors come from brand tokens (--w --u --b --r --g). */
function ColorPip({ color }: { color: string }) {
  const c = color.toUpperCase();
  const token = c === "W" ? "--w" : c === "U" ? "--u" : c === "B" ? "--b" : c === "R" ? "--r" : c === "G" ? "--g" : "--fg-faint";
  return (
    <span
      aria-label={`Color: ${c}`}
      className="inline-block h-[11px] w-[11px] rounded-[3px]"
      style={{ background: `var(${token})`, border: "1px solid rgba(0,0,0,0.35)" }}
    />
  );
}

function fillColor(pct: number): string {
  if (pct >= COMPLETENESS_THRESHOLDS.high) return "var(--success)";
  if (pct >= COMPLETENESS_THRESHOLDS.mid) return "var(--warning)";
  return "var(--danger)";
}

export function HeroCommanderSkeleton() {
  return (
    <div
      className="mb-8 flex overflow-hidden rounded-[14px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
      aria-busy="true"
    >
      <div
        className="hidden md:block w-[200px] shrink-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, #1E1A15 0 11px, #181209 11px 22px), var(--bg)",
          borderRight: "1px solid var(--border-strong)",
        }}
      />
      <div className="flex flex-1 flex-col justify-center p-6 md:p-[26px_30px]">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>
          Loading recommendations…
        </p>
      </div>
    </div>
  );
}

/**
 * Async server component — expensive (dozens of EDHREC fetches).
 * Dashboard wraps this in <Suspense> so the surrounding shell streams first.
 * READINESS item 4: degraded flag renders an interim "synergy data offline" note.
 */
export async function HeroCommander({ userId }: { userId: string }) {
  const { results, degraded } = await recommendCommanders(userId);
  const top = results[0];

  if (!top) {
    // No candidates — dedicated empty surface lives at /commanders (Task 9).
    // Hero on Home just falls back to a quiet placeholder.
    return (
      <div
        className="mb-8 rounded-[14px] p-[26px_30px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
      >
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-faint)" }}>
          No commander candidates yet.
        </p>
      </div>
    );
  }

  const pct = completeness(top);

  return (
    <div
      // Style per §Hero Commander Card container / info area / action area.
      className="mb-8 flex flex-col overflow-hidden rounded-[14px] md:flex-row"
      style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
    >
      {/* Art placeholder — striped per handoff note ("real art drops later"). */}
      <div
        className="hidden md:block w-[200px] shrink-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, #1E1A15 0 11px, #181209 11px 22px), var(--bg)",
          borderRight: "1px solid var(--border-strong)",
        }}
        aria-hidden
      />

      {/* Info area */}
      <div className="flex flex-1 flex-col justify-center p-6 md:p-[26px_30px]">
        <div className="mb-2 flex items-center gap-[4px]">
          {top.colorIdentity.map((c) => <ColorPip key={c} color={c} />)}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
          }}
        >
          {top.name}
        </h2>

        {degraded && (
          <p
            className="mt-2"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--warning)" }}
          >
            synergy data offline — ranking by pool + roles only
          </p>
        )}

        {pct != null ? (
          <div className="mt-[18px] flex max-w-[420px] items-center gap-[10px]">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: fillColor(pct),
              }}
            >
              {top.edhrecOwnedCount}/{top.edhrecTotal}
            </span>
            <div
              className="h-[6px] flex-1 overflow-hidden rounded-[3px]"
              style={{ background: "var(--elevated)" }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${pct}%`, background: fillColor(pct) }}
              />
            </div>
          </div>
        ) : (
          <p
            className="mt-[18px]"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}
          >
            completeness unavailable
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] Create `src/components/home/dashboard.tsx`:

```tsx
import { Suspense } from "react";
import Link from "next/link";
import type { RecentDeck } from "../../lib/home/summary";
import { HeroCommander, HeroCommanderSkeleton } from "./hero-commander";

export function Dashboard({
  userId,
  stats,
  decks,
}: {
  userId: string;
  stats: { totalCards: number; uniqueCards: number };
  decks: RecentDeck[];
}) {
  return (
    <div className="p-5 md:px-10 md:pt-[34px] md:pb-11">
      {/* Greeting — style per §Signed-In Home Dashboard / Page heading */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 32,
          color: "var(--fg)",
        }}
      >
        Welcome back
      </h1>
      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--fg-muted)",
        }}
      >
        {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique · {decks.length} deck{decks.length === 1 ? "" : "s"}
      </p>

      {/* Section label + hero — hero streams; the rest of the page is already ready. */}
      <div
        className="mt-[22px] mb-[10px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          color: "var(--fg-faint)",
        }}
      >
        Most complete general
      </div>
      <Suspense fallback={<HeroCommanderSkeleton />}>
        <HeroCommander userId={userId} />
      </Suspense>

      {/* Recommended row → Commanders */}
      <div className="mb-3 flex items-baseline justify-between">
        <div
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "var(--fg-faint)",
          }}
        >
          Recommended
        </div>
        <Link
          href="/commanders"
          style={{ fontSize: 13, color: "var(--brass)" }}
        >
          All commanders →
        </Link>
      </div>

      {/* Two-column grid: recent decks (1.5fr) + collection stats (1fr) — §Recent Decks / §Collection Stats Panel */}
      <div className="mt-6 grid gap-5 md:grid-cols-[1.5fr_1fr]">
        {/* Recent decks */}
        <div>
          <div
            className="mb-3 uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "var(--fg-faint)",
            }}
          >
            Recent decks
          </div>
          {decks.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>No decks yet.</p>
          ) : (
            <ul className="flex flex-col gap-[10px]">
              {decks.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/decks/${d.id}`}
                    className="flex items-center gap-[14px] rounded-lg p-[13px_16px]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-strong)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: 16,
                          color: "var(--fg)",
                        }}
                      >
                        {d.name}
                      </div>
                      <div
                        className="mt-[2px]"
                        style={{ fontSize: 12, color: "var(--fg-muted)" }}
                      >
                        {d.commanderName}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--fg)",
                      }}
                    >
                      {d.cardCount}/99
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Collection stats + Update entry */}
        <aside>
          <div
            className="mb-3 uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "var(--fg-faint)",
            }}
          >
            Collection
          </div>
          <div
            className="rounded-[12px] px-5"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
            }}
          >
            {[
              ["Total cards", stats.totalCards.toLocaleString()],
              ["Unique", stats.uniqueCards.toLocaleString()],
              ["Decks built", String(decks.length)],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                className="flex items-center justify-between py-[14px]"
                style={{
                  borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--fg-body)" }}>{label}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    color: "var(--fg)",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/collection"
            className="mt-4 inline-block rounded-lg px-4 py-[9px]"
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 13,
              color: "var(--fg)",
              border: "1px solid var(--border-strong)",
            }}
          >
            Update collection
          </Link>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] Create `src/components/home/first-run.tsx`:

```tsx
import { UploadEntry } from "../collection/upload-entry";

/**
 * First-run home is the checklist itself (design decision #4).
 * Step 1 is active + wired to the upload flow. Steps 2 & 3 are locked/dimmed.
 * Style per property table §First-Run Home — Hybrid Checklist.
 */
export function FirstRunChecklist() {
  return (
    <div className="p-5 md:px-10 md:pt-[34px] md:pb-11 max-w-[720px]">
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 30,
          color: "var(--fg)",
          lineHeight: 1.2,
        }}
      >
        Welcome to the 99
      </h1>
      <p
        className="mt-2 mb-7"
        style={{ fontSize: 15, color: "var(--fg-body)", lineHeight: 1.5 }}
      >
        Three steps to your first recommendations. Start by handing us your cards.
      </p>

      {/* Step 1 — Active */}
      <div
        className="rounded-[14px] p-6 md:p-[26px_28px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--brass)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
            style={{
              background: "var(--brass)",
              color: "var(--bg)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            1
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 20,
              color: "var(--fg)",
            }}
          >
            Upload your collection
          </span>
        </div>
        <div className="mt-5">
          <UploadEntry />
        </div>
      </div>

      {/* Steps 2 & 3 — Locked. Live states will ship with #7 and #8 (guided-flow). */}
      {[
        { n: 2, label: "Review your commanders", hint: "unlocks after upload" },
        { n: 3, label: "Build your first deck",  hint: null },
      ].map(({ n, label, hint }) => (
        <div
          key={n}
          className="mt-3 flex items-center gap-3 rounded-[14px] p-[18px_22px] opacity-55"
          style={{
            background: "#181410",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
            style={{
              border: "1px solid #4A4033",
              color: "var(--fg-faint)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            {n}
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 18,
              color: "var(--fg-muted)",
            }}
          >
            {label}
          </span>
          {hint && (
            <span
              className="ml-auto"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-locked)",
              }}
            >
              {hint}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] Modify `src/app/page.tsx` — signed-in branch calls the data layer and picks first-run vs. dashboard:

```tsx
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Crowned99 } from "../components/marks";
import { getCollectionStats, listRecentDecks } from "../lib/home/summary";
import { FirstRunChecklist } from "../components/home/first-run";
import { Dashboard } from "../components/home/dashboard";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <section
        className="flex min-h-screen flex-col items-center justify-center px-8 md:px-10 text-center"
        style={{
          background:
            "radial-gradient(1000px 520px at 50% 8%, rgba(201,162,75,0.10), transparent 70%), var(--bg)",
        }}
      >
        <Crowned99 size={132} />
        <p
          className="mt-4"
          style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.44em", color: "var(--brass)" }}
        >
          THE NINETY-NINE
        </p>
        <p
          className="mt-6 max-w-[280px] italic md:max-w-none"
          style={{ fontFamily: "var(--font-sans)", fontSize: 21, lineHeight: 1.5, color: "var(--fg-body)" }}
        >
          99 problems, but your commander ain&apos;t one.
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-9 w-full max-w-[260px] rounded-lg py-[14px] font-semibold md:w-auto md:px-10 bg-brass hover:bg-brass-hover transition-colors"
            style={{ color: "var(--bg)", fontFamily: "var(--font-sans)", fontSize: 15 }}
          >
            Sign in
          </button>
        </SignInButton>
        <p
          className="mt-5"
          style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--fg-faint)" }}
        >
          Invite-only · access by request · a Commander companion
        </p>
      </section>
    );
  }

  const [stats, decks] = await Promise.all([
    getCollectionStats(userId),
    listRecentDecks(userId, 3),
  ]);

  if (stats.uniqueCards === 0) {
    return <FirstRunChecklist />;
  }
  return <Dashboard userId={userId} stats={stats} decks={decks} />;
}
```

- [ ] Verify: `pnpm typecheck && pnpm build` succeed.
- [ ] Commit:

```bash
git add src/components/home/first-run.tsx src/components/home/dashboard.tsx src/components/home/hero-commander.tsx src/app/page.tsx
git commit -m "feat(home): first-run checklist + dashboard with streamed hero"
```

---

### Task 11: Full verification pass

**Files:**
- No new files — this task is verification and fallout fixes only.

**Interfaces:**
- Consumes: everything from Tasks 1–10.
- Produces: green `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

Steps:

- [ ] Run the full local check:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

  Expected outcome: all four commands exit 0. Vitest reports the extended `score.test.ts`, the new `paste.test.ts` (7 tests), and every pre-existing suite still green.

- [ ] Fix any fallout — typical suspects: an unused import from Task 1's Geist removal, a client component missing `"use client"`, or a JSX escape (`ain't` → `ain&apos;t`) in `page.tsx`. Fix in place; commit each fix as its own `chore(shell): …` commit rather than amending.
- [ ] Commit any fixes:

```bash
git add -p
git commit -m "chore(shell): full local green — typecheck/lint/test/build"
```

- [ ] Design-review gate: before opening the PR, run `superpowers:design-review` against `docs/superpowers/design-tables/appshell.md` — verify every row for each component the PR touches. Fix violations in place; the PR body should list the row IDs verified.
