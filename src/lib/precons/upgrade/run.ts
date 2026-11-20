import { callModel, type ModelOutcome } from "../../model/client";
import { readAllowance, type Billed } from "../../model/allowance";
import type { Allowance } from "../../model/allowance-rule";
import { withPayments } from "../../payments/flag";
import { slotDeck } from "../../bracket/slot";
import { swapped } from "../../decks/tuning-read";
import { bracketAfter as lineBracketAfter } from "../../tuning/bracket-shift";
import { loadDeckProfileFromHead, type ProfileHead } from "../../profile/load";
import { UPGRADE_INPUT_CEILING_TOKENS, UPGRADE_MODEL } from "./constants";
import { detectStrategies, type Strategy } from "./detect";
import { runUpgrade, type UpgradeCallModel } from "./engine";
import { runKey } from "./targets";
import { holdBracket, isBracketTarget, playsAt, shortfall, type BracketRead, type BracketTarget } from "./hold";
import { readOwnedOracleIds } from "../../decks/tuning-read";
import { loadAvailability } from "../../decks/availability-query";
import type { Availability } from "../../decks/availability";
import { assembleDeck, boxFingerprint, withCommanders, type CommanderOption } from "./inputs";
import { loadUpgradeBase, loadUpgradeFor, type UpgradeBase, type UpgradeLoad } from "./load";
import { buildUpgradePrompt, upgradeReplySchema, type UpgradeInput, type UpgradeReply } from "./prompt";
import { readCardFacts, readRunDecks, type CardFacts, type RunDeck } from "./facts";
import { finishUpgrade, readDoneUpgrade, readUpgrades, reapUpgrades, startUpgrade, type StoredUpgrade } from "./store";
import { recordSoftFailure } from "../../cache/soft-failure";
import { readSwapPartners } from "./swap-partners";
import { picksInRun } from "./picks";
import type { LineBrackets, StoredPair, UpgradePair } from "./validate";

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
  /** The newest deck the reader started from this run or applied it to (`decks.built_from_upgrade_id`), or null when none: the run's row names it. */
  deck: RunDeck | null;
  /** The theme each cut came from, by the cut's oracle id: the first strategy the deck backs under this run's commander that the card supports. A cut no strategy backs has none. */
  themes: Record<string, string>;
};

/** A card as a result row draws it, besides its name: its facts, and whether the reader owns a copy. `availability` is the claim picture of an owned card (what the allocation chips draw): absent for a card not owned or when the read could not reach. */
export type PanelCard = Partial<CardFacts> & { owned: boolean; availability?: Availability };

export type UpgradePanel = {
  /** The bracket the box plays at (2, 3 or 4), or null when it could not be read. Only picks at or above it are offered: an upgrade adds cards, it cannot take the box's own off. */
  boxBracket: number | null;
  /** Step one: who leads. Step two, per commander: the strategies the deck backs under that commander. The player picks both; nothing is preselected. */
  commanders: OfferedCommander[];
  /** The newest pending run and every kept run up to the history cap, newest first (`strategyKey` is `<commander key>/<bracket>/<strategy key>`): what the page shows again, free. */
  runs: PanelRun[];
  /** The box's list as it stands now (`boxFingerprint`): a run made over another list can no longer start a deck (R3). */
  listFp: string;
  /** Every card the runs and the commanders name, by oracle id, with what a row draws of it. */
  cards: Record<string, PanelCard>;
  allowance: Allowance;
};

export type UpgradePress =
  | { ok: true; panel: UpgradePanel; run: StoredUpgrade }
  | { ok: false; reason: "notFound" | "notOffered" | "noPool" | "tooBig" | "current" | "inFlight" | "allowance" | "ownerShare" | "paused" | "failed" | "short" };

type Deps = {
  base: (fileName: string) => Promise<UpgradeBase | null>;
  loadFor: (base: UpgradeBase, option: CommanderOption, bracket: BracketTarget) => Promise<UpgradeLoad>;
  call: (req: Parameters<UpgradeCallModel>[0]) => Promise<ModelOutcome<UpgradeReply>>;
  bracketOf: (list: BracketList, pairs: readonly UpgradePair[]) => Promise<number | null>;
  /** The bracket facts of the list with the pairs applied and the bracket it plays at, which the hold and the reach read (`hold.ts`); null when the read fails. */
  bracketsOf: (list: BracketList, pairs: readonly UpgradePair[]) => Promise<BracketRead | null>;
  /** The newest deck started from each of these runs, by run id. */
  decks: (userId: string, runIds: readonly string[]) => Promise<Map<string, RunDeck>>;
  /** The mana value, color identity and bracket facts of cards by oracle id. */
  facts: (oracleIds: readonly string[]) => Promise<Map<string, CardFacts>>;
  /** Which of these cards the reader owns at all. */
  owned: (userId: string, oracleIds: readonly string[]) => Promise<Set<string>>;
  /** The claim picture of these cards across the reader's decks. Fail-soft: a read that cannot reach draws no chip. */
  availability: (userId: string, oracleIds: readonly string[]) => Promise<Map<string, Availability>>;
  /** Each swap's combo partner in the list with the pairs applied (`swap-partners.ts`), stored on the run. Its failure is isolated: see the press. */
  partners: (list: BracketList, pairs: readonly UpgradePair[]) => Promise<StoredPair[]>;
  /** Each pair's per-card bracket lines (`lineBrackets`), in the pairs' order, or null when any read failed. Stored on the run's pairs (`lineBracketsOrNone`). */
  lineBrackets: (list: BracketList, pairs: readonly UpgradePair[], signal?: AbortSignal) => Promise<LineBrackets[] | null>;
  now: () => Date;
};

export const LIVE_DEPS: Deps = {
  base: loadUpgradeBase,
  loadFor: loadUpgradeFor,
  call: (req) => callModel({ model: UPGRADE_MODEL, system: req.system, user: req.user, maxTokens: req.maxTokens, schema: upgradeReplySchema, deadlineMs: req.deadlineMs }),
  bracketOf,
  bracketsOf,
  facts: readCardFacts,
  decks: readRunDecks,
  owned: readOwnedOracleIds,
  availability: (userId, oracleIds) => loadAvailability(userId, { oracleIds: [...oracleIds] }).catch((e: unknown) => {
    // Fail-soft: no chip rather than no panel, but the response is marked as having fallen back so it is not kept as if complete.
    console.error("upgrade panel: availability read failed", e);
    recordSoftFailure();
    return new Map<string, Availability>();
  }),
  partners: readSwapPartners,
  lineBrackets,
  now: () => new Date(),
};

/**
 * The bracket the precon's list plays at once the pairs are applied (none: as it stands), by the Analysis tab's own verdict
 * (`slotDeck` over `loadDeckProfileFromHead`), never read off the model. Null when the read fails: a figure the app could not
 * compute is left out, not guessed.
 */
/** The cards a bracket is read over: the commander(s) and every other card with its quantity. */
export type BracketList = { commanderIds: readonly string[]; cards: readonly { oracleId: string; quantity: number; isCommander: boolean }[] };

/** One copy of a card out, one in, or both: what `swapped` applies to a list. */
type ListEdit = { cutOracleId: string | null; addOracleId: string | null };

/** The profile of the list with the pairs applied, or null when the read fails: a figure the app could not compute is left out, not guessed. */
async function profileOf(load: BracketList, pairs: readonly UpgradePair[]) {
  return profileWith(load, pairs.map((p) => ({ cutOracleId: p.cutId, addOracleId: p.addId })));
}

/** The profile of the list with the edits applied in turn, or null when the read fails. */
async function profileWith(load: BracketList, edits: readonly ListEdit[]) {
  try {
    const commanders = load.commanderIds;
    const list = load.cards.filter((c) => !c.isCommander).map((c) => ({ oracleId: c.oracleId, quantity: c.quantity }));
    const head: ProfileHead = {
      deckId: "", userId: "", commanderOracleId: commanders[0], partnerOracleId: commanders[1] ?? null, declaredBracket: null, cards: list,
    };
    const after = edits.reduce((cards, e) => swapped(cards, e), head.cards);
    return await loadDeckProfileFromHead({ ...head, cards: after }, {} as NodeJS.ProcessEnv);
  } catch {
    return null;
  }
}

/** How many of `lineBrackets`' profile builds run at once: each is a catalog read, and a full run is 2N + 1 of them. */
export const LINE_BRACKETS_CONCURRENCY = 4;

/**
 * `fn` over `items` with at most `limit` running at once, results in the items' order. Once `signal` aborts, no worker takes a new
 * item (one in flight may finish); the items never started are left undefined, so a caller that aborts discards the result.
 */
async function mapLimited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>, signal?: AbortSignal): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Each pair's per-card bracket lines (fresh start R2): the list with ONLY that add in, and with ONLY that cut out, compared with the
 * list as it stands through Suggested changes' own `bracketAfter`, so a line flags exactly as a Suggested changes line does. The
 * player picks adds and cuts apart, so each side carries its own. 2N + 1 profile builds (the "before" read once, shared by every
 * side), at most `LINE_BRACKETS_CONCURRENCY` at a time, no model call. Null when any read fails: a flag the app could not compute is
 * left out, never guessed (a missing read must not read as "moves nothing").
 */
export async function lineBrackets(load: BracketList, pairs: readonly UpgradePair[], signal?: AbortSignal): Promise<LineBrackets[] | null> {
  if (pairs.length === 0) return [];
  const before = await profileWith(load, []);
  if (!before || signal?.aborted) return null;
  const edits = pairs.flatMap((p): ListEdit[] => [{ cutOracleId: null, addOracleId: p.addId }, { cutOracleId: p.cutId, addOracleId: null }]);
  const read = await mapLimited(edits, LINE_BRACKETS_CONCURRENCY, async (edit) => {
    const after = await profileWith(load, [edit]);
    return after ? lineBracketAfter({ before, after, declared: null }) : undefined;
  }, signal);
  if (signal?.aborted) return null;
  if (read.some((r) => r === undefined)) return null;
  return pairs.map((_, i) => ({ addBracketAfter: read[2 * i] as number[] | null, cutBracketAfter: read[2 * i + 1] as number[] | null }));
}

/**
 * How long the per-card bracket read may take before a run is finished without it: as `PARTNERS_TIMEOUT_MS`, a hung read must not
 * hold a charged run pending. A run holds up to 18 pairs, so 2 x 18 + 1 = 37 profile builds; at `LINE_BRACKETS_CONCURRENCY` (4)
 * that is the shared "before" then ceil(36 / 4) = 9 rounds, about 10 in all, so 8s allows ~800ms a build. It runs on the paid press
 * before `finishUpgrade`, next to a model call of tens of seconds. On the timeout the workers take no new build (`lineBrackets`' signal).
 */
export const LINE_BRACKETS_TIMEOUT_MS = 8000;

/**
 * Each pair's bracket lines by its add's oracle id (unique within a run), or an empty map when the read failed, threw, gave a
 * different count or outlasted `LINE_BRACKETS_TIMEOUT_MS`. NEVER throws, for the same reason as `partnersOrBare`: the lines are a
 * mark on a good run, never a reason to undo it, so on any of these the values are left off and the paid run still finishes.
 */
export async function lineBracketsOrNone(
  read: Deps["lineBrackets"], list: BracketList, pairs: readonly UpgradePair[], ms = LINE_BRACKETS_TIMEOUT_MS,
): Promise<Map<string, LineBrackets>> {
  if (pairs.length === 0) return new Map();
  let lines: LineBrackets[] | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Aborted on the timeout, so a read that lost the race stops starting builds rather than running on unseen.
  const stop = new AbortController();
  try {
    const timedOut = new Promise<null>((resolve) => { timer = setTimeout(() => { stop.abort(); resolve(null); }, ms); });
    lines = await Promise.race([read(list, pairs, stop.signal), timedOut]);
  } catch {
    lines = null;
  } finally {
    clearTimeout(timer);
  }
  if (!lines || lines.length !== pairs.length) {
    recordSoftFailure();
    return new Map();
  }
  const got = lines;
  return new Map(pairs.map((p, i) => [p.addId, got[i]] as const));
}

/**
 * The brackets the list under a run's commander permits with these of its adds and cuts applied (fresh start R2): the Start dialog's
 * bracket fact on the picked subset, as `readSetPermits` is Suggested changes'. The ids are held to the one picks rule (`picksInRun`)
 * and nothing more: the counts may differ, on purpose (the bar shows a bracket while the player's adds and cuts are uneven), and the
 * lead's color identity is not checked. A Start or an Apply refuses both (`picksOfRun`, `prepareUpgradeIn`), so the bar can read a
 * set the write would refuse. Null when the run's commander is not the box's to lead any
 * more, an id is not the run's, or the read fails. One profile build, no model call.
 */
export async function setPermits(
  base: UpgradeBase, run: Pick<StoredUpgrade, "strategyKey" | "pairs">, adds: readonly string[], cuts: readonly string[],
): Promise<number[] | null> {
  const option = base.options.find((o) => run.strategyKey.startsWith(`${o.key}/`));
  if (!option) return null;
  if (!picksInRun(run.pairs, adds, cuts)) return null;
  const list: BracketList = { commanderIds: option.commanderIds, cards: assembleDeck(withCommanders(base.lines, option.commanderIds), new Map()).cards };
  const profile = await profileWith(list, [
    ...cuts.map((id) => ({ cutOracleId: id, addOracleId: null })),
    ...adds.map((id) => ({ cutOracleId: null, addOracleId: id })),
  ]);
  return profile ? slotDeck(profile).permits : null;
}

/**
 * `setPermits` for the reader's own done run on this precon, or null when there is none, or when the run was made over another list
 * than the box's now (the `listFp` check a Start makes, answered `listChanged` there): its swaps no longer apply. Free: reads only.
 */
export async function readSetBracket(
  userId: string, fileName: string, runId: string, adds: readonly string[], cuts: readonly string[], deps: Pick<Deps, "base"> = LIVE_DEPS,
): Promise<{ permits: number[]; bracket: number | null } | null> {
  // By id, not through `readUpgrades`' newest `HISTORY_MAX`: an older run a Start can still make has its set bracket too.
  const run = await readDoneUpgrade(userId, fileName, runId);
  if (!run) return null;
  const base = await deps.base(fileName);
  if (!base || run.listFp === null || run.listFp !== boxFingerprint(base.lines)) return null;
  const permits = await setPermits(base, run, adds, cuts);
  return permits ? { permits, bracket: playsAt(permits) } : null;
}

async function bracketOf(load: BracketList, pairs: readonly UpgradePair[]): Promise<number | null> {
  return (await bracketsOf(load, pairs))?.plays ?? null;
}

async function bracketsOf(load: BracketList, pairs: readonly UpgradePair[]): Promise<BracketRead | null> {
  const profile = await profileOf(load, pairs);
  return profile ? { ...profile.brackets, plays: playsAt(slotDeck(profile).permits) } : null;
}

/** How long the partner read may take before a run is finished without it: a hung read must not hold a charged run pending. */
export const PARTNERS_TIMEOUT_MS = 3000;

/**
 * The run's pairs with their combo partners, or the bare pairs when the read fails, throws synchronously or outlasts
 * `PARTNERS_TIMEOUT_MS`. NEVER throws: it runs inside the press's try, whose catch fails and refunds the paid run, and the
 * partners are a mark on a good run, never a reason to undo it. A fallback is recorded (`recordSoftFailure`).
 */
export async function partnersOrBare(
  read: Deps["partners"], list: BracketList, pairs: UpgradePair[], ms = PARTNERS_TIMEOUT_MS,
): Promise<StoredPair[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
    const got = await Promise.race([read(list, pairs), timedOut]);
    if (got) return got;
  } catch {
    // Fall through to the bare pairs.
  } finally {
    clearTimeout(timer);
  }
  recordSoftFailure();
  return pairs;
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
  const [owned, facts, runDecks, availability] = await Promise.all([deps.owned(userId, named), deps.facts(named), deps.decks(userId, stored.map((r) => r.id)), deps.availability(userId, named)]);
  const runs = stored.map((r): PanelRun => {
    const buy = r.pairs.filter((p) => !owned.has(p.addId));
    const strategies = offeredNow.find((c) => r.strategyKey.startsWith(`${c.key}/`))?.strategies ?? [];
    const themes: Record<string, string> = {};
    for (const p of r.pairs) {
      const t = strategies.find((st) => st.backingIds.includes(p.cutId));
      if (t) themes[p.cutId] = t.label;
    }
    return { ...r, toBuy: { cards: buy.length, cents: buy.reduce((n, p) => n + p.addCents, 0) }, owned: r.pairs.length - buy.length, themes, deck: runDecks.get(r.id) ?? null };
  });
  const cardsOut: Record<string, PanelCard> = {};
  for (const id of named) {
    const a = owned.has(id) ? availability.get(id) : undefined;
    cardsOut[id] = { ...facts.get(id), owned: owned.has(id), ...(a ? { availability: a } : {}) };
  }
  const boxBracket = await deps.bracketOf({ commanderIds: base.options[0].commanderIds, cards: assembleDeck(base.lines, new Map()).cards }, []);
  return { boxBracket, commanders: offeredNow.map(({ option: _option, ...c }) => c), runs, listFp: boxFingerprint(base.lines), cards: cardsOut, allowance };
}

/** The panel for one precon: free, never a call. Null when the precon is not found or has no commander. */
export async function readUpgrade(userId: string, fileName: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv): Promise<UpgradePanel | null> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const base = await deps.base(fileName);
  return base ? panelFor(userId, base, now, env, deps) : null;
}

export async function pressUpgrade(
  userId: string, fileName: string, commanderKey: string, bracket: number, strategyKey: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv,
): Promise<UpgradePress> {
  const now = deps.now();
  await reapUpgrades(userId, fileName, now);
  const base = await deps.base(fileName);
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
    // In parallel; the partners never throw (`partnersOrBare`), so only the bracket read can reach this try's catch.
    const [bracketAfter, partnered, lines] = await Promise.all([
      deps.bracketOf(list, report.pairs), partnersOrBare(deps.partners, list, report.pairs), lineBracketsOrNone(deps.lineBrackets, list, report.pairs),
    ]);
    const pairs = partnered.map((p): StoredPair => ({ ...p, ...lines.get(p.addId) }));
    const refunded = report.charge.outcome === "refunded";
    await finishUpgrade(started, {
      status: "done", pairs, drops: report.drops, buyTotalCents: report.buyTotalCents, bracketBefore, bracketAfter,
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
