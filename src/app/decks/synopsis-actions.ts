"use server";

import { requireUserId } from "../../lib/auth";
import { analysisTabEnabled } from "../../lib/decks/analysis-flag";
import { isUuid } from "../../lib/uuid";
import { retrySynopsisFor, writeSynopsisFor, type WriteResult } from "../../lib/synopsis/generate";
import { readSynopsisState, readVersionSynopsis, type SynopsisState } from "../../lib/synopsis/read";

/**
 * The synopsis's four actions (sub-project 6). Thin: every rule lives in `src/lib/synopsis`, so
 * `probe:synopsis` proves the same functions these call.
 *
 * NONE OF THEM REVALIDATES. Nothing a page renders on the server reads a synopsis: the tab and the
 * modal fetch it through `fetchSynopsis`, so there is no route to invalidate, and a revalidation
 * would only ship the caller's whole page back in the action's reply.
 *
 * THE FLAG GATES THEM, as it gates the profile's own actions: the synopsis lives in the Analysis
 * tab, and with the tab off there is nothing to write for.
 */

type Refused = { kind: "not_found" } | { kind: "disabled" };

export async function writeSynopsis(deckId: string): Promise<WriteResult | Refused> {
  if (!analysisTabEnabled()) return { kind: "disabled" };
  if (!isUuid(deckId)) return { kind: "not_found" };
  return writeSynopsisFor(deckId, await requireUserId());
}

export async function retrySynopsisSections(deckId: string, synopsisId: string): Promise<WriteResult | Refused> {
  if (!analysisTabEnabled()) return { kind: "disabled" };
  if (!isUuid(deckId) || !isUuid(synopsisId)) return { kind: "not_found" };
  return retrySynopsisFor(deckId, await requireUserId(), synopsisId);
}

export async function fetchSynopsis(deckId: string): Promise<SynopsisState | Refused> {
  if (!analysisTabEnabled()) return { kind: "disabled" };
  if (!isUuid(deckId)) return { kind: "not_found" };
  return (await readSynopsisState(deckId, await requireUserId())) ?? { kind: "not_found" };
}

export async function fetchVersionSynopsis(versionId: string) {
  if (!analysisTabEnabled()) return { kind: "disabled" as const };
  if (!isUuid(versionId)) return { kind: "not_found" as const };
  const found = await readVersionSynopsis(versionId, await requireUserId());
  return found ? { kind: "ok" as const, ...found } : { kind: "not_found" as const };
}
