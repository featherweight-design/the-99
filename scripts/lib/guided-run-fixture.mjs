// Fixture for the guided build's run window (PR C): three decks owned by the fixture account, each with the newest guided run in one state
// (running, failed, short). Fixed ids, so a contact-sheet inventory can name the routes. Rows of its own only; `clearFixture` removes them.
// Never run it against production or staging: it writes (`local-dev` or a scratch branch).
import { neon } from "@neondatabase/serverless";

export const GUIDED_RUN_DECKS = {
  running: "9a000000-0000-4000-8000-0000000000a1",
  failed: "9a000000-0000-4000-8000-0000000000a2",
  short: "9a000000-0000-4000-8000-0000000000a3",
};
const FLAG_NOTE = "guided-run fixture";
const COMMANDER = "7656f93b-336f-49cb-b8fe-c2b5c014258f"; // The Wise Mothman, scored for the fixture account

export async function userIdOf(email, secret) {
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, { headers: { authorization: `Bearer ${secret}` } });
  const users = await res.json();
  if (!Array.isArray(users) || !users[0]?.id) throw new Error("fixture account not found in Clerk");
  return users[0].id;
}

export async function clearFixture(databaseUrl) {
  const sql = neon(databaseUrl);
  const ids = Object.values(GUIDED_RUN_DECKS);
  const calls = await sql`select model_call_id from guided_builds where deck_id = any(${ids}::uuid[])`;
  await sql`delete from guided_builds where deck_id = any(${ids}::uuid[])`;
  await sql`delete from decks where id = any(${ids}::uuid[])`;
  await sql`delete from flag_overrides where switch = 'PRECON_UPGRADE_ENABLED' and note = ${FLAG_NOTE}`;
  if (calls.length) await sql`delete from model_calls where id = any(${calls.map((c) => c.model_call_id)}::uuid[])`;
}

export async function seedFixture(databaseUrl, userId) {
  await clearFixture(databaseUrl);
  const sql = neon(databaseUrl);
  // The window rides PRECON_UPGRADE_ENABLED: a user override for the fixture account, removed by `clearFixture` (a row of another note is left alone).
  await sql`insert into flag_overrides (switch, scope, user_id, value, note, updated_by) values ('PRECON_UPGRADE_ENABLED', 'user', ${userId}, 'on', ${FLAG_NOTE}, 'guided-run fixture')
    on conflict on constraint flag_overrides_target_key do nothing`;
  const specs = [
    ["running", "pending", null, "now() - interval '5 seconds'", false],
    ["failed", "failed", "model", "now() - interval '2 hours'", true],
    ["short", "done", null, "now() - interval '3 hours'", true],
  ];
  for (const [key, status, err, , refunded] of specs) {
    const deckId = GUIDED_RUN_DECKS[key];
    await sql`insert into decks (id, user_id, name, commander_oracle_id) values (${deckId}, ${userId}, ${`Guided run probe · ${key}`}, ${COMMANDER})`;
    const [call] = await sql`insert into model_calls (user_id, feature, origin, status, model) values (${userId}, 'guided_build', 'player', 'refunded', 'fixture') returning id`;
    await sql`
      insert into guided_builds (user_id, deck_id, strategy_key, strategy_label, status, error_class, refunded, model_call_id, model, bracket_target, pool_mode, created_at, finished_at)
      values (${userId}, ${deckId}, 'tokens', 'Tokens', ${status}, ${err}, ${refunded}, ${call.id}, 'fixture', 3, 'owned',
        ${key === "running" ? new Date(Date.now() - 5000) : new Date(Date.now() - (key === "failed" ? 2 : 3) * 3_600_000)},
        ${status === "pending" ? null : new Date(Date.now() - 3_000_000)})`;
  }
}
