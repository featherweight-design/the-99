// STARTING A DECK FROM A PRECON (Hugh, 2026-10-14), proved against a real Postgres by calling the real
// `startPreconDeck` and `loadOpenPrecon`.
//
// Cases:
//   a  the edition switch's two lists differ where the editions' printings do: on Avengers Assemble, a card
//      the Collector's Edition prints at its own number reads that number there and the plain one in Regular
//   b  and where an edition shares its plain printing (Final Fantasy's Collector's Editions), it reads the same
//      number with every copy foil, and Regular none
//   c  a started deck is committed as v1 (one version, its 99 cards) whose list is the live one (no draft left
//      over), and v1 records the pinned printing of a card held in two, read inside the start's own transaction
//   d  every card the box prints, commanders included, is pinned to the box's printing (Brainstorm and Arcane
//      Signet at Multiverse Reforged's, never a printing the player happens to hold)
//   e  a Collector's Edition start pins the Collector's Edition's printings, and records the plain edition
//
// Mutations, each run against it and each failing it:
//   - `printings: preconPins(lines)` dropped from `startPreconDeck`: fails d and e.
//   - `commitVersion` dropped: fails c.
//   - the commit's printing read moved off its transaction, onto the shared pool (`versions.ts`): fails c.
//
// It writes decks under a per-run `user_id` and purges that account in a `finally`, after the branch guard:
// `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and staging and production are refused by id.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:precon-start
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { startPreconDeck } from "../src/lib/precons/start";
import { loadOpenPrecon } from "../src/lib/precons/open-read";
import { purgeAccount } from "../src/lib/account/purge";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-precon-start-${Date.now()}`;
// A script has no signed-in reader: it decides switches from the environment, saying so. The deck
// printings switch is on here whatever the environment says, so v1 records the printing each card showed.
const ENV = { ...process.env, DECK_PRINTINGS_ENABLED: "true" };
let failures = 0;
let guarded = false;

function check(label: string, actual: unknown, expected: unknown): boolean {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
  if (!ok) failures += 1;
  return ok;
}
async function rows<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  return (await fixture.execute(q)).rows as T[];
}

/** The deck's pins against the edition's own first printing per card. */
async function pinsMatch(deckId: string, file: string) {
  const [r] = await rows<{ pins: number; want: number; wrong: number }>(sql`
    with want as (
      select distinct on (pc.oracle_id) pc.oracle_id, p.set_code, p.collector_number
      from precon_cards pc join printings p on p.scryfall_id = pc.scryfall_id
      where pc.file_name = ${file} order by pc.oracle_id, pc.position
    )
    select (select count(*)::int from deck_printings where deck_id = ${deckId}::uuid) pins,
           (select count(*)::int from want) want,
           (select count(*)::int from want w left join deck_printings dp on dp.deck_id = ${deckId}::uuid and dp.oracle_id = w.oracle_id
             where dp.set_code is distinct from lower(w.set_code) or dp.collector_number is distinct from w.collector_number) wrong`);
  return r;
}

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes decks. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  guarded = true;

  const avengers = await loadOpenPrecon(USER, "AvengersAssemble_MSC");
  if (avengers?.kind !== "precon" || !avengers.collector) throw new Error("Avengers Assemble has no Collector's Edition here");
  const label = (cs: { name: string; printing: { label: string } | null }[], name: string) => cs.find((c) => c.name === name)?.printing?.label;
  check("a · Avengers Tower reads its plain printing in Regular", label(avengers.cards, "Avengers Tower"), "MSH 260");
  check("a · and the Collector's Edition's own in the Collector's Edition", label(avengers.collector.cards, "Avengers Tower"), "MSH 452");

  const ff = await loadOpenPrecon(USER, "LimitBreakFinalFantasyVii_FIC");
  if (ff?.kind !== "precon" || !ff.collector) throw new Error("Limit Break has no Collector's Edition here");
  const cid = (cs: { name: string; foil: number; quantity: number; printing: { label: string } | null }[]) => {
    const c = cs.find((x) => x.name === "Cid, Freeflier Pilot");
    return c && { label: c.printing?.label, foil: c.foil, of: c.quantity };
  };
  check("b · Cid is FIC 13 in Regular, no copy foil", cid(ff.cards), { label: "FIC 13", foil: 0, of: 1 });
  check("b · and FIC 13 in the Collector's Edition, every copy foil", cid(ff.collector.cards), { label: "FIC 13", foil: 1, of: 1 });

  // c's setup: the player holds Chromatic Lantern in two printings, the box's (FRC 54) and MBC 73, so only the
  // deck's pin decides which v1 records. A pin is honored only on a printing held.
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number, scryfall_id)
    select ${USER}, p.oracle_id, 1, p.set_code, p.collector_number, p.scryfall_id from printings p
    join cards c on c.oracle_id = p.oracle_id
    where c.name = 'Chromatic Lantern' and (p.set_code, p.collector_number) in (('frc', '54'), ('mbc', '73'))`);
  // And prefers MBC 73 for its art, so a read that cannot see the pin resolves to MBC 73, never FRC 54 by chance.
  await fixture.execute(sql`
    insert into card_art_preferences (user_id, oracle_id, set_code, collector_number)
    select ${USER}, oracle_id, 'mbc', '73' from cards where name = 'Chromatic Lantern'`);
  const frc = await startPreconDeck(USER, "MultiverseReforged_FRC", "Probe FRC", ENV);
  const [versions] = await rows<{ n: number; cards: number }>(sql`
    select count(*)::int n, (select coalesce(sum(vc.quantity), 0)::int from deck_version_cards vc
      join deck_versions v on v.id = vc.version_id where v.deck_id = ${frc}::uuid) cards
    from deck_versions where deck_id = ${frc}::uuid`);
  check("c · committed as v1", versions.n, 1);
  check("c · and v1 holds the 99", versions.cards, 99);
  const pins = await pinsMatch(frc, "MultiverseReforged_FRC");
  check("d · every printed card is pinned", pins.pins === pins.want && pins.want > 0, true);
  check("d · each at the box's printing", pins.wrong, 0);
  const named = await rows<{ name: string; printed: string }>(sql`
    select c.name, upper(dp.set_code) || ' ' || dp.collector_number printed from deck_printings dp join cards c on c.oracle_id = dp.oracle_id
    where dp.deck_id = ${frc}::uuid and c.name in ('Brainstorm', 'Arcane Signet') order by c.name`);
  const boxAt = await rows<{ name: string; printed: string }>(sql`
    select distinct on (c.name) c.name, upper(p.set_code) || ' ' || p.collector_number printed from precon_cards pc
    join cards c on c.oracle_id = pc.oracle_id join printings p on p.scryfall_id = pc.scryfall_id
    where pc.file_name = 'MultiverseReforged_FRC' and c.name in ('Brainstorm', 'Arcane Signet') order by c.name, pc.position`);
  check("d · Brainstorm and Arcane Signet at the box's own printings", named, boxAt);
  // v1 is committed in the start's own transaction, so it must read the pins written there, not the shared pool.
  const recorded = await rows<{ name: string; printed: string }>(sql`
    select c.name, upper(vc.set_code) || ' ' || vc.collector_number printed from deck_version_cards vc
    join deck_versions v on v.id = vc.version_id join cards c on c.oracle_id = vc.oracle_id
    where v.deck_id = ${frc}::uuid and c.name = 'Chromatic Lantern'`);
  const boxAtAll = await rows<{ name: string; printed: string }>(sql`
    select distinct on (c.name) c.name, upper(p.set_code) || ' ' || p.collector_number printed from precon_cards pc
    join cards c on c.oracle_id = pc.oracle_id join printings p on p.scryfall_id = pc.scryfall_id
    where pc.file_name = 'MultiverseReforged_FRC' and c.name = 'Chromatic Lantern' order by c.name, pc.position`);
  check("c · v1 records the box's printing of a card held in two, read inside the start's transaction", recorded, boxAtAll);
  const [drift] = await rows<{ n: number }>(sql`
    select count(*)::int n from (
      (select oracle_id, quantity from deck_cards where deck_id = ${frc}::uuid
        except select vc.oracle_id, vc.quantity from deck_version_cards vc join deck_versions v on v.id = vc.version_id where v.deck_id = ${frc}::uuid)
      union all
      (select vc.oracle_id, vc.quantity from deck_version_cards vc join deck_versions v on v.id = vc.version_id where v.deck_id = ${frc}::uuid
        except select oracle_id, quantity from deck_cards where deck_id = ${frc}::uuid)) d`);
  check("c · and the live list is v1's: no draft left over", drift.n, 0);

  const ce = await startPreconDeck(USER, "AvengersAssembleCollectorSEdition_MSC", "Probe CE", ENV);
  const cePins = await pinsMatch(ce, "AvengersAssembleCollectorSEdition_MSC");
  check("e · a Collector's Edition start pins the Collector's Edition's printings", cePins.wrong === 0 && cePins.pins > 0, true);
  const [built] = await rows<{ built: string }>(sql`select built_from_precon built from decks where id = ${ce}::uuid`);
  check("e · and records the plain edition", built.built, "AvengersAssemble_MSC");
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    if (guarded) await purgeAccount(USER).catch((err) => { failures += 1; console.error("purge failed", err); });
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
