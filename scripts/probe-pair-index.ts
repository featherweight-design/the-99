// The Commander index sweeps every legal partner pair, against a real Postgres.
//
// `pair-enumerate.test.ts` proves the pairing rules over hand-built cards, and
// `seed-index.test.ts` proves the pass over an injected pair list. What neither can reach is
// the join between them: whether the DEFAULT loader's SQL prefilter hands `legalPairs` every
// partner card the catalog holds, whether that clears the 1,500 floor on the real catalog, and
// whether the real pass over ~2,160 real pairs skips, counts and refuses the way the unit cases
// say. This drives the real `loadPairs` and the real `buildCommanderIndex`.
//
// IT SENDS NO EDHREC TRAFFIC AND MAKES NO WRITES. The pair fetch, the pair write, the role pass
// and the score clear are all injected; the only reads are the catalog and `decks`. The
// commander walk is given no commanders.
//
// Run by hand against local-dev or a scratch branch:
//   pnpm probe:pair-index
import "./lib/env.mjs";
import { inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import { cards } from "../src/db/schema";
import { partnerAbility } from "../src/lib/decks/partner";
import { buildCommanderIndex, loadPairs, pairRunProblem } from "../src/lib/edhrec/seed-index";
import { LEGAL_PAIR_FLOOR, pairKey } from "../src/lib/edhrec/pair-enumerate";

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

// A page EDHREC would serve, with enough decks to clear Change commander's floor. The names
// resolve to nothing, which the pass counts and moves past.
const served = {
  data: {
    topCards: ["Sol Ring"], inclusionByName: { "sol ring": 70 }, synergyByName: {},
    tags: [], bracketCounts: {}, budgetCounts: {}, similarNames: [],
    deckCount: 50, rank: 1, saltScore: null, composition: null, manaCurve: null,
  },
  unreachable: false,
  rawPayload: null,
};
const degraded = { data: null, unreachable: true, rawPayload: null };

async function run(): Promise<void> {
  // 1 · the real enumeration, on the real catalog.
  const loaded = await loadPairs();
  check(
    `the catalog forms at least ${LEGAL_PAIR_FLOOR} legal pairs, and the sweep is not refused`,
    loaded.legal >= LEGAL_PAIR_FLOOR && loaded.refusal === null,
    `${loaded.legal} legal, ${loaded.pairs.length} to index, refusal ${loaded.refusal ?? "none"}`,
  );

  // Every kind the rules form is present — read off the cards' own text, not named here, so a
  // catalog that rotates a card out does not rot the check.
  const ids = [...new Set(loaded.pairs.flatMap((p) => [p.a, p.b]))];
  const text = new Map(
    (await db.select({ id: cards.oracleId, t: cards.oracleText, typeLine: cards.typeLine }).from(cards).where(inArray(cards.oracleId, ids)))
      .map((r) => [r.id, r]),
  );
  const kindOf = (id: string) => partnerAbility(text.get(id)?.t ?? null, text.get(id)?.typeLine ?? null)?.kind ?? "built-only";
  const kinds = new Set<string>(loaded.pairs.flatMap((p) => [kindOf(p.a), kindOf(p.b)]));
  check(
    "the sweep holds a generic, a named and a restricted pair",
    ["generic", "with", "restricted"].every((k) => kinds.has(k)),
    [...kinds].sort().join(", "),
  );
  // A Doctor and a companion reach `legalPairs` only through the loader's SQL prefilter, which
  // reads the companion's text and the Doctor's TYPE LINE; dropping either predicate leaves no such
  // pair in the sweep, and nothing else here would notice.
  const doctorPairs = loaded.pairs.filter((p) => new Set([kindOf(p.a), kindOf(p.b)]).size === 2
    && [kindOf(p.a), kindOf(p.b)].every((k) => k === "doctor" || k === "doctorsCompanion"));
  check("the sweep pairs Time Lord Doctors with Doctor's companions", doctorPairs.length > 0, `${doctorPairs.length} pairs`);

  // 2 · a short enumeration is refused, and still returns the built pairs. "Built" is read
  // here by a query of its own rather than trusted from the loader, so a refusal that dropped
  // them is caught.
  const refused = await loadPairs(Number.MAX_SAFE_INTEGER);
  const built = new Set(
    (await db.execute<{ a: string; b: string }>(sql`
      select distinct least(commander_oracle_id, partner_oracle_id)::text as a,
                      greatest(commander_oracle_id, partner_oracle_id)::text as b
      from decks where partner_oracle_id is not null
    `)).rows.map(pairKey),
  );
  const kept = new Set(refused.pairs.map(pairKey));
  check(
    "a short enumeration refuses the legal sweep",
    refused.refusal !== null,
    `refusal: ${refused.refusal ?? "none"}`,
  );
  if (built.size === 0) {
    // Not counted either way: with no deck holding a pair, "kept exactly the built pairs" is
    // true of an empty list whether or not a refusal keeps them. `choosePairs` in
    // `pair-enumerate.test.ts` pins that half.
    console.log("  n/a  the refusal keeps the built pairs — this database holds none, so nothing is measured.");
  } else {
    check(
      "the refusal keeps exactly the built pairs",
      kept.size === built.size && [...built].every((k) => kept.has(k)),
      `${kept.size} kept, ${built.size} built`,
    );
  }

  // 3 · the real pass over every pair, with one resumed.
  const resumedKey = pairKey(loaded.pairs[0]);
  let fetched = 0;
  const base = {
    // The REAL loader, named: it is the thing under test. The fetch and the write below are
    // what keep this run off EDHREC and out of the database.
    loadPairs: () => loadPairs(),
    loadCommanders: async () => [],
    clearScores: async () => {},
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0, labelFingerprint: null, labelCoverage: 0 }),
    writePair: async () => {},
    delayMs: 0,
  };
  const r = await buildCommanderIndex({
    ...base,
    loadAlreadyComputedPairs: async () => new Set([resumedKey]),
    fetchPair: async () => { fetched++; return served; },
  });
  check(
    "the pass fetches every pair but the resumed one, and passes its floors",
    r.pairsSkipped === 1 && fetched === loaded.pairs.length - 1 &&
      r.pairs === fetched && pairRunProblem(r) === null,
    `${r.pairs} stored, ${r.pairsSkipped} skipped, ${fetched} fetched; problem ${pairRunProblem(r) ?? "none"}`,
  );

  // 4 · the 5% floor, over the real pair count: 6% degraded fails the job, 4% does not.
  for (const [pct, shouldFail] of [[6, true], [4, false]] as const) {
    const limit = Math.floor((loaded.pairs.length * pct) / 100);
    let n = 0;
    const out = await buildCommanderIndex({
      ...base,
      fetchPair: async () => (n++ < limit ? degraded : served),
    });
    const problem = pairRunProblem(out);
    check(
      `${pct}% of pairs degraded ${shouldFail ? "fails" : "does not fail"} the job`,
      (problem !== null) === shouldFail,
      `${out.pairsDegraded} degraded of ${out.pairs + out.pairsDegraded}; problem ${problem ?? "none"}`,
    );
  }
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

main();
