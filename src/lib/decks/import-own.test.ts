import { describe, expect, it, vi } from "vitest";

// The module imports the db client for its retry read, which every test here replaces.
vi.mock("../../db", () => ({ db: {} }));

import type { HistoryRow } from "../../db/schema";
import { printingRefKey } from "../collection/catalog-read";
import { deckSource } from "../collection/deck-source";
import { collectionItemKey } from "../collection/key";
import type { PendingItem } from "../collection/pending";
import { normalizeItems, planAdd, planRevert, type ChangeOptions, type ChangeResult, type CollectionChange } from "../collection/write";
import { buildDeckImport, type ImportCatalogCard } from "./import";
import { deckOwnLines, deckOwnRefs, importDeckOwned, type CatalogPrinting, type DeckOwnDeps } from "./import-own";
import type { ImportedDeck } from "./write-imported-deck";

const SOL = "00000000-0000-4000-8000-000000000001";
const ARCANE = "00000000-0000-4000-8000-000000000002";
const FOREST = "00000000-0000-4000-8000-000000000003";
const ATREUS = "00000000-0000-4000-8000-000000000004";
const KRATOS = "00000000-0000-4000-8000-000000000005";

const printing = (oracleId: string, setCode: string, collectorNumber: string, finishes = ["nonfoil", "foil"]): [string, CatalogPrinting] =>
  [printingRefKey({ oracleId, setCode, collectorNumber }), { scryfallId: `scry-${setCode}-${collectorNumber}`, finishes }];

describe("deckOwnLines", () => {
  const catalog = new Map([
    printing(SOL, "ltc", "284"),
    printing(SOL, "c21", "263"),
    printing(ARCANE, "cmm", "1", ["foil"]),
    printing(ATREUS, "sld", "2212"),
  ]);

  it("takes the printing the import kept, then the list's own named printing, then none", () => {
    const lines = deckOwnLines({
      cards: [{ oracleId: SOL, quantity: 1 }, { oracleId: ARCANE, quantity: 1 }, { oracleId: FOREST, quantity: 12 }],
      commanderOracleIds: [ATREUS],
      // The kept pick is C21 263, though the list's first line named LTC 284.
      picks: [{ oracleId: SOL, setCode: "c21", collectorNumber: "263" }],
      named: [
        { oracleId: ARCANE, setCode: "CMM", collectorNumber: "1", sourceLine: 4 },
        { oracleId: SOL, setCode: "ltc", collectorNumber: "284", sourceLine: 2 },
        { oracleId: SOL, setCode: "c21", collectorNumber: "263", sourceLine: 3 },
      ],
    }, catalog);
    expect(lines).toEqual([
      { oracleId: SOL, setCode: "c21", collectorNumber: "263", scryfallId: "scry-c21-263", finish: "nonfoil", condition: null, quantity: 1 },
      // Named in uppercase, stored lowercase; a printing with no nonfoil takes the finish it has.
      { oracleId: ARCANE, setCode: "cmm", collectorNumber: "1", scryfallId: "scry-cmm-1", finish: "foil", condition: null, quantity: 1 },
      // Named nowhere: the card's default printing, at the deck's count.
      { oracleId: FOREST, setCode: "", scryfallId: null, finish: "nonfoil", condition: null, quantity: 12 },
      { oracleId: ATREUS, setCode: "", scryfallId: null, finish: "nonfoil", condition: null, quantity: 1 },
    ]);
  });

  it("without a pick, takes the list's FIRST named printing by line, passing over one the catalog lacks", () => {
    const lines = deckOwnLines({
      cards: [{ oracleId: SOL, quantity: 1 }],
      commanderOracleIds: [],
      picks: [],
      named: [
        { oracleId: SOL, setCode: "c21", collectorNumber: "263", sourceLine: 9 },
        { oracleId: SOL, setCode: "zzz", collectorNumber: "1", sourceLine: 1 },
        { oracleId: SOL, setCode: "ltc", collectorNumber: "284", sourceLine: 5 },
      ],
    }, catalog);
    expect(lines.map((l) => `${l.setCode} ${l.collectorNumber}`)).toEqual(["ltc 284"]);
  });

  it("falls past a kept pick the catalog lacks to the list's named printing", () => {
    const lines = deckOwnLines({
      cards: [{ oracleId: SOL, quantity: 1 }],
      commanderOracleIds: [],
      picks: [{ oracleId: SOL, setCode: "gone", collectorNumber: "7" }],
      named: [{ oracleId: SOL, setCode: "ltc", collectorNumber: "284", sourceLine: 2 }],
    }, catalog);
    expect(lines.map((l) => l.setCode)).toEqual(["ltc"]);
  });

  it("adds both commanders, at their named printings, and no unresolved line", () => {
    const card = (oracleId: string, name: string, typeLine = "Artifact"): ImportCatalogCard => ({
      oracleId, scryfallId: `s-${oracleId}`, name, typeLine, oracleText: null, commanderLegal: true,
      colorIdentity: [], imageUri: null, layout: "normal", manaCost: null,
    } as ImportCatalogCard);
    const imported = buildDeckImport({
      text: "Commander\n1 Atreus, God of War (SLD) 2212\n1 Kratos, God of War\n\nDeck\n1 Sol Ring (LTC) 284\n1 Not A Card",
      catalog: [
        card(SOL, "Sol Ring"),
        card(ATREUS, "Atreus, God of War", "Legendary Creature — God"),
        card(KRATOS, "Kratos, God of War", "Legendary Creature — God"),
      ],
    });
    expect(imported.unresolved.map((u) => u.rawName)).toEqual(["Not A Card"]);
    const src = {
      cards: imported.cards.map((c) => ({ oracleId: c.oracleId, quantity: c.quantity })),
      commanderOracleIds: [imported.declaredCommander!.oracleId, imported.declaredPartner!.oracleId],
      picks: [],
      named: imported.printings,
    };
    const lines = deckOwnLines(src, catalog);
    expect(lines.map((l) => [l.oracleId, l.setCode, l.quantity])).toEqual([
      [SOL, "ltc", 1],
      [ATREUS, "sld", 1],
      [KRATOS, "", 1],
    ]);
    // The one catalog read asks for every printing a line named, and nothing for the unresolved line.
    expect(deckOwnRefs(src).map(printingRefKey).sort()).toEqual([
      printingRefKey({ oracleId: ATREUS, setCode: "sld", collectorNumber: "2212" }),
      printingRefKey({ oracleId: SOL, setCode: "ltc", collectorNumber: "284" }),
    ].sort());
  });
});

describe("Revert of a deck add", () => {
  it("takes back exactly the copies the add brought, a card already held included", () => {
    const items = normalizeItems(deckOwnLines({
      cards: [{ oracleId: SOL, quantity: 1 }, { oracleId: FOREST, quantity: 3 }],
      commanderOracleIds: [ATREUS],
      picks: [],
      named: [{ oracleId: SOL, setCode: "ltc", collectorNumber: "284", sourceLine: 1 }],
    }, new Map([printing(SOL, "ltc", "284")])));
    // The player already held one Sol Ring at that printing: the add gives a second copy.
    const before = new Map(normalizeItems([
      { oracleId: SOL, setCode: "ltc", collectorNumber: "284", scryfallId: "scry-ltc-284", finish: "nonfoil", condition: "NM", quantity: 1 },
    ]).map((h) => [collectionItemKey(h), h]));
    const planned = planAdd(before, items);
    const rows = planned as unknown as HistoryRow[];
    const after = new Map(before);
    for (const p of planned) after.set(collectionItemKey(p), { ...p, ...p.after! });
    expect([...after.values()].map((h) => [h.oracleId, h.quantity])).toEqual([[SOL, 2], [FOREST, 3], [ATREUS, 1]]);

    const reverted = planRevert(after, rows);
    expect(reverted.map((r) => [r.oracleId, r.after?.quantity ?? 0])).toEqual([[SOL, 1], [FOREST, 0], [ATREUS, 0]]);
  });
});

describe("importDeckOwned", () => {
  const ACTION = "11111111-1111-4111-8111-111111111111";
  const MINTED = "22222222-2222-4222-8222-222222222222";
  const deck: ImportedDeck = { userId: "user_1", name: "Father and son", commanderOracleId: ATREUS, partnerOracleId: null, cards: [] };
  const items: PendingItem[] = [{ oracleId: ATREUS, setCode: "", condition: null, quantity: 1 }];
  const applied = { status: "applied", entry: { id: ACTION, seq: 1, kind: "add", rows: [], raised: 1, lowered: 0 }, short: [] } as ChangeResult;

  /**
   * A transaction the way the ledger runs one: the inside work is staged with the add's rows and kept
   * only when the add commits; a refusal or a throw drops both.
   */
  function store(decide: () => ChangeResult, opts: { throwInside?: boolean } = {}) {
    const committed = { decks: [] as string[], cards: [] as PendingItem[], sources: [] as (string | undefined)[] };
    const deps: DeckOwnDeps = {
      madeBy: vi.fn(async () => null),
      newId: () => MINTED,
      writeDeck: vi.fn(async (tx: unknown, d: ImportedDeck & { id: string }) => {
        (tx as { decks: string[] }).decks.push(d.id);
        if (opts.throwInside) throw new Error("deck write failed");
        return d.id;
      }),
      apply: vi.fn(async (_u: string, change: CollectionChange, o: ChangeOptions) => {
        const staged = { decks: [] as string[] };
        await o.inside!(staged as never);
        const result = decide();
        if (result.status === "applied") {
          committed.decks.push(...staged.decks);
          committed.cards.push(...(change.kind === "add" ? change.items : []));
          committed.sources.push(o.source);
        }
        return result;
      }),
    };
    return { committed, deps };
  }

  it("writes the deck inside the add, under the id its source names", async () => {
    const { committed, deps } = store(() => applied);
    const result = await importDeckOwned("user_1", deck, items, ACTION, process.env, deps);
    expect(result).toEqual({ ok: true, deckId: MINTED, entryId: ACTION });
    expect(committed).toEqual({ decks: [MINTED], cards: items, sources: [deckSource(MINTED)] });
    expect(deps.apply).toHaveBeenCalledWith("user_1", { kind: "add", items }, expect.objectContaining({ id: ACTION, source: deckSource(MINTED) }));
  });

  it("a refusal leaves neither the deck nor the cards", async () => {
    const { committed, deps } = store(() => ({ status: "missingCard", names: ["Gone"] }));
    expect(await importDeckOwned("user_1", deck, items, ACTION, process.env, deps)).toEqual({ ok: false });
    expect(committed).toEqual({ decks: [], cards: [], sources: [] });
  });

  it("a failed deck write fails the add, and leaves neither", async () => {
    const { committed, deps } = store(() => applied, { throwInside: true });
    await expect(importDeckOwned("user_1", deck, items, ACTION, process.env, deps)).rejects.toThrow(/deck write failed/);
    expect(committed).toEqual({ decks: [], cards: [], sources: [] });
  });

  it("a retry lands on the deck the action made, and writes nothing", async () => {
    const { committed, deps } = store(() => applied);
    deps.madeBy = vi.fn(async () => "33333333-3333-4333-8333-333333333333");
    expect(await importDeckOwned("user_1", deck, items, ACTION, process.env, deps))
      .toEqual({ ok: true, deckId: "33333333-3333-4333-8333-333333333333", entryId: ACTION });
    expect(deps.apply).not.toHaveBeenCalled();
    expect(committed.decks).toEqual([]);
  });

  it("an id another write used is refused, and writes nothing", async () => {
    const { deps } = store(() => applied);
    deps.madeBy = vi.fn(async () => "other" as const);
    expect(await importDeckOwned("user_1", deck, items, ACTION, process.env, deps)).toEqual({ ok: false });
    expect(deps.apply).not.toHaveBeenCalled();
  });

  it("a twin that committed first answers with the twin's deck", async () => {
    const { deps } = store(() => ({ status: "alreadyApplied", entry: { id: ACTION, seq: 1, kind: "add", rows: [], raised: 1, lowered: 0 } }));
    const twin = "44444444-4444-4444-8444-444444444444";
    deps.madeBy = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(twin);
    expect(await importDeckOwned("user_1", deck, items, ACTION, process.env, deps)).toEqual({ ok: true, deckId: twin, entryId: ACTION });
  });
});
