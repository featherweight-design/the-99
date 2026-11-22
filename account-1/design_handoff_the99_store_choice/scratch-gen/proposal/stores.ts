// Store choice R1 (account 1, 2026-11-22), PROPOSAL. The one list of stores. A fourth store is one more entry here:
// the Settings rows, every label and the cart rule all read from it, so nothing else is redrawn.
export type StoreId = "manapool" | "tcgplayer" | "cardkingdom";
export type Store = {
  id: StoreId;
  /** The store's own spelling, never shortened. */
  name: string;
  /** What a figure is: one copy's listed price, or a market average of recent sales (TCGplayer). */
  figure: "listing" | "market";
  /** One link that fills the store's cart with a whole list (Mana Pool's add-deck today). */
  cart: boolean;
};
export const STORES: readonly Store[] = [
  { id: "manapool", name: "Mana Pool", figure: "listing", cart: true },
  { id: "tcgplayer", name: "TCGplayer", figure: "market", cart: false },
  { id: "cardkingdom", name: "Card Kingdom", figure: "listing", cart: false },
];
export const DEFAULT_STORE: StoreId = "manapool";
export const storeOf = (id: StoreId) => STORES.find((s) => s.id === id)!;
/** Scratch hook for the boards: the reader's store. In the build this is a per-request read of `user_prefs.store`. */
export const currentStore = (): Store => storeOf(((globalThis as any).__STORE as StoreId) ?? DEFAULT_STORE);
