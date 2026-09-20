import type { EdhrecData } from "./parse";

/** A pair's card advice is the union of both commanders' lists, scored by the
 *  better of the two. Kept out of `client.ts` because it touches no network. */
export function mergeEdhrecData(datas: (EdhrecData | null)[]): EdhrecData | null {
  const present = datas.filter((d): d is EdhrecData => d !== null);
  if (present.length === 0) return null;
  if (present.length === 1) return present[0];

  const best = (pick: (d: EdhrecData) => Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const d of present) {
      for (const [name, value] of Object.entries(pick(d))) {
        const seen = out[name];
        out[name] = seen === undefined ? value : Math.max(seen, value);
      }
    }
    return out;
  };

  // The primary's commander-level facts survive here, and the reason once given for that —
  // "a pair has no joint rank" — is FALSE. Measured 2026-09-20 on the live Kratos/Atreus pair
  // page: `num_decks: 13332`, `rank: 159`, plus its own `bracket_counts`. A pair has both, and
  // that deck count is the correct denominator for a pair's bracket population where this
  // merge would hand back one commander's.
  //
  // This function is now the FALLBACK, not the answer: `commander_pair_support` carries the
  // real pair data and `suggestions-read` prefers it. The merge stays for a pair EDHREC has no
  // page for, where the union of two single lists really is the best available reading —
  // deleting it would silently regress those decks.
  return {
    ...present[0],
    topCards: [...new Set(present.flatMap((d) => d.topCards))],
    inclusionByName: best((d) => d.inclusionByName),
    synergyByName: best((d) => d.synergyByName),
  };
}
