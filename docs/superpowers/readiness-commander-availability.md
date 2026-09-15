# READINESS — commander availability (R1)

**Verdict: GREEN, with seven errata and one drawn defect.**

Audited 2026-09-15 against `origin/main` at `d250ca83`. Every claim below was read on that commit.

The five calls are sound and three of them were verified against the mechanism they rest on. The
handoff invents no component, no marker option and no vocabulary, which is what the brief asked for.
What follows are corrections, not a redraw: none of them reopens a call, and the one drawn defect is
contradicted by the handoff's own STATES table, so the spec already says which way to fix it.

---

## The calls, audited

| Call | Verdict | Verified against |
|---|---|---|
| **4.1** aria coupling — "no divergence to ratify" | **Accept** | `markerAria` is consulted only at `spoken` (`availability-marker.tsx:326`), and the prop's own doc names the non-speaking callers (`:274-286`). `CoverageChip` is a `CardDetailTrigger` with a computed `aria-label`; `SynergyRow` carries `rowAria` on the `<li>`. The deck name never travelled through the marker on this page. The reasoning holds. |
| **4.2** legend — three keys to one, two forms | **Accept** | The conditional mechanism ships: `DotKey` reads every card in every role and draws its second entry only on `anyCommitted` (`coverage-section.tsx:66-80`). `anyMarker` is a one-line swap, not a new pattern. |
| **4.3** sort sub-line | **Accept** | Every noun is shipped vocabulary: `wanted by a brew` (`copy/availability.ts:152`), `in use` (`:149-150`), `over-committed` (`copy/about.ts:159`, `:336`), and `Free to use first` is the existing sub-line's own opening. (`over-committed` appears in `copy/availability.ts` only as a source comment; it ships from `about.ts`.) |
| **4.4** density on the chip | **Accept, with erratum 1** | 17.19 confirmed at `card-availability.md:506`. The `update-diff-row.tsx:259` precedent is real and reads as the handoff describes. |
| **4.5** About entry | **Accept** | Drawn on the R4 §8 template, fields in order. |

**§4.6 and §4.7 are answered, but by accident.** Both were added to the brief by round 1's review
*after* Design began, so neither appears in the five-call table. Both are nonetheless ruled:

- **§4.6** (what the slot draws for an owned card with no free copy) is answered by the slot spec —
  marker when owned and contended, tag only when unowned. That is `deck-card-tile`'s gate
  (`card.owned`), not `update-diff-row`'s (has-a-free-copy). It is the right answer for a browsing
  surface and it is the one this audit accepts, but Design chose it without knowing the two shipped
  surfaces disagree.
- **§4.7** (the synergy row's accessible name) is **NOT closed**, and an earlier draft of this audit
  wrongly said it was. Ledger 4 has `rowAria` call `markerAria(a)`, which covers the three marker
  readings — but the unowned reading draws a priced `BuyTag`, not a marker, and `markerAria` returns
  `null` there (`availabilityState` reports `free` at `owned <= 0`; an unowned card has no map entry
  at all). The `<li>`'s `aria-label` **replaces** everything beneath it, so the visible `buy · $4.50`
  is drawn and never spoken. **`rowAria` needs a price clause — and a sold-out clause — beside the
  severity one.** The wording is Design's; the gap is real and blocks §4.7.

---

## The drawn defect

**D1 — the `over` chip wraps its name to two lines.**

Visible in the canvas's `over` cell: `Swords to Plowshares` breaks across two lines and `short 2`
breaks with it. The cell declares a fixed `height:28px` (canvas `:261`), as the shipped chip declares
`h-[28px]` (`coverage-chip.tsx:98`) — neither sets a `min-height` — so whether the wrap grows the box
or overflows it depends on the render. This audit does not assert which; **the wrap itself is the
defect and the fix is the same either way.**

**The handoff's own STATES contradicts the drawing** — *"No cell changes a height or a grid. The chip
stays 28px"* — so this is an erratum against a stated rule, not an unruled question.

**Root cause is pre-existing, and this feature exposes it.** The chip's name is a bare span with no
`whitespace-nowrap`, no `truncate` and no `flex-none` (`commanders/coverage-chip.tsx:104-106`) inside
an `inline-flex ... h-[28px]`. It could always wrap; it never had the content to. Adding the marker's
measured 69–89px (§4.4's own table) is what makes it reachable. The phone row already solves the same
problem the app's usual way — `flex-1 min-w-0 truncate` (`:162`).

**Ruled, because the spec already implies it:** the chip's name takes `whitespace-nowrap`. The marker
is already `flex-none whitespace-pre` at row density and stays whole. The chip becomes as wide as its
content and takes its own line in the `flex-wrap` — which §4.4's arithmetic already anticipates when
it says a contended panel falls to three chips per line.

**The phone is already solved and is not in scope.** `CoverageChip` renders only in the desktop
branch (`coverage-section.tsx:161`); the phone branch draws `CoverageRow` (`:274`), which already
carries `flex-1 min-w-0 truncate`. An earlier draft of this item measured the pathological case
against a phone container it cannot reach.

**Open, and small:** a pathological name (`Asmoranomardicadaistinaculdacar`, 31 characters ≈ 214px at
11.5px mono) plus an 89px marker plus a 34px plate is ~350px, which fits the narrowest desktop the
chip renders at. So `nowrap` alone is sufficient today and a `max-w` floor is a hardening measure,
not a fix. Eng may add one matching `:162`; it does not need a Design round.

---

## Errata

1. **The chip-growth figure is Design's correction to the brief, and it is right.** Measured 69–89px
   against the brief's "roughly 40px". The decision is unaffected; the figure carries into
   `docs/superpowers/design-briefs/2026-09-15-owned-is-not-available.md` §3 ruling 3.

2. **The three `seam` values must be tokens, not hex — and two are wrong hex.** §4.4's table gives
   `#221D16` for `--surface-raised`; the token is **`#211D18`** (`globals.css:22`). The selected
   synergy row is given `#211C15`; it is `var(--elevated-hover)`, **`#201C17`** (`:27`). Only
   `--surface` `#1E1A15` is correct (`:21`).

   **Three places carry the hexes, not one** — §4.4's table, `STATES:71`, and ledger 1 at
   `README:188` — so the correction is made in all three or an engineer follows whichever they read.

   The arithmetic matters less than the form: `seam` must be passed as `var(--surface-raised)`,
   `var(--surface)` and `var(--elevated-hover)`, never a resolved hex. A frozen hex is correct in one theme and paints a
   hairline crack in the other five — the exact bug `CHIP_SKIN`'s own comment records fixing
   ("so a theme change carries the chip with it instead of leaving one fixed dark rectangle").

3. **`#6B3226` is correctly cited by Design, and the value itself has drifted.** It is the ratified
   over-committed container tint in the design table of record — `card-availability.md:58`, row 4.5
   (`:160`) and row 4.10 (`:170`) — so the handoff quoted the right source and this audit's first
   draft was wrong to call it invented.

   The finding that survives is about the TABLE, and predates this round: the hex ships nowhere in
   `src/`. The marker's over branch is `var(--danger)` (`availability-marker.tsx:218`, `:235`) and the
   chip border is a `color-mix` over a token, because the six-theme system replaced fixed darks with
   token expressions — `CHIP_SKIN`'s own comment records that change. So eng writes the over branch as
   `color-mix(in_srgb, var(--danger) 40%, var(--bg))`, matching the free branch's form, and the design
   table's three `#6B3226` rows want a separate erratum against the theme system. Not this round's.

4. **Design worked from the pre-round-1 brief, in two places.** READINESS dependency 3 and the
   README's out-of-scope list (`:238`) both quote §5 as "six themed values" that "lands on every
   ownership dot in the app at once", and both say "Design owes six values". The merged §5 asks for
   **one Canopy value**: nine tokens are identical across all six themes, 37 files read `--success`, and
   only Canopy's palette has the clash. Out of scope for this round either way.

5. **Design's gap 3 is already answered.** `RoleCard` gaining an availability field, versus passing
   the map as a second argument to `sortRoleCards`, is named in the merged brief's §7 with both
   options and the note that the shipped signature supports neither as written.

6. **Ledger 7 deletes `LegendPip` without naming its second caller.** `synergy-panel.tsx:259-264`
   renders `LegendPip` three times and all three `dot*` strings. Ledger 7 deletes `LegendPip` and
   ledger 6 deletes `dotCommitted`, and no ledger row covers that file — so the round as written is a
   typecheck failure, and K.4's always-on `Owned.` / `Not owned.` legend never gets implemented.
   **`synergy-panel.tsx` needs its own ledger row**, alongside `coverage-section.tsx`'s.

7. **Design's gap 1 duplicates erratum 1**; gap 4 (the key's pip baseline) is a one-line eng check
   against `LegendPip`'s inline offsets (`ownership-dot.tsx:103-114`), which are `marginRight: 5`,
   `verticalAlign: baseline`, `top: -0.5`.

---

## Carried forward, not blocking

- **Degraded availability is not drawn** (Design's gap 6). Agreed as out of scope: the brief's §3 did
  not raise it, and Role Coverage already owns a degraded note and the page's only Retry for EDHREC.
  It belongs on the next brief.
- **The synergy panel's responsive floor** (Design's gap 2). The desktop row's fixed columns reach
  ~382px before gaps; which column gives way first at the narrowest desktop is unruled. Eng measures
  it and reports rather than guessing — the `probe:review` held-row lesson is the precedent.
- **`buy · sold out` against the 88px slot** (Design's gap 5). Measure before fixing 88px.
