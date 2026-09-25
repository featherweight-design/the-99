// probe:swap-engine — the swap tools' stand-in gather against a real Postgres and the real catalog
// (sub-project 4, PR 1), by calling the real `loadStandIns`.
//
// WHY A DATABASE. Every rule `rankStandIns` applies is a pure function and unit-tested. What only
// a database answers is the GATHER: the guards in SQL (legal in Commander, inside the identity,
// not already in the draft), the commander figure read from the right table (a PAIR's own list for
// a partner deck, never either commander's), the player's copies and whether each is free after a
// take against a real claim, and the bounded spell pool. Each check asserts BOTH sides of its
// relation, because a gather returning every card, or none, passes a one-sided check.
//
// It writes a fixture under a per-run `user_id` (decks, deck cards, collection rows) and one pair
// sentinel in the catalog, and deletes all of it in a `finally`. Point it at `local-dev` or a
// scratch branch, never production.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { commitVersion } from "../src/lib/decks/versions";
import { isLandFace } from "../src/lib/cards/facet";
import { loadUniversalStaples } from "../src/lib/staples/universal";
import { loadStandIns, type StandInsRead } from "../src/lib/swaps/gather";
import { fetchFinds, landColors } from "../src/lib/swaps/land";
import { jobOf, type StandIn } from "../src/lib/swaps/stand-ins";
import { classifyRoles } from "../src/lib/recs/roles";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-swap-engine-${Date.now()}`;

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];

const all = (r: StandInsRead): StandIn[] => [...r.free, ...r.cheapest, ...r.staples, ...r.byCommander, ...r.unlisted];
const names = (list: StandIn[]) => list.map((s) => s.card.name);
const ascending = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);

async function card(name: string): Promise<{ oracle_id: string; color_identity: string[] }> {
  const [c] = await rows<{ oracle_id: string; color_identity: string[] }>(sql`
    select oracle_id, color_identity from cards where name = ${name} and commander_legal`);
  if (!c) throw new Error(`the catalog holds no ${name}`);
  return c;
}

async function makeDeck(name: string, commander: string, cards: string[], partner: string | null = null) {
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${USER}, ${name}, ${commander}::uuid, ${partner}::uuid) returning id`);
  for (const id of cards) {
    await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${id}::uuid, 1)`);
  }
  return deck.id;
}

async function timed<T>(label: string, run: () => Promise<T>): Promise<T> {
  const t = Date.now();
  const out = await run();
  console.log(`      ${label}: ${Date.now() - t}ms`);
  return out;
}

let pairCleanup: { a: string; b: string; card: string } | null = null;

async function main() {
  // A Naya commander, found by query rather than named, so the fixture follows the catalog.
  const [commander] = await rows<{ oracle_id: string; name: string }>(sql`
    select oracle_id, name from cards
    where commander_legal and type_line ~* 'legendary creature' and color_identity @> array['R','G','W']
      and color_identity <@ array['R','G','W'] and oracle_id not in (select commander_oracle_id from commander_pair_support)
      and oracle_id in (select commander_oracle_id from commander_support)
    order by name limit 1`);
  if (!commander) throw new Error("no indexed Naya commander in the catalog");
  console.log(`commander: ${commander.name}`);

  const plateau = await card("Plateau");
  const foothills = await card("Wooded Foothills");
  const vault = await card("Mana Vault");
  const cavern = await card("Cavern of Souls");
  const tower = await card("Command Tower");
  // A card with no job, chosen by asking `jobOf` rather than by name: a card named here as
  // role-less can turn out to carry one (Smothering Tithe's Treasures read as ramp).
  const pool = await rows<{ oracle_id: string; name: string; type_line: string; oracle_text: string | null; keywords: string[]; cmc: number }>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, cmc from cards
    where commander_legal and color_identity <@ array['R','G','W'] and type_line ~* 'enchantment' and type_line !~* 'land'
    order by name limit 200`);
  const rolelessRow = pool.find((c) => jobOf({ oracleId: c.oracle_id, name: c.name, typeLine: c.type_line, oracleText: c.oracle_text, keywords: c.keywords, cmc: Number(c.cmc), imageUri: null }).kind === "none");
  if (!rolelessRow) throw new Error("no role-less enchantment among the first 200");
  const roleless = { oracle_id: rolelessRow.oracle_id, color_identity: [] as string[] };
  console.log(`no-role fixture: ${rolelessRow.name}`);
  const deckId = await makeDeck("probe swap engine", commander.oracle_id,
    [plateau.oracle_id, foothills.oracle_id, vault.oracle_id, cavern.oracle_id, roleless.oracle_id]);
  // One owned Command Tower, spoken for by no one: free after a take. And one owned Dark Ritual:
  // ramp at mana value 1, and black, so only the identity guard keeps it out of Mana Vault's list.
  // Without it the guard's absence is invisible, because the support list and the unlisted pool
  // are both identity-guarded upstream.
  const ritual = await card("Dark Ritual");
  for (const id of [tower.oracle_id, ritual.oracle_id]) {
    await fixture.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${USER}, ${id}::uuid, 1, 'probe')`);
  }

  const identity = new Set(["R", "G", "W"]);
  const draftIds = new Set([plateau.oracle_id, foothills.oracle_id, vault.oracle_id, cavern.oracle_id, roleless.oracle_id, commander.oracle_id]);
  const guards = (label: string, read: StandInsRead) => {
    const list = all(read);
    check(`${label}: nothing already in the draft`, list.every((s) => !draftIds.has(s.card.oracleId)), `${list.length} stand-ins`);
  };

  // 1. A land: every stand-in makes both of Plateau's colors, and the free copy leads.
  const lands = await timed("Plateau", () => loadStandIns(deckId, USER, plateau.oracle_id));
  if (!lands) throw new Error("no read for the fixture's own deck");
  const landList = all(lands);
  check("land: a job read off the text", lands.job.kind === "land", JSON.stringify(lands.job));
  check("land: every stand-in makes white and red", landList.length > 0 && landList.every((s) => {
    const c = landColors(s.card);
    return c.has("R") && c.has("W");
  }), `${landList.length}: ${names(landList).slice(0, 6).join(", ")}…`);
  check("land: the owned Command Tower leads, free", names(lands.free).includes("Command Tower"), names(lands.free).join(", "));
  check("land: a buy is cheaper than the original and cheapest first",
    lands.originalCents === null || (lands.cheapest.every((s) => (s.cents ?? Infinity) < lands.originalCents!) && ascending(lands.cheapest.map((s) => s.cents!))),
    `original ${lands.originalCents}, ${lands.cheapest.map((s) => s.cents).join(" ")}`);
  guards("land", lands);

  // 2. A fetch: every stand-in finds both Mountain and Forest.
  const fetches = await timed("Wooded Foothills", () => loadStandIns(deckId, USER, foothills.oracle_id));
  const fetchList = all(fetches!);
  check("fetch: every stand-in finds a Mountain and a Forest", fetchList.length > 0 && fetchList.every((s) => {
    const f = fetchFinds(s.card);
    return !!f && f.types.has("mountain") && f.types.has("forest");
  }), names(fetchList).join(", "));
  check("fetch: a basic-land fetch names what it gives up", fetchList.some((s) => s.drawbacks.some((d) => d.kind === "basicOnly")),
    fetchList.map((s) => `${s.card.name}[${s.drawbacks.map((d) => d.kind).join("+")}]`).join(", "));

  // 3. A spell: a ramp stand-in at mana value 1 or less, never a land, ordered as ruled.
  const spells = await timed("Mana Vault", () => loadStandIns(deckId, USER, vault.oracle_id));
  const spellList = all(spells!);
  check("spell: every stand-in shares ramp at mana value 1 or less, and is no land",
    spellList.length > 0 && spellList.every((s) => s.card.cmc <= 1 && !isLandFace(s.card.typeLine) && classifyRoles(s.card).includes("ramp")),
    `${spellList.length}: ${names(spellList).slice(0, 8).join(", ")}…`);
  const identities = await rows<{ oracle_id: string; color_identity: string[] }>(sql`
    select oracle_id, color_identity from cards where oracle_id = any(${sql.param(spellList.map((s) => s.card.oracleId))}::uuid[])`);
  check("spell: every identity inside the commander's", identities.every((r) => r.color_identity.every((c) => identity.has(c))),
    `${identities.length} read back`);
  check("spell: listed cards by the commander's figure",
    ascending(spells!.byCommander.map((s) => -(s.inclusion ?? 0))) && spells!.byCommander.every((s) => s.inclusion !== null),
    spells!.byCommander.map((s) => `${s.card.name} ${s.inclusion}`).slice(0, 6).join(", "));
  check("spell: unlisted cards carry no figure, cheapest first",
    spells!.unlisted.every((s) => s.inclusion === null) && ascending(spells!.unlisted.map((s) => s.cents!)),
    spells!.unlisted.map((s) => `${s.card.name} ${s.cents}`).slice(0, 6).join(", "));
  const staples = await loadUniversalStaples();
  check("spell: the staple flag is the shared definition's",
    spellList.every((s) => s.isUniversal === staples.has(s.card.oracleId)),
    `${spellList.filter((s) => s.isUniversal).map((s) => s.card.name).join(", ") || "no staple among them"}`);
  // H4: a paid staple leaves the commander's ranking for its own group, by price.
  check("spell: staples to buy are all staples, cheapest first, and neither ranking holds one",
    // Non-empty: `every` holds over nothing, and a run with no paid staple has measured nothing.
    spells!.staples.length > 0 && spells!.staples.every((s) => s.isUniversal) && ascending(spells!.staples.map((s) => s.cents!))
      && [...spells!.byCommander, ...spells!.unlisted].every((s) => !s.isUniversal),
    `${spells!.staples.map((s) => `${s.card.name} ${s.cents}`).join(", ") || "no paid staple"}`);
  guards("spell", spells!);

  // 4. A utility land: every stand-in names what Cavern does that it does not (H3).
  const caverns = await timed("Cavern of Souls", () => loadStandIns(deckId, USER, cavern.oracle_id));
  const cavernList = all(caverns!);
  check("H3: every Cavern stand-in gives up uncounterable spells",
    cavernList.length > 0 && cavernList.every((s) => s.givesUp.some((g) => g.kind === "named" && g.label === "uncounterable spells")),
    `${cavernList.length}: ${names(cavernList).slice(0, 5).join(", ")}`);

  // 4b. A basic already in the draft is still offered: a deck runs many of one, so the draft
  //     guard exempts basics, and a basic is always free.
  const cradle = await card("Gaea's Cradle");
  const forest = await card("Forest");
  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${forest.oracle_id}::uuid, 5), (${deckId}::uuid, ${cradle.oracle_id}::uuid, 1)`);
  const cradles = await loadStandIns(deckId, USER, cradle.oracle_id);
  const forestRow = cradles!.free.find((s) => s.card.oracleId === forest.oracle_id);
  check("basics: a Forest already in the draft is offered for Gaea's Cradle, free, giving up its extra mana",
    !!forestRow && forestRow.givesUp.some((g) => g.kind === "named" && g.label === "its extra mana"),
    `free: ${names(cradles!.free).slice(0, 6).join(", ")}`);
  await fixture.execute(sql`delete from deck_cards where deck_id = ${deckId}::uuid and oracle_id in (${forest.oracle_id}::uuid, ${cradle.oracle_id}::uuid)`);

  // 5. No job: no stand-in and no guess.
  const none = await loadStandIns(deckId, USER, roleless.oracle_id);
  check("no role: nothing offered", none!.job.kind === "none" && all(none!).length === 0, JSON.stringify(none!.job));

  // 6. Another reader's deck reads as nothing.
  check("another reader's deck reads as nothing", (await loadStandIns(deckId, "someone-else", plateau.oracle_id)) === null, "null");

  // 7. The draft guard, both sides: a stand-in staged into the draft leaves the list.
  const staged = lands.cheapest[0] ?? lands.free[0];
  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${staged.card.oracleId}::uuid, 1)`);
  const after = await loadStandIns(deckId, USER, plateau.oracle_id);
  check(`draft guard: ${staged.card.name} leaves once it is in the draft`,
    !names(all(after!)).includes(staged.card.name) && names(landList).includes(staged.card.name), "present before, absent after");
  await fixture.execute(sql`delete from deck_cards where deck_id = ${deckId}::uuid and oracle_id = ${staged.card.oracleId}::uuid`);

  // 8. Free after a take, against a REAL claim: a committed deck holding the only Command Tower
  //    makes it a buy here, where it was free.
  const holder = await makeDeck("probe swap holder", commander.oracle_id, [tower.oracle_id]);
  await commitVersion(holder, null);
  const claimed = await loadStandIns(deckId, USER, plateau.oracle_id);
  check("free after the take: a copy a committed deck holds is no longer free",
    !names(claimed!.free).includes("Command Tower") && names(lands.free).includes("Command Tower"),
    `free before: ${names(lands.free).join(", ")}; after: ${names(claimed!.free).join(", ")}`);

  // 9. A partner deck reads the PAIR's own figure, never either commander's.
  const [partner] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where commander_legal and type_line ~* 'legendary creature'
      and color_identity <@ array['R','G','W'] and oracle_id <> ${commander.oracle_id}::uuid
    order by name limit 1`);
  const ramp = spells!.byCommander[0] ?? spells!.unlisted[0];
  const a = commander.oracle_id < partner.oracle_id ? commander.oracle_id : partner.oracle_id;
  const b = a === commander.oracle_id ? partner.oracle_id : commander.oracle_id;
  const [made] = await rows<{ commander_oracle_id: string }>(sql`
    insert into commander_pair_support (commander_oracle_id, partner_oracle_id, synergy_state, edhrec_total, bracket_counts)
    values (${a}::uuid, ${b}::uuid, 'ok', 40, '{}'::jsonb) on conflict do nothing returning commander_oracle_id`);
  if (!made) {
    check("pair: a sentinel pair", false, "a row for this pair already exists; not overwriting it");
  } else {
    pairCleanup = { a, b, card: ramp.card.oracleId };
    await fixture.execute(sql`
      insert into commander_pair_support_cards (commander_oracle_id, partner_oracle_id, oracle_id, inclusion, position)
      values (${a}::uuid, ${b}::uuid, ${ramp.card.oracleId}::uuid, 77.5, 1)`);
    const pairDeck = await makeDeck("probe swap pair", commander.oracle_id, [vault.oracle_id], partner.oracle_id);
    const pairRead = await loadStandIns(pairDeck, USER, vault.oracle_id);
    const pairRow = all(pairRead!).find((s) => s.card.oracleId === ramp.card.oracleId);
    check("pair: the pair's own figure, and nothing from either commander's list",
      pairRow?.inclusion === 77.5 && pairRead!.byCommander.every((s) => s.card.oracleId === ramp.card.oracleId),
      `${ramp.card.name} at ${pairRow?.inclusion}; listed ${pairRead!.byCommander.length}`);
  }
}

void (async () => {
try {
  await main();
} catch (e) {
  failures += 1;
  console.log(`FAIL  the run threw — ${(e as Error).message}`);
} finally {
  // Assigned inside `main`, which flow analysis cannot see from here.
  const pair = pairCleanup as { a: string; b: string } | null;
  if (pair) {
    await fixture.execute(sql`delete from commander_pair_support_cards where commander_oracle_id = ${pair.a}::uuid and partner_oracle_id = ${pair.b}::uuid`);
    await fixture.execute(sql`delete from commander_pair_support where commander_oracle_id = ${pair.a}::uuid and partner_oracle_id = ${pair.b}::uuid`);
  }
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
  await pool.end();
}
// Reported AFTER the `finally`: an exit there swallows the throw and prints a pass.
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures ? 1 : 0);
})();
