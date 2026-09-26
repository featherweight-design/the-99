// `Printed in` against a real catalog: the SQL predicate and the lanes' index are one rule.
//
// `printed-in.test.ts` proves the predicate's emitted SQL and the index's shaping over hand-built
// rows. What only a database answers is whether the two READERS agree on the real catalog: the
// predicate Help me choose runs in SQL, and the index the commander lanes test rows against. A
// set that the index says printed N commander candidates has to be the set the predicate finds N in.
//
// Every fixture is found by query rather than by name, so a rotated catalog does not rot it.
// READ-ONLY: it makes no writes. Any branch will do; staging is the one to measure against.
//   pnpm probe:printed-in
import "./lib/env.mjs";
import { and, sql } from "drizzle-orm";
import { isCommanderCandidate } from "../src/lib/recs/score";
import { db } from "../src/db";
import { cards } from "../src/db/schema";
import { filePrintedIn, isPrintedIn, lanePrintedIn, printedIn } from "../src/lib/sets/printed-in";
import { readCommanderPrintings } from "../src/lib/sets/printed-in-read";

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

// The commander candidates, by the ranking's own rule, so the predicate is counted over exactly
// the cards the index covers. Set by `run` before any count.
let candidateIds: string[] = [];
const candidates = () => sql`${cards.oracleId} = any(${sql.param(candidateIds)}::uuid[])`;

async function countPrintedIn(codes: string[]): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(and(candidates(), printedIn(cards.oracleId, codes)));
  return row.n;
}

async function run() {
  const index = await readCommanderPrintings();
  const ids = Object.keys(index.byOracle);
  check("the index is not empty", ids.length > 1000 && index.sets.length > 100,
    `${ids.length} commander candidates across ${index.sets.length} sets`);

  // Every card, through the ranking's own rule: the index is only right if it covers exactly this.
  const all = await db
    .select({ oracleId: cards.oracleId, typeLine: cards.typeLine, oracleText: cards.oracleText, manaCost: cards.manaCost, layout: cards.layout })
    .from(cards);
  candidateIds = all.filter((c) => isCommanderCandidate(c)).map((c) => c.oracleId);

  // 1. Every candidate with a printing is in the index, and nothing else is.
  const [{ n: withPrinting }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(and(candidates(), sql`exists (select 1 from printings p where p.oracle_id = ${cards.oracleId})`));
  check("the index holds every commander candidate that has a printing", withPrinting === ids.length,
    `index ${ids.length}, catalog ${withPrinting}`);

  // 1b. Including the ones a legendary type line would miss (planeswalkers and the like that say
  // they can be your commander). A type-line shortcut drops these and a Printed in filter then
  // hides them whatever their printings.
  const unlegendary = candidateIds.filter((id) => {
    const card = all.find((c) => c.oracleId === id)!;
    return !/legendary/i.test(card.typeLine) && index.byOracle[id] !== undefined;
  });
  check("candidates with no legendary type line are indexed too", unlegendary.length > 0,
    `${unlegendary.length} indexed`);

  // 2. The two readers agree, set by set, on the ten busiest sets and the ten newest.
  const perSet = new Map<string, number>();
  for (const list of Object.values(index.byOracle)) {
    for (const i of list) perSet.set(index.sets[i].code, (perSet.get(index.sets[i].code) ?? 0) + 1);
  }
  const busiest = [...perSet].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);
  const newest = index.sets.slice(0, 10).map((s) => s.code);
  const sample = [...new Set([...busiest, ...newest])];
  const disagree: string[] = [];
  for (const code of sample) {
    const bySql = await countPrintedIn([code]);
    if (bySql !== perSet.get(code)) disagree.push(`${code}: sql ${bySql}, index ${perSet.get(code)}`);
  }
  check("the predicate and the index count the same cards per set", disagree.length === 0,
    disagree.length === 0 ? `${sample.length} sets agree` : disagree.join("; "));

  // 3. ANY printing: a card printed in two sets matches either, and the pair.
  const twoSet = ids.find((id) => index.byOracle[id].length >= 2)!;
  const [a, b] = index.byOracle[twoSet].map((i) => index.sets[i].code);
  const [one] = await db
    .select({ name: cards.name })
    .from(cards)
    .where(and(sql`${cards.oracleId} = ${twoSet}`, printedIn(cards.oracleId, [a]), printedIn(cards.oracleId, [b])));
  check("a card printed in two sets matches each of them", one !== undefined, `${one?.name ?? twoSet} in ${a} and ${b}`);
  const filed = filePrintedIn(new Map(), ids, lanePrintedIn(ids, index));
  check("the lane test agrees", isPrintedIn(filed, twoSet, [a]) && isPrintedIn(filed, twoSet, [b]),
    `${a}: ${isPrintedIn(filed, twoSet, [a])}, ${b}: ${isPrintedIn(filed, twoSet, [b])}`);

  // 4. Two sets is the union, not the intersection.
  const union = await countPrintedIn([busiest[0], busiest[1]]);
  const [{ n: both }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(and(candidates(), printedIn(cards.oracleId, [busiest[0]]), printedIn(cards.oracleId, [busiest[1]])));
  const expected = perSet.get(busiest[0])! + perSet.get(busiest[1])! - both;
  check("two sets match a card printed in either", union === expected,
    `${busiest[0]} + ${busiest[1]}: ${union}, expected ${expected}`);

  // 5. Case, and a code nobody printed.
  check("an upper-case code matches like a lower-case one",
    (await countPrintedIn([busiest[0].toUpperCase()])) === perSet.get(busiest[0]),
    busiest[0].toUpperCase());
  check("an unknown code matches nothing", (await countPrintedIn(["zz9"])) === 0, "zz9");
}

async function main() {
  try {
    await run();
  } catch (error) {
    // Counted, not rethrown past the summary: a throw would otherwise print nothing about the
    // checks that did run.
    console.error(error);
    failures += 1;
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
