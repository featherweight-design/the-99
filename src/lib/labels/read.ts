import { sql } from "drizzle-orm";
import { db } from "../../db";
import { searchesOnlyLands } from "../bracket/tutor-targets";
import { labelIsFresh, PROMPT_SYSTEM_SHA256 } from "./prompt";
import { isJob } from "./schema";
import { jobRowsOf, type JobRowsByCard } from "../decks/job-tally";
import { fallbackRole, labelRoleSet, roleSetFingerprint, type LabelTargetRole } from "./role-sets";
import type { Job } from "./types";

/** A `card_labels` row with the card inputs its freshness is judged against. */
export type LabelRow = Row;
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
 *   cards got no stand-ins; absent, the text path reads the card, and a body with no job reads as none there too.
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
 * Each FRESH-labelled card's role set under the deck-count rule (`labelRoleSet`: every role job of
 * the four kinds, none on a land face), read through the same freshness rule as `readLabels`, so
 * the index build and the page agree on which labels exist. A card absent from the map has no
 * fresh label.
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

/** What the label pass's role basis reads per card: the fresh label's role set, and the digest the build
 *  records and every check recomputes (`roleSetFingerprint`). */
export type LabelRoleBasis = {
  /** Each FRESH-labelled card's role set, exactly `readLabelRoleSets`' map. */
  sets: Map<string, LabelTargetRole[]>;
  /** `roleSetFingerprint` over the ids asked for: the label sets, and for every other card the role
   *  the targets count it toward (`fallbackRole`, off the card's own text). */
  fingerprint: string;
};

/**
 * The label role sets AND their fingerprint, in one query over every card asked for, labelled or not
 * (a card with no label row, or a stale one, still has text, and its `fallbackRole` is in the digest).
 * The ONE place the fingerprint is computed from the database, so the three that compare it cannot
 * disagree: the index build records it (`deriveAndWriteRoleTargets`), the index copy recomputes it on
 * the target (`targetLabelRefusal`), and a score write recomputes it under its lock (`persistScores`,
 * from `loadPoolRoleBasis`). Freshness is `freshJobsOf`'s, as for every other label read.
 */
export async function readLabelRoleBasis(oracleIds: readonly string[], exec: Executor = db): Promise<LabelRoleBasis> {
  const ids = [...new Set(oracleIds)];
  const sets = new Map<string, LabelTargetRole[]>();
  const fallback = new Map<string, LabelTargetRole | null>();
  if (ids.length > 0) {
    const rows = await exec.execute<Omit<Row, "labels" | "model" | "prompt_version" | "input_hash"> & {
      keywords: string[] | null;
      labels: unknown; model: string | null; prompt_version: string | null; input_hash: string | null;
    }>(sql`
      select c.oracle_id, c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout, c.keywords,
             l.labels, l.model, l.prompt_version, l.input_hash
        from cards c left join card_labels l on l.oracle_id = c.oracle_id
       where c.oracle_id = any(${sql.param(ids)}::uuid[])
    `);
    for (const r of rows.rows) {
      const jobs = r.model !== null && r.prompt_version !== null && r.input_hash !== null
        ? freshJobsOf({ ...r, model: r.model, prompt_version: r.prompt_version, input_hash: r.input_hash })
        : null;
      if (jobs) sets.set(r.oracle_id, labelRoleSet(jobs, r.type_line ?? ""));
      else fallback.set(r.oracle_id, fallbackRole({ typeLine: r.type_line ?? "", oracleText: r.oracle_text, layout: r.layout ?? "normal", keywords: r.keywords ?? [] }));
    }
  }
  return { sets, fingerprint: roleSetFingerprint(ids, sets, fallback) };
}

/**
 * Each FRESH-labelled card's rows under the deck strip's rule (`jobRowsOf`): the map the strip counts
 * with (`loadJobRows`), read here for the profile so its role counts are the strip's. A card absent
 * from the map has no fresh label.
 */
export async function readLabelJobRows(oracleIds: readonly string[], exec: Executor = db): Promise<JobRowsByCard> {
  const jobs = freshLabels(await readLabelRows(oracleIds, exec));
  return Object.fromEntries([...jobs].map(([id, j]) => [id, jobRowsOf(j)]));
}

/**
 * The pure half of `readLabels`, so staleness and validity are testable without a database.
 * `registry` is `PROMPT_SYSTEM_SHA256` in the app; a test passes one holding a later version.
 */
export function freshLabels(rows: readonly Row[], registry: Readonly<Record<string, string>> = PROMPT_SYSTEM_SHA256): Map<string, Job[]> {
  const out = new Map<string, Job[]>();
  for (const r of rows) {
    const jobs = freshJobsOf(r, registry);
    if (jobs) out.set(r.oracle_id, jobs);
  }
  return out;
}

/** One row's fresh jobs by `freshLabels`' rule, or null when the row is stale, malformed or holds no job. */
export function freshJobsOf(r: Row, registry: Readonly<Record<string, string>> = PROMPT_SYSTEM_SHA256): Job[] | null {
  const card = { oracleId: r.oracle_id, name: r.name, mana_cost: r.mana_cost, type_line: r.type_line, oracle_text: r.oracle_text, layout: r.layout };
  if (!labelIsFresh({ model: r.model, promptVersion: r.prompt_version, inputHash: r.input_hash }, card, registry)) return null;
  if (!Array.isArray(r.labels) || !r.labels.every(isJob)) return null;
  // A land search the model called a tutor (Hugh, 2026-10-03): the job is dropped here, free,
  // rather than paid for again under a new prompt. Land-only by the 2026-09-22 ruling.
  // A row left with no job by that drop is left OUT, so the text path compares the card and
  // reads it as the ramp it is; an empty row would match nothing and refuse every pair.
  const jobs = searchesOnlyLands(r.oracle_text) ? r.labels.filter((j) => j.kind !== "tutor") : r.labels;
  // Absent, whatever emptied it (the drop above, or a stored `[]`): see the doc comment.
  return jobs.length === 0 ? null : jobs;
}
