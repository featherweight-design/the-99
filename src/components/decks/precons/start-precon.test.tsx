import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

const action = vi.hoisted(() => vi.fn());
const addAction = vi.hoisted(() => vi.fn());
vi.mock("../../../app/decks/precon-actions", () => ({ createDeckFromPrecon: action, startPreconOwned: addAction }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user_A" }) }));
import { StartPrecon } from "./start-precon";

const row: PreconRow = {
  fileName: "MysticIntellect_C19", name: "Mystic Intellect", setCode: "C19", releaseDate: "2019-08-23", twinName: null,
  commanders: [{ oracleId: "sevinne", name: "Sevinne, the Chronoclasm", imageUri: null, colorIdentity: ["U", "R", "W"] }],
  identity: ["W", "U", "R"], owned: 40, of: 80, unmapped: 0,
  built: [{ deckId: "d", deckName: "HD - Sevinne", shared: 50, sameCommanders: true, linked: false }],
};

describe("StartPrecon", () => {
  const open = () => {
    render(<StartPrecon row={row} cards={100} body={99} illegal={["Dockside Extortionist"]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
  };

  it("names a card the start keeps that isn't legal, the deck it repeats, and the facts", () => {
    open();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/1 card isn’t legal in Commander: Dockside Extortionist/)).toBeInTheDocument();
    expect(screen.getByText("You already have HD - Sevinne with this commander. This makes a second deck.")).toBeInTheDocument();
    expect(screen.getByText("all 100")).toBeInTheDocument();
    expect(screen.getByText("this precon’s copies")).toBeInTheDocument();
    // The deck is committed on start: no sentence about a draft, and no lead paragraph restating the Cards fact.
    expect(screen.queryByText(/draft/i)).toBeNull();
    expect(screen.queryByText(/Change anything before you commit/)).toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("Mystic Intellect");
  });

  it("says what the catalog lacks rather than claiming the precon's whole list", () => {
    render(<StartPrecon row={{ ...row, unmapped: 1 }} cards={99} body={98} illegal={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    expect(screen.getByText("99; 1 isn’t in our catalog yet")).toBeInTheDocument();
    expect(screen.queryByText("all 99")).toBeNull();
  });

  it("refuses a name with a control character before sending it, as the server would", () => {
    open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bad\u007fName" } });
    expect(screen.getByRole("button", { name: "Start the deck" })).toBeDisabled();
  });

  it("speaks of several illegal cards in the plural", () => {
    render(<StartPrecon row={row} cards={100} body={99} illegal={["Dockside Extortionist", "Trade Secrets"]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    expect(screen.getByText(/2 cards aren’t legal in Commander: Dockside Extortionist, Trade Secrets\. They stay in/)).toBeInTheDocument();
  });

  it("starts the deck under the typed name, and keeps the dialog with the name on a failure", async () => {
    action.mockRejectedValueOnce(new Error("boom"));
    open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My Intellect" } });
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t start the deck. Nothing was saved."));
    expect(action).toHaveBeenCalledWith("MysticIntellect_C19", "My Intellect");
    expect(screen.getByRole("textbox")).toHaveValue("My Intellect");
  });

  it("will not start an empty name", () => {
    open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Start the deck" })).toBeDisabled();
  });
});

// `createDeckFromPrecon` ends in `redirect()`, which throws. Caught as a failure, every successful
// start painted "Couldn’t start the deck" for the frame the navigation took (as #337 on the picker).
describe("StartPrecon, a redirecting action", () => {
  const isRedirect = (v: unknown) =>
    v instanceof Error && (v.message.startsWith("NEXT_REDIRECT") || String((v as { digest?: string }).digest).startsWith("NEXT_REDIRECT"));
  const swallow = (e: ErrorEvent | PromiseRejectionEvent) => {
    if (isRedirect("reason" in e ? e.reason : e.error)) e.preventDefault();
  };
  beforeAll(() => {
    window.addEventListener("error", swallow);
    window.addEventListener("unhandledrejection", swallow);
  });
  afterAll(() => {
    window.removeEventListener("error", swallow);
    window.removeEventListener("unhandledrejection", swallow);
  });

  it("is not a failure", async () => {
    const { redirect } = await import("next/navigation");
    action.mockImplementationOnce(async () => redirect("/decks/d1?from=precon"));
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
