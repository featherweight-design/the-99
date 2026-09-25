// probe:swap-fits-data — Fits your decks' read and its add against a real Postgres (swap tools PR 5a),
// by calling the real `loadFits` and `addCardToDeckFor`.
//
// WHY A DATABASE. `shapeFits` is pure and unit tested; what no unit test reaches is the one deck
// query that feeds it: the union of a pair's identities, the copies a deck holds, whether the card
// leads a deck, and an inclusion read from the commander's support list or, for a pair, from
// `commander_pair_support_cards` under its canonical key. It also proves the role count behind a
// need, the availability beside it, and that the add Fits calls is the deck page's add: validated,
// written, and refused off-identity with nothing written.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. The pair case needs
// a `commander_pair_support_cards` row and local-dev has none, so it writes ONE sentinel pair (an
// `absent` header and one card) under a key it claims atomically, and deletes both in the same
// `finally`. Point it at `local-dev` or a scratch branch, never production.
//
// Four mutations fail it: the pair read keyed on the deck's columns instead of the canonical key
// (inclusion null), the partner's identity dropped from the union (the pair deck no longer fits),
// `leads` hard-coded false (the commander's own decks fit it), and the role count ignoring the role
// (have 3). The pair deck is led by a blue legend with the card's commander as PARTNER, and its id
// sorts after it, which is what makes the first two measurable at all: with the card's colors on the
// deck's first column and the ids in canonical order, both mutations passed.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { addCardToDeckFor } from "../src/lib/decks/add-card";
import { primaryRole } from "../src/lib/decks/read";
import { commitVersion } from "../src/lib/decks/versions";
import { loadFits } from "../src/lib/swaps/fits";
import { loadCardDetail } from "../src/lib/collection/card-detail";

neonConfig.webSocketConstructor = ws;
// The card payload's Fits gate reads only with the swap tools on, as a deployment with them on does.
process.env.SWAP_TOOLS_ENABLED = "true";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-swap-fits-${Date.now()}`;
const OTHER = `${USER}-other`;
// Asserted rather than annotated: set inside main(), so a plain `null` initialiser narrows it to never here.
let sentinel = null as { a: string; b: string; card: string } | null;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures += 1;
  console.log(`${a === e ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];

type CardRow = { oracle_id: string; name: string; type_line: string; oracle_text: string | null; keywords: string[] | null; color_identity: string[] };
const roleOf = (c: CardRow) => primaryRole({ typeLine: c.type_line, oracleText: c.oracle_text, keywords: c.keywords ?? [] });

async function makeDeck(user: string, name: string, commander: string, partner: string | null, cards: string[]) {
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${user}, ${name}, ${commander}::uuid, ${partner}::uuid) returning id`);
  for (const oracleId of cards) {
    await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${oracleId}::uuid, 1)`);
  }
  return deck.id;
}

async function main() {
  // THE CARD, chosen by what the code under test would say rather than by what a query matched: a
  // colored, non-blue card on some commander's support list with a figure, whose primary role is
  // one of the four the mix measures. Ordered, so the fixture is the same on every run.
  const candidates = await rows<CardRow & { commander: string; inclusion: number; cmd_identity: string[] }>(sql`
    select c.oracle_id, c.name, c.type_line, c.oracle_text, c.keywords, c.color_identity,
      s.commander_oracle_id as commander, s.inclusion, cmd.color_identity as cmd_identity
    from commander_support_cards s
    join cards c on c.oracle_id = s.oracle_id
    join cards cmd on cmd.oracle_id = s.commander_oracle_id
    join commander_support cs on cs.commander_oracle_id = s.commander_oracle_id and cs.avg_ramp is not null
    where s.inclusion is not null and c.commander_legal and cmd.commander_legal
      and cardinality(c.color_identity) between 1 and 2 and not ('U' = any(c.color_identity))
      and cmd.type_line ~* 'legendary creature' and c.type_line !~* 'legendary'
    order by s.inclusion desc, c.name limit 400`);
  const x = candidates.find((c) => ["ramp", "draw", "removal", "wipes"].includes(roleOf(c)));
  if (!x) throw new Error("no support card with a measured role on this database");
  const role = roleOf(x) as "ramp" | "draw" | "removal" | "wipes";
  console.log(`fixture: ${x.name} (${role}, ${x.color_identity.join("")}) at ${x.inclusion}% for its commander`);

  // Two more cards in the same role, inside the commander's colors: the need's `have`.
  const pool2 = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, color_identity from cards
    where commander_legal and color_identity <@ ${sql.param(x.cmd_identity)}::text[] and oracle_id <> ${x.oracle_id}::uuid
      and type_line !~* 'land'
    order by name limit 3000`);
  const peers = pool2.filter((c) => roleOf(c) === role).slice(0, 2);
  if (peers.length < 2) throw new Error(`fewer than two ${role} cards in the commander's colors`);
  const [blueCmd] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where commander_legal and type_line ~* 'legendary creature'
      and color_identity = array['U']::text[] order by name limit 1`);

  // Wastes, a land, beside them: a count that ignored the role would read 3.
  const [wastes] = await rows<{ oracle_id: string }>(sql`select oracle_id from cards where name = 'Wastes'`);
  const fits = await makeDeck(USER, "B fits", x.commander, null, [...peers.map((p) => p.oracle_id), wastes.oracle_id]);
  const holds = await makeDeck(USER, "A holds", x.commander, null, [x.oracle_id]);
  const blue = await makeDeck(USER, "C blue", blueCmd.oracle_id, null, []);
  await makeDeck(OTHER, "someone else's", x.commander, null, []);

  // 1. The three groups, by name, and only the reader's own decks.
  const r = await loadFits(USER, x.oracle_id);
  check("groups: the deck that can take it fits", r?.fits.map((d) => d.id), [fits]);
  check("groups: the deck holding it says one copy", r?.holds, [{ id: holds, name: "A holds", quantity: 1 }]);
  check("groups: the blue deck is ruled out by the card's colors", r?.excluded.map((d) => [d.id, d.outside]), [[blue, x.color_identity]]);

  // 2. The facts on a fitting deck: the commander's inclusion, and the deck's need in the role.
  const [targets] = await rows<{ t: number }>(sql`
    select ${sql.raw(`avg_${role}`)} as t from commander_support where commander_oracle_id = ${x.commander}::uuid`);
  const f = r?.fits[0];
  check("fits: the inclusion is the support list's figure", f?.inclusion, Number(x.inclusion));
  check("fits: the need counts the deck's own cards in the role", f?.need, { role, have: 2, target: Math.round(Number(targets.t)) });

  // 3. Availability: two owned, one of them held by a committed deck.
  await fixture.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${USER}, ${x.oracle_id}::uuid, 2, 'probe')`);
  await commitVersion(holds, null);
  const owned = await loadFits(USER, x.oracle_id);
  check("availability: owned and free", [owned?.owned, owned?.free], [2, 1]);

  // 3b. The Fits door's gate rides BOTH branches of the card payload: an owned card (two copies
  //     above) and an unowned one, and it reads no decks for a reader who has none.
  const ownedCard = await loadCardDetail(USER, x.oracle_id);
  check("gate: an owned card carries it", [ownedCard?.commanderLegal, ownedCard?.hasDecks], [true, true]);
  const unownedCard = await loadCardDetail(USER, peers[0].oracle_id);
  check("gate: an unowned card carries it", [unownedCard?.quantity, unownedCard?.commanderLegal, unownedCard?.hasDecks], [0, true, true]);
  check("gate: a reader with no decks has none", (await loadCardDetail(`${USER}-nobody`, x.oracle_id))?.hasDecks, false);

  // 4. A deck the card LEADS holds it, even with no deck_cards row.
  const led = await loadFits(USER, x.commander);
  check("leads: the commander's own decks hold it", led?.holds.map((d) => [d.name, d.quantity]), [["A holds", 1], ["B fits", 1]]);
  check("leads: so none of them fits it", led?.fits.length, 0);

  // 5. A pair reads the pair's list, under its canonical key, over the union of both identities.
  // The deck is led by a BLUE legend whose id sorts AFTER the card's commander, with that commander
  // as its partner. So the card's color reaches the deck only through the partner's identity, and
  // the deck's columns are the reverse of the canonical key: both halves of the read are tested.
  const [blueLead] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where commander_legal and type_line ~* 'legendary creature'
      and color_identity = array['U']::text[] and oracle_id > ${x.commander}::uuid order by oracle_id limit 1`);
  if (!blueLead) throw new Error("no blue legend sorts after the fixture's commander");
  const [a, b] = [x.commander, blueLead.oracle_id].sort();
  // OWNED, atomically: the header is inserted with `on conflict do nothing returning`, so a key some
  // other run (or the catalog) already holds returns no row and this run refuses rather than taking
  // it over. `sentinel` is set only once the insert proves the row is this run's, so the `finally`
  // can never delete a row another run wrote. The header is `absent`, so no reader that ranks pairs
  // takes it for an indexed one.
  const [claimed] = await rows<{ commander_oracle_id: string }>(sql`
    insert into commander_pair_support (commander_oracle_id, partner_oracle_id, synergy_state, bracket_counts)
    values (${a}::uuid, ${b}::uuid, 'absent', '{}'::jsonb)
    on conflict do nothing
    returning commander_oracle_id`);
  if (!claimed) throw new Error("the sentinel's pair key already carries a row; refusing to write over it");
  sentinel = { a, b, card: x.oracle_id };
  await fixture.execute(sql`
    insert into commander_pair_support_cards (commander_oracle_id, partner_oracle_id, oracle_id, inclusion, position)
    values (${a}::uuid, ${b}::uuid, ${x.oracle_id}::uuid, 42.5, 1)`);
  const pair = await makeDeck(USER, "D pair", blueLead.oracle_id, x.commander, []);
  const paired = await loadFits(USER, x.oracle_id);
  check("pair: fits, over the union of both identities", paired?.fits.some((d) => d.id === pair), true);
  check("pair: its inclusion is the pair's figure", paired?.fits.find((d) => d.id === pair)?.inclusion, 42.5);
  check("pair: named with both commanders", paired?.fits.find((d) => d.id === pair)?.commanders.length, 2);

  // 6. The add Fits calls is the deck page's add.
  const added = await addCardToDeckFor(USER, fits, x.oracle_id, { relock: false });
  check("add: written", added, { result: { ok: true }, wrote: "added" });
  const after = await loadFits(USER, x.oracle_id);
  check("add: the deck moves from fits to holds", [after?.fits.some((d) => d.id === fits), after?.holds.some((d) => d.id === fits)], [false, true]);
  const again = await addCardToDeckFor(USER, fits, x.oracle_id, { relock: false });
  check("add: a second press is the singleton no-op", again.wrote, "held");
  const refused = await addCardToDeckFor(USER, blue, x.oracle_id, { relock: false });
  check("add: off-identity is refused", refused.wrote, "refused");
  check("add: and wrote nothing", (await rows(sql`select 1 from deck_cards where deck_id = ${blue}::uuid`)).length, 0);
  check("add: another reader's deck is refused",
    await addCardToDeckFor(OTHER, fits, peers[0].oracle_id, { relock: false }).then(() => "written", () => "refused"), "refused");

  // 7. A card that does not exist reads as nothing.
  check("unknown card: null", await loadFits(USER, "00000000-0000-4000-8000-000000000000"), null);
}

void (async () => {
  try {
    await main();
  } catch (e) {
    failures += 1;
    console.log(`FAIL  the run threw — ${(e as Error).message}`);
  } finally {
    // Each step on its own, so one failing cannot strand the rest.
    for (const step of [
      sql`delete from decks where user_id in (${USER}, ${OTHER})`,
      sql`delete from collection_items where user_id = ${USER}`,
      ...(sentinel ? [
        sql`delete from commander_pair_support_cards
          where commander_oracle_id = ${sentinel.a}::uuid and partner_oracle_id = ${sentinel.b}::uuid`,
        sql`delete from commander_pair_support
          where commander_oracle_id = ${sentinel.a}::uuid and partner_oracle_id = ${sentinel.b}::uuid`,
      ] : []),
    ]) {
      await fixture.execute(step).catch((e) => { failures += 1; console.log(`FAIL  cleanup — ${(e as Error).message}`); });
    }
    await pool.end();
  }
  // Reported AFTER the `finally`: an exit there swallows the throw and prints a pass.
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures ? 1 : 0);
})();
