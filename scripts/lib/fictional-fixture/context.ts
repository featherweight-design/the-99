// What the stages share: the connection, the player, and the fixed ids of the fictional friends.
import { fixtureFriendId } from "../about-fixture-ids.mjs";
import { FRIEND_NAMES } from "./names";
import { assertOnlyFixtureRows } from "./purge";

export type FixtureSql = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  query: (text: string, params?: unknown[]) => Promise<unknown[]>;
  transaction: (queries: Promise<unknown>[]) => Promise<unknown[]>;
};
export type Ctx = { sql: FixtureSql; viewer: string; branch: string };

/**
 * A fixture friend's id, fixed per player and name (the number is the friend's place in `FRIEND_NAMES`, counting from 1),
 * so a rerun makes the same ids. The id keeps the `about-fixture-<tag>-friend-<n>` shape the capture reads decks by.
 */
export function friendId(viewer: string, name: (typeof FRIEND_NAMES)[number]): string {
  return fixtureFriendId(viewer, FRIEND_NAMES.indexOf(name) + 1);
}

export const DAY = 86_400_000;

/** How many entries `readFaces` returns: Alex (face, deck, an opponent seat) and the four cart friends. */
export const FACE_COUNT = 7;

/**
 * The commanders the friends and opponents are drawn with, from ONE list both stages read the same way: legendary
 * creatures with art that the player does not own, by oracle id. Index 0 Alex's face, 1 his deck's commander, 2 the
 * unnamed opponent; 3 to 6 Torin, Merek, Varic and Zev. Every entry is distinct, so no two friends share a commander.
 */
export async function readFaces(sql: FixtureSql, viewer: string): Promise<string[]> {
  const rows = (await sql`select c.oracle_id::text "oracleId" from cards c
    where c.commander_legal and c.layout = 'normal' and c.type_line like 'Legendary Creature%' and c.art_crop_uri is not null
      and not exists (select 1 from collection_items ci where ci.user_id = ${viewer} and ci.oracle_id = c.oracle_id)
    order by c.oracle_id offset 7 limit ${FACE_COUNT}`) as { oracleId: string }[];
  if (rows.length < FACE_COUNT) throw new Error(`the catalog offers ${rows.length} faces, not ${FACE_COUNT}`);
  return rows.map((r) => r.oracleId);
}

/**
 * Every user-keyed table holds only rows of the player and the five fictional friends. Run after the purge (proving it)
 * and again at the end of each stage (proving nothing the build did, the app's own writes included, reached anyone else).
 */
export async function assertFixtureOnly(ctx: Ctx, when: string): Promise<void> {
  const ids = [ctx.viewer, ...FRIEND_NAMES.map((n) => friendId(ctx.viewer, n))];
  await assertOnlyFixtureRows((text, params) => ctx.sql.query(text, params), ids);
  console.log(`guard (${when}): every user-keyed table holds only the player's and the fictional friends' rows`);
}
