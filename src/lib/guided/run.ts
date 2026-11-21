import { revalidateClaims } from "../decks/revalidate-claims";
import { callModel } from "../model/client";
import type { Billed } from "../model/allowance";
import { UPGRADE_INPUT_CEILING_TOKENS, UPGRADE_MODEL } from "../precons/upgrade/constants";
import { runUpgrade, type UpgradeCallModel } from "../precons/upgrade/engine";
import { holdBracket, isBracketTarget, shortfall, type BracketTarget } from "../precons/upgrade/hold";
import { buildUpgradePrompt, upgradeReplySchema, type UpgradeInput } from "../precons/upgrade/prompt";
import {
  bracketOf, bracketsOf, lineBrackets, lineBracketsOrNone, partnersOrBare, type BracketList,
} from "../precons/upgrade/run";
import { readSwapPartners } from "../precons/upgrade/swap-partners";
import type { StoredPair } from "../precons/upgrade/validate";
import { POOL_MODES, type PoolMode } from "./constants";
import { guidedStrategies, loadGuidedDeck, loadGuidedPool } from "./inputs";
import { overviewAfterGuidedRun } from "./overview";
import { finishGuided, reapGuided, startGuided, type GuidedHandle } from "./store";

/**
 * Guided build's run: Upgrade this precon's engine over the new deck's free fill (READINESS G2). SERVER-ONLY. The actions
 * (`actions.ts`, `createDeck`) re-apply the switch and the session, then call `beginGuided`. The credits are reserved with the
 * pending row before any model call (`startGuided`); the run itself is `handle.run()`, which the caller runs in `after()`, so the
 * response is not held for the model. No player free text reaches the prompt: every field is a catalog name or a bounded number.
 */

/** The player's picks, as the client sends them: untrusted until `beginGuided` has checked each. */
export type GuidedPicks = {
  strategyKey: string;
  bracket: number;
  poolMode: string;
  /** Total budget in cents, for the `budget` mode only. */
  budgetCents: number | null;
  /** Oracle ids the player kept (G5). */
  kept: readonly string[];
};

/** A deck holds 99 cards: more kept ids than that is not a deck's list. */
const KEPT_MAX = 99;
export const BUDGET_MIN_CENTS = 100;
export const BUDGET_MAX_CENTS = 500_000;
const isPoolMode = (v: unknown): v is PoolMode => POOL_MODES.some((m) => m === v);

export type GuidedBegin =
  | { ok: true; handle: GuidedHandle; run: () => Promise<void> }
  | { ok: false; reason: "notFound" | "notOffered" | "noPool" | "tooBig" | "current" | "inFlight" | "allowance" | "ownerShare" | "paused" };

export type GuidedDeps = { call: UpgradeCallModel; now: () => Date; env: NodeJS.ProcessEnv };

const liveCall: UpgradeCallModel = (req) =>
  callModel({ model: UPGRADE_MODEL, system: req.system, user: req.user, maxTokens: req.maxTokens, schema: upgradeReplySchema, deadlineMs: req.deadlineMs });

export async function beginGuided(userId: string, deckId: string, picks: GuidedPicks, env: NodeJS.ProcessEnv, deps?: Partial<GuidedDeps>): Promise<GuidedBegin> {
  // A wire argument whatever its type says: a crafted shape is refused, never thrown on, and the kept list is bounded.
  if (typeof picks !== "object" || picks === null || typeof picks.strategyKey !== "string" || !Array.isArray(picks.kept) || picks.kept.length > KEPT_MAX || !picks.kept.every((k) => typeof k === "string")) return { ok: false, reason: "notOffered" };
  const call = deps?.call ?? liveCall;
  const now = deps?.now?.() ?? new Date();
  await reapGuided(userId, deckId, now);
  const deck = await loadGuidedDeck(userId, deckId);
  if (!deck) return { ok: false, reason: "notFound" };
  const strategies = await guidedStrategies(deck);
  const pick = strategies.find((s) => s.key === picks.strategyKey);
  if (!pick || !isBracketTarget(picks.bracket) || !isPoolMode(picks.poolMode)) return { ok: false, reason: "notOffered" };
  const bracket: BracketTarget = picks.bracket;
  const budgetCents = picks.poolMode === "budget" ? picks.budgetCents : null;
  if (picks.poolMode === "budget" && (!Number.isInteger(budgetCents) || budgetCents! < BUDGET_MIN_CENTS || budgetCents! > BUDGET_MAX_CENTS)) return { ok: false, reason: "notOffered" };
  // Kept cards are cards of this deck: anything else is dropped, never trusted. A commander is never cut, so it needs no keeping.
  const inDeck = new Set(deck.lines.filter((l) => !l.isCommander).map((l) => l.oracleId));
  const kept = [...new Set(picks.kept)].filter((id) => inDeck.has(id));
  const list: BracketList = { commanderIds: deck.commanderIds, cards: deck.lines.map((l) => ({ oracleId: l.oracleId, quantity: l.quantity, isCommander: l.isCommander })) };
  // "Before" is the free fill as placed; a pick below it is not offered, as Upgrade's.
  const bracketBefore = await bracketOf(list, []);
  if (bracketBefore !== null && bracket < bracketBefore) return { ok: false, reason: "notOffered" };
  const { deck: made, pool } = await loadGuidedPool(userId, deck, bracket, picks.poolMode);
  // A pool-less run would pay for calls that can only come back empty.
  if (pool.entries.length === 0) return { ok: false, reason: "noPool" };

  const keptNames = deck.lines.filter((l) => kept.includes(l.oracleId)).map((l) => l.name);
  const input: UpgradeInput = {
    deckName: deck.deckName, deck: made.prompt, pool: pool.prompt,
    strategy: { label: pick.label, blurb: pick.blurb, backingNames: pick.backing.map((b) => b.name) },
    otherThemes: strategies.filter((s) => s.key !== pick.key).map((s) => s.label),
    bracketBefore, bracketTarget: bracket, keptNames, budgetCents,
  };
  const prompt = buildUpgradePrompt(input);
  if (Math.ceil((prompt.system.length + prompt.user.length) / 3) > UPGRADE_INPUT_CEILING_TOKENS) return { ok: false, reason: "tooBig" };

  const started = await startGuided(userId, deckId, {
    strategy: { key: pick.key, label: pick.label }, bracketTarget: bracket, poolMode: picks.poolMode,
    poolCapCents: picks.poolMode === "cap" ? pool.entries.reduce((m, e) => Math.max(m, e.cents ?? 0), 0) : null, budgetCents, kept,
  }, UPGRADE_MODEL, now);
  if (started.kind === "in_flight") return { ok: false, reason: "inFlight" };
  if (started.kind !== "started") return { ok: false, reason: started.kind };
  const handle: GuidedHandle = { runId: started.runId, callId: started.callId };

  const run = async (): Promise<void> => {
    const billed: Billed[] = [];
    const bill = () => (billed.length > 0 ? billed : undefined);
    const callBilled: UpgradeCallModel = async (req) => {
      const out = await call(req);
      if (out.usage) billed.push({ model: UPGRADE_MODEL, usage: out.usage, step: req.stage, effort: null });
      return out;
    };
    try {
      const report = await runUpgrade({
        input, deck: made.entries, pool: pool.entries, callModel: callBilled,
        hold: (pairs) => holdBracket(pairs, bracket, (applied) => bracketsOf(list, applied)),
        reach: async (pairs) => shortfall(bracket, await bracketsOf(list, pairs)),
        kept: new Set(kept), budgetCents,
      });
      if (report.failed !== null && report.pairs.length === 0) {
        await finishGuided(handle, { status: "failed", errorClass: report.failed === "upstream_rejected" ? "upstream_busy" : report.failed }, bill(), new Date());
        return;
      }
      const [bracketAfter, partnered, lines] = await Promise.all([
        bracketOf(list, report.pairs), partnersOrBare(readSwapPartners, list, report.pairs), lineBracketsOrNone(lineBrackets, list, report.pairs),
      ]);
      const pairs = partnered.map((p): StoredPair => ({ ...p, ...lines.get(p.addId) }));
      const refunded = report.charge.outcome === "refunded";
      const written = await finishGuided(handle, {
        status: "done", pairs, drops: report.drops, buyTotalCents: report.buyTotalCents, bracketBefore, bracketAfter,
        calls: report.calls, refunded, errorClass: report.failed ?? undefined,
      }, bill(), new Date());
      // The Overview rides the credits the run kept: a refunded run writes none, and a superseded one (reaped) neither.
      // The swaps landed after the start's revalidation: the deck and its lists are stale until this one.
      if (written) revalidateClaims(deckId, userId);
      if (written && !refunded) await overviewAfterGuidedRun(handle.runId, deckId, userId, deps?.env ?? env);
    } catch (err) {
      await finishGuided(handle, { status: "failed", errorClass: "upstream_busy" }, bill(), new Date()).catch(() => false);
      console.warn("guided run failed", err);
    }
  };
  return { ok: true, handle, run };
}
