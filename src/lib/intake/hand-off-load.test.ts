// The hand-off's loader: every figure the answers block prints is the one the results row printed
// beside that commander, read the same way. Its reads are stubbed; what is tested is how it turns
// them into figures and which answers survive.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ rows: [] as unknown[], themes: vi.fn(), chip: vi.fn() }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: stub.rows })) } }));
vi.mock("./search", () => ({ loadIntakeThemes: stub.themes }));
vi.mock("./rows", () => ({ loadCardChip: stub.chip }));

const { loadHandOffAnswers } = await import("./hand-off-load");
const { emptyParams } = await import("./params");

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const CARD = "0000aaaa-0000-4000-8000-000000000001";
const chip = { oracleId: CARD, name: "Regisaur Alpha", owned: false, price: { kind: "priced", cents: 110 } };
const ask = (over = {}) => ({ ...emptyParams(), results: true, themes: ["dinosaurs"], card: CARD, budgetDollars: 150, bracket: 2 as const, ...over });

beforeEach(() => {
  stub.themes.mockReset().mockResolvedValue([{ slug: "dinosaurs", label: "Dinosaurs", commanders: 40 }, { slug: "tokens", label: "Tokens", commanders: 90 }]);
  stub.chip.mockReset().mockResolvedValue(chip);
  // 1,000 decks, 140 tagged Dinosaurs; the card is in 64.4% of them (EDHREC's percentage).
  stub.rows = [{ deck_count: 1000, tags: [{ slug: "dinosaurs", label: "Dinosaurs", count: 140 }], card_inclusion: 64.4 }];
});

describe("loadHandOffAnswers", () => {
  it("prints the results' own figures: a theme's share and the card's inclusion, as whole percents", async () => {
    const a = await loadHandOffAnswers("u", COMMANDER, ask());
    expect(a.themes).toEqual([{ slug: "dinosaurs", label: "Dinosaurs", pct: 14 }]);
    expect(a.card).toEqual({ ...chip, pct: 64 });
    expect([a.budgetDollars, a.bracket]).toEqual([150, 2]);
  });

  it("prints no figure where the results would not: a theme the commander cannot back, or no inclusion on record", async () => {
    stub.rows = [{ deck_count: 1000, tags: [], card_inclusion: null }];
    const a = await loadHandOffAnswers("u", COMMANDER, ask({ themes: ["dinosaurs", "tokens"] }));
    expect(a.themes).toEqual([{ slug: "dinosaurs", label: "Dinosaurs", pct: null }, { slug: "tokens", label: "Tokens", pct: null }]);
    expect(a.card?.pct).toBeNull();
    // A thin commander backs no theme, whatever its tags say.
    stub.rows = [{ deck_count: 5, tags: [{ slug: "dinosaurs", label: "Dinosaurs", count: 5 }], card_inclusion: 10 }];
    expect((await loadHandOffAnswers("u", COMMANDER, ask())).themes[0].pct).toBeNull();
  });

  it("keeps what the results keep: a slug no longer offered, labeled by its slug; and drops a card that is no card", async () => {
    stub.chip.mockResolvedValue(null);
    const a = await loadHandOffAnswers("u", COMMANDER, ask({ themes: ["retired-theme", "dinosaurs"] }));
    expect(a.themes.map((t) => [t.slug, t.label])).toEqual([["retired-theme", "retired-theme"], ["dinosaurs", "Dinosaurs"]]);
    expect(a.card).toBeNull();
  });

  it("reads nothing it was not asked for", async () => {
    const a = await loadHandOffAnswers("u", COMMANDER, ask({ themes: [], card: null }));
    expect(stub.themes).not.toHaveBeenCalled();
    expect(stub.chip).not.toHaveBeenCalled();
    expect([a.themes, a.card]).toEqual([[], null]);
  });
});
