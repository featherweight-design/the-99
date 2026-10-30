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
    const { container } = render(<CreditsHead suggestedV2={false} />);
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
    render(<CreditsReadFailed suggestedV2={false} />);
    expect(screen.getByText(LINE)).toBeTruthy();
  });
});

describe("the sub follows the reader's Suggested changes v2 switch (a v2 run over 10 changes uses 2 credits)", () => {
  it("v2 off: the shipped sub", () => {
    render(<CreditsHead suggestedV2={false} />);
    expect(screen.getByText(/^1 credit is 1 run of any tool/)).toBeTruthy();
    expect(screen.queryByText(/Most runs use 1 credit/)).toBeNull();
  });

  it("v2 on: no longer \"any tool\"", () => {
    render(<CreditsHead suggestedV2 />);
    expect(screen.getByText(/^Most runs use 1 credit/)).toBeTruthy();
    expect(screen.queryByText(/any tool/)).toBeNull();
  });

  it("the read-failed page takes the reader's switch, both ways", () => {
    render(<CreditsReadFailed suggestedV2 />);
    expect(screen.queryByText(/any tool/)).toBeNull();
    cleanup();
    render(<CreditsReadFailed suggestedV2={false} />);
    expect(screen.getByText(/^1 credit is 1 run of any tool/)).toBeTruthy();
  });

  it("the loading screen, drawn before any switch is read, says what is true for every reader and names no 2", () => {
    render(<CreditsLoading />);
    const sub = screen.getByText(/^Most runs use 1 credit/);
    expect(sub.textContent).not.toMatch(/\b2\b|any tool/);
  });
});
