// Seeds three friends and their wishlists for the audit account, so the friend page (Social R2 P1-P3, PP1-PP3) can be
// photographed: Colin (a face, five wanted cards, and a sixth his collection already reaches, which must NOT show),
// Peter (a face, an empty wishlist) and Max (no face, two wanted cards). SCRATCH BRANCH ONLY: it names its target and
// refuses anything else. It prints each friend's public id, for the walk.
//   R2_FIXTURE_BRANCH=br-... R2_FIXTURE_USER=user_... pnpm tsx scripts/seed-r2-friend-fixture.mts
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
const named = process.env.R2_FIXTURE_BRANCH;
const viewer = process.env.R2_FIXTURE_USER;
if (!named || !viewer) throw new Error("set R2_FIXTURE_BRANCH and R2_FIXTURE_USER");
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (rows[0]?.b !== named) throw new Error(`database reports ${rows[0]?.b}, not ${named}`);
assertScratchBranch(rows[0]?.b, "seed-r2-friend-fixture");
const friends = await import("../src/lib/social/friends");
const { setCommander } = await import("../src/lib/social/commander");
const { setWishlistQuantity } = await import("../src/lib/wishlist/wishlist");

// A rerun starts clean: the previous run's friends go first, purged with everything they hold.
const { purgeAccount } = await import("../src/lib/account/purge");
const { rows: old } = await db.execute<{ user_id: string }>(sql`select user_id from social_profiles where user_id like 'r2-fixture-%'`);
for (const o of old) await purgeAccount(o.user_id);

const { rows: faces } = await db.execute<{ oracle_id: string }>(sql`
  select oracle_id from cards where commander_legal and layout = 'normal' and type_line like 'Legendary Creature%'
    and art_crop_uri is not null order by oracle_id limit 2`);
const { rows: wanted } = await db.execute<{ oracle_id: string }>(sql`
  select oracle_id from cards where layout = 'normal' and image_uri is not null and type_line not like 'Basic%'
    order by oracle_id offset 40 limit 8`);
const tag = Date.now();
await friends.ensureProfile(viewer, "Hugh");
const mk = async (name: string, face: string | null, wants: [string, number][], collected: string | null = null) => {
  const id = `r2-fixture-${name.toLowerCase()}-${tag}`;
  const p = await friends.ensureProfile(id, name);
  const t = await friends.createInvite(viewer);
  if (!t.ok) throw new Error("createInvite refused");
  await friends.redeemInvite(id, t.token);
  if (face) await setCommander(id, face);
  for (const [card, n] of wants) await setWishlistQuantity(id, card, n);
  if (collected) {
    // Wanted first, then reached by a collection row written AROUND the chokepoints: the line stands, and only
    // the read's own filter keeps it off the friend page.
    await setWishlistQuantity(id, collected, 1);
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${id}, ${collected}, 1, 'fx')`);
  }
  console.log(`${name.toUpperCase()}_PUBLIC_ID=${p.publicId}`);
};
const w = wanted.map((r) => r.oracle_id);
await mk("Colin", faces[0].oracle_id, [[w[0], 2], [w[1], 1], [w[2], 4], [w[3], 1], [w[4], 3]], w[5]);
await mk("Peter", faces[1].oracle_id, []);
await mk("Max", null, [[w[6], 1], [w[7], 2]]);
process.exit(0);
