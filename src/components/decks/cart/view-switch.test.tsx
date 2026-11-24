import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ViewSwitch } from "./view-switch";

describe("ViewSwitch", () => {
  // On a phone the switch spans the column, its views in equal shares (Hugh, 2026-11-24).
  it("fills a phone's width with equal segments", () => {
    render(<ViewSwitch view="card" onView={vi.fn()} deck friend />);
    expect(screen.getByRole("radiogroup").className).toContain("w-full");
    for (const segment of screen.getAllByRole("radio")) expect(segment.className).toContain("flex-1");
  });
});
