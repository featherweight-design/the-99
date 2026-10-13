/**
 * `Printed in`: a card matches a set when ANY of its printings is from that set (filter-chassis
 * decision 9, brief §6 option 1). Not the printing the reader owns, and not the one a row draws:
 * a commander printed in Duskmourn is printed in Duskmourn whichever art is on screen, which is
 * why the control is named `Printed in` and never `Set`.
 *
 * One rule, two readers. `printedIn` (printed-in-sql.ts, kept apart so client components can
 * import this module without drizzle) is the SQL form, for a query that already has an oracle id
 * in hand (Help me choose's Sets answer). The commander lanes filter a list they already hold, so
 * each page crosses `loadCommanderPrintings` with the rows it ships (`lanePrintedIn`) and the
 * client tests rows with `isPrintedIn`: an empty selection keeps every row, and a row with no
 * known printing matches no set. Both come from `printings` and both lower-case the codes, which is how `printings.set_code` is stored.
 */

/** Lower-cased, trimmed, deduped and sorted: the one form a selection is compared in. */
export function normalizeSetCodes(codes: readonly string[]): string[] {
  return [...new Set(codes.map((c) => c.trim().toLowerCase()).filter((c) => c !== ""))].sort();
}

export type PrintedInSet = { code: string; name: string };

/**
 * Every set that printed a legendary card, newest first, and for each such card the sets it was
 * printed in (as indices into `sets`). Global rather than per reader: each lane crosses it with its
 * own rows through `lanePrintedIn`, which keeps only the sets those rows were printed in.
 */
export type CommanderPrintings = {
  sets: PrintedInSet[];
  byOracle: Record<string, number[]>;
};

/** The shaping half of `readCommanderPrintings` (`printed-in-read.ts`), pure so its order and indexing are testable. */
export function buildCommanderPrintings(
  rows: readonly { oracle_id: string; set_code: string; name: string | null; released_at: string | null }[],
): CommanderPrintings {
  const meta = new Map<string, { name: string; releasedAt: string | null }>();
  for (const r of rows) {
    const code = r.set_code.toLowerCase();
    if (!meta.has(code)) meta.set(code, { name: r.name ?? code.toUpperCase(), releasedAt: r.released_at });
  }
  // Newest first, undated last, then by code so the order is total.
  const codes = [...meta.keys()].sort((a, b) => {
    const ra = meta.get(a)!.releasedAt;
    const rb = meta.get(b)!.releasedAt;
    if (ra !== rb) {
      if (ra === null) return 1;
      if (rb === null) return -1;
      return ra < rb ? 1 : -1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const at = new Map(codes.map((c, i) => [c, i]));
  const byOracle: Record<string, number[]> = {};
  for (const r of rows) {
    const i = at.get(r.set_code.toLowerCase())!;
    const list = (byOracle[r.oracle_id] ??= []);
    if (!list.includes(i)) list.push(i);
  }
  for (const list of Object.values(byOracle)) list.sort((a, b) => a - b);
  return { sets: codes.map((code) => ({ code, name: meta.get(code)!.name })), byOracle };
}

/**
 * What a lane ships: the sets its rows were printed in, and for each row (in the order the rows
 * ship) the indices of its sets. Aligned by construction, because the page builds it from the very
 * list it sends; keyed by position rather than by oracle id because 3,000 uuids would cost more
 * than the whole index. Sets no row was printed in are left out, so the panel lists only sets a
 * reader could get a row back from.
 */
export type LanePrintedIn = { sets: PrintedInSet[]; rows: number[][] };

export function lanePrintedIn(oracleIds: readonly string[], index: CommanderPrintings): LanePrintedIn {
  const perRow = oracleIds.map((id) => index.byOracle[id] ?? []);
  // Global indices are already newest first, so sorting them keeps the panel's order.
  const used = [...new Set(perRow.flat())].sort((a, b) => a - b);
  const local = new Map(used.map((g, i) => [g, i]));
  return {
    sets: used.map((g) => index.sets[g]),
    rows: perRow.map((r) => r.map((g) => local.get(g)!)),
  };
}

/**
 * The client's view of one or more shipped `LanePrintedIn`s: each oracle id's set codes. Filed
 * rather than replaced, because a card's printings do not depend on which ranking shipped it, so
 * a row seen under one ranking keeps its sets when the reader flips to another.
 */
export function filePrintedIn(
  into: Map<string, string[]>,
  oracleIds: readonly string[],
  shipped: LanePrintedIn,
): Map<string, string[]> {
  oracleIds.forEach((id, i) => {
    const r = shipped.rows[i];
    if (r) into.set(id, r.map((s) => shipped.sets[s].code));
  });
  return into;
}

/** `rowPrintedIn` over a filed map: the test the lanes run per row. */
export function isPrintedIn(
  codesByOracle: ReadonlyMap<string, readonly string[]>,
  oracleId: string,
  selected: readonly string[],
): boolean {
  if (selected.length === 0) return true;
  const mine = codesByOracle.get(oracleId);
  return mine !== undefined && mine.some((c) => selected.includes(c));
}
