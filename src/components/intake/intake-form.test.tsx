// The form mounts where the platform lacks ResizeObserver (older WebViews): the dock is measured
// once and on resize instead, and the form renders rather than throwing on mount.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const { IntakeForm } = await import("./intake-form");
const { emptyParams } = await import("../../lib/intake/params");

const saved = globalThis.ResizeObserver;
afterEach(() => {
  globalThis.ResizeObserver = saved;
});

describe("the intake form", () => {
  it("renders with no ResizeObserver, and listens for resizes instead", () => {
    // @ts-expect-error: the platform this guards has none.
    delete globalThis.ResizeObserver;
    const listen = vi.spyOn(window, "addEventListener");
    render(<IntakeForm themes={[]} initial={emptyParams()} />);
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
    expect(listen.mock.calls.some(([type]) => type === "resize")).toBe(true);
    listen.mockRestore();
  });
});

describe("the Theme field's join", () => {
  const themes = [
    { slug: "orcs", label: "Orcs", commanders: 20 },
    { slug: "elves", label: "Elves", commanders: 98 },
  ];
  const group = () => screen.getByRole("radiogroup", { name: "Themes: all or any" });

  it("is greyed below two themes and keeps its value there", () => {
    render(<IntakeForm themes={themes} initial={{ ...emptyParams(), themes: ["orcs"], themeJoin: "any" }} />);
    expect(group().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(within(group()).getByRole("radio", { name: "All" }));
    expect(within(group()).getByRole("radio", { name: "Any" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("EDHREC’s theme tags. Pick more than one if you like.")).toBeTruthy();
  });

  it("from two themes, says its rule and sends it with the submit", () => {
    push.mockClear();
    render(<IntakeForm themes={themes} initial={{ ...emptyParams(), themes: ["orcs", "elves"] }} />);
    expect(group().getAttribute("aria-disabled")).toBeNull();
    expect(screen.getByText("All of these: a commander has to fit every one.")).toBeTruthy();
    fireEvent.click(within(group()).getByRole("radio", { name: "Any" }));
    expect(screen.getByText("Any of these: a commander has to fit one, and ranks by the one it fits best.")).toBeTruthy();
    fireEvent.submit(group().closest("form")!);
    expect(push.mock.calls[0][0]).toContain("tj=any");
  });
});
