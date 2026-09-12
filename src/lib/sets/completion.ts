// The completion model: what a set's base run is, which of its cells you own, and how the
// two sections count. Pure — no database imports — which is what lets the whole model be
// unit tested. The queries in read.ts fetch rows and compute nothing.

/** The minimum a printing must carry for the base-run count. */
export type BoosterFlagged = {
  collectorNumber: string;
  booster: boolean | null;
  isVariant: boolean;
};

/**
 * Reference implementation of the base-set-size count. The ingest applies this in SQL (see
 * setBaseSetSizes in seed-printings.ts) because it runs over every printing in the catalog;
 * the two must stay in step, and this is the tested one.
 *
 * Null in, null out: a set nothing has classified yet has no denominator, and zero would
 * read as "a set with no cards" on a page whose whole job is a ratio.
 *
 * The fallback is not a nicety. Cards in a Commander product are not booster-eligible —
 * every printing in c21 and otc carries `booster: false` — so the literal rule would give
 * every Commander set a denominator of zero and file the whole product under extras, on a
 * page whose search deliberately reaches set_type = commander. `is_variant` is a poor
 * boundary for a booster set and a serviceable one for a product that never had a booster
 * to be in.
 */
export function baseSetSizeOf(rows: BoosterFlagged[]): number | null {
  if (rows.every((r) => r.booster === null)) return null;
  const inBooster = rows.filter((r) => r.booster === true).length;
  if (inBooster > 0) return inBooster;
  // Null rather than 0, and the SQL mirror does the same: a set whose classified rows are
  // all variants has no base run anyone has named, and a zero denominator reads as an
  // indexed set that is complete and empty at once.
  const nonVariant = rows.filter((r) => r.booster !== null && !r.isVariant).length;
  return nonVariant === 0 ? null : nonVariant;
}

/** One printing of a set, as the grid needs it. */
export type SetPrinting = {
  scryfallId: string;
  oracleId: string;
  collectorNumber: string;
  name: string;
  imageUriSmall: string | null;
  /**
   * The full-size art for THIS printing, which the grid hands to the card modal when a cell
   * is opened. The modal cannot always resolve it itself: for an owned card its printing
   * list is the ones the reader owns, and a holding matched by name carries no collector
   * number, so the printing the cell is standing for is not in that list.
   *
   * Optional because only the GRID query selects it. The index places and counts the same
   * cells without drawing any, and ~34 sets' worth of full-size URLs is payload nobody
   * would render.
   */
  imageUri?: string | null;
  colorIdentity: string[];
  rarity: string | null;
  booster: boolean | null;
  isVariant: boolean;
};

/** One holding, reduced to what placement needs. */
export type Holding = {
  oracleId: string;
  collectorNumber: string;
  finish: "nonfoil" | "foil" | "etched";
};

/** A reader's chosen printing for one card, from `card_art_preferences`. */
export type ArtPick = { oracleId: string; collectorNumber: string };

export type Cell = SetPrinting & {
  owned: boolean;
  /** Filled by a holding that named no collector number, so the printing is inferred. */
  byName: boolean;
  /** Every holding filling this cell is foil. */
  foilOnly: boolean;
};

/** Every digit in a collector number, non-digits stripped, or null when it has none ("★"). */
function numericPart(collectorNumber: string): number | null {
  const digits = collectorNumber.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

/** Collector-number order: numerically, with the numberless last. */
function byCollectorNumber(a: SetPrinting, b: SetPrinting): number {
  const na = numericPart(a.collectorNumber);
  const nb = numericPart(b.collectorNumber);
  if (na === null && nb === null) return a.collectorNumber.localeCompare(b.collectorNumber);
  if (na === null) return 1;
  if (nb === null) return -1;
  if (na !== nb) return na - nb;
  return a.collectorNumber.localeCompare(b.collectorNumber);
}

/**
 * Places a reader's holdings onto a set's cells.
 *
 * Two passes, and the order matters. Holdings that name a collector number claim their own
 * cell first; holdings that do not then take the lowest-numbered cell still unfilled for
 * their oracle id. Running the passes the other way round would let an inferred fill take
 * a cell its pinned owner was entitled to.
 *
 * Unpinned holdings collapse by oracle id before they are placed. `finish` is part of
 * collection_items' primary key, so one unpinned card arrives as a foil row and a nonfoil
 * row; letting each claim a cell would fill EOE's Plains at both #262 and #268 off a
 * holding that says nothing about which printing is owned. Collapsing under-claims when
 * someone genuinely owns both, and over-claiming is the worse error on a page whose whole
 * job is to say what you have.
 *
 * A pasted holding never reaches here: parsePasteList writes an empty set code as well as
 * an empty collector number, so it belongs to no set.
 */
export function placeCells(
  printings: SetPrinting[],
  holdings: Holding[],
  picks: ArtPick[] = [],
): Cell[] {
  const cells: Cell[] = [...printings]
    .sort(byCollectorNumber)
    .map((p) => ({ ...p, owned: false, byName: false, foilOnly: false }));

  const finishesByCell = new Map<number, Set<string>>();
  const claim = (i: number, finish: string, byName: boolean) => {
    cells[i].owned = true;
    if (byName) cells[i].byName = true;
    const held = finishesByCell.get(i) ?? new Set<string>();
    held.add(finish);
    finishesByCell.set(i, held);
  };

  // Indexed once rather than scanned per holding: placement runs for every held set when
  // the index is built, so a linear findIndex per holding made it printings x holdings.
  const byNumber = new Map<string, number>();
  const firstFree = new Map<string, number[]>();
  cells.forEach((c, i) => {
    byNumber.set(`${c.oracleId}:${c.collectorNumber}`, i);
    const queue = firstFree.get(c.oracleId);
    if (queue) queue.push(i); else firstFree.set(c.oracleId, [i]);
  });

  for (const h of holdings) {
    if (h.collectorNumber === "") continue;
    const i = byNumber.get(`${h.oracleId}:${h.collectorNumber}`);
    if (i !== undefined) claim(i, h.finish, false);
  }

  // A pick is the reader saying WHICH printing they hold, so it decides the cell an
  // otherwise number-less holding lands on. Without it, picking #268 in the modal left the
  // fill on #262 and the swap this page exists to make legible never happened.
  // A preference survives a collection replacement, so it can name a printing the reader
  // no longer owns — browse.ts falls back for exactly this reason. Applying one anyway
  // would mark the wrong cell owned. It is honoured only when the reader still holds that
  // exact printing, or holds the card with no number at all (the case it exists to
  // resolve).
  const heldExactly = new Set(
    holdings.filter((h) => h.collectorNumber !== "")
      .map((h) => `${h.oracleId}:${h.collectorNumber}`),
  );
  const heldByName = new Set(
    holdings.filter((h) => h.collectorNumber === "").map((h) => h.oracleId),
  );
  const pickedCell = new Map<string, number>();
  for (const pick of picks) {
    const key = `${pick.oracleId}:${pick.collectorNumber}`;
    if (!heldExactly.has(key) && !heldByName.has(pick.oracleId)) continue;
    const i = byNumber.get(key);
    if (i !== undefined && !cells[i].owned) pickedCell.set(pick.oracleId, i);
  }

  // Collapsed to ONE CELL per oracle, but every finish held is carried onto that cell.
  // Keeping only the last row would lose the rest: a card held in foil and nonfoil whose
  // foil row sorted last would mark the cell foil-only, which is a claim about what you
  // own rather than about which printing it is.
  const unpinnedFinishes = new Map<string, Set<string>>();
  for (const h of holdings) {
    if (h.collectorNumber !== "") continue;
    const held = unpinnedFinishes.get(h.oracleId) ?? new Set<string>();
    held.add(h.finish);
    unpinnedFinishes.set(h.oracleId, held);
  }
  for (const [oracleId, held] of unpinnedFinishes) {
    // The picked cell when there is one, and the lowest unfilled otherwise.
    const picked = pickedCell.get(oracleId);
    const i = picked ?? (firstFree.get(oracleId) ?? []).find((idx) => !cells[idx].owned);
    if (i === undefined) continue;
    // A cell the reader chose is not an inference, so it carries no by-name mark.
    for (const finish of held) claim(i, finish, picked === undefined);
  }

  for (const [i, held] of finishesByCell) {
    cells[i].foilOnly = held.has("foil") && !held.has("nonfoil") && !held.has("etched");
  }
  return cells;
}

export type SetSections = {
  base: Cell[];
  extras: Cell[];
  baseOwned: number;
  baseTotal: number;
  extrasOwned: number;
  extrasTotal: number;
  /** 0-100, rounded. A DISPLAY value: 275/276 rounds to 100, so never gate on it. */
  percent: number | null;
  /** Every base cell owned. The state gate, computed from the counts themselves. */
  complete: boolean;
  indexed: boolean;
};

/**
 * Splits placed cells into the base run and the extras, and counts each apart.
 *
 * The split mirrors baseSetSizeOf, fallback included: a set with no booster printing at all
 * — every Commander product — splits on `isVariant` instead, so its base run is the deck
 * and its extras are the alternate treatments.
 *
 * `baseSetSize` is the AUTHORITATIVE denominator from `sets`, and passing it is what makes
 * a partial refresh legible. The ingest clears that column before writing any batch, so a
 * run that dies halfway leaves rows classified and the column null; inferring "indexed"
 * from the rows alone would render a partial base run and a percentage from it. A caller
 * with no denominator to hand (the delta poll, which only needs a count) may omit it.
 */
export function sectionsOf(cells: Cell[], baseSetSize?: number | null): SetSections {
  const classified = cells.filter((c) => c.booster !== null);
  // The denominator is not just a flag — it has to AGREE with the rows. Metadata and
  // printings are read in separate statements, so a catalog rebuild can hand back the old
  // base_set_size beside a partially rewritten set of booster flags; a ratio computed from
  // that pairs a numerator and a denominator describing different runs. The disagreement
  // is itself the signal that the set is mid-index.
  const rowsMatchDenominator = (booster: (c: Cell) => boolean) =>
    baseSetSize === null || baseSetSize === undefined
      ? true
      : classified.filter(booster).length === baseSetSize;
  const hasBooster = cells.some((c) => c.booster === true);

  const inBase = (c: Cell) =>
    c.booster !== null && (hasBooster ? c.booster === true : !c.isVariant);

  // `> 0`, not merely non-null: the writer stores null for a set with no base run, but the
  // column carries no constraint and a legacy or hand-written zero would otherwise satisfy
  // `rowsMatchDenominator` against an empty base and render an indexed 0 / 0.
  const indexed = baseSetSize === undefined
    ? classified.length > 0
    : baseSetSize !== null && baseSetSize > 0
      && classified.length > 0 && rowsMatchDenominator(inBase);

  const base = indexed ? classified.filter(inBase) : [];
  const extras = indexed ? classified.filter((c) => !inBase(c)) : [];

  const baseOwned = base.filter((c) => c.owned).length;
  return {
    base,
    extras,
    baseOwned,
    baseTotal: base.length,
    extrasOwned: extras.filter((c) => c.owned).length,
    extrasTotal: extras.length,
    percent: indexed && base.length > 0 ? Math.round((baseOwned / base.length) * 100) : null,
    complete: indexed && base.length > 0 && baseOwned === base.length,
    indexed,
  };
}

/**
 * The identity of what a reader owns in one set, independent of the catalog.
 *
 * The delta strip compares this against the value the page was rendered with, so it must
 * change when — and only when — the COLLECTION changes. Deriving it from placed cells made
 * it move with the catalog too, and a weekly refresh that rekeys a printing would have
 * been announced as an upload the reader never made.
 */
export function fingerprintOf(holdings: Holding[], picks: ArtPick[] = []): string {
  const held = holdings
    .map((h) => `${h.oracleId}:${h.collectorNumber}:${h.finish}`)
    .sort();
  // Only the preferences that can MOVE something. A preference on a card held with an
  // exact collector number changes no cell, and carrying it here made the focus check
  // report a swap against a grid that had not moved.
  const unpinned = new Set(
    holdings.filter((h) => h.collectorNumber === "").map((h) => h.oracleId),
  );
  const picked = picks
    .filter((p) => unpinned.has(p.oracleId))
    .map((p) => `${p.oracleId}>${p.collectorNumber}`)
    .sort();
  // Two halves, separated: the strip counts HOLDINGS to say how many cards moved, and
  // reads the whole string only to notice that something did. Counting entries across both
  // made setting a pick say a card had been added.
  return `${held.join(",")}|${picked.join(",")}`;
}

/**
 * How many CARDS a fingerprint carries, at the granularity the grid draws.
 *
 * Picks are not cards, and neither is a finish: the grid collapses nonfoil, foil and
 * etched into one owned cell, so counting rows made adding a foil copy of a card already
 * held in nonfoil report that a card had been added. The finish still belongs in the
 * fingerprint — it changes the cell's mark — it just is not a card.
 */
export function holdingCountOf(fingerprint: string): number {
  const held = fingerprint.split("|")[0] ?? "";
  if (held === "") return 0;
  const cells = new Set(
    held.split(",").map((entry) => entry.split(":").slice(0, 2).join(":")),
  );
  return cells.size;
}
