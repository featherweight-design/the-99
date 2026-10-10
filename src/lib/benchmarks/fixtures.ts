import type { Job } from "../labels/types";
import type { BenchCard, BenchLine } from "./types";

/** A test card: a 2-mana sorcery with no jobs unless told otherwise. */
export function card(name: string, over: Partial<BenchCard> = {}): BenchCard {
  return {
    oracleId: `id-${name}`, name, quantity: 1, commander: false, typeLine: "Sorcery", manaValue: 2,
    manaCost: null, colorIdentity: [], oracleText: null, keywords: [], jobs: [], ...over,
  };
}

export function land(name: string, over: Partial<BenchCard> = {}): BenchCard {
  return card(name, { typeLine: "Basic Land — Forest", manaValue: 0, ...over });
}

/** A job with every limit at its "does not apply" value. */
export function job(over: Partial<Job> & Pick<Job, "kind">): Job {
  const space = ["ramp", "draw", "removal", "wipes", "land", "tutor", "counterspell"].includes(over.kind) ? "role" : "theme";
  return {
    space, restrictedTo: null, affects: "self", trigger: "none", recurrence: "oneShot", threshold: null,
    modal: false, to: null, method: null, ...(space === "role" && over.kind === "ramp" ? { rampKind: "tapsForMana" } : {}), ...over,
  } as Job;
}

export function line(variantId: string, pieces: readonly BenchCard[]): BenchLine {
  return {
    variantId, cards: pieces.map((p) => ({ oracleId: p.oracleId, name: p.name })), produces: ["Infinite mana"],
    mana: { kind: "free" }, steps: [], prerequisites: null, pieceIds: pieces.map((p) => p.oracleId),
  };
}

/** Pads a list to a 99-card body with basics, so the turn-8 window draws from a whole deck. */
export function padded(cards: readonly BenchCard[]): BenchCard[] {
  const used = cards.filter((c) => !c.commander).reduce((n, c) => n + c.quantity, 0);
  return [...cards, land("Forest", { quantity: Math.max(0, 99 - used) })];
}
