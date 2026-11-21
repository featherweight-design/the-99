// measure:deck-tags-from-cards — #724, READ-ONLY on staging. Slug coverage of the stored theme
// pages and the synergy distribution, before any reader is built.
import { requireEnv } from "./lib/env.mjs";
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
process.env.DATABASE_URL = THE_99_NEON_STAGING_DIRECT;
const { sql } = await import("drizzle-orm");
const { db } = await import("../src/db");
const q = async (s: ReturnType<typeof sql>) => (await db.execute(s)).rows as Record<string, any>[];
const [{ branch }] = await q(sql`select current_setting('neon.branch_id', true) as branch`);
if (branch !== STAGING_BRANCH) throw new Error(`staging only; this is ${branch}`);

console.log("pages", await q(sql`select count(*)::int pages, count(distinct slug)::int slugs, count(distinct commander_oracle_id)::int commanders from commander_theme_support`));
console.log("rows", await q(sql`select count(*)::int n, count(synergy)::int with_syn, min(synergy) mn, max(synergy) mx, percentile_cont(array[.5,.75,.9,.95,.99]) within group (order by synergy) pct from commander_theme_support_cards`));
console.log("pages per slug", await q(sql`select percentile_cont(array[.1,.25,.5,.75,.9]) within group (order by n) pct, min(n) mn, max(n) mx from (select slug, count(*) n from commander_theme_support group by slug) t`));
console.log("commander_support tags total slugs", await q(sql`select count(distinct t->>'slug')::int n from commander_support cs, jsonb_array_elements(cs.tags) t`));
console.log("export keys", Object.keys(await import("../src/lib/edhrec/tag-kinds.generated")));
process.exit(0);
