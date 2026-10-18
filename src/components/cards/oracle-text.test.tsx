import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OracleText } from "./oracle-text";
import { spokenManaSymbol } from "../../lib/copy/card-surfaces";

describe("OracleText", () => {
  it("draws the text as written by default (card details)", () => {
    const { container } = render(<OracleText text="{X}: Valki becomes a copy." keywords={[]} />);
    expect(container.textContent).toBe("{X}: Valki becomes a copy.");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("with symbols, draws each mana symbol as its printed symbol and speaks it, in reminder text too", () => {
    const { container } = render(<OracleText text={"Add {R}{R}. ({G} pays for it.) {T}: untap."} keywords={[]} symbols />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(3);
    // Spoken as the symbol itself, never as a cost: `Add {R}` makes mana.
    expect(imgs[0].getAttribute("aria-label")).toBe(spokenManaSymbol("{R}"));
    expect(imgs[0].getAttribute("aria-label")).not.toMatch(/cost/i);
    expect(container.textContent).not.toContain("{R}");
    // A token the sprite has no art for ({T}: costs only) stays as written.
    expect(container.textContent).toContain("{T}");
    expect(container.querySelector("em")?.querySelector("[role='img']")).not.toBeNull();
  });
});
