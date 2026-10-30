// The text-flow card trigger: a span that wraps with its sentence and keeps a native button's
// keyboard contract (Enter on keydown, Space on keyup, armed by this trigger's own keydown).

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CardDetailFlowTrigger } from "./card-detail-flow-trigger";

const open = vi.fn();
vi.mock("./card-detail-provider", () => ({
  cardDetailCopy: { triggerAria: (n: string) => `View details for ${n}` },
  useCardTrigger: ({ oracleId }: { oracleId: string }) => ({
    intent: { "data-intent": oracleId },
    hover: { "data-hover": "1" },
    pending: oracleId === "busy",
    openFrom: (opener: HTMLElement) => open(oracleId, opener),
  }),
}));

const draw = (props: Partial<React.ComponentProps<typeof CardDetailFlowTrigger>> = {}) =>
  render(
    <p>
      <CardDetailFlowTrigger oracleId="a" name="Nelly Borca, Impulsive Accuser" {...props}>Nelly Borca, Impulsive Accuser</CardDetailFlowTrigger>
      <CardDetailFlowTrigger oracleId="b" name="Sol Ring">Sol Ring</CardDetailFlowTrigger>
    </p>,
  );
const a = () => screen.getByRole("button", { name: "View details for Nelly Borca, Impulsive Accuser" });
const b = () => screen.getByRole("button", { name: "View details for Sol Ring" });

describe("CardDetailFlowTrigger", () => {
  beforeEach(() => open.mockClear());

  it("is a focusable span with role button and the card's aria-label", () => {
    draw();
    expect(a().tagName).toBe("SPAN");
    expect(a().tabIndex).toBe(0);
    expect(a().getAttribute("aria-label")).toBe("View details for Nelly Borca, Impulsive Accuser");
  });

  it("opens on click, handing over itself as the opener", () => {
    draw();
    fireEvent.click(a());
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("a", a());
  });

  it("Enter opens once on keydown and ignores repeats", () => {
    draw();
    expect(fireEvent.keyDown(a(), { key: "Enter" })).toBe(false); // default prevented: no scroll
    fireEvent.keyDown(a(), { key: "Enter", repeat: true });
    fireEvent.keyDown(a(), { key: "Enter", repeat: true });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("a", a());
  });

  it("Space does nothing on keydown (and does not scroll), opens once on keyup", () => {
    draw();
    expect(fireEvent.keyDown(a(), { key: " " })).toBe(false);
    expect(open).not.toHaveBeenCalled();
    fireEvent.keyUp(a(), { key: " " });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("a", a());
  });

  it("a keyup with no keydown on this trigger opens nothing", () => {
    draw();
    fireEvent.keyUp(a(), { key: " " });
    expect(open).not.toHaveBeenCalled();
  });

  it("repeat Space keydowns do not arm twice: one release, one open", () => {
    draw();
    fireEvent.keyDown(a(), { key: " " });
    fireEvent.keyDown(a(), { key: " ", repeat: true });
    fireEvent.keyDown(a(), { key: " ", repeat: true });
    fireEvent.keyUp(a(), { key: " " });
    fireEvent.keyUp(a(), { key: " " });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("a repeat keydown alone never arms", () => {
    draw();
    fireEvent.keyDown(a(), { key: " ", repeat: true });
    fireEvent.keyUp(a(), { key: " " });
    expect(open).not.toHaveBeenCalled();
  });

  it("Space down on one name, Tab to another, release there opens nothing", () => {
    draw();
    a().focus();
    fireEvent.keyDown(a(), { key: " " });
    act(() => b().focus()); // blurs a, which disarms it
    fireEvent.keyUp(b(), { key: " " });
    expect(open).not.toHaveBeenCalled();
    // and returning to a does not leave it armed
    act(() => a().focus());
    fireEvent.keyUp(a(), { key: " " });
    expect(open).not.toHaveBeenCalled();
  });

  it("other keys do nothing", () => {
    draw();
    fireEvent.keyDown(a(), { key: "a" });
    fireEvent.keyUp(a(), { key: "a" });
    expect(open).not.toHaveBeenCalled();
  });

  it("disabled: aria-disabled, out of the tab order, no click, key, or hover wiring", () => {
    draw({ disabled: true, preview: true });
    expect(a().getAttribute("aria-disabled")).toBe("true");
    expect(a().tabIndex).toBe(-1);
    expect(a().hasAttribute("data-intent")).toBe(false);
    expect(a().hasAttribute("data-hover")).toBe(false);
    fireEvent.click(a());
    fireEvent.keyDown(a(), { key: "Enter" });
    fireEvent.keyDown(a(), { key: " " });
    fireEvent.keyUp(a(), { key: " " });
    expect(open).not.toHaveBeenCalled();
  });

  it("enabled: no aria-disabled, intent wired, hover only when asked", () => {
    draw();
    expect(a().hasAttribute("aria-disabled")).toBe(false);
    expect(a().getAttribute("data-intent")).toBe("a");
    expect(a().hasAttribute("data-hover")).toBe(false);
    draw({ preview: true });
    expect(screen.getAllByRole("button", { name: /Nelly/ })[1].getAttribute("data-hover")).toBe("1");
  });

  it("keeps testid, title, describedBy, a custom aria-label, busy and pending opacity", () => {
    render(
      <CardDetailFlowTrigger oracleId="busy" name="X" testId="t" title="tip" describedBy="d" ariaLabel="custom">X</CardDetailFlowTrigger>,
    );
    const el = screen.getByTestId("t");
    expect(el.getAttribute("title")).toBe("tip");
    expect(el.getAttribute("aria-describedby")).toBe("d");
    expect(el.getAttribute("aria-label")).toBe("custom");
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(el.style.opacity).toBe("0.55");
  });

  it("draws the focus ring on keyboard focus only, and clones decoration across wrapped fragments", () => {
    draw();
    const cls = a().className;
    expect(cls).toContain("focus-visible:outline-2");
    expect(cls).toContain("box-decoration-clone");
    expect(cls).not.toMatch(/(^| )outline-2/);
  });
});
