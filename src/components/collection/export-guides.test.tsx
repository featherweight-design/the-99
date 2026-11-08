// How to export (landing PR 7b): one app's steps open at a time, the third step says "here", the Moxfield note sits in
// Moxfield's guide alone, and the dialog closes on Escape with focus back on its opener.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportGuides } from "./export-guides";
import { collectionSources } from "../../lib/copy/collection-sources";

const open = () => {
  render(<ExportGuides className="x">How to export</ExportGuides>);
  fireEvent.click(screen.getByRole("button", { name: "How to export" }));
  return screen.getByRole("dialog", { name: "How to export your collection" });
};

describe("ExportGuides", () => {
  it("lists the four apps and Another app as five chevron rows, collapsed, and no brand beyond the four", () => {
    const d = open();
    for (const name of [...collectionSources.apps.map((a) => a.name), "Another app"]) expect(within(d).getByRole("button", { name })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(within(d).getByRole("button", { name: "Another app" }));
    expect(within(d).getByRole("button", { name: "Another app" })).toHaveAttribute("aria-expanded", "true");
    expect(d.textContent).toContain("Any CSV with a Name and a Quantity column imports.");
    expect(d.textContent).not.toMatch(/TCGplayer|Dragon Shield|Delver/);
  });

  it("opens one app at a time and says the file is uploaded here", () => {
    const d = open();
    fireEvent.click(within(d).getByRole("button", { name: "ManaBox" }));
    expect(within(d).getByRole("button", { name: "ManaBox" })).toHaveAttribute("aria-expanded", "true");
    expect(d.textContent).toContain("then upload it here.");
    fireEvent.click(within(d).getByRole("button", { name: "Archidekt" }));
    expect(within(d).getByRole("button", { name: "ManaBox" })).toHaveAttribute("aria-expanded", "false");
    expect(within(d).getByRole("button", { name: "Archidekt" })).toHaveAttribute("aria-expanded", "true");
    expect(d.textContent).not.toContain("once you’re in");
  });

  it("carries the Moxfield note in Moxfield's guide alone", () => {
    const d = open();
    const note = collectionSources.moxfieldNote;
    const notes = () => [...d.querySelectorAll("p")].filter((p) => p.textContent === note);
    expect(notes()).toHaveLength(1);
    expect(notes()[0].closest("li")?.querySelector("button")?.textContent).toContain("Moxfield");
  });

  it("closes on Escape and returns focus to its opener", () => {
    const d = open();
    fireEvent.keyDown(d, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "How to export" }));
  });
});
