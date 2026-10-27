/**
 * `SOCIAL_FRIENDS_ENABLED`: friends, invites and pods (plan `boards/plan-social-foundation-2026-10-12.md`).
 * `'true'` on staging, unset on production until Hugh walks it. Exactly `'true'` turns it on. The
 * foundation ships dark: no route or action reads it yet, and the first UI PR gates on it.
 */
export function socialFriendsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SOCIAL_FRIENDS_ENABLED === "true";
}

/**
 * `SOCIAL_GAMES_ENABLED`: opponents in the game log (scope §4, Feature C). `'true'` on staging, unset on
 * production until Hugh walks it. It requires `SOCIAL_FRIENDS_ENABLED` (scope §6: every child switch does,
 * except the wishlist), checked here so an override of this one never raises its parent. Dark until its
 * UI PR: `logGame` refuses opponents while it is off.
 */
export function socialGamesEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SOCIAL_GAMES_ENABLED === "true" && socialFriendsEnabled(env);
}

/**
 * `RULE_ZERO_ENABLED`: the Rule 0 table check (plan `2026-10-16-rule-zero.md`). `'true'` on staging from the PR
 * that lets a reader set a table, unset on production until Hugh turns it on. It requires `SOCIAL_FRIENDS_ENABLED`,
 * checked here so an override of this one never raises its parent: seats are pod members. Dark until its UI PRs.
 */
export function ruleZeroEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.RULE_ZERO_ENABLED === "true" && socialFriendsEnabled(env);
}

/**
 * `SOCIAL_INVITES_ENABLED`: inviting someone new and invite counts (plan `2026-10-16-invites.md`). `'true'` on
 * staging, unset on production until the invite-only launch. It requires `SOCIAL_FRIENDS_ENABLED`, checked here so
 * an override of this one never raises its parent: an account with friends off has no /friends to invite from. Off,
 * Add a friend is as shipped. A sign-up on an invitation already sent is honored whatever this says.
 */
export function socialInvitesEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SOCIAL_INVITES_ENABLED === "true" && socialFriendsEnabled(env);
}

/**
 * `SPARE_REQUESTS_ENABLED`: asking a friend for a spare, and their Yes or No (G5, plan
 * `2026-10-22-spare-requests.md`). Unset on production until the line closes. It requires `SOCIAL_FRIENDS_ENABLED`,
 * checked here so an override of this one never raises its parent. Dark until its UI PRs: the writers refuse while off.
 */
export function spareRequestsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SPARE_REQUESTS_ENABLED === "true" && socialFriendsEnabled(env);
}

/**
 * `FRIEND_DECKS_ENABLED`: a friend's deck opens read-only, and a deck can hide from friends (friend decks handoff,
 * plan in the PR bodies). Unset on production until the line closes and its About entry exists. It requires
 * `SOCIAL_FRIENDS_ENABLED`, checked here so an override of this one never raises its parent. Read under the OWNER's
 * switches for what a friend may see (it is their privacy), and under the viewer's for the route and the links.
 */
export function friendDecksEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.FRIEND_DECKS_ENABLED === "true" && socialFriendsEnabled(env);
}

/**
 * `SIGNATURE_CARD_ENABLED`: the face as any card in any printing, and asking for it once (avatar handoff, plan
 * `2026-10-27-signature-card.md`). Unset on production until the line closes. It requires `SOCIAL_FRIENDS_ENABLED`,
 * checked here so an override of this one never raises its parent. Off, the picker searches commanders as shipped and
 * Home asks for nothing.
 */
export function signatureCardEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.SIGNATURE_CARD_ENABLED === "true" && socialFriendsEnabled(env);
}
