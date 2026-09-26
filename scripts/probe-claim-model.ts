// The claim model's states, proved against a real Postgres by calling the real
// loadAvailability. A probe that re-declared the SQL would prove only that its
// copy is self-consistent.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. No
// begin/rollback: loadAvailability goes through the src/db singleton, which is
// a different connection from the one this script opens, so a transaction held
// here would be invisible to the function under test.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:claims`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { and, eq, sql } from "drizzle-orm";
import ws from "ws";
import { loadAvailability, loadDeckBuyRows } from "../src/lib/decks/availability-query";
import { db } from "../src/db";
import { deckCards } from "../src/db/schema";
import { writePullRelease } from "../src/lib/decks/pull-release";
import { commitVersion, restoreDraftFromVersion } from "../src/lib/decks/versions";
import { addCardToDeckFor } from "../src/lib/decks/add-card";
import { assignCopyFor } from "../src/lib/decks/assign";
import { pruneOrphanAssignments } from "../src/lib/decks/prune-assignments";
import { loadContestedCards } from "../src/lib/collection/summary-read";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-claim-${Date.now()}`;
// The reservation section builds its own fixture under its own id. It needs a
// contested card that IS a legendary creature — two of its cases hand a deck the
// card as its commander — and the section above forbids that overlap outright,
// so the two cannot share a fixture.
const USER_R = `probe-reserve-${Date.now()}`;
// And the commander ceiling gets a third, for the reason its own header gives: its
// figures are only computable against a fixture where nothing else claims the card.
const USER_C = `probe-ceiling-${Date.now()}`;
// And the chooser's own write gets a fourth. It calls the guarded write directly — the server
// action around it needs a request, and what these cases are about is what the DATABASE refuses.
const USER_W = `probe-write-${Date.now()}`;
// And the review page's own read gets a fifth: its two filters and its UNEXCLUDED vantage are
// facts about a query, and a component test fed hand-built props cannot see either.
const USER_D = `probe-door-${Date.now()}`;
// And Pull it's release (Hugh, 2026-09-27) gets a sixth: a pull that edits the source's draft and
// leaves its version standing, with the copy freed through a release row both readers subtract.
const USER_P = `probe-pull-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

// The card being fought over, and two legends to lead the decks. Read from the
// catalog rather than hard-coded: a fixed uuid rots the first time it moves.
// THREE DISTINCT IDS — a commander that is also the contested card claims twice
// against one owned copy and every figure below is wrong.
const pickCards = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  const { rows: [subject] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id limit 1
  `);
  if (rows.length < 2 || !subject) throw new Error("catalog is empty — seed it first");
  return { cmdA: rows[0].oracle_id, cmdB: rows[1].oracle_id, card: subject.oracle_id };
};

// ── RESERVATIONS ──────────────────────────────────────────────────────────────
//
// card_assignments overriding seniority. Its own fixture, its own user id, and a
// LEGENDARY contested card, because two of these cases give a deck that card as
// its commander — the overlap pickCards above refuses for the seniority section.
//
// What each case is worth, since several of them pass for the wrong reason if the
// fixture is even slightly off:
//
//  * The baseline pair is what makes every later figure readable. Without it a
//    reservation that changed nothing would look identical to one that worked.
//  * The ask cap and the supply cap fail in OPPOSITE directions — one grants too
//    much, one grants nothing — so a run that only checked "the junior deck is
//    covered" would pass over both.
//  * The commander cases are the only proof the ceiling is in the arithmetic. A
//    chooser that merely refuses to draw a commander option passes every other
//    check here.
async function reservationSection() {
  const { rows: legends } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 3
  `);
  if (legends.length < 3) throw new Error("catalog is empty — seed it first");
  const card = legends[0].oracle_id;
  const cmdA = legends[1].oracle_id;
  const cmdB = legends[2].oracle_id;

  const own = async (copies: number) => {
    await fixture.execute(sql`delete from collection_items where user_id = ${USER_R}`);
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER_R}, ${card}, ${copies}, 'probe')
    `);
  };
  const free = async (deckId: string) => {
    const a = await loadAvailability(USER_R, { oracleIds: [card], excludeDeckId: deckId });
    return a.get(card)?.free ?? null;
  };
  const claimOn = async (vantage: string, holder: string) => {
    const a = await loadAvailability(USER_R, { oracleIds: [card], excludeDeckId: vantage });
    return a.get(card)?.claims.find((c) => c.id === holder) ?? null;
  };
  const makeDeck = async (name: string, cmd: string) => {
    const { rows: [d] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_R}, ${name}, ${cmd}) returning id
    `);
    return d.id;
  };
  // `ago` is minutes, so two versions committed in one run still order.
  const commit = async (
    deckId: string, cmd: string, number: number,
    opts: { holds?: number; ago?: number } = {},
  ) => {
    const ago = opts.ago ?? 0;
    const { rows: [v] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
      insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${deckId}, ${number}, now() - (${ago} * interval '1 minute'), ${cmd},
              now() - (${ago} * interval '1 minute'))
      returning id, committed_at
    `);
    if (opts.holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${card}, ${opts.holds}, ${v.committed_at})
      `);
    }
    return v.id;
  };
  const assign = async (deckId: string, copies = 1, ago = 0) => {
    await fixture.execute(sql`
      insert into card_assignments (user_id, oracle_id, deck_id, copies, created_at)
      values (${USER_R}, ${card}, ${deckId}, ${copies}, now() - (${ago} * interval '1 minute'))
      on conflict (user_id, oracle_id, deck_id) do update
        set copies = ${copies}, created_at = excluded.created_at
    `);
  };
  const clearAssignments = () =>
    fixture.execute(sql`delete from card_assignments where user_id = ${USER_R}`);

  try {
    await own(1);
    // A committed the card first, B second. Both list one copy; one copy exists.
    const a = await makeDeck("Senior list", cmdA);
    const b = await makeDeck("Junior list", cmdB);
    await commit(a, cmdA, 1, { holds: 1, ago: 60 });
    await commit(b, cmdB, 1, { holds: 1, ago: 30 });
    for (const d of [a, b]) {
      await fixture.execute(sql`
        insert into deck_cards (deck_id, oracle_id, quantity) values (${d}, ${card}, 1)
      `);
    }

    // 1. WITH NO ROWS IN THE TABLE, seniority answers exactly as it did before
    //    reservations existed. This is the claim that the model change is inert,
    //    measured rather than asserted.
    check("inert: the senior deck is covered", await free(a), 0);
    check("inert: the junior deck buys", await free(b), -1);

    // 2. THE HEADLINE. A reservation for the junior deck beats an earlier `since`,
    //    and the senior deck is the one told to buy. No list was edited either way.
    await assign(b);
    check("a reservation beats an earlier since", await free(b), 0);
    check("the displaced senior deck buys instead", await free(a), -1);

    // 2b. THE OTHER READ SITE. loadDeckBuyRows is what the deck tile, the Shopping
    //     list and the price strip bill from, and it computes the same allocation
    //     through a second, independently written expression. A reservation that
    //     moved `free` and not this one would leave the deck page and the receipt
    //     disagreeing about the same card — which is the exact class of defect the
    //     three-term decomposition exists to prevent, so it is asserted rather than
    //     assumed. (With the reservation terms dropped from this query alone, the
    //     figures below swap.)
    const owes = async (deckId: string) => {
      const rows = await loadDeckBuyRows(USER_R, [deckId]);
      return rows.filter((r) => r.oracleId === card).reduce((n, r) => n + r.quantity, 0);
    };
    check("the displaced senior deck is billed for a copy", await owes(a), 1);
    check("and the reserving deck is billed for none", await owes(b), 0);

    // 2b-ii. RESERVATIONS DO NOT TOUCH THE PULL GUARD. `senior` gates whether a pull
    //     is offered and stays a pure seniority question: a junior claim is not a pull
    //     source, reservation or no reservation. A deck displaced by somebody's pick
    //     gets its copy back by CHANGING THE PICK — which edits nobody's list — where a
    //     pull edits the holder's draft. An exception here was added during review
    //     and then removed: it is wrong for a partial reservation, since pulling one
    //     copy from a deck asking for two leaves its reservation granting one and
    //     moves no figure at all. See the note on DeckClaim.senior.
    const seniorFlag = async (vantage: string, holder: string) => {
      const av = await loadAvailability(USER_R, { oracleIds: [card], excludeDeckId: vantage });
      return av.get(card)?.claims.find((c) => c.id === holder)?.senior ?? null;
    };
    check("a reservation does not make its holder a pull source",
      await seniorFlag(a, b), false);

    // 2c. OFF ANY DECKLIST. With no vantage deck, `free` means what it has always
    //     meant — copies not sleeved in a committed deck — and a reservation must not
    //     move it: a reserved copy is still sleeved in the same deck it was. This is
    //     the branch that reads the UNRESERVED hard total, and it exists only because
    //     reserved copies are subtracted separately; reading the raw hard total there
    //     subtracts them twice. Nothing else in this file takes this read, so the
    //     branch is unproven without it. (With the split reverted this is the only
    //     check that fails.)
    const offDecklist = async () => {
      const av = await loadAvailability(USER_R, { oracleIds: [card] });
      return av.get(card)?.free ?? null;
    };
    // Two committed decks each claim the one copy, so this reads -1 with or without
    // a reservation — that invariance IS the check. Reading the raw hard total here
    // subtracts the reserved copy a second time and it reads -2.
    check("off any decklist a reservation moves nothing", await offDecklist(), -1);

    // 3. Capped at the deck's own ask — and the SUPPLY has to be generous for this
    //    case to measure anything. With one copy owned the supply ceiling binds
    //    first, so a reservation of three grants one whether or not the ask is
    //    capped, and the check passes over a build with the cap removed (confirmed:
    //    it did). With three copies owned the ask is the only thing standing between
    //    a reservation of three and three granted copies, and the senior deck's
    //    surplus is what reports it: 1 with the cap, -1 without.
    await own(3);
    await assign(b, 3);
    check("a reservation is capped at the deck's ask", await free(a), 1);
    check("and the reserving deck is covered", await free(b), 1);
    await own(1);

    // 4. Capped at the supply left when its turn comes. The senior deck reserves
    //    too, LATER, against a card with nothing left: it grants nothing, and
    //    neither figure moves. Without the window frame this case grants both.
    await assign(b, 1, 10);
    await assign(a, 1, 5);
    check("a later reservation with no supply left grants nothing", await free(b), 0);
    check("and the earlier reservation still holds", await free(a), -1);

    // 5. Two copies, two reservations, both honoured.
    await own(2);
    check("two copies cover both reservations", await free(a), 0);
    check("from either side", await free(b), 0);

    // 5b. A RESERVED SENIOR IS NOT ALSO A SENIOR CLAIM. Three copies, two of them
    //     reserved to a and b, and a third deck holding neither: it takes the copy
    //     that is left. Counting a reserved claim in the seniority term as well as in
    //     reserved_others bills that third deck twice for the same two copies and it
    //     reads -1. The remainder cap hides this whenever the remainder is 0, which
    //     is every other case in this section — confirmed: with the double count put
    //     back, this is the only check in the file that fails.
    await own(3);
    const third = await makeDeck("Third list", cmdB);
    await commit(third, cmdB, 1, { holds: 1, ago: 5 });
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${third}, ${card}, 1)
    `);
    await assign(a, 1, 40);
    await assign(b, 1, 35);
    check("a reserved senior claim is not counted twice", await free(third), 0);
    await fixture.execute(sql`delete from decks where id = ${third}`);
    await clearAssignments();
    // Back to the two copies case 6 is written against.
    await own(2);

    // 6. NO SHORTAGE, WITH A LIVE RESERVATION — the state a player reaches by
    //    choosing during a shortage and then buying the second copy. What must not
    //    move is a PURCHASE: neither deck buys, before or after. `free` is not a
    //    purchase — it is this deck's surplus — and it does move, from 1 to 0,
    //    because a copy reserved to the other deck is not this deck's spare. That is
    //    the same reading seniority already gives, with the reservation making a
    //    junior claim senior for one copy.
    //
    //    Asserted rather than deleted: this case previously cleared the reservation
    //    first, and so proved nothing about a reservation outliving its shortage.
    await own(2);
    await assign(b);
    check("no shortage: the reserving deck buys nothing", await owes(b), 0);
    check("no shortage: the other deck buys nothing either", await owes(a), 0);
    check("and its surplus is the copy that is genuinely spare", await free(a), 0);
    // Then with the reservation gone, the spare copy is the senior deck's again.
    await clearAssignments();
    check("with the reservation cleared the surplus returns", await free(a), 1);

    // 7. The stamp the chooser draws its order and its `v7 · 2 Aug` from.
    const senior = await claimOn(b, a);
    check("a committed claim carries its version number", senior?.versionNumber, 1);
    // The EXACT value, not just its type. `since` is promised as epoch millis, and a
    // regression to epoch seconds — or to any other numeric stamp — stays a number
    // while the UI renders 1970. The fixture knows what it inserted, so it compares.
    const { rows: [vsince] } = await fixture.execute<{ ms: string }>(sql`
      select (extract(epoch from vc.since) * 1000)::bigint::text as ms
      from deck_version_cards vc
      join deck_versions v on v.id = vc.version_id
      where v.deck_id = ${a} and vc.oracle_id = ${card}
    `);
    check("a committed claim carries its since as epoch millis",
      String(senior?.since), vsince.ms);
    check("a list copy is no commander copies", senior?.commanderCopies, 0);

    // 8. A BREW IS NOT RESERVABLE. It claims softly by design, and a reservation
    //    for one would let it make a sleeved deck short — the inversion the whole
    //    model is built to prevent. The join to the committed claim refuses it
    //    with no rule of its own.
    await own(1);
    const brew = await makeDeck("Brew", cmdB);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${brew}, ${card}, 1)
    `);
    await assign(brew);
    check("a reservation naming a brew grants nothing", await free(a), 0);
    const brewClaim = await claimOn(a, brew);
    check("and a brew's claim carries no version", brewClaim?.versionNumber, null);
    check("nor a since stamp", brewClaim?.since, null);
    await clearAssignments();

    // 9. A DRAFT-ONLY ADD IS NOT RESERVABLE either, and for the same reason read
    //    the other way: a sleeved deck's claim states its VERSION, so a card it
    //    holds only in its draft has no committed claim to reserve against.
    //    Without this a draft add could displace a hard claimant, which is the
    //    precise thing seniority exists to prevent.
    const drafter = await makeDeck("Draft add", cmdB);
    await commit(drafter, cmdB, 1, { ago: 20 });
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${drafter}, ${card}, 1)
    `);
    await assign(drafter);
    check("a reservation on a draft-only add grants nothing", await free(a), 0);
    check("and the drafting deck still buys its copy", await free(drafter), -1);
    await clearAssignments();

    // 12. The row goes with the deck. LAST, because it deletes a deck every case
    //     above depends on.
    await assign(b);
    await fixture.execute(sql`delete from decks where id = ${b}`);
    const { rows: left } = await fixture.execute<{ n: number }>(sql`
      select count(*)::int as n from card_assignments where user_id = ${USER_R}
    `);
    check("a reservation is deleted with its deck", left[0].n, 0);
  } finally {
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_R}`);
    await fixture.execute(sql`delete from decks where user_id = ${USER_R}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER_R}`);
  }
}

// ── THE COMMANDER CEILING ─────────────────────────────────────────────────────
//
// Its own fixture, and that is not tidiness. Every figure here is a subtraction
// over EVERY deck that claims the card, so the section above — which deliberately
// accumulates a brew, a draft-add deck and two list claimants — cannot host a case
// whose expected value is worked out by hand. Read against that fixture the folded
// case reports -2, which is correct arithmetic and proves nothing about commanders.
//
// What it proves: a commander's copy is not reservable, and on a folded claim
// exactly the list half is. The ceiling lives in the arithmetic, so a chooser that
// merely declines to draw a commander option would pass nothing here.
async function commanderCeilingSection() {
  const { rows: legends } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  if (legends.length < 2) throw new Error("catalog is empty — seed it first");
  const card = legends[0].oracle_id;
  const otherCmd = legends[1].oracle_id;

  const own = async (copies: number) => {
    await fixture.execute(sql`delete from collection_items where user_id = ${USER_C}`);
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER_C}, ${card}, ${copies}, 'probe')
    `);
  };
  const free = async (deckId: string) => {
    const a = await loadAvailability(USER_C, { oracleIds: [card], excludeDeckId: deckId });
    return a.get(card)?.free ?? null;
  };

  try {
    await own(1);
    // The commander deck is SENIOR here, which is the case worth testing: it holds
    // the copy, and the question is whether a reservation can take it. (Junior, it
    // never had the copy, so a refused reservation would change nothing and the
    // check would measure nothing — which is exactly how the first draft of this
    // passed while asserting the wrong numbers.)
    const { rows: [cmdDeck] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_C}, 'Led by it', ${card}) returning id
    `);
    const { rows: [lister] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_C}, 'Lists it', ${otherCmd}) returning id
    `);
    const { rows: [vc] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${cmdDeck.id}, 1, now() - interval '90 minutes', ${card},
              now() - interval '90 minutes')
      returning id
    `);
    const { rows: [vl] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${lister.id}, 1, now() - interval '60 minutes', ${otherCmd},
              now() - interval '60 minutes')
      returning id
    `);
    await fixture.execute(sql`
      insert into deck_version_cards (version_id, oracle_id, quantity, since)
      values (${vl.id}, ${card}, 1, now() - interval '60 minutes')
    `);
    for (const d of [cmdDeck.id, lister.id]) {
      await fixture.execute(sql`
        insert into deck_cards (deck_id, oracle_id, quantity) values (${d}, ${card}, 1)
      `);
    }
    // cmdDeck's draft lists a copy too, so its ask is 2 while its version holds the
    // commander alone — remove that until the folded case wants it.
    await fixture.execute(sql`
      delete from deck_cards where deck_id = ${cmdDeck.id}
    `);

    check("baseline: the commander deck holds its copy", await free(cmdDeck.id), 0);
    check("baseline: the deck listing it buys", await free(lister.id), -1);

    await fixture.execute(sql`
      insert into card_assignments (user_id, oracle_id, deck_id) values (${USER_C}, ${card}, ${lister.id})
    `);
    check("a commander's copy cannot be reserved away", await free(lister.id), -1);
    check("and the commander deck keeps it", await free(cmdDeck.id), 0);

    // THE FOLDED CLAIM. The commander deck lists a copy as well, so its ask is two
    // and exactly one of the two is reservable. With two copies owned, giving one
    // away leaves it holding its commander and buying its list copy.
    await own(2);
    await fixture.execute(sql`
      insert into deck_version_cards (version_id, oracle_id, quantity, since)
      values (${vc.id}, ${card}, 1, now() - interval '90 minutes')
    `);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${cmdDeck.id}, ${card}, 1)
    `);
    const a = await loadAvailability(USER_C, { oracleIds: [card], excludeDeckId: lister.id });
    const folded = a.get(card)?.claims.find((c) => c.id === cmdDeck.id);
    check("a folded claim asks for two", folded?.quantity, 2);
    check("of which one is a commander copy", folded?.commanderCopies, 1);
    await fixture.execute(sql`
      update card_assignments set copies = 2 where user_id = ${USER_C} and deck_id = ${lister.id}
    `);
    check("only the list copy of a folded claim is reservable", await free(cmdDeck.id), -1);
    check("so the reserving deck gets exactly one", await free(lister.id), 0);

    // AND THE SAME CAP WHEN THE FOLDED DECK IS THE ONE RESERVING. Its ask is two,
    // but one of those two is its commander and the ceiling already guarantees that
    // copy — so a reservation of two would book three copies for an ask of two, and
    // the deck that loses one is a third deck nobody was choosing between. Three
    // copies owned, because at two the ceiling binds first and the cap is invisible
    // (confirmed: with the commander subtraction removed, a two-copy fixture passes).
    await own(3);
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_C}`);
    const { rows: [bystander] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_C}, 'Bystander', ${otherCmd}) returning id
    `);
    const { rows: [vb] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${bystander.id}, 1, now() - interval '120 minutes', ${otherCmd},
              now() - interval '120 minutes')
      returning id
    `);
    await fixture.execute(sql`
      insert into deck_version_cards (version_id, oracle_id, quantity, since)
      values (${vb.id}, ${card}, 1, now() - interval '120 minutes')
    `);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${bystander.id}, ${card}, 1)
    `);
    await fixture.execute(sql`
      insert into card_assignments (user_id, oracle_id, deck_id, copies)
      values (${USER_C}, ${card}, ${cmdDeck.id}, 2)
    `);
    check("a folded deck reserves its list copy only", await free(bystander.id), 1);

    // A BREW'S COMMANDER SETS NO CEILING. The ceiling exists because a committed
    // deck's commander copy is untouchable; a brew's is not — a brew claims softly,
    // and counting its commander here would let one veto every reservation on its
    // commander card. all_claims has three brew arms, two of them commander arms, so
    // the restriction to committed decks is one join and easy to lose. Confirmed:
    // with that join removed this is the only check in the file that fails.
    await fixture.execute(sql`delete from decks where user_id = ${USER_C}`);
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_C}`);
    await own(1);
    const mk = async (name: string, cmd: string, ago: number | null) => {
      const { rows: [d] } = await fixture.execute<{ id: string }>(sql`
        insert into decks (user_id, name, commander_oracle_id)
        values (${USER_C}, ${name}, ${cmd}) returning id
      `);
      await fixture.execute(sql`
        insert into deck_cards (deck_id, oracle_id, quantity) values (${d.id}, ${card}, 1)
      `);
      if (ago !== null) {
        const { rows: [v] } = await fixture.execute<{ id: string }>(sql`
          insert into deck_versions
            (deck_id, number, committed_at, commander_oracle_id, commander_since)
          values (${d.id}, 1, now() - (${ago} * interval '1 minute'), ${cmd},
                  now() - (${ago} * interval '1 minute'))
          returning id
        `);
        await fixture.execute(sql`
          insert into deck_version_cards (version_id, oracle_id, quantity, since)
          values (${v.id}, ${card}, 1, now() - (${ago} * interval '1 minute'))
        `);
      }
      return d.id;
    };
    const seniorList = await mk("Senior", otherCmd, 90);
    const juniorList = await mk("Junior", otherCmd, 60);
    // A brew LED BY the contested card, which is the whole point of this case.
    await fixture.execute(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_C}, 'Brew led by it', ${card})
    `);
    await fixture.execute(sql`
      insert into card_assignments (user_id, oracle_id, deck_id)
      values (${USER_C}, ${card}, ${juniorList})
    `);
    check("a brew's commander sets no ceiling", await free(juniorList), 0);
    check("and the displaced senior deck buys", await free(seniorList), -1);
  } finally {
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_C}`);
    await fixture.execute(sql`delete from decks where user_id = ${USER_C}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER_C}`);
  }
}

// ── THE CHOOSER'S WRITE ────────────────────────────────────────────────────────
//
// `assignCopy` authorizes itself inside its own transaction, and every guard it applies is a
// question about what the database holds RIGHT NOW — the summary's rows come out of a payload
// written at import time, so by the time a player presses one a deck can have committed a
// removal, promoted the card to its commander, or had the last spare taken by another pick.
// None of that is reachable from a unit test: the guards read committed versions, a collection
// and other people's reservations.
//
// It calls the real action, which needs a signed-in reader — so the fixture writes under the id
// `requireUserId` will return, and the run is pointed at a database where that account exists.
async function assignmentWriteSection() {
  const { rows: legends } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  if (legends.length < 2) throw new Error("catalog is empty — seed it first");
  const card = legends[0].oracle_id;
  const otherCmd = legends[1].oracle_id;

  const decksMade: string[] = [];
  const mk = async (name: string, cmd: string, ago: number, holds: boolean) => {
    const { rows: [d] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_W}, ${name}, ${cmd}) returning id
    `);
    decksMade.push(d.id);
    const { rows: [v] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${d.id}, 1, now() - (${ago} * interval '1 minute'), ${cmd},
              now() - (${ago} * interval '1 minute'))
      returning id
    `);
    if (holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${card}, 1, now() - (${ago} * interval '1 minute'))
      `);
      await fixture.execute(sql`
        insert into deck_cards (deck_id, oracle_id, quantity) values (${d.id}, ${card}, 1)
      `);
    }
    return d.id;
  };
  const rowsFor = async (deckId: string) => {
    const { rows } = await fixture.execute<{ n: number }>(sql`
      select count(*)::int as n from card_assignments
      where user_id = ${USER_W} and oracle_id = ${card} and deck_id = ${deckId}
    `);
    return rows[0].n;
  };

  try {
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER_W}, ${card}, 1, 'probe')
    `);
    const senior = await mk("Write senior", otherCmd, 60, true);
    const junior = await mk("Write junior", otherCmd, 30, true);

    // 1. THE PICK. One copy, two committed claimants, and the junior deck is given it.
    check("a pick is accepted", await assignCopyFor(USER_W, card, junior), null);
    check("and writes exactly one row", await rowsFor(junior), 1);

    // 2. THE TOGGLE. Pressing the same deck again takes the copy back, and a cleared row is
    //    indistinguishable from one never written.
    check("pressing the same deck clears it", await assignCopyFor(USER_W, card, junior), null);
    check("and leaves no row behind", await rowsFor(junior), 0);

    // 3. THE MOVE, AND IT IS ALWAYS A MOVE. One authored reservation per card, whatever the
    //    supply: the chooser is a single-choice control by design, and two reservations would put
    //    two checked radios in one group. Seniority allocates every copy this pick does not.
    await assignCopyFor(USER_W, card, junior);
    check("a second pick moves the reservation rather than adding one",
      await assignCopyFor(USER_W, card, senior), null);
    const { rows: [held] } = await fixture.execute<{ n: number }>(sql`
      select count(*)::int as n from card_assignments
      where user_id = ${USER_W} and oracle_id = ${card}
    `);
    check("leaving exactly one on the card", held.n, 1);
    check("off the deck that had it", await rowsFor(junior), 0);
    check("and onto the deck just named", await rowsFor(senior), 1);
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_W}`);

    // 4. A DRAFT-ONLY ADD IS REFUSED BY NAME. The deck has a version, and that version does not
    //    list the card — reserving on a draft add would let it displace a hard claimant.
    const drafter = await mk("Write drafter", otherCmd, 20, false);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${drafter}, ${card}, 1)
    `);
    check("a draft-only add is refused by name",
      await assignCopyFor(USER_W, card, drafter), "claimant-no-longer-asks");
    check("and writes nothing", await rowsFor(drafter), 0);

    // 5. A COMMANDER IS REFUSED BY ITS OWN NAME, and before the claim check: a player told
    //    instead that the deck is not asking for the card would go looking for a problem with a
    //    list that is perfectly correct.
    const { rows: [cmdDeck] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_W}, 'Write commander', ${card}) returning id
    `);
    decksMade.push(cmdDeck.id);
    await fixture.execute(sql`
      insert into deck_versions (deck_id, number, commander_oracle_id) values (${cmdDeck.id}, 1, ${card})
    `);
    check("a commander is refused by its own name",
      await assignCopyFor(USER_W, card, cmdDeck.id), "target-is-commander");

    // 6. NO SUPPLY LEFT. The commander deck above now holds the only copy, so the ceiling is
    //    nought and there is nothing any pick can give away.
    check("a pick with no giveable copy is refused by name",
      await assignCopyFor(USER_W, card, senior), "no-supply-left");

    // 6b. A FOLDED CLAIM IS RESERVABLE FOR ITS LIST COPY. A deck holding the card as its
    //     commander AND on its list has one copy that cannot be given and one that can, and the
    //     design draws that row as half-live. Refusing the whole deck — which an earlier guard
    //     did, by asking only whether its commander was this card — made that state unreachable
    //     for the deck it describes.
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_W}`);
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER_W}, ${card}, 1, 'probe2')
    `);
    const { rows: [cmdVersion] } = await fixture.execute<{ id: string }>(sql`
      select id from deck_versions where deck_id = ${cmdDeck.id} order by number desc limit 1
    `);
    await fixture.execute(sql`
      insert into deck_version_cards (version_id, oracle_id, quantity, since)
      values (${cmdVersion.id}, ${card}, 1, now())
      on conflict do nothing
    `);
    check("a folded claim can be given its list copy",
      await assignCopyFor(USER_W, card, cmdDeck.id), null);
    await fixture.execute(sql`
      delete from deck_version_cards where version_id = ${cmdVersion.id} and oracle_id = ${card}
    `);
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_W}`);

    // 7. A PROXY ENDS THE CLAIM, SO IT ENDS THE PICK. The claim model anti-joins `deck_proxies`,
    //    so a deck printing the card claims nothing — reserving a real copy for it would take one
    //    from a deck that needs it. Refused on the way in…
    // The commander deck from case 5 holds the only copy, which is what case 6 just proved — so
    // it goes before anything here can be given away at all.
    await fixture.execute(sql`delete from decks where id = ${cmdDeck.id}`);
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_W}`);
    await fixture.execute(sql`
      insert into deck_proxies (deck_id, oracle_id) values (${junior}, ${card})
      on conflict do nothing
    `);
    check("a proxied deck cannot be given a copy",
      await assignCopyFor(USER_W, card, junior), "claimant-no-longer-asks");
    await fixture.execute(sql`delete from deck_proxies where deck_id = ${junior}`);

    //    …and swept if the proxy lands AFTER the pick. Inert is not gone: the row would match
    //    again the moment the card was unproxied, arriving silently already holding the copy.
    // The senior deck still holds the reservation from case 3's move, and one copy exists — so
    // the junior's pick would be a MOVE and land, but the fixture is clearer with the card free.
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_W}`);
    check("a pick before the proxy is accepted", await assignCopyFor(USER_W, card, junior), null);
    check("a reservation exists before the proxy", await rowsFor(junior), 1);
    await fixture.execute(sql`
      insert into deck_proxies (deck_id, oracle_id) values (${junior}, ${card})
      on conflict do nothing
    `);
    await pruneOrphanAssignments(fixture, junior);
    check("and is gone after the deck prints the card", await rowsFor(junior), 0);
    await fixture.execute(sql`delete from deck_proxies where deck_id = ${junior}`);

    // 8. A COMMIT THAT DROPS THE CARD TAKES THE RESERVATION WITH IT. A deck that drops a card
    //    and adds it back later must not resurrect a decision made about a different list.
    await assignCopyFor(USER_W, card, senior);
    check("a reservation exists before the commit", await rowsFor(senior), 1);
    await fixture.execute(sql`delete from deck_cards where deck_id = ${senior}`);
    await commitVersion(senior, null);
    check("and is gone after a commit without the card", await rowsFor(senior), 0);
  } finally {
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_W}`);
    await fixture.execute(sql`delete from decks where user_id = ${USER_W}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER_W}`);
  }
}

// ── THE SECOND DOOR'S OWN READ ─────────────────────────────────────────────────
//
// `loadContestedCards` is what `/decks/[id]/changes` hangs its chooser off, and two of its rules
// are invisible to a component test fed hand-built props:
//
//   IT READS UNEXCLUDED. A row on that page is loaded from the deck's own vantage, which is right
//   for its buy tag and wrong here — the queue's subject is the committed decks INCLUDING the one
//   the reader is looking at, and an excluded read leaves that deck out of its own decision.
//   IT FILTERS TWICE. Demand above supply, and at least two committed claimants: a shortage with
//   one claimant is a purchase rather than a choice, and drawing it would offer a chooser with
//   one option.
async function changesDoorSection() {
  const { rows: legends } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  const card = legends[0].oracle_id;
  const cmd = legends[1].oracle_id;

  const mk = async (name: string, ago: number, quantity: number) => {
    const { rows: [d] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_D}, ${name}, ${cmd}) returning id
    `);
    const { rows: [v] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${d.id}, 1, now() - (${ago} * interval '1 minute'), ${cmd},
              now() - (${ago} * interval '1 minute'))
      returning id
    `);
    await fixture.execute(sql`
      insert into deck_version_cards (version_id, oracle_id, quantity, since)
      values (${v.id}, ${card}, ${quantity}, now() - (${ago} * interval '1 minute'))
    `);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${d.id}, ${card}, ${quantity})
    `);
    return d.id;
  };

  try {
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER_D}, ${card}, 1, 'probe')
    `);
    const senior = await mk("Door senior", 60, 1);
    const junior = await mk("Door junior", 30, 1);

    const [contested] = await loadContestedCards([card], USER_D);
    check("the door finds the contested card", contested?.oracleId, card);
    // BOTH decks, including the one whose page this would be. An excluded read returns one.
    check("and both committed claimants", contested?.claimants.length, 2);
    check("in commit order", contested?.claimants[0]?.deckId, senior);
    check("with the junior deck buying", contested?.claimants[1]?.allocated, 0);

    // A SHORTAGE WITH ONE CLAIMANT IS NOT A CHOICE. The junior deck goes; the senior one asks for
    // two copies against the one owned, which is short by one and has nobody to be short against.
    await fixture.execute(sql`delete from decks where id = ${junior}`);
    await fixture.execute(sql`
      update deck_version_cards vc set quantity = 2
      from deck_versions v where v.id = vc.version_id and v.deck_id = ${senior}
    `);
    const alone = await loadContestedCards([card], USER_D);
    check("one claimant short of two copies is not contested", alone.length, 0);

    // AND NEITHER IS A CARD WITH ENOUGH COPIES FOR EVERYONE.
    await fixture.execute(sql`
      update collection_items set quantity = 4 where user_id = ${USER_D} and oracle_id = ${card}
    `);
    const covered = await loadContestedCards([card], USER_D);
    check("nor a card the collection covers", covered.length, 0);
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER_D}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER_D}`);
  }
}

// ── PULL IT: A DRAFT AND A RELEASE ─────────────────────────────────────────────
//
// Hugh's ruling of 2026-09-27: a pull takes the card out of the SOURCE deck's draft and commits
// nothing, and the asking deck's buy tag clears at once because a `pull_releases` row subtracts the
// pulled copy from the source's committed claim. Discarding the source's draft undoes the pull,
// release included; committing it keeps the pull; putting the card back takes the release back.
//
// Every figure is read through BOTH claim readers, because the deck page reads one and the
// Shopping list, the price strip and the tile read the other. The release is subtracted once, in
// `all_claims`, which both share — so the mutation that drops it is one edit and fails both halves.
//
// The pull's own writes are emulated here with the real `writePullRelease`: the server action
// around them needs a request and a signed-in reader. The discard, the commit and the add are the
// real functions, since clearing the release is theirs to do and is what these cases are about.
async function pullReleaseSection() {
  const { rows: legends } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M' and commander_legal
    order by oracle_id limit 2
  `);
  // Colourless, so it fits either commander when the real add validates it, and not a basic,
  // which the add would count up rather than refuse as a repeat.
  const { rows: [subject] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary' and commander_legal
      and cardinality(color_identity) = 0
    order by oracle_id limit 1
  `);
  if (legends.length < 2 || !subject) throw new Error("catalog is empty — seed it first");
  const card = subject.oracle_id;
  const [cmdA, cmdB] = [legends[0].oracle_id, legends[1].oracle_id];

  const mk = async (name: string, cmd: string, holds: boolean) => {
    const { rows: [d] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER_P}, ${name}, ${cmd}) returning id
    `);
    const { rows: [v] } = await fixture.execute<{ id: string }>(sql`
      insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${d.id}, 1, now() - interval '1 hour', ${cmd}, now() - interval '1 hour')
      returning id
    `);
    if (holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${card}, 1, now() - interval '1 hour')
      `);
    }
    // Both drafts hold the card: the source because it is sleeved there, the asker because it is
    // the add the pull is for.
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${d.id}, ${card}, 1)
    `);
    return d.id;
  };
  const free = async (deckId: string) => {
    const a = await loadAvailability(USER_P, { oracleIds: [card], excludeDeckId: deckId });
    return a.get(card)?.free ?? null;
  };
  const owes = async (deckId: string) => {
    const rows = await loadDeckBuyRows(USER_P, [deckId]);
    return rows.filter((r) => r.oracleId === card).reduce((n, r) => n + r.quantity, 0);
  };
  // The asker's figure through each reader, labelled, so a failure names the reader that moved.
  const both = async (label: string, deckId: string, freeWant: number, owesWant: number) => {
    check(`${label} (loadAvailability)`, await free(deckId), freeWant);
    check(`${label} (loadDeckBuyRows)`, await owes(deckId), owesWant);
  };
  const pull = (source: string, asking: string) =>
    db.transaction(async (tx) => {
      await tx.delete(deckCards).where(and(eq(deckCards.deckId, source), eq(deckCards.oracleId, card)));
      await writePullRelease(tx, { userId: USER_P, sourceDeckId: source, oracleId: card, askingDeckId: asking });
    });
  const count = async (q: ReturnType<typeof sql>) =>
    Number((await fixture.execute<{ n: number }>(q)).rows[0].n);
  const versions = (deckId: string) =>
    count(sql`select count(*)::int as n from deck_versions where deck_id = ${deckId}`);
  const releases = (deckId: string) =>
    count(sql`select count(*)::int as n from pull_releases where source_deck_id = ${deckId}`);
  const inDraft = (deckId: string) =>
    count(sql`select count(*)::int as n from deck_cards where deck_id = ${deckId} and oracle_id = ${card}`);
  const newestId = async (deckId: string) => (await fixture.execute<{ id: string }>(sql`
    select id from deck_versions where deck_id = ${deckId} order by number desc limit 1
  `)).rows[0].id;

  try {
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER_P}, ${card}, 1, 'probe')
    `);
    const source = await mk("Pull source", cmdA, true);
    const asking = await mk("Pull asker", cmdB, false);
    // A hand-set reservation on the source: the player's own pick, which a pull must neither
    // write nor delete, and which must not keep a released copy from reaching the asker.
    await fixture.execute(sql`
      insert into card_assignments (user_id, oracle_id, deck_id, copies)
      values (${USER_P}, ${card}, ${source}, 1)
    `);

    // 0. The baseline: one copy, sleeved in the source, so the asker's add buys it.
    await both("before the pull, the asker is short", asking, -1, 1);

    // 1. THE PULL. A draft on the source and no version; the asker is covered at once.
    await pull(source, asking);
    check("the pull cuts the source no version", await versions(source), 1);
    check("the pull takes the card out of the source's draft", await inDraft(source), 0);
    check("and records one release", await releases(source), 1);
    await both("after the pull, the asker is covered", asking, 0, 0);
    check("the source is not billed for the copy it gave up", await owes(source), 0);
    check("the hand-set reservation is untouched",
      await count(sql`select count(*)::int as n from card_assignments where user_id = ${USER_P}`), 1);

    // 1b. THE CHOOSER AGREES. A source whose only copy was pulled claims nothing, so a new pick
    //     for it is refused the way any deck that no longer asks is. The hand-set row goes first:
    //     pressing a deck that already holds the pick clears it rather than asking the question.
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_P}`);
    check("the chooser refuses a pick for a source whose copy was pulled",
      await assignCopyFor(USER_P, card, source), "claimant-no-longer-asks");

    // 2. DISCARD UNDOES IT. The real discard puts the card back in the source's draft and must
    //    take the release with it, or the asker keeps a copy the source is holding again.
    check("the discard restores the source's draft",
      await restoreDraftFromVersion(source, await newestId(source)), "restored");
    check("the card is back in the source's draft", await inDraft(source), 1);
    check("and the release is gone", await releases(source), 0);
    await both("after the discard, the asker is short again", asking, -1, 1);

    // 2b. ANY PATH BACK CANCELS IT. The card returns to the source's draft by a bare write, the
    //     way a top-off, a list update or a swap would put it there, none of which knows releases
    //     exist. The row is still standing, and the claim model bounds it by what the draft lacks,
    //     so the source claims the copy again all the same.
    await pull(source, asking);
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${source}, ${card}, 1)
    `);
    check("a bare re-add leaves the release row standing", await releases(source), 1);
    await both("and still the asker is short again", asking, -1, 1);
    await fixture.execute(sql`delete from pull_releases where source_deck_id = ${source}`);

    // 3. PUT BACK TAKES IT BACK. Pull again, then the real add returns the card to the source.
    await pull(source, asking);
    await both("after a second pull, the asker is covered", asking, 0, 0);
    const back = await addCardToDeckFor(USER_P, source, card, { relock: false });
    check("put back writes the card", back.wrote, "added");
    check("and names the asker whose copy it took back", back.released?.[0], asking);
    check("its release is gone", await releases(source), 0);
    await both("after put back, the asker is short again", asking, -1, 1);

    // 4. COMMIT KEEPS IT. Pull again and commit the source: its new version lists no card, so the
    //    copy stays the asker's, and the release has nothing left to subtract from and is gone.
    await pull(source, asking);
    await commitVersion(source, null);
    check("the source's commit is its second version", await versions(source), 2);
    check("the commit clears the release", await releases(source), 0);
    await both("after the source commits, the asker is still covered", asking, 0, 0);

    // 4b. A STALE RELEASE WOULD BITE LATER. The source takes the card back and commits it: it holds
    //     the copy again, as senior, and the asker is short. A release the commit left behind
    //     would subtract from this new claim and hand the asker a copy nobody gave up.
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${source}, ${card}, 1)
    `);
    await commitVersion(source, null);
    await both("when the source commits the card again, the asker is short", asking, -1, 1);

    // 5. TWO ASKERS, BOTH TOLD. The same card pulled from the same source for two decks is two
    //    rows, and the discard hands BOTH back, read under the restore's own lock. One row keyed on
    //    the source and card alone kept only the last asker, and the first was never refreshed.
    const second = await mk("Pull second asker", cmdB, false);
    await pull(source, asking);
    await db.transaction((tx) => writePullRelease(tx, {
      userId: USER_P, sourceDeckId: source, oracleId: card, askingDeckId: second,
    }));
    check("two askers are two release rows", await releases(source), 2);
    // Put back returns ONE copy, so it takes back one release: the newest, and only its asker.
    const one = await addCardToDeckFor(USER_P, source, card, { relock: false });
    check("put back takes back only the newest release", (one.released ?? []).join(","), second);
    check("and leaves the other standing", await releases(source), 1);
    await fixture.execute(sql`delete from deck_cards where deck_id = ${source} and oracle_id = ${card}`);
    await db.transaction((tx) => writePullRelease(tx, {
      userId: USER_P, sourceDeckId: source, oracleId: card, askingDeckId: second,
    }));
    let told: string[] = [];
    await restoreDraftFromVersion(source, await newestId(source), (ids) => { told = ids; });
    check("the discard names both askers", [...told].sort().join(","), [asking, second].sort().join(","));
    check("and clears both rows", await releases(source), 0);
  } finally {
    await fixture.execute(sql`delete from card_assignments where user_id = ${USER_P}`);
    await fixture.execute(sql`delete from decks where user_id = ${USER_P}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER_P}`);
  }
}

// Wrapped in main() rather than run at top level: tsx transpiles this repo's
// scripts to CJS, where a top-level await is a build error.
async function main() {
const { cmdA, cmdB, card } = await pickCards();

// The vantage deck's free figure for the one contested copy.
const free = async (deckId: string) => {
  const availability = await loadAvailability(USER, {
    oracleIds: [card],
    excludeDeckId: deckId,
  });
  return availability.get(card)?.free ?? null;
};

// One deck's claim on one card, read from another deck's vantage — which is the
// vantage the review page renders from: the asking deck looking at a holder.
const claim = async (oracleId: string, vantage: string, holder: string) => {
  const availability = await loadAvailability(USER, {
    oracleIds: [oracleId],
    excludeDeckId: vantage,
  });
  return availability.get(oracleId)?.claims.find((c) => c.id === holder) ?? null;
};

try {
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${card}, 1, 'probe'), (${USER}, ${cmdB}, 1, 'probe')
  `);
  // `older` was REGISTERED first; `newer` actually sleeved the card. Under the
  // old created_at seniority older would win, which is the bug being fixed.
  const { rows: [older] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at)
    values (${USER}, 'Older deck', ${cmdA}, now() - interval '1 year') returning id
  `);
  const { rows: [newer] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at)
    values (${USER}, 'Newer deck', ${cmdB}, now()) returning id
  `);

  const commit = async (deckId: string, cmd: string, number: number, holds: boolean) => {
    const { rows: [v] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
      insert into deck_versions
        (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${deckId}, ${number}, now(), ${cmd}, now())
      returning id, committed_at
    `);
    if (holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${card}, 1, ${v.committed_at})
      `);
    }
    return v.id;
  };

  // On a deck's own page `free` is a SURPLUS, not a count of copies in a box:
  // the vantage deck's own claim is subtracted alongside the senior ones. So 0
  // means "holds what it needs and no spare", and a NEGATIVE figure is the
  // shortfall — the number of copies this deck has to go and buy. Every
  // expected value below is read that way.

  // The newer deck sleeves the card; the older deck has not drafted it yet.
  await commit(newer.id, cmdB, 1, true);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${newer.id}, ${card}, 1)
  `);

  // 1. There is nothing for a draft add to take: the one copy is inside
  //    another deck's committed version.
  check("no free copy to add", await free(older.id), 0);

  // 2. A pending remove still claims: drop it from the newer deck's DRAFT
  //    while its version still lists it, and the copy stays spoken for.
  await fixture.execute(sql`delete from deck_cards where deck_id = ${newer.id}`);
  check("pending remove still claims", await free(older.id), 0);
  // …while the holder's OWN page reads a surplus of 1, because own_claim is what
  // its draft asks for and its draft has cut the card. The claim it keeps against
  // every other deck (the check above) and the surplus it reports to itself are
  // different questions: the version is what holds the copy, the draft is what
  // this deck is asking for.
  check("the holder's own draft no longer asks for the copy", await free(newer.id), 1);

  // 2a. THE CLAIM'S FLAGS, which are render-time facts rather than refusals from
  //     inside a transaction. The newer deck's draft now differs from the
  //     version it is sleeved as, so it reads as pending — which no longer
  //     guards a pull (2026-09-27), since a pull joins that draft.
  check("the holder reads as pending", (await claim(card, older.id, newer.id))?.pending, true);
  //     …and a list card is not a commander claim, whoever holds it.
  check("a list card is not a commander claim", (await claim(card, older.id, newer.id))?.commander, false);
  //     The commander itself is: no route releases it, so no control is drawn.
  check("the commander claim is flagged", (await claim(cmdB, older.id, newer.id))?.commander, true);

  // 2b. A DRAFT ADD ON A SLEEVED DECK. The older deck commits a version without
  //     the card, then its draft adds it. own_claim is read from deck_cards, so
  //     the add is measured like any other copy this deck is asking for and the
  //     deck is told it is short — the figure loadDeckBuyRows has always billed.
  //     Read from the version instead, the add contributed nothing, free came
  //     back 0, and the decklist went silent while the receipt charged for it.
  await commit(older.id, cmdA, 1, false);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${older.id}, ${card}, 1)
  `);
  check("a draft add on a sleeved deck is short a copy", await free(older.id), -1);

  // 3. THE HEADLINE. Between two sleeved versions the earlier `since` holds the
  //    card, whatever the decks' ages. The older deck commits the add SECOND, so
  //    it is told to buy — a negative free — instead of quietly emptying the
  //    newer deck's box.
  await commit(older.id, cmdA, 2, true);
  check("the later commit buys rather than taking the copy", await free(older.id), -1);

  // 3a. THE SAME RULE, PER CLAIM. `senior` is what decides whether a pull is
  //     offered at all, and it is the one flag that has to disagree between the
  //     two vantages on the same pair of decks: the newer deck's `since` is
  //     earlier, so it is senior to the older deck and its copy is worth asking
  //     for, while the older deck is junior and releasing its copy would move no
  //     figure. A flag computed from the decks' own ages rather than from `since`
  //     would read true from both vantages and offer a pull that cannot help.
  check("the earlier holder is senior from the later deck's vantage",
    (await claim(card, older.id, newer.id))?.senior, true);
  check("the later holder is junior from the earlier deck's vantage",
    (await claim(card, newer.id, older.id))?.senior, false);

  // 4. The source committing a version without the card settles it: the asking
  //    deck stops being short. (A pull itself no longer commits; see the pull
  //    section below for the release that clears the asker before any commit.)
  await commit(newer.id, cmdB, 2, false);
  check("the pull clears the shortfall", await free(older.id), 0);
  // …and the copy is now the older deck's, so the source has none spare.
  check("the source deck has no spare copy after the pull", await free(newer.id), 0);

  await reservationSection();
  await commanderCeilingSection();
  await assignmentWriteSection();
  await changesDoorSection();
  await pullReleaseSection();
} finally {
  // Ordered by dependency; deck_versions and deck_cards cascade off decks.
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
  await pool.end();
}

console.log(failures === 0 ? "\nEvery figure and guard holds." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
