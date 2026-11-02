import { SWITCHES, switchDefaultsOn, type SwitchName } from "./registry";
import type { OverrideValue } from "./resolve";

/**
 * The seed that moves each switch's default from the environment into the database (plan
 * `2026-10-31-feature-flags-in-db.md`, "Seeding: no human reads a Vercel value"). It runs after the
 * migrations on every production and staging build (`scripts/vercel-migrate.ts`, against that project's own
 * branch and with its own env loaded) and after `pnpm db:migrate` locally.
 *
 * Per switch with no app-wide row it inserts one whose value is what the environment serves today, read the
 * way the switch's own flag function reads it with no rows: on for the exact string `true`. A variable set to
 * the kill value `off` is seeded `off`, never `killed`: the env kill still stands above every row while the
 * env layer remains.
 *
 * A `defaultOn` switch is NOT seeded (`MODEL_CALLS_ENABLED`, the emergency stop for model spend; orchestrator,
 * 2026-11-02). With no row it is on, as its flag function decides, and the environment stops it with no
 * database read: `off` is the kill above every row, and `false` is its soft stop, which an app-wide On row
 * would beat. Seeding it On would silently disarm that `false`.
 *
 * It never overwrites: a switch that already has an app-wide row keeps it (`on conflict do nothing` on the
 * target key, which treats the app row's null group and user as equal). So it is idempotent, and while the
 * environment is still read below the app row, a seeded row that matches the environment changes nothing
 * served.
 */
export function seedValue(value: string | undefined): OverrideValue {
  return value === "true" ? "on" : "off";
}

/** The switches the seed covers: every switch but a `defaultOn` one. */
export const SEEDED: readonly SwitchName[] = SWITCHES.flatMap(({ name }) => (switchDefaultsOn(name) ? [] : [name]));

export type SeedLine = { name: SwitchName; value: OverrideValue; inserted: boolean };

export const SEED_UPDATED_BY = "seed";

export const SEED_SQL = `insert into flag_overrides ("switch", scope, group_id, user_id, value, note, updated_by)
select s.name, 'app', null, null, s.value, $3, $4
from unnest($1::text[], $2::text[]) as s(name, value)
on conflict on constraint flag_overrides_target_key do nothing
returning "switch"`;

export type SeedQuery = (text: string, params: unknown[]) => Promise<readonly { switch: string }[]>;

/** Seeds every switch with no app-wide row, and says per switch what it holds and whether this run wrote it. */
export async function seedFlagDefaults(query: SeedQuery, env: NodeJS.ProcessEnv, today: string): Promise<SeedLine[]> {
  const planned = SEEDED.map((name) => ({ name, value: seedValue(env[name]) }));
  const rows = await query(SEED_SQL, [planned.map((p) => p.name), planned.map((p) => p.value), `seeded from env ${today}`, SEED_UPDATED_BY]);
  const inserted = new Set(rows.map((r) => r.switch));
  return planned.map((p) => ({ ...p, inserted: inserted.has(p.name) }));
}

/** One build-log line per switch. A kept row's value is the env's reading, not the row's: the row was left as it is. */
export function seedLogLines(lines: readonly SeedLine[]): string[] {
  return lines.map((l) => (l.inserted ? `flag seed: ${l.name} inserted ${l.value}` : `flag seed: ${l.name} kept (app row exists; env reads ${l.value})`));
}
