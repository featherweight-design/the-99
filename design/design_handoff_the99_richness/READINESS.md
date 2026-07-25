# Readiness Review — Visual Richness Pass

**Verdict:** 🟡 Yellow
**Audited:** 2026-07-24
**Related ticket(s):** #51 (design, closed), #58 app shell, #59 collection, #60 commanders, #61 decks
**Plan PR target:** TBD — one plan sequencing #58–#61

## Summary

The richness pass is coherent, well-scoped, and buildable. The character system (crab/kaiju), density dials, animation posture, and contrast constraint are all clearly stated, and copy in the mocks is production-ready. Six of the eight named states already have components in `src/` and are reachable today.

Two states are **not reachable**: global loading and 404. `src/app` contains no `loading.tsx`, `not-found.tsx`, or `error.tsx` at any level, so the mock designs two surfaces that have no route to live in. That's eng work rather than a Design gap — the mock specifies both — but it is a hard-rule-3 violation that must be closed in the plan PR before #58 ships.

Mobile is the thinnest area: both v2 mocks delegate it to a one-line note rather than hi-fi frames. For the re-skinned states that's fine, since the v1 handoffs already carry mobile mocks. For the 99/99 celebration it isn't — "celebration full-screen" is a different pattern, not a delta. That's the one item that may need a Design addendum; everything else resolves eng-side.

This audit was run late. #58–#61 were opened before it, contrary to the pipeline; they've been updated with its findings.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary is explicit and unusually well-drawn: palette, type, brass accent, crown motif, and voice are all listed under "Locked — do not re-open," and the pass repeatedly refuses to re-litigate them.
- [✅] Non-goals stated — "fun comes from character and motion, not louder color"; kaiju reserved for rare wins; no WotC art reproduction.
- [✅] "Merges into" section correctly frames this as a delta against the existing surface property tables, not a replacement.
- [🟡] No open-questions log. Nothing appears unresolved to Design, but the mobile celebration composition (below) is an open question in practice.

### 🎭 State coverage

Eight named states across the two v2 mocks. Reachability in current code:

| State | Mock | Component today | Reachable |
|---|---|---|---|
| Home / signed-in warmth | App Shell v2 | `src/app/page.tsx` | ✅ |
| First-run, empty collection | App Shell v2 | `src/components/home/first-run.tsx` | ✅ |
| Global loading | App Shell v2 | — | 🔴 **no `loading.tsx` anywhere** |
| 404 | App Shell v2 | — | 🔴 **no `not-found.tsx` anywhere** |
| Collection no-results | Surfaces v2 | `src/components/collection/no-results.tsx` | ✅ |
| Commanders filtered-to-zero | Surfaces v2 | `src/components/commanders/filtered-empty.tsx` | ✅ |
| Commanders degraded (EDHREC offline) | Surfaces v2 | `src/components/commanders/degraded-banner.tsx` | ✅ |
| Decks builder empty | Surfaces v2 | `src/components/decks/builder-shell.tsx` (`isEmpty`) | ✅ |
| Decks 99/99 completion reveal | Surfaces v2 | `statusPill()` returns `"Complete"` | 🟡 condition exists, event doesn't |

- [🔴] Global loading and 404 have no route files. Next 16 conventions confirmed against `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` — `loading.tsx` (Suspense boundary) and `not-found.tsx`. Both need creating; placement (root vs. per-route-group) is an eng call.
- [🟡] The 99/99 reveal is designed as a **celebration**, but `statusPill` in `src/lib/decks/read.ts:44` is a derived *status*, not an event. Nothing distinguishes "just completed" from "viewing a deck that was completed last week." Undefined whether the kaiju fires once on transition or renders whenever the deck is Complete. Eng-side call, but it changes the implementation shape materially.
- [🟠] **Mobile is not mocked.** Both files carry a single note — App Shell v2: "Mobile variants follow the same deltas (crab scales to 72–90px; vignettes centered on content)"; Surfaces v2: "Mobile forms follow the same deltas (crab 72–90px, celebration full-screen)." Adequate for re-skins of surfaces whose v1 handoffs already have mobile frames. **Not** adequate for the celebration: a composition built around the kaiju looming from the right and gazing down at the crab does not have an obvious full-screen portrait form.

### 🔌 Data contract

- [✅] No new server data required. The pass is presentational.
- [✅] The 99/99 condition is computed — `statusPill({ built: 99, ownedCount: 99 })` → `"Complete"`, covered by tests in `src/lib/decks/read.test.ts:92`.
- [✅] The degraded/EDHREC-offline state is real and already wired (`src/components/commanders/degraded-banner.tsx`).
- [🟡] Celebration needs a trigger source if it's to fire on transition rather than on status — see State coverage.

### 🧱 Codebase fit

- [✅] Every hex in the pass maps to an existing token in `src/app/globals.css`. `--fg-faint: #8E8269` and `--fg-locked: #6A6152` both already exist, so the contrast lift is a token-level change, not a new value.
- [✅] Named states map onto existing components rather than requiring new surfaces (except loading/404).
- [🟡] `crab.svg` / `kaiju.svg` need componentizing; no equivalent exists. `src/components/collection/card-fan-mark.tsx` is the closest precedent for an inline-SVG mark component.
- [🟡] **No copy strings export.** The pipeline's deliverables list requires "copy exported as strings ready to paste into eng's copy file," and the repo has the convention (`src/lib/copy/issue-inspector.ts`). The issue_inspector handoff shipped `Issue Inspector - copy strings.js`; this one ships no equivalent. Copy is production-ready but only inline in the mocks, so eng must transcribe it. Low risk, real transcription-error surface.

### ♿ Cross-cutting

- [🟡] **The contrast lift needs per-usage judgment, not a blanket token change.** `--fg-locked` (`#6A6152`) is consumed in four components:

  | Site | Nature | Lift? |
  |---|---|---|
  | `src/components/shell/nav.tsx:141,183,283` (locked rail items desktop + mobile, "Surfaces unlock once your collection is uploaded" caption) | informational text | **yes** — this is what the README names |
  | `src/components/home/first-run.tsx:136` ("unlocks after upload" hint) | informational text | **yes** |
  | `src/components/collection/upload-entry.tsx:206` (`caretColor`) | not text | no — SC 1.4.3 doesn't apply |
  | `src/components/collection/issue-inspector.tsx:468` (disabled button) | disabled control | no — WCAG 1.4.3 explicitly exempts inactive controls |

  Redefining `--fg-locked` globally would sweep the last two along with it. Recommend keeping `--fg-locked` for genuinely-disabled/non-text uses and moving the informational sites to `--fg-faint`.
- [🔴] **`prefers-reduced-motion` has zero occurrences in `src/`.** The handoff requires it ("respect `prefers-reduced-motion`; app fully usable static") and this pass introduces the app's first real motion — bob 4.5s, glow pulse, breathe 9–10s, dots 1.2s. There is no existing pattern to follow, so the plan PR must establish one.
- [🟡] Reduced-motion is load-bearing for the 99/99 celebration specifically: with motion disabled the reveal still has to read as a win, not an empty frame.
- [✅] Contrast is named as a constraint by the handoff itself rather than left implicit — good.

### ⏰ Drift from reality

- [✅] Handoff is 1 day old (landed 2026-07-24, PR #54); no schema or plan changes since.
- [🟡] It was designed against the four v1 surfaces as shipped 2026-07-19. Those are unchanged, so no drift — but #58–#61 will land sequentially, and each one shifts the baseline for the next. The plan PR should fix an order; the shell (#58) has to go first since the crab component, the reduced-motion pattern, and the token decision all originate there.
- [🟡] `docs/superpowers/design-pipeline-status.md` still describes the Issue Inspector duplication as a visual delta with a crab. That's wrong — the two mocks are byte-identical and neither contains a crab. Tracked in #62.

### 📝 Decision log

- [✅] Strong. "Locked — do not re-open" is explicit, the crab/kaiju register split is reasoned rather than asserted, and the surface map states where character is *not* allowed (destructive and data-loss warnings stay straight) as clearly as where it is.
- [✅] The degraded-EDHREC counter-example is deliberately shipped next to the filtered-to-zero state to demonstrate the line. That's the kind of thing that usually gets lost between design and eng.
- [🟡] Nothing is marked "tentative" — everything reads as locked. The mobile treatments are in practice tentative and should be labelled as such.

## Eng-side clarifications (Yellow)

Each is a decision the plan PR makes and records:

1. **Loading and 404 route placement.** Root-level `loading.tsx` / `not-found.tsx`, or per-route-group? Next 16 supports both; the mock shows one global treatment, which argues for root.
2. **Celebration trigger semantics.** Fire once on the 98→99 transition, or render whenever `statusPill === "Complete"`? Recommend transition-fired with a dismissed flag, since "reserved for rare wins" is the stated intent and a permanent kaiju stops being a reveal.
3. **Contrast token strategy.** Per the table above — move informational sites to `--fg-faint`, leave `--fg-locked` for disabled controls and the caret. Verify each moved site against AA rather than assuming.
4. **Reduced-motion pattern.** Establish the app's first one in #58, then reuse. Decide CSS media query vs. a hook; the celebration needs a static fallback that still reads as a win.
5. **Copy transcription target.** New files under `src/lib/copy/` per surface, matching `issue-inspector.ts`. Lift verbatim from the mocks.
6. **Crab/kaiju component API.** One component with a size/variant prop rather than per-use SVGs, per the pipeline's stated preference for variant props over sibling components.
7. **Ticket order.** #58 → #59/#60 (parallelizable) → #61. #61 last because the kaiju is the highest-risk piece and benefits from the reduced-motion pattern being settled.

## Gaps that may need a Design round-trip

Not blocking — flagged for the plan PR to escalate if it can't resolve them cleanly:

- **Mobile composition for the 99/99 celebration.** "Celebration full-screen" is a pattern change, not a delta. If the plan PR can't derive a confident portrait composition from the desktop frame, open a light addendum ticket for that one frame rather than guessing at the pass's single biggest visual moment.

## Decisions inherited

Locked in the handoff and by prior conversation; the plan PR must respect all of these:

- Palette A "Table Candlelight," Cinzel + IBM Plex, brass accent, crown motif — not re-opened.
- Voice: Kitchen Table, verbatim in `design/design_handoff_the99_richness/README.md`. Locked 2026-07-20.
- Palette *hues* stay locked through the contrast work — lifts move between existing tokens only.
- The kaiju is reserved for rare wins. It appears in exactly one place (99/99) and reusing it elsewhere is out of scope.
- Working surfaces stay tight: import review, issue inspector, in-place editing. Only browsing surfaces loosen.
- Destructive and data-loss copy stays straight — no crab, no jokes.
- Marks are original; the pass channels colossal-monster *register* only and reproduces no WotC art.
