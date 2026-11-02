import { SWITCHES, switchDefaultsOn, switchFallbackOn, type SwitchName } from "./registry";
import { KILL, KILLED, type RowValue } from "./resolve";

/**
 * The seed that moves each switch's default from the environment into the database (plan
 * `2026-10-31-feature-flags-in-db.md`, "Seeding: no human reads a Vercel value"). It runs after the
 * migrations on every production and staging build (`scripts/vercel-migrate.ts`, against that project's own
 * branch and with its own env loaded), and locally by `pnpm db:seed:flags` (the branch `.env` names).
 *
 * Per switch with no app-wide row it inserts one whose value is what the environment serves today, read the
 * way the switch's own flag function read it: on for the exact string `true`, off for any other value set, and the
 * switch's compiled fallback when unset or empty. A variable at the kill value `off` carries its kill into the
 * database: the app-wide row becomes `killed`, overwriting any value, because the resolver no longer reads the
 * variable (plan PR 2) and the kill must not be dropped. Lifting it is then a write to that row.
 *
 * A `defaultOn` switch is NOT seeded (`MODEL_CALLS_ENABLED`, the emergency stop for model spend; orchestrator,
 * 2026-11-02). With no row it is on, and its variable at `off` or `false` stops it above every row with no database
 * read (`envStops`).
 *
 * It never overwrites: a switch that already has an app-wide row keeps it (`on conflict do nothing` on the
 * target key, which treats the app row's null group and user as equal). One statement per switch, so a row the
 * database refuses fails that switch alone, and the log names it. So it is idempotent, and a seeded row holds what
 * the switch served from its variable.
 */
export function seedValue(name: SwitchName, value: string | undefined): RowValue {
  if (value === KILL) return KILLED;
  // Unset or empty: what the switch serves with no row since the env layer went (plan PR 2), its compiled fallback.
  if (value === undefined || value === "") return switchFallbackOn(name) ? "on" : "off";
  return value === "true" ? "on" : "off";
}

/** The switches the seed covers: every switch but a `defaultOn` one. */
export const SEEDED: readonly SwitchName[] = SWITCHES.flatMap(({ name }) => (switchDefaultsOn(name) ? [] : [name]));

/** `inserted`: written by this run. `kept`: an app-wide row was there. `killed`: the variable's kill set the row to `killed`. */
export type SeedOutcome = "inserted" | "kept" | "killed" | "failed";
export type SeedLine = { name: SwitchName; value: RowValue; outcome: SeedOutcome; error?: string };

export const SEED_UPDATED_BY = "seed";

export const SEED_SQL = `insert into flag_overrides ("switch", scope, group_id, user_id, value, note, updated_by)
values ($1, 'app', null, null, $2, $3, $4)
on conflict on constraint flag_overrides_target_key do nothing
returning "switch"`;

/** The env kill carried into the row: inserted or overwritten as `killed`. */
export const SEED_KILL_SQL = `insert into flag_overrides ("switch", scope, group_id, user_id, value, note, updated_by)
values ($1, 'app', null, null, 'killed', $2, $3)
on conflict on constraint flag_overrides_target_key do update set value = 'killed', note = excluded.note, updated_by = excluded.updated_by, updated_at = now()
returning "switch"`;

export type SeedQuery = (text: string, params: unknown[]) => Promise<readonly { switch: string }[]>;

/**
 * Seeds every switch with no app-wide row, and says per switch what happened. `deadlineAt` (epoch ms) bounds the whole
 * run: a statement still unanswered then fails, and every switch after it fails without being sent, so nothing is
 * written once the deadline has passed but that one statement, and every switch still gets its line.
 */
export async function seedFlagDefaults(query: SeedQuery, env: NodeJS.ProcessEnv, today: string, deadlineAt = Infinity, now = Date.now): Promise<SeedLine[]> {
  const lines: SeedLine[] = [];
  for (const name of SEEDED) {
    const value = seedValue(name, env[name]);
    const left = deadlineAt - now();
    if (left <= 0) {
      lines.push({ name, value, outcome: "failed", error: "past the deadline" });
      continue;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const rows = await Promise.race([
        value === KILLED
          ? query(SEED_KILL_SQL, [name, `killed from env ${today}`, SEED_UPDATED_BY])
          : query(SEED_SQL, [name, value, `seeded from env ${today}`, SEED_UPDATED_BY]),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("no answer by the deadline")), left);
        }),
      ]);
      lines.push({ name, value, outcome: value === KILLED ? "killed" : rows.length > 0 ? "inserted" : "kept" });
    } catch (error) {
      lines.push({ name, value, outcome: "failed", error: String(error) });
    } finally {
      clearTimeout(timer);
    }
  }
  return lines;
}

/** One build-log line per switch. A kept row's value is the env's reading, not the row's: the row was left as it is. */
export function seedLogLines(lines: readonly SeedLine[]): string[] {
  return lines.map((l) => {
    if (l.outcome === "inserted") return `flag seed: ${l.name} inserted ${l.value}`;
    if (l.outcome === "kept") return `flag seed: ${l.name} kept (app row exists; env reads ${l.value})`;
    if (l.outcome === "killed") return `flag seed: ${l.name} killed (env is off; the app-wide row is now killed)`;
    return `flag seed: ${l.name} failed (env reads ${l.value}): ${l.error ?? "unknown"}`;
  });
}
