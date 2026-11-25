// How to export (landing PR 7b): one app's steps open at a time, the third step says "here", the Moxfield note sits in
// Moxfield's guide alone, and the dialog closes on Escape with focus back on its opener.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportGuides } from "./export-guides";
import { allGuideApps, collectionSources, moreGuideApps } from "../../lib/copy/collection-sources";

const open = () => {
  render(<ExportGuides className="x">How to export</ExportGuides>);
  fireEvent.click(screen.getByRole("button", { name: collectionSources.toggle }));
  return screen.getByRole("dialog", { name: collectionSources.signedIn.title });
};

describe("ExportGuides", () => {
  it("lists the seven apps and Another app as eight chevron rows, collapsed", () => {
    const d = open();
    for (const name of [...allGuideApps.map((a) => a.name), collectionSources.another.name]) expect(within(d).getByRole("button", { name })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(within(d).getByRole("button", { name: collectionSources.another.name }));
    expect(within(d).getByRole("button", { name: collectionSources.another.name })).toHaveAttribute("aria-expanded", "true");
    expect(d.textContent).toContain("Any CSV with a Name and a Quantity column imports.");
  });

  it("opens one app at a time and says the file is uploaded here", () => {
    const d = open();
    fireEvent.click(within(d).getByRole("button", { name: "ManaBox" }));
    expect(within(d).getByRole("button", { name: "ManaBox" })).toHaveAttribute("aria-expanded", "true");
    expect(d.textContent).toContain("then upload it here.");
    fireEvent.click(within(d).getByRole("button", { name: "Archidekt" }));
    expect(within(d).getByRole("button", { name: "ManaBox" })).toHaveAttribute("aria-expanded", "false");
    expect(within(d).getByRole("button", { name: "Archidekt" })).toHaveAttribute("aria-expanded", "true");
    expect(d.textContent).not.toContain("once you have an account");
  });

  it("carries the Moxfield note in Moxfield's guide alone", () => {
    const d = open();
    const note = `${collectionSources.moxfieldNote.lead} ${collectionSources.moxfieldNote.body}`;
    const notes = () => [...d.querySelectorAll("p")].filter((p) => p.textContent === note);
    expect(notes()).toHaveLength(1);
    expect(notes()[0].closest("li")?.querySelector("button")?.textContent).toContain("Moxfield");
  });

  it("closes on Escape and returns focus to its opener", () => {
    const d = open();
    fireEvent.keyDown(d, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: collectionSources.toggle }));
  });

  it("opens the named app's steps first when the opener names one", () => {
    render(<ExportGuides className="x" openApp="delver">How to export</ExportGuides>);
    fireEvent.click(screen.getByRole("button", { name: collectionSources.toggle }));
    const d = screen.getByRole("dialog", { name: collectionSources.signedIn.title });
    expect(within(d).getByRole("button", { name: moreGuideApps[1].name })).toHaveAttribute("aria-expanded", "true");
    expect(within(d).getByRole("button", { name: "ManaBox" })).toHaveAttribute("aria-expanded", "false");
    expect(d.textContent).toContain("Create CSV file");
  });
});
