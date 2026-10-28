import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AboutTabs } from "./about-tabs";

afterEach(cleanup);

describe("AboutTabs: the Reference, the one tab left (About visual PR 6a)", () => {
  it("draws the Reference with its count, and no Tools tab", () => {
    const { container } = render(<AboutTabs count={71} panel={<p>reference panel</p>} />);
    expect(screen.getByText("reference panel")).toBeTruthy();
    expect(container.textContent).toContain("Reference 71");
    expect(container.textContent).not.toContain("Tools");
    expect(screen.queryByRole("tab")).toBeNull();
  });
});

describe("About's head: Take the tour (discovery R3·2)", () => {
  it("draws Take the tour → after the subtitle with the switch on, going to Home's tour parameter", () => {
    render(<AboutTabs count={71} panel={null} tour />);
    const press = screen.getByRole("link", { name: "Take the tour →" });
    expect(press.getAttribute("href")).toBe("/?tour=1");
    const sub = press.closest("p");
    expect(sub?.textContent?.startsWith("Every entry")).toBe(true);
    expect(sub?.lastElementChild).toBe(press);
  });

  it("draws no press with the switch off", () => {
    render(<AboutTabs count={71} panel={null} />);
    expect(screen.queryByRole("link", { name: "Take the tour →" })).toBeNull();
  });
});
