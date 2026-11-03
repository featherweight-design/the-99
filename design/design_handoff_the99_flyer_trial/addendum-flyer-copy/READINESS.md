# Readiness: flyer copy addendum

**Verdict: Green.** One small code PR (S, under 150 lines with tests). No migration, no new switch (the flyer is printed by admins only, behind the shipped flyer-trial switch), no About entry. Checked against `origin/main` @b1480c2.

## For engineering

1. `src/lib/copy/join.ts`, `flyerCopy`: `pitch` and `sub` take the new strings; add `points` (three strings, in the README's order).
2. `src/components/admin/flyer-sheet.tsx`: draw `<ul className="fs-pts">` between `.fs-h1` and `.fs-sub`, one `<li>` per point with an `aria-hidden` diamond `<i>`.
3. `src/app/admin/invites/flyers/[code]/print.css`: add `.fs-pts` (README's list spec), `.fs-sub` margin-top 16px, `.fs-fan` zoom 0.68, and drop `.fs-url`'s margin-top.
4. Test: the print page test renders the pitch, the three points as list items and the sub, and pins each point at 52 characters or fewer (the measured one-line headroom at 20px in the 696px column).

## Checked

- Every line fits one line at 816 × 1056: the pitch balances to two lines, each point and the sub to one. No single word sits alone on a last line (Hugh's rule).
- The fan, address, footer and notice keep their positions inside the 56/60px inset; nothing clips.
- The features named are all shipped: For you fit, Combos one piece away, spare requests.
