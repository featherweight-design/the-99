import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { captionBlocks, EntryCaption } from "./entry-caption";

describe("captionBlocks", () => {
  it("reads a caption with no marks as one paragraph", () => {
    expect(captionBlocks("One sentence. Another, with a well-known card - Sol Ring.")).toEqual([
      { kind: "p", text: "One sentence. Another, with a well-known card - Sol Ring." },
    ]);
  });

  it("starts a paragraph at a blank line", () => {
    expect(captionBlocks("First.\n\nSecond.")).toEqual([
      { kind: "p", text: "First." },
      { kind: "p", text: "Second." },
    ]);
  });

  it("reads a block whose every line starts `- ` as a list", () => {
    expect(captionBlocks("Three things:\n\n- one\n- two\n- three\n\nAfter.")).toEqual([
      { kind: "p", text: "Three things:" },
      { kind: "ul", items: ["one", "two", "three"] },
      { kind: "p", text: "After." },
    ]);
  });

  it("keeps a block with one non-item line a paragraph, joined on a space", () => {
    expect(captionBlocks("- looks like an item\nbut this line is not")).toEqual([
      { kind: "p", text: "- looks like an item but this line is not" },
    ]);
  });
});

describe("EntryCaption", () => {
  it("draws paragraphs as <p> and a list as <ul> with <li> items", () => {
    const { container } = render(<EntryCaption caption={"Lead.\n\n- alpha\n- beta\n\nTail."} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(screen.getByText("alpha").tagName).toBe("LI");
    expect(screen.getByText("Tail.").tagName).toBe("P");
  });
});
