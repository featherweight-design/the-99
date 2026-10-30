// Hugh's staging test of the Announcements pushes (Announcements 3b): one push per announcement kind, to ONE account's devices.
//
// For each kind it takes the newest real `wizards_announcements` row the feed would show this account (not baseline, not
// dismissed by it) and queues one `push_outbox` row for the named account
// (key `post:<contentful id>`, the key the feed reads), then flushes THAT account only. It never writes or flushes another account's
// rows: every write names `--user`, and the flush runs with `onlyUser`, which also skips the cron's catalog pass. A row an
// earlier run of this script left is re-armed (sent_at cleared, created_at now), so the script can be run again.
//
// It runs against STAGING only, checked by the database's own `neon.branch_id` (never the URL), because the devices it
// reaches are subscribed on the staging site. The connection is `THE_99_NEON_STAGING_DIRECT`; the VAPID keys are staging's
// (`STAGING_VAPID_PUBLIC_KEY`, `STAGING_VAPID_PRIVATE_KEY`, `STAGING_VAPID_SUBJECT`), set in the shell under names `.env`
// never sets, so `env.mjs`'s override cannot replace them with local keys, because a subscription only accepts pushes
// signed with the key it subscribed under. The account's switches resolve as the flush resolves them (`resolveSwitchEnvStrict`
// over this shell's environment plus staging's overrides); the script stops before writing if push or Announcements is off
// for the account.
//
//   pnpm announcements:test-fire --user user_…
import "./lib/env.mjs";

import { STAGING_BRANCH } from "./lib/scratch-branch.mjs";

const KINDS = ["secret-lair", "commander-decklists", "wizards-news"] as const;

function userArg(argv: readonly string[]): string {
  const at = argv.indexOf("--user");
  const value = at === -1 ? undefined : argv[at + 1];
  if (!value || !value.startsWith("user_")) throw new Error("announcements:test-fire: --user <clerk user id> is required");
  return value;
}

async function main() {
  const userId = userArg(process.argv.slice(2));
  const staging = process.env.THE_99_NEON_STAGING_DIRECT;
  if (!staging) throw new Error("announcements:test-fire: set THE_99_NEON_STAGING_DIRECT");
  // `src/db` reads DATABASE_URL when it loads, so it is pointed at staging before the first import below.
  process.env.DATABASE_URL = staging;

  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { feedDismissals, pushOutbox, pushSubscriptions, wizardsAnnouncements } = await import("../src/db/schema");

  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  const branch = rows[0]?.b ?? null;
  if (branch !== STAGING_BRANCH) throw new Error(`announcements:test-fire: the database is ${branch ?? "unknown"}, not staging (${STAGING_BRANCH}); it runs on staging only`);

  const { pushConfig } = await import("../src/lib/push/config");
  const { pushEnabled } = await import("../src/lib/push/flag");
  const { announcementsEnabled } = await import("../src/lib/announcements/flag");
  const { resolveSwitchEnvStrict } = await import("../src/lib/switches/snapshot");
  const { flushPush } = await import("../src/lib/push/flush");
  const { sendWebPush } = await import("../src/lib/push/send");

  const config = pushConfig({
    VAPID_PUBLIC_KEY: process.env.STAGING_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.STAGING_VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.STAGING_VAPID_SUBJECT,
  } as unknown as NodeJS.ProcessEnv);
  if (!config) throw new Error("announcements:test-fire: set STAGING_VAPID_PUBLIC_KEY, STAGING_VAPID_PRIVATE_KEY and STAGING_VAPID_SUBJECT to staging's keys");

  const env = await resolveSwitchEnvStrict(userId);
  if (!pushEnabled(env)) throw new Error(`announcements:test-fire: push is off for ${userId}`);
  if (!announcementsEnabled(env)) throw new Error(`announcements:test-fire: Announcements is off for ${userId}`);

  const devices = await db.execute<{ n: number }>(sql`select count(*)::int as n from ${pushSubscriptions} ps where ps.user_id = ${userId}`);
  if ((devices.rows[0]?.n ?? 0) === 0) throw new Error(`announcements:test-fire: ${userId} has no device subscribed on staging`);

  const now = new Date();
  const run = now.getTime().toString(36);
  for (const kind of KINDS) {
    const latest = await db.execute<{ id: string; title: string }>(sql`
      select wa.contentful_id as id, wa.title as title from ${wizardsAnnouncements} wa
      where wa.kind = ${kind} and not wa.baseline
        and not exists (select 1 from ${feedDismissals} fd where fd.user_id = ${userId} and fd.key = 'post:' || wa.contentful_id)
      order by wa.published_at desc nulls last, wa.id desc limit 1`);
    const post = latest.rows[0];
    if (!post) { console.log(`skip ${kind}: no post of this kind on staging`); continue; }
    await db.execute(sql`
      insert into ${pushOutbox} (user_id, kind, item_key, batch_key, payload, created_at)
      values (${userId}, ${kind}, ${`post:${post.id}`}, ${`${kind}:test-fire-${run}`}, '{}'::jsonb, ${now.toISOString()}::timestamptz)
      on conflict (user_id, kind, item_key) do update
        set sent_at = null, payload = '{}'::jsonb, batch_key = excluded.batch_key, created_at = excluded.created_at`);
    console.log(`queued ${kind}: ${post.title}`);
  }

  const report = await flushPush({ config, now: new Date(), send: sendWebPush, resolveEnv: resolveSwitchEnvStrict, onlyUser: userId });
  console.log(JSON.stringify(report));
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
