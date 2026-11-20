import { describe, expect, it } from "vitest";

import { CARD_CAP_CENTS, MAX_SWAPS, MIN_SWAPS, POOL_MAX } from "./constants";
import { buildRepairPrompt, buildUpgradePrompt, poolForPrompt, upgradeReplySchema, UPGRADE_SYSTEM, type PoolCard, type UpgradeInput } from "./prompt";

const pc = (name: string, cents: number | null, inclusion: number | null): PoolCard => ({ oracleId: `o-${name}`, name, manaCost: "{1}", typeLine: "Artifact", roles: "ramp", cents, inclusion, oracle: "x" });
const input: UpgradeInput = {
  deckName: "Keen Engineering",
  deck: [
    { name: "Commander Card", manaCost: null, typeLine: "Legendary Creature", roles: "", cents: 100, oracle: "", isCommander: true, basic: false, qty: 1 },
    { name: "Weak Card", manaCost: "{2}", typeLine: "Artifact", roles: "", cents: 25, oracle: "does a thing", isCommander: false, basic: false, qty: 1 },
    { name: "Island", manaCost: null, typeLine: "Basic Land", roles: "", cents: 5, oracle: "", isCommander: false, basic: true, qty: 9 },
  ],
  pool: [pc("Skullclamp", 300, 60)],
  strategy: { label: "Artifacts", blurb: "Play many artifacts.", backingNames: ["Weak Card"] },
  otherThemes: ["Fliers"],
  bracketTarget: 3, bracketBefore: 2,
};

describe("poolForPrompt", () => {
  it("drops a card over the cap or unpriced, orders by inclusion, and caps the size", () => {
    const pool = [pc("Cheap Low", 100, 5), pc("Crypt", CARD_CAP_CENTS + 1, 99), pc("Unpriced", null, 90), pc("Cheap High", 200, 50), pc("At Cap", CARD_CAP_CENTS, 40)];
    expect(poolForPrompt(pool, new Set()).map((p) => p.name)).toEqual(["Cheap High", "At Cap", "Cheap Low"]);
    const many = Array.from({ length: POOL_MAX + 20 }, (_, i) => pc(`Card ${i}`, 100, i));
    expect(poolForPrompt(many, new Set())).toHaveLength(POOL_MAX);
  });

  it("leaves out a card already in the deck, so no pool slot is spent on a swap the validator would reject", () => {
    expect(poolForPrompt([pc("Sol Ring", 100, 90), pc("Skullclamp", 300, 60)], new Set(["o-Sol Ring"])).map((p) => p.name)).toEqual(["Skullclamp"]);
  });
});

describe("buildUpgradePrompt", () => {
  it("carries the pick, the other themes, the bracket read, the deck and the pool, with the swap range and the cap stated", () => {
    const { system, user } = buildUpgradePrompt(input);
    expect(system).toContain(`between ${MIN_SWAPS} and ${MAX_SWAPS} swaps`);
    expect(system).toContain("$12.00");
    expect(system).toContain("prefer cards at $10.00 or less");
    expect(user).toContain("CHOSEN STRATEGY: Artifacts. Play many artifacts.");
    expect(user).toContain("Cut the cards that serve: Fliers.");
    expect(user).toContain("bracket 2 today");
    expect(user).toContain("Commander: Commander Card");
    expect(user).toContain("Basic lands: 9x Island");
    expect(user).toContain("Skullclamp | {1} | Artifact | roles: ramp | $3.00 | EDHREC inclusion 60% |");
  });

  it("asks for no bracket, total or plan of the model: those are computed in code", () => {
    const { system, user } = buildUpgradePrompt(input);
    expect(`${system}${user}`).not.toMatch(/bracket_after|buy_total|bracket_before/);
  });
});

describe("buildRepairPrompt", () => {
  it("names the accepted pairs and each rejected line with its reason, and asks only for the missing swaps within the room left", () => {
    const kept = Array.from({ length: 10 }, (_, i) => ({ cutId: `c${i}`, cut: `Cut ${i}`, addId: `a${i}`, add: `Add ${i}`, addCents: 100, reason: "r", cutReason: null, position: i }));
    const { user } = buildRepairPrompt(input, kept, [{ position: 3, rule: "addInDeck", name: "Sol Ring" }, { position: 4, rule: "overCard", name: "Mana Crypt" }]);
    expect(user).toContain("- OUT Cut 0 / IN Add 0");
    expect(user).toContain('"Sol Ring" is already in the deck');
    expect(user).toContain('"Mana Crypt" costs more than $12.00');
    expect(user).toContain(`Give ${MIN_SWAPS - 10} to ${MAX_SWAPS - 10} more swaps`);
  });
});

describe("upgradeReplySchema", () => {
  it("accepts a swaps list and rejects a reply with none", () => {
    expect(upgradeReplySchema.safeParse({ swaps: [{ out: "A", in: "B", reason: "why" }] }).success).toBe(true);
    expect(upgradeReplySchema.safeParse({ plan: "x" }).success).toBe(false);
  });

  it("parses a reason per cut, and a swap without one (fresh start 1/4)", () => {
    const withCut = upgradeReplySchema.safeParse({ swaps: [{ out: "A", in: "B", reason: "why", cutReason: "slow" }] });
    expect(withCut.success && withCut.data.swaps[0].cutReason).toBe("slow");
    const without = upgradeReplySchema.safeParse({ swaps: [{ out: "A", in: "B", reason: "why" }] });
    expect(without.success && without.data.swaps[0].cutReason).toBeUndefined();
    expect(upgradeReplySchema.safeParse({ swaps: [{ out: "A", in: "B", reason: "why", cutReason: "" }] }).success).toBe(false);
    expect(upgradeReplySchema.safeParse({ swaps: [{ out: "A", in: "B", reason: "why", cutReason: "x".repeat(121) }] }).success).toBe(false);
  });
});

describe("the system prompt", () => {
  it("asks for a shorter reason per cut, and the reply shape carries it", () => {
    expect(UPGRADE_SYSTEM).toMatch(/shorter cut reason \(at most about 15 words\)/);
    expect(buildUpgradePrompt(input).user).toContain('"cutReason": "<short cut reason>"');
  });

  it("names no player", () => {
    expect(UPGRADE_SYSTEM).not.toMatch(/\buser\b|\bplayer's name\b|clerk/i);
  });
});
