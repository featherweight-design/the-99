/**
 * The reader's store for a server action (store preference, design #3200): their switches resolved for this request,
 * then their store, Mana Pool when either read fails. An action's result is drawn under the page's `StoreProvider`,
 * so the figures it returns come from the same store the page's links and labels name.
 *
 * Server-side by its imports.
 */
import { requestFlags } from "../flags/request";
import { readerStoreForPage } from "./preference";
import type { Store } from "./rows";

export async function readerStoreForAction(userId: string): Promise<Store> {
  try {
    return await readerStoreForPage(userId, await requestFlags(userId));
  } catch (error) {
    console.error("[store] reader switches read failed; drawing Mana Pool", error);
    return "manapool";
  }
}
