// /decks/new's two readings of a commander URL: a Help me choose result's press (the results' own
// params beside `commander`) draws the hand-off, and only while the feature is on. Off, the same
// URL draws today's page and the picker draws no door.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const stub = vi.hoisted(() => ({ on: true, precons: false, answers: vi.fn(), listable: vi.fn(), env: null as NodeJS.ProcessEnv | null }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
// The reader's resolved switches: the environment, so `vi.stubEnv` still sets them.
vi.mock("../../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: async () => stub.env ?? ENV_VIEW };
});
vi.mock("../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => stub.on }));
vi.mock("../../../lib/precons/flag", () => ({ preconsEnabled: () => stub.precons }));
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
  stub.on = true;
  stub.precons = false;
  stub.env = null;
  stub.listable.mockReset().mockResolvedValue(true);
  stub.answers.mockReset().mockResolvedValue({ themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 14 }], themeJoin: "all", sets: [], pool: "any", card: null, budgetDollars: 150, bracket: null });
});

describe("/decks/new", () => {
  it("reads a result's press as a hand-off, going back to those results", async () => {
    const p = await props({ commander: COMMANDER, t: "dinosaurs", b: "150", v: "results" });
    expect(p.handOff?.resultsHref).toBe("/decks/new/choose?t=dinosaurs&b=150&v=results");
    expect(p.handOff?.drawBlock).toBe(true);
    expect(p.handOff?.create).toEqual({ themes: ["Dinosaurs"], themeJoin: "all", sets: [], pool: "any", cardOracleId: null, budgetDollars: 150, bracket: null });
  });

  it("hands the hand-off read the reader's resolved env, not the environment", async () => {
    // The card chip's claim read decides NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from it: a dropped
    // argument reads the environment, which has both the other way.
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    stub.env = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
    try {
      await props({ commander: COMMANDER, t: "dinosaurs", v: "results" });
      expect(stub.answers.mock.calls[0][3] === stub.env).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
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

  it("with the feature off, draws today's page for the same URL, and the picker no door", async () => {
    stub.on = false;
    expect((await props({ commander: COMMANDER, t: "dinosaurs", b: "150", v: "results" })).handOff).toBeUndefined();
    expect(stub.answers).not.toHaveBeenCalled();
    expect((await props({})).helpDoor).toBe(false);
  });

  it("offers the precon door to the picker only while PRECONS_ENABLED is on", async () => {
    expect((await props({})).preconDoor).toBe(false);
    stub.precons = true;
    expect((await props({})).preconDoor).toBe(true);
  });

  it("adds the door's past-runs link only for a player with a run to list, and never reads with the feature off", async () => {
    expect((await props({})).pastRuns).toBe(true);
    stub.listable.mockResolvedValue(false);
    expect((await props({})).pastRuns).toBe(false);
    stub.listable.mockClear();
    stub.on = false;
    expect((await props({})).pastRuns).toBe(false);
    expect(stub.listable).not.toHaveBeenCalled();
  });

  it("draws the door without the link when the read fails, rather than failing the page", async () => {
    stub.listable.mockRejectedValue(new Error("down"));
    expect((await props({})).pastRuns).toBe(false);
  });
});
