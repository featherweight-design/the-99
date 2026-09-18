# Repository instructions for Copilot code review

The 99 is an MTG Commander companion: Next.js 16 (App Router, server actions),
React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest. Package
manager is **pnpm**.

These notes exist so review effort lands on defects rather than on conventions
that are already settled here. They do not narrow what you may report — a real
bug in any of the areas below is still a real bug.

## Conventions that are deliberate, not oversights

- **`pnpm` only.** `pnpm-lock.yaml` is the single lockfile. Suggestions to use
  npm or yarn, or to add a second lockfile, are not applicable.
- **Design packages under `design/` are not engineering artifacts.** They are a
  non-engineer's drawing package, audited and ratified through a separate design
  process. They are never imported by `src/`, and no route serves them. Review
  the code a handoff describes, not the handoff.
- **`docs/superpowers/design-tables/**` quote shipped UI copy verbatim.** A
  quotation that looks like an odd sentence is usually the product's own wording.
  `pnpm check:copy-drift` enforces agreement in CI. Report a table that
  contradicts the code; do not restyle the copy.
- **Probes under `scripts/probe-*.mjs` write and delete their own fixtures**,
  always under a per-run `user_id` and always cleaned up in a `finally`. That is
  the required discipline here, not a data-loss risk.
- **Em dashes were deliberately removed from user-facing copy** in a ratified
  sweep. Do not suggest reinstating them.

## Where review has paid off here, historically

Highest-value findings on this repository have been:

- arithmetic and geometry that disagrees with a stated figure, including figures
  written in comments and property tables;
- platform quirks — iOS Safari zooming sub-16px inputs, an `overflow` ancestor
  clipping a target, a fixed height excluding its own child's margin;
- **tests that pass with the change they cover removed**;
- a pattern fixed in one place and left in its siblings;
- correlated subqueries in Drizzle: a `sql` template in the projection of a
  single-table select renders column references **unqualified**, so
  `${a.fk} = ${b.id}` becomes `where "fk" = "id"` and silently returns 0. Alias
  the inner table and qualify both sides.

## Findings already settled

PR bodies may carry a `## Settled` section recording a finding that was raised,
considered, and deliberately declined, with the reason. **Please do not re-raise
a finding that section already answers.** If you believe the recorded reasoning
is wrong, say so explicitly and name the entry rather than restating the original
finding as if it were new.

Likewise, a thread you opened on an earlier round that has since been fixed does
not need restating in the summary of a later round.
