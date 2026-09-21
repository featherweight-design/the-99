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
 *
 * THE MESSAGE NAMES THE SCOPE, because "not set" was the wrong half of the story
 * the one time this fired in anger. On 2026-09-21 the variable was moved to
 * Preview on both projects — where it is inert, since previews skip migrations —
 * and every production build failed for five hours. The dashboard showed the
 * variable present the whole time, so an operator reading "is not set" against a
 * screen that plainly lists it has been told the two things cannot both be true.
 * They can: `process.env` here holds only what this environment is scoped to.
 */
export function decideMigration(
  env: Record<string, string | undefined>,
): MigrationDecision {
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
        "MIGRATE_DATABASE_URL is not readable by this production build. A production build must " +
        "apply migrations before deploying.\n" +
        "CHECK ITS SCOPE FIRST: a copy scoped to Preview is not set here, and the dashboard shows " +
        "it present, so this reads as missing when it is only out of scope. It must be scoped to " +
        "Production, with the same value as this project's DATABASE_URL. Sensitive is fine — the " +
        "build reads it either way.",
    };
  }

  return { action: "run", databaseUrl };
}
