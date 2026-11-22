// The centre strip's day/night button (addendum R2, K1): the first draw turns nothing; each toggle draws the icon it
// leaves turning out (`dn-out`) over the new one turning in (`dn-in`), 320 ms each, and reduced motion hides the
// outgoing one. The strip press is on every strip button but never a disabled Undo. The Menu (undrawn-tablet addendum,
// M1) is the strip's last button: one row back to the table, opened above the button (below a strip on the top edge),
// closed by Menu again, a tap outside or Esc, with focus moving to the row and back.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DayNight } from "../../lib/tracker/engine";
import { Spine } from "./spine";

afterEach(cleanup);

const holder = { label: "Nobody", art: null, held: false };

const onLeave = vi.fn();

function Strip({ canUndo = false, rect = { x: 0, y: 0, w: 56, h: 600 }, canvas = { w: 390, h: 844 } }: { canUndo?: boolean; rect?: { x: number; y: number; w: number; h: number }; canvas?: { w: number; h: number } }) {
  const [day, setDay] = useState<DayNight | null>(null);
  const [menu, setMenu] = useState(false);
  return (
    <Spine
      rect={rect}
      canvas={canvas}
      round={1}
      roundLabel="Round 1"
      monarch={holder}
      initiative={holder}
      day={day}
      pick={null}
      canUndo={canUndo}
      menu={menu}
      back={{ href: "/friends/table/t1", line: "The game stays on this phone. Back to the game picks it up.", onLeave }}
      onPick={vi.fn()}
      onDay={() => setDay((d) => (d === "day" ? "night" : "day"))}
      onDice={vi.fn()}
      onUndo={vi.fn()}
      onMenu={() => setMenu((m) => !m)}
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

describe("Spine Menu", () => {
  afterEach(() => onLeave.mockClear());

  it("draws Menu as the ⋯ strip button, named Menu, with a menu popup", () => {
    render(<Strip />);
    const b = screen.getByTestId("strip-menu");
    expect(b).toHaveAccessibleName("Menu");
    expect(b.getAttribute("aria-haspopup")).toBe("menu");
    expect(b.getAttribute("aria-expanded")).toBe("false");
    expect(b.textContent).toBe("");
    expect(b.querySelector("svg")).not.toBeNull();
  });

  it("opens one row back to the table, lit while open, with focus on the row", () => {
    render(<Strip />);
    fireEvent.click(screen.getByTestId("strip-menu"));
    const b = screen.getByTestId("strip-menu");
    expect(b.getAttribute("aria-expanded")).toBe("true");
    expect(b.className).toContain("aria-expanded:bg-[color:var(--accent)]");
    const menu = screen.getByRole("menu", { name: "Menu" });
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(1);
    expect(menu.contains(items[0])).toBe(true);
    expect(items[0].getAttribute("href")).toBe("/friends/table/t1");
    expect(items[0].textContent).toContain("Back to the table");
    expect(items[0].textContent).toContain("The game stays on this phone. Back to the game picks it up.");
    expect(document.activeElement).toBe(items[0]);
  });

  it("closes on Menu again, on Esc and on a tap outside, handing focus back to Menu", () => {
    render(<Strip />);
    const b = () => screen.getByTestId("strip-menu");
    fireEvent.click(b());
    fireEvent.click(b());
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(b());
    fireEvent.click(b());
    act(() => void document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(b());
    fireEvent.click(b());
    fireEvent.click(screen.getByRole("button", { name: "Close the menu" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the dice picker when it opens", () => {
    render(<Strip />);
    fireEvent.click(screen.getByTestId("strip-dice"));
    expect(screen.getByTestId("dice-menu")).toBeTruthy();
    fireEvent.click(screen.getByTestId("strip-menu"));
    expect(screen.queryByTestId("dice-menu")).toBeNull();
    expect(screen.getByRole("menu", { name: "Menu" })).toBeTruthy();
  });

  it("lands pending life before leaving", () => {
    render(<Strip />);
    fireEvent.click(screen.getByTestId("strip-menu"));
    fireEvent.click(screen.getByRole("menuitem"));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("opens above Menu, and below it on a strip along the top edge", () => {
    render(<Strip rect={{ x: 10, y: 378, w: 1160, h: 64 }} canvas={{ w: 1180, h: 820 }} />);
    fireEvent.click(screen.getByTestId("strip-menu"));
    expect(screen.getByTestId("strip-menu-pop").className).toContain("bottom-[calc(100%+10px)]");
    cleanup();
    render(<Strip rect={{ x: 10, y: 10, w: 1160, h: 64 }} canvas={{ w: 1180, h: 820 }} />);
    fireEvent.click(screen.getByTestId("strip-menu"));
    expect(screen.getByTestId("strip-menu-pop").className).toContain("top-[calc(100%+10px)]");
  });
});
