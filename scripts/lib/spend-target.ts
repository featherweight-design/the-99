// Which database `pnpm report:model-spend` reads. Pure, so the choice is testable.
//
// `scripts/lib/env.mjs` loads `.env` OVER the shell, so DATABASE_URL always names the `.env`
// database (local-dev, which lacks migration 0082). The report therefore never reads
// DATABASE_URL: the target is named, resolved from variables `.env` does not set, and verified
// against the branch the database itself reports.

export const STAGING_BRANCH_ID = "br-polished-pond-a6e63y0b";
export const PRODUCTION_BRANCH_ID = "br-noisy-violet-a6vw4ess";

export type SpendTarget = { name: string; url: string; branchId: string | null };

/**
 * `--target staging|production`, or `REPORT_DB_URL` (+ optional `REPORT_DB_BRANCH`) for any other
 * read URL. `REPORT_DB_URL` is not in `.env`, so env.mjs cannot clobber it. An override that names
 * no branch is allowed, and the report prints whatever branch the database says it is.
 */
export function resolveSpendTarget(argv: readonly string[], env: Record<string, string | undefined>): SpendTarget {
  const i = argv.indexOf("--target");
  const given = i >= 0;
  const named = given ? argv[i + 1] : undefined;
  if (env.REPORT_DB_URL) {
    if (given) throw new Error("pass --target or REPORT_DB_URL, not both");
    return { name: "REPORT_DB_URL", url: env.REPORT_DB_URL, branchId: env.REPORT_DB_BRANCH ?? null };
  }
  if (named === "staging") {
    if (!env.THE_99_NEON_STAGING_DIRECT) throw new Error("--target staging needs THE_99_NEON_STAGING_DIRECT set in your shell");
    return { name: "staging", url: env.THE_99_NEON_STAGING_DIRECT, branchId: STAGING_BRANCH_ID };
  }
  if (named === "production") {
    if (!env.THE_99_NEON_DIRECT) throw new Error("--target production needs THE_99_NEON_DIRECT set in your shell");
    return { name: "production", url: env.THE_99_NEON_DIRECT, branchId: PRODUCTION_BRANCH_ID };
  }
  throw new Error(
    named
      ? `unknown --target "${named}"; use staging or production`
      : "name the database: --target staging|production (DATABASE_URL is never read: .env overrides it with local-dev)",
  );
}

/** Postgres 42703 (undefined_column) naming `origin` (any other missing column is a different failure): the database has not applied migration 0082. */
export function isMissingOriginColumn(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return /column "origin" does not exist/.test(e?.message ?? "") && (e?.code === undefined || e.code === "42703");
}

export const MISSING_ORIGIN_MESSAGE =
  "this database hasn't applied migration 0082 (model_calls.origin); point --target at staging or production";
