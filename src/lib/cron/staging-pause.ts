import { adminEnvironment } from "../admin/environment";

/**
 * Whether a Vercel cron should do nothing on this deployment. The staging project runs the same `vercel.json`, so
 * without this its four crons run 192 times a day against the staging database (96 push flushes, 48 account sweeps,
 * 24 invite sweeps, 24 announcement ingests), for an environment with no users
 * (Hugh, 2026-10-28: staging compute ran level with production's). `VERCEL_ENV` is `production` on both projects,
 * so the project is told apart by `ADMIN_ENV_LABEL` (`src/lib/admin/environment.ts`).
 *
 * Paused only when the label reads `staging` and `STAGING_CRONS` is not `'run'`. Production, local runs and
 * an unset or mistyped label all run the crons: a missing label must never silence production's sweeps. Set
 * `STAGING_CRONS='run'` on the staging project to test a cron there; a change needs a redeploy.
 */
export function cronPausedHere(
  label: string | undefined = process.env.ADMIN_ENV_LABEL,
  override: string | undefined = process.env.STAGING_CRONS,
): boolean {
  return adminEnvironment(label) === "staging" && override?.trim() !== "run";
}

/** The answer a paused cron gives: 200, so Vercel's cron log reads it as a success, and nothing read or written. */
export function pausedResponse(): Response {
  return Response.json({ paused: "staging" });
}
