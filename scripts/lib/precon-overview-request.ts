/**
 * One precon's Overview request, built from THIS database's catalog exactly as an Analyze press's
 * write would build it, and its hash. Shared by the build (which sends it) and the copy (which
 * rebuilds it on the target to check that a source row still fits there), so the two can never
 * disagree on what "the same inputs" means.
 *
 * Reads through `src/db`, so import it (dynamically) after DATABASE_URL names the database.
 */
import { synopsisRequestHash } from "../../src/lib/precons/overview";
import { preparePreconDeck } from "../../src/lib/precons/start";
import { listFingerprint } from "../../src/lib/profile/fingerprint";
import { loadDeckProfileFromHead } from "../../src/lib/profile/load";
import type { SynopsisFacts } from "../../src/lib/synopsis/facts";
import { factsWithSource, synopsisCallSettings } from "../../src/lib/synopsis/generate";
import { SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS } from "../../src/lib/synopsis/limits";
import { buildSynopsisPrompt } from "../../src/lib/synopsis/prompt";
import { synopsisResponseSchemaV8Wire } from "../../src/lib/synopsis/response-schema";
import { buildParams, type Params } from "../eval/lib/request.mjs";

/** The contract every precon Overview is written at: v2 with the evidence benchmarks, what production writes. */
export const PRECON_OVERVIEW_CONTRACT = SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS;

/** The model call contract 12 makes (`synopsisCallSettings(true)`): model, effort and output ceiling. */
export const preconOverviewCall = synopsisCallSettings(true);

/** The request for a prompt, as `callModel` would send it under contract 12, minus the streaming a batch cannot do. */
export function preconRequestParams(prompt: { system: string; user: string }): Params {
  const c = preconOverviewCall;
  return buildParams({ model: c.model, system: prompt.system, user: prompt.user, maxTokens: c.maxTokens, schema: synopsisResponseSchemaV8Wire }, { effort: c.effort });
}

export type PreconRequest =
  | { ok: true; file: string; list: string; facts: SynopsisFacts; params: Params; hash: string }
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
  const built = await factsWithSource(await loadDeckProfileFromHead(head, process.env), true, true);
  // Contract 12 quotes the benchmarks' interaction reading; a failed label read falls back to the
  // classifier's, which is another contract. Never written (or installed) under the wrong one.
  if (!built.shared) return { ok: false, file, why: "the label read failed, so contract 12's interaction reading is unavailable" };
  const params = preconRequestParams(buildSynopsisPrompt(built.facts, undefined, { v2: true, contract8: true }));
  return { ok: true, file, list: listFingerprint(prepared), facts: built.facts, params, hash: synopsisRequestHash(params) };
}
