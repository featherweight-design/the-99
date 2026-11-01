/**
 * RETIRED (Hugh 2026-10-31): `SOCIAL_FRIENDS_ENABLED`, friends, invites and pods (plan
 * `boards/plan-social-foundation-2026-10-12.md`). Production had every reader on. It is being baked in as always on
 * across several PRs; until the last caller is gone this still answers exactly `'true'` as on.
 */
export function socialFriendsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SOCIAL_FRIENDS_ENABLED === "true";
}
