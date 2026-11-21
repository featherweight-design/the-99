import { readAllowance } from "../model/allowance";
import type { Allowance } from "../model/allowance-rule";
import { withPayments } from "../payments/flag";
import { guidedStrategies, type GuidedStrategy } from "./inputs";

/**
 * What the Guided sheet shows before any deck exists (SERVER-ONLY): the strategies the commander's themes back with cards the
 * reader can use, and the reader's credit standing for the run (`guided_build`'s own window, `payments` stamped from their switches).
 * The strategies come from `guidedStrategies`, the same function `beginGuided` re-derives them with on the free fill, so a strategy
 * offered here is one the start accepts.
 */
export type GuidedOffer = { strategies: GuidedStrategy[]; allowance: Allowance & { payments: boolean } };

export async function loadGuidedOffer(userId: string, commanderIds: string[], env: NodeJS.ProcessEnv, now: Date = new Date()): Promise<GuidedOffer> {
  const [strategies, allowance] = await Promise.all([
    guidedStrategies(userId, commanderIds, []),
    readAllowance(userId, now, "guided_build").then((a) => withPayments(a, env)),
  ]);
  return { strategies, allowance };
}
