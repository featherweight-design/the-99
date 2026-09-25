// The create page's two readings: today's, byte for byte, and the one a Help me choose result's
// press brings the player to (HANDOFF §6), whose every way back leads to those results and whose
// create carries the answers to the fill.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const createDeck = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../../app/decks/actions", () => ({ createDeck }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

const { CreatePreFilled } = await import("./create-pre-filled");

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const CARD = "0000aaaa-0000-4000-8000-000000000001";
const base = { oracleId: COMMANDER, name: "Gishath, Sun's Avatar", typeLine: "Legendary Creature", colorIdentity: ["R", "G", "W"], imageUri: null };
const RESULTS = "/decks/new/choose?t=dinosaurs&b=150&v=results";
const handOff = (drawBlock = true) => ({
  answers: { themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 91 }], card: null, budgetDollars: 150, bracket: null },
  create: { themes: ["Dinosaurs"], cardOracleId: null, budgetDollars: 150, bracket: null },
  resultsHref: RESULTS,
  changeHref: "/decks/new/choose?t=dinosaurs&b=150",
  drawBlock,
});

describe("CreatePreFilled", () => {
  it("is today's page when no result brought the player here", () => {
    render(<CreatePreFilled {...base} />);
    expect(screen.getByText("‹ Commanders · Gishath, Sun's Avatar").getAttribute("href")).toBe("/decks/new");
    expect(screen.getByRole("link", { name: "Back to commander picker" }).getAttribute("href")).toBe("/decks/new");
    expect(screen.getByText("Change commander").closest("a")!.getAttribute("href")).toBe("/decks/new");
    expect(screen.getByText("Commander selected")).toBeTruthy();
    expect(screen.getByText("Name your deck.")).toBeTruthy();
    expect(screen.queryByTestId("hand-off-answers")).toBeNull();
  });

  it("sends every way back to the results, and says the deck is built from the answers", () => {
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    expect(screen.getByText("‹ Help me choose · results").getAttribute("href")).toBe(RESULTS);
    // The phone's chevron (spoken) and the ghost button (read) both name the results.
    const backs = screen.getAllByRole("link", { name: "Back to results" });
    expect(backs).toHaveLength(2);
    for (const b of backs) expect(b.getAttribute("href")).toBe(RESULTS);
    expect(screen.getByText("From your answers")).toBeTruthy();
    expect(screen.getByText("Name your deck. It will be built from your answers.")).toBeTruthy();
    expect(screen.getByTestId("hand-off-answers")).toBeTruthy();
  });

  it("puts the answers block after the identity row and before the deck name", () => {
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    const block = screen.getByTestId("hand-off-answers");
    const label = screen.getByText("Deck name");
    const identity = screen.getByText("Color identity");
    expect(identity.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(block.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws no block when nothing but colors or words was asked", () => {
    render(<CreatePreFilled {...base} handOff={handOff(false)} />);
    expect(screen.queryByTestId("hand-off-answers")).toBeNull();
  });

  it("hands the answers to the create", async () => {
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    fireEvent.change(screen.getByLabelText("Deck name"), { target: { value: "Stompy" } });
    await act(async () => fireEvent.submit(screen.getByLabelText("Deck name").closest("form")!));
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Stompy", undefined, null, handOff().create);
  });
});
