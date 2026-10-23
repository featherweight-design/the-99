// Help me choose's "Any cards" fill, measured on a real collection: what the fill places for one commander, and the
// two numbers the tune is judged on (owned cards under the 10% floor that got in, well-played cards to buy that
// were left out), with the role counts beside them.
//
//   pnpm measure:any-cards-fill <fixture.json>
//
// The fixture is `{ commander: <oracle id>, rows: [[oracle id, quantity], ...] }`: a player's owned cards, pulled
// read-only from wherever they live and kept OUTSIDE the repo (it is someone's collection; never commit one). This
// script seeds those rows under its own fixture account and runs the real `buildFillPlan`, so the skeleton, labels,
// gate and EDHREC data are the app's own, not a restatement.
//
// It WRITES that fixture account's collection, so it runs only on a scratch branch: refused on production, staging
// and local-dev by `neon.branch_id`. Make one from local-dev and point DATABASE_URL at it. Run it on two checkouts
// (before and after a change) against the same branch and fixture for a before/after.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { buildFillPlan } from "../src/lib/decks/fill-plan";
import { getEdhrecData } from "../src/lib/edhrec/client";
import { readLabelRoleSets } from "../src/lib/labels/read";

neonConfig.webSocketConstructor = ws;
// Per run, so two checkouts measuring at once on one branch never seed or delete each other's rows.
const FIXTURE_USER = `measure_any_cards_fill_${randomUUID()}`;
const WELL_PLAYED = 40;

const path = process.argv[2];
if (!path) throw new Error("usage: pnpm measure:any-cards-fill <fixture.json>");
const fixture = JSON.parse(readFileSync(path, "utf8")) as { commander: string; rows: [string, number][] };

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });

async function main() {
  const { branch } = (await pool.query("select current_setting('neon.branch_id', true) as branch")).rows[0];
  assertScratchBranch(branch, "measure:any-cards-fill");
  // From here on the fixture account holds a copy of a player's collection: removed however the run ends, and only
  // after the branch guard has passed, so a refused branch is never written to.
  try {
    // Seed the run's own fixture account. Rows the catalog does not hold are dropped.
    await pool.query(
      `insert into collection_items (user_id, oracle_id, quantity, set_code)
       select $1, r.oracle_id, r.quantity, 'fix' from unnest($2::uuid[], $3::int[]) as r(oracle_id, quantity)
       join cards c on c.oracle_id = r.oracle_id`,
      [FIXTURE_USER, fixture.rows.map((r) => r[0]), fixture.rows.map((r) => r[1])],
    );

    const cmd = (
      await pool.query("select oracle_id, name, color_identity, mana_cost from cards where oracle_id = $1", [fixture.commander])
    ).rows[0];
    const commanders = [{ oracleId: cmd.oracle_id, name: cmd.name, colorIdentity: cmd.color_identity, manaCost: cmd.mana_cost }];
    const env = { ...process.env, HELP_ME_CHOOSE_ENABLED: "true" };
    // Any cards, no budget, no bracket: the answers the measured deck was made with.
    const plan = await buildFillPlan(FIXTURE_USER, commanders, new Set(), {
      selected: [], env, answers: { budgetCents: null, bracket: null, cardOracleId: null },
    });

    const placed = new Set(plan.rows.map((r) => r.oracleId));
    const { data } = await getEdhrecData(cmd.oracle_id, cmd.name);
    const pctOf = (name: string): number | null => {
      const key = name.toLowerCase();
      return data?.inclusionByName[key] ?? data?.inclusionByName[key.split(" // ")[0]] ?? null;
    };
    const owned = new Set(fixture.rows.map((r) => r[0]));
    const names = new Map<string, string>(
      (await pool.query("select oracle_id, name from cards where oracle_id = any($1::uuid[])", [[...placed]])).rows.map(
        (r) => [r.oracle_id, r.name],
      ),
    );

    const roles = new Map<string, number>();
    for (const r of plan.rows) roles.set(r.role, (roles.get(r.role) ?? 0) + r.quantity);
    const lowOwned = plan.rows
      .filter((r) => r.role !== "land" && owned.has(r.oracleId))
      .map((r) => ({ name: names.get(r.oracleId)!, pct: pctOf(names.get(r.oracleId)!), role: r.role }))
      .filter((r) => r.pct == null || r.pct < 10);
    // Well-played cards on the commander's list the fill did not place, owned or not: read by name from EDHREC.
    // Both the whole name and the front face, as `pctOf` reads them: EDHREC can key a double-faced card by its front.
    const placedNames = new Set([...names.values()].flatMap((n) => [n.toLowerCase(), n.toLowerCase().split(" // ")[0]]));
    const leftOut = Object.entries(data?.inclusionByName ?? {})
      .filter(([name, pct]) => pct >= WELL_PLAYED && !placedNames.has(name))
      .sort((a, b) => b[1] - a[1]);

    console.log(`${cmd.name}: ${plan.filled} cards, ${plan.bought} to buy`);
    console.log(`roles: ${[...roles].map(([r, n]) => `${r} ${n}`).join(", ")}`);
    // The residual's rows are role "other", but a card there can still be ramp, draw or removal by its label: how
    // much of each the deck really holds, which is what a reader counts.
    const labels = await readLabelRoleSets([...placed]);
    const byLabel = new Map<string, number>();
    for (const r of plan.rows) {
      if (r.role === "land") continue;
      for (const role of labels.get(r.oracleId) ?? []) byLabel.set(role, (byLabel.get(role) ?? 0) + r.quantity);
    }
    console.log(`nonland cards by label (a card can carry several): ${[...byLabel].sort().map(([r, n]) => `${r} ${n}`).join(", ")}`);
    console.log(`land drops (lands plus modal backs): ${plan.landCapable}`);
    console.log(`\nowned cards under 10% (or unlisted) placed outside lands: ${lowOwned.length}`);
    for (const r of lowOwned) console.log(`  ${r.name} (${r.pct ?? "unlisted"}%, ${r.role})`);
    console.log(`\ncards on the list at ${WELL_PLAYED}% or more NOT placed: ${leftOut.length}`);
    for (const [name, pct] of leftOut) console.log(`  ${name} ${pct}%`);
  } finally {
    await pool.query("delete from collection_items where user_id = $1", [FIXTURE_USER]);
  }
}

main()
  .finally(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
