// Which predicted job answers which gold job, when a card has two of the SAME KIND.
//
// Its own module so it can be tested without a database: importing it from
// `label-cards-score.mts` runs that file's top-level queries, so the tests could not
// reach the function at all. That is not a tidiness point -- three earlier versions of
// this algorithm were wrong, and none of them moved a published figure, so the
// aggregate scores could never have caught them. Only direct tests can.

export type PairJob = {
  space: string; kind: string; rampKind?: string | null;
  restrictedTo: string | null; trigger: string; recurrence: string;
  threshold: { stat: string; op: string; value: number } | null; modal: boolean;
};

const kindKey = (j: PairJob) => `${j.space}:${j.kind}`;

/**
 * Pairs gold jobs with predicted jobs of the SAME KIND, maximising total limit
 * agreement across the whole group rather than taking the best match for each gold
 * job in turn.
 *
 * Greedy is not merely untidy here, it is wrong: with two gold jobs of one kind, the
 * locally best prediction for the first can be the only one that fits the second, so
 * consuming it manufactures a limit disagreement out of two labels that both match.
 * The gold set exercises this ON PURPOSE -- Depala carries two restricted pumps and
 * Tyrant's Scorn two removals -- so the defect lands exactly where the set is
 * sharpest.
 *
 * RECTANGULAR, so it is correct when the two sides differ in size. The first version
 * recursed to `Math.min(golds.length, cands.length)` and indexed `golds[gi]`, which
 * silently assigned the first N gold jobs and left the rest unpaired -- a first-job
 * bias, not a matching. When a model returns ONE of a card's two pumps, which gold
 * job it belongs to is exactly the question, and Depala and Tyrant's Scorn are in the
 * set to ask it.
 *
 * Exhaustive over (gold subset x candidate permutation), affordable because the
 * groups are tiny: the largest same-kind group in the gold set is 3. Above
 * PERMUTATION_LIMIT it falls back to greedy and SAYS SO, because a silent fallback
 * would be the same defect wearing a comment.
 */
const PERMUTATION_LIMIT = 6;
export function bestPairing(
  gold: PairJob[], predicted: PairJob[], agreement: (a: PairJob, b: PairJob) => number,
): [PairJob, PairJob][] {
  const pairs: [PairJob, PairJob][] = [];
  const byKind = new Map<string, PairJob[]>();
  for (const g of gold) {
    const k = kindKey(g);
    byKind.set(k, [...(byKind.get(k) ?? []), g]);
  }
  for (const [kind, golds] of byKind) {
    const cands = predicted.filter((q) => kindKey(q) === kind);
    if (cands.length === 0) continue;

    if (golds.length > PERMUTATION_LIMIT || cands.length > PERMUTATION_LIMIT) {
      console.warn(`  (${kind}: ${golds.length}x${cands.length} exceeds the permutation limit — paired greedily)`);
      const pool = [...cands];
      for (const g of golds) {
        let best = -1, at = -1;
        for (const [i, q] of pool.entries()) {
          const sc = agreement(g, q);
          if (sc > best) { best = sc; at = i; }
        }
        if (at >= 0) pairs.push([g, pool.splice(at, 1)[0]]);
      }
      continue;
    }

    // Every way of choosing WHICH gold jobs get a candidate, and which candidate
    // each gets. `k` is how many pairs are possible at all.
    const k = Math.min(golds.length, cands.length);
    let bestTotal = -1;
    let bestPairs: [PairJob, PairJob][] = [];
    const goldSubsets: number[][] = [];
    const chooseGold = (start: number, picked: number[]) => {
      if (picked.length === k) { goldSubsets.push([...picked]); return; }
      for (let i = start; i < golds.length; i++) chooseGold(i + 1, [...picked, i]);
    };
    chooseGold(0, []);

    for (const gsub of goldSubsets) {
      const walk = (chosen: number[], left: number[]) => {
        if (chosen.length === k) {
          const total = chosen.reduce((a, ci, n) => a + agreement(golds[gsub[n]], cands[ci]), 0);
          if (total > bestTotal) {
            bestTotal = total;
            bestPairs = chosen.map((ci, n) => [golds[gsub[n]], cands[ci]] as [PairJob, PairJob]);
          }
          return;
        }
        for (const [n, ci] of left.entries()) walk([...chosen, ci], left.filter((_, m) => m !== n));
      };
      walk([], cands.map((_, i) => i));
    }
    pairs.push(...bestPairs);
  }
  return pairs;
}
