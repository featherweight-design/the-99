import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { useDiscardedScroll } from "./scroll-reset";

// jsdom stores `scrollTop` as a plain number with no layout behind it, so what
// these pin is that the write HAPPENS and on which transitions. Whether the box
// actually returns to its top is a question for a layout engine, and
// `pnpm probe:list-scroll` asks it.
function Box({ initial = "a" }: { initial?: string }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(initial);
  const ref = useDiscardedScroll<HTMLDivElement>([open, key]);
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)}>toggle</button>
      <button type="button" onClick={() => setKey((v) => (v === "a" ? "b" : "a"))}>swap</button>
      <button type="button" onClick={() => setKey(initial)}>same</button>
      <div ref={ref} data-testid="box">{key}</div>
    </>
  );
}

describe("useDiscardedScroll", () => {
  it("clears the offset when a key changes", () => {
    render(<Box />);
    const box = screen.getByTestId("box");

    box.scrollTop = 400;
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(box.scrollTop).toBe(0);

    box.scrollTop = 400;
    fireEvent.click(screen.getByRole("button", { name: "swap" }));
    expect(box.scrollTop).toBe(0);
  });

  it("leaves the offset alone while the keys hold still", () => {
    // A reader scrolling the open list is not a transition, and a reset on every
    // render would drag them back to the top mid-scroll.
    render(<Box />);
    const box = screen.getByTestId("box");

    box.scrollTop = 400;
    fireEvent.click(screen.getByRole("button", { name: "same" }));
    expect(box.scrollTop).toBe(400);
  });
});
