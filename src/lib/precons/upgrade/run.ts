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
import { assembleDeck, lowestBracket, withCommanders, type CommanderOption } from "./inputs";
import { loadUpgradeBase, loadUpgradeFor, type UpgradeBase, type UpgradeLoad } from "./load";
import { buildUpgradePrompt, upgradeReplySchema, type UpgradeInput, type UpgradeReply } from "./prompt";
import { finishUpgrade, readUpgrades, reapUpgrades, startUpgrade, type StoredUpgrade } from "./store";
import type { UpgradePair } from "./validate";

/**
 * Upgrade this precon's read and press (research 2026-11-10). SERVER-ONLY. The actions (`actions.ts`) re-apply the switch and
 * the session, then call these. No model call outside `pressUpgrade`: `readUpgrade` detects the strategies from stored data.
 */

export type OfferedStrategy = Strategy & { backing: { oracleId: string; name: string }[] };

/** One way to lead the box, with the strategies the deck backs under it. The face commander(s) first, then the alternate when the box has one. */
export type OfferedCommander = Pick<CommanderOption, "key" | "isFace" | "cards" | "line"> & { strategies: OfferedStrategy[] };

export type UpgradePanel = {
  /** Step one: who leads. Step two, per commander: the strategies the deck backs under that commander. The player picks both; nothing is preselected. */
  commanders: OfferedCommander[];
  /** The newest pending run and the newest kept run per commander and strategy (`strategyKey` is `<commander key>/<strategy key>`): what the page shows again, free. */
  runs: StoredUpgrade[];
  allowance: Allowance;
};

export type UpgradePress =
  | { ok: true; panel: UpgradePanel; run: StoredUpgrade }
  | { ok: false; reason: "notFound" | "notOffered" | "tooBig" | "current" | "inFlight" | "allowance" | "ownerShare" | "paused" | "failed" | "short" };

type Deps = {
  base: (fileName: string, env: NodeJS.ProcessEnv) => Promise<UpgradeBase | null>;
  loadFor: (base: UpgradeBase, option: CommanderOption) => Promise<UpgradeLoad>;
  call: (req: Parameters<UpgradeCallModel>[0]) => Promise<ModelOutcome<UpgradeReply>>;
  bracketOf: (load: UpgradeLoad, pairs: readonly UpgradePair[]) => Promise<number | null>;
  now: () => Date;
};

export const LIVE_DEPS: Deps = {
  base: loadUpgradeBase,
  loadFor: loadUpgradeFor,
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

/**
 * The ways to lead the box with the strategies the deck backs under each, from stored data alone. The face commander(s) always
 * show (with no strategies when none is backed); the alternate shows only when at least one strategy is, so it is never offered
 * on a name alone. The Overview's plan attaches to the face option: it was written for that list.
 */
export function offered(base: UpgradeBase): (OfferedCommander & { option: CommanderOption })[] {
  return base.options.map((option) => {
    const facts = assembleDeck(withCommanders(base.lines, option.commanderIds), new Map()).facts;
    const names = new Map(facts.map((f) => [f.oracleId, f.name]));
    const strategies = detectStrategies({ tags: option.tags, deck: facts, overview: option.isFace ? base.overview : [] }).map((s) => ({
      ...s, backing: s.backingIds.map((id) => ({ oracleId: id, name: names.get(id) ?? "" })).filter((b) => b.name !== ""),
    }));
    return { key: option.key, isFace: option.isFace, cards: option.cards, line: option.line, strategies, option };
  }).filter((c) => c.isFace || c.strategies.length > 0);
}

async function panelFor(userId: string, base: UpgradeBase, now: Date, env: NodeJS.ProcessEnv): Promise<UpgradePanel> {
  const [runs, allowance] = await Promise.all([
    readUpgrades(userId, base.fileName),
    readAllowance(userId, now, "precon_upgrade").then((a) => withPayments(a, env)),
  ]);
  return { commanders: offered(base).map(({ option: _option, ...c }) => c), runs, allowance };
}

/** The panel for one precon: free, never a call. Null when the precon is not found or has no commander. */
export async function readUpgrade(userId: string, fileName: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv): Promise<UpgradePanel | null> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const base = await deps.base(fileName, env);
  return base ? panelFor(userId, base, now, env) : null;
}

export async function pressUpgrade(
  userId: string, fileName: string, commanderKey: string, strategyKey: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv,
): Promise<UpgradePress> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const base = await deps.base(fileName, env);
  if (!base) return { ok: false, reason: "notFound" };
  const lead = offered(base).find((c) => c.key === commanderKey);
  const all = lead?.strategies ?? [];
  const pick = all.find((s) => s.key === strategyKey);
  if (!lead || !pick) return { ok: false, reason: "notOffered" };
  const load = await deps.loadFor(base, lead.option);

  const bracketBefore = await deps.bracketOf(load, []);
  const input: UpgradeInput = {
    deckName: load.deckName,
    deck: load.deck.prompt,
    pool: load.pool.prompt,
    strategy: { label: pick.label, blurb: pick.blurb, backingNames: pick.backing.map((b) => b.name) },
    otherThemes: all.filter((s) => s.key !== pick.key).map((s) => s.label),
    bracketBefore,
    commanderSwap: load.formerCommander ? { lead: lead.cards.map((c) => c.name).join(" + "), former: load.formerCommander } : undefined,
  };
  const prompt = buildUpgradePrompt(input);
  if (Math.ceil((prompt.system.length + prompt.user.length) / 3) > UPGRADE_INPUT_CEILING_TOKENS) return { ok: false, reason: "tooBig" };

  const started = await startUpgrade(userId, fileName, { key: `${lead.key}/${pick.key}`, label: pick.label }, UPGRADE_MODEL, now);
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
  const panel = await panelFor(userId, base, now, env);
  const run = panel.runs.find((r) => r.status === "done" && r.strategyKey === `${lead.key}/${pick.key}`);
  return run ? { ok: true, panel, run } : { ok: false, reason: "failed" };
}
