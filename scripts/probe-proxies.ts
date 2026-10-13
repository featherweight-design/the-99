// Deck proxies, proved against a real Postgres by calling the real
// loadAvailability and the real loadDeckBuyRows. Both anti-joins live in raw
// SQL no unit test in this repository can reach, and they are in DIFFERENT
// queries: filtering the claim model does nothing for the buy rows, which read
// `deck_cards` directly. A probe that exercised only the first would pass while
// the player is still billed for a card they printed.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. No
// begin/rollback: the functions under test go through the src/db singleton,
// which is a different connection from the one this script opens.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:proxies`
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadAvailability, loadDeckBuyRows } from "../src/lib/decks/availability-query";
import { pruneOrphanProxies } from "../src/lib/decks/prune-proxies";
import { proxiedMembership, proxyCounts } from "../src/lib/decks/proxies";
import { loadProxyList } from "../src/lib/decks/proxy-list";
import { listDecksWithStats } from "../src/lib/decks/read";
// The prune runs inside its callers' transactions; here it is handed the app's
// own db singleton, which satisfies the same interface for a single statement.
import { db as realDb } from "../src/db";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-proxy-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

// Three distinct ids: two legends to lead the decks, one ordinary card to fight
// over. A commander that is also the contested card would claim twice against
// one owned copy and every figure below would be wrong.
const pickCards = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 3
  `);
  const { rows: [subject] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id limit 1
  `);
  if (rows.length < 3 || !subject) throw new Error("catalog is empty — seed it first");
  return {
    cmdA: rows[0].oracle_id,
    cmdB: rows[1].oracle_id,
    // The printer's partner. A pair deck is the only way the partner arms of
    // `all_claims` and the partner half of the prune's membership test are
    // reachable at all.
    partner: rows[2].oracle_id,
    card: subject.oracle_id,
  };
};

async function main() {
const { cmdA, cmdB, partner, card } = await pickCards();

// Who is named as claiming this card, from a vantage. `free` alone cannot
// answer this: seniority already leaves a JUNIOR claim out of the senior deck's
// surplus, so a junior claim that should have retired is invisible in that
// figure. The claims list is where `all_claims` is actually observable.
const claimants = async (oracleId: string, vantage: string) => {
  const availability = await loadAvailability(USER, {
    oracleIds: [oracleId],
    excludeDeckId: vantage,
    env: process.env,
  });
  return availability.get(oracleId)?.claims.length ?? null;
};

const free = async (oracleId: string, deckId: string) => {
  const availability = await loadAvailability(USER, {
    oracleIds: [oracleId],
    excludeDeckId: deckId,
    env: process.env,
  });
  return availability.get(oracleId)?.free ?? null;
};

// What this deck is told to buy, in copies, for one card. The buy rows are a
// different query from the claim model and this is the only reader of it here.
const buyCopies = async (deckId: string, oracleId: string) => {
  const rows = await loadDeckBuyRows(USER, [deckId], undefined, process.env);
  return rows.filter((r) => r.deckId === deckId && r.oracleId === oracleId)
    .reduce((n, r) => n + r.quantity, 0);
};

const proxy = (deckId: string, oracleId: string) => fixture.execute(sql`
  insert into deck_proxies (deck_id, oracle_id) values (${deckId}, ${oracleId})
`);
const unproxy = (deckId: string, oracleId: string) => fixture.execute(sql`
  delete from deck_proxies where deck_id = ${deckId} and oracle_id = ${oracleId}
`);

try {
  // ONE copy of the contested card, and one of each commander. The single copy
  // is the whole point: two sleeved decks want it and only one can have it.
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${card}, 1, 'probe'),
           (${USER}, ${cmdA}, 1, 'probe'),
           (${USER}, ${cmdB}, 1, 'probe'),
           (${USER}, ${partner}, 1, 'probe')
  `);
  const { rows: [holder] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'Holder', ${cmdA}) returning id
  `);
  // The printer is a PAIR deck. Both commander columns are their own arm in the
  // claim model and their own half of the prune's membership test, and a
  // fixture of single-commander decks reaches neither.
  const { rows: [printer] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${USER}, 'Printer', ${cmdB}, ${partner}) returning id
  `);

  const commit = async (
    deckId: string, cmd: string, number: number, holds: string[], pair?: string,
  ) => {
    const { rows: [v] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
      insert into deck_versions
        (deck_id, number, committed_at, commander_oracle_id, commander_since,
         partner_oracle_id, partner_since)
      values (${deckId}, ${number}, now(), ${cmd}, now(),
              ${pair ?? null}, ${pair ? sql`now()` : null})
      returning id, committed_at
    `);
    for (const oracleId of holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${oracleId}, 1, ${v.committed_at})
      `);
    }
    return v.id;
  };

  // Both decks sleeve the card. The holder commits FIRST, so it is senior on
  // this card and the printer is the one told to buy.
  await commit(holder.id, cmdA, 1, [card]);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${holder.id}, ${card}, 1)
  `);
  await commit(printer.id, cmdB, 1, [card], partner);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${printer.id}, ${card}, 1)
  `);

  // The state before any proxy exists, and the reason the feature is wanted:
  // the junior deck is short a copy and is billed for it.
  check("before: the junior deck is short", await free(card, printer.id), -1);
  check("before: the junior deck is billed", await buyCopies(printer.id, card), 1);
  check("before: the senior deck sees one other claimant",
    await claimants(card, holder.id), 1);

  // 1. THE HEADLINE. The junior deck prints its copy. Its claim retires, so the
  //    senior deck's own page stops reporting a contested copy…
  await proxy(printer.id, card);
  check("a proxied claim is not a claim", await claimants(card, holder.id), 0);
  check("a proxied claim releases the copy", await free(card, holder.id), 0);
  //    …and the printing deck no longer reads short, because it is asking for
  //    nothing. This is `own_claims`' anti-join rather than `all_claims`'.
  check("the printing deck is not short", await free(card, printer.id), 0);

  // 2. THE SECOND ANTI-JOIN, in a different query. Everything above could pass
  //    with `list_claims` untouched, and the player would still be billed.
  check("a proxied card leaves the buy rows", await buyCopies(printer.id, card), 0);
  check("the senior deck was never billed", await buyCopies(holder.id, card), 0);

  // 3. A PROXIED COMMANDER. Neither commander is a `deck_cards` row, so this is
  //    the arm a column on that table could not have expressed at all. The
  //    printer's commander is its own card, owned in one copy and claimed by
  //    that deck alone; proxying it frees the copy outright.
  check("before: the commander's copy is spoken for", await free(cmdB, holder.id), 0);
  await proxy(printer.id, cmdB);
  check("a proxied commander releases its copy", await free(cmdB, holder.id), 1);

  // 3a. A BREW'S ARMS. `all_claims` has six, and everything above exercises the
  //     committed three. A brew claims from its LIVE list and its own commander
  //     columns, so an anti-join accidentally scoped to `newest_version` would
  //     pass every check so far while a brew's proxied card went on claiming.
  const { rows: [brew] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'Brew', ${cmdA}) returning id
  `);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${brew.id}, ${card}, 1)
  `);
  check("a brew's list card claims softly", await claimants(card, holder.id), 1);
  await proxy(brew.id, card);
  check("a proxied brew list card is not a claim", await claimants(card, holder.id), 0);
  check("a proxied brew card leaves its buy row", await buyCopies(brew.id, card), 0);
  //     …and the brew's commander arm, which is a different arm again: cmdA is
  //     the holder's commander too, so the brew is the second claimant on it.
  check("a brew's commander claims", await claimants(cmdA, holder.id), 1);
  await proxy(brew.id, cmdA);
  check("a proxied brew commander is not a claim", await claimants(cmdA, holder.id), 0);
  //     The brew leaves; every figure below is about the two sleeved decks again.
  await fixture.execute(sql`delete from decks where id = ${brew.id}`);

  // 3b. THE PARTNER ARMS. A pair deck claims its partner through its own union
  //     arm, and the prune counts `partner_oracle_id` as membership through its
  //     own clause. Both are invisible to every check above, and removing
  //     either would leave all of them passing.
  check("before: the partner's copy is spoken for", await free(partner, holder.id), 0);
  await proxy(printer.id, partner);
  check("a proxied partner releases its copy", await free(partner, holder.id), 1);
  check("a proxied partner is not a claim", await claimants(partner, holder.id), 0);
  await pruneOrphanProxies(realDb, printer.id);
  const { rows: partnerRow } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from deck_proxies
    where deck_id = ${printer.id} and oracle_id = ${partner}
  `);
  check("a partner's proxy survives the prune", partnerRow[0].n, 1);

  // 3c. THE TILE'S TWO FIGURES, which are a different query again — raw SQL
  //     behind `DeckListItem.proxiedCount` and the list's status pill, reachable
  //     from no unit test. Conflating them shipped a real defect once already.
  //
  //     State here: the printer prints `card` (unowned by it? no — owned, one
  //     copy in the collection), its commander `cmdB` and its partner. So three
  //     marks, and `covers` counts only unowned BODY rows.
  const counts = async (deckId: string) => (await proxyCounts(USER)).get(deckId);
  const printerCounts = await counts(printer.id);
  check("copies counts marks, commanders included", printerCounts?.copies, 3);
  //     `card` is owned and `cmdB`/`partner` are not body rows, so nothing here
  //     may be added to ownedCount — the exact arithmetic that let a printed
  //     commander fill an unowned body slot.
  check("covers counts no owned row and no commander", printerCounts?.covers, 0);

  //     A playset marked once is ONE proxy (ruling 5) and, unowned, FOUR covered
  //     slots. The two figures disagreeing on the same row is the whole point.
  const { rows: [playset] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id offset 1 limit 1
  `);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${printer.id}, ${playset.oracle_id}, 4)
  `);
  await proxy(printer.id, playset.oracle_id);
  const withPlayset = await counts(printer.id);
  //     Three marks before, so one more mark is four — NOT seven, which is what
  //     summing the row's four copies would have given.
  check("a marked playset adds one to the proxy count", withPlayset?.copies, 4);
  check("…while covering all four of its slots", withPlayset?.covers, 4);
  await unproxy(printer.id, playset.oracle_id);
  await fixture.execute(sql`
    delete from deck_cards where deck_id = ${printer.id} and oracle_id = ${playset.oracle_id}
  `);

  // 3d. THE READER, END TO END. Everything above proves the queries; this proves
  //     the PAYLOAD `/decks` renders — `proxiedCount`, the coverage-based
  //     `toBuyCount`, and the status pill — because the wiring between them is
  //     where the critical defect of this feature's first draft lived: a proxied
  //     COMMANDER filling an unowned body slot and marking a deck Complete.
  // The partner leaves the collection for this block ONLY. A coverage rule that
  // counted commanders needs an unowned printed commander to count — which is
  // the shape of this feature's first critical defect — and with every commander
  // owned such a rule passes every check while being wrong. Put back below, so
  // the claim checks above keep the owned partner they were written against.
  await fixture.execute(sql`
    delete from collection_items where user_id = ${USER} and oracle_id = ${partner}
  `);

  const tile = async (deckId: string, withStats: boolean) => {
    const decks = await listDecksWithStats(USER, "name", { includeProxyStats: withStats, env: process.env });
    return decks.find((d) => d.id === deckId);
  };

  //     The printer's body is one card, which it owns; its two commanders are
  //     printed and the PARTNER is owned in no copy. So: three marks, and still
  //     no covered body slot, because a commander is not a body slot however
  //     unowned it is.
  const printerTile = await tile(printer.id, true);
  check("the tile counts every mark", printerTile?.proxiedCount, 3);
  //     THE HEADLINE GUARD. built is 1 and ownedCount is 1 already; if the two
  //     printed commanders were added to coverage this would read over.
  check("printed commanders do not cover body slots", printerTile?.toBuyCount, 0);
  //     Stated on the figure itself too: `covers` is what may be added to
  //     ownedCount, and an unowned printed COMMANDER must contribute nothing.
  check("…and contribute nothing to coverage", (await proxyCounts(USER)).get(printer.id)?.covers, 0);

  //     A FULL DECK, because the pill is the point and `statusPill` answers
  //     `Building` and exits long before it looks at coverage. 99 cards: 98
  //     owned body rows plus one the player owns no copy of, printed.
  const { rows: body } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id offset 2 limit 99
  `);
  if (body.length < 99) throw new Error("catalog too small for a 99-card fixture");
  const owned = body.slice(0, 98);
  const printed = body[98];
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    select ${USER}, unnest(${sql.param(owned.map((r) => r.oracle_id))}::uuid[]), 1, 'probe'
  `);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    select ${holder.id}, unnest(${sql.param(body.map((r) => r.oracle_id))}::uuid[]), 1
  `);
  // The holder already held one card, so drop it: 99 body rows exactly, which is
  // what `deckBodySize` wants for a single-commander deck.
  await fixture.execute(sql`
    delete from deck_cards where deck_id = ${holder.id} and oracle_id = ${card}
  `);

  const beforeMark = await tile(holder.id, true);
  check("the last card unprinted, the deck is To buy", beforeMark?.statusPill, "To buy");
  check("…and it is on the bill", beforeMark?.toBuyCount, 1);

  await proxy(holder.id, printed.oracle_id);
  const afterMark = await tile(holder.id, true);
  // THE FEATURE, end to end: a 99-card deck whose one gap is printed is finished.
  check("printing the last card completes the deck", afterMark?.statusPill, "Complete");
  check("printing it clears the bill", afterMark?.toBuyCount, 0);
  check("and the tile counts it", afterMark?.proxiedCount, 1);

  //     And the opt-out path, which every deck page takes: no figures, and the
  //     pre-proxy answer rather than a wrong one.
  const unstated = await tile(holder.id, false);
  check("without the option the count is absent", unstated?.proxiedCount, 0);
  check("…and to-buy falls back to ownership", unstated?.toBuyCount, 1);
  check("…and so does the pill", unstated?.statusPill, "To buy");

  //     Put the deck back to its one-card shape for the checks below.
  await unproxy(holder.id, printed.oracle_id);
  await fixture.execute(sql`delete from deck_cards where deck_id = ${holder.id}`);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${holder.id}, ${card}, 1)
  `);
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${partner}, 1, 'probe')
  `);

  // 3e. THE WRITE'S OWN RULES, against the real table. The server action itself
  //     needs a signed-in request, so what is proved here is the pair of
  //     invariants its SQL carries: a mark for a card the deck does not hold is
  //     refused by the membership predicate, and marking is idempotent.
  //     THE ACTION'S OWN PREDICATE, imported rather than retyped. A probe that
  //     reimplements the thing it is proving proves the copy: with two versions
  //     of this SQL, dropping a commander arm from the action left the probe
  //     green while proxying a commander broke.
  const held = async (deckId: string, oracleId: string) => {
    const { rows } = await fixture.execute<{ held: boolean }>(
      sql`select ${proxiedMembership(deckId, oracleId)} as held`,
    );
    return rows[0]?.held ?? null;
  };
  const { rows: [stranger] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id desc limit 1
  `);
  check("a card the deck holds passes the membership test", await held(printer.id, card), true);
  check("this deck's commander passes it too", await held(printer.id, cmdB), true);
  check("a card the deck never held does not", await held(printer.id, stranger.oracle_id), false);

  //     Idempotent: the control's second press is the state the reader can
  //     already see, not an error.
  await fixture.execute(sql`
    insert into deck_proxies (deck_id, oracle_id) values (${printer.id}, ${card})
    on conflict (deck_id, oracle_id) do nothing
  `);
  const { rows: [again] } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from deck_proxies
    where deck_id = ${printer.id} and oracle_id = ${card}
  `);
  check("marking twice is one mark", again.n, 1);

  // 3f. THE LIST ROUTE'S OWN LOADER, which no unit test reaches: the view tests
  //     inject rows, and every reader above is a different query. It is raw SQL
  //     over five tables, and an invalid column reference in one — `released_at`
  //     on `printings`, which lives on `sets` — typechecks perfectly and 500s the
  //     route. Running it at all is most of this check's value.
  const list = await loadProxyList(USER);
  const listed = list.rows.find((r) => r.oracleId === card);
  check("the list finds the printed card", Boolean(listed), true);
  //     ONE ROW PER CARD, however many printings it has. `printings` fans out and
  //     `jsonb_agg` does not deduplicate, so aggregating after that join listed
  //     the same deck once per printing.
  check("one row per card, not one per printing",
    list.rows.filter((r) => r.oracleId === card).length, 1);
  check("its deck is named once", listed?.decks.length, 1);
  //     Scoped to this reader: another player's proxies are not this list.
  const otherList = await loadProxyList("nobody-at-all");
  check("another reader's list is empty", otherList.rows.length, 0);
  //     A commander proxy is flagged, and the flag is a BOOLEAN — `bool_or`
  //     returns null when every input is null, which is the body-card case.
  const listCmdRow = list.rows.find((r) => r.oracleId === cmdB);
  check("a commander proxy is flagged", listCmdRow?.commander, true);
  check("a body-card proxy is flagged false, never null", listed?.commander, false);
  //     And the printing identity comes from ONE printing rather than from
  //     independent aggregates that could describe a printing nobody prints.
  //     NULLABLE by design — a catalog card with no `printings` row has no set
  //     to name — so what is asserted is that the field ARRIVES, which is what
  //     the invalid `released_at` reference would have taken down with it.
  check("the printing identity is present or honestly null",
    listed !== undefined && (listed.setCode === null || typeof listed.setCode === "string"),
    true);

  // 4. THE SLOT GOES, THE STATEMENT GOES. A proxy is one deck's answer about one
  //    slot, so the row dies with the slot — `pruneOrphanProxies`, which every
  //    write that can shrink a deck's list calls.
  //
  //    Membership-scoped reads alone are NOT this guarantee. They make a
  //    surviving row inert for as long as the card is absent, and then the card
  //    comes back and the anti-join matches it again. A probe that asserted only
  //    the inert half would pass over exactly that: the check below removes the
  //    card, puts it back, and asks what the deck is billed.
  await fixture.execute(sql`
    delete from deck_cards where deck_id = ${printer.id} and oracle_id = ${card}
  `);
  await pruneOrphanProxies(realDb, printer.id);
  await commit(printer.id, cmdB, 2, [], partner);
  const { rows: orphan } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from deck_proxies
    where deck_id = ${printer.id} and oracle_id = ${card}
  `);
  check("the removal takes the proxy row with it", orphan[0].n, 0);

  // 4a. THE RE-ADD. The card returns to the deck. It must arrive UNPROXIED — the
  //     deck claims a copy again and is billed for it, because nobody has said
  //     they are printing this one since it came back.
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${printer.id}, ${card}, 1)
  `);
  check("a re-added card is not silently proxied", await free(card, printer.id), -1);
  check("a re-added card is billed again", await buyCopies(printer.id, card), 1);

  // 4b. A PROXIED COMMANDER SURVIVES AN EDIT TO THE LIST BELOW IT. The prune
  //     reconciles against membership, and both commander columns are
  //     membership — read from `deck_cards` alone it would delete this row on
  //     the next removal of any other card.
  await pruneOrphanProxies(realDb, printer.id);
  const { rows: cmdRow } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from deck_proxies
    where deck_id = ${printer.id} and oracle_id = ${cmdB}
  `);
  check("a commander's proxy survives the prune", cmdRow[0].n, 1);

  // 5. UNPROXYING RESTORES THE CLAIM, on a card that is proxied right now.
  await proxy(printer.id, card);
  check("proxied again, the deck is not short", await free(card, printer.id), 0);
  await unproxy(printer.id, card);
  check("unproxying puts the deck back in the queue", await free(card, printer.id), -1);
  check("unproxying puts the card back on the bill", await buyCopies(printer.id, card), 1);
} finally {
  // deck_proxies, deck_versions and deck_cards all cascade off decks.
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
  await pool.end();
}

console.log(failures === 0 ? "\nBoth anti-joins hold, on both queries." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
