export type MigrationDecision =
  | { action: "skip"; reason: string }
  | { action: "run"; databaseUrl: string }
  | { action: "fail"; reason: string };

/**
 * Decides whether a Vercel build should apply migrations.
 *
 * A missing url on a production build is a hard failure rather than a skip:
 * silently skipping is exactly what shipped code without its schema in #70, so
 * the misconfigured case has to be louder than the healthy one, not quieter.
 */
export function decideMigration(env: NodeJS.ProcessEnv): MigrationDecision {
  const vercelEnv = env.VERCEL_ENV;

  if (vercelEnv !== "production") {
    return {
      action: "skip",
      reason: `Skipping migrations: VERCEL_ENV is ${vercelEnv ? `"${vercelEnv}"` : "unset"}, not "production".`,
    };
  }

  const databaseUrl = env.MIGRATE_DATABASE_URL?.trim();

  if (!databaseUrl) {
    return {
      action: "fail",
      reason:
        "MIGRATE_DATABASE_URL is not set. A production build must apply migrations before deploying. " +
        "Add it to this Vercel project's environment variables (non-sensitive, Production scope only) " +
        "with the same value as DATABASE_URL.",
    };
  }

  return { action: "run", databaseUrl };
}
