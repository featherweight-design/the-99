// The base stage's extras: the two small tables the About frames need that the decks and uploads never wrote, and which
// touch NO deck. The five decks' card lists, quantities, ids and totals are pinned (a paid demo was generated from them),
// so nothing here writes `deck_cards`, `deck_locks` or a deck row, and the collection additions are cards that are in no deck.
//
//   - `collection_history`: two entries (an add, then an edit raising one of its cards) through the app's own
//     `applyCollectionChange`, so /collection/history lists them with a live Revert. Cards the player does not own, that
//     no deck holds, that no deck's commander indexes (they never become a "shared card" or a shopping line), and that
//     are none of the unowned buys.
//   - `deck_proxies`: a few cards already in one deck, marked proxy, so /collection/proxies has rows; and Fury on Played
//     (Ashling), the one proxy the landing demo's deck rows draw (a proxy asks nothing of the collection and is never billed).
import { readPrintings, type Sql } from "./catalog";
import { DAY, type Ctx } from "./context";
import type { DeckPlan } from "./decks";
import { ABOUT_DECK_IDS, uuidV5, type DeckRole } from "./rng";

/**
 * THE deck that carries the proxy marks (three cards). Null holds the insert back (no proxy rows are written), a role
 * writes them on that deck. Played carries its own one, `proxyOnPlayed`: Fury.
 */
export const PROXY_DECK_ROLE: DeckRole | null = "versioned";
export const PROXY_COUNT = 3;
export const HISTORY_ADD_COUNT = 3;

/** Cards of one deck to mark proxy: not a basic, not the commander, a single copy; the first by oracle id. */
export function pickProxyCards(rows: ReadonlyMap<string, number>, commander: string, basics: ReadonlySet<string>, count = PROXY_COUNT): string[] {
  return [...rows]
    .filter(([id, n]) => n === 1 && id !== commander && !basics.has(id))
    .map(([id]) => id)
    .sort()
    .slice(0, count);
}

export type ExtrasInput = {
  decks: readonly DeckPlan[];
  basics: ReadonlySet<string>;
  /** Cards the account must never own (the buys, the faces): left out of the history additions. */
  exclude: readonly string[];
  /** The card of Played marked proxy: Ashling's Fury (cast.ts). A proxy asks nothing of the collection, so it is not a buy. */
  proxyOnPlayed: string;
};

export async function writeExtras(ctx: Ctx, input: ExtrasInput): Promise<void> {
  const { sql, viewer } = ctx;
  const commanders = input.decks.map((d) => d.commander.oracleId);
  const inDecks = [...new Set(input.decks.flatMap((d) => [...d.rows.keys()]))];

  // ---- collection history, through the app's own write.
  const candidates = (await sql`select c.oracle_id::text "oracleId", c.name from cards c
    where c.commander_legal and c.layout = 'normal' and c.type_line not like 'Basic%' and c.type_line not like '%Land%'
      and c.type_line not like 'Legendary%' and c.image_uri is not null
      and not exists (select 1 from collection_items ci where ci.user_id = ${viewer} and ci.oracle_id = c.oracle_id)
      and c.oracle_id::text <> all(${[...input.exclude, ...commanders, ...inDecks]})
      and not exists (select 1 from commander_support_cards s where s.oracle_id = c.oracle_id and s.commander_oracle_id::text = any(${commanders}))
      and exists (select 1 from printings p where p.oracle_id = c.oracle_id and p.image_uri is not null and 'nonfoil' = any(p.finishes))
    order by c.oracle_id limit ${HISTORY_ADD_COUNT}`) as { oracleId: string; name: string }[];
  if (candidates.length < HISTORY_ADD_COUNT) throw new Error(`the catalog offers ${candidates.length} cards for the history, not ${HISTORY_ADD_COUNT}`);
  const printings = await readPrintings(sql as unknown as Sql, candidates.map((c) => c.oracleId));
  const items = candidates.map((c) => {
    const p = printings.get(c.oracleId)?.find((x) => x.finishes.includes("nonfoil"));
    if (!p) throw new Error(`no nonfoil printing for ${c.name}`);
    return { oracleId: c.oracleId, setCode: p.setCode, collectorNumber: p.collectorNumber, finish: "nonfoil" as const, scryfallId: p.scryfallId, condition: null, quantity: 1, name: c.name };
  });
  const { applyCollectionChange } = await import("../../../src/lib/collection/write");
  const ids = [uuidV5("history:add"), uuidV5("history:edit")];
  const added = await applyCollectionChange(viewer, { kind: "add", items }, { id: ids[0] });
  if (added.status !== "applied") throw new Error(`the history add was ${added.status}`);
  const [first] = items;
  const edited = await applyCollectionChange(
    viewer,
    { kind: "edit", rows: [{ oracleId: first.oracleId, setCode: first.setCode, collectorNumber: first.collectorNumber, finish: first.finish, quantity: 2, expected: 1 }] },
    { id: ids[1] },
  );
  if (edited.status !== "applied") throw new Error(`the history edit was ${edited.status}`);
  const now = Date.now();
  await sql`update collection_history set created_at = ${new Date(now - 9 * DAY)} where id = ${ids[0]}`;
  await sql`update collection_history set created_at = ${new Date(now - 3 * DAY)} where id = ${ids[1]}`;
  console.log(`history: an add of ${items.length} cards and an edit, held by no deck`);

  // ---- proxies: cards already in a deck.
  const played = input.decks.find((d) => d.role === "played")!;
  if (!played.rows.has(input.proxyOnPlayed)) throw new Error("the proxy on Played is not a card of the deck");
  await sql`insert into deck_proxies (deck_id, oracle_id) values (${ABOUT_DECK_IDS.played}, ${input.proxyOnPlayed}) on conflict do nothing`;
  console.log("proxies: 1 on played");
  if (PROXY_DECK_ROLE === null) {
    console.log("proxies: held back (PROXY_DECK_ROLE is null)");
    return;
  }
  const deck = input.decks.find((d) => d.role === PROXY_DECK_ROLE)!;
  const picks = pickProxyCards(deck.rows, deck.commander.oracleId, input.basics);
  for (const oracleId of picks) {
    await sql`insert into deck_proxies (deck_id, oracle_id) values (${ABOUT_DECK_IDS[PROXY_DECK_ROLE]}, ${oracleId}) on conflict do nothing`;
  }
  console.log(`proxies: ${picks.length} on ${PROXY_DECK_ROLE}`);
}
