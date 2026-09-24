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
    expect(container.innerHTML).toBe("");
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

  it("clears the row when the line is saved empty", async () => {
    const save = draw("go wide");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.editAria })));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  " } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    expect((save.mock.calls[0][1] as FormData).get("intent")).toBe("");
    expect(screen.queryByText("go wide")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
