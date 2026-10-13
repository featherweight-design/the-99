import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => vi.fn(async (surface: string, query: string) => {
  void surface; void query;
  return [{ oracleId: "c0ffee00-0000-4000-8000-000000000001", name: "Sol Ring", typeLine: "Artifact", imageUri: null, commanderLegal: true, flavorName: null }];
}));
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: search }));

import { DeckDescriptionField } from "./deck-description-field";

describe("DeckDescriptionField (STATES-deck-description.md §1)", () => {
  it("always draws the counter, at 0 / 240 when empty", () => {
    render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
    expect(screen.getByText("0 / 240")).toBeInTheDocument();
  });

  it("reserves the counter's full width so the help text does not reflow as it grows a digit", () => {
    render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
    expect(screen.getByText("0 / 240")).toHaveStyle({ width: "9ch" });
  });

  // Round 5: an `aria-label` here used to override the visible `<label htmlFor>` with
  // different words ("Deck description" vs. "Describe your deck"), so a voice-control user
  // reading the label on screen could not target the field by it.
  it("takes its accessible name from the visible label, not a hidden override", () => {
    render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
    // `getByLabelText` alone does not catch this: it matches ANY association strategy
    // (an aria-label included), so the real test is the ARIA accessible-name computation,
    // which prefers aria-label over an associated <label> when both are present.
    expect(screen.getByRole("combobox")).toHaveAccessibleName("Describe your deck");
  });

  it("counts what is typed and calls onChange", () => {
    const onChange = vi.fn();
    render(<DeckDescriptionField value="" onChange={onChange} onBlur={() => {}} saving={false} refused={null} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Grind it out." } });
    expect(onChange).toHaveBeenCalledWith("Grind it out.");
  });

  it("refuses a change past the 240 cap", () => {
    const onChange = vi.fn();
    render(<DeckDescriptionField value="" onChange={onChange} onBlur={() => {}} saving={false} refused={null} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a".repeat(241) } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("saves on blur", () => {
    const onBlur = vi.fn();
    render(<DeckDescriptionField value="x" onChange={() => {}} onBlur={onBlur} saving={false} refused={null} />);
    fireEvent.blur(screen.getByRole("combobox"));
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it("draws the refusal when the save failed", () => {
    render(<DeckDescriptionField value="x" onChange={() => {}} onBlur={() => {}} saving={false} refused="That did not save. Try again." />);
    expect(screen.getByText("That did not save. Try again.")).toBeInTheDocument();
  });

  describe("card tags", () => {
    const ID = "c0ffee00-0000-4000-8000-000000000001";
    function Owner({ start, onBody }: { start: string; onBody: (b: string) => void }) {
      const [value, setValue] = useState(start);
      return <DeckDescriptionField value={value} onChange={(b) => { onBody(b); setValue(b); }} onBlur={() => {}} saving={false} refused={null} />;
    }

    it("looks a typed [[ up as the description surface, and a pick sends the stored tag up as the body", async () => {
      const seen = vi.fn();
      render(<Owner start="Fast mana, " onBody={seen} />);
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "Fast mana, [[Sol" } });
      const option = await screen.findByRole("option", { name: /Sol Ring/ });
      expect(search).toHaveBeenCalledWith("description", "Sol");
      fireEvent.mouseDown(option);
      expect(seen).toHaveBeenLastCalledWith(`Fast mana, [[${ID}|Sol Ring]] `);
    });

    it("counts a stored tag as the name it draws, not the id it carries", () => {
      render(<DeckDescriptionField value={`tutor for [[${ID}|Sol Ring]]`} onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
      expect(screen.getByText("18 / 240")).toBeInTheDocument();
      expect((screen.getByRole("combobox") as HTMLTextAreaElement).value).not.toContain(ID);
    });

    // The field is read-only while its save is out; a list left open would still take a pick and change what was saved.
    it("draws no tag list while its save is out", async () => {
      const { rerender } = render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "Rocks: [[Sol" } });
      await screen.findByRole("option", { name: /Sol Ring/ });
      rerender(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving refused={null} />);
      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("changes nothing from the [[ ]] button or typing while its save is out", () => {
      const onChange = vi.fn();
      render(<DeckDescriptionField value="Keep" onChange={onChange} onBlur={() => {}} saving refused={null} />);
      fireEvent.click(screen.getByRole("button", { name: "Insert a card tag" }));
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "Keep more" } });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("draws the [[ ]] button and the card-tags tip beside the label", () => {
      render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
      expect(screen.getByRole("button", { name: "Insert a card tag" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "How card tags work" })).toBeInTheDocument();
    });
  });
});
