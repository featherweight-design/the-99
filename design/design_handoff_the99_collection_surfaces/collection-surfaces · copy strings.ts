// Collection surfaces R1 — proposed strings for the copy pass (copy itself is out of scope).
// The shared tab strip on /collection, /collection/sets and /collection/proxies.

export const collectionTabsCopy = {
  /** The nav landmark's name. */
  regionAria: "Collection sections",
  cards: "Cards",
  sets: "Sets",
  /** Reuses proxyCopy.entryPoint.label; listed for completeness. */
  proxies: "Proxies",
} as const;

// The key's three availability entries reuse availabilityCopy.collection:
// filterSoft "Wanted by a draft", filterHard "In use", filterOver "Over-committed".
