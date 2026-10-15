// Seeds friends, their decks and one pod for the audit account, so the seat picker's friend states can be photographed
// (Social R3 close-out). SCRATCH BRANCH ONLY: it names its target and refuses anything else.
//   R3_FIXTURE_BRANCH=br-... R3_FIXTURE_USER=user_... pnpm tsx scripts/seed-r3-picker-fixture.mts
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
const named = process.env.R3_FIXTURE_BRANCH;
const viewer = process.env.R3_FIXTURE_USER;
if (!named || !viewer) throw new Error("set R3_FIXTURE_BRANCH and R3_FIXTURE_USER");
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (rows[0]?.b !== named) throw new Error(`database reports ${rows[0]?.b}, not ${named}`);
assertScratchBranch(rows[0]?.b, "seed-r3-picker-fixture");
const friends = await import("../src/lib/social/friends");
const pods = await import("../src/lib/social/pods");

const tag = Date.now();
const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
  select oracle_id from cards where commander_legal and type_line like 'Legendary Creature%'
    and oracle_text not ilike '%partner%' order by oracle_id limit 4`);
const [C1, C2, C3, C4] = picks.map((r) => r.oracle_id);
await friends.ensureProfile(viewer, "Hugh");
const mk = async (name: string, decks: [string, string][]) => {
  const id = `r3-fixture-${name.toLowerCase()}-${tag}`;
  const p = await friends.ensureProfile(id, name);
  const t = await friends.createInvite(viewer);
  if (!t.ok) throw new Error("createInvite refused");
  await friends.redeemInvite(id, t.token);
  for (const [deck, cmd] of decks) {
    await db.execute(sql`insert into decks (user_id, name, commander_oracle_id) values (${id}, ${deck}, ${cmd})`);
  }
  return p;
};
const dave = await mk("Dave", [["Avengers Tempo", C1], ["Dave's second brew", C2]]);
await mk("Jo", []);
const sam = await mk("Samantha Rivers", [["Wheel of Misfortune", C3]]);
const pod = await pods.createPod(viewer, "Thursday");
if (!pod) throw new Error("createPod refused");
await pods.addMember(viewer, pod.id, dave.publicId);
await pods.addMember(viewer, pod.id, sam.publicId);
void C4;
console.log("seeded: Dave (2 decks), Jo (none), Samantha Rivers (1), pod Thursday (you, Dave, Samantha)");
process.exit(0);
