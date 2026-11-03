import { neon } from "@neondatabase/serverless";
import { seedFlagDefaults, seedLogLines } from "../../src/lib/flags/seed";

const DEADLINE_MS = 10_000;

/**
 * The flag-default seed against one database, logging a line per switch (`src/lib/flags/seed.ts`). It never
 * throws and never fails the build: a missed seed leaves the switch on its compiled fallback, the answer a seed of an
 * unset variable writes, and the next build seeds again.
 */
export async function runFlagSeed(databaseUrl: string, env: NodeJS.ProcessEnv, now = new Date()): Promise<void> {
  try {
    const http = neon(databaseUrl);
    const query = async (text: string, params: unknown[]) => (await http.query(text, params)) as { switch: string }[];
    // The deadline bounds the loop itself (`seedFlagDefaults`), so no statement is sent after it and every switch logs.
    const lines = await seedFlagDefaults(query, env, now.toISOString().slice(0, 10), Date.now() + DEADLINE_MS);
    for (const line of seedLogLines(lines)) console.log(line);
  } catch (error) {
    console.warn(`flag seed: failed; the build continues and the environment still decides: ${String(error)}`);
  }
}
