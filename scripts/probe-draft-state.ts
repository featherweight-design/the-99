// The draft readers, proved against a real Postgres by calling the real
// `loadDraftState` and `loadDraftRows`.
//
// Every figure these two return comes out of a snapshot transaction, a diff
// against a committed version, a claim read, a price join and a collection
// lookup. No unit test in this repository can assemble that — the pure halves
// (`draftDiff`, `bucketDraftAdds`, `summarisePrices`, `averageManaValue`) are
// unit tested, and this script is the only proof the readers put them together
// over real rows.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. No
// begin/rollback: the readers go through the src/db singleton, which is a
// different connection from the one this script opens, so a transaction held
// here would be invisible to the functions under test.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:draft`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import {
  changeCount,
  hasChanges,
  loadDraftRows,
  loadDraftState,
  loadVersionShape,
} from "../src/lib/decks/draft-state";
import { computeRoleCounts } from "../src/lib/decks/mix";
import { restoreDraftFromVersion } from "../src/lib/decks/versions";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-draft-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

// Every pick is taken against the ids already claimed, and `taken` grows as they
// are. The five selectors overlap by construction — an `Artifact` with a live
// price and a `Sorcery` are drawn from the same table, and the price selector
// excludes only basics and legends — so two roles could otherwise land on one
// card. The fixture would then add and cut the same oracle id and every count
// below would be wrong, in a way that depended on which catalog it ran against.
const taken: string[] = [];
const one = async (label: string, query: (excluded: string[]) => ReturnType<typeof sql>) => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(query(taken));
  if (!rows[0]) throw new Error(`${label}: no candidate in the catalog — seed it first`);
  taken.push(rows[0].oracle_id);
  return rows[0].oracle_id;
};

// `<> all(...)` rather than `not in`: an empty JS array becomes an empty
// Postgres array, which is true for every row, where an empty `not in ()` list
// is a syntax error. So the first pick needs no special case.
const notTaken = (column: string, excluded: string[]) =>
  sql.raw(`${column} <> all(`).append(sql`${sql.param(excluded)}::uuid[])`);

// Read from the catalog rather than hard-coded: a fixed uuid rots the first time
// it moves. The priced card must carry a LIVE price — `priceState` calls a row
// whose `as_of` is behind the newest in the table sold out, and a sold-out card
// is priced by nothing, so a stale pick would make the total assertions vacuous.
const pickCards = async () => ({
  commander: await one("commander", (excluded) => sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and ${notTaken("oracle_id", excluded)}
    order by oracle_id limit 1
  `),
  priced: await one("priced add", (excluded) => sql`
    select distinct on (p.oracle_id) p.oracle_id from printing_prices pp
    join printings p on p.scryfall_id = pp.scryfall_id
    join cards c on c.oracle_id = p.oracle_id
    where pp.price_cents is not null
      and pp.as_of = (select max(as_of) from printing_prices)
      and c.type_line !~ '\\mBasic\\M' and c.type_line !~ 'Legendary'
      and ${notTaken("p.oracle_id", excluded)}
    order by p.oracle_id limit 1
  `),
  unpriced: await one("unpriced add", (excluded) => sql`
    select c.oracle_id from cards c
    where c.type_line !~ '\\mBasic\\M' and c.type_line !~ 'Legendary'
      and ${notTaken("c.oracle_id", excluded)}
      and not exists (
        select 1 from printings p
        join printing_prices pp on pp.scryfall_id = p.scryfall_id
        where p.oracle_id = c.oracle_id
      )
    order by c.oracle_id limit 1
  `),
  kept: await one("kept card", (excluded) => sql`
    select oracle_id from cards
    where type_line ~ 'Instant' and type_line !~ 'Legendary'
      and ${notTaken("oracle_id", excluded)}
    order by oracle_id limit 1
  `),
  cut: await one("cut card", (excluded) => sql`
    select oracle_id from cards
    where type_line ~ 'Sorcery' and type_line !~ 'Legendary'
      and ${notTaken("oracle_id", excluded)}
    order by oracle_id limit 1
  `),
  basic: await one("basic land", (excluded) => sql`
    select oracle_id from cards
    where type_line ~ '\\mBasic\\M.*Land' and ${notTaken("oracle_id", excluded)}
    order by oracle_id limit 1
  `),
});

// Wrapped in main() rather than run at top level: tsx transpiles this repo's
// scripts to CJS, where a top-level await is a build error.
async function main() {
const card = await pickCards();

const put = (deckId: string, oracleId: string, quantity: number) => fixture.execute(sql`
  insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${oracleId}, ${quantity})
  on conflict (deck_id, oracle_id) do update set quantity = ${quantity}
`);

try {
  // The cut card is OWNED; the two adds are not. That split is what makes the
  // adds unfree and therefore priced, and it is what the `out` row's ownership
  // dot reads.
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${card.cut}, 1, 'probe'), (${USER}, ${card.commander}, 1, 'probe')
  `);
  const { rows: [deck] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'Probe deck', ${card.commander}) returning id
  `);

  // 1. A BREW. No version, so there is nothing for a draft to be pending
  //    against — not an empty change list, an absent one.
  await put(deck.id, card.kept, 1);
  const brew = await loadDraftState(deck.id, USER, process.env);
  check("a brew has no version", brew.version, null);
  check("a brew has nothing pending", hasChanges(brew), false);

  // Sleeve it as v1: the kept card and the card a later edit will cut.
  await put(deck.id, card.cut, 1);
  const { rows: [v1] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
    insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
    values (${deck.id}, 1, now(), ${card.commander}, now()) returning id, committed_at
  `);
  await fixture.execute(sql`
    insert into deck_version_cards (version_id, oracle_id, quantity, since) values
      (${v1.id}, ${card.kept}, 1, ${v1.committed_at}),
      (${v1.id}, ${card.cut}, 1, ${v1.committed_at})
  `);

  // 2. THE SNAPSHOT PAIRING. The version and the deck's rows are read under one
  //    `repeatable read` transaction, so a draft identical to its version has
  //    nothing pending — not every card in v1 listed as an add.
  const clean = await loadDraftState(deck.id, USER, process.env);
  check("a committed deck reads its own version", clean.version?.number, 1);
  check("an untouched draft is clean", changeCount(clean), 0);

  // 3. A BASICS-ONLY EDIT. Real, committable, and priceable by nothing — and a
  //    NAMED ROW all the same. Twelve Islands going into a deck is the edit the
  //    review page exists to describe, and a player who cannot read the count
  //    cannot know how many to take out of the box. What a basic is kept out of
  //    is the money: it is never asked about, it buckets free, and nothing
  //    quotes a price for it.
  await put(deck.id, card.basic, 12);
  const basicsOnly = await loadDraftState(deck.id, USER, process.env);
  check("a basics-only edit is a change", changeCount(basicsOnly), 1);
  check("…and names the card", basicsOnly.names.get(card.basic) !== undefined, true);
  check("…with the pair it moved between",
    `${basicsOnly.addChanges[0]?.from}→${basicsOnly.addChanges[0]?.to}`, "0→12");
  check("…bucketed free", basicsOnly.adds[0]?.bucket, "free");
  check("…and costing nothing", basicsOnly.unfreeCount, 0);
  check("…so no price is quoted", basicsOnly.total, null);
  check("…and nothing is pullable", basicsOnly.pullableCount, 0);

  // 4. A REAL EDIT: two adds in, one card out.
  await put(deck.id, card.priced, 1);
  await put(deck.id, card.unpriced, 1);
  await fixture.execute(sql`
    delete from deck_cards where deck_id = ${deck.id} and oracle_id = ${card.cut}
  `);
  const state = await loadDraftState(deck.id, USER, process.env);
  //    Three adds: the two cards, and the twelve Islands still sitting in the
  //    draft from step 3. A basic alongside other changes is a row like the rest.
  check("the adds are named", state.adds.length, 3);
  check("the cut is named", state.removes.length, 1);
  check("the basic is among the adds", state.adds.some((a) => a.oracleId === card.basic), true);

  //    `names` is a CHANGED-CARD map. The facts behind it are read over the whole
  //    draft because the mana average needs every row, and a consumer enumerating
  //    this map must not draw the kept card, which did not move.
  check("names covers the changed cards and nothing else", state.names.size, 4);

  // 5. THE PURCHASE. Neither add is owned, so both are unfree; one has a live
  //    price and one has never been stocked. A figure over partial coverage
  //    reads as a complete one, so the coverage travels with it.
  //    The basic is the third add and is not among them: it was never asked
  //    about, so a mixed draft's money figures are the same as they were before
  //    the Islands were staged.
  check("both unowned adds cost something, and the basic does not", state.unfreeCount, 2);
  check("the total covers the one priced copy", state.pricedCopies, 1);
  check("…and is stated", state.total !== null, true);
  check("…against the feed's newest run", state.newestAsOf !== null, true);

  // 6. THE ROWS. Driven by the state's own two lists so the drawn rows cannot
  //    drift out of step with the counts, and `quantity` is the DELTA.
  const { rows } = await loadDraftRows(deck.id, USER, process.env);
  check("an in row per add", rows.in.length, 3);
  check("an out row per cut", rows.out.length, 1);
  check("the out row is the cut card", rows.out[0]?.oracleId, card.cut);
  check("the out row counts the copies it lost", rows.out[0]?.quantity, 1);
  check("the out row prints the pair it moved between", `${rows.out[0]?.from}→${rows.out[0]?.to}`, "1→0");
  //    The collection lookup: the cut copy is going back to a box the player has,
  //    and the two adds are cards they do not own.
  check("the cut card reads as owned", rows.out[0]?.owned, true);
  check(
    "an add reads as unowned",
    rows.in.filter((r) => r.oracleId !== card.basic).every((r) => !r.owned),
    true,
  );
  //    Except the basic, which is owned whatever the collection says — that
  //    column is the one thing keeping a buy tag off twelve Islands.
  check(
    "the basic row reads as owned",
    rows.in.find((r) => r.oracleId === card.basic)?.owned,
    true,
  );
  check(
    "…and carries no availability to draw a marker from",
    rows.in.find((r) => r.oracleId === card.basic)?.availability ?? null,
    null,
  );
  //    A cut makes no purchase decision, whatever the claim read said.
  check("an out row carries no bucket", rows.out[0]?.bucket, null);

  // 7. THE VERSION'S SHAPE. What the mix strip's `was n` figures are counted
  //    from, and the one read here that goes through the catalog rather than the
  //    diff: `deck_version_cards` stores an oracle id and a quantity and no type
  //    line at all, so a broken join returns nothing and every previous count
  //    silently disappears rather than failing. A second version carries a basic
  //    land at 12 copies, because the fold is per-copy and a role read off a row
  //    count would pass on a quantity of one.
  const { rows: [v2] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
    insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
    values (${deck.id}, 2, now(), ${card.commander}, now()) returning id, committed_at
  `);
  await fixture.execute(sql`
    insert into deck_version_cards (version_id, oracle_id, quantity, since) values
      (${v2.id}, ${card.kept}, 1, ${v2.committed_at}),
      (${v2.id}, ${card.basic}, 12, ${v2.committed_at})
  `);
  const shape = await loadVersionShape(v2.id);
  check("the version's cards come back", shape.length, 2);
  check(
    "the catalog join carried a type line for every one",
    shape.every((s) => s.typeLine.length > 0),
    true,
  );
  check("a basic land folds to the land role", shape.filter((s) => s.role === "land").length, 1);
  //    Through the same `computeRoleCounts` the strip uses, so the figure the
  //    cells read is the figure proved here.
  check("the fold counts copies, not rows", computeRoleCounts(shape).land, 12);

  // 8. THE DISCARD. `restoreDraftFromVersion` replaces `deck_cards` with the
  //    newest version's list, and takes the deck's unresolved paste lines with
  //    it. Those lines are not `deck_cards` rows, so the wholesale delete does
  //    not reach them and no version stores them: left behind, the deck would
  //    land on its committed list and still draw a banner asking the player to
  //    resolve lines belonging to an edit that no longer exists.
  await fixture.execute(sql`
    insert into deck_unresolved_rows (deck_id, raw_name, quantity, source_line)
    values (${deck.id}, 'Definitely Not A Card', 1, 3)
  `);
  const outcome = await restoreDraftFromVersion(deck.id, v2.id);
  check("a discard restores the newest version", outcome, "restored");
  const { rows: [restored] } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from deck_cards where deck_id = ${deck.id}
  `);
  check("the draft holds exactly the version's cards", restored?.n, 2);
  const { rows: [left] } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from deck_unresolved_rows where deck_id = ${deck.id}
  `);
  check("…and no unresolved line survives it", left?.n, 0);
  //    A version behind the newest is refused rather than written: restoring it
  //    would overwrite v2's own cards with the list before them.
  check("an older version is refused", await restoreDraftFromVersion(deck.id, v1.id), "moved");

  // 9. THE REMOVAL'S LOCK. `removeCardFromDeck` picks between a decrement and a
  //    delete by reading the row first, and the discard above replaces every
  //    `deck_cards` row wholesale. Unlocked, a removal that waited out a discard
  //    found its decrement matching nothing and fell through to an unconditional
  //    delete — taking a card straight back out of the list the discard had just
  //    restored, with nothing recording it. Both paths now take the row's own
  //    lock, and a lock is invisible to every unit test in this repository.
  //
  //    Two raw clients on deliberately interleaved statements, because the damage
  //    needs the interleaving: a removal that starts while a discard holds the
  //    lock, and resumes after it commits. `removeCardFromDeck` takes a Clerk
  //    session, which a script has no way to hold, so both sides are the SQL those
  //    two paths issue — the removal's read-then-write as it now stands beside the
  //    single unconditional statement it replaced.
  const restorer = await pool.connect();
  const remover = await pool.connect();
  try {
    const lockedRead = "select quantity from deck_cards where deck_id = $1 and oracle_id = $2 for update";
    const oldDecrement =
      "update deck_cards set quantity = quantity - 1 " +
      "where deck_id = $1 and oracle_id = $2 and quantity > 1 returning oracle_id";

    // The discard's half, statement for statement: both locks, then the wholesale
    // replacement. Held open, so the removal below starts against the old rows.
    await restorer.query("begin");
    await restorer.query("select id from decks where id = $1 for update", [deck.id]);
    await restorer.query("select oracle_id from deck_cards where deck_id = $1 for update", [deck.id]);

    // Deliberately not awaited: this blocks on the lock above, and the discard has
    // to commit while it waits or there is no race to observe.
    await remover.query("begin");
    const waiting = remover.query(lockedRead, [deck.id, card.kept]);

    await restorer.query("delete from deck_cards where deck_id = $1", [deck.id]);
    await restorer.query(
      "insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1), ($1, $3, 12)",
      [deck.id, card.kept, card.basic],
    );
    await restorer.query("commit");

    // The tuple this read locked was deleted by the commit, so the read comes back
    // empty and `removeCardFromDeck` returns without writing. That is the whole
    // fix: the row it named is gone.
    const { rows: afterWait } = await waiting;
    check("a removal resuming after a discard finds its row deleted", afterWait.length, 0);
    await remover.query("rollback");

    // The statement it replaced, on the same interleaving, reported the same
    // nothing — and fell through to an unconditional delete, which matched the
    // freshly restored row and took a card out of a list nobody had edited.
    await remover.query("begin");
    const { rowCount: wouldDelete } = await remover.query(
      "select oracle_id from deck_cards where deck_id = $1 and oracle_id = $2",
      [deck.id, card.kept],
    );
    const { rows: decremented } = await remover.query(oldDecrement, [deck.id, card.kept]);
    check("the decrement it replaced matched nothing", decremented.length, 0);
    check("…while the delete behind it would have hit the restored row", wouldDelete, 1);
    await remover.query("rollback");

    // And the restored list is whole: this whole step wrote nothing to it.
    const { rows: [whole] } = await fixture.execute<{ n: number }>(sql`
      select count(*)::int as n from deck_cards where deck_id = ${deck.id}
    `);
    check("the restored list survives the removal", whole?.n, 2);
  } finally {
    restorer.release();
    remover.release();
  }
} finally {
  // Ordered by dependency; deck_versions and deck_cards cascade off decks.
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
  await pool.end();
}

console.log(failures === 0 ? "\nEvery draft figure holds." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
