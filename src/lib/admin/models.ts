import { READ_JUDGE_EFFORT, READ_JUDGE_MODEL, READ_SHORTLIST_EFFORT, READ_SHORTLIST_MODEL } from "../intake/limits";
import { FITS_READ_EFFORT, FITS_READ_MODEL } from "../swaps/fits-read-limits";
import { SYNOPSIS_EFFORT, SYNOPSIS_EFFORT_V7, SYNOPSIS_MODEL, SYNOPSIS_MODEL_V7 } from "../synopsis/model";
import { TUNING_EFFORT, TUNING_MODEL } from "../tuning/limits";
import type { CostDetail, Origin } from "./costs-detail-rule";

/**
 * The Models page's registry (admin STATES M1, M2; plan PR 10). Pure and read only.
 *
 * Every app feature's model and effort is IMPORTED from the constant the call itself reads, so a
 * model change shows here the moment it ships, with nothing to keep in step. The two script jobs
 * live in `scripts/`, which `src/` never imports, so their models are written out here and
 * `models.test.ts` reads each script and fails when the id it names is not in it.
 *
 * `at` names the file the constant lives in, never a line: lines drift with every edit.
 */

/** Card labels' default model: `MODEL` in `scripts/lib/card-labels-build.ts` (a `LABEL_MODEL` override aside). */
export const CARD_LABELS_MODEL = "claude-sonnet-4-5";
/** Commander prose's model: `MODEL` in `scripts/generate-commander-prose.ts`. */
export const PROSE_MODEL = "claude-sonnet-4-6";

/** Which `model_calls` rows (and their parts) a row's spend is summed from, as the Costs detail splits them. */
export type SpendMatch =
  | { feature: string; origin: Origin; models?: readonly string[]; steps?: readonly string[] }
  /** Card labels: the batch runs plus the manual collector's rows, the Costs detail's own labels series. */
  | { labels: true };

export type ModelRowKey =
  | "overview8"
  | "overview7"
  | "tuning"
  | "cuts"
  | "shortlist"
  | "judgement"
  | "fitsRead"
  | "labels"
  | "prose";

export type ModelRowDef = {
  key: ModelRowKey;
  origin: Origin;
  /** A model id, and for a batch job the word that says so (`modelNote`). */
  model: string;
  batch?: true;
  /** Null: the call sets none. */
  effort: string | null;
  at: string;
  spend: SpendMatch;
};

export const MODEL_ROWS: readonly ModelRowDef[] = [
  {
    key: "overview8", origin: "player", model: SYNOPSIS_MODEL, effort: SYNOPSIS_EFFORT,
    at: "src/lib/synopsis/model.ts · src/lib/synopsis/generate.ts · OVERVIEW_V2",
    spend: { feature: "synopsis", origin: "player", models: [SYNOPSIS_MODEL] },
  },
  {
    key: "overview7", origin: "player", model: SYNOPSIS_MODEL_V7, effort: SYNOPSIS_EFFORT_V7,
    at: "src/lib/synopsis/model.ts",
    spend: { feature: "synopsis", origin: "player", models: [SYNOPSIS_MODEL_V7] },
  },
  {
    key: "tuning", origin: "player", model: TUNING_MODEL, effort: TUNING_EFFORT,
    at: "src/lib/tuning/limits.ts · TUNING",
    spend: { feature: "tuning", origin: "player" },
  },
  {
    key: "cuts", origin: "player", model: TUNING_MODEL, effort: TUNING_EFFORT,
    at: "src/lib/tuning/limits.ts · src/app/decks/cuts-actions.ts · PROPOSED_CUTS",
    spend: { feature: "proposed_cuts", origin: "player" },
  },
  {
    key: "shortlist", origin: "player", model: READ_SHORTLIST_MODEL, effort: READ_SHORTLIST_EFFORT,
    at: "src/lib/intake/limits.ts · HELP_ME_CHOOSE",
    spend: { feature: "intake", origin: "player", steps: ["shortlist"] },
  },
  {
    key: "judgement", origin: "player", model: READ_JUDGE_MODEL, effort: READ_JUDGE_EFFORT,
    at: "src/lib/intake/limits.ts · HELP_ME_CHOOSE",
    spend: { feature: "intake", origin: "player", steps: ["judgement"] },
  },
  {
    key: "fitsRead", origin: "player", model: FITS_READ_MODEL, effort: FITS_READ_EFFORT,
    at: "src/lib/swaps/fits-read-limits.ts · FIND_A_DECK_READ",
    spend: { feature: "fits_read", origin: "player" },
  },
  {
    key: "labels", origin: "system", model: CARD_LABELS_MODEL, batch: true, effort: null,
    at: "scripts/lib/card-labels-build.ts · .github/workflows/card-labels.yml",
    spend: { labels: true },
  },
  {
    key: "prose", origin: "system", model: PROSE_MODEL, effort: null,
    at: "scripts/generate-commander-prose.ts · PROSE_MAX_USD",
    spend: { feature: "prose", origin: "system" },
  },
];

/** The scripts the two jobs' models are read from, for the drift guard. */
export const SCRIPT_MODEL_FILES: Readonly<Partial<Record<ModelRowKey, string>>> = {
  labels: "scripts/lib/card-labels-build.ts",
  prose: "scripts/generate-commander-prose.ts",
};

/** The GitHub repository variables the jobs read, each with the workflow that reads it. */
export const JOB_VARIABLES = [
  { name: "CATALOG_REFRESH_ENABLED", readAt: ".github/workflows/catalog-refresh.yml" },
  { name: "COMBO_REFRESH_ENABLED", readAt: ".github/workflows/combo-refresh.yml" },
  { name: "COMMANDER_INDEX_ENABLED", readAt: ".github/workflows/commander-index.yml" },
  { name: "CARD_LABELS_ENABLED", readAt: ".github/workflows/card-labels.yml" },
  { name: "TUNING_CHECK_ENABLED", readAt: ".github/workflows/tuning-contract.yml" },
  { name: "PROSE_MAX_USD", readAt: ".github/workflows/commander-index.yml" },
] as const;

export type JobVariable = (typeof JOB_VARIABLES)[number]["name"];
export const JOB_VARIABLE_NAMES: readonly JobVariable[] = JOB_VARIABLES.map((v) => v.name);

/**
 * A row's spend this month, in micro-dollars, from the Costs detail the Costs page draws. `partial`
 * when a label run is still collecting or could not be priced, as the Costs page marks it.
 */
export function rowSpend(def: ModelRowDef, detail: Pick<CostDetail, "features" | "series" | "labelsIncomplete">): { micro: number; partial: boolean } {
  const m = def.spend;
  if ("labels" in m) return { micro: detail.series.labels, partial: detail.labelsIncomplete };
  const micro = detail.features
    .filter((f) => f.feature === m.feature && f.origin === m.origin)
    .filter((f) => !m.models || m.models.includes(f.model))
    .filter((f) => !m.steps || (f.step !== null && m.steps.includes(f.step)))
    .reduce((n, f) => n + f.micro, 0);
  return { micro, partial: false };
}
