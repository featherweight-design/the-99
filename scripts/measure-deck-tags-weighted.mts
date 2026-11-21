// #724 weighted measure, READ-ONLY on staging.
import { requireEnv } from "./lib/env.mjs";
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
process.env.DATABASE_URL = THE_99_NEON_STAGING_DIRECT;
const { sql } = await import("drizzle-orm");
const { db } = await import("../src/db");
const q = async (s: ReturnType<typeof sql>) => (await db.execute(s)).rows as Record<string, any>[];
const [{ branch }] = await q(sql`select current_setting('neon.branch_id', true) as branch`);
if (branch !== STAGING_BRANCH) throw new Error(`staging only; this is ${branch}`);

const decks = await q(sql`select d.id, d.name, c.name as cmd, d.commander_oracle_id as oid, (select count(*)::int from deck_cards dc where dc.deck_id=d.id) n from decks d join cards c on c.oracle_id=d.commander_oracle_id`);
console.log("decks", decks.length, "with>=20 cards", decks.filter((d) => d.n >= 20).length);
const tagsRows = await q(sql`select commander_oracle_id oid, tags from commander_support`);
const tagsBy = new Map(tagsRows.map((r) => [r.oid, (r.tags as { slug: string; label: string }[]).map((t) => t.slug)]));
const pages = new Map((await q(sql`select slug, count(*)::int n from commander_theme_support group by slug`)).map((r) => [r.slug, r.n]));

// 1. usage-weighted coverage over the commander tag lists loadPlayedTags would hand out
const weight = new Map<string, number>();
let withTags = 0;
for (const d of decks) { const t = tagsBy.get(d.oid); if (!t) continue; withTags++; for (const s of t) weight.set(s, (weight.get(s) ?? 0) + 1); }
let tot = 0, ge1 = 0, ge5 = 0;
for (const [s, w] of weight) { tot += w; if ((pages.get(s) ?? 0) >= 1) ge1 += w; if ((pages.get(s) ?? 0) >= 5) ge5 += w; }
console.log("decks with commander tags", withTags, "weight", tot, "backed>=1", (100*ge1/tot).toFixed(1)+"%", "backed>=5", (100*ge5/tot).toFixed(1)+"%");

// 2. pivot: slug -> cards with synergy >= FLOOR on any stored page of that slug
const FLOOR = 0.3;
const piv = await q(sql`select slug, oracle_id from commander_theme_support_cards where synergy >= ${FLOOR} group by slug, oracle_id`);
const bySlug = new Map<string, Set<string>>();
for (const r of piv) { let s = bySlug.get(r.slug); if (!s) bySlug.set(r.slug, (s = new Set())); s.add(r.oracle_id); }
const sample = decks.filter((d) => d.n >= 20);
const dcs = await q(sql`select dc.deck_id, dc.oracle_id from deck_cards dc join decks d on d.id=dc.deck_id`);
const cardsBy = new Map<string, Set<string>>();
for (const r of dcs) { let s = cardsBy.get(r.deck_id); if (!s) cardsBy.set(r.deck_id, (s = new Set())); s.add(r.oracle_id); }
const label = new Map<string, string>();
for (const r of tagsRows) for (const t of r.tags as { slug: string; label: string }[]) label.set(t.slug, t.label);
const Ks = [3, 5, 8, 12];
const clear: Record<number, number[]> = Object.fromEntries(Ks.map((k) => [k, []]));
const rows: { d: any; hits: [string, number][] }[] = [];
for (const d of sample) {
  const cs = cardsBy.get(d.id) ?? new Set();
  const hits: [string, number][] = [];
  for (const [slug, set] of bySlug) { let n = 0; for (const c of cs) if (set.has(c)) n++; if (n) hits.push([slug, n]); }
  hits.sort((a, b) => b[1] - a[1]);
  for (const k of Ks) clear[k].push(hits.filter((h) => h[1] >= k).length);
  rows.push({ d, hits });
}
const pct = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
for (const k of Ks) console.log(`K=${k}: decks ${clear[k].length}, tags clearing K median ${pct(clear[k],.5)} p10 ${pct(clear[k],.1)} p90 ${pct(clear[k],.9)}, decks with 0: ${clear[k].filter((x)=>x===0).length}`);
// spot-check 10 decks
for (const { d, hits } of rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 10)) === 0).slice(0, 10)) {
  const cmdTags = (tagsBy.get(d.oid) ?? []).slice(0, 8).map((s) => label.get(s) ?? s);
  console.log(`\n${d.cmd} [${d.n} cards] commander tags: ${cmdTags.join(", ")}\n  pivot top: ${hits.slice(0, 8).map(([s, n]) => `${label.get(s) ?? s}(${n})`).join(", ")}`);
}
process.exit(0);
