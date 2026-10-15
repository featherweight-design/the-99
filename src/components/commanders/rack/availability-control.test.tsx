import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { commandersCopy } from "@/lib/copy/lanes";
import { AvailabilityControl } from "./availability-control";

const copy = commandersCopy.availability;

describe("AvailabilityControl keys", () => {
  it.each([true, false])("moves the choice and the focus with the arrows, Home and End (wide %s)", (wide) => {
    const change = vi.fn();
    render(<AvailabilityControl value="all" onChange={change} wide={wide} />);
    const all = screen.getByRole("radio", { name: copy.all });
    const free = screen.getByRole("radio", { name: copy.free });
    expect([all.tabIndex, free.tabIndex]).toEqual([0, -1]);
    fireEvent.keyDown(all, { key: "End" });
    expect(change).toHaveBeenLastCalledWith("free");
    expect(document.activeElement).toBe(free);
    fireEvent.keyDown(free, { key: "Home" });
    expect(change).toHaveBeenLastCalledWith("all");
    fireEvent.keyDown(all, { key: "ArrowRight" });
    expect(change).toHaveBeenLastCalledWith("free");
    expect(change).toHaveBeenCalledTimes(3);
  });
});
