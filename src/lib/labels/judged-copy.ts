/**
 * What a judged-labels copy installs, and what it refuses to. PURE: no database, no API.
 *
 * Judged labels are paid for once, on staging, and carried to production. A row is installed only
 * when it is complete (the verifier pass has read it) and describes the target's OWN card text,
 * under the current prompt version and the row's own model. Nothing is ever deleted, and a
 * mismatch is reported rather than rebuilt: rebuilding on production is the double payment this
 * copy exists to prevent.
 */
import type { CardForPrompt } from "./prompt";
import { JUDGED_PROMPT_VERSION, judgedInputHash } from "./judged";

/** One `judged_labels` row as the source holds it. */
export type SourceJudged = {
  oracleId: string;
  themes: string[];
  verifiedThemes: string[] | null;
  verifiedAt: Date | null;
  model: string;
  promptVersion: string;
  inputHash: string;
};

/** A card as the TARGET's own catalog holds it. */
export type JudgedTargetCard = CardForPrompt & { oracleId: string };

export type JudgedCopyPlan = {
  /** Complete rows whose hash matches the target's own card text. */
  install: SourceJudged[];
  /** Rows the verifier has not finished (`verified_themes` null). Left on staging until it has. */
  unverified: string[];
  /** Rows written under another prompt version than this checkout's. Not copied, not a catalog difference. */
  otherVersion: string[];
  /** Rows whose hash does not match the target's card: the label describes text the target lacks. */
  mismatched: string[];
  /** Rows for cards the target's catalog does not hold. */
  notInTargetCatalog: string[];
};

export function planJudgedCopy(
  source: readonly SourceJudged[],
  targetCards: readonly JudgedTargetCard[],
): JudgedCopyPlan {
  const cardById = new Map(targetCards.map((c) => [c.oracleId, c]));
  const plan: JudgedCopyPlan = { install: [], unverified: [], otherVersion: [], mismatched: [], notInTargetCatalog: [] };
  for (const row of source) {
    if (row.promptVersion !== JUDGED_PROMPT_VERSION) { plan.otherVersion.push(row.oracleId); continue; }
    if (row.verifiedThemes === null) { plan.unverified.push(row.oracleId); continue; }
    const card = cardById.get(row.oracleId);
    if (card === undefined) { plan.notInTargetCatalog.push(row.oracleId); continue; }
    if (judgedInputHash(card, row.model, row.promptVersion) !== row.inputHash) { plan.mismatched.push(row.oracleId); continue; }
    plan.install.push(row);
  }
  return plan;
}
