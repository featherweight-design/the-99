# Task 12 — App-shell property table update (richness v2 deltas)

Commit: `f17e065`
Branch: `feat/richness-shell-58`

---

## Step 1 — Table merge

Updated `docs/superpowers/design-tables/appshell.md` (354 insertions, 5 changes to existing rows):

**Updated existing rows:**
- `§Rail: Nav item — Locked state` color: `#6A6152` → `#8E8269` (token: **faint**) with WCAG AA note (4.76:1 on `--surface-rail`)
- `§Rail: Locked surfaces caption` color: same migration with same note
- `§Empty state heading — No decks` content: `No decks yet` → `No decks yet.` (terminal period added in Task 11)
- `State Coverage — Nav locked state` row: updated color reference and added SC 1.4.3 exemption callout for the two remaining `--fg-locked` sites

**New sections added:**
- `§Crab Mark` — SVG anatomy, sizes by context (4 surfaces), bob animation spec
- `§LoaderDots` — container, dot geometry, dots animation spec
- `§Motion tokens (globals.css)` — new color tokens (`--kaiju-body`, `--celebrate-top`, `--celebrate-bottom`), all 4 keyframes, all 4 utility classes, reduced-motion block
- `§Global Loading State (app/loading.tsx)` — container, crab+dots cluster, heading, status line, caption
- `§404 State (app/not-found.tsx)` — container, numeral, crab, heading, caption, CTA row, primary and secondary CTAs with hover states
- `§Home Dashboard Vignette` — vignette gradient specs for all 4 surfaces (dashboard, first-run, loading, 404)
- `§First-Run Checklist — Crab placement` — heading+crab row layout
- `§Decks Empty State — Crab pairing` — container, breakpoint-specific sizes, heading copy
- `State Coverage` — added **Global loading state** and **404 state** rows; updated **No decks** row with crab pairing

---

## Step 2 — Design-review verification (Agent 2)

Enumerated every v2 addition against source files. Results below.

### Locked-nav contrast migration

| Check | Result |
|-------|--------|
| Rail locked items use `var(--fg-faint)` (#8E8269) | ✅ MATCH — `nav.tsx` line 141 |
| Tab bar locked items use `var(--fg-faint)` | ✅ MATCH — `nav.tsx` line 287 |
| Rail locked caption uses `var(--fg-faint)` | ✅ MATCH — `nav.tsx` line 179 |
| Two `--fg-locked` sites remain (caretColor + disabled button) | ✅ CONFIRMED — `upload-entry.tsx:206`, `issue-inspector.tsx:468` |

### Crab component

| Check | Result |
|-------|--------|
| `aria-hidden`, `focusable="false"` | ✅ MATCH |
| viewBox `0 0 160 110`, aspect-ratio height calc | ✅ MATCH |
| `anim-bob` class applied when `bobSeconds > 0` | ✅ MATCH |
| `--bob-duration` CSS var set | ✅ MATCH |
| Default `bobSeconds = 4.5` | ✅ MATCH |
| Colors: `var(--brass)` legs/carapace stroke/eye, `var(--surface)` fills | ✅ MATCH |

### Animation system (globals.css)

| Check | Result |
|-------|--------|
| `bob` keyframe: `translateY(0) / translateY(-5px)` | ✅ MATCH |
| `dots` keyframe: `opacity 0.25 / 1` | ✅ MATCH |
| `breathe` keyframe: `scale(1) / scale(1.02) translateY(3px)` | ✅ MATCH |
| `rise` keyframe: `translateY(18px) opacity 0 → translateY(0) opacity 1` | ✅ MATCH |
| `.anim-bob` duration `var(--bob-duration, 4.5s)` | ✅ MATCH |
| `.anim-dots` duration `1.2s` | ✅ MATCH |
| `.anim-breathe` duration `10s` | ✅ MATCH |
| `.anim-rise` duration `0.8s ease-out both` | ✅ MATCH |
| Reduced-motion block scoped to 4 classes | ✅ MATCH |
| New tokens: `--kaiju-body #0B0907`, `--celebrate-top #171310`, `--celebrate-bottom #110E0B` | ✅ MATCH |

### LoaderDots

| Check | Result |
|-------|--------|
| `aria-hidden` | ✅ MATCH |
| 3 dots, 7px rounded-full, brass, gap 6px | ✅ MATCH |
| Staggered delays 0 / 0.2 / 0.4s | ✅ MATCH |
| `anim-dots` class | ✅ MATCH |

### Loading state (app/loading.tsx)

| Check | Result |
|-------|--------|
| Layout: flex col, center, p-[40px] | ✅ MATCH |
| min-h 420px mobile / 520px desktop | ✅ MATCH |
| Background: 560px 320px at 50% 68% rgba(201,162,75,0.08) | ✅ MATCH |
| Crab 96px (no breakpoint swap) | ✅ MATCH |
| LoaderDots absolute top-[-4px] right-[-22px] | ✅ MATCH |
| Heading: display bold, 19px/22px, var(--fg) | ✅ MATCH |
| Heading copy: "Reading your collection" | ✅ MATCH |
| Status: mono 12px/13px, var(--fg-faint), mt-[8px] | ✅ MATCH |
| Status copy: "matching to Oracle…" | ✅ MATCH |
| Caption: 13.5px/15px, var(--fg-body), max-w-[380px], leading-[1.6], mt-[10px] | ✅ MATCH |
| Caption copy: "This is the boring part. I'll flag anything that looks off." | ✅ MATCH |

### 404 state (app/not-found.tsx)

| Check | Result |
|-------|--------|
| Layout: flex col, center, p-[40px] | ✅ MATCH |
| min-h 400px mobile / 480px desktop | ✅ MATCH |
| Background: 520px 300px at 50% 70% rgba(201,162,75,0.07) | ✅ MATCH |
| Numeral: display, 48px/64px, weight 900, color var(--elevated), letter-spacing 0.04em | ✅ MATCH |
| Numeral copy: "404" via `shellCopy.notFound.numeral` | ✅ MATCH |
| Crab: 96px, mt-[-14px] mb-[18px] | ✅ MATCH |
| Heading: display bold, 21px/24px, var(--fg), margin 0 | ✅ MATCH |
| Heading copy: "There's no page here." | ✅ MATCH |
| Caption: 13.5px/15px, var(--fg-body), max-w-[380px], leading-[1.6] | ✅ MATCH |
| CTA row: flex-col/row, gap 12px, mt-[24px] | ✅ MATCH |
| Primary: sans semibold, 13/14px, bg var(--brass), color var(--bg), br 8px, px-[22px] py-[12px], href "/" | ✅ MATCH |
| Primary hover: bg var(--brass-hover) | ✅ MATCH |
| Secondary: sans semibold, 13/14px, color var(--fg), border var(--border-strong), br 8px, same pad, href "/decks" | ✅ MATCH |
| Secondary hover: border-brass, text-brass-hover | ✅ MATCH |

### Home vignettes

| Check | Result |
|-------|--------|
| Dashboard: 760px 380px at 45% -60px, 0.08 alpha | ✅ MATCH — `dashboard.tsx:30` |
| First-run: 640px 340px at 40% -40px, 0.07 alpha | ✅ MATCH — `first-run.tsx:12` |

### First-run Crab placement

| Check | Result |
|-------|--------|
| `flex items-end gap-[16px] md:gap-[22px]` | ✅ MATCH — `first-run.tsx:17` |
| Crab 72px mobile (md:hidden) | ✅ MATCH — `first-run.tsx:30` |
| Crab 96px desktop (hidden md:block) | ✅ MATCH — `first-run.tsx:31` |

### Decks empty state — Crab pairing

| Check | Result |
|-------|--------|
| CardFan mobile + Crab 64px (md:hidden) | ✅ MATCH — `decks/page.tsx:37-38` |
| CardFan decks-desktop + Crab 80px (hidden md:block) | ✅ MATCH — `decks/page.tsx:39-40` |
| Container: flex items-end justify-center, gap-[14px]/gap-[18px], mb-[22px]/mb-[26px] | ✅ MATCH |
| Heading: "No decks yet." (with terminal period) | ✅ MATCH |

### Table mismatch found and corrected

| Item | Finding |
|------|---------|
| `§Empty state heading — No decks` content | Table had `No decks yet` (no period); implementation ships `No decks yet.` (with terminal period). **Fixed in this task.** |

---

## Step 3 — Pre-push gate

```
pnpm typecheck  →  PASS (no errors)
pnpm lint       →  PASS (no errors)
pnpm test       →  PASS  22 files / 251 tests
pnpm build      →  PASS  10 routes compiled
```

---

## Browser-only properties

The following properties were verified from source (class names, inline styles) but cannot be confirmed visually without a browser. They are listed here so a manual QA pass can spot-check them.

| Property | Surface | What to check |
|----------|---------|---------------|
| `anim-bob` float effect | Crab on first-run heading, loading state, 404, decks empty | Crab should float up 5px and back over 4.5s; motion should stop when prefers-reduced-motion is set |
| `anim-dots` pulse | LoaderDots on loading state | Three dots should pulse sequentially (0 / 0.2 / 0.4s offset) |
| Vignette gradients | Dashboard, first-run, loading, 404 | Warm brass radial glow visible at top-center / off-center; should not overpower background |
| LoaderDots position | Loading state | Dots should appear clipped upper-right of crab, not overlapping main body |
| 404 numeral color | 404 state | `var(--elevated)` (#2A241D) on `var(--bg)` (#14110E) — intentionally dark/low-contrast (decorative numeral, heading carries meaning) |
| CTA focus rings | 404 CTAs | Brass 2px outline at 2px offset on focus-visible |
| Crab `anim-breathe` | Not rendered yet | `<Kaiju>` ships unused pending #61; `anim-breathe` class exists but no surface currently applies it |

---

## Unused-in-this-PR callouts (per brief)

- `<Kaiju>` (`src/components/character/kaiju.tsx`) — ships unused; `anim-breathe` is wired and ready. Surface: decks 99/99 completion reveal, pending #61.
- `src/lib/copy/color-labels.ts` — `guildLabel` / `colorWords` exported; temporarily duplicates inline maps in `filtered-empty.tsx`. Task 16 (#60) deletes the inline copy.

---

## Final-review fixes (post-task-12 commit)

Applied after the whole-branch Copilot review found 1 Critical, 2 Important, 2 Minor findings.

**Gate:** typecheck PASS · lint PASS · test PASS (22 files / 251 tests) · build PASS (10 routes)

| Finding | Fix |
|---------|-----|
| F1 Critical — `,var(--bg)` gradient form is a silent no-op | Split into `bg-[color:var(--bg)] bg-[radial-gradient(…)]` in `loading.tsx`, `not-found.tsx`, and `page.tsx` (2 occurrences). Updated plan doc constraint text and code samples in Tasks 7, 8, and 22. |
| F2 Important — `loading.tsx` announces nothing to AT | Added `role="status"` to root `<div>`. |
| F3 Important — 404 numeral fails contrast, no exemption recorded | Added `aria-hidden="true"` to the numeral `<span>`. Added SC 1.4.3 exemption note to `appshell.md` State Coverage row for 404 state. |
| F4 Minor — `loading.tsx` starts at `<h2>`, no `<h1>` | Promoted to `<h1>`, classes unchanged. Also updated the corresponding code sample in the plan doc. |
| F5 Minor — `loader-dots.tsx` uses template-literal className with trailing space | Replaced with `[…].filter(Boolean).join(" ")` to match `crab.tsx` and `kaiju.tsx`. |
