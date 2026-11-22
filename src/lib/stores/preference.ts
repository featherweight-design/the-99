/**
 * A reader's store (store preference, design #3200): the store every price they see is read from. Mana Pool is the
 * default, so a reader who never chose, and every reader while `STORE_PREFERENCE_ENABLED` is off for them, reads Mana
 * Pool's tables exactly as before. A friend never sees another reader's store.
 *
 * Server-side by its imports.
 */
import { eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { storePreferenceEnabled } from "./flag";
import { OTHER_STORES, type Store } from "./rows";

export const STORES: readonly Store[] = ["manapool", ...OTHER_STORES];

/** A value as a store the app quotes, or null: the closed set `user_prefs_preferred_store_check` holds. */
export function parseStore(value: unknown): Store | null {
  return typeof value === "string" && (STORES as readonly string[]).includes(value) ? (value as Store) : null;
}

/** The store a reader's prices come from, given their resolved switches and the column as read. */
export function storeOf(env: NodeJS.ProcessEnv, preferred: unknown): Store {
  return storePreferenceEnabled(env) ? parseStore(preferred) ?? "manapool" : "manapool";
}

type Q = Pick<typeof db, "select" | "insert">;

/** The reader's store. Off for them, Mana Pool with no read at all. */
export async function readerStore(userId: string, env: NodeJS.ProcessEnv, q: Q = db): Promise<Store> {
  if (!storePreferenceEnabled(env)) return "manapool";
  const [row] = await q.select({ preferred: userPrefs.preferredStore }).from(userPrefs).where(eq(userPrefs.userId, userId));
  return storeOf(env, row?.preferred);
}

/**
 * Saves the reader's choice in one statement: inserted with their prefs row, or set on it, only when it changes.
 * True when it changed. Mana Pool is stored as itself, not as null, so "chose Mana Pool" stays distinct from "never
 * chose" (the first-run row asks only the second).
 */
export async function setPreferredStore(userId: string, store: Store, q: Q = db): Promise<boolean> {
  const rows = await preferredStoreUpsert(userId, store, q);
  return rows.length > 0;
}

/** The upsert, apart so a test can render it: the update runs only when the stored choice differs. */
export function preferredStoreUpsert(userId: string, store: Store, q: Pick<typeof db, "insert"> = db) {
  return q
    .insert(userPrefs)
    .values({ userId, preferredStore: store })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { preferredStore: store },
      setWhere: sql`${userPrefs.preferredStore} is distinct from ${store}`,
    })
    .returning({ userId: userPrefs.userId });
}
