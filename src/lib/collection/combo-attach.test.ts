import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "./browse";
import { attachComboPartners } from "./browse-read";

const card = (oracleId: string): BrowseCard =>
  ({ oracleId, name: oracleId, typeLine: "Creature", quantity: 1 }) as unknown as BrowseCard;

const partner = (oracleId: string, name: string, otherPartners?: number) =>
  ({ partnerOracleId: oracleId, partnerName: name, otherPartners }) as never;

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
  // THE ONLY PLUMBING that carries `otherPartners` from the query to the card — and the
  // marker's tooltip counts it. The near-miss cases prove the figure and the `ComboMark`
  // cases prove the sentence; both bypass this handoff, so deleting it left every one of
  // them green while every tooltip said `You own both` over a card with four partners.
  it("carries the count of other partners through to the card", async () => {
    const read = vi.fn().mockResolvedValue(
      new Map([["a", partner("z", "Demonic Consultation", 3)]]),
    );
    const cards = [card("a")];
    await attachComboPartners("u-1", cards, read);
    expect(cards[0].comboOtherPartners).toBe(3);
  });

  // OMITTED AT ZERO rather than sent as 0: the tooltip's plain sentence is the one a lone
  // partner gets, and an explicit 0 would spend payload to say what absence already says.
  it("omits the count when there are no others", async () => {
    const read = vi.fn().mockResolvedValue(
      new Map([["a", partner("z", "Demonic Consultation", 0)]]),
    );
    const cards = [card("a")];
    await attachComboPartners("u-1", cards, read);
    expect(cards[0].comboPartner).toBeTruthy();
    expect("comboOtherPartners" in cards[0]).toBe(false);
  });

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
