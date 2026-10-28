import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DecklistGroupHeader } from "./decklist-group-header";

// Small items 2 (`Draft-Note-Phone`, ruled by d9): the draft's group note shows on a phone too, on the
// heading's line 8px after the count (mono 10.5px), and keeps the right edge from `md`. Every other
// group note stays desktop only.
describe("DecklistGroupHeader's note", () => {
  it("draws a note asked for at every width on a phone, after the count, and at the right edge from md", () => {
    render(<DecklistGroupHeader label="Artifacts" count={24} note="2 changed, not yet committed" noteColor="var(--accent-text)" noteEveryWidth />);
    const note = screen.getByText("2 changed, not yet committed");
    expect(note.classList.contains("hidden")).toBe(false);
    expect([...note.classList]).toEqual(expect.arrayContaining(["ml-[8px]", "md:ml-auto", "font-mono", "text-[10.5px]"]));
    expect(note.style.color).toBe("var(--accent-text)");
    expect(note.style.marginLeft).toBe("");
    const row = note.parentElement!;
    expect([...row.classList]).toEqual(expect.arrayContaining(["justify-start", "md:justify-between"]));
    expect(row.classList.contains("justify-between")).toBe(false);
  });

  it("keeps every other note desktop only, as shipped", () => {
    render(<DecklistGroupHeader label="Commander" count={1} note="from the precon" />);
    const note = screen.getByText("from the precon");
    expect([...note.classList]).toEqual(expect.arrayContaining(["hidden", "md:block"]));
    expect(note.parentElement!.classList.contains("justify-between")).toBe(true);
  });
});
