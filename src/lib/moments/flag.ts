/**
 * `MOMENTS_ENABLED`: the one-time bubbles that point a reader at a tool they have not used (discovery R1, plan
 * `2026-10-16-moments.md`). `'true'` on staging, unset on production until Hugh walks it. Exactly `'true'` turns it
 * on. Each moment ALSO follows its own tool's switch (`registry.ts`), so a tool that is off has no moment.
 */
export function momentsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.MOMENTS_ENABLED === "true";
}
