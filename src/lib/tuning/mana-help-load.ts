import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCutItems, deckSuggestionItems, deckSuggestionRuns } from "../../db/schema";
import { readCutSupport } from "../decks/cuts-read";
import { loadDeckMix } from "../decks/deck-mix";
import { roleBasisFromEnv } from "../decks/label-counts-flag";
import { liveLockedIds } from "../decks/locks";
import type { DeckDetail } from "../decks/read";
import type { BalanceColor } from "./mana-balance";
import { loadManaInputs } from "./mana-balance-load";
import { helpAddColor, type BasicCatalog, type ManaHelp } from "./mana-help";
import { loadManaStaples } from "./mana-staples";

const BASIC_NAMES: Record<BalanceColor, string> = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };

/**
 * The cuts the deck's own tuning named that the player has not ruled on: the newest ok Proposed cuts run's,
 * then the newest ok Suggested changes run's, each in its own order. The runs the two panels draw (each
 * shows its newest ok run), read without the panels' reap, so a help read never writes.
 */
async function readNamedCuts(deckId: string, userId: string): Promise<string[]> {
  const newestOk = (tool: "proposed_cuts" | "suggested_changes") => db.select({ id: deckSuggestionRuns.id }).from(deckSuggestionRuns)
    .where(and(eq(deckSuggestionRuns.deckId, deckId), eq(deckSuggestionRuns.userId, userId), eq(deckSuggestionRuns.tool, tool), eq(deckSuggestionRuns.status, "ok")))
    .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1);
  const [[cutsRun], [changesRun]] = await Promise.all([newestOk("proposed_cuts"), newestOk("suggested_changes")]);
  const [cuts, changes] = await Promise.all([
    cutsRun
      ? db.select({ id: deckCutItems.cutOracleId }).from(deckCutItems)
        .where(and(eq(deckCutItems.runId, cutsRun.id), eq(deckCutItems.verdict, "pending"))).orderBy(deckCutItems.position)
      : [],
    changesRun
      ? db.select({ id: deckSuggestionItems.cutOracleId }).from(deckSuggestionItems)
        .where(and(eq(deckSuggestionItems.runId, changesRun.id), eq(deckSuggestionItems.verdict, "pending"))).orderBy(deckSuggestionItems.position)
      : [],
  ]);
  return [...cuts, ...changes].flatMap((r) => (r.id ? [r.id] : []));
}

/** "Help me add <color>" for a deck: the moves that survive a simulated recount, and the staples behind
 *  them. Null when a text read or the basics failed. Asked for by the player, never run unprompted. */
export async function loadManaHelp(
  deck: DeckDetail,
  userId: string,
  color: BalanceColor,
  /** The reader's resolved switches (`requestSwitchEnv`): the basis the mix's targets come from. An eval
   *  script, outside a request, passes `process.env` itself. */
  env: NodeJS.ProcessEnv,
): Promise<ManaHelp | null> {
  const inputs = await loadManaInputs(deck);
  if (!inputs) return null;
  const found = await db.select({ id: cards.oracleId, name: cards.name }).from(cards).where(inArray(cards.name, Object.values(BASIC_NAMES)));
  const entries = (Object.entries(BASIC_NAMES) as [BalanceColor, string][]).map(([c, name]) => [c, found.find((f) => f.name === name)] as const);
  if (entries.some(([, b]) => !b)) return null;
  const basics = Object.fromEntries(entries) as BasicCatalog;
  const [locked, candidates, namedCuts, support, mix] = await Promise.all([
    liveLockedIds(db, deck.id),
    loadManaStaples(deck, userId, env),
    readNamedCuts(deck.id, userId),
    // The rarest off-plan land goes first; with no list every one reads 0 and they go by name.
    readCutSupport(deck.commander.oracleId, deck.partner?.oracleId ?? null).catch(() => null),
    loadDeckMix(deck.id, userId, roleBasisFromEnv(env)),
  ]);
  if (!candidates) return null;
  const identity = [deck.commander, ...(deck.partner ? [deck.partner] : [])].flatMap((c) => c.colorIdentity);
  return helpAddColor(inputs.rows, inputs.nameOf, locked, basics, candidates, color, identity, {
    namedCuts,
    landText: inputs.landText,
    inclusion: support?.inclusion ?? null,
    landTarget: mix.cells.land.target,
  });
}
