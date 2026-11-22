// Store choice R1 (account 1, 2026-11-22), PROPOSAL, DRAFT for /copy-review. US English, no em dashes.
import type { Store, StoreId } from "../store/stores";

export const storeCopy = {
  // ── Settings · Store (first section) ─────────────────────────────────
  head: "Store",
  explain: "Prices and buy links across the app come from the store you pick.",
  rows: {
    manapool: "Listing prices, and one link that fills a cart with a whole list.",
    tcgplayer: "Market prices, an average of recent sales, so a listing can cost more or less.",
    cardkingdom: "Card Kingdom’s own prices. Buy links open one card at a time.",
  } satisfies Record<StoreId, string>,
  /** The one place the app says Mana Pool is the default. */
  foot: "Mana Pool is the default. Changing store changes every price, buy link and price-drop alert.",
  groupLabel: "Store for prices and buy links",
  failed: "We couldn’t save that. Try again.", // toast, role alert

  // ── The in-context door (Shopping strip and the all-decks cart) ──────
  /** Trails the provenance line; a link to /settings#settings-store, which washes the section. */
  change: "Change store",
  changeAria: (s: Store) => `Change store, now ${s.name}`,

  // ── Provenance (strip line 2, cart checkout) ─────────────────────────
  provenance: (s: Store) => (s.figure === "market" ? `${s.name} market prices` : `single-copy prices on ${s.name}`),
  provenanceUnpriced: (s: Store) => `no prices from ${s.name} for these`,
  /** THE accuracy note, short form: after the provenance on a market store. */
  marketNote: "averages of recent sales, so a listing can differ",

  // ── No whole-list cart (the strip and the all-decks cart) ────────────
  noCart: (s: Store) => `${s.name} has no link for a whole list. Buy each card from its details.`,

  // ── Card details ─────────────────────────────────────────────────────
  linkOut: (s: Store) => `Buy any printing at ${s.name}`,
  linkOutPrinting: (s: Store, set: string, n: string) => `Buy ${set} ${n} at ${s.name}`,
  /** THE accuracy note, card form: beside the tag, market stores only. Its accessible form rides the tag's sentence. */
  marketTag: "market price",
  /** No price from this store (item 7): in the tag's place. */
  noPrice: (s: Store) => `no price from ${s.name}`,
  /** The link's words when the store has no figure for the card: a search, not a claim it sells it. */
  lookFor: (s: Store) => `Look for it at ${s.name}`,

  // ── Elsewhere (label swaps, same shape as shipped) ───────────────────
  feedBuy: (s: Store) => `Buy at ${s.name}`,
  deckCost: (s: Store, age: string) => (s.figure === "market" ? `${s.name} market prices, ${age}` : `${s.name} prices, ${age}`),
  soldOutNote: (s: Store, price: string) => `${s.name} has none now. Any printing is ${price}.`,
  aria: {
    priced: (s: Store, figure: string, when: string) =>
      s.figure === "market" ? `${figure}, ${s.name} market price, last checked ${when}` : `${figure} at ${s.name}, last checked ${when}`,
  },
} as const;
