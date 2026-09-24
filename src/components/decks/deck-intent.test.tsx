import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { DeckIntentAsk } from "./deck-intent";

const copy = deckTuningCopy.intent;

function draw(save = vi.fn(async () => ({ ok: true as const })), fix: { axis: string; hurt: number; games: number } | null = null) {
  const onSaved = vi.fn();
  render(<DeckIntentAsk deckId="d1" fix={fix} save={save} onSaved={onSaved} />);
  return { save, onSaved };
}

async function type(value: string) {
  fireEvent.change(screen.getByPlaceholderText(copy.placeholder), { target: { value } });
}

describe("DeckIntentAsk", () => {
  it("pitches with the marked axis only when games have marked one", () => {
    draw(undefined, { axis: "mana", hurt: 4, games: 6 });
    expect(screen.getByText(copy.ask("mana", "4"))).toBeInTheDocument();
  });

  it("asks without the pitch when there is no marked axis", () => {
    draw();
    expect(screen.getByText(copy.askLabel)).toBeInTheDocument();
    expect(screen.queryByText(/the problem/)).not.toBeInTheDocument();
  });

  it("saves the trimmed line and hands it back", async () => {
    const { save, onSaved } = draw();
    await type("  go wide  ");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    const form = save.mock.calls[0][1] as FormData;
    expect(form.get("intent")).toBe("go wide");
    expect(onSaved).toHaveBeenCalledWith("go wide");
  });

  it("keeps the typed line when the save is refused", async () => {
    const { onSaved } = draw(vi.fn(async () => ({ ok: false as const, message: copy.refused })));
    await type("go wide");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.save })));
    expect(screen.getByPlaceholderText(copy.placeholder)).toHaveValue("go wide");
    expect(screen.getByRole("alert")).toHaveTextContent(copy.refused);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("goes away on Skip and writes nothing", async () => {
    const { save } = draw();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: copy.skip })));
    expect(screen.queryByText(copy.askLabel)).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
