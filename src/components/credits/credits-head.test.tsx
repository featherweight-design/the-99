import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/credits", useRouter: () => ({ refresh: vi.fn() }) }));

import { CreditsLoading } from "./credits-loading";
import { CreditsReadFailed } from "./read-failed";
import { CreditsHead } from "./credits-head";

afterEach(cleanup);

const LINE = "Browsing is always free. Anything we write just for you uses a credit.";

describe("C1: the page says browsing is free", () => {
  it("the head draws the line verbatim, after the sub, at 13px in the body ink", () => {
    const { container } = render(<CreditsHead />);
    const line = screen.getByText(LINE);
    expect(line.tagName).toBe("P");
    expect(line.className).toContain("text-[13px]");
    expect(line.className).toContain("var(--fg-body)");
    const sub = screen.getByText(/1 credit is 1 run of any tool/);
    expect(sub.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bAI\b|\bmodel\b/);
  });

  it("the loading screen and the read-failed page carry it too", () => {
    render(<CreditsLoading />);
    expect(screen.getByText(LINE)).toBeTruthy();
    cleanup();
    render(<CreditsReadFailed />);
    expect(screen.getByText(LINE)).toBeTruthy();
  });
});
