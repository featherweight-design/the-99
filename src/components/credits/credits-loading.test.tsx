import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/credits", useRouter: () => ({ refresh: vi.fn() }) }));

import { CreditsLoading } from "./credits-loading";

afterEach(cleanup);

describe("CreditsLoading (P6)", () => {
  it("draws the real title and sub at once, four blocks, and no spinner", () => {
    const { container } = render(<CreditsLoading />);
    expect(screen.getByRole("heading", { name: "Credits" })).toBeTruthy();
    expect(screen.getByText(/1 credit is 1 run of any tool/)).toBeTruthy();
    expect(container.querySelectorAll("[aria-hidden] > span, [aria-hidden] span.block").length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector("[data-loading-screen]")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
