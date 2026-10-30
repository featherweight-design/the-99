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
import type { RoleBasis } from "../../src/lib/profile/build";
import { loadDeckProfileFromHead } from "../../src/lib/profile/load";
import type { DeckProfile } from "../../src/lib/profile/types";
import { analyzedOracleIds } from "../../src/lib/notices/log";
import type { SynopsisFacts } from "../../src/lib/synopsis/facts";
import { factsWithSource, synopsisCallSettings } from "../../src/lib/synopsis/generate";
import { SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS } from "../../src/lib/synopsis/limits";
import { buildSynopsisPrompt } from "../../src/lib/synopsis/prompt";
import { synopsisResponseSchemaV8Wire } from "../../src/lib/synopsis/response-schema";
import { buildParams, type Params } from "../eval/lib/request.mjs";

/** The contract every precon Overview is written at: v2 with the evidence benchmarks, what production writes. */
export const PRECON_OVERVIEW_CONTRACT = SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS;

/**
 * The role basis a run builds at: `PRECON_OVERVIEW_ROLE_BASIS`, `labels` or `classifier`, never
 * defaulted. The reading's roles reach the prompt, so the basis is an input like any other: the build
 * writes one basis's rows, the copy rebuilds the target's request at the row's own basis, and the
 * carry-over attaches a row only to an owner on that basis. The app resolves it from
 * `LABEL_ROLE_COUNTS_ENABLED`, a Vercel variable a workflow cannot read, so the run is told.
 */
export function preconRoleBasis(value: string | undefined): RoleBasis {
  if (value === "labels" || value === "classifier") return value;
  throw new Error(`precon overviews: PRECON_OVERVIEW_ROLE_BASIS must be "labels" or "classifier", not ${value === undefined ? "unset" : JSON.stringify(value)}`);
}

/** `env` with the role-count switch set to `basis`, so the reading is built at exactly that basis. */
export const envAtBasis = (env: NodeJS.ProcessEnv, basis: RoleBasis): NodeJS.ProcessEnv =>
  ({ ...env, LABEL_ROLE_COUNTS_ENABLED: basis === "labels" ? "true" : "" });

/** The model call contract 12 makes (`synopsisCallSettings(true)`): model, effort and output ceiling. */
export const preconOverviewCall = synopsisCallSettings(true);

/** The request for a prompt, as `callModel` would send it under contract 12, minus the streaming a batch cannot do. */
export function preconRequestParams(prompt: { system: string; user: string }): Params {
  const c = preconOverviewCall;
  return buildParams({ model: c.model, system: prompt.system, user: prompt.user, maxTokens: c.maxTokens, schema: synopsisResponseSchemaV8Wire }, { effort: c.effort });
}

export type PreconRequest =
  | {
    ok: true; file: string; list: string; facts: SynopsisFacts; params: Params; hash: string;
    /** The reading the request was built from (`loadDeckProfileFromHead`, no model): what a start's first
     *  reading would be, stored beside the Overview (`preconReadingColumns`, PR 6a), and the cards it analyzed. */
    profile: DeckProfile; analyzedOracleIds: string[];
    /** The prepared list, for Analyze's size gate: a short one (unmapped copies left out) stores no reading. */
    head: { partnerOracleId: string | null; cards: { oracleId: string; quantity: number }[] };
  }
  | { ok: false; file: string; why: string };

/** Builds `file`'s first request: its started deck's list, reading, facts and prompt. */
export async function buildPreconRequest(file: string, basis: RoleBasis): Promise<PreconRequest> {
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
    profile = await loadDeckProfileFromHead(head, envAtBasis(process.env, basis));
    built = await factsWithSource(profile, true);
  } catch (e) {
    return { ok: false, file, why: `the reading could not be built: ${e instanceof Error ? e.message : String(e)}` };
  }
  // Contract 12 quotes the benchmarks' interaction reading; a failed label read falls back to the
  // classifier's, which is another contract. Never written (or installed) under the wrong one.
  if (!built.shared) return { ok: false, file, why: "the label read failed, so contract 12's interaction reading is unavailable" };
  const params = preconRequestParams(buildSynopsisPrompt(built.facts, undefined, { v2: true, contract8: true }));
  return {
    ok: true, file, list: listFingerprint(prepared), facts: built.facts, params, hash: synopsisRequestHash(params),
    profile, analyzedOracleIds: analyzedOracleIds(prepared), head: { partnerOracleId: prepared.partnerOracleId, cards: prepared.cards },
  };
}
