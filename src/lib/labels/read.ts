import { sql } from "drizzle-orm";
import { db } from "../../db";
import { searchesOnlyLands } from "../bracket/tutor-targets";
import { labelIsFresh, PROMPT_SYSTEM_SHA256 } from "./prompt";
import { isJob } from "./schema";
import { labelRoleSet, type LabelTargetRole } from "./role-sets";
import type { Job } from "./types";

/**
 * Whether the stand-ins sheet reads card labels (the run plan's Task 5). OFF for anything but the
 * exact string `'true'`, server-side and read per request, like `swapToolsEnabled`.
 *
 * Its own switch rather than `CARD_LABELS_ENABLED`, which is the labelling workflow's cron kill
 * switch (a repository variable): gating the app on it would tie what players see to whether the
 * cron runs. Released after `SWAP_TOOLS_ENABLED` and after the backfill is published (d9,
 * 2026-10-02). Off, nothing here is called and every comparison takes the text path.
 */
export function standInLabelsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.STAND_IN_LABELS_ENABLED === "true";
}

/**
 * Whether the deck page reads card labels for its Consider panel (card labels item 7). OFF for anything
 * but the exact string `'true'`, server-side and read per request.
 *
 * Its own switch rather than `STAND_IN_LABELS_ENABLED`, so these surfaces release on their own walk,
 * not the stand-ins sheet's (every feature behind its own switch, the 2026-09-24 release ruling). Off,
 * no label and no lens is read, and the page is exactly as it was before labels reached it.
 */
export function labelSurfacesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LABEL_SURFACES_ENABLED === "true";
}

type Row = {
  oracle_id: string; labels: unknown; model: string; prompt_version: string; input_hash: string;
  name: string; mana_cost: string | null; type_line: string; oracle_text: string | null; layout: string;
};

/**
 * The FRESH labels of `oracleIds`, one query. A card is absent from the map when:
 * - it has no `card_labels` row;
 * - its row is STALE (`labelIsFresh`): `input_hash` no longer equals what the card's current inputs
 *   produce under the row's OWN prompt version and model, so the label describes text the card no
 *   longer has. A newer prompt version or another current model does not stale it (Hugh,
 *   2026-10-04): a row stays fresh under the prompt that wrote it until it is deliberately redone.
 *   A row of a version the registry does not hold is stale;
 * - any of its jobs fails `validateJob`, so a malformed row is never half-read;
 * - it holds NO job: a stored `[]` is UNLABELLED, never "a fresh label with no jobs". Measured on
 *   staging's 3,237 `[]` rows (2026-10-03): 96% are the model answering no job, some rightly (a
 *   vanilla body) and some not (Lightning Bolt, a plain removal spell), and 4% had every job fail
 *   `validateJob` (Rampant Growth, Sakura-Tribe Elder: a `to` on a ramp job), which the collector
 *   stored as `[]` too until v8, when `normalizeJob` began stripping that field instead. Read as labelled, `[]` matches nothing and refuses every pair, so those
 *   cards got no stand-ins; absent, the text path reads the card, exactly as with the switch off,
 *   and a body with no job reads as none there too.
 *
 * A `tutor` job on a card whose every library search finds only lands is dropped from an
 * otherwise fresh row (`searchesOnlyLands`): that card is ramp, and the prompt says so. A row the
 * drop leaves with no job is absent, like a stale one, so the text path reads the card as ramp.
 *
 * Absent means the text path compares that card's pairs (the run plan's Task 5, Q1).
 */
export async function readLabels(oracleIds: readonly string[]): Promise<Map<string, Job[]>> {
  return freshLabels(await readLabelRows(oracleIds));
}

/** Anything that can run a raw query on this schema: the app's `db`, or a transaction on another
 *  database (a copy reads the TARGET's labels inside its publish). */
type Executor = Pick<typeof db, "execute">;

async function readLabelRows(oracleIds: readonly string[], exec: Executor = db): Promise<Row[]> {
  const ids = [...new Set(oracleIds)];
  if (ids.length === 0) return [];
  const rows = await exec.execute<Row>(sql`
    select l.oracle_id, l.labels, l.model, l.prompt_version, l.input_hash,
           c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout
      from card_labels l join cards c on c.oracle_id = l.oracle_id
     where l.oracle_id = any(${sql.param(ids)}::uuid[])
  `);
  return rows.rows;
}

/**
 * Each FRESH-labelled card's role set under the deck-count rule (`labelRoleSet`), read through
 * the same freshness rule as `readLabels`, so the index build and the page agree on which labels
 * exist. A card absent from the map has no fresh label.
 */
export async function readLabelRoleSets(
  oracleIds: readonly string[],
  exec: Executor = db,
): Promise<Map<string, LabelTargetRole[]>> {
  const rows = await readLabelRows(oracleIds, exec);
  const jobs = freshLabels(rows);
  const out = new Map<string, LabelTargetRole[]>();
  for (const r of rows) {
    const j = jobs.get(r.oracle_id);
    if (j) out.set(r.oracle_id, labelRoleSet(j, r.type_line ?? ""));
  }
  return out;
}

/**
 * The pure half of `readLabels`, so staleness and validity are testable without a database.
 * `registry` is `PROMPT_SYSTEM_SHA256` in the app; a test passes one holding a later version.
 */
export function freshLabels(rows: readonly Row[], registry: Readonly<Record<string, string>> = PROMPT_SYSTEM_SHA256): Map<string, Job[]> {
  const out = new Map<string, Job[]>();
  for (const r of rows) {
    const card = { oracleId: r.oracle_id, name: r.name, mana_cost: r.mana_cost, type_line: r.type_line, oracle_text: r.oracle_text, layout: r.layout };
    if (!labelIsFresh({ model: r.model, promptVersion: r.prompt_version, inputHash: r.input_hash }, card, registry)) continue;
    if (!Array.isArray(r.labels) || !r.labels.every(isJob)) continue;
    // A land search the model called a tutor (Hugh, 2026-10-03): the job is dropped here, free,
    // rather than paid for again under a new prompt. Land-only by the 2026-09-22 ruling.
    // A row left with no job by that drop is left OUT, so the text path compares the card and
    // reads it as the ramp it is; an empty row would match nothing and refuse every pair.
    const jobs = searchesOnlyLands(r.oracle_text) ? r.labels.filter((j) => j.kind !== "tutor") : r.labels;
    // Absent, whatever emptied it (the drop above, or a stored `[]`): see the doc comment.
    if (jobs.length === 0) continue;
    out.set(r.oracle_id, jobs);
  }
  return out;
}
