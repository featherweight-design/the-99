import { sql } from "drizzle-orm";
import { db } from "../../db";
import { searchesOnlyLands } from "../bracket/tutor-targets";
import { labelInputHash } from "./prompt";
import { isJob } from "./schema";
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

type Row = {
  oracle_id: string; labels: unknown; model: string; input_hash: string;
  name: string; mana_cost: string | null; type_line: string; oracle_text: string | null; layout: string;
};

/**
 * The FRESH labels of `oracleIds`, one query. A card is absent from the map when:
 * - it has no `card_labels` row;
 * - its row is STALE: `input_hash` no longer equals what the card's current inputs produce under the
 *   row's own model (`labelInputHash`), so the label describes text the card no longer has, or a
 *   prompt (its version or its SYSTEM instruction) the row predates;
 * - any of its jobs fails `validateJob`, so a malformed row is never half-read.
 *
 * A `tutor` job on a card whose every library search finds only lands is dropped from an
 * otherwise fresh row (`searchesOnlyLands`): that card is ramp, and the prompt says so. A row the
 * drop leaves with no job is absent, like a stale one, so the text path reads the card as ramp.
 *
 * Absent means the text path compares that card's pairs (the run plan's Task 5, Q1).
 */
export async function readLabels(oracleIds: readonly string[]): Promise<Map<string, Job[]>> {
  const ids = [...new Set(oracleIds)];
  if (ids.length === 0) return new Map();
  const rows = await db.execute<Row>(sql`
    select l.oracle_id, l.labels, l.model, l.input_hash,
           c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout
      from card_labels l join cards c on c.oracle_id = l.oracle_id
     where l.oracle_id = any(${sql.param(ids)}::uuid[])
  `);
  return freshLabels(rows.rows);
}

/** The pure half of `readLabels`, so staleness and validity are testable without a database. */
export function freshLabels(rows: readonly Row[]): Map<string, Job[]> {
  const out = new Map<string, Job[]>();
  for (const r of rows) {
    const card = { oracleId: r.oracle_id, name: r.name, mana_cost: r.mana_cost, type_line: r.type_line, oracle_text: r.oracle_text, layout: r.layout };
    if (labelInputHash(card, r.model) !== r.input_hash) continue;
    if (!Array.isArray(r.labels) || !r.labels.every(isJob)) continue;
    // A land search the model called a tutor (Hugh, 2026-10-03): the job is dropped here, free,
    // rather than paid for again under a new prompt. Land-only by the 2026-09-22 ruling.
    // A row left with no job by that drop is left OUT, so the text path compares the card and
    // reads it as the ramp it is; an empty row would match nothing and refuse every pair.
    const jobs = searchesOnlyLands(r.oracle_text) ? r.labels.filter((j) => j.kind !== "tutor") : r.labels;
    if (jobs.length === 0 && r.labels.length > 0) continue;
    out.set(r.oracle_id, jobs);
  }
  return out;
}
