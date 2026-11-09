// The fixture's reads. CATALOG tables only (cards, printings, prices, commander support): no query here names a user
// table, so nothing a real player owns can reach the fictional account. Ordered by oracle id wherever a tie is
// possible, so a read is the same on every run against the same catalog.
import { classifyRoles } from "../../../src/lib/recs/roles";
import { castNames, resolveCast, type Cast } from "./cast";
import type { CatalogCard, CatalogCommander, CatalogPrinting, CatalogSnapshot } from "./collection";

/** What `neon(url)` returns; typed loosely so a test can hand in a fake. */
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

const BASIC_NAMES = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" } as const;

export async function readCatalog(sql: Sql): Promise<CatalogSnapshot> {
  const commanders = (await sql`
    with n as (select commander_oracle_id, count(*)::int n from commander_support_cards group by 1)
    select c.oracle_id::text "oracleId", c.name, c.color_identity colors, coalesce(n.n, 0) support
    from cards c
    join commander_support cs on cs.commander_oracle_id = c.oracle_id and cs.synergy_state = 'ok'
    left join n on n.commander_oracle_id = c.oracle_id
    where c.commander_legal and c.layout = 'normal' and c.type_line like 'Legendary Creature%'
      and c.art_crop_uri is not null and c.image_uri is not null
    order by c.oracle_id`) as CatalogCommander[];
  const cardRows = (await sql`
    with pop as (select oracle_id, count(*)::int pop from commander_support_cards group by 1)
    select c.oracle_id::text "oracleId", c.name, c.color_identity colors, c.type_line "typeLine", pop.pop,
      c.game_changer "gameChanger", coalesce(f.tutor, false) tutor, c.mana_cost "manaCost", c.oracle_text "oracleText", c.keywords,
      exists (select 1 from card_labels l where l.oracle_id = c.oracle_id and jsonb_typeof(l.labels) = 'array'
        and exists (select 1 from jsonb_array_elements(l.labels) j
          where j->>'kind' = 'ramp' and j->>'rampKind' in ('tapsForMana', 'fetchesLand'))) source
    from cards c join pop on pop.oracle_id = c.oracle_id
    left join card_bracket_flags f on f.oracle_id = c.oracle_id
    where c.commander_legal and c.layout in ('normal', 'modal_dfc') and c.type_line not like 'Basic%'
      and c.image_uri is not null
    order by pop.pop desc, c.oracle_id
    limit 9000`) as (CatalogCard & { oracleText: string | null; keywords: string[] | null })[];
  // A card that answers a threat (removal or a wipe), read the way the deck page's role column reads it.
  const cards: CatalogCard[] = cardRows.map(({ oracleText, keywords, ...c }) => ({
    ...c,
    answer: classifyRoles({ typeLine: c.typeLine, oracleText, keywords: keywords ?? [] }).some((r) => r === "removal" || r === "wipes"),
  }));
  const basicRows = (await sql`select distinct on (name) name, oracle_id::text "oracleId" from cards
    where name = any(${Object.values(BASIC_NAMES)}) and type_line like 'Basic Land%' order by name, oracle_id`) as {
    name: string;
    oracleId: string;
  }[];
  const basics = Object.fromEntries(
    Object.entries(BASIC_NAMES).map(([color, name]) => {
      const row = basicRows.find((r) => r.name === name);
      if (!row) throw new Error(`the catalog has no ${name}`);
      return [color, row.oracleId];
    }),
  ) as CatalogSnapshot["basics"];
  return { commanders, cards, basics };
}

/** Each oracle id's printings, the representative one first, then by scryfall id. */
export async function readPrintings(sql: Sql, ids: readonly string[]): Promise<Map<string, CatalogPrinting[]>> {
  const out = new Map<string, CatalogPrinting[]>();
  for (let i = 0; i < ids.length; i += 1500) {
    const chunk = ids.slice(i, i + 1500);
    const rows = (await sql`select oracle_id::text "oracleId", scryfall_id::text "scryfallId", set_code "setCode",
        collector_number "collectorNumber", finishes
      from printings where oracle_id::text = any(${chunk}) and image_uri is not null
      order by oracle_id, is_representative desc nulls last, is_variant nulls first, scryfall_id`) as (CatalogPrinting & {
      oracleId: string;
    })[];
    for (const r of rows) {
      const list = out.get(r.oracleId) ?? [];
      list.push({ scryfallId: r.scryfallId, setCode: r.setCode, collectorNumber: r.collectorNumber, finishes: r.finishes });
      out.set(r.oracleId, list);
    }
  }
  return out;
}

/** commander -> (card -> inclusion), for the commanders a deck might be built around. */
export async function readSupport(sql: Sql, commanderIds: readonly string[]): Promise<Map<string, Map<string, number>>> {
  const rows = (await sql`select commander_oracle_id::text cid, oracle_id::text "oracleId", inclusion::float8 inclusion
    from commander_support_cards where commander_oracle_id::text = any(${commanderIds}) order by 1, 2`) as {
    cid: string;
    oracleId: string;
    inclusion: number | null;
  }[];
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = out.get(r.cid) ?? new Map<string, number>();
    m.set(r.oracleId, r.inclusion ?? 0);
    out.set(r.cid, m);
  }
  return out;
}

/** The cast's cards, by name, as oracle ids. A name the catalog lacks (or holds twice) stops the run. */
export async function readCast(sql: Sql): Promise<Cast> {
  const names = castNames();
  const rows = (await sql`select name, oracle_id::text "oracleId" from cards where name = any(${names}) order by name, oracle_id`) as {
    name: string;
    oracleId: string;
  }[];
  const idOf = new Map<string, string>();
  for (const r of rows) {
    if (idOf.has(r.name)) throw new Error(`the catalog holds two cards named ${r.name}`);
    idOf.set(r.name, r.oracleId);
  }
  return resolveCast(idOf);
}

export type Buys = { dear: string; spare: string; missing: string[] };

/**
 * Two unowned colorless artifacts whose cheapest printing priced now is $15 to $60, dearest first: the first is over
 * the default $10 stand-in limit (the fresh draft's over-limit row), the second is one more priced artifact the fresh draft lists (a plain buy: Alex's spare is one of Played's two buys, `ALEX_SPARE`).
 */
export async function readBuys(sql: Sql, cast: readonly string[] = []): Promise<Buys> {
  const rows = (await sql`select c.oracle_id::text "oracleId", min(pp.price_cents) cents from cards c
    join printings p on p.oracle_id = c.oracle_id join printing_prices pp on pp.scryfall_id = p.scryfall_id
    where c.commander_legal and c.color_identity = '{}' and c.layout = 'normal' and c.type_line like 'Artifact%'
      and c.type_line not like '%Creature%' and pp.price_cents is not null
      and pp.as_of = (select max(as_of) from printing_prices)
      and c.oracle_id::text <> all(${[...cast]})
    group by c.oracle_id having min(pp.price_cents) between 1500 and 6000
    order by cents desc, c.oracle_id limit 2`) as { oracleId: string }[];
  if (rows.length < 2) throw new Error("the catalog offers no two priced colorless artifacts to buy");
  // The cards the decks are missing, so the all-decks cart has lines: the most played colorless nonland cards, unowned.
  const missing = (await sql`select c.oracle_id::text "oracleId" from cards c
    join (select oracle_id, count(*)::int pop from commander_support_cards group by 1) p on p.oracle_id = c.oracle_id
    where c.commander_legal and c.color_identity = '{}' and c.layout = 'normal' and c.type_line not like '%Land%'
      and c.type_line not like '%Creature%' and c.oracle_id::text <> all(${[rows[0].oracleId, rows[1].oracleId, ...cast]})
    order by p.pop desc, c.oracle_id limit 42`) as { oracleId: string }[];
  if (missing.length < 42) throw new Error("the catalog offers no 42 colorless staples to be missing");
  return { dear: rows[0].oracleId, spare: rows[1].oracleId, missing: missing.map((m) => m.oracleId) };
}
