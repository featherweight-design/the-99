# READINESS — Commanders · list windowing (#52)

**Verdict: 🟡 Yellow — ready for implementation.** R1 was 🟠 Orange on two blockers; R2 closes both,
properly rather than minimally. One copy inconsistency remains, closable eng-side because the rule to
apply is stated in the handoff itself. Not another Design round-trip.

Audited against `main` at the #64 merge (2026-07-25).

---

## R1 blockers — both closed

**B1 · Count collision → resolved, and better than asked.** I asked for distinct copy. Decision 5
goes further and removes the shared *shape*: the window count carries **no total at all**
(`25 shown · 71 more below`), while the shipped filter count keeps `Showing 96 of 214` verbatim. With
no shared denominator and a different verb, the two can't be misread side by side — and the total
stays where a total is meaningful. Arithmetic checks out in the canvas (`filtTotal = 96`,
`filtRemaining = filtTotal - shown1` → 71).

**B2 · Undrawn desktop frame → resolved.** New state **1b · Default, color filter active** draws both
figures together at final copy, desktop (1060px) and mobile (392px). `Order:` now appears 5× in the
canvas (was 0) and `COLORS` 4× (was 2, mobile-only). Pip sizes match shipped exactly — 16px desktop,
14px mobile.

## R1 Yellow notes — all carried into the handoff

- **Gap #1/#2 (back-navigation)** → resolved in "Resolved after the R1 audit": the window resets on
  remount, matching Collection; restoration filed separately. Gap report is down from 6 items to 3.
- **Brass rationale** → decision 3 corrected to acknowledge `Clear` and the active-pip ring. Same
  conclusion, accurate reason.
- **Order-label drift** → canvas now uses the shipped `Order: Fit ↓ · fixed` verbatim, 5×.
- **Bonus, unprompted:** an engineering note that ranks are global and don't renumber under a filter
  (state 1b skips rank 25). Matches shipped behaviour — `commanders-view.tsx` builds `rankBySlug` from
  the unfiltered `results`.

---

## Eng-side notes to close in the plan PR

### 1. The live-region announcement still uses the phrasing decision 5 forbids

Decision 5 rules that the window count "never uses *showing … of …*" — that string belongs to the
filter count. The window **announcement** was not updated to match, and still reads:

- `README.md:112` — *"Showing 50 of 214 commanders. Ranks 26 to 50 added."*
- `README.md:137` (component table, Live region) — `Showing {shown} of {total} commanders. …`
- canvas live-region string — `Showing ${shown2} of ${total} commanders. Ranks ${from} to ${to} added.`

A screen-reader user would hear the filter count's phrasing applied to the window figure — the exact
confusion B1 removed from the visual channel, left in the audio one. It also inherits the `{total}`
ambiguity: with a filter active the window counts against the **filtered** length, not `total`.

Not Orange, because Design already made the decision — decision 5 states the rule and the
`{shown} shown · {remaining} more below` form. Apply that rule to the announcement, keeping the range
clause, e.g. `50 shown, 164 more below. Ranks 26 to 50 added.` Worth a glance from Design at copy
review, but it needs no drawing and no new call.

### 2. The control is unreachable with current beta data — state a verification path

Decision 2 makes `25 > 24` deliberate, so the reference collection can never render the control. The
ticket needs an explicit way to verify all five states: temporarily set `REVEAL_STEP = 5`, or cover
the slice/reset/count logic in unit tests. Otherwise it ships unverified against real data.

### 3. Focus-on-reveal mechanism (still open in the handoff, resolved here)

The list is `<ul><li key={r.slug}><RecCard/></li></ul>`. Put `tabIndex={-1}` and a ref on the `<li>` at
index `shown - REVEAL_STEP`; focus it in the click handler. No `rec-card.tsx` change, no nth-child
query.

### 4. Two stale details in the handoff prose — read past them, don't copy them

Neither changes a decision, and the handoff is left verbatim so the line references above stay valid.

- `README.md:106` / `:110` write the attribute as `tabindex`. The implementation is TSX, so it is
  `tabIndex` — as note 3 already has it.
- `README.md:119` says "All four states exist on both." R2 added state 1b, so it is five: 1, 1b, 2,
  3, 4. Parity itself is fine — the verification table above confirms all five at both viewports.

---

## Verified against shipped code

| Claim | Status |
|---|---|
| `collection/browser.tsx:23` ships batch-plus-reveal | ✅ `PAGE_SIZE = 200`, `:71 useState`, `:94 slice`, `:162/:164 onShowMore` |
| Filter change resets the window | ✅ matches shipped `:77` / `:81` |
| Ranks don't renumber under a filter | ✅ `rankBySlug` built from unfiltered `results` |
| Filter count string unchanged | ✅ `Showing {filtered} of {total}` desktop, `{filtered}/{total}` mobile |
| Empty states never render the control | ✅ `FilteredEmpty` branch replaces the `<ul>` |
| `Order: Fit ↓ · fixed` | ✅ canvas matches shipped verbatim |
| 5 states × 2 viewports | ✅ 1, 1b, 2, 3, 4 on mobile (392px) and desktop |
| No new tokens or dependencies | ✅ |

## Remaining gap-report items — all accepted, none blocking

1. **First-run banner + long list** — reachable, but the banner sits above the filter bar and the
   control ~200 cards below; they can't read as one unit. No action.
2. **Reduced motion** — nothing animates and decision 8 forbids adding animation. No action.
3. **Batch size is a layout guess** — accepted; it's a one-line constant.
