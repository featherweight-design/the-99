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

  it("observes its textarea for a resize, and the danger frame follows a value past the cap", () => {
    const saved = globalThis.ResizeObserver;
    const observed: Element[] = [];
    globalThis.ResizeObserver = class { observe(el: Element) { observed.push(el); } unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
    try {
      const { rerender } = render(<TuningNotesField value="" onChange={() => {}} />);
      const field = screen.getByRole("combobox");
      expect(observed).toContain(field);
      const frame = field.closest("[data-framed-box]")!;
      expect(frame.className).not.toContain("border-[color:var(--danger)]");
      rerender(<TuningNotesField value={"a".repeat(501)} onChange={() => {}} />);
      expect(frame.className).toContain("border-[color:var(--danger)]");
    } finally {
      globalThis.ResizeObserver = saved;
    }
  });

  it("shows the counter at n / 500", () => {
    render(<TuningNotesField value="Nothing over $5" onChange={vi.fn()} />);
    expect(screen.getByText("15 / 500")).toBeInTheDocument();
  });

  it("draws the framed foot in both variants: the tag button, its words and the counter", () => {
    for (const labelRow of [true, false]) {
      const { unmount } = render(<TuningNotesField value="more removal" onChange={vi.fn()} labelRow={labelRow} />);
      expect(screen.getByLabelText("Additional notes").closest("[data-framed-box]")).not.toBeNull();
      expect(screen.getByRole("button", { name: "Insert a card tag" })).toBeInTheDocument();
      expect(screen.getByText("tag a card")).toBeInTheDocument();
      expect(screen.getByText("12 / 500")).toBeInTheDocument();
      unmount();
    }
  });

  it("lights the key while the tag list is open", async () => {
    render(<TuningNotesField value="swap out " onChange={vi.fn()} />);
    const key = screen.getByRole("button", { name: "Insert a card tag" });
    expect(key.className).not.toContain("bg-[color:var(--elevated)]");
    fireEvent.change(screen.getByLabelText("Additional notes"), { target: { value: "swap out [[Sol" } });
    await screen.findByRole("option", { name: /Sol Ring/ });
    expect(key.className).toContain("bg-[color:var(--elevated)]");
  });

  it("draws the label row and the tip only when asked", () => {
    const { unmount } = render(<TuningNotesField value="" onChange={vi.fn()} labelRow />);
    const box = screen.getByLabelText("Additional notes");
    expect(document.querySelector(`label[for="${box.id}"]`)).not.toBeNull();
    const tip = document.querySelector('button[aria-describedby="tuning-notes-field-info"]');
    expect(tip).not.toBeNull();
    expect(box).toHaveAttribute("aria-describedby", "tuning-notes-field-info");
    unmount();
    render(<TuningNotesField value="" onChange={vi.fn()} />);
    const bare = screen.getByLabelText("Additional notes");
    expect(document.querySelector(`label[for="${bare.id}"]`)).toBeNull();
    expect(document.querySelector('button[aria-describedby="tuning-notes-field-info"]')).toBeNull();
    expect(bare).not.toHaveAttribute("aria-describedby");
  });

  it("keeps the draft when Escape closes the open help tip", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value="more removal" onChange={onChange} labelRow />);
    const tip = document.querySelector('button[aria-describedby="tuning-notes-field-info"]') as HTMLElement;
    fireEvent.pointerEnter(tip, { pointerType: "mouse" });
    expect(tip).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(screen.getByLabelText("Additional notes"), { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the draft on Escape rather than committing it", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value="more removal" onChange={onChange} labelRow />);
    fireEvent.keyDown(screen.getByLabelText("Additional notes"), { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
  });

  // Escape cancels an IME composition candidate first; it must not also clear the whole draft.
  it("ignores Escape while an IME composition is active", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value="more removal" onChange={onChange} labelRow />);
    fireEvent.keyDown(screen.getByLabelText("Additional notes"), { key: "Escape", isComposing: true });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("never clears the draft on Escape without the label row", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value="more removal" onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("Additional notes"), { key: "Escape" });
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
        return <TuningNotesField value={value} onChange={(n) => { seen(n); setValue(n); }} labelRow />;
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

  it("keeps the tag key drawn 24 high and grows only its hit box on touch", () => {
    // jsdom cannot evaluate the pointer media query, so assert the classes.
    render(<TuningNotesField value="" onChange={vi.fn()} />);
    const key = screen.getByRole("button", { name: /tag/i });
    const cls = key.className;
    expect(cls).not.toContain("pointer-coarse:h-[44px]");
    expect(cls).not.toContain("pointer-coarse:h-auto");
    expect(cls).toContain("h-[24px]");
    expect(cls).toContain("pointer-coarse:after:absolute");
    expect(cls).toContain("pointer-coarse:after:-inset-y-[10px]");
    expect(cls).toContain("pointer-coarse:after:-inset-x-[8px]");
  });
});
