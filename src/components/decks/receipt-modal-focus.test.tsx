// ModalChrome's focus at open (Hugh, 2026-11-21): the sheet's heading, never its ✕, and the ✕'s ring drawn inset so
// the panel's rounded, overflow-hidden corner cannot clip it. The browser half (the ring's box inside the visible
// panel at 390 and 1300) is `scripts/probe-modal-close-focus.mjs`.
import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { ModalChrome } from "./receipt-modal";

function Typed() {
  const field = useRef<HTMLInputElement>(null);
  return (
    <ModalChrome title="Find" closeLabel="Close" onClose={() => {}} width={560} initialFocusRef={field}>
      <input ref={field} aria-label="Search" />
    </ModalChrome>
  );
}

describe("ModalChrome initial focus", () => {
  it("lands on the heading, not the close", () => {
    render(
      <ModalChrome title="Fixture modal title" closeLabel="Close" onClose={() => {}} width={560}>
        <button type="button">Send</button>
      </ModalChrome>,
    );
    const heading = screen.getByRole("heading", { name: "Fixture modal title" });
    expect(document.activeElement).toBe(heading);
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Close" }));
  });

  it("lands on the caller's field when it passes one", () => {
    render(<Typed />);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Search" }));
  });

  it("draws the close's focus ring inset", () => {
    render(
      <ModalChrome title="Fixture modal title" closeLabel="Close" onClose={() => {}} width={560}>
        <p>Body</p>
      </ModalChrome>,
    );
    const classes = screen.getByRole("button", { name: "Close" }).className.split(" ");
    expect(classes).toContain("focus-visible:outline-offset-[-4px]");
    // Rounded, so the ring's corner clears the phone sheet's 18px corner (a square one sat 0.9px outside it).
    expect(classes).toContain("rounded-[10px]");
  });
});
