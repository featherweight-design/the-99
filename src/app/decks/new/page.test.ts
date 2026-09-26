// /decks/new's two readings of a commander URL: a Help me choose result's press (the results' own
// params beside `commander`) draws the hand-off, and only while the feature is on. Off, the same
// URL draws today's page and the picker draws no door.

import { beforeEach, describe, expect, it, vi } from "vitest";

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const stub = vi.hoisted(() => ({ on: true, answers: vi.fn() }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => stub.on }));
vi.mock("../../../lib/decks/pre-filled-commander", () => ({
  loadPreFilledCommander: async (_u: string, id: string) => ({ oracleId: id, name: "Gishath", typeLine: "Legendary Creature", colorIdentity: ["R", "G", "W"], imageUri: null }),
}));
vi.mock("../../../lib/decks/read", () => ({ listOwnedLegalCommanders: async () => [] }));
vi.mock("../../../lib/intake/hand-off-load", () => ({
  loadHandOffAnswers: stub.answers,
  hasAnswerRows: (a: { themes: unknown[] }) => a.themes.length > 0,
}));

const { default: NewDeckPage } = await import("./page");

type Props = { handOff?: { resultsHref: string; drawBlock: boolean; create: unknown }; helpDoor?: boolean };
const props = async (sp: Record<string, string>) => ((await NewDeckPage({ searchParams: Promise.resolve(sp) })) as { props: Props }).props;

beforeEach(() => {
  stub.on = true;
  stub.answers.mockReset().mockResolvedValue({ themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 14 }], themeJoin: "all", sets: [], pool: "any", card: null, budgetDollars: 150, bracket: null });
});

describe("/decks/new", () => {
  it("reads a result's press as a hand-off, going back to those results", async () => {
    const p = await props({ commander: COMMANDER, t: "dinosaurs", b: "150", v: "results" });
    expect(p.handOff?.resultsHref).toBe("/decks/new/choose?t=dinosaurs&b=150&v=results");
    expect(p.handOff?.drawBlock).toBe(true);
    expect(p.handOff?.create).toEqual({ themes: ["Dinosaurs"], themeJoin: "all", sets: [], pool: "any", cardOracleId: null, budgetDollars: 150, bracket: null });
  });

  it("hands the create no more themes than it takes, so a wide ask still makes its deck", async () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ slug: `t${i}`, label: `Theme ${i}`, pct: null }));
    stub.answers.mockResolvedValue({ themes: nine, themeJoin: "all", sets: [], pool: "any", card: null, budgetDollars: null, bracket: null });
    const p = await props({ commander: COMMANDER, t: nine.map((t) => t.slug).join(","), v: "results" });
    expect((p.handOff?.create as { themes: string[] }).themes).toHaveLength(8);
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

  it("with the feature off, draws today's page for the same URL, and the picker no door", async () => {
    stub.on = false;
    expect((await props({ commander: COMMANDER, t: "dinosaurs", b: "150", v: "results" })).handOff).toBeUndefined();
    expect(stub.answers).not.toHaveBeenCalled();
    expect((await props({})).helpDoor).toBe(false);
  });
});
