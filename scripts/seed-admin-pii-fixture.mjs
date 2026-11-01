// The fixture `probe:admin-pii` and the admin-masking contact sheet read (Admin R3): one group holding every Clerk
// account, an account override with its history, and a waiting email invite, so every surface that names a person
// has someone to name. SCRATCH BRANCHES ONLY (`assertScratchBranch`): it writes rows the admin pages read for every
// account, and a player run this month so Costs draws its per-account table. Re-running replaces its own rows (group
// `pii-probe`, actor `pii_probe_fixture`, `@pii-probe.example`, model `pii-probe-fixture`).
//
//   OWNER_ID=user_… pnpm seed:admin-pii-fixture
//
// OWNER_ID is the account the server's ADMIN_USER_IDS names; the waiting invite is its.

import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { DATABASE_URL, CLERK_SECRET_KEY, OWNER_ID } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY", "OWNER_ID"]);
const ACTOR = "pii_probe_fixture";
const GROUP = "pii-probe";
const SWITCH = "FLYER_TRIAL_ENABLED";
const WAITING = "waiting.person@pii-probe.example";

const sql = neon(DATABASE_URL);
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertScratchBranch(branch, "seed:admin-pii-fixture");

const res = await fetch("https://api.clerk.com/v1/users?limit=500", { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } });
if (!res.ok) throw new Error(`Clerk listed no users: ${res.status}`);
const ids = (await res.json()).map((u) => u.id);
const other = ids.find((id) => id !== OWNER_ID);
if (!ids.includes(OWNER_ID) || !other) throw new Error("seed:admin-pii-fixture: Clerk must hold OWNER_ID and one other account");

await sql.transaction((tx) => [
  tx`delete from flag_groups where name = ${GROUP}`,
  tx`delete from flag_overrides where updated_by = ${ACTOR}`,
  tx`delete from admin_events where actor_id = ${ACTOR}`,
  tx`delete from invite_reservations where email like '%@pii-probe.example'`,
  tx`delete from model_calls where model = 'pii-probe-fixture'`,
  tx`insert into flag_groups (name, description, created_by) values (${GROUP}, 'probe:admin-pii fixture', ${ACTOR})`,
  tx`insert into flag_group_members (user_id, group_id, added_by)
     select id, (select id from flag_groups where name = ${GROUP}), ${ACTOR} from unnest(${ids}::text[]) id
     on conflict (user_id) do nothing`,
  tx`insert into flag_overrides (switch, scope, user_id, value, updated_by) values (${SWITCH}, 'user', ${other}, 'on', ${ACTOR})`,
  tx`insert into admin_events (actor_id, kind, group_id, new_value) select ${ACTOR}, 'group_created', id, name from flag_groups where name = ${GROUP}`,
  tx`insert into admin_events (actor_id, kind, group_id, user_id)
     select ${ACTOR}, 'member_added', group_id, user_id from flag_group_members where added_by = ${ACTOR}`,
  tx`insert into admin_events (actor_id, kind, switch, scope, user_id, new_value) values (${ACTOR}, 'override_set', ${SWITCH}, 'user', ${other}, 'on')`,
  tx`insert into invite_reservations (user_id, kind, state, holds_until, email)
     values (${OWNER_ID}, 'email', 'reserved', now() + interval '7 days', ${WAITING})`,
  // One spent player run in the current month, so Costs has a per-account row to name.
  tx`insert into model_calls (user_id, feature, origin, status, model, cost_micro_usd) values (${other}, 'tuning', 'player', 'spent', 'pii-probe-fixture', 12000)`,
  // A sender's balance is never below the invites holding it (`holdsInvite`'s rules): the copied branch may hold some already.
  tx`insert into invite_balances (user_id, held)
     select ${OWNER_ID}, count(*)::int from invite_reservations
     where user_id = ${OWNER_ID}
       and ((state = 'qr_open' and qr_expires_at > now()) or (state in ('claimed', 'reserved') and holds_until > now()))
     on conflict (user_id) do update set held = greatest(invite_balances.held, excluded.held), updated_at = now()`,
]);
console.log(`seed:admin-pii-fixture: group ${GROUP} with ${ids.length} accounts, a ${SWITCH} override, a waiting invite, on ${branch}`);
