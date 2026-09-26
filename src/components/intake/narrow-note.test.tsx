import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { emptyParams, parseChooseParams, type ChooseParams } from "../../lib/intake/params";
import { narrowOptions } from "../../lib/intake/present";
import { NarrowNote } from "./narrow-note";

const labels = { theme: (s: string) => ({ dinosaurs: "Dinosaurs", landfall: "Landfall" })[s] ?? s, card: null };
const p: ChooseParams = {
  ...emptyParams(), results: true, words: "big lizards", colors: ["r", "g"], match: "exactly",
  themes: ["dinosaurs", "landfall"], budgetDollars: 50,
};
const options = narrowOptions(
  {
    without: [
      { answers: [{ kind: "theme", slug: "landfall" }], count: 24 },
      { answers: [{ kind: "budget" }], count: 9 },
      { answers: [{ kind: "colors" }], count: 0 },
    ],
    widen: { count: 6 },
    cardOverBracket: null,
  },
  p,
  labels,
);
const landed = (a: HTMLElement) => parseChooseParams(new URLSearchParams(a.getAttribute("href")!.split("?")[1]));

describe("the narrow note", () => {
  it("links each option to the same results with exactly that one answer loosened", () => {
    render(<NarrowNote count={2} options={options} changeHref="/decks/new/choose" />);
    const links = screen.getAllByTestId("narrow-option");
    expect(links.map((l) => l.textContent)).toEqual([
      "Drop Landfall24 commanders→",
      "Drop $509 commanders→",
      "Any Red · Green, not exactly6 commanders→",
    ]);
    expect(links.every((l) => l.getAttribute("href")!.startsWith("/decks/new/choose?"))).toBe(true);
    expect(landed(links[0])).toEqual({ ...p, themes: ["dinosaurs"] });
    expect(landed(links[1])).toEqual({ ...p, budgetDollars: null });
    expect(landed(links[2])).toEqual({ ...p, match: "contains" });
  });

  it("draws the slim bar for a few, and the empty state with a way back for none", () => {
    const { unmount } = render(<NarrowNote count={1} options={options} changeHref="/x" />);
    expect(screen.getByTestId("narrow-few").textContent).toContain("Only one commander fits all of that");
    unmount();
    render(<NarrowNote count={0} options={options} changeHref="/decks/new/choose?t=dinosaurs" />);
    expect(screen.getByTestId("narrow-none").textContent).toContain("No commander fits all of that");
    expect(screen.getByRole("link", { name: "change your answers" }).getAttribute("href")).toBe("/decks/new/choose?t=dinosaurs");
  });
});
