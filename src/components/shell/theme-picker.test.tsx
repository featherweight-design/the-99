// The repo has no user-event, so interaction goes through fireEvent. Nothing
// here depends on the focus a real pointer click would move, only on the
// handler running.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemePicker } from "./theme-picker";

describe("ThemePicker", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "amonkhet";
    document.cookie = "the99_theme=; path=/; max-age=0";
  });

  it("is a labelled radiogroup with six options", () => {
    render(<ThemePicker current="amonkhet" />);
    expect(screen.getByRole("radiogroup", { name: "Colour theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("names each option by theme and plane", () => {
    render(<ThemePicker current="amonkhet" />);
    expect(screen.getByRole("radio", { name: "Rune Frost — Kaldheim" })).toBeInTheDocument();
  });

  it("marks the current theme checked, and only that one", () => {
    render(<ThemePicker current="duskmourn" />);
    const checked = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName("Screen Glow — Duskmourn");
  });

  it("does not carry selection by colour alone — the checked chip draws a tick", () => {
    render(<ThemePicker current="duskmourn" />);
    const checked = screen.getByRole("radio", { name: "Screen Glow — Duskmourn" });
    expect(checked.querySelector("[data-selected-tick]")).not.toBeNull();
    const other = screen.getByRole("radio", { name: "Moonlit — Innistrad" });
    expect(other.querySelector("[data-selected-tick]")).toBeNull();
  });

  // The whole point of a miniature over a swatch: it has to paint the theme it
  // offers, not the one in force. Without data-theme on the box every chip
  // would preview whatever the app is currently wearing.
  it("paints each miniature in the theme it previews", () => {
    render(<ThemePicker current="amonkhet" />);
    const chip = screen.getByRole("radio", { name: "Oil and Iron — New Phyrexia" });
    expect(chip.querySelector("[data-theme]")?.getAttribute("data-theme")).toBe("phyrexia");
  });

  it("swaps the document attribute immediately on selection", () => {
    render(<ThemePicker current="amonkhet" />);
    fireEvent.click(screen.getByRole("radio", { name: "Rune Frost — Kaldheim" }));
    expect(document.documentElement.dataset.theme).toBe("kaldheim");
  });

  it("persists the selection to the cookie", () => {
    render(<ThemePicker current="amonkhet" />);
    fireEvent.click(screen.getByRole("radio", { name: "Neon Rain — Kamigawa: Neon Dynasty" }));
    expect(document.cookie).toContain("the99_theme=kamigawa");
  });

  it("announces the change, because there is no Save button to confirm it", () => {
    render(<ThemePicker current="amonkhet" />);
    fireEvent.click(screen.getByRole("radio", { name: "Moonlit — Innistrad" }));
    expect(screen.getByRole("status")).toHaveTextContent("Moonlit applied.");
  });

  // Both axes step by one. The options are a grid, but a radiogroup reads
  // Right/Down as "next" and Left/Up as "previous" regardless of layout.
  it.each([
    ["ArrowUp", "ArrowDown"],
    ["ArrowLeft", "ArrowRight"],
  ])("moves focus with %s / %s, wrapping", (back, forward) => {
    render(<ThemePicker current="amonkhet" />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: back });
    expect(radios[5]).toHaveFocus();
    fireEvent.keyDown(radios[5], { key: forward });
    expect(radios[0]).toHaveFocus();
  });

  // A radiogroup with no Save has to select as it moves, or the arrow keys
  // leave the caret somewhere the app has not gone.
  it("selects as the arrow key moves, not on a second press", () => {
    render(<ThemePicker current="amonkhet" />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: "ArrowUp" });
    expect(radios[5]).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("kaldheim");
    expect(document.cookie).toContain("the99_theme=kaldheim");
    expect(screen.getByRole("status")).toHaveTextContent("Rune Frost applied.");
  });

  it("keeps the mobile sheet's chips at the 44px minimum touch target", () => {
    render(<ThemePicker current="amonkhet" panel="sheet" />);
    for (const chip of screen.getAllByRole("radio")) {
      expect(chip.className).toContain("min-h-[44px]");
    }
  });
});
