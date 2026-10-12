/**
 * Which database this admin changes (admin brief, locked rule 12). SERVER-ONLY by use: read from
 * `ADMIN_ENV_LABEL`, because `VERCEL_ENV` cannot tell the staging and production Vercel
 * projects apart.
 *
 * Unset, empty or anything but the two names reads as null, and the admin then does not exist:
 * `requireAdmin()` answers 404 and the account menu draws no door. A page that cannot say which
 * database it writes to is the one thing the chip exists to prevent, so a guess is worse than no
 * page. Set it per Vercel project; a local `.env` sets it to say which branch it points at.
 */
export const ADMIN_ENVS = ["staging", "production"] as const;
export type AdminEnv = (typeof ADMIN_ENVS)[number];

export function adminEnvironment(value: string | undefined = process.env.ADMIN_ENV_LABEL): AdminEnv | null {
  const v = value?.trim();
  return (ADMIN_ENVS as readonly string[]).includes(v ?? "") ? (v as AdminEnv) : null;
}
