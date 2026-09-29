import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aboutCopy } from "../../lib/copy/about";
import { howItWorksRowsCopy } from "../../lib/copy/how-it-works";
import { AboutPage } from "./about-page";

vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn(), recordAboutVisit: vi.fn(() => Promise.resolve()) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// The plan's promise for this line (2026-09-28): with HOW_IT_WORKS_ENABLED off, production's
// /about is the page it was. Checked in both page modes, since the sheet mode draws the jump mark
// the rows share.
afterEach(() => {
  delete process.env.HOW_IT_WORKS_ENABLED;
});

describe.each([false, true])("About with HOW_IT_WORKS_ENABLED off (sheetMode %s)", (sheetMode) => {
  it("draws no appendix and keeps the intro word for word", () => {
    const { container } = render(<AboutPage seen={0} sheetMode={sheetMode} />);
    expect(container.querySelector("#how-it-works")).toBeNull();
    expect(container.querySelector("[data-method]")).toBeNull();
    expect(screen.queryByText(howItWorksRowsCopy.title)).toBeNull();
    expect(screen.getByText(new RegExp("^" + aboutCopy.pageIntro.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeTruthy();
    expect(container.textContent).not.toContain(howItWorksRowsCopy.pageIntroClause);
  });
});

describe("About with HOW_IT_WORKS_ENABLED on", () => {
  it("draws the appendix after the chapters, and names it in the intro", () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    const { container } = render(<AboutPage seen={0} />);
    const section = container.querySelector("#how-it-works");
    expect(section).not.toBeNull();
    const chapters = [...container.querySelectorAll("section[id^='chapter-']")];
    expect(chapters.length).toBeGreaterThan(0);
    // After the last chapter in document order.
    expect(chapters.at(-1)!.compareDocumentPosition(section!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain(howItWorksRowsCopy.pageIntroClause);
    expect(section!.querySelectorAll("li[id^='how-']")).toHaveLength(8);
  });
});
