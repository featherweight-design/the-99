// The one guard for a script that DELETES or RESEEDS a whole account's collection, history, uploads or decks.
//
// Production and staging are refused by `neon.branch_id`, and so is `local-dev`: it holds the headless
// account's real snapshot (`pull:staging`), which other lanes' probes read, and on 2026-10-15 its
// collection lost every printing to a probe whose guard refused only production and staging.
// A destructive probe runs on a scratch branch made from local-dev, and a scratch branch is
// anything not named here.
export const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
export const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
export const LOCAL_DEV_BRANCH = "br-patient-hall-a6nbonvo";

const REFUSED = new Map([
  [PRODUCTION_BRANCH, "production"],
  [STAGING_BRANCH, "staging"],
  [LOCAL_DEV_BRANCH, "local-dev"],
]);

/**
 * Throws unless `branch` (the database's own `neon.branch_id`) is a scratch branch. Call it before the
 * first write; `what` names the script in the message.
 */
export function assertScratchBranch(branch, what) {
  if (!branch) {
    throw new Error(`${what} refuses an unknown branch: it replaces an account's data. Point DATABASE_URL at a scratch branch.`);
  }
  const named = REFUSED.get(branch);
  if (named) {
    throw new Error(
      `${what} refuses ${named} (${branch}): it deletes or reseeds an account's data. ` +
        `Point DATABASE_URL at a scratch branch made from local-dev, never local-dev itself.`,
    );
  }
}
