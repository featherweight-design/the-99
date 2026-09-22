import { describe, expect, it, vi } from "vitest";
import { attachComboPartners, type BrowseCard } from "./browse";

const card = (oracleId: string): BrowseCard =>
  ({ oracleId, name: oracleId, typeLine: "Creature", quantity: 1 }) as unknown as BrowseCard;

const partner = (oracleId: string, name: string) =>
  ({ partnerOracleId: oracleId, partnerName: name }) as never;

describe("attachComboPartners", () => {
  it("attaches the partner to the card that has one and nothing to the rest", async () => {
    const read = vi.fn().mockResolvedValue(new Map([["a", partner("z", "Demonic Consultation")]]));
    const cards = [card("a"), card("b")];
    await attachComboPartners("u-1", cards, read);

    expect(cards[0].comboPartner).toEqual({ oracleId: "z", name: "Demonic Consultation" });
    expect(cards[1].comboPartner).toBeUndefined();
  });

  // NO ID WINDOW. `/collection` ships every card in one payload and windows client-side, so
  // there is no server page to scope to — and passing all 2,805 ids is the SLOWER form
  // (913ms against 492ms on staging) for the same answers.
  it("asks about the collection rather than a list of ids", async () => {
    const read = vi.fn().mockResolvedValue(new Map());
    await attachComboPartners("u-1", [card("a")], read);
    expect(read).toHaveBeenCalledWith({ userId: "u-1" });
    expect(read.mock.calls[0][0]).not.toHaveProperty("oracleIds");
  });

  // DEGRADES TO SILENCE. A failed read leaves every card without a clause, which is exactly
  // what the absence of a combo looks like — and a list that refused to draw because
  // Spellbook was unreachable would be worse than one that says less.
  it("returns the cards unchanged when the read fails", async () => {
    const read = vi.fn().mockRejectedValue(new Error("down"));
    const cards = [card("a")];
    await expect(attachComboPartners("u-1", cards, read)).resolves.toBe(cards);
    expect(cards[0].comboPartner).toBeUndefined();
  });

  it("does not ask at all for an empty list", async () => {
    const read = vi.fn();
    await attachComboPartners("u-1", [], read);
    expect(read).not.toHaveBeenCalled();
  });
});
