import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Avail } from "@/lib/commanders/lane-params";
import { commandersCopy } from "@/lib/copy/lanes";
import { AvailabilityControl } from "./availability-control";

const copy = commandersCopy.availability;

describe("AvailabilityControl keys", () => {
  it.each([true, false])("moves the choice and the focus with the arrows, Home and End (wide %s)", (wide) => {
    const change = vi.fn();
    function Held() {
      const [value, setValue] = useState<Avail>("all");
      return <AvailabilityControl value={value} onChange={(a) => { change(a); setValue(a); }} wide={wide} />;
    }
    render(<Held />);
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
    // A key that lands on the choice already made reports nothing.
    fireEvent.keyDown(free, { key: "End" });
    expect(change).toHaveBeenCalledTimes(3);
  });
});
