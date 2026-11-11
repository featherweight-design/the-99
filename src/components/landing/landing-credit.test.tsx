import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import { LandingCredit } from "./landing-credit";

let pathname: string | null = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
afterEach(cleanup);

describe("LandingCredit", () => {
  it("draws the data credit on / and nothing anywhere else", () => {
    pathname = "/";
    const { container, rerender } = render(<LandingCredit />);
    expect(container.textContent).toBe(landingCopy.footer.credit);
    for (const other of ["/privacy", "/terms", "/card/sol-ring", "/commander/x", "/sign-up", null]) {
      pathname = other;
      rerender(<LandingCredit />);
      expect(container.innerHTML).toBe("");
    }
  });
});
