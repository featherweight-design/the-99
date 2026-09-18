// Measures the gap line's own frequency problem, which is the fact the depth
// proposal rests on: `allPlayed` is not an edge state on a reader with many
// built decks, it is the default.
//
// READ-ONLY. It writes nothing, takes no locks and creates no fixture — point it
// at `local-dev` or any branch you can read. Five questions:
//
//   1 · how often each gap-slot occupant is drawn, per lane
//   2 · how often it is drawn in the rows a reader actually SEES — the first
//       screen of each sort, which is where Hugh read 90%
//   3 · the DEPTH distribution: for every mechanic a commander leans on, in how
//       many of the reader's decks is it played? The proposal replaces a binary
//       with this figure, so whether "1 of 18 decks" reads as informative or as
//       noise is decided by its shape
//   4 · how much of the catalogue a depth line would rescue — rows that draw
//       `allPlayed` today and would carry a reading under that proposal
//   5 · OPTION E: what happens to the state's frequency if a deck only counts
//       as playing its commander's top N themes. This is the table the design
//       table's rejection of that option is sourced from, not an afterthought
//
// QUESTION 2 IS THE ONE PLACE THIS SCRIPT COULD LIE, and four review findings
// landed on it — every one the same shape: a rule RESTATED here instead of the
// route's own function being called.
//
// It now imports `byFit` and `byNovelty` and calls them, and it builds their
// inputs the way the route does: `unplayedTags` over the FULL tag list for
// `unplayedCount`, `clearsFloor` as the novelty lane's membership test, and
// `notBuiltBy`'s rule for the lane split. What it still cannot reproduce is
// named rather than papered over, below.
//
// The history is the argument for calling rather than restating. The first
// version ordered `Something new` by a RATIO (unplayed / eligible) where
// `byNovelty` ranks on the absolute count, so a commander with 2 eligible tags
// and 1 unplayed sorted above one with 30 eligible and 12 unplayed — the
// reverse of the app; it called that order "ascending" while sorting
// descending; it ordered `Best fit` by `commander_scores.score` where `byFit`
// ranks on `ownedSupport`, a field it never loaded; and it split the lanes on
// `collection_items` alone where `/commanders` also excludes every commander
// the reader has BUILT. None of it was caught by running the script.
//
// STILL NOT REPRODUCED, and read question 2 with these in mind:
//   · `ownedSupport` — the count of the commander's support list the reader
//     owns — needs a collection read this script does not do. `byFit`'s
//     primary key is therefore approximated by `commander_scores.score` where
//     the account has scored rows, and skipped entirely where it does not.
//     `score` is a function of `ownedSupport`, so the order correlates; it is
//     not the same order.
//   · windowing. The routes ship a first batch and the reader scrolls; this
//     reports the first 25 of a full sort.

// `requireEnv` FIRST: `src/db` reads `DATABASE_URL` at import time, so the env
// has to be loaded before that module is evaluated. Same order every probe here
// uses.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);

import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { byNovelty, loadPlayedTags, unplayedTags } from "../src/lib/discovery/novelty";
import {
  eligibleMechanics,
  gapSlotFor,
  isMechanic,
  type GapSlot,
} from "../src/lib/edhrec/gap-slot";
import type { EdhrecTag } from "../src/lib/edhrec/parse";

const FIRST_SCREEN = 25;
let namesLeft = 6;

type Row = {
  oracleId: string;
  name: string;
  tags: EdhrecTag[];
  deckCount: number | null;
  score: number | null;
  owned: boolean;
};

function pct(n: number, of: number): string {
  return of === 0 ? "—" : `${((n / of) * 100).toFixed(1)}%`;
}

function tally(rows: Row[], played: ReadonlySet<string>) {
  const counts: Record<GapSlot["kind"], number> = {
    unplayed: 0,
    allPlayed: 0,
    noMechanics: 0,
  };
  for (const r of rows) counts[gapSlotFor(r.tags, r.deckCount, played).kind] += 1;
  return counts;
}

function report(label: string, rows: Row[], played: ReadonlySet<string>) {
  const c = tally(rows, played);
  const n = rows.length;
  console.log(`\n${label} — ${n} rows`);
  console.log(`  unplayed    ${String(c.unplayed).padStart(5)}  ${pct(c.unplayed, n)}`);
  console.log(`  allPlayed   ${String(c.allPlayed).padStart(5)}  ${pct(c.allPlayed, n)}`);
  console.log(`  noMechanics ${String(c.noMechanics).padStart(5)}  ${pct(c.noMechanics, n)}`);
}

async function main() {
  // The account with the most decks, since the whole effect is a function of how
  // many the reader has: a one-deck account cannot produce it.
  //
  // DECKS, not built decks. `loadPlayedTags` joins no `deck_versions`, so a BREW
  // counts — deliberately, and `novelty.ts` records that this exact wording was
  // corrected there once already. Every figure below therefore includes brews,
  // and calling them "built" would overstate what the played set is drawn from.
  // `.rows`, not the result object: `db.execute` returns the driver's result.
  const { rows: tops } = await db.execute<{ user_id: string; decks: number }>(sql`
    select user_id, count(*)::int as decks
    from decks
    group by user_id
    order by decks desc
  `);
  if (tops.length === 0) throw new Error("no decks in this database — nothing to measure");
  console.log("accounts with decks:");
  for (const t of tops) console.log(`  ${t.user_id} · ${t.decks} decks`);
  // `MEASURE_USER_ID` when more than one account could be the reader. The
  // default is the busiest, since the effect is a function of deck count — but
  // a silent pick is how a measurement ends up describing the wrong reader.
  const userId = process.env.MEASURE_USER_ID ?? tops[0]!.user_id;
  console.log(`\nmeasuring ${userId}`);

  const deckSets = await loadPlayedTags(userId);
  const played = new Set(deckSets.flatMap((d) => [...d.slugs]));
  console.log(`decks with tags (brews included): ${deckSets.length} · distinct played slugs: ${played.size}`);

  // DEPTH, per played slug: in how many of the reader's decks does it appear?
  // This is the figure the proposal prints, and it is arithmetic over the sets
  // already loaded — no query, no model call.
  const depth = new Map<string, number>();
  for (const d of deckSets) for (const s of d.slugs) depth.set(s, (depth.get(s) ?? 0) + 1);

  const rows = (
    await db.execute<{
      oracle_id: string;
      name: string;
      tags: EdhrecTag[];
      deck_count: number | null;
      score: number | null;
      owned: boolean;
    }>(sql`
      select cs.commander_oracle_id as oracle_id,
             c.name,
             cs.tags,
             cs.deck_count,
             sc.score,
             exists (
               select 1 from collection_items ci
               where ci.user_id = ${userId} and ci.oracle_id = cs.commander_oracle_id
             ) as owned
      from commander_support cs
      join cards c on c.oracle_id = cs.commander_oracle_id
      left join commander_scores sc
             on sc.oracle_id = cs.commander_oracle_id
            and sc.user_id = ${userId}
    `)
  ).rows.map((r) => ({
    oracleId: r.oracle_id,
    name: r.name,
    tags: r.tags,
    deckCount: r.deck_count,
    score: r.score,
    owned: r.owned,
  }));
  console.log(`commanders on file: ${rows.length}`);

  // ── 1 · per lane, whole catalogue ───────────────────────────────────────
  //
  // The lanes are disjoint by construction, but "owned" is not the whole split
  // and the first version's was wrong in both directions: `/commanders` lists
  // what the reader owns AND HAS NOT BUILT, and `/discover` applies `notBuiltBy`
  // too, so a commander the reader has built appears on neither. Read against
  // the app's own header — "190 commanders you own and haven't built" — the
  // unfiltered owned count was 204. Named by review.
  const built = new Set(
    (
      await db.execute<{ oracle_id: string }>(sql`
        select commander_oracle_id as oracle_id from decks where user_id = ${userId}
        union
        select partner_oracle_id as oracle_id from decks
         where user_id = ${userId} and partner_oracle_id is not null
      `)
    ).rows.map((r) => r.oracle_id),
  );
  const ownedRows = rows.filter((r) => r.owned && !built.has(r.oracleId));
  const unownedRows = rows.filter((r) => !r.owned && !built.has(r.oracleId));
  console.log(`commanders the reader has built, excluded from both lanes: ${built.size}`);
  report("/commanders (owned), whole lane", ownedRows, played);
  report("/discover (unowned), whole lane", unownedRows, played);

  // ── 2 · the first screen of each sort ───────────────────────────────────
  const scored = unownedRows.filter((r) => r.score !== null);
  if (scored.length === 0) {
    console.log(
      "\nno scored rows for this account — `Best fit` order cannot be reproduced.\n" +
        "Run the scorer for this user, or read the whole-lane figures above only.",
    );
  } else {
    // `byFit` ranks on `ownedSupport` then the oracle id. This script does not
    // read the collection, so `score` stands in for that primary key — a
    // function of it, correlated but not identical, and said so in the header.
    const bestFit = [...scored].sort((a, b) => b.score! - a.score!);
    report(`/discover · Best fit, first ${FIRST_SCREEN}`, bestFit.slice(0, FIRST_SCREEN), played);
    report("/discover · Best fit, first 100", bestFit.slice(0, 100), played);
  }

  // `Something new` ranks on how MANY of the commander's themes the reader does
  // not play — an absolute count, not a share — so `allPlayed` sorts to the
  // bottom there by construction. `byNovelty` is the route's own comparator and
  // is called rather than restated; `ownedSupport` is its tiebreak, and the
  // deck count stands in for it here since this script does not read the
  // collection. The tiebreak only separates commanders already equal on the
  // figure that decides the order.
  // `unplayedTags` over the FULL tag list, which is what the route counts —
  // `eligibleMechanics` applies the theme floor and was the first version's
  // input, so rows the route ranks on a larger count ranked lower here.
  const somethingNew = [...unownedRows]
    .map((r) => ({
      r,
      unplayedCount: unplayedTags(r.tags, played).length,
      ownedSupport: r.deckCount ?? 0,
      oracleId: r.oracleId,
    }))
    .sort(byNovelty)
    .map((o) => o.r);
  report(
    `/discover · Something new, first ${FIRST_SCREEN}`,
    somethingNew.slice(0, FIRST_SCREEN),
    played,
  );

  // ── 3 · the depth distribution ──────────────────────────────────────────
  // Over every (commander, eligible mechanic) pair on the unowned lane, since
  // that pair is what the proposed line would rank and print.
  const buckets = new Map<number, number>();
  let pairs = 0;
  for (const r of unownedRows) {
    for (const t of eligibleMechanics(r.tags, r.deckCount)) {
      const d = depth.get(t.slug) ?? 0;
      buckets.set(d, (buckets.get(d) ?? 0) + 1);
      pairs += 1;
    }
  }
  console.log(`\ndepth of the mechanics /discover would name — ${pairs} (commander, mechanic) pairs`);
  for (const d of [...buckets.keys()].sort((a, b) => a - b).slice(0, 12)) {
    const n = buckets.get(d)!;
    console.log(
      `  played in ${String(d).padStart(2)} deck(s)  ${String(n).padStart(6)}  ${pct(n, pairs)}`,
    );
  }

  // ── 4 · what the proposal rescues ───────────────────────────────────────
  // A row drawing `allPlayed` today carries a reading under the proposal iff it
  // has an eligible mechanic at all — which every `allPlayed` row does, by
  // definition. The figure worth having is how THIN the thinnest one is: a row
  // whose every mechanic sits in 12 of 18 decks is rescued in form and not in
  // substance.
  const thinnest: number[] = [];
  for (const r of unownedRows) {
    if (gapSlotFor(r.tags, r.deckCount, played).kind !== "allPlayed") continue;
    const ds = eligibleMechanics(r.tags, r.deckCount).map((t) => depth.get(t.slug) ?? 0);
    if (ds.length > 0) thinnest.push(Math.min(...ds));
  }
  thinnest.sort((a, b) => a - b);
  if (thinnest.length === 0) {
    console.log("\nno allPlayed rows on /discover — nothing for the depth line to rescue");
  } else {
    const at = (q: number) => thinnest[Math.floor((thinnest.length - 1) * q)];
    console.log(`\nallPlayed rows on /discover: ${thinnest.length}`);
    console.log("  their THINNEST named mechanic, by deck count:");
    console.log(`    min ${at(0)} · p25 ${at(0.25)} · median ${at(0.5)} · p75 ${at(0.75)} · max ${at(1)}`);
    const shallow = thinnest.filter((d) => d <= 2).length;
    console.log(
      `  rows whose thinnest mechanic sits in 2 decks or fewer: ${shallow} (${pct(shallow, thinnest.length)})`,
    );
  }

  // The names themselves, so the reading can be judged rather than inferred.
  const shallowest = [...depth.entries()].sort((a, b) => a[1] - b[1]).slice(0, 10);
  console.log("\nthe reader's 10 thinnest played mechanics (slug · decks):");
  for (const [slug, n] of shallowest) console.log(`  ${slug} · ${n}`);

  // ── 5 · OPTION E · what if a deck only "plays" its commander's TOP tags? ──
  //
  // `toDeckTagSets` takes every tag on each deck's commander, and EDHREC tags a
  // commander with every archetype PEOPLE build with it — so the played set
  // absorbs every archetype the reader's commanders are capable of rather than
  // the ones they chose. Kenrith carries Group Hug, Politics and Reanimator
  // because the internet builds him all three ways; the reader built one.
  //
  // A commander's tag list is ranked by how many decks carry it, so the top few
  // are what most builds actually are. This measures the whole curve rather than
  // arguing about where to cut: it is a heuristic either way, and the question
  // is whether any cut moves the number enough to matter.
  const deckCommanderTags = (
    await db.execute<{ deck_name: string; tags: EdhrecTag[] }>(sql`
      select d.name as deck_name, cs.tags
      from decks d
      join commander_support cs
        on cs.commander_oracle_id in (d.commander_oracle_id, d.partner_oracle_id)
      where d.user_id = ${userId}
    `)
  ).rows;

  // One entry per deck, since a pair's two commanders both contribute and the
  // cut is per COMMANDER — taking the top 3 of a merged list would give a pair
  // three tags where a single commander also gets three.
  const perDeck = new Map<string, EdhrecTag[][]>();
  for (const r of deckCommanderTags) {
    const mechanics = r.tags
      .filter((t) => isMechanic(t.label))
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
    const list = perDeck.get(r.deck_name) ?? [];
    list.push(mechanics);
    perDeck.set(r.deck_name, list);
  }

  console.log("\noption E — played set built from each commander's TOP n tags:");
  console.log("  n      played  /discover allPlayed   /commanders allPlayed");
  for (const n of [1, 2, 3, 5, 10, 20, 50, Infinity]) {
    const set = new Set<string>();
    for (const commanders of perDeck.values()) {
      for (const tags of commanders) {
        for (const t of tags.slice(0, n === Infinity ? undefined : n)) set.add(t.slug);
      }
    }
    const d = tally(unownedRows, set);
    const o = tally(ownedRows, set);
    const label = n === Infinity ? "all" : String(n);
    console.log(
      `  ${label.padStart(3)}  ${String(set.size).padStart(6)}` +
        `        ${pct(d.allPlayed, unownedRows.length).padStart(6)}` +
        `                ${pct(o.allPlayed, ownedRows.length).padStart(6)}`,
    );
  }

  // How often the cut is even a LIE about the reader's own deck: a deck whose
  // commander's top tag is not the archetype they built is miscounted either
  // way, and nothing here can tell. What it CAN report is how long the lists
  // are, since a cut at 3 of a 4-tag list changes almost nothing.
  const lens = [...perDeck.values()].flat().map((t) => t.length).sort((a, b) => a - b);
  const at = (q: number) => lens[Math.floor((lens.length - 1) * q)];
  console.log(
    `  eligible mechanic tags per deck commander: ` +
      `min ${at(0)} · median ${at(0.5)} · p90 ${at(0.9)} · max ${at(1)}`,
  );

  // NAMES in the state, so it can be looked at rather than only counted — the
  // contact sheet needs a commander to search for, and on an account where the
  // state is rare the first screen never holds one.
  console.log("\ncommanders in the allPlayed state (owned first):");
  for (const r of [...rows].sort((a, b) => Number(b.owned) - Number(a.owned))) {
    const slot = gapSlotFor(r.tags, r.deckCount, played);
    if (slot.kind !== "allPlayed") continue;
    console.log(`  ${r.owned ? "owned  " : "unowned"} ${r.name} — ${slot.labels.join(", ")}`);
    if (--namesLeft === 0) break;
  }

  const unplayedMechanics = new Set<string>();
  for (const r of rows) {
    for (const t of r.tags) {
      if (isMechanic(t.label) && !played.has(t.slug)) unplayedMechanics.add(t.label);
    }
  }
  console.log(`\nmechanics on file the reader plays in NO deck: ${unplayedMechanics.size}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // NOT in a `finally`: `process.exit` there swallows the throw and prints a
    // pass over a run that measured nothing. Three probes here have been bitten.
    console.error(e);
    process.exit(1);
  });
