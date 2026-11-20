// Engine plan A1: do EDHREC theme pages, and synergy weighting, reach the cards a commander's primers play?
//
//   pnpm measure:build-themes [primers.json]
//
// Read-only and DB-free: it fetches each commander's EDHREC page and its top theme pages (the theme
// slugs come from the commander page's own `tag_counts`; a guessed slug returns 403), serially, 250 ms
// apart, with the index's User-Agent, and ranks the nonland cards four ways:
//
//   commander · inclusion      today's ranking (the Top picks shelf, the fill's buy pool)
//   commander · score          inclusion × (1 + max(0, synergy)) on the commander page
//   theme · inclusion          inclusion within the theme page
//   theme · score              the score within the theme page
//
// For each ranking it counts how many of the primer's nonland cards land in the first NONLAND_SLOTS,
// the room a 99-card deck has for spells. The primer lists are public decklists and articles,
// recorded with their sources in `scripts/fixtures/build-themes-primers.json`, nonland cards only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEdhrecPayload } from "../src/lib/edhrec/parse";
import { commanderSlug } from "../src/lib/edhrec/slug";
import { inclusionLookup } from "../src/lib/edhrec/inclusion-rank";

const NONLAND_SLOTS = 62;
const THEMES_PER_COMMANDER = 3;
const DELAY_MS = 250;
const LAND_LISTS = new Set(["lands", "utilitylands", "basics", "nonbasiclands"]);

type Primers = Record<string, { sources: string[]; cards: string[]; notes?: string }>;
type Page = { listed: Set<string>; names: string[]; inclusionOf: (n: string) => number | null; synergyOf: (n: string) => number | null; lands: Set<string>; tags: { slug: string; count: number }[] };

const path = process.argv[2] ?? join(process.cwd(), "scripts/fixtures/build-themes-primers.json");
const primers = JSON.parse(readFileSync(path, "utf8")) as Primers;
let requests = 0;

async function fetchPage(url: string): Promise<Page | null> {
  await new Promise((r) => setTimeout(r, DELAY_MS));
  requests++;
  let raw: {
    tag_counts?: { slug?: string; count?: number }[];
    container?: { json_dict?: { cardlists?: { tag?: string; cardviews?: { name?: string }[] }[] } };
  };
  try {
    const res = await fetch(url, { headers: { "User-Agent": "the-99/1.0" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) { console.warn(`  ${res.status} ${url}`); return null; }
    raw = await res.json();
  } catch (err) {
    // One timeout or a non-JSON body skips this page, never the rest of the run.
    console.warn(`  failed ${url}`, err);
    return null;
  }
  // `parseEdhrecPayload` degrades to an empty list on any shape; a page with no card lists is no page.
  if (!Array.isArray(raw.container?.json_dict?.cardlists)) { console.warn(`  not a page: ${url}`); return null; }
  const data = parseEdhrecPayload(raw);
  const lands = new Set<string>();
  for (const list of raw.container?.json_dict?.cardlists ?? []) {
    if (!LAND_LISTS.has(list.tag ?? "")) continue;
    for (const c of list.cardviews ?? []) if (c.name) lands.add(c.name.toLowerCase());
  }
  const synergy = inclusionLookup(data.synergyByName ?? {});
  return {
    listed: new Set(data.topCards.map((n) => n.toLowerCase().split(" // ")[0])),
    names: data.topCards,
    inclusionOf: inclusionLookup(data.inclusionByName),
    synergyOf: synergy,
    lands,
    tags: (raw.tag_counts ?? [])
      .filter((t): t is { slug: string; count: number } => typeof t.slug === "string" && Number.isFinite(t.count))
      .sort((a, b) => b.count - a.count),
  };
}

const score = (p: Page) => (n: string) => {
  const inc = p.inclusionOf(n);
  return inc === null ? -1 : inc * (1 + Math.max(0, p.synergyOf(n) ?? 0));
};
const byInc = (p: Page) => (n: string) => p.inclusionOf(n) ?? -1;

/** The page's nonland names ranked by `key`, highest first, list order kept on a tie. */
function ranked(p: Page, key: (n: string) => number): string[] {
  return p.names
    .filter((n) => !p.lands.has(n.toLowerCase()))
    .map((n, i) => ({ n, i, k: key(n) }))
    .sort((a, b) => b.k - a.k || a.i - b.i)
    .map((r) => r.n.toLowerCase());
}

function reach(list: string[], primer: Set<string>): number {
  return list.slice(0, NONLAND_SLOTS).filter((n) => primer.has(n.split(" // ")[0])).length;
}

async function main() {
  console.log(`| Commander | Primer nonland | On the page | Commander · inclusion | Commander · score | Top theme · inclusion | Best theme (upper bound) | Theme · inclusion | Theme · score |`);
  console.log(`|---|---|---|---|---|---|---|---|---|`);
  for (const [commander, entry] of Object.entries(primers)) {
    const slug = commanderSlug(commander);
    const main = await fetchPage(`https://json.edhrec.com/pages/commanders/${slug}.json`);
    if (!main) { console.log(`| ${commander} | no commander page |`); continue; }
    // EDHREC names a double-faced card by its front face, so the primer is matched on front faces too.
    // The fixture holds nonland cards only (lands removed by type line against the catalog).
    const primer = new Set(entry.cards.map((c) => c.toLowerCase().split(" // ")[0]));
    const onPage = [...primer].filter((c) => main.listed.has(c)).length;
    const themeRows: { slug: string; inc: number; sc: number; onPage: number }[] = [];
    for (const tag of main.tags.slice(0, THEMES_PER_COMMANDER)) {
      const page = await fetchPage(`https://json.edhrec.com/pages/commanders/${slug}/${tag.slug}.json`);
      if (!page) continue;
      themeRows.push({
        slug: `${tag.slug} (${tag.count})`,
        inc: reach(ranked(page, byInc(page)), primer),
        sc: reach(ranked(page, score(page)), primer),
        onPage: [...primer].filter((c) => page.listed.has(c)).length,
      });
    }
    // The TOP tag is what the app could choose unprompted; the best of the three is an upper bound,
    // chosen against the primer itself.
    const top = themeRows[0];
    const best = [...themeRows].sort((a, b) => Math.max(b.inc, b.sc) - Math.max(a.inc, a.sc))[0];
    console.log(`| ${commander} | ${primer.size} | ${onPage} | ${reach(ranked(main, byInc(main)), primer)} | ${reach(ranked(main, score(main)), primer)} | ${top ? `${top.slug}: ${top.inc}` : "-"} | ${best?.slug ?? "none"} | ${best?.inc ?? "-"} | ${best?.sc ?? "-"} |`);
  }
  console.log(`\n${requests} EDHREC requests; first ${NONLAND_SLOTS} nonland cards counted.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
