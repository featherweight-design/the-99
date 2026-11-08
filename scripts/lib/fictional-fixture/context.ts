// What the stages share: the connection, the player, and the fixed ids of the fictional friends.
import { fixtureFriendId } from "../about-fixture-ids.mjs";
import { FRIEND_NAMES } from "./names";

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
