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

// ── The fixture's decks ────────────────────────────────────────────────────────────────────────────────────────────
//
// The decks carry their commanders' names, as a reader names a deck, so nothing on a deck tells a rerun or the capture
// which ones the fixture made. The fixture RECORDS them instead, as marks in the `about_seen_ids` of its own friend's
// `user_prefs` row. That row is never drawn: every `user_prefs` read is the signed-in reader's own, and the friend is
// an id no one signs in as. It is scoped to the viewer because the friend's id is (`fixtureFriendId`), and it is
// purged with the friend, after the decks it names are deleted.

const MARK = /^about-deck:(under|over|played|fresh):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** The mark that records deck `id` as the fixture's deck for `role`. */
export function deckMark(role, id) {
  const mark = `about-deck:${role}:${id}`;
  if (!MARK.test(mark)) throw new Error(`deckMark: no role ${role}, or ${id} is not a deck id`);
  return mark;
}

/**
 * The decks a set of marks records, by role (anything not a mark is ignored). Two DIFFERENT ids for one role is refused:
 * a capture must never photograph a deck it cannot tell is the fixture's. `ids` is every recorded id, for a cleanup.
 */
export function readDeckMarks(marks) {
  const byRole = {};
  const ids = [];
  for (const m of marks ?? []) {
    const hit = typeof m === "string" ? MARK.exec(m) : null;
    if (!hit) continue;
    const [, role, id] = hit;
    if (byRole[role] && byRole[role] !== id) throw new Error(`two decks recorded as the fixture's ${role}`);
    byRole[role] = id;
    if (!ids.includes(id)) ids.push(id);
  }
  return { byRole, ids };
}

/**
 * The fixture decks' names: each its commander's name, in order. Two that would read alike are told apart minimally,
 * by a number after the second and later (`Name 2`), never by renaming the first.
 */
export function deckNames(commanderNames) {
  const seen = new Map();
  return commanderNames.map((raw) => {
    const name = String(raw).trim();
    if (!name) throw new Error("deckNames: a commander with no name");
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : `${name} ${n}`;
  });
}
