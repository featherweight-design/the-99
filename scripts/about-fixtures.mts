// about-fixtures — the fixture account About's screenshots are captured from (discovery R2·4, plan
// `2026-10-16-discovery-r2-r3.md` decision 4, READINESS-r2 E9). SCRATCH BRANCH ONLY: it calls `assertScratchBranch`
// before its first write.
//
// It builds ON the account's own snapshot (a `pull:staging` copy on a branch off local-dev: its collection, its uploads,
// its decks and their versions), and adds what E9 asks for that the snapshot does not reliably hold:
//   - Under 99: twelve cards short (Top off's door);
//   - Over 99: six cards over (Proposed cuts);
//   - Played: whole and COMMITTED (version 1, through `commitVersion`), carrying an unowned card over the stand-in
//     limit, the card a friend has spare, five games with opponents (Matchups) played on that version, and two notes.
//     For the About pages (plan `2026-10-27-about-visual.md`, PR 2, G1) it also holds a Game Changer or tutor the
//     account owns (a bracket mark on a row), one locked card, a pending change after v1 (a basic swapped for a card,
//     through the app's own writes, so the to-do card draws its commit row) and a STORED analysis
//     (`computeAndStoreProfile`, which computes and calls no model): the findings and the live tuning tiles;
//   - Fresh: whole and never analyzed, with no description: the Analyze press and the Describe field.
// Each deck is named after its commander, as a reader names a deck (`deckNames`), never after its role.
// Each is built from cards the account owns that no other deck claims, under its own commander (three of disjoint
// colors), so no row is contested and no list matches a precon: the frames look like an ordinary player's decks.
// The reader's own social name is `Sam` (its face the Played deck's commander, three invites in hand); the capture puts a neutral name and email over Clerk's in the page.
//   - a friend, `Alex`, in a pod with the account (one friend keeps the pod's Rule 0 check row on the phone's Friends
//     frame; the row draws for any pod, at both widths);
//   - the all-decks cart's By friend (Small items 7, item 6, `About-Cart`): four more friends, Chris, Colin, Peter and
//     Max, in two pods (`The Bros`: Chris, Colin, Peter; `Thursday pod`: Peter, Max), each sharing spares of cards the
//     account's decks are missing, Chris the most (Played's friend spare among them), and three asks to Chris through
//     the app's own writes: one he said yes to (Accepted), one open (Requested, so Colin's and Max's copy of that card
//     read Ask instead) and one he said no to (Declined);
//   - a wishlist want, so Wishlist draws a row.
// An earlier upload is the snapshot's own: the script refuses an account with none rather than writing a fake one.
//
// A rerun starts clean: the decks an earlier run RECORDED (marks on its fixture friend's own `user_prefs` row, which no
// surface draws; `deckMark` in `scripts/lib/about-fixture-ids.mjs`), any deck still named `About · …` from a run
// before the decks were recorded, and ITS fixture friends (purged with all they hold) go
// first. A fixture friend's id is namespaced by the account it was made for (`scripts/lib/about-fixture-ids.mjs`), so a
// run for one account never purges another's; an older run's friend, whose id names no account, is left and reported.
// It prints the three decks' ids.
//
//   pnpm tsx scripts/about-fixtures.mts            (the account is E2E_AUDIT_USER_EMAIL, read through Clerk)
//   ABOUT_FIXTURE_USER=user_... pnpm tsx scripts/about-fixtures.mts
import { randomUUID } from "node:crypto";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import {
  FIXTURE_PREFIX,
  deckMark,
  deckNames,
  fixtureFriendId,
  ownedFixturePattern,
  readDeckMarks,
  sortFixtures,
} from "./lib/about-fixture-ids.mjs";

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
// Only this account's own namespace is selected, and the rule re-checks every id before it is purged.
const owned = (await sql`select user_id from social_profiles where user_id like ${ownedFixturePattern(viewer)}`) as {
  user_id: string;
}[];
const ownedFriends = sortFixtures(viewer, owned.map((o) => o.user_id)).purge;
// The decks an earlier run recorded on its friend's row (`deckMark`), read BEFORE that friend is purged with the row,
// and deleted only among this account's own decks. Never by name: the decks carry their commanders' names.
const recorded = ownedFriends.length
  ? ((await sql`select about_seen_ids from user_prefs where user_id = any(${ownedFriends})`) as { about_seen_ids: string[] }[])
      .flatMap((r) => r.about_seen_ids)
  : [];
const { ids: recordedDecks } = readDeckMarks(recorded);
if (recordedDecks.length) await sql`delete from decks where user_id = ${viewer} and id = any(${recordedDecks}::uuid[])`;
// LEGACY, one-time: runs before the decks were recorded named them `About · …`.
await sql`delete from decks where user_id = ${viewer} and name like 'About · %'`;
for (const id of ownedFriends) await purgeAccount(id);
// Read only, to report: fixtures an older run made, whose owner the id does not name, are never purged.
const seen = (await sql`select user_id from social_profiles where starts_with(user_id, ${FIXTURE_PREFIX})`) as {
  user_id: string;
}[];
const { unowned } = sortFixtures(viewer, seen.map((o) => o.user_id));
if (unowned.length) {
  console.log(`left ${unowned.length} older fixture friend${unowned.length > 1 ? "s" : ""} whose account cannot be established (not purged; it may still show on Friends)`);
}
await sql`delete from pods where owner_user_id = ${viewer} and name = any(${["About pod", "The Bros", "Thursday pod"]})`;

// The friend first, so each deck is recorded on its row the moment it exists: a run that dies part way still leaves
// every deck it made where the next run's cleanup reads.
const friends = await import("../src/lib/social/friends");
const colinId = fixtureFriendId(viewer, Date.now());
const colin = await friends.ensureProfile(colinId, "Alex");
await sql`insert into user_prefs (user_id) values (${colinId}) on conflict (user_id) do nothing`;

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

async function writeDeck(
  role: "under" | "over" | "played" | "fresh",
  name: string,
  commander: string,
  rows: Map<string, number>,
): Promise<string> {
  // The id is allocated here so the deck, its mark and its cards commit together: a deck left without its mark would
  // escape the next run's cleanup.
  const id = randomUUID();
  await sql.transaction([
    sql`insert into decks (id, user_id, name, commander_oracle_id) values (${id}, ${viewer}, ${name}, ${commander})`,
    sql`update user_prefs set about_seen_ids = array_append(about_seen_ids, ${deckMark(role, id)})
      where user_id = ${colinId}`,
    ...[...rows].map(
      ([oracle, n]) => sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${id}, ${oracle}, ${n})`,
    ),
  ]);
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
// Each deck is named after its commander, as a reader names one.
const [nameUnder, nameOver, namePlayed] = deckNames(picked.map((c) => c.name));
// Under 99: twelve short (Top off's door).
const under = await writeDeck("under", nameUnder, forUnder.oracle_id, await buildList(forUnder, 52, 87));
// Over 99: six over (Proposed cuts).
const over = await writeDeck("over", nameOver, forOver.oracle_id, await buildList(forOver, 68, 105));
// Played: whole, two of its slots the dear card and the spare card (unowned: the over-limit row and the friend's spare).
const playedRows = await buildList(forPlayed, 60, 97);
playedRows.set(dear, 1);
playedRows.set(spare, 1);
// A bracket mark on a row (About pages, Your deck's "The marks after a name"): a Game Changer or tutor the account owns,
// in Played's colors. `buildList` may have placed one already; if not, one replaces a basic, so the deck stays whole.
const [alreadyMarked] = (await sql`select c.name from cards c left join card_bracket_flags f on f.oracle_id = c.oracle_id
  where c.oracle_id::text = any(${[...playedRows.keys()]}) and c.type_line not like '%Land%'
    and (c.game_changer or coalesce(f.tutor, false)) limit 1`) as { name: string }[];
if (!alreadyMarked) {
  const marked = (await sql`select c.oracle_id::text, c.name from cards c left join card_bracket_flags f on f.oracle_id = c.oracle_id
    where c.oracle_id::text = any(${freeIds}) and c.commander_legal and c.color_identity <@ ${forPlayed.color_identity}::text[]
      and c.type_line not like '%Land%' and c.oracle_id::text <> ${forPlayed.oracle_id} and (c.game_changer or coalesce(f.tutor, false))
    order by c.name`) as { oracle_id: string; name: string }[];
  const card = marked.find((m) => !playedRows.has(m.oracle_id) && take(m.oracle_id));
  const basic = [...playedRows].filter(([id]) => [...basics.values()].includes(id)).sort((a, b) => b[1] - a[1])[0];
  if (card && basic) {
    playedRows.set(card.oracle_id, 1);
    if (basic[1] > 1) playedRows.set(basic[0], basic[1] - 1);
    else playedRows.delete(basic[0]);
    console.log(`bracket mark: ${card.name}`);
  } else {
    console.log("WARNING: the account owns no free Game Changer or tutor in Played's colors: no row will carry a bracket mark");
  }
}
const played = await writeDeck("played", namePlayed, forPlayed.oracle_id, playedRows);
// One locked card (About pages, Your deck's Lock cards), the row the action's own write would make (`setCardLocked`,
// which needs a signed-in request). A lock edits no list, so the version and the reading below are untouched by it.
const [lockable] = (await sql`select c.oracle_id::text from cards c where c.oracle_id::text = any(${[...playedRows.keys()]})
  and c.type_line not like '%Land%' and c.oracle_id::text <> all(${[dear, spare]}) order by c.name limit 1`) as { oracle_id: string }[];
if (lockable) {
  await sql`insert into deck_locks (deck_id, oracle_id) values (${played}, ${lockable.oracle_id})
    on conflict (deck_id, oracle_id) do update set removed_at = null`;
}

// Fresh: a fourth whole deck, never analyzed and with no description (About pages, Analysis: the Analyze press and the
// Describe field draw only on such a deck). Its commander need not be of colors disjoint from the other three: every
// copy still comes from the free pool. A commander whose colors hold too few free cards is passed over, with the copies
// it took put back.
let fresh: string | null = null;
for (const c of candidates) {
  if (picked.some((p) => p.oracle_id === c.oracle_id) || (pool.get(c.oracle_id) ?? 0) <= 0) continue;
  const before = new Map(pool);
  try {
    take(c.oracle_id);
    const rows = await buildList(c, 60, 99);
    const [nameFresh] = deckNames([...picked.map((p) => p.name), c.name]).slice(3);
    fresh = await writeDeck("fresh", nameFresh, c.oracle_id, rows);
    console.log(`fresh deck: ${c.name} (${c.color_identity.join("")})`);
    break;
  } catch {
    for (const [k, v] of before) pool.set(k, v);
  }
}
if (!fresh) throw new Error("the account owns no fourth free commander with a whole deck's worth of free cards");
// Played is COMMITTED, as a deck that gets played is: through `commitVersion`, the write the app's own commit action
// (`commitDeckVersion`) makes. No declared bracket, so no snapshot, as the action finds for such a deck. It is then
// dated as a deck sleeved before its five games were played: the deck made 23 days ago, the version committed 22 days
// ago (its cards' and commander's runs start there), so each game below is credited to version 1 as `logGame` would.
const { commitVersion } = await import("../src/lib/decks/versions");
const { version } = await commitVersion(played, null, undefined, undefined);
const DAY = 86_400_000;
const committedAt = new Date(Date.now() - 22 * DAY);
await sql`update decks set created_at = ${new Date(committedAt.getTime() - DAY)},
  last_edited_at = ${new Date(committedAt.getTime() - DAY)} where id = ${played}`;
await sql`update deck_versions set committed_at = ${committedAt}, commander_since = ${committedAt}
  where id = ${version.id}`;
await sql`update deck_version_cards set since = ${committedAt} where version_id = ${version.id}`;

// A pending change after v1 (About pages, Your deck's commit row): one basic swapped for a card the account owns free,
// through the app's own writes (the basics stepper's, then the Add panel's), so the deck stays whole and its to-do card
// draws "Commit as v2".
const { setBasicQuantityFor } = await import("../src/lib/decks/set-basic-quantity");
const { addCardToDeckFor } = await import("../src/lib/decks/add-card");
const swapOut = [...playedRows].filter(([id]) => [...basics.values()].includes(id)).sort((a, b) => b[1] - a[1])[0];
const swapIn = ((await sql`select c.oracle_id::text from cards c
  where c.oracle_id::text = any(${freeIds}) and c.commander_legal and c.color_identity <@ ${forPlayed.color_identity}::text[]
    and c.type_line not like '%Land%' and c.oracle_id::text <> ${forPlayed.oracle_id}
  order by c.name`) as { oracle_id: string }[]).find((c) => !playedRows.has(c.oracle_id) && take(c.oracle_id));
if (!swapOut || !swapIn) throw new Error("Played has no basic to swap, or the account owns no free card to swap in");
const down = await setBasicQuantityFor(viewer, played, swapOut[0], swapOut[1] - 1, swapOut[1]);
if (!down.ok) throw new Error(`setBasicQuantityFor refused: ${down.reason}`);
const added = await addCardToDeckFor(viewer, played, swapIn.oracle_id, { relock: false });
if (!added.result.ok) throw new Error("addCardToDeckFor refused the pending card");
console.log(`commanders: ${picked.map((c) => `${c.name} (${c.color_identity.join("")}, ${c.support} free support cards)`).join(" · ")}`);

// The friend, the pod, the spare.
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
const invite = await friends.createInvite(viewer);
if (!invite.ok) throw new Error("createInvite refused: the account holds too many open invites");
await friends.redeemInvite(colinId, invite.token);
const faces = (await sql`select oracle_id from cards where commander_legal and layout = 'normal'
  and type_line like 'Legendary Creature%' and art_crop_uri is not null order by oracle_id offset 7 limit 3`) as { oracle_id: string }[];
await setCommander(colinId, faces[0].oracle_id);
const [{ id: colinDeck }] = (await sql`insert into decks (user_id, name, commander_oracle_id)
  values (${colinId}, 'Alex’s brew', ${faces[1].oracle_id}) returning id`) as { id: string }[];
const pod = await pods.createPod(viewer, "About pod");
if (!pod) throw new Error("createPod refused");
if (!(await pods.addMember(viewer, pod.id, colin.publicId))) throw new Error("addMember refused");
if (!(await spares.shareSparesWith(colinId, pod.id, true))) throw new Error("shareSparesWith refused");

// The cart's By friend (Small items 7, item 6). The board's panels, top of the page, most spares first: Chris
// (41 cards, 130 spare), Colin (17, 38), Peter (9, 14), Max (4, 6). A panel lists the cart's lines in By card's default
// order (`byCardOrder`: commanders first, then the most decks needing the card, then A to Z), so the lines are read the
// same way through the cart's own rows (`loadDeckBuyRows`, one row per deck), commanders left out, and each friend is
// handed copies of the lines the board draws in his first rows. A friend with no deck spares every copy he owns
// (`spareCount`), so his copies ARE his spares.
const { loadDeckBuyRows } = await import("../src/lib/decks/availability-query");
const requests = await import("../src/lib/social/spare-requests");
const need = new Map<string, number>();
for (const r of await loadDeckBuyRows(viewer)) need.set(r.oracleId, (need.get(r.oracleId) ?? 0) + 1);
const commanders = new Set(((await sql`select x::text from decks d cross join lateral
  unnest(array[d.commander_oracle_id, d.partner_oracle_id]) x where d.user_id = ${viewer} and x is not null`) as {
  x: string;
}[]).map((r) => r.x));
const named = (await sql`select oracle_id::text, name from cards where oracle_id::text = any(${[...need.keys()]})`) as {
  oracle_id: string;
  name: string;
}[];
const lines = named
  .filter((r) => !commanders.has(r.oracle_id))
  .sort((a, b) => need.get(b.oracle_id)! - need.get(a.oracle_id)! || a.name.localeCompare(b.name))
  .map((r) => r.oracle_id);
if (lines.length < 10 || !lines.includes(spare)) {
  throw new Error(`the cart holds ${lines.length} lines${lines.includes(spare) ? "" : ", without Played's spare"}: By friend needs ten`);
}
/** `total` copies over `n` lines, every line at least one, the remainder on the first lines. */
const spread = (total: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => Math.max(1, Math.floor(total / n) + (i < total % n ? 1 : 0)));
/** A friend's spares: the board's first rows (line index, copies) at the head, the rest of his cards from the lines no
 *  first row uses, at least one copy each, up to the panel's figures where the cart holds enough lines. */
const FIRST = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const handOut = (head: [number, number][], cards: number, copies: number, from: number, extra: string[] = []): Map<string, number> => {
  const out = new Map<string, number>(head.map(([i, n]) => [lines[i], n]));
  for (const id of extra) out.set(id, out.get(id) ?? 1);
  const rest = lines.filter((id, i) => !FIRST.has(i) && !out.has(id)).slice(from);
  const room = Math.max(0, cards - out.size);
  const left = Math.max(0, copies - [...out.values()].reduce((a, b) => a + b, 0));
  const tail = rest.slice(0, room);
  spread(left, tail.length).forEach((n, i) => out.set(tail[i], n));
  return out;
};
const CART_FRIENDS: { name: string; pods: string[]; spares: Map<string, number> }[] = [
  // Lightning Greaves, Swiftfoot Boots, Arcane Signet (Accepted), Beast Within, Sol Ring (Requested), Cultivate (Declined).
  { name: "Chris", pods: ["The Bros"], spares: handOut([[0, 7], [1, 2], [2, 9], [3, 4], [4, 12], [5, 6]], 41, 130, 0, [spare]) },
  // Lightning Greaves, Beast Within, Chaos Warp, Sol Ring (Ask instead: Chris holds the open ask).
  { name: "Colin", pods: ["The Bros"], spares: handOut([[0, 1], [3, 1], [6, 2], [4, 3]], 17, 38, 8) },
  { name: "Peter", pods: ["The Bros", "Thursday pod"], spares: handOut([[7, 1], [1, 1], [8, 2]], 9, 14, 16) },
  // Sol Ring (Ask instead), Goblin Matron.
  { name: "Max", pods: ["Thursday pod"], spares: handOut([[4, 2], [9, 1]], 4, 6, 20) },
];
const cartPods = new Map<string, string>();
for (const podName of ["The Bros", "Thursday pod"]) {
  const made = await pods.createPod(viewer, podName);
  if (!made) throw new Error(`createPod refused ${podName}`);
  cartPods.set(podName, made.id);
}
const cartFriendIds = new Map<string, { id: string; publicId: string }>();
for (const [i, f] of CART_FRIENDS.entries()) {
  // Namespaced like Alex, so the next run's cleanup purges each with all he holds.
  const id = fixtureFriendId(viewer, Date.now() + i + 1);
  const profile = await friends.ensureProfile(id, f.name);
  const link = await friends.createInvite(viewer);
  if (!link.ok) throw new Error("createInvite refused: the account holds too many open invites");
  await friends.redeemInvite(id, link.token);
  await setCommander(id, faces[i % faces.length].oracle_id);
  for (const [oracle, n] of f.spares) {
    await sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${id}, ${oracle}, ${n}, 'fx')`;
  }
  for (const podName of f.pods) {
    const podId = cartPods.get(podName)!;
    if (!(await pods.addMember(viewer, podId, profile.publicId))) throw new Error(`addMember refused ${f.name}`);
    if (!(await spares.shareSparesWith(id, podId, true))) throw new Error(`shareSparesWith refused ${f.name}`);
  }
  cartFriendIds.set(f.name, { id, publicId: profile.publicId });
}
// Three asks to Chris, the app's own writes: Arcane Signet's answered yes, Sol Ring's left open, Cultivate's answered no.
const askEnv = { ...process.env, SOCIAL_FRIENDS_ENABLED: "true" };
const chris = cartFriendIds.get("Chris")!;
for (const [i, answer] of [[2, "yes"], [4, null], [5, "no"]] as const) {
  const asked = await requests.askForSpare(viewer, chris.publicId, lines[i], askEnv);
  if (!asked.ok) throw new Error(`askForSpare refused line ${i}: ${asked.reason}`);
  if (answer === null) continue;
  const answered = await requests.answerSpareRequest(chris.id, asked.id, answer, askEnv);
  if (!answered.ok) throw new Error(`answerSpareRequest refused line ${i}: ${answered.reason}`);
}
console.log(`cart: ${lines.length} lines; By friend: ${CART_FRIENDS.map((f) => `${f.name} ${f.spares.size} cards · ${[...f.spares.values()].reduce((a, b) => a + b, 0)} spare`).join(", ")}`);

// Five games with opponents, oldest first: enough for Matchups' finding (three or more).
const results = ["win", "loss", "win", "loss", "win"] as const;
for (const [i, result] of results.entries()) {
  const playedAt = new Date(Date.now() - (results.length - i) * 4 * DAY);
  const [{ id: game }] = (await sql`insert into deck_games (deck_id, user_id, result, pod_size, played_at, version_id)
    values (${played}, ${viewer}, ${result}, 4, ${playedAt}, ${version.id}) returning id`) as { id: string }[];
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

// Home's feed (menu and Home PR 8): the kinds on and one price drop on the wanted card, unseen, so the feed Home has a lead
// story to photograph. The capture re-arms `feed_seen_at` before each Home frame (a Home visit moves it).
const enabledAt = new Date(Date.now() - 30 * DAY).toISOString();
await sql`insert into user_prefs (user_id) values (${viewer}) on conflict (user_id) do nothing`;
await sql`update user_prefs set feed_kinds = ${JSON.stringify({ "new-set": enabledAt, "price-drop": enabledAt, combo: enabledAt })}::jsonb,
  feed_seen_at = null where user_id = ${viewer}`;
await sql`delete from feed_items where user_id = ${viewer}`;
await sql`insert into feed_items (user_id, kind, dedupe_key, oracle_id, data, created_at)
  values (${viewer}, 'price-drop', ${`${dear}:fixture`}, ${dear}, ${JSON.stringify({ fromCents: 1200, toCents: 700 })}::jsonb, now() - interval '2 hours')`;

// Played's STORED analysis (About pages: the findings and the live tuning tiles), taken last, over the list as it stands
// with its pending change: the app's own compute and store (`computeAndStoreProfile`, the Analyze press's write), with
// the uncached builds (`unstable_cache` raises outside a request). Free: it computes and calls no model.
const { readCatalogGeneration } = await import("../src/lib/cache/catalog-generation");
const { loadDeckProfile } = await import("../src/lib/profile/load");
const { computeAndStoreProfile } = await import("../src/lib/profile/stored");
const reading = await computeAndStoreProfile(played, viewer, {
  generation: readCatalogGeneration,
  compute: (deckId: string, userId: string) => loadDeckProfile(deckId, userId, process.env),
  env: process.env,
});
if (reading?.kind !== "ok") throw new Error(`Played was not analyzed: ${reading ? `${reading.kind}, ${reading.built} of ${reading.size}` : "not the account's deck"}`);

console.log(`ABOUT_DECK_UNDER=${under}`);
console.log(`ABOUT_DECK_OVER=${over}`);
console.log(`ABOUT_DECK_PLAYED=${played}`);
console.log(`ABOUT_DECK_FRESH=${fresh}`);
console.log(`seeded: Alex (in About pod), Chris, Colin, Peter and Max (spares on the cart, three asks to Chris), five games with opponents, two notes, one want, a locked card, a pending change and a stored analysis on Played · ${uploads} earlier uploads`);
process.exit(0);
