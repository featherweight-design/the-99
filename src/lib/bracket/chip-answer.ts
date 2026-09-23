import { declarationAsk } from "./declaration-ask";
import type { Bracket } from "./types";

/**
 * The answer a bracket chip outside the verdict block draws: the declaration when it answers the
 * range, otherwise none. The verdict block reads the same rule through `declarationAsk`, so no
 * chip holds a second copy of it.
 */
export function chipAnswer(permits: readonly Bracket[], declared: Bracket | null): Bracket | null {
  const read = declarationAsk(permits, declared);
  return read.kind === "answered" ? read.declared : null;
}
