import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: vi.fn(async () => "g1") }));

import { db } from "../../db";
import { catalogGeneration } from "../cache/catalog-generation";
import { baselineFromRows, catalogQuery, deckCardsQuery, loadDeckStrategy, loadStrategyBaseline, toStrategyCard } from "./load";

const row = (typeLine: string, extra: Partial<Parameters<typeof toStrategyCard>[0]> = {}) =>
  ({ layout: "normal", typeLine, manaValue: 3, keywords: [], themes: null, quantity: 1, ...extra });

describe("deckCardsQuery", () => {
  const { sql, params } = deckCardsQuery(db, "user_1", "deck-1").toSQL();

  it("scopes the deck to its owner", () => {
    expect(sql).toContain('"decks"."user_id" = $');
    expect(params).toContain("user_1");
  });

  it("reads the themes off the card's own label row", () => {
    expect(sql).toContain('jsonb_array_elements("card_labels"."labels")');
  });
});

describe("catalogQuery", () => {
  it("reads only commander-legal cards and no deck", () => {
    const { sql } = catalogQuery(db).toSQL();
    expect(sql).toContain('"cards"."commander_legal" = $');
    expect(sql).not.toContain("deck");
  });
});

describe("toStrategyCard", () => {
  it("drops lands, including a land's back face read from the front", () => {
    expect(toStrategyCard(row("Land — Forest"))).toBeNull();
    expect(toStrategyCard(row("Artifact Land"))).toBeNull();
    expect(toStrategyCard(row("Instant // Land"))).not.toBeNull();
  });

  it("drops a non-game card, and reads a missing label row as no themes", () => {
    expect(toStrategyCard(row("Token Creature — Elf", { layout: "token" }))).toBeNull();
    expect(toStrategyCard(row("Artifact"))?.themes).toEqual([]);
  });
});

describe("loadStrategyBaseline", () => {
  beforeEach(() => vi.mocked(catalogGeneration).mockResolvedValue("g1"));

  it("reads the catalog once per generation, and again when it moves", async () => {
    const read = vi.fn(async () => [row("Artifact"), row("Sorcery"), row("Land")]);
    const a = await loadStrategyBaseline(1, read);
    await loadStrategyBaseline(2, read);
    expect(read).toHaveBeenCalledTimes(1);
    expect(a.axes.total).toBe(2);
    vi.mocked(catalogGeneration).mockResolvedValue("g2");
    await loadStrategyBaseline(3, read);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("builds the counts from the same rule the deck read uses", () => {
    const b = baselineFromRows([row("Artifact", { themes: ["mill"] }), row("Land — Island", { themes: ["mill"] })]);
    expect(b.themes.get("mill")).toBe(1);
  });
});

describe("loadDeckStrategy", () => {
  it("reads nothing with the switch off, and with the Analysis tab off", async () => {
    const spy = vi.spyOn(db, "select");
    expect(await loadDeckStrategy("u", "d", {} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(await loadDeckStrategy("u", "d", { STRATEGY_FOCUS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("strategyFocusEnabled", () => {
  it("needs the exact string 'true' on both its own switch and the Analysis tab", async () => {
    const { strategyFocusEnabled } = await import("./flag");
    const env = (own: string | undefined, tab: string | undefined) =>
      ({ STRATEGY_FOCUS_ENABLED: own, ANALYSIS_TAB_ENABLED: tab }) as unknown as NodeJS.ProcessEnv;
    expect(strategyFocusEnabled(env("true", "true"))).toBe(true);
    expect(strategyFocusEnabled(env("TRUE", "true"))).toBe(false);
    expect(strategyFocusEnabled(env("true", undefined))).toBe(false);
  });
});
