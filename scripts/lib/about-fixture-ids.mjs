// The ids `about-fixtures.mts` gives the fixture friends it creates, namespaced by the account (viewer) a run is for, and
// the rule that decides which of them a rerun may purge. A run for account B must never purge account A's friend (and
// with it A's spare, A's pod membership and A's game-opponent links), so a cleanup selects ONLY its own viewer's
// namespace, and a fixture whose owner cannot be read from its id (an older run's `about-fixture-colin-<ms>`) is left.
import { createHash } from "node:crypto";

export const FIXTURE_PREFIX = "about-fixture-";

/** The viewer's namespace: a hash, so the id carries no Clerk id and no LIKE wildcard (`_`, `%`). */
export function ownerTag(viewer) {
  if (typeof viewer !== "string" || viewer.length === 0) throw new Error("ownerTag: no viewer");
  return `o${createHash("sha256").update(viewer).digest("hex").slice(0, 16)}`;
}

/** The id of a fixture friend this run creates for `viewer`. */
export function fixtureFriendId(viewer, now) {
  return `${FIXTURE_PREFIX}${ownerTag(viewer)}-friend-${now}`;
}

/** The LIKE pattern that selects `viewer`'s fixture friends and nothing else (the tag is hex: no wildcard in it). */
export function ownedFixturePattern(viewer) {
  return `${FIXTURE_PREFIX}${ownerTag(viewer)}-friend-%`;
}

const OWNED = /^about-fixture-(o[0-9a-f]{16})-friend-\d+$/;

/**
 * Sorts fixture-looking ids into the ones `viewer` owns (purge them), the ones another viewer owns (never touched), and
 * the ones whose owner cannot be established (left, and reported). An id outside the prefix is none of them.
 */
export function sortFixtures(viewer, ids) {
  const mine = ownerTag(viewer);
  const purge = [];
  const foreign = [];
  const unowned = [];
  for (const id of ids) {
    if (typeof id !== "string" || !id.startsWith(FIXTURE_PREFIX)) continue;
    const m = OWNED.exec(id);
    if (!m) unowned.push(id);
    else if (m[1] === mine) purge.push(id);
    else foreign.push(id);
  }
  return { purge, foreign, unowned };
}
