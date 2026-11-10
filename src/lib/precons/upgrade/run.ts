import { callModel, type ModelOutcome } from "../../model/client";
import { readAllowance, type Billed } from "../../model/allowance";
import type { Allowance } from "../../model/allowance-rule";
import { withPayments } from "../../payments/flag";
import { slotDeck } from "../../bracket/slot";
import { swapped } from "../../decks/tuning-read";
import { loadDeckProfileFromHead, type ProfileHead } from "../../profile/load";
import { UPGRADE_INPUT_CEILING_TOKENS, UPGRADE_MODEL } from "./constants";
import { detectStrategies, type Strategy } from "./detect";
import { runUpgrade, type UpgradeCallModel } from "./engine";
import { lowestBracket } from "./inputs";
import { loadUpgradeInputs, type UpgradeLoad } from "./load";
import { buildUpgradePrompt, upgradeReplySchema, type UpgradeInput, type UpgradeReply } from "./prompt";
import { finishUpgrade, readUpgrades, reapUpgrades, startUpgrade, type StoredUpgrade } from "./store";
import type { UpgradePair } from "./validate";

/**
 * Upgrade this precon's read and press (research 2026-11-10). SERVER-ONLY. The actions (`actions.ts`) re-apply the switch and
 * the session, then call these. No model call outside `pressUpgrade`: `readUpgrade` detects the strategies from stored data.
 */

export type OfferedStrategy = Strategy & { backing: { oracleId: string; name: string }[] };

export type UpgradePanel = {
  /** The deck's own strategies, in the detector's order, each with the deck cards that back it. The player picks; none is preselected. */
  strategies: OfferedStrategy[];
  /** The newest pending run and the newest kept run per strategy: what the page shows again, free. */
  runs: StoredUpgrade[];
  allowance: Allowance;
};

export type UpgradePress =
  | { ok: true; panel: UpgradePanel; run: StoredUpgrade }
  | { ok: false; reason: "notFound" | "notOffered" | "tooBig" | "current" | "inFlight" | "allowance" | "ownerShare" | "paused" | "failed" | "short" };

type Deps = {
  load: (fileName: string, env: NodeJS.ProcessEnv) => Promise<UpgradeLoad | null>;
  call: (req: Parameters<UpgradeCallModel>[0]) => Promise<ModelOutcome<UpgradeReply>>;
  bracketOf: (load: UpgradeLoad, pairs: readonly UpgradePair[]) => Promise<number | null>;
  now: () => Date;
};

export const LIVE_DEPS: Deps = {
  load: loadUpgradeInputs,
  call: (req) => callModel({ model: UPGRADE_MODEL, system: req.system, user: req.user, maxTokens: req.maxTokens, schema: upgradeReplySchema, deadlineMs: req.deadlineMs }),
  bracketOf,
  now: () => new Date(),
};

/**
 * The lowest bracket the precon's list satisfies once the pairs are applied (none: as it stands), by the Analysis tab's own
 * verdict (`slotDeck` over `loadDeckProfileFromHead`), never read off the model. Null when the read fails: a figure the app
 * could not compute is left out, not guessed.
 */
async function bracketOf(load: UpgradeLoad, pairs: readonly UpgradePair[]): Promise<number | null> {
  try {
    const commanders = load.commanderIds;
    const list = load.deck.cards.filter((c) => !c.isCommander).map((c) => ({ oracleId: c.oracleId, quantity: c.quantity }));
    const head: ProfileHead = {
      deckId: "", userId: "", commanderOracleId: commanders[0], partnerOracleId: commanders[1] ?? null, declaredBracket: null, cards: list,
    };
    const after = pairs.reduce((cards, p) => swapped(cards, { cutOracleId: p.cutId, addOracleId: p.addId }), head.cards);
    const profile = await loadDeckProfileFromHead({ ...head, cards: after }, {} as NodeJS.ProcessEnv);
    return lowestBracket(slotDeck(profile).permits);
  } catch {
    return null;
  }
}

function offered(load: UpgradeLoad): OfferedStrategy[] {
  const names = new Map(load.deck.facts.map((f) => [f.oracleId, f.name]));
  return detectStrategies({ tags: load.tags, deck: load.deck.facts, overview: load.overview }).map((s) => ({
    ...s, backing: s.backingIds.map((id) => ({ oracleId: id, name: names.get(id) ?? "" })).filter((b) => b.name !== ""),
  }));
}

async function panelFor(userId: string, load: UpgradeLoad, now: Date, env: NodeJS.ProcessEnv): Promise<UpgradePanel> {
  const [runs, allowance] = await Promise.all([
    readUpgrades(userId, load.fileName),
    readAllowance(userId, now, "precon_upgrade").then((a) => withPayments(a, env)),
  ]);
  return { strategies: offered(load), runs, allowance };
}

/** The panel for one precon: free, never a call. Null when the precon is not found or has no commander. */
export async function readUpgrade(userId: string, fileName: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv): Promise<UpgradePanel | null> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const load = await deps.load(fileName, env);
  return load ? panelFor(userId, load, now, env) : null;
}

/**
 * A press on one offered strategy. Refused, costing nothing, when the precon is unknown, when the strategy is not one the deck
 * offers, when the prompt would pass the input ceiling, and when this strategy already has a kept result (`current`). A run in
 * flight is shown as it stands, never charged twice. Otherwise 2 credits are reserved, the engine asks the model (one call, one
 * repair at most), the bracket is computed from the post-swap list, and the outcome settles the credits: spent for a run that
 * reached the minimum swaps, refunded for a failed call or a short answer.
 */
export async function pressUpgrade(
  userId: string, fileName: string, strategyKey: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv,
): Promise<UpgradePress> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const load = await deps.load(fileName, env);
  if (!load) return { ok: false, reason: "notFound" };
  const all = offered(load);
  const pick = all.find((s) => s.key === strategyKey);
  if (!pick) return { ok: false, reason: "notOffered" };

  const bracketBefore = await deps.bracketOf(load, []);
  const input: UpgradeInput = {
    deckName: load.deckName,
    deck: load.deck.prompt,
    pool: load.pool.prompt,
    strategy: { label: pick.label, blurb: pick.blurb, backingNames: pick.backing.map((b) => b.name) },
    otherThemes: all.filter((s) => s.key !== pick.key).map((s) => s.label),
    bracketBefore,
  };
  const prompt = buildUpgradePrompt(input);
  if (Math.ceil((prompt.system.length + prompt.user.length) / 3) > UPGRADE_INPUT_CEILING_TOKENS) return { ok: false, reason: "tooBig" };

  const started = await startUpgrade(userId, fileName, { key: pick.key, label: pick.label }, UPGRADE_MODEL, now);
  if (started.kind === "in_flight") return { ok: false, reason: "inFlight" };
  if (started.kind !== "started") return { ok: false, reason: started.kind };

  const billed: Billed[] = [];
  const bill = () => (billed.length > 0 ? billed : undefined);
  const callModelBilled: UpgradeCallModel = async (req) => {
    const out = await deps.call(req);
    if (out.usage) billed.push({ model: UPGRADE_MODEL, usage: out.usage, step: req.stage, effort: null });
    return out;
  };
  try {
    const report = await runUpgrade({ input, deck: load.deck.entries, pool: load.pool.entries, callModel: callModelBilled });
    if (report.failed !== null && report.pairs.length === 0) {
      await finishUpgrade(started, { status: "failed", errorClass: report.failed === "upstream_rejected" ? "upstream_busy" : report.failed }, bill(), deps.now());
      return { ok: false, reason: "failed" };
    }
    const bracketAfter = await deps.bracketOf(load, report.pairs);
    const refunded = report.charge.outcome === "refunded";
    await finishUpgrade(started, {
      status: "done", pairs: report.pairs, drops: report.drops, buyTotalCents: report.buyTotalCents, bracketBefore, bracketAfter,
      calls: report.calls, refunded, errorClass: report.failed ?? undefined,
    }, bill(), deps.now());
    if (refunded) return { ok: false, reason: "short" };
  } catch (err) {
    // The original error is the one to raise: a settle that fails here is left to the reaper (`reapUpgrades`) and the reservation's own window.
    await finishUpgrade(started, { status: "failed", errorClass: "upstream_busy" }, bill(), deps.now()).catch(() => false);
    throw err;
  }
  // Outside the try: the credits are settled by now, and a failed read here must not be mistaken for a failed run.
  const panel = await panelFor(userId, load, now, env);
  const run = panel.runs.find((r) => r.status === "done" && r.strategyKey === pick.key);
  return run ? { ok: true, panel, run } : { ok: false, reason: "failed" };
}
