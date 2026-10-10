import { classifyRoles } from "../recs/roles";
import type { Job } from "../labels/types";

/** A sentence that draws: `classifyRoles`' own draw pattern, read per sentence. */
const DRAW_SENTENCE = /[^.\n]*\bdraw (?:a|one|two|three|four|x) cards?\b[^.\n]*/gi;
/** A drawer other than the controller. */
const OTHER_DRAWER = /\b(?:opponents?|target player|each player|that player|its (?:controller|owner))\b/i;

/** A clause that counters a spell, up to the next mode or sentence: the one text reading that is
 *  interaction and never removal. */
const COUNTER_CLAUSE = /\bcounter target\b[^.;\n]*/gi;

/**
 * The jobs a card's rules text gives, for a card with no fresh label. `classifyRoles` reads roles
 * only, so every field it cannot see is fixed here (brief, "Which label readings can be trusted"):
 *
 * - a draw is a one-shot draw for the controller, and counts only when a sentence that draws names
 *   no other player ("Target opponent may draw a card" is the opponent's draw, not the deck's);
 * - ramp carries no `rampKind`, so it is weighed by mana value alone;
 * - "counter target" is a `counterspell`. `classifyRoles` keeps counterspells in removal for its own
 *   callers, deliberately; here a card is removal only when its text still reads as removal with
 *   every countering clause taken out (Hugh, 2026-10-10).
 *
 * Theme jobs have no text reading and are absent. `land` is never returned: a land is read by type.
 */
export function jobsFromText(card: { typeLine: string; oracleText: string | null; keywords: readonly string[] }): Job[] {
  const roles = classifyRoles({ ...card, keywords: [...card.keywords] });
  const text = card.oracleText ?? "";
  const counters = /\bcounter target\b/i.test(text);
  const removal = roles.includes("removal")
    && (!counters || classifyRoles({ ...card, keywords: [...card.keywords], oracleText: text.replace(COUNTER_CLAUSE, "") }).includes("removal"));
  const jobs: Job[] = [];
  if (roles.includes("ramp")) jobs.push({ ...role("ramp", "self"), rampKind: null });
  if (roles.includes("draw") && (text.match(DRAW_SENTENCE) ?? []).some((s) => !OTHER_DRAWER.test(s))) jobs.push(role("draw", "self"));
  if (removal) jobs.push(role("removal", "opponents"));
  if (roles.includes("wipes")) jobs.push(role("wipes", "each"));
  if (counters) jobs.push(role("counterspell", "opponents"));
  return jobs;
}

function role<K extends "ramp" | "draw" | "removal" | "wipes" | "counterspell">(kind: K, affects: Job["affects"]) {
  return {
    space: "role" as const, kind, restrictedTo: null, affects, trigger: "none" as const,
    recurrence: "oneShot" as const, threshold: null, modal: false, to: null, method: null,
  };
}
