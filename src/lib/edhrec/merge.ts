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

  // The primary's commander-level facts survive: a pair has no joint rank.
  return {
    ...present[0],
    topCards: [...new Set(present.flatMap((d) => d.topCards))],
    inclusionByName: best((d) => d.inclusionByName),
    synergyByName: best((d) => d.synergyByName),
  };
}
