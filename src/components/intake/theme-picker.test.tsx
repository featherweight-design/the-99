import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ThemePicker } from "./theme-picker";

const themes = [
  { slug: "elves", label: "Elves", commanders: 120 },
  { slug: "elfball", label: "Elfball", commanders: 12 },
  { slug: "orcs", label: "Orcs", commanders: 40 },
];

function Picker() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div>
      <span id="theme-label">Theme</span>
      <ThemePicker themes={themes} value={value} onChange={setValue} labelId="theme-label" />
      <button type="button">elsewhere</button>
    </div>
  );
}

const field = () => screen.getByRole("combobox");
const options = () => screen.queryAllByRole("option").filter((o) => !o.closest("[hidden]"));

// One rule for every pick-from-a-list field (DECK INPUT UX, Hugh 2026-10-12).
describe("the Theme picker", () => {
  it("clears the typed text after a pick and keeps the list open for the next", () => {
    render(<Picker />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "elf" } });
    fireEvent.click(screen.getByRole("option", { name: /Elfball/ }));
    expect(screen.getAllByTestId("theme-chip").map((c) => c.textContent)).toEqual(["Elfball✕"]);
    expect(field()).toHaveValue("");
    expect(options()).toHaveLength(3);
  });

  it("clears the text on Enter's pick too", () => {
    render(<Picker />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "orc" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(field()).toHaveValue("");
  });

  it("clears the text and closes the list on one Escape", () => {
    render(<Picker />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "elf" } });
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveValue("");
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });

  it("clears the text on a press outside", () => {
    render(<Picker />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "elf" } });
    fireEvent.pointerDown(screen.getByRole("button", { name: "elsewhere" }));
    expect(field()).toHaveValue("");
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });
});
