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
import { runKey } from "./targets";
import { holdBracket, isBracketTarget, playsAt, shortfall, type BracketRead, type BracketTarget } from "./hold";
import { readOwnedOracleIds } from "../../decks/tuning-read";
import { assembleDeck, boxFingerprint, withCommanders, type CommanderOption } from "./inputs";
import { loadUpgradeBase, loadUpgradeFor, type UpgradeBase, type UpgradeLoad } from "./load";
import { buildUpgradePrompt, upgradeReplySchema, type UpgradeInput, type UpgradeReply } from "./prompt";
import { readCardFacts, type CardFacts } from "./facts";
import { finishUpgrade, readUpgrades, reapUpgrades, startUpgrade, type StoredUpgrade } from "./store";
import type { UpgradePair } from "./validate";

/**
 * Upgrade this precon's read and press (research 2026-11-10). SERVER-ONLY. The actions (`actions.ts`) re-apply the switch and
 * the session, then call these. No model call outside `pressUpgrade`: `readUpgrade` detects the strategies from stored data.
 */

export type OfferedStrategy = Strategy & { backing: { oracleId: string; name: string }[] };

/** One way to lead the box, with the strategies the deck backs under it. The face commander(s) first, then the alternate when the box has one. */
export type OfferedCommander = Pick<CommanderOption, "key" | "isFace" | "cards" | "line"> & { strategies: OfferedStrategy[] };

/** A stored run with what its adds cost THIS reader now: the adds they do not own, read when the page draws (the stored total counts every add). */
export type PanelRun = StoredUpgrade & {
  toBuy: { cards: number; cents: number; };
  owned: number;
  /** The theme each cut came from, by the cut's oracle id: the first strategy the deck backs under this run's commander that the card supports. A cut no strategy backs has none. */
  themes: Record<string, string>;
};

/** A card as a result row draws it, besides its name: its facts, and whether the reader owns a copy. */
export type PanelCard = Partial<CardFacts> & { owned: boolean };

export type UpgradePanel = {
  /** The bracket the box plays at (2, 3 or 4), or null when it could not be read. Only picks at or above it are offered: an upgrade adds cards, it cannot take the box's own off. */
  boxBracket: number | null;
  /** Step one: who leads. Step two, per commander: the strategies the deck backs under that commander. The player picks both; nothing is preselected. */
  commanders: OfferedCommander[];
  /** The newest pending run and every kept run up to the history cap, newest first (`strategyKey` is `<commander key>/<bracket>/<strategy key>`): what the page shows again, free. */
  runs: PanelRun[];
  /** Every card the runs and the commanders name, by oracle id, with what a row draws of it. */
  cards: Record<string, PanelCard>;
  allowance: Allowance;
};

export type UpgradePress =
  | { ok: true; panel: UpgradePanel; run: StoredUpgrade }
  | { ok: false; reason: "notFound" | "notOffered" | "noPool" | "tooBig" | "current" | "inFlight" | "allowance" | "ownerShare" | "paused" | "failed" | "short" };

type Deps = {
  base: (fileName: string, env: NodeJS.ProcessEnv) => Promise<UpgradeBase | null>;
  loadFor: (base: UpgradeBase, option: CommanderOption, bracket: BracketTarget) => Promise<UpgradeLoad>;
  call: (req: Parameters<UpgradeCallModel>[0]) => Promise<ModelOutcome<UpgradeReply>>;
  bracketOf: (list: BracketList, pairs: readonly UpgradePair[]) => Promise<number | null>;
  /** The bracket facts of the list with the pairs applied and the bracket it plays at, which the hold and the reach read (`hold.ts`); null when the read fails. */
  bracketsOf: (list: BracketList, pairs: readonly UpgradePair[]) => Promise<BracketRead | null>;
  /** The mana value, color identity and art of cards by oracle id. */
  facts: (oracleIds: readonly string[]) => Promise<Map<string, CardFacts>>;
  /** Which of these cards the reader owns at all. */
  owned: (userId: string, oracleIds: readonly string[]) => Promise<Set<string>>;
  now: () => Date;
};

export const LIVE_DEPS: Deps = {
  base: loadUpgradeBase,
  loadFor: loadUpgradeFor,
  call: (req) => callModel({ model: UPGRADE_MODEL, system: req.system, user: req.user, maxTokens: req.maxTokens, schema: upgradeReplySchema, deadlineMs: req.deadlineMs }),
  bracketOf,
  bracketsOf,
  facts: readCardFacts,
  owned: readOwnedOracleIds,
  now: () => new Date(),
};

/**
 * The bracket the precon's list plays at once the pairs are applied (none: as it stands), by the Analysis tab's own verdict
 * (`slotDeck` over `loadDeckProfileFromHead`), never read off the model. Null when the read fails: a figure the app could not
 * compute is left out, not guessed.
 */
/** The cards a bracket is read over: the commander(s) and every other card with its quantity. */
export type BracketList = { commanderIds: readonly string[]; cards: readonly { oracleId: string; quantity: number; isCommander: boolean }[] };

/** The profile of the list with the pairs applied, or null when the read fails: a figure the app could not compute is left out, not guessed. */
async function profileOf(load: BracketList, pairs: readonly UpgradePair[]) {
  try {
    const commanders = load.commanderIds;
    const list = load.cards.filter((c) => !c.isCommander).map((c) => ({ oracleId: c.oracleId, quantity: c.quantity }));
    const head: ProfileHead = {
      deckId: "", userId: "", commanderOracleId: commanders[0], partnerOracleId: commanders[1] ?? null, declaredBracket: null, cards: list,
    };
    const after = pairs.reduce((cards, p) => swapped(cards, { cutOracleId: p.cutId, addOracleId: p.addId }), head.cards);
    return await loadDeckProfileFromHead({ ...head, cards: after }, {} as NodeJS.ProcessEnv);
  } catch {
    return null;
  }
}

async function bracketOf(load: BracketList, pairs: readonly UpgradePair[]): Promise<number | null> {
  return (await bracketsOf(load, pairs))?.plays ?? null;
}

async function bracketsOf(load: BracketList, pairs: readonly UpgradePair[]): Promise<BracketRead | null> {
  const profile = await profileOf(load, pairs);
  return profile ? { ...profile.brackets, plays: playsAt(slotDeck(profile).permits) } : null;
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

async function panelFor(userId: string, base: UpgradeBase, now: Date, env: NodeJS.ProcessEnv, deps: Deps): Promise<UpgradePanel> {
  const [stored, allowance] = await Promise.all([
    readUpgrades(userId, base.fileName),
    readAllowance(userId, now, "precon_upgrade").then((a) => withPayments(a, env)),
  ]);
  const offeredNow = offered(base);
  // Every card a result row names: the pairs' cuts and adds, and the commanders (the box's and the alternate).
  const named = [...new Set([...stored.flatMap((r) => r.pairs.flatMap((p) => [p.cutId, p.addId])), ...offeredNow.flatMap((c) => c.cards.map((k) => k.oracleId))])];
  const [owned, facts] = await Promise.all([deps.owned(userId, named), deps.facts(named)]);
  const runs = stored.map((r): PanelRun => {
    const buy = r.pairs.filter((p) => !owned.has(p.addId));
    const strategies = offeredNow.find((c) => r.strategyKey.startsWith(`${c.key}/`))?.strategies ?? [];
    const themes: Record<string, string> = {};
    for (const p of r.pairs) {
      const t = strategies.find((st) => st.backingIds.includes(p.cutId));
      if (t) themes[p.cutId] = t.label;
    }
    return { ...r, toBuy: { cards: buy.length, cents: buy.reduce((n, p) => n + p.addCents, 0) }, owned: r.pairs.length - buy.length, themes };
  });
  const cardsOut: Record<string, PanelCard> = {};
  for (const id of named) cardsOut[id] = { ...facts.get(id), owned: owned.has(id) };
  const boxBracket = await deps.bracketOf({ commanderIds: base.options[0].commanderIds, cards: assembleDeck(base.lines, new Map()).cards }, []);
  return { boxBracket, commanders: offeredNow.map(({ option: _option, ...c }) => c), runs, cards: cardsOut, allowance };
}

/** The panel for one precon: free, never a call. Null when the precon is not found or has no commander. */
export async function readUpgrade(userId: string, fileName: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv): Promise<UpgradePanel | null> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const base = await deps.base(fileName, env);
  return base ? panelFor(userId, base, now, env, deps) : null;
}

export async function pressUpgrade(
  userId: string, fileName: string, commanderKey: string, bracket: number, strategyKey: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv,
): Promise<UpgradePress> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const base = await deps.base(fileName, env);
  if (!base) return { ok: false, reason: "notFound" };
  if (!isBracketTarget(bracket)) return { ok: false, reason: "notOffered" };
  const lead = offered(base).find((c) => c.key === commanderKey);
  const all = lead?.strategies ?? [];
  const pick = all.find((s) => s.key === strategyKey);
  if (!lead || !pick) return { ok: false, reason: "notOffered" };
  // "Before" is the box as shipped, whoever leads it, so a run led by the alternate still compares against the precon itself.
  const bracketBefore = await deps.bracketOf({ commanderIds: base.options[0].commanderIds, cards: assembleDeck(base.lines, new Map()).cards }, []);
  if (bracketBefore !== null && bracket < bracketBefore) return { ok: false, reason: "notOffered" };
  const load = await deps.loadFor(base, lead.option, bracket);
  // A pool-less run would pay for two calls that can only come back empty: the alternate may have no index rows of its own.
  if (load.pool.entries.length === 0) return { ok: false, reason: "noPool" };

  const input: UpgradeInput = {
    deckName: load.deckName,
    deck: load.deck.prompt,
    pool: load.pool.prompt,
    strategy: { label: pick.label, blurb: pick.blurb, backingNames: pick.backing.map((b) => b.name) },
    otherThemes: all.filter((s) => s.key !== pick.key).map((s) => s.label),
    bracketBefore,
    bracketTarget: bracket,
    commanderSwap: load.formerCommander ? { lead: lead.cards.map((c) => c.name).join(" + "), former: load.formerCommander } : undefined,
  };
  const prompt = buildUpgradePrompt(input);
  if (Math.ceil((prompt.system.length + prompt.user.length) / 3) > UPGRADE_INPUT_CEILING_TOKENS) return { ok: false, reason: "tooBig" };

  const started = await startUpgrade(userId, fileName, { key: runKey(lead.key, bracket, pick.key), label: pick.label, bracketTarget: bracket, listFp: boxFingerprint(base.lines) }, UPGRADE_MODEL, now);
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
    const list: BracketList = { commanderIds: load.commanderIds, cards: load.deck.cards };
    const report = await runUpgrade({
      input, deck: load.deck.entries, pool: load.pool.entries, callModel: callModelBilled,
      hold: (pairs) => holdBracket(pairs, bracket, (applied) => deps.bracketsOf(list, applied)),
      reach: async (pairs) => shortfall(bracket, await deps.bracketsOf(list, pairs)),
    });
    if (report.failed !== null && report.pairs.length === 0) {
      await finishUpgrade(started, { status: "failed", errorClass: report.failed === "upstream_rejected" ? "upstream_busy" : report.failed }, bill(), deps.now());
      return { ok: false, reason: "failed" };
    }
    const bracketAfter = await deps.bracketOf(list, report.pairs);
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
  const panel = await panelFor(userId, base, now, env, deps);
  const run = panel.runs.find((r) => r.id === started.runId);
  return run ? { ok: true, panel, run } : { ok: false, reason: "failed" };
}
