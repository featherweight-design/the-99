/**
 * One precon's Overview request, built from THIS database's catalog exactly as an Analyze press's
 * write would build it, and its hash. Shared by the build (which sends it) and the copy (which
 * rebuilds it on the target to check that a source row still fits there), so the two can never
 * disagree on what "the same inputs" means.
 *
 * Reads through `src/db`, so import it (dynamically) after DATABASE_URL names the database.
 */
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { cards, preconCards } from "../../src/db/schema";
import { preconAlternates } from "../../src/lib/precons/alternates";
import { synopsisRequestHash } from "../../src/lib/precons/overview";
import { preparePreconDeck } from "../../src/lib/precons/start";
import { listFingerprint } from "../../src/lib/profile/fingerprint";
import type { RoleBasis } from "../../src/lib/profile/build";
import { loadDeckProfileFromHead } from "../../src/lib/profile/load";
import type { DeckProfile } from "../../src/lib/profile/types";
import { analyzedOracleIds } from "../../src/lib/notices/log";
import type { SynopsisFacts } from "../../src/lib/synopsis/facts";
import { factsWithSource, synopsisCallSettings } from "../../src/lib/synopsis/generate";
import { SYNOPSIS_CONTRACT_VERSION_STAGES } from "../../src/lib/synopsis/limits";
import { buildSynopsisPrompt } from "../../src/lib/synopsis/prompt";
import { stagesSchemaFor } from "../../src/lib/synopsis/stages";
import { stagesPromptOption } from "../../src/lib/synopsis/stages-run";
import { buildParams, type Params } from "../eval/lib/request.mjs";

/**
 * The contract every precon Overview is written at: 13, the stages shape with the benchmarks'
 * interaction reading (`synopsisPreconContractVersion`, the key the app's readers select by). A stored
 * 12 row is never installed or carried to a new deck; a deck that already holds one keeps reading it.
 */
export const PRECON_OVERVIEW_CONTRACT = SYNOPSIS_CONTRACT_VERSION_STAGES;

/**
 * The role basis every precon Overview is built, copied and carried at: `labels`, the only basis the
 * app counts roles by since `LABEL_ROLE_COUNTS_ENABLED` retired (Hugh 2026-10-31). A row's
 * `role_basis` is still part of its key, and the carry-over attaches only `labels` rows.
 */
export const PRECON_ROLE_BASIS: RoleBasis = "labels";

/** The model call contract 13 makes (`synopsisCallSettings(true)`, as 12 did): model, effort and output ceiling. */
export const preconOverviewCall = synopsisCallSettings(true);

/**
 * The request for a prompt, as `callModel` would send it under contract 13 (`stagesSchemaFor(3, alternates)`:
 * the alternate line is required of the reply exactly when the box has alternates), minus the streaming a
 * batch cannot do. Same model, effort and 16,000-token ceiling as 12: the land and alternate lines add about 100 tokens.
 */
export function preconRequestParams(prompt: { system: string; user: string }, alternates: readonly string[] = []): Params {
  const c = preconOverviewCall;
  return buildParams({ model: c.model, system: prompt.system, user: prompt.user, maxTokens: c.maxTokens, schema: stagesSchemaFor(3, alternates) }, { effort: c.effort });
}

/** The box's alternate commanders (`preconAlternates`), read from this database's catalog rows for `file`. */
export async function readPreconAlternates(file: string): Promise<string[]> {
  const rows = await db.select({
    oracleId: preconCards.oracleId, name: cards.name, isCommander: preconCards.isCommander, foilQuantity: preconCards.foilQuantity,
    commanderLegal: cards.commanderLegal, typeLine: cards.typeLine, oracleText: cards.oracleText, manaCost: cards.manaCost, layout: cards.layout,
  }).from(preconCards).innerJoin(cards, eq(cards.oracleId, preconCards.oracleId)).where(eq(preconCards.fileName, file));
  return preconAlternates(rows);
}

export type PreconRequest =
  | {
    ok: true; file: string; list: string; facts: SynopsisFacts; params: Params; hash: string;
    /** The box's alternate commanders, sorted: in the prompt, the reply schema and so the hash. Empty for most. */
    alternates: string[];
    /** The reading the request was built from (`loadDeckProfileFromHead`, no model): what a start's first
     *  reading would be, stored beside the Overview (`preconReadingColumns`, PR 6a), and the cards it analyzed. */
    profile: DeckProfile; analyzedOracleIds: string[];
    /** The prepared list, for Analyze's size gate: a short one (unmapped copies left out) stores no reading. */
    head: { partnerOracleId: string | null; cards: { oracleId: string; quantity: number }[] };
  }
  | { ok: false; file: string; why: string };

/** Builds `file`'s first request: its started deck's list, reading, facts and prompt. */
export async function buildPreconRequest(file: string): Promise<PreconRequest> {
  let prepared;
  try {
    prepared = await preparePreconDeck(file);
  } catch (e) {
    return { ok: false, file, why: e instanceof Error ? e.message : String(e) };
  }
  const head = { deckId: `precon:${file}`, userId: "catalog", commanderOracleId: prepared.commanderOracleId, partnerOracleId: prepared.partnerOracleId, declaredBracket: null, cards: prepared.cards };
  // A reading or facts read that throws (the labels basis reads `readLabelRoleSets`) is this precon's
  // own failure, never the run's: it has no request, so a stored row for it is marked not current.
  let built;
  let profile: DeckProfile;
  try {
    profile = await loadDeckProfileFromHead(head, process.env);
    built = await factsWithSource(profile, true);
  } catch (e) {
    return { ok: false, file, why: `the reading could not be built: ${e instanceof Error ? e.message : String(e)}` };
  }
  // Contract 13 quotes the benchmarks' interaction reading; a failed label read falls back to the
  // classifier's, which is another reading. Never written (or installed) under the wrong one.
  if (!built.shared) return { ok: false, file, why: "the label read failed, so the benchmarks' interaction reading is unavailable" };
  let alternates: string[];
  try {
    alternates = await readPreconAlternates(file);
  } catch (e) {
    return { ok: false, file, why: `the alternate commanders could not be read: ${e instanceof Error ? e.message : String(e)}` };
  }
  const params = preconRequestParams(buildSynopsisPrompt(built.facts, undefined, { v2: true, contract8: true, stages: stagesPromptOption(built.facts, alternates) }), alternates);
  return {
    ok: true, file, list: listFingerprint(prepared), facts: built.facts, alternates, params, hash: synopsisRequestHash(params),
    profile, analyzedOracleIds: analyzedOracleIds(prepared), head: { partnerOracleId: prepared.partnerOracleId, cards: prepared.cards },
  };
}
