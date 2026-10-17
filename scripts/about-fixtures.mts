// about-fixtures — the fixture account About's screenshots are captured from (discovery R2·4, plan
// `2026-10-16-discovery-r2-r3.md` decision 4, READINESS-r2 E9). SCRATCH BRANCH ONLY: it calls `assertScratchBranch`
// before its first write.
//
// It builds ON the account's own snapshot (a `pull:staging` copy on a branch off local-dev: its collection, its uploads,
// its decks and their versions), and adds what E9 asks for that the snapshot does not reliably hold:
//   - `About · Under 99`: twelve cards short (Top off's door);
//   - `About · Over 99`: six cards over (Proposed cuts);
//   - `About · Played`: whole, carrying an unowned card over the stand-in limit, the card a friend has spare, five
//     games with opponents (Matchups) and two notes.
// Each is built from cards the account owns that no other deck claims, under its own commander (three of disjoint
// colors), so no row is contested and no list matches a precon: the frames look like an ordinary player's decks.
// The reader's own social name is `Sam` (its face the Played deck's commander, three invites in hand); the capture puts a neutral name and email over Clerk's in the page.
//   - a friend, `Alex`, in a pod with the account, sharing a spare of a card `About · Played` buys;
//   - a wishlist want, so Wishlist draws a row.
// An earlier upload is the snapshot's own: the script refuses an account with none rather than writing a fake one.
//
// A rerun starts clean: the decks named `About · …` and the `about-fixture-%` friends (purged with all they hold) go
// first. It prints the three decks' ids.
//
//   pnpm tsx scripts/about-fixtures.mts            (the account is E2E_AUDIT_USER_EMAIL, read through Clerk)
//   ABOUT_FIXTURE_USER=user_... pnpm tsx scripts/about-fixtures.mts
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { DATABASE_URL, CLERK_SECRET_KEY } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);
void DATABASE_URL;
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL!);

const [{ b: branch }] = (await sql`select current_setting('neon.branch_id', true) as b`) as { b: string | null }[];
assertScratchBranch(branch, "about-fixtures");

/** The account: named, or the headless one resolved by its email through Clerk's development instance. */
async function resolveUser(): Promise<string> {
  if (process.env.ABOUT_FIXTURE_USER) return process.env.ABOUT_FIXTURE_USER;
  const email = requireEnv(["E2E_AUDIT_USER_EMAIL"]).E2E_AUDIT_USER_EMAIL;
  if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Clerk answered ${res.status} reading the account`);
  const users = (await res.json()) as { id: string }[];
  if (users.length !== 1) throw new Error(`Clerk holds ${users.length} accounts for E2E_AUDIT_USER_EMAIL`);
  return users[0].id;
}
const viewer = await resolveUser();
console.log(`branch ${branch} · account ${viewer.slice(0, 10)}…`);

const [{ n: uploads }] = (await sql`select count(*)::int n from csv_uploads where user_id = ${viewer}`) as { n: number }[];
if (uploads === 0) throw new Error("the account holds no earlier upload: pull a snapshot with one (pnpm pull:staging)");

// Clean slate.
const { purgeAccount } = await import("../src/lib/account/purge");
const old = (await sql`select user_id from social_profiles where user_id like 'about-fixture-%'`) as { user_id: string }[];
for (const o of old) await purgeAccount(o.user_id);
await sql`delete from pods where owner_user_id = ${viewer} and name = 'About pod'`;
await sql`delete from decks where user_id = ${viewer} and name like 'About · %'`;

// The decks are built from what the account owns and NO other deck of theirs claims, so none of them is contested and
// none puts a copy in contention with the account's own decks: a copy of an existing list marks every row spoken for
// twice and offers the precon that list started as. Every copy a fixture deck takes is spent from the free pool, so the
// three never claim the same copy either. Claims are counted generously (per deck, the larger of its live list and any
// version's list, commanders included), so nothing the availability read might count is handed out.
const pool = new Map(
  ((await sql`
    with per_deck as (
      select deck_id, oracle_id, max(q)::int q from (
        select dc.deck_id, dc.oracle_id, dc.quantity q from deck_cards dc join decks d on d.id = dc.deck_id
          where d.user_id = ${viewer}
        union all
        select v.deck_id, vc.oracle_id, vc.quantity q from deck_version_cards vc join deck_versions v on v.id = vc.version_id
          join decks d on d.id = v.deck_id where d.user_id = ${viewer}
        union all
        select d.id, x, 1 from decks d cross join lateral unnest(array[d.commander_oracle_id, d.partner_oracle_id]) x
          where d.user_id = ${viewer} and x is not null
      ) arms group by deck_id, oracle_id
    ), claimed as (select oracle_id, sum(q)::int q from per_deck group by oracle_id)
    select ci.oracle_id::text, (sum(ci.quantity) - coalesce(max(cl.q), 0))::int free
    from collection_items ci left join claimed cl on cl.oracle_id = ci.oracle_id
    where ci.user_id = ${viewer} group by ci.oracle_id`) as { oracle_id: string; free: number }[])
    .filter((r) => r.free > 0)
    .map((r) => [r.oracle_id, r.free] as const),
);
const take = (oracle: string): boolean => {
  const n = pool.get(oracle) ?? 0;
  if (n <= 0) return false;
  pool.set(oracle, n - 1);
  return true;
};
const freeIds = [...pool.keys()];

type Commander = { oracle_id: string; name: string; color_identity: string[]; support: number };
/** Commanders the account owns free, indexed by EDHREC, of one or two colors, by how many free support cards they have. */
const candidates = (await sql`
  select c.oracle_id::text, c.name, c.color_identity,
    (select count(*) from commander_support_cards s join cards sc on sc.oracle_id = s.oracle_id
      where s.commander_oracle_id = c.oracle_id and s.oracle_id::text = any(${freeIds})
        and sc.type_line not like 'Basic%')::int support
  from cards c join commander_support cs on cs.commander_oracle_id = c.oracle_id and cs.synergy_state = 'ok'
  where c.oracle_id::text = any(${freeIds}) and c.commander_legal and c.layout = 'normal' and c.art_crop_uri is not null
    and c.type_line like 'Legendary Creature%' and cardinality(c.color_identity) between 1 and 2
  order by support desc, c.name`) as Commander[];
// Three commanders of disjoint colors, so their decks draw from different cards.
const picked: Commander[] = [];
for (const c of candidates) {
  if (picked.length === 3) break;
  if (picked.some((p) => p.color_identity.some((x) => c.color_identity.includes(x)))) continue;
  picked.push(c);
}
if (picked.length < 3) throw new Error("the account owns no three free commanders of disjoint colors");
for (const c of picked) take(c.oracle_id);

const BASIC: Record<string, string> = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };
const basics = new Map(
  ((await sql`select distinct on (name) name, oracle_id::text from cards where name = any(${Object.values(BASIC)})
    order by name`) as { name: string; oracle_id: string }[]).map((r) => [r.name, r.oracle_id]),
);

/**
 * A list of `size` cards for `commander`: `spells` free non-land cards and up to eight free non-basic lands, its free
 * support cards first (most included first), then any other free card in its colors (the most widely played first),
 * then its basics.
 */
async function buildList(commander: Commander, spells: number, size: number): Promise<Map<string, number>> {
  const inColors = (await sql`
    select c.oracle_id::text, c.type_line from cards c
    left join commander_support_cards s on s.oracle_id = c.oracle_id and s.commander_oracle_id = ${commander.oracle_id}
    where c.oracle_id::text = any(${freeIds}) and c.commander_legal and c.color_identity <@ ${commander.color_identity}::text[]
      and c.type_line not like 'Basic%' and c.oracle_id::text <> ${commander.oracle_id}
    order by s.inclusion desc nulls last,
      (select count(*) from commander_support_cards x where x.oracle_id = c.oracle_id) desc, c.name`) as {
    oracle_id: string;
    type_line: string;
  }[];
  const rows = new Map<string, number>();
  let nSpells = 0;
  let nLands = 0;
  for (const c of inColors) {
    const land = c.type_line.includes("Land");
    if (land ? nLands >= 8 : nSpells >= spells) continue;
    if (!take(c.oracle_id)) continue;
    rows.set(c.oracle_id, 1);
    if (land) nLands += 1;
    else nSpells += 1;
  }
  if (nSpells < spells) throw new Error(`${commander.name}: only ${nSpells} free spells in its colors`);
  const colors = commander.color_identity.filter((x) => BASIC[x]);
  for (let i = 0, count = rows.size; count < size; i += 1, count += 1) {
    const basic = basics.get(BASIC[colors[i % colors.length]])!;
    rows.set(basic, (rows.get(basic) ?? 0) + 1);
  }
  return rows;
}

async function writeDeck(name: string, commander: string, rows: Map<string, number>): Promise<string> {
  const [{ id }] = (await sql`insert into decks (user_id, name, commander_oracle_id)
    values (${viewer}, ${name}, ${commander}) returning id`) as { id: string }[];
  for (const [oracle, n] of rows) {
    await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${id}, ${oracle}, ${n})`;
  }
  return id;
}

/**
 * Two unowned colorless cards whose CHEAPEST printing priced now (the price a buy tag draws) is $15 to $60, dearest
 * first: over the default $10 stand-in limit, so the first is the over-limit row; the second is the friend's spare.
 */
const buys = (await sql`
  select c.oracle_id::text, min(pp.price_cents) cents from cards c
  join printings p on p.oracle_id = c.oracle_id
  join printing_prices pp on pp.scryfall_id = p.scryfall_id
  where c.commander_legal and c.color_identity = '{}' and c.layout = 'normal' and c.type_line like 'Artifact%'
    and c.type_line not like '%Creature%' and pp.price_cents is not null
    and pp.as_of = (select max(as_of) from printing_prices)
    and not exists (select 1 from collection_items ci where ci.user_id = ${viewer} and ci.oracle_id = c.oracle_id)
  group by c.oracle_id having min(pp.price_cents) between 1500 and 6000
  order by cents desc limit 2`) as { oracle_id: string; cents: number }[];
if (buys.length < 2) throw new Error("the catalog offers no unowned priced colorless artifact to buy");
const [dear, spare] = buys.map((r) => r.oracle_id);

const [forUnder, forOver, forPlayed] = picked;
// Under 99: twelve short (Top off's door).
const under = await writeDeck("About · Under 99", forUnder.oracle_id, await buildList(forUnder, 52, 87));
// Over 99: six over (Proposed cuts).
const over = await writeDeck("About · Over 99", forOver.oracle_id, await buildList(forOver, 68, 105));
// Played: whole, two of its slots the dear card and the spare card (unowned: the over-limit row and the friend's spare).
const playedRows = await buildList(forPlayed, 60, 97);
playedRows.set(dear, 1);
playedRows.set(spare, 1);
const played = await writeDeck("About · Played", forPlayed.oracle_id, playedRows);
console.log(`commanders: ${picked.map((c) => `${c.name} (${c.color_identity.join("")}, ${c.support} free support cards)`).join(" · ")}`);

// The friend, the pod, the spare.
const friends = await import("../src/lib/social/friends");
const pods = await import("../src/lib/social/pods");
const spares = await import("../src/lib/social/spares");
const { setCommander } = await import("../src/lib/social/commander");
const { setWishlistQuantity } = await import("../src/lib/wishlist/wishlist");
// The reader's own name on Friends: a neutral one, never the account's (the shots ship publicly).
await friends.ensureProfile(viewer, "Sam");
if (!(await friends.setDisplayName(viewer, "Sam"))) throw new Error("setDisplayName refused");
// A player's own face on Friends (the Played deck's commander), and invites in hand: the account was never granted any,
// and "Out of invites" is not how a showcase reads. Three, or what it holds if more (never under what is holding).
await setCommander(viewer, forPlayed.oracle_id);
await sql`insert into invite_balances (user_id, held, updated_at) values (${viewer}, 3, now())
  on conflict (user_id) do update set held = greatest(invite_balances.held, 3), updated_at = now()`;
const colinId = `about-fixture-colin-${Date.now()}`;
const colin = await friends.ensureProfile(colinId, "Alex");
const invite = await friends.createInvite(viewer);
if (!invite.ok) throw new Error("createInvite refused: the account holds too many open invites");
await friends.redeemInvite(colinId, invite.token);
const faces = (await sql`select oracle_id from cards where commander_legal and layout = 'normal'
  and type_line like 'Legendary Creature%' and art_crop_uri is not null order by oracle_id offset 7 limit 3`) as { oracle_id: string }[];
await setCommander(colinId, faces[0].oracle_id);
const [{ id: colinDeck }] = (await sql`insert into decks (user_id, name, commander_oracle_id)
  values (${colinId}, 'Alex’s brew', ${faces[1].oracle_id}) returning id`) as { id: string }[];
await sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${colinId}, ${spare}, 1, 'fx')`;
const pod = await pods.createPod(viewer, "About pod");
if (!pod) throw new Error("createPod refused");
if (!(await pods.addMember(viewer, pod.id, colin.publicId))) throw new Error("addMember refused");
if (!(await spares.shareSparesWith(colinId, pod.id, true))) throw new Error("shareSparesWith refused");

// Five games with opponents, oldest first: enough for Matchups' finding (three or more).
const results = ["win", "loss", "win", "loss", "win"] as const;
for (const [i, result] of results.entries()) {
  const playedAt = new Date(Date.now() - (results.length - i) * 4 * 86_400_000);
  const [{ id: game }] = (await sql`insert into deck_games (deck_id, user_id, result, pod_size, played_at)
    values (${played}, ${viewer}, ${result}, 4, ${playedAt}) returning id`) as { id: string }[];
  await sql`insert into deck_game_opponents (game_id, seat, friend_user_id, friend_deck_id, friend_name_then, deck_name_then, commander_oracle_id, won)
    values (${game}, 1, ${colinId}, ${colinDeck}, 'Alex', 'Alex’s brew', ${faces[1].oracle_id}, ${result === "loss" && i % 2 === 1})`;
  await sql`insert into deck_game_opponents (game_id, seat, commander_oracle_id, label, won)
    values (${game}, 2, ${faces[2].oracle_id}, 'Riley', false)`;
}

await sql`insert into deck_notes (deck_id, user_id, body) values
  (${played}, ${viewer}, 'Try a second board wipe over the slow ramp'),
  (${played}, ${viewer}, 'Mulligan hands with no early play')`;

// A want the collection does not reach (the dear card), so Wishlist draws a row.
await setWishlistQuantity(viewer, dear, 1);

console.log(`ABOUT_DECK_UNDER=${under}`);
console.log(`ABOUT_DECK_OVER=${over}`);
console.log(`ABOUT_DECK_PLAYED=${played}`);
console.log(`seeded: Alex (a spare, in About pod), five games with opponents, two notes, one want · ${uploads} earlier uploads`);
process.exit(0);
