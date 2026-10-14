# CHROME — the rail head is the mark, not a diamond

`design/design_handoff_the99_rail_mark/` · 2026-09-08 · R1

## What shipped

The 62px rail's head is a 26px outlined diamond at 1.5px `--accent`
(`CHROME-rail-and-tabs.md` § *The rail, desktop*). That drawing is the crown's middle diamond with
the other two and the numerals removed, so `<Crowned99>` — the locked primary mark — now renders
only in the wide rail and `MobileHeader`, neither of which a desktop user sees. The bare diamond
also duplicates Discover's nav glyph (6.8r circle, 3.2r diamond), which is the one shape it should
not share.

## What changes

The head slot renders `<Crowned99 variant="rail-62" />`. Crown `--accent`, numerals `--fg`.

Recommended (**1a**): crown 6 / 8.5 / 6px with 3px of visible air between points; because a 45°-rotated square is 1.414× as wide as its layout box, the flex gap is 6px, not 3px — `gap = air + 0.207 × (w₁ + w₂)`, and the crown row is 12px tall (8.5 × 1.414), not 8.5px; numerals Cinzel 900 at
23px, 4px below the crown row; lockup **32.5 × 39**, centred, 14px from the rail's top, 20px before
the first nav item. The head grows 26 → 39px, so the nav block starts **13px** lower and the head
zone measures 14 + 39 + 20 = 73px; nothing else moves.

Alternates drawn on the canvas: **1b** the filled crown alone (11 / 15 / 11px on 10.5px gaps, no numerals) —
loses the name at desktop; **1c** a 36px seal tile — reads as a sixth nav item unless the head
becomes the Home route and the Home icon leaves the nav.

## Rules that do not change

1. The mark appears **once**, at the top. `RailDiamond` stays retired — no per-row diamonds.
2. Discover's glyph is untouched.
3. Head is decorative in 1a/1b: one element, `role="img"`, `aria-label="The 99"`, children
   `aria-hidden`. Only 1c makes it a link (`The 99 — home`).
4. Below 24px the crown drops away (brand sheet § 01). 1a's numerals are 23px **with** the crown,
   which is the one deliberate exception: the floor governs the numerals rendering *alone* as the
   fallback mark, and at 23px the crown is still three resolvable diamonds. If it must be obeyed
   literally, take 1b — do not shrink 1a's numerals below 20px to fit a smaller head.

## Code

`src/components/marks.tsx` — one new variant, three constants (crown sizes, gap, numeral size).
`src/components/shell/nav.tsx` — `NavRail`'s head swaps the diamond span for `<Crowned99
variant="rail-62" />`; the 16px spacer becomes 20px. No token, prop or route changes.

## Note for the implementer

Every gap in this handoff is a **layout** gap on unrotated boxes. Sizing them to the visible air
between diamond points is the bug we hit drawing it: at 6 / 8.5 / 6 a 3px gap closes to 0 and the
crown renders as one smudge. If the crown is ever rebuilt as an SVG the arithmetic disappears —
which is the better end state, since the mark is three points and a rotation, not three divs.

The avatar (30px circle, `--surface` on a `--border-strong` hairline, pinned bottom) is unchanged
by all three candidates and is drawn on the canvas only so the column reads as the real rail.
