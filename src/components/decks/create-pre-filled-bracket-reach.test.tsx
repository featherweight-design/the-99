// The hand-off's Bracket row with the bracket reach read (bracket reach PR 3b, Design R1b board C):
// pending, reached, the short choice (Create waits for a pick, and each pick submits its own args),
// over budget, own-only, nothing reaches, and a failed read falling back to today's line.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HandOffReach } from "../../lib/intake/hand-off-reach";

const createDeck = vi.hoisted(() => vi.fn(async () => {}));
const readReach = vi.hoisted(() => vi.fn());
vi.mock("../../app/decks/actions", () => ({ createDeck }));
vi.mock("../../app/decks/new/hand-off-actions", () => ({ handOffBracketReach: readReach }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

const { CreatePreFilled } = await import("./create-pre-filled");

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const base = { oracleId: COMMANDER, name: "Sai, Master Thopterist", typeLine: "Legendary Creature", colorIdentity: ["U"], imageUri: null };
const chip = (oracleId: string, name: string, owned = false, cents = 3200) =>
  ({ oracleId, name, imageUri: null, owned, held: null, price: { kind: "priced", cents } as const });
const handOff = (over: { pool?: "any" | "own"; budgetDollars?: number | null } = {}) => ({
  answers: {
    themes: [{ slug: "artifacts", label: "Artifacts", pct: 82 }], card: null, cardUnread: false, themeJoin: "all" as const,
    sets: [], pool: over.pool ?? "any" as const, budgetDollars: over.budgetDollars === undefined ? 150 : over.budgetDollars, bracket: 3 as const,
  },
  create: {
    themes: ["Artifacts"], cardOracleId: null, budgetDollars: over.budgetDollars === undefined ? 150 : over.budgetDollars,
    bracket: 3, bracketBuys: false, pool: over.pool ?? "any",
  },
  resultsHref: "/decks/new/choose?v=results",
  changeHref: "/decks/new/choose",
  drawBlock: true,
  readReach: true,
});
const SHORT: HandOffReach = {
  target: 3, permits: [1, 2], placed: [],
  buy: { cards: [chip("rhystic", "Rhystic Study")], cents: 3200, overBudget: false, overCents: 0, raisedBudgetCents: null, budgetLeftCents: 15000, selectedBuys: [] },
};
const rowText = (key: string) => screen.getAllByTestId("hand-off-row").find((r) => r.textContent?.startsWith(key))!.textContent;
const createButton = () => screen.getByRole("button", { name: /Create deck/ });
const nameIt = () => fireEvent.change(screen.getByLabelText("Deck name"), { target: { value: "Sai’s Workshop" } });
const submit = () => act(async () => fireEvent.submit(screen.getByLabelText("Deck name").closest("form")!));
const settle = async (reach: HandOffReach | null, ho: Parameters<typeof CreatePreFilled>[0]["handOff"] = handOff()) => {
  readReach.mockResolvedValueOnce(reach);
  await act(async () => { render(<CreatePreFilled {...base} handOff={ho} />); });
};

beforeEach(() => {
  createDeck.mockClear();
  readReach.mockReset();
});

describe("the hand-off's Bracket row, read", () => {
  it("is pending until the read lands, with Create held", async () => {
    readReach.mockReturnValue(new Promise(() => {}));
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    nameIt();
    expect(screen.getByTestId("hand-off-reach-pending").getAttribute("aria-busy")).toBe("true");
    expect(createButton().hasAttribute("disabled")).toBe(true);
    expect(readReach).toHaveBeenCalledWith(COMMANDER, handOff().create, []);
  });

  it("reached: names the owned Game Changer, which opens like any card, and Create is live", async () => {
    await settle({ target: 3, permits: [3], placed: [{ ...chip("rift", "Cyclonic Rift", true), gameChanger: true }], buy: null });
    expect(rowText("Bracket")).toBe("Bracket3 · UpgradedThe fill places Cyclonic Rift, a Game Changer you own, so the deck is bracket 3.");
    expect(screen.getByTestId("hand-off-reach-card").tagName).toBe("BUTTON");
    nameIt();
    expect(createButton().hasAttribute("disabled")).toBe(false);
  });

  it("reached by a combo: names both pieces without calling them a Game Changer", async () => {
    await settle({ target: 3, permits: [3], placed: [
      { ...chip("a", "Dramatic Reversal", true), gameChanger: false },
      { ...chip("b", "Isochron Scepter", true), gameChanger: false },
    ], buy: null });
    expect(rowText("Bracket")).toBe("Bracket3 · UpgradedThe fill places Dramatic Reversal and Isochron Scepter from your cards, so the deck is bracket 3.");
  });

  it("short: two rows, neither picked; Create waits with the line in the error slot", async () => {
    await settle(SHORT);
    nameIt();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => (r as HTMLInputElement).checked)).toEqual([false, false]);
    expect(rowText("Bracket")).toBe(
      "Bracket3 · UpgradedFrom your cards this deck is bracket 1-2. Choose how to build it:"
      + "From my collectionBuilds from your cards: bracket 1-2."
      + "Hit bracket 3Adds Rhystic Study, about $32, to buy. It joins the deck’s Shopping list.",
    );
    expect(screen.getByTestId("bracket-choice-waiting").textContent).toBe("Choose how to build it under Bracket to create the deck.");
    expect(createButton().hasAttribute("disabled")).toBe(true);
    await submit();
    expect(createDeck).not.toHaveBeenCalled();
  });

  it("From my collection submits the highest bracket the deck permits and no buy", async () => {
    await settle(SHORT);
    nameIt();
    fireEvent.click(screen.getByTestId("bracket-choice-mine"));
    expect(screen.queryByTestId("bracket-choice-waiting")).toBeNull();
    expect(createButton().hasAttribute("disabled")).toBe(false);
    await submit();
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Sai’s Workshop", undefined, null, { ...handOff().create, bracket: 2, bracketBuys: false });
  });

  it("Hit submits the target with the buy, and the Budget row names what it pays for first", async () => {
    await settle(SHORT);
    nameIt();
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$150Rhystic Study takes $32 of it first. The fill buys the rest in its own order while the price fits, and finishes with basics.");
    await submit();
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Sai’s Workshop", undefined, null, { ...handOff().create, bracket: 3, bracketBuys: true });
  });

  it("a press on a card name opens the card and picks nothing", async () => {
    await settle(SHORT);
    fireEvent.click(within(screen.getByTestId("bracket-choice-hit")).getByTestId("hand-off-reach-card"));
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).checked)).toEqual([false, false]);
  });

  it("over budget: Hit stays pickable, says what it costs against the budget, and raises it when picked", async () => {
    await settle({
      target: 3, permits: [1, 2], placed: [],
      buy: { cards: [chip("rhystic", "Rhystic Study"), chip("remora", "Mystic Remora", false, 2600)], cents: 5800, overBudget: true, overCents: 800, raisedBudgetCents: 5800, budgetLeftCents: 5000, selectedBuys: [] },
    }, handOff({ budgetDollars: 50 }));
    const hit = screen.getByTestId("bracket-choice-hit").textContent;
    expect(hit).toBe("Hit bracket 3over budgetAdds Rhystic Study and Mystic Remora, about $58, to buy: $8 over your $50 budget. Picking it raises the budget to $58.");
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$58Rhystic Study and Mystic Remora take $58 of it. The fill buys nothing else for the 99.");
  });

  it("over what a placed card LEFT: says how far past the remainder, not the whole budget (round 3)", async () => {
    // $50 budget, a $25 build-around card bought first, a $32 set: $7 more than the $25 left.
    await settle({
      target: 3, permits: [1, 2], placed: [],
      buy: { cards: [chip("rhystic", "Rhystic Study")], cents: 3200, overBudget: true, overCents: 700, raisedBudgetCents: 5700, budgetLeftCents: 2500, selectedBuys: [] },
    }, handOff({ budgetDollars: 50 }));
    expect(screen.getByTestId("bracket-choice-hit").textContent).toBe(
      "Hit bracket 3over budgetAdds Rhystic Study, about $32, to buy: $7 more than the $25 left of your $50 budget. Picking it raises the budget to $57.",
    );
  });

  it("a build-around card to buy with no price stays said when Hit is picked, its cost left out (round 3)", async () => {
    const unpriced = { oracleId: "0000aaaa-0000-4000-8000-000000000009", name: "Mox Opal", imageUri: null, owned: false, held: null,
      price: { kind: "absent" } as const, pct: null };
    const ho = (pool: "any" | "own", budgetDollars = 150) => {
      const h = handOff({ pool, budgetDollars });
      return { ...h, answers: { ...h.answers, card: unpriced } };
    };
    await settle(SHORT, ho("any"));
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$150Mox Opal has no price on record, so the budget can’t count it, and it is left out of the total. "
      + "Rhystic Study takes $32 of it first. The fill buys the rest in its own order while the price fits, and finishes with basics.");
    cleanup();
    // Own-only: never "the fill buys nothing else" without the card it buys.
    await settle(SHORT, ho("own"));
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$150Mox Opal has no price on record, so the budget can’t count it, and it is left out of the total. "
      + "Rhystic Study takes $32 of it. The fill buys nothing else for the 99.");
    cleanup();
    // Over budget: the same disclosure.
    await settle({ ...SHORT, buy: { ...SHORT.buy!, overBudget: true, overCents: 200, raisedBudgetCents: 3200, budgetLeftCents: 3000 } }, ho("any", 30));
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$32Mox Opal has no price on record, so the budget can’t count it, and it is left out of the total. "
      + "Rhystic Study takes $32 of it. The fill buys nothing else for the 99.");
  });

  it("a selected purchase plus Hit over budget: the line names it with the set, never 'nothing else' without it (round 5)", async () => {
    // No build-around card, a $25 pick to buy, a $32 set, a $50 budget: $25 left, raised to $57.
    await settle({
      target: 3, permits: [1, 2], placed: [],
      buy: {
        cards: [chip("rhystic", "Rhystic Study")], cents: 3200, overBudget: true, overCents: 700, raisedBudgetCents: 5700, budgetLeftCents: 2500,
        selectedBuys: [chip("sol", "Mana Vault", false, 2500)],
      },
    }, handOff({ budgetDollars: 50 }));
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$57Mana Vault and Rhystic Study take $57 of it. The fill buys nothing else for the 99.");
  });

  it("a selected purchase with no price is said and left out, beside a priced one (round 5)", async () => {
    await settle({
      ...SHORT,
      buy: { ...SHORT.buy!, selectedBuys: [chip("sol", "Mana Vault", false, 2500), { ...chip("mox", "Mox Opal"), price: { kind: "notStocked" } as never }] },
    });
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$150Mox Opal has no price on record, so the budget can’t count it, and it is left out of the total. "
      + "Mana Vault and Rhystic Study take $57 of it first. The fill buys the rest in its own order while the price fits, and finishes with basics.");
  });

  it("hands the ?select= picks to the read, as the create gets them (round 3)", async () => {
    readReach.mockResolvedValueOnce(null);
    await act(async () => { render(<CreatePreFilled {...base} selectedOracleIds={["0000aaaa-0000-4000-8000-0000000000aa"]} handOff={handOff()} />); });
    expect(readReach).toHaveBeenCalledWith(COMMANDER, handOff().create, ["0000aaaa-0000-4000-8000-0000000000aa"]);
  });

  it("own-only: Hit names the card from outside the collection, and the budget line never says nothing is bought", async () => {
    await settle(SHORT, handOff({ pool: "own" }));
    expect(screen.getByTestId("bracket-choice-mine").textContent).toBe("From my collectionBuilds from your cards only: bracket 1-2.");
    expect(screen.getByTestId("bracket-choice-hit").textContent).toBe("Hit bracket 3Adds Rhystic Study, about $32, to buy: the one card from outside your collection.");
    expect(rowText("Budget")).toBe("Budget$150The fill buys nothing for the 99.");
    fireEvent.click(screen.getByTestId("bracket-choice-hit"));
    expect(rowText("Budget")).toBe("Budget$150Rhystic Study takes $32 of it. The fill buys nothing else for the 99.");
  });

  it("nothing reaches: a statement with the target's reason, and Create is live", async () => {
    await settle({ target: 3, permits: [1, 2], placed: [], buy: null });
    nameIt();
    expect(rowText("Bracket")).toBe("Bracket3 · UpgradedNo Game Changer or two-card combo the fill can place fits this commander, so the deck is bracket 1-2.");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(createButton().hasAttribute("disabled")).toBe(false);
  });

  it("a failed read falls back to today's ceiling line and leaves Create live", async () => {
    readReach.mockRejectedValueOnce(new Error("down"));
    await act(async () => { render(<CreatePreFilled {...base} handOff={handOff()} />); });
    nameIt();
    expect(rowText("Bracket")).toBe("Bracket3 · UpgradedThe fill keeps every card it chooses inside bracket 3’s limits.");
    expect(createButton().hasAttribute("disabled")).toBe(false);
    await submit();
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Sai’s Workshop", undefined, null, handOff().create);
  });

  it("reads nothing without the flag: today's line, no call", async () => {
    render(<CreatePreFilled {...base} handOff={{ ...handOff(), readReach: false }} />);
    expect(readReach).not.toHaveBeenCalled();
    expect(rowText("Bracket")).toBe("Bracket3 · UpgradedThe fill keeps every card it chooses inside bracket 3’s limits.");
  });

  it("a name-length error wins over the waiting line", async () => {
    await settle(SHORT);
    fireEvent.change(screen.getByLabelText("Deck name"), { target: { value: "   " } });
    // The button is disabled for an empty name; the form's own submit still reports the error.
    await submit();
    expect(screen.queryByTestId("bracket-choice-waiting")).toBeNull();
  });
});
