import { cardTypeGroup, type CardTypeGroup } from "../../decks/grouping";
import type { JobRowsByCard } from "../../decks/job-tally";
import { roleCounterFor } from "../../decks/label-role-counts";
import { ROLE_ORDER, type MixRole } from "../../decks/mix";
import { classifyRoles } from "../../recs/roles";

/**
 * A v2 line's type and shelf role (handoff H5, G2), pure: the type from the shipped grouping (`cardTypeGroup`), and the
 * role from the deck page's own counter (`roleCounterFor`) over the card alone, so a line names the shelf the strip
 * would count it in: by its label when the label read has it, else the classifier's (one rule, 2026-10-10). The first
 * role in the strip's order wins; null for a card that fills none of the five.
 */
export function lineFacts(
  card: { oracleId: string; name: string; typeLine: string; oracleText: string | null; keywords: string[] },
  byCard: JobRowsByCard | null,
): { typeGroup: CardTypeGroup; role: MixRole | null } {
  const classified = classifyRoles(card)[0] ?? "other";
  const counts = roleCounterFor(byCard)([{ oracleId: card.oracleId, name: card.name, quantity: 1, role: classified }]);
  return { typeGroup: cardTypeGroup(card.typeLine), role: ROLE_ORDER.find((r) => counts[r] > 0) ?? null };
}
