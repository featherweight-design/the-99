import { describe, expect, it, vi } from "vitest";
import type { Candidate, CandidateHalf, ChangeCandidates } from "../../lib/commander-change/candidates";
import { partnerAddCopy } from "../../lib/copy/partner-add";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../lib/commander-change/actions", () => ({
  readChangeCandidates: vi.fn(),
  changeCommander: vi.fn(),
  readOpenedCards: vi.fn(),
}));

const { isKeptPartner, widenedIdentity, pipsOf } = await import("./partner-add-section");

const half = (oracleId: string, inDeck: boolean): CandidateHalf => ({ oracleId, name: oracleId, inDeck } as CandidateHalf);
const pair = (a: CandidateHalf, b: CandidateHalf) => ({ halves: [a, b] }) as unknown as Candidate;
const current = (id: string) => [{ oracleId: id }] as unknown as ChangeCandidates["current"];

describe("isKeptPartner", () => {
  it("is true for a pair that holds the lone commander and a card already in the 99", () => {
    expect(isKeptPartner(pair(half("a", false), half("b", true)), current("a"))).toBe(true);
  });
  it("is false when the partner is outside the deck, so a card must leave", () => {
    expect(isKeptPartner(pair(half("a", false), half("b", false)), current("a"))).toBe(false);
  });
  it("is false when the pair does not hold the current commander", () => {
    expect(isKeptPartner(pair(half("x", false), half("b", true)), current("a"))).toBe(false);
  });
});

describe("widenedIdentity", () => {
  it("unions the deck's colors with the colors the partner opens, in WUBRG order", () => {
    expect(widenedIdentity(["G"], ["W", "B"])).toEqual(["W", "B", "G"]);
    expect(pipsOf(["G", "W"])).toBe("{W}{G}");
  });
});

describe("partnerAddCopy", () => {
  it("says nothing leaves in the lede when the deck has room, and a pick when it does not", () => {
    expect(partnerAddCopy.section.lede("Tormod", false)).toContain("nothing leaves");
    expect(partnerAddCopy.section.lede("Tormod", true)).toContain("you pick the card that leaves");
  });
  it("names the land ceiling the cut rule uses", () => {
    expect(partnerAddCopy.confirm.reasonLands(38, 36)).toContain("38 lands");
    expect(partnerAddCopy.confirm.reasonLands(38, 36)).toContain("at most 36");
  });
});
