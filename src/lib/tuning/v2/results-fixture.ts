import type { LineItem } from "../state";

/** Tests only: a v2 line with every field a results test does not care about filled in. */
export function v2Line(id: string, side: "add" | "cut", extra: Partial<LineItem> = {}): LineItem {
  return {
    side,
    id,
    cardOracleId: `o-${id}`,
    cardName: `Card ${id}`,
    cardTypeLine: side === "add" ? "Instant" : "",
    cardImageUri: null,
    rationale: `Why ${id}.`,
    rationaleShort: "",
    evidence: [],
    position: 0,
    verdict: "pending",
    owned: true,
    ownedQuantity: 1,
    availability: null,
    price: null,
    bracketAfter: null,
    applies: true,
    inDeck: side === "cut",
    locked: false,
    typeGroup: "Instants",
    role: "removal",
    picked: false,
    applySet: null,
    ...extra,
  };
}
