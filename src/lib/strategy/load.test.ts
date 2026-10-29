import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: vi.fn(async () => "g1") }));
vi.mock("../labels/generation", () => ({ labelGeneration: vi.fn(async (): Promise<string | undefined> => "l1") }));

import { db } from "../../db";
import { catalogGeneration } from "../cache/catalog-generation";
import { labelGeneration } from "../labels/generation";
import { LABEL_PROMPT_VERSION, labelInputHash } from "../labels/prompt";
import type { Job } from "../labels/types";
import {
  baselineFromRows, catalogQuery, deckCardsQuery, freshThemes, loadDeckStrategy, loadStrategyBaseline, strategyRead, toStrategyCard,
  versionCardsQuery, type CardRow,
} from "./load";

let n = 0;
/** A card with no label row; `labelled` gives it a FRESH one carrying the themes. */
const row = (typeLine: string, extra: Partial<CardRow> = {}): CardRow => ({
  oracleId: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, name: `Card ${n}`, manaCost: "{2}", oracleText: "Text.",
  layout: "normal", typeLine, manaValue: 3, keywords: [], quantity: 1,
  labels: null, labelModel: null, promptVersion: null, inputHash: null, ...extra,
});
const themeJob = (kind: string): Job => ({
  space: "theme", kind, restrictedTo: null, affects: "self", to: null, method: null, trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
}) as Job;
const labelled = (r: CardRow, themes: string[], model = "m", version = LABEL_PROMPT_VERSION): CardRow => ({
  ...r, labels: themes.map(themeJob), labelModel: model, promptVersion: version,
  inputHash: labelInputHash({ oracleId: r.oracleId, name: r.name, mana_cost: r.manaCost, type_line: r.typeLine, oracle_text: r.oracleText, layout: r.layout }, model, version),
});

describe("deckCardsQuery", () => {
  const { sql, params } = deckCardsQuery(db, "user_1", "deck-1").toSQL();

  it("scopes the deck to its owner", () => {
    expect(sql).toContain('"decks"."user_id" = $');
    expect(params).toContain("user_1");
  });

  it("reads the card's own label row, whole, with the inputs its freshness is judged against", () => {
    expect(sql).toContain('"card_labels"."input_hash"');
    expect(sql).toContain('"cards"."oracle_text"');
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
  beforeEach(() => {
    vi.mocked(catalogGeneration).mockResolvedValue("g1");
    vi.mocked(labelGeneration).mockResolvedValue("l1");
  });

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

  it("reads again when only the labels move, and uncached when their generation is unreadable", async () => {
    const read = vi.fn(async () => [row("Artifact")]);
    vi.mocked(catalogGeneration).mockResolvedValue("g9");
    await loadStrategyBaseline(10, read);
    await loadStrategyBaseline(11, read);
    expect(read).toHaveBeenCalledTimes(1);
    vi.mocked(labelGeneration).mockResolvedValue("l2");
    await loadStrategyBaseline(12, read);
    expect(read).toHaveBeenCalledTimes(2);
    vi.mocked(labelGeneration).mockResolvedValue(undefined);
    await loadStrategyBaseline(13, read);
    await loadStrategyBaseline(14, read);
    expect(read).toHaveBeenCalledTimes(4);
  });

  it("builds the counts from the same rule the deck read uses", () => {
    const b = baselineFromRows([labelled(row("Artifact"), ["mill"]), labelled(row("Land — Island"), ["mill"])]);
    expect(b.themes.get("mill")).toBe(1);
  });
});

describe("loadDeckStrategy", () => {
  it("reads nothing with the Analysis tab off", async () => {
    const spy = vi.spyOn(db, "select");
    expect(await loadDeckStrategy("u", "d", {} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("freshThemes", () => {
  it("reads a fresh label's themes, and nothing from a stale or unregistered one", () => {
    const card = labelled(row("Instant"), ["mill", "tokens"]);
    expect(freshThemes(card)).toEqual(["mill", "tokens"]);
    // The card's text moved since it was labelled: the label describes text it no longer has.
    expect(freshThemes({ ...card, oracleText: "New text." })).toEqual([]);
    expect(freshThemes({ ...card, promptVersion: "not-a-version" })).toEqual([]);
    expect(freshThemes(row("Instant"))).toEqual([]);
  });

  it("keeps a stale card's type-line axes", () => {
    const stale = { ...labelled(row("Artifact"), ["mill"]), oracleText: "Changed." };
    expect(toStrategyCard(stale)).toMatchObject({ typeLine: "Artifact", themes: [] });
  });
});

describe("versionCardsQuery", () => {
  it("reads one version's cards with their label rows", () => {
    const { sql, params } = versionCardsQuery(db, "v-1").toSQL();
    expect(sql).toContain('"deck_version_cards"."version_id" = $');
    expect(sql).toContain('"card_labels"."input_hash"');
    expect(params).toContain("v-1");
  });
});

describe("strategyRead", () => {
  const millRows = (k: number) => Array.from({ length: k }, () => labelled(row("Instant"), ["mill"]));
  const filler = (k: number) => Array.from({ length: k }, () => row("Sorcery"));
  // Mill is rare in this catalog, so a deck of 10 mill cards leans on it.
  const baseline = baselineFromRows([...millRows(5), ...filler(995)]);

  it("draws the focus from the top five, or as a sixth row it still counts", () => {
    const live = [...millRows(10), ...filler(30)];
    const inTop = strategyRead(live, null, baseline, "mill");
    expect(inTop.focus).toMatchObject({ key: "mill", inTop: true, axis: { copies: 10 } });
    const outside = strategyRead(live, null, baseline, "artifacts");
    expect(outside.focus).toMatchObject({ key: "artifacts", inTop: false, axis: { copies: 0, score: 0 } });
  });

  it("reads a key the vocabulary does not name as no focus", () => {
    expect(strategyRead(filler(40), null, baseline, "retiredTheme").focus).toBeNull();
    expect(strategyRead(filler(40), null, baseline, null).focus).toBeNull();
  });

  it("compares with the committed version, and has nothing to compare for a deck with none", () => {
    const committed = [...millRows(10), ...filler(30)];
    const live = [...committed, ...millRows(2)];
    expect(strategyRead(live, committed, baseline, null).pending).toEqual({ mill: { added: 2, removed: 0 } });
    expect(strategyRead(live, null, baseline, null).pending).toBeNull();
  });

  it("counts the pending change on a focus outside the top five", () => {
    const committed = filler(40);
    const live = [...filler(40), row("Artifact")];
    expect(strategyRead(live, committed, baseline, "artifacts").pending).toEqual({ artifacts: { added: 1, removed: 0 } });
  });
});
