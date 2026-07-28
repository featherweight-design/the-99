# 2026-07-27 — Collection filter panel — design spec

Design spec for the visible half of GitHub issue [#86](https://github.com/HartiganHM/the-99/issues/86)
("Set names + set search"). Captures the locked decisions and gates Phase 6 of
`docs/superpowers/plans/2026-07-27-printings-sets-and-catalog-ingest.md`.

- **Design ticket:** [#86](https://github.com/HartiganHM/the-99/issues/86)
- **Track:** 2 (design needed → handoff → readiness → implementation)
- **Closed as duplicate:** [#17](https://github.com/HartiganHM/the-99/issues/17)
- **Surface:** `/collection`, filter bar — `src/components/collection/filter-bar.tsx`
- **Existing property table:** `docs/superpowers/design-tables/collection.md:389-406`

---

## Problem

The `Set ▾` control is a native `<select>` listing **raw set codes** exactly as the CSV
supplied them — `ECL`, `TLA`, `PIP`, `2X2`. Two failures compound:

1. **Codes are not names.** Nobody scanning a list recognises `LTR` as *The Lord of the
   Rings: Tales of Middle-earth*. The catalog has never stored set names; the backend
   half of this plan adds a `sets` table that does.
2. **The list is unusable at real scale.** `the-vault.csv` spans **254 distinct sets**,
   **69 of them holding a single card**. A flat, unsearchable, alphabetically-arbitrary
   254-item native dropdown is a scroll-hunt on desktop and an OS wheel-picker on mobile.

`Type ▾` (13 options) and `Sort ▾` (5 options) do not have the scale problem, but they
share the control. Whatever the Set panel becomes, the three must stay visually coherent
in the same row — which is why they are handed off together rather than Set alone.

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Set list shows | Full set name, with the code as secondary metadata — never the code alone |
| 2 | Set panel is searchable | Yes. Type-ahead filtering over set names **and** codes |
| 3 | Owned-only | The panel lists only sets present in the user's collection, never all 1,047 |
| 4 | Per-set count | Each row shows how many cards the user owns from that set |
| 5 | Default ordering | Release date, newest first — the `sets` table supplies `released_at` |
| 6 | Native `<select>` is replaced for Set | It cannot host a search field. Type and Sort may keep theirs if the row still reads as one control family |
| 7 | Selection surfaces as a chip | Reuses the existing `chip-row.tsx` dismissible-chip pattern, unchanged |
| 8 | Scope | `/collection` only. Deck-builder and commander search are out of scope |

## Open for Design to call

- **Panel form factor.** Popover on desktop and bottom sheet on mobile (the `user_menu`
  handoff's pattern), or one form at both breakpoints. Design owns this.
- **Whether `Type ▾` and `Sort ▾` convert to the same panel component** or stay native
  `<select>`. Consistency vs. the a11y-and-parity rationale recorded at
  `filter-bar.tsx:4`. Design owns the tradeoff; state the reasoning either way.
- **Secondary ordering affordance** — whether an alphabetical / most-owned toggle is
  worth the chrome, or whether search makes ordering a non-issue.
- **Single- vs multi-select.** Today the filter is single-select. Multi-select is the
  more useful behaviour for a 254-set collection, but it changes the chip row and the
  result-count line. Design should propose; eng will confirm feasibility.
- Empty state (search matches nothing), and the long-name truncation rule — the longest
  name in the real collection is *The Lord of the Rings: Tales of Middle-earth* (43ch).

## Constraints

- One palette — Palette A "Table Candlelight". Tokens are `var(--*)`, defined in
  `src/app/globals.css`.
- Breakpoint 768px (Tailwind `md:`), mobile-first. Both breakpoints ship together.
- Voice: **Kitchen Table** — friend-at-the-table energy. Flavour lives in headings and
  empty states; the data UI stays quiet and legible.
- WCAG AA. The panel is keyboard-operable and screen-reader-labelled — this is the
  explicit cost of decision #6, and the handoff must show how it is paid.
- No new dependencies preferred; the app ships no headless-UI library today.
- Reuse `SearchField` from `src/components/ui/text-field.tsx` for the panel's search
  input rather than specifying a new one.

## Dependency

The panel cannot ship until the `sets` table lands (Phase 1) and set names reach the
browse layer (Phase 6). Design work is not blocked by either.

Note on casing: Phase 4 normalises stored set codes to lowercase, so by the time the panel
ships the raw values are `ecl`, not `ECL`. Set codes are shown to users **uppercased for
display** regardless of storage — that is the convention players read them in. Design should
spec them uppercase; eng owns the transform.
