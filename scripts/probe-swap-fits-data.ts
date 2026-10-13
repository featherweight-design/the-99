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
import { loadCompletionPartners, pairsWithOnePiece, type PairRow } from "../src/lib/combos/near-miss";
import { db as appDb } from "../src/db";
import { PgDialect } from "drizzle-orm/pg-core";
import { loadFits } from "../src/lib/swaps/fits";
import { cardThemes } from "../src/lib/recs/themes";
import { loadCardDetail } from "../src/lib/collection/card-detail";
import { loadUniversalStaples } from "../src/lib/staples/universal";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

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
  const candidates = await rows<CardRow & { commander: string; inclusion: number; synergy: number | null; cmd_identity: string[] }>(sql`
    select c.oracle_id, c.name, c.type_line, c.oracle_text, c.keywords, c.color_identity,
      s.commander_oracle_id as commander, s.inclusion, s.synergy, cmd.color_identity as cmd_identity
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

  // 2. The facts on a fitting deck: the deck's need in the role. (v2 D3: no commander figure is drawn.)
  const [targets] = await rows<{ t: number }>(sql`
    select ${sql.raw(`avg_${role}`)} as t from commander_support where commander_oracle_id = ${x.commander}::uuid`);
  const f = r?.fits[0];
  check("fits: the need counts the deck's own cards in the role", f?.need, { role, have: 2, target: Math.round(Number(targets.t)) });

  // 3. Availability: two owned, one of them held by a committed deck.
  await fixture.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${USER}, ${x.oracle_id}::uuid, 2, 'probe')`);
  await commitVersion(holds, null, undefined, undefined, process.env);
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
    insert into commander_pair_support_cards (commander_oracle_id, partner_oracle_id, oracle_id, inclusion, synergy, position)
    values (${a}::uuid, ${b}::uuid, ${x.oracle_id}::uuid, 42.5, 1, 1)`);
  const pair = await makeDeck(USER, "D pair", blueLead.oracle_id, x.commander, []);
  const paired = await loadFits(USER, x.oracle_id);
  check("pair: fits, over the union of both identities", paired?.fits.some((d) => d.id === pair), true);
  check("pair: named with both commanders", paired?.fits.find((d) => d.id === pair)?.commanders.length, 2);

  // v2 PR B: the decks run by each one's synergy for the card, read from the pair's own row for a pair.
  // The single deck's synergy is the support list's; the pair's is set either side of it, and the order
  // must follow. A projection reading the wrong table, or no synergy at all, leaves the order fixed.
  const order = async () => (await loadFits(USER, x.oracle_id))?.fits.map((d) => d.id).filter((id) => id === pair || id === fits);
  const single = x.synergy === null ? null : Number(x.synergy);
  check(`synergy: the fixture's own synergy (${single}) sits inside the range`, single !== null && single > -1 && single < 1, true);
  check("synergy: a pair favoring the card more leads", await order(), [pair, fits]);
  await fixture.execute(sql`update commander_pair_support_cards set synergy = -1
    where commander_oracle_id = ${a}::uuid and partner_oracle_id = ${b}::uuid and oracle_id = ${x.oracle_id}::uuid`);
  check("synergy: and one favoring it less follows", await order(), [fits, pair]);

  // v2 D3: the reason line's combo, against the real Spellbook index. A deck led by a five-color legend holds
  // one piece of a two-card variant; Find a deck for the other piece must name the combo. The pair is found
  // by ASKING the shared read (`loadCompletionPartners`), never by restating its rules here.
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where commander_legal and type_line ~* 'legendary creature'
      and cardinality(color_identity) = 5 order by name limit 1`);
  const pairs = await rows<{ held: string; want: string }>(sql`
    select a.oracle_id as held, b.oracle_id as want
    from spellbook_variants v
    join spellbook_variant_cards a on a.variant_id = v.variant_id and not a.must_be_commander
    join spellbook_variant_cards b on b.variant_id = v.variant_id and b.oracle_id <> a.oracle_id and not b.must_be_commander
    join cards ca on ca.oracle_id = a.oracle_id and ca.commander_legal and ca.type_line !~* 'land'
    join cards cb on cb.oracle_id = b.oracle_id and cb.commander_legal and cb.type_line !~* 'land'
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
    order by v.popularity desc nulls last, v.variant_id limit 20`);
  // Read straight off the index, NOT through `loadCompletionPartners`, so a prune dropping too much fails
  // HERE rather than hiding the fixture from the check.
  const raw = pairs[0];
  // The pair read's candidate prune (v2 D3) drops only what could never be a row. EQUIVALENCE: for a deck
  // holding this pair's piece AND a piece of an unrelated pair, the pruned read with the candidate named
  // equals the unpruned read filtered to it, and the unpruned read has rows the prune had to drop.
  const [other] = await rows<{ held: string }>(sql`
    select a.oracle_id as held
    from spellbook_variants v
    join spellbook_variant_cards a on a.variant_id = v.variant_id and not a.must_be_commander
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and not exists (select 1 from spellbook_variant_cards z where z.variant_id = v.variant_id
                        and z.oracle_id in (${raw.want}::uuid, ${raw.held}::uuid))
    order by v.popularity desc nulls last, v.variant_id limit 1`);
  const args = { present: [raw.held, other.held], commanders: [legend.oracle_id] };
  const key = (r: PairRow) => `${r.variant_id}|${r.present_id}|${r.missing_id}`;
  const pruned = (await rows<PairRow>(pairsWithOnePiece({ ...args, missingIn: [raw.want] }))).map(key).sort();
  const everything = await rows<PairRow>(pairsWithOnePiece({ ...args, missingIn: null }));
  const filtered = everything.filter((r) => r.missing_id === raw.want).map(key).sort();
  check("prune: the named-candidate read equals the unpruned read filtered to it", pruned, filtered);
  check("prune: and the unpruned read held rows the prune had to drop",
    pruned.length > 0 && everything.some((r) => r.missing_id !== raw.want), true);
  let combo: { held: string; want: string; name: string } | null = null;
  for (const p of pairs) {
    const got = (await loadCompletionPartners({ deckOracleIds: [p.held], commanderOracleIds: [legend.oracle_id], candidateOracleIds: [p.want] })).get(p.want);
    if (got) { combo = { ...p, name: got.partnerName }; break; }
  }
  if (!combo) {
    check("combo: a two-card variant the shared read counts", false, true);
  } else {
    const holder = await makeDeck(USER, "E combo", legend.oracle_id, null, [combo.held]);
    const read = await loadFits(USER, combo.want);
    const row = read?.fits.find((d) => d.id === holder);
    // The piece previews the printing card details open for it: this fixture user owns none of it, so the catalog's art
    // (`withPartnerArt`). Asserted as the whole payload, not as its shape, so a dropped overlay fails here.
    const [piece] = await rows<{ image_uri: string | null }>(sql`select image_uri from cards where oracle_id = ${combo.held}::uuid`);
    check("combo: the deck holding the other piece reads `Completes a combo with` it, with its art", row?.reason, { kind: "combo", with: { oracleId: combo.held, name: combo.name, imageUri: piece?.image_uri ?? null } });
    check("combo: and it leads the list", read?.fits[0]?.id, holder);

    // The partner's name comes from the list Find a deck already read (`knownNames`), never a second
    // query. The boundary is the CALL SITE: every statement the app sends is recorded, and the name
    // lookup `nameMap` issues must not be among them. Delete `knownNames` in fits.ts and this fails.
    const sent: string[] = [];
    const execute = appDb.execute.bind(appDb);
    (appDb as { execute: typeof appDb.execute }).execute = ((q: Parameters<typeof appDb.execute>[0]) => {
      sent.push(new PgDialect().sqlToQuery(q as ReturnType<typeof sql>).sql);
      return execute(q);
    }) as typeof appDb.execute;
    try {
      await loadFits(USER, combo.want);
    } finally {
      (appDb as { execute: typeof appDb.execute }).execute = execute;
    }
    check("combo: the partner is named from the list read, with no name query",
      sent.some((q) => /spellbook_variant/.test(q)) && !sent.some((q) => /^select oracle_id, name from cards where oracle_id = any/.test(q.trim())), true);

  }

  // 6. The add Fits calls is the deck page's add.
  const added = await addCardToDeckFor(USER, fits, x.oracle_id, { relock: false });
  // `released` lists the decks whose asks the add released (`releaseAskers`): none in this fixture.
  check("add: written", added, { result: { ok: true }, wrote: "added", released: [] });
  const after = await loadFits(USER, x.oracle_id);
  check("add: the deck moves from fits to holds", [after?.fits.some((d) => d.id === fits), after?.holds.some((d) => d.id === fits)], [false, true]);
  const again = await addCardToDeckFor(USER, fits, x.oracle_id, { relock: false });
  check("add: a second press is the singleton no-op", again.wrote, "held");
  const refused = await addCardToDeckFor(USER, blue, x.oracle_id, { relock: false });
  check("add: off-identity is refused", refused.wrote, "refused");
  check("add: and wrote nothing", (await rows(sql`select 1 from deck_cards where deck_id = ${blue}::uuid`)).length, 0);
  check("add: another reader's deck is refused",
    await addCardToDeckFor(OTHER, fits, peers[0].oracle_id, { relock: false }).then(() => "written", () => "refused"), "refused");

  // 7. The staple flag comes from the one staple definition: true for a universal staple, false for
  //    the fixture card. An empty staple set fails rather than passing, since then no card could read true.
  const staples = [...(await loadUniversalStaples())].sort();
  if (staples.length === 0) throw new Error("format_staples names no universal staple on this database");
  const stapleRead = await loadFits(USER, staples[0]);
  check("staple: a universal staple reads as one", stapleRead?.staple, true);

  // A staple's row draws `staple · any commander`, never a reason, so loadFits computes none. The case has
  // to be one a reason COULD be found for, or the check holds on any build: a colorless staple with a theme,
  // and an open five-color deck holding another colorless card with that theme.
  const texts = await rows<{ oracle_id: string; type_line: string; oracle_text: string | null; color_identity: string[] }>(sql`
    select oracle_id, type_line, oracle_text, color_identity from cards
    where oracle_id = any(${sql.param(staples)}::uuid[]) order by oracle_id`);
  const themedStaple = texts.map((t) => ({ ...t, themes: cardThemes({ typeLine: t.type_line, oracleText: t.oracle_text }, () => false) }))
    .find((t) => t.color_identity.length === 0 && t.themes.length > 0);
  if (!themedStaple) {
    check("staple: a colorless staple with a theme, to test the skip against", false, true);
  } else {
    const mates = await rows<{ oracle_id: string; type_line: string; oracle_text: string | null }>(sql`
      select oracle_id, type_line, oracle_text from cards
      where commander_legal and cardinality(color_identity) = 0 and oracle_id <> ${themedStaple.oracle_id}::uuid
        and not (oracle_id = any(${sql.param(staples)}::uuid[])) and type_line !~* 'land'
      order by name limit 400`);
    const mate = mates.find((m) => cardThemes({ typeLine: m.type_line, oracleText: m.oracle_text }, () => false).includes(themedStaple.themes[0]));
    if (!mate) {
      check(`staple: a colorless card sharing ${themedStaple.themes[0]}`, false, true);
    } else {
      const themeDeck = await makeDeck(USER, "F staple theme", legend.oracle_id, null, [mate.oracle_id]);
      const read = await loadFits(USER, themedStaple.oracle_id);
      check("staple: no reason on any row, even where a theme is shared", read?.fits.find((f) => f.id === themeDeck)?.reason, null);
    }
  }
  check("staple: the fixture card does not", r?.staple, false);

  // 8. A card that does not exist reads as nothing.
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
