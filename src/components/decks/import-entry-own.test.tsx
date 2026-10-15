// No-collection entry R2 (PR 2): `I own these cards. Add them to my collection.` on /decks/import (S8 to S11).
// The tick shows only with the switch on, sends `own` and one idempotency id per submission, keeps that id through the
// commander step and every retry, and the add's refusal lands in the page's own banner.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const importDeck = vi.fn();
const push = vi.fn();

vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go: vi.fn() }) }));
vi.mock("../../app/decks/import-actions", () => ({ importDeck }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { ImportEntry } = await import("./import-entry");
const { deckImportCopy: copy } = await import("../../lib/copy/deck-import");

const LABEL = "I own these cards. Add them to my collection.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const tick = () => screen.getByRole("checkbox", { name: LABEL }) as HTMLInputElement;

function fillPaste(text = "1 Sol Ring\n1 Cultivate") {
  fireEvent.change(screen.getByLabelText("Your list"), { target: { value: text } });
  fireEvent.change(screen.getByLabelText("Deck name"), { target: { value: "Borrowed deck" } });
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: /^Import \d+ cards$/ }));

const ok = { ok: true, deckId: "deck-1", unresolvedCount: 0, notes: [], printingsKept: 0, printingsNotOwned: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  importDeck.mockResolvedValue(ok);
});

describe("S8: the box", () => {
  it("is absent with the switch off, and the payload is exactly as shipped", async () => {
    render(<ImportEntry />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    fillPaste();
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?imported=1"));
    expect(importDeck).toHaveBeenCalledWith({ text: "1 Sol Ring\n1 Cultivate", source: "paste", name: "Borrowed deck" });
  });

  it("is shown with the switch on, under Deck name, unticked by default", () => {
    render(<ImportEntry canOwn />);
    expect(tick().checked).toBe(false);
    // Under the name field and above the import button, in document order.
    const name = screen.getByLabelText("Deck name");
    const button = screen.getByRole("button", { name: "Import deck →" });
    expect(name.compareDocumentPosition(tick()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tick().compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("left unticked, sends no `own` and no id", async () => {
    render(<ImportEntry canOwn />);
    fillPaste();
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?imported=1"));
    expect(importDeck.mock.calls[0][0]).toEqual({ text: "1 Sol Ring\n1 Cultivate", source: "paste", name: "Borrowed deck" });
  });
});

describe("S10: ticked", () => {
  it("sends `own` and a uuid, and carries the entry to the deck page as its receipt claim", async () => {
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await waitFor(() => expect(push).toHaveBeenCalled());
    const sent = importDeck.mock.calls[0][0];
    expect(sent.own).toBe(true);
    expect(sent.actionId).toMatch(UUID);
    expect(push).toHaveBeenCalledWith(`/decks/deck-1?imported=1&added=${sent.actionId}`);
  });

  it("carries the tick and its id through the commander step", async () => {
    importDeck.mockResolvedValueOnce({
      ok: false, reason: "commanderNeeded", lineCount: 99, notes: [],
      candidates: [{ oracleId: "oracle-4", name: "Atraxa, Praetors' Voice", sourceLine: 4, colorIdentity: ["G"], imageUri: null, owned: true }],
    });
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await screen.findByText("Which one’s the commander?");
    fireEvent.click(screen.getByRole("button", { name: /Atraxa/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Make the deck →" })[0]);
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(2));
    const [first, second] = importDeck.mock.calls.map((c) => c[0]);
    expect(second).toMatchObject({ own: true, commanderOracleId: "oracle-4" });
    expect(second.actionId).toBe(first.actionId);
  });
});

describe("S11: the add refused", () => {
  it("shows the precon add's sentence in the page's own banner, keeping the list and the tick", async () => {
    importDeck.mockResolvedValueOnce({ ok: false, reason: "addFailed", notes: [] });
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We couldn’t add those. Your collection is unchanged.");
    expect(alert.id).toBe("import-failure");
    expect(tick().checked).toBe(true);
    expect((screen.getByLabelText("Your list") as HTMLTextAreaElement).value).toContain("Sol Ring");
    expect(push).not.toHaveBeenCalled();
  });

  it("Try again repeats the press with the same id", async () => {
    importDeck.mockResolvedValueOnce({ ok: false, reason: "addFailed", notes: [] });
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(2));
    const [first, second] = importDeck.mock.calls.map((c) => c[0]);
    expect(second.actionId).toBe(first.actionId);
    expect(second.own).toBe(true);
  });

  // A retry may rename: the name in the field now is the one sent, under the same id, and the field keeps it.
  it("Try again sends the name as edited since the refusal, with the same id", async () => {
    // Refused twice, so the form is still there to read once the retry has answered.
    importDeck.mockResolvedValue({ ok: false, reason: "addFailed", notes: [] });
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText("Deck name"), { target: { value: "Renamed deck" } });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(2));
    const [first, second] = importDeck.mock.calls.map((c) => c[0]);
    expect(second.name).toBe("Renamed deck");
    expect(second.actionId).toBe(first.actionId);
    // Read once the retry's refusal has drawn the form back (the press shows the reading screen meanwhile).
    expect(((await screen.findByLabelText("Deck name")) as HTMLInputElement).value).toBe("Renamed deck");
  });

  // The row is centred on the phone as drawn: the caller's alignment beats the box's own.
  it("centres the box's row on the phone", () => {
    render(<ImportEntry canOwn />);
    const row = tick().closest("label")!;
    const classes = row.className.split(" ");
    expect(classes).toContain("items-center");
    expect(classes).not.toContain("items-start");
    expect(classes).toContain("md:items-start");
  });

  it("a press that threw makes no claim of a rollback, and its retry carries the same id", async () => {
    importDeck.mockRejectedValueOnce(new Error("network"));
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn’t confirm the cards were added. Try again and they won’t be added twice.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(2));
    expect(importDeck.mock.calls[1][0].actionId).toBe(importDeck.mock.calls[0][0].actionId);
  });

  // The tab already chosen changes nothing: a press whose answer was lost keeps its banner and its id, so the retry
  // lands on the deck it made instead of adding the cards twice.
  it("pressing the Paste tab already chosen keeps a lost press's banner and its id", async () => {
    importDeck.mockRejectedValueOnce(new Error("network"));
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: copy.entry.modePaste }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(2));
    expect(importDeck.mock.calls[1][0].actionId).toBe(importDeck.mock.calls[0][0].actionId);
  });

  // A refused press from the commander step holds the commander picked for the OLD list; a new list drops the banner
  // and those arguments, so its next press resolves its own commander rather than inheriting one.
  it("a new list after a refused commander-step press drops the banner and the old commander", async () => {
    importDeck
      .mockResolvedValueOnce({
        ok: false, reason: "commanderNeeded", lineCount: 99, notes: [],
        candidates: [{ oracleId: "oracle-4", name: "Atraxa, Praetors' Voice", sourceLine: 4, colorIdentity: ["G"], imageUri: null, owned: true }],
      })
      .mockResolvedValueOnce({ ok: false, reason: "addFailed", notes: [] });
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await screen.findByText("Which one’s the commander?");
    fireEvent.click(screen.getByRole("button", { name: /Atraxa/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Make the deck →" })[0]);
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText("Your list"), { target: { value: "1 Kinnan, Bonder Prodigy\n1 Sol Ring" } });
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    submit();
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(3));
    expect(importDeck.mock.calls[2][0].commanderOracleId).toBeUndefined();
  });

  // Unticking after a lost answer would send the retry with no tick and no id, making a second deck instead of finding
  // the first; the box holds still until the press is answered.
  it("holds the tick while a lost press is unanswered, so its retry keeps the tick and the id", async () => {
    importDeck.mockRejectedValueOnce(new Error("network"));
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await screen.findByRole("alert");
    // Disabled, so a browser takes no press on it (jsdom would still toggle one, so none is simulated).
    expect(tick().disabled).toBe(true);
    expect(tick().checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(2));
    expect(importDeck.mock.calls[1][0]).toMatchObject({ own: true, actionId: importDeck.mock.calls[0][0].actionId });
  });

  it("a different list is a different submission, with a new id", async () => {
    importDeck.mockResolvedValueOnce({ ok: false, reason: "addFailed", notes: [] });
    render(<ImportEntry canOwn />);
    fillPaste();
    fireEvent.click(tick());
    submit();
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText("Your list"), { target: { value: "1 Sol Ring\n1 Rhystic Study" } });
    submit();
    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(2));
    expect(importDeck.mock.calls[1][0].actionId).toMatch(UUID);
    expect(importDeck.mock.calls[1][0].actionId).not.toBe(importDeck.mock.calls[0][0].actionId);
  });
});
