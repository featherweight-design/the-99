// The serving read of `judged_labels`: the themes that SURVIVED the verifier, and only those. Pass 1's loose `themes`
// are never read. A row serves nothing unless it is verified and FRESH, the rule `freshJobsOf` applies to a card label:
// the stored input hash must equal the hash of the card as the catalog has it now, under the current prompt version and
// the model that answered, so a card whose text moved (or a prompt edited since) counts as no answer, not a stale one.
import { JUDGED_PROMPT_VERSION, judgedInputHash } from "./judged";
import { JUDGED_THEMES, type JudgedTheme } from "./judged-themes";

/** A `judged_labels` row with the card inputs its freshness is judged against. */
export type JudgedRow = {
  oracleId: string;
  verifiedThemes: unknown;
  model: string;
  promptVersion: string;
  inputHash: string;
  name: string;
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  layout: string;
};

/** The verified themes of a FRESH row; none for a row that is unverified, stale or malformed. */
export function freshVerifiedThemes(r: JudgedRow): JudgedTheme[] {
  if (!Array.isArray(r.verifiedThemes) || r.promptVersion !== JUDGED_PROMPT_VERSION) return [];
  const hash = judgedInputHash(
    { oracleId: r.oracleId, name: r.name, mana_cost: r.manaCost, type_line: r.typeLine, oracle_text: r.oracleText, layout: r.layout },
    r.model,
    r.promptVersion,
  );
  if (hash !== r.inputHash) return [];
  const known: readonly string[] = JUDGED_THEMES;
  return [...new Set(r.verifiedThemes.filter((t): t is JudgedTheme => typeof t === "string" && known.includes(t)))];
}
