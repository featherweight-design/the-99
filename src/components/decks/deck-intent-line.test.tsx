import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { DeckIntentLine } from "./deck-intent-line";

vi.mock("../../app/decks/tuning-actions", () => ({ saveDeckIntent: vi.fn() }));

type Save = (deckId: string, form: FormData) => Promise<DeckMutationResult>;
const copy = deckTuningCopy.intent;

const draw = (intent: string | null, seeded = false, save = vi.fn<Save>(async () => ({ ok: true }))) => {
  render(<DeckIntentLine deckId="d1" intent={intent} seeded={seeded} width="desktop" save={save} />);
  return save;
};

describe("DeckIntentLine", () => {
  it("draws no row at all when the deck has no line", () => {
    const { container } = render(<DeckIntentLine deckId="d1" intent={null} seeded={false} width="desktop" />);
    // Only the empty live region, which draws nothing.
    expect(container.querySelector("[data-deck-intent]")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("draws the line whole, with its edit control", () => {
    draw("grind a four-person table out and win late");
    expect(screen.getByText("grind a four-person table out and win late")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.editAria })).toBeInTheDocument();
  });

  it("marks an app-seeded line, and drops the mark for good once saved over", async () => {
    draw("Built around Gisa.", true);
    expect(screen.getByLabelText(copy.seededAria)).toBeInTheDocument();
    expect(screen.getByText(copy.seeded)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "win late" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    expect(screen.getByText("win late")).toBeInTheDocument();
    expect(screen.queryByText(copy.seeded)).toBeNull();
  });

  it("keeps the field and its text when a save is refused", async () => {
    draw("go wide", false, vi.fn<Save>(async () => ({ ok: false, message: copy.refused })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "go tall" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    expect(screen.getByRole("textbox")).toHaveValue("go tall");
    expect(screen.getByRole("alert")).toHaveTextContent(copy.refused);
  });

  it("says the save failed and frees the field when the action rejects", async () => {
    draw("go wide", false, vi.fn<Save>(() => Promise.reject(new Error("network"))));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    expect(screen.getByRole("alert")).toHaveTextContent(copy.refused);
    expect(screen.getByRole("button", { name: copy.save })).not.toBeDisabled();
  });

  it("cancels the edit without saving, back to the line as it was", async () => {
    const save = draw("go wide");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "go tall" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.cancel })));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText("go wide")).toBeInTheDocument();
  });

  it("clears the row when the line is saved empty", async () => {
    const save = draw("go wide");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  " } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    expect((save.mock.calls[0][1] as FormData).get("intent")).toBe("");
    expect(screen.queryByText("go wide")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    // The row is gone, and the save is still announced.
    expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.intentSaved);
  });

  it("announces a save", async () => {
    draw("go wide");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "go tall" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    expect(screen.getByRole("status")).toHaveTextContent(deckTuningCopy.announce.intentSaved);
  });

  // An open, untouched field takes the other door's save, so Save cannot write the old line back.
  it("moves an untouched open field to a line saved elsewhere, and leaves typed text alone", async () => {
    const save = vi.fn<Save>(async () => ({ ok: true }));
    const { rerender } = render(<DeckIntentLine deckId="d1" intent="go wide" seeded={false} width="desktop" save={save} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    rerender(<DeckIntentLine deckId="d1" intent="go tall" seeded={false} width="desktop" save={save} />);
    expect(screen.getByRole("textbox")).toHaveValue("go tall");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "mine" } });
    rerender(<DeckIntentLine deckId="d1" intent="go long" seeded={false} width="desktop" save={save} />);
    expect(screen.getByRole("textbox")).toHaveValue("mine");
    // Typed back to the line the page last sent: still typed in, and still the player's.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "go long" } });
    rerender(<DeckIntentLine deckId="d1" intent="go far" seeded={false} width="desktop" save={save} />);
    expect(screen.getByRole("textbox")).toHaveValue("go long");
  });

  // The line's other door (the ask in Suggested changes) saves through the page, which hands the
  // header a new line. A header that held its first line would stay blank until a reload.
  it("takes a new line from the page, and drops the seeded mark with it", () => {
    const { rerender } = render(<DeckIntentLine deckId="d1" intent={null} seeded={false} width="desktop" />);
    expect(screen.queryByText("go wide")).toBeNull();
    rerender(<DeckIntentLine deckId="d1" intent="go wide" seeded={false} width="desktop" />);
    expect(screen.getByText("go wide")).toBeInTheDocument();
    rerender(<DeckIntentLine deckId="d1" intent="Built around Gisa." seeded width="desktop" />);
    expect(screen.getByText(copy.seeded)).toBeInTheDocument();
    rerender(<DeckIntentLine deckId="d1" intent="win late" seeded={false} width="desktop" />);
    expect(screen.queryByText(copy.seeded)).toBeNull();
  });
});
