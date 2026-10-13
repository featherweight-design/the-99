import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
const search = vi.hoisted(() => vi.fn(async (surface: string, query: string) => {
  void surface; void query;
  return [{ oracleId: "c0ffee00-0000-4000-8000-000000000001", name: "Sol Ring", typeLine: "Artifact", imageUri: null, commanderLegal: true, flavorName: null }];
}));
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: search }));

import { TuningNotesField } from "./tuning-notes-field";

describe("TuningNotesField", () => {
  it("refuses to grow past 500 characters", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value={"a".repeat(499)} onChange={onChange} />);
    const field = screen.getByLabelText("Additional notes");
    fireEvent.change(field, { target: { value: "a".repeat(500) } });
    expect(onChange).toHaveBeenCalledWith("a".repeat(500));
    onChange.mockClear();
    fireEvent.change(field, { target: { value: "a".repeat(501) } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the counter at n / 500", () => {
    render(<TuningNotesField value="Nothing over $5" onChange={vi.fn()} />);
    expect(screen.getByText("15 / 500")).toBeInTheDocument();
  });

  it("clears the draft on Escape rather than committing it", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value="more removal" onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("Additional notes"), { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
  });

  // Copilot review: Escape cancels an IME composition candidate first (typing Japanese/Chinese/
  // Korean) — it must not also clear the whole draft in the same keystroke.
  it("ignores Escape while an IME composition is active", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value="more removal" onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("Additional notes"), {
      key: "Escape",
      isComposing: true,
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  describe("card tags", () => {
    const ID = "c0ffee00-0000-4000-8000-000000000001";

    it("looks a typed [[ up as the tuning surface, and a pick sends the stored tag up", async () => {
      const seen = vi.fn();
      // The panel owns the value; a wrapper stands in for it, as a controlled field needs.
      function Panel() {
        const [value, setValue] = useState("swap out ");
        return <TuningNotesField value={value} onChange={(next) => { seen(next); setValue(next); }} />;
      }
      render(<Panel />);
      fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "swap out [[Sol" } });
      const option = await screen.findByRole("option", { name: /Sol Ring/ });
      expect(search).toHaveBeenCalledWith("tuning", "Sol");
      fireEvent.mouseDown(option);
      expect(seen).toHaveBeenLastCalledWith(`swap out [[${ID}|Sol Ring]] `);
    });

    it("shows a stored tag as its name and counts it as its name", () => {
      render(<TuningNotesField value={`swap out [[${ID}|Sol Ring]]`} onChange={vi.fn()} />);
      expect((screen.getByLabelText("Additional notes") as HTMLTextAreaElement).value).toContain("Sol Ring");
      expect((screen.getByLabelText("Additional notes") as HTMLTextAreaElement).value).not.toContain(ID);
      expect(screen.getByText("17 / 500")).toBeInTheDocument();
    });

    function Panel({ start }: { start: string }) {
      const [value, setValue] = useState(start);
      return <TuningNotesField value={value} onChange={setValue} />;
    }

    it("lets the player edit inside a tagged name without the box rewriting what they typed", () => {
      render(<Panel start={`swap out [[${ID}|Sol Ring]] now`} />);
      const box = screen.getByLabelText("Additional notes") as HTMLTextAreaElement;
      // The box shows the name with its invisible mark; the player deletes a letter inside it.
      const typed = box.value.replace("Sol Ring", "Sol Rig");
      fireEvent.change(box, { target: { value: typed } });
      expect(box.value).toBe(typed);
    });

    it("closes the list on Escape and keeps the draft, and clears the draft on the next Escape", async () => {
      const seen = vi.fn();
      function Watched() {
        const [value, setValue] = useState("swap out ");
        return <TuningNotesField value={value} onChange={(n) => { seen(n); setValue(n); }} />;
      }
      render(<Watched />);
      const box = screen.getByLabelText("Additional notes");
      fireEvent.change(box, { target: { value: "swap out [[Sol" } });
      await screen.findByRole("option", { name: /Sol Ring/ });
      seen.mockClear();
      fireEvent.keyDown(box, { key: "Escape" });
      expect(screen.queryByRole("option")).toBeNull();
      expect(seen).not.toHaveBeenCalled();
      fireEvent.keyDown(box, { key: "Escape" });
      expect(seen).toHaveBeenCalledWith("");
    });
  });
});
