# The 99 extension for infra-setup

These add to the plugin's `infra-setup` skill and win where they conflict.

## Audit history (the source of the generic rules)

- The cost audit of 2026-10-23 found most of the Vercel and Neon bill went on builds nobody
  needed and databases kept awake by a cron.
- 21% of pushes touched nothing the app reads. Build CPU was 77% of the Vercel bill, about
  7 CPU-minutes a build.
- Production CPU peaked near 0.05 CU, so the fixed 1 CU is for page cache, not CPU.
- A 5-minute sweep kept both databases awake around the clock, about 80% of Neon compute.
  Moving it to every 30 minutes let them sleep.
- Local dev read 92 GB of egress in one month. The Launch plan includes 500 GB.
- History retention: 1 day.
- Deleted scratch branches at 1 CU ran up a real bill in a month.
- A migration URL re-scoped to Preview cost five hours of deploys.
- Each big cost was a small default nobody priced (a 5-minute cron, a 1 CU branch, a twin
  build).

## Reference implementations

- Ignored Build Step: `scripts/vercel-ignore.mjs` and `scripts/lib/vercel-ignore.mjs`.
- Cron cadence guard: `scripts/lib/cron-cadence.mjs`.

## Sentry scrubbing

Messages and bodies carry player data and webhook signatures; scrub them as the skill says.
