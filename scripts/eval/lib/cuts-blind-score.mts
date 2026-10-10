/** The pure half of `eval:cuts-blind-score`, so its arithmetic is tested without a key on disk. */
export type Rating = "cut" | "maybe" | "keep";
export type BlindAnswers = {
  round: string; sheetHash: string; keyHash?: string; submittedAt: string | null;
  ratings: Record<string, Rating>;
  reasonFlags: Record<string, { falseOrInvented: boolean; note: string }>;
};
export type BlindKey = {
  round: string; sheetHash: string; keyHash: string;
  cards: Record<string, { deck: string; oracleId: string; name: string; sources: string[]; hughCut: boolean; keyCard?: boolean }>;
};

export const SOURCES = ["model", "free", "random"] as const;

export type SourceScore = {
  source: string; picks: number; rated: number; cut: number; maybe: number; keep: number;
  precision: number | null; lenient: number | null; recall: number | null; lift: number | null;
};

/** Pure: the per-source table, from the key's cards and the ratings. Unrated cards are skipped. */
export function scoreSources(cards: BlindKey["cards"], ratings: BlindAnswers["ratings"]): SourceScore[] {
  const ids = Object.keys(cards);
  // A Key card is never cuttable by the model (the validator refuses it), so random is scored over
  // the same pool: a Key card it drew is left out of its picks.
  const scoredFor = (id: string) => cards[id].sources.filter((s) => !(s === "random" && cards[id].keyCard));
  // Recall's denominator is the scored pool: a card no source is credited with is not in it.
  const cutTotal = ids.filter((id) => ratings[id] === "cut" && scoredFor(id).length > 0).length;
  const rows = SOURCES.map((source) => {
    const mine = ids.filter((id) => scoredFor(id).includes(source));
    const rated = mine.filter((id) => ratings[id]);
    const n = (r: Rating) => rated.filter((id) => ratings[id] === r).length;
    const [cut, maybe, keep] = [n("cut"), n("maybe"), n("keep")];
    return {
      source, picks: mine.length, rated: rated.length, cut, maybe, keep,
      precision: rated.length ? cut / rated.length : null,
      lenient: rated.length ? (cut + maybe / 2) / rated.length : null,
      recall: cutTotal ? cut / cutTotal : null,
      lift: null as number | null,
    };
  });
  const base = rows.find((r) => r.source === "random")?.precision ?? null;
  for (const r of rows) r.lift = r.precision !== null && base ? r.precision / base : null;
  return rows;
}

