import { describe, expect, it } from "vitest";
import { validateCardForDeck } from "./add-validation";
import type { CardForValidation, DeckContextForValidation } from "./add-validation";

const greenCommander: DeckContextForValidation = {
  commanderOracleId: "cmdr-oracle-id",
  commanderColorIdentity: ["G"],
  partnerOracleId: null,
  partnerColorIdentity: null,
  built: 0,
};

// The motivating deck: Atreus is Boros, Kratos is Izzet, and the pair is Jeskai.
const jeskaiPair: DeckContextForValidation = {
  commanderOracleId: "atreus",
  commanderColorIdentity: ["R", "W"],
  partnerOracleId: "kratos",
  partnerColorIdentity: ["U", "R"],
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
    expect(validateCardForDeck(illegalCard, greenCommander)).toBe("not-commander-legal");
  });

  it("rejects an off-color card", () => {
    const blueCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["U"],
      oracleId: "blue-card",
    };
    expect(validateCardForDeck(blueCard, greenCommander)).toBe("off-color-identity");
  });

  it("rejects a multicolor card that exceeds the commander's identity", () => {
    const gruulCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["G", "R"],
      oracleId: "gruul-card",
    };
    expect(validateCardForDeck(gruulCard, greenCommander)).toBe("off-color-identity");
  });

  it("rejects the commander oracle id itself", () => {
    const commanderAsCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["G"],
      oracleId: "cmdr-oracle-id",
    };
    expect(validateCardForDeck(commanderAsCard, greenCommander)).toBe("is-commander");
  });

  it("allows a card when deck is at 98 (one slot remaining)", () => {
    const almostFull: DeckContextForValidation = { ...greenCommander, built: 98 };
    expect(validateCardForDeck(legalGreenCard, almostFull)).toBeNull();
  });

  it("allows a card past 99 — the count says Over, the add is not refused", () => {
    const overDeck: DeckContextForValidation = { ...greenCommander, built: 104 };
    expect(validateCardForDeck(legalGreenCard, overDeck)).toBeNull();
  });

  // The bug that made the motivating deck unusable: a white-blue card is in
  // neither commander's identity on its own, and in the pair's identity.
  it("accepts a card inside the union of a pair's identities", () => {
    const azoriusCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["U", "W"],
      oracleId: "azorius-card",
    };
    expect(validateCardForDeck(azoriusCard, jeskaiPair)).toBeNull();
  });

  it("still refuses a card outside the union", () => {
    const blackCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["B"],
      oracleId: "black-card",
    };
    expect(validateCardForDeck(blackCard, jeskaiPair)).toBe("off-color-identity");
  });

  // A commander is not a deck_cards row, and that holds for the second one too.
  it("refuses the partner as a deck card", () => {
    const partnerAsCard: CardForValidation = {
      commanderLegal: true,
      colorIdentity: ["U", "R"],
      oracleId: "kratos",
    };
    expect(validateCardForDeck(partnerAsCard, jeskaiPair)).toBe("is-commander");
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
