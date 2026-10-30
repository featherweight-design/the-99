# Addendum — Secondary-CTA colour: brass holdouts and the "Change commander" split

**Filed by:** Design, at Eng request alongside PR #76 (`Exclude .worktrees from ESLint; migrate brass-text ghost CTAs onto GhostButton`).
**Date:** 2026-07-25
**Status:** Design call — **both items decided.** Item 1 ratified as shipped in #76. Item 2 requires a small change to `create-pre-filled.tsx` beyond #76's scope.
**Scope:** Colour only. The primitive contract in `docs/superpowers/design-tables/appshell.md` §*404: Secondary CTA* is LOCKED and untouched by this addendum — nine properties, `var(--fg)` text, `var(--border-strong)` border, hover to `var(--brass)` border + `var(--brass-hover)` text.

---

## The rule this addendum applies

There is one bordered-secondary treatment in the app, and §*404: Secondary CTA* is its canonical statement. A surface does not get its own secondary colour because its design table omitted a colour row — an omission inherits the contract, it does not license a local value.

Brass is the app's **fill** and its **borderless-link** colour. It is not a bordered-button text colour anywhere in the locked tables. Both items below are the same question asked twice: does a brass-text bordered button exist? It does not.

---

## Item 1 — brass → `var(--fg)` on the three bordered CTAs: **RATIFIED**

Design confirms Eng's reading. Ship #76 as written.

### The reading, confirmed

`collection.md:1667` specifies §*"Show all N" Link* — a **borderless brass text link** (`Show all 21 unmatched →`). Brass was correct there: it was link colour on a bare text link with no border and no fill.

Ticket #36 deleted those links and replaced them with a bordered button, and its table (`docs/superpowers/design-tables/2026-07-20-issue-inspector.md`) specifies location, copy and the conditional — no colour row. The brass rode along through the element change. That is drift by inheritance, not a decision: the colour outlived the element that justified it. Same story for the two windowed `Show more` buttons, which were built to the Collection pattern and picked up brass with the border.

`var(--fg)` is what the contract already said. #76 is a correction, not a change.

### Second reason, independent of provenance

Brass text inside this button breaks its own hover. The locked hover is border → `var(--brass)`, text → `var(--brass-hover)`. From brass text, the hover text shift is `#C9A24B` → `#D8B25E` — one step on the same ramp, below the threshold most people notice, on a control whose only other hover signal is a border going from a colour to a *near* colour. From `var(--fg)`, hover is a legible cream-to-brass move. The brass version isn't just off-contract; it is a worse button.

### Affected call sites

| Call site | Before (`main`) | After (#76) |
|---|---|---|
| `src/components/collection/grid-view.tsx:76-88` | `color: var(--brass)`, `border: 1px solid var(--border-strong)`, hand-rolled | `<GhostButton>` |
| `src/components/collection/rows-view.tsx:87-99` | same | `<GhostButton>` |
| `src/components/collection/review-screen.tsx:~256-271` (inspector entry CTA) | `color: var(--brass)`, `border: 1px solid var(--border-strong)`, hand-rolled | `<GhostButton>` |

### Per breakpoint

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg)` | `var(--fg)` |
| border | `1px solid var(--border-strong)` | same |
| background | `transparent` | same |
| hover | border `var(--brass)`, color `var(--brass-hover)` | same |
| font-size (caller-owned) | `13px` grid/rows · `13.5px` inspector entry — unchanged | same |
| padding (caller-owned) | unchanged | unchanged |

No breakpoint split. These controls do the same job at both widths, and the locked contract is breakpoint-invariant on colour.

### `builder-spine.tsx:208-235` stays exempt

Confirmed as previously agreed: one-of-a-kind, not a secondary CTA, out of scope here and not a precedent for anything.

---

## Item 2 — "Change commander" (`src/components/decks/create-pre-filled.tsx:312-331`): **DRIFT. Unify to desktop.**

The mobile softening is not intentional. Adopt the desktop treatment — i.e. `<GhostButton>` — at both breakpoints.

### Current state

| Property | Mobile (shipped) | Desktop (shipped) |
|---|---|---|
| color | `#A89B84` (`--fg-muted`) | `#EDE6D8` (`--fg`) |
| border | `1px solid #2A241D` (`--border`) | `1px solid #3A3229` (`--border-strong`) |
| font-weight | `500` | `600` |
| hover | none defined | none defined |

Desktop is the secondary CTA exactly, spelled in raw hex. Mobile is a third thing.

### Why it's drift, not intent

1. **The job doesn't change with width.** This is the escape hatch out of a committed flow — the same role as `Cancel` on `review-screen.tsx:268` and `View decks` in §404. Nothing about a narrow viewport makes backing out less legitimate.
2. **Mobile is where it matters more.** On mobile there is no persistent desktop back link — the header chevron and this button are the only ways out. De-emphasising the escape on the breakpoint where escapes are scarcer is backwards.
3. **It reads as disabled.** It sits directly under a `PrimaryButton` carrying `disabled:opacity-40`, which is empty until the user types a deck name. Muted text on a `--border` outline (1.24:1 against `--bg` — effectively invisible) next to a genuinely dimmed button invites "both of these are inactive."
4. **The mechanism is the tell.** The colours are raw hex, and mobile/desktop are two duplicated `<span>`s whose only reason to exist was carrying different colours. That's the signature of a mock transcribed twice, not a treatment designed twice. Both `#A89B84` and `#EDE6D8` should have been tokens; neither was.
5. **No table ever asked for it.** Nothing in the design tables specifies a softer mobile secondary. There is one secondary treatment.

### Target

| Property | Mobile | Desktop |
|---|---|---|
| component | `<GhostButton href="/decks/new">` | same |
| color | `var(--fg)` | `var(--fg)` |
| border | `1px solid var(--border-strong)` | same |
| font-weight | `600` (primitive-owned) | `600` |
| hover | border `var(--brass)`, color `var(--brass-hover)` | same |
| font-size (caller-owned) | `13px` — unchanged | `14px` — unchanged |
| padding (caller-owned) | `11px 0`, full-width `block` — unchanged | `13px 20px`, `inline-block` — unchanged |

The two duplicated `<span>` children collapse to one label: `Change commander`. Mobile picks up `font-weight: 600` from the primitive — accepted, and desirable given point 3. Layout, size and padding are unchanged; this is a colour unification only.

---

## Contrast — WCAG AA

Against `var(--bg)` `#14110E`, which is the canvas behind all four call sites.

| Value | Ratio | Verdict |
|---|---|---|
| `var(--fg)` `#EDE6D8` | **15.3:1** | AA / AAA ✅ |
| `var(--brass-hover)` `#D8B25E` (hover text) | **9.6:1** | AA / AAA ✅ |
| `var(--brass)` `#C9A24B` (outgoing) | 7.9:1 | passed too — the change is contract, not contrast ✅ |
| `#A89B84` `--fg-muted` (outgoing, mobile) | 7.0:1 | passed as text; failed as hierarchy ✅ |

All four call sites gain contrast. Nothing regresses.

**One honest note on 1.4.11 (non-text contrast):** neither `--border-strong` (1.51:1 vs `--bg`) nor `--border` (1.24:1) meets 3:1 as a standalone boundary. This is pre-existing across every bordered surface in the app and is not introduced by either decision. It is survivable because these controls are identified by a 15.3:1 text label, not by their outline, and focus is carried by the global brass `:focus-visible` ring (`globals.css:130`), not the border. **Not a blocker for #76.** Logged for a future non-text-contrast pass, which should be a token-level decision, not a per-button one.

## New tokens

**None required.** Every value above already exists in `src/app/globals.css`. Item 2's fix is a *removal* of raw hex, not an addition.

---

## Secondary note — mobile hit target (non-blocking)

Not part of either colour decision; flagged because #76 touches these lines.

Padding and font-size are deliberately caller-owned by the primitive, and three of these four call sites land under the 44px mobile minimum:

| Call site | Mobile height | |
|---|---|---|
| `grid-view.tsx` Show more | `9px + 9px + ~18px` ≈ **36px** | under |
| `rows-view.tsx` Show more | ≈ **36px** | under |
| `create-pre-filled.tsx` Change commander | `11px + 11px + ~18px` ≈ **40px** | under |
| `review-screen.tsx` inspector entry | `11px + 11px + ~19px` ≈ **41px** | under |

Cheapest fix that touches no design table: add `min-h-[44px] md:min-h-0` to each caller's `className`. Desktop is unaffected. Take it in #76 if convenient, or as a follow-up — Design has no objection to either.

---

## READINESS

**🟢 GREEN.**

- **Item 1 — ratified.** #76's brass → `var(--fg)` migration on all three CTAs is correct and needs no change. Merge as written.
- **Item 2 — rejected as intentional, called as drift.** Migrate `create-pre-filled.tsx:312-331` to `<GhostButton>` at both breakpoints; collapse the duplicated label spans; delete the raw hex. Small enough to ride in #76 or follow immediately after.
- No new tokens. No design-table edits. §*404: Secondary CTA* remains the single locked source for this treatment, and after both items there are no bordered-secondary CTAs outside it except the acknowledged `builder-spine.tsx:208-235` exemption.
