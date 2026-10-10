import { isLandFace } from "../cards/facet";
import type { BenchCard } from "./types";

/** The 99 (or 98 beside a partner): every card that is not in the command zone. */
export function body(cards: readonly BenchCard[]): BenchCard[] {
  return cards.filter((c) => !c.commander);
}

export function isLand(c: BenchCard): boolean {
  return isLandFace(c.typeLine);
}

/** The front face's types, so an MDFC whose back is a land still reads as the spell. */
export function frontType(c: BenchCard): string {
  return c.typeLine.split("//")[0];
}

export function copies(cards: readonly BenchCard[]): number {
  return cards.reduce((n, c) => n + c.quantity, 0);
}
