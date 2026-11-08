// The fictional decks' lists. PURE, like the collection: built only from what the player owns, so every copy a deck
// takes comes out of one shared free pool and no two decks claim the same card. A deck's commander is not a list row.
import type { CatalogCard, CatalogCommander, CatalogSnapshot } from "./collection";
import { DECK_NAMES } from "./names";
import type { DeckRole } from "./rng";

export type DeckPlan = { role: DeckRole; name: string; commander: CatalogCommander; rows: Map<string, number> };
export type Swap = { out: string; outQty: number; in: string };
export type DecksPlan = {
  decks: DeckPlan[];
  /** Played's pending change after v1 (a basic for a free card) and the versioned deck's two between its three versions. */
  playedSwap: Swap;
  versionedSwaps: [Swap, Swap];
  lockedCard: string;
  markedCard: string | null;
  /** An owned, free, non-basic card that fits (and is indexed for) two or more decks and is in none of them. */
  sharedCard: { oracleId: string; fits: DeckRole[] };
};

/**
 * The list sizes the About frames count on: cards in `deck_cards`, commander apart. The profile's total
 * (`deckTotal`, `src/lib/tuning/v2/run.ts`) adds the commander when it is not also a row, so `played` (99 rows) is
 * exactly 100, `under` 88 (Top off), `over` 106 (Look deeper), `fresh` and `versioned` 100.
 */
export const DECK_SIZES: Record<DeckRole, { spells: number; size: number }> = {
  under: { spells: 52, size: 87 },
  over: { spells: 68, size: 105 },
  played: { spells: 60, size: 97 },
  fresh: { spells: 60, size: 99 },
  versioned: { spells: 60, size: 99 },
};

const BASIC_COLORS = ["W", "U", "B", "R", "G"] as const;
const isLand = (c: CatalogCard) => c.typeLine.includes("Land");
const within = (colors: string[], identity: string[]) => colors.every((x) => identity.includes(x));

export function planDecks(
  catalog: CatalogSnapshot,
  owned: ReadonlyMap<string, number>,
  ownedCommanders: readonly CatalogCommander[],
  /** commander oracle id -> (card oracle id -> inclusion), for the commanders that might be picked. */
  support: ReadonlyMap<string, ReadonlyMap<string, number>>,
  /** The two unowned cards Played lists anyway: the over-limit buy and the card a friend has spare. */
  buys: { dear: string; spare: string; missing: readonly string[] },
): DecksPlan {
  const free = new Map(owned);
  const take = (id: string): boolean => {
    const n = free.get(id) ?? 0;
    if (n <= 0) return false;
    free.set(id, n - 1);
    return true;
  };
  const basicIds = new Set(Object.values(catalog.basics));
  const byId = new Map(catalog.cards.map((c) => [c.oracleId, c]));
  const ranked = [...ownedCommanders].sort((a, b) => b.support - a.support || a.oracleId.localeCompare(b.oracleId));
  const claimed = new Set<string>();

  function buildList(commander: CatalogCommander, spells: number, size: number): Map<string, number> {
    const sup = support.get(commander.oracleId);
    const candidates = catalog.cards
      .filter((c) => (free.get(c.oracleId) ?? 0) > 0 && c.oracleId !== commander.oracleId && within(c.colors, commander.colors))
      .sort(
        (a, b) =>
          (sup?.get(b.oracleId) ?? -1) - (sup?.get(a.oracleId) ?? -1) ||
          b.pop - a.pop ||
          a.oracleId.localeCompare(b.oracleId),
      );
    const rows = new Map<string, number>();
    let nSpells = 0;
    let nLands = 0;
    for (const c of candidates) {
      const land = isLand(c);
      if (land ? nLands >= 8 : nSpells >= spells) continue;
      if (!take(c.oracleId)) continue;
      rows.set(c.oracleId, 1);
      if (land) nLands += 1;
      else nSpells += 1;
    }
    if (nSpells < spells) throw new Error(`${commander.name}: only ${nSpells} free spells in its colors`);
    const colors = commander.colors.filter((x) => (BASIC_COLORS as readonly string[]).includes(x));
    if (colors.length === 0) throw new Error(`${commander.name}: no color to draw basics in`);
    for (let i = 0, n = rows.size; n < size; i += 1, n += 1) {
      const basic = catalog.basics[colors[i % colors.length] as keyof CatalogSnapshot["basics"]];
      rows.set(basic, (rows.get(basic) ?? 0) + 1);
    }
    return rows;
  }

  /** The first commander (in rank order, passing `accept`) whose list can be built; a failed try returns its copies. */
  function build(role: DeckRole, accept: (c: CatalogCommander) => boolean): DeckPlan {
    const { spells, size } = DECK_SIZES[role];
    for (const c of ranked) {
      if (claimed.has(c.oracleId) || !accept(c) || (free.get(c.oracleId) ?? 0) <= 0) continue;
      const before = new Map(free);
      try {
        take(c.oracleId);
        const rows = buildList(c, spells, size);
        claimed.add(c.oracleId);
        return { role, name: DECK_NAMES[role], commander: c, rows };
      } catch {
        for (const [k, v] of before) free.set(k, v);
      }
    }
    throw new Error(`no owned commander can fill the ${role} deck`);
  }

  // Different color sets, not disjoint ones: the free pool already keeps every copy in one deck.
  const distinctColors = (chosen: DeckPlan[]) => (c: CatalogCommander) =>
    !chosen.some((p) => [...p.commander.colors].sort().join("") === [...c.colors].sort().join(""));
  const chosen: DeckPlan[] = [];
  for (const role of ["under", "over", "played"] as const) chosen.push(build(role, distinctColors(chosen)));
  const [under, over, played] = chosen;
  const fresh = build("fresh", () => true);
  const versioned = build("versioned", () => true);

  // The cards every deck is missing (unowned staples), so the cart has lines: each goes in some decks by a fixed
  // pattern, so a few lines are needed by several decks. A basic gives up its slot, so every list keeps its size.
  const others = [under, over, fresh];
  const basicOf = (p: DeckPlan) => [...p.rows].filter(([id]) => basicIds.has(id)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const place = (deck: DeckPlan, id: string) => {
    const basic = basicOf(deck);
    if (!basic || deck.rows.has(id)) return;
    deck.rows.set(id, 1);
    if (basic[1] > 1) deck.rows.set(basic[0], basic[1] - 1);
    else deck.rows.delete(basic[0]);
  };
  buys.missing.forEach((id, i) => {
    if (i % 2 === 0) place(played, id);
    if (i % 3 === 0) place(others[0], id);
    if (i % 3 === 1) place(others[1], id);
    if (i % 4 === 0) place(others[2], id);
  });
  // Played lists the two buys and carries a bracket mark (a Game Changer or tutor the player owns).
  played.rows.set(buys.dear, 1);
  played.rows.set(buys.spare, 1);
  const basicsOf = (p: DeckPlan) => [...p.rows].filter(([id]) => basicIds.has(id)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const marked = (c: CatalogCard | undefined) => !!c && !isLand(c) && (c.gameChanger || c.tutor);
  // Owned cards only: the unowned buys and missing staples are listed to be bought, never marked or locked.
  const unowned = new Set([buys.dear, buys.spare, ...buys.missing]);
  const isOwned = (id: string) => (owned.get(id) ?? 0) > 0 && !unowned.has(id);
  let markedCard = [...played.rows.keys()].find((id) => isOwned(id) && marked(byId.get(id))) ?? null;
  if (!markedCard) {
    const pick = catalog.cards.find(
      (c) => marked(c) && (free.get(c.oracleId) ?? 0) > 0 && within(c.colors, played.commander.colors) && !played.rows.has(c.oracleId),
    );
    const [basic] = basicsOf(played);
    if (pick && basic && take(pick.oracleId)) {
      played.rows.set(pick.oracleId, 1);
      if (basic[1] > 1) played.rows.set(basic[0], basic[1] - 1);
      else played.rows.delete(basic[0]);
      markedCard = pick.oracleId;
    }
  }
  const lockedCard = [...played.rows.keys()]
    .filter((id) => isOwned(id) && !isLand(byId.get(id) ?? ({ typeLine: "Land" } as CatalogCard)) && !basicIds.has(id))
    .sort()[0];
  if (!lockedCard) throw new Error("Played has no card to lock");

  /** One basic of `deck` swapped for a free card in its colors, taking that card from the pool. */
  function swapFor(deck: DeckPlan): Swap {
    const [basic] = basicsOf(deck);
    const inCard = catalog.cards.find(
      (c) => !isLand(c) && (free.get(c.oracleId) ?? 0) > 0 && !deck.rows.has(c.oracleId) && c.oracleId !== deck.commander.oracleId && within(c.colors, deck.commander.colors),
    );
    if (!basic || !inCard || !take(inCard.oracleId)) throw new Error(`${deck.name}: no basic to swap or no free card to swap in`);
    return { out: basic[0], outQty: basic[1], in: inCard.oracleId };
  }
  const playedSwap = swapFor(played);
  // The versioned deck's two swaps are applied one after the other, so the second sees the basic count the first left.
  const first = swapFor(versioned);
  const second = swapFor({ ...versioned, rows: new Map([...versioned.rows, [first.in, 1], [first.out, first.outQty - 1]]) });
  const decks = [under, over, played, fresh, versioned];
  const sharedCard = pickShared(catalog, free, decks, support);
  return { decks, playedSwap, versionedSwaps: [first, second], lockedCard, markedCard, sharedCard };
}

/**
 * The card "Which deck needs it most?" is for: free (in no deck, not a commander), not a basic, within the colors of
 * and indexed by at least two decks' commanders. The most decks, then the highest summed inclusion, then oracle id.
 */
export function pickShared(
  catalog: CatalogSnapshot,
  free: ReadonlyMap<string, number>,
  decks: readonly DeckPlan[],
  support: ReadonlyMap<string, ReadonlyMap<string, number>>,
): { oracleId: string; fits: DeckRole[] } {
  let best: { oracleId: string; fits: DeckRole[]; weight: number } | null = null;
  for (const c of catalog.cards) {
    if ((free.get(c.oracleId) ?? 0) <= 0 || isLand(c)) continue;
    const fits = decks.filter(
      (d) => !d.rows.has(c.oracleId) && d.commander.oracleId !== c.oracleId && within(c.colors, d.commander.colors) && (support.get(d.commander.oracleId)?.get(c.oracleId) ?? 0) > 0,
    );
    if (fits.length < 2) continue;
    const weight = fits.reduce((n, d) => n + (support.get(d.commander.oracleId)?.get(c.oracleId) ?? 0), 0);
    if (!best || fits.length > best.fits.length || (fits.length === best.fits.length && weight > best.weight)) {
      best = { oracleId: c.oracleId, fits: fits.map((d) => d.role), weight };
    }
  }
  if (!best) throw new Error("no owned free card fits two decks: the collection or the support index is too thin");
  return { oracleId: best.oracleId, fits: best.fits };
}

/** The profile's deck total for a plan (`deckTotal` in `src/lib/tuning/v2/run.ts`): every copy, plus the commander if it is not a row. */
export function planTotal(d: DeckPlan): number {
  return [...d.rows.values()].reduce((a, b) => a + b, 0) + (d.rows.has(d.commander.oracleId) ? 0 : 1);
}
