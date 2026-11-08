# Review rules: The 99

House rules for every review pass on this repository: `/code-review`, the risk checklist pass and
`cavecrew-reviewer` all read this file (`pr-review` skill). A violation of a rule here is a finding.

The 99 is an MTG Commander companion: Next.js 16 (App Router, server actions), React 19,
Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest. Package manager is **pnpm**.

These notes exist so review effort lands on defects rather than on conventions that are already
settled here. They do not narrow what you may report: a real bug in any of the areas below is
still a real bug.

## Conventions that are deliberate, not oversights

- **`pnpm` only.** `pnpm-lock.yaml` is the single lockfile. Suggestions to use npm or yarn, or to
  add a second lockfile, are not applicable.
- **Design packages under `design/` are not engineering artifacts.** They are a non-engineer's
  drawing package, audited and ratified through a separate design process. They are never
  imported by `src/`, and no route serves them. Review the code a handoff describes, not the
  handoff.
- **`docs/superpowers/design-tables/**` quote shipped UI copy verbatim.** A quotation that looks
  like an odd sentence is usually the product's own wording. `pnpm check:copy-drift` enforces
  agreement in CI. Report a table that contradicts the code; do not restyle the copy.
- **Probes come in two kinds, and only one writes.** Some build a fixture: those write under a
  per-run `user_id` and delete it in a `finally`, which is the required discipline here rather
  than a data-loss risk. Most only sign in, measure and close the browser (`probe-pip-gap.mjs` and
  `probe-colour-box.mjs` are of that kind). Tell them apart by whether the script names a
  `user_id`, and **do not assume fixture safety in either direction.** A writing probe that never
  cleans up is a real finding; so is one that writes at all when it did not need to.

## Where review has paid off here

The highest-value findings on this repository have been:

- arithmetic and geometry that disagrees with a stated figure, including figures written in
  comments and property tables;
- platform quirks: iOS Safari zooming sub-16px inputs, an `overflow` ancestor clipping a target, a
  fixed height excluding its own child's margin;
- **tests that pass with the change they cover removed**;
- a pattern fixed in one place and left in its siblings;
- correlated subqueries in Drizzle: a `sql` template in the projection of a single-table select
  renders column references **unqualified**, so `${a.fk} = ${b.id}` becomes `where "fk" = "id"`
  and silently returns 0. Alias the inner table and qualify both sides.

## What the pre-open pass leaves for review

A cold-eyes pass runs before a PR opens, so a share of the mechanical defects is fixed before
review sees the diff. It is measurably unable to reach judgment calls: three theme labels wrongly
allowlisted as mechanics, an RSC exclusion that skipped every client navigation, and a
double-decoded redirect parameter were all found by review and not by it. Spend review effort on
that half.
