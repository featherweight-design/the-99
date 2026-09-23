import { describe, expect, it, vi } from "vitest";

import { SWEEP_BATCH_SIZE, sweepCardFlags, unionFlagRows, type SweepCard } from "./sweep";

const card = (n: number, over: Partial<SweepCard> = {}): SweepCard => ({
  oracleId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  name: `Card ${n}`,
  gameChanger: false,
  ...over,
});

const entry = (c: SweepCard, f: Partial<Record<string, boolean>> = {}) => ({
  card: { oracleId: c.oracleId, name: c.name },
  massLandDenial: false,
  extraTurn: false,
  gameChanger: false,
  ...f,
});

describe("sweepCardFlags", () => {
  it("batches at 600 and reports the batch count", async () => {
    const cards = Array.from({ length: 1250 }, (_, i) => card(i));
    const fetcher = vi.fn(async (names: string[]) => {
      expect(names.length).toBeLessThanOrEqual(SWEEP_BATCH_SIZE);
      return { cards: [] };
    });
    const out = await sweepCardFlags(cards, fetcher);
    expect(out.batches).toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  // Sequential, not concurrent: 54 batches fired at once is 54 requests in a second against a
  // documented 80/min budget. The test pins the ordering rather than the timing.
  it("issues batches sequentially", async () => {
    const cards = Array.from({ length: 1800 }, (_, i) => card(i));
    let inFlight = 0;
    let maxInFlight = 0;
    await sweepCardFlags(cards, async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return { cards: [] };
    });
    expect(maxInFlight).toBe(1);
  });

  // Verified live: the response carries `card.oracleId` and it IS Scryfall's oracle id, so
  // no name index is involved and a name spelling cannot cost a resolution.
  it("keys results by the oracle id the response carries", async () => {
    const a = card(1);
    const out = await sweepCardFlags([a], async () => ({
      cards: [entry(a, { massLandDenial: true })],
    }));
    expect(out.flags.get(a.oracleId)).toEqual({
      massLandDenial: true,
      extraTurn: false,
      gameChanger: false,
    });
    expect(out.resolved).toBe(1);
  });

  it("counts an entry whose oracle id this catalog does not hold, and drops it", async () => {
    const a = card(1);
    const stranger = { ...card(99), oracleId: "11111111-1111-4111-8111-111111111111" };
    const out = await sweepCardFlags([a], async () => ({
      cards: [entry(a), entry(stranger)],
    }));
    expect(out.unresolved).toBe(1);
    expect(out.flags.has(stranger.oracleId)).toBe(false);
  });

  // The coverage figure, as it actually arrives: a card upstream does not index is
  // absent from the response rather than returned with null flags. Live proof is
  // `Back to Basics`, which a five-card request came back without.
  it("counts a card upstream returned nothing for as not-indexed, not as false", async () => {
    const [a, b] = [card(1), card(2)];
    const out = await sweepCardFlags([a, b], async () => ({ cards: [entry(a)] }));
    expect(out.notIndexed).toBe(1);
    expect(out.flags.has(b.oracleId)).toBe(false);
  });

  it("throws on a failed batch rather than returning partial flags", async () => {
    const cards = Array.from({ length: 1200 }, (_, i) => card(i));
    let n = 0;
    await expect(
      sweepCardFlags(cards, async () => {
        if (++n === 2) throw new Error("upstream 503");
        return { cards: [] };
      }),
    ).rejects.toThrow("upstream 503");
  });

  // Scryfall is authoritative for Game Changers, so a disagreement is reported and never
  // written — a free cross-check between two independent copies of one WotC list.
  it("logs a gameChanger disagreement without writing it", async () => {
    const a = card(1, { gameChanger: false });
    const out = await sweepCardFlags([a], async () => ({
      cards: [entry(a, { gameChanger: true })],
    }));
    expect(out.gameChangerDisagreements).toEqual([a.name]);
  });
});

describe("unionFlagRows", () => {
  const id = (n: number) => card(n).oracleId;

  it("records each source per flag, and both when both agree", () => {
    const rows = unionFlagRows(
      new Map([
        [id(1), { massLandDenial: true, extraTurn: false, gameChanger: false }], // sweep only
        [id(3), { massLandDenial: true, extraTurn: false, gameChanger: false }], // both
      ]),
      new Map([
        [id(2), { massLandDenial: true, extraTurn: false, tutor: false }], // rule only
        [id(3), { massLandDenial: true, extraTurn: false, tutor: false }],
      ]),
    );
    const by = new Map(rows.map((r) => [r.oracleId, r]));
    expect(by.get(id(1))!.massLandDenialSources).toEqual(["spellbook_sweep"]);
    expect(by.get(id(2))!.massLandDenialSources).toEqual(["oracle_rule"]);
    expect(by.get(id(3))!.massLandDenialSources).toEqual(["spellbook_sweep", "oracle_rule"]);
  });

  it("keeps the two flags' sources independent", () => {
    const [rows] = [
      unionFlagRows(
        new Map([[id(1), { massLandDenial: false, extraTurn: true, gameChanger: false }]]),
        new Map([[id(1), { massLandDenial: true, extraTurn: false, tutor: false }]]),
      ),
    ];
    expect(rows[0].massLandDenialSources).toEqual(["oracle_rule"]);
    expect(rows[0].extraTurnSources).toEqual(["spellbook_sweep"]);
  });

  // The table's check constraint refuses a flag true with no source, so this is the shape
  // the row must never take — and a card neither source claims gets no row at all.
  it("emits no row for a card neither source claims", () => {
    const rows = unionFlagRows(
      new Map([[id(1), { massLandDenial: false, extraTurn: false, gameChanger: true }]]),
      new Map([[id(1), { massLandDenial: false, extraTurn: false, tutor: false }]]),
    );
    expect(rows).toEqual([]);
  });

  it("never emits a true flag with an empty source list", () => {
    const rows = unionFlagRows(
      new Map([[id(1), { massLandDenial: true, extraTurn: false, gameChanger: false }]]),
      new Map([[id(2), { massLandDenial: false, extraTurn: true, tutor: false }]]),
    );
    for (const r of rows) {
      expect(r.massLandDenial).toBe(r.massLandDenialSources.length > 0);
      expect(r.extraTurn).toBe(r.extraTurnSources.length > 0);
      expect(r.tutor).toBe(r.tutorSources.length > 0);
    }
  });

  // A tutor is claimed by the oracle rule alone, so a card that is ONLY a tutor still gets a
  // row: absence means "no flag applies", and a tutor is a flag now.
  it("emits a row for a card that is only a tutor, sourced to the oracle rule", () => {
    const rows = unionFlagRows(
      new Map(),
      new Map([[id(1), { massLandDenial: false, extraTurn: false, tutor: true }]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tutor).toBe(true);
    expect(rows[0].tutorSources).toEqual(["oracle_rule"]);
    expect(rows[0].massLandDenialSources).toEqual([]);
  });
});
