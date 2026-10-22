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

import type { LabelTheme } from "../src/lib/labels/types";
import { AXIS_FLOOR, BASELINE_FLOOR, BIG_CREATURE_MIN_MV, TYPAL_AXES, baselineShare } from "../src/lib/strategy/axes";
import { toStrategyCard } from "../src/lib/strategy/load";
import { MIN_NONLAND, TOP_AXES, catalogBaseline, scoredAxes, type StrategyBaseline, type StrategyCard } from "../src/lib/strategy/score";

neonConfig.webSocketConstructor = ws;
const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
const pool = new Pool({ connectionString: THE_99_NEON_STAGING_DIRECT });
const AVERAGE_SIZE = 64;

type CardRow = { oracle_id: string; type_line: string; cmc: number; keywords: string[] | null; layout: string; themes: LabelTheme[] | null };
type ListRow = { grp: string; name: string; commander: string | null; partner: boolean; oracle_id: string; quantity: number };

type Card = StrategyCard;

/** The list's best axis against one baseline, by the shipped rule: `[score, axis, copies]`. */
function peak(cards: readonly Card[], base: StrategyBaseline): [number, string, number] {
  const [best] = scoredAxes(cards, base);
  return best ? [best.score, best.key, best.copies] : [0, "-", 0];
}

/** A deterministic generator, so a re-run prints the same stability figures. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` copies drawn without replacement from a list, as one-copy cards. */
function sample(cards: readonly Card[], n: number, next: () => number): Card[] {
  const copies = cards.flatMap((c) => Array.from({ length: c.quantity }, () => ({ ...c, quantity: 1 })));
  for (let i = copies.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copies[i], copies[j]] = [copies[j], copies[i]];
  }
  return copies.slice(0, n);
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
    const byId = new Map(catalog.map((c) => [c.oracle_id, c]));
    const card = (id: string, quantity: number): Card | null => {
      const c = byId.get(id);
      return c ? toStrategyCard({ layout: c.layout, typeLine: c.type_line, manaValue: c.cmc, keywords: c.keywords ?? [], themes: c.themes, quantity }) : null;
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
    const catalogBase = catalogBaseline([...byId.keys()].map((id) => card(id, 1)).filter((c): c is Card => c !== null));

    console.log(`rules: floor ${AXIS_FLOOR} copies · big creature = creature of MV ≥ ${BIG_CREATURE_MIN_MV} (no power column) · up to ${TYPAL_AXES} typal axes · baseline floor ${BASELINE_FLOOR}`);
    console.log(`catalog baseline: ${catalogBase.axes.total} commander-legal nonland game cards, one copy each`);
    console.log(`catalog shares: ${["artifacts", "enchantments", "voltron", "vehicles", "bigCreatures"].map((a) => `${a} ${(baselineShare(catalogBase.axes, a as never) * 100).toFixed(1)}%`).join(" · ")}`);
    console.log(`commander averages: the ${AVERAGE_SIZE} highest-inclusion nonland cards; ${averages.size} of ${commanders.length} commanders have one\n`);
    console.log(["group", "list", "nonland", "catalog peak (axis copies)", "commander peak (axis copies, base share)"].join(" | "));

    const results: { grp: string; name: string; cat: number; cmd: number | null }[] = [];
    for (const l of [...lists.values()].sort((a, b) => a.grp.localeCompare(b.grp) || a.name.localeCompare(b.name))) {
      const cat = peak(l.cards, catalogBase);
      const avg = l.commander ? averages.get(l.commander) : undefined;
      const cmd = avg ? peak(l.cards, catalogBaseline(avg)) : null;
      const total = l.cards.reduce((n, c) => n + c.quantity, 0);
      results.push({ grp: l.grp, name: l.name, cat: cat[0], cmd: cmd?.[0] ?? null });
      console.log([l.grp, `${l.name}${l.partner ? " [partner]" : ""}`, total,
        `${cat[0].toFixed(1)} (${cat[1]} ${cat[2]})`,
        cmd ? `${cmd[0].toFixed(1)} (${cmd[1]} ${cmd[2]})` : "no average"].join(" | "));
    }

    console.log("\ngroup | n | median catalog peak | median commander peak");
    for (const g of ["deck", "precon", "control", "average"]) {
      const rs = results.filter((r) => r.grp === g);
      const cmd = rs.map((r) => r.cmd).filter((x): x is number => x !== null);
      console.log(`${g} | ${rs.length} | ${median(rs.map((r) => r.cat)).toFixed(1)} | ${median(cmd).toFixed(1)} (n ${cmd.length})`);
    }
    const tune = results.filter((r) => r.grp === "deck" && r.name.startsWith("HD Tune"));
    console.log(`HD Tune decks | ${tune.length} | ${median(tune.map((r) => r.cat)).toFixed(1)} | ${median(tune.map((r) => r.cmd).filter((x): x is number => x !== null)).toFixed(1)}`);

    // The radar as the app will draw it: the top axes against the catalog, a broad theme marked.
    console.log(`\ntop ${TOP_AXES} against the catalog (the radar; * = broad theme, not offered for lean-in)`);
    for (const l of [...lists.values()].filter((x) => x.grp === "deck").sort((a, b) => a.name.localeCompare(b.name))) {
      const top = scoredAxes(l.cards, catalogBase).slice(0, TOP_AXES);
      console.log(`${l.name} | ${top.map((a) => `${a.key}${a.leanable ? "" : "*"} ${a.copies}×${a.score.toFixed(0)}`).join(" · ") || "none"}`);
    }

    // How small a list can be and still read like itself. Each list of 60+ nonland copies is cut, 40 times per size, to
    // a random N copies; the cut's top axis is compared with the whole list's, and its top five with the whole list's
    // top five. The floor (\`MIN_NONLAND\`, now ${MIN_NONLAND}) is the smallest size that reads the same plan.
    const TRIALS = 40;
    const sizes = [20, 30, 40];
    const pool = [...lists.values()].filter((l) => l.grp !== "average" && l.cards.reduce((n, c) => n + c.quantity, 0) >= 60);
    console.log(`\nstability: ${pool.length} lists of 60+ nonland copies (decks and precons), ${TRIALS} random cuts per size`);
    console.log("size | top axis matches the whole list (median list, p25 list) | top-5 overlap (mean) | cuts reading none");
    for (const n of sizes) {
      const agree: number[] = [];
      const overlap: number[] = [];
      let none = 0;
      pool.forEach((l, li) => {
        const whole = scoredAxes(l.cards, catalogBase).slice(0, TOP_AXES).map((a) => a.key);
        if (whole.length === 0) return;
        const next = rng(li * 1009 + n);
        let hits = 0;
        for (let t = 0; t < TRIALS; t++) {
          const cut = scoredAxes(sample(l.cards, n, next), catalogBase).slice(0, TOP_AXES).map((a) => a.key);
          if (cut.length === 0) none++;
          if (cut[0] === whole[0]) hits++;
          overlap.push(cut.filter((k) => whole.includes(k)).length / whole.length);
        }
        agree.push(hits / TRIALS);
      });
      const sorted = [...agree].sort((a, b) => a - b);
      const p25 = sorted[Math.floor(sorted.length / 4)] ?? NaN;
      const mean = overlap.reduce((a, b) => a + b, 0) / Math.max(overlap.length, 1);
      console.log(`${n} | ${(median(agree) * 100).toFixed(0)}%, ${(p25 * 100).toFixed(0)}% | ${(mean * 100).toFixed(0)}% | ${none} of ${pool.length * TRIALS}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
