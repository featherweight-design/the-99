import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../db";
import { chainArt } from "../cards/chain-art";
import { cards, decks } from "../../db/schema";
import { readAllowance, type Billed } from "../model/allowance";
import type { Allowance } from "../model/allowance-rule";
import { callModel, type ModelOutcome } from "../model/client";
import type { FitsRead } from "./fits";
import { buildFitsReadPrompt, fitsReadSchema, validFitsRead, type FitsReadReply, type PlanSource } from "./fits-read";
import { FITS_READ_DEADLINE_MS, FITS_READ_EFFORT, FITS_READ_INPUT_CEILING, FITS_READ_MAX_TOKENS, FITS_READ_MODEL } from "./fits-read-limits";
import { loadFitsReadInputs, type FitsReadLoad } from "./fits-read-load";
import { fitsReadView, readRefunds, type FitsReadView } from "./fits-read-state";
import { candidateHashes, finishFitsRead, reapFitsReads, readFitsReadRows, startFitsRead } from "./fits-read-store";
import { fitsReadLive, fitsStubDelayMs, fitsStubMode, STUB_MODEL, stubFitsReply } from "./fits-read-stub";

/**
 * Find a deck read's press and its view (brief locks 4 to 8, handoff §2 to §6). SERVER-ONLY. The
 * actions (`fits-read-actions.ts`) re-apply the switch and the session, then call these.
 */

export type FitsReadPanel = {
  /** The free list, as `loadFits` reads it: the view draws the read and the list from one call. */
  fits: FitsRead;
  view: FitsReadView;
  /** How many candidate decks the card has now. Zero draws no press (lock 8). */
  candidates: number;
  /** Where each candidate's plan came from, for the row's source line (handoff addendum, G12). */
  planSources: Record<string, PlanSource>;
  /** The name of every card the stored read's sentences and cuts name, by oracle id: the view draws
   *  the names, never the model (lock 1). */
  names: Record<string, string>;
  /** The art each named card previews on hover: the printing card details opens for it outside a deck's own
   *  page, the reader's owned copy else the catalog's (`chainArt`, as the free list's combo pieces do). */
  images: Record<string, string | null>;
  /** Each picked deck's commanders, by oracle id, so the row's commander line names cards a reader can
   *  hover and open: from the inputs for a candidate, and from the deck itself for one that has since taken
   *  the card (no longer a candidate, its row kept as resolved). */
  commanderIds: Record<string, string[]>;
  allowance: Allowance;
};

export type FitsReadPress =
  | { ok: true; panel: FitsReadPanel }
  | { ok: false; reason: "notFound" | "noCandidates" | "tooBig" | "current" | "allowance" | "paused" | "ownerShare" };

type Deps = {
  /** `env`: the reader's resolved switches, for `loadFits`' claim read and art. */
  load: (userId: string, oracleId: string, env: NodeJS.ProcessEnv) => Promise<FitsReadLoad | null>;
  model: () => string;
  call: (req: { inputs: FitsReadLoad["inputs"]; prompt: ReturnType<typeof buildFitsReadPrompt>; model: string }) => Promise<ModelOutcome<FitsReadReply>>;
  now: () => Date;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const LIVE_DEPS: Deps = {
  load: (u, o, env) => loadFitsReadInputs(u, o, {}, env),
  model: () => (fitsReadLive() ? FITS_READ_MODEL : STUB_MODEL),
  call: async ({ inputs, prompt, model }) => {
    if (model === STUB_MODEL) {
      const ms = fitsStubDelayMs();
      if (ms > 0) await sleep(ms);
      return stubFitsReply(inputs, prompt, fitsStubMode());
    }
    return callModel({
      model, system: prompt.system, user: prompt.user, cacheSystem: prompt.cacheSystem,
      maxTokens: FITS_READ_MAX_TOKENS, schema: fitsReadSchema, deadlineMs: FITS_READ_DEADLINE_MS, effort: FITS_READ_EFFORT,
    });
  },
  now: () => new Date(),
};

/**
 * The view for one card: free, never a call. `env` is the reader's resolved switches (`requestSwitchEnv`),
 * for the free list's claim read and every card's art.
 */
export async function readFitsRead(
  userId: string, oracleId: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv,
): Promise<FitsReadPanel | null> {
  const now = deps.now();
  await reapFitsReads(userId, oracleId, now);
  const load = await deps.load(userId, oracleId, env);
  if (!load) return null;
  return panelFor(userId, oracleId, load, deps.model(), now, env);
}

async function panelFor(userId: string, oracleId: string, load: FitsReadLoad, model: string, now: Date, env: NodeJS.ProcessEnv): Promise<FitsReadPanel> {
  const [rows, allowance] = await Promise.all([readFitsReadRows(userId, oracleId), readAllowance(userId, now, "fits_read")]);
  const planSources = Object.fromEntries(load.inputs.candidates.map((c) => [c.deckId, load.planOf.get(c.deckId)?.source ?? "none"]));
  const holding = new Set(load.fits.holds.map((h) => h.id));
  const view = fitsReadView(rows, candidateHashes(load.inputs, model), holding);
  const { names, images, commanderIds } = await pickCards(userId, view, load, env);
  return { fits: load.fits, view, candidates: load.inputs.candidates.length, planSources, names, images, commanderIds, allowance };
}

/** Names for the stored picks' cards: from the inputs where the deck still runs the card, else the
 *  catalog (a card a deck has since cut, on an out-of-date read). */
async function pickCards(userId: string, view: FitsReadView, load: FitsReadLoad, env: NodeJS.ProcessEnv): Promise<
  Pick<FitsReadPanel, "names" | "images" | "commanderIds">
> {
  const ids = new Set<string>();
  const commanderIds: Record<string, string[]> = {};
  const deckById = new Map(load.inputs.decks.map((d) => [d.deckId, d]));
  for (const p of view.stored?.picks ?? []) {
    if (p.cut) ids.add(p.cut);
    for (const part of p.parts) if ("card" in part) ids.add(part.card);
    const deck = deckById.get(p.deckId);
    if (deck) {
      commanderIds[p.deckId] = deck.commanders.map((c) => c.oracleId);
      for (const c of deck.commanders) ids.add(c.oracleId);
    }
  }
  // A picked deck that has since taken the card is no candidate, so the inputs do not carry it; its row stays,
  // resolved, and its commanders are read from the deck itself so they still name cards.
  const absent = (view.stored?.picks ?? []).map((p) => p.deckId).filter((id) => !deckById.has(id));
  if (absent.length > 0) {
    const rows = await db.select({ id: decks.id, commander: decks.commanderOracleId, partner: decks.partnerOracleId })
      .from(decks).where(and(inArray(decks.id, absent), eq(decks.userId, userId))).catch(() => []);
    for (const d of rows) {
      const own = d.partner ? [d.commander, d.partner] : [d.commander];
      commanderIds[d.id] = own;
      for (const c of own) ids.add(c);
    }
  }
  if (ids.size === 0) return { names: {}, images: {}, commanderIds };
  const out: Record<string, string> = {};
  const known = [load.inputs.card, ...load.inputs.decks.flatMap((d) => [...d.commanders, ...d.list])];
  for (const c of known) if (ids.has(c.oracleId)) out[c.oracleId] = c.name;
  const all = [...ids];
  // One catalog read serves both the names the inputs lack and the art fallback; the art itself is fail-soft,
  // so a failed read leaves the names standing and the cards with no preview.
  const [rows, owned] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, all))
      .catch(() => [] as { oracleId: string; name: string; imageUri: string | null }[]),
    chainArt(userId, null, all, env).catch(() => new Map<string, string>()),
  ]);
  const images: Record<string, string | null> = {};
  for (const r of rows) {
    if (!(r.oracleId in out)) out[r.oracleId] = r.name;
    images[r.oracleId] = owned.get(r.oracleId) ?? r.imageUri ?? null;
  }
  return { names: out, images, commanderIds };
}

/**
 * A press. Refused, costing nothing, when the card has no candidate (lock 8), when its prompt would
 * pass the input ceiling, and when the stored read is still current (handoff §6: the same inputs
 * would say the same thing, a no fit included). A run in flight is returned as it stands, never
 * charged twice (lock 5). Otherwise one unit is reserved, the model is asked once, and the outcome
 * settles it: spent for a read that held up, refunded for a failure, a no fit or a thin read.
 */
export async function pressFitsRead(
  userId: string, oracleId: string, deps: Deps = LIVE_DEPS, env: NodeJS.ProcessEnv,
): Promise<FitsReadPress> {
  const now = deps.now();
  await reapFitsReads(userId, oracleId, now);
  const load = await deps.load(userId, oracleId, env);
  if (!load) return { ok: false, reason: "notFound" };
  const { inputs } = load;
  if (inputs.candidates.length === 0) return { ok: false, reason: "noCandidates" };
  const model = deps.model();
  const hashes = candidateHashes(inputs, model);
  const before = fitsReadView(await readFitsReadRows(userId, oracleId), hashes, new Set(load.fits.holds.map((h) => h.id)));
  if (before.pending) return { ok: true, panel: await panelFor(userId, oracleId, load, model, now, env) };
  if (before.stored?.current) return { ok: false, reason: "current" };

  const prompt = buildFitsReadPrompt(inputs, "per-press");
  if (Math.ceil((prompt.system.length + prompt.user.length) / 3) > FITS_READ_INPUT_CEILING) return { ok: false, reason: "tooBig" };

  const started = await startFitsRead(userId, oracleId, hashes, model, now);
  if (started.kind === "in_flight") return { ok: true, panel: await panelFor(userId, oracleId, load, model, now, env) };
  if (started.kind === "current") return { ok: false, reason: "current" };
  if (started.kind !== "started") return { ok: false, reason: started.kind };

  let billed: Billed | undefined;
  try {
    const outcome = await deps.call({ inputs, prompt, model });
    if (outcome.usage) billed = { model, usage: outcome.usage, step: "read", effort: model === STUB_MODEL ? null : FITS_READ_EFFORT };
    if (!outcome.ok) {
      const errorClass = outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass;
      await finishFitsRead(started, { status: "failed", errorClass }, billed, deps.now());
    } else {
      const v = validFitsRead({ reply: outcome.value, prompt, inputs });
      const returned = outcome.value.picks.length;
      if (v.outcome === "failed") {
        await finishFitsRead(started, { status: "failed", errorClass: "ungrounded", returned, drops: v.drops }, billed, deps.now());
      } else {
        await finishFitsRead(started, {
          status: "done", outcome: v.outcome, returned, drops: v.drops,
          picks: v.picks.map((p) => ({ ...p, planSource: load.planOf.get(p.deckId)?.source ?? "none" })),
          refunded: readRefunds(v.outcome, v.picks.length, returned),
        }, billed, deps.now());
      }
    }
  } catch (err) {
    await finishFitsRead(started, { status: "failed", errorClass: "upstream_busy" }, billed, deps.now());
    throw err;
  }
  // Re-read: a call can run for most of two minutes, and a deck edited meanwhile must show the
  // stored read out of date, against today's free list, never as current.
  const after = (await deps.load(userId, oracleId, env)) ?? load;
  return { ok: true, panel: await panelFor(userId, oracleId, after, model, deps.now(), env) };
}
