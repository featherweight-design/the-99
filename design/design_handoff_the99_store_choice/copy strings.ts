// Store choice R1 (account 1, 2026-11-22). DRAFT for /copy-review. US English, no em dashes.
// Proposed home: src/lib/copy/store.ts, beside src/lib/store/stores.ts (the store list, below). Every string that names a
// store takes the Store, never a literal, so a fourth store needs no copy change beyond its Settings row line.
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
  noCart: (s: Store) =>
    s.paste
      ? `${s.name} has no link for a whole list. Copy it, then paste it into ${s.name}’s ${s.paste}.`
      : `${s.name} has no link for a whole list. Buy each card from its details.`,
  /** Q3: the presses in the link's 44px row. Copies `1 Name` lines of the shown selection; swaps to Copied for 1.5s. */
  copyList: "Copy the list",
  copied: "Copied", // also the role=status announcement
  copyAria: (n: number) => `Copy the list, ${n} ${n === 1 ? "card" : "cards"}`,
  openPaste: (s: Store) => `Open ${s.paste}`, // ExternalLink, so it gets the link-out icon and the new-tab suffix

  // ── First run (onboarding, Q1): an unnumbered checklist row ──────────
  firstRun: {
    title: "Where do you buy cards?",
    line: "Prices and buy links come from this store. Change it any time in Settings.",
    // the switch's group label is `groupLabel`; its segments are the store names
  },

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

// ── The store list (proposed src/lib/store/stores.ts) ─────────────────
// export type StoreId = "manapool" | "tcgplayer" | "cardkingdom";
// export type Store = { id: StoreId; name: string; figure: "listing" | "market"; cart: boolean; paste?: string };  // paste: the store’s own paste-a-list page (Q3)
// export const STORES = [
//   { id: "manapool", name: "Mana Pool", figure: "listing", cart: true },
//   { id: "tcgplayer", name: "TCGplayer", figure: "market", cart: false, paste: "Mass Entry" },
//   { id: "cardkingdom", name: "Card Kingdom", figure: "listing", cart: false, paste: "Deck Builder" },
// ];
// export const DEFAULT_STORE: StoreId = "manapool";

// ── Shipped strings that name Mana Pool, and their store form ─────────
// Each becomes a function of the reader's Store. {s} = store.name. Unlisted Mana Pool mentions are credits, not prices.
//
// price.ts        strip.provenance              "single-copy prices on Mana Pool"      → storeCopy.provenance(s) (market: "{s} market prices")
//                 strip.provenanceUnpriced      "no prices from Mana Pool for these"   → storeCopy.provenanceUnpriced(s)
//                 strip.cartNote                (unchanged words; drawn only where s.cart)
//                 cheapest.aria                 "… is {figure} at Mana Pool"           → "… is {figure} at {s}"
//                 aria.priced / pricedBehind    "{figure} at Mana Pool, last checked …"→ storeCopy.aria.priced (market: "{figure}, {s} market price, …")
// decks-builder   exportLinkOutCopy.shopping    "Buy these at Mana Pool"               → "Buy these at {s}" (drawn only where s.cart)
// all-decks-cart  checkout.sends                "Opens Mana Pool with N lines, …"      → "Opens {s} with N lines, …" (only where s.cart)
//                 back.title                    "Back from Mana Pool?"                 → "Back from {s}?" (only where s.cart)
// collection-browse cardLinkOutCopy.card        "Buy any printing at Mana Pool"        → storeCopy.linkOut(s); no figure: storeCopy.lookFor(s)
//                 cardLinkOutCopy.token         "Buy this token at Mana Pool"          → "Buy this token at {s}" (READINESS: token prices per store)
// wishlist.ts     linkOut                       "Buy {set} {n} at Mana Pool"           → storeCopy.linkOutPrinting(s, set, n)
//                 box.soldOutNote               "Mana Pool has none now. …"            → storeCopy.soldOutNote(s, price)
// feed.ts         press.priceDrop               "Buy at Mana Pool"                     → storeCopy.feedBuy(s)
// decks-stats.ts  worth.caption                 "Mana Pool prices, 2h ago"             → storeCopy.deckCost(s, age)
//                 collection caption            "… · Mana Pool prices, {age}"          → "… · " + storeCopy.deckCost(s, age)
// deck-stats.ts   noPriceOne / noPriceMany      "no price from Mana Pool for this one/these" → "no price from {s} for …"
//                 caption                       "… Prices from Mana Pool. …"           → "… Prices from {s}. …"
// collection-price priced / mixed               "{figure} at Mana Pool[, …]"           → "{figure} at {s}[, …]"
// commander-discovery aria / notStockedAria     "…, in stock at Mana Pool" / "Mana Pool has none in stock" → "{s}"
// mana-balance    buyLink / buyAria             "Mana Pool" / "Buy {name} at Mana Pool, …" → "{s}" / "Buy {name} at {s}, …"
// swap-tools      foot                          "Cheapest printing of each, from Mana Pool · …" → "… from {s} · …"
// set-collections cellPrice.*, noStockAria      "Never stocked / Sold out at / No price from Mana Pool" → "{s}"
//                 send / sendCapped / its arias "Send N to Mana Pool", Mass Entry       → drawn only where s.cart (a whole-list link)
//                 price figure note             "N have no price from Mana Pool …"     → "{s}"
// proxies.ts      noStockAria                   "Never stocked at Mana Pool"           → "{s}"
// deck-versioning linkOut                       "Open in Mana Pool"                    → "Open in {s}" (only where s.cart: it is a whole-list link)
// tokens.ts       Mana Pool lines               token prices and lines are Mana Pool's own product ids: see READINESS G5
// push.ts         priceDrop body                unchanged words (no store named); the alert's figures are the store's
//
// Credits, not prices (READINESS G7): fan-content-notice.ts ("prices from Mana Pool", "Not affiliated with … Mana Pool"),
// landing.ts ("Prices from Mana Pool"), about-pages.ts (prices lines), legal/privacy.ts. These name every store the app
// can quote, or "the store you pick"; /copy-review words them.
