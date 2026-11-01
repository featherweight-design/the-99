// /decks/new's two readings of a commander URL: a Help me choose result's press (the results' own
// params beside `commander`) draws the hand-off. Help me choose's switch is retired (always on), so the
// picker always draws its door.

import { beforeEach, describe, expect, it, vi } from "vitest";

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const stub = vi.hoisted(() => ({ answers: vi.fn(), listable: vi.fn() }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/decks/pre-filled-commander", () => ({
  loadPreFilledCommander: async (_u: string, id: string) => ({ oracleId: id, name: "Gishath", typeLine: "Legendary Creature", colorIdentity: ["R", "G", "W"], imageUri: null }),
}));
vi.mock("../../../lib/decks/read", () => ({ listOwnedLegalCommanders: async () => [] }));
vi.mock("../../../lib/intake/history-read", () => ({ hasListableRun: stub.listable }));
vi.mock("../../../lib/intake/hand-off-load", () => ({
  loadHandOffAnswers: stub.answers,
  hasAnswerRows: (a: { themes: unknown[] }) => a.themes.length > 0,
}));

const { default: NewDeckPage } = await import("./page");

type Props = { handOff?: { resultsHref: string; drawBlock: boolean; create: unknown }; helpDoor?: boolean; preconDoor?: boolean; pastRuns?: boolean };
const props = async (sp: Record<string, string>) => ((await NewDeckPage({ searchParams: Promise.resolve(sp) })) as { props: Props }).props;

beforeEach(() => {
  stub.listable.mockReset().mockResolvedValue(true);
  stub.answers.mockReset().mockResolvedValue({ themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 14 }], themeJoin: "all", sets: [], pool: "any", card: null, budgetDollars: 150, bracket: null });
});

describe("/decks/new", () => {
  it("reads a result's press as a hand-off, going back to those results", async () => {
    const p = await props({ commander: COMMANDER, t: "dinosaurs", b: "150", v: "results" });
    expect(p.handOff?.resultsHref).toBe("/commanders/choose?t=dinosaurs&b=150&v=results");
    expect(p.handOff?.drawBlock).toBe(true);
    expect(p.handOff?.create).toEqual({ themes: ["Dinosaurs"], themeJoin: "all", sets: [], pool: "any", cardOracleId: null, budgetDollars: 150, bracket: null, bracketBuys: false });
    // No bracket asked: the Bracket row reads no reach.
    expect((p.handOff as { readReach?: boolean }).readReach).toBe(false);
  });

  it("reads the bracket reach from 3 up", async () => {
    stub.answers.mockResolvedValue({ themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 14 }], themeJoin: "all", sets: [], pool: "any", card: null, budgetDollars: 150, bracket: 3 });
    const on = await props({ commander: COMMANDER, t: "dinosaurs", k: "3", v: "results" });
    expect((on.handOff as { readReach?: boolean }).readReach).toBe(true);
    stub.answers.mockResolvedValue({ themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 14 }], themeJoin: "all", sets: [], pool: "any", card: null, budgetDollars: 150, bracket: 2 });
    const low = await props({ commander: COMMANDER, t: "dinosaurs", k: "2", v: "results" });
    expect((low.handOff as { readReach?: boolean }).readReach).toBe(false);
  });

  it("hands the create no more themes than it takes, so a wide ask still makes its deck", async () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ slug: `t${i}`, label: `Theme ${i}`, pct: null }));
    stub.answers.mockResolvedValue({ themes: nine, themeJoin: "all", sets: [], pool: "any", card: null, budgetDollars: null, bracket: null });
    const p = await props({ commander: COMMANDER, t: nine.map((t) => t.slug).join(","), v: "results" });
    expect((p.handOff?.create as { themes: string[] }).themes).toHaveLength(8);
  });

  it("keeps a past run's mark in Back to results, so the run is not turned into a live page", async () => {
    const p = await props({ commander: COMMANDER, t: "dinosaurs", b: "150", v: "results", r: "00000000-0000-4000-8000-0000000000aa", h: "1" });
    expect(p.handOff?.resultsHref).toMatch(/&h=1$/);
    expect((await props({ commander: COMMANDER, t: "dinosaurs", v: "results" })).handOff?.resultsHref).not.toContain("h=1");
  });

  it("still hands the create the card when only the card's read failed", async () => {
    const CARD = "0000aaaa-0000-4000-8000-000000000001";
    stub.answers.mockResolvedValue({ themes: [], themeJoin: "all", sets: [], pool: "any", card: null, cardUnread: true, budgetDollars: 150, bracket: null });
    const p = await props({ commander: COMMANDER, a: CARD, b: "150", v: "results" });
    expect((p.handOff?.create as { cardOracleId: string | null }).cardOracleId).toBe(CARD);
  });

  it("draws today's page for a commander link that is not a result's press", async () => {
    expect((await props({ commander: COMMANDER, t: "dinosaurs" })).handOff).toBeUndefined();
    expect(stub.answers).not.toHaveBeenCalled();
  });

  it("always offers Help me choose's door to the picker, its switch retired", async () => {
    expect((await props({})).helpDoor).toBe(true);
  });

  it("always offers the precon door to the picker", async () => {
    expect((await props({})).preconDoor).toBe(true);
  });

  it("adds the door's past-runs link only for a player with a run to list", async () => {
    expect((await props({})).pastRuns).toBe(true);
    stub.listable.mockResolvedValue(false);
    expect((await props({})).pastRuns).toBe(false);
  });

  it("draws the door without the link when the read fails, rather than failing the page", async () => {
    stub.listable.mockRejectedValue(new Error("down"));
    expect((await props({})).pastRuns).toBe(false);
  });
});
