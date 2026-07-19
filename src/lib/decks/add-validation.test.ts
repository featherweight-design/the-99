import { describe, expect, it } from "vitest";
import { validateCardForDeck } from "./add-validation";
import type { CardForValidation, DeckContextForValidation } from "./add-validation";

const greenCommander: DeckContextForValidation = {
  commanderOracleId: "cmdr-oracle-id",
  commanderColorIdentity: ["G"],
  built: 0,
};

const legalGreenCard: CardForValidation = {
  commanderLegal: true,
  colorIdentity: ["G"],
  oracleId: "some-green-card",
};

const colorlessCard: CardForValidation = {
  commanderLegal: true,
  colorIdentity: [],
  oracleId: "colorless-card",
};

describe("validateCardForDeck", () => {
  it("allows an on-color legal card", () => {
    expect(validateCardForDeck(legalGreenCard, greenCommander)).toBeNull();
  });

  it("allows a colorless card in any deck", () => {
    expect(validateCardForDeck(colorlessCard, greenCommander)).toBeNull();
  });

  it("rejects a non-legal card", () => {
    const illegalCard: CardForValidation = { ...legalGreenCard, commanderLegal: false };
    const result = validateCardForDeck(illegalCard, greenCommander);
    expect(result).not.toBeNull();
    expect(result).toContain("not legal");
  });

  it("rejects an off-color card", () => {
    const blueCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["U"],
      oracleId: "blue-card",
    };
    const result = validateCardForDeck(blueCard, greenCommander);
    expect(result).not.toBeNull();
    expect(result).toContain("color identity");
  });

  it("rejects a multicolor card that exceeds the commander's identity", () => {
    const gruulCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["G", "R"],
      oracleId: "gruul-card",
    };
    const result = validateCardForDeck(gruulCard, greenCommander);
    expect(result).not.toBeNull();
  });

  it("rejects the commander oracle id itself", () => {
    const commanderAsCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["G"],
      oracleId: "cmdr-oracle-id",
    };
    const result = validateCardForDeck(commanderAsCard, greenCommander);
    expect(result).not.toBeNull();
    expect(result).toContain("commander");
  });

  it("rejects any card when deck is already at 99", () => {
    const fullDeck: DeckContextForValidation = { ...greenCommander, built: 99 };
    const result = validateCardForDeck(legalGreenCard, fullDeck);
    expect(result).not.toBeNull();
    expect(result).toContain("full");
  });

  it("allows a card when deck is at 98 (one slot remaining)", () => {
    const almostFull: DeckContextForValidation = { ...greenCommander, built: 98 };
    expect(validateCardForDeck(legalGreenCard, almostFull)).toBeNull();
  });

  it("allows a basic land (colorless identity) in any mono-color deck", () => {
    const basicLand: CardForValidation = {
      commanderLegal: true,
      colorIdentity: [],
      oracleId: "forest",
    };
    expect(validateCardForDeck(basicLand, greenCommander)).toBeNull();
  });
});
