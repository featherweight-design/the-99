// ImportEntry — the five states this surface can actually reach: 1 (entry),
// 3 (parsing), 8 (file too large), 9 (nothing matched), 10 (nothing parsed).
// The link mode's states are not tested because they are not built: every
// Moxfield host answers 403 behind bot protection (#191).
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DECK_IMPORT_FILE_MAX_BYTES } from "../../lib/upload-limits";

const importDeck = vi.fn();
const push = vi.fn();

// Records every code-started navigation the component starts through `usePendingPush`, which is
// what hands it to the navigation-pending provider (the plan's PR 3). The push still reaches the
// router mock, so the cases that assert it are unchanged.
const pushed = vi.hoisted(() => [] as string[]);
vi.mock("../shell/pending-push", async () => {
  const { useRouter } = await import("next/navigation");
  return {
    usePendingPush: () => {
      const router = useRouter();
      return { go: (href: string) => { pushed.push(href); router.push(href); } };
    },
  };
});

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
  importDeck.mockResolvedValue({
    ok: true, deckId: "deck-1", unresolvedCount: 0, notes: [], printingsKept: 0, printingsNotOwned: 0,
  });
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
    // Before a paste there is no figure to name, so the button carries the
    // generic label rather than promising to import nothing.
    const button = screen.getByRole("button", { name: "Import deck →" });
    expect(button).toHaveProperty("disabled", true);
    fillPaste();
    expect(screen.getByRole("button", { name: "Import 2 cards" })).toHaveProperty("disabled", false);
  });

  it("sends a successful import to its new deck", async () => {
    render(<ImportEntry />);
    fillPaste();
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?imported=1"));
    expect(importDeck).toHaveBeenCalledWith({
      text: "1 Sol Ring\n1 Cultivate",
      source: "paste",
      name: "Borrowed deck",
    });
  });

  it("carries the printing counts to the arrival strip (deck printings)", async () => {
    importDeck.mockResolvedValue({
      ok: true, deckId: "deck-1", unresolvedCount: 0, notes: [], printingsKept: 12, printingsNotOwned: 3,
    });
    render(<ImportEntry />);
    fillPaste();
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?imported=1&printings=12-3"));
  });

  it("skips the picker when the source declares its own commander", async () => {
    // §Commander: a declared commander is used and nothing is said. A confirmation
    // step for a fact we already have is friction, so the import lands directly.
    render(<ImportEntry />);
    fireEvent.change(pasteBox(), {
      target: { value: "1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring" },
    });
    fireEvent.change(nameBox(), { target: { value: "Borrowed deck" } });
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?imported=1"));
    expect(screen.queryByText("Which one's the commander?")).toBeNull();
    // No commanderOracleId is sent: the server action reads the declaration itself.
    expect(importDeck.mock.calls[0][0].commanderOracleId).toBeUndefined();
  });

  it("writes one deck when the button is clicked twice in the same tick", async () => {
    // `pending` only turns true on the re-render after `startTransition`, so both
    // clicks read it as false. `importDeck` does not dedupe, so an unguarded second
    // click is a second deck.
    render(<ImportEntry />);
    fillPaste();
    const button = screen.getByRole("button", { name: /^Import \d+ cards$/ });
    // Both clicks inside one `act` batch: `fireEvent` flushes a render between
    // calls, which hands the second click a `pending` of true and tests nothing.
    await act(async () => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?imported=1"));
    expect(importDeck).toHaveBeenCalledTimes(1);
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
    // One byte over, so the size must not read as the cap it broke.
    expect(alert.textContent).toContain("2.1 MB");
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

describe("a CSV-shaped upload that failed to parse", () => {
  it("names the problem and leaves the paste alone", async () => {
    importDeck.mockResolvedValue({
      ok: false,
      reason: "csvInvalid",
      detail: 'Row 3: invalid quantity "abc"',
      notes: [],
    });
    render(<ImportEntry />);
    fillPaste();
    submit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain('Row 3: invalid quantity "abc"');
    expect(pasteBox()).toHaveProperty("value", "1 Sol Ring\n1 Cultivate");
    // Mode-agnostic copy on purpose: this is reachable from a paste as well
    // as a file, and the action must not promise a file dialog it cannot open.
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
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

  it("keeps the list on the page when the server action throws", async () => {
    // A throw inside the transition otherwise reaches the error boundary and
    // takes the pasted list with it.
    importDeck.mockRejectedValueOnce(new Error("Decklist too large (max 2 MB)"));
    render(<ImportEntry />);
    fillPaste();
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("That didn't go through");
    // The cap is the player's to fix, so the banner names it rather than blaming
    // our end and inviting a retry that cannot succeed.
    expect(alert.textContent).toContain("Decklist too large (max 2 MB)");
    expect(screen.getByRole("button", { name: "Back to your list" })).toBeTruthy();
    expect((pasteBox() as HTMLTextAreaElement).value).toContain("Sol Ring");
    expect(push).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// States 11–12 — commander selection
// ---------------------------------------------------------------------------

const candidate = (name: string, sourceLine: number, over = {}) => ({
  oracleId: `oracle-${sourceLine}`,
  name,
  sourceLine,
  colorIdentity: ["G"],
  imageUri: null,
  owned: true,
  ...over,
});

function needsCommander(candidates: ReturnType<typeof candidate>[], lineCount: number) {
  importDeck.mockResolvedValueOnce({
    ok: false,
    reason: "commanderNeeded",
    candidates,
    lineCount,
    notes: [],
  });
}

describe("state 11 — commander picker", () => {
  it("lists exactly the legendary creatures the import brought, each with its line", async () => {
    needsCommander(
      [
        candidate("Atraxa, Praetors' Voice", 4),
        candidate("Tymna the Weaver", 17, { owned: false }),
        candidate("Kenrith, the Returned King", 42),
      ],
      99,
    );
    render(<ImportEntry />);
    fillPaste();
    submit();

    await screen.findByText("Which one's the commander?");
    expect(screen.getByText("3 legendary creatures in this import")).toBeTruthy();
    const rows = screen.getAllByRole("button", { pressed: false });
    expect(rows.map((r) => r.querySelector("p")?.textContent)).toEqual([
      "Atraxa, Praetors' Voice",
      "Tymna the Weaver",
      "Kenrith, the Returned King",
    ]);
    // The line number is what separates two similar legends.
    expect(screen.getByText("Green · line 4 · you own it")).toBeTruthy();
    expect(screen.getByText("Green · line 17 · not in your collection")).toBeTruthy();
    expect(screen.getByText("Green · line 42 · you own it")).toBeTruthy();
    // Nothing was written on the first pass.
    expect(push).not.toHaveBeenCalled();
  });

  it("re-sends the same list with the picked commander and the edited name", async () => {
    needsCommander([candidate("Atraxa, Praetors' Voice", 4)], 99);
    render(<ImportEntry />);
    fillPaste();
    submit();

    await screen.findByText("Which one's the commander?");
    fireEvent.click(screen.getByRole("button", { name: /Atraxa/ }));
    // Pre-filled from the entry surface, and editable.
    const nameField = screen.getByLabelText("Deck name") as HTMLInputElement;
    expect(nameField.value).toBe("Borrowed deck");
    fireEvent.change(nameField, { target: { value: "Atraxa, borrowed" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Make the deck →" })[0]);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?imported=1"));
    expect(importDeck).toHaveBeenLastCalledWith({
      text: "1 Sol Ring\n1 Cultivate",
      source: "paste",
      name: "Atraxa, borrowed",
      commanderOracleId: "oracle-4",
      // Stated, not omitted: an empty second slot on the second pass is the
      // player's answer that this deck has one commander, and the action reads
      // an absent key as the paste's own declaration standing.
      partnerOracleId: null,
    });
  });

  it("drops the picker when the second pass fails, so the banner is reachable", async () => {
    // The picker outranks the banner in the render, so a failure that left the
    // step standing would set a message nobody could ever see.
    needsCommander([candidate("Atraxa, Praetors' Voice", 4)], 99);
    render(<ImportEntry />);
    fillPaste();
    submit();

    await screen.findByText("Which one's the commander?");
    fireEvent.click(screen.getByRole("button", { name: /Atraxa/ }));
    fireEvent.change(screen.getByLabelText("Deck name"), {
      target: { value: "Atraxa, borrowed" },
    });
    importDeck.mockResolvedValue({ ok: false, reason: "noneMatched", lineCount: 12, notes: [] });
    fireEvent.click(screen.getAllByRole("button", { name: "Make the deck →" })[0]);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We couldn't find any of these cards");
    expect(screen.queryByText("Which one's the commander?")).toBeNull();
    // The name edited in the picker survives the trip back, or the player retypes it.
    expect(nameBox()).toHaveProperty("value", "Atraxa, borrowed");
    expect(push).not.toHaveBeenCalled();
  });

  it("holds the submit until a commander is picked", async () => {
    needsCommander([candidate("Atraxa, Praetors' Voice", 4)], 99);
    render(<ImportEntry />);
    fillPaste();
    submit();

    await screen.findByText("Which one's the commander?");
    for (const button of screen.getAllByRole("button", { name: "Make the deck →" })) {
      expect(button).toHaveProperty("disabled", true);
    }
  });
});

describe("state 12 — no legendary creature", () => {
  it("reads as a dead end and creates nothing", async () => {
    needsCommander([], 99);
    render(<ImportEntry />);
    fillPaste();
    submit();

    const dead = await screen.findByRole("alert");
    expect(dead.textContent).toContain("There's no commander in here");
    expect(dead.textContent).toContain("none of these 99 lines is one");
    expect(dead.textContent).toContain("Nothing was created");
    // No picker, and above all no deck.
    expect(screen.queryByText("Which one's the commander?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Make the deck →" })).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(importDeck).toHaveBeenCalledTimes(1);
  });

  it("offers the way back to the list, and the way out to /decks/new", async () => {
    // Twice: the way back re-submits, and that pass is the same dead end.
    needsCommander([], 99);
    needsCommander([], 99);
    render(<ImportEntry />);
    fillPaste();
    submit();

    await screen.findByRole("button", { name: "Back to the list" });
    fireEvent.click(screen.getByRole("button", { name: "Back to the list" }));
    // The list is still here, exactly as the reassurance line says.
    expect((pasteBox() as HTMLTextAreaElement).value).toContain("Sol Ring");

    submit();
    await screen.findByRole("button", { name: "Start from a commander instead →" });
    fireEvent.click(screen.getByRole("button", { name: "Start from a commander instead →" }));
    expect(push).toHaveBeenCalledWith("/decks/new");
    expect(pushed).toContain("/decks/new");
  });
});
