// The create page's two readings: today's, byte for byte, and the one a Help me choose result's
// press brings the player to (HANDOFF §6), whose every way back leads to those results and whose
// create carries the answers to the fill.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { guidedBuildCopy } from "../../lib/copy/guided-build";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import { createPreFilledCopy, renameCopy } from "../../lib/copy/decks-builder";

const createDeck = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../../app/decks/actions", () => ({ createDeck }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

const { CreatePreFilled } = await import("./create-pre-filled");

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const base = { oracleId: COMMANDER, name: "Gishath, Sun's Avatar", typeLine: "Legendary Creature", colorIdentity: ["R", "G", "W"], imageUri: null };
const RESULTS = "/decks/new/choose?t=dinosaurs&b=150&v=results";
const handOff = (drawBlock = true) => ({
  answers: { themes: [{ slug: "dinosaurs", label: "Dinosaurs", pct: 91 }], card: null, cardUnread: false, themeJoin: "all" as const, sets: [], pool: "any" as const, budgetDollars: 150, bracket: null },
  create: { themes: ["Dinosaurs"], cardOracleId: null, budgetDollars: 150, bracket: null, bracketBuys: false },
  resultsHref: RESULTS,
  changeHref: "/decks/new/choose?t=dinosaurs&b=150",
  drawBlock,
});

describe("CreatePreFilled", () => {
  it("is today's page when no result brought the player here", () => {
    render(<CreatePreFilled {...base} />);
    expect(screen.getByText("‹ Commanders · Gishath, Sun's Avatar").getAttribute("href")).toBe("/decks/new");
    expect(screen.getByRole("link", { name: createPreFilledCopy.backAria }).getAttribute("href")).toBe("/decks/new");
    expect(screen.getByText(createPreFilledCopy.changeCommander).closest("a")!.getAttribute("href")).toBe("/decks/new");
    expect(screen.getByText(createPreFilledCopy.subPhone)).toBeTruthy();
    expect(screen.getByText(createPreFilledCopy.sub)).toBeTruthy();
    expect(screen.queryByTestId("hand-off-answers")).toBeNull();
  });

  it("sends every way back to the results, and says the deck is built from the answers", () => {
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    expect(screen.getByText(helpMeChooseCopy.handOff.back).getAttribute("href")).toBe(RESULTS);
    // The phone's chevron (spoken) and the ghost button (read) both name the results.
    const backs = screen.getAllByRole("link", { name: helpMeChooseCopy.handOff.backAria });
    expect(backs).toHaveLength(2);
    for (const b of backs) expect(b.getAttribute("href")).toBe(RESULTS);
    expect(screen.getByText(helpMeChooseCopy.handOff.subPhone)).toBeTruthy();
    expect(screen.getByText(helpMeChooseCopy.handOff.sub)).toBeTruthy();
    expect(screen.getByTestId("hand-off-answers")).toBeTruthy();
  });

  it("puts the answers block after the identity row and before the deck name", () => {
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    const block = screen.getByTestId("hand-off-answers");
    const label = screen.getByText(renameCopy.fieldAria);
    const identity = screen.getByText(createPreFilledCopy.colorIdentity);
    expect(identity.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(block.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws no block when nothing but colors or words was asked", () => {
    render(<CreatePreFilled {...base} handOff={handOff(false)} />);
    expect(screen.queryByTestId("hand-off-answers")).toBeNull();
  });

  it("hands the answers to the create", async () => {
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    fireEvent.change(screen.getByLabelText(renameCopy.fieldAria), { target: { value: "Stompy" } });
    await act(async () => fireEvent.submit(screen.getByLabelText(renameCopy.fieldAria).closest("form")!));
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Stompy", undefined, null, handOff().create, "free");
  });

  it("marks the free build and creates with it, as today", async () => {
    createDeck.mockClear();
    render(<CreatePreFilled {...base} />);
    const group = screen.getByRole("radiogroup", { name: guidedBuildCopy.choice.label });
    expect((screen.getByRole("radio", { name: /Free build/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Just the commander/ }) as HTMLInputElement).checked).toBe(false);
    expect(group.querySelectorAll("input[type=radio]")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText(renameCopy.fieldAria), { target: { value: "Stompy" } });
    await act(async () => fireEvent.submit(screen.getByLabelText(renameCopy.fieldAria).closest("form")!));
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Stompy", undefined, null, null, "free");
  });

  it("creates the commander alone when Just the commander is chosen", async () => {
    createDeck.mockClear();
    render(<CreatePreFilled {...base} />);
    fireEvent.click(screen.getByRole("radio", { name: /Just the commander/ }));
    fireEvent.change(screen.getByLabelText(renameCopy.fieldAria), { target: { value: "Blank" } });
    await act(async () => fireEvent.submit(screen.getByLabelText(renameCopy.fieldAria).closest("form")!));
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Blank", undefined, null, null, "empty");
  });

  it("draws the picks the commander page carried, says each option keeps them, and links back", () => {
    const picks = [
      { oracleId: "0000aaaa-0000-4000-8000-0000000000a1", name: "Sol Ring", imageUri: null, owned: true },
      { oracleId: "0000aaaa-0000-4000-8000-0000000000a2", name: "Arcane Signet", imageUri: null, owned: false },
    ];
    render(<CreatePreFilled {...base} selectedOracleIds={picks.map((p) => p.oracleId)} picks={picks} commanderHref="/commanders/gishath" />);
    const block = screen.getByTestId("build-picks");
    expect(block.textContent).toContain("Your picks · 2");
    expect(block.textContent).toContain("Sol Ring");
    expect(block.textContent).toContain(guidedBuildCopy.choice.picks.buy);
    expect(block.textContent).toContain(guidedBuildCopy.choice.picks.kept);
    expect(screen.getByRole("link", { name: "Change on Gishath’s page" }).getAttribute("href")).toBe("/commanders/gishath");
    expect(screen.getByRole("radio", { name: /Just the commander/ }).closest("label")!.textContent).toContain("your 2 picks and 97 empty slots");
  });

  it("draws no picks block without picks", () => {
    render(<CreatePreFilled {...base} />);
    expect(screen.queryByTestId("build-picks")).toBeNull();
  });

  it("sends no answers when Just the commander is chosen on the hand-off: no fill runs to read them", async () => {
    createDeck.mockClear();
    render(<CreatePreFilled {...base} handOff={handOff()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Just the commander/ }));
    fireEvent.change(screen.getByLabelText(renameCopy.fieldAria), { target: { value: "Blank" } });
    await act(async () => fireEvent.submit(screen.getByLabelText(renameCopy.fieldAria).closest("form")!));
    expect(createDeck).toHaveBeenCalledWith(COMMANDER, "Blank", undefined, null, null, "empty");
  });
});
