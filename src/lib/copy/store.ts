// Store choice (design #3200, `design_handoff_the99_store_choice/copy strings.ts`). Every string that names a store
// takes its StoreInfo, never a literal, so a new store needs no copy change beyond its own entry.
import type { StoreInfo } from "../stores/info";

export const storeCopy = {
  // ── Provenance (the strip's line 2, the cart's checkout box) ─────────
  provenance: (s: StoreInfo) => (s.figure === "market" ? `${s.name} market prices` : `single-copy prices on ${s.name}`),
  provenanceUnpriced: (s: StoreInfo) => `no prices from ${s.name} for these`,
  /** The accuracy note, short form: after the provenance on a market store, only beside a figure. */
  marketNote: "averages of recent sales, so a listing can differ",

  // ── No whole-list link (call 6): the strip and the all-decks cart ────
  noCart: (s: StoreInfo) =>
    s.paste
      ? `${s.name} has no link for a whole list. Copy it, then paste it into ${s.name}’s ${s.paste.name}.`
      : `${s.name} has no link for a whole list. Buy each card from its details.`,
  copyList: "Copy the list",
  /** The swapped label and the role=status announcement. */
  copied: "Copied",
  copyFailed: "Couldn’t copy. Try again.",
  copyAria: (n: number) => `Copy the list, ${n} ${n === 1 ? "card" : "cards"}`,
  /** An ExternalLink, so it draws the link-out icon and the new-tab suffix. */
  openPaste: (s: StoreInfo) => `Open ${s.paste?.name ?? s.name}`,

  // ── The deck's Stats money card ──────────────────────────────────────
  noPriceOne: (s: StoreInfo) => `no price from ${s.name} for this one`,
  noPriceMany: (s: StoreInfo) => `no price from ${s.name} for these`,
  /** A deck's or the collection's value caption: `Mana Pool prices, 2h ago` or `TCGplayer market prices, 2h ago`. */
  deckCost: (s: StoreInfo, age: string) => (s.figure === "market" ? `${s.name} market prices, ${age}` : `${s.name} prices, ${age}`),
  moneyCaption: (s: StoreInfo) => `One square per card, owned first. Prices from ${s.name}. Basics are never priced or counted to buy.`,

  // ── Card details, tokens, the wishlist box and Home's price drop (UI-2) ─
  /** Card details' link when the store has a figure for the card. */
  linkOut: (s: StoreInfo) => `Buy any printing at ${s.name}`,
  /** A wishlist line that names a printing reads it on the link. */
  linkOutPrinting: (s: StoreInfo, set: string, n: string) => `Buy ${set} ${n} at ${s.name}`,
  /** The link with no figure from the store: a search, not a claim the store sells it. */
  lookFor: (s: StoreInfo) => `Look for it at ${s.name}`,
  tokenLinkOut: (s: StoreInfo) => `Buy this token at ${s.name}`,
  /** Beside card details' tag, market stores only; its spoken form rides the tag's sentence (`aria.priced`). */
  marketTag: "market price",
  /** Card details' `from $x`, spoken. */
  cheapestAria: (s: StoreInfo, figure: string) => `cheapest non-foil printing of this card is ${figure} at ${s.name}`,
  feedBuy: (s: StoreInfo) => `Buy at ${s.name}`,
  soldOutNote: (s: StoreInfo, price: string) => `${s.name} has none now. Any printing is ${price}.`,
  /** The tag's accessible name with no figure. Mana Pool keeps its three histories; a store whose rows carry no history says one. */
  noStockAria: (s: StoreInfo, state: "neverStocked" | "soldOut" | "noFigure") =>
    state === "soldOut" ? `Sold out at ${s.name}`
      : state === "neverStocked" && s.id === "manapool" ? `Never stocked at ${s.name}`
        : `No price from ${s.name}`,
  aria: {
    priced: (s: StoreInfo, figure: string, when: string) =>
      s.figure === "market" ? `${figure}, ${s.name} market price, last checked ${when}` : `${figure} at ${s.name}, last checked ${when}`,
    pricedBehind: (s: StoreInfo, figure: string, when: string) =>
      `${storeCopy.aria.priced(s, figure, when)}, these prices are behind`,
  },
} as const;
