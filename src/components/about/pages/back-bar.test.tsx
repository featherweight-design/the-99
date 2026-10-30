import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UNDER_HEADER } from "../../ui/under-header";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The back bar (About visual PR 6a, call 5): drawn while the live address carries the `from` the server validated;
// a move within About (an On this page chip) drops `from`, and the bar with it.

const mirrorUrl = vi.fn((href: string | URL) => window.history.replaceState(null, "", String(href)));
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl }));

const { BackBar } = await import("./back-bar");
const { OnThisPage } = await import("./on-this-page");

const FROM = "/collection/replace";
const LANDED = `/about/collection?from=${encodeURIComponent(FROM)}#upload`;

beforeEach(() => {
  mirrorUrl.mockClear();
  window.history.replaceState(null, "", LANDED);
});
afterEach(cleanup);

describe("BackBar", () => {
  it("names the screen and goes back to it", () => {
    render(<BackBar from={FROM} screen="Upload a file" />);
    const back = screen.getByRole("link", { name: "‹ Back to Upload a file" });
    expect(back.getAttribute("href")).toBe(FROM);
    expect(back.closest("[data-about-back]")!.className).toContain("sticky");
  });

  it("holds a long deck name to one line in the pill, keeping the whole of it (Copilot round 2)", () => {
    const name = "Sai, Master Thopterist and the Endless Parade of Very Small Flying Constructs ".repeat(2).trim();
    render(<BackBar from={FROM} screen={name} />);
    const back = screen.getByRole("link", { name: `‹ Back to ${name}` });
    expect(back.getAttribute("title")).toBe(`‹ Back to ${name}`);
    expect(back.className).toMatch(/\bmin-w-0\b/);
    expect(back.className).toMatch(/\bmax-w-full\b/);
    const label = back.querySelector("[data-about-back-label]")!;
    expect(label.textContent).toBe(`‹ Back to ${name}`);
    expect(label.className).toMatch(/\btruncate\b/);
    expect(label.className).toMatch(/\bmin-w-0\b/);
  });

  it("draws nothing once the address no longer carries that from", () => {
    const { container } = render(<BackBar from={FROM} screen="Upload a file" />);
    act(() => window.history.replaceState(null, "", "/about/collection#upload"));
    expect(container.querySelector("[data-about-back]")).toBeNull();
  });

  it("an On this page chip drops from, keeping the rest of the address", () => {
    const { container } = render(
      <>
        <BackBar from={FROM} screen="Upload a file" />
        <OnThisPage sections={[{ id: "cards", name: "Cards" }, { id: "upload", name: "Upload a file" }]} />
      </>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("link", { name: "Cards" }));
    });
    expect(mirrorUrl).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/about/collection");
    expect(container.querySelector("[data-about-back]")).toBeNull();
  });

  it("moves on the header's slide, as the top dock does, so the dock never sits over it mid-slide (Copilot round 3)", () => {
    const { container } = render(<BackBar from={FROM} screen="Upload a file" />);
    const bar = container.querySelector("[data-about-back]") as HTMLElement;
    for (const cls of UNDER_HEADER.split(" ")) expect(bar.classList).toContain(cls);
  });
});
