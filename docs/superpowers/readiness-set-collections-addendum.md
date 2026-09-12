# READINESS — Set collections addendum (R2)

**Verdict: 🟢 Green.** Build may start, in four PRs.

- **Handoff:** `design/design_handoff_the99_set_collections/ADDENDUM-*` (R2, 2026-09-12)
- **Amends:** the R3 handoff and `docs/superpowers/readiness-set-collections.md`
- **Audited:** 2026-09-12
- **Design self-assessment:** 🟢 Green, one decision to confirm. Concur.

Five findings from Hugh's first real use of the shipped surface. Four are Design-owned and
are what this verdict covers; the fifth — the card modal opening the wrong printing — was
an engineering defect and shipped separately as PR #543.

## What was checked, and against what

Every load-bearing claim was checked against the tree, not against the document.

| Claim | Source | Result |
|---|---|---|
| The shipped unlit pip is a dimmed token, measuring 1.38:1 | `collection/color-pip.tsx:28` | **True** — `opacity-40` |
| The chassis rules pips as undimmed full-colour symbols | `ui/colour-pips.tsx:21-23` | **True, and already built.** Its own comment: "never masked, tinted or given an opacity … an opacity is what the shipped controls did wrong" |
| The symbol assets exist | `public/mana/` | **True** — `W U B R G .svg` |
| `filter-panel.tsx` mounts with `searchable={false}` | `ui/filter-panel.tsx:6` | **True**, and that is its documented rule |
| `rarity.all` and `rarity.value(r)` already ship, unused | `copy/set-collections.ts:15-16` | **Exact** |
| The shipped row lays 8 cells in 998px | arithmetic | **Exact** — 8×116 + 7×10 |
| The chassis pip's API suits a second mount | `ui/colour-pips.tsx:44` | **True** — `{ value, onToggle, form }`, and `form` carries the 22/44px split |

The pip finding is the strongest item in the package: the only one that closes a *measured*
accessibility failure rather than a consistency gap, and the component that closes it is
already on main.

## Erratum — the density is ruled twice, differently

§27's heading and the readiness table both rule **one constant, `minmax(146px, 1fr)`**.
§27's own body says:

> **F = 116 at `md` and up, 160 below it.** That is the only number that changes between widths.

Those are different pages. Against a 1112px content width, `minmax(146px, 1fr)` gives seven
tracks of ~150px; `minmax(116px, 1fr)` gives eight of ~130px.

**Resolved as stale R1 text, not escalated**, because the document answers it twice the
other way: the heading, the readiness table ("one declaration and one constant (146)"), and
§27's closing rationale — *"R2 could delete R1's phone exception: 146 is inside it, so the
desktop constant produces the phone answer for free and the two widths stop being two
rules."* The 116/160 sentence is the rule R2 deleted. **Design to ratify; no round-trip.**

**The build takes 146.**

## Two smaller errata, neither touching a ruling

- The content width is **1112px**, not 1100: `max-w-[1180px]` less `px-[34px]` either side.
  The column count is seven either way, so no ruling moves.
- The addendum says nothing in it touches the card modal. True of its own rulings, but the
  modal changed underneath it on the same day (#543), which is why finding 5 is absent from
  the plan below.

## Sequencing: the chassis pip has shipped, `/collection` has not adopted it

`filter-bar.tsx:139` still mounts `ColorFilterRow`, which wraps the dimmed `color-pip.tsx`.
Building the set page's rack against the chassis therefore makes the two routes show
visibly different colour controls until `/collection` migrates.

Not a reason to hold the work — the set page would be the correct one, and the migration is
the chassis's own — but PR 3 below is the one to schedule alongside that adoption rather
than ahead of it.

## Dependencies

- `ui/colour-pips.tsx` and `ui/filter-panel.tsx` — **mounted, never forked.**
- `ui/text-field.tsx`'s `SearchField` for finding 4.
- `SetGridFilters` gains a fourth field, and it must travel through `applyFilters`: the
  result line, the `Send N` label, the cost denominator and now the rarity panel's per-row
  counts are four readings of one computation.
