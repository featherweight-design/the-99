// ImportEntry — the five states this surface can actually reach: 1 (entry),
// 3 (parsing), 8 (file too large), 9 (nothing matched), 10 (nothing parsed).
// The link mode's states are not tested because they are not built: every
// Moxfield host answers 403 behind bot protection (#191).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DECK_IMPORT_FILE_MAX_BYTES } from "../../lib/upload-limits";

const importDeck = vi.fn();
const push = vi.fn();

vi.mock("../../app/decks/import-actions", () => ({ importDeck }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { ImportEntry } = await import("./import-entry");

const pasteBox = () => screen.getByLabelText("Your list");
const nameBox = () => screen.getByLabelText("Deck name");

function fillPaste(text = "1 Sol Ring\n1 Cultivate") {
  fireEvent.change(pasteBox(), { target: { value: text } });
  fireEvent.change(nameBox(), { target: { value: "Borrowed deck" } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /^Import \d+ cards$/ }));
}

function pickFile(file: File) {
  fireEvent.click(screen.getByRole("button", { name: /Upload a file/ }));
  const input = screen.getByLabelText("Deck file", { selector: "input" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  importDeck.mockResolvedValue({ ok: true, deckId: "deck-1", unresolvedCount: 0, notes: [] });
});

describe("state 1 — entry", () => {
  it("offers paste and file, and no link mode", () => {
    render(<ImportEntry />);
    expect(screen.getByRole("button", { name: /Paste a list/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Upload a file/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Moxfield link/ })).toBeNull();
    expect(pasteBox()).toBeTruthy();
    expect(nameBox()).toBeTruthy();
  });

  it("holds the submit until there is a list and a name", () => {
    render(<ImportEntry />);
    const button = screen.getByRole("button", { name: "Import 0 cards" });
    expect(button).toHaveProperty("disabled", true);
    fillPaste();
    expect(screen.getByRole("button", { name: "Import 2 cards" })).toHaveProperty("disabled", false);
  });

  it("sends a successful import to its new deck", async () => {
    render(<ImportEntry />);
    fillPaste();
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1"));
    expect(importDeck).toHaveBeenCalledWith({
      text: "1 Sol Ring\n1 Cultivate",
      source: "paste",
      name: "Borrowed deck",
    });
  });

  it("shows no failure when the commander picker is needed", async () => {
    importDeck.mockResolvedValue({
      ok: false,
      reason: "commanderNeeded",
      candidates: [],
      lineCount: 2,
      notes: [],
    });
    render(<ImportEntry />);
    fillPaste();
    submit();
    await waitFor(() => expect(importDeck).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("state 3 — parsing", () => {
  it("replaces the field block with the waiting treatment and announces it", async () => {
    let settle = () => {};
    importDeck.mockReturnValue(
      new Promise((resolve) => {
        settle = () => resolve({ ok: true, deckId: "deck-1", unresolvedCount: 0, notes: [] });
      }),
    );
    render(<ImportEntry />);
    fillPaste();
    submit();

    await screen.findByText("Reading the list");
    expect(screen.getByRole("status").textContent).toBe("Reading the list.");
    expect(screen.queryByLabelText("Your list")).toBeNull();
    // No determinate figure: a single server action reports no progress.
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull();

    settle();
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});

describe("state 8 — file rejected", () => {
  it("rejects an oversized file before it reaches the server", async () => {
    render(<ImportEntry />);
    const big = new File(["x"], "commander-deck.csv", { type: "text/csv" });
    Object.defineProperty(big, "size", { value: DECK_IMPORT_FILE_MAX_BYTES + 1 });
    pickFile(big);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We can't open that file");
    expect(alert.textContent).toContain("2 MB");
    expect(alert.textContent).toContain(".csv");
    expect(importDeck).not.toHaveBeenCalled();
  });

  it("rejects a file that is not a .csv or .txt", async () => {
    render(<ImportEntry />);
    pickFile(new File(["x"], "commander-deck.xlsx"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(".xlsx");
    expect(screen.getByRole("button", { name: "Choose another file" })).toBeTruthy();
  });
});

describe("state 9 — nothing matched", () => {
  it("names the line count and leaves the paste alone", async () => {
    importDeck.mockResolvedValue({ ok: false, reason: "noneMatched", lineCount: 12, notes: [] });
    render(<ImportEntry />);
    fillPaste();
    submit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We couldn't find any of these cards");
    expect(alert.textContent).toContain("12 lines");
    expect(pasteBox()).toHaveProperty("value", "1 Sol Ring\n1 Cultivate");
    expect(screen.getByRole("button", { name: "Clear and start over" })).toBeTruthy();
  });
});

describe("state 10 — nothing parsed", () => {
  it("reports an empty deck without a retry", async () => {
    importDeck.mockResolvedValue({ ok: false, reason: "noRows", notes: [] });
    render(<ImportEntry />);
    fillPaste();
    submit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("That deck is empty");
    expect(screen.getByRole("button", { name: "Try a different deck" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
