// The centre strip's day/night button (addendum R2, K1): the first draw turns nothing; each toggle draws the icon it
// leaves turning out (`dn-out`) over the new one turning in (`dn-in`), 320 ms each, and reduced motion hides the
// outgoing one. The strip press is on every strip button but never a disabled Undo.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DayNight } from "../../lib/tracker/engine";
import { Spine } from "./spine";

afterEach(cleanup);

const holder = { label: "Nobody", art: null, held: false };

function Strip({ canUndo = false }: { canUndo?: boolean }) {
  const [day, setDay] = useState<DayNight | null>(null);
  return (
    <Spine
      rect={{ x: 0, y: 0, w: 56, h: 600 }}
      canvas={{ w: 390, h: 844 }}
      round={1}
      roundLabel="Round 1"
      monarch={holder}
      initiative={holder}
      day={day}
      pick={null}
      canUndo={canUndo}
      menu={false}
      onPick={vi.fn()}
      onDay={() => setDay((d) => (d === "day" ? "night" : "day"))}
      onDice={vi.fn()}
      onUndo={vi.fn()}
      onMenu={vi.fn()}
    />
  );
}

describe("Spine day/night", () => {
  it("draws one still icon until the first toggle", () => {
    render(<Strip />);
    expect(screen.queryByTestId("strip-day-out")).toBeNull();
    expect(screen.getByTestId("strip-day-icon").className).not.toContain("dn-in");
  });

  it("turns the old icon out and the new one in on each toggle, 320 ms, reduced motion drawing only the new one", () => {
    render(<Strip />);
    for (let n = 0; n < 2; n++) {
      fireEvent.click(screen.getByTestId("strip-day"));
      const out = screen.getByTestId("strip-day-out");
      expect(out.className).toContain("motion-safe:animate-[dn-out_320ms_var(--motion-ease-out)_both]");
      expect(out.className).toContain("motion-reduce:hidden");
      expect(out.getAttribute("aria-hidden")).toBe("true");
      expect(screen.getByTestId("strip-day-icon").className).toContain("motion-safe:animate-[dn-in_320ms_var(--motion-ease-out)_both]");
    }
    // Two toggles: off, then day, then night. The outgoing icon is the lit sun, the incoming one the moon.
    expect(screen.getByTestId("strip-day-out").className).toContain("text-[color:var(--accent-text)]");
  });

  it("presses every strip button only while enabled", () => {
    render(<Strip />);
    for (const id of ["strip-monarch", "strip-day", "strip-dice", "strip-undo", "strip-menu"]) {
      const c = screen.getByTestId(id).className;
      expect(c, id).toContain("enabled:active:bg-[color:var(--accent)]");
      expect(c, id).toContain("motion-safe:enabled:active:[transform:scale(.92)]");
      expect(c, id).not.toMatch(/(^|\s)active:/);
    }
    expect((screen.getByTestId("strip-undo") as HTMLButtonElement).disabled).toBe(true);
  });
});
