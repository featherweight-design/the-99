import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { howItWorksCopy, type HowMethod } from "../../lib/copy/about";
import { MethodTag, MethodTags } from "./method-tag";

const ALL: HowMethod[] = ["rules", "decks", "model", "you", "list"];

describe("MethodTag", () => {
  it("names each of the five methods in its own words", () => {
    const { container } = render(<MethodTags methods={ALL} />);
    expect([...container.querySelectorAll("[data-method]")].map((el) => el.textContent)).toEqual(
      ALL.map((m) => howItWorksCopy.methods[m].tag),
    );
  });

  // Coloring or shaping a method by how much to trust it would be a score (handoff §MethodTag).
  it("draws all five identically", () => {
    const classes = ALL.map((m) => {
      const { container } = render(<MethodTag method={m} />);
      return container.querySelector("[data-method]")!.className;
    });
    expect(new Set(classes).size).toBe(1);
  });

  it("is a little larger in the long-form key", () => {
    const { container } = render(<MethodTag method="rules" size="key" />);
    expect(container.querySelector("[data-method]")!.className).toContain("text-[10.5px]");
  });
});
