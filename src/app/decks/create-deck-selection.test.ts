import { beforeEach, describe, expect, it, vi } from "vitest";

// The action module imports the db client, which throws at module init without a
// live URL. This stub follows src/app/decks/actions.test.ts — same `vi.hoisted`
// state, same `nameOf(table)` trick, same throwing `redirect` — with one
// addition it needs and that file does not: the `cards` reads are answered by
// oracle id, because this suite turns on *which* rows a selection lookup
// returns and the shipped suite never distinguishes them.
const stub = vi.hoisted(() => {
  const nameOf = (table: unknown): string =>
    (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];

  /** The string parameters bound into a Drizzle condition. `eq(cards.oracleId,
      id)` yields one; `inArray(cards.oracleId, ids)` yields one per id. Walking
      the chunk tree is what lets the `cards` stub answer by id instead of
      handing every test's whole catalog to every query. */
  const paramValues = (node: unknown, out: string[] = []): string[] => {
    if (Array.isArray(node)) {
      for (const child of node) paramValues(child, out);
      return out;
    }
    if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      if (typeof rec.value === "string") out.push(rec.value);
      if (Array.isArray(rec.queryChunks)) paramValues(rec.queryChunks, out);
    }
    return out;
  };

  const state = {
    /** The catalog. Answers the commander lookup and the selection lookup. */
    cards: [] as Record<string, unknown>[],
    /** The collection rows behind `ownedColorLegalPool`. */
    collectionItems: [] as Record<string, unknown>[],
    /** What `unownedStaples`' catalog query returns — the cards EDHREC named
        that the player does not own. Kept apart from `cards` because that query
        matches on lowercased name, not on oracle id. */
    stapleCards: [] as Record<string, unknown>[],
    insertCalls: [] as { table: string; values: unknown; returning: unknown[] | null }[],
    edhrec: { data: null as unknown, unreachable: false },
    redirectTarget: null as string | null,
  };

  function makeSelectBuilder(fields?: Record<string, unknown>) {
    const keys = fields ? Object.keys(fields) : [];
    return {
      from: (table: unknown) => {
        const tableName = nameOf(table);
        const builder = {
          where: async (condition?: unknown) => {
            if (tableName !== "cards") return state.collectionItems;
            // `unownedStaples` is the only cards read that projects `manaValue`.
            if (keys.includes("manaValue")) return state.stapleCards;
            const ids = paramValues(condition);
            // Postgres casts the bound parameter to uuid and errors on anything
            // that is not one, which is what makes the action's own UUID filter
            // load-bearing rather than decorative.
            for (const id of ids) {
              if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
                throw new Error(`invalid input syntax for type uuid: "${id}"`);
              }
            }
            const wanted = new Set(ids);
            return state.cards.filter((c) => wanted.has(c.oracleId as string));
          },
          innerJoin: () => ({
            where: () => ({
              groupBy: async () => {
                const agg = new Map<string, Record<string, unknown>>();
                for (const item of state.collectionItems) {
                  const id = item.oracleId as string;
                  const q = (item.quantity as number | undefined) ?? 1;
                  const seen = agg.get(id);
                  if (seen) seen.ownedQuantity = (seen.ownedQuantity as number) + q;
                  else agg.set(id, { ...item, ownedQuantity: q });
                }
                return Array.from(agg.values());
              },
            }),
          }),
          orderBy: () => builder,
          groupBy: async () => state.collectionItems,
        };
        return builder as unknown as {
          where: (c?: unknown) => Promise<Record<string, unknown>[]>;
          innerJoin: (t: unknown, c: unknown) => { where: () => { groupBy: () => Promise<Record<string, unknown>[]> } };
        };
      },
    };
  }

  function makeInsertBuilder(table: unknown) {
    const tableName = nameOf(table);
    return {
      values: (values: unknown) => {
        const returning: unknown[] = [];
        if (tableName === "decks") returning.push({ id: "deck-new-uuid" });
        if (tableName === "fill_passes") returning.push({ id: "pass-new-uuid" });
        state.insertCalls.push({
          table: tableName,
          values,
          returning: returning.length ? returning : null,
        });
        return {
          returning: async () => returning,
          onConflictDoUpdate: async () => {},
          onConflictDoNothing: async () => {},
        };
      },
    };
  }

  const tx = {
    insert: (table: unknown) => makeInsertBuilder(table),
    execute: async () => {},
    select: () => ({ from: () => ({ where: async () => [] }) }),
  };

  const db = {
    select: (fields?: Record<string, unknown>) => makeSelectBuilder(fields),
    insert: (table: unknown) => makeInsertBuilder(table),
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  };

  return { db, state };
});

// The catalog's basics are a separate read the table stubs here do not model; none by default,
// and a test that needs them sets them.
vi.mock("../../lib/decks/catalog-basics", () => ({ loadCatalogBasics: vi.fn(async () => []) }));
vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, updateTag: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    stub.state.redirectTarget = target;
    const err = new Error(`NEXT_REDIRECT:${target}`);
    (err as unknown as Record<string, unknown>)["__nextRedirect"] = true;
    throw err;
  },
}));
vi.mock("../../lib/edhrec/client", () => ({
  getEdhrecData: async () => stub.state.edhrec,
}));

import { createDeck } from "./actions";
import { loadCatalogBasics } from "../../lib/decks/catalog-basics";

const CMDR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VALID = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OFF_COLOUR = "22222222-2222-4222-8222-222222222222";
const NOT_A_UUID = "not-a-uuid";

function commanderRow(): Record<string, unknown> {
  return {
    oracleId: CMDR,
    name: "Atraxa, Praetors' Voice",
    typeLine: "Legendary Creature — Phyrexian Angel Horror",
    oracleText: "Flying, vigilance, deathtouch, lifelink",
    keywords: ["Flying"],
    colorIdentity: ["W", "B", "G"],
    commanderLegal: true,
    imageUri: null,
    manaCost: "{G}{W}{B}",
    cmc: 4,
  };
}

/** A ramp artifact — `classifyRoles` puts it in the fill's first role, so a
    card built this way is one `planFill` will happily spend. */
function cardRow(oracleId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    oracleId,
    name: `Card ${oracleId.slice(0, 8)}`,
    typeLine: "Artifact",
    oracleText: "{T}: Add {G}.",
    keywords: [],
    colorIdentity: [],
    commanderLegal: true,
    imageUri: null,
    manaCost: "{2}",
    cmc: 2,
    quantity: 1,
    ...overrides,
  };
}

/** `n` distinct legal, uuid-shaped ids that are not the commander's. */
function selectionOf(n: number): string[] {
  return Array.from(
    { length: n },
    (_, i) => `9${i.toString().padStart(7, "0")}-1111-4111-8111-111111111111`,
  );
}

async function runCreate(name: string, selected?: string[]) {
  try {
    if (selected === undefined) await createDeck(CMDR, name);
    else await createDeck(CMDR, name, selected);
  } catch (err) {
    const e = err as Error & { __nextRedirect?: boolean };
    if (!e.__nextRedirect) throw err;
  }
}

const insertedRows = () =>
  stub.state.insertCalls
    .filter((c) => c.table === "deck_cards")
    .flatMap((c) => c.values as Array<Record<string, unknown>>);

const insertedIds = () => insertedRows().map((r) => r.oracleId as string);

beforeEach(() => {
  stub.state.cards.length = 0;
  stub.state.collectionItems.length = 0;
  stub.state.stapleCards.length = 0;
  stub.state.insertCalls.length = 0;
  stub.state.edhrec = { data: null, unreachable: false };
  stub.state.redirectTarget = null;
});

describe("createDeck with a selection", () => {
  it("writes every selected card as an auto row so the sweep undoes it", async () => {
    stub.state.cards.push(commanderRow(), cardRow(VALID));
    await runCreate("My deck", [VALID]);
    const selected = insertedRows().find((r) => r.oracleId === VALID);
    expect(selected).toMatchObject({ auto: true, quantity: 1 });
  });

  it("keeps the fill from spending a card the selection already placed", async () => {
    // The owned pool and the selection overlap on VALID. Gap report 4: it lands
    // once, not once for the pick and once for the role.
    stub.state.cards.push(commanderRow(), cardRow(VALID), cardRow(OTHER));
    stub.state.collectionItems.push(cardRow(VALID), cardRow(OTHER));
    await runCreate("My deck", [VALID]);
    expect(insertedIds().filter((id) => id === VALID)).toHaveLength(1);
    // The rest of the fill is untouched — only the duplicate is gone.
    expect(insertedIds()).toContain(OTHER);
  });

  it("keeps the fill from spending an unowned staple the selection placed", async () => {
    // The critical case: a selected card the player does not own is in
    // `unownedStaples`, not in the owned pool. Filtering only the pool would
    // let this one land twice.
    stub.state.cards.push(commanderRow(), cardRow(VALID));
    stub.state.stapleCards.push(cardRow(VALID, { manaValue: 2 }));
    stub.state.edhrec = {
      data: { topCards: [cardRow(VALID).name], inclusionByName: {}, synergyByName: {} },
      unreachable: false,
    };
    await runCreate("My deck", [VALID]);
    expect(insertedIds().filter((id) => id === VALID)).toHaveLength(1);
  });

  it("counts the selection's pips when it weights the basics", async () => {
    // THE WIRING, which no test on `planFill` can reach. A selected card is inserted beside the
    // fill's rows and is in `excludeOracleIds`, so it is stripped from the candidate pool and
    // reaches neither `held` nor `rows` — its pips are in the finished deck and were missing from
    // the census that weights the mana base. `createDeck` passes them as `selected`.
    //
    // Atraxa is `{G}{W}{B}`: one pip each, so the three basics start level and the selection is
    // the only thing that can separate them.
    //
    // Asserted as black OUTWEIGHING THE OTHER TWO TOGETHER, which is what the four selected pips
    // buy (weights 5/1/1, so ~26 of 37). A bare `Swamp > Plains` cannot tell the fix from its
    // absence: with the selection uncounted the three colours are level at one pip each, `colors`
    // sorts `B` first, and black takes the odd slot — so Swamp leads by one and the assertion
    // passes on the broken build. Both mutations below were run against it.
    //
    // Its ids are fresh rather than the shared constants. The first version gave the Swamp
    // `VALID`'s uuid — the SELECTED card's — so `dedupeSelectionFromPool` removed it from the
    // pool exactly as it should, black had no source to be allocated, and the case read
    // `Forest 19 · Plains 18 · Swamp 1` and looked like a census defect.
    const SWAMP = "5000ba51-0000-4000-8000-000000000001";
    const PLAINS = "5000ba51-0000-4000-8000-000000000002";
    const FOREST = "5000ba51-0000-4000-8000-000000000003";
    const basic = (id: string, name: string) => cardRow(id, {
      name, typeLine: `Basic Land — ${name}`, manaCost: null, cmc: 0, quantity: 40,
    });
    stub.state.cards.push(
      commanderRow(),
      cardRow(VALID, { manaCost: "{B}{B}{B}{B}", colorIdentity: ["B"], cmc: 4 }),
    );
    stub.state.collectionItems.push(
      basic(SWAMP, "Swamp"), basic(PLAINS, "Plains"), basic(FOREST, "Forest"),
    );
    await runCreate("My deck", [VALID]);
    const qty = (id: string) => insertedRows()
      .filter((r) => r.oracleId === id)
      .reduce((n, r) => n + (r.quantity as number), 0);
    expect(qty(SWAMP)).toBeGreaterThan(qty(PLAINS) + qty(FOREST));
  });

  it("charges selected lands against the land ceiling (H26)", async () => {
    // THE WIRING again. A selected land is inserted beside the plan and stripped from its pool, so
    // a plan that saw only the selection's COSTS built the whole land count beside it: Thorin's v1
    // shipped 41 lands against 37, four of them picks. Passed as `selected`, each one reaches
    // `planFill` as a held card, and a held land is a land the ceiling has already spent.
    //
    // Measured as every land the create inserts, picks and basics together, against the flat 37
    // a deck with no measured skeleton builds to. With `selected` reduced to the costs alone, the
    // basics fill to 37 on their own and the deck reads 41.
    const LANDS = selectionOf(4);
    const SWAMP = "5000ba51-0000-4000-8000-000000000011";
    const PLAINS = "5000ba51-0000-4000-8000-000000000012";
    const FOREST = "5000ba51-0000-4000-8000-000000000013";
    const basic = (id: string, name: string) => cardRow(id, {
      name, typeLine: `Basic Land — ${name}`, manaCost: null, cmc: 0, quantity: 40,
    });
    stub.state.cards.push(
      commanderRow(),
      ...LANDS.map((id) => cardRow(id, {
        typeLine: "Land", oracleText: "{T}: Add {C}.", manaCost: null, cmc: 0,
      })),
    );
    stub.state.collectionItems.push(
      basic(SWAMP, "Swamp"), basic(PLAINS, "Plains"), basic(FOREST, "Forest"),
    );
    await runCreate("My deck", LANDS);
    const lands = insertedRows()
      .filter((r) => LANDS.includes(r.oracleId as string) || [SWAMP, PLAINS, FOREST].includes(r.oracleId as string))
      .reduce((n, r) => n + (r.quantity as number), 0);
    expect(insertedIds()).toEqual(expect.arrayContaining(LANDS));
    expect(lands).toBe(37);
  });
  it("skips a malformed id rather than failing the whole create", async () => {
    stub.state.cards.push(commanderRow(), cardRow(VALID));
    await runCreate("My deck", [NOT_A_UUID, VALID]);
    expect(stub.state.redirectTarget).toBe("/decks/deck-new-uuid");
    expect(insertedIds()).toContain(VALID);
    expect(insertedIds()).not.toContain(NOT_A_UUID);
  });

  it("skips a card validateCardForDeck refuses rather than failing the whole create", async () => {
    // Off the commander's colour identity: the add path would refuse it, so
    // this path does too — quietly, because the player is mid-navigation.
    stub.state.cards.push(
      commanderRow(),
      cardRow(VALID),
      cardRow(OFF_COLOUR, { colorIdentity: ["U"] }),
    );
    await runCreate("My deck", [OFF_COLOUR, VALID]);
    expect(insertedIds()).toContain(VALID);
    expect(insertedIds()).not.toContain(OFF_COLOUR);
  });

  it("refuses the commander itself as a pick", async () => {
    stub.state.cards.push(commanderRow(), cardRow(VALID));
    await runCreate("My deck", [CMDR, VALID]);
    expect(insertedIds()).not.toContain(CMDR);
  });

  it("weights the basics by the selection, not by residual rows the cap would cut", async () => {
    // Sixty black picks leave the plan thirty-nine slots. Planning the whole body put forty
    // green residual spells in the pip census although the cap cut them from the deck, and their
    // 160 green pips outweighed the picks' 60 black. Planning only the slots that survive keeps
    // every counted row in the finished deck, and the selection's colour wins.
    const picks = selectionOf(60);
    const SWAMP = "5000ba51-0000-4000-8000-000000000011";
    const PLAINS = "5000ba51-0000-4000-8000-000000000012";
    const FOREST = "5000ba51-0000-4000-8000-000000000013";
    const basic = (id: string, name: string) => cardRow(id, {
      name, typeLine: `Basic Land — ${name}`, oracleText: null, manaCost: null, cmc: 0, quantity: 40,
    });
    const green = Array.from({ length: 40 }, (_, i) =>
      cardRow(`6${i.toString().padStart(7, "0")}-1111-4111-8111-111111111111`, {
        typeLine: "Creature — Elf", oracleText: "Flying", manaCost: "{G}{G}{G}{G}", colorIdentity: ["G"], cmc: 4,
      }));
    stub.state.cards.push(
      commanderRow(),
      ...picks.map((id) => cardRow(id, { typeLine: "Creature — Rat", oracleText: "Flying", manaCost: "{B}", colorIdentity: ["B"], cmc: 1 })),
    );
    stub.state.collectionItems.push(basic(SWAMP, "Swamp"), basic(PLAINS, "Plains"), basic(FOREST, "Forest"), ...green);

    await runCreate("My deck", picks);

    const qty = (id: string) => insertedRows()
      .filter((r) => r.oracleId === id)
      .reduce((n, r) => n + (r.quantity as number), 0);
    expect(qty(SWAMP)).toBeGreaterThan(qty(FOREST) + qty(PLAINS));
    expect(insertedRows().reduce((n, r) => n + (r.quantity as number), 0)).toBe(99);
  });

  it("gives an identity colour a basic from the catalog when the shelf holds none", async () => {
    // THE WIRING, which no test on `planFill` reaches: `buildFillPlan` loads the catalog's basics
    // and hands them over. Atraxa is W/B/G with one pip each; the player owns Forests only, and
    // before the catalog was offered, every basic went to Forest.
    const FOREST = "5000ba51-0000-4000-8000-000000000021";
    const CAT_SWAMP = "5000ba51-0000-4000-8000-000000000022";
    const CAT_PLAINS = "5000ba51-0000-4000-8000-000000000023";
    const land = (id: string, name: string, quantity: number) => cardRow(id, {
      name, typeLine: `Basic Land — ${name}`, oracleText: null, manaCost: null, cmc: 0, quantity,
    });
    vi.mocked(loadCatalogBasics).mockResolvedValueOnce([
      { ...land(CAT_SWAMP, "Swamp", 0), owned: true, ownedQuantity: 0, inclusionPct: null, layout: "normal" },
      { ...land(CAT_PLAINS, "Plains", 0), owned: true, ownedQuantity: 0, inclusionPct: null, layout: "normal" },
    ] as never);
    stub.state.cards.push(commanderRow());
    stub.state.collectionItems.push(land(FOREST, "Forest", 40));

    await runCreate("My deck");

    const ids = insertedIds();
    expect(ids).toContain(CAT_SWAMP);
    expect(ids).toContain(CAT_PLAINS);
  });

  it("never plans a second row for a basic the selection already placed", async () => {
    // `deck_cards` is keyed on the card and the insert does nothing on conflict, so a planned
    // Plains stack beside a selected Plains is dropped whole and the deck lands dozens short. The
    // catalog's basics come under the same exclusion as the pool.
    const PLAINS = "5000ba51-0000-4000-8000-000000000031";
    const plains = cardRow(PLAINS, {
      name: "Plains", typeLine: "Basic Land — Plains", oracleText: null, manaCost: null, cmc: 0,
      colorIdentity: [], quantity: 0,
    });
    vi.mocked(loadCatalogBasics).mockResolvedValueOnce([
      { ...plains, owned: true, ownedQuantity: 0, inclusionPct: null, layout: "normal" },
    ] as never);
    stub.state.cards.push(commanderRow(), plains);

    await runCreate("My deck", [PLAINS]);

    expect(insertedRows().filter((r) => r.oracleId === PLAINS)).toHaveLength(1);
  });

  it("counts the 99 cap on summed quantity, not on row count", async () => {
    // A crafted ?select= can name far more cards than the fill leaves room for.
    // Sixty picks plus a fill of 47 (10 ramp + 37 lands) is 107, but only ~80
    // rows, because the 37 lands arrive as ten Forests stacked four deep. A
    // `rows.length` cap would wave all 107 through.
    const picks = selectionOf(60);
    const forests = Array.from({ length: 40 }, (_, i) =>
      cardRow(`4${i.toString().padStart(7, "0")}-1111-4111-8111-111111111111`, {
        name: "Forest",
        typeLine: "Basic Land — Forest",
        oracleText: null,
        colorIdentity: ["G"],
        quantity: 4,
      }),
    );
    const ramp = Array.from({ length: 40 }, (_, i) =>
      cardRow(`5${i.toString().padStart(7, "0")}-1111-4111-8111-111111111111`),
    );
    stub.state.cards.push(commanderRow(), ...picks.map((id) => cardRow(id)));
    stub.state.collectionItems.push(...forests, ...ramp);

    await runCreate("My deck", picks);

    const rows = insertedRows();
    const total = rows.reduce((n, r) => n + (r.quantity as number), 0);
    expect(total).toBeLessThanOrEqual(99);
    // The cap engaged, and it engaged on quantity: fewer rows than 99, more
    // cards than the 68-card baseline.
    expect(rows.length).toBeLessThan(99);
    expect(total).toBeGreaterThan(68);
    // The selection is placed first, so every pick survives the cap.
    for (const id of picks) expect(insertedIds()).toContain(id);
  });

  // The cap has to spend the last slots, not strand them. With only stacked
  // rows left to draw from, a cap that skips whatever will not fit whole stops
  // at 96 and never reaches 99 — every remaining row is the same four-deep
  // stack that just failed. Truncating the overrunning row spends the three.
  it("truncates a stack that overruns the cap rather than skipping it", async () => {
    const picks = selectionOf(65);
    // Basics only: every fill row is four deep, so there is no single-quantity
    // row further down the list for a skipping cap to fall back on.
    const forests = Array.from({ length: 40 }, (_, i) =>
      cardRow(`4${i.toString().padStart(7, "0")}-1111-4111-8111-111111111111`, {
        name: "Forest",
        typeLine: "Basic Land — Forest",
        oracleText: null,
        colorIdentity: ["G"],
        quantity: 4,
      }),
    );
    stub.state.cards.push(commanderRow(), ...picks.map((id) => cardRow(id)));
    stub.state.collectionItems.push(...forests);

    await runCreate("My deck", picks);

    const rows = insertedRows();
    const total = rows.reduce((n, r) => n + (r.quantity as number), 0);
    expect(total).toBe(99);
  });

  it("is byte-identical to the shipped path when no selection is passed", async () => {
    stub.state.cards.push(commanderRow(), cardRow(VALID));
    stub.state.collectionItems.push(cardRow(VALID));
    await runCreate("My deck");
    const shipped = insertedRows();
    expect(shipped.map((r) => r.oracleId)).toEqual([VALID]);

    stub.state.insertCalls.length = 0;
    await runCreate("My deck", []);
    expect(insertedRows()).toEqual(shipped);
  });
});
