import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";
import type { CreateAnswers } from "../../lib/intake/answers";

// *Hit bracket N* through `createDeck` and its retry (bracket reach PR 3b): what reaches the plan,
// and what `decks.answer_bracket_buys` and `answer_budget_cents` store. The plan is stubbed, so what
// is proved is the action's honoring rule; the placing is `fill-plan-bracket-buys.test.ts`'s.
const m = vi.hoisted(() => ({
  env: {} as NodeJS.ProcessEnv,
  plan: vi.fn(),
  inserts: [] as { table: string; values: unknown }[],
  updates: [] as { table: string; values: unknown }[],
  deck: null as Record<string, unknown> | null,
  failTransaction: false,
}));

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const commander = {
  oracleId: COMMANDER, name: "Sai", colorIdentity: ["U"], manaCost: "{2}{U}", commanderLegal: true,
  typeLine: "Legendary Creature — Human Artificer", oracleText: "Whenever you cast an artifact spell", layout: "normal",
};

vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: vi.fn(async () => m.env) }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (f: unknown) => f }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw Object.assign(new Error("redirect"), { __nextRedirect: true }); }) }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("../../lib/decks/fill-plan", () => ({ buildFillPlan: m.plan }));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: vi.fn() }));
vi.mock("../../lib/decks/fill-passes", async (importActual) => ({
  ...(await importActual<typeof import("../../lib/decks/fill-passes")>()),
  recordFillPass: vi.fn(async () => {}),
}));
vi.mock("../../lib/decks/touch", () => ({ touchDeck: vi.fn(async () => {}) }));
vi.mock("../../lib/decks/costs-of", () => ({ placedCardsOf: vi.fn(async () => []) }));
vi.mock("../../lib/decks/read", async (importActual) => ({
  ...(await importActual<typeof import("../../lib/decks/read")>()),
  requireDeck: vi.fn(async () => m.deck),
}));
vi.mock("../../db", () => {
  const nameOf = (t: unknown) => (t as Record<symbol, string>)[Symbol.for("drizzle:Name")];
  const select = () => ({
    from: (t: unknown) => {
      const rows = nameOf(t) === "cards" ? [commander] : [];
      const where = () => Object.assign(Promise.resolve(rows), { limit: async () => rows });
      return { where };
    },
  });
  const insert = (t: unknown) => ({
    values: (values: unknown) => {
      m.inserts.push({ table: nameOf(t), values });
      return { returning: async () => [{ id: "deck-1" }], onConflictDoNothing: async () => {} };
    },
  });
  const update = (t: unknown) => ({ set: (values: unknown) => ({ where: async () => { m.updates.push({ table: nameOf(t), values }); } }) });
  const tx = { select, insert, update, execute: async () => ({ rows: [] }) };
  return {
    db: {
      select, insert, update,
      transaction: async (fn: (t: typeof tx) => unknown) => {
        if (m.failTransaction) throw new Error("transaction failed");
        return fn(tx);
      },
    },
  };
});

const { createDeck, fillDeck } = await import("./actions");

const ON = envViewWith({ BRACKET_REACH_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true" });
const asked = { themes: [], cardOracleId: null, budgetDollars: 50, bracket: 3, bracketBuys: true };
const shortPlan = (over: Record<string, unknown> = {}) => ({
  rows: [{ oracleId: "rhystic", quantity: 1, role: "draw", source: "bracket" }],
  bracketReach: { target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [], buy: { raisers: ["rhystic"], buyCents: 5800, overBudget: true } },
  ...over,
});
const run = async (a: CreateAnswers) => {
  try {
    await createDeck(COMMANDER, "Sai’s Workshop", [], null, a);
  } catch (err) {
    if (!(err as { __nextRedirect?: boolean }).__nextRedirect) throw err;
  }
};
const deckInsert = () => m.inserts.filter((i) => i.table === "decks").at(-1)!.values as Record<string, unknown>;
const planAnswers = () => m.plan.mock.calls[0][3].answers;

beforeEach(() => {
  m.env = ON;
  m.inserts.length = 0;
  m.updates.length = 0;
  m.deck = null;
  m.failTransaction = false;
  m.plan.mockReset().mockResolvedValue(shortPlan({ bracketBought: true, raisedBudgetCents: 5800, budgetRaised: true }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createDeck: Hit bracket N", () => {
  it("asks the plan to buy, and stores the pick and the raised budget when the plan placed the set", async () => {
    await run(asked);
    expect(planAnswers()).toMatchObject({ bracket: 3, bracketBuys: true, budgetCents: 5000 });
    expect(deckInsert()).toMatchObject({ filled: true, answerBracketBuys: true, answerBudgetCents: 5800, answerBudgetRaised: true });
  });

  it("stores the budget as not raised for a Hit within budget", async () => {
    m.plan.mockResolvedValue(shortPlan({ bracketBought: true }));
    await run(asked);
    expect(deckInsert()).toMatchObject({ answerBracketBuys: true, answerBudgetCents: 5000, answerBudgetRaised: false });
  });

  it("stores false, and the budget asked, when the plan's own reach had nothing to buy", async () => {
    m.plan.mockResolvedValue({ rows: [], bracketReach: { target: 3, kind: "collection", raisers: [] } });
    await run(asked);
    expect(deckInsert()).toMatchObject({ answerBracketBuys: false, answerBudgetCents: 5000, answerBudgetRaised: false });
  });

  it("drops the pick with the reader's switch off: nothing asked of the plan, false stored", async () => {
    m.env = envViewWith({ BRACKET_REACH_ENABLED: "off", HELP_ME_CHOOSE_ENABLED: "true" });
    await run(asked);
    expect(planAnswers().bracketBuys).toBe(false);
    expect(deckInsert()).toMatchObject({ answerBracketBuys: false, answerBudgetCents: 5000 });
  });

  it("ignores the pick under bracket 3 and with no bracket", async () => {
    await run({ ...asked, bracket: 2 });
    expect(planAnswers().bracketBuys).toBe(false);
    expect(deckInsert()).toMatchObject({ answerBracketBuys: false });
  });

  it("keeps the pick on the empty deck a failed fill leaves, so the retry places the same set", async () => {
    m.failTransaction = true;
    await run(asked);
    expect(deckInsert()).toMatchObject({ filled: false, answerBracketBuys: true, answerBudgetCents: 5000 });
  });

  it("From my collection submits the lower bracket and no buy, and stores that", async () => {
    m.plan.mockResolvedValue({ rows: [], bracketReach: { target: 2, kind: "fixed" } });
    await run({ ...asked, bracket: 2, bracketBuys: false });
    expect(planAnswers()).toMatchObject({ bracket: 2, bracketBuys: false });
    expect(deckInsert()).toMatchObject({ answerBracket: 2, answerBracketBuys: false });
  });
});

describe("fillDeck: the retry reads the pick back", () => {
  const stored = { id: "deck-1", userId: "user_1", commanderOracleId: COMMANDER, partnerOracleId: null,
    answerBudgetCents: 5000, answerBracket: 3, answerCardOracleId: null, answerOwnedOnly: false, answerBracketBuys: true };

  it("fills to the stored pick and stores the budget it raised", async () => {
    m.deck = stored;
    await fillDeck("deck-1");
    expect(planAnswers()).toMatchObject({ bracket: 3, bracketBuys: true, budgetCents: 5000, budgetRaised: false });
    expect(m.updates.find((u) => u.table === "decks")!.values)
      .toMatchObject({ filled: true, answerBracketBuys: true, answerBudgetCents: 5800, answerBudgetRaised: true });
  });

  it("hands a stored raise to the plan, and rewrites it from the retry's own reach", async () => {
    m.deck = { ...stored, answerBudgetCents: 5800, answerBudgetRaised: true };
    m.plan.mockResolvedValue(shortPlan({ bracketBought: true }));
    await fillDeck("deck-1");
    expect(planAnswers()).toMatchObject({ budgetCents: 5800, bracketBuys: true, budgetRaised: true });
    expect(m.updates.find((u) => u.table === "decks")!.values).toMatchObject({ answerBracketBuys: true, answerBudgetRaised: false });
  });

  it("fills with no buy for a deck that never picked Hit, writing neither column", async () => {
    m.deck = { ...stored, answerBracketBuys: false };
    await fillDeck("deck-1");
    expect(planAnswers().bracketBuys).toBe(false);
    expect(m.updates.find((u) => u.table === "decks")!.values).toEqual({ filled: true });
  });
});

// A Help me choose create that answered nothing gated (no budget, no bracket, no build-around card)
// is still a Help me choose fill: "Any cards" buys from the commander's best-played list. Its
// failed create's retry must run that fill, not the plain build.
describe("fillDeck: a Help me choose deck with no gated answer", () => {
  const unanswered = { themes: ["Artifacts"], cardOracleId: null, budgetDollars: null, bracket: null, bracketBuys: false };

  it("marks the empty deck a failed fill leaves as asked", async () => {
    m.failTransaction = true;
    await run(unanswered);
    expect(deckInsert()).toMatchObject({ filled: false, answerAsked: true, answerBudgetCents: null, answerBracket: null });
  });

  it("retries with the answers, so the fill is Help me choose's and not the plain build", async () => {
    m.deck = { id: "deck-1", userId: "user_1", commanderOracleId: COMMANDER, partnerOracleId: null,
      answerAsked: true, answerBudgetCents: null, answerBracket: null, answerCardOracleId: null,
      answerOwnedOnly: false, answerBracketBuys: false, answerBudgetRaised: false };
    await fillDeck("deck-1");
    expect(planAnswers()).toEqual({ budgetCents: null, bracket: null, cardOracleId: null, bracketBuys: false, budgetRaised: false });
  });

  it("fills a deck started any other way as the plain build", async () => {
    m.deck = { id: "deck-1", userId: "user_1", commanderOracleId: COMMANDER, partnerOracleId: null,
      answerAsked: false, answerBudgetCents: null, answerBracket: null, answerCardOracleId: null,
      answerOwnedOnly: false, answerBracketBuys: false, answerBudgetRaised: false };
    await fillDeck("deck-1");
    expect(planAnswers()).toBeUndefined();
  });
});
