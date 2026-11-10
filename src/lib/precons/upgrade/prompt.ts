import { z } from "zod";

import { CARD_CAP_CENTS, CARD_PREFER_CENTS, MAX_SWAPS, MIN_SWAPS, POOL_MAX, TARGET_BRACKET } from "./constants";
import type { UpgradeDrop, UpgradePair } from "./validate";

/**
 * The upgrade's prompt (research 2026-11-10, measured: one call, about 16.4k tokens in). Builds text from catalog facts and
 * the player's PICK (a strategy the app offered, so no player-typed text reaches it: nothing goes through `playerText`).
 * It names no player. Plain data in, `{ system, user }` out.
 */

export type PromptCard = { name: string; manaCost: string | null; typeLine: string; roles: string; cents: number | null; oracle: string; isCommander: boolean; basic: boolean; qty: number };
export type PoolCard = { oracleId: string; name: string; manaCost: string | null; typeLine: string; roles: string; cents: number | null; inclusion: number | null; oracle: string };

export type UpgradeInput = {
  /** The catalog precon's name, never a player-chosen deck name: nothing player-typed may reach this prompt. */
  deckName: string;
  deck: readonly PromptCard[];
  pool: readonly PoolCard[];
  /** The strategy the player picked: its label, its plain sentence and the deck's own cards that back it. */
  strategy: { label: string; blurb: string; backingNames: readonly string[] };
  /** The other offered strategies' labels: the themes whose cards are the cuts. */
  otherThemes: readonly string[];
  /** The bracket the list reads as today, from the app's own read; null when none. */
  bracketBefore: number | null;
};

/** The reply: pairs with a reason each. The bracket and every total are computed in code, never asked for. */
export const upgradeReplySchema = z.object({
  swaps: z.array(z.object({
    out: z.string().min(1).max(200),
    in: z.string().min(1).max(200),
    reason: z.string().min(1).max(240),
  })).max(MAX_SWAPS + 12),
});
export type UpgradeReply = z.infer<typeof upgradeReplySchema>;

/** The pool that is sent: not already in the deck, priced at or under the cap, most-included first, at most `POOL_MAX`. An unpriced card cannot be checked against the cap, so it is left out. */
export function poolForPrompt(pool: readonly PoolCard[], deckIds: ReadonlySet<string>): PoolCard[] {
  return pool
    .filter((p) => !deckIds.has(p.oracleId) && p.cents !== null && p.cents <= CARD_CAP_CENTS)
    .sort((a, b) => (b.inclusion ?? -1) - (a.inclusion ?? -1) || a.name.localeCompare(b.name))
    .slice(0, POOL_MAX);
}

const money = (c: number | null) => (c === null ? "n/a" : `$${(c / 100).toFixed(2)}`);

export const UPGRADE_SYSTEM = `You upgrade Magic: The Gathering Commander precon decks. You are given a 100-card precon list with what each card does, the strategy the player chose, and a pool of candidate replacement cards.

Rules:
- Each swap is one card OUT of the deck and one card IN from the candidate pool. Make between ${MIN_SWAPS} and ${MAX_SWAPS} swaps.
- "out" must be a card in the current deck list, never the commander and never a basic land. "in" must be a card from the candidate pool and not already in the deck. Use exact names. Never cut or add the same card twice.
- Commit to the chosen strategy. Cut cards that serve the other themes, plus weak, off-plan or redundant cards, and replace them with cards that serve the chosen strategy. Keep a card that serves both.
- No added card may cost more than ${money(CARD_CAP_CENTS)}; prefer cards at ${money(CARD_PREFER_CENTS)} or less. Use the price shown in the pool.
- Aim to move the deck to Commander bracket ${TARGET_BRACKET} or higher: better ramp, interaction, card advantage and a faster plan, without a game-changing infinite.
- Give each swap one short reason (at most 25 words) naming what the new card does for the chosen strategy.
- Reply with one JSON object and nothing else, no code fence.`;

const SHAPE = `{"swaps": [{"out": "<exact deck card name>", "in": "<exact pool card name>", "reason": "<short reason>"}]}`;

function deckBlock(deck: readonly PromptCard[]): string {
  const lines: string[] = [`Commander: ${deck.filter((d) => d.isCommander).map((c) => c.name).join(" + ")}`];
  for (const d of deck.filter((c) => !c.isCommander && !c.basic)) {
    lines.push([`${d.qty > 1 ? `${d.qty}x ` : ""}${d.name}`, d.manaCost ?? "", d.typeLine, d.roles ? `roles: ${d.roles}` : "", money(d.cents), d.oracle].filter((s) => s !== "").join(" | "));
  }
  const basics = deck.filter((c) => c.basic && !c.isCommander);
  if (basics.length) lines.push(`Basic lands: ${basics.map((b) => `${b.qty}x ${b.name}`).join(", ")}`);
  return lines.join("\n");
}

function poolBlock(pool: readonly PoolCard[]): string {
  return pool.map((p) => [p.name, p.manaCost ?? "", p.typeLine, p.roles ? `roles: ${p.roles}` : "", money(p.cents), `EDHREC inclusion ${p.inclusion ?? "n/a"}%`, p.oracle].filter((s) => s !== "").join(" | ")).join("\n");
}

function head(i: UpgradeInput): string {
  const bracket = i.bracketBefore === null ? "" : ` The list reads as bracket ${i.bracketBefore} today.`;
  const others = i.otherThemes.length ? ` Cut the cards that serve: ${i.otherThemes.join(", ")}.` : "";
  return `Deck: ${i.deckName}. Cards in list: ${i.deck.reduce((n, d) => n + d.qty, 0)}.${bracket}

CHOSEN STRATEGY: ${i.strategy.label}. ${i.strategy.blurb}
Deck cards that already serve it: ${i.strategy.backingNames.join("; ")}.${others}

CURRENT DECK
${deckBlock(i.deck)}

CANDIDATE POOL (not in the deck; name | cost | type | roles | price | EDHREC inclusion | rules text)
${poolBlock(i.pool)}`;
}

export function buildUpgradePrompt(i: UpgradeInput): { system: string; user: string } {
  return { system: UPGRADE_SYSTEM, user: `${head(i)}\n\nChoose the swaps. Reply with this JSON shape:\n${SHAPE}` };
}

const REASON: Record<UpgradeDrop["rule"], string> = {
  cutNotInDeck: "is not in the deck",
  cutCommander: "is the commander",
  cutBasic: "is a basic land",
  duplicateCut: "was cut twice",
  addNotInPool: "is not in the candidate pool",
  addInDeck: "is already in the deck",
  duplicateAdd: "was added twice",
  overCard: `costs more than ${money(CARD_CAP_CENTS)}`,
  unpriced: "has no price",
};

/**
 * The one repair call (Hugh, 2026-11-10: "repairs or retries"): the same deck and pool, the pairs already accepted, each
 * rejected line with its reason, and a request for ONLY the missing swaps. `want` is how many more to reach `MIN_SWAPS`;
 * the room left under `MAX_SWAPS` is stated so a repair cannot overshoot.
 */
export function buildRepairPrompt(i: UpgradeInput, kept: readonly UpgradePair[], drops: readonly UpgradeDrop[]): { system: string; user: string } {
  const room = MAX_SWAPS - kept.length;
  const want = Math.max(1, Math.min(room, MIN_SWAPS - kept.length));
  const accepted = kept.map((p) => `- OUT ${p.cut} / IN ${p.add}`).join("\n");
  const rejected = drops.map((d) => `- "${d.name}" ${REASON[d.rule]}`).join("\n");
  return {
    system: UPGRADE_SYSTEM,
    user: `${head(i)}

SWAPS ALREADY ACCEPTED (do not repeat any card in them)
${accepted || "(none)"}

REJECTED LINES (do not repeat these)
${rejected || "(none)"}

Give ${want} to ${room} more swaps, each a different card out and a different card in from the pool. Reply with this JSON shape:
${SHAPE}`,
  };
}
