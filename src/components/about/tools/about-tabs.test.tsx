import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mirrorUrl = vi.fn();
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl }));

const { AboutTabs } = await import("./about-tabs");
const { aboutTabOf } = await import("../../../lib/about/tab");

afterEach(cleanup);
beforeEach(() => {
  mirrorUrl.mockClear();
  window.history.replaceState(null, "", "/about");
});

const panels = { tools: <p>tools panel</p>, reference: <p>reference panel</p> };

describe("AboutTabs (C1, R2 gap 12)", () => {
  it("opens on Tools by default, the Reference hidden", () => {
    render(<AboutTabs initial="tools" counts={{ tools: 14, reference: 71 }} panels={panels} helpHint={false} />);
    expect(screen.getByRole("tab", { name: "Tools 14" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("tools panel")).toBeTruthy();
    expect((screen.getByText("reference panel").closest("[role=tabpanel]") as HTMLElement).hidden).toBe(true);
  });

  it("switching to the Reference mirrors ?tab=reference, and back to Tools drops it", () => {
    render(<AboutTabs initial="tools" counts={{ tools: 14, reference: 71 }} panels={panels} helpHint={false} />);
    fireEvent.click(screen.getByRole("tab", { name: "Reference 71" }));
    expect((screen.getByText("reference panel").closest("[role=tabpanel]") as HTMLElement).hidden).toBe(false);
    expect(String(mirrorUrl.mock.calls.at(-1)![0])).toMatch(/\/about\?tab=reference$/);
    window.history.replaceState(null, "", "/about?tab=reference");
    fireEvent.click(screen.getByRole("tab", { name: "Tools 14" }));
    expect(String(mirrorUrl.mock.calls.at(-1)![0])).toMatch(/\/about$/);
  });

  it("moves the selection with the arrow keys", () => {
    render(<AboutTabs initial="tools" counts={{ tools: 14, reference: 71 }} panels={panels} helpHint={false} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Tools 14" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Reference 71" }).getAttribute("aria-selected")).toBe("true");
  });

  it("points at the ? only while the ? is drawn", () => {
    const { container, rerender } = render(<AboutTabs initial="tools" counts={{ tools: 14, reference: 71 }} panels={panels} helpHint={false} />);
    expect(container.textContent).not.toContain("for its own entries");
    rerender(<AboutTabs initial="tools" counts={{ tools: 14, reference: 71 }} panels={panels} helpHint />);
    expect(container.textContent).toContain("for its own entries");
  });

  it("follows a navigation that asks for another tab, as a link to ?tab=reference does, every time", () => {
    render(<AboutTabs initial="tools" counts={{ tools: 14, reference: 71 }} panels={panels} helpHint={false} />);
    const selected = () => screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")!.textContent;
    act(() => window.history.pushState(null, "", "/about?tab=reference#cut-list"));
    expect(selected()).toBe("Reference 71");
    expect((screen.getByText("reference panel").closest("[role=tabpanel]") as HTMLElement).hidden).toBe(false);
    // The reader goes back to Tools: the mirror takes the URL back to /about, and the page keeps its first `initial`.
    fireEvent.click(screen.getByRole("tab", { name: "Tools 14" }));
    act(() => window.history.replaceState(null, "", String(mirrorUrl.mock.calls.at(-1)![0])));
    expect(selected()).toBe("Tools 14");
    // A second link to the Reference is followed too.
    act(() => window.history.pushState(null, "", "/about?tab=reference#proposed-cuts"));
    expect(selected()).toBe("Reference 71");
  });

  it("mounts a once-shown child only when its tab is first drawn, and keeps it after (R2 gap 10)", () => {
    const mounts = vi.fn();
    function Visit() {
      mounts();
      return <i>visit</i>;
    }
    const tabs = (initial: "tools" | "reference") => (
      <AboutTabs initial={initial} counts={{ tools: 14, reference: 71 }} panels={panels} helpHint={false} onceShown={{ reference: <Visit /> }} />
    );
    render(tabs("tools"));
    expect(screen.queryByText("visit")).toBeNull();
    expect(mounts).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Reference 71" }));
    expect(screen.getByText("visit").closest("[role=tabpanel]")?.id).toBe("about-panel-reference");
    fireEvent.click(screen.getByRole("tab", { name: "Tools 14" }));
    expect(screen.getByText("visit")).toBeTruthy();
    cleanup();
    render(tabs("reference"));
    expect(screen.getByText("visit")).toBeTruthy();
  });

  it("reads anything but reference as Tools", () => {
    expect(aboutTabOf("reference")).toBe("reference");
    expect(aboutTabOf("tools")).toBe("tools");
    expect(aboutTabOf(["reference"])).toBe("tools");
    expect(aboutTabOf(undefined)).toBe("tools");
  });
});
