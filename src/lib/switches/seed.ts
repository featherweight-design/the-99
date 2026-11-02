import { SWITCHES, switchDefaultsOn, type SwitchName } from "./registry";
import { KILL, type OverrideValue } from "./resolve";

/**
 * The seed that moves each switch's default from the environment into the database (plan
 * `2026-10-31-feature-flags-in-db.md`, "Seeding: no human reads a Vercel value"). It runs after the
 * migrations on every production and staging build (`scripts/vercel-migrate.ts`, against that project's own
 * branch and with its own env loaded), and locally by `pnpm db:seed:flags` (the branch `.env` names).
 *
 * Per switch with no app-wide row it inserts one whose value is what the environment serves today, read the
 * way the switch's own flag function reads it with no rows: on for the exact string `true`, off otherwise. A
 * variable at the kill value `off` seeds NOTHING: the env kill stands above every row while the env layer remains,
 * and a seeded Off row would outlive it, keeping the switch off after the variable is restored. The first build
 * after the kill is lifted seeds the restored value.
 *
 * A `defaultOn` switch is NOT seeded (`MODEL_CALLS_ENABLED`, the emergency stop for model spend; orchestrator,
 * 2026-11-02). With no row it is on, as its flag function decides, and the environment stops it with no
 * database read: `off` is the kill above every row, and `false` is its soft stop, which an app-wide On row
 * would beat. Seeding it On would silently disarm that `false`.
 *
 * It never overwrites: a switch that already has an app-wide row keeps it (`on conflict do nothing` on the
 * target key, which treats the app row's null group and user as equal). One statement per switch, so a row the
 * database refuses fails that switch alone, and the log names it. So it is idempotent, and while the
 * environment is still read below the app row, a seeded row that matches the environment changes nothing
 * served.
 */
export function seedValue(value: string | undefined): OverrideValue | null {
  if (value === KILL) return null;
  return value === "true" ? "on" : "off";
}

/** The switches the seed covers: every switch but a `defaultOn` one. */
export const SEEDED: readonly SwitchName[] = SWITCHES.flatMap(({ name }) => (switchDefaultsOn(name) ? [] : [name]));

/** `inserted`: written by this run. `kept`: an app-wide row was there. `killed`: the variable is `off`, so none is written. */
export type SeedOutcome = "inserted" | "kept" | "killed" | "failed";
export type SeedLine = { name: SwitchName; value: OverrideValue | null; outcome: SeedOutcome; error?: string };

export const SEED_UPDATED_BY = "seed";

export const SEED_SQL = `insert into flag_overrides ("switch", scope, group_id, user_id, value, note, updated_by)
values ($1, 'app', null, null, $2, $3, $4)
on conflict on constraint flag_overrides_target_key do nothing
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
    const value = seedValue(env[name]);
    if (value === null) {
      lines.push({ name, value, outcome: "killed" });
      continue;
    }
    const left = deadlineAt - now();
    if (left <= 0) {
      lines.push({ name, value, outcome: "failed", error: "past the deadline" });
      continue;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const rows = await Promise.race([
        query(SEED_SQL, [name, value, `seeded from env ${today}`, SEED_UPDATED_BY]),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("no answer by the deadline")), left);
        }),
      ]);
      lines.push({ name, value, outcome: rows.length > 0 ? "inserted" : "kept" });
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
    if (l.outcome === "killed") return `flag seed: ${l.name} not seeded (env is off, the kill)`;
    return `flag seed: ${l.name} failed (env reads ${l.value}): ${l.error ?? "unknown"}`;
  });
}
