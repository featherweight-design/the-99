// measure:strategy: does a deck's strongest strategy axis tell a focused list from a spread one? READ-ONLY, against
// STAGING (`THE_99_NEON_STAGING_DIRECT`), in one read-only transaction. The axes are the 30 label themes
// (`card_labels`) plus the type-line axes in `src/lib/strategy/axes.ts`. Each is scored by `axisScore` (copies ×
// ln(lift)) against TWO baselines, printed side by side and never merged:
//   - the catalog: every commander-legal nonland game card, one copy each;
//   - the commander's EDHREC average: its 64 highest-inclusion nonland cards in `commander_support_cards`.
// Against its own commander's average a list built around that commander's plan reads close to 1 by construction,
// most of all a precon EDHREC's average is mostly made of: that column asks "leans further than the average deck".
// The sample: the busiest account's decks of 60+ cards, precons of the two newest release dates, a control group of
// precons released 12 to 24 months before the newest (`twin_of` null throughout), and the ten most-decked commanders'
// averages. Commanders are not counted in any list. A partner deck is scored against its primary commander's average.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { isGameCard } from "../src/lib/cards/game-card";
import { isLandFace } from "../src/lib/cards/facet";
import {
  AXIS_FLOOR, BASELINE_FLOOR, BIG_CREATURE_MIN_MV, TYPAL_AXES, axisCounts, axisScore, baselineShare, deckAxes, type AxisCard,
} from "../src/lib/strategy/axes";

neonConfig.webSocketConstructor = ws;
const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
const pool = new Pool({ connectionString: THE_99_NEON_STAGING_DIRECT });
const AVERAGE_SIZE = 64;

type CardRow = { oracle_id: string; type_line: string; cmc: number; keywords: string[] | null; layout: string; themes: string[] | null };
type ListRow = { grp: string; name: string; commander: string | null; partner: boolean; oracle_id: string; quantity: number };

/** The theme jobs of one card, and its type-line input. */
type Card = { axis: AxisCard; themes: string[] };

function labelCounts(cards: readonly Card[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of cards) for (const t of new Set(c.themes)) out.set(t, (out.get(t) ?? 0) + c.axis.quantity);
  return out;
}

type Baseline = { axes: ReturnType<typeof axisCounts>; labels: Map<string, number> };
const baselineOf = (cards: readonly Card[]): Baseline => ({ axes: axisCounts(cards.map((c) => c.axis)), labels: labelCounts(cards) });
const labelShare = (b: Baseline, theme: string) =>
  Math.max((b.labels.get(theme) ?? 0) / Math.max(b.axes.total, 1), BASELINE_FLOOR);

/** The list's best axis against one baseline: `[score, axis, copies, baseline share]`. */
function peak(cards: readonly Card[], base: Baseline): [number, string, number, number] {
  const counts = axisCounts(cards.map((c) => c.axis));
  let best: [number, string, number, number] = [0, "-", 0, 0];
  const consider = (axis: string, copies: number, share: number) => {
    const s = axisScore(copies, counts.total, share);
    if (s > best[0]) best = [s, axis, copies, share];
  };
  for (const [axis, copies] of deckAxes(counts)) consider(axis, copies, baselineShare(base.axes, axis));
  for (const [theme, copies] of labelCounts(cards)) consider(theme, copies, labelShare(base, theme));
  return best;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? NaN : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const { rows: catalog } = await client.query<CardRow>(`
      select c.oracle_id, c.type_line, c.cmc, c.keywords, c.layout,
             (select array_agg(j->>'kind') from jsonb_array_elements(l.labels) j where j->>'space' = 'theme') themes
        from cards c left join card_labels l on l.oracle_id = c.oracle_id
       where c.commander_legal`);
    const byId = new Map(catalog.filter((c) => isGameCard({ layout: c.layout, typeLine: c.type_line }) && !isLandFace(c.type_line)).map((c) => [c.oracle_id, c]));
    const card = (id: string, quantity: number): Card | null => {
      const c = byId.get(id);
      return c ? { axis: { typeLine: c.type_line, manaValue: c.cmc, keywords: c.keywords ?? [], quantity }, themes: c.themes ?? [] } : null;
    };

    const { rows: listRows } = await client.query<ListRow>(`
      with busiest as (select user_id from decks group by user_id order by count(*) desc limit 1),
      newest as (select distinct release_date from precons order by release_date desc limit 2),
      top as (select commander_oracle_id from commander_support where deck_count is not null order by deck_count desc limit 10),
      deck_lists as (
        select 'deck' grp, d.name, d.commander_oracle_id::text commander, d.partner_oracle_id is not null partner, dc.oracle_id::text oracle_id, dc.quantity
          from decks d join deck_cards dc on dc.deck_id = d.id
         where d.user_id = (select user_id from busiest)
           and (select sum(quantity) from deck_cards x where x.deck_id = d.id) >= 60),
      precon_lists as (
        select case when p.release_date in (select release_date from newest) then 'precon' else 'control' end grp,
               p.name || ' (' || p.set_code || ')' as name,
               (select pc2.oracle_id::text from precon_cards pc2 where pc2.file_name = p.file_name and pc2.is_commander order by pc2.position limit 1) commander,
               (select count(*) from precon_cards pc3 where pc3.file_name = p.file_name and pc3.is_commander) > 1 partner,
               pc.oracle_id::text, pc.quantity
          from precons p join precon_cards pc on pc.file_name = p.file_name and not pc.is_commander
         where p.twin_of is null
           and (p.release_date in (select release_date from newest)
             or p.release_date between (select max(release_date) from precons) - interval '24 months'
                                   and (select max(release_date) from precons) - interval '12 months')),
      average_lists as (
        select 'average' grp, c.name, s.commander_oracle_id::text commander, false partner, s.oracle_id::text, 1 quantity
          from (select csc.commander_oracle_id, csc.oracle_id,
                       row_number() over (partition by csc.commander_oracle_id order by csc.inclusion desc nulls last, csc.oracle_id) rn
                  from commander_support_cards csc join cards k on k.oracle_id = csc.oracle_id
                 where csc.commander_oracle_id in (select commander_oracle_id from top) and k.type_line !~* '\\mland\\M') s
          join cards c on c.oracle_id = s.commander_oracle_id
         where s.rn <= ${AVERAGE_SIZE})
      select * from deck_lists union all select * from precon_lists union all select * from average_lists`);

    const lists = new Map<string, { grp: string; name: string; commander: string | null; partner: boolean; cards: Card[] }>();
    for (const r of listRows) {
      const key = `${r.grp}\u0000${r.name}`;
      const l = lists.get(key) ?? { grp: r.grp, name: r.name, commander: r.commander, partner: r.partner, cards: [] };
      const c = card(r.oracle_id, r.quantity);
      if (c) l.cards.push(c);
      lists.set(key, l);
    }

    const commanders = [...new Set([...lists.values()].map((l) => l.commander).filter((x): x is string => !!x))];
    const { rows: avgRows } = await client.query<{ commander: string; oracle_id: string }>(`
      select commander, oracle_id from (
        select csc.commander_oracle_id::text commander, csc.oracle_id::text oracle_id,
               row_number() over (partition by csc.commander_oracle_id order by csc.inclusion desc nulls last, csc.oracle_id) rn
          from commander_support_cards csc join cards k on k.oracle_id = csc.oracle_id
         where csc.commander_oracle_id = any($1::uuid[]) and k.type_line !~* '\\mland\\M') s
       where rn <= ${AVERAGE_SIZE}`, [commanders]);
    await client.query("commit");

    const averages = new Map<string, Card[]>();
    for (const r of avgRows) {
      const c = card(r.oracle_id, 1);
      if (c) averages.set(r.commander, [...(averages.get(r.commander) ?? []), c]);
    }
    const catalogBase = baselineOf([...byId.keys()].map((id) => card(id, 1)!));

    console.log(`rules: floor ${AXIS_FLOOR} copies · big creature = creature of MV ≥ ${BIG_CREATURE_MIN_MV} (no power column) · up to ${TYPAL_AXES} typal axes · baseline floor ${BASELINE_FLOOR}`);
    console.log(`catalog baseline: ${catalogBase.axes.total} commander-legal nonland game cards, one copy each`);
    console.log(`catalog shares: ${["artifacts", "enchantments", "voltron", "vehicles", "bigCreatures"].map((a) => `${a} ${(baselineShare(catalogBase.axes, a as never) * 100).toFixed(1)}%`).join(" · ")}`);
    console.log(`commander averages: the ${AVERAGE_SIZE} highest-inclusion nonland cards; ${averages.size} of ${commanders.length} commanders have one\n`);
    console.log(["group", "list", "nonland", "catalog peak (axis copies)", "commander peak (axis copies, base share)"].join(" | "));

    const results: { grp: string; name: string; cat: number; cmd: number | null }[] = [];
    for (const l of [...lists.values()].sort((a, b) => a.grp.localeCompare(b.grp) || a.name.localeCompare(b.name))) {
      const cat = peak(l.cards, catalogBase);
      const avg = l.commander ? averages.get(l.commander) : undefined;
      const cmd = avg ? peak(l.cards, baselineOf(avg)) : null;
      const total = l.cards.reduce((n, c) => n + c.axis.quantity, 0);
      results.push({ grp: l.grp, name: l.name, cat: cat[0], cmd: cmd?.[0] ?? null });
      console.log([l.grp, `${l.name}${l.partner ? " [partner]" : ""}`, total,
        `${cat[0].toFixed(1)} (${cat[1]} ${cat[2]})`,
        cmd ? `${cmd[0].toFixed(1)} (${cmd[1]} ${cmd[2]}, ${(cmd[3] * 100).toFixed(1)}%)` : "no average"].join(" | "));
    }

    console.log("\ngroup | n | median catalog peak | median commander peak");
    for (const g of ["deck", "precon", "control", "average"]) {
      const rs = results.filter((r) => r.grp === g);
      const cmd = rs.map((r) => r.cmd).filter((x): x is number => x !== null);
      console.log(`${g} | ${rs.length} | ${median(rs.map((r) => r.cat)).toFixed(1)} | ${median(cmd).toFixed(1)} (n ${cmd.length})`);
    }
    const tune = results.filter((r) => r.grp === "deck" && r.name.startsWith("HD Tune"));
    console.log(`HD Tune decks | ${tune.length} | ${median(tune.map((r) => r.cat)).toFixed(1)} | ${median(tune.map((r) => r.cmd).filter((x): x is number => x !== null)).toFixed(1)}`);
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
